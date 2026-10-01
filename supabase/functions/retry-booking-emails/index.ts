import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { sendBookingEmails } from "../_shared/email.ts";
import { createCalendarEvent } from "../_shared/google.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "NOT_ALLOWED" }, 405);
  const cronSecret = Deno.env.get("BOOKING_CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const payload = await request.json().catch(() => ({}));
  const requestedBookingId = typeof payload?.booking_id === "string"
    ? payload.booking_id.trim()
    : "";
  const retryBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let calendarRetryQuery = admin
    .from("demo_bookings")
    .select(
      "id,full_name,email,company,slot_start,visitor_timezone,notification_attempts",
    )
    .in("status", ["pending", "failed"])
    .eq("calendar_status", "failed")
    .lt("updated_at", retryBefore)
    .order("created_at", { ascending: true })
    .limit(20);
  if (requestedBookingId) {
    calendarRetryQuery = calendarRetryQuery.eq("id", requestedBookingId);
  }
  const { data: calendarBookings, error: calendarQueryError } =
    await calendarRetryQuery;
  if (calendarQueryError) {
    console.error("Calendar retry query failed", calendarQueryError);
    return json({ error: "CALENDAR_RETRY_QUERY_FAILED" }, 500);
  }

  let calendarsRecovered = 0;
  let calendarRetriesFailed = 0;
  let sent = 0;
  let failed = 0;
  for (const booking of calendarBookings || []) {
    try {
      const calendar = await createCalendarEvent({
        id: booking.id,
        name: booking.full_name,
        email: booking.email,
        company: booking.company,
        slotStart: booking.slot_start,
      });
      const confirmedAt = new Date().toISOString();
      await admin
        .from("demo_bookings")
        .update({
          status: "booked",
          calendar_status: "created",
          google_event_id: calendar.eventId,
          google_event_url: calendar.eventUrl,
          meeting_url: calendar.meetingUrl,
          confirmed_at: confirmedAt,
          last_error: null,
          updated_at: confirmedAt,
        })
        .eq("id", booking.id);
      calendarsRecovered += 1;

      const attempts = Number(booking.notification_attempts || 0) + 1;
      try {
        const emails = await sendBookingEmails({
          id: booking.id,
          name: booking.full_name,
          email: booking.email,
          company: booking.company,
          slotStart: booking.slot_start,
          timeZone: booking.visitor_timezone,
          meetingUrl: calendar.meetingUrl,
          eventUrl: calendar.eventUrl,
          iCalUID: calendar.iCalUID,
          organizerEmail: calendar.organizerEmail,
        });
        await admin
          .from("demo_bookings")
          .update({
            notification_status: "sent",
            notification_attempts: attempts,
            last_notification_attempt_at: new Date().toISOString(),
            resend_email_id: emails.attendeeEmailId,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);
        sent += 1;
      } catch (emailError) {
        console.error(
          "Calendar recovered but confirmation email failed",
          booking.id,
          emailError,
        );
        await admin
          .from("demo_bookings")
          .update({
            notification_status: "failed",
            notification_attempts: attempts,
            last_notification_attempt_at: new Date().toISOString(),
            last_error: emailError instanceof Error
              ? emailError.message.slice(0, 500)
              : "EMAIL_RETRY_FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);
        failed += 1;
      }
    } catch (calendarError) {
      console.error("Calendar retry failed", booking.id, calendarError);
      await admin
        .from("demo_bookings")
        .update({
          last_error: calendarError instanceof Error
            ? calendarError.message.slice(0, 500)
            : "CALENDAR_RETRY_FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      calendarRetriesFailed += 1;
    }
  }

  let emailRetryQuery = admin
    .from("demo_bookings")
    .select(
      "id,full_name,email,company,slot_start,visitor_timezone,meeting_url,google_event_url,google_event_id,notification_attempts,last_notification_attempt_at",
    )
    .eq("status", "booked")
    .eq("calendar_status", "created")
    .not("meeting_url", "is", null)
    .not("google_event_id", "is", null)
    .in("notification_status", ["pending", "failed", "not_configured"])
    .lt("notification_attempts", 5)
    .or(
      `last_notification_attempt_at.is.null,last_notification_attempt_at.lt.${retryBefore}`,
    )
    .order("created_at", { ascending: true })
    .limit(20);
  if (requestedBookingId) {
    emailRetryQuery = emailRetryQuery.eq("id", requestedBookingId);
  }
  const { data: emailBookings, error } = await emailRetryQuery;
  if (error) {
    console.error("Retry query failed", error);
    return json({ error: "RETRY_QUERY_FAILED" }, 500);
  }

  for (const booking of emailBookings || []) {
    const attempts = Number(booking.notification_attempts || 0) + 1;
    try {
      const emails = await sendBookingEmails({
        id: booking.id,
        name: booking.full_name,
        email: booking.email,
        company: booking.company,
        slotStart: booking.slot_start,
        timeZone: booking.visitor_timezone,
        meetingUrl: booking.meeting_url,
        eventUrl: booking.google_event_url,
        iCalUID: `${booking.google_event_id}@google.com`,
        organizerEmail: Deno.env.get("GOOGLE_ORGANIZER_EMAIL") ||
          "demos@sadha.ai",
      });
      await admin
        .from("demo_bookings")
        .update({
          notification_status: "sent",
          notification_attempts: attempts,
          last_notification_attempt_at: new Date().toISOString(),
          resend_email_id: emails.attendeeEmailId,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      sent += 1;
    } catch (retryError) {
      console.error("Booking email retry failed", booking.id, retryError);
      await admin
        .from("demo_bookings")
        .update({
          notification_status: "failed",
          notification_attempts: attempts,
          last_notification_attempt_at: new Date().toISOString(),
          last_error: retryError instanceof Error
            ? retryError.message.slice(0, 500)
            : "EMAIL_RETRY_FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      failed += 1;
    }
  }

  return json({
    processed: (calendarBookings || []).length + (emailBookings || []).length,
    calendars_recovered: calendarsRecovered,
    calendar_retries_failed: calendarRetriesFailed,
    sent,
    failed,
  });
});
