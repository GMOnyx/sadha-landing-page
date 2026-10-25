import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../bot-check.js", import.meta.url), "utf8");
const makeClient = ({ local = false, mode = "success", hasKey = true, apiPresent = true } = {}) => {
  const widgets = new Map();
  const timers = new Map();
  const calls = [];
  const scripts = [];
  let next = 0;
  const api = {
    render(container, options) { const id = String(++next); widgets.set(id, options); calls.push({ id, container, options }); return id; },
    execute(id) { queueMicrotask(() => {
      const options = widgets.get(id);
      if (mode === "success") options?.callback(`token-${id}`);
      if (mode === "error") options?.["error-callback"]();
      if (mode === "expired") options?.["expired-callback"]();
    }); },
    remove(id) { widgets.delete(id); },
  };
  const window = {
    location: { hostname: local ? "localhost" : "sadha.ai", protocol: "https:" },
    turnstile: apiPresent ? api : undefined,
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    createElement() { return { remove() { this.removed = true; } }; },
    head: { appendChild(script) { scripts.push(script); } },
  };
  const code = hasKey ? source : source.replace(/const SITE_KEY = "[^"]*";/, 'const SITE_KEY = "";');
  vm.runInNewContext(code, { window, document });
  const container = () => ({ clientWidth: 260, classList: { add() {}, remove() {} }, scrollIntoView() {} });
  return { client: window.sadhaBotCheck, window, container, widgets, calls, scripts, timers, api };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("each step and retry receive a fresh token, with no persistent widget footprint", async () => {
  const state = makeClient();
  const container = state.container();
  const lead = await state.client.verify("demo_lead", container);
  const booking = await state.client.verify("demo_booking", container);
  const retry = await state.client.verify("demo_booking", container);
  assert.equal(new Set([lead, booking, retry]).size, 3);
  assert.equal(state.widgets.size, 0);
  assert.equal(state.timers.size, 0);
  assert.equal(state.calls[0].options.appearance, "interaction-only");
  assert.equal(state.calls[0].options.execution, "execute");
  assert.equal(state.calls[0].options.size, "compact");
  assert.deepEqual(state.calls.map(({ options }) => options.action), ["demo_lead", "demo_booking", "demo_booking"]);
});

for (const mode of ["error", "expired"]) {
  test(`${mode} keeps verification failed, never passing an empty proof`, async () => {
    const state = makeClient({ mode });
    await assert.rejects(state.client.verify("demo_lead", state.container()), (error) => error.code.startsWith("BOT_VERIFICATION_"));
    assert.equal(state.widgets.size, 0);
  });
}

test("closing the modal aborts verification and removes the widget", async () => {
  const state = makeClient({ mode: "pending" });
  const controller = new AbortController();
  const result = state.client.verify("demo_lead", state.container(), { signal: controller.signal });
  const rejected = assert.rejects(result, (error) => error.code === "BOT_VERIFICATION_CANCELLED");
  await flush();
  controller.abort();
  await rejected;
  assert.equal(state.widgets.size, 0);
  assert.equal(state.timers.size, 0);
});

test("reset cancels an active verification rather than submitting a stale token", async () => {
  const state = makeClient({ mode: "pending" });
  const result = state.client.verify("demo_booking", state.container());
  const rejected = assert.rejects(result, (error) => error.code === "BOT_VERIFICATION_CANCELLED");
  await flush();
  state.client.reset();
  await rejected;
  assert.equal(state.widgets.size, 0);
});

test("a bounded verification timeout permits a clean retry", async () => {
  const state = makeClient({ mode: "pending" });
  const result = state.client.verify("demo_booking", state.container());
  const rejected = assert.rejects(result, (error) => error.code === "BOT_VERIFICATION_FAILED");
  await flush();
  [...state.timers.values()].find(({ delay }) => delay === 90000).fn();
  await rejected;
  assert.equal(state.widgets.size, 0);
});

test("missing configuration fails closed in production", async () => {
  const state = makeClient({ hasKey: false });
  await assert.rejects(state.client.verify("demo_lead", state.container()), (error) => error.code === "BOT_VERIFICATION_UNAVAILABLE");
  assert.equal(state.calls.length, 0);
});

test("local previews do not contact Cloudflare or production booking APIs", async () => {
  const state = makeClient({ local: true, hasKey: false });
  assert.equal(await state.client.verify("demo_lead", state.container()), "");
  assert.equal(state.calls.length, 0);
  assert.equal(state.scripts.length, 0);
});

test("blocked script loading is retryable and uses only the official API URL", async () => {
  const state = makeClient({ apiPresent: false });
  const result = state.client.verify("demo_lead", state.container());
  const rejected = assert.rejects(result, (error) => error.code === "BOT_VERIFICATION_UNAVAILABLE");
  assert.equal(state.scripts.length, 1);
  assert.equal(state.scripts[0].src, "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=sadhaTurnstileReady");
  state.scripts[0].onerror();
  await rejected;
  state.client.warmup();
  assert.equal(state.scripts.length, 2);
  state.window.turnstile = state.api;
  state.window.sadhaTurnstileReady();
  await flush();
  assert.ok(await state.client.verify("demo_lead", state.container()));
});
