# SADHA booking automation setup

The landing page uses these Supabase Edge Functions:

- `demo-availability` — combines Supabase reservations with Google Free/Busy.
- `create-demo-booking` — reserves the slot, creates the Google Calendar event and Meet link, then sends confirmation emails through Resend.
- `retry-booking-emails` — retries failed confirmation emails without creating duplicate events or duplicate emails.
- `send-demo-followups` — sends one founder note an hour after Continue if the lead never books.
- `demo-followup-preferences` — handles secure unsubscribe links and one-click email-client opt-outs.

## 1. Apply the database migration

Run `supabase/migrations/202609300001_booking_automation.sql` in the Supabase SQL Editor. This migration is required even if the earlier `supabase.sql` file was already run.

## 2. Set up Resend

1. Create a Resend account.
2. Add and verify `sadha.ai` for sending.
3. Add the SPF and DKIM records Resend provides to the domain DNS.
4. Create a sending-only API key.
5. Use `SADHA <demos@sadha.ai>` as `RESEND_FROM_EMAIL`.

## 3. Connect Google Calendar

Use `abdarrahman@sadha.ai` as the organizer account.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select the SADHA project.
2. Open **APIs & Services → Library**, search for **Google Calendar API**, and enable it.
3. Open **Google Auth Platform**. Complete Branding and Audience. Add `abdarrahman@sadha.ai` as a test user while configuring it, then move the OAuth app to **In production** before relying on it. An external OAuth app left in Testing receives a Calendar refresh token that expires after seven days.
4. Open **Clients → Create client → Web application**.
5. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI, then create the client. Keep the client ID and client secret private.
6. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/). In the gear menu:
   - enable **Use your own OAuth credentials**;
   - set OAuth flow to **Server-side**;
   - set access type to **Offline**;
   - set force prompt to **Consent Screen**;
   - enter the client ID and client secret.
7. Under **Input your own scopes**, enter `https://www.googleapis.com/auth/calendar`, click **Authorize APIs**, and sign in as `abdarrahman@sadha.ai`.
8. Click **Exchange authorization code for tokens**. Copy the `refresh_token` into Supabase as `GOOGLE_REFRESH_TOKEN`. Do not put it in this repository or send it in chat.
9. In Google Calendar, create a calendar named **SADHA Demos** under the organizer account. Share it with `abdarrahman2345@gmail.com` and `tiemyah@gmail.com` with **Make changes to events** access.
10. In that calendar's **Settings and sharing → Integrate calendar**, copy the Calendar ID. Use that value for `GOOGLE_CALENDAR_ID`.
11. Initially, set `GOOGLE_BUSY_CALENDAR_IDS` to the same shared SADHA Demos Calendar ID. If personal/work calendar conflicts should also block times, share each Google calendar with `abdarrahman@sadha.ai` using at least **See only free/busy**, then append its exact Calendar ID, comma-separated. Do not add a non-Google mailbox here; it can still receive invitations and email alerts, but Google Free/Busy cannot query it.
12. Set `SADHA_HOST_EMAILS` to `abdarrahman2345@gmail.com,abdarrahman@sadha.ai,tiemyah@gmail.com`.

The booking window is every day, 9:00 AM–11:00 PM Dubai time in 30-minute blocks. The final slot begins at 10:30 PM so every demo finishes by 11:00 PM.

## 4. Set Supabase secrets

Copy the names from `supabase/functions/.env.example` into Supabase Dashboard → Edge Functions → Secrets. Never place their values in `script.js` or commit them to Git.

Required secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_BUSY_CALENDAR_IDS`
- `GOOGLE_ORGANIZER_EMAIL`
- `SADHA_HOST_EMAILS`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `BOOKING_CRON_SECRET`

Use these non-secret values:

```text
GOOGLE_ORGANIZER_EMAIL=abdarrahman@sadha.ai
SADHA_HOST_EMAILS=abdarrahman2345@gmail.com,abdarrahman@sadha.ai,tiemyah@gmail.com
RESEND_FROM_EMAIL=SADHA <demos@sadha.ai>
```

For `BOOKING_CRON_SECRET`, generate a new long random value in a password manager. It is only used to authenticate the email-retry job.

## 5. Deploy functions

From the repository root, sign in and link the CLI to the production project:

```sh
npx supabase login
npx supabase link --project-ref vriofvpoagfnlmrbepkm
```

Then deploy the three public booking functions:

```sh
npx supabase functions deploy demo-availability --no-verify-jwt --use-api
npx supabase functions deploy create-demo-booking --no-verify-jwt --use-api
npx supabase functions deploy retry-booking-emails --no-verify-jwt --use-api
```

These functions intentionally accept unauthenticated visitors because the booking form is public. They validate all input server-side, restrict browser origins, apply a rate limit, and use the service role only inside Supabase.

## 6. Schedule email retries

Create a Supabase Cron job that sends a POST request every five minutes to:

`https://vriofvpoagfnlmrbepkm.supabase.co/functions/v1/retry-booking-emails`

Include the header `x-cron-secret` with the exact value stored in `BOOKING_CRON_SECRET`.

## 7. Production verification

Before enabling paid ads, complete a real booking using a non-founder company email and verify:

1. The slot disappears from the modal on a second browser.
2. A Google Calendar event and unique Meet link are created.
3. Both founders see the event.
4. The lead receives a Google invitation.
5. The lead receives the branded SADHA email.
6. The `.ics` attachment opens in Outlook or Apple Calendar.
7. The `book_demo_scheduled` GA4 event fires once.
8. `demo_bookings.calendar_status` is `created` and `notification_status` is `sent`.

## Demo abandonment follow-up

This is a separate server-side queue, not a browser timer. Both landing pages
call `capture-demo-lead` before revealing scheduling. It atomically saves or finds
the email and queues one follow-up, including returning leads, after one hour.
The cron worker
runs every five minutes, so delivery is normally 60–65 minutes after Continue.
Closing the page does not interrupt it. Existing leads are not backfilled: they
must click Continue again. Repeated captures do not create another reminder or
reset its delay, and sent reminders and opt-outs are never reactivated.

Booking a demo, including a pending booking request, suppresses the follow-up.
The worker checks eligibility immediately before sending. Opt-outs are stored
privately. Failed sends retry up to five times with backoff; a stable Resend
idempotency key prevents repeat sends after a crash. No retries after 24 hours.

Deploy/update this feature:

1. Apply `supabase/migrations/202610130001_demo_lead_followups.sql`, then
   `supabase/migrations/202610130002_capture_demo_lead.sql` through the
   SQL Editor or `supabase db query --linked --file ...`.
2. Run the rollback-only SQL checks in `supabase/tests/demo_lead_followups.sql`.
   No fixture remains and no email is sent.
3. Deploy `capture-demo-lead`, `send-demo-followups`, and `demo-followup-preferences` with
   `--no-verify-jwt --use-api`. The worker still requires its private cron header;
   unsubscribe accepts only possession of an opaque, random token.
   Lead capture validates both landing sources and applies server-side rate limits.
   Anonymous visitors cannot call the database capture RPC directly.
4. Run `node scripts/configure-demo-followups.mjs /absolute/path/to/supabase`.
   This reuses the existing CLI login, creates a dedicated random worker secret,
   stores the scheduler copy in Supabase Vault, and activates the named cron job.
   It does not change the Google Calendar or existing email credentials.
5. Build/publish the frontend to include `email-preferences.html` and the
   `book_demo=1` direct-modal link behavior on desktop and mobile.

Monitor `public.demo_lead_followups` for `status`, `sent_at`, `resend_email_id`,
`attempts`, and `last_error`. Cron history is in `cron.job_run_details`; the actual
HTTP response is in `net._http_response` (cron success alone only means queued).
To pause follow-ups without affecting booking confirmations:

```sql
select cron.alter_job(jobid, active := false)
from cron.job where jobname = 'sadha-demo-lead-followups';
```

The email subject is **What time works best for you?** Replies go to
`abdarrahman@sadha.ai`. The booking link contains only campaign attribution,
never a customer's email address. The unsubscribe page intentionally has no
analytics or third-party resources.
