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
