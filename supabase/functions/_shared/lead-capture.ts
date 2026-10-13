export const validateLeadCapture = (input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("INVALID_CAPTURE");
  }
  const payload = input as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const pagePath = typeof payload.page_path === "string" ? payload.page_path : "";
  const source = payload.source;
  if (email.length > 254 || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)
    || pagePath.length > 2048 || !pagePath.startsWith("/") || !pagePath.endsWith("#demo-email-captured")
    || (source !== "sadha_landing" && source !== "sadha_mobile_landing")) {
    throw new Error("INVALID_CAPTURE");
  }
  return { email, pagePath, source };
};
