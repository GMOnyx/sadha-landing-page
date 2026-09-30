import { BOOKING_DURATION_MINUTES, getBookingEnd } from "./booking.ts";

type BusyInterval = { start: string; end: string };

type GoogleEvent = {
  id: string;
  iCalUID?: string;
  htmlLink?: string;
  hangoutLink?: string;
  organizer?: { email?: string };
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

const requireEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
};

const getAccessToken = async () => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error("GOOGLE_AUTH_FAILED");
  }
  return String(data.access_token);
};

const getCalendarIds = () => {
  const primary = requireEnv("GOOGLE_CALENDAR_ID");
  const busy = Deno.env.get("GOOGLE_BUSY_CALENDAR_IDS")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return { primary, busy: busy?.length ? busy : [primary] };
};

export const getBusyIntervals = async (timeMin: string, timeMax: string) => {
  const token = await getAccessToken();
  const { busy: calendarIds } = getCalendarIds();
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "UTC",
        items: calendarIds.map((id) => ({ id })),
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error("GOOGLE_FREEBUSY_FAILED");
  }

  const intervals: BusyInterval[] = [];
  for (const calendarId of calendarIds) {
    const calendar = data.calendars?.[calendarId];
    if (!calendar || calendar.errors?.length) {
      throw new Error("GOOGLE_FREEBUSY_FAILED");
    }
    intervals.push(...(calendar.busy || []));
  }
  return intervals;
};

const findMeetingUrl = (event: GoogleEvent) =>
  event.hangoutLink ||
  event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  )?.uri ||
  "";

const getEvent = async (
  accessToken: string,
  calendarId: string,
  eventId: string,
) => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events/${eventId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("GOOGLE_EVENT_LOOKUP_FAILED");
  }
  return (await response.json()) as GoogleEvent;
};

export const createCalendarEvent = async (booking: {
  id: string;
  name: string;
  email: string;
  company: string;
  slotStart: string;
}) => {
  const accessToken = await getAccessToken();
  const { primary: calendarId } = getCalendarIds();
  const hostEmails = (Deno.env.get("SADHA_HOST_EMAILS") || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const organizerEmail = (Deno.env.get("GOOGLE_ORGANIZER_EMAIL") || "")
    .trim()
    .toLowerCase();
  const attendees = [
    ...new Set([booking.email.toLowerCase(), ...hostEmails]),
  ]
    .filter((email) => email !== organizerEmail)
    .map((email) => ({ email }));
  const eventId = `sadha${booking.id.replaceAll("-", "")}`;
  const endpoint =
    `https://www.googleapis.com/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events` +
    "?conferenceDataVersion=1&sendUpdates=all";
  const eventBody = {
    id: eventId,
    summary: `SADHA demo — ${booking.company}`,
    description:
      `SADHA revenue intelligence demo\n\nContact: ${booking.name} (${booking.email})\nCompany: ${booking.company}`,
    start: { dateTime: booking.slotStart, timeZone: "UTC" },
    end: { dateTime: getBookingEnd(booking.slotStart), timeZone: "UTC" },
    attendees,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    conferenceData: {
      createRequest: {
        requestId: booking.id,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 30 },
      ],
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  let event: GoogleEvent;
  if (response.status === 409) {
    event = await getEvent(accessToken, calendarId, eventId);
  } else {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Google event creation failed", response.status, data);
      throw new Error("GOOGLE_EVENT_CREATE_FAILED");
    }
    event = data as GoogleEvent;
  }

  for (let attempt = 0; attempt < 6 && !findMeetingUrl(event); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    event = await getEvent(accessToken, calendarId, eventId);
  }

  return {
    eventId: event.id,
    eventUrl: event.htmlLink || "",
    meetingUrl: findMeetingUrl(event) || event.htmlLink || "",
    iCalUID: event.iCalUID || `${event.id}@google.com`,
    organizerEmail: event.organizer?.email ||
      Deno.env.get("GOOGLE_ORGANIZER_EMAIL") || "demos@sadha.ai",
    durationMinutes: BOOKING_DURATION_MINUTES,
  };
};
