import type { DemoFollowup } from "./demo-followup-email.ts";

type RpcResult = { data: unknown; error: unknown };
type FollowupAdmin = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export const processDemoFollowups = async (
  admin: FollowupAdmin,
  deliver: (followup: DemoFollowup) => Promise<string>,
) => {
  const { data, error } = await admin.rpc("claim_demo_lead_followups", { batch_size: 5 });
  if (error) throw new Error("FOLLOWUP_CLAIM_FAILED");
  const followups = (data || []) as DemoFollowup[];
  const result = { processed: followups.length, sent: 0, skipped: 0, failed: 0 };

  for (const followup of followups) {
    const identity = { followup_id: followup.id, attempt_number: followup.attempts };
    try {
      // Check again immediately before delivery, not just when claiming the batch.
      const eligible = await admin.rpc("can_send_demo_lead_followup", identity);
      if (eligible.error) throw new Error("FOLLOWUP_ELIGIBILITY_CHECK_FAILED");
      if (eligible.data !== true) {
        const finished = await admin.rpc("finish_demo_lead_followup", {
          ...identity, outcome: "skipped",
        });
        if (finished.error) throw new Error("FOLLOWUP_STATUS_UPDATE_FAILED");
        result.skipped += 1;
        continue;
      }

      const emailId = await deliver(followup);
      const finished = await admin.rpc("finish_demo_lead_followup", {
        ...identity, outcome: "sent", email_id: emailId,
      });
      if (finished.error) throw new Error("FOLLOWUP_STATUS_UPDATE_FAILED");
      result.sent += 1;
    } catch (sendError) {
      const code = sendError instanceof Error ? sendError.message : "FOLLOWUP_SEND_FAILED";
      // Do not log recipient addresses or provider payloads here.
      console.error("Demo follow-up failed", followup.id, code);
      const finished = await admin.rpc("finish_demo_lead_followup", {
        ...identity, outcome: "retry", error_message: code,
      });
      if (finished.error) console.error("Follow-up status persistence failed", followup.id);
      result.failed += 1;
    }
  }

  return result;
};
