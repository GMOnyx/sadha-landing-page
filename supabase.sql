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
