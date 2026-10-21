// Pressed acknowledgement (§13 Activation): contact shows the inverse at once (CSS :active cannot see
// key-down on links) and keeps it until at least dur-instant has passed since contact. Values come from tokens.css.
import { parseDuration } from "./motionTokens";

const ATTR = "data-df-pressed";
const TARGET = ".df-control, .df-prose a, .site-header__brand";
const BUTTONISH = "button, summary, [role='button'], [role='option'], [role='switch'], [role='combobox']";
const PRESS_KEYS = ["Enter", " "];

export const installPressAcknowledge = (doc: Document = document): (() => void) => {
  const since = new Map<Element, number>();
  // One pending release per element; a new contact cancels it, so the inverse lasts while that contact is held.
  const timers = new Map<Element, number>();
  const hold = () => parseDuration(getComputedStyle(doc.documentElement).getPropertyValue("--dur-instant") || "0ms") * 1000;
  const clear = (el: Element) => {
    const timer = timers.get(el);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.delete(el);
  };
  const press = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      if (event.repeat || !PRESS_KEYS.includes(event.key)) return;
    }
    const el = (event.target as Element | null)?.closest?.(TARGET);
    if (!el || el.matches(":disabled, [aria-disabled='true'], .df-control--unavailable")) return;
    if (event instanceof KeyboardEvent && event.key === " " && !el.matches(BUTTONISH)) return;
    clear(el);
    el.setAttribute(ATTR, "");
    since.set(el, performance.now());
  };
  const release = (event?: Event) => {
    // Only the release of a key that presses ends a keyboard contact.
    if (event instanceof KeyboardEvent && !PRESS_KEYS.includes(event.key)) return;
    const minimum = hold();
    for (const [el, start] of since) {
      since.delete(el);
      clear(el);
      const left = minimum - (performance.now() - start);
      if (left > 0) {
        timers.set(el, window.setTimeout(() => { timers.delete(el); el.removeAttribute(ATTR); }, left));
      } else el.removeAttribute(ATTR);
    }
  };
  const on: Array<[EventTarget, string, EventListener]> = [
    [doc, "pointerdown", press], [doc, "keydown", press], [doc, "pointerup", release],
    [doc, "pointercancel", release], [doc, "keyup", release], [window, "blur", release],
  ];
  for (const [t, type, fn] of on) t.addEventListener(type, fn, true);
  return () => {
    for (const [t, type, fn] of on) t.removeEventListener(type, fn, true);
    release();
  };
};
