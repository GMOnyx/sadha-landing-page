-- Only new email captures enter this queue. Existing leads are not backfilled.
create table if not exists public.demo_lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.early_access_requests(id) on delete cascade,
  email text not null,
  full_name text,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  due_at timestamptz not null default now() + interval '1 hour',
  next_attempt_at timestamptz not null default now() + interval '1 hour',
  attempts integer not null default 0,
  resend_email_id text,
  sent_at timestamptz,
  opted_out_at timestamptz,
  skip_reason text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.demo_lead_followups enable row level security;
revoke all on public.demo_lead_followups from public, anon, authenticated;
grant all on public.demo_lead_followups to service_role;

create index if not exists demo_lead_followups_due_idx
  on public.demo_lead_followups (next_attempt_at)
  where status in ('pending', 'processing');

create or replace function public.queue_demo_lead_followup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Both desktop and mobile use this capture marker. Reserved test domains
  -- never receive an email, even if someone runs integration checks in prod.
  if new.source = 'sadha_landing'
    and new.page_path like '%#demo-email-captured'
    and lower(new.email) !~ '@([^@]+\.)?(example|invalid|test|localhost)$'
    and not exists (
      select 1 from public.demo_bookings b
      where lower(b.email) = lower(new.email)
        and b.status in ('pending', 'booked')
    ) then
    insert into public.demo_lead_followups (lead_id, email, full_name)
    values (new.id, lower(btrim(new.email)), new.full_name)
    on conflict (lead_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_demo_lead_followup() from public, anon, authenticated;

drop trigger if exists queue_demo_lead_followup on public.early_access_requests;
create trigger queue_demo_lead_followup after insert on public.early_access_requests
  for each row execute function public.queue_demo_lead_followup();

create or replace function public.suppress_booked_demo_followups()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('pending', 'booked') then
    update public.demo_lead_followups
    set status = 'skipped', skip_reason = 'BOOKING_EXISTS', updated_at = now()
    where lower(email) = lower(new.email) and status in ('pending', 'processing');
  end if;
  return new;
end;
$$;
revoke all on function public.suppress_booked_demo_followups() from public, anon, authenticated;
drop trigger if exists suppress_booked_demo_followups on public.demo_bookings;
create trigger suppress_booked_demo_followups after insert or update of status, email
  on public.demo_bookings for each row
  execute function public.suppress_booked_demo_followups();

-- Leases and SKIP LOCKED prevent overlapping cron invocations sending twice.
create or replace function public.claim_demo_lead_followups(batch_size integer default 10)
returns setof public.demo_lead_followups
language plpgsql security definer set search_path = '' as $$
begin
  update public.demo_lead_followups f
  set status = 'skipped', skip_reason = 'BOOKING_EXISTS', updated_at = now()
  where f.status in ('pending', 'processing') and exists (
    select 1 from public.demo_bookings b where lower(b.email) = f.email
      and b.status in ('pending', 'booked')
  );

  -- Do not retry indefinitely or outside the email provider's idempotency window.
  update public.demo_lead_followups
  set status = 'failed', last_error = 'RETRY_LIMIT_OR_EXPIRED', updated_at = now()
  where (status = 'pending' or
    (status = 'processing' and updated_at < now() - interval '10 minutes'))
    and (attempts >= 5 or created_at < now() - interval '24 hours');

  return query
  with candidates as (
    select f.id from public.demo_lead_followups f
    where (f.status = 'pending' or
      (f.status = 'processing' and f.updated_at < now() - interval '10 minutes'))
      and f.due_at <= now() and f.next_attempt_at <= now()
      and f.attempts < 5 and f.opted_out_at is null
    order by f.due_at
    limit greatest(1, least(coalesce(batch_size, 10), 20))
    for update skip locked
  )
  update public.demo_lead_followups f
  set status = 'processing', attempts = f.attempts + 1, updated_at = now()
  from candidates c where f.id = c.id returning f.*;
end;
$$;

create or replace function public.can_send_demo_lead_followup(
  followup_id uuid, attempt_number integer
)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.demo_lead_followups f
    where f.id = followup_id and f.status = 'processing'
      and f.attempts = attempt_number and f.opted_out_at is null
      and not exists (
        select 1 from public.demo_bookings b
        where lower(b.email) = f.email and b.status in ('pending', 'booked')
      )
  );
$$;

create or replace function public.finish_demo_lead_followup(
  followup_id uuid, attempt_number integer, outcome text,
  email_id text default null, error_message text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if outcome not in ('sent', 'skipped', 'retry') then
    raise exception 'INVALID_OUTCOME';
  end if;
  update public.demo_lead_followups f set
    status = case
      when outcome = 'sent' then 'sent'
      when outcome = 'skipped' then 'skipped'
      when f.attempts >= 5 then 'failed'
      else 'pending' end,
    resend_email_id = case when outcome = 'sent' then email_id else f.resend_email_id end,
    sent_at = case when outcome = 'sent' then now() else f.sent_at end,
    skip_reason = case when outcome = 'skipped' then 'NO_LONGER_ELIGIBLE' else f.skip_reason end,
    last_error = case when outcome = 'retry' then left(error_message, 500) else null end,
    next_attempt_at = now() + interval '5 minutes' * power(2, least(f.attempts - 1, 4)),
    updated_at = now()
  where f.id = followup_id and f.attempts = attempt_number
    and (f.status = 'processing' or (outcome = 'sent' and f.status = 'skipped'));
end;
$$;

create or replace function public.unsubscribe_demo_lead_followup(token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.demo_lead_followups set
    opted_out_at = coalesce(opted_out_at, now()),
    status = case when status in ('pending', 'processing') then 'skipped' else status end,
    skip_reason = 'OPTED_OUT', updated_at = now()
  where unsubscribe_token = token;
  return found;
end;
$$;

revoke all on function public.claim_demo_lead_followups(integer) from public, anon, authenticated;
revoke all on function public.can_send_demo_lead_followup(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_demo_lead_followup(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.unsubscribe_demo_lead_followup(uuid) from public, anon, authenticated;
grant execute on function public.claim_demo_lead_followups(integer) to service_role;
grant execute on function public.can_send_demo_lead_followup(uuid, integer) to service_role;
grant execute on function public.finish_demo_lead_followup(uuid, integer, text, text, text) to service_role;
grant execute on function public.unsubscribe_demo_lead_followup(uuid) to service_role;

notify pgrst, 'reload schema';
