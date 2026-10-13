import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { hashRateLimitKey } from "../_shared/booking.ts";
import { corsHeadersFor, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { validateLeadCapture } from "../_shared/lead-capture.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(request) });
  if (request.method !== "POST" || !isAllowedOrigin(request)) {
    return jsonResponse(request, { error: "NOT_ALLOWED" }, 403);
  }
  let capture;
  try {
    capture = validateLeadCapture(await request.json());
  } catch {
    return jsonResponse(request, { error: "INVALID_CAPTURE" }, 400);
  }

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const [fingerprint, ipFingerprint] = await Promise.all([
      hashRateLimitKey(request, `lead-capture:${capture.email}`),
      hashRateLimitKey(request, "lead-capture:ip"),
    ]);
    const { data, error } = await admin.rpc("capture_demo_lead", {
      p_email: capture.email,
      p_page_path: capture.pagePath,
      p_source: capture.source,
      p_fingerprint: fingerprint,
      p_ip_fingerprint: ipFingerprint,
    });
    if (error?.message === "RATE_LIMITED") return jsonResponse(request, { error: "RATE_LIMITED" }, 429);
    if (error || data?.captured !== true) throw new Error("CAPTURE_FAILED");
    return jsonResponse(request, { captured: true });
  } catch {
    // Do not log email addresses or private database/provider payloads.
    console.error("Demo lead capture failed");
    return jsonResponse(request, { error: "PLEASE_TRY_AGAIN" }, 503);
  }
});
