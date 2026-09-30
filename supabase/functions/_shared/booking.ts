export const OWNER_TIME_ZONE = "Asia/Dubai";
export const BOOKING_DURATION_MINUTES = 30;
const MINIMUM_NOTICE_MS = 2 * 60 * 60 * 1000;
const MAXIMUM_NOTICE_MS = 60 * 24 * 60 * 60 * 1000;

const personalEmailDomains = new Set([
  "aol.com",
  "fastmail.com",
  "gmail.com",
  "googlemail.com",
  "hey.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
  "yandex.com",
]);

export type BookingPayload = {
  name: string;
  email: string;
  company: string;
  slotStart: string;
  timeZone: string;
};

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const getDubaiParts = (date: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: OWNER_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

export const validateBookingPayload = (input: unknown): BookingPayload => {
  if (!input || typeof input !== "object") {
    throw new Error("INVALID_BOOKING");
  }

  const body = input as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const company = String(body.company || "").trim();
  const slotStart = String(body.slotStart || "");
  const timeZone = String(body.timeZone || OWNER_TIME_ZONE);
  const slot = new Date(slotStart);

  if (name.length < 2 || name.length > 120) {
    throw new Error("INVALID_NAME");
  }
  if (!emailPattern.test(email) || email.length > 254) {
    throw new Error("INVALID_EMAIL");
  }
  if (personalEmailDomains.has(email.split("@").at(-1) || "")) {
    throw new Error("WORK_EMAIL_REQUIRED");
  }
  if (company.length < 2 || company.length > 160) {
    throw new Error("INVALID_COMPANY");
  }
  if (Number.isNaN(slot.getTime())) {
    throw new Error("INVALID_SLOT");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(slot);
  } catch {
    throw new Error("INVALID_TIME_ZONE");
  }

  const now = Date.now();
  const delta = slot.getTime() - now;
  const parts = getDubaiParts(slot);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);

  if (
    delta < MINIMUM_NOTICE_MS ||
    delta > MAXIMUM_NOTICE_MS ||
    hour < 9 ||
    hour >= 23 ||
    ![0, 30].includes(minute) ||
    slot.getUTCSeconds() !== 0 ||
    slot.getUTCMilliseconds() !== 0
  ) {
    throw new Error("INVALID_SLOT");
  }

  return {
    name,
    email,
    company,
    slotStart: slot.toISOString(),
    timeZone,
  };
};

export const getBookingEnd = (slotStart: string) =>
  new Date(
    new Date(slotStart).getTime() + BOOKING_DURATION_MINUTES * 60_000,
  ).toISOString();

export const hashRateLimitKey = async (request: Request, email: string) => {
  const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
  const ip = forwardedFor.split(",")[0].trim();
  const bytes = new TextEncoder().encode(`${ip}|${email}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
