// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/terminal-keyboard-browser-test.mjs [base URL] [Playwright module] [browser executable]
//
// What this is: the terminal's layout response to a SIMULATED on-screen keyboard, in a real engine. Headless Chromium
// has no on-screen keyboard, so the test overrides window.visualViewport's height and offsetTop and fires its events,
// which is what mobile Safari and Chrome (Android, default `resizes-visual`) report while a keyboard covers the page.
// What this is not: a check of a native keyboard. Whether a device reports those values, and when, is not tested here.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = process.argv[2] || "http://127.0.0.1:4173";
const artifacts = process.env.TERMINAL_KEYBOARD_ARTIFACTS || "/tmp/terminal-keyboard-browser";
await mkdir(artifacts, { recursive: true });
const errors = [];

// Installed before the page's scripts: a controllable visual viewport, and a count of the listeners on it.
const simulateKeyboard = () => {
  const vv = window.visualViewport;
  const sim = { inset: 0, pan: 0, listeners: { resize: 0, scroll: 0 } };
  const height = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(vv), "height").get;
  const offsetTop = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(vv), "offsetTop").get;
  Object.defineProperty(vv, "height", { get: () => height.call(vv) - sim.inset });
  Object.defineProperty(vv, "offsetTop", { get: () => offsetTop.call(vv) + sim.pan });
  const add = vv.addEventListener.bind(vv);
  const remove = vv.removeEventListener.bind(vv);
  vv.addEventListener = (type, ...rest) => { if (type in sim.listeners) sim.listeners[type] += 1; add(type, ...rest); };
  vv.removeEventListener = (type, ...rest) => { if (type in sim.listeners) sim.listeners[type] -= 1; remove(type, ...rest); };
  window.__keyboard = {
    listeners: sim.listeners,
    // inset: CSS px the keyboard covers at the bottom of the layout viewport. pan: how far the visual viewport is
    // scrolled down inside the layout viewport (Safari does this to reveal a focused field).
    set(inset, pan = 0) {
      const resized = inset !== sim.inset;
      const panned = pan !== sim.pan;
      sim.inset = inset;
      sim.pan = pan;
      if (resized) vv.dispatchEvent(new Event("resize"));
      if (panned) vv.dispatchEvent(new Event("scroll"));
    },
  };
};

const withPage = async ({ width, height, mobile = true, init = simulateKeyboard }, run) => {
  const context = await browser.newContext({
    viewport: { width, height },
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  context.setDefaultTimeout(10000);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/terminal`);
    await page.locator(".terminal-container .command-input").waitFor();
    await run(page);
  } finally {
    await context.close();
  }
};

const rect = (page, selector) => page.locator(selector).evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
});

// The window's box has stopped changing (its height is transitioned).
const settled = async (page) => {
  await page.waitForFunction(() => {
    const el = document.querySelector(".terminal-container");
    const r = el.getBoundingClientRect();
    const now = `${r.top},${r.height},${r.left},${r.width}`;
    const same = el.__box === now;
    el.__box = now;
    return same && el.getAnimations().length === 0;
  }, null, { polling: 100 });
  return rect(page, ".terminal-container");
};

const setKeyboard = (page, inset, pan = 0) => page.evaluate(([i, p]) => window.__keyboard.set(i, p), [inset, pan]);

// Everything a visitor needs is inside the span the keyboard leaves visible, and is what a tap there would hit.
const usableWithin = async (page, { top, bottom }, label) => {
  const box = await settled(page);
  assert.ok(box.top >= top - 1 && box.bottom <= bottom + 1, `${label}: window ${box.top}–${box.bottom} is inside the visible span ${top}–${bottom}`);
  assert.ok(Math.abs(box.top - top) <= 1 && Math.abs(box.bottom - bottom) <= 1, `${label}: window fills the visible span`);
  const parts = await page.evaluate(() => {
    const hit = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        hit: el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) };
    };
    const body = document.querySelector(".terminal-body");
    return {
      input: hit(document.querySelector(".terminal-container .command-input")),
      buttons: [...document.querySelectorAll(".terminal-container .terminal-button")].map(hit),
      body: { ...hit(body), clientHeight: body.clientHeight, cell: parseFloat(getComputedStyle(body).getPropertyValue("--cell-h")) },
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      width: innerWidth,
    };
  });
  for (const [name, part] of [["input", parts.input], ...parts.buttons.map((b, i) => [`control ${i + 1}`, b])]) {
    assert.ok(part.top >= top - 1 && part.bottom <= bottom + 1, `${label}: ${name} ${part.top}–${part.bottom} is inside the visible span ${top}–${bottom}`);
    assert.ok(part.left >= -1 && part.right <= parts.width + 1, `${label}: ${name} is not clipped horizontally`);
    assert.ok(part.hit, `${label}: ${name} is not covered by anything`);
  }
  assert.equal(parts.buttons.length, 3, `${label}: the three window controls are present`);
  assert.ok(parts.body.clientHeight >= 2 * parts.body.cell, `${label}: the transcript keeps at least two rows (${parts.body.clientHeight}px)`);
  assert.ok(parts.overflowX <= 0, `${label}: no horizontal page overflow`);
};

const submit = async (page, command) => {
  const before = await page.locator(".terminal-container .history-line").count();
  await page.keyboard.type(command);
  await page.keyboard.press("Enter");
  await page.waitForFunction((n) => document.querySelectorAll(".terminal-container .history-line").length > n, before);
  assert.ok(await page.locator(".terminal-container .command-input").evaluate((el) => document.activeElement === el && el.value === ""),
    `after "${command}" the input is still focused, and empty`);
};

try {
  // Simulated keyboards at phone sizes, portrait and landscape. `inset` is a typical keyboard height for the size.
  for (const { width, height, inset } of [
    { width: 390, height: 844, inset: 336 },
    { width: 412, height: 915, inset: 380 },
    { width: 320, height: 568, inset: 260 },
    { width: 844, height: 390, inset: 220 },
    { width: 915, height: 412, inset: 240 },
  ]) {
    const label = `${width}x${height}`;
    await withPage({ width, height }, async (page) => {
      const input = page.locator(".terminal-container .command-input");
      const closed = await settled(page);
      const scrollY = await page.evaluate(() => scrollY);
      await input.tap();
      assert.ok(await input.evaluate((el) => document.activeElement === el), `${label}: tapping the prompt focuses it`);

      // Keyboard opens.
      await setKeyboard(page, inset);
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} open`);
      assert.ok(await page.locator(".terminal-route-intro").evaluate((el) => el.classList.contains("terminal-route-intro--behind")),
        `${label}: the route intro is hidden whole, not half covered`);
      await page.screenshot({ path: `${artifacts}/${label}-open.png` });

      // Commands still run, and their output keeps the prompt in view.
      await submit(page, "help");
      await submit(page, "ls");
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} after output`);

      // The transcript scrolls on its own; the page behind it does not move.
      const scroll = await page.locator(".terminal-body").evaluate((el) => {
        const end = el.scrollTop;
        el.scrollTop = 0;
        return { scrollable: el.scrollHeight > el.clientHeight, end, contain: getComputedStyle(el).overscrollBehaviorY };
      });
      assert.ok(scroll.scrollable && scroll.end > 0, `${label}: the transcript overflows its body and was following its end`);
      assert.equal(scroll.contain, "contain", `${label}: transcript scrolling does not chain to the page`);
      assert.equal(await page.evaluate(() => scrollY), scrollY, `${label}: the page did not scroll`);
      // Scrolled back by the reader: a keyboard change must not pull the transcript away from where they are reading.
      await page.waitForFunction(() => document.querySelector(".terminal-body").scrollTop === 0);
      await setKeyboard(page, inset + 44);
      await settled(page);
      assert.equal(await page.locator(".terminal-body").evaluate((el) => el.scrollTop), 0, `${label}: a reader's scroll position is kept`);
      await submit(page, "pwd");

      // Keyboard changes size (a suggestion bar), then the visual viewport pans.
      await usableWithin(page, { top: 0, bottom: height - inset - 44 }, `${label} taller keyboard`);
      await setKeyboard(page, inset, 60);
      await usableWithin(page, { top: 60, bottom: height - inset + 60 }, `${label} panned`);

      // Keyboard closes: exactly the layout from before, nothing left offset.
      await setKeyboard(page, 0);
      const reopened = await settled(page);
      for (const side of ["top", "bottom", "left", "right"]) {
        assert.ok(Math.abs(reopened[side] - closed[side]) <= 0.5, `${label}: after dismissal the window's ${side} is back (${closed[side]} → ${reopened[side]})`);
      }
      assert.equal(await page.evaluate(() => scrollY), scrollY, `${label}: no page scroll offset is left behind`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${label}: no horizontal overflow after dismissal`);
      await submit(page, "whoami");
      await page.screenshot({ path: `${artifacts}/${label}-closed.png` });

      // Maximized: the same fit while the keyboard is open, the whole layout viewport once it closes.
      await page.getByRole("button", { name: "Maximize terminal", exact: true }).tap();
      await input.tap();
      await setKeyboard(page, inset);
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} maximized open`);
      await setKeyboard(page, 0);
      const full = await settled(page);
      assert.ok(Math.abs(full.top) <= 0.5 && Math.abs(full.height - height) <= 0.5 && Math.abs(full.width - width) <= 0.5,
        `${label}: maximized fills the viewport again after dismissal`);
    });
  }

  // Pinch zoom is not a keyboard: the window keeps its layout.
  await withPage({ width: 390, height: 844 }, async (page) => {
    const before = await settled(page);
    await page.evaluate(() => {
      const vv = window.visualViewport;
      Object.defineProperty(vv, "scale", { get: () => 2 });
      window.__keyboard.set(422);
    });
    assert.deepEqual(await settled(page), before, "zoomed: the window is not refitted");
  });

  // Cleanup: leaving the terminal removes its visual viewport listeners, and later viewport events are harmless.
  await withPage({ width: 390, height: 844 }, async (page) => {
    assert.equal(await page.evaluate(() => window.__keyboard.listeners.scroll), 1, "the terminal listens to visual viewport scroll once");
    const resizeListeners = await page.evaluate(() => window.__keyboard.listeners.resize);
    await setKeyboard(page, 336);
    await settled(page);
    await page.getByRole("button", { name: "Close terminal", exact: true }).tap();
    await page.locator(".terminal-container").waitFor({ state: "detached" });
    const after = await page.evaluate(() => ({ ...window.__keyboard.listeners }));
    assert.equal(after.scroll, 0, "the scroll listener is removed on leaving");
    assert.equal(after.resize, resizeListeners - 1, "the terminal's resize listener is removed on leaving");
    await setKeyboard(page, 0, 40);
    await setKeyboard(page, 300, 0);
  });

  // No visualViewport API: the terminal renders with its ordinary layout.
  let fallback;
  await withPage({ width: 390, height: 844, init: () => Object.defineProperty(window, "visualViewport", { value: undefined }) }, async (page) => {
    assert.equal(await page.evaluate(() => window.visualViewport), undefined);
    fallback = await settled(page);
    await page.locator(".terminal-container .command-input").tap();
    await submit(page, "help");
  });
  await withPage({ width: 390, height: 844 }, async (page) => {
    assert.deepEqual(await settled(page), fallback, "without the API the window has the same box as with it and no keyboard");
  });

  // Desktop: the window's box and behaviour do not depend on any of this.
  await withPage({ width: 1440, height: 900, mobile: false }, async (page) => {
    const box = await settled(page);
    assert.ok(box.height <= 600 && box.width <= 800 && box.top > 0, `desktop: the window keeps its floating box (${JSON.stringify(box)})`);
    assert.ok(!(await page.locator(".terminal-route-intro").evaluate((el) => el.classList.contains("terminal-route-intro--behind"))), "desktop: the intro is shown");
    await page.locator(".terminal-container .command-input").click();
    await submit(page, "help");
    assert.deepEqual(await settled(page), box, "desktop: output does not move the window");
    await page.screenshot({ path: `${artifacts}/desktop.png` });
  });

  assert.deepEqual(errors, [], "no page errors");
  console.log(`terminal keyboard browser test passed (simulated keyboard; artifacts in ${artifacts})`);
} finally {
  await browser.close();
}
