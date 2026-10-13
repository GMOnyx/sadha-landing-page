-- Run with both follow-up migrations installed.
-- Every fixture and simulated state change is rolled back. No emails are sent.
begin;
do $$
declare
  test_email text := 'followup-qa-' || gen_random_uuid()::text || '@sadha.ai';
  test_lead_id uuid;
  followup_id uuid;
  optout_token uuid;
  claimed public.demo_lead_followups;
  test_fingerprint text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  test_ip text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  rate_fingerprint text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  rate_ip text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  capture_result jsonb;
begin
  -- Regression: a customer registered before automation was deployed.
  insert into public.early_access_requests (email, source, page_path, created_at)
    values (test_email, 'sadha_landing', '/legacy-form', now() - interval '2 days') returning id into test_lead_id;
  if exists (select 1 from public.demo_lead_followups where lead_id = test_lead_id) then
    raise exception 'Historical registrations must not be backfilled';
  end if;
  capture_result := public.capture_demo_lead(upper(test_email), '/demo/#demo-email-captured',
    'sadha_mobile_landing', test_fingerprint, test_ip);
  if capture_result <> '{"captured":true}'::jsonb then raise exception 'Capture must acknowledge success'; end if;
  perform public.capture_demo_lead(test_email, '/#demo-email-captured',
    'sadha_landing', test_fingerprint, test_ip);
  if (select count(*) from public.demo_lead_followups where lead_id = test_lead_id) <> 1 then
    raise exception 'Repeated Continue must queue only once';
  end if;
  select id, unsubscribe_token into followup_id, optout_token
    from public.demo_lead_followups where demo_lead_followups.lead_id = test_lead_id;
  if followup_id is null then raise exception 'Mobile Continue must queue a follow-up'; end if;
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and due_at >= now() + interval '59 minutes' and status = 'pending'
    and capture_source = 'sadha_mobile_landing') then
    raise exception 'Returning lead must wait an hour from Continue, with mobile attribution';
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
  perform public.capture_demo_lead(test_email, '/#demo-email-captured',
    'sadha_landing', test_fingerprint, test_ip);
  if not exists (select 1 from public.demo_lead_followups where id = followup_id and status = 'skipped') then
    raise exception 'Returning booked customer must not reactivate reminder';
  end if;
  perform public.unsubscribe_demo_lead_followup(optout_token);
  if not exists (select 1 from public.demo_lead_followups where id = followup_id and opted_out_at is not null) then
    raise exception 'Unsubscribe was not persisted';
  end if;
  delete from public.demo_bookings where email = upper(test_email);
  perform public.capture_demo_lead(test_email, '/#demo-email-captured',
    'sadha_landing', test_fingerprint, test_ip);
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and opted_out_at is not null and status = 'skipped') then
    raise exception 'Continue must not override an opt-out';
  end if;

  perform public.capture_demo_lead('followup-reserved-' || gen_random_uuid()::text || '@sadha.example',
    '/#demo-email-captured', 'sadha_landing', test_fingerprint, test_ip);
  if exists (select 1 from public.demo_lead_followups where email like '%@sadha.example') then
    raise exception 'Reserved test addresses must be excluded';
  end if;

  -- Brand-new leads still capture and queue through the desktop endpoint.
  perform public.capture_demo_lead('followup-new-' || gen_random_uuid()::text || '@sadha.ai',
    '/?utm_source=qa#demo-email-captured', 'sadha_landing', test_fingerprint, test_ip);
  if not exists (select 1 from public.demo_lead_followups where email like 'followup-new-%'
    and status = 'pending' and capture_source = 'sadha_landing') then
    raise exception 'New desktop lead must queue';
  end if;
  insert into public.early_access_requests (email, source, page_path) values
    ('followup-other-' || gen_random_uuid()::text || '@sadha.ai', 'sadha_landing', '/other-form');
  if exists (select 1 from public.demo_lead_followups where email like 'followup-other-%') then
    raise exception 'Non-Continue registrations must not be queued';
  end if;

  -- Prove a delivered row is terminal and provider IDs are kept for diagnosis.
  update public.demo_lead_followups set status = 'processing', opted_out_at = null where id = followup_id;
  perform public.finish_demo_lead_followup(followup_id, claimed.attempts, 'sent', 'qa-resend-id');
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and status = 'sent' and sent_at is not null and resend_email_id = 'qa-resend-id') then
    raise exception 'Successful send must be persisted';
  end if;
  if exists (select 1 from public.claim_demo_lead_followups(20) where id = followup_id) then
    raise exception 'Delivered email must never be claimed again';
  end if;
  perform public.capture_demo_lead(test_email, '/#demo-email-captured',
    'sadha_landing', test_fingerprint, test_ip);
  if not exists (select 1 from public.demo_lead_followups where id = followup_id
    and status = 'sent' and resend_email_id = 'qa-resend-id') then
    raise exception 'Continue must not resend a delivered reminder';
  end if;

  -- Both per-address and per-IP limits are enforced inside the transaction.
  for i in 1..8 loop
    perform public.capture_demo_lead('rate-' || rate_fingerprint || '@sadha.example',
      '/#demo-email-captured', 'sadha_landing', rate_fingerprint, rate_ip);
  end loop;
  begin
    perform public.capture_demo_lead('rate-' || rate_fingerprint || '@sadha.example',
      '/#demo-email-captured', 'sadha_landing', rate_fingerprint, rate_ip);
    raise exception 'ADDRESS_LIMIT_NOT_ENFORCED';
  exception when raise_exception then
    if sqlerrm <> 'RATE_LIMITED' then raise; end if;
  end;
  rate_ip := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  for i in 1..30 loop
    perform public.capture_demo_lead('rate-ip-' || i || '-' || rate_ip || '@sadha.example',
      '/#demo-email-captured', 'sadha_landing', md5(i::text) || md5(rate_ip || i::text), rate_ip);
  end loop;
  begin
    perform public.capture_demo_lead('rate-ip-blocked@sadha.example', '/#demo-email-captured',
      'sadha_landing', repeat('f', 64), rate_ip);
    raise exception 'IP_LIMIT_NOT_ENFORCED';
  exception when raise_exception then
    if sqlerrm <> 'RATE_LIMITED' then raise; end if;
  end;

  if has_table_privilege('anon', 'public.demo_lead_followups', 'SELECT')
    or has_table_privilege('anon', 'public.demo_lead_capture_attempts', 'SELECT')
    or has_function_privilege('anon', 'public.claim_demo_lead_followups(integer)', 'EXECUTE')
    or has_function_privilege('anon', 'public.capture_demo_lead(text,text,text,text,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.capture_demo_lead(text,text,text,text,text)', 'EXECUTE') then
    raise exception 'Queue must not be publicly accessible';
  end if;
end;
$$;
rollback;
select 'passed: new/returning captures, delay, deduplication, leases, retry, booking suppression, opt-out, test exclusion, terminal delivery, rate limits, permissions' as result;
