(() => {
  // Public Cloudflare sitekey, never the private Siteverify secret.
  const SITE_KEY = "0x4AAAAAAFlEbRA1pW0Y5URM";
  const localPreview = window.location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const pending = new Map();
  let apiPromise = null;
  const failure = (code = "BOT_VERIFICATION_UNAVAILABLE") => Object.assign(new Error(code), { code });

  const loadApi = () => {
    if (localPreview) return Promise.resolve(null);
    if (!SITE_KEY || /^[123]x0+[A-Z]{2}$/.test(SITE_KEY)) return Promise.reject(failure());
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!apiPromise) {
      apiPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const timer = window.setTimeout(() => finish(false), 12000);
        const finish = (ok) => {
          window.clearTimeout(timer);
          if (ok && window.turnstile) resolve(window.turnstile);
          else { script.remove(); reject(failure()); }
        };
        window.sadhaTurnstileReady = () => finish(true);
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=sadhaTurnstileReady";
        script.async = true;
        script.onerror = () => finish(false);
        document.head.appendChild(script);
      }).catch((error) => { apiPromise = null; throw error; });
    }
    return apiPromise;
  };

  const reset = () => {
    for (const cancel of [...pending.values()]) cancel();
  };

  const verify = async (action, container, { signal, language = "auto" } = {}) => {
    if (localPreview) return ""; // Local preview never calls production booking APIs.
    if (!container || !["demo_lead", "demo_booking"].includes(action)) throw failure();
    const api = await loadApi();
    if (signal?.aborted) throw failure("BOT_VERIFICATION_CANCELLED");
    pending.get(container)?.();
    let widgetId;
    let timer;
    let abort;
    try {
      return await new Promise((resolve, reject) => {
        abort = () => reject(failure("BOT_VERIFICATION_CANCELLED"));
        pending.set(container, abort);
        signal?.addEventListener("abort", abort, { once: true });
        timer = window.setTimeout(() => reject(failure("BOT_VERIFICATION_FAILED")), 90000);
        widgetId = api.render(container, {
          sitekey: SITE_KEY,
          action,
          theme: "light",
          language,
          size: container.clientWidth < 300 ? "compact" : "flexible",
          appearance: "interaction-only",
          execution: "execute",
          "response-field": false,
          retry: "never",
          "refresh-expired": "manual",
          "refresh-timeout": "manual",
          callback: (token) => typeof token === "string" && token ? resolve(token) : reject(failure()),
          "error-callback": () => { reject(failure()); return true; },
          "expired-callback": () => reject(failure("BOT_VERIFICATION_FAILED")),
          "timeout-callback": () => reject(failure("BOT_VERIFICATION_FAILED")),
          "before-interactive-callback": () => {
            container.classList.add("is-interactive");
            container.scrollIntoView({ block: "nearest", behavior: "smooth" });
          },
        });
        if (typeof widgetId !== "string") { reject(failure()); return; }
        api.execute(widgetId);
      });
    } finally {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (pending.get(container) === abort) pending.delete(container);
      container.classList.remove("is-interactive");
      if (typeof widgetId === "string") api.remove(widgetId);
    }
  };

  window.sadhaBotCheck = {
    warmup: () => { loadApi().catch(() => {}); },
    verify,
    reset,
  };
})();
