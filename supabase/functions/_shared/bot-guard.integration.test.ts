import { createClient } from "npm:@supabase/supabase-js@2.112.3";

// Import the real public handlers without starting a server or contacting prod.
// A missing/forged proof must never reach Supabase, Calendar, or Resend.
Deno.test("both live handlers reject bot submissions before any database, calendar, or email call", async () => {
  const env = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY"];
  const previous = env.map((key) => Deno.env.get(key));
  const originalServe = Deno.serve;
  const originalFetch = globalThis.fetch;
  const handlers: ((request: Request) => Promise<Response>)[] = [];
  const destinations: string[] = [];
  try {
    Deno.env.set("SUPABASE_URL", "https://test-project.example");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-only-dummy-service-key");
    Deno.env.set("TURNSTILE_SECRET_KEY", "test-only-mocked-widget-secret");
    Object.defineProperty(Deno, "serve", { configurable: true, writable: true, value: (handler: (request: Request) => Promise<Response>) => {
      handlers.push(handler);
    } });
    globalThis.fetch = (input) => {
      const url = String(input);
      destinations.push(url);
      if (url !== "https://challenges.cloudflare.com/turnstile/v0/siteverify") throw new Error("Unexpected external side effect");
      return Promise.resolve(new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })));
    };
    // Resolve the SDK before loading the handler imports.
    if (typeof createClient !== "function") throw new Error("SDK unavailable");
    await import("../capture-demo-lead/index.ts");
    await import("../create-demo-booking/index.ts");
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setUTCHours(5, 0, 0, 0);
    const payloads = [
      { email: "bot-guard@tests.example", source: "sadha_landing", page_path: "/#demo-email-captured" },
      { name: "Bot Guard QA", email: "bot-guard@tests.example", company: "Local tests", source: "sadha_mobile_landing", slotStart: tomorrow.toISOString(), timeZone: "Asia/Dubai" },
    ];
    if (handlers.length !== 2) throw new Error("Did not load both real handlers");
    for (const [index, handler] of handlers.entries()) {
      for (const proof of [{}, { turnstileToken: "forged-token" }, { turnstileToken: "forged-token", website: "https://spam.example" }]) {
        const result = await handler(new Request("https://test-project.example/functions/v1/test", {
          method: "POST", headers: { Origin: "https://sadha.ai", "Content-Type": "application/json" },
          body: JSON.stringify({ ...payloads[index], ...proof }),
        }));
        const body = await result.json();
        if (result.status !== 403 || !body.error?.startsWith("BOT_VERIFICATION_")) {
          throw new Error(`Handler ${index} allowed a bot or reported success: ${result.status}`);
        }
      }
    }
    if (destinations.length !== 2) throw new Error("Missing proof and honeypot should not call even Siteverify");
  } finally {
    Object.defineProperty(Deno, "serve", { configurable: true, writable: true, value: originalServe });
    globalThis.fetch = originalFetch;
    env.forEach((key, index) => previous[index] === undefined ? Deno.env.delete(key) : Deno.env.set(key, previous[index]!));
  }
});
