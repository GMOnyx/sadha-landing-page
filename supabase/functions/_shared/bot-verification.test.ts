import { BotVerificationError, verifyBotProof } from "./bot-verification.ts";

const now = Date.parse("2026-10-25T10:00:00Z");
const validResult = { success: true, hostname: "sadha.ai", action: "demo_lead", challenge_ts: new Date(now).toISOString() };
const payload = { turnstileToken: "real-one-use-token", website: "" };
const secret = "production-widget-secret";
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const response = (value: unknown, status = 200): typeof fetch => () => Promise.resolve(new Response(JSON.stringify(value), { status }));
const rejected = async (run: () => Promise<void>, code: string, status: number) => {
  try { await run(); } catch (error) {
    assert(error instanceof BotVerificationError && error.code === code && error.status === status, `Wrong error: ${String(error)}`);
    return;
  }
  throw new Error("Verification unexpectedly passed");
};

Deno.test("missing, blank, oversized, and malformed proofs fail before any network or side effects", async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => { calls++; throw new Error("Must not call Siteverify"); };
  for (const value of [null, {}, { turnstileToken: 4 }, { turnstileToken: " " }, { turnstileToken: "x".repeat(2049) }]) {
    await rejected(() => verifyBotProof(value, "demo_lead", secret, fetcher), "BOT_VERIFICATION_REQUIRED", 403);
  }
  assert(calls === 0, "Missing proofs must never reach the provider");
});

Deno.test("honeypot submissions are rejected even with a valid-looking token", async () => {
  await rejected(() => verifyBotProof({ ...payload, website: "https://spam.example" }, "demo_lead", secret), "BOT_VERIFICATION_FAILED", 403);
});

Deno.test("missing secrets and public test secrets cannot disable production verification", async () => {
  for (const key of [undefined, "", " ", "1x0000000000000000000000000000000AA", "2x0000000000000000000000000000000AA"]) {
    await rejected(() => verifyBotProof(payload, "demo_lead", key), "BOT_VERIFICATION_UNAVAILABLE", 503);
  }
});

Deno.test("valid production hostname and matching action pass for both booking steps", async () => {
  for (const hostname of ["sadha.ai", "www.sadha.ai"]) {
    for (const action of ["demo_lead", "demo_booking"] as const) {
      await verifyBotProof(payload, action, secret, response({ ...validResult, hostname, action }), () => now);
    }
  }
});

Deno.test("only the token and private key are sent to the exact Siteverify endpoint", async () => {
  const fetcher: typeof fetch = (url, init) => {
    assert(url === "https://challenges.cloudflare.com/turnstile/v0/siteverify", "Wrong verification endpoint");
    const body = JSON.parse(String(init?.body));
    assert(body.secret === secret && body.response === payload.turnstileToken, "Missing proof");
    assert(Object.keys(body).length === 2, "Do not disclose lead data to Siteverify");
    assert(init?.method === "POST" && init.signal instanceof AbortSignal, "Verification must have a timeout");
    return Promise.resolve(new Response(JSON.stringify(validResult)));
  };
  await verifyBotProof({ ...payload, email: "private@example.com" }, "demo_lead", secret, fetcher, () => now);
});

Deno.test("forged, expired, and replayed tokens are rejected according to Siteverify", async () => {
  for (const code of ["invalid-input-response", "timeout-or-duplicate"]) {
    await rejected(() => verifyBotProof(payload, "demo_lead", secret, response({ success: false, "error-codes": [code] })), "BOT_VERIFICATION_FAILED", 403);
  }
});

Deno.test("a lead token cannot be reused for booking and another hostname cannot impersonate Sadha", async () => {
  for (const invalid of [
    { ...validResult, action: "demo_booking" },
    { ...validResult, hostname: "sadha.ai.attacker.example" },
    { ...validResult, hostname: "localhost" },
    { ...validResult, hostname: "other.sadha.ai" },
    { ...validResult, success: "true" },
    { ...validResult, challenge_ts: new Date(now - 301_000).toISOString() },
    { ...validResult, challenge_ts: new Date(now + 61_000).toISOString() },
    { ...validResult, challenge_ts: "not-a-date" },
    null,
  ]) {
    await rejected(() => verifyBotProof(payload, "demo_lead", secret, response(invalid), () => now), "BOT_VERIFICATION_FAILED", 403);
  }
});

Deno.test("provider outages, invalid provider JSON, and bad private config fail closed", async () => {
  for (const fetcher of [
    response({}, 503),
    response({ success: false, "error-codes": ["internal-error"] }),
    response({ success: false, "error-codes": ["invalid-input-secret"] }),
    (() => Promise.reject(new Error("Network timeout"))) as typeof fetch,
    (() => Promise.resolve(new Response("not json"))) as typeof fetch,
  ]) {
    await rejected(() => verifyBotProof(payload, "demo_lead", secret, fetcher), "BOT_VERIFICATION_UNAVAILABLE", 503);
  }
});
