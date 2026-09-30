# SADHA booking automation setup

The landing page now expects three Supabase Edge Functions:

- `demo-availability` — combines Supabase reservations with Google Free/Busy.
- `create-demo-booking` — reserves the slot, creates the Google Calendar event and Meet link, then sends confirmation emails through Resend.
- `retry-booking-emails` — retries failed confirmation emails without creating duplicate events or duplicate emails.

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
