import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { buildDemoFollowupEmail } from "../_shared/demo-followup-email.ts";
import { processDemoFollowups } from "../_shared/demo-followups.ts";
import { getFromEmail, sendEmail } from "../_shared/email.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "NOT_ALLOWED" }, 405);
  const cronSecret = Deno.env.get("DEMO_FOLLOWUP_CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const projectUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(projectUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  try {
    const result = await processDemoFollowups(admin, (followup) => sendEmail(
      buildDemoFollowupEmail(followup, getFromEmail(), projectUrl),
      `demo-lead-followup/${followup.id}`,
    ));
    return json(result);
  } catch (error) {
    console.error("Demo follow-up worker failed", error);
    return json({ error: "FOLLOWUP_WORKER_FAILED" }, 500);
  }
});
