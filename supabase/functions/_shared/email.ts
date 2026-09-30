import { BOOKING_DURATION_MINUTES, OWNER_TIME_ZONE } from "./booking.ts";

type BookingEmailInput = {
  id: string;
  name: string;
  email: string;
  company: string;
  slotStart: string;
  timeZone: string;
  meetingUrl: string;
  eventUrl: string;
  iCalUID: string;
  organizerEmail: string;
};

const htmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) => htmlEntities[character] || character,
  );

const escapeIcs = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");

const formatIcsUtc = (date: Date) =>
  date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(
    /\.\d{3}Z$/,
    "Z",
  );

const toBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const formatMoment = (slot: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(slot);

const buildGoogleCalendarUrl = (booking: BookingEmailInput) => {
  const start = new Date(booking.slotStart);
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "SADHA demo",
    dates: `${formatIcsUtc(start)}/${formatIcsUtc(end)}`,
    details: `SADHA revenue intelligence demo\n\nJoin: ${booking.meetingUrl}`,
    location: booking.meetingUrl,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const buildIcs = (booking: BookingEmailInput) => {
  const start = new Date(booking.slotStart);
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SADHA//Demo Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(booking.iCalUID)}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    "SUMMARY:SADHA demo",
    `DESCRIPTION:${
      escapeIcs(`SADHA revenue intelligence demo\nJoin: ${booking.meetingUrl}`)
    }`,
    `LOCATION:${escapeIcs(booking.meetingUrl)}`,
    `URL:${escapeIcs(booking.meetingUrl)}`,
    `ORGANIZER;CN=SADHA:mailto:${booking.organizerEmail}`,
    `ATTENDEE;CN=${escapeIcs(booking.name)};RSVP=TRUE:mailto:${booking.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

const sendEmail = async (
  payload: Record<string, unknown>,
  idempotencyKey: string,
) => {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) throw new Error("MISSING_RESEND_API_KEY");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    console.error("Resend delivery failed", response.status, data);
    throw new Error("RESEND_DELIVERY_FAILED");
  }
  return String(data.id);
};

export const sendBookingEmails = async (booking: BookingEmailInput) => {
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "SADHA <demos@sadha.ai>";
  const hostEmails = (Deno.env.get("SADHA_HOST_EMAILS") || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const slot = new Date(booking.slotStart);
  const visitorMoment = formatMoment(slot, booking.timeZone);
  const dubaiMoment = formatMoment(slot, OWNER_TIME_ZONE);
  const calendarUrl = buildGoogleCalendarUrl(booking);
  const meetingUrl = escapeHtml(booking.meetingUrl);
  const attendeeHtml = `
    <div style="background:#f4f0e8;padding:32px 16px;font-family:Arial,sans-serif;color:#111">
      <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #ded8cc;border-radius:20px;padding:36px">
        <p style="margin:0 0 12px;color:#77736c;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">SADHA demo confirmed</p>
        <h1 style="margin:0 0 20px;font-size:34px;line-height:1.05">You’re all set, ${
    escapeHtml(booking.name)
  }.</h1>
        <p style="font-size:17px;line-height:1.55;margin:0 0 24px">We’ll show you how SADHA turns calls and WhatsApp conversations into CRM intelligence.</p>
        <div style="background:#f7f4ee;border-radius:14px;padding:20px;margin-bottom:24px">
          <strong style="display:block;font-size:18px;margin-bottom:8px">${
    escapeHtml(visitorMoment)
  }</strong>
          <span style="display:block;color:#666;margin-bottom:5px">Dubai: ${
    escapeHtml(dubaiMoment)
  }</span>
          <span style="display:block;color:#666">30-minute demo · Google Meet</span>
        </div>
        <a href="${meetingUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;border-radius:10px;padding:15px 24px;font-weight:700;margin:0 8px 12px 0">Join Google Meet</a>
        <a href="${
    escapeHtml(calendarUrl)
  }" style="display:inline-block;color:#111;text-decoration:none;border:1px solid #111;border-radius:10px;padding:14px 22px;font-weight:700">Add to Google Calendar</a>
        <p style="color:#777;font-size:13px;line-height:1.5;margin:24px 0 0">Using Outlook, Apple Calendar, or another corporate calendar? Open the attached <strong>sadha-demo.ics</strong> file. The date, time, and meeting link are also shown above in case attachments are blocked.</p>
      </div>
    </div>`;
  const attendeeText = [
    `Your SADHA demo is confirmed, ${booking.name}.`,
    "",
    visitorMoment,
    `Dubai: ${dubaiMoment}`,
    "30-minute demo",
    `Join: ${booking.meetingUrl}`,
    `Add to Google Calendar: ${calendarUrl}`,
    "",
    "An .ics calendar file is attached for Outlook, Apple Calendar, and other calendar apps.",
  ].join("\n");
  const ics = buildIcs(booking);

  const attendeeEmailId = await sendEmail(
    {
      from,
      to: [booking.email],
      reply_to: hostEmails[0] || booking.organizerEmail,
      subject: `Your SADHA demo is booked — ${visitorMoment}`,
      html: attendeeHtml,
      text: attendeeText,
      attachments: [{ filename: "sadha-demo.ics", content: toBase64(ics) }],
      tags: [{ name: "booking_id", value: booking.id.replaceAll("-", "") }],
    },
    `booking-confirmation/${booking.id}`,
  );

  let ownerEmailId = "";
  if (hostEmails.length) {
    ownerEmailId = await sendEmail(
      {
        from,
        to: hostEmails,
        reply_to: booking.email,
        subject: `New SADHA demo — ${booking.company} — ${dubaiMoment}`,
        html: `<h2>New SADHA demo booked</h2><p><strong>${
          escapeHtml(booking.name)
        }</strong> from <strong>${escapeHtml(booking.company)}</strong></p><p>${
          escapeHtml(dubaiMoment)
        }</p><p><a href="${meetingUrl}">Join Google Meet</a></p><p>Contact: <a href="mailto:${
          escapeHtml(booking.email)
        }">${escapeHtml(booking.email)}</a></p>`,
        text:
          `New SADHA demo booked\n${booking.name} — ${booking.company}\n${booking.email}\n${dubaiMoment}\n${booking.meetingUrl}`,
        tags: [{ name: "booking_id", value: booking.id.replaceAll("-", "") }],
      },
      `booking-owner-alert/${booking.id}`,
    );
  }

  return { attendeeEmailId, ownerEmailId };
};
