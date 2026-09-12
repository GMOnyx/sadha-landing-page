create extension if not exists pgcrypto;

create table if not exists public.early_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text not null,
  source text not null default 'sadha_landing',
  page_path text,
  created_at timestamptz not null default now(),
  constraint early_access_requests_email_check check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

alter table if exists public.early_access_requests
add column if not exists full_name text;

alter table public.early_access_requests enable row level security;

grant usage on schema public to anon;
grant insert on public.early_access_requests to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'early_access_requests'
      and policyname = 'Allow public early access signups'
  ) then
    create policy "Allow public early access signups"
    on public.early_access_requests
    for insert
    to anon
    with check (source = 'sadha_landing');
  end if;
end
$$;

create index if not exists early_access_requests_created_at_idx
on public.early_access_requests (created_at desc);

create unique index if not exists early_access_requests_email_unique_idx
on public.early_access_requests (lower(email));

create table if not exists public.demo_bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text not null,
  slot_start timestamptz not null,
  duration_minutes integer not null default 30,
  visitor_timezone text not null,
  owner_timezone text not null default 'Asia/Dubai',
  status text not null default 'booked',
  source text not null default 'sadha_landing',
  created_at timestamptz not null default now(),
  constraint demo_bookings_email_check check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint demo_bookings_duration_check check (duration_minutes = 30),
  constraint demo_bookings_status_check check (status in ('booked', 'cancelled'))
);

alter table public.demo_bookings enable row level security;

revoke all on table public.demo_bookings from anon, authenticated;
grant insert on public.demo_bookings to anon;

drop policy if exists "Allow public demo bookings" on public.demo_bookings;
create policy "Allow public demo bookings"
on public.demo_bookings
for insert
to anon
with check (
  source = 'sadha_landing'
  and status = 'booked'
  and duration_minutes = 30
  and slot_start > now()
  and slot_start < now() + interval '60 days'
);

create unique index if not exists demo_bookings_active_slot_unique_idx
on public.demo_bookings (slot_start)
where status = 'booked';

create index if not exists demo_bookings_slot_start_idx
on public.demo_bookings (slot_start);

create or replace function public.get_booked_demo_slots(
  range_start timestamptz,
  range_end timestamptz
)
returns table (slot_start timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select booking.slot_start
  from public.demo_bookings as booking
  where booking.status = 'booked'
    and booking.slot_start >= greatest(range_start, now())
    and booking.slot_start < least(range_end, now() + interval '60 days');
$$;

revoke all on function public.get_booked_demo_slots(timestamptz, timestamptz) from public;
grant execute on function public.get_booked_demo_slots(timestamptz, timestamptz) to anon;
