-- Run with the migration installed, before starting the cron job.
-- Every fixture and simulated state change is rolled back. No emails are sent.
begin;
do $$
declare
  test_email text := 'followup-qa-' || gen_random_uuid()::text || '@sadha.ai';
  test_lead_id uuid;
  followup_id uuid;
  optout_token uuid;
  claimed public.demo_lead_followups;
begin
  insert into public.early_access_requests (email, source, page_path)
    values (test_email, 'sadha_landing', '/demo/#demo-email-captured') returning id into test_lead_id;
  select id, unsubscribe_token into followup_id, optout_token
    from public.demo_lead_followups where demo_lead_followups.lead_id = test_lead_id;
  if followup_id is null then raise exception 'Mobile Continue must queue a follow-up'; end if;
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and due_at >= now() + interval '59 minutes' and status = 'pending') then
    raise exception 'Follow-up must wait an hour';
  end if;
  if exists (select 1 from public.claim_demo_lead_followups(20) where id = followup_id) then
    raise exception 'Follow-up sent too early';
  end if;

  update public.demo_lead_followups set due_at = now() - interval '1 second',
    next_attempt_at = now() - interval '1 second' where id = followup_id;
  select * into claimed from public.claim_demo_lead_followups(20) where id = followup_id;
  if claimed.id is null or claimed.attempts <> 1 then raise exception 'Due lead not claimed'; end if;
  if exists (select 1 from public.claim_demo_lead_followups(20) where id = followup_id) then
    raise exception 'Active lease must prevent double claim';
  end if;
  if not public.can_send_demo_lead_followup(followup_id, 1) then raise exception 'Unbooked lead not eligible'; end if;
  perform public.finish_demo_lead_followup(followup_id, 1, 'retry', null, 'QA_FAILURE');
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and status = 'pending' and next_attempt_at >= now() + interval '4 minutes') then
    raise exception 'Failed deliveries must have a retry delay';
  end if;

  update public.demo_lead_followups set next_attempt_at = now() - interval '1 second' where id = followup_id;
  select * into claimed from public.claim_demo_lead_followups(20) where id = followup_id;
  insert into public.demo_bookings (full_name, email, company, slot_start, visitor_timezone, status)
    values ('Follow-up QA', upper(test_email), 'QA', '2040-01-01 00:00:00+00', 'Asia/Dubai', 'pending');
  if public.can_send_demo_lead_followup(followup_id, claimed.attempts) then
    raise exception 'Booking must suppress follow-up, case-insensitively';
  end if;
  if not exists (select 1 from public.demo_lead_followups where id = followup_id and status = 'skipped') then
    raise exception 'Booking trigger did not suppress';
  end if;
  perform public.unsubscribe_demo_lead_followup(optout_token);
  if not exists (select 1 from public.demo_lead_followups where id = followup_id and opted_out_at is not null) then
    raise exception 'Unsubscribe was not persisted';
  end if;

  insert into public.early_access_requests (email, source, page_path) values
    ('followup-reserved-' || gen_random_uuid()::text || '@sadha.example', 'sadha_landing', '/#demo-email-captured');
  if exists (select 1 from public.demo_lead_followups where email like '%@sadha.example') then
    raise exception 'Reserved test addresses must be excluded';
  end if;
  insert into public.early_access_requests (email, source, page_path) values
    ('followup-other-' || gen_random_uuid()::text || '@sadha.ai', 'sadha_landing', '/other-form');
  if exists (select 1 from public.demo_lead_followups where email like 'followup-other-%') then
    raise exception 'Non-Continue registrations must not be queued';
  end if;

  -- Prove a delivered row is terminal and provider IDs are kept for diagnosis.
  delete from public.demo_bookings where email = upper(test_email);
  update public.demo_lead_followups set status = 'processing', opted_out_at = null where id = followup_id;
  perform public.finish_demo_lead_followup(followup_id, claimed.attempts, 'sent', 'qa-resend-id');
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and status = 'sent' and sent_at is not null and resend_email_id = 'qa-resend-id') then
    raise exception 'Successful send must be persisted';
  end if;
  if exists (select 1 from public.claim_demo_lead_followups(20) where id = followup_id) then
    raise exception 'Delivered email must never be claimed again';
  end if;

  if has_table_privilege('anon', 'public.demo_lead_followups', 'SELECT')
    or has_function_privilege('anon', 'public.claim_demo_lead_followups(integer)', 'EXECUTE') then
    raise exception 'Queue must not be publicly accessible';
  end if;
end;
$$;
rollback;
select 'passed: delay, leases, retry, booking suppression, opt-out, test exclusion, terminal delivery, permissions' as result;
