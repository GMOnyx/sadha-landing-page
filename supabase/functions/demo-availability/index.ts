import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { BOOKING_DURATION_MINUTES } from "../_shared/booking.ts";
import {
  corsHeadersFor,
  isAllowedOrigin,
  jsonResponse,
} from "../_shared/cors.ts";
import { getBusyIntervals } from "../_shared/google.ts";

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

  try {
    const body = await request.json();
    const rangeStart = new Date(String(body.range_start || ""));
    const rangeEnd = new Date(String(body.range_end || ""));
    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
    if (
      Number.isNaN(rangeStart.getTime()) ||
      Number.isNaN(rangeEnd.getTime()) ||
      rangeMs <= 0 ||
      rangeMs > 62 * 24 * 60 * 60 * 1000
    ) {
      return jsonResponse(request, { error: "INVALID_RANGE" }, 400);
    }

    const admin = getAdminClient();
    const [{ data: reserved, error: reservationError }, googleBusy] =
      await Promise.all([
        admin.rpc("get_booked_demo_slots", {
          range_start: rangeStart.toISOString(),
          range_end: rangeEnd.toISOString(),
        }),
        getBusyIntervals(rangeStart.toISOString(), rangeEnd.toISOString()),
      ]);
    if (reservationError) throw reservationError;

    const busy = [
      ...(reserved || []).map((row: { slot_start: string }) => ({
        start: new Date(row.slot_start).toISOString(),
        end: new Date(
          new Date(row.slot_start).getTime() +
            BOOKING_DURATION_MINUTES * 60_000,
        ).toISOString(),
      })),
      ...googleBusy,
    ];
    const unavailable = new Set<string>();
    const stepMs = BOOKING_DURATION_MINUTES * 60_000;
    const firstSlot = Math.ceil(rangeStart.getTime() / stepMs) * stepMs;

    for (
      let timestamp = firstSlot;
      timestamp < rangeEnd.getTime();
      timestamp += stepMs
    ) {
      const slotEnd = timestamp + stepMs;
      if (
        busy.some((interval) =>
          timestamp < new Date(interval.end).getTime() &&
          slotEnd > new Date(interval.start).getTime()
        )
      ) {
        unavailable.add(new Date(timestamp).toISOString());
      }
    }

    return jsonResponse(request, {
      unavailable_slots: [...unavailable].sort(),
    });
  } catch (error) {
    console.error("Availability lookup failed", error);
    return jsonResponse(request, { error: "AVAILABILITY_UNAVAILABLE" }, 503);
  }
});
