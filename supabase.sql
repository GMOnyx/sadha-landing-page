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
-- Leads are captured by the server-verified Edge Function, never anonymous REST.
revoke insert on public.early_access_requests from public, anon, authenticated;
drop policy if exists "Allow public early access signups" on public.early_access_requests;

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
  status text not null default 'pending',
  source text not null default 'sadha_landing',
  google_event_id text,
  google_event_url text,
  meeting_url text,
  calendar_status text not null default 'pending',
  notification_status text not null default 'pending',
  notification_attempts integer not null default 0,
  last_notification_attempt_at timestamptz,
  resend_email_id text,
  manage_token uuid not null default gen_random_uuid(),
  last_error text,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint demo_bookings_email_check check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint demo_bookings_duration_check check (duration_minutes = 30),
  constraint demo_bookings_status_check check (status in ('pending', 'booked', 'failed', 'cancelled')),
  constraint demo_bookings_calendar_status_check check (calendar_status in ('pending', 'created', 'failed')),
  constraint demo_bookings_notification_status_check check (notification_status in ('pending', 'sent', 'failed', 'not_configured'))
);

alter table public.demo_bookings
add column if not exists google_event_id text,
add column if not exists google_event_url text,
add column if not exists meeting_url text,
add column if not exists calendar_status text not null default 'pending',
add column if not exists notification_status text not null default 'pending',
add column if not exists notification_attempts integer not null default 0,
add column if not exists last_notification_attempt_at timestamptz,
add column if not exists resend_email_id text,
add column if not exists manage_token uuid not null default gen_random_uuid(),
add column if not exists last_error text,
add column if not exists confirmed_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

alter table public.demo_bookings
alter column status set default 'pending';

alter table public.demo_bookings
drop constraint if exists demo_bookings_status_check;

alter table public.demo_bookings
add constraint demo_bookings_status_check
check (status in ('pending', 'booked', 'failed', 'cancelled'));

alter table public.demo_bookings
drop constraint if exists demo_bookings_calendar_status_check;

alter table public.demo_bookings
add constraint demo_bookings_calendar_status_check
check (calendar_status in ('pending', 'created', 'failed'));

alter table public.demo_bookings
drop constraint if exists demo_bookings_notification_status_check;

alter table public.demo_bookings
add constraint demo_bookings_notification_status_check
check (notification_status in ('pending', 'sent', 'failed', 'not_configured'));

alter table public.demo_bookings enable row level security;

revoke all on table public.demo_bookings from anon, authenticated;

drop policy if exists "Allow public demo bookings" on public.demo_bookings;

drop index if exists public.demo_bookings_active_slot_unique_idx;
create unique index demo_bookings_active_slot_unique_idx
on public.demo_bookings (slot_start)
where status in ('pending', 'booked');

create unique index if not exists demo_bookings_google_event_id_unique_idx
on public.demo_bookings (google_event_id)
where google_event_id is not null;

create unique index if not exists demo_bookings_manage_token_unique_idx
on public.demo_bookings (manage_token);

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
  where booking.status in ('pending', 'booked')
    and booking.slot_start >= greatest(range_start, now())
    and booking.slot_start < least(range_end, now() + interval '60 days');
$$;

revoke all on function public.get_booked_demo_slots(timestamptz, timestamptz) from public;
grant execute on function public.get_booked_demo_slots(timestamptz, timestamptz) to anon;

create table if not exists public.demo_booking_attempts (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  created_at timestamptz not null default now()
);

alter table public.demo_booking_attempts enable row level security;
revoke all on table public.demo_booking_attempts from anon, authenticated;

create index if not exists demo_booking_attempts_fingerprint_created_at_idx
on public.demo_booking_attempts (fingerprint, created_at desc);
