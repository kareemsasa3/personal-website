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
  await fullWidth(page, box, label);
  await compactToolbar(page, label);
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

// Phones: the window spans the viewport, with no margin on either side.
const fullWidth = async (page, box, label) => {
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  assert.ok(Math.abs(box.left) <= 0.5 && Math.abs(box.right - width) <= 0.5, `${label}: the window spans the full width (${box.left}–${box.right} of ${width})`);
};

// The toolbar is one compact row: three sign-only controls with touch-sized targets and their accessible names, and
// everything below it belongs to the transcript.
const compactToolbar = async (page, label) => {
  const bar = await page.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
    const shown = (el) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
    const container = document.querySelector(".terminal-container");
    return {
      header: box(container.querySelector(".terminal-header")),
      body: box(container.querySelector(".terminal-body")),
      window: box(container),
      title: box(container.querySelector(".terminal-title")),
      buttons: [...container.querySelectorAll(".terminal-button")].map((el) => ({
        ...box(el), name: el.getAttribute("aria-label"), label: shown(el.querySelector(".terminal-button-label")),
        sign: box(el.querySelector(".terminal-button-sign")), signShown: shown(el.querySelector(".terminal-button-sign")),
        signHidden: el.querySelector(".terminal-button-sign").getAttribute("aria-hidden"),
      })),
    };
  });
  assert.ok(bar.header.height <= 50, `${label}: the toolbar is one compact row (${bar.header.height}px)`);
  assert.equal(bar.buttons.length, 3, `${label}: three window controls, none duplicated`);
  assert.deepEqual(bar.buttons.map((b) => b.name.replace("Restore", "Maximize")), ["Close terminal", "Minimize terminal", "Maximize terminal"], `${label}: the controls keep their accessible names`);
  for (const b of bar.buttons) {
    assert.ok(b.width >= 44 && b.height >= 44, `${label}: ${b.name} has a touch-sized target (${b.width}x${b.height})`);
    assert.ok(!b.label && b.signShown && b.signHidden === "true", `${label}: ${b.name} shows its sign, not its words`);
    assert.ok(b.sign.width === 16 && b.sign.height === 16, `${label}: ${b.name}'s sign is 16 px`);
    assert.ok(Math.abs((b.sign.left + b.sign.right) / 2 - (b.left + b.right) / 2) <= 1 && Math.abs((b.sign.top + b.sign.bottom) / 2 - (b.top + b.bottom) / 2) <= 1,
      `${label}: ${b.name}'s sign is centred in its target`);
    assert.ok(b.top >= bar.header.top - 0.5 && b.bottom <= bar.header.bottom + 0.5, `${label}: ${b.name} is inside the toolbar`);
  }
  for (let i = 1; i < bar.buttons.length; i += 1) assert.ok(bar.buttons[i].left >= bar.buttons[i - 1].right - 0.5, `${label}: controls do not overlap`);
  assert.ok(bar.title.left >= bar.buttons[2].right - 0.5 && bar.title.right <= bar.header.right + 0.5 && bar.title.height <= bar.header.height, `${label}: the title stays on the toolbar's row`);
  // Header and transcript take the whole window between them: no other band, no gap.
  assert.ok(Math.abs(bar.body.top - bar.header.bottom) <= 1 && bar.window.bottom - bar.body.bottom <= 2, `${label}: the transcript takes all the height below the toolbar`);
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
      // No keyboard: full width, compact toolbar, and all the height the site header (or route intro) and dock leave.
      await fullWidth(page, closed, `${label} closed`);
      await compactToolbar(page, `${label} closed`);
      assert.ok(closed.bottom <= height + 0.5 && closed.top >= 0, `${label} closed: the window is inside the viewport`);
      const room = await page.evaluate(() => {
        const probe = document.createElement("i");
        probe.style.cssText = "position: absolute; visibility: hidden; block-size: var(--terminal-available-height);";
        document.querySelector(".terminal-container").append(probe);
        const available = probe.getBoundingClientRect().height;
        probe.remove();
        return available;
      });
      assert.ok(Math.abs(closed.height - room) <= 1, `${label} closed: the window takes all the available height (${closed.height} of ${room})`);
      await input.tap();
      assert.ok(await input.evaluate((el) => document.activeElement === el), `${label}: tapping the prompt focuses it`);

      // Keyboard opens.
      await setKeyboard(page, inset);
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} open`);
      assert.ok(await page.locator(".terminal-route-intro").evaluate((el) => el.classList.contains("terminal-route-intro--behind")),
        `${label}: the route intro is hidden whole, not half covered`);
      await page.screenshot({ path: `${artifacts}/${label}-open.png` });

      // Commands still run, and their output keeps the prompt in view.
      for (const command of ["help", "ls", "help", "history"]) await submit(page, command);
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} after output`);

      // The transcript scrolls on its own; the page behind it does not move.
      const scroll = await page.locator(".terminal-body").evaluate((el) => {
        const end = el.scrollTop;
        el.scrollTop = 0;
        return { scrollable: el.scrollHeight > el.clientHeight, end, contain: getComputedStyle(el).overscrollBehaviorY };
      });
      // Well past the distance from the end that still counts as following it.
      assert.ok(scroll.scrollable && scroll.end > 200, `${label}: the transcript overflows its body and was following its end (${scroll.end})`);
      assert.equal(scroll.contain, "contain", `${label}: transcript scrolling does not chain to the page`);
      assert.equal(await page.evaluate(() => scrollY), scrollY, `${label}: the page did not scroll`);
      // Scrolled back by the reader: the prompt stays at the bottom of the transcript, visible and tappable, and a
      // keyboard change must not pull the transcript away from where they are reading.
      await page.waitForFunction(() => document.querySelector(".terminal-body").scrollTop === 0);
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} transcript scrolled to its start`);
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

      // Minimize and reopen with the keyboard open: the window comes back fitted.
      await setKeyboard(page, inset);
      await settled(page);
      await page.getByRole("button", { name: "Minimize terminal", exact: true }).tap();
      await page.locator(".terminal-container").waitFor({ state: "detached" });
      await page.getByRole("button", { name: "Terminal minimized — reopen", exact: true }).tap();
      await page.locator(".terminal-container .command-input").waitFor();
      await input.tap();
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} reopened`);
      await setKeyboard(page, 0);
      const afterMinimize = await settled(page);
      for (const side of ["top", "bottom", "left", "right"]) {
        assert.ok(Math.abs(afterMinimize[side] - closed[side]) <= 0.5, `${label}: after minimize and reopen the window's ${side} is back`);
      }

      // Maximized: the same fit while the keyboard is open, the whole layout viewport once it closes.
      await page.getByRole("button", { name: "Maximize terminal", exact: true }).tap();
      await input.tap();
      await setKeyboard(page, inset);
      await usableWithin(page, { top: 0, bottom: height - inset }, `${label} maximized open`);
      await setKeyboard(page, 0);
      const full = await settled(page);
      assert.ok(Math.abs(full.top) <= 0.5 && Math.abs(full.height - height) <= 0.5 && Math.abs(full.width - width) <= 0.5,
        `${label}: maximized fills the viewport again after dismissal`);
      await compactToolbar(page, `${label} maximized`);
      // Restore: back to the box from before.
      await page.getByRole("button", { name: "Restore terminal", exact: true }).tap();
      const restored = await settled(page);
      for (const side of ["top", "bottom", "left", "right"]) {
        assert.ok(Math.abs(restored[side] - closed[side]) <= 0.5, `${label}: restore returns the window's ${side}`);
      }
    });
  }

  // The geometry recorded on a device (Chrome 157, Android, edge to edge) on 2026-11-14, replayed: a 443x864 layout
  // viewport with a 37 px bottom safe-area inset; with the keyboard open visualViewport.height is 464.41 while the
  // inset reads 0, and the page is in fact visible only down to 464.41 - 37. The input must be inside THAT span, in
  // both orders the two changes can arrive in. The inset is emulated through the DevTools protocol; the keyboard is
  // still simulated, and this replays one device's numbers, not a native keyboard.
  const DEVICE = { width: 443, height: 864, inset: 37, vvHeight: 464.41 };
  for (const order of ["viewport first, then the inset is withdrawn", "inset withdrawn first, then the viewport"]) {
    await withPage({ width: DEVICE.width, height: DEVICE.height }, async (page) => {
      const cdp = await page.context().newCDPSession(page);
      const setInset = async (bottom) => {
        await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom } });
        await page.waitForFunction((want) => {
          const probe = document.createElement("i");
          probe.style.cssText = "position: fixed; visibility: hidden; block-size: env(safe-area-inset-bottom, 0px);";
          document.body.append(probe);
          const got = probe.getBoundingClientRect().height;
          probe.remove();
          return got === want;
        }, bottom);
      };
      const label = `device replay (${order})`;
      await setInset(DEVICE.inset);
      const closed = await settled(page);
      await page.locator(".terminal-container .command-input").tap();
      const keyboard = () => setKeyboard(page, DEVICE.height - DEVICE.vvHeight);
      if (order.startsWith("viewport")) {
        await keyboard();
        await setInset(0);
      } else {
        await setInset(0);
        await keyboard();
      }
      const visibleBottom = DEVICE.vvHeight - DEVICE.inset;
      const inside = async (when) => {
        await page.waitForFunction((bottom) => document.querySelector(".terminal-container").getBoundingClientRect().bottom <= bottom, visibleBottom);
        const box = await settled(page);
        const parts = await page.evaluate(() => {
          const vv = window.visualViewport;
          const r = document.querySelector(".terminal-container .command-input").getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, reportedBottom: vv.offsetTop + vv.height };
        });
        assert.ok(parts.reportedBottom > visibleBottom + 30, `${label}: the browser reports more than is visible (${parts.reportedBottom})`);
        assert.ok(box.bottom <= visibleBottom && box.bottom >= visibleBottom - 1.5, `${label} ${when}: the window ends at the truly visible bottom (${box.bottom} of ${visibleBottom})`);
        assert.ok(parts.top >= 49 && parts.bottom <= visibleBottom, `${label} ${when}: the input ${parts.top}–${parts.bottom} is above ${visibleBottom}`);
      };
      await inside("open");
      for (const command of ["help", "ls"]) await submit(page, command);
      await inside("after commands");
      // Dismissed: the keyboard goes, then the inset returns.
      await setKeyboard(page, 0);
      await setInset(DEVICE.inset);
      const reopened = await settled(page);
      for (const side of ["top", "bottom", "left", "right"]) {
        assert.ok(Math.abs(reopened[side] - closed[side]) <= 0.5, `${label}: after dismissal the window's ${side} is back (${closed[side]} → ${reopened[side]})`);
      }
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
    assert.ok(box.height === 600 && box.width === 800 && box.top > 0 && Math.abs(box.left - 320) <= 0.5, `desktop: the window keeps its floating box (${JSON.stringify(box)})`);
    // Desktop keeps the worded controls; the signs are for the compact toolbar only.
    const controls = await page.locator(".terminal-container .terminal-button").evaluateAll((els) => els.map((el) => ({
      text: el.innerText.trim().toLowerCase(), name: el.getAttribute("aria-label").toLowerCase(),
      sign: getComputedStyle(el.querySelector(".terminal-button-sign")).display,
    })));
    assert.deepEqual(controls.map((c) => c.text), controls.map((c) => c.name), "desktop: each control shows its name as its label");
    assert.ok(controls.length === 3 && controls.every((c) => c.sign === "none"), "desktop: no signs");
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
