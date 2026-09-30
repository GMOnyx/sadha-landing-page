import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { sendBookingEmails } from "../_shared/email.ts";

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
  const retryBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: bookings, error } = await admin
    .from("demo_bookings")
    .select(
      "id,full_name,email,company,slot_start,visitor_timezone,meeting_url,google_event_url,google_event_id,notification_attempts,last_notification_attempt_at",
    )
    .eq("status", "booked")
    .in("notification_status", ["pending", "failed", "not_configured"])
    .lt("notification_attempts", 5)
    .or(
      `last_notification_attempt_at.is.null,last_notification_attempt_at.lt.${retryBefore}`,
    )
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) {
    console.error("Retry query failed", error);
    return json({ error: "RETRY_QUERY_FAILED" }, 500);
  }

  let sent = 0;
  let failed = 0;
  for (const booking of bookings || []) {
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

  return json({ processed: (bookings || []).length, sent, failed });
});
