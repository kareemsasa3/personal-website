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
const PAIRS = [
  { selector: ".btn-primary" }, { selector: ".btn-outline", hover: true },
  { selector: ".work-contact-link.primary" }, { selector: ".work-dates", hover: true },
  { selector: ".tech-tag", hover: true }, { selector: ".site-header__link.active" },
  { selector: ".modal-close", hover: true }, { selector: ".toast-close", hover: true },
  { selector: '.settings-segmented__button[aria-pressed="true"]' },
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
    // The Projects tech-stack modal is portaled outside .projects-container (r9). It must read the page's
    // scoped value, so the modal renders as the page does.
    await withPage({ theme, route: "/projects" }, async (page) => {
      await page.getByTitle("View technical coverage").click();
      const modal = await page.locator(".tech-stack-modal").evaluate((el) => {
        const scope = document.querySelector(".projects-container");
        const value = (node) => getComputedStyle(node).getPropertyValue("--terminal-primary").trim();
        return {
          portaled: !scope.contains(el), modal: value(el), page: value(scope),
          name: getComputedStyle(el.querySelector(".tech-name")).color,
          eyebrow: getComputedStyle(scope.querySelector(".projects-eyebrow")).color,
        };
      });
      invariant(modal.portaled, `${theme}: the tech-stack modal is not portaled; this check no longer tests the portal`);
      invariant(modal.page !== "" && modal.modal === modal.page && modal.name === modal.eyebrow,
        `${theme}: tech-stack modal ${modal.modal} / ${modal.name}; page ${modal.page} / ${modal.eyebrow}`);
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
  // Phase 3 (§13): every listed control is a df-control and renders Idle, Hover, Pressed and its hold.
  // Tasks 9–13 and 15 add entries; prepare(page) brings controls on screen (Settings open, dock mode). Token colours are read from the page.
  const P3_CONTROLS = [
    { route: "/darkfield-404-probe", selectors: [".home-link"] },
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
  const look = (el) => el.evaluate((e) => { const c = getComputedStyle(e); return { b: c.borderTopColor, bg: c.backgroundColor,
    fg: c.color, r: c.borderTopLeftRadius, marker: getComputedStyle(e, "::before").content, card: e.matches(".df-control--card"),
    light: e.matches(".df-control--light"),
    sel: e.matches('[aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch)'),
    off: e.matches(':disabled, [aria-disabled="true"], .df-control--unavailable') }; });
  // Where the label starts, and where the ::before marker's box ends. A pseudo-element has no rect: an absolute marker
  // is located from its offsets; an in-flow marker ends where an empty probe placed right after it begins, less the
  // marker's trailing margin and, in a flex row, the gap the probe adds (taken relative to the control, which may
  // re-centre when the probe widens it).
  const geometry = (el) => el.evaluate((e) => {
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
    for (const { route, prepare, selectors } of P3_CONTROLS) {
      await withPage({ theme, route }, async (page) => {
        if (prepare) await prepare(page);
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
            if (!rest.sel && !rest.card) invariant(rest.fg === t["--fg-muted"], `${theme} ${route}: ${selector} idle label ${rest.fg}`);
            if (!rest.sel && !rest.light) invariant(rest.b === t["--edge"], `${theme} ${route}: ${selector} idle boundary ${rest.b}`);
            await el.hover(); await frames(page);
            const hover = await look(el);
            invariant(hover.marker.startsWith('"›"'), `${theme} ${route}: ${selector} hover marker ${hover.marker}`);
            if (!rest.sel) {
              invariant(hover.bg !== rest.bg, `${theme} ${route}: ${selector} hover has no ground step`);
              invariant(hover.fg === t["--fg"], `${theme} ${route}: ${selector} hover label ${hover.fg}`);
              if (!rest.light) invariant(hover.b === t["--fg-muted"], `${theme} ${route}: ${selector} hover boundary ${hover.b}`);
            }
            await hoverGeometry(page, el, `${theme} ${route} ${VIEW_W}px: ${selector}`);
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
            // The marker geometry again at a phone width, where layouts stretch and centre controls.
            await page.setViewportSize({ width: 375, height: 812 });
            await hoverGeometry(page, el, `${theme} ${route} 375px: ${selector}`);
            await page.setViewportSize({ width: VIEW_W, height: VIEW_H });
          }
        }
      });
    }
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
