import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { corsHeadersFor, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(request) });
  if (!["GET", "POST"].includes(request.method) || !isAllowedOrigin(request)) {
    return jsonResponse(request, { error: "NOT_ALLOWED" }, 405);
  }
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!uuidPattern.test(token)) return jsonResponse(request, { error: "INVALID_LINK" }, 400);
  if (request.method === "GET") {
    // Link scanners do not mutate preferences. HTML is hosted on sadha.ai,
    // since the default Supabase function domain does not serve HTML pages.
    const preferencesUrl = new URL("https://sadha.ai/email-preferences.html");
    preferencesUrl.searchParams.set("token", token);
    return new Response(null, { status: 303, headers: {
      Location: preferencesUrl.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    } });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.rpc("unsubscribe_demo_lead_followup", { token });
  if (error) return jsonResponse(request, { error: "PLEASE_TRY_AGAIN" }, 503);
  return jsonResponse(request, data ? { unsubscribed: true } : { error: "INVALID_LINK" }, data ? 200 : 400);
});
