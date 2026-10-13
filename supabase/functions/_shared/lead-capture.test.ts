import { validateLeadCapture } from "./lead-capture.ts";

const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const valid = { email: "abdarrahman2345@gmail.com", page_path: "/#demo-email-captured", source: "sadha_landing" };

Deno.test("desktop and mobile accept and normalize personal and work emails", () => {
  for (const source of ["sadha_landing", "sadha_mobile_landing"]) {
    for (const email of [" User@Gmail.com ", "user@outlook.com", "user@sadha.ai"]) {
      const capture = validateLeadCapture({ ...valid, source, email });
      assert(capture.email === email.trim().toLowerCase(), "Email should normalize");
      assert(capture.source === source, "Source should be preserved");
    }
  }
});

Deno.test("capture accepts Continue paths and rejects malformed or non-Continue payloads", () => {
  validateLeadCapture({ ...valid, page_path: "/demo/?utm_source=ads#demo-email-captured" });
  for (const payload of [
    null, [], "email", { ...valid, email: "bad-email" }, { ...valid, email: 1 },
    { ...valid, email: `${"a".repeat(250)}@gmail.com` },
    { ...valid, source: "unknown" }, { ...valid, source: null },
    { ...valid, page_path: "/other-form" }, { ...valid, page_path: "https://other.com/#demo-email-captured" },
    { ...valid, page_path: `/${"a".repeat(2048)}#demo-email-captured` },
  ]) {
    let rejected = false;
    try { validateLeadCapture(payload); } catch { rejected = true; }
    assert(rejected, "Invalid capture should be rejected");
  }
});
