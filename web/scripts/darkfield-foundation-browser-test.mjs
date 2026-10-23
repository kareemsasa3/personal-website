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
// brought it on screen, after the route pass (Phase 3 Task 12), and hovered there when hover is set (Phase 5 Task 4).
const PAIRS = [
  { selector: ".btn-primary" }, { selector: ".btn-outline", hover: true },
  { selector: ".work-contact-link.primary" }, { selector: ".work-dates", hover: true },
  { selector: ".tech-tag", hover: true }, { selector: ".site-header__link.active" },
  { selector: ".modal-close", hover: true, route: "/", prepare: (page) => openResetDialog(page) },
  { selector: ".toast-close", hover: true, route: "/", prepare: (page) => openToast(page) },
  { selector: '.settings-segmented__button[aria-pressed="true"]', route: "/", prepare: (page) => openSettings(page) },
  { selector: ".error-button.primary" }, { selector: ".home-link" },
  { selector: ".project-roster__action--primary", hover: true },
  { selector: ".project-media__bar .project-media__control", hover: true },
  { selector: ".not-found h1", min: 3 },
  { selector: ".project-media__label" }, { selector: ".site-header__brand-name", rendered: true },
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
// Pairs that render but hold no text run (icon-only controls): reached, yet nothing measured. Reported, never passed.
const textless = new Set();
const errors = [];
const invariant = (ok, message) => { if (!ok) invariantFailures.push(message); };
// A page that needs a frozen clock gets it before navigation: installed at a fixed time and paused at a
// fixed later time that no real elapsed time can reach first, then advanced only by runFor.
const CLOCK_START = new Date("2026-01-01T00:00:00Z");
const CLOCK_PAUSED = new Date("2026-01-01T01:00:00Z");

const withPage = async ({ theme, route = "/", javaScriptEnabled = true, forcedColors = "none", reducedMotion = "reduce", clock = false, routePass = false, scale = 1 }, run) => {
  const context = await browser.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, deviceScaleFactor: scale, javaScriptEnabled, forcedColors, reducedMotion });
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
// Settings → Import of a file that is not settings raises an error toast (Phase 5 Task 4; export and import successes are
// a status line, not a toast). The toast closes itself when its lifetime ends; the checks
// need it on screen for longer, so from here on any timer longer than a second is pushed out of the test's reach. The
// press hold, the debounces and the waits in this file use shorter timers.
const openToast = async (page) => {
  await openSettings(page);
  await page.evaluate(() => { const start = window.setTimeout; window.setTimeout = (run, ms, ...rest) => start(run, ms > 1000 ? 2 ** 31 - 1 : ms, ...rest); });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Import settings", exact: true }).click()]);
  await chooser.setFiles({ name: "settings.json", mimeType: "application/json", buffer: Buffer.from("not settings") });
  await page.locator(".toast").waitFor();
  await page.mouse.move(0, 0);
  await frames(page);
};
// Settings → Reset opens the reset dialog (Phase 5 Task 4).
const openResetDialog = async (page) => {
  await openSettings(page);
  await page.getByRole("button", { name: "Reset all settings to defaults", exact: true }).click();
  await page.locator(".modal-content").waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".modal-content")).opacity === "1");
  await page.mouse.move(0, 0);
  await frames(page);
};
// Opens the media inspector from the named opener (Phase 5 Task 7) and waits for its dialog.
const openInspector = (name) => async (page) => {
  await page.getByRole("button", { name, exact: true }).click();
  await page.locator(".media-inspector__panel").waitFor();
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
      // An inline SVG's <title> renders nothing, so it is not part of the element's name (Phase 4 Task 2).
      const shown = el.querySelector("svg title") ? (() => { const c = el.cloneNode(true); c.querySelectorAll("svg title").forEach((t) => t.remove()); return c.textContent; })() : el.textContent;
      const text = (paintedPass ? [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(" ") : shown).trim().replace(/\s+/g, " ").slice(0, 30);
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
      // An inline SVG's <title> renders nothing, so it is not part of the control's name (Phase 4 Task 2).
      const shown = el.querySelector("svg title") ? (() => { const c = el.cloneNode(true); c.querySelectorAll("svg title").forEach((t) => t.remove()); return c.textContent; })() : el.textContent;
      const base = `${el.tagName.toLowerCase()}|${shown.trim().replace(/\s+/g, " ").slice(0, 30)}`;
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
      // An inline SVG's <title> renders nothing, so it is not part of the control's name (Phase 4 Task 2).
      const shown = el.querySelector("svg title") ? (() => { const c = el.cloneNode(true); c.querySelectorAll("svg title").forEach((t) => t.remove()); return c.textContent; })() : el.textContent;
      const base = `${el.tagName.toLowerCase()}|${shown.trim().replace(/\s+/g, " ").slice(0, 30)}`;
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
        else textless.add(key);
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
      // A hover pair is hovered and verified first, as on the route pass; a hover that does not hold is unmeasured.
      if (pair.hover) {
        const box = await target.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await frames(page);
        if (!(await target.evaluate((el) => el.matches(":hover")))) {
          record("pair", theme, pair.route, `${pair.selector}:hover`, { ratio: null, reason: "not hover" });
          return;
        }
      }
      const [result] = await contrastOf(page, pair.selector, { all: false, rendered: pair.rendered, enter: pair.hover ? null : AT_REST });
      if (result) record("pair", theme, pair.route, `${pair.selector}${pair.hover ? ":hover" : ""}`, result, { limit: pair.min ?? 4.5 });
      else textless.add(`${pair.selector}${pair.hover ? ":hover" : ""}`);
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
    // same global roles as its page, without a page-scoped terminal alias: the probe resolves the roles inside the page
    // container, and the modal's text is compared with them.
    await withPage({ theme, route: "/projects" }, async (page) => {
      await page.getByTitle("View technical coverage").click();
      const modal = await page.locator(".tech-stack-modal").evaluate((el) => {
        const scope = document.querySelector(".projects-container");
        const probe = document.createElement("span");
        scope.appendChild(probe);
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
  // Tasks 9–13 and 15 add entries; prepare(page) brings controls on screen (Settings open, dock mode). Token colours are read from the page,
  // or from inside `scope` (a selector) when the controls sit under a scoped token set (Phase 5, P5-1).
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
    // Phase 5 Task 6: the piece bar's Back and Fullscreen controls, on the bar's surface above the framed artwork.
    { route: "/procedural-animations/mechanical-time", selectors: [".animation-piece__control"] },
    // Phase 5 Task 8: the simulation cards (card controls whose titles carry the marker).
    { route: "/simulations", selectors: ["a.simulation-card"] },
    // Phase 5 Task 9: the Orbital header's breadcrumb (a light control), Play, every button in the action rows and the
    // inspector's edit button, and Show trails (a latch: a label whose lamp follows its native checkbox).
    { route: "/simulations/orbital-simulator", selectors: [".orbital-back", ".orbital-primary", ".orbital-actions button", ".orbital-edit", "label.orbital-checkbox"] },
    // Phase 5 Task 10: the Traffic header's breadcrumb and every button in the action row; on the ring road the row also
    // holds Brake one car.
    { route: "/simulations/traffic-simulator", selectors: [".traffic-back", ".traffic-actions button"] },
    { route: "/simulations/traffic-simulator", selectors: [".traffic-actions button"],
      prepare: async (page) => { await page.getByLabel("Scenario").selectOption({ label: "Ring road" }); await page.getByRole("button", { name: "Brake one car", exact: true }).waitFor(); } },
    // Phase 5 Task 7: project media chrome (the bar's play control, the inspect openers), then the media inspector's
    // controls with the inspector open: Close on a recording-only inspector, and on one with a still frame the view
    // switch (Selected through aria-pressed) and actual size (a latch: a two-state mode with its lamp).
    { route: "/case-studies/aether", selectors: [".project-media__control"] },
    { route: "/case-studies/aether", selectors: [".media-inspector .project-media__control"], prepare: openInspector("Inspect aether recording with playback controls") },
    { route: "/case-studies/erebus", selectors: [".media-inspector__view-group .project-media__control", ".media-inspector__views > .project-media__control"],
      prepare: openInspector("Read erebus still frame") },
    // Task 15: the two controls on Phase 5 surfaces rest directly on the Layout field.
    { route: "/simulations/spider", selectors: [".spider-button"] },
    { route: "/terminal", selectors: [".terminal-sidecar"],
      prepare: (page) => page.getByRole("button", { name: "Minimize terminal" }).click() },
    // Phase 5 Task 12 (P5-7): the window's close, minimise and maximise controls on the header band. Their phone check
    // runs at 500px, where the labels fit on one line; the wrapped labels at 375 and 320px are checked in the Task 12 block.
    { route: "/terminal", selectors: [".terminal-button"], narrow: 500 },
    // Phase 5 Task 4: the toast's Close on an error toast raised by a failed Settings import, and the reset dialog's controls.
    { route: "/", prepare: openToast, selectors: [".toast-close"] },
    { route: "/", prepare: openResetDialog, selectors: [".modal-button", ".modal-close"] },
    // The error-boundary actions: the Journey route chunk fails to load after a client-side navigation, so its lazy
    // import rejects and the Layout error boundary renders in place of the route.
    { route: "/darkfield-404-probe", selectors: [".error-button"], prepare: async (page) => {
      await page.route("**/assets/Journey-*.js", (r) => r.abort());
      await page.evaluate(() => { history.pushState({}, "", "/journey"); dispatchEvent(new PopStateEvent("popstate")); });
      await page.locator(".error-button").first().waitFor();
    } },
  ];
  // scope (Phase 5, P5-1): the probe is placed inside that element, so a control under a scoped token set resolves its own.
  const tokenRgb = (page, name, scope) => page.evaluate(([n, s]) => { const p = document.createElement("i"); p.style.color = `var(${n})`;
    (s ? document.querySelector(s) : document.body).append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, [name, scope]);
  // A card's marker is drawn by its title (its one heading), not by the card itself.
  const look = (el) => el.evaluate((e) => { const c = getComputedStyle(e); const title = e.matches(".df-control--card") ? e.querySelector("h1, h2, h3, h4, h5, h6") : null;
    return { b: c.borderTopColor, bg: c.backgroundColor,
    fg: c.color, r: c.borderTopLeftRadius, marker: getComputedStyle(title ?? e, "::before").content, card: e.matches(".df-control--card"),
    light: e.matches(".df-control--light"),
    sel: e.matches('[aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch)'),
    on: e.matches('.df-control--latch:is([aria-pressed="true"], [aria-checked="true"], [aria-expanded="true"], :has(> input:checked)), details[open] > .df-control--latch'),
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
    for (const { route, prepare, scope, selectors, width = VIEW_W, narrow = 375, relayout = false, reducedMotion = "reduce", wideOnly = false } of P3_CONTROLS) {
      await withPage({ theme, route, reducedMotion }, async (page) => {
        if (width !== VIEW_W) { await page.setViewportSize({ width, height: VIEW_H }); await frames(page); }
        if (prepare) await prepare(page);
        let narrowChecked = 0;
        // A resize re-lays the header and dock after the site's debounced window-size update (the header can change layout,
        // which moves the page below it); wait it out before measuring.
        const resized = async () => { await frames(page); await page.waitForTimeout(250); await frames(page); };
        const t = {}; for (const n of ["--edge", "--fg-muted", "--fg", "--signal", "--on-signal"]) t[n] = await tokenRgb(page, n, scope);
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
            await el.evaluate((e) => { window.dfTarget = e; });
            await page.mouse.down(); await frames(page);
            const down = await look(el);
            invariant(down.bg === t["--signal"] && down.fg === t["--on-signal"], `${theme} ${route}: ${selector} pressed ${down.bg} ${down.fg}`);
            await page.mouse.move(0, 0); await page.mouse.up();
            await page.waitForTimeout(instant * 2);
            // The control (and the dialog or panel holding it) is still on screen: a release off it must not close anything.
            if (!(await page.evaluate(() => window.dfTarget.isConnected))) {
              invariant(false, `${theme} ${route}: ${selector} was removed by a release off the control (its container closed)`);
              continue;
            }
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

  // Phase 5 Task 8 (§13 Hover): every simulation card, hovered, rises one surface step from the field, and each text run
  // in its chrome (title, tags, description, Launch) reads fg or fg-muted on that ground. The native previews are not chrome:
  // a press leaves their ink as it is.
  for (const theme of THEMES) {
    await withPage({ theme, route: "/simulations" }, async (page) => {
      const want = { ground: await tokenRgb(page, "--surface-1"), inks: [await tokenRgb(page, "--fg"), await tokenRgb(page, "--fg-muted")] };
      const cards = page.locator("a.simulation-card");
      invariant((await cards.count()) === 6, `${theme} /simulations: ${await cards.count()} linked cards`);
      for (let i = 0; i < (await cards.count()); i++) {
        const card = cards.nth(i);
        await card.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await frames(page);
        await card.hover(); await frames(page);
        const seen = await card.evaluate((e) => ({ title: e.querySelector("h3")?.textContent, ground: getComputedStyle(e).backgroundColor,
          inks: [...e.querySelectorAll("*")].filter((el) => !el.closest("[data-df-region]") && el.getClientRects().length &&
            [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((el) => [el.className, getComputedStyle(el).color]) }));
        invariant(seen.ground === want.ground, `${theme} /simulations: hovered card "${seen.title}" ground ${seen.ground}, not the surface step ${want.ground}`);
        const off = seen.inks.filter(([, c]) => !want.inks.includes(c));
        invariant(seen.inks.length >= 3 && off.length === 0, `${theme} /simulations: hovered card "${seen.title}" text ${JSON.stringify(off.length ? off : seen.inks)}`);
        // Pressed, the card inverts its chrome; everything in its preview keeps its own ink (D6): the colour and the four
        // border colours of every preview descendant are what they are at rest.
        const native = await card.evaluate((e) => {
          const ink = () => [...e.querySelectorAll(".simulation-preview *")].map((el) => { const c = getComputedStyle(el);
            return [el.getAttribute("class") ?? el.tagName, c.color, c.borderTopColor, c.borderRightColor, c.borderBottomColor, c.borderLeftColor].join(" "); });
          const rest = ink(); e.setAttribute("data-df-pressed", ""); const down = ink(); e.removeAttribute("data-df-pressed");
          return { rest, down };
        });
        invariant(JSON.stringify(native.rest) === JSON.stringify(native.down), `${theme} /simulations: pressing "${seen.title}" recolours its preview ${JSON.stringify(native)}`);
      }
    });
  }

  // Phase 5 Task 9 (§13 Focus, Latched, Disabled, Errors; §05 Live). On the Orbital route, in each theme: keyboard focus on
  // the breadcrumb shows the focus ring; Show trails lights its lamp only while checked, and keyboard focus on its native
  // checkbox draws the ring on the label, and from the keyboard Space presses it while Enter does not (other controls keep
  // Enter, and Space where it activates them); the readouts are fg at rest and Live (signal, one weight step) while running,
  // with the Live marker on the inspector's heading; the regions form one face: only the canvas region is a closed box,
  // the others draw at most one rule each and leave no gap between them (§08 Not a dashboard);
  // while editing, Play is Disabled but still focusable and names its reason, and a press does not start the simulation;
  // a value the browser rejects on submit marks its field invalid with the fault frame.
  for (const theme of THEMES) {
    await withPage({ theme, route: "/simulations/orbital-simulator" }, async (page) => {
      const at = `${theme} /simulations/orbital-simulator`;
      const tok = {}; for (const n of ["--signal", "--fg", "--edge", "--fault", "--fg-faint"]) tok[n] = await tokenRgb(page, n);
      const ring = await page.evaluate(() => { const p = document.createElement("i"); p.style.boxShadow = "var(--focus-ring)"; document.body.append(p);
        const v = getComputedStyle(p).boxShadow; p.remove(); return v; });
      const tabTo = async (selector) => { for (let i = 0; i < 60; i++) { await page.keyboard.press("Tab");
        if (await page.evaluate((s) => document.activeElement?.matches(s), selector)) return true; } return false; };
      invariant(await tabTo(".orbital-back"), `${at}: Tab never reached the breadcrumb`);
      invariant((await page.locator(".orbital-back").evaluate((e) => getComputedStyle(e).boxShadow)) === ring, `${at}: breadcrumb focus ring`);
      const trails = page.locator("label.orbital-checkbox");
      const lamp = () => trails.evaluate((e) => [getComputedStyle(e, "::after").backgroundColor, getComputedStyle(e, "::after").borderTopColor]);
      invariant(JSON.stringify(await lamp()) === JSON.stringify([tok["--signal"], tok["--signal"]]), `${at}: Show trails lamp not lit while checked ${await lamp()}`);
      await page.getByLabel("Show trails").uncheck();
      const off = await lamp();
      invariant(off[0] !== tok["--signal"] && off[1] === tok["--edge"], `${at}: Show trails lamp lit while unchecked ${off}`);
      await page.getByLabel("Show trails").check();
      invariant(await tabTo("label.orbital-checkbox input"), `${at}: Tab never reached Show trails`);
      invariant((await trails.evaluate((e) => getComputedStyle(e).boxShadow)) === ring, `${at}: Show trails focus ring is not on its label`);
      const instant = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-instant")));
      const box = page.getByLabel("Show trails");
      const isPressed = (loc) => loc.evaluate((e) => e.hasAttribute("data-df-pressed"));
      await page.keyboard.down("Enter"); await frames(page);
      invariant(!(await isPressed(trails)), `${at}: Enter on Show trails shows a press it does not make`);
      await page.keyboard.up("Enter"); await page.waitForTimeout(instant * 2);
      invariant(await box.isChecked(), `${at}: Enter toggled Show trails`);
      await page.keyboard.down(" "); await frames(page);
      invariant(await isPressed(trails), `${at}: Space on Show trails shows no press`);
      await page.keyboard.up(" "); await page.waitForTimeout(instant * 2);
      invariant(!(await box.isChecked()) && !(await isPressed(trails)), `${at}: Space did not toggle Show trails, or its press never released`);
      await page.keyboard.press(" ");
      // Other controls are unchanged: a button acknowledges Enter and Space; a link acknowledges Enter only.
      const reset = page.getByRole("button", { name: "Reset scenario", exact: true });
      for (const key of ["Enter", " "]) {
        await reset.focus(); await page.keyboard.down(key); await frames(page);
        invariant(await isPressed(reset), `${at}: ${JSON.stringify(key)} on Reset scenario shows no press`);
        await page.keyboard.up(key); await page.waitForTimeout(instant * 2);
      }
      const back = page.locator(".orbital-back");
      const keyPress = (key) => back.evaluate((e, k) => { e.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
        const on = e.hasAttribute("data-df-pressed"); e.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true })); return on; }, key);
      const linkEnter = await keyPress("Enter");
      await page.waitForTimeout(instant * 2); // the Enter press is held for dur-instant after its release
      const linkSpace = await keyPress(" ");
      invariant(linkEnter && !linkSpace, `${at}: the breadcrumb's keyboard acknowledgement changed (Enter ${linkEnter}, Space ${linkSpace})`);
      await page.waitForTimeout(instant * 2);
      // One face: only the canvas region is closed; the other regions draw at most one line and meet without gaps.
      const face = await page.evaluate(() => {
        const q = (s) => document.querySelector(s); const r = (e) => e.getBoundingClientRect();
        const sides = (e) => ["Top", "Right", "Bottom", "Left"].filter((k) => { const c = getComputedStyle(e);
          return parseFloat(c[`border${k}Width`]) > 0 && c[`border${k}Style`] !== "none"; });
        const regions = [".orbital-controls", ".orbital-workspace", ".orbital-inspector", ".orbital-context"].map((s) => [s, sides(q(s))]);
        return { regions, field: sides(q(".orbital-field")), fieldColor: getComputedStyle(q(".orbital-field")).borderTopColor,
          gaps: [r(q(".orbital-workspace")).top - r(q(".orbital-controls")).bottom, r(q(".orbital-context")).top - r(q(".orbital-workspace")).bottom],
          shared: r(q(".orbital-inspector")).left - r(q(".orbital-field")).right };
      });
      invariant(face.regions.every(([, k]) => k.length <= 1) && face.field.length === 4 && face.fieldColor === tok["--edge"] &&
        face.gaps.every((g) => g <= 0.5) && Math.abs(face.shared) <= 0.5, `${at}: the regions are not one face ${JSON.stringify(face)}`);
      const values = () => page.locator(".orbital-value:not(.orbital-value--fixed)").evaluateAll((els) => els.map((e) => [getComputedStyle(e).color, getComputedStyle(e).fontWeight]));
      const rest = await values();
      invariant(rest.length === 5 && rest.every(([c, w]) => c === tok["--fg"] && w === "400"), `${at}: paused readouts ${JSON.stringify(rest)}`);
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Pause", exact: true }).waitFor();
      const live = await values();
      invariant(live.every(([c, w]) => c === tok["--signal"] && w === "500"), `${at}: running readouts are not Live ${JSON.stringify(live)}`);
      const marker = () => page.locator("#orbital-inspector-title").evaluate((e) => getComputedStyle(e, "::before").content);
      invariant((await marker()).startsWith('"•"'), `${at}: the Live inspector group has no marker (${await marker()})`);
      const fixed = await page.locator(".orbital-value--fixed").evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e).fontWeight]);
      invariant(fixed[0] === tok["--fg"] && fixed[1] === "400", `${at}: the fixed mass reads as Live ${fixed}`);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      invariant(!(await marker()).startsWith('"•"'), `${at}: the paused inspector keeps the Live marker`);
      await page.getByRole("button", { name: "Pause & edit body", exact: true }).click();
      const play = page.locator(".orbital-primary");
      const seen = await play.evaluate((e) => ({ aria: e.getAttribute("aria-disabled"), native: e.disabled, style: getComputedStyle(e).borderTopStyle,
        color: getComputedStyle(e).color, reason: (e.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ") }));
      invariant(seen.aria === "true" && !seen.native && seen.style === "dashed" && seen.color === tok["--fg-faint"] && /Paused for editing/.test(seen.reason),
        `${at}: Play while editing ${JSON.stringify(seen)}`);
      await play.focus(); await page.keyboard.press("Enter"); await play.click({ force: true }); await frames(page);
      invariant((await page.locator(".orbital-status").textContent()).includes("Paused") && (await play.textContent()) === "Play", `${at}: a blocked Play started the simulation`);
      const mass = page.getByLabel("Mass (solar masses)", { exact: true });
      await mass.fill("-1");
      await page.getByRole("button", { name: "Apply changes", exact: true }).click();
      const invalid = await mass.evaluate((e) => [e.getAttribute("aria-invalid"), getComputedStyle(e).borderTopWidth, getComputedStyle(e).borderTopColor]);
      const bold = await page.evaluate(() => { const p = document.createElement("i"); p.style.border = "var(--stroke-bold) solid"; document.body.append(p);
        const v = getComputedStyle(p).borderTopWidth; p.remove(); return v; });
      invariant(invalid[0] === "true" && invalid[1] === bold && invalid[2] === tok["--fault"], `${at}: rejected mass ${JSON.stringify(invalid)} (stroke-bold ${bold})`);
      await mass.fill("0.000003");
      invariant((await mass.getAttribute("aria-invalid")) === null, `${at}: the mass stays marked invalid after an edit`);
    });
  }

  // Phase 5 Task 10 (§13 Focus, Disabled, Errors, Direct manipulation; §05 Live; §08 Not a dashboard). On the Traffic
  // route, in each theme: keyboard focus on the breadcrumb shows the focus ring; the regions form one face (only the road
  // region is a closed box; the others draw at most one rule and leave no gap); the readouts are fg at rest and Live
  // (signal, one weight step) while running, except the fixed ones, with the Live marker on the run state and on the
  // Measurements and Signals headings; each slider marks every step of its control (the count comes from the control)
  // with a crisp whole-pixel mark in edge at 1x and 2x, along an edge-coloured hairline, shows its value as the Settings
  // sliders' solid signal-coloured square with nothing filled behind it, closes each end of its range with a heavier
  // mark, and steps from the keyboard (Page Up and Page Down by ten steps (APG), as in Settings); after a
  // simulation error Play is Disabled but focusable, names the alert, and a press does not start the simulation, and the
  // alert carries the error frame. On the ring road Brake one car is a control and the vehicle slider has its own count.
  // Step marks as drawn (§09 whole pixels; L2 boundary contrast): with the handle at the lower limit, each mark between
  // the ends sits where the handle's centre would stop (half a handle in from each edge, then evenly by the control's
  // count). Away from the handle, the row just above the rail must show each mark as exactly one CSS pixel of solid
  // edge (scale device pixels), with nothing half-drawn beside it, at 3:1 or more against the ground.
  const crispMarks = async (page, range, scale, tok) => {
    await range.focus(); await page.keyboard.press("Home");
    await page.mouse.move(0, 0); await range.evaluate((e) => e.blur()); await frames(page);
    const geo = await range.evaluate((e) => { const p = document.createElement("i"); p.style.cssText = `position:absolute;width:${getComputedStyle(e).getPropertyValue("--df-range-inset")}`;
      e.parentElement.append(p); const inset = p.getBoundingClientRect().width; p.remove();
      return { inset, width: e.getBoundingClientRect().width, steps: Math.round((+e.max - +e.min) / +e.step) }; });
    const png = (await range.screenshot()).toString("base64");
    return page.evaluate(async ([b64, tk, g, scale]) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement("canvas"); [c.width, c.height] = [img.width, img.height];
      const cx2 = c.getContext("2d"); cx2.drawImage(img, 0, 0);
      const { data, width, height } = cx2.getImageData(0, 0, c.width, c.height);
      const rgb = (v) => v.match(/\d+/g).map(Number);
      const [signal, edge] = [rgb(tk["--signal"]), rgb(tk["--edge"])];
      const px = (x, y) => [0, 1, 2].map((j) => data[(y * width + x) * 4 + j]);
      const near = (a, b, t) => a.every((v, j) => Math.abs(v - b[j]) <= t);
      const lum = (p) => { const l = p.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      const ground = px(1, 1);
      let [x1, n] = [-1, 0];
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (near(px(x, y), signal, 6)) { n++; x1 = Math.max(x1, x); }
      const ink = (x, y) => !near(px(x, y), ground, 10);
      let rail = -1, best = 0;
      for (let y = 0; y < height; y++) { let k = 0; for (let x = x1 + 2; x < width; x++) if (ink(x, y)) k++; if (k > best) { best = k; rail = y; } }
      const row = rail - 3 * scale;
      const bad = []; let checked = 0, hidden = 0;
      for (let i = 1; i < g.steps; i++) {
        const at = (g.inset + ((g.width - 2 * g.inset) * i) / g.steps) * scale;
        if (at <= x1 + 2 * scale) { hidden++; continue; }
        checked++;
        const cols = [];
        for (let x = Math.max(0, Math.floor(at - 2 * scale)); x <= Math.min(width - 1, Math.ceil(at + 2 * scale)); x++) if (ink(x, row)) cols.push(x);
        const solid = cols.every((x) => near(px(x, row), edge, 8)) && cols.length === scale && cols.at(-1) - cols[0] === scale - 1;
        const contrast = cols.length ? Math.max(...cols.map((x) => ratio(px(x, row), ground))) : 0;
        if (!solid || contrast < 3) bad.push({ i, at: +at.toFixed(1), cols: cols.map((x) => px(x, row).join(",")), contrast: +contrast.toFixed(2) });
      }
      return { checked, hidden, rail, bad };
    }, [png, tok, geo, scale]);
  };
  for (const theme of THEMES) {
    await withPage({ theme, route: "/simulations/traffic-simulator" }, async (page) => {
      const at = `${theme} /simulations/traffic-simulator`;
      const tok = {}; for (const n of ["--signal", "--fg", "--edge", "--fault", "--fg-faint", "--surface-1"]) tok[n] = await tokenRgb(page, n);
      const ring = await page.evaluate(() => { const p = document.createElement("i"); p.style.boxShadow = "var(--focus-ring)"; document.body.append(p);
        const v = getComputedStyle(p).boxShadow; p.remove(); return v; });
      const tabTo = async (selector) => { for (let i = 0; i < 60; i++) { await page.keyboard.press("Tab");
        if (await page.evaluate((s) => document.activeElement?.matches(s), selector)) return true; } return false; };
      invariant(await tabTo(".traffic-back"), `${at}: Tab never reached the breadcrumb`);
      invariant((await page.locator(".traffic-back").evaluate((e) => getComputedStyle(e).boxShadow)) === ring, `${at}: breadcrumb focus ring`);
      await page.locator(".traffic-back").evaluate((e) => e.blur());
      // One face: only the road region is closed; the other regions draw at most one line and meet without gaps.
      const face = await page.evaluate(() => {
        const q = (s) => document.querySelector(s); const r = (e) => e.getBoundingClientRect();
        const sides = (e) => ["Top", "Right", "Bottom", "Left"].filter((k) => { const c = getComputedStyle(e);
          return parseFloat(c[`border${k}Width`]) > 0 && c[`border${k}Style`] !== "none"; });
        const regions = [".traffic-controls", ".traffic-workspace", ".traffic-readout-panel", ".traffic-charts", ".traffic-charts > section", ".traffic-context"]
          .flatMap((s) => [...document.querySelectorAll(s)].map((e) => [s, sides(e)]));
        return { regions, field: sides(q(".traffic-field")), fieldColor: getComputedStyle(q(".traffic-field")).borderTopColor,
          gaps: [r(q(".traffic-workspace")).top - r(q(".traffic-controls")).bottom, r(q(".traffic-charts")).top - r(q(".traffic-workspace")).bottom,
            r(q(".traffic-context")).top - r(q(".traffic-charts")).bottom],
          shared: r(q(".traffic-readout-panel")).left - r(q(".traffic-field")).right };
      });
      invariant(face.regions.every(([, k]) => k.length <= 1) && face.field.length === 4 && face.fieldColor === tok["--edge"] &&
        face.gaps.every((g) => g <= 0.5) && Math.abs(face.shared) <= 0.5, `${at}: the regions are not one face ${JSON.stringify(face)}`);
      // Live readouts.
      const values = () => page.locator(".traffic-value:not(.traffic-value--fixed)").evaluateAll((els) => els.map((e) => [getComputedStyle(e).color, getComputedStyle(e).fontWeight]));
      const fixed = () => page.locator(".traffic-value--fixed").evaluateAll((els) => els.map((e) => [getComputedStyle(e).color, getComputedStyle(e).fontWeight]));
      const markers = () => page.evaluate(() => [...document.querySelectorAll(".traffic-readout-panel h2, .traffic-status > :first-child")].map((e) => getComputedStyle(e, "::before").content));
      const rest = await values();
      invariant(rest.length >= 8 && rest.every(([c, w]) => c === tok["--fg"] && w === "400"), `${at}: paused readouts ${JSON.stringify(rest)}`);
      invariant((await markers()).every((m) => !m.startsWith('"•"')), `${at}: a paused group carries the Live marker`);
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Pause", exact: true }).waitFor();
      const live = await values();
      invariant(live.every(([c, w]) => c === tok["--signal"] && w === "500"), `${at}: running readouts are not Live ${JSON.stringify(live)}`);
      const held = await fixed();
      invariant(held.length >= 1 && held.every(([c, w]) => c === tok["--fg"] && w === "400"), `${at}: a fixed value reads as Live ${JSON.stringify(held)}`);
      const running = await markers();
      invariant(running.length === 3 && running.every((m) => m.startsWith('"•"')), `${at}: the Live groups have no marker ${JSON.stringify(running)}`);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      invariant((await markers()).every((m) => !m.startsWith('"•"')), `${at}: the paused groups keep the Live marker`);
      // Sliders as drawn: the input's own pixels, classified against the face's ground (a slider at a fractional x is
      // captured on whole pixels, hence one pixel of tolerance on the handle's position). At the lower limit the handle is
      // a signal square at the left; outside it, the row just above the rail holds one tick per remaining step, and the
      // row above the ticks holds only the heavier mark at the far end. No signal pixel lies outside the handle (no fill).
      const drawn = async (range) => {
        await page.mouse.move(0, 0); await range.evaluate((e) => e.blur()); await frames(page);
        const png = (await range.screenshot()).toString("base64");
        return page.evaluate(async ([b64, tk]) => {
          const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
          const c = document.createElement("canvas"); [c.width, c.height] = [img.width, img.height];
          const g = c.getContext("2d"); g.drawImage(img, 0, 0);
          const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
          const rgb = (v) => v.match(/\d+/g).map(Number);
          const [signal, ground] = [rgb(tk["--signal"]), rgb(tk["--surface-1"])];
          const px = (x, y) => [0, 1, 2].map((j) => data[(y * width + x) * 4 + j]);
          const near = (a, b, t) => a.every((v, j) => Math.abs(v - b[j]) <= t);
          let [x0, y0, x1, y1, n] = [width, height, -1, -1, 0];
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (near(px(x, y), signal, 6)) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
          const ink = (x, y) => !near(px(x, y), ground, 10) && !(x >= x0 - 1 && x <= x1 + 1);
          let rail = -1, best = 0;
          for (let y = 0; y < height; y++) { let k = 0; for (let x = 0; x < width; x++) if (ink(x, y)) k++; if (k > best) { best = k; rail = y; } }
          const runs = (y) => { let [count, prev] = [0, false]; for (let x = 0; x < width; x++) { const on = ink(x, y); if (on && !prev) count++; prev = on; } return count; };
          return { width, handle: { n, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 }, rail, best, ticks: runs(rail - 3), bars: runs(rail - 6) };
        }, [png, tok]);
      };
      const cellH = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h")));
      const crisp = (range, scale) => crispMarks(page, range, scale, tok);
      const checkSliders = async (where) => {
        const ranges = page.locator(".df-range");
        invariant((await ranges.count()) > 0, `${at} ${where}: no slider`);
        for (let i = 0; i < (await ranges.count()); i++) {
          const range = ranges.nth(i);
          const meta = await range.evaluate((e) => ({ id: e.id, min: +e.min, max: +e.max, step: +e.step, steps: getComputedStyle(e).getPropertyValue("--df-range-steps").trim() }));
          const steps = Math.round((meta.max - meta.min) / meta.step);
          invariant(meta.steps === String(steps), `${at} ${where}: ${meta.id} draws ${meta.steps} steps, its control has ${steps}`);
          await range.focus(); await page.keyboard.press("Home");
          const low = await drawn(range);
          // The handle is the Settings sliders' square (cell-h).
          invariant(low.handle.n === cellH * cellH && low.handle.w === cellH && low.handle.h === cellH && Math.abs(low.handle.cx - cellH / 2) <= 1 &&
            Math.abs(low.handle.cy - low.rail - 0.5) <= 1, `${at} ${where}: ${meta.id} handle at the lower limit ${JSON.stringify(low.handle)} rail ${low.rail}`);
          invariant(low.best >= low.width - 2 * cellH && low.bars === 1, `${at} ${where}: ${meta.id} rail ${low.best}/${low.width}, end marks ${low.bars}`);
          const marks = await crisp(range, 1);
          invariant(marks.checked === steps - 1 - marks.hidden && marks.checked > 0 && marks.bad.length === 0,
            `${at} ${where}: ${meta.id} step marks at 1x ${JSON.stringify({ ...marks, bad: marks.bad.slice(0, 4) })}`);
          await range.focus(); await page.keyboard.press("ArrowRight");
          invariant(Math.abs(Number(await range.inputValue()) - (meta.min + meta.step)) < 1e-9, `${at} ${where}: ${meta.id} ArrowRight did not step`);
          // Page Up and Page Down move ten steps (APG), clamped at the limits (the Settings sliders' page).
          await range.focus(); await page.keyboard.press("Home"); await page.keyboard.press("PageUp");
          const paged = Math.min(meta.max, meta.min + 10 * meta.step);
          invariant(Math.abs(Number(await range.inputValue()) - paged) < 1e-9, `${at} ${where}: ${meta.id} PageUp gave ${await range.inputValue()}, want ${paged}`);
          await page.keyboard.press("PageDown");
          invariant(Math.abs(Number(await range.inputValue()) - meta.min) < 1e-9, `${at} ${where}: ${meta.id} PageDown gave ${await range.inputValue()}`);
          await range.focus(); await page.keyboard.press("End"); await page.keyboard.press("PageUp");
          invariant(Math.abs(Number(await range.inputValue()) - meta.max) < 1e-9, `${at} ${where}: ${meta.id} PageUp past the upper limit`);
          const high = await drawn(range);
          invariant(Math.abs(high.handle.cx - (high.width - cellH / 2)) <= 1 && high.bars === 1, `${at} ${where}: ${meta.id} handle at the upper limit ${JSON.stringify(high.handle)}`);
        }
        await page.getByRole("button", { name: "Restore defaults", exact: true }).click();
      };
      await checkSliders("signal corridor");
      // A simulation error: Play is Disabled, focusable, names the alert, and ignores a press; the alert has the error frame.
      await page.getByLabel("Signal coordination").evaluate((e) => e.add(new Option("probe", "darkfield-probe")));
      await page.getByLabel("Signal coordination").selectOption("darkfield-probe");
      const alert = page.locator("#traffic-error");
      await alert.waitFor();
      const frame = await alert.evaluate((e) => [getComputedStyle(e).borderTopWidth, getComputedStyle(e).borderTopColor, e.getAttribute("role")]);
      const bold = await page.evaluate(() => { const p = document.createElement("i"); p.style.border = "var(--stroke-bold) solid"; document.body.append(p);
        const v = getComputedStyle(p).borderTopWidth; p.remove(); return v; });
      invariant(frame[0] === bold && frame[1] === tok["--fault"] && frame[2] === "alert", `${at}: the simulation's alert ${JSON.stringify(frame)} (stroke-bold ${bold})`);
      const play = page.locator(".traffic-primary");
      const seen = await play.evaluate((e) => ({ aria: e.getAttribute("aria-disabled"), native: e.disabled, style: getComputedStyle(e).borderTopStyle,
        color: getComputedStyle(e).color, reason: (e.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" "),
        alert: document.getElementById("traffic-error")?.textContent ?? "" }));
      invariant(seen.aria === "true" && !seen.native && seen.style === "dashed" && seen.color === tok["--fg-faint"] && seen.reason.length > 0 && seen.reason === seen.alert,
        `${at}: Play after an error ${JSON.stringify(seen)}`);
      await play.focus();
      invariant(await page.evaluate(() => document.activeElement?.matches(".traffic-primary")), `${at}: a Disabled Play is not focusable`);
      await page.keyboard.press("Enter"); await play.click({ force: true }); await frames(page);
      invariant((await page.locator(".traffic-status").textContent()).includes("Paused") && (await play.textContent()) === "Play", `${at}: a blocked Play started the simulation`);
      await page.getByRole("button", { name: "Restore defaults", exact: true }).click();
      await alert.waitFor({ state: "detached" });
      invariant((await play.getAttribute("aria-disabled")) === null, `${at}: Play stays Disabled once the error clears`);
      // The ring road: Brake one car is a control; the vehicle slider draws its own count.
      await page.getByLabel("Scenario").selectOption({ label: "Ring road" });
      const brake = page.getByRole("button", { name: "Brake one car", exact: true });
      await brake.waitFor();
      invariant(await brake.evaluate((e) => e.matches(".df-control.df-label")), `${at}: Brake one car is not a control`);
      await checkSliders("ring road");
    });
    // The step marks stay whole and solid at 2x (the corridor's sliders and the ring's densest one).
    await withPage({ theme, route: "/simulations/traffic-simulator", scale: 2 }, async (page) => {
      const at = `${theme} /simulations/traffic-simulator @2x`;
      const tok = {}; for (const n of ["--signal", "--edge"]) tok[n] = await tokenRgb(page, n);
      for (const scenario of ["Signal corridor", "Ring road"]) {
        await page.getByLabel("Scenario").selectOption({ label: scenario });
        const ranges = page.locator(".df-range");
        for (let i = 0; i < (await ranges.count()); i++) {
          const range = ranges.nth(i);
          const steps = await range.evaluate((e) => Math.round((+e.max - +e.min) / +e.step));
          const marks = await crispMarks(page, range, 2, tok);
          invariant(marks.checked === steps - 1 - marks.hidden && marks.checked > 0 && marks.bad.length === 0,
            `${at} ${scenario}: slider ${i} step marks ${JSON.stringify({ ...marks, bad: marks.bad.slice(0, 4) })}`);
        }
      }
    });
  }

  // Phase 5 Task 11 (§15 Data visualisation; §09 Line hierarchy, whole pixels; §12 Stepped or smooth; §13 Inspect; §05
  // Rationing the secondary hues; §06 voices). On the Traffic route, in each theme, at 1x and 2x, with the simulation run
  // until the throughput chart holds several samples: the line holds each sample until the next and then steps (no
  // diagonal); the axes are tick rails and the line, rails, ticks, gridline and demand line are each drawn on whole device
  // pixels, as solid as their width, with nothing half-drawn beside them, and the rails and ticks meet the non-text
  // contrast minimum (3:1, WCAG 1.4.11) against the ground, also where the chart's column starts at a fractional x.
  // The measuring line, brackets, node and readout appear only while the pointer inspects a sample, are drawn the same
  // way, and leave the ground unchanged; the readout pairs Machine values with label units on surface-2 in edge.
  // The demand line is the only coolant mark. The chart offers no keyboard inspection (none existed before); its data
  // table stays reachable from the keyboard. The legend, the tables and the trip-time qualifier speak in their voices.
  const chartGeometry = () => {
    const svg = document.querySelector(".traffic-chart svg");
    const box = svg.getBoundingClientRect();
    const segs = [];
    const add = (kind, el, a, b, fixed, horizontal) => {
      const cs = getComputedStyle(el);
      segs.push({ kind, from: Math.min(a, b), to: Math.max(a, b), at: fixed, horizontal, width: parseFloat(cs.strokeWidth),
        dash: cs.strokeDasharray === "none" ? null : cs.strokeDasharray.split(/[ ,]+/).map(parseFloat) });
    };
    const parse = (kind, el) => {
      let x = 0, y = 0;
      for (const [, c, args] of (el.getAttribute("d") ?? "").matchAll(/([MHV])([^MHV]+)/g)) {
        const n = args.split(",").map(Number);
        if (c === "M") [x, y] = n;
        else if (c === "H") { add(kind, el, x, n[0], y, true); x = n[0]; } else { add(kind, el, y, n[0], x, false); y = n[0]; }
      }
    };
    for (const [kind, sel] of [["axis", ".traffic-chart-axis"], ["line", ".traffic-chart-line"], ["cross", ".traffic-chart-cross"], ["brackets", ".traffic-chart-brackets"]])
      for (const el of svg.querySelectorAll(sel)) parse(kind, el);
    for (const [kind, sel] of [["grid", ".traffic-chart-grid"], ["demand", ".traffic-chart-demand"]])
      for (const el of svg.querySelectorAll(sel)) add(kind, el, +el.getAttribute("x1"), +el.getAttribute("x2"), +el.getAttribute("y1"), true);
    // Text and the readout (an overlay above the plot) cover the lines beneath them.
    const covers = [...svg.querySelectorAll("text"), ...document.querySelectorAll(".traffic-chart-tooltip")].map((t) => {
      const r = t.getBoundingClientRect(); return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top }; });
    const node = svg.querySelector(".traffic-chart-node");
    // The bracket corners: the four outermost pixels of the brackets' box.
    const br = svg.querySelector(".traffic-chart-brackets")?.getBBox();
    const corners = br ? [[Math.floor(br.x), Math.floor(br.y)], [Math.ceil(br.x + br.width) - 1, Math.floor(br.y)],
      [Math.floor(br.x), Math.ceil(br.y + br.height) - 1], [Math.ceil(br.x + br.width) - 1, Math.ceil(br.y + br.height) - 1]] : [];
    return { left: box.left, top: box.top, width: box.width, height: box.height, segs, covers, corners,
      node: node ? { cx: +node.getAttribute("cx"), cy: +node.getAttribute("cy"), r: parseFloat(getComputedStyle(node).r) } : null };
  };
  // Each segment is probed where nothing else is drawn within a few pixels (inside a dash on a dashed line); a scan
  // across it must find exactly its width in device pixels, contiguous, in its token colour (the gridline: none, or
  // one uniform run of its width, since it is drawn at the ghost opacity).
  const chartAnalyse = async ([b64, tk, g, clip, scale]) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement("canvas"); [c.width, c.height] = [img.width, img.height];
    const cx2 = c.getContext("2d"); cx2.drawImage(img, 0, 0);
    const { data, width, height } = cx2.getImageData(0, 0, c.width, c.height);
    const rgb = (v) => v.match(/\d+/g).map(Number);
    const ground = rgb(tk["--surface-1"]);
    const colour = { axis: rgb(tk["--edge"]), brackets: rgb(tk["--edge"]), cross: rgb(tk["--edge"]), line: rgb(tk["--signal"]), demand: rgb(tk["--coolant"]) };
    const px = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? ground : [0, 1, 2].map((j) => data[(y * width + x) * 4 + j]));
    const near = (a, b, t) => a.every((v, j) => Math.abs(v - b[j]) <= t);
    const lum = (p) => { const l = p.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const dist = (s, x, y) => { const [along, across] = s.horizontal ? [x, y] : [y, x];
      return Math.max(along < s.from ? s.from - along : along > s.to ? along - s.to : 0, Math.abs(across - s.at) - s.width / 2); };
    const clear = (s, x, y) => g.segs.every((o) => o === s || o.kind === "grid" || dist(o, x, y) > 3) &&
      g.covers.every((t) => x < t.l - 3 || x > t.r + 3 || y < t.t - 3 || y > t.b + 3) &&
      (!g.node || s.kind === "line" || Math.hypot(x - g.node.cx, y - g.node.cy) > g.node.r + 4);
    const out = [];
    for (const s of g.segs) {
      if (s.to - s.from < 4) continue;
      const spots = [];
      if (s.dash) { const period = s.dash.reduce((a, b) => a + b, 0); for (let p = s.from; p + s.dash[0] <= s.to; p += period) spots.push(p + s.dash[0] / 2); }
      else for (const f of [0.15, 0.3, 0.5, 0.7, 0.85]) spots.push(s.from + (s.to - s.from) * f);
      for (const along of spots) {
        const [x, y] = s.horizontal ? [along, s.at] : [s.at, along];
        if (!clear(s, x, y)) continue;
        const X = Math.floor((g.left + x - clip.x) * scale), Y = Math.floor((g.top + y - clip.y) * scale);
        const inked = [];
        for (let k = -4 * scale; k <= 4 * scale; k++) { const p = s.horizontal ? px(X, Y + k) : px(X + k, Y); if (!near(p, ground, s.kind === "grid" ? 0 : 10)) inked.push({ k, p }); }
        const runs = inked.length > 0 && inked.at(-1).k - inked[0].k === inked.length - 1;
        const solid = s.kind === "grid" ? inked.every((i) => near(i.p, inked[0].p, 0)) : inked.every((i) => near(i.p, colour[s.kind], 8));
        const ok = s.kind === "grid" ? inked.length === 0 || (runs && inked.length === s.width * scale && solid) : runs && inked.length === s.width * scale && solid;
        out.push({ kind: s.kind, at: s.at, along: +along.toFixed(1), ok, n: inked.length, contrast: inked.length ? +Math.min(...inked.map((i) => ratio(i.p, ground))).toFixed(2) : 0 });
        if (!s.dash) break;
      }
    }
    // Each bracket corner pixel is solid edge in every device pixel it covers. Where the svg's own pixel grid starts in
    // the capture is found from the two rails, whose pixel columns and rows are known.
    const rail = (horizontal) => g.segs.filter((r) => r.kind === "axis" && r.horizontal === horizontal).sort((a, b) => (b.to - b.from) - (a.to - a.from))[0];
    const start = (r) => {
      for (const along of [0.1, 0.2, 0.35, 0.65, 0.8, 0.9].map((f) => r.from + (r.to - r.from) * f)) {
        const base = Math.floor(((r.horizontal ? g.top : g.left) + r.at - (r.horizontal ? clip.y : clip.x)) * scale);
        const fixed = Math.floor(((r.horizontal ? g.left : g.top) + along - (r.horizontal ? clip.x : clip.y)) * scale);
        const hits = [];
        for (let k = -3 * scale; k <= 3 * scale; k++) { const p = r.horizontal ? px(fixed, base + k) : px(base + k, fixed); if (near(p, colour.axis, 8)) hits.push(base + k); }
        if (hits.length === scale && hits.at(-1) - hits[0] === scale - 1) return hits[0] - Math.floor(r.at) * scale;
      }
      return null;
    };
    const origin = g.corners.length ? { x: start(rail(false)), y: start(rail(true)) } : null;
    if (origin && (origin.x === null || origin.y === null)) out.push({ kind: "corner", ok: false, n: 0, contrast: 0, note: "rails not found" });
    for (const [x, y] of origin && origin.x !== null && origin.y !== null ? g.corners : []) {
      if (!g.covers.every((t) => x + 1 < t.l || x > t.r || y + 1 < t.t || y > t.b)) continue;
      const X = origin.x + x * scale, Y = origin.y + y * scale;
      const cells = [];
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) cells.push(px(X + i, Y + j));
      out.push({ kind: "corner", at: y, along: x, ok: cells.every((p) => near(p, colour.brackets, 8)), n: cells.length,
        contrast: +Math.min(...cells.map((p) => ratio(p, ground))).toFixed(2), px: cells.map((p) => p.join(",")) });
    }
    return out;
  };
  const chartLines = async (page, scale, tok, where, kinds) => {
    const g = await page.evaluate(chartGeometry);
    const clip = { x: Math.floor(g.left) - 4, y: Math.floor(g.top) - 4, width: Math.ceil(g.width) + 8, height: Math.ceil(g.height) + 8 };
    const res = await page.evaluate(chartAnalyse, [(await page.screenshot({ clip })).toString("base64"), tok, g, clip, scale]);
    for (const kind of kinds) invariant(res.some((r) => r.kind === kind), `${where}: no ${kind} line could be measured`);
    const bad = res.filter((r) => !r.ok || (["axis", "brackets", "corner", "cross"].includes(r.kind) && r.contrast < 3));
    invariant(bad.length === 0, `${where}: chart lines not whole-pixel or below 3:1 ${JSON.stringify(bad.slice(0, 4))}`);
  };
  for (const theme of THEMES) for (const scale of [1, 2]) {
    await withPage({ theme, route: "/simulations/traffic-simulator", scale }, async (page) => {
      const at = `${theme} /simulations/traffic-simulator @${scale}x`;
      const tok = {}; for (const n of ["--surface-1", "--surface-2", "--edge", "--signal", "--coolant", "--fg", "--fg-muted"]) tok[n] = await tokenRgb(page, n);
      await page.getByLabel("Playback").selectOption("16");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.waitForFunction(() => (document.querySelector(".traffic-chart-line")?.getAttribute("d").match(/[HL]/g) ?? []).length >= 4, null, { timeout: 30000 });
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const svg = page.locator(".traffic-chart svg");
      await svg.scrollIntoViewIfNeeded(); await frames(page);
      const d = await page.locator(".traffic-chart-line").getAttribute("d");
      invariant(/^M\d+,\d+(H\d+V\d+)+$/.test(d), `${at}: the throughput line is not sample-and-hold ${d.slice(0, 80)}`);
      const inspecting = () => page.evaluate(() => [".traffic-chart-cross", ".traffic-chart-brackets", ".traffic-chart-node", ".traffic-chart-tooltip"].map((s) => document.querySelectorAll(s).length));
      invariant((await inspecting()).every((n) => n === 0), `${at}: inspect marks shown at rest`);
      await chartLines(page, scale, tok, `${at} at rest`, ["axis", "line", "demand"]);
      // §05: the demand line is the only coolant mark (in Mono coolant becomes fg, so the check runs in hue themes).
      if (theme !== "mono") {
        const hued = await page.evaluate((coolant) => [...document.querySelectorAll(".traffic-container *")].filter((e) => { const c = getComputedStyle(e);
          return [c.color, c.backgroundColor, c.borderTopColor, c.fill, c.stroke].includes(coolant) && !e.matches(".traffic-chart-demand"); })
          .map((e) => `${e.tagName}.${e.getAttribute("class")}`), tok["--coolant"]);
        invariant(hued.length === 0, `${at}: coolant outside the demand line ${JSON.stringify(hued.slice(0, 4))}`);
      }
      // Inspect: the pointer on the plot.
      const panel = () => page.locator(".traffic-chart").evaluate((e) => [getComputedStyle(e.closest(".traffic-charts")).backgroundColor, getComputedStyle(e).backgroundColor, getComputedStyle(e.querySelector("svg")).backgroundColor]);
      const ground = await panel();
      const box = await svg.boundingBox();
      await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2); await frames(page);
      invariant((await inspecting()).every((n) => n === 1), `${at}: inspecting shows ${JSON.stringify(await inspecting())} (measuring line, brackets, node, readout)`);
      invariant(JSON.stringify(await panel()) === JSON.stringify(ground), `${at}: the ground changed while inspecting`);
      const readout = await page.locator(".traffic-chart-tooltip").evaluate((e) => { const c = getComputedStyle(e);
        return { bg: c.backgroundColor, border: `${c.borderTopStyle} ${c.borderTopColor}`, values: [...e.querySelectorAll(".df-data")].map((v) => getComputedStyle(v).fontFamily.split(",")[0]),
          units: [...e.querySelectorAll(".df-label-sm")].map((u) => u.textContent), text: e.textContent }; });
      invariant(readout.bg === tok["--surface-2"] && readout.border === `solid ${tok["--edge"]}` && readout.values.length === 3 &&
        readout.values.every((f) => /IBM Plex Mono/.test(f)) && readout.units.includes("veh/h") && readout.units.includes("km/h") &&
        /^\d+ veh\/hat \d+:\d\d · mean \d+ km\/h$/.test(readout.text), `${at}: the readout ${JSON.stringify(readout)}`);
      await chartLines(page, scale, tok, `${at} inspecting`, ["axis", "line", "cross", "brackets", "corner"]);
      await page.mouse.move(0, 0); await frames(page);
      invariant((await inspecting()).every((n) => n === 0), `${at}: inspect marks stay after the pointer leaves`);
      // A column that starts at a fractional x (the two charts share the region three to two).
      await page.setViewportSize({ width: 1024, height: VIEW_H });
      await svg.scrollIntoViewIfNeeded(); await frames(page);
      await chartLines(page, scale, tok, `${at} 1024px`, ["axis", "line", "demand"]);
      // The readout stays inside the chart's box (and so the panel and the viewport) wherever the pointer inspects, on a
      // phone and on a wide screen; it is placed on whole pixels, without a transform.
      for (const width of [320, 375, VIEW_W]) {
        await page.setViewportSize({ width, height: VIEW_H });
        await svg.evaluate((e) => e.scrollIntoView({ block: "center" })); await frames(page);
        const plot = await svg.boundingBox();
        const outside = [];
        for (let f = 0; f <= 1.0001; f += 0.05) {
          await page.mouse.move(plot.x + plot.width * Math.min(f, 0.999), plot.y + plot.height / 2); await frames(page);
          const r = await page.evaluate(() => { const t = document.querySelector(".traffic-chart-tooltip"); if (!t) return null;
            const a = t.getBoundingClientRect(), c = t.parentElement.getBoundingClientRect();
            return { inChart: a.left >= c.left - 0.5 && a.right <= c.right + 0.5, inView: a.left >= -0.5 && a.right <= innerWidth + 0.5,
              transform: getComputedStyle(t).transform, left: t.style.left }; });
          if (r && !(r.inChart && r.inView && r.transform === "none" && /^-?\d+px$/.test(r.left))) outside.push({ f: +f.toFixed(2), ...r });
        }
        invariant(outside.length === 0, `${at} ${width}px: the readout leaves the chart ${JSON.stringify(outside.slice(0, 3))}`);
        await page.mouse.move(0, 0); await frames(page);
      }
      await page.setViewportSize({ width: VIEW_W, height: VIEW_H });
      // Keyboard: the chart takes no focus (no keyboard inspection existed before); its data table opens from the keyboard.
      invariant(await svg.evaluate((e) => !e.hasAttribute("tabindex") && e.tabIndex < 0), `${at}: the chart became focusable`);
      const summary = page.locator(".traffic-chart .traffic-table > summary");
      await summary.focus(); await page.keyboard.press("Enter"); await frames(page);
      const latch = await summary.evaluate((e) => ({ open: e.parentElement.open, control: e.matches(".df-control.df-control--latch.df-label"), lamp: getComputedStyle(e, "::after").backgroundColor }));
      invariant(latch.open && latch.control && latch.lamp === tok["--signal"], `${at}: the data table's latch from the keyboard ${JSON.stringify(latch)}`);
      // The time-space table's disclosure (creative-owned markup, styled from the page) shows the same latch.
      const slow = page.locator(".traffic-table:has(.traffic-slow-table) > summary");
      // Enter on it shows the Pressed inverse while the key is down, as on any control.
      await slow.focus(); await page.keyboard.down("Enter");
      const pressed = await slow.evaluate((e) => ({ attr: e.hasAttribute("data-df-pressed"), bg: getComputedStyle(e).backgroundColor }));
      await page.keyboard.up("Enter");
      await slow.evaluate((e) => new Promise((done) => { const tick = () => (e.hasAttribute("data-df-pressed") ? requestAnimationFrame(tick) : done()); tick(); }));
      invariant(pressed.attr && pressed.bg === tok["--signal"], `${at}: Enter on the time-space table's disclosure ${JSON.stringify(pressed)}`);
      const slowLatch = await slow.evaluate((e) => ({ open: e.parentElement.open, border: `${getComputedStyle(e).borderTopStyle} ${getComputedStyle(e).borderTopColor}`,
        lamp: getComputedStyle(e, "::after").backgroundColor }));
      invariant(slowLatch.open && slowLatch.border === `solid ${tok["--edge"]}` && slowLatch.lamp === tok["--signal"], `${at}: the time-space table's latch ${JSON.stringify(slowLatch)}`);
      // Voices.
      const voices = await page.evaluate(() => {
        const fam = (e) => e && getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "");
        const q = (s) => document.querySelector(s);
        return { legend: fam(q(".traffic-legend-name")),
          // The ranges keep the Machine voice's case and spacing (the label class sits on the band names only).
          rangeCase: [...document.querySelectorAll(".traffic-legend-range")].every((e) => getComputedStyle(e).textTransform === "none" && getComputedStyle(e).letterSpacing === "normal"), range: fam(q(".traffic-legend-range")), th: fam(q(".traffic-chart th")), td: fam(q(".traffic-chart td")),
          slowTh: fam(q(".traffic-slow-table th")), slowTd: fam(q(".traffic-slow-table td")), slowSummary: fam(q(".traffic-table:has(.traffic-slow-table) > summary")),
          tick: fam(q(".traffic-chart-tick")), freeFlow: [...document.querySelectorAll(".traffic-metrics dd .df-label-sm")].filter((e) => /free flow/.test(e.textContent)).map(fam),
          // Each swatch is square and shows its held ramp colour.
          swatches: [...document.querySelectorAll(".traffic-swatch")].map((e, i) => { const r = e.getBoundingClientRect(); const p = document.createElement("i");
            p.style.color = `var(--traffic-speed-${i})`; e.append(p); const held = getComputedStyle(p).color; p.remove();
            return [r.width === r.height, getComputedStyle(e).backgroundColor === held]; }) };
      });
      invariant(voices.legend === "Archivo Narrow" && voices.range === "IBM Plex Mono" && voices.rangeCase && voices.th === "Archivo Narrow" && voices.td === "IBM Plex Mono" &&
        voices.slowTh === "Archivo Narrow" && voices.slowTd === "IBM Plex Mono" && voices.slowSummary === "Archivo Narrow" && voices.tick === "IBM Plex Mono" &&
        voices.freeFlow.length === 1 && voices.freeFlow[0] === "Archivo Narrow",
        `${at}: voices ${JSON.stringify({ ...voices, swatches: undefined })}`);
      invariant(voices.swatches.length === 5 && voices.swatches.every(([square, held]) => square && held), `${at}: legend swatches ${JSON.stringify(voices.swatches)}`);
    });
  }

  // Phase 5 Task 4 (§13 Confirmed; §12 reduced motion): a success toast (Settings → Reset) is Confirmed (the › marker) and
  // keeps no type icon (its one icon is Close). Its time-left bar reports the time left with and without reduced motion:
  // it has shrunk a while after the toast appears, and the toast is removed when its exit ends.
  for (const reducedMotion of ["reduce", "no-preference"]) {
    await withPage({ theme: "dark", route: "/", reducedMotion }, async (page) => {
      await openResetDialog(page);
      await page.locator(".modal-content").getByRole("button", { name: "Reset", exact: true }).click();
      const toast = page.locator(".toast");
      await toast.waitFor();
      invariant(await toast.evaluate((e) => e.matches(".df-confirmed") && getComputedStyle(e, "::before").content.startsWith('"›"') &&
        e.querySelectorAll("svg").length === 1), `${reducedMotion}: the success toast is not Confirmed, or keeps its type icon`);
      const left = () => page.locator(".toast-progress").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
      const first = await left();
      await page.waitForTimeout(1500);
      const later = await left();
      invariant(later < first && later > 0, `${reducedMotion}: the time-left bar went from ${first} to ${later}`);
      await toast.waitFor({ state: "detached" });
    });
  }
  // Phase 5 Task 5 (§13 Processing; §12 Scan, reduced form; §08 overlay panel; owner loading decisions 2026-10-21): the
  // Home action whose route chunk is held waits behind the loader. On the frame it turns busy the action keeps its label
  // and shows the busy signature in place of Disabled. The loader carries LOADING and its plain message in a polite status
  // region, and mm:ss outside it, from the moment it is inserted; the count rises by whole seconds, no faster, and starts
  // again at 00:00 on the next load. Under reduced motion no cell travels and the word stands alone. Once the chunk
  // arrives the loader leaves with ease-depart (no leave under reduced motion) and is gone.
  for (const theme of THEMES) for (const reducedMotion of ["reduce", "no-preference"]) {
    await withPage({ theme, route: "/", reducedMotion }, async (page) => {
      const where = `${theme} ${reducedMotion} loader`;
      let release;
      const held = new Promise((done) => { release = done; });
      await page.route("**/assets/CaseStudies-*.js", async (r) => { await held; await r.continue(); });
      const t = {}; for (const n of ["--edge", "--fg-muted", "--fg-faint", "--surface-2"]) t[n] = await tokenRgb(page, n);
      const action = page.locator(".hero-buttons .btn-primary");
      await action.scrollIntoViewIfNeeded();
      const label = await action.textContent();
      await action.evaluate((e) => {
        new MutationObserver(() => {
          if (e.getAttribute("aria-busy") !== "true" || window.dfBusy) return;
          // Read once the state change has settled, not mid-transition from the hover the click left.
          e.style.transition = "none";
          const s = getComputedStyle(e), a = getComputedStyle(e, "::after");
          window.dfBusy = { disabled: e.disabled, label: e.textContent, border: `${s.borderTopStyle} ${s.borderTopColor}`, fg: s.color, cursor: s.cursor,
            scan: a.content !== "none" && a.display !== "none" ? `${a.animationName} ${a.width} ${a.height} ${a.backgroundColor}` : "absent" };
          e.style.transition = "";
        }).observe(e, { attributes: true, attributeFilter: ["aria-busy"] });
        const root = document.getElementById("portal-root");
        window.dfLoader = []; window.dfLeave = [];
        new MutationObserver((records) => {
          for (const node of records.flatMap((r) => [...r.addedNodes])) {
            if (!(node instanceof HTMLElement) || !node.matches(".page-loader-overlay")) continue;
            const s = getComputedStyle(node);
            if (node.matches(".page-loader-overlay--leaving")) {
              window.dfLeave.push({ connected: node.isConnected, animation: `${s.animationName} ${s.animationTimingFunction}`, hidden: node.getAttribute("aria-hidden"),
                live: node.matches("[role], [aria-live]") || !!node.querySelector("[role], [aria-live]") });
            } else {
              const status = node.querySelector('.page-loader__status[role="status"][aria-live="polite"]');
              window.dfLoader.push({ word: node.querySelector(".page-loader__state")?.textContent, elapsed: node.querySelector(".page-loader__elapsed")?.textContent,
                message: node.querySelector(".loading-text")?.textContent, statusText: status?.textContent,
                timerOutside: !!status && !status.querySelector(".page-loader__elapsed") && node.querySelector(".page-loader__elapsed")?.getAttribute("role") === "timer",
                regions: node.querySelectorAll('[role="status"], [aria-live="polite"], [aria-live="assertive"]').length });
            }
          }
        }).observe(root, { childList: true });
      });
      await action.click();
      const overlay = page.locator(".page-loader-overlay:not(.page-loader-overlay--leaving)");
      await overlay.waitFor();
      const busy = await page.evaluate(() => window.dfBusy);
      // The cell travels the lower edge; under reduced motion there is none.
      const cell = await page.evaluate(() => { const p = document.createElement("i"); p.style.cssText = "display: block; width: var(--cell-w); height: var(--stroke-bold)";
        document.body.append(p); const s = getComputedStyle(p); const v = `${s.width} ${s.height}`; p.remove(); return v; });
      const scan = reducedMotion === "reduce" ? "absent" : `df-processing-scan ${cell} ${t["--fg-muted"]}`;
      invariant(busy && busy.disabled && busy.border === `solid ${t["--edge"]}` && busy.fg === t["--fg-muted"] && busy.cursor === "progress" && busy.scan === scan,
        `${where}: the waiting Home action is not busy (want scan ${scan}) ${JSON.stringify(busy)}`);
      invariant(!busy || busy.label === label, `${where}: the busy Home action changed its label (${label} -> ${busy?.label})`);
      const inserted = await page.evaluate(() => window.dfLoader[0]);
      invariant(inserted?.word === "LOADING" && inserted.elapsed === "00:00" && inserted.message === "Loading the page." &&
        inserted.statusText === "LOADINGLoading the page." && inserted.timerOutside && inserted.regions === 1,
        `${where}: inserted without its word, message, status region or counter ${JSON.stringify(inserted)}`);
      const look = () => overlay.evaluate((o) => {
        const q = (sel) => o.querySelector(sel), shown = (el) => !!el && el.checkVisibility();
        if (![".page-loader__state", ".page-loader__elapsed", ".loading-text", ".loader-content"].every(q)) return { missing: o.innerHTML };
        const panel = getComputedStyle(q(".loader-content"));
        return { glyph: getComputedStyle(q(".page-loader__state"), "::before").content, word: getComputedStyle(q(".page-loader__state")).color,
          elapsed: q(".page-loader__elapsed").textContent, counter: getComputedStyle(q(".page-loader__elapsed")).color,
          message: getComputedStyle(q(".loading-text")).color, panel: `${panel.backgroundColor} ${panel.borderTopStyle} ${panel.borderTopColor} ${panel.borderTopLeftRadius}`,
          scan: shown(q(".page-loader__scan")) ? getComputedStyle(q(".page-loader__scan")).animationName : "hidden",
          words: [...o.querySelectorAll(".df-label")].filter(shown).map((e) => e.textContent) };
      });
      const first = await look();
      if (first.missing) { invariant(false, `${where}: the loader lacks its word or counter ${first.missing}`); release(); return; }
      invariant(first.glyph.startsWith('"…"') && first.word === t["--fg-muted"] && first.counter === t["--fg-faint"] && first.message === t["--fg-muted"],
        `${where}: state word, counter or message ${JSON.stringify(first)}`);
      invariant(first.panel === `${t["--surface-2"]} solid ${t["--edge"]} 0px`, `${where}: panel ${first.panel}`);
      invariant((reducedMotion === "reduce" ? first.scan === "hidden" : first.scan === "page-loader-scan") && JSON.stringify(first.words) === '["LOADING"]',
        `${where}: scan ${first.scan}, words ${JSON.stringify(first.words)}`);
      await page.waitForTimeout(2200);
      const later = await look();
      const secs = (s) => { const [m, x] = s.split(":").map(Number); return m * 60 + x; };
      const rose = secs(later.elapsed) - secs(first.elapsed);
      invariant(rose >= 2 && rose <= 3, `${where}: in about 2.2 s the counter went from ${first.elapsed} to ${later.elapsed}`);
      release();
      await page.locator(".case-studies-page").waitFor();
      await page.locator(".page-loader-overlay").waitFor({ state: "detached" });
      const leave = await page.evaluate(() => window.dfLeave);
      const easeDepart = await page.evaluate(() => { const p = document.createElement("i"); p.style.animationTimingFunction = "var(--ease-depart)";
        document.body.append(p); const v = getComputedStyle(p).animationTimingFunction; p.remove(); return v; });
      // Under reduced motion the copy is removed as soon as it is placed (it has no leave to play).
      invariant(reducedMotion === "reduce" ? leave.every((l) => !l.connected) :
        leave.length === 1 && leave[0].connected && leave[0].animation === `page-loader-out ${easeDepart}` && leave[0].hidden === "true" && !leave[0].live,
        `${where}: leave ${JSON.stringify(leave)}`);
      // The next load starts its own count at 00:00, with the first message.
      let releaseNext;
      const heldNext = new Promise((done) => { releaseNext = done; });
      await page.route("**/assets/Projects-*.js", async (r) => { await heldNext; await r.continue(); });
      await page.evaluate(() => { history.pushState({}, "", "/projects"); dispatchEvent(new PopStateEvent("popstate")); });
      await overlay.waitFor();
      const next = await page.evaluate(() => window.dfLoader[1]);
      invariant(next?.elapsed === "00:00" && next.message === "Loading the page.", `${where}: the next load ${JSON.stringify(next)}`);
      releaseNext();
      await page.locator(".page-loader-overlay").waitFor({ state: "detached" });
    });
  }
  // Owner decision (2026-10-21): a long load replaces the message once at each threshold, with the counter counting on.
  // The clock is driven by the test. Each replacement changes the polite status region once; the counter's steps do not
  // touch it.
  await withPage({ theme: "dark", route: "/" }, async (page) => {
    await page.clock.install();
    await page.reload({ waitUntil: "networkidle" });
    let release;
    const held = new Promise((done) => { release = done; });
    await page.route("**/assets/CaseStudies-*.js", async (r) => { await held; await r.continue(); });
    await page.evaluate(() => {
      window.dfStatus = [];
      new MutationObserver(() => {
        const status = document.querySelector('.page-loader-overlay:not(.page-loader-overlay--leaving) [role="status"]');
        const text = status?.textContent ?? null;
        if (text !== null && window.dfStatus.at(-1) !== text) window.dfStatus.push(text);
      }).observe(document.getElementById("portal-root"), { childList: true, subtree: true, characterData: true });
    });
    await page.evaluate(() => { history.pushState({}, "", "/case-studies"); dispatchEvent(new PopStateEvent("popstate")); });
    const overlay = page.locator(".page-loader-overlay:not(.page-loader-overlay--leaving)");
    await overlay.waitFor();
    const at = async () => overlay.evaluate((o) => [o.querySelector(".page-loader__elapsed")?.textContent ?? null, o.querySelector(".loading-text")?.textContent ?? null]);
    const steps = [];
    for (const ms of [9000, 2000, 18000, 2000]) { await page.clock.runFor(ms); steps.push(await at()); }
    invariant(JSON.stringify(steps.map(([, m]) => m)) === JSON.stringify(["Loading the page.", "Still loading. This is taking longer than expected.",
      "Still loading. This is taking longer than expected.", "Still waiting for the page to load."]), `long wait: messages ${JSON.stringify(steps)}`);
    invariant(JSON.stringify(steps.map(([e]) => e)) === JSON.stringify(["00:09", "00:11", "00:29", "00:31"]), `long wait: counter ${JSON.stringify(steps)}`);
    const announced = await page.evaluate(() => window.dfStatus);
    invariant(JSON.stringify(announced) === JSON.stringify(["LOADINGLoading the page.", "LOADINGStill loading. This is taking longer than expected.",
      "LOADINGStill waiting for the page to load."]), `long wait: status region changes ${JSON.stringify(announced)}`);
    release();
    await page.clock.runFor(1000);
    await page.locator(".case-studies-page").waitFor();
  });
  // §13 Activation, the reset dialog's backdrop: a press that starts on the backdrop and is released over the dialog does
  // not close it; a press and release on the backdrop does.
  await withPage({ theme: "dark", route: "/" }, async (page) => {
    await openResetDialog(page);
    const box = await page.locator(".modal-content").boundingBox();
    await page.mouse.move(2, 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.up();
    await frames(page);
    invariant(await page.locator(".modal-content").count() === 1, "reset dialog closed by a press dragged from the backdrop onto the dialog");
    await page.mouse.click(2, 2);
    await page.locator(".modal-content").waitFor({ state: "detached" });
  });

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
  // signal boundary, node); the switch is a latch whose lamp shows On; sliders are direct manipulation (the value a solid
  // signal square riding an edge hairline, no fill) and step from the keyboard; controls disabled under reduced motion
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
      // Keyboard path (§13 Direct manipulation): an arrow key moves one step; Home and End jump to the minimum and maximum.
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
    // Disabled under reduced motion (§13 Disabled): focusable, a dashed edge boundary, the label in the faint tier, unchanged by hover and press,
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
  // Fix wave round 2 (§13 state model): a case-study link's › marker sits level with its label's first line, also where the
  // label wraps (the "Related: …" link wraps at the wide width). Hovered, each link's marker centre lies within the first line
  // of its label at a wide and a phone width.
  for (const width of [VIEW_W, 375]) {
    await withPage({ theme: THEMES[0], route: "/case-studies/where-the-specification-lived" }, async (page) => {
      if (width !== VIEW_W) { await page.setViewportSize({ width, height: 812 }); await frames(page); }
      const links = page.locator(".case-study-link:not(.disabled)");
      const n = await links.count();
      invariant(n > 0, `${width}px: no case-study link rendered`);
      let wrapped = 0;
      for (let i = 0; i < n; i++) {
        const link = links.nth(i);
        await link.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await frames(page);
        await link.hover(); await frames(page);
        const m = await link.evaluate((e) => {
          const label = e.querySelector("span"); const range = document.createRange(); range.selectNodeContents(label);
          const lines = [...range.getClientRects()]; const tops = new Set(lines.map((r) => Math.round(r.top)));
          const b = getComputedStyle(e, "::before"); const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
          const top = r.top + parseFloat(c.borderTopWidth) + parseFloat(b.top);
          return { text: label.textContent.trim().slice(0, 40), content: b.content, lines: tops.size, centre: top + parseFloat(b.height) / 2,
            first: { top: lines[0].top, bottom: lines[0].bottom } };
        });
        if (m.lines > 1) wrapped += 1;
        invariant(m.content.startsWith('"›"') && m.centre >= m.first.top && m.centre <= m.first.bottom,
          `${width}px case-study link "${m.text}" (${m.lines} lines): marker ${m.content} centre ${m.centre} outside the first line ${m.first.top}-${m.first.bottom}`);
      }
      if (width === VIEW_W) invariant(wrapped > 0, `${width}px: no case-study link wraps; the wrapped-link check no longer tests anything`);
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
  // Not Phase 3's on these routes: creative regions. Project media chrome is governed (Phase 5 Task 7) and checked here.
  const P3_SKIP = "[data-df-region]";
  // Phase 3 Task 16 (§03, §17): every visible governed corner is square. Native playfields and independent media
  // keep their own geometry until their assigned phase.
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
  // Fix wave (R1, §06): long control text uses the reading voice. The control and table text the fix wave moved out of the
  // label voice (heading links in the table of contents, the editorial note's summary, case-study links, the comparison
  // table's caption and row headers, the section rail's tooltips) renders in the Narrator family, as written (no case
  // transform) and without the label's tracking. The static test names the same elements in markup; the editorial note is
  // the provenance region's last disclosure.
  const READING = [
    { route: "/writing/the-machine-should-explain-itself", selectors: [".article-toc a", ".article-provenance > details:last-of-type > summary"] },
    { route: "/case-studies/where-the-specification-lived", selectors: [".case-study-link > span:first-child", ".case-study-comparison caption",
      ".case-study-comparison tbody th", ".dot-tooltip"] },
    { route: "/case-studies/erebus", selectors: [".case-study-link.disabled > span"] },
  ];
  for (const { route, selectors } of READING) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      const seen = await page.evaluate((sels) => sels.map((sel) => {
        const all = [...document.querySelectorAll(sel)];
        const off = all.map((e) => { const c = getComputedStyle(e); return { text: e.textContent.trim().slice(0, 40), family: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), transform: c.textTransform, tracking: c.letterSpacing }; })
          .filter((v) => v.family !== "Archivo" || v.transform !== "none" || v.tracking !== "normal");
        return { sel, n: all.length, off };
      }), selectors);
      for (const { sel, n, off } of seen) {
        invariant(n > 0, `${route}: ${sel} not rendered; the reading-voice check no longer tests it`);
        invariant(off.length === 0, `${route}: ${sel} not in the reading voice ${JSON.stringify(off.slice(0, 6))}`);
      }
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
    // Fix wave (§06): the summary's meta line is Narrator text in the case it was written in, untracked; only its label is uppercase.
    const meta = await prompt.locator(".case-study-prompt__meta").evaluate((el) => { const c = getComputedStyle(el);
      return { transform: c.textTransform, tracking: c.letterSpacing, family: c.fontFamily.split(",")[0].replace(/["']/g, "").trim() }; });
    invariant(meta.transform === "none" && meta.tracking === "normal" && meta.family === "Archivo", `case-study prompt meta ${JSON.stringify(meta)}`);
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
  // Phase 4 Task 2 (§18; r1/SPEC.md §1–§2; D5 ruling): the registered symbol, uncontained, one colour per theme, clear space kept.
  const R1_PATH = (await readFile(new URL("../src/assets/darkfield/darkfield-r1-symbol-currentcolor.svg", import.meta.url), "utf8")).match(/\sd="([^"]+)"/)[1];
  const markCheck = (page) => page.evaluate((d) => {
    const host = document.querySelector(".site-header__brand-mark"), svg = host?.querySelector("svg"), p = svg?.querySelector("path");
    if (!p || svg.querySelectorAll("path").length !== 1) return ["no single registered path"];
    const out = [], root = document.documentElement, brand = host.closest(".site-header__brand"), header = host.closest(".site-header");
    if (p.getAttribute("d") !== d) out.push("path differs from the registered file");
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(root).getPropertyValue(root.dataset.theme === "light" ? "--fg" : "--signal");
    document.body.append(probe); const want = getComputedStyle(probe).color; probe.remove();
    if (getComputedStyle(svg).color !== want || getComputedStyle(p).fill !== want) out.push(`colour ${getComputedStyle(p).fill} != ${want}`);
    const painted = (el) => { const c = getComputedStyle(el);
      return c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.backgroundImage !== "none" || c.boxShadow !== "none" || c.filter !== "none" || c.clipPath !== "none" ||
        (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) ||
        ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none"); };
    for (let el = p; el && el !== header; el = el.parentElement) if (painted(el)) out.push(`container on ${el.tagName}.${el.getAttribute("class")}`);
    const size = parseFloat(getComputedStyle(brand).getPropertyValue("--df-mark-size")), clear = parseFloat(getComputedStyle(brand).getPropertyValue("--df-mark-clear"));
    const r = svg.getBoundingClientRect();
    if (r.width !== size || r.height !== size || !Number.isInteger(r.width)) out.push(`size ${r.width}x${r.height} != ${size}`);
    // Pixel crispness is checked on the painted pixels (markPaint below), not on this geometry.
    const zone = { l: r.left - clear, t: r.top - clear, rt: r.right + clear, b: r.bottom + clear };
    const h = header.getBoundingClientRect(), hc = getComputedStyle(header);
    if (zone.l < h.left + parseFloat(hc.borderLeftWidth) || zone.t < h.top + parseFloat(hc.borderTopWidth) || zone.b > h.bottom - parseFloat(hc.borderBottomWidth)) out.push("clear space crosses the header boundary");
    for (const el of header.querySelectorAll("*")) {
      if (el === host || host.contains(el) || el.contains(host) || !el.checkVisibility()) continue;
      const b = el.getBoundingClientRect();
      if (b.width && b.height && b.left < zone.rt && b.right > zone.l && b.top < zone.b && b.bottom > zone.t) out.push(`${el.tagName}.${el.getAttribute("class")} inside clear space`);
    }
    return out;
  }, R1_PATH);
  // The I2 rule beneath the link where the wordmark is hidden, and the mark against the header's ground.
  const brandRule = (page) => page.evaluate(() => {
    const brand = document.querySelector(".site-header__brand"), a = getComputedStyle(brand, "::after");
    return { bg: a.backgroundColor, top: parseFloat(a.top), left: parseFloat(a.left), height: brand.getBoundingClientRect().height,
      clear: parseFloat(getComputedStyle(brand).getPropertyValue("--df-mark-clear")) };
  });
  const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const MARK_VIEWS = [{ route: "/" }, { route: "/projects" }, { route: "/", width: 1181, height: 900 }, { route: "/", width: 767, height: 900 },
    { route: "/", width: 375, height: 812 }, { route: "/", width: 1181, height: 900, scale: 2 }, { route: "/", width: 375, height: 812, scale: 2 }];
  // Pixel crispness (r1/SPEC.md §1; Phase 4 Task 2 ruling): the mark as painted in the header equals the same registered
  // markup rendered at a whole-pixel origin with the same size, colour and ground, pixel for pixel. Layout positions alone do
  // not say what is painted, so the pixels are compared. Each image is cut to the pixels that differ from its ground.
  const markPaint = async (page) => {
    const pad = 4;
    const at = await page.evaluate(() => { const r = document.querySelector(".site-header__brand-mark svg").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const clip = (x, y) => ({ x: Math.floor(x) - pad, y: Math.floor(y) - pad, width: Math.ceil(at.w) + 2 * pad + 1, height: Math.ceil(at.h) + 2 * pad + 1 });
    const painted = await page.screenshot({ clip: clip(at.x, at.y), animations: "disabled" });
    await page.evaluate(({ w, h }) => {
      const svg = document.querySelector(".site-header__brand-mark svg"), ref = document.createElement("div");
      ref.id = "df-mark-reference";
      ref.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;width:${w + 16}px;height:${h + 16}px;` +
        `background:${getComputedStyle(document.querySelector(".site-header")).backgroundColor};color:${getComputedStyle(svg).color}`;
      ref.innerHTML = svg.outerHTML;
      Object.assign(ref.firstElementChild.style, { position: "absolute", left: "8px", top: "8px", width: `${w}px`, height: `${h}px`, display: "block" });
      document.body.append(ref);
    }, at);
    const reference = await page.screenshot({ clip: clip(8, 8), animations: "disabled" });
    await page.evaluate(() => document.getElementById("df-mark-reference").remove());
    return decoder.evaluate(async (images) => {
      const cut = async (data) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const { data: px, width, height } = context.getImageData(0, 0, image.width, image.height);
        const ground = px.slice(0, 4).join();
        let [l, t, r, b] = [width, height, -1, -1];
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          if (px.slice((y * width + x) * 4, (y * width + x) * 4 + 4).join() === ground) continue;
          [l, t, r, b] = [Math.min(l, x), Math.min(t, y), Math.max(r, x), Math.max(b, y)];
        }
        const rows = [];
        for (let y = t; y <= b; y++) rows.push(px.slice((y * width + l) * 4, (y * width + r + 1) * 4).join());
        return { size: `${r - l + 1}x${b - t + 1}`, rows };
      };
      const [painted, reference] = await Promise.all(images.map(cut));
      const differing = painted.rows.length === reference.rows.length ? painted.rows.filter((row, i) => row !== reference.rows[i]).length : null;
      return { equal: painted.size === reference.size && differing === 0, painted: painted.size, reference: reference.size, differing };
    }, [painted.toString("base64"), reference.toString("base64")]);
  };
  const PAINT_VIEWS = [[1440, 900], [1181, 900], [768, 900], [767, 900], [375, 812], [320, 812]];
  for (const theme of [...new Set([...THEMES, "mono"])]) for (const [width, height] of PAINT_VIEWS) for (const scale of [1, 2, 3]) {
    await withPage({ theme, route: "/", scale }, async (page) => {
      await page.setViewportSize({ width, height }); await page.reload({ waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready); await frames(page);
      const seen = await markPaint(page);
      invariant(seen.equal, `${theme} / ${width}px ${scale}x: the painted mark differs from the reference render ${JSON.stringify(seen)}`);
    });
  }
  for (const theme of [...new Set([...THEMES, "mono"])]) for (const view of MARK_VIEWS) {
    await withPage({ theme, route: view.route, scale: view.scale }, async (page) => {
      if (view.width) { await page.setViewportSize({ width: view.width, height: view.height }); await page.reload({ waitUntil: "networkidle" }); }
      await page.evaluate(() => document.fonts.ready);
      const where = `${theme} ${view.route} ${view.width ?? VIEW_W}px ${view.scale ?? 1}x`;
      const t = { "--fg-muted": await tokenRgb(page, "--fg-muted"), "--signal": await tokenRgb(page, "--signal") };
      const ground = await page.evaluate(() => getComputedStyle(document.querySelector(".site-header")).backgroundColor);
      const fill = await page.evaluate(() => getComputedStyle(document.querySelector(".site-header__brand-mark path")).fill);
      const opaque = !/rgba\(.*,\s*(0?\.\d+|0)\)$/.test(ground);
      invariant(opaque, `${where}: header ground ${ground} is not opaque; the mark's contrast cannot be read from it (stop and report)`);
      if (opaque) { const [hi, lo] = [lum(fill), lum(ground)].sort((a, b) => b - a);
        invariant((hi + 0.05) / (lo + 0.05) >= 3, `${where}: mark ${fill} on header ${ground} below 3:1`); }
      const name = page.locator(".site-header__brand-name");
      const wordmark = await name.evaluate((e) => e.checkVisibility());
      const target = wordmark ? name : page.locator(".site-header__brand-mark");
      const states = [];
      states.push(["rest", await markCheck(page), wordmark ? null : await brandRule(page)]);
      const box = await target.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await frames(page);
      invariant(await page.locator(".site-header__brand").evaluate((e) => e.matches(":hover")), `${where}: the brand link is not hovered`);
      states.push(["hover", await markCheck(page), wordmark ? null : await brandRule(page)]);
      await page.mouse.down(); await frames(page);
      states.push(["pressed", await markCheck(page), wordmark ? null : await brandRule(page)]);
      await page.mouse.move(0, 0); await page.mouse.up(); await frames(page);
      invariant(new URL(page.url()).pathname.replace(/\/$/, "") === view.route.replace(/\/$/, ""), `${where}: a press released away navigated to ${page.url()}`);
      for (const [state, failures] of states) invariant(failures.length === 0, `${where} ${state}: mark ${JSON.stringify(failures)}`);
      if (!wordmark) {
        const want = { rest: "rgba(0, 0, 0, 0)", hover: t["--fg-muted"], pressed: t["--signal"] };
        for (const [state, , rule] of states) invariant(rule.bg === want[state] && Math.abs(rule.top - rule.height) < 0.01 && Math.abs(rule.left - rule.clear) < 0.01,
          `${where} ${state}: the rule beneath the mark ${JSON.stringify(rule)}, want ${want[state]}`);
      }
    });
  }
  // Phase 4 Task 3 (§18 favicon containment; r1/SPEC.md §3; P4-8, P4-9): theme-color holds the active theme's field, and the
  // web manifest and every icon it names are served.
  for (const theme of [...new Set([...THEMES, "mono"])]) {
    await withPage({ theme, route: "/" }, async (page) => {
      const seen = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        metas: document.querySelectorAll('meta[name="theme-color"]').length,
        content: document.querySelector('meta[name="theme-color"]')?.content.toLowerCase(),
        field: getComputedStyle(document.documentElement).getPropertyValue("--field").trim().toLowerCase(),
      }));
      invariant(seen.theme === theme && seen.metas === 1 && seen.field !== "" && seen.content === seen.field,
        `${theme} /: theme-color ${JSON.stringify(seen)} does not hold the theme's field`);
      if (theme !== "dark") return;
      const response = await page.request.get(`${base}/manifest.webmanifest`);
      invariant(response.status() === 200, `manifest.webmanifest not served (${response.status()})`);
      let manifest = null;
      try { manifest = JSON.parse(await response.text()); } catch { invariant(false, "manifest.webmanifest does not parse"); }
      invariant(Array.isArray(manifest?.icons) && manifest.icons.length > 0, "manifest.webmanifest names no icons");
      for (const icon of manifest?.icons ?? []) {
        const served = await page.request.get(new URL(icon.src, `${base}/`).href);
        invariant(served.status() === 200, `${icon.src} not served (${served.status()})`);
      }
    });
  }
  // Phase 5 (§03, §06): on each listed route, governed elements outside creative regions have square corners and a
  // Darkfield family. P5_NATIVE: native elements outside any region (they host controls or governed labels).
  const P5_ROUTES = ["/darkfield-404-probe", "/procedural-animations", "/procedural-animations/mechanical-time", "/case-studies/aether", "/simulations",
    "/simulations/orbital-simulator", "/simulations/traffic-simulator", "/terminal"];
  const P5_NATIVE = [];
  const P5_FAMILIES = ["Archivo", "Archivo Narrow", "IBM Plex Mono"];
  for (const theme of THEMES) {
    for (const route of P5_ROUTES) {
      await withPage({ theme, route }, async (page) => {
        const bad = await page.evaluate(([skip, families]) => {
          const out = new Set();
          for (const el of document.querySelectorAll("body *")) {
            if (!el.getClientRects().length || el.closest("[data-df-region], svg") || el.matches("img, video, canvas, iframe") || (skip && el.closest(skip))) continue;
            const c = getComputedStyle(el);
            if ([c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].some((r) => r !== "0px")) out.add(`radius ${el.tagName}.${el.classList[0] ?? ""}`);
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            const family = c.fontFamily.split(",")[0].replace(/["']/g, "").trim();
            if (own && !families.includes(family)) out.add(`family ${el.tagName}.${el.classList[0] ?? ""} ${family}`);
          }
          return [...out].slice(0, 12);
        }, [P5_NATIVE.join(", "), P5_FAMILIES]);
        invariant(bad.length === 0, `${theme} ${route}: ${JSON.stringify(bad)}`);
      });
    }
  }
  // Phase 5 Task 12 (§07 The cell; §06 Hierarchy and voices; §13 control model; P5-7). /terminal, route intro: the heading
  // and its description lie wholly inside the viewport and nothing is drawn over them (the window, the site header), at a
  // wide and a phone width, in every theme Mono included. The intro ignores the pointer, so it is made hit-testable while
  // it is sampled.
  for (const theme of [...new Set([...THEMES, "mono"])]) for (const [width, height] of [[VIEW_W, VIEW_H], [375, 812]]) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      await page.setViewportSize({ width, height }); await page.locator("input.command-input").waitFor();
      await frames(page); await page.waitForTimeout(250); await frames(page);
      const covered = await page.evaluate(() => {
        const intro = document.querySelector(".terminal-route-intro"), out = [];
        const win = document.querySelector(".terminal-container").getBoundingClientRect();
        intro.style.pointerEvents = "auto";
        for (const el of [intro.querySelector("h1"), intro.querySelector("p")]) {
          const r = el.getBoundingClientRect();
          if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) out.push(`${el.tagName} outside the viewport ${JSON.stringify(r)}`);
          if (win.left < r.right && r.left < win.right && win.top < r.bottom && r.top < win.bottom) out.push(`${el.tagName} meets the window ${JSON.stringify([r.bottom, win.top])}`);
          const range = document.createRange(); range.selectNodeContents(el);
          for (const box of range.getClientRects()) for (let i = 0; i <= 8; i++) for (let j = 0; j <= 2; j++) {
            const x = box.left + 1 + ((box.width - 2) * i) / 8, y = box.top + 1 + ((box.height - 2) * j) / 2;
            const hit = document.elementFromPoint(x, y);
            if (!hit || !(hit === el || el.contains(hit))) out.push(`${el.tagName} at ${Math.round(x)},${Math.round(y)} under ${hit?.className}`);
          }
        }
        intro.style.pointerEvents = "";
        return out.slice(0, 6);
      });
      invariant(covered.length === 0, `${theme} /terminal ${width}px: the route intro is covered or cut ${JSON.stringify(covered)}`);
    });
  }
  // The cell grid: after Phase 3 Task 21's command set, every run of the transcript and the prompt is set in the bundled
  // mono face, one cell tall per row with no letter-spacing; every glyph it shows, the box-drawing set and the prompt
  // mark advance exactly one cell; every character sits at its column's cell (so ls -l columns and help indents line
  // up) and every row on a whole number of cells from the first; the input starts on a cell.
  for (const theme of THEMES) for (const width of [VIEW_W, 375]) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      if (width !== VIEW_W) { await page.setViewportSize({ width, height: VIEW_H }); await frames(page); }
      const input = page.locator("input.command-input"); await input.waitFor();
      for (const command of ["help", "ls -l", "nosuchcommand", "grep terminal projects/web/README.md"]) { await input.fill(command); await input.press("Enter"); }
      await page.locator(".grep-highlight").first().waitFor(); await frames(page);
      const off = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement), out = [];
        const cellW = parseFloat(root.getPropertyValue("--cell-w")), cellH = parseFloat(root.getPropertyValue("--cell-h"));
        const body = document.querySelector(".terminal-body");
        const runs = [...body.querySelectorAll(".terminal-message, .history-line, .prompt-symbol, input.command-input")];
        for (const e of runs) {
          const c = getComputedStyle(e), family = c.fontFamily.split(",")[0].replace(/["']/g, "").trim();
          if (family !== "IBM Plex Mono" || parseFloat(c.lineHeight) !== cellH || !(c.letterSpacing === "normal" || parseFloat(c.letterSpacing) === 0))
            out.push(`metrics .${e.classList[0]} ${family} ${c.lineHeight} ${c.letterSpacing}`);
        }
        const probe = document.createElement("div"); probe.className = "history-line df-glyph";
        probe.style.cssText = "position: absolute; visibility: hidden; white-space: pre;";
        const span = probe.appendChild(document.createElement("span")); body.append(probe);
        const glyphs = new Set([...body.innerText.replace(/\s/g, ""), ..."┌─┬┐│├┼┤└┴┘┏━┳┓┃┣╋┫┗┻┛╔═╦╗║╠╬╣╚╩╝┄┆╌╎›·…—"]);
        for (const g of glyphs) {
          span.textContent = g.repeat(40); const advance = span.getBoundingClientRect().width / 40;
          if (Math.abs(advance - cellW) > 0.005) out.push(`advance ${g} U+${g.codePointAt(0).toString(16)} ${advance}`);
        }
        probe.remove();
        const content = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.left + parseFloat(c.borderLeftWidth) + parseFloat(c.paddingLeft); };
        const left = content(body), range = document.createRange();
        let first = null;
        for (const e of body.querySelectorAll(".terminal-message, .history-line, .prompt-symbol")) {
          const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          let col = 0, top = null;
          for (let n = walker.nextNode(); n; n = walker.nextNode()) for (let i = 0; i < n.data.length; i++) {
            if (n.data[i] === "\n") { col = 0; top = null; continue; }
            range.setStart(n, i); range.setEnd(n, i + 1);
            const r = range.getClientRects()[0];
            if (!r) continue;
            if (top !== null && Math.abs(r.top - top) > 0.5) col = 0;
            top = r.top; first ??= r.top;
            const rows = (r.top - first) / cellH;
            if (Math.abs(r.left - (left + col * cellW)) > 0.05 || Math.abs(rows - Math.round(rows)) > 0.01) {
              out.push(`cell .${e.classList[0]} "${n.data.slice(Math.max(0, i - 8), i + 8)}" col ${col} at ${r.left - left},${r.top - first}`); break;
            }
            col += 1;
          }
        }
        const cols = (content(document.querySelector("input.command-input")) - left) / cellW;
        if (Math.abs(cols - Math.round(cols)) > 0.01) out.push(`input starts between cells: ${cols}`);
        return out.slice(0, 8);
      });
      invariant(off.length === 0, `${theme} /terminal ${width}px: off the cell grid ${JSON.stringify(off)}`);
    });
  }
  // P5-7: the window controls show their accessible names as their labels, with the same words, in the order close,
  // minimise, maximise, which is also their keyboard order; and they still restore, maximise, minimise, reopen and close.
  for (const theme of THEMES) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      const input = page.locator("input.command-input"); await input.waitFor();
      const named = () => page.evaluate(() => [...document.querySelectorAll(".terminal-header button")]
        .map((b) => [b.classList[1], b.textContent.trim(), b.getAttribute("aria-label"), b.getAttribute("title")]));
      const want = (max) => JSON.stringify([["close", "Close terminal", "Close terminal", null], ["minimize", "Minimize terminal", "Minimize terminal", null],
        ["maximize", max, max, null]]);
      invariant(JSON.stringify(await named()) === want("Maximize terminal"), `${theme} /terminal: window controls ${JSON.stringify(await named())}`);
      await input.focus();
      const order = [];
      for (let i = 0; i < 3; i++) { await page.keyboard.press("Shift+Tab"); order.push(await page.evaluate(() => document.activeElement?.textContent.trim())); }
      invariant(JSON.stringify(order) === JSON.stringify(["Maximize terminal", "Minimize terminal", "Close terminal"]), `${theme} /terminal: keyboard order ${JSON.stringify(order)}`);
      const max = () => page.locator(".terminal-container").evaluate((e) => e.classList.contains("maximized"));
      await page.getByRole("button", { name: "Maximize terminal", exact: true }).click(); await frames(page);
      invariant((await max()) && JSON.stringify(await named()) === want("Restore terminal"), `${theme} /terminal: Maximize did not maximise ${JSON.stringify(await named())}`);
      await page.getByRole("button", { name: "Restore terminal", exact: true }).click(); await frames(page);
      invariant(!(await max()), `${theme} /terminal: Restore did not restore`);
      await page.getByRole("button", { name: "Minimize terminal", exact: true }).click();
      await page.locator(".terminal-sidecar").waitFor();
      invariant((await page.locator(".terminal-container").count()) === 0, `${theme} /terminal: Minimize left the window open`);
      await page.locator(".terminal-sidecar").click(); await page.locator(".terminal-container").waitFor();
      await page.getByRole("button", { name: "Close terminal", exact: true }).click();
      await page.waitForFunction(() => location.pathname === "/", null, { timeout: 5000 }).catch(() => invariant(false, `${theme} /terminal: Close did not leave the terminal`));
    });
  }
  // Short and narrow viewports (Task 12 review I-1): the window always shows at least its floor of transcript rows
  // (--terminal-floor-rows, a site constant). Its header and controls lie wholly inside it and it never scrolls, at
  // rest, after focus and after output. The route intro is either wholly visible and uncovered, or clipped away whole
  // (the window has risen over it) while staying in the accessibility tree: never partly covered. Drag, maximise and
  // restore still work. Each size is a fresh load at that size.
  const SHORT = [[1440, 900], [1024, 500], [844, 390], [667, 375], [568, 320], [640, 300], [375, 667], [320, 568], [320, 256]];
  const windowCheck = (page) => page.evaluate(() => {
    const out = [], box = document.querySelector(".terminal-container"), body = box.querySelector(".terminal-body"), header = box.querySelector(".terminal-header");
    const c = getComputedStyle(box), b = getComputedStyle(body), w = box.getBoundingClientRect();
    const floor = parseFloat(c.getPropertyValue("--terminal-floor-rows")), cell = parseFloat(c.getPropertyValue("--cell-h"));
    const rows = (body.clientHeight - parseFloat(b.paddingTop) - parseFloat(b.paddingBottom)) / cell;
    if (!(floor > 0) || rows < floor) out.push(`rows ${rows.toFixed(2)} below the floor ${floor}`);
    if (box.scrollTop !== 0) out.push(`window scrolled ${box.scrollTop}`);
    for (const e of [header, ...box.querySelectorAll(".terminal-button")]) {
      const r = e.getBoundingClientRect();
      if (r.top < w.top - 0.5 || r.left < w.left - 0.5 || r.bottom > w.bottom + 0.5 || r.right > w.right + 0.5 || r.bottom > innerHeight + 0.5 || r.top < -0.5)
        out.push(`.${e.classList[0]}${e.classList[1] ? "." + e.classList[1] : ""} outside the window ${JSON.stringify([r.top, r.bottom, w.top, w.bottom])}`);
    }
    const intro = document.querySelector(".terminal-route-intro"), h1 = intro.querySelector("h1");
    if (getComputedStyle(intro).clipPath === "inset(50%)") {
      const s = getComputedStyle(h1);
      if (s.display === "none" || s.visibility !== "visible" || h1.closest("[aria-hidden='true'], [hidden], [inert]")) out.push("hidden intro left the accessibility tree");
    } else {
      intro.style.pointerEvents = "auto";
      for (const el of [h1, intro.querySelector("p")]) {
        const r = el.getBoundingClientRect(), tag = el.tagName.toLowerCase();
        if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) out.push(`${tag} cut by the viewport ${JSON.stringify([r.top, r.bottom])}`);
        if (w.left < r.right && r.left < w.right && w.top < r.bottom && r.top < w.bottom) out.push(`${tag} partly covered by the window ${JSON.stringify([r.bottom, w.top])}`);
        const range = document.createRange(); range.selectNodeContents(el);
        for (const t of range.getClientRects()) for (let i = 0; i <= 8; i++) for (let j = 0; j <= 2; j++) {
          const x = t.left + 1 + ((t.width - 2) * i) / 8, y = t.top + 1 + ((t.height - 2) * j) / 2;
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          if (!hit || !(hit === el || el.contains(hit))) { out.push(`${tag} at ${Math.round(x)},${Math.round(y)} under ${hit?.className}`); break; }
        }
      }
      intro.style.pointerEvents = "";
    }
    return out.slice(0, 6);
  });
  for (const theme of THEMES) for (const [width, height] of SHORT) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      const at = `${theme} /terminal ${width}x${height}`;
      await page.setViewportSize({ width, height }); await page.reload({ waitUntil: "networkidle" });
      const input = page.locator("input.command-input"); await input.waitFor(); await frames(page); await page.waitForTimeout(250); await frames(page);
      invariant((await windowCheck(page)).length === 0, `${at} at rest: ${JSON.stringify(await windowCheck(page))}`);
      await input.focus(); await input.fill("help"); await input.press("Enter"); await frames(page); await page.waitForTimeout(150);
      invariant((await windowCheck(page)).length === 0, `${at} after help: ${JSON.stringify(await windowCheck(page))}`);
      // Dragged up as far as it goes: it stops at the clamp, header and controls still inside.
      const title = await page.locator(".terminal-title").boundingBox();
      await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2); await page.mouse.down();
      await page.mouse.move(title.x + title.width / 2, 1, { steps: 6 }); await page.mouse.up(); await frames(page);
      const dragged = await windowCheck(page);
      const top = await page.locator(".terminal-container").evaluate((e) => e.getBoundingClientRect().top);
      const site = await page.evaluate(() => document.querySelector(".site-header").getBoundingClientRect().bottom);
      invariant(dragged.length === 0 && top >= site - 1, `${at} dragged up: ${JSON.stringify(dragged)} top ${top} site header ${site}`);
      await page.getByRole("button", { name: "Maximize terminal", exact: true }).click(); await frames(page);
      invariant(await page.locator(".terminal-container").evaluate((e) => e.classList.contains("maximized")), `${at}: Maximize did not maximise`);
      await page.getByRole("button", { name: "Restore terminal", exact: true }).click(); await frames(page);
      invariant(!(await page.locator(".terminal-container").evaluate((e) => e.classList.contains("maximized"))), `${at}: Restore did not restore`);
    });
  }
  // A live resize across the header's layout step (the site header changes height, so the page below it moves after the
  // resize event): the window follows the intro's new place, and the checks above hold once the resize has settled, in
  // both directions.
  for (const theme of THEMES) for (const [from, to] of [[[844, 390], [667, 375]], [[667, 375], [844, 390]], [[800, 600], [700, 400]], [[700, 400], [800, 600]]]) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      await page.setViewportSize({ width: from[0], height: from[1] }); await page.reload({ waitUntil: "networkidle" });
      await page.locator("input.command-input").waitFor(); await frames(page); await page.waitForTimeout(250);
      await page.setViewportSize({ width: to[0], height: to[1] }); await frames(page); await page.waitForTimeout(400); await frames(page);
      const seen = await windowCheck(page);
      invariant(seen.length === 0, `${theme} /terminal resized ${from.join("x")} -> ${to.join("x")}: ${JSON.stringify(seen)}`);
    });
  }
  // The three controls stay on one row at phone widths. A label too long for its control wraps between its words inside
  // it, the control is at least three cells tall, and on hover the › marker ends where the label's first line begins
  // (P3_CONTROLS checks single-line labels; its phone check runs at 500px, where the labels fit on one line).
  for (const theme of THEMES) for (const width of [375, 320]) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      await page.setViewportSize({ width, height: 812 }); await page.reload({ waitUntil: "networkidle" });
      await page.locator(".terminal-button").first().waitFor(); await frames(page);
      const row = await page.evaluate(() => { const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h"));
        return [...document.querySelectorAll(".terminal-button")].map((e) => { const r = e.getBoundingClientRect();
          return { top: Math.round(r.top), h: r.height, min: 3 * cell, fits: e.scrollWidth <= e.clientWidth + 0.5, words: e.textContent.trim() }; }); });
      invariant(new Set(row.map((r) => r.top)).size === 1 && row.every((r) => r.h >= r.min - 0.5 && r.fits), `${theme} /terminal ${width}px: controls ${JSON.stringify(row)}`);
      for (let i = 0; i < 3; i++) {
        const el = page.locator(".terminal-button").nth(i);
        await page.mouse.move(0, 0); await frames(page);
        const first = () => el.evaluate((e) => { const text = [...e.childNodes].find((n) => n.nodeType === 3 && n.data.trim());
          const r = document.createRange(); const start = text.data.search(/\S/); r.setStart(text, start); r.setEnd(text, start + 1);
          const before = getComputedStyle(e, "::before"), c = r.getBoundingClientRect();
          const probe = document.createElement("span"); e.prepend(probe);
          const marker = probe.getBoundingClientRect().left - parseFloat(before.marginRight); probe.remove();
          return { left: c.left, top: c.top, marker, content: before.content }; });
        const rest = await first();
        await el.hover(); await frames(page);
        const hover = await first();
        invariant(hover.content.startsWith('"›"') && Math.abs(hover.left - rest.left) <= 0.5 && Math.abs(hover.top - rest.top) <= 0.5 && Math.abs(hover.marker - hover.left) <= 0.5,
          `${theme} /terminal ${width}px: control ${i} hover marker ${JSON.stringify({ rest, hover })}`);
      }
    });
  }
  // Phase 5 Task 13 (P5-8; §17 Composite recipes, Cursor; §12 What may repeat, Reduced motion by class; §16 Terminal
  // cosplay). While the command input has focus there is exactly one block cursor: a flare cell with the character under
  // it in on-flare, on the caret's cell (its column measured from the text itself, not from the formula the component
  // uses), on the input's row, and inside the input's field. The browser caret is transparent; the focus ring stays.
  // A selected range shows no block. Blurred, there is none. Reverse search uses the same block. Under reduced motion it
  // does not animate; otherwise it blinks on the blink token with the step easing. Glow only in Dark.
  for (const theme of THEMES) for (const width of [VIEW_W, 375]) {
    await withPage({ theme, route: "/terminal" }, async (page) => {
      const at = `${theme} /terminal ${width}px cursor`;
      if (width !== VIEW_W) { await page.setViewportSize({ width, height: VIEW_H }); await frames(page); }
      const input = page.locator("input.command-input"); await input.waitFor(); await frames(page);
      const state = () => page.evaluate(() => {
        const probe = (prop, token) => { const p = document.createElement("i"); p.style[prop] = `var(${token})`; document.body.append(p); const v = getComputedStyle(p)[prop]; p.remove(); return v; };
        const cursors = [...document.querySelectorAll(".terminal-cursor")].filter((e) => e.getClientRects().length);
        const field = document.activeElement;
        if (!cursors.length) return { count: 0, focused: field?.classList.contains("command-input") ?? false };
        const el = cursors[0], c = getComputedStyle(el), r = el.getBoundingClientRect(), f = field.getBoundingClientRect();
        const cellW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-w"));
        // The caret's x, measured: the text before it set in the input's own font, less the input's scroll.
        const m = document.createElement("span"); m.className = "df-glyph"; m.style.cssText = "position: absolute; visibility: hidden; white-space: pre;";
        m.textContent = field.value.slice(0, field.selectionStart); document.body.append(m);
        const caretX = f.left + parseFloat(getComputedStyle(field).paddingLeft) + m.getBoundingClientRect().width - field.scrollLeft; m.remove();
        return { count: cursors.length, bg: c.backgroundColor, fg: c.color, flare: probe("backgroundColor", "--flare"), onFlare: probe("color", "--on-flare"),
          glow: c.boxShadow, glowToken: probe("boxShadow", "--glow-flare"), w: r.width, h: r.height, cellW, cellH: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h")),
          // Inside the input's border box, so never over its focus ring.
          left: r.left, caretX, top: r.top, fieldTop: f.top, fieldH: f.height, inField: r.left >= f.left - 0.5 && r.right <= f.right + 0.5 && r.bottom <= f.bottom + 0.5,
          glyph: el.textContent, under: field.value ? (field.value[field.selectionStart] ?? "") : field.placeholder[0], caret: getComputedStyle(field).caretColor,
          ring: getComputedStyle(field).boxShadow, ringToken: probe("boxShadow", "--focus-ring"), animations: el.getAnimations().length,
          start: field.selectionStart, scroll: field.scrollLeft, aria: el.getAttribute("aria-hidden") };
      });
      const placed = async (where) => {
        const s = await state();
        invariant(s.count === 1, `${at} ${where}: ${s.count} visible cursors`);
        if (s.count !== 1) return s;
        invariant(s.bg === s.flare && s.fg === s.onFlare && Math.abs(s.w - s.cellW) < 0.01 && Math.abs(s.h - s.cellH) < 0.01 && s.aria === "true",
          `${at} ${where}: block fill, ink, size or aria-hidden wrong ${JSON.stringify(s)}`);
        invariant(Math.abs(s.left - s.caretX) <= 0.5 && Math.abs(s.top - s.fieldTop) <= 0.5 && s.inField && s.glyph === s.under,
          `${at} ${where}: block off the caret's cell ${JSON.stringify(s)}`);
        invariant(s.caret === "rgba(0, 0, 0, 0)" && s.ring === s.ringToken && s.animations === 0 && s.glow === (theme === "dark" ? s.glowToken : "none"),
          `${at} ${where}: caret, focus ring, animation or glow ${JSON.stringify(s)}`);
        return s;
      };
      await input.focus();
      await placed("empty (placeholder)");
      // A long command that scrolls the input: end, start, a middle column, then Home and End.
      const long = `echo ${"0123456789abcdef".repeat(12)}`;
      await input.fill(long); await frames(page);
      const end = await placed("end of a long input");
      invariant(end.start === long.length && end.scroll > 0, `${at}: the long input did not scroll ${JSON.stringify([end.start, end.scroll])}`);
      await page.keyboard.press("Home"); await frames(page);
      const home = await placed("Home");
      invariant(home.start === 0 && home.scroll === 0, `${at}: Home ${JSON.stringify([home.start, home.scroll])}`);
      for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
      await frames(page); await placed("middle");
      await page.keyboard.press("End"); await frames(page); await placed("End");
      // The block follows the caret while a key is still down (between keydown and keyup), including a held repeat.
      const held = async (key, where, repeats = 0) => {
        await page.keyboard.down(key); for (let i = 0; i < repeats; i++) await page.keyboard.down(key);
        await frames(page); const s = await placed(`${where} (key still down)`); await page.keyboard.up(key); await frames(page); return s;
      };
      await held("ArrowLeft", "ArrowLeft");
      await held("Home", "Home");
      await held("ArrowRight", "ArrowRight held", 5);
      await held("End", "End");
      // A resize re-places the block (the input's scroll changes with its width).
      await page.setViewportSize({ width: width - 40, height: VIEW_H }); await frames(page); await frames(page);
      await placed("after a resize");
      await page.setViewportSize({ width, height: VIEW_H }); await frames(page); await frames(page);
      await placed("after resizing back");
      // The user's own horizontal scroll (a wheel over the focused input) is kept, never snapped back to the caret; the
      // block is hidden while its cell is out of view and returns on the next caret move.
      {
        const box = await input.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        const before = await input.evaluate((e) => e.scrollLeft);
        await page.mouse.wheel(-200, 0); await frames(page); await page.waitForTimeout(100); await frames(page);
        const after = await input.evaluate((e) => e.scrollLeft); await page.waitForTimeout(200); await frames(page);
        const kept = await input.evaluate((e) => e.scrollLeft);
        invariant(after < before && kept === after, `${at}: the user's scroll was undone ${JSON.stringify([before, after, kept])}`);
        invariant((await state()).count === 0, `${at}: a block while its cell is scrolled out of view`);
        await page.keyboard.press("ArrowLeft"); await frames(page); await placed("caret move after the user's scroll");
        await page.keyboard.press("End"); await frames(page);
      }
      // A 155-character command, at its end: the block stays inside the input's box.
      await input.fill(`echo ${"x".repeat(150)}`); await page.keyboard.press("End"); await frames(page);
      await placed("end of a 155-character command");
      // A selected range: the selection band shows, no block; collapsing it brings the block back.
      await page.keyboard.press("Shift+Home"); await frames(page);
      invariant((await state()).count === 0, `${at}: a block while a range is selected`);
      await page.keyboard.press("End"); await frames(page); await placed("after the selection collapsed");
      await input.evaluate((e) => e.blur()); await frames(page);
      invariant((await state()).count === 0, `${at}: a block while blurred`);
      await input.focus(); await frames(page); await placed("refocused");
      // Reverse search: the same block in the search input.
      await input.fill("help"); await input.press("Enter"); await frames(page);
      await page.keyboard.press("Control+r"); await page.locator("input.reverse-search-input").waitFor(); await frames(page);
      await placed("reverse search, empty");
      await page.keyboard.type("he"); await frames(page);
      const rs = await placed("reverse search, typed");
      invariant(rs.start === 2, `${at}: reverse search caret ${rs.start}`);
    });
  }
  // Without reduced motion the block blinks: one animation on the blink token, on for its first half and off for its
  // second, switched by the step easing.
  await withPage({ theme: "dark", route: "/terminal", reducedMotion: "no-preference" }, async (page) => {
    const input = page.locator("input.command-input"); await input.waitFor(); await input.focus(); await frames(page);
    const blink = await page.evaluate(() => {
      const el = document.querySelector(".terminal-cursor"), [a] = el.getAnimations();
      if (!a) return { animations: 0 };
      const token = getComputedStyle(document.documentElement).getPropertyValue("--dur-blink").trim();
      const half = parseFloat(token) * (/ms$/.test(token) ? 1 : 1000);
      a.pause(); const at = (t) => { a.currentTime = t; return getComputedStyle(el).opacity; };
      return { animations: el.getAnimations().length, name: a.animationName, duration: a.effect.getTiming().duration, half,
        easing: getComputedStyle(el).animationTimingFunction, on: [at(1), at(half - 1)], off: [at(half + 1), at(2 * half - 1)] };
    });
    invariant(blink.animations === 1 && blink.name === "terminal-cursor-blink" && blink.duration === 2 * blink.half && /steps\(1(, end)?\)/.test(blink.easing) &&
      blink.on.every((o) => o === "1") && blink.off.every((o) => o === "0"), `dark /terminal: the cursor blink ${JSON.stringify(blink)}`);
  });
  // Phase 5 Task 6 (§13 Focus; DEV-5): keyboard entry into a framed piece shows the focus ring inside the frame's edges;
  // leaving by Shift+Tab removes it; a click into the piece shows none. The piece still receives its own keys. On a phone
  // the bar's controls keep their ring inside the viewport, icon-only Fullscreen is at least three cells wide, and the
  // title wraps instead of losing letters.
  const PIECES = ["mechanical-time", "descent", "observing", "one-quiet-day"];
  const pieceReady = (page) => page.waitForFunction(() => { const f = document.querySelector("iframe.animation-piece__frame");
    return f?.contentDocument?.readyState === "complete" && /piece\.html$/.test(f.contentWindow.location.pathname); });
  const inFrame = () => document.activeElement?.tagName === "IFRAME";
  const ringOf = (page) => page.evaluate(() => {
    const main = document.querySelector(".animation-piece"), frame = document.querySelector(".animation-piece__frame");
    const a = getComputedStyle(main, "::after"), f = frame.getBoundingClientRect();
    const probe = document.createElement("i"); probe.style.boxShadow = "var(--focus-ring)"; document.body.append(probe);
    const token = getComputedStyle(probe).boxShadow; probe.remove();
    const spread = Math.max(...[...token.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1])));
    return { on: main.hasAttribute("data-frame-focus"), shadow: a.boxShadow, token, spread, events: a.pointerEvents,
      margins: ["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(a[`margin${s}`])), width: parseFloat(a.width), height: parseFloat(a.height), frame: [f.width, f.height],
      inView: f.left >= -0.5 && f.top >= document.querySelector(".animation-piece__bar").getBoundingClientRect().bottom - 0.5 && f.right <= innerWidth + 0.5 && f.bottom <= innerHeight + 0.5 };
  });
  const enter = async (page) => { for (let i = 0; i < 6 && !(await page.evaluate(inFrame)); i++) await page.keyboard.press("Tab"); return page.evaluate(inFrame); };
  const ringShown = async (page, where) => {
    const r = await ringOf(page);
    invariant(r.on && r.shadow === r.token && r.events === "none", `${where}: no focus ring on keyboard entry ${JSON.stringify(r)}`);
    // Drawn inside the frame: inset on every side by at least the ring's outer spread and sized to the frame less the
    // insets, so the whole ring lies on the frame; the frame lies inside the viewport, so no side is clipped.
    invariant(r.margins.every((m) => m >= r.spread) && Math.abs(r.width - (r.frame[0] - r.margins[1] - r.margins[3])) <= 1 &&
      Math.abs(r.height - (r.frame[1] - r.margins[0] - r.margins[2])) <= 1 && r.inView, `${where}: ring not wholly inside the frame and viewport ${JSON.stringify(r)}`);
  };
  const ringOff = async (page, where) => invariant(!(await ringOf(page)).on, `${where}`);
  const clickFrame = async (page) => { const box = await page.locator("iframe.animation-piece__frame").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await frames(page); await page.waitForTimeout(100); };
  for (const theme of THEMES) for (const slug of PIECES) {
    const route = `/procedural-animations/${slug}`, at = `${theme} ${route}`;
    // Entry by Tab, the piece's own keys, exit by Shift+Tab; then entry again and exit forward by Tab.
    await withPage({ theme, route }, async (page) => {
      await pieceReady(page);
      invariant(await enter(page), `${at}: Tab never reached the piece`);
      await ringShown(page, `${at} 1440px`);
      const got = await page.evaluate(() => { const w = document.querySelector("iframe.animation-piece__frame").contentWindow; w.dfKeys = 0;
        w.addEventListener("keydown", () => { w.dfKeys += 1; }, true); return true; });
      await page.keyboard.press("ArrowRight");
      invariant(got && (await page.frameLocator("iframe.animation-piece__frame").locator("body").evaluate(() => window.dfKeys)) > 0, `${at}: the piece did not receive a key`);
      for (let i = 0; i < 12 && (await page.evaluate(inFrame)); i++) { await page.keyboard.press("Shift+Tab"); await frames(page); }
      invariant(!(await page.evaluate(inFrame)), `${at}: Shift+Tab never left the piece`);
      await ringOff(page, `${at}: ring not removed after Shift+Tab out of the piece`);
    });
    await withPage({ theme, route }, async (page) => {
      await pieceReady(page);
      invariant(await enter(page), `${at}: Tab never reached the piece`);
      for (let i = 0; i < 20 && (await page.evaluate(inFrame)); i++) { await page.keyboard.press("Tab"); await frames(page); }
      invariant(!(await page.evaluate(inFrame)), `${at}: Tab never left the piece forward`);
      await ringOff(page, `${at}: ring not removed after Tab out of the piece`);
    });
    // Mouse: a click into the piece shows no ring; a click after keyboard entry clears it.
    await withPage({ theme, route }, async (page) => {
      await pieceReady(page);
      await clickFrame(page);
      invariant(await page.evaluate(inFrame), `${at}: a click did not focus the piece`);
      await ringOff(page, `${at}: ring shown after a click into the piece`);
    });
    await withPage({ theme, route }, async (page) => {
      await pieceReady(page);
      invariant(await enter(page), `${at}: Tab never reached the piece`);
      await ringShown(page, `${at} 1440px before a click`);
      await clickFrame(page);
      await ringOff(page, `${at}: ring kept after a click following keyboard entry`);
    });
    // Fullscreen from the keyboard: no ring while the piece is fullscreen; leaving it, the ring returns, because the
    // piece still holds keyboard focus.
    await withPage({ theme, route }, async (page) => {
      await pieceReady(page);
      const fs = page.locator("button.animation-piece__control");
      if (!(await fs.count())) return;
      for (let i = 0; i < 4 && !(await fs.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.fullscreenElement?.tagName === "IFRAME");
      await frames(page);
      await ringOff(page, `${at}: ring shown in fullscreen`);
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.fullscreenElement); await frames(page);
      invariant(await page.evaluate(inFrame), `${at}: focus left the piece on leaving fullscreen`);
      await ringShown(page, `${at} after fullscreen`);
    });
  }
  // The ring is whole at each width (no side clipped by the viewport or the bar).
  for (const theme of THEMES) for (const [width, height] of [[1440, 900], [768, 1024], [375, 812], [320, 640]]) for (const slug of PIECES) {
    const route = `/procedural-animations/${slug}`;
    await withPage({ theme, route }, async (page) => {
      await page.setViewportSize({ width, height }); await frames(page); await pieceReady(page);
      invariant(await enter(page), `${theme} ${route} ${width}px: Tab never reached the piece`);
      await ringShown(page, `${theme} ${route} ${width}px`);
    });
  }
  for (const width of [320, 375, 390]) for (const slug of PIECES) {
    const route = `/procedural-animations/${slug}`;
    await withPage({ theme: THEMES[0], route }, async (page) => {
      await page.setViewportSize({ width, height: 812 }); await frames(page); await pieceReady(page);
      const seen = await page.evaluate(() => { const t = document.querySelector(".animation-piece__title"), de = document.documentElement;
        const cell = parseFloat(getComputedStyle(de).getPropertyValue("--cell-h"));
        const fs = document.querySelector("button.animation-piece__control")?.getBoundingClientRect();
        // Lines of the title: wrapping happens between words only, so there are never more lines than words.
        const range = document.createRange(); range.selectNodeContents(t);
        const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        const words = t.textContent.trim().split(/\s+/).length;
        const tr = t.getBoundingClientRect();
        const overlaps = [...document.querySelectorAll(".animation-piece__control")].some((c) => { const r = c.getBoundingClientRect();
          return r.left < tr.right - 0.5 && tr.left < r.right - 0.5 && r.top < tr.bottom - 0.5 && tr.top < r.bottom - 0.5; });
        return { cut: t.scrollWidth > t.clientWidth + 0.5 || getComputedStyle(t).whiteSpace === "nowrap", pageX: de.scrollWidth > de.clientWidth,
          lines, words, overlaps, fullscreen: fs ? [fs.width, fs.height, 3 * cell] : null }; });
      invariant(!seen.cut && !seen.pageX && seen.lines <= seen.words && !seen.overlaps, `${route} ${width}px: title cut, broken inside a word or over a control, or page overflows ${JSON.stringify(seen)}`);
      invariant(!seen.fullscreen || (seen.fullscreen[0] >= seen.fullscreen[2] - 0.5 && seen.fullscreen[1] >= seen.fullscreen[2] - 0.5),
        `${route} ${width}px: Fullscreen below three cells ${JSON.stringify(seen.fullscreen)}`);
      // Each bar control's focus ring stays inside the viewport.
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press("Tab"); await frames(page);
        const ring = await page.evaluate(() => { const e = document.activeElement; if (!e?.matches(".animation-piece__control")) return null;
          const r = e.getBoundingClientRect(); const spread = Math.max(...[...getComputedStyle(e).boxShadow.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1])));
          return [r.top - spread, r.left - spread, r.right + spread, innerWidth]; });
        if (!ring) continue;
        invariant(ring[0] >= 0 && ring[1] >= 0 && ring[2] <= ring[3], `${route} ${width}px: control focus ring clipped by the viewport ${JSON.stringify(ring)}`);
      }
    });
  }
}

await browser.close();
console.log(`UNCOVERED pairs (not rendered on any listed route): ${[...uncovered].join(", ") || "none"}`);
console.log(`TEXTLESS pairs (rendered, no text run to measure; colours checked by P3_CONTROLS): ${[...textless].join(", ") || "none"}`);

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
