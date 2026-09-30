const allowedOrigins = new Set([
  "https://sadha.ai",
  "https://www.sadha.ai",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
]);

export const isAllowedOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins.has(origin);
};

export const corsHeadersFor = (request: Request) => {
  const origin = request.headers.get("origin");
  const allowedOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : "https://sadha.ai";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
};

export const jsonResponse = (
  request: Request,
  body: unknown,
  status = 200,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeadersFor(request),
  });
