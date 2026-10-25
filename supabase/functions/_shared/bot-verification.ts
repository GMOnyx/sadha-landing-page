const allowedHostnames = new Set(["sadha.ai", "www.sadha.ai"]);
export type BotAction = "demo_lead" | "demo_booking";

export class BotVerificationError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

// This is always checked before saving a lead or contacting Google/Resend.
// There is deliberately no production bypass for missing config or outages.
export const verifyBotProof = async (
  input: unknown,
  action: BotAction,
  secret: string | undefined,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
) => {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (body.website !== undefined && body.website !== "") {
    throw new BotVerificationError("BOT_VERIFICATION_FAILED", 403);
  }
  const token = body.turnstileToken;
  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    throw new BotVerificationError("BOT_VERIFICATION_REQUIRED", 403);
  }
  const key = secret?.trim();
  if (!key || /^[123]x0+AA$/.test(key)) {
    throw new BotVerificationError("BOT_VERIFICATION_UNAVAILABLE", 503);
  }

  let result;
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: key, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("SITEVERIFY_UNAVAILABLE");
    result = await response.json();
  } catch {
    throw new BotVerificationError("BOT_VERIFICATION_UNAVAILABLE", 503);
  }
  if (!result || result.success !== true) {
    const errors = result?.["error-codes"];
    const unavailable = Array.isArray(errors) && errors.some((code: string) =>
      ["internal-error", "invalid-input-secret", "missing-input-secret"].includes(code));
    throw new BotVerificationError(unavailable ? "BOT_VERIFICATION_UNAVAILABLE" : "BOT_VERIFICATION_FAILED", unavailable ? 503 : 403);
  }
  const solvedAt = Date.parse(result.challenge_ts);
  if (!allowedHostnames.has(result.hostname) || result.action !== action
    || !Number.isFinite(solvedAt) || now() - solvedAt > 300_000 || solvedAt - now() > 60_000) {
    throw new BotVerificationError("BOT_VERIFICATION_FAILED", 403);
  }
};
