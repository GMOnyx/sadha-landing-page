begin;

-- Continue is an action, not just a new INSERT: returning leads are eligible too.
-- Keep this operation private so anonymous visitors cannot update existing leads.
create table if not exists public.demo_lead_capture_attempts (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  ip_fingerprint text not null,
  created_at timestamptz not null default now()
);
alter table public.demo_lead_capture_attempts enable row level security;
revoke all on public.demo_lead_capture_attempts from public, anon, authenticated;
grant all on public.demo_lead_capture_attempts to service_role;
create index if not exists demo_lead_capture_attempts_fingerprint_idx
  on public.demo_lead_capture_attempts (fingerprint, created_at);
create index if not exists demo_lead_capture_attempts_ip_idx
  on public.demo_lead_capture_attempts (ip_fingerprint, created_at);
create index if not exists demo_lead_capture_attempts_created_idx
  on public.demo_lead_capture_attempts (created_at);

alter table public.demo_lead_followups
  add column if not exists capture_source text,
  add column if not exists capture_page_path text;

create or replace function public.capture_demo_lead(
  p_email text, p_page_path text, p_source text,
  p_fingerprint text, p_ip_fingerprint text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(p_email));
  saved_lead public.early_access_requests;
begin
  if normalized_email is null or length(normalized_email) > 254
    or normalized_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    or p_source is null or p_source not in ('sadha_landing', 'sadha_mobile_landing')
    or p_page_path is null or length(p_page_path) > 2048
    or p_page_path not like '/%#demo-email-captured'
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_ip_fingerprint is null or p_ip_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_CAPTURE';
  end if;

  -- Serialize attempts from one IP so parallel requests cannot bypass the limit.
  perform pg_advisory_xact_lock(hashtextextended(p_ip_fingerprint, 0));
  delete from public.demo_lead_capture_attempts where created_at < now() - interval '1 day';
  if (select count(*) from public.demo_lead_capture_attempts
      where fingerprint = p_fingerprint and created_at > now() - interval '15 minutes') >= 8
    or (select count(*) from public.demo_lead_capture_attempts
      where ip_fingerprint = p_ip_fingerprint and created_at > now() - interval '15 minutes') >= 30 then
    raise exception 'RATE_LIMITED';
  end if;
  insert into public.demo_lead_capture_attempts (fingerprint, ip_fingerprint)
    values (p_fingerprint, p_ip_fingerprint);

  insert into public.early_access_requests (email, source, page_path)
    values (normalized_email, p_source, p_page_path)
    on conflict do nothing;
  select * into strict saved_lead from public.early_access_requests
    where lower(email) = normalized_email for update;

  if normalized_email !~ '@([^@]+\.)?(example|invalid|test|localhost)$'
    and not exists (select 1 from public.demo_bookings b
      where lower(b.email) = normalized_email and b.status in ('pending', 'booked')) then
    insert into public.demo_lead_followups
      (lead_id, email, full_name, capture_source, capture_page_path)
      values (saved_lead.id, normalized_email, saved_lead.full_name, p_source, p_page_path)
      on conflict (lead_id) do nothing;
  end if;

  -- Never reveal whether an address was already registered, booked, or opted out.
  -- Existing reminders are never reset, including sent emails and opt-outs.
  return jsonb_build_object('captured', true);
end;
$$;
revoke all on function public.capture_demo_lead(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.capture_demo_lead(text, text, text, text, text)
  to service_role;

-- Legacy inserts can still save a lead, but only the rate-limited endpoint queues mail.
drop trigger if exists queue_demo_lead_followup on public.early_access_requests;

notify pgrst, 'reload schema';
commit;
