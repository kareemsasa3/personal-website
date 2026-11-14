// Run with: node --test scripts/keyboard-viewport.test.mjs (Node 22.18 or later: it imports a .ts module).
// Exercises the visible-viewport reader and its subscription with a visualViewport double. It checks the arithmetic,
// the events listened to and their cleanup, not a browser's layout and not a real on-screen keyboard.
import test from "node:test";
import assert from "node:assert/strict";
import { KEYBOARD_MIN_INSET, readKeyboardViewport, watchKeyboardViewport } from "../src/utils/keyboardViewport.ts";

class Target {
  listeners = new Map();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
  }
  emit(type) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn();
  }
  count() {
    return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

const viewport = (values) => Object.assign(new Target(), { offsetTop: 0, height: 800, scale: 1, ...values });
const windowWith = (visualViewport) => Object.assign(new Target(), { visualViewport });

test("no keyboard: the visible viewport is the layout viewport, so nothing is reported", () => {
  assert.equal(readKeyboardViewport(viewport({ height: 800 }), 800), null);
});

test("browser chrome that covers less than a keyboard does is not a keyboard", () => {
  assert.equal(readKeyboardViewport(viewport({ height: 800 - KEYBOARD_MIN_INSET + 1 }), 800), null);
});

test("keyboard open: reports the visible span in layout-viewport coordinates", () => {
  assert.deepEqual(readKeyboardViewport(viewport({ height: 460 }), 800), { top: 0, bottom: 460 });
});

test("a panned visual viewport (iOS scrolls it to the focused field) moves the span with it", () => {
  assert.deepEqual(readKeyboardViewport(viewport({ height: 460, offsetTop: 120 }), 800), { top: 120, bottom: 580 });
});

test("fractional values round inwards and an overscrolled offset never goes above the layout viewport", () => {
  assert.deepEqual(readKeyboardViewport(viewport({ height: 300.6, offsetTop: 10.2 }), 800), { top: 11, bottom: 310 });
  assert.deepEqual(readKeyboardViewport(viewport({ height: 300, offsetTop: -24 }), 800), { top: 0, bottom: 276 });
});

test("landscape: a short visible span is still reported", () => {
  assert.deepEqual(readKeyboardViewport(viewport({ height: 150 }), 390), { top: 0, bottom: 150 });
});

test("pinch zoom shrinks the visual viewport without a keyboard: nothing is reported", () => {
  assert.equal(readKeyboardViewport(viewport({ height: 400, scale: 2 }), 800), null);
  assert.equal(readKeyboardViewport(viewport({ height: 640, scale: 1.25, offsetTop: 90 }), 800), null);
});

test("a keyboard under a zoomed page (a browser may zoom to the focused field) is still reported", () => {
  // 800 tall, 300 covered, zoomed 1.25x: 400 CSS px of the page are visible.
  assert.deepEqual(readKeyboardViewport(viewport({ height: 400, scale: 1.25, offsetTop: 150 }), 800), { top: 150, bottom: 550 });
});

test("no visualViewport API: nothing is reported and nothing is listened to", () => {
  assert.equal(readKeyboardViewport(undefined, 800), null);
  const win = windowWith(undefined);
  const seen = [];
  const stop = watchKeyboardViewport(win, () => 800, (fit) => seen.push(fit));
  assert.deepEqual(seen, [null]);
  assert.equal(win.count(), 0);
  stop();
});

test("the subscription follows the keyboard opening, changing size, panning and closing", () => {
  const vv = viewport({ height: 800 });
  const win = windowWith(vv);
  const seen = [];
  const stop = watchKeyboardViewport(win, () => 800, (fit) => seen.push(fit));
  assert.deepEqual(seen, [null], "reports the state at subscription");

  vv.height = 460;
  vv.emit("resize");
  vv.height = 420; // e.g. the suggestion bar appears
  vv.emit("resize");
  vv.offsetTop = 60;
  vv.emit("scroll");
  vv.emit("scroll"); // unchanged: not reported again
  vv.height = 800;
  vv.offsetTop = 0;
  vv.emit("resize");
  assert.deepEqual(seen, [null, { top: 0, bottom: 460 }, { top: 0, bottom: 420 }, { top: 60, bottom: 480 }, null]);
  stop();
});

test("a layout viewport change alone (rotation, browser chrome) is re-read from the window's resize", () => {
  const vv = viewport({ height: 300 });
  const win = windowWith(vv);
  let layout = 800;
  const seen = [];
  const stop = watchKeyboardViewport(win, () => layout, (fit) => seen.push(fit));
  layout = 340; // rotated: the same visible height is now most of the layout viewport
  win.emit("resize");
  assert.deepEqual(seen, [{ top: 0, bottom: 300 }, null]);
  stop();
});

test("cleanup removes every listener and stops reporting", () => {
  const vv = viewport({ height: 800 });
  const win = windowWith(vv);
  const seen = [];
  const stop = watchKeyboardViewport(win, () => 800, (fit) => seen.push(fit));
  assert.ok(vv.count() > 0 && win.count() > 0);
  stop();
  assert.equal(vv.count(), 0);
  assert.equal(win.count(), 0);
  vv.height = 400;
  vv.emit("resize");
  win.emit("resize");
  assert.deepEqual(seen, [null]);
});
