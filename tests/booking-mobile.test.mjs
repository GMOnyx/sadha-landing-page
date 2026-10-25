import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const helpers = source.slice(source.indexOf("// Mobile keyboard and viewport handling."), source.indexOf("// End mobile keyboard and viewport handling."));
const setup = ({ touch = true, viewport = true } = {}) => {
  const properties = new Map();
  const frames = [];
  const events = [];
  const focus = [];
  const dialog = { scrollTop: 120, contains: (element) => element?.inside === true,
    focus: (options) => focus.push({ target: "dialog", ...options }),
    setAttribute: (name, value) => properties.set(name, value) };
  const modal = { hidden: false, style: { setProperty: (name, value) => properties.set(name, value) } };
  const visualViewport = { height: 844, offsetTop: 0, scale: 1, addEventListener: (name, fn, options) => events.push({ name, fn, ...options }) };
  const document = { activeElement: null, getElementById: () => ({ focus: (options) => focus.push({ target: "schedule", ...options }) }) };
  const window = { innerHeight: 900, visualViewport: viewport ? visualViewport : undefined,
    matchMedia: () => ({ matches: touch }), requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    addEventListener: (name, fn, options) => events.push({ name, fn, ...options }) };
  const functions = vm.runInNewContext(helpers + "; ({syncBookingViewport,scheduleBookingViewport,dismissBookingKeyboard,focusBookingStart,revealBookingScheduler});", {
    window, document, demoModal: modal, bookingDialog: dialog,
    bookingEmailInput: { focus: (options) => focus.push({ target: "email", ...options }) },
    bookingScheduler: { classList: { add: (value) => properties.set("schedulerClass", value) } },
  });
  return { ...functions, properties, frames, events, focus, dialog, modal, visualViewport, document };
};

test("mobile opening focuses the dialog without automatically opening the keyboard", () => {
  const state = setup(); state.focusBookingStart();
  assert.equal(state.focus[0].target, "dialog");
  assert.equal(state.focus[0].preventScroll, true);
});
test("desktop opening still focuses the email field without jumping the page", () => {
  const state = setup({ touch: false }); state.focusBookingStart();
  assert.equal(state.focus[0].target, "email");
  assert.equal(state.focus[0].preventScroll, true);
});
test("keyboard resize and panning keep the sheet inside the visible viewport", () => {
  const state = setup(); state.syncBookingViewport();
  assert.equal(state.properties.get("--booking-viewport-height"), "844px");
  state.visualViewport.height = 402.5; state.visualViewport.offsetTop = 62.2;
  state.syncBookingViewport();
  assert.equal(state.properties.get("--booking-viewport-height"), "403px");
  assert.equal(state.properties.get("--booking-viewport-top"), "62px");
  state.visualViewport.height = 844; state.visualViewport.offsetTop = 0; state.syncBookingViewport();
  assert.equal(state.properties.get("--booking-viewport-height"), "844px");
});
test("intentional pinch zoom is not reset or counter-scaled", () => {
  const state = setup(); state.syncBookingViewport();
  state.visualViewport.scale = 1.5; state.visualViewport.height = 300; state.visualViewport.offsetTop = 100;
  state.syncBookingViewport();
  assert.equal(state.properties.get("--booking-viewport-height"), "844px");
  assert.equal(state.properties.get("--booking-viewport-top"), "0px");
});
test("browsers without VisualViewport fall back to the window height", () => {
  const state = setup({ viewport: false }); state.syncBookingViewport();
  assert.equal(state.properties.get("--booking-viewport-height"), "900px");
});
test("viewport events are passive, coalesced, and ignore closed dialogs", () => {
  const state = setup(); state.scheduleBookingViewport(); state.scheduleBookingViewport();
  assert.equal(state.frames.length, 1); state.frames.shift()();
  assert.ok(state.events.every((event) => event.passive === true));
  state.modal.hidden = true; state.properties.clear(); state.syncBookingViewport(); state.scheduleBookingViewport();
  assert.equal(state.properties.size, 0); assert.equal(state.frames.length, 0);
});
test("Continue dismisses only the booking form's keyboard", () => {
  const state = setup(); let blurs = 0;
  state.document.activeElement = { inside: true, matches: () => true, blur: () => blurs++ };
  state.dismissBookingKeyboard(); assert.equal(blurs, 1);
  state.document.activeElement.inside = false; state.dismissBookingKeyboard(); assert.equal(blurs, 1);
});
test("scheduler handoff focuses its heading, resets scroll, and updates the accessible title", () => {
  const state = setup(); state.revealBookingScheduler();
  assert.equal(state.properties.get("schedulerClass"), "is-visible");
  assert.equal(state.properties.get("aria-labelledby"), "booking-schedule-title");
  assert.equal(state.focus[0].target, "schedule"); assert.equal(state.focus[0].preventScroll, true);
  assert.equal(state.dialog.scrollTop, 0);
});
test("both pages keep pinch zoom enabled and expose a non-input focus destination", () => {
  for (const path of ["../index.html", "../demo/index.html"]) {
    const html = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(html, /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(?:\D|$)/i);
    assert.match(html, /id="booking-schedule-title" tabindex="-1"/);
    assert.match(html, /aria-labelledby="demo-modal-title" tabindex="-1"/);
  }
  const mobile = readFileSync(new URL("../demo/mobile.css", import.meta.url), "utf8");
  assert.match(mobile, /\.booking-email-row input,\s*\.booking-details input,\s*\.booking-meta select\s*\{[^}]*font-size:\s*max\(16px, 1rem\)/);
});
