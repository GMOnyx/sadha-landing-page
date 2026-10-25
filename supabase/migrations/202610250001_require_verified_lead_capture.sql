-- All current landing pages use capture-demo-lead. Do not leave the legacy
-- anonymous REST INSERT available as a way to bypass server-side bot checks.
begin;
revoke insert on public.early_access_requests from public, anon, authenticated;
drop policy if exists "Allow public early access signups" on public.early_access_requests;
notify pgrst, 'reload schema';
commit;
