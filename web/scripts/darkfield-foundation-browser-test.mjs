// web/scripts/darkfield-foundation-browser-test.mjs
// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/darkfield-foundation-browser-test.mjs [base URL] [Playwright module] [browser executable]
// DARKFIELD_MODE=check (default): invariants must pass; regressions are compared with the ledger.
// DARKFIELD_MODE=record: run regression checks only and print ledger candidates (use on the baseline).
// DARKFIELD_THEMES=dark,light[,mono] selects themes.
// DARKFIELD_VIEWPORT=<width>x<height> selects the viewport (r10; default 1440x900, where the ledger is recorded).
// DARKFIELD_ARRIVE_FROM=<route> (r10): the route passes reach each route by client-side navigation from this
// route instead of a direct load, so the stylesheets it loaded stay attached (Step 9 compares arrivals).
// Record mode also prints every measurement on a MEASURED line (r10), for Step 9's run-by-run comparison.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
const base = process.argv[2] || "http://127.0.0.1:4173";
const MODE = process.env.DARKFIELD_MODE || "check";
const THEMES = (process.env.DARKFIELD_THEMES || "dark,light").split(",");
const [VIEW_W, VIEW_H] = (process.env.DARKFIELD_VIEWPORT || "1440x900").split("x").map(Number);
const ARRIVE_FROM = process.env.DARKFIELD_ARRIVE_FROM || null;
const FIELD = { dark: "rgb(7, 11, 8)", light: "rgb(239, 244, 241)", mono: "rgb(10, 10, 10)" };
// Every routed page (web/src/routes/index.tsx at a16c70f) plus one 404 probe. /work aliases /experience.
const ROUTES = [
  "/", "/projects", "/case-studies", "/case-studies/aether", "/case-studies/erebus", "/case-studies/arachne",
  "/case-studies/where-the-specification-lived", "/writing", "/simulations", "/simulations/orbital-simulator",
  "/simulations/traffic-simulator", "/simulations/annals", "/simulations/snake", "/simulations/spider",
  "/simulations/rhythm-lab", "/procedural-animations", "/experience", "/journey", "/terminal", "/darkfield-404-probe",
];
const SAMPLER_SELECTORS = ["main p", "main li", "h1", "h2", "h3", "a", "button", ".tech-tag"];
// Fill/text pairs whose ground the bridge changes (rule-level scan, 2026-10-11).
// .projects-cta-primary is excluded: no component renders it (dead CSS, Phase 3).
// .error-button.primary renders only when an error boundary fires, so expect it UNCOVERED.
// The last five cover the r8 contrast repairs: states and elements the route-load sampler does not
// reach, and the 404 heading's large-text floor. min is 4.5 unless set (WCAG 3:1 for large text).
// rendered: measure against the rendered pixels; the header's backdrop filter is not a colour stack.
// prepare: the pair is not on screen at load (Settings is closed); it is measured on its route once prepare(page) has
// brought it on screen, after the route pass (Phase 3 Task 12).
const PAIRS = [
  { selector: ".btn-primary" }, { selector: ".btn-outline", hover: true },
  { selector: ".work-contact-link.primary" }, { selector: ".work-dates", hover: true },
  { selector: ".tech-tag", hover: true }, { selector: ".site-header__link.active" },
  { selector: ".modal-close", hover: true }, { selector: ".toast-close", hover: true },
  { selector: '.settings-segmented__button[aria-pressed="true"]', route: "/", prepare: (page) => openSettings(page) },
  { selector: ".error-button.primary" }, { selector: ".home-link" },
  { selector: ".project-roster__action--primary", hover: true },
  { selector: ".project-media__bar .project-media__control", hover: true },
  { selector: ".not-found h1", min: 3 },
  { selector: ".project-media__label" }, { selector: ".site-header__brand-mark", rendered: true },
];
// Layout measurements the site writes on <html> (SiteNavigation.tsx, useDock.ts), each a px length.
// Any other inline custom property, or any other value, is a theme value written inline.
const INLINE_LAYOUT = ["--site-header-measured-offset", "--site-dock-safe-space", "--dock-icon-size"];
const unexpectedInline = (properties) =>
  properties.filter(([name, value]) => name.startsWith("--") && !(INLINE_LAYOUT.includes(name) && /^\d+(\.\d+)?px$/.test(value.trim())));
// Interaction states a route load does not render, prepared and then measured against the rendered
// ground. Each state's enter function brings one control into the state, verifies it, and may return
// an exit function. texts: governed text measured once in the prepared state. A state that cannot be
// measured is listed as unmeasured, never passed.
const STATES = [
  {
    // Annals verbs ("Your Hand", Annals.tsx): disabled at load, enabled every third year. The aside
    // headings change with them ("Your Hand · available").
    route: "/simulations/annals",
    controls: ".annals-page aside .flex-wrap > button",
    texts: [".annals-page aside > h2"],
    prepare: async (page) => {
      const advance = page.getByRole("button", { name: "let a year pass →" });
      for (let year = 0; year < 3 && (await page.locator(".annals-page aside .flex-wrap > button:disabled").count()); year++) await advance.click();
      if (await page.locator(".annals-page aside .flex-wrap > button:disabled").count()) throw new Error("annals: verbs not enabled");
    },
    states: {
      enabled: async (page) => { await page.mouse.move(0, 0); },
      hover: async (page, control) => {
        // Scroll, settle, then move (r10), as every hover does.
        await reveal(control);
        await frames(page);
        const box = await control.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await frames(page);
        if (!(await control.evaluate((el) => el.matches(":hover")))) throw new Error("annals: verb not hovered");
      },
      pressed: async (page, control) => {
        await control.click();
        await page.mouse.move(0, 0);
        if ((await control.getAttribute("aria-pressed")) !== "true") throw new Error("annals: verb did not press");
        return () => control.click();
      },
    },
  },
  {
    // Rhythm Lab lane tap zones (RhythmHighway.tsx): enabled buttons, pointer-operated (tabIndex -1)
    // and mirrored by the lane keys. At load the Ready Check overlay covers them (the sampler lists
    // them as unmeasured). Here the page clock is frozen before navigation and only advanced in fixed
    // steps, so the run starts at the same virtual moment every time and notes and feedback hold still.
    // Each zone is measured playing, with its lane key held, and pointer-pressed. It is then checked
    // under the pause overlay, where it is expected to be listed as covered.
    route: "/simulations/rhythm-lab",
    controls: ".rhythm-lab-hit-zone",
    clock: true,
    prepare: async (page) => {
      const start = page.getByRole("button", { name: "Start", exact: true });
      for (let step = 0; step < 50 && !(await start.isVisible()); step++) await page.clock.runFor(100);
      await start.click();
      await page.clock.runFor(150);
      if (await page.locator(".rhythm-lab-overlay").count()) throw new Error("rhythm-lab: the run did not start");
    },
    states: {
      playing: async (page) => { await page.mouse.move(0, 0); },
      key: async (page, control) => {
        const key = (await control.textContent()).trim()[0].toLowerCase();
        await page.keyboard.down(key);
        if (!(await control.evaluate((el) => el.classList.contains("rhythm-lab-hit-zone-input")))) throw new Error("rhythm-lab: no key feedback");
        return async () => { await page.keyboard.up(key); await page.clock.runFor(100); };
      },
      pointer: async (page, control) => {
        const box = await control.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        if (!(await control.evaluate((el) => el.matches(":active")))) throw new Error("rhythm-lab: zone not pressed");
        return async () => { await page.mouse.up(); await page.mouse.move(0, 0); await page.clock.runFor(100); };
      },
      paused: async (page) => {
        await page.keyboard.press("Escape");
        if (!(await page.locator(".rhythm-lab-overlay").count())) throw new Error("rhythm-lab: did not pause");
        return async () => {
          await page.keyboard.press("Escape");
          if (await page.locator(".rhythm-lab-overlay").count()) throw new Error("rhythm-lab: did not resume");
        };
      },
    },
  },
];
const invariantFailures = [];
const regressions = [];
const creative = [];
const inactive = [];
const regions = {};
const unmeasured = [];
// Every measurement, passing or failing, by id (r10): record mode prints it, and Step 9 compares builds run
// by run from it. An id recorded twice is a pairing defect.
const measured = {};
const duplicates = [];
const ran = new Set();
const uncovered = new Set(PAIRS.map((p) => p.selector));
const errors = [];
const invariant = (ok, message) => { if (!ok) invariantFailures.push(message); };
// A page that needs a frozen clock gets it before navigation: installed at a fixed time and paused at a
// fixed later time that no real elapsed time can reach first, then advanced only by runFor.
const CLOCK_START = new Date("2026-01-01T00:00:00Z");
const CLOCK_PAUSED = new Date("2026-01-01T01:00:00Z");

const withPage = async ({ theme, route = "/", javaScriptEnabled = true, forcedColors = "none", reducedMotion = "reduce", clock = false, routePass = false }, run) => {
  const context = await browser.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, javaScriptEnabled, forcedColors, reducedMotion });
  if (theme) await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
  // Seeded randomness (r10): decorative backgrounds draw a random static frame under reduced motion, and it
  // shows through translucent grounds. The same seed on every load and build keeps rendered grounds
  // reproducible, so the baseline and the candidate are compared on the same frame.
  await context.addInitScript(() => {
    let seed = 1;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${route}: ${error.message}`));
  if (clock) {
    await page.clock.install({ time: CLOCK_START });
    await page.clock.pauseAt(CLOCK_PAUSED);
    // Its animation frames and timers run only when the test advances the clock (r10: see frames and steady).
    frozen.add(page);
  }
  try {
    if (routePass && ARRIVE_FROM && ARRIVE_FROM !== route) {
      // The router follows popstate, so this is the client-side navigation a link would make.
      await page.goto(`${base}${ARRIVE_FROM}`, { waitUntil: "networkidle" });
      await page.evaluate((to) => { history.pushState({}, "", to); dispatchEvent(new PopStateEvent("popstate")); }, route);
      await page.waitForFunction((to) => location.pathname === to, route);
      await page.waitForLoadState("networkidle");
      // The arriving route fades in through its transition wrapper, the visible main's direct child: wait
      // until the opacity and transform of main, its ancestors and its children stop changing (three samples
      // 150 ms apart agree), so it is measured settled, as a direct load is. Deeper content, such as a game's
      // moving playfield, is not sampled.
      const sample = () => page.evaluate(() => {
        const main = [...document.querySelectorAll("main")].find((m) => m.checkVisibility());
        if (!main) return "";
        const look = (n) => { const s = getComputedStyle(n); return `${s.opacity}${s.transform}`; };
        const chain = [];
        for (let n = main; n; n = n.parentElement) chain.push(look(n));
        return chain.join() + "|" + [...main.children].map(look).join();
      });
      await settled(page, sample, `${route}: did not settle after client-side arrival from ${ARRIVE_FROM}`);
      // Sections that fade in when first scrolled into view (once) start at opacity 0 after a client-side
      // arrival, though a direct load renders them at once, and the painted pass would skip them. The page is
      // scrolled through in half-viewport steps, instantly, and back to the top, so each has been in view;
      // then every element in main with an inline opacity must hold still (three samples 150 ms apart agree).
      // Pages with a frozen clock animate nothing and are not swept (r10).
      if (!frozen.has(page)) {
        await page.evaluate(async () => {
          const pause = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
          for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo({ top: y, behavior: "instant" }); await pause(); }
          scrollTo({ top: 0, behavior: "instant" });
          await pause();
        });
        await settled(page, () => page.evaluate(() => {
          const main = [...document.querySelectorAll("main")].find((m) => m.checkVisibility());
          return `opacity:${main ? [...main.querySelectorAll("[style*='opacity']")].map((n) => getComputedStyle(n).opacity).join() : ""}`;
        }), `${route}: in-view fade-ins did not settle after client-side arrival from ${ARRIVE_FROM}`);
      }
    } else {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    }
    if (routePass) {
      // Lazy images load as they near the viewport and change the page's height, which moved controls from
      // under the pointer and changed scroll positions between runs. Every image is loaded first, and the
      // page's height must hold still before anything is measured.
      await page.evaluate(async () => {
        for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = "eager";
        await Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((done) => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })));
      });
      await page.waitForLoadState("networkidle");
      await settled(page, () => page.evaluate(() => String(document.documentElement.scrollHeight)), `${route}: the page's height did not hold still`);
    }
    await run(page);
  } finally {
    await context.close();
  }
};

// Two animation frames. A pointer moved while a scroll is still settling loses its hover moments later, so
// every hover scrolls first, waits for these frames, and only then moves the pointer (r10).
// Pages whose clock is frozen produce no frames and run no timers on their own; nothing on them animates, so
// the waits below return at once there.
const frozen = new WeakSet();
const frames = (page) => (frozen.has(page) ? null : page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))));
// Opens Settings from whichever opener the navigation mode shows and waits until the panel has faded in.
const openSettings = async (page) => {
  await page.locator(".site-header__settings-button:visible, .dock-settings-button:visible").first().click();
  await page.locator(".settings-content").waitFor();
  await page.waitForFunction(() => [".settings-sidebar", ".settings-content"].every((s) => getComputedStyle(document.querySelector(s)).opacity === "1"));
  await page.mouse.move(0, 0);
  await frames(page);
};
// Scrolls an element to the middle of the viewport, instantly (r10). Its scroll position then depends only on
// the element, never on where the previous step left the page, so both builds capture it alike; the site's
// smooth scrolling would otherwise animate the scroll. An element in a fixed or sticky container is always in
// view, and scrolling for it only moves the page beneath it, so it is left where it is.
// Waits in the page until the opacity and transform of the element, its ancestors and its descendants hold
// for three samples 16 ms apart (at most 2 s): an element brought into view may start a fade-in (r10). A timer,
// not animation frames, paces it, because a frame is not always produced.
const steady = (locator) => (frozen.has(locator.page()) ? null : locator.evaluate(async (el) => {
  const look = () => {
    const parts = [];
    for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); parts.push(s.opacity, s.transform); }
    for (const n of [el, ...el.querySelectorAll("*")]) { const s = getComputedStyle(n); parts.push(s.opacity, s.transform); }
    return parts.join();
  };
  let [last, same] = [look(), 0];
  for (let i = 0; i < 120 && same < 3; i++) {
    await new Promise((done) => setTimeout(done, 16));
    const now = look();
    same = now === last ? same + 1 : 0;
    last = now;
  }
}));
const reveal = (locator) => locator.evaluate((el) => {
  for (let n = el; n; n = n.parentElement) if (["fixed", "sticky"].includes(getComputedStyle(n).position)) return;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
});
// A pointer press is hover and press together: a control that stays :active after losing :hover no longer
// shows its pressed appearance (a tooltip shown on hover hides, for example), so both must hold.
const STATE_SELECTOR = { hover: ":hover", focus: ":focus-visible", active: ":active:hover" };

// Waits until sample() returns the same non-empty value three times, 150 ms apart (at most 9 s).
const settled = async (page, sample, failure) => {
  let [previous, same] = [await sample(), 0];
  for (let step = 0; step < 60 && same < 2; step++) {
    await page.waitForTimeout(150);
    const next = await sample();
    same = next && next === previous ? same + 1 : 0;
    previous = next;
  }
  if (same < 2) throw new Error(failure);
};

// Rendered-ground contrast, for text whose ground the colour stack cannot describe (a gradient, image or
// backdrop filter below it) and for prepared states. The element's text is hidden, and the pixels behind
// each text run are compared with that run's own colour (its parent element's); the lowest ratio over all
// runs is reported, with that run's text. own: only the element's own text runs, not its descendants'.
// r10, per run: every run is also returned on its own (runs), keyed by the path from the measured element to
// the run's parent, the run's text and its occurrence among identical paths and texts. The occurrence is
// numbered over every text node in document order, before any is skipped, so a run keeps its key on every
// build. exclude: a selector whose nested matches own their runs; those runs are measured there, not here.
// r10: a run is only its visible part, inside its parent's padding box (never the parent's border) and
// inside every clipping ancestor, so screen-reader-only text is not measured; outlines are hidden during
// the capture, so a focus ring is never read as ground. A capture counts only if nothing covers the text and
// two captures agree (the ground holds still). Otherwise the ratio is null, with the reason. r10 (round 3): a
// covered or off-screen run is skipped and retried on its own, never failing the element's other runs.
const HIDE_TEXT = ["", " *", "::before", "::after", " *::before", " *::after"].map((s) => `[data-df-measuring]${s}`).join(", ") +
  " { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; outline-color: transparent !important; }" +
  // While covers are checked, the measured subtree takes pointer events, so that elementFromPoint finds text
  // drawn by a pointer-transparent element (a tooltip) rather than whatever lies beneath it.
  " [data-df-cover], [data-df-cover] * { pointer-events: auto !important; }";
const decoder = await browser.newPage();
const RETRY_PLACES = [0.5, 0.3, 0.7];
// One measurement of an element's runs (r10). only: measure that run alone, scrolled first so that its middle
// lies at the fraction place of the viewport's height (a retry). Each run is measured over its line boxes, each clipped as above: a run that wraps is
// never read against the text around it. A run covered or partly off screen is skipped on its own, with its
// reason; the element's other runs are still measured.
const probeRuns = (locator, { own, exclude, only, place = 0.5, mark = true }) => locator.evaluate((el, [css, ownOnly, excluded, onlyKey, at, marking]) => {
  if (!document.getElementById("df-measuring")) document.head.append(Object.assign(document.createElement("style"), { id: "df-measuring", textContent: css }));
  const runs = [];
  const skipped = [];
  const nodes = ownOnly ? [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE) : [];
  if (!ownOnly) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
  }
  const seen = {};
  const keyed = nodes.filter((node) => node.textContent.trim()).map((node) => {
    const path = [];
    for (let n = node.parentElement; n && n !== el; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.classList[0] ? `.${n.classList[0]}` : ""));
    const text = node.textContent.trim().replace(/\s+/g, " ").slice(0, 24);
    const base = `${path.join(">")}${path.length ? ">" : ""}"${text}"`;
    seen[base] = (seen[base] || 0) + 1;
    return { node, text, key: seen[base] === 1 ? base : `${base}#${seen[base]}` };
  });
  // The visible line boxes of a run: each of its own boxes, inside its parent's padding box and every
  // clipping ancestor's padding box. A clip that hides all of it (screen-reader-only text) leaves nothing.
  const boxes = (node) => {
    let [cl, ct, cr, cb] = [-Infinity, -Infinity, Infinity, Infinity];
    for (let n = node.parentElement, first = true; n && n !== document.documentElement; n = n.parentElement, first = false) {
      const s = getComputedStyle(n);
      if (s.clip === "rect(0px, 0px, 0px, 0px)" || /^inset\(50%/.test(s.clipPath)) return [];
      if (!first && s.overflowX === "visible" && s.overflowY === "visible") continue;
      const b = n.getBoundingClientRect();
      cl = Math.max(cl, b.left + parseFloat(s.borderLeftWidth));
      ct = Math.max(ct, b.top + parseFloat(s.borderTopWidth));
      cr = Math.min(cr, b.right - parseFloat(s.borderRightWidth));
      cb = Math.min(cb, b.bottom - parseFloat(s.borderBottomWidth));
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()]
      .map((r) => ({ left: Math.max(r.left, cl), top: Math.max(r.top, ct), right: Math.min(r.right, cr), bottom: Math.min(r.bottom, cb) }))
      .filter((r) => r.right - r.left >= 1 && r.bottom - r.top >= 1);
  };
  const name = (hit) => `${hit.tagName.toLowerCase()}${[...hit.classList].map((c) => `.${c}`).join("")}`;
  el.setAttribute("data-df-cover", "");
  for (const { node, text, key } of keyed) {
    if (onlyKey !== null && key !== onlyKey) continue;
    // Text that renders nothing (an ancestor at opacity 0 or visibility hidden) is not measured, nor is
    // creative text inside a governed element measured as part of it (r10).
    if (!node.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    if (node.parentElement.closest("[data-df-region]") && !el.closest("[data-df-region]")) continue;
    // A run that a nested measured element owns is measured there, never twice (r10).
    if (excluded) {
      const owner = node.parentElement.closest(excluded);
      if (owner && owner !== el && el.contains(owner)) continue;
    }
    if (onlyKey !== null) {
      // A retry: the run itself goes to its place in the viewport, instantly.
      const all = boxes(node);
      if (all.length) {
        const [top, bottom] = [Math.min(...all.map((r) => r.top)), Math.max(...all.map((r) => r.bottom))];
        window.scrollBy({ top: (top + bottom) / 2 - innerHeight * at, behavior: "instant" });
      }
    }
    let parts = boxes(node);
    if (!parts.length) continue;
    // Read before the text is hidden: computed styles are live.
    const color = getComputedStyle(node.parentElement).color;
    if (parts.some((r) => r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)) { skipped.push({ key, text, reason: "partly off screen" }); continue; }
    const points = [[0.5, 0.5], [0.05, 0.1], [0.95, 0.1], [0.05, 0.9], [0.95, 0.9]];
    let cover;
    for (const r of parts) {
      cover = points.map(([fx, fy]) => document.elementFromPoint(r.left + (r.right - r.left) * fx, r.top + (r.bottom - r.top) * fy)).find((hit) => !hit || !el.contains(hit));
      if (cover !== undefined) break;
    }
    if (cover !== undefined) { skipped.push({ key, text, reason: cover ? `covered by ${name(cover)}` : "off screen" }); continue; }
    parts = parts.map((r) => { const [x, y] = [Math.ceil(r.left), Math.ceil(r.top)]; return { x, y, width: Math.floor(r.right) - x, height: Math.floor(r.bottom) - y }; }).filter((c) => c.width >= 1 && c.height >= 1);
    const centre = parts[0] && { x: parts[0].x + parts[0].width / 2, y: parts[0].y + parts[0].height / 2 };
    if (parts.length) runs.push({ color, crops: parts, text, key, centre });
  }
  el.removeAttribute("data-df-cover");
  if (!runs.length && !skipped.length) return { reason: "no rendered text" };
  if (!runs.length || !marking) return { runs, skipped, y: Math.round(scrollY) };
  el.setAttribute("data-df-measuring", "");
  // One capture of the viewport region that holds every run's boxes; crops are relative to it.
  const crops = runs.flatMap((r) => r.crops);
  const region = { x: Math.min(...crops.map((c) => c.x)), y: Math.min(...crops.map((c) => c.y)) };
  region.width = Math.max(...crops.map((c) => c.x + c.width)) - region.x;
  region.height = Math.max(...crops.map((c) => c.y + c.height)) - region.y;
  for (const c of crops) { c.x -= region.x; c.y -= region.y; }
  return { runs, skipped, region, y: Math.round(scrollY) };
}, [HIDE_TEXT, own, exclude, only, place, mark]);
// Captures the region twice (the ground must hold still) and measures every pixel of each run's boxes.
const captureRuns = async (page, locator, probe) => {
  let png = null;
  for (let attempt = 0; attempt < 3 && !png; attempt++) {
    const first = await page.screenshot({ clip: probe.region, animations: "disabled", scale: "css" });
    const second = await page.screenshot({ clip: probe.region, animations: "disabled", scale: "css" });
    if (first.equals(second)) png = first;
    else await page.waitForTimeout(100);
  }
  await locator.evaluate((el) => el.removeAttribute("data-df-measuring"));
  if (!png) return null;
  return decoder.evaluate(async ([data, runs, y]) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const lum = (r, g, b) => { const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    return runs.map(({ color, crops, text, key }) => {
      let lowest = Infinity;
      let worst = null;
      const parts = color.match(/\(([^)]+)\)/)[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      const srgb = color.startsWith("color(") ? parts.slice(1) : parts.map((v, i) => (i < 3 ? v / 255 : v));
      const [fr, fg, fb, fa = 1] = srgb;
      for (const { x, y: top, width, height } of crops) {
        const pixels = context.getImageData(x, top, width, height).data;
        for (let i = 0; i < pixels.length; i += 4) {
          const [br, bg, bb] = [pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255];
          const [hi, lo] = [lum(fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa)), lum(br, bg, bb)].sort((a, b) => b - a);
          const value = (hi + 0.05) / (lo + 0.05);
          if (value < lowest) [lowest, worst] = [value, [pixels[i], pixels[i + 1], pixels[i + 2]]];
        }
      }
      return { key, text, ratio: Math.round(lowest * 100) / 100, fg: color, ground: `rgb(${worst.join(", ")})`, size: crops.map((c) => `${c.width}x${c.height}`).join("+"), y };
    });
  }, [png.toString("base64"), probe.runs, probe.y]);
};
// r10, per run: a run skipped as covered or partly off screen is retried on its own when the caller can
// re-enter its state (enter: { reset, at(x, y), held }; the rest state re-enters trivially): the run is
// scrolled so that its middle lies at the middle of the viewport, then at 30% and at 70% of its height (a
// fixed element, such as the section dots, may sit at the middle), the state is entered on the run itself,
// and the run is measured alone, its state verified after the capture. A run that still cannot be measured
// keeps its own reason. Every build tries the same places in the same order.
const renderedContrast = async (page, locator, { own = false, exclude = null, enter = null } = {}) => {
  await reveal(locator);
  await steady(locator);
  const probe = await probeRuns(locator, { own, exclude, only: null });
  if (probe.reason) return { ratio: null, reason: probe.reason };
  const runs = probe.runs.length ? await captureRuns(page, locator, probe) : [];
  if (!runs) return { ratio: null, reason: "ground does not hold still" };
  const held = enter && (await enter.held());
  if (held) return { ratio: null, reason: held };
  const skipped = [];
  for (const miss of probe.skipped) {
    let reason = miss.reason;
    for (const place of RETRY_PLACES) {
      if (!enter || !reason) break;
      await enter.reset();
      await probeRuns(locator, { own, exclude, only: miss.key, place, mark: false });
      await frames(page);
      await steady(locator);
      const again = await probeRuns(locator, { own, exclude, only: miss.key, place, mark: false });
      const run = again.runs?.[0];
      if (!run) { reason = again.skipped?.[0]?.reason ?? again.reason ?? "no rendered text"; continue; }
      reason = await enter.at(run.centre.x, run.centre.y);
      if (reason) continue;
      const settledProbe = await probeRuns(locator, { own, exclude, only: miss.key, place });
      if (!settledProbe.runs?.length) { reason = settledProbe.skipped?.[0]?.reason ?? settledProbe.reason ?? "no rendered text"; continue; }
      const measuredRun = await captureRuns(page, locator, settledProbe);
      reason = measuredRun ? await enter.held() : "ground does not hold still";
      if (!reason) runs.push(measuredRun[0]);
    }
    if (reason) skipped.push({ key: miss.key, text: miss.text, reason });
  }
  if (!runs.length) return { ratio: null, reason: skipped[0].reason, runs, skipped, y: probe.y };
  const lowest = runs.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  return { ratio: lowest.ratio, run: lowest.text, runs, ...(skipped.length ? { skipped } : {}), y: probe.y };
};
// The rest state re-enters trivially: nothing to reset, enter or hold.
const AT_REST = { reset: async () => {}, at: async () => null, held: async () => null };

// WCAG 2 contrast against the composited background-colour stack. A sampler: canvases and iframes
// under text are not seen, and on a colour stack only the element's own colour is compared. Where a
// background image or gradient lies under the text, the colour stack cannot describe the ground, so the
// element is measured against the rendered pixels instead, run by run (null, with a reason, when that is
// impossible). Elements inside [data-df-region] are creative content, reported apart from the interface.
// painted (the text pass, r10): every other element with its own text, so that no rendered text is
// skipped: nested text inside a sampler match included. Each text occurrence is measured once: an element
// the sampler matched is measured there; inside a match measured on rendered pixels, every run already was;
// inside a match measured on its colour stack, a descendant is skipped only when it has the match's colour
// and ground (the match's result is that text). The rest is measured in its own colour: on its colour stack
// or, on a painted ground, on rendered pixels. Either way it is check "text" (r10); a rendered result's
// detail says "(rendered ground)".
const contrastOf = async (page, selector, { all = true, rendered = false, painted = false, enter = AT_REST } = {}) => {
  const results = await page.evaluate(([sel, every, forceRendered, paintedPass, sampled]) => {
    const parse = (value) => {
      let m = value.match(/^rgba?\(([^)]+)\)$/);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p[3] ?? 1 }; }
      m = value.match(/^color\(srgb ([^)]+)\)$/);
      if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
      return null;
    };
    const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const lum = ({ r, g, b }) => { const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    // null when the ground is painted: a background image lies under the text before any opaque colour.
    const ground = (el) => {
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const style = getComputedStyle(n);
        if (style.backgroundImage !== "none") return null;
        const c = parse(style.backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
      }
      let out = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 1, g: 1, b: 1, a: 1 };
      while (layers.length) out = over(layers.pop(), out);
      return out;
    };
    const found = [];
    // Element identity (r10): name and text, numbered over the elements this call can measure, in page order,
    // before any skip that depends on colour, so the n-th identical element pairs with the n-th on every build.
    const seen = {};
    for (const el of document.querySelectorAll(sel)) {
      if (!el.checkVisibility?.() || !el.textContent.trim()) continue;
      const region = Boolean(el.closest("[data-df-region]"));
      if (region && !every) continue;
      if (paintedPass) {
        const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        if (!own || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName) || el.matches(sampled)) continue;
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        // Screen-reader-only text renders nothing: a box of at most one pixel, or a clip that hides all of it.
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (box.width * box.height <= 1 || style.clip === "rect(0px, 0px, 0px, 0px)" || /^inset\(50%/.test(style.clipPath)) continue;
      }
      const text = (paintedPass ? [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(" ") : el.textContent).trim().replace(/\s+/g, " ").slice(0, 30);
      const name = el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : "");
      const base = paintedPass ? `${name}|${text}` : text;
      seen[base] = (seen[base] || 0) + 1;
      const key = seen[base] === 1 ? base : `${base}#${seen[base]}`;
      if (paintedPass) {
        const host = el.parentElement?.closest(sampled);
        // Text inside a creative region is measured and reported as creative, never dropped (r10).
        if (host && !region) {
          const [hostGround, ownGround] = [ground(host), ground(el)];
          if (!hostGround) continue;
          const same = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 1 / 255;
          if (ownGround && getComputedStyle(el).color === getComputedStyle(host).color && same(ownGround, hostGround)) continue;
        }
      }
      const bg = forceRendered ? null : ground(el);
      let ratio = null;
      if (bg) {
        const fg = over(parse(getComputedStyle(el).color), bg);
        const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        ratio = Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
      } else {
        el.setAttribute("data-df-probe", String(found.length));
      }
      const colour = (c) => (c ? `rgb(${[c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(", ")})` : null);
      // On a colour stack, the element's own text runs share its result; they take the keys a rendered
      // measurement gives them, so a run pairs across builds even if a repair changes how its ground is measured.
      const ownRuns = [];
      if (bg) {
        const runSeen = {};
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
          const runText = node.textContent.trim().replace(/\s+/g, " ").slice(0, 24);
          runSeen[runText] = (runSeen[runText] || 0) + 1;
          ownRuns.push({ key: runSeen[runText] === 1 ? `"${runText}"` : `"${runText}"#${runSeen[runText]}`, text: runText, ratio, fg: getComputedStyle(el).color, ground: colour(bg), size: null });
        }
      }
      found.push({ text: key, ratio, region, rendered: !bg, disabled: el.matches(":disabled"), fg: getComputedStyle(el).color, ground: colour(bg), y: Math.round(scrollY), ...(ownRuns.length ? { runs: ownRuns } : {}) });
      if (!every) break;
    }
    return found;
  }, [selector, all, rendered, painted, SAMPLER_SELECTORS.join(", ")]);
  for (const [index, result] of results.entries()) {
    if (result.rendered) Object.assign(result, await renderedContrast(page, page.locator(`[data-df-probe="${index}"]`), { own: painted, exclude: painted ? null : SAMPLER_SELECTORS.join(", "), enter }));
  }
  await page.evaluate(() => document.querySelectorAll("[data-df-probe]").forEach((el) => el.removeAttribute("data-df-probe")));
  return results;
};

// Interaction pass (r10): every enabled control with text, outside creative regions, hovered, focused
// (focus-visible) and pressed, each state verified and measured on rendered pixels over all its text runs,
// nested ones included. Transitions are off, so a state renders at once. A covered control is never
// entered; it and any state that cannot be entered are listed as unmeasured, with the reason. A press is
// released away from the control, so nothing is activated; a navigation fails the test.
const CONTROLS = 'a[href], button, [role="button"], summary, input[type="submit"], input[type="button"], input[type="reset"]';
const interactions = async (page) => {
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  const start = page.url();
  const controls = await page.evaluate((sel) => {
    const seen = {};
    return [...document.querySelectorAll(sel)].flatMap((el, i) => {
      if (!el.checkVisibility?.() || !el.textContent.trim() || el.closest("[data-df-region]") || el.matches(":disabled") || el.parentElement?.closest(sel)) return [];
      el.setAttribute("data-df-control", String(i));
      const base = `${el.tagName.toLowerCase()}|${el.textContent.trim().replace(/\s+/g, " ").slice(0, 30)}`;
      seen[base] = (seen[base] || 0) + 1;
      return [{ i, key: `${base}#${seen[base]}` }];
    });
  }, CONTROLS);
  const results = [];
  for (const { i, key } of controls) {
    const control = page.locator(`[data-df-control="${i}"]`);
    for (const state of ["hover", "focus", "active"]) {
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement?.blur?.());
      let reason = null;
      let pressed = false;
      let measuredState = null;
      // Enters the state with the pointer at (x, y), inside the control, and verifies it.
      const enterAt = async (x, y) => {
        if (state === "focus") {
          await control.evaluate((el) => el.focus({ focusVisible: true }));
          await frames(page);
          return (await control.evaluate((el) => el.matches(":focus-visible"))) ? null : "not focusable";
        }
        await page.mouse.move(x, y);
        if (state === "active") { await page.mouse.down(); pressed = true; }
        await frames(page);
        return (await control.evaluate((el, s) => el.matches(s), STATE_SELECTOR[state])) ? null : `not ${state}`;
      };
      const coverAt = (x, y) => page.evaluate(([px, py, index]) => {
        const hit = document.elementFromPoint(px, py);
        if (!hit) return "off screen";
        return document.querySelector(`[data-df-control="${index}"]`).contains(hit) ? null : `covered by ${hit.tagName.toLowerCase()}${[...hit.classList].map((c) => `.${c}`).join("")}`;
      }, [x, y, i]);
      // A run retried on its own (r10): the state is left, then entered again on the run itself.
      const enter = {
        reset: async () => {
          await page.mouse.move(0, 0);
          if (pressed) { await page.mouse.up(); pressed = false; }
          await page.evaluate(() => document.activeElement?.blur?.());
        },
        at: async (x, y) => (await coverAt(x, y)) ?? enterAt(x, y),
        held: async () => ((await control.evaluate((el, s) => el.matches(s), STATE_SELECTOR[state])) ? null : `${state} not held`),
      };
      // A state that does not take, or does not hold through its capture, is retried (r10): a settling scroll
      // or a late layout shift can take the control from under the pointer. Only a state that fails three
      // times is unmeasured; a press is released away first.
      for (let attempt = 0; attempt < 3 && (attempt === 0 || reason); attempt++) {
        if (pressed) { await page.mouse.move(0, 0); await page.mouse.up(); pressed = false; }
        reason = null;
        try {
          await reveal(control);
          await frames(page);
          // r10: the control is entered at the first point inside it that nothing covers: the middle of its
          // box, then of each of its line boxes, then of each of its text runs' boxes. A link that wraps may
          // have no text at the middle of its box.
          const point = await page.evaluate((index) => {
            const el = document.querySelector(`[data-df-control="${index}"]`);
            const candidates = [el.getBoundingClientRect(), ...el.getClientRects()];
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              if (!n.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(n);
              candidates.push(...range.getClientRects());
            }
            let first = null;
            for (const r of candidates) {
              if (r.width < 1 || r.height < 1) continue;
              const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
              const hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
              if (hit && el.contains(hit)) return { x, y };
              first ??= hit ? `covered by ${hit.tagName.toLowerCase()}${[...hit.classList].map((c) => `.${c}`).join("")}` : "off screen";
            }
            return { reason: first ?? "off screen" };
          }, i);
          // A state's script-driven styles (a scale on hover or press) apply on a later animation frame, so
          // the state settles two frames before it is checked and captured.
          reason = point.reason ?? (await enterAt(point.x, point.y));
        } catch {
          reason = `could not enter ${state}`;
        }
        if (!reason) {
          // The state is verified again after the capture, inside the measurement, before any run is retried.
          // A measurement that found no rendered text, or a ground that would not hold still, is retried too: a
          // section scrolled into view may still be fading in (r10).
          measuredState = await renderedContrast(page, control, { enter });
          if (measuredState.reason && !measuredState.skipped) reason = measuredState.reason;
        }
      }
      const result = reason ? { ratio: null, reason } : measuredState;
      results.push({ key, state, ...result });
      await page.mouse.move(0, 0);
      if (pressed) await page.mouse.up();
      if (page.url() !== start) throw new Error(`interaction pass: ${key}:${state} navigated to ${page.url()}`);
    }
  }
  await page.evaluate(() => document.querySelectorAll("[data-df-control]").forEach((el) => el.removeAttribute("data-df-control")));
  return results;
};

// Header backdrop (r10): the header is translucent, so the ground of its text depends on what is scrolled
// behind it. Its worst ground is the header over the page colour farthest from its text: black under Light's
// dark text, white under Dark's (and Mono's) light text. Everything else stops painting, over that page. On
// BACKDROP_ROUTES every visible header control with text is measured at rest, hovered,
// focused (focus-visible) and pressed, each state verified, on rendered pixels over all its text runs; a
// press is released away.
const BACKDROP_ROUTES = ["/projects"];
const backdrop = async (page, theme) => {
  const [page_, rgb] = theme === "light" ? ["#000", "rgb(0, 0, 0)"] : ["#fff", "rgb(255, 255, 255)"];
  const style = await page.addStyleTag({ content: `html, body { background: ${page_} !important; } body * { visibility: hidden !important; } .site-header, .site-header * { visibility: visible !important; }` });
  // The backdrop must be in force: the theme's worst page colour with the content hidden (checked in check mode).
  invariant(await page.evaluate((expected) => getComputedStyle(document.body).backgroundColor === expected && getComputedStyle(document.querySelector("main")).visibility === "hidden", rgb),
    `header backdrop: the page around the header is not hidden over ${page_}`);
  const controls = await page.evaluate(() => {
    const seen = {};
    return [...document.querySelectorAll(".site-header a[href], .site-header button")].flatMap((el, i) => {
      if (!el.checkVisibility() || !el.textContent.trim()) return [];
      el.setAttribute("data-df-backdrop", String(i));
      const base = `${el.tagName.toLowerCase()}|${el.textContent.trim().replace(/\s+/g, " ").slice(0, 30)}`;
      seen[base] = (seen[base] || 0) + 1;
      return [{ i, key: `${base}#${seen[base]}` }];
    });
  });
  const at = async (locator) => { const box = await locator.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); };
  const results = [];
  for (const { i, key } of controls) {
    const control = page.locator(`[data-df-backdrop="${i}"]`);
    for (const [state, enter] of [["rest"], ["hover", at], ["focus", (l) => l.evaluate((el) => el.focus({ focusVisible: true }))], ["active", async (l) => { await at(l); await page.mouse.down(); return true; }]]) {
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement?.blur?.());
      const pressed = await enter?.(control);
      await frames(page);
      const entered = state === "rest" || (await control.evaluate((el, s) => el.matches(s), STATE_SELECTOR[state]));
      results.push({ key: `${key}:${state}`, ...(entered ? await renderedContrast(page, control) : { ratio: null, reason: `not ${state}` }) });
      await page.mouse.move(0, 0);
      if (pressed) await page.mouse.up();
    }
  }
  await page.evaluate(() => document.querySelectorAll("[data-df-backdrop]").forEach((el) => el.removeAttribute("data-df-backdrop")));
  await style.evaluate((el) => el.remove());
  return results;
};

const detail = ({ ratio, rendered, disabled, run }) => `${ratio}:1${rendered ? " (rendered ground)" : ""}${disabled ? " (disabled)" : ""}${run ? ` [${run}]` : ""}`;
// Recording (r10): every measurement goes into the inventory, keyed by check, theme, route, element and, on
// rendered pixels, text run, so each run is compared with its own baseline value, never hidden behind another
// run's. Creative and inactive results are filed apart. An id recorded twice is a pairing defect.
const newSink = () => ({ measured: {}, regressions: [], creative: [], inactive: [], unmeasured: [], duplicates: [] });
const SINK = { measured, regressions, creative, inactive, unmeasured, duplicates };
const record = (check, theme, route, key, result, { limit = 4.5, sink = SINK } = {}) => {
  const base = `${check}|${theme}|${route}|${key}`;
  const kind = result.region ? "creative" : result.disabled ? "inactive" : null;
  const items = result.runs || result.skipped
    ? [...(result.runs ?? []).map((r) => ({ id: `${base}|${r.key}`, value: r.ratio, fg: r.fg, ground: r.ground, setup: `${r.size ?? ""}@${r.y ?? result.y}`, detail: detail({ ratio: r.ratio, rendered: result.rendered !== false, disabled: result.disabled, run: r.text }) })),
      ...(result.skipped ?? []).map((r) => ({ id: `${base}|${r.key}`, reason: r.reason }))]
    : result.ratio === null ? [{ id: base, reason: result.reason }]
    : [{ id: base, value: result.ratio, fg: result.fg, ground: result.ground, setup: `@${result.y}`, detail: detail(result) }];
  for (const item of items) {
    const id = kind === "creative" || (kind === "inactive" && !item.reason) ? item.id.replace(/^[a-z]+/, kind) : item.id;
    if (sink.measured[id]) sink.duplicates.push(id);
    const failing = !kind && !item.reason && item.value < limit;
    sink.measured[id] = item.reason ? { reason: item.reason }
      : { value: item.value, fg: item.fg, ground: item.ground, setup: item.setup, ...(failing ? { failing } : {}), ...(limit !== 4.5 ? { limit } : {}) };
    if (kind === "creative") sink.creative.push({ id, detail: item.detail ?? `null:1 (${item.reason})`, value: item.value ?? null });
    else if (item.reason) sink.unmeasured.push({ id, reason: item.reason });
    else if (kind === "inactive") sink.inactive.push({ id, detail: item.detail, value: item.value });
    else if (failing) sink.regressions.push({ id, detail: item.detail, value: item.value });
  }
};
// Per-run comparison (r10), for check mode and the measurement controls: the baseline's failing runs
// (entries, with their baseline values) against every measurement of this build. fresh: fails here only.
// worse: fails on both, more than 0.05 lower here. stale: measured here and passing. missing: not measured
// here at all, so it cannot be paired.
const compareRuns = (entries, current, inScope = () => true) => {
  const known = new Map(entries.map((e) => [e.id, e]));
  const failing = Object.entries(current).filter(([, m]) => m.failing);
  return {
    fresh: failing.filter(([id]) => !known.has(id)).map(([id]) => id),
    worse: failing.filter(([id, m]) => known.has(id) && m.value < known.get(id).baseline - 0.05).map(([id]) => id),
    stale: entries.filter((e) => inScope(e.id) && current[e.id] && !current[e.id].reason && !current[e.id].failing).map((e) => e.id),
    missing: entries.filter((e) => inScope(e.id) && !current[e.id]).map((e) => e.id),
  };
};

for (const theme of THEMES) {
  for (const route of ROUTES) {
    await withPage({ theme, route, routePass: true }, async (page) => {
      ran.add(`contrast|${theme}|${route}`);
      ran.add(`pair|${theme}|${route}`);
      ran.add(`text|${theme}|${route}`);
      ran.add(`interact|${theme}|${route}`);
      if (BACKDROP_ROUTES.includes(route)) ran.add(`backdrop|${theme}|${route}`);
      for (const selector of SAMPLER_SELECTORS) {
        for (const result of await contrastOf(page, selector)) {
          if (result.region) regions[`${theme}|${route}`] = (regions[`${theme}|${route}`] || 0) + 1;
          record("contrast", theme, route, `${selector}|${result.text}`, result);
        }
      }
      for (const result of await contrastOf(page, "body *", { painted: true })) {
        if (result.region) regions[`${theme}|${route}`] = (regions[`${theme}|${route}`] || 0) + 1;
        record("text", theme, route, result.text, result);
      }
      // Transitions off before any hover (r10): a hover measured mid-transition depends on timing.
      await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
      for (const pair of PAIRS) {
        if (pair.prepare) continue;
        const target = page.locator(pair.selector).first();
        if (!(await target.count()) || !(await target.isVisible())) continue;
        uncovered.delete(pair.selector);
        // A hover is verified before it is measured (r10): a late layout shift can move the element from under
        // the pointer. It is retried, and a hover that never holds is unmeasured, never passed.
        // It must still hold after the measurement, or both are retried.
        const key = `${pair.selector}${pair.hover ? ":hover" : ""}`;
        let [hovered, result] = [!pair.hover, null];
        for (let attempt = 0; attempt < 3; attempt++) {
          if (pair.hover) {
            await reveal(target);
            await frames(page);
            const box = await target.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await frames(page);
            hovered = await target.evaluate((el) => el.matches(":hover"));
            if (!hovered) continue;
          }
          // A hover pair is not retried at rest (r10): a skipped run of it stays unmeasured, with its reason.
          [result] = await contrastOf(page, pair.selector, { all: false, rendered: pair.rendered, enter: pair.hover ? null : AT_REST });
          if (!pair.hover || (await target.evaluate((el) => el.matches(":hover")))) break;
          [hovered, result] = [false, null];
        }
        if (!hovered) { record("pair", theme, route, key, { ratio: null, reason: "not hover" }); continue; }
        if (result) record("pair", theme, route, key, result, { limit: pair.min ?? 4.5 });
      }
      if (MODE === "check" && route === "/") {
        const state = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          body: getComputedStyle(document.body).backgroundColor,
          inline: [...document.documentElement.style].map((name) => [name, document.documentElement.style.getPropertyValue(name)]),
        }));
        const leaked = unexpectedInline(state.inline);
        invariant(state.theme === theme, `${theme}: data-theme is ${state.theme}`);
        invariant(state.body === FIELD[theme], `${theme}: page ground ${state.body} is not Darkfield field`);
        invariant(leaked.length === 0, `${theme}: unexpected inline custom properties on <html>: ${leaked.map(([name, value]) => `${name}: ${value}`).join("; ")}`);
      }
      for (const result of await interactions(page)) record("interact", theme, route, `${result.key}:${result.state}`, result);
      // Last on the route: it hides the page around the header.
      if (BACKDROP_ROUTES.includes(route)) {
        for (const result of await backdrop(page, theme)) record("backdrop", theme, route, result.key, result);
      }
    });
  }
  for (const state of STATES) {
    await withPage({ theme, route: state.route, clock: state.clock }, async (page) => {
      ran.add(`state|${theme}|${state.route}`);
      await state.prepare(page);
      await page.mouse.move(0, 0);
      for (const selector of state.texts ?? []) {
        const texts = page.locator(selector);
        for (let i = 0; i < (await texts.count()); i++) {
          const label = (await texts.nth(i).textContent()).trim().replace(/\s+/g, " ").slice(0, 30);
          record("state", theme, state.route, `${label}:prepared`, await renderedContrast(page, texts.nth(i)));
        }
      }
      const controls = page.locator(state.controls);
      const count = await controls.count();
      if (!count) throw new Error(`${state.route}: no ${state.controls}`);
      for (let i = 0; i < count; i++) {
        const control = controls.nth(i);
        const label = (await control.textContent()).trim().replace(/\s+/g, " ").slice(0, 30);
        for (const [name, enter] of Object.entries(state.states)) {
          const exit = await enter(page, control);
          record("state", theme, state.route, `${label}:${name}`, await renderedContrast(page, control));
          if (exit) await exit();
        }
      }
    });
  }
  // Pairs a route load does not render, measured at rest once prepare(page) has brought them on screen.
  for (const pair of PAIRS.filter((p) => p.prepare)) {
    await withPage({ theme, route: pair.route }, async (page) => {
      await pair.prepare(page);
      await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
      const target = page.locator(pair.selector).first();
      if (!(await target.count()) || !(await target.isVisible())) return;
      uncovered.delete(pair.selector);
      const [result] = await contrastOf(page, pair.selector, { all: false, rendered: pair.rendered, enter: AT_REST });
      if (result) record("pair", theme, pair.route, pair.selector, result, { limit: pair.min ?? 4.5 });
    });
  }
}

if (MODE === "check") {
  await withPage({ theme: "neon" }, async (page) => {
    invariant(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "unknown stored theme must fall back to dark");
  });
  await withPage({ javaScriptEnabled: false, route: "/projects" }, async (page) => {
    invariant(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === FIELD.dark, "no-JS route shell is not on Darkfield field");
  });
  // Controls for the inline-property invariant: the rendered layout properties pass, and each injected
  // property is rejected (a legacy theme variable, a Darkfield token, an unknown name, non-length values).
  await withPage({ theme: "dark" }, async (page) => {
    const read = () => page.evaluate(() => [...document.documentElement.style].map((name) => [name, document.documentElement.style.getPropertyValue(name)]));
    const rendered = await read();
    const accepted = rendered.some(([name]) => INLINE_LAYOUT.includes(name)) && unexpectedInline(rendered).length === 0;
    invariant(accepted, "inline-property control: the rendered layout properties are not accepted");
    const injected = [
      ["--app-bg", "#1a1a1a"], ["--field", "#000000"], ["--darkfield-probe", "1px"],
      ["--dock-icon-size", "#ff0000"], ["--site-dock-safe-space", "var(--field)"],
    ];
    await page.evaluate((list) => list.forEach(([name, value]) => document.documentElement.style.setProperty(name, value)), injected);
    const rejected = unexpectedInline(await read()).map(([name]) => name).sort();
    const expected = injected.map(([name]) => name).sort();
    invariant(JSON.stringify(rejected) === JSON.stringify(expected), `inline-property control: rejected ${rejected.join(", ") || "nothing"}`);
  });
  // Navigation-independent game colours (r9). A lazily loaded page stylesheet stays attached after
  // client-side navigation, so a variable it defines on :root or [data-theme] reaches every later route.
  // Each game is reached by direct load and by client-side paths; on each, <html> must not define
  // --terminal-primary, and the game's probes must read the colours of its direct load. The probes are
  // Spider's card ranks (native) and buttons (page chrome) and Snake's score (a D6 confirm row).
  const GAMES = { spider: [".spider-card-rank", ".spider-button"], snake: [".game-score"] };
  // A page counts as reached once its own content renders, which is after its stylesheet has loaded.
  const READY = { "/projects": ".projects-container", "/simulations": ".simulation-preview", "/terminal": "input.command-input:visible" };
  const follow = async (page, href) => {
    await page.locator(`a[href="${href}"]:visible`).first().click();
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === href);
    if (READY[href]) await page.locator(READY[href]).first().waitFor();
    await page.waitForLoadState("networkidle");
  };
  const cd = async (page, path) => {
    const input = page.locator("input.command-input:visible").first();
    await input.fill(`cd ${path}`);
    await input.press("Enter");
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === `/${path}`);
    await page.waitForLoadState("networkidle");
  };
  // Project styles remain attached after client navigation. They must not leave page-level terminal
  // colours on <html>. Terminal.css is eagerly loaded by the route table, so compare each arrival
  // with its direct load: the terminal header alias is present even on /journey.
  for (const route of ["/journey", "/terminal"]) {
    const readTerminalAliases = (page) => page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return [style.getPropertyValue("--terminal-text-light").trim(), style.getPropertyValue("--terminal-header-bg").trim()];
    });
    let direct;
    await withPage({ theme: "light", route }, async (page) => {
      direct = await readTerminalAliases(page);
    });
    invariant(direct[0] === "" && direct[1] !== "", `Light direct ${route}: terminal aliases ${JSON.stringify(direct)}`);
    await withPage({ theme: "light", route: "/projects" }, async (page) => {
      await follow(page, route);
      const seen = await readTerminalAliases(page);
      invariant(JSON.stringify(seen) === JSON.stringify(direct),
        `Light /projects → ${route}: leaked terminal colours ${JSON.stringify(seen)}; direct load ${JSON.stringify(direct)}`);
    });
  }
  const NAVIGATION = [
    { name: "direct", start: (game) => `/simulations/${game}` },
    { name: "/games alias", start: (game) => `/games/${game}` },
    { name: "/simulations, card", start: () => "/simulations", go: (page, game) => follow(page, `/simulations/${game}`) },
    { name: "/projects, /simulations, card", start: () => "/projects", go: async (page, game) => { await follow(page, "/simulations"); await follow(page, `/simulations/${game}`); } },
    { name: "/terminal, cd", start: () => "/terminal", go: (page, game) => cd(page, `simulations/${game}`) },
    { name: "/projects, /terminal, cd", start: () => "/projects", go: async (page, game) => { await follow(page, "/terminal"); await cd(page, `simulations/${game}`); } },
    { name: "/simulations, /terminal, cd", start: () => "/simulations", go: async (page, game) => { await follow(page, "/terminal"); await cd(page, `simulations/${game}`); } },
    { name: "game, /projects, Back", start: (game) => `/simulations/${game}`, go: async (page) => { await follow(page, "/projects"); await page.goBack({ waitUntil: "networkidle" }); } },
  ];
  for (const theme of THEMES) {
    for (const [game, probes] of Object.entries(GAMES)) {
      let direct = null;
      for (const path of NAVIGATION) {
        await withPage({ theme, route: path.start(game) }, async (page) => {
          if (path.go) await path.go(page, game);
          await page.locator(probes[0]).first().waitFor();
          const seen = await page.evaluate((selectors) => ({
            at: location.pathname.replace(/\/$/, ""),
            root: getComputedStyle(document.documentElement).getPropertyValue("--terminal-primary").trim(),
            colors: selectors.map((s) => (document.querySelector(s) ? getComputedStyle(document.querySelector(s)).color : "absent")).join(" "),
          }), probes);
          direct ??= seen.colors;
          const label = `${theme} ${game} via ${path.name}`;
          invariant(seen.at === `/simulations/${game}`, `${label}: arrived at ${seen.at}`);
          invariant(seen.root === "", `${label}: <html> defines --terminal-primary: ${seen.root}`);
          invariant(!seen.colors.includes("absent") && seen.colors === direct, `${label}: ${seen.colors}; direct load: ${direct}`);
        });
      }
    }
    // The Projects tech-stack modal is portaled outside .projects-container (r9). It must read the
    // same global roles as its page, without a page-scoped terminal alias.
    await withPage({ theme, route: "/projects" }, async (page) => {
      await page.getByTitle("View technical coverage").click();
      const modal = await page.locator(".tech-stack-modal").evaluate((el) => {
        const scope = document.querySelector(".projects-container");
        const probe = document.createElement("span");
        el.appendChild(probe);
        probe.style.color = "var(--fg)";
        const fg = getComputedStyle(probe).color;
        probe.style.color = "var(--fg-muted)";
        const muted = getComputedStyle(probe).color;
        probe.remove();
        return {
          portaled: !scope.contains(el),
          alias: getComputedStyle(el).getPropertyValue("--terminal-primary").trim(),
          name: getComputedStyle(el.querySelector(".tech-name")).color,
          count: getComputedStyle(el.querySelector(".tech-count")).color,
          fg, muted,
        };
      });
      invariant(modal.portaled, `${theme}: the tech-stack modal is not portaled; this check no longer tests the portal`);
      invariant(modal.alias === "" && modal.name === modal.fg && modal.count === modal.muted,
        `${theme}: tech-stack modal roles ${JSON.stringify(modal)}`);
    });
  }
  // Measurement controls (r10): the contrast passes, run on a fixture with known answers, so that a pass
  // that stops measuring nested text, interaction states or inactive controls, or that reads borders,
  // outlines or screen-reader-only text as ground, fails here.
  const FIXTURE = `<!doctype html><style>
    body { margin: 0; background: #ffffff; color: #000000; font: 16px/1.5 sans-serif; }
    main { display: grid; gap: 24px; padding: 24px; justify-items: start; }
    a, button { display: inline-block; padding: 8px 12px; color: #000000; background: #ffffff; text-decoration: none; font: inherit; }
    .gradient { display: inline-block; padding: 4px 8px; color: #ffffff; background: linear-gradient(90deg, #ffffff, #d0d0d0); }
    .solid { display: inline-block; padding: 4px 8px; color: #777777; background: #888888; }
    .shade { color: #111111; }
    .worse:hover .label, .worse:focus-visible .label, .worse:active .label { color: #eeeeee; }
    .framed { border: 6px solid #000000; outline: 4px solid #000000; outline-offset: -16px; padding: 0 4px; line-height: 2; position: relative; }
    .sr-only { color: #eeeeee; position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    button:disabled { color: #999999; background: #aaaaaa; border: 0; }
  </style><main>
    <a href="#a">Card A <span class="gradient">Gradient label</span></a>
    <a href="#b">Card B <span class="solid">Solid label</span></a>
    <a href="#c" class="worse"><span class="label">Hover worse</span></a>
    <a href="#d"><span class="shade">Passing nested</span></a>
    <a href="#e"><span>Same colour and ground</span></a>
    <a href="#f" class="framed">Framed<span class="sr-only"> for the fixture (opens in a new tab)</span></a>
    <button disabled>Disabled control</button>
  </main>`;
  await withPage({ theme: "dark" }, async (page) => {
    await page.setContent(FIXTURE);
    const sampled = [...(await contrastOf(page, "a")), ...(await contrastOf(page, "button"))];
    const texts = await contrastOf(page, "body *", { painted: true });
    const states = await interactions(page);
    const text = (label) => texts.filter((r) => r.text.endsWith(`|${label}`));
    const state = (label, name) => states.find((r) => r.key.startsWith(`a|${label}`) && r.state === name);
    const control = (ok, message) => invariant(ok, `measurement control: ${message}`);
    control(text("Gradient label").length === 1 && text("Gradient label")[0].rendered && text("Gradient label")[0].ratio < 4.5, "a failing nested label on a gradient is not detected");
    control(text("Solid label").length === 1 && !text("Solid label")[0].rendered && text("Solid label")[0].ratio < 4.5, "a failing nested label on a solid ground is not detected");
    const rest = sampled.find((r) => r.text === "Hover worse");
    control(rest?.ratio >= 4.5 && ["hover", "focus", "active"].every((name) => state("Hover worse", name)?.ratio < 4.5), "a state that worsens while the rest state passes is not detected");
    control(text("Passing nested").length === 1 && Math.abs(text("Passing nested")[0].ratio - 18.88) <= 0.05, `passing nested text is mismeasured: ${text("Passing nested")[0]?.ratio}`);
    control(text("Same colour and ground").length === 0 && sampled.filter((r) => r.text === "Same colour and ground").length === 1, "one text occurrence is measured twice");
    control(["hover", "focus", "active"].every((name) => state("Framed", name)?.ratio >= 20 && !state("Framed", name).skipped) && !texts.some((r) => r.text.includes("for the fixture")), "a border, outline or screen-reader-only text is read as text contrast, or skipped instead of excluded");
    const disabled = sampled.find((r) => r.text === "Disabled control");
    control(disabled?.disabled === true && disabled.ratio < 4.5 && !states.some((r) => r.key.startsWith("button|Disabled")), "an inactive control is not classified as inactive");
  });
  // Masking and pairing controls (r10): the per-run comparison, on two fixture builds with known differences.
  // Masking: a link holds a failing badge and a label; on the candidate, a label that passed on the baseline
  // fails on hover, focus and press (fresh), and a label that already failed falls further (worse). Pairing:
  // three identical cards; only the second worsens, so every changed result must be the second card's. Run
  // pairing: one link holds two identical runs; only the second worsens, so every changed run must be it.
  const BUILD = (label1, label2, card2, twin2, edge, note1, note2) => `<!doctype html><style>
    body { margin: 0; background: #ffffff; color: #000000; font: 16px/1.5 sans-serif; }
    main { display: grid; gap: 24px; padding: 60vh 24px; justify-items: start; }
    .bar { position: fixed; top: 0; left: 0; right: 0; height: 30vh; background: #ffffff; }
    .dots { position: fixed; top: 50%; transform: translateY(-50%); left: 280px; width: 20px; height: 60px; background: #000000; }
    .beside { margin-left: 240px; } .beside:hover .label, .beside:focus-visible .label, .beside:active .label { color: ${edge}; }
    .tall, .under { display: block; } .tall .gap { display: block; height: 130vh; } .under .gap { display: block; height: 70vh; }
    .tall:hover .label, .tall:focus-visible .label, .tall:active .label, .under:hover .label, .under:focus-visible .label, .under:active .label,
    .wrap:hover .label, .wrap:focus-visible .label, .wrap:active .label { color: ${edge}; }
    .wrapper { width: 220px; margin: 0; } .wrapper a.wrap { display: inline; padding: 0; }
    .note-1 .note { color: ${note1}; } .note-2 .note { color: ${note2}; } .note-3 .note { color: #000000; }
    a { display: inline-block; padding: 8px 12px; color: #000000; background: #ffffff; text-decoration: none; }
    .badge { color: #999999; background: #aaaaaa; padding: 0 4px; }
    .one:hover .label, .one:focus-visible .label, .one:active .label { color: ${label1}; }
    .two:hover .label, .two:focus-visible .label, .two:active .label { color: ${label2}; }
    .card { color: #959595; } .card-2 .card { color: ${card2}; } .card-3 .card { color: #000000; }
    .twin { color: #000000; } .twin .go + .go { color: ${twin2}; }
  </style><main>
    <a href="#one" class="one"><span class="badge">Done</span> <span class="label">Read more →</span></a>
    <a href="#two" class="two"><span class="badge">Done</span> <span class="label">Read on →</span></a>
    <a href="#c1" class="card-1"><span class="card">Read →</span></a>
    <a href="#c2" class="card-2"><span class="card">Read →</span></a>
    <a href="#c3" class="card-3"><span class="card">Read →</span></a>
    <a href="#tw" class="twin"><span class="go">Go</span> <span class="go">Go</span></a>
  </main><main>
    <a href="#tall" class="tall"><span class="label">Above →</span><span class="gap"></span><span class="label">Below →</span></a>
    <a href="#under" class="under"><span class="label">Under bar →</span><span class="gap"></span><span class="label">Clear →</span></a>
    <a href="#beside" class="beside"><span class="label">Beside the dots →</span></a>
    <a href="#n1" class="note-1"><span class="note">Note</span></a>
    <a href="#n2" class="note-2"><span class="note">Note</span></a>
    <a href="#n3" class="note-3"><span class="note">Note</span></a>
    <p class="wrapper">Before it comes <a href="#wrap" class="wrap"><span class="label">the wrapped link label</span></a> ends here.</p>
  </main><div class="bar"></div><div class="dots"></div>`;
  const fixtureBuild = async (html) => {
    const sink = newSink();
    await withPage({ theme: "dark" }, async (page) => {
      await page.setContent(html);
      for (const r of await contrastOf(page, "body *", { painted: true })) record("text", "fixture", "/", r.text, r, { sink });
      for (const r of await interactions(page)) record("interact", "fixture", "/", `${r.key}:${r.state}`, r, { sink });
    });
    return sink;
  };
  const before = await fixtureBuild(BUILD("#767676", "#787878", "#777777", "#777777", "#767676", "#000000", "#787878"));
  const after = await fixtureBuild(BUILD("#7b7b7b", "#808080", "#888888", "#888888", "#7b7b7b", "#010101", "#808080"));
  const diff = compareRuns(before.regressions.map((r) => ({ id: r.id, baseline: r.value })), after.measured);
  const ofLabel = (list, text) => list.filter((id) => id.startsWith("interact|") && id.endsWith(`"${text}"`));
  const control = (ok, message) => invariant(ok, `measurement control: ${message}`);
  control(ofLabel(diff.fresh, "Read more →").length === 3 && ofLabel(diff.worse, "Read on →").length === 3,
    `a worsened label beside a failing badge is masked: fresh ${diff.fresh.length}, worse ${diff.worse.length}`);
  const changed = [...diff.fresh, ...diff.worse].filter((id) => id.includes("Read →"));
  control(before.duplicates.length === 0 && after.duplicates.length === 0 && diff.missing.length === 0 && changed.length >= 2 &&
    changed.every((id) => id.includes("Read →#2")),
    `repeated cards are not paired with themselves: ${changed.join("; ") || "nothing changed"}; duplicates ${before.duplicates.length + after.duplicates.length}`);
  const twins = diff.worse.filter((id) => id.startsWith("interact|") && id.includes("|a|Go Go#1:"));
  control(before.duplicates.length === 0 && after.duplicates.length === 0 && twins.length === 3 && twins.every((id) => id.endsWith('span.go>"Go"#2')),
    `repeated runs in one control are not paired with themselves: ${twins.join("; ") || "nothing changed"}`);
  // Covered, off-screen and wrapped runs (r10): a run off screen or under a fixed bar when its card is centred,
  // a run under a fixed box at the middle of the viewport (like the section dots), and a link that wraps inside
  // a paragraph, are each measured on their own, never hiding the card's other runs; every worsened label is
  // reported fresh in every state, and nothing is left unmeasured.
  const edgeLabels = ["Above →", "Below →", "Under bar →", "Clear →", "Beside the dots →", "the wrapped link label"];
  const edgeUnmeasured = [...before.unmeasured, ...after.unmeasured].map(({ id, reason }) => `${id} (${reason})`);
  control(edgeLabels.every((text) => ofLabel(diff.fresh, text).length === 3) && edgeUnmeasured.length === 0,
    `a covered, off-screen or wrapped run is not measured on its own: ${edgeLabels.map((text) => `${text} ${ofLabel(diff.fresh, text).length}`).join(", ")}; unmeasured ${edgeUnmeasured.join("; ") || "none"}`);
  // Element pairing across a colour-dependent skip (r10): the first of three identical notes has its link's
  // colour and ground on the baseline only, so the text pass skips it there; the second already fails and
  // worsens. Elements are numbered before that skip, so the worsening must be the second note's alone.
  const notes = [...diff.fresh, ...diff.worse].filter((id) => id.startsWith("text|") && id.includes("span.note|Note"));
  control(notes.length === 1 && diff.worse.includes('text|fixture|/|span.note|Note#2|"Note"'),
    `elements are not paired across a colour-dependent skip: ${notes.join("; ") || "nothing changed"}`);
  // Re-entry (r10): a card taller than the viewport, measured on rendered pixels. Without a way to re-enter its
  // state (a hover pair), both off-screen runs stay unmeasured, each with its reason; at rest they are retried
  // and measured.
  await withPage({ theme: "dark" }, async (page) => {
    await page.setContent(BUILD("#767676", "#787878", "#777777", "#777777", "#767676", "#000000", "#787878"));
    const [without] = await contrastOf(page, ".tall", { all: false, rendered: true, enter: null });
    const [rest] = await contrastOf(page, ".tall", { all: false, rendered: true });
    control(without?.ratio === null && without.skipped?.length === 2 && !without.runs?.length && rest?.runs?.length === 2 && !rest.skipped,
      `re-entry is not honoured: without ${without?.runs?.length ?? 0} measured, ${without?.skipped?.length ?? 0} skipped; at rest ${rest?.runs?.length ?? 0} measured, ${rest?.skipped?.length ?? 0} skipped`);
  });
  await withPage({ theme: "dark" }, async (page) => {
    for (const file of ["Archivo-Variable-Latin", "ArchivoNarrow-Latin-600", "IBMPlexMono-Regular"]) {
      const response = await page.request.get(`${base}/fonts/darkfield/${file}.woff2`);
      invariant(response.status() === 200, `${file}.woff2 not served (${response.status()})`);
    }
    const fonts = await page.evaluate(async () => ({
      body: getComputedStyle(document.body).fontFamily,
      archivo: (await document.fonts.load('15px "Archivo"')).length,
      plexMono: (await document.fonts.load('13px "IBM Plex Mono"')).length,
    }));
    invariant(/^"?Archivo"?,/.test(fonts.body), `body is set in ${fonts.body}`);
    invariant(fonts.archivo > 0 && fonts.plexMono > 0, "Darkfield faces did not load");
  });
  // Font holds (Task 4 fix): the three held declarations that read --terminal-font keep the stack their
  // direct load renders, however the route is reached. Simulations.css and Projects.css define
  // --terminal-font on :root once their chunk loads, so client-side arrivals must not pick it up.
  {
    const HELD_FONTS = [
      { route: "/simulations", selector: ".spider-preview-card-face", stack: '"Courier New", Monaco, Menlo, monospace' },
      { route: "/simulations/spider", selector: ".spider-solitaire", stack: '"Courier New", Monaco, monospace' },
      { route: "/simulations/rhythm-lab", selector: ".rhythm-lab", stack: '"Courier New", Monaco, monospace' },
    ];
    const click = async (page, href) => {
      await page.locator(`a[href="${href}"]:visible`).first().click();
      await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === href);
      await page.waitForLoadState("networkidle");
    };
    const FONT_PATHS = [
      { name: "direct", start: (route) => route },
      { name: "/simulations, card", start: () => "/simulations", go: (page, route) => click(page, route) },
      { name: "/projects, /simulations, card", start: () => "/projects", go: async (page, route) => { await click(page, "/simulations"); await click(page, route); } },
    ];
    for (const { route, selector, stack } of HELD_FONTS) {
      for (const path of FONT_PATHS) {
        if (route === "/simulations" && path.go) continue;
        await withPage({ theme: "dark", route: path.start(route) }, async (page) => {
          if (path.go) await path.go(page, route);
          await page.locator(selector).first().waitFor();
          const family = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).fontFamily, selector);
          invariant(family === stack, `${selector} via ${path.name} is set in ${family}, not its held stack ${stack}`);
        });
      }
    }
  }
  // Focus ring (Task 6): every keyboard-focused control shows the focus-ring token's spread shadow, and
  // forced-colors mode keeps a painted outline (it discards box-shadow). Focus that enters an <iframe>
  // belongs to the artwork's own document and is not asserted here.
  {
    const RING = { dark: "rgb(108, 255, 149)", light: "rgb(4, 110, 48)", mono: "rgb(255, 255, 255)" };
    const FOCUS_ROUTES = ["/", "/projects", "/terminal", "/simulations/rhythm-lab", "/simulations/orbital-simulator", "/procedural-animations"];
    const focusStates = async (page, presses = 25) => {
      const states = [];
      for (let i = 0; i < presses; i += 1) {
        await page.keyboard.press("Tab");
        const state = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el.tagName === "IFRAME") return null;
          const c = getComputedStyle(el);
          return { label: `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}`, boxShadow: c.boxShadow, outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth };
        });
        if (state) states.push(state);
      }
      return states;
    };
    for (const theme of THEMES) {
      for (const route of FOCUS_ROUTES) {
        await withPage({ theme, route }, async (page) => {
          for (const state of await focusStates(page)) {
            invariant(state.boxShadow.includes(`${RING[theme]} 0px 0px 0px 4px`), `${theme} ${route}: ${state.label} lacks focus-ring (${state.boxShadow})`);
          }
        });
      }
    }
    // Focus appears instantly (§13): with motion allowed, the ring is complete as soon as focus lands,
    // not part-way through a transition. Read right after the key press, before any transition could finish.
    for (const route of FOCUS_ROUTES) {
      await withPage({ theme: "dark", route, reducedMotion: "no-preference" }, async (page) => {
        for (let i = 0; i < 25; i += 1) {
          await page.keyboard.press("Tab");
          const state = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body || el.tagName === "IFRAME") return null;
            return { label: `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}`, boxShadow: getComputedStyle(el).boxShadow };
          });
          if (state) invariant(state.boxShadow.includes(`${RING.dark} 0px 0px 0px 4px`), `instant focus ${route}: ${state.label} ring is not complete on arrival (${state.boxShadow})`);
        }
      });
    }
    await withPage({ theme: "dark", route: "/", forcedColors: "active" }, async (page) => {
      for (const state of await focusStates(page, 10)) {
        invariant(state.outlineStyle === "solid" && state.outlineWidth === "2px", `forced colors: ${state.label} outline ${state.outlineStyle} ${state.outlineWidth}`);
      }
    });
  }
  // Phase 2 Task 1 (D3 ruling): Layout routes have no rain canvas, and the static ground runs no animation.
  // /simulations/rhythm-lab is immersive (outside Layout) and keeps its own rain (P2-3), so it is not listed.
  for (const theme of THEMES) {
    for (const route of ["/", "/projects", "/writing"]) {
      await withPage({ theme, route }, async (page) => {
        const state = await page.evaluate(() => ({
          rain: document.querySelectorAll("canvas.matrix-rain-3d-background, canvas.matrix-background, canvas.bionic-canvas").length,
          ground: document.querySelectorAll(".static-background").length,
          moving: document.getAnimations().filter((a) => a.effect?.target?.closest?.(".static-background")).length,
        }));
        invariant(state.rain === 0 && state.ground === 1 && state.moving === 0, `${theme} ${route}: atmosphere ${JSON.stringify(state)}`);
      });
    }
  }
  // Phase 2 Task 6 (§13 Hover): static content does not respond to the pointer.
  const STATIC_HOVER = { "/case-studies/aether": ["article.interactive-card", ".tech-tag"], "/experience": [".work-details-container", ".work-dates", ".tech-tag"] };
  for (const theme of THEMES) {
    for (const [route, selectors] of Object.entries(STATIC_HOVER)) {
      await withPage({ theme, route }, async (page) => {
        for (const selector of selectors) {
          const el = page.locator(selector).first();
          if (!(await el.count())) { invariant(false, `${theme} ${route}: ${selector} not rendered`); continue; }
          await el.scrollIntoViewIfNeeded();
          const look = () => el.evaluate((e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderColor, c.color, c.transform, c.boxShadow].join("|"); });
          await page.mouse.move(0, 0);
          await frames(page);
          const rest = await look();
          await el.hover();
          await frames(page);
          invariant((await look()) === rest, `${theme} ${route}: static ${selector} responds to hover`);
        }
      });
    }
  }
  // Dock navigation (Settings → Navigation Style → Dock), as a returning visitor's stored choice.
  const dockMode = async (page) => {
    await page.evaluate(() => localStorage.setItem("web-nav-mode", "dock"));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".dock-container").waitFor();
  };
  // Phase 3 (§13): every listed control is a df-control and renders Idle, Hover, Pressed and its hold.
  // Tasks 9–13 and 15 add entries; prepare(page) brings controls on screen (Settings open, dock mode). Token colours are read from the page.
  const P3_CONTROLS = [
    { route: "/", selectors: [".btn", ".hero-text-link", "a.featured-project-link", ".contact-strip-link", ".exploration-pill"] },
    { route: "/projects", selectors: [".stat-card", ".terminal-dropdown-trigger", ".project-roster__toggle", ".project-roster__action"] },
    // The coverage dialog's Close, with the dialog open (a press released over the backdrop must not close it).
    { route: "/projects", selectors: [".close-tech-stack"], prepare: (page) => page.getByTitle("View technical coverage").click() },
    { route: "/darkfield-404-probe", selectors: [".home-link"] },
    // Task 11: the header at its wide and mid widths, and the dock. The header steps between layouts with the width
    // (wide, mid, phone, menu), so the controls on screen change: relayout compares label alignment only for the controls
    // shown at both widths. The dock exists only from 430px, so its narrow check runs at 500px, where it is the phone dock.
    { route: "/", selectors: [".site-header__link", ".site-header__settings-button"], relayout: true },
    { route: "/", width: 768, selectors: [".site-header__disclosure-toggle"], relayout: true },
    { route: "/projects", prepare: dockMode, selectors: [".dock-nav-link", ".dock-settings-button"], narrow: 500, relayout: true },
    { route: "/projects", prepare: dockMode, width: 500, selectors: [".dock-explore__toggle"], narrow: 500, relayout: true },
    // Task 12: Settings, open. Without reduced motion, so the Background animation switch is operable (its Disabled
    // state under reduced motion is checked below). At 375px Navigation Style is gone (no dock), so relayout compares the
    // controls shown at both widths. The dock tuning disclosure exists only in dock mode, from 430px.
    // Transitions are switched off once the panel is open, so each state is read at its end, not mid-way.
    { route: "/", prepare: async (page) => { await openSettings(page); await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" }); },
      reducedMotion: "no-preference", relayout: true,
      selectors: [".settings-close", ".settings-action", ".settings-segmented__button", ".setting-switch"] },
    { route: "/", prepare: async (page) => { await dockMode(page); await openSettings(page); }, selectors: [".settings-disclosure__toggle"], narrow: 500, relayout: true },
    // The section rail is not rendered at phone widths (wideOnly: checked absent there instead).
    { route: "/case-studies/aether", selectors: [".nav-dot"], wideOnly: true },
    // Reading and record surfaces: linked cards, local navigation, disclosure controls and the deliberate Journey flip.
    { route: "/case-studies", selectors: [".case-study-card"] },
    { route: "/case-studies/aether", selectors: [".case-study-breadcrumbs a", ".case-study-link:not(.disabled)", ".case-study-artifact-link"] },
    { route: "/case-studies/where-the-specification-lived", selectors: [".case-study-prompt summary"] },
    { route: "/writing", selectors: [".writing-card"] },
    { route: "/writing/the-machine-should-explain-itself", relayout: true,
      selectors: [".article-breadcrumbs a", ".article-toc summary", ".article-toc a", ".article-provenance-section > summary", ".article-series-link"] },
    { route: "/experience", selectors: [".work-contact-link"] },
    { route: "/journey", selectors: [".timeline-flip-toggle"] },
    { route: "/procedural-animations", selectors: [".procedural-animations-card"] },
    // Task 15: the two controls on Phase 5 surfaces rest directly on the Layout field.
    { route: "/simulations/spider", selectors: [".spider-button"] },
    { route: "/terminal", selectors: [".terminal-sidecar"],
      prepare: (page) => page.getByRole("button", { name: "Minimize terminal" }).click() },
    // The error-boundary actions: the Journey route chunk fails to load after a client-side navigation, so its lazy
    // import rejects and the Layout error boundary renders in place of the route.
    { route: "/darkfield-404-probe", selectors: [".error-button"], prepare: async (page) => {
      await page.route("**/assets/Journey-*.js", (r) => r.abort());
      await page.evaluate(() => { history.pushState({}, "", "/journey"); dispatchEvent(new PopStateEvent("popstate")); });
      await page.locator(".error-button").first().waitFor();
    } },
  ];
  const tokenRgb = (page, name) => page.evaluate((n) => { const p = document.createElement("i"); p.style.color = `var(${n})`;
    document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, name);
  // A card's marker is drawn by its title (its one heading), not by the card itself.
  const look = (el) => el.evaluate((e) => { const c = getComputedStyle(e); const title = e.matches(".df-control--card") ? e.querySelector("h1, h2, h3, h4, h5, h6") : null;
    return { b: c.borderTopColor, bg: c.backgroundColor,
    fg: c.color, r: c.borderTopLeftRadius, marker: getComputedStyle(title ?? e, "::before").content, card: e.matches(".df-control--card"),
    light: e.matches(".df-control--light"),
    sel: e.matches('[aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch)'),
    on: e.matches('.df-control--latch:is([aria-pressed="true"], [aria-checked="true"], [aria-expanded="true"]), details[open] > .df-control--latch'),
    off: e.matches(':disabled, [aria-disabled="true"], .df-control--unavailable') }; });
  // Where the label starts, and where the ::before marker's box ends. A pseudo-element has no rect: an absolute marker
  // is located from its offsets; an in-flow marker ends where an empty probe placed right after it begins, less the
  // marker's trailing margin and, in a flex row, the gap the probe adds (taken relative to the control, which may
  // re-centre when the probe widens it). A card's label is its title, which draws the card's marker.
  const geometry = (el) => el.evaluate((card) => {
    const e = card.matches(".df-control--card") ? card.querySelector("h1, h2, h3, h4, h5, h6") : card;
    const range = document.createRange(); range.selectNodeContents(e);
    const label = range.getBoundingClientRect();
    const before = getComputedStyle(e, "::before");
    let marker;
    if (before.position === "absolute" || before.position === "fixed") {
      marker = e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).borderLeftWidth) + parseFloat(before.left) + parseFloat(before.width);
    } else {
      const own = getComputedStyle(e);
      const gap = /flex|grid/.test(own.display) ? parseFloat(own.columnGap) || 0 : 0;
      const start = e.getBoundingClientRect().left;
      const probe = document.createElement("span"); e.prepend(probe);
      marker = start + probe.getBoundingClientRect().left - e.getBoundingClientRect().left - gap - parseFloat(before.marginRight);
      probe.remove();
    }
    return { left: label.left, top: label.top, marker };
  });
  const pressed = (el) => el.evaluate((e) => e.hasAttribute("data-df-pressed"));
  // Hover at the current viewport: the label does not move, and the › marker ends where the label begins (§13 Hover).
  const hoverGeometry = async (page, el, where) => {
    await el.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await frames(page);
    const rest = await geometry(el);
    await el.hover(); await frames(page);
    const hover = await geometry(el);
    invariant(Math.abs(hover.left - rest.left) <= 0.5 && Math.abs(hover.top - rest.top) <= 0.5,
      `${where}: label moves on hover (${rest.left},${rest.top} -> ${hover.left},${hover.top})`);
    invariant(Math.abs(hover.marker - hover.left) <= 0.5, `${where}: hover marker ends at ${hover.marker}, label starts at ${hover.left}`);
  };
  for (const theme of THEMES) {
    for (const { route, prepare, selectors, width = VIEW_W, narrow = 375, relayout = false, reducedMotion = "reduce", wideOnly = false } of P3_CONTROLS) {
      await withPage({ theme, route, reducedMotion }, async (page) => {
        if (width !== VIEW_W) { await page.setViewportSize({ width, height: VIEW_H }); await frames(page); }
        if (prepare) await prepare(page);
        let narrowChecked = 0;
        // A resize re-lays the header and dock after the site's debounced window-size update (the header can change layout,
        // which moves the page below it); wait it out before measuring.
        const resized = async () => { await frames(page); await page.waitForTimeout(250); await frames(page); };
        const t = {}; for (const n of ["--edge", "--fg-muted", "--fg", "--signal", "--on-signal"]) t[n] = await tokenRgb(page, n);
        const instant = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-instant")));
        for (const selector of selectors) {
          const all = page.locator(selector);
          invariant((await all.count()) > 0, `${theme} ${route}: ${selector} not rendered`);
          for (let i = 0; i < (await all.count()); i++) {
            const el = all.nth(i);
            if (!(await el.isVisible())) continue;
            invariant(await el.evaluate((e) => e.matches(".df-control")), `${theme} ${route}: ${selector}#${i} is not a df-control`);
            if (i > 0) continue; // states on the first visible instance
            await el.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await frames(page);
            const rest = await look(el);
            invariant(rest.r === "0px", `${theme} ${route}: ${selector} radius ${rest.r}`);
            if (rest.off) continue;
            // A latch that is on shows its label in fg with the lamp lit (§13 Latched); every other idle label is fg-muted.
            if (!rest.sel && !rest.card) invariant(rest.fg === t[rest.on ? "--fg" : "--fg-muted"], `${theme} ${route}: ${selector} idle label ${rest.fg}`);
            if (!rest.sel && !rest.light) invariant(rest.b === t["--edge"], `${theme} ${route}: ${selector} idle boundary ${rest.b}`);
            await el.hover(); await frames(page);
            const hover = await look(el);
            invariant(hover.marker.startsWith('"›"'), `${theme} ${route}: ${selector} hover marker ${hover.marker}`);
            if (!rest.sel) {
              invariant(hover.bg !== rest.bg, `${theme} ${route}: ${selector} hover has no ground step`);
              invariant(hover.fg === t["--fg"], `${theme} ${route}: ${selector} hover label ${hover.fg}`);
              if (!rest.light) invariant(hover.b === t["--fg-muted"], `${theme} ${route}: ${selector} hover boundary ${hover.b}`);
            }
            await hoverGeometry(page, el, `${theme} ${route} ${width}px: ${selector}`);
            await page.mouse.move(0, 0); await el.hover(); await frames(page);
            // Released off the control: no activation (§13 Activation). A click, or the reload a click causes, fails.
            const origin = await page.evaluate(() => performance.timeOrigin);
            await el.evaluate((e) => { window.dfClicks = 0; e.addEventListener("click", () => { window.dfClicks += 1; }, { capture: true }); });
            await page.mouse.down(); await frames(page);
            const down = await look(el);
            invariant(down.bg === t["--signal"] && down.fg === t["--on-signal"], `${theme} ${route}: ${selector} pressed ${down.bg} ${down.fg}`);
            await page.mouse.move(0, 0); await page.mouse.up();
            await page.waitForTimeout(instant * 2);
            const after = await page.evaluate(() => [performance.timeOrigin, window.dfClicks]);
            invariant(after[0] === origin && after[1] === 0, `${theme} ${route}: ${selector} activated on a release off the control ${after}`);
            // Hold: contact and release in one task, sampled before any timer can run (synthetic events never click).
            const hold = await el.evaluate((e) => { e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
              e.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
              return [e.hasAttribute("data-df-pressed"), getComputedStyle(e).backgroundColor]; });
            invariant(hold[0] && hold[1] === t["--signal"], `${theme} ${route}: ${selector} inverse not held after a quick release ${hold}`);
            await page.waitForTimeout(instant * 2);
            invariant(!(await pressed(el)), `${theme} ${route}: ${selector} inverse never released`);
            await el.evaluate((e) => e.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
            invariant(await pressed(el), `${theme} ${route}: ${selector} no key-down acknowledgement`);
            // Another key's release does not end a held Enter.
            await el.evaluate((e) => e.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true })));
            await page.waitForTimeout(instant * 2);
            invariant(await pressed(el), `${theme} ${route}: ${selector} inverse ended by another key's release while Enter is held`);
            await el.evaluate((e) => e.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true })));
            await page.waitForTimeout(instant * 2);
            invariant(!(await pressed(el)), `${theme} ${route}: ${selector} inverse not released after Enter key-up`);
            // A new contact within dur-instant of a quick release keeps the inverse while it is held.
            await el.evaluate((e) => { e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
              e.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
            await page.waitForTimeout(instant * 2);
            invariant(await pressed(el), `${theme} ${route}: ${selector} re-press within dur-instant lost the inverse while held`);
            await el.evaluate((e) => e.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })));
            await page.waitForTimeout(instant * 2);
            invariant(!(await pressed(el)), `${theme} ${route}: ${selector} inverse not released after the re-press`);
            if (wideOnly) continue;
            // The marker geometry again at a phone width, where layouts stretch and centre controls.
            await page.setViewportSize({ width: narrow, height: 812 }); await resized();
            // Target size at a phone width: every non-card control is at least three cells tall.
            const small = await page.evaluate((sel) => { const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h"));
              return [...document.querySelectorAll(sel)].filter((e) => e.matches(".df-control:not(.df-control--card)") && e.getClientRects().length)
                .map((e) => [e.className, e.getBoundingClientRect().height, 3 * cell]).filter((x) => x[1] < x[2] - 0.5); }, selector);
            invariant(small.length === 0, `${theme} ${route} ${narrow}px: ${selector} below 3 cells tall ${JSON.stringify(small)}`);
            // With relayout the base width's control may be re-rendered or hidden at the phone width (a header layout
            // change): the first one shown there is checked instead.
            const there = relayout ? page.locator(selector).locator("visible=true").first() : el;
            if (!relayout || (await there.count())) { await hoverGeometry(page, there, `${theme} ${route} ${narrow}px: ${selector}`); narrowChecked += 1; }
            await page.setViewportSize({ width, height: VIEW_H }); await resized();
          }
        }
        if (wideOnly) {
          // Not rendered at a phone width, so it holds no touch target there.
          await page.setViewportSize({ width: narrow, height: 812 }); await resized();
          const shown = await page.evaluate((sels) => [...document.querySelectorAll(sels.join(","))].filter((e) => e.getClientRects().length).length, selectors);
          invariant(shown === 0, `${theme} ${route} ${narrow}px: ${shown} wide-only controls rendered`);
          return;
        }
        // Label alignment at a phone width equals the base alignment: centred where the parent centred it, start otherwise.
        invariant(narrowChecked > 0, `${theme} ${route}: no control was checked at ${narrow}px`);
        // Each control is tagged at the base width; with relayout, where a layout change re-renders the controls, each is
        // known by its class and name instead, and only controls shown at both widths are compared.
        const alignOf = (tag) => page.evaluate(([sels, tag, relayout]) => [...document.querySelectorAll(sels.join(","))].filter((e) => e.matches(".df-control:not(.df-control--card)") && e.getClientRects().length).flatMap((e, i) => {
          if (relayout) e.setAttribute("data-df-align", `${e.className}|${e.getAttribute("aria-label") ?? e.textContent.trim()}`);
          else if (tag) e.setAttribute("data-df-align", String(i));
          const r = document.createRange(); r.selectNodeContents(e); const l = r.getBoundingClientRect(); const b = e.getBoundingClientRect(); const c = getComputedStyle(e);
          const left = l.left - (b.left + parseFloat(c.borderLeftWidth) + parseFloat(c.paddingLeft));
          const right = b.right - parseFloat(c.borderRightWidth) - parseFloat(c.paddingRight) - l.right;
          return [[e.getAttribute("data-df-align") ?? "new", e.className, Math.abs(left - right) <= 1 ? "centred" : "start"]]; }), [selectors, tag, relayout]);
        let wide = await alignOf(true);
        await page.setViewportSize({ width: narrow, height: 812 }); await resized();
        let phone = await alignOf(false);
        await page.setViewportSize({ width, height: VIEW_H }); await resized();
        await page.evaluate(() => document.querySelectorAll("[data-df-align]").forEach((e) => e.removeAttribute("data-df-align")));
        if (relayout) {
          wide = wide.filter(([i]) => phone.some(([j]) => j === i));
          const order = (list) => list.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
          wide = order(wide); phone = order(phone.filter(([j]) => wide.some(([i]) => i === j)));
          invariant(wide.length > 0, `${theme} ${route}: no control is shown at both ${width}px and ${narrow}px`);
        }
        invariant(JSON.stringify(wide) === JSON.stringify(phone), `${theme} ${route}: label alignment differs at ${narrow}px ${JSON.stringify(wide)} vs ${JSON.stringify(phone)}`);
        if (route === "/darkfield-404-probe") invariant(wide.length > 0 && wide.every(([, , a]) => a === "centred"), `${theme} ${route}: 404 and error actions are not centred ${JSON.stringify(wide)}`);
      });
    }
  }

  // Task 15 (§13 Disabled): Deal stays in keyboard order with a visible, associated reason. Once the five stock deals
  // are exhausted, hover and activation do nothing. This state is not exercised by the generic first-control pass.
  for (const theme of THEMES) {
    await withPage({ theme, route: "/simulations/spider", reducedMotion: "reduce" }, async (page) => {
      const deal = page.getByRole("button", { name: "Deal", exact: true });
      for (let stock = 5; stock > 0; stock--) await deal.click();
      await page.setViewportSize({ width: 375, height: 812 }); await frames(page);
      await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
      const reason = page.locator("#spider-deal-reason");
      invariant(await deal.evaluate((e) => e === document.activeElement && e.getAttribute("aria-disabled") === "true" &&
        e.getAttribute("aria-describedby") === "spider-deal-reason"), `${theme} spider: disabled Deal is not focusable with its reason`);
      invariant(await reason.isVisible() && (await reason.textContent())?.trim() === "No stock cards remain",
        `${theme} spider: disabled Deal reason is not visible`);
      const fits = await deal.evaluate((e) => { const b = e.getBoundingClientRect(); const r = e.querySelector("#spider-deal-reason")?.getBoundingClientRect();
        return r && r.left >= b.left && r.right <= b.right && r.top >= b.top && r.bottom <= b.bottom &&
          document.documentElement.scrollWidth <= innerWidth; });
      invariant(fits, `${theme} spider 375px: disabled reason overflows its control or page`);
      await page.mouse.move(0, 0); await frames(page);
      const idle = await look(deal);
      await deal.hover(); await frames(page);
      const hovered = await look(deal);
      invariant(hovered.bg === idle.bg && hovered.fg === idle.fg && hovered.b === idle.b && !hovered.marker.includes("›"),
        `${theme} spider: disabled Deal responds to hover`);
      const stats = await page.locator(".spider-stats").textContent();
      await deal.click({ force: true });
      invariant((await page.locator(".spider-stats").textContent()) === stats, `${theme} spider: disabled Deal activated`);
    });
    await withPage({ theme, route: "/terminal" }, async (page) => {
      await page.getByRole("button", { name: "Minimize terminal" }).click();
      invariant(await page.getByRole("button", { name: "Terminal minimized — reopen", exact: true }).count() === 1,
        `${theme} terminal: sidecar accessible name does not include its visible label`);
    });
  }

  // Phase 3 Task 10 (§13): the dropdown's options. Selecting one closes the menu, so they are checked here rather than in
  // P3_CONTROLS: every option is a df-control; the chosen one is Selected; the keyboard cursor (aria-activedescendant)
  // and the pointer both show the Hover signature; contact shows the inverse; the coverage dialog wears the chamfer.
  for (const theme of THEMES) {
    await withPage({ theme, route: "/projects" }, async (page) => {
      const t = {}; for (const n of ["--edge", "--fg-muted", "--fg", "--signal", "--signal-deep", "--on-signal", "--surface-3"]) t[n] = await tokenRgb(page, n);
      const trigger = page.locator(".terminal-dropdown-trigger").first();
      await trigger.focus(); await page.keyboard.press("Enter");
      const options = page.locator(".terminal-dropdown-option");
      await options.first().waitFor();
      // The menu can be wider than its trigger. Its entire upper edge must still be closed,
      // with the shared line aligned to the trigger's lower edge.
      const frame = await page.locator(".terminal-dropdown-menu").evaluate((menu) => {
        const trigger = menu.parentElement.querySelector(".terminal-dropdown-trigger");
        const m = menu.getBoundingClientRect();
        const b = trigger.getBoundingClientRect();
        const s = getComputedStyle(menu);
        return { width: m.width, triggerWidth: b.width, top: m.top, triggerBottom: b.bottom,
          borderTop: parseFloat(s.borderTopWidth), borderColor: s.borderTopColor };
      });
      invariant(frame.width >= frame.triggerWidth && frame.borderTop > 0 &&
        Math.abs(frame.top - (frame.triggerBottom - frame.borderTop)) <= 1 &&
        frame.borderColor === t["--edge"], `${theme} /projects: dropdown frame ${JSON.stringify(frame)}`);
      const n = await options.count();
      invariant(n > 1, `${theme} /projects: dropdown shows ${n} options`);
      for (let i = 0; i < n; i++) invariant(await options.nth(i).evaluate((e) => e.matches(".df-control")), `${theme} /projects: option ${i} is not a df-control`);
      await page.mouse.move(0, 0); await frames(page);
      const sel = await options.first().evaluate((e) => e.getAttribute("aria-selected"));
      invariant(sel === "true", `${theme} /projects: the current option is not aria-selected (${sel})`);
      const selected = await look(options.first());
      const node = await options.first().evaluate((e) => getComputedStyle(e, "::after").backgroundColor);
      invariant(selected.bg === t["--signal-deep"] && selected.b === t["--signal"] && selected.fg === t["--signal"] && node === t["--signal"],
        `${theme} /projects: selected option ${JSON.stringify(selected)} node ${node}`);
      const other = options.nth(1);
      const rest = await look(other);
      invariant(rest.fg === t["--fg-muted"] && rest.b === t["--edge"] && !rest.marker.startsWith('"›"'), `${theme} /projects: idle option ${JSON.stringify(rest)}`);
      // Keyboard cursor: ArrowDown twice rests on the second option; the pointer is away.
      await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await frames(page);
      const cursor = await look(other);
      invariant(await other.evaluate((e) => e.hasAttribute("data-df-active")), `${theme} /projects: keyboard cursor not on option 1`);
      invariant(cursor.marker.startsWith('"›"') && cursor.bg === t["--surface-3"] && cursor.fg === t["--fg"] && cursor.b === t["--fg-muted"],
        `${theme} /projects: keyboard cursor option ${JSON.stringify(cursor)}`);
      const first = await look(options.first());
      invariant(!first.marker.startsWith('"›"'), `${theme} /projects: the cursor left option 0 but it keeps the marker`);
      await hoverGeometry(page, other, `${theme} /projects ${VIEW_W}px: .terminal-dropdown-option`);
      await other.hover(); await page.mouse.down(); await frames(page);
      const down = await look(other);
      invariant(down.bg === t["--signal"] && down.fg === t["--on-signal"], `${theme} /projects: option pressed ${down.bg} ${down.fg}`);
      await page.mouse.move(0, 0); await page.mouse.up(); await page.keyboard.press("Escape");
      // P3-2: the coverage dialog is the one chamfered panel, on surface-2 inside an edge boundary.
      await page.getByTitle("View technical coverage").click();
      // Fix wave (R2): the diagonal starts at the border-box corner, one boundary width outside the padding box, so its outer
      // edge lies on the cut like the straight edges' outer edges lie on the box.
      const dialog = await page.locator(".tech-stack-content").evaluate((e) => { const c = getComputedStyle(e); const b = getComputedStyle(e, "::before");
        return { clip: c.clipPath, bg: c.backgroundColor, border: c.borderTopColor, radius: c.borderTopLeftRadius, cut: b.backgroundColor, chamfered: document.querySelectorAll(".df-cut-md").length,
          corner: [parseFloat(b.top) + parseFloat(c.borderTopWidth), parseFloat(b.left) + parseFloat(c.borderLeftWidth)] }; });
      invariant(/polygon/.test(dialog.clip) && dialog.cut === t["--edge"] && dialog.border === t["--edge"] && dialog.radius === "0px" && dialog.chamfered === 1 &&
        dialog.corner[0] === 0 && dialog.corner[1] === 0, `${theme} /projects: coverage dialog ${JSON.stringify(dialog)}`);
    });
  }

  // Phase 3 Task 11 (§13, §08): navigation states. The current page's link is Selected (band, signal boundary or brackets,
  // node); latches light their lamp while their panel or Settings is open; the Explore panel and the dock tooltip are
  // overlays on surface-2 in edge, and panel links hover to surface-3. The disclosure still opens and closes from the
  // keyboard and returns focus to its toggle.
  for (const theme of THEMES) {
    const tokens = async (page) => { const t = {}; for (const n of ["--edge", "--fg-muted", "--fg", "--signal", "--signal-deep", "--surface-2", "--surface-3"]) t[n] = await tokenRgb(page, n); return t; };
    const lamp = (el) => el.evaluate((e) => { const a = getComputedStyle(e, "::after"); return { bg: a.backgroundColor, b: a.borderTopColor, w: a.width, h: a.height, fg: getComputedStyle(e).color }; });
    const selected = async (page, t, el, where, { marker = true } = {}) => {
      const look_ = await look(el);
      const node = await el.evaluate((e) => { const a = getComputedStyle(e, "::after"); return [a.backgroundColor, a.position, a.width === a.height]; });
      invariant(look_.sel && look_.bg === t["--signal-deep"] && look_.fg === t["--signal"] && (look_.light || look_.b === t["--signal"]) &&
        node[0] === t["--signal"] && node[1] === "absolute" && node[2], `${theme} ${where}: Selected ${JSON.stringify(look_)} node ${node}`);
      await el.hover(); await frames(page);
      const over = await look(el);
      invariant(over.marker.startsWith('"›"') === marker && over.bg === t["--signal-deep"], `${theme} ${where}: hover over Selected ${JSON.stringify(over)}`);
      await page.mouse.move(0, 0); await frames(page);
    };
    const latch = async (page, t, el, where, open) => {
      const off = await lamp(el);
      invariant(off.b === t["--edge"] && off.bg === "rgba(0, 0, 0, 0)", `${theme} ${where}: lamp off ${JSON.stringify(off)}`);
      await open(); await page.mouse.move(0, 0);
      // The press inverse holds for dur-instant after contact; the lamp is read once it has released.
      await page.waitForTimeout(2 * (await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-instant")))));
      const on = await lamp(el);
      invariant(on.bg === t["--signal"] && on.b === t["--signal"] && on.fg === t["--fg"], `${theme} ${where}: lamp on ${JSON.stringify(on)}`);
    };
    const overlay = async (page, t, panel, link, where) => {
      const p = await panel.evaluate((e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderTopColor, c.borderTopLeftRadius]; });
      invariant(p[0] === t["--surface-2"] && p[1] === t["--edge"] && p[2] === "0px", `${theme} ${where}: panel ${p}`);
      invariant(await link.evaluate((e) => e.matches(".df-control")), `${theme} ${where}: panel link is not a df-control`);
      await link.hover(); await frames(page);
      const over = await look(link);
      invariant(over.sel || (over.bg === t["--surface-3"] && over.fg === t["--fg"] && over.marker.startsWith('"›"')), `${theme} ${where}: panel link hover ${JSON.stringify(over)}`);
      await hoverGeometry(page, link, `${theme} ${where}: panel link`);
    };
    // Header, wide: the Projects link is Selected on /projects; Settings is a latch.
    await withPage({ theme, route: "/projects" }, async (page) => {
      const t = await tokens(page);
      await selected(page, t, page.locator('.site-header__link[aria-current="page"]').first(), "/projects header");
      const settings = page.locator(".site-header__settings-button");
      await latch(page, t, settings, "/projects header settings", () => settings.click());
      invariant(await settings.getAttribute("aria-pressed") === "true", `${theme} /projects: header settings not pressed while open`);
    });
    // Header, mid (768px): the Explore disclosure from the keyboard; its panel is an overlay.
    await withPage({ theme, route: "/" }, async (page) => {
      // Loaded at this width: a resize re-runs the header's layout steps, and a layout change closes an open panel.
      await page.setViewportSize({ width: 768, height: VIEW_H }); await page.reload({ waitUntil: "networkidle" });
      const t = await tokens(page);
      const toggle = page.locator(".site-header__explore .site-header__disclosure-toggle");
      await latch(page, t, toggle, "/ header explore", async () => { await toggle.focus(); await page.keyboard.press("Enter"); });
      invariant(await toggle.getAttribute("aria-expanded") === "true", `${theme} /: Explore did not open from the keyboard`);
      await overlay(page, t, page.locator(".site-header__explore .site-header__panel"), page.locator(".site-header__explore .site-header__panel .site-header__link").first(), "/ 768px Explore");
      await toggle.focus(); await page.keyboard.press("Escape"); await frames(page);
      invariant(await toggle.getAttribute("aria-expanded") === "false" && await toggle.evaluate((e) => document.activeElement === e),
        `${theme} /: Escape did not close Explore and return focus to its toggle`);
    });
    // Header, phone row (delegated ruling): at 375px and 390px the four core links stay on screen, not in the Menu panel,
    // in the small label with no › cell; they keep the target size, the hover ground step and the Selected signature.
    for (const width of [375, 390]) {
      await withPage({ theme, route: "/projects" }, async (page) => {
        // Loaded at this width: a resize re-runs the header's layout steps, and a layout change closes an open panel.
        await page.setViewportSize({ width, height: 812 }); await page.reload({ waitUntil: "networkidle" });
        const t = await tokens(page);
        const row = page.locator(".site-header__core .site-header__link");
        const shown = await row.evaluateAll((all) => all.filter((e) => e.checkVisibility() && !e.closest(".site-header__panel")).map((e) => e.textContent));
        invariant(JSON.stringify(shown) === JSON.stringify(["Projects", "Case Studies", "Writing", "Experience"]), `${theme} /projects ${width}px: core links on screen ${JSON.stringify(shown)}`);
        const cell = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h")));
        const short = await page.locator(".site-header a.df-control, .site-header button.df-control").evaluateAll((all, c) => all.filter((e) => e.checkVisibility())
          .map((e) => [e.className, e.getBoundingClientRect().height]).filter(([, h]) => h < 3 * c - 0.5), cell);
        invariant(short.length === 0, `${theme} /projects ${width}px: header controls below 3 cells tall ${JSON.stringify(short)}`);
        invariant(await row.first().evaluate((e) => e.matches(".df-label-sm")), `${theme} /projects ${width}px: the phone row is not in the small label`);
        await selected(page, t, row.first(), `/projects ${width}px phone row`, { marker: false });
        const other = row.nth(1);
        const rest = await look(other);
        await other.hover(); await frames(page);
        const over = await look(other);
        invariant(over.bg !== rest.bg && over.fg === t["--fg"] && !over.marker.startsWith('"›"'), `${theme} /projects ${width}px: phone row hover ${JSON.stringify(over)}`);
        await hoverGeometry(page, other, `${theme} /projects ${width}px: phone row`);
        await page.mouse.move(0, 0);
      });
    }
    // Header, Menu (320px, where the phone row no longer fits): the core links sit in the Menu panel, an overlay.
    await withPage({ theme, route: "/projects" }, async (page) => {
      await page.setViewportSize({ width: 320, height: 812 }); await page.reload({ waitUntil: "networkidle" });
      const t = await tokens(page);
      const toggle = page.locator(".site-header__menu .site-header__disclosure-toggle");
      const cell = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h")));
      for (const control of [toggle, page.locator(".site-header__settings-button")]) {
        const h = await control.evaluate((e) => e.getBoundingClientRect().height);
        invariant(h >= 3 * cell - 0.5, `${theme} /projects 320px: ${await control.evaluate((e) => e.className)} is ${h}px tall`);
      }
      await hoverGeometry(page, toggle, `${theme} /projects 320px: Menu`);
      await page.mouse.move(0, 0);
      await latch(page, t, toggle, "/projects 320px header menu", async () => { await toggle.focus(); await page.keyboard.press("Enter"); });
      const links = page.locator(".site-header__menu-panel .site-header__link");
      await selected(page, t, page.locator('.site-header__menu-panel .site-header__link[aria-current="page"]'), "/projects 320px menu");
      await overlay(page, t, page.locator(".site-header__menu-panel"), links.nth(1), "/projects 320px Menu");
      const short = await links.evaluateAll((all) => { const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h"));
        return all.map((e) => [e.textContent, e.getBoundingClientRect().height]).filter(([, h]) => h < 3 * cell - 0.5); });
      invariant(short.length === 0, `${theme} /projects 320px: Menu links below 3 cells tall ${JSON.stringify(short)}`);
      await toggle.focus(); await page.keyboard.press("Escape"); await frames(page);
      invariant(await toggle.getAttribute("aria-expanded") === "false", `${theme} /projects 320px: Escape did not close Menu`);
    });
    // Dock, desktop: the Projects icon is Selected; its name shows as a label on surface-2 in edge; Settings is a latch.
    await withPage({ theme, route: "/projects" }, async (page) => {
      await dockMode(page);
      const t = await tokens(page);
      const current = page.locator('.dock-nav-link[aria-current="page"]');
      invariant(await current.count() === 1, `${theme} /projects dock: ${await current.count()} current links`);
      await selected(page, t, current, "/projects dock");
      const home = page.locator(".dock-nav-link").first();
      await home.hover(); await frames(page);
      const tip = page.locator(".dock-tooltip");
      await tip.waitFor();
      const tl = await tip.evaluate((e) => { const c = getComputedStyle(e); return [e.matches(".df-label"), c.backgroundColor, c.borderTopColor, c.color, c.borderTopLeftRadius]; });
      invariant(tl[0] && tl[1] === t["--surface-2"] && tl[2] === t["--edge"] && tl[3] === t["--fg-muted"] && tl[4] === "0px", `${theme} /projects dock tooltip ${tl}`);
      await page.mouse.move(0, 0);
      const settings = page.locator(".dock-settings-button");
      await latch(page, t, settings, "/projects dock settings", () => settings.click());
      invariant(await settings.getAttribute("aria-pressed") === "true", `${theme} /projects: dock settings not pressed while open`);
    });
    // Dock, phone (500px): the Explore stack is a latch whose panel is an overlay.
    await withPage({ theme, route: "/projects" }, async (page) => {
      await page.setViewportSize({ width: 500, height: VIEW_H });
      await dockMode(page);
      const t = await tokens(page);
      const toggle = page.locator(".dock-explore__toggle");
      await latch(page, t, toggle, "/projects dock explore", async () => { await toggle.focus(); await page.keyboard.press("Enter"); });
      await overlay(page, t, page.locator(".dock-explore__panel"), page.locator(".dock-explore__link").first(), "/projects 500px dock Explore");
      await toggle.focus(); await page.keyboard.press("Escape"); await frames(page);
      invariant(await toggle.getAttribute("aria-expanded") === "false", `${theme} /projects dock: Escape did not close Explore`);
    });
  }

  // Fix wave (R3, §08 Layers and overlays): an open menu dims the page behind it with the scrim. For each of the four menus
  // (the header's Explore and Menu panels, the dock's Explore stack, the Projects dropdown), once open: a fixed layer whose
  // ground is the resolved --df-scrim covers the viewport, unblurred and unanimated; it is what a pointer meets over the
  // page, while the menu and its opener stay above it; a press on it closes the menu without navigating; reopened from
  // the keyboard, Escape closes it, returns focus to the opener and removes the scrim.
  const MENUS = [
    { name: "header Explore", route: "/", width: 768, opener: ".site-header__explore .site-header__disclosure-toggle", menu: ".site-header__explore .site-header__panel" },
    { name: "header Menu", route: "/projects", width: 320, opener: ".site-header__menu .site-header__disclosure-toggle", menu: ".site-header__menu-panel" },
    { name: "dock Explore", route: "/projects", width: 500, dock: true, opener: ".dock-explore__toggle", menu: ".dock-explore__panel" },
    { name: "Projects dropdown", route: "/projects", width: VIEW_W, opener: ".terminal-dropdown-trigger", menu: ".terminal-dropdown-menu" },
  ];
  const scrimState = (page, menu, opener) => page.evaluate(([menuSel, openerSel]) => {
    // The probe resolves the scrim token and measures the viewport a fixed layer at inset 0 covers (less any scrollbar gutter).
    const probe = document.createElement("i"); probe.style.cssText = "position: fixed; inset: 0; visibility: hidden; background-color: var(--df-scrim)";
    document.body.append(probe);
    const want = getComputedStyle(probe).backgroundColor; const view = probe.getBoundingClientRect(); probe.remove();
    const host = document.querySelector(".layout-foreground");
    const b = getComputedStyle(host, "::before");
    const above = (sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && e.contains(hit); };
    // A grid of points over the page, away from the navigation chrome, the menu and its opener.
    const chrome = `.site-header, .dock-container, .global-section-navigation, .global-scroll-progress, ${menuSel}, ${openerSel}`;
    const points = [];
    for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) {
      const [x, y] = [Math.round((innerWidth * i) / 8), Math.round((innerHeight * j) / 8)];
      const hit = document.elementFromPoint(x, y);
      if (hit && !hit.closest(chrome)) points.push({ x, y, scrim: hit === host, hit: `${hit.tagName.toLowerCase()}.${[...hit.classList].join(".")}` });
    }
    return { want, ground: b.backgroundColor, content: b.content, position: b.position, top: b.top, left: b.left, width: parseFloat(b.width),
      height: parseFloat(b.height), blur: b.backdropFilter, animation: b.animationName, vw: view.width, vh: view.height,
      menuAbove: above(menuSel), openerAbove: above(openerSel), points };
  }, [menu, opener]);
  for (const theme of THEMES) {
    for (const { name, route, width, dock, opener, menu } of MENUS) {
      await withPage({ theme, route }, async (page) => {
        // Loaded at this width: a resize re-runs the header's layout steps, and a layout change closes an open panel.
        await page.setViewportSize({ width, height: width <= 500 ? 812 : VIEW_H });
        if (dock) await dockMode(page); else await page.reload({ waitUntil: "networkidle" });
        const where = `${theme} ${route} ${width}px ${name}`;
        const toggle = page.locator(opener).first();
        await toggle.click(); await page.mouse.move(0, 0); await frames(page);
        invariant(await toggle.getAttribute("aria-expanded") === "true", `${where}: did not open`);
        const open = await scrimState(page, menu, opener);
        invariant(open.content !== "none" && open.position === "fixed" && open.ground === open.want && open.top === "0px" && open.left === "0px" &&
          Math.abs(open.width - open.vw) <= 1 && Math.abs(open.height - open.vh) <= 1 && open.blur === "none" && open.animation === "none",
          `${where}: scrim ${JSON.stringify({ ...open, points: undefined })}`);
        invariant(open.menuAbove && open.openerAbove, `${where}: menu above scrim ${open.menuAbove}, opener above scrim ${open.openerAbove}`);
        const covered = open.points.filter((p) => !p.scrim);
        invariant(open.points.length > 0 && covered.length === 0, `${where}: page points not under the scrim ${JSON.stringify(covered.slice(0, 4))} of ${open.points.length}`);
        // A press on the scrim closes the menu where it is, without acting on the page beneath.
        const url = page.url();
        const target = open.points.find((p) => p.scrim) ?? open.points[0];
        if (target) await page.mouse.click(target.x, target.y);
        await frames(page);
        const closed = await scrimState(page, menu, opener);
        invariant(await toggle.getAttribute("aria-expanded") === "false" && closed.content === "none" && page.url() === url,
          `${where}: a press on the scrim left ${await toggle.getAttribute("aria-expanded")} ${closed.content} ${page.url()}`);
        // From the keyboard: Escape closes, focus returns to the opener, the scrim goes.
        await toggle.focus(); await page.keyboard.press("Enter"); await frames(page);
        invariant(await toggle.getAttribute("aria-expanded") === "true" && (await scrimState(page, menu, opener)).content !== "none", `${where}: Enter did not open with the scrim`);
        await page.keyboard.press("Escape"); await frames(page);
        invariant(await toggle.getAttribute("aria-expanded") === "false" && await toggle.evaluate((e) => document.activeElement === e) &&
          (await scrimState(page, menu, opener)).content === "none", `${where}: Escape did not close, return focus and remove the scrim`);
      });
    }
  }

  // Phase 3 Task 12 (§13, §09): Settings and the section rail. A segmented group's pressed option is Selected (band,
  // signal boundary, node); the switch is a latch whose lamp shows On; sliders are direct manipulation (a filled square
  // handle in signal on an edge hairline rail, no fill) and step from the keyboard; controls disabled under reduced motion
  // stay focusable, show the Disabled signature and ignore activation; the dock tuning disclosure opens and closes from
  // the keyboard. The rail's cells are square and the current one Selected; the rail is an L1 rule at full opacity; the
  // cell's name shows as a tooltip on surface-2 in edge.
  for (const theme of THEMES) {
    const tokens = async (page) => { const t = {}; for (const n of ["--edge", "--rule", "--fg-muted", "--fg", "--fg-faint", "--signal", "--signal-deep", "--surface-2"]) t[n] = await tokenRgb(page, n); return t; };
    const settle = async (page) => page.waitForTimeout(2 * (await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-instant")))));
    const lamp = (el) => el.evaluate((e) => { const a = getComputedStyle(e, "::after"); return { bg: a.backgroundColor, b: a.borderTopColor }; });
    const selected = async (el, t, where) => {
      const l = await look(el);
      const node = await el.evaluate((e) => { const a = getComputedStyle(e, "::after"); return [a.backgroundColor, a.position, a.width === a.height]; });
      invariant(l.sel && l.bg === t["--signal-deep"] && l.fg === t["--signal"] && l.b === t["--signal"] && node[0] === t["--signal"] && node[1] === "absolute" && node[2],
        `${theme} ${where}: Selected ${JSON.stringify(l)} node ${node}`);
    };
    // The slider as drawn: pixels of the input's own box, classified by token colour. The handle is the box of signal
    // (or, disabled, fg-faint) pixels; the rail is the one row of edge pixels outside it; dashes are runs along that row.
    const slider = async (page, range, t) => {
      await range.evaluate((e) => e.blur()); await page.mouse.move(0, 0); await frames(page);
      const png = (await range.screenshot()).toString("base64");
      return page.evaluate(async ([b64, colours]) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const c = document.createElement("canvas"); [c.width, c.height] = [img.width, img.height];
        const g = c.getContext("2d"); g.drawImage(img, 0, 0);
        const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
        const rgb = Object.fromEntries(Object.entries(colours).map(([k, v]) => [k, v.match(/\d+/g).map(Number)]));
        const is = (i, k) => rgb[k].every((v, j) => Math.abs(data[i * 4 + j] - v) <= 3);
        const box = (k) => { let [x0, y0, x1, y1, n] = [width, height, -1, -1, 0];
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (is(y * width + x, k)) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
          return n ? { n, w: x1 - x0 + 1, h: y1 - y0 + 1, x0, x1, y0, y1 } : { n }; };
        const handle = box("handle");
        const rows = [];
        for (let y = 0; y < height; y++) {
          let [n, runs, prev] = [0, 0, false];
          for (let x = 0; x < width; x++) {
            if (handle.n && x >= handle.x0 - 1 && x <= handle.x1 + 1) { prev = false; continue; }
            const on = is(y * width + x, "edge"); if (on) n++; if (on && !prev) runs++; prev = on;
          }
          if (n > width / 8) rows.push({ y, n, runs });
        }
        return { handle, rows, signal: box("signal").n ?? 0, width };
      }, [png, { handle: t.handle, edge: t["--edge"], signal: t["--signal"] }]);
    };
    const cell = (page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h")));
    // Operable (no reduced motion): Selected options, the switch latch, the slider from the keyboard and as drawn.
    await withPage({ theme, route: "/", reducedMotion: "no-preference" }, async (page) => {
      await openSettings(page);
      const t = await tokens(page);
      const chosen = page.locator('.settings-segmented__button[aria-pressed="true"]');
      invariant(await chosen.count() >= 1, `${theme} settings: no pressed segmented option`);
      for (let i = 0; i < (await chosen.count()); i++) await selected(chosen.nth(i), t, `settings ${await chosen.nth(i).textContent()}`);
      await chosen.first().hover(); await frames(page);
      const over = await look(chosen.first());
      invariant(over.bg === t["--signal-deep"] && over.marker.startsWith('"›"'), `${theme} settings: hover over Selected ${JSON.stringify(over)}`);
      await page.mouse.move(0, 0);
      // The other theme option from the keyboard (Space), then back.
      if (theme !== "mono") {
        // Held by its label: a locator by aria-pressed would re-resolve to another option once this one is chosen.
        const label = (await page.locator('.settings-segmented__button[aria-pressed="false"]').first().textContent()).trim();
        const other = page.locator(`.settings-segmented__button:text-is("${label}")`);
        const name = label.toLowerCase();
        await other.focus(); await page.keyboard.press("Space"); await frames(page);
        invariant(await page.evaluate(() => document.documentElement.dataset.theme) === name && await other.getAttribute("aria-pressed") === "true",
          `${theme} settings: Space did not choose ${name}`);
        await page.locator(`.settings-segmented__button:text-is("${theme === "dark" ? "Dark" : "Light"}")`).click(); await page.mouse.move(0, 0); await settle(page);
      }
      const sw = page.locator(".setting-switch");
      invariant(await sw.getAttribute("aria-checked") === "true" && !(await sw.evaluate((e) => e.hasAttribute("disabled"))), `${theme} settings: switch not on`);
      let l = await lamp(sw);
      invariant(l.bg === t["--signal"] && l.b === t["--signal"] && (await sw.textContent()).trim() === "On", `${theme} settings: switch lamp on ${JSON.stringify(l)}`);
      await sw.focus(); await page.keyboard.press("Space"); await settle(page);
      l = await lamp(sw);
      invariant(await sw.getAttribute("aria-checked") === "false" && l.bg === "rgba(0, 0, 0, 0)" && l.b === t["--edge"] && (await sw.textContent()).trim() === "Off",
        `${theme} settings: switch off ${JSON.stringify(l)}`);
      // Speed is Disabled while the animation is off: focusable, the value holds.
      const speed = page.locator("#background-motion-speed");
      invariant(await speed.getAttribute("aria-disabled") === "true" && !(await speed.evaluate((e) => e.hasAttribute("disabled"))), `${theme} settings: speed not aria-disabled while paused`);
      await speed.focus(); await page.keyboard.press("ArrowRight");
      invariant(await speed.evaluate((e) => document.activeElement === e) && await speed.getAttribute("aria-valuetext") === "1.0 times", `${theme} settings: disabled speed moved or lost focus`);
      await sw.focus(); await page.keyboard.press("Space"); await settle(page);
      invariant(await sw.getAttribute("aria-checked") === "true", `${theme} settings: switch did not turn back on`);
      // Keyboard path (§13 Direct manipulation): arrows step, Home and End go to the limits.
      await speed.focus();
      for (const [key, want] of [["ArrowRight", "1.1 times"], ["End", "2.0 times"], ["ArrowLeft", "1.9 times"], ["Home", "0.5 times"]]) {
        await page.keyboard.press(key);
        invariant(await speed.getAttribute("aria-valuetext") === want, `${theme} settings: ${key} gave ${await speed.getAttribute("aria-valuetext")}, not ${want}`);
      }
      // Page Up and Page Down move by a larger step (WAI-ARIA Authoring Practices slider pattern), clamped at the limits.
      for (const [key, want] of [["PageUp", "1.5 times"], ["PageUp", "2.0 times"], ["PageDown", "1.0 times"], ["PageDown", "0.5 times"]]) {
        await page.keyboard.press(key);
        invariant(await speed.getAttribute("aria-valuetext") === want, `${theme} settings: ${key} gave ${await speed.getAttribute("aria-valuetext")}, not ${want}`);
      }
      for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
      const h = await cell(page);
      const drawn = await slider(page, speed, { ...t, handle: t["--signal"] });
      invariant(drawn.handle.n && Math.abs(drawn.handle.w - h) <= 1 && Math.abs(drawn.handle.h - h) <= 1 && drawn.handle.n >= 0.8 * h * h,
        `${theme} settings: slider handle ${JSON.stringify(drawn.handle)}`);
      invariant(drawn.signal === drawn.handle.n, `${theme} settings: signal outside the handle (a fill?) ${drawn.signal} vs ${drawn.handle.n}`);
      invariant(drawn.rows.length === 1 && drawn.rows[0].runs <= 2, `${theme} settings: slider rail ${JSON.stringify(drawn.rows)}`);
      invariant(drawn.rows.length === 1 && drawn.rows[0].y >= drawn.handle.y0 && drawn.rows[0].y <= drawn.handle.y1, `${theme} settings: rail not through the handle ${JSON.stringify(drawn)}`);
    });
    // Disabled under reduced motion (§13 Disabled): focusable, dashed edge boundary, faint label, no hover or press response,
    // activation ignored; the speed slider's rail is dashed and its handle and readout faint.
    await withPage({ theme, route: "/" }, async (page) => {
      await openSettings(page);
      const t = await tokens(page);
      const sw = page.locator(".setting-switch");
      invariant(await sw.getAttribute("aria-disabled") === "true" && !(await sw.evaluate((e) => e.hasAttribute("disabled"))) && await sw.getAttribute("aria-checked") === "false",
        `${theme} settings reduced: switch is not aria-disabled and off`);
      const rest = await sw.evaluate((e) => { const c = getComputedStyle(e); return [c.borderTopStyle, c.borderTopColor, c.color, c.backgroundColor]; });
      invariant(rest[0] === "dashed" && rest[1] === t["--edge"] && rest[2] === t["--fg-faint"], `${theme} settings reduced: switch ${rest}`);
      await sw.hover(); await frames(page);
      const over = await look(sw);
      invariant(over.bg === rest[3] && !over.marker.startsWith('"›"'), `${theme} settings reduced: disabled switch responds to hover ${JSON.stringify(over)}`);
      await page.mouse.down(); await frames(page);
      invariant(!(await pressed(sw)) && (await look(sw)).bg === rest[3], `${theme} settings reduced: disabled switch shows a press`);
      await page.mouse.up(); await settle(page);
      await sw.focus();
      invariant(await sw.evaluate((e) => document.activeElement === e), `${theme} settings reduced: disabled switch is not focusable`);
      await page.keyboard.press("Space"); await page.keyboard.press("Enter"); await settle(page);
      invariant(await sw.getAttribute("aria-checked") === "false", `${theme} settings reduced: disabled switch toggled`);
      const speed = page.locator("#background-motion-speed");
      await speed.focus(); await page.keyboard.press("End");
      invariant(await speed.getAttribute("aria-disabled") === "true" && await speed.evaluate((e) => document.activeElement === e) && await speed.getAttribute("aria-valuetext") === "1.0 times",
        `${theme} settings reduced: disabled speed moved or lost focus`);
      const readout = await page.locator(".setting-slider:has(#background-motion-speed) .setting-value").evaluate((e) => getComputedStyle(e).color);
      invariant(readout === t["--fg-faint"], `${theme} settings reduced: speed readout ${readout}`);
      const drawn = await slider(page, speed, { ...t, handle: t["--fg-faint"] });
      const h = await cell(page);
      invariant(drawn.signal === 0 && drawn.handle.n && Math.abs(drawn.handle.w - h) <= 1 && Math.abs(drawn.handle.h - h) <= 1, `${theme} settings reduced: disabled handle ${JSON.stringify(drawn.handle)} signal ${drawn.signal}`);
      invariant(drawn.rows.length === 1 && drawn.rows[0].runs >= drawn.width / (8 * h), `${theme} settings reduced: rail not dashed ${JSON.stringify(drawn.rows)}`);
    });
    // Dock mode: the dock tuning disclosure is a latch, opened and closed from the keyboard.
    await withPage({ theme, route: "/" }, async (page) => {
      await dockMode(page);
      await openSettings(page);
      const t = await tokens(page);
      const toggle = page.locator(".settings-disclosure__toggle");
      let l = await lamp(toggle);
      invariant(await toggle.getAttribute("aria-expanded") === "false" && l.b === t["--edge"] && l.bg === "rgba(0, 0, 0, 0)", `${theme} settings: tuning lamp off ${JSON.stringify(l)}`);
      await toggle.focus(); await page.keyboard.press("Enter"); await settle(page);
      l = await lamp(toggle);
      invariant(await toggle.getAttribute("aria-expanded") === "true" && await page.locator("#dock-tuning-panel").isVisible() && l.bg === t["--signal"],
        `${theme} settings: Enter did not open dock tuning ${JSON.stringify(l)}`);
      await page.keyboard.press("Space"); await settle(page);
      invariant(await toggle.getAttribute("aria-expanded") === "false" && await page.locator("#dock-tuning-panel").isHidden(), `${theme} settings: Space did not close dock tuning`);
    });
    // The section rail.
    await withPage({ theme, route: "/case-studies/aether" }, async (page) => {
      const t = await tokens(page);
      const dots = page.locator(".nav-dot");
      const n = await dots.count();
      invariant(n >= 2, `${theme} rail: ${n} cells`);
      const cells = await dots.evaluateAll((all) => all.map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [r.width, r.height, c.borderTopLeftRadius, c.opacity]; }));
      invariant(cells.every(([w, h, r, o]) => w === h && r === "0px" && o === "1"), `${theme} rail: cells ${JSON.stringify(cells)}`);
      const current = page.locator('.nav-dot[aria-current="location"]');
      invariant(await current.count() === 1, `${theme} rail: ${await current.count()} current cells`);
      await selected(current, t, "rail current");
      const rule = await page.locator(".nav-dots").evaluate((e) => { const b = getComputedStyle(e, "::before"); return [b.backgroundColor, b.opacity, b.width, getComputedStyle(document.documentElement).getPropertyValue("--stroke-hair").trim()]; });
      invariant(rule[0] === t["--rule"] && rule[1] === "1" && rule[2] === rule[3], `${theme} rail: rule ${rule}`);
      const second = dots.nth(1);
      const tip = second.locator(".dot-tooltip");
      invariant(!(await tip.isVisible()), `${theme} rail: tooltip shown at rest`);
      const idle = await look(second);
      invariant(!idle.sel && idle.b === t["--edge"] && idle.fg === t["--fg-muted"], `${theme} rail: idle cell ${JSON.stringify(idle)}`);
      await second.hover(); await frames(page); await page.waitForTimeout(300);
      const hovered = await look(second);
      invariant(hovered.bg !== idle.bg && hovered.b === t["--fg-muted"] && hovered.marker.startsWith('"›"'), `${theme} rail: hovered cell ${JSON.stringify(hovered)}`);
      // The cell's name is a section heading, so it speaks in the Narrator voice (fix wave, R1).
      const tl = await tip.evaluate((e) => { const c = getComputedStyle(e); return [e.matches(".df-body-sm"), c.visibility, c.opacity, c.backgroundColor, c.borderTopColor, c.color, c.borderTopLeftRadius]; });
      invariant(tl[0] && tl[1] === "visible" && tl[2] === "1" && tl[3] === t["--surface-2"] && tl[4] === t["--edge"] && tl[5] === t["--fg-muted"] && tl[6] === "0px", `${theme} rail: tooltip ${tl}`);
      await page.mouse.move(0, 0);
      // From the keyboard: Enter on another cell makes it the current one.
      await second.focus(); await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelectorAll(".nav-dot")[1].getAttribute("aria-current") === "location");
    });
  }

  // Phase 3 Task 12 (§08): the section rail never covers page content. On every route that renders it, at widths where it
  // shows, with a fine and a coarse pointer (the coarse cell is larger), no rail cell intersects visible text or media in main
  // at any scroll position: the page is stepped through in half-viewport scrolls.
  const RAIL_ROUTES = ["/case-studies/aether", "/case-studies/erebus", "/case-studies/arachne", "/case-studies/where-the-specification-lived", "/experience", "/journey"];
  for (const coarse of [false, true]) for (const width of [820, 1024, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: VIEW_H }, reducedMotion: "reduce", hasTouch: coarse, isMobile: coarse });
    await context.addInitScript((t) => localStorage.setItem("theme", t), THEMES[0]);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`rail clearance ${width}px: ${error.message}`));
    try {
      for (const route of RAIL_ROUTES) {
        await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
        await page.locator(".nav-dot").first().waitFor();
        const hits = await page.evaluate(async (isCoarse) => {
          if (matchMedia("(pointer: coarse)").matches !== isCoarse) return [`pointer: coarse is ${!isCoarse}`];
          const pause = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
          const seen = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
          const meets = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          // The visible main: the static route shell keeps a hidden one in the document.
          const main = [...document.querySelectorAll("main")].find((m) => m.checkVisibility());
          if (!main) return ["no visible main"];
          const out = new Set();
          for (let y = 0; ; y += innerHeight / 2) {
            scrollTo({ top: y, behavior: "instant" }); await pause();
            const cells = [...document.querySelectorAll(".nav-dot")].filter(seen).map((e) => e.getBoundingClientRect());
            if (!cells.length) return ["no rail cell shown"];
            const boxes = [];
            const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              if (!n.textContent.trim() || !seen(n.parentElement)) continue;
              const r = document.createRange(); r.selectNodeContents(n);
              for (const b of r.getClientRects()) boxes.push([n.textContent.trim().slice(0, 24), b]);
            }
            for (const m of main.querySelectorAll("img, video, canvas, svg, iframe")) if (seen(m)) boxes.push([m.tagName.toLowerCase(), m.getBoundingClientRect()]);
            for (const [what, b] of boxes) if (b.width > 0 && b.height > 0 && cells.some((c) => meets(c, b))) out.add(`${what} @${Math.round(scrollY)}`);
            if (y + innerHeight >= document.documentElement.scrollHeight) break;
          }
          return [...out];
        }, coarse);
        invariant(hits.length === 0, `${coarse ? "coarse" : "fine"} ${width}px ${route}: the rail covers ${hits.length} ${JSON.stringify(hits.slice(0, 6))}`);
      }
    } finally {
      await context.close();
    }
  }

  for (const theme of THEMES) await withPage({ theme, route: "/case-studies/erebus" }, async (page) => {
    const unavailable = page.locator(".case-study-link.disabled");
    invariant((await unavailable.count()) > 0, `${theme} unavailable case-study link is absent`);
    for (const el of await unavailable.all()) {
      const state = await el.evaluate((e) => {
        const css = getComputedStyle(e);
        return { model: e.matches(".df-control--unavailable"), focusable: e.matches("a, button, input, [tabindex]"),
          border: css.borderTopColor, label: css.color };
      });
      invariant(state.model && !state.focusable && state.border === "rgba(0, 0, 0, 0)",
        `${theme} unavailable case-study link has control affordance ${JSON.stringify(state)}`);
      invariant(state.label === await tokenRgb(page, "--fg-faint"), `${theme} unavailable case-study label ${state.label}`);
    }
  });

  // A Journey image changes only when its toggle is activated; pointer inspection leaves the story in place.
  for (const theme of THEMES) await withPage({ theme, route: "/journey" }, async (page) => {
    const card = page.locator(".timeline-flip-container.has-image").first();
    await card.waitFor();
    const toggle = card.locator(".timeline-flip-toggle");
    invariant((await toggle.getAttribute("aria-pressed")) === "false", `${theme} Journey starts flipped`);
    await card.hover(); await frames(page);
    invariant((await toggle.getAttribute("aria-pressed")) === "false", `${theme} Journey flips on hover`);
    await toggle.focus(); await page.keyboard.press("Enter"); await frames(page);
    invariant((await toggle.getAttribute("aria-pressed")) === "true", `${theme} Journey toggle does not flip with Enter`);
  });

  // Fix wave (R1, §13 state model): a card's › marker sits in the cell directly before its title's first line, whatever
  // stands above the title, at a wide and a phone width. Each visible card has one heading, its title. Hovered, exactly one
  // marker shows (the card's own or its title's); its vertical centre lies within the title's first line, its right edge
  // meets the title's first glyph box, and no clipping ancestor up to the card cuts it.
  for (const route of ["/", "/case-studies", "/writing", "/procedural-animations"]) for (const width of [VIEW_W, 375]) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      if (width !== VIEW_W) { await page.setViewportSize({ width, height: 812 }); await frames(page); }
      const cards = page.locator(".df-control--card");
      const n = await cards.count();
      invariant(n > 0, `${route} ${width}px: no card rendered`);
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        if (!(await card.isVisible())) continue;
        await card.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await frames(page);
        await card.hover(); await frames(page);
        const m = await card.evaluate((c) => {
          const titles = c.querySelectorAll("h1, h2, h3, h4, h5, h6");
          if (titles.length !== 1) return { error: `${titles.length} headings` };
          const t = titles[0];
          const range = document.createRange(); range.selectNodeContents(t);
          const line = range.getClientRects()[0];
          const shown = [c, t].filter((e) => { const b = getComputedStyle(e, "::before"); return b.display !== "none" && b.content.startsWith('"›"'); });
          if (shown.length !== 1) return { error: `${shown.length} markers shown` };
          const host = shown[0]; const b = getComputedStyle(host, "::before"); const r = host.getBoundingClientRect(); const h = getComputedStyle(host);
          // An absolute marker's offsets are taken from its host's padding box.
          const box = { left: r.left + parseFloat(h.borderLeftWidth) + parseFloat(b.left), top: r.top + parseFloat(h.borderTopWidth) + parseFloat(b.top),
            width: parseFloat(b.width), height: parseFloat(b.height) };
          const clipped = [];
          for (let a = t.parentElement; a; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.overflowX !== "visible" || s.overflowY !== "visible") {
              const ar = a.getBoundingClientRect();
              const [l, tp] = [ar.left + parseFloat(s.borderLeftWidth), ar.top + parseFloat(s.borderTopWidth)];
              if (box.left < l - 0.5 || box.top < tp - 0.5 || box.left + box.width > ar.right - parseFloat(s.borderRightWidth) + 0.5) clipped.push(a.className);
            }
            if (a === c) break;
          }
          return { host: host === t ? "title" : "card", position: b.position, centre: box.top + box.height / 2, right: box.left + box.width,
            line: { top: line.top, bottom: line.bottom, left: line.left }, clipped, text: t.textContent.trim().slice(0, 30) };
        });
        const where = `${route} ${width}px card ${i}`;
        if (m.error) { invariant(false, `${where}: ${m.error}`); continue; }
        invariant(m.position === "absolute", `${where} "${m.text}": the ${m.host}'s marker is ${m.position}, not out of flow`);
        invariant(m.centre >= m.line.top && m.centre <= m.line.bottom, `${where} "${m.text}": marker centre ${m.centre} outside the title's first line ${m.line.top}-${m.line.bottom}`);
        invariant(Math.abs(m.right - m.line.left) <= 0.5, `${where} "${m.text}": marker ends at ${m.right}, title starts at ${m.line.left}`);
        invariant(m.clipped.length === 0, `${where} "${m.text}": marker clipped by ${JSON.stringify(m.clipped)}`);
      }
    });
  }
  // Fix wave (R2, §09 Line hierarchy, §03 Nested structures): an article body ends on the seam that opens the next region
  // (series links or provenance), not on a rule of its own a few lines above it; provenance sections open on a seam and keep
  // the region's left edge, with no inset left over from a boxed card. Checked at a wide and a phone width.
  for (const route of ["/writing/what-should-still-be-hard", "/writing/the-machine-should-explain-itself"]) for (const width of [VIEW_W, 375]) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      if (width !== VIEW_W) { await page.setViewportSize({ width, height: 812 }); await frames(page); }
      const end = await page.evaluate(() => {
        const body = document.querySelector(".article-body");
        const shown = [...body.children].filter((e) => e.checkVisibility());
        const region = document.querySelector(".article-provenance");
        const sections = [...document.querySelectorAll(".article-provenance-section")].map((e) => {
          const c = getComputedStyle(e);
          return [Math.round(e.getBoundingClientRect().left), Math.round(region.getBoundingClientRect().left), c.borderTopStyle, c.paddingLeft, c.paddingRight];
        });
        return { last: shown.at(-1)?.tagName, sections };
      });
      invariant(end.last && end.last !== "HR", `${route} ${width}px: the article body ends on a rule of its own (${end.last})`);
      invariant(end.sections.length > 0 && end.sections.every(([left, edge, seam, pl, pr]) => left === edge && seam === "solid" && pl === "0px" && pr === "0px"),
        `${route} ${width}px: provenance sections ${JSON.stringify(end.sections)}`);
    });
  }
  // Phase 3 Task 7 (§06): Narrator text is Archivo; uppercase text is Archivo Narrow.
  const P3_ROUTES = ["/", "/projects", "/case-studies", "/case-studies/aether", "/writing", "/writing/what-should-still-be-hard", "/experience", "/journey"];
  // Not Phase 3's on these routes: creative regions, project media chrome (Phase 5), the header mark (Phase 4).
  const P3_SKIP = "[data-df-region], .project-media, .media-inspector, .site-header__brand";
  // Phase 3 Task 16 (§03, §17): every visible governed corner is square. Native playfields, independent media and
  // the held brand mark keep their own geometry until their assigned phase.
  for (const theme of THEMES) for (const route of P3_ROUTES) {
    await withPage({ theme, route }, async (page) => {
      const bad = await page.evaluate((skip) => [...document.querySelectorAll("body *")]
        .filter((e) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
          !e.closest(`${skip}, img, video, canvas, iframe`))
        .flatMap((e) => {
          const c = getComputedStyle(e);
          const radii = [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomLeftRadius, c.borderBottomRightRadius];
          return radii.every((r) => r === "0px") ? [] : [`${e.tagName.toLowerCase()}.${e.className}: ${radii.join("/")}`];
        }).slice(0, 24), P3_SKIP);
      invariant(bad.length === 0, `${theme} ${route}: governed corners ${JSON.stringify(bad)}`);
    });
  }
  // Phase 3 Task 17 (§03, §09): only controls, inputs and true containers carry a closed frame.
  for (const theme of THEMES) for (const route of P3_ROUTES) {
    await withPage({ theme, route }, async (page) => {
      const frames17 = await page.evaluate((skip) => {
        const closed = (el) => {
          const c = getComputedStyle(el);
          return ["Top", "Right", "Bottom", "Left"].every((s) =>
            parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none" &&
            !/rgba\(.*, 0\)$/.test(c[`border${s}Color`]));
        };
        const allowed = '.df-control, input, select, textarea, [role="dialog"], dialog, .settings-panel, .site-header__panel, .dock-explore__panel, .terminal-dropdown-options, .dot-tooltip, .dock-tooltip, pre';
        return [...document.querySelectorAll("body *")].filter((el) => el.getClientRects().length &&
          !el.closest(skip) && closed(el) && !el.matches(allowed))
          .map((el) => `${el.tagName}.${el.className}`).slice(0, 10);
      }, P3_SKIP);
      invariant(frames17.length === 0, `${theme} ${route}: closed frames ${JSON.stringify(frames17)}`);
    });
  }
  for (const route of P3_ROUTES) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      const bad = await page.evaluate((skip) => {
        const out = [];
        const family = (el) => getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim();
        const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const voiced = (el) => el.closest(`${skip}, pre, code, kbd, samp, [class*="df-label"], .df-data, .df-annotation, .df-code`);
        for (const el of document.querySelectorAll("main h1, main h2, main h3, main p, main li")) {
          if (!el.getClientRects().length || !own(el) || voiced(el)) continue;
          if (family(el) !== "Archivo") out.push(`${el.tagName}.${el.className} ${family(el)}`);
        }
        for (const el of document.querySelectorAll("body *")) {
          if (!el.getClientRects().length || !own(el) || el.closest(skip)) continue;
          if (getComputedStyle(el).textTransform === "uppercase" && family(el) !== "Archivo Narrow") out.push(`uppercase ${el.tagName}.${el.className} ${family(el)}`);
        }
        return out;
      }, P3_SKIP);
      invariant(bad.length === 0, `${route}: voice ${JSON.stringify(bad.slice(0, 8))}`);
    });
  }
  // Fix wave (R1, §06 Hierarchy): a label names a thing in one to three words. Every rendered Instrument label on the Phase 3
  // routes (and the other case studies, a series article, open Settings and the coverage dialog) holds at most three words of
  // its own: text inside a descendant with its own type class is that descendant's, and screen-reader-only text is not shown.
  const LABEL_ROUTES = [...P3_ROUTES.map((route) => ({ route })), { route: "/case-studies/erebus" }, { route: "/case-studies/arachne" },
    { route: "/case-studies/where-the-specification-lived" }, { route: "/writing/the-machine-should-explain-itself" },
    { route: "/", prepare: openSettings }, { route: "/projects", prepare: (page) => page.getByTitle("View technical coverage").click() }];
  for (const { route, prepare } of LABEL_ROUTES) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      if (prepare) await prepare(page);
      const long = await page.evaluate((skip) => {
        const TYPE = /(^|\s)df-(display-[12]|heading-[123]|body(-lg|-sm)?|label(-lg|-sm)?|readout(-xl)?|code|data|annotation|glyph(-2x)?)(\s|$)/;
        const typed = (el) => { for (let e = el; e; e = e.parentElement) if (TYPE.test(e.getAttribute("class") ?? "")) return e; return null; };
        const out = [];
        for (const label of document.querySelectorAll(".df-label, .df-label-sm, .df-label-lg")) {
          if (!label.checkVisibility() || label.closest(skip)) continue;
          const words = [];
          const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (typed(n.parentElement) !== label) continue;
            let shown = true;
            for (let e = n.parentElement; e && e !== label.parentElement; e = e.parentElement) {
              const r = e.getBoundingClientRect();
              if (!e.checkVisibility() || r.width <= 1 || r.height <= 1) { shown = false; break; }
            }
            if (shown) words.push(...n.textContent.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)));
          }
          if (words.length > 3) out.push(`${label.tagName.toLowerCase()}.${[...label.classList].join(".")}: ${words.join(" ")}`);
        }
        return out;
      }, P3_SKIP);
      invariant(long.length === 0, `${route}${prepare ? " (prepared)" : ""}: labels longer than three words ${JSON.stringify(long.slice(0, 12))}`);
    });
  }
  // Case-study prompt text uses the generated code voice even where the evidence block keeps its line breaks.
  await withPage({ theme: THEMES[0], route: "/case-studies/where-the-specification-lived" }, async (page) => {
    const prompt = page.locator(".case-study-prompt").first();
    await prompt.locator("summary").click();
    const fonts = await prompt.locator("pre").evaluate((el) => {
      const probe = document.createElement("span");
      probe.className = "df-code";
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe).fontFamily;
      probe.remove();
      return { actual: getComputedStyle(el).fontFamily, expected };
    });
    invariant(fonts.actual === fonts.expected, `case-study prompt code voice ${JSON.stringify(fonts)}`);
  });
  // Phase 3 Task 14 (§06): site text resolves to one of the generated type styles.
  for (const route of P3_ROUTES) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      const bad = await page.evaluate((skip) => {
        const styles = ["df-display-1", "df-display-2", "df-heading-1", "df-heading-2", "df-heading-3",
          "df-body-lg", "df-body", "df-body-sm", "df-label-lg", "df-label", "df-label-sm",
          "df-readout-xl", "df-readout", "df-code", "df-data", "df-annotation", "df-glyph", "df-glyph-2x"];
        const probe = document.createElement("span");
        probe.style.cssText = "position:absolute;visibility:hidden";
        document.body.appendChild(probe);
        const allowed = new Set(styles.map((name) => { probe.className = name; return getComputedStyle(probe).fontSize; }));
        probe.remove();
        const icons = ".site-header__caret, .project-roster__toggle-icon, .terminal-dropdown-arrow, .terminal-option-prefix, .timeline-icon-wrapper";
        const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        return [...document.querySelectorAll("body *")].filter((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
          own(el) && !el.closest(`${skip}, .article-prose, ${icons}`) && !allowed.has(getComputedStyle(el).fontSize))
          .map((el) => `${el.tagName.toLowerCase()}.${el.className} ${getComputedStyle(el).fontSize}`).slice(0, 16);
      }, P3_SKIP);
      invariant(bad.length === 0, `${route}: type size ${JSON.stringify(bad)}`);
    });
  }
  // Phase 3 Task 8 (§06): running text keeps to the body measure. The probe resolves the measure in the paragraph's own font.
  for (const route of P3_ROUTES) for (const width of [VIEW_W, 768]) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      await page.setViewportSize({ width, height: VIEW_H });
      const wide = await page.evaluate((skip) => {
        const out = [];
        const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        for (const el of document.querySelectorAll("main p")) {
          if (!el.getClientRects().length || !own(el) || el.closest(`${skip}, [class*="df-label"]`)) continue;
          const probe = document.createElement("span");
          probe.style.cssText = "position:absolute;visibility:hidden;width:var(--measure-body)";
          el.appendChild(probe);
          const limit = probe.getBoundingClientRect().width;
          probe.remove();
          const width = el.getBoundingClientRect().width;
          if (width > limit + 0.5) out.push(`${el.tagName.toLowerCase()}.${el.className} ${Math.round(width)}/${Math.round(limit)}`);
        }
        return out;
      }, P3_SKIP);
      invariant(wide.length === 0, `${route} @${width}: measure ${JSON.stringify(wide.slice(0, 8))}`);
    });
  }
  // Guard for the eyebrow cascade (T6): a page header's paragraph rule must not override the label's
  // line height or colour. Each eyebrow is compared with a probe label.
  for (const route of ["/case-studies", "/writing", "/procedural-animations"]) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      const seen = await page.evaluate(() => {
        const eyebrow = document.querySelector('main [class*="eyebrow"].df-label');
        if (!eyebrow) return null;
        const probe = document.createElement("span");
        probe.className = "df-label";
        probe.style.color = "var(--fg-muted)";
        eyebrow.parentElement.appendChild(probe);
        const read = (el) => { const c = getComputedStyle(el); return { lh: c.lineHeight, color: c.color, family: c.fontFamily }; };
        const out = { eyebrow: read(eyebrow), probe: read(probe) };
        probe.remove();
        return out;
      });
      invariant(seen !== null, `${route}: no eyebrow with df-label is rendered`);
      invariant(JSON.stringify(seen.eyebrow) === JSON.stringify(seen.probe), `${route}: eyebrow ${JSON.stringify(seen.eyebrow)} differs from the label ${JSON.stringify(seen.probe)}`);
    });
  }
}

await browser.close();
console.log(`UNCOVERED pairs (not rendered on any listed route): ${[...uncovered].join(", ") || "none"}`);

const row = ({ id, detail: text, value }) => ({ id, check: id.split("|")[0], theme: id.split("|")[1], route: id.split("|")[2], detail: text, baseline: value });
if (MODE === "record") {
  // The ledger candidates, then every measurement on one MEASURED line (r10). A repeated id fails the record.
  for (const id of duplicates) console.log(`DUPLICATE ${id}`);
  console.log(JSON.stringify({ regions, unmeasured, entries: regressions.map(row), creative: creative.map(row), inactive: inactive.map(row) }, null, 2));
  console.log(`MEASURED ${JSON.stringify(measured)}`);
  process.exit(duplicates.length ? 1 : 0);
}

const ledger = JSON.parse(await readFile(new URL("./darkfield-known-deficiencies.json", import.meta.url), "utf8"));
const scope = (id) => id.split("|").slice(0, 3).join("|");
const known = new Map(ledger.entries.map((entry) => [entry.id, entry]));
const details = new Map(regressions.map((r) => [r.id, r.detail]));
// Per run (r10): each failing run against its own baseline value; ledger runs this build did not measure fail
// as missing rather than passing as stale.
const { fresh, worse, stale, missing } = compareRuns(ledger.entries, measured, (id) => ran.has(scope(id)));
// Baseline and candidate must exclude the same creative content, and creative content is never restyled.
const recordedRegions = Object.fromEntries(Object.entries(ledger.regions).filter(([key]) => ran.has(`contrast|${key}`)));
const recordedCreative = new Map(ledger.creative.filter((c) => ran.has(scope(c.id).replace(/^creative/, "contrast"))).map((c) => [c.id, c.baseline]));
const measuredCreative = new Map(creative.map((c) => [c.id, c.value]));
const creativeChanged = [...new Set([...recordedCreative.keys(), ...measuredCreative.keys()])]
  .filter((id) => !(recordedCreative.has(id) && measuredCreative.has(id) && Math.abs(measuredCreative.get(id) - recordedCreative.get(id)) <= 0.05))
  .map((id) => `${id} ${recordedCreative.get(id) ?? "absent"} -> ${measuredCreative.get(id) ?? "absent"}`);
// Inactive controls (r9): WCAG 1.4.3 exempts them, so they are observations, never entries. Each must
// still match the baseline record, so a change to them is reported rather than passing unnoticed.
const recordedInactive = new Map(ledger.inactive.filter((c) => ran.has(scope(c.id).replace(/^inactive/, "contrast"))).map((c) => [c.id, c.baseline]));
const measuredInactive = new Map(inactive.map((c) => [c.id, c.value]));
const inactiveChanged = [...new Set([...recordedInactive.keys(), ...measuredInactive.keys()])]
  .filter((id) => !(recordedInactive.has(id) && measuredInactive.has(id) && Math.abs(measuredInactive.get(id) - recordedInactive.get(id)) <= 0.05))
  .map((id) => `${id} ${recordedInactive.get(id) ?? "absent"} -> ${measuredInactive.get(id) ?? "absent"}`);
for (const r of regressions.filter((r) => known.has(r.id))) console.log(`KNOWN ${r.id} ${r.detail}`);
for (const { id, reason } of unmeasured) console.log(`UNMEASURED ${id} (${reason})`);
for (const { id, detail: text } of inactive) console.log(`INACTIVE ${id} ${text}`);
assert.deepEqual(invariantFailures, [], "Darkfield invariants");
assert.deepEqual(regions, recordedRegions, "creative-region exclusions differ from the baseline record");
const ids = (list) => list.map(({ id, reason }) => `${id} (${reason})`).sort();
assert.deepEqual(ids(unmeasured), ids(ledger.unmeasured.filter(({ id }) => ran.has(scope(id)))), "unmeasurable text differs from the baseline record");
assert.deepEqual(creativeChanged, [], "creative content measured differently from the baseline record");
assert.deepEqual(inactiveChanged, [], "inactive controls measured differently from the baseline record");
assert.deepEqual(duplicates, [], "measurement ids recorded twice (a pairing defect)");
assert.deepEqual(fresh.map((id) => `${id} ${details.get(id)}`), [], "new regressions (not in the baseline ledger)");
assert.deepEqual(worse.map((id) => `${id} ${details.get(id)}`), [], "known deficiencies that got worse than baseline");
assert.deepEqual(missing, [], "ledger runs this build did not measure (unpaired)");
assert.deepEqual(stale, [], "ledger entries that no longer reproduce: remove them in this commit");
assert.deepEqual(errors, [], "page errors");
console.log("darkfield foundation browser test passed");
