import { buildDemoFollowupEmail, type DemoFollowup } from "./demo-followup-email.ts";
import { processDemoFollowups } from "./demo-followups.ts";

const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const lead: DemoFollowup = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "test@example.com",
  full_name: null,
  unsubscribe_token: "22222222-2222-4222-8222-222222222222",
  attempts: 1,
};
const createAdmin = (eligible: boolean | "error" = true, finishError = false) => {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "claim_demo_lead_followups") return { data: [lead], error: null };
      if (name === "can_send_demo_lead_followup") {
        return { data: eligible === true, error: eligible === "error" ? {} : null };
      }
      return { data: null, error: finishError && args.outcome === "sent" ? {} : null };
    },
  };
};

Deno.test("founder email is personal, mobile-friendly, and contains no email in booking URL", () => {
  const mail = buildDemoFollowupEmail(lead, "Abdarrahman from Sadha <abdarrahman@sadha.ai>", "https://project.supabase.co");
  assert(mail.subject === "What time works best for you?", "Wrong subject");
  assert(mail.text.startsWith("Hi there,"), "Missing fallback greeting");
  assert(mail.reply_to === "abdarrahman@sadha.ai", "Replies should go to founder");
  assert(mail.html.includes("book_demo=1"), "Missing direct modal link");
  assert(!mail.html.includes(lead.email), "Do not expose email in links");
  assert(mail.headers["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click", "Missing one-click unsubscribe");
  assert(!mail.text.includes("—"), "Copy should not use em dashes");
  const namedMail = buildDemoFollowupEmail({ ...lead, full_name: "<script> Customer" }, "sender", "https://project.supabase.co");
  assert(!namedMail.html.includes("<script>"), "Name must be escaped");
});

Deno.test("unbooked email gets one send and a persisted delivery ID", async () => {
  const admin = createAdmin();
  let deliveries = 0;
  const result = await processDemoFollowups(admin, async () => { deliveries++; return "resend-id"; });
  assert(result.sent === 1 && deliveries === 1, "Expected one email");
  const finish = admin.calls.find((call) => call.name === "finish_demo_lead_followup");
  assert(finish?.args.email_id === "resend-id" && finish.args.outcome === "sent", "Missing delivery record");
});

Deno.test("booking or opt-out while batch is running prevents email delivery", async () => {
  const admin = createAdmin(false);
  let deliveries = 0;
  const result = await processDemoFollowups(admin, async () => { deliveries++; return "id"; });
  assert(result.skipped === 1 && deliveries === 0, "Ineligible lead was emailed");
});

Deno.test("database check failure fails closed instead of emailing", async () => {
  const admin = createAdmin("error");
  let deliveries = 0;
  const result = await processDemoFollowups(admin, async () => { deliveries++; return "id"; });
  assert(result.failed === 1 && deliveries === 0, "Unverified lead was emailed");
});

Deno.test("provider failure schedules retry rather than claiming success", async () => {
  const admin = createAdmin();
  const result = await processDemoFollowups(admin, async () => { throw new Error("RESEND_DELIVERY_FAILED"); });
  assert(result.failed === 1 && result.sent === 0, "Provider failure was ignored");
  assert(admin.calls.some((call) => call.args.outcome === "retry"), "Missing retry");
});

Deno.test("persistence failure is retried, not marked delivered", async () => {
  const admin = createAdmin(true, true);
  const result = await processDemoFollowups(admin, async () => "resend-id");
  assert(result.failed === 1 && result.sent === 0, "Persistence failure was ignored");
  assert(admin.calls.some((call) => call.args.outcome === "retry"), "Missing persistence retry");
});
