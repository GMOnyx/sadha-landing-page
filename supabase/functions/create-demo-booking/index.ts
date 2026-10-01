import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import {
  BOOKING_DURATION_MINUTES,
  getBookingEnd,
  hashRateLimitKey,
  validateBookingPayload,
} from "../_shared/booking.ts";
import {
  corsHeadersFor,
  isAllowedOrigin,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  sendBookingEmails,
  sendBookingRequestEmails,
} from "../_shared/email.ts";
import { createCalendarEvent, getBusyIntervals } from "../_shared/google.ts";

const getAdminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(request) });
  }
  if (request.method !== "POST" || !isAllowedOrigin(request)) {
    return jsonResponse(request, { error: "NOT_ALLOWED" }, 403);
  }

  const admin = getAdminClient();
  let bookingId = "";

  try {
    const booking = validateBookingPayload(await request.json());
    const fingerprint = await hashRateLimitKey(request, booking.email);
    const rateWindow = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("demo_booking_attempts")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", fingerprint)
      .gte("created_at", rateWindow);
    if ((count || 0) >= 8) {
      return jsonResponse(request, { error: "RATE_LIMITED" }, 429);
    }
    await admin.from("demo_booking_attempts").insert({ fingerprint });

    const slotEnd = getBookingEnd(booking.slotStart);
    const busy = await getBusyIntervals(booking.slotStart, slotEnd);
    if (busy.length) {
      return jsonResponse(request, { error: "SLOT_TAKEN" }, 409);
    }

    const { data: saved, error: insertError } = await admin
      .from("demo_bookings")
      .insert({
        full_name: booking.name,
        email: booking.email,
        company: booking.company,
        slot_start: booking.slotStart,
        duration_minutes: BOOKING_DURATION_MINUTES,
        visitor_timezone: booking.timeZone,
        owner_timezone: "Asia/Dubai",
        status: "pending",
        calendar_status: "pending",
        notification_status: "pending",
        source: "sadha_landing",
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse(request, { error: "SLOT_TAKEN" }, 409);
      }
      throw insertError;
    }
    bookingId = saved.id;

    let calendar;
    try {
      calendar = await createCalendarEvent({
        id: bookingId,
        name: booking.name,
        email: booking.email,
        company: booking.company,
        slotStart: booking.slotStart,
      });
    } catch (calendarError) {
      const calendarErrorMessage = calendarError instanceof Error
        ? calendarError.message.slice(0, 500)
        : "GOOGLE_EVENT_CREATE_FAILED";
      console.error(
        "Calendar creation failed; sending request receipt",
        calendarError,
      );
      const failedAt = new Date().toISOString();
      await admin
        .from("demo_bookings")
        .update({
          status: "pending",
          calendar_status: "failed",
          last_error: calendarErrorMessage,
          updated_at: failedAt,
        })
        .eq("id", bookingId);

      let notificationStatus = "sent";
      try {
        const emails = await sendBookingRequestEmails({
          id: bookingId,
          ...booking,
        });
        await admin
          .from("demo_bookings")
          .update({
            notification_status: "sent",
            notification_attempts: 1,
            last_notification_attempt_at: new Date().toISOString(),
            resend_email_id: emails.attendeeEmailId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
      } catch (emailError) {
        console.error("Booking request receipt failed", emailError);
        notificationStatus = "retry_required";
        const emailErrorMessage = emailError instanceof Error
          ? emailError.message.slice(0, 240)
          : "EMAIL_FAILED";
        await admin
          .from("demo_bookings")
          .update({
            notification_status: Deno.env.get("RESEND_API_KEY")
              ? "failed"
              : "not_configured",
            notification_attempts: 1,
            last_notification_attempt_at: new Date().toISOString(),
            last_error: `${calendarErrorMessage};${emailErrorMessage}`.slice(
              0,
              500,
            ),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
      }

      return jsonResponse(request, {
        confirmed: false,
        booking_id: bookingId,
        slot_start: booking.slotStart,
        notification_status: notificationStatus,
      });
    }
    const confirmedAt = new Date().toISOString();
    const { error: confirmationError } = await admin
      .from("demo_bookings")
      .update({
        status: "booked",
        calendar_status: "created",
        google_event_id: calendar.eventId,
        google_event_url: calendar.eventUrl,
        meeting_url: calendar.meetingUrl,
        confirmed_at: confirmedAt,
        updated_at: confirmedAt,
        last_error: null,
      })
      .eq("id", bookingId);
    if (confirmationError) throw confirmationError;

    let notificationStatus = "sent";
    try {
      const emails = await sendBookingEmails({
        id: bookingId,
        ...booking,
        meetingUrl: calendar.meetingUrl,
        eventUrl: calendar.eventUrl,
        iCalUID: calendar.iCalUID,
        organizerEmail: calendar.organizerEmail,
      });
      await admin
        .from("demo_bookings")
        .update({
          notification_status: "sent",
          notification_attempts: 1,
          last_notification_attempt_at: new Date().toISOString(),
          resend_email_id: emails.attendeeEmailId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    } catch (emailError) {
      console.error("Booking confirmed but email delivery failed", emailError);
      notificationStatus = "retry_required";
      await admin
        .from("demo_bookings")
        .update({
          notification_status: Deno.env.get("RESEND_API_KEY")
            ? "failed"
            : "not_configured",
          notification_attempts: 1,
          last_notification_attempt_at: new Date().toISOString(),
          last_error: emailError instanceof Error
            ? emailError.message.slice(0, 500)
            : "EMAIL_FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    return jsonResponse(request, {
      confirmed: true,
      booking_id: bookingId,
      slot_start: booking.slotStart,
      meeting_url: calendar.meetingUrl,
      calendar_url: calendar.eventUrl,
      notification_status: notificationStatus,
    });
  } catch (error) {
    console.error("Booking creation failed", error);
    if (bookingId) {
      await admin
        .from("demo_bookings")
        .update({
          status: "failed",
          calendar_status: "failed",
          last_error: error instanceof Error
            ? error.message.slice(0, 500)
            : "BOOKING_FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }
    const code = error instanceof Error ? error.message : "BOOKING_FAILED";
    const status = [
        "INVALID_BOOKING",
        "INVALID_NAME",
        "INVALID_EMAIL",
        "WORK_EMAIL_REQUIRED",
        "INVALID_COMPANY",
        "INVALID_SLOT",
        "INVALID_TIME_ZONE",
      ].includes(code)
      ? 400
      : 503;
    return jsonResponse(request, { error: code }, status);
  }
});
