import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { hashRateLimitKey } from "../_shared/booking.ts";
import { corsHeadersFor, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { validateLeadCapture } from "../_shared/lead-capture.ts";
import { BotVerificationError, verifyBotProof } from "../_shared/bot-verification.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(request) });
  if (request.method !== "POST" || !isAllowedOrigin(request)) {
    return jsonResponse(request, { error: "NOT_ALLOWED" }, 403);
  }
  let capture;
  let payload;
  try {
    payload = await request.json();
    capture = validateLeadCapture(payload);
  } catch {
    return jsonResponse(request, { error: "INVALID_CAPTURE" }, 400);
  }

  try {
    await verifyBotProof(payload, "demo_lead", Deno.env.get("TURNSTILE_SECRET_KEY"));
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
  } catch (error) {
    if (error instanceof BotVerificationError) {
      return jsonResponse(request, { error: error.code }, error.status);
    }
    // Do not log email addresses or private database/provider payloads.
    console.error("Demo lead capture failed");
    return jsonResponse(request, { error: "PLEASE_TRY_AGAIN" }, 503);
  }
});
