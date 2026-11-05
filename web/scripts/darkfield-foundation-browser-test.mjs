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
import { boxMask, chroma, DEFAULT_TOLERANCE, deltaE76, EXCLUDED, IDLE_ALLOWED, LIVE_READOUTS, MEASURE_NATIVE, MONO_DEVIATION_SCOPE, MONO_DEVIATIONS, MONO_ROUNDING, monoChromaThreshold, nativeOwnBoxes, nativeSubtreeBoxes, P5_GOVERNED_IN_NATIVE, P5_NATIVE, P5_NATIVE_GROUND, PAGE_PREDICATES, parseTokenColours, srgbToLab } from "./darkfield-measure-lib.mjs";
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
// Phase 6 Task 5 (P6-7): every article and every procedural piece is a route too, read from the data files, so a new
// essay or piece joins the test without an edit here. Aliases (/work, /games/*) are not added.
// Articles: the top-level entries of articlesData sit at four spaces; nested series objects sit deeper and repeat
// article slugs (and carry the series slug, which is not a route). The slug count must equal the entry count, so a
// format change or a repeated slug fails rather than dropping a route.
const SLUG_ROUTES = await (async () => {
  const source = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const articles = await source("../src/data/generated/articles.ts");
  const block = articles.slice(articles.indexOf("export const articlesData"), articles.indexOf("\n];", articles.indexOf("export const articlesData")));
  const entries = (block.match(/^ {2}\{$/gm) ?? []).length;
  const slugs = [...new Set([...block.matchAll(/^ {4}"slug": "([^"]+)"/gm)].map((m) => m[1]))];
  if (!entries || slugs.length !== entries) throw new Error(`articles.ts: ${slugs.length} distinct top-level slugs for ${entries} articlesData entries`);
  if (slugs.includes("agent-systems")) throw new Error("articles.ts: the series slug agent-systems was read as an article");
  const pieces = await source("../src/data/proceduralAnimations.ts");
  const pieceBlock = pieces.slice(pieces.indexOf("export const proceduralAnimationsData"));
  const pieceEntries = (pieceBlock.match(/^ {2}\{$/gm) ?? []).length;
  const pieceSlugs = [...new Set([...pieceBlock.matchAll(/^ {4}slug: "([^"]+)"/gm)].map((m) => m[1]))];
  if (!pieceEntries || pieceSlugs.length !== pieceEntries) throw new Error(`proceduralAnimations.ts: ${pieceSlugs.length} distinct slugs for ${pieceEntries} entries`);
  return [...slugs.map((slug) => `/writing/${slug}`), ...pieceSlugs.map((slug) => `/procedural-animations/${slug}`)];
})();
if (SLUG_ROUTES.some((route) => ROUTES.includes(route))) throw new Error("a slug route is already in ROUTES");
ROUTES.push(...SLUG_ROUTES);
// The procedural pieces' routes, each a page that shows its piece in an iframe (see withPage's client-side arrival).
const PIECE_ROUTES = SLUG_ROUTES.filter((route) => route.startsWith("/procedural-animations/"));
// DARKFIELD_ROUTE_SHARD=i/n (Phase 6 Task 5; 1 <= i <= n): this process runs the routes whose index in ROUTES is
// i - 1 modulo n, so the n shards are disjoint and together are ROUTES. Every page a check opens belongs to one route of
// ROUTES, its owner (withPage's owner, by default the route it loads): the check runs only in the shard that owns it,
// and so do the scope asserts (they compare the records of the routes that ran). Unset, the one shard is 1/1.
const SHARD = (() => {
  const raw = process.env.DARKFIELD_ROUTE_SHARD;
  if (raw === undefined) return { i: 1, n: 1 };
  const m = /^([1-9]\d*)\/([1-9]\d*)$/.exec(raw);
  if (!m || Number(m[1]) > Number(m[2])) throw new Error(`DARKFIELD_ROUTE_SHARD must be i/n with 1 <= i <= n, not "${raw}"`);
  return { i: Number(m[1]), n: Number(m[2]) };
})();
const owns = (route) => {
  const index = ROUTES.indexOf(route);
  if (index < 0) throw new Error(`${route} is not in ROUTES: name the route of ROUTES that owns the check`);
  return index % SHARD.n === SHARD.i - 1;
};
const SHARD_ROUTES = ROUTES.filter(owns);
console.log(`SHARD ${SHARD.i}/${SHARD.n} ROUTES ${JSON.stringify(SHARD_ROUTES)}`);
const SAMPLER_SELECTORS = ["main p", "main li", "h1", "h2", "h3", "a", "button", ".tech-tag"];
// Fill/text pairs whose ground the bridge changed (rule-level scan, 2026-10-11).
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
      // Phase 5 Task 22 (P5-4): the verbs are Disabled through aria-disabled (focusable), so either form counts.
      const off = '.annals-page aside .flex-wrap > button:is(:disabled, [aria-disabled="true"])';
      for (let year = 0; year < 3 && (await page.locator(off).count()); year++) await advance.click();
      if (await page.locator(off).count()) throw new Error("annals: verbs not enabled");
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
        // Phase 5 Task 22: a df-control shows the Pressed inverse on contact and holds it for dur-instant
        // (pressAcknowledge.ts); the state measured here is the Selected verb that persists after it.
        await control.evaluate((el) => new Promise((done) => { const wait = () => (el.hasAttribute("data-df-pressed") ? requestAnimationFrame(wait) : done()); wait(); }));
        await frames(page);
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

// owner (Phase 6 Task 5): the route of ROUTES the check belongs to, by default the route loaded. Outside this shard the
// page is not opened and run is not called.
const withPage = async ({ theme, route = "/", owner = route, javaScriptEnabled = true, forcedColors = "none", reducedMotion = "reduce", clock = false, routePass = false, scale = 1 }, run) => {
  if (!owns(owner)) return;
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
  // After a client-side arrival into a piece route, the piece's own frame: the network waits below use it.
  let pieceFrame = null;
  try {
    if (routePass && ARRIVE_FROM && ARRIVE_FROM !== route) {
      // The router follows popstate, so this is the client-side navigation a link would make.
      await page.goto(`${base}${ARRIVE_FROM}`, { waitUntil: "networkidle" });
      await page.evaluate((to) => { history.pushState({}, "", to); dispatchEvent(new PopStateEvent("popstate")); }, route);
      await page.waitForFunction((to) => location.pathname === to, route);
      // Playwright keeps the main frame's networkidle across a same-document navigation, so on most routes this
      // wait returns at once and the settle checks below carry the arrival. A piece route attaches its iframe
      // after the navigation: that clears the main frame's networkidle, and Playwright sets it again only after
      // another request of the main frame's own, which a piece route does not make, so the wait never ends
      // (R-5). There the arrival waits instead for what it needs: the iframe's own document loaded from its
      // source, then that frame network-idle.
      if (PIECE_ROUTES.includes(route)) {
        await page.waitForFunction(() => {
          const frame = document.querySelector("iframe.animation-piece__frame");
          return frame?.contentDocument?.readyState === "complete" && frame.contentWindow.location.pathname === new URL(frame.src).pathname;
        });
        pieceFrame = await (await page.$("iframe.animation-piece__frame")).contentFrame();
        await pieceFrame.waitForLoadState("networkidle");
      } else {
        await page.waitForLoadState("networkidle");
      }
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
      await (pieceFrame ?? page).waitForLoadState("networkidle");
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
// Ends a Snake game (Phase 5 Task 15). The board wraps at its edges, so only running into itself ends a game. From the
// first food on, each new food is placed one cell past the one being eaten, on its row (the reducer places it while the
// eaten one is still drawn), so the snake grows every tick; at five points it turns up, left and down into its own body.
// The placement replaces Math.random once the page's own start-up scripts have run, before the game mounts.
const endSnakeGame = async (page) => {
  await page.addInitScript(() => setTimeout(() => {
    const prev = Math.random; let row = null;
    Math.random = () => {
      const board = document.querySelector(".game-board"); const food = board?.querySelector(".food");
      if (!food) return prev();
      const w = Math.round(parseFloat(board.style.width) / 20), h = Math.round(parseFloat(board.style.height) / 20);
      if (row !== null) { const r = (row + 0.5) / h; row = null; return r; }
      row = Math.round(parseFloat(food.style.top) / 20);
      return ((Math.round(parseFloat(food.style.left) / 20) + 1) % w + 0.5) / w;
    };
  }, 0));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => /Score: ([5-9]|\d\d)/.test(document.querySelector(".game-score")?.textContent ?? ""), null, { timeout: 30000 });
  for (const key of ["ArrowUp", "ArrowLeft", "ArrowDown"]) await page.keyboard.press(key);
  await page.locator(".play-again-button").waitFor();
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
// Phase 6 Task 9 (Principle 6; §12 What may repeat, Reduced motion, by class; P6-5′): what still moves on a page left
// alone. With the pointer off the page, after a settle, it lists the running animations whose target (a pseudo-element's
// host) is rendered, each with its skip kind, null when governed: "region" inside [data-df-region], "excluded" inside the
// rest of EXCLUDED, "subtree" in a MEASURE_NATIVE subtree outside its governed-in carve-outs, "own" when the target is an
// "own" entry itself (its descendants count). Then two viewport screenshots a gap apart: the changed pixels outside every
// skipped box, grouped into boxes of touching cells with the element at each box's centre, and, beside them, what each
// skip kind removed. Skipped boxes are dilated as the lib's exclusion boxes are; a box is taken at both captures.
// idle ({ selector, whileFocused } rows) and live (selectors): each animation records the idle row its target matches
// (Element.matches), with whether each row's whileFocused element holds focus at each capture; changed pixels inside the
// boxes of elements matching a row count as "idle" or "live", not "governed". masked: the rendered governed leaves (no
// element child, or own text) in the viewport whose box lies at least half under a skip mask, so a mask hides nothing
// silently.
const MOTION_SETTLE_MS = 3000;
const MOTION_GAP_MS = 2000;
const MOTION_CELL = 8;
const motionProbe = async (page, { idle = [], live = [] } = {}) => {
  await page.mouse.move(-1, -1);
  await page.waitForTimeout(MOTION_SETTLE_MS);
  const look = () => page.evaluate(([src, native, governedIn, excluded, idleRows, liveRows]) => {
    const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
    const label = (el) => `${el.tagName}${el.id ? `#${el.id}` : ""}${[...el.classList].map((c) => `.${c}`).join("")}`;
    const shown = (el) => el.isConnected && el.checkVisibility({ visibilityProperty: true }) && el.getClientRects().length > 0;
    const kindOf = (el) => (el.closest("[data-df-region]") ? "region" : el.closest(excluded) ? "excluded"
      : subtreeExcluded(el, native, governedIn) ? "subtree" : ownPaintExcluded(el, native) ? "own" : null);
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const animations = document.getAnimations().filter((a) => a.playState === "running" && a.effect?.target).map((a) => {
      const el = a.effect.target;
      const timing = a.effect.getComputedTiming();
      return {
        selector: `${el.tagName.toLowerCase()}.${el.classList[0] ?? ""}`, label: `${label(el)}${a.effect.pseudoElement ?? ""}`,
        name: a.animationName ?? a.transitionProperty ?? (a.id || "(script)"), type: a.constructor.name,
        iterations: String(timing.iterations), duration: timing.duration, visible: shown(el), kind: kindOf(el), box: box(el),
        idle: idleRows.findIndex((row) => el.matches(row.selector)),
      };
    });
    const boxes = { region: [], excluded: [], subtree: [], subtreeGoverned: [], own: [], ownGoverned: [], idle: [], live: [] };
    for (const row of idleRows) for (const el of document.querySelectorAll(row.selector)) if (shown(el)) boxes.idle.push(box(el));
    for (const selector of liveRows) for (const el of document.querySelectorAll(selector)) if (shown(el)) boxes.live.push(box(el));
    const leaves = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!shown(el) || kindOf(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const b = box(el);
      if ((own || !el.childElementCount) && b.width > 0 && b.height > 0 && b.x < innerWidth && b.y < innerHeight && b.x + b.width > 0 && b.y + b.height > 0) leaves.push({ label: label(el), box: b });
    }
    for (const el of document.querySelectorAll("[data-df-region]")) if (shown(el)) boxes.region.push(box(el));
    for (const el of document.querySelectorAll(excluded)) if (shown(el) && !el.closest("[data-df-region]")) boxes.excluded.push(box(el));
    for (const entry of native) for (const el of document.querySelectorAll(entry.selector)) {
      if (!shown(el)) continue;
      if (entry.kind === "subtree") {
        for (const n of [el, ...el.querySelectorAll("*")]) {
          if (shown(n)) (governedIn.length && n.closest(governedIn.join(", ")) ? boxes.subtreeGoverned : boxes.subtree).push(box(n));
        }
      } else {
        boxes.own.push(box(el));
        for (const n of el.querySelectorAll("*")) if (shown(n)) boxes.ownGoverned.push(box(n));
      }
    }
    const active = document.activeElement && document.activeElement !== document.body ? label(document.activeElement) : null;
    const focus = idleRows.map((row) => !row.whileFocused || Boolean(document.activeElement?.matches(row.whileFocused)));
    return { animations, boxes, leaves, focus, active, hasFocus: document.hasFocus(), scrollY };
  }, [PAGE_PREDICATES, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE, EXCLUDED, idle, live]);
  const first = await look();
  const shot = () => page.screenshot({ animations: "allow", caret: "hide" });
  const before = await shot();
  const t0 = Date.now();
  await page.waitForTimeout(MOTION_GAP_MS);
  const after = await shot();
  const gap = Date.now() - t0;
  const second = await look();
  // Largest channel difference per pixel, row-major.
  const { width, height, delta } = await decoder.evaluate(async (pngs) => {
    const read = async (data) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height);
    };
    const [a, b] = await Promise.all(pngs.map(read));
    const out = new Uint8Array(a.width * a.height);
    for (let i = 0, p = 0; i < a.data.length; i += 4, p += 1) {
      out[p] = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    }
    let text = "";
    for (let i = 0; i < out.length; i += 0x8000) text += String.fromCharCode(...out.subarray(i, i + 0x8000));
    return { width: a.width, height: a.height, delta: btoa(text) };
  }, [before, after].map((png) => png.toString("base64")));
  const diff = Buffer.from(delta, "base64");
  const both = (key) => [...first.boxes[key], ...second.boxes[key]];
  const masks = [
    ["region", boxMask(nativeOwnBoxes(both("region"), []), width, height)],
    ["excluded", boxMask(nativeOwnBoxes(both("excluded"), []), width, height)],
    ["subtree", boxMask(nativeSubtreeBoxes(both("subtree"), both("subtreeGoverned")), width, height)],
    ["own", boxMask(nativeOwnBoxes(both("own"), both("ownGoverned")), width, height)],
    ["idle", boxMask(nativeOwnBoxes(both("idle"), []), width, height)],
    ["live", boxMask(nativeOwnBoxes(both("live"), []), width, height)],
  ];
  const skipKinds = ["region", "excluded", "subtree", "own"];
  const masked = first.leaves.flatMap(({ label, box }) => {
    const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y));
    const x1 = Math.min(width, Math.ceil(box.x + box.width)), y1 = Math.min(height, Math.ceil(box.y + box.height));
    const under = {};
    let area = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      area += 1;
      const kind = masks.find(([k, mask]) => skipKinds.includes(k) && mask[y * width + x])?.[0];
      if (kind) under[kind] = (under[kind] ?? 0) + 1;
    }
    const total = Object.values(under).reduce((n, v) => n + v, 0);
    return area && total * 2 >= area ? [{ label, kind: Object.entries(under).sort((a, b) => b[1] - a[1])[0][0] }] : [];
  });
  // Changed pixels by kind ("governed" when no skip covers them), grouped into boxes of 8-connected MOTION_CELL cells.
  const cols = Math.ceil(width / MOTION_CELL);
  const cells = new Map();
  for (let p = 0; p < diff.length; p += 1) {
    if (!diff[p]) continue;
    const kind = masks.find(([, mask]) => mask[p])?.[0] ?? "governed";
    const grid = cells.get(kind) ?? new Map();
    cells.set(kind, grid);
    const x = p % width, y = (p - x) / width, key = Math.floor(y / MOTION_CELL) * cols + Math.floor(x / MOTION_CELL);
    const cell = grid.get(key) ?? { x0: x, y0: y, x1: x, y1: y, pixels: 0, maxDelta: 0 };
    grid.set(key, cell);
    Object.assign(cell, { x0: Math.min(cell.x0, x), y0: Math.min(cell.y0, y), x1: Math.max(cell.x1, x), y1: Math.max(cell.y1, y),
      pixels: cell.pixels + 1, maxDelta: Math.max(cell.maxDelta, diff[p]) });
  }
  const changed = {};
  for (const [kind, grid] of cells) {
    const seen = new Set();
    const groups = [];
    for (const start of grid.keys()) {
      if (seen.has(start)) continue;
      seen.add(start);
      const group = { x0: Infinity, y0: Infinity, x1: -1, y1: -1, pixels: 0, maxDelta: 0 };
      for (const stack = [start]; stack.length;) {
        const key = stack.pop(), cell = grid.get(key);
        Object.assign(group, { x0: Math.min(group.x0, cell.x0), y0: Math.min(group.y0, cell.y0), x1: Math.max(group.x1, cell.x1),
          y1: Math.max(group.y1, cell.y1), pixels: group.pixels + cell.pixels, maxDelta: Math.max(group.maxDelta, cell.maxDelta) });
        const cx = key % cols, cy = (key - cx) / cols;
        for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
          const next = (cy + dy) * cols + cx + dx;
          if (cx + dx >= 0 && cx + dx < cols && grid.has(next) && !seen.has(next)) { seen.add(next); stack.push(next); }
        }
      }
      groups.push({ x: group.x0, y: group.y0, width: group.x1 - group.x0 + 1, height: group.y1 - group.y0 + 1, pixels: group.pixels, maxDelta: group.maxDelta });
    }
    changed[kind] = { pixels: groups.reduce((n, g) => n + g.pixels, 0), boxes: groups.sort((a, b) => b.pixels - a.pixels) };
  }
  // The element at each governed box's centre: the hit-tested element and the deepest rendered element whose box holds it.
  for (const g of changed.governed?.boxes ?? []) {
    Object.assign(g, await page.evaluate(([x, y]) => {
      const label = (el) => `${el.tagName}${el.id ? `#${el.id}` : ""}${[...el.classList].map((c) => `.${c}`).join("")}`;
      const depth = (el) => { let n = 0; for (let e = el; e; e = e.parentElement) n += 1; return n; };
      let deepest = null;
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (!el.checkVisibility({ visibilityProperty: true }) || x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
        if (!deepest || depth(el) >= depth(deepest)) deepest = el;
      }
      const hit = document.elementFromPoint(x, y);
      return { hit: hit ? label(hit) : null, deepest: deepest ? label(deepest) : null };
    }, [g.x + g.width / 2, g.y + g.height / 2]));
  }
  const state = ({ animations, focus, active, hasFocus, scrollY, boxes }) =>
    ({ animations, focus, active, hasFocus, scrollY, skippedBoxes: Object.fromEntries(Object.entries(boxes).map(([key, list]) => [key, list.length])) });
  return { gap, width, height, first: state(first), second: state(second), changed, masked };
};
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
      found.push({ text: key, ratio, region, rendered: !bg, disabled: el.matches(':disabled, [aria-disabled="true"]'), fg: getComputedStyle(el).color, ground: colour(bg), y: Math.round(scrollY), ...(ownRuns.length ? { runs: ownRuns } : {}) });
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
      if (!el.checkVisibility?.() || !el.textContent.trim() || el.closest("[data-df-region]") || el.matches(':disabled, [aria-disabled="true"]') || el.parentElement?.closest(sel)) return [];
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
  // colours on <html>. Compare each arrival with its direct load. Since Phase 5 Task 14 no stylesheet
  // defines a terminal colour alias on <html>, so a direct load has neither name.
  for (const route of ["/journey", "/terminal"]) {
    if (!owns(route)) continue;
    const readTerminalAliases = (page) => page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return [style.getPropertyValue("--terminal-text-light").trim(), style.getPropertyValue("--terminal-header-bg").trim()];
    });
    let direct;
    await withPage({ theme: "light", route }, async (page) => {
      direct = await readTerminalAliases(page);
    });
    invariant(direct[0] === "" && direct[1] === "", `Light direct ${route}: terminal aliases ${JSON.stringify(direct)}`);
    await withPage({ theme: "light", route: "/projects", owner: route }, async (page) => {
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
        // Every path to a game compares with the first (direct) one, so the game's own route owns them all.
        await withPage({ theme, route: path.start(game), owner: `/simulations/${game}` }, async (page) => {
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
    button:is(:disabled, [aria-disabled="true"]) { color: #999999; background: #aaaaaa; border: 0; }
  </style><main>
    <a href="#a">Card A <span class="gradient">Gradient label</span></a>
    <a href="#b">Card B <span class="solid">Solid label</span></a>
    <a href="#c" class="worse"><span class="label">Hover worse</span></a>
    <a href="#d"><span class="shade">Passing nested</span></a>
    <a href="#e"><span>Same colour and ground</span></a>
    <a href="#f" class="framed">Framed<span class="sr-only"> for the fixture (opens in a new tab)</span></a>
    <button disabled>Disabled control</button>
    <button aria-disabled="true">Focusable disabled control</button>
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
    // Phase 5 Task 22 (P5-4): a control Disabled through aria-disabled stays focusable and is classified like :disabled.
    const focusable = sampled.find((r) => r.text === "Focusable disabled control");
    control(focusable?.disabled === true && focusable.ratio < 4.5 && !states.some((r) => r.key.startsWith("button|Focusable disabled")), "an aria-disabled control is not classified as inactive");
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
  const control = (ok, message) => invariant(ok, `measurement control: ${message}`);
  // The two fixture builds load "/", so the shard that owns "/" runs these controls (Phase 6 Task 5).
  if (owns("/")) {
    const before = await fixtureBuild(BUILD("#767676", "#787878", "#777777", "#777777", "#767676", "#000000", "#787878"));
    const after = await fixtureBuild(BUILD("#7b7b7b", "#808080", "#888888", "#888888", "#7b7b7b", "#010101", "#808080"));
    const diff = compareRuns(before.regressions.map((r) => ({ id: r.id, baseline: r.value })), after.measured);
    const ofLabel = (list, text) => list.filter((id) => id.startsWith("interact|") && id.endsWith(`"${text}"`));
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
  }
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
      { route: "/simulations/spider", selector: ".spider-card", stack: '"Courier New", Monaco, monospace' },
      // Rhythm Lab (Task 18): the root is lifted; the native highway, its hit zones and its status keep their stack.
      { route: "/simulations/rhythm-lab", selector: ".rhythm-lab-highway", stack: '"Courier New", Monaco, monospace' },
      { route: "/simulations/rhythm-lab", selector: ".rhythm-lab-hit-zone", stack: '"Courier New", Monaco, monospace' },
      { route: "/simulations/rhythm-lab", selector: ".rhythm-lab-status", stack: '"Courier New", Monaco, monospace' },
      // Annals (Task 21): the root is lifted; the native parchment and the narrative markers keep the page's serif stack.
      { route: "/simulations/annals", selector: ".annals-sheet", stack: 'Georgia, Cambria, "Times New Roman", Times, serif' },
      { route: "/simulations/annals", selector: ".annals-sheet > header [data-df-region]", stack: 'Georgia, Cambria, "Times New Roman", Times, serif' },
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
          // Attached, not visible: the Rhythm Lab status box is empty (zero height) until a judgement shows.
          await page.locator(selector).first().waitFor({ state: "attached" });
          const family = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).fontFamily, selector);
          invariant(family === stack, `${selector} via ${path.name} is set in ${family}, not its held stack ${stack}`);
        });
      }
    }
  }
  // Focus ring (Task 6; Phase 6 Task 7 on every route): every keyboard-focused element shows the focus-ring token's
  // spread shadow, and forced-colors mode keeps a painted outline (it discards box-shadow). Focus excludes nothing:
  // elements inside creative regions and media are checked too. Each pass makes one full Tab cycle, and every visible
  // tabbable element must be reached in it. An <iframe> holding focus counts as reached; the ring inside it belongs to
  // the artwork's own document (the procedural-animations test checks it), so the iframe's own style is not asserted.
  {
    const RING = { dark: "rgb(108, 255, 149)", light: "rgb(4, 110, 48)", mono: "rgb(255, 255, 255)" };
    const FOCUS_ROUTES = ROUTES;
    const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, iframe, video[controls], audio[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';
    const CYCLE_CAP = 1000;
    // Named exceptions (DEV-6): an element that keeps forward Tab for itself. On its route the cycle runs with Shift+Tab,
    // with the same assertions over every marked element, and the test asserts that forward Tab still stays on the
    // element (else the exception is stale) and that Shift+Tab moves focus off it.
    const TAB_CONSUMERS = [
      { route: "/terminal", selector: "input.command-input", reason: "DEV-6" },
    ];
    for (const consumer of TAB_CONSUMERS) if (!ROUTES.includes(consumer.route)) throw new Error(`TAB_CONSUMERS: ${consumer.route} is not in ROUTES`);
    // Marks every visible tabbable element with a data-df-tab index, then presses Tab (Shift+Tab on a TAB_CONSUMERS
    // route) until focus comes back to the first element it reached (one full cycle). Not tabbable after all, so not
    // marked and listed as dropped: an element with a negative tabindex attribute (Rhythm Lab's hit-zone buttons, its
    // hidden file input), one in an inert subtree or matching :disabled (a disabled fieldset), and one not rendered.
    // Wrap: headless Chromium has no browser UI, so after the last element (or a frame with nothing focusable inside)
    // focus can land on no element at all (the page's body or html), where a headed browser would move to its own UI and
    // then to the document start. Only on that condition, the cycle focuses a sentinel outside the tab order at the
    // document's start (its end, going backward), so the next press resumes there. The wrap marks nothing reached. A
    // trap keeps focus on an element (or in a frame) and still runs into the cap.
    // Returns the state of each element at the press that first reached it, the marked elements never reached, the
    // dropped elements, the wraps taken and whether the cap ended the cycle. The ring set expected is the element's
    // nearest [data-theme] (P5-1: Rhythm Lab scopes its own set), else the stored theme.
    const focusCycle = async (page, theme, backward = false) => {
      const key = backward ? "Shift+Tab" : "Tab";
      const { marked, dropped } = await page.evaluate((selector) => {
        let index = 0;
        const dropped = [];
        for (const el of document.querySelectorAll(selector)) {
          const why = el.hasAttribute("tabindex") && Number(el.getAttribute("tabindex")) < 0 ? "tabindex"
            : el.closest("[inert]") ? "inert" : el.matches(":disabled") ? "disabled"
              : !el.checkVisibility({ visibilityProperty: true }) ? "unrendered" : null;
          if (why) { dropped.push(`${why} ${el.tagName}.${el.classList[0] ?? ""} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}`); continue; }
          el.setAttribute("data-df-tab", String(index++));
        }
        window.__dfReached = { ids: new WeakMap(), next: 0 };
        return { marked: index, dropped };
      }, TABBABLE);
      const states = [];
      let first = null;
      let previous = null;
      let last = null;
      let presses = 0;
      let wraps = 0;
      let closed = false;
      while (presses < CYCLE_CAP) {
        await page.keyboard.press(key);
        presses += 1;
        const state = await page.evaluate((stored) => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return { away: true };
          if (el.hasAttribute("data-df-wrap")) return { stuck: true };
          const reached = window.__dfReached;
          const fresh = !reached.ids.has(el);
          if (fresh) reached.ids.set(el, reached.next++);
          const c = getComputedStyle(el);
          return { id: reached.ids.get(el), fresh, iframe: el.tagName === "IFRAME", tab: el.getAttribute("data-df-tab"),
            label: `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}`,
            boxShadow: c.boxShadow, outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth,
            set: el.closest("[data-theme]")?.getAttribute("data-theme") ?? stored };
        }, theme);
        if (state.stuck) { previous = null; last = "the wrap sentinel"; continue; }
        if (state.away) {
          wraps += 1;
          previous = null;
          await page.evaluate((atEnd) => {
            const sentinel = document.querySelector("[data-df-wrap]") ?? document.createElement("span");
            sentinel.setAttribute("data-df-wrap", "");
            sentinel.tabIndex = -1;
            sentinel.style.cssText = "position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: hidden";
            if (atEnd) document.body.append(sentinel); else document.body.prepend(sentinel);
            sentinel.focus({ preventScroll: true });
          }, backward);
          continue;
        }
        if (first === null) first = state.id;
        else if (state.id === first && previous !== first) { closed = true; break; }
        if (state.fresh) states.push(state);
        previous = state.id;
        last = state.label;
      }
      const unreached = await page.evaluate(() => {
        document.querySelector("[data-df-wrap]")?.remove();
        return [...document.querySelectorAll("[data-df-tab]")]
          .filter((el) => !window.__dfReached.ids.has(el))
          .map((el) => `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)} [data-df-tab=${el.getAttribute("data-df-tab")}]`);
      });
      return { states, unreached, dropped, marked, presses, wraps, closed, last, key };
    };
    // The cycle's own failures: the cap ended it (focus never came back, a keyboard trap), or it missed a marked element.
    // On a TAB_CONSUMERS route it also checks the exception still holds: forward Tab stays on the consumer, Shift+Tab leaves.
    const cycleChecks = async (page, pass, route, cycle) => {
      invariant(cycle.closed, `${pass} ${route}: focus did not return to the first element within ${CYCLE_CAP} ${cycle.key} presses (last focused: ${cycle.last})`);
      for (const label of cycle.unreached) invariant(false, `unreached ${route} ${label} (${pass})`);
      console.log(`FOCUS ${pass} ${route} key=${cycle.key} marked=${cycle.marked} reached=${cycle.states.length} presses=${cycle.presses} wraps=${cycle.wraps} closed=${cycle.closed}`);
      console.log(`FOCUS-DROPPED ${pass} ${route} ${JSON.stringify(cycle.dropped)}`);
      for (const { selector, reason } of TAB_CONSUMERS.filter((c) => c.route === route)) {
        const count = await page.locator(selector).count();
        invariant(count === 1, `${pass} ${route}: TAB_CONSUMERS ${selector} (${reason}) matches ${count} elements, not 1`);
        if (count !== 1) continue;
        const onConsumer = (sel) => page.evaluate((s) => document.activeElement?.matches(s) ?? false, sel);
        await page.locator(selector).focus();
        await page.keyboard.press("Tab");
        invariant(await onConsumer(selector), `${pass} ${route}: forward Tab left ${selector}, so its TAB_CONSUMERS exception (${reason}) is stale`);
        await page.locator(selector).focus();
        await page.keyboard.press("Shift+Tab");
        const left = await page.evaluate((s) => { const el = document.activeElement; return Boolean(el) && el !== document.body && el !== document.documentElement && !el.matches(s); }, selector);
        invariant(left, `${pass} ${route}: Shift+Tab did not move focus off ${selector} (${reason})`);
      }
    };
    const backwardOn = (route) => TAB_CONSUMERS.some((c) => c.route === route);
    for (const theme of THEMES) {
      for (const route of FOCUS_ROUTES) {
        await withPage({ theme, route }, async (page) => {
          const cycle = await focusCycle(page, theme, backwardOn(route));
          for (const state of cycle.states) {
            if (state.iframe) continue;
            invariant(RING[state.set] && state.boxShadow.includes(`${RING[state.set]} 0px 0px 0px 4px`), `${theme} ${route}: ${state.label} lacks the ${state.set} focus-ring (${state.boxShadow})`);
          }
          await cycleChecks(page, theme, route, cycle);
        });
      }
    }
    // Focus appears instantly (§13): with motion allowed, the ring is complete as soon as focus lands,
    // not part-way through a transition. Read right after the key press, before any transition could finish. The ring
    // expected is the element's nearest [data-theme] set, as above (the Annals sheet scopes the Light set in Dark too).
    for (const route of FOCUS_ROUTES) {
      await withPage({ theme: "dark", route, reducedMotion: "no-preference" }, async (page) => {
        for (let i = 0; i < 25; i += 1) {
          await page.keyboard.press("Tab");
          const state = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body || el.tagName === "IFRAME") return null;
            return { label: `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}`, boxShadow: getComputedStyle(el).boxShadow,
              set: el.closest("[data-theme]")?.getAttribute("data-theme") ?? "dark" };
          });
          if (state) invariant(RING[state.set] && state.boxShadow.includes(`${RING[state.set]} 0px 0px 0px 4px`), `instant focus ${route}: ${state.label} ${state.set} ring is not complete on arrival (${state.boxShadow})`);
        }
      });
    }
    // Forced colours keep governed controls and their states on screen (R-3, DEV-7). Every reading is a screenshot of the
    // element's own box with nothing focused, so the focus outline never counts, compared with the forced Canvas colour
    // or with a second screenshot. (i) Every visible range input paints a rail (one row painted from its first quarter to
    // its last) and a thumb (a column painted at least twice as tall as the median painted column). (ii) Every visible
    // Selected control and every latch that is on differs in pixels from itself with that state switched off in the page
    // (the attribute, the open <details> it summarises, or its checked input, clicked), which is then restored.
    const FORCED_SELECTED = '.df-control:is([aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch))';
    const FORCED_LATCHED = '.df-control--latch:is([aria-pressed="true"], [aria-checked="true"], [aria-expanded="true"], details[open] > *, :has(> input:checked))';
    const forcedPixels = (images, ground) => decoder.evaluate(async ([pngs, rgb]) => {
      const read = async (data) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [first, second] = await Promise.all(pngs.map(read));
      const apart = (p, i, q, j) => Math.abs(p[i] - q[j]) + Math.abs(p[i + 1] - q[j + 1]) + Math.abs(p[i + 2] - q[j + 2]) > 24;
      if (second) {
        let changed = 0;
        for (let i = 0; i < first.data.length; i += 4) if (apart(first.data, i, second.data, i)) changed += 1;
        return { changed };
      }
      const { data, width, height } = first;
      const painted = (x, y) => apart(data, (y * width + x) * 4, rgb, 0);
      let rail = false;
      for (let y = 0; y < height && !rail; y += 1) {
        let [lo, hi] = [-1, -1];
        for (let x = 0; x < width; x += 1) if (painted(x, y)) { if (lo < 0) lo = x; hi = x; }
        rail = lo >= 0 && lo <= width / 4 && hi >= (3 * width) / 4;
      }
      const columns = [];
      for (let x = 0; x < width; x += 1) {
        let n = 0;
        for (let y = 0; y < height; y += 1) if (painted(x, y)) n += 1;
        if (n) columns.push(n);
      }
      columns.sort((a, b) => a - b);
      const median = columns.length ? columns[Math.floor(columns.length / 2)] : 0;
      const tallest = columns.at(-1) ?? 0;
      return { rail, median, tallest, thumb: tallest > 0 && tallest >= 2 * median };
    }, [images.map((png) => png.toString("base64")), ground]);
    const forcedPaint = async (page, pass) => {
      const ground = await page.evaluate(() => {
        const probe = document.body.appendChild(document.createElement("div"));
        probe.style.backgroundColor = "Canvas";
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value.match(/\d+/g).slice(0, 3).map(Number);
      });
      // Scrolling can move a state (the section rail and an article's contents follow the scroll position, a frame later),
      // so the page is read from its top, as loaded, once its states hold still (the focus cycle leaves it scrolled); the
      // elements already on screen are read first, and the page scrolls only to bring an element on screen.
      const KINDS = { range: 'input[type="range"]', selected: FORCED_SELECTED, latched: FORCED_LATCHED };
      await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo({ top: 0, behavior: "instant" }); });
      for (let sample = 0, last = null; sample < 20; sample += 1) {
        await frames(page);
        await page.waitForTimeout(150);
        const now = await page.evaluate((selector) => [...document.querySelectorAll(selector)]
          .map((el) => `${el.tagName}.${el.className}`).join("|"), `${FORCED_SELECTED}, ${FORCED_LATCHED}`);
        if (now === last) break;
        last = now;
      }
      const marked = await page.evaluate((lists) => {
        const out = [];
        for (const [kind, selector] of lists) {
          for (const el of document.querySelectorAll(selector)) {
            const r = el.getBoundingClientRect();
            if (el.hasAttribute("data-df-forced") || !el.checkVisibility({ visibilityProperty: true }) || r.width < 1 || r.height < 1) continue;
            el.setAttribute("data-df-forced", String(out.length));
            const named = el.getAttribute("aria-label") || el.labels?.[0]?.textContent || document.getElementById(el.getAttribute("aria-labelledby"))?.textContent || el.textContent || "";
            out.push({ index: out.length, kind, label: `${el.tagName} ${named.trim().slice(0, 30)}`, onScreen: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth });
          }
        }
        return out;
      }, Object.entries(KINDS));
      const switchOff = (el, off) => el.evaluate((node, turnOff) => {
        if (!turnOff) {
          for (const [what, name, value] of node.dfForcedUndo) {
            if (what === "attribute") node.setAttribute(name, value);
            else if (what === "open") node.parentElement.open = true;
            else node.querySelector(":scope > input").click();
          }
          return 0;
        }
        const undo = [];
        for (const name of ["aria-pressed", "aria-checked", "aria-selected", "aria-expanded"]) {
          if (node.getAttribute(name) === "true") { node.setAttribute(name, "false"); undo.push(["attribute", name, "true"]); }
        }
        const current = node.getAttribute("aria-current");
        if (current !== null && current !== "false") { node.removeAttribute("aria-current"); undo.push(["attribute", "aria-current", current]); }
        if (node.parentElement?.matches("details[open]")) { node.parentElement.open = false; undo.push(["open"]); }
        // A checked input is switched by a click, as a visitor would: the app keeps a controlled input's checked
        // property in step with its own state on every render, so a property set behind its back does not hold.
        const box = node.querySelector(":scope > input:checked");
        if (box) { box.click(); undo.push(["click"]); }
        node.dfForcedUndo = undo;
        return undo.length;
      }, off);
      for (const { index, kind, label } of [...marked.filter((m) => m.onScreen), ...marked.filter((m) => !m.onScreen)]) {
        const el = page.locator(`[data-df-forced="${index}"]`);
        const clip = await el.evaluate((node, selector) => {
          const seen = (r) => r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
          if (!seen(node.getBoundingClientRect())) node.scrollIntoView({ block: "center", behavior: "instant" });
          document.activeElement?.blur?.();
          const r = node.getBoundingClientRect();
          const [x, y] = [Math.max(0, Math.floor(r.left)), Math.max(0, Math.floor(r.top))];
          return { x, y, width: Math.min(innerWidth, Math.ceil(r.right)) - x, height: Math.min(innerHeight, Math.ceil(r.bottom)) - y, still: node.matches(selector) };
        }, KINDS[kind]);
        if (clip.width < 1 || clip.height < 1) { invariant(false, `forced colors ${pass}: ${kind} ${label} is not on screen to be read`); continue; }
        if (!clip.still) { invariant(false, `forced colors ${pass}: ${kind} ${label} left its state while the page was read`); continue; }
        delete clip.still;
        await frames(page);
        const before = await page.screenshot({ clip, animations: "disabled" });
        if (kind === "range") {
          const shape = await forcedPixels([before], ground);
          invariant(shape.rail && shape.thumb, `forced colors ${pass}: range ${label} paints rail ${shape.rail}, thumb ${shape.thumb} (tallest column ${shape.tallest}px, median ${shape.median}px)`);
          continue;
        }
        invariant((await switchOff(el, true)) > 0, `forced colors ${pass}: ${kind} ${label} has no state to switch off`);
        await frames(page);
        const after = await page.screenshot({ clip, animations: "disabled" });
        await switchOff(el, false);
        await frames(page);
        const { changed } = await forcedPixels([before, after], ground);
        invariant(changed > 0, `forced colors ${pass}: ${kind} ${label} looks the same with its state off`);
      }
      const count = (kind) => marked.filter((m) => m.kind === kind).length;
      console.log(`FORCED-PAINT ${pass} ranges=${count("range")} selected=${count("selected")} latched=${count("latched")}`);
    };
    // Forced colours (Phase 6 Task 7: every route, dark, the same full cycle): each reached element keeps a solid 2px outline.
    for (const route of FOCUS_ROUTES) {
      await withPage({ theme: "dark", route, forcedColors: "active" }, async (page) => {
        const cycle = await focusCycle(page, "dark", backwardOn(route));
        for (const state of cycle.states) {
          if (state.iframe) continue;
          invariant(state.outlineStyle === "solid" && state.outlineWidth === "2px", `forced colors ${route}: ${state.label} outline ${state.outlineStyle} ${state.outlineWidth}`);
        }
        await cycleChecks(page, "forced-colors", route, cycle);
        await forcedPaint(page, route);
      });
    }
    // Settings, opened once in forced colours in dock mode with Dock tuning expanded: both sliders (Speed is disabled
    // under reduced motion), the theme and navigation options, the tuning toggle and the opener.
    await withPage({ theme: "dark", route: "/", forcedColors: "active" }, async (page) => {
      await page.evaluate(() => localStorage.setItem("web-nav-mode", "dock"));
      await page.reload({ waitUntil: "networkidle" });
      await page.locator(".dock-container").waitFor();
      await openSettings(page);
      await page.getByRole("button", { name: "Dock tuning", exact: true }).click();
      await page.locator("#dock-tuning-panel").waitFor();
      await forcedPaint(page, "/ Settings");
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
  // Phase 5 Task 19: Rhythm Lab's setup controls render once a local file is chosen and a chart imported. The fixtures
  // are made here (a silent WAV and a chart export with three notes). The controls sit in the header, outside the
  // highway, so the ready check does not cover them; that is checked rather than assumed, so none is measured through it.
  // A silent 8 kHz, 8-bit mono WAV of the given length in seconds.
  const rhythmWav = (seconds = 2) => {
    const samples = 8000 * seconds; const wav = Buffer.alloc(44 + samples, 128);
    wav.write("RIFF", 0); wav.writeUInt32LE(36 + samples, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34);
    wav.write("data", 36); wav.writeUInt32LE(samples, 40);
    return wav;
  };
  const rhythmFile = async (page, name = "probe-track.wav", seconds = 2) => {
    await page.locator(".rhythm-lab-audio-input").setInputFiles({ name, mimeType: "audio/wav", buffer: rhythmWav(seconds) });
    await page.waitForFunction((n) => document.querySelector(".rhythm-lab-audio-filename")?.textContent === n, name);
  };
  // A chart export with three notes; with `song` set, it names a song other than the current one (the import asks first).
  const rhythmChart = (page, song = null) => page.locator(".rhythm-lab-hidden-file-input").setInputFiles({ name: "probe.rhythm-chart.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ kind: "rhythm-lab-chart", schemaVersion: 1, song, chart: { label: "Probe chart", notes: [0, 1, 2].map((lane) => ({ lane, timeMs: 900 + 500 * lane })) } })) });
  // A local file and an imported chart: the setup face holds every control it can show.
  const rhythmLoad = async (page) => {
    await rhythmFile(page);
    await page.locator(".rhythm-lab-song-selector-trigger").waitFor();
    await rhythmChart(page);
    await page.locator(".rhythm-lab-chart-management-button").first().waitFor(); await frames(page);
  };
  const rhythmSetup = async (page) => {
    await rhythmLoad(page);
    const covered = await page.evaluate((sels) => [...document.querySelectorAll(sels)].filter((e) => {
      const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit && hit.closest(".rhythm-lab-overlay"); }).map((e) => e.textContent.trim()),
    ".rhythm-lab-song-selector-trigger, .rhythm-lab-panel-tabs button, .rhythm-lab-preview-button, .rhythm-lab-chart-management-button");
    invariant(covered.length === 0, `/simulations/rhythm-lab: setup controls under the ready check ${JSON.stringify(covered)}`);
  };
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
    // Phase 5 Task 15: Snake's Play again, on the game-over panel (surface-2). The touch buttons render only on touch
    // screens and are checked in their own block below.
    { route: "/simulations/snake", selectors: [".play-again-button"], prepare: endSnakeGame },
    // Phase 5 Task 7: project media chrome (the bar's play control, the inspect openers), then the media inspector's
    // controls with the inspector open: Close on a recording-only inspector, and on one with a still frame the view
    // switch (Selected through aria-pressed) and actual size (a latch: a two-state mode with its lamp).
    { route: "/case-studies/aether", selectors: [".project-media__control"] },
    { route: "/case-studies/aether", selectors: [".media-inspector .project-media__control"], prepare: openInspector("Inspect aether recording with playback controls") },
    { route: "/case-studies/erebus", selectors: [".media-inspector__view-group .project-media__control", ".media-inspector__views > .project-media__control"],
      prepare: openInspector("Read erebus still frame") },
    // Phase 5 Task 19: Rhythm Lab's saved-song trigger, panel tabs (Setup Selected), preview latch and chart management
    // controls, on the header's face inside the page's scoped token set (P5-1).
    { route: "/simulations/rhythm-lab", scope: ".rhythm-lab-page", prepare: rhythmSetup,
      selectors: [".rhythm-lab-song-selector-trigger", ".rhythm-lab-panel-tabs button", ".rhythm-lab-preview-button", ".rhythm-lab-chart-management-button"] },
    // Phase 5 Task 20: the ready check's Start, on the overlay panel's face inside the highway (no fill, D8).
    { route: "/simulations/rhythm-lab", scope: ".rhythm-lab-page", selectors: [".rhythm-lab-primary-action"] },
    // Phase 5 Task 22 (P5-4): the Annals controls on the parchment, inside the sheet's scoped paper token set (P5-3): the
    // seed row's cast world, replay seed and advance, and the roster rows (their hover marker out of flow, before the glyph);
    // then, once the hand is available, the verbs (Disabled at load, through aria-disabled).
    { route: "/simulations/annals", scope: ".annals-sheet",
      selectors: [".annals-sheet > div > button:first-of-type", ".annals-sheet > div > button:nth-of-type(2)", ".annals-sheet > div > button:last-of-type", ".annals-living button"] },
    { route: "/simulations/annals", scope: ".annals-sheet", selectors: [".annals-columns aside .flex-wrap > button"], prepare: async (page) => {
      const advance = page.getByRole("button", { name: "let a year pass →" });
      for (let year = 0; year < 3 && (await page.locator('.annals-columns aside .flex-wrap > button[aria-disabled="true"]').count()); year++) await advance.click();
    } },
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

  // Phase 5 Task 15 (§13 control model, Pressed; §08 Layers and overlays). /simulations/snake on a touch screen at 375×812,
  // in each theme: the four touch buttons are square controls of the model, at least three cells in each direction, on an
  // opaque ground, idle in fg-muted inside an edge boundary, inverted on contact; the touch controls are not translucent.
  // At rest the board (native region) holds only pieces; paused, the overlay beside it dims the well with the scrim and
  // its panel is surface-2, outlined in edge, with a heading in its own words, uncased.
  // Its own context (a touch screen), not withPage: the shard that owns the route runs it (Phase 6 Task 5).
  for (const theme of THEMES) {
    if (!owns("/simulations/snake")) break;
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce", hasTouch: true, isMobile: true });
    await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`snake touch: ${error.message}`));
    const at = `${theme} /simulations/snake 375px touch`;
    try {
      await page.goto(`${base}/simulations/snake`, { waitUntil: "networkidle" });
      await page.locator(".touch-btn").first().waitFor();
      const t = {}; for (const n of ["--edge", "--fg-muted", "--signal", "--on-signal", "--field-deep", "--surface-2", "--fg"]) t[n] = await tokenRgb(page, n);
      const seen = await page.evaluate(() => {
        const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h"));
        const board = document.querySelector(".game-board");
        return { cell, opacity: getComputedStyle(document.querySelector(".touch-controls")).opacity,
          board: [board.getAttribute("data-df-region"), [...board.querySelectorAll("*")].filter((e) => !e.matches(".snake-segment, .food")).length],
          buttons: [...document.querySelectorAll(".touch-btn")].map((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect();
            return { control: e.matches(".df-control"), w: r.width, h: r.height, radius: c.borderTopLeftRadius, bg: c.backgroundColor, fg: c.color, b: c.borderTopColor }; }) };
      });
      // Phase 5 Task 16 (P5-12; §06 Rules): each HUD line is a label in the narrow label voice beside a number in mono,
      // and its text is still the one string it was. Both labels read fg-muted at rest; the score value fg, the high score fg-muted.
      const hud = await page.evaluate(() => [".game-score", ".game-high-score"].map((s) => { const p = document.querySelector(s);
        const k = [...p.children].map((e) => { const c = getComputedStyle(e); return [e.className, c.fontFamily.split(",")[0].replace(/"/g, "").trim(), c.textTransform]; });
        return { text: p.textContent, k, ink: [...p.children].map((e) => getComputedStyle(e).color) }; }));
      invariant(/^Score: \d+$/.test(hud[0].text) && /^High: \d+$/.test(hud[1].text) &&
        hud.every((h) => JSON.stringify(h.k) === JSON.stringify([["df-label", "Archivo Narrow", "uppercase"], ["df-data", "IBM Plex Mono", "none"]])) &&
        JSON.stringify(hud.map((h) => h.ink)) === JSON.stringify([[t["--fg-muted"], t["--fg"]], [t["--fg-muted"], t["--fg-muted"]]]),
        `${at}: HUD label and value ${JSON.stringify(hud)}`);
      invariant(seen.opacity === "1", `${at}: touch controls at opacity ${seen.opacity}`);
      invariant(seen.board[0] === "native" && seen.board[1] === 0, `${at}: board region ${JSON.stringify(seen.board)}`);
      invariant(seen.buttons.length === 4, `${at}: ${seen.buttons.length} touch buttons`);
      for (const b of seen.buttons) {
        invariant(b.control && b.radius === "0px" && b.w >= 3 * seen.cell - 0.5 && b.h >= 3 * seen.cell - 0.5, `${at}: touch button ${JSON.stringify(b)}`);
        invariant(b.bg === t["--field-deep"] && b.fg === t["--fg-muted"] && b.b === t["--edge"], `${at}: idle touch button ${JSON.stringify(b)}`);
      }
      const down = await page.locator(".touch-btn").first().evaluate((e) => { e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        const c = getComputedStyle(e); const out = [e.hasAttribute("data-df-pressed"), c.backgroundColor, c.color];
        e.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); return out; });
      invariant(down[0] && down[1] === t["--signal"] && down[2] === t["--on-signal"], `${at}: touch button pressed ${down}`);
      // A press the control acknowledges moves the snake, and only once. Moves are queued while the game is paused; on resume
      // the head's first two steps show them. Enter on a focused Move up turns the snake up; a tap on Move left and then on
      // Move down gives one step left and then one down (a tap that acted twice would queue left twice). The board draws the
      // head one frame after the game moves it, so a pause can land between the two: that last move is then drawn just
      // after resume. One leading step in the direction held before the pause (`before`) is that move and is set aside.
      const firstSteps = async (press, before) => {
        await page.keyboard.press(" "); await page.locator(".game-overlay").waitFor();
        await press();
        await page.evaluate(() => document.activeElement?.blur());
        return page.evaluate(() => new Promise((done) => {
          const board = document.querySelector(".game-board");
          const w = Math.round(parseFloat(board.style.width) / 20), h = Math.round(parseFloat(board.style.height) / 20);
          const cell = () => { const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(document.querySelector(".snake-head").style.transform);
            return [Math.round(m[1] / 20), Math.round(m[2] / 20)]; };
          const delta = (a, b, n) => ((a - b + n + 1) % n) - 1;
          let last = cell(); const out = [];
          const watch = () => { const now = cell();
            if (now[0] !== last[0] || now[1] !== last[1]) { out.push(`${delta(now[0], last[0], w)},${delta(now[1], last[1], h)}`); last = now; }
            if (out.length < 3) requestAnimationFrame(watch); else done(out); };
          window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
          requestAnimationFrame(watch);
        })).then((steps) => (steps[0] === before ? steps.slice(1) : steps.slice(0, 2)));
      };
      const keyed = await firstSteps(async () => { await page.locator(".touch-up").focus(); await page.keyboard.press("Enter"); }, "1,0");
      invariant(keyed[0] === "0,-1", `${at}: Enter on Move up, first steps ${keyed}`);
      const tapped = await firstSteps(async () => { await page.locator(".touch-left").tap(); await page.locator(".touch-down").tap(); }, "0,-1");
      invariant(tapped.join(" ") === "-1,0 0,1", `${at}: taps on Move left then Move down, first steps ${tapped}`);
      await page.keyboard.press(" ");
      await page.locator(".game-overlay").waitFor();
      const paused = await page.evaluate(() => { const o = document.querySelector(".game-overlay"); const p = o.querySelector(".game-over-content"); const h = p.querySelector("h2");
        const c = getComputedStyle(p); const hc = getComputedStyle(h);
        return { inBoard: Boolean(o.closest(".game-board")), scrim: getComputedStyle(o).backgroundColor, bg: c.backgroundColor, b: c.borderTopColor, radius: c.borderTopLeftRadius,
          case: hc.textTransform, h: hc.color }; });
      const scrim = await page.evaluate(() => { const p = document.createElement("i"); p.style.backgroundColor = "var(--df-scrim)"; document.body.append(p);
        const v = getComputedStyle(p).backgroundColor; p.remove(); return v; });
      invariant(!paused.inBoard && paused.scrim === scrim && paused.bg === t["--surface-2"] && paused.b === t["--edge"] && paused.radius === "0px" &&
        paused.case === "none" && paused.h === t["--fg"], `${at}: paused overlay ${JSON.stringify(paused)}`);
    } finally {
      await context.close();
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
    // Task 17 (§06 Rules): each stat is a label in the narrow label voice at the muted tier beside a number in mono in fg,
    // and its text is still the one string it was.
    await withPage({ theme, route: "/simulations/spider", reducedMotion: "reduce" }, async (page) => {
      await page.locator(".spider-stats").waitFor();
      const t = {}; for (const n of ["--fg", "--fg-muted"]) t[n] = await tokenRgb(page, n);
      const stats = await page.locator(".spider-stats > span").evaluateAll((spans) => spans.map((s) => ({ text: s.textContent,
        k: [...s.children].map((e) => { const c = getComputedStyle(e); return [e.className, c.fontFamily.split(",")[0].replace(/"/g, "").trim(), c.textTransform]; }),
        ink: [...s.children].map((e) => getComputedStyle(e).color) })));
      invariant(JSON.stringify(stats.map((x) => x.text)) === JSON.stringify(["Moves: 0", "Completed: 0/8", "Stock: 5"]) &&
        stats.every((x) => JSON.stringify(x.k) === JSON.stringify([["df-label-sm", "Archivo Narrow", "uppercase"], ["df-data", "IBM Plex Mono", "none"]]) &&
          JSON.stringify(x.ink) === JSON.stringify([t["--fg-muted"], t["--fg"]])), `${theme} spider: stat label and value ${JSON.stringify(stats)}`);
    });
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
  // One context per pointer and width visits every rail route; each route is visited by the shard that owns it (Phase 6 Task 5).
  const RAIL_ROUTES = ["/case-studies/aether", "/case-studies/erebus", "/case-studies/arachne", "/case-studies/where-the-specification-lived", "/experience", "/journey"];
  for (const coarse of [false, true]) for (const width of [820, 1024, 1280, 1440]) {
    if (!RAIL_ROUTES.some(owns)) break;
    const context = await browser.newContext({ viewport: { width, height: VIEW_H }, reducedMotion: "reduce", hasTouch: coarse, isMobile: coarse });
    await context.addInitScript((t) => localStorage.setItem("theme", t), THEMES[0]);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`rail clearance ${width}px: ${error.message}`));
    try {
      for (const route of RAIL_ROUTES.filter(owns)) {
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
  // The controls, inputs and true containers that may carry a closed frame (Phase 3 Task 17; Phase 5 extends the list).
  const P3_FRAMED = '.df-control, input, select, textarea, [role="dialog"], dialog, .settings-panel, .site-header__panel, .dock-explore__panel, .terminal-dropdown-options, .dot-tooltip, .dock-tooltip, pre';
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
      const frames17 = await page.evaluate(([skip, allowed]) => {
        const closed = (el) => {
          const c = getComputedStyle(el);
          return ["Top", "Right", "Bottom", "Left"].every((s) =>
            parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none" &&
            !/rgba\(.*, 0\)$/.test(c[`border${s}Color`]));
        };
        return [...document.querySelectorAll("body *")].filter((el) => el.getClientRects().length &&
          !el.closest(skip) && closed(el) && !el.matches(allowed))
          .map((el) => `${el.tagName}.${el.className}`).slice(0, 10);
      }, [P3_SKIP, P3_FRAMED]);
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
  // Phase 6 Task 5: the other three pieces joined ROUTES, so the completeness invariant below lists them here.
  // Phase 6 Task 6: the sweep and the frame check below run on every route of ROUTES; P5_ROUTES serves the invariants below.
  const P5_ROUTES = ["/darkfield-404-probe", "/procedural-animations", "/procedural-animations/mechanical-time",
    "/procedural-animations/descent", "/procedural-animations/observing", "/procedural-animations/one-quiet-day", "/case-studies/aether", "/simulations",
    "/simulations/orbital-simulator", "/simulations/traffic-simulator", "/terminal", "/simulations/snake",
    "/simulations/spider", "/simulations/rhythm-lab", "/simulations/annals",
    "/projects", "/case-studies", "/case-studies/erebus", "/case-studies/arachne", "/case-studies/where-the-specification-lived"];
  // P5_NATIVE, P5_GOVERNED_IN_NATIVE and P5_NATIVE_GROUND are imported from darkfield-measure-lib.mjs.
  const P5_FAMILIES = ["Archivo", "Archivo Narrow", "IBM Plex Mono"];
  // Phase 6 Task 6 (P6-5′): the sweep and the frame check skip native paint by the measurement's own rule, the lib's page
  // predicates over its MEASURE_NATIVE entries: the Rhythm Lab highway is a native subtree minus its governed-in
  // carve-outs, and the Annals sheet is native for its own box only, so the governed chrome on it is checked. They take
  // the Phase 5 entries; the P5-2 entries hold a hue, not a shape or a voice, so the swatches and lamps stay checked here.
  const SWEEP_NATIVE = MEASURE_NATIVE.filter((entry) => [...P5_NATIVE, ...P5_NATIVE_GROUND].includes(entry.selector));
  assert.equal(SWEEP_NATIVE.length, P5_NATIVE.length + P5_NATIVE_GROUND.length, "MEASURE_NATIVE lacks a Phase 5 native entry");
  // Phase 6 Task 6 (§03 Rules, §06 Rules, §17 Corner radii): every visible governed element outside EXCLUDED and inline
  // SVG has square corners, or is a node (the node radius on all four corners, no own text, not a control); its own text
  // is in a Darkfield family; own text set uppercase is in Archivo Narrow. What a native skip hides is
  // returned beside the findings, so it can be listed and never hides silently.
  const p5SweepAll = (page) => page.evaluate(([src, native, governedIn, excluded, controls, families]) => {
    const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
    const out = new Set();
    const skipped = { subtree: 0, own: 0, hidden: new Set() };
    for (const el of document.querySelectorAll("body *")) {
      if (!el.getClientRects().length || el.closest(`${excluded}, svg`)) continue;
      const name = `${el.tagName}.${el.classList[0] ?? ""}`;
      const c = getComputedStyle(el);
      const radii = [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius];
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const family = c.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      const node = radii.every((r) => r === "50%") && !own && !el.matches(controls);
      const found = [];
      if (!radii.every((r) => r === "0px") && !node) found.push(`radius ${name} ${radii.join(" ")}`);
      if (own && !families.includes(family)) found.push(`family ${name} ${family}`);
      if (own && c.textTransform === "uppercase" && family !== "Archivo Narrow") found.push(`upper ${name} ${family}`);
      const kind = subtreeExcluded(el, native, governedIn) ? "subtree" : ownPaintExcluded(el, native) ? "own" : null;
      if (kind) {
        skipped[kind] += 1;
        for (const f of found) skipped.hidden.add(`${kind} ${f}`);
        continue;
      }
      for (const f of found) out.add(f);
    }
    return { bad: [...out].slice(0, 12), skipped: { subtree: skipped.subtree, own: skipped.own, hidden: [...skipped.hidden].slice(0, 12) } };
  }, [PAGE_PREDICATES, SWEEP_NATIVE, P5_GOVERNED_IN_NATIVE, EXCLUDED, CONTROLS, P5_FAMILIES]);
  const p5Sweep = async (page) => (await p5SweepAll(page)).bad;
  // Phase 5 exit (Task 24; §03 Rules, §09 Frames and corners, §08 Not a dashboard): the Phase 3 closed-frame check runs on
  // the same routes with the same native exclusions. Beyond Phase 3's list, the §13 signatures and fields may close a
  // box, and so may these true containers: the simulation field panels (the bounded system each simulator draws), the
  // terminal window (a real terminal), Rhythm Lab's setup face on the held rain and its in-highway overlay panels (§08
  // overlays), the Annals chronicle (the log's bounded scroll box) and the preview wells of the simulation cards (Task 8's
  // field-deep well with its L1 rule). One control is listed too: the Traffic data table's disclosure toggle, not a
  // frame but a control styled from CSS because its markup is creative-owned (Task 11). Phase 6 Task 6: it is named in
  // the CSS's exact form (T24 M-1), so the chart's df-control summary is allowed by P3_FRAMED alone.
  const P5_FRAMED = [P3_FRAMED, ".df-error, .df-warning, .df-confirmed, .df-field, .orbital-field, .traffic-field",
    ".terminal-container, .rhythm-lab-header, .rhythm-lab-overlay-panel, .annals-chronicle, .simulation-preview, .traffic-table > summary:not(.df-control)"].join(", ");
  const p5Frames = (page) => page.evaluate(([src, native, governedIn, allowed]) => {
    const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
    const closed = (el) => {
      const c = getComputedStyle(el);
      return ["Top", "Right", "Bottom", "Left"].every((s) =>
        parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none" &&
        !/rgba\(.*, 0\)$/.test(c[`border${s}Color`]));
    };
    return [...document.querySelectorAll("body *")].filter((el) => el.getClientRects().length && !el.closest("[data-df-region]") &&
      !subtreeExcluded(el, native, governedIn) && !ownPaintExcluded(el, native) && closed(el) && !el.matches(allowed))
      .map((el) => `${el.tagName}.${el.className}`).slice(0, 10);
  }, [PAGE_PREDICATES, SWEEP_NATIVE, P5_GOVERNED_IN_NATIVE, P5_FRAMED]);
  // Phase 6 Task 6: both checks run on every route of ROUTES (each in the shard that owns it). What the sweep's native
  // skips covered (element counts, and any finding they hid) is listed on a NATIVE-SKIPPED line, never failed.
  for (const theme of THEMES) {
    for (const route of ROUTES) {
      await withPage({ theme, route }, async (page) => {
        const { bad, skipped } = await p5SweepAll(page);
        invariant(bad.length === 0, `${theme} ${route}: ${JSON.stringify(bad)}`);
        if (skipped.subtree || skipped.own) console.log(`NATIVE-SKIPPED ${theme} ${route} subtree=${skipped.subtree} own=${skipped.own} ${JSON.stringify(skipped.hidden)}`);
        const framed = await p5Frames(page);
        invariant(framed.length === 0, `${theme} ${route}: closed frames ${JSON.stringify(framed)}`);
      });
    }
  }
  // Phase 6 Task 8 (§11 Glow tokens, Rules, Light theme; P6-5′): on every route and theme, at rest with the pointer
  // moved off the page (a fresh page hovers whatever sits at its origin), governed emission comes only from the four
  // glow tokens. Each glow is resolved by a probe in the theme scope of the element it is compared with (its nearest
  // [data-theme], else the root; P5-1 and the Annals sheet scope their own set): as computed box-shadow and
  // text-shadow, and, for filters, as a chain built from the text-shadow layers, one drop-shadow() per layer in order.
  // Then, for every rendered element and its generated ::before and ::after: box-shadow and text-shadow are none or one
  // resolved glow, and a filter holding drop-shadow() is exactly one glow's chain. Skipped, and listed with what they
  // would have reported on a GLOW-SKIPPED line, never failed: EXCLUDED boxes and everything inside them; the
  // MEASURE_NATIVE subtree minus its governed-in carve-outs; the own box-shadow of an "own" entry and of the focused
  // element (Task 7 checks what focus paints), whose text-shadow, filter and generated boxes stay checked. An element
  // that emits in a scope whose theme differs from the page's is listed on a GLOW-SCOPED line. Every glow resolved in a
  // Light scope must be none, so a token change there fails loudly.
  {
    const GLOWS = ["--glow-trace", "--glow-signal", "--glow-flare", "--glow-fault"];
    const glowSeen = new Set();
    const emission = (page) => page.evaluate(([src, native, governedIn, excluded, glows]) => {
      const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
      // A shadow list's layers, split at its top-level commas (colours hold commas inside parentheses).
      const layers = (value) => {
        if (value === "none") return [];
        const out = [];
        let depth = 0;
        let start = 0;
        for (let i = 0; i < value.length; i += 1) {
          if (value[i] === "(") depth += 1;
          else if (value[i] === ")") depth -= 1;
          else if (value[i] === "," && depth === 0) { out.push(value.slice(start, i).trim()); start = i + 1; }
        }
        out.push(value.slice(start).trim());
        return out;
      };
      const label = (el) => `${el.tagName}${el.id ? `#${el.id}` : ""}${[...el.classList].map((c) => `.${c}`).join("")}`;
      const resolved = new Map();
      const resolve = (scope) => {
        if (resolved.has(scope)) return resolved.get(scope);
        const probe = document.createElement("i");
        for (const [name, value] of [["position", "absolute"], ["visibility", "hidden"], ["pointer-events", "none"]]) probe.style.setProperty(name, value, "important");
        (scope === document.documentElement ? document.body : scope).append(probe);
        const set = glows.map((name) => {
          probe.style.setProperty("box-shadow", `var(${name})`, "important");
          probe.style.setProperty("text-shadow", `var(${name})`, "important");
          const { boxShadow: box, textShadow: text } = getComputedStyle(probe);
          const chain = layers(text);
          probe.style.setProperty("filter", chain.length ? chain.map((layer) => `drop-shadow(${layer})`).join(" ") : "none", "important");
          return { name, box, text, filter: chain.length ? getComputedStyle(probe).filter : null };
        });
        probe.remove();
        const entry = { scope: scope === document.documentElement ? "root" : label(scope), theme: scope.getAttribute("data-theme"), set };
        resolved.set(scope, entry);
        return entry;
      };
      const root = resolve(document.documentElement);
      const focused = document.activeElement === document.body ? null : document.activeElement;
      const hovered = [...document.querySelectorAll(":hover")].filter((el) => el !== document.documentElement && el !== document.body).map(label);
      const findings = new Map();
      const hidden = new Set();
      const scoped = new Set();
      const skipped = { excluded: 0, subtree: 0, own: 0, focus: 0 };
      const note = (map, key, where) => { const hit = map.get(key) ?? { count: 0, where: [] }; hit.count += 1; if (hit.where.length < 6) hit.where.push(where); map.set(key, hit); };
      for (const el of document.querySelectorAll("body, body *")) {
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        const kind = el.closest(excluded) ? "excluded" : subtreeExcluded(el, native, governedIn) ? "subtree" : null;
        if (kind) skipped[kind] += 1;
        const glow = resolve(el.closest("[data-theme]") ?? document.documentElement);
        for (const pseudo of ["", "::before", "::after"]) {
          const c = getComputedStyle(el, pseudo || null);
          if (pseudo && (c.content === "none" || c.content === "normal" || c.display === "none")) continue;
          if (pseudo && c.visibility !== "visible") continue;
          const where = `${label(el)}${pseudo}`;
          const own = !pseudo && ownPaintExcluded(el, native);
          const focus = !pseudo && el === focused;
          if (own) skipped.own += 1;
          if (focus) skipped.focus += 1;
          const checks = [
            ["box-shadow", c.boxShadow, c.boxShadow === "none" || glow.set.some((g) => g.box === c.boxShadow), own ? "own" : focus ? "focus" : null],
            ["text-shadow", c.textShadow, c.textShadow === "none" || glow.set.some((g) => g.text === c.textShadow), null],
            ["filter", c.filter, !c.filter.includes("drop-shadow(") || glow.set.some((g) => g.filter === c.filter), null],
          ];
          for (const [property, value, ok, ownSkip] of checks) {
            const skip = kind ?? ownSkip;
            if (!skip && value !== "none" && !(property === "filter" && !value.includes("drop-shadow(")) && glow.theme !== root.theme) scoped.add(`${where} ${property} ${value} (${glow.scope})`);
            if (ok) continue;
            if (skip) hidden.add(`${skip} ${where} ${property} ${value}`);
            else note(findings, `${property} ${value}`, where);
          }
        }
      }
      return {
        glows: [...resolved.values()],
        findings: [...findings].map(([key, { count, where }]) => `${key} on ${count}: ${where.join(" ")}`),
        hidden: [...hidden].slice(0, 20), hiddenCount: hidden.size, scoped: [...scoped].slice(0, 20), skipped,
        focused: focused ? label(focused) : null, hovered,
      };
    }, [PAGE_PREDICATES, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE, EXCLUDED, GLOWS]);
    for (const theme of THEMES) {
      for (const route of ROUTES) {
        await withPage({ theme, route }, async (page) => {
          await page.mouse.move(-1, -1);
          await frames(page);
          const seen = await emission(page);
          invariant(seen.hovered.length === 0, `${theme} ${route}: emission check not at rest, pointer over ${JSON.stringify(seen.hovered)}`);
          for (const finding of seen.findings) invariant(false, `${theme} ${route}: emission ${finding}`);
          for (const { scope, theme: set, set: glows } of seen.glows) {
            const line = `GLOWS ${theme} ${scope}[${set}] ${glows.map((g) => `${g.name}=${g.box}`).join(" | ")}`;
            if (!glowSeen.has(line)) { glowSeen.add(line); console.log(line); }
            // Light: every glow is none. Elsewhere a glow resolving to none would mean the probe read nothing.
            for (const g of glows) {
              if (set === "light") invariant(g.box === "none" && g.text === "none", `${theme} ${route}: Light glow ${g.name} in ${scope} is ${g.box} / ${g.text}, not none`);
              else invariant(g.box !== "none", `${theme} ${route}: glow ${g.name} in ${scope}[${set}] resolved to none`);
            }
          }
          console.log(`GLOW-SKIPPED ${theme} ${route} excluded=${seen.skipped.excluded} subtree=${seen.skipped.subtree} own=${seen.skipped.own} focus=${seen.skipped.focus}${seen.focused ? `(${seen.focused})` : ""} hidden=${seen.hiddenCount} ${JSON.stringify(seen.hidden)}`);
          if (seen.scoped.length) console.log(`GLOW-SCOPED ${theme} ${route} ${JSON.stringify(seen.scoped)}`);
        });
      }
    }
  }
  // Phase 6 Task 9 (Principle 6; §12 What may repeat, Reduced motion, by class, The same in every theme; P6-6, P6-5′;
  // rulings P6-T9a–e): in the first theme, every route is left alone with motion allowed and with reduced motion, and
  // motionProbe reads it. With motion allowed, every running governed animation matches an IDLE_ALLOWED row of the route
  // (Element.matches on its target), and a row's whileFocused element holds focus at both captures; with reduced motion,
  // no governed animation runs. In both, no governed pixel changes outside the boxes of the route's LIVE_READOUTS
  // elements (and, with motion allowed, its IDLE_ALLOWED elements). Each row's element must still render on its route.
  // Report only: MOTION-SKIPPED lists what the skip kinds removed (animations, changed pixels), and MASKED the governed
  // leaves that lie under a skip mask (the Rhythm Lab rain canvas covers its whole viewport, P6-T9d). The diff sees the
  // viewport only (P6-T9e).
  {
    for (const row of [...IDLE_ALLOWED, ...LIVE_READOUTS]) if (!ROUTES.includes(row.route)) throw new Error(`Task 9 row ${row.selector}: ${row.route} is not in ROUTES`);
    const theme = THEMES[0];
    for (const route of ROUTES) for (const reducedMotion of ["no-preference", "reduce"]) {
      await withPage({ theme, route, reducedMotion }, async (page) => {
        const where = `${theme} ${reducedMotion} ${route}`;
        const idleRows = reducedMotion === "reduce" ? [] : IDLE_ALLOWED.filter((row) => row.route === route);
        const liveRows = LIVE_READOUTS.filter((row) => row.route === route);
        const seen = await motionProbe(page, { idle: idleRows.map(({ selector, whileFocused }) => ({ selector, whileFocused })), live: liveRows.map((row) => row.selector) });
        const found = new Set();
        for (const state of [seen.first, seen.second]) {
          for (const a of state.animations.filter((x) => x.visible && !x.kind)) {
            const row = idleRows[a.idle];
            if (!row) found.add(`governed animation ${a.name} runs at idle on ${a.label}${reducedMotion === "reduce" ? " under reduced motion" : " and matches no IDLE_ALLOWED row"}`);
            else if (!seen.first.focus[a.idle] || !seen.second.focus[a.idle]) found.add(`${row.selector} (${row.repeat}) runs while ${row.whileFocused} is not focused (focused: ${seen.first.active} / ${seen.second.active})`);
          }
        }
        for (const g of seen.changed.governed?.boxes ?? []) found.add(`governed pixels changed at idle: ${g.pixels} px in ${g.x},${g.y} ${g.width}x${g.height} at ${g.deepest}`);
        for (const message of found) invariant(false, `${where}: ${message}`);
        // A row's selector still matches an element in the DOM while motion is allowed (the simulators start paused under
        // reduced motion, so their values are not live then). This counts DOM matches; it does not test that they render.
        if (reducedMotion === "no-preference") {
          for (const row of [...idleRows, ...liveRows]) invariant(await page.locator(row.selector).count() > 0, `${where}: Task 9 row ${row.selector} matches no element, so the row is stale`);
        }
        const skipped = {};
        for (const a of seen.first.animations.filter((x) => x.kind)) skipped[`${a.kind}:${a.label}:${a.name}`] = (skipped[`${a.kind}:${a.label}:${a.name}`] ?? 0) + 1;
        const removed = Object.fromEntries(Object.entries(seen.changed).filter(([kind]) => kind !== "governed").map(([kind, { pixels }]) => [kind, pixels]));
        const allowed = [...new Set(seen.first.animations.filter((x) => !x.kind && x.idle >= 0).map((x) => `${x.label}:${x.name}`))];
        console.log(`MOTION-SKIPPED ${where} gap=${seen.gap} allowed=${JSON.stringify(allowed)} animations=${JSON.stringify(skipped)} pixels=${JSON.stringify(removed)}`);
        if (seen.masked.length) console.log(`MASKED ${where} n=${seen.masked.length} ${JSON.stringify(seen.masked.slice(0, 25).map((m) => `${m.kind} ${m.label}`))}`);
      });
    }
  }
  // Phase 6 Task 10 (§05 Monochrome; README Design principles, principle 3; P6-2, P6-5′, P5-3; ruling P6-T3b): a dedicated
  // pass with the Mono theme stored, whatever THEMES holds, on every route at load, pointer off the page. The threshold is
  // the Mono tokens' largest chroma plus MONO_ROUNDING, read from tokens.css; the Mono tokens' largest chroma must be 0, so
  // a token that gains hue fails here first. Two layers, each failing on hue above the threshold:
  // - DOM: every rendered element and its generated ::before and ::after outside EXCLUDED, on the colours it paints: color
  //   and text-shadow where it draws text (own text, a text field, generated content), text-decoration-color when it draws
  //   a decoration, background-color, each drawn border's colour, outline-color when an outline is drawn, fill and stroke
  //   on SVG shapes and text, and every colour inside background-image, box-shadow and text-shadow.
  // - Pixels: one viewport capture; governed pixels are those outside the dilated EXCLUDED boxes and outside native paint.
  //   Each leak cluster (touching cells) is reported with its pixel count, its colour, the element at its centre and the
  //   element each pixel is attributed to (rulings P6-T10f): the deepest element whose clipped box holds it, or its generated
  //   box whose ground matches the pixel; when that element's own paint (ink, ground, border colours) does not match the
  //   pixel, the nearest ancestor whose opaque ground matches it within DEFAULT_TOLERANCE.
  // Named deviations (MONO_DEVIATIONS; P5-3, P5-2; rulings P6-T10a–g): an entry names elements (and a generated box, when
  // it carries one) by Element.matches, never closest. On those it excuses only what its reason covers: a P5-3 entry a DOM
  // colour within DEFAULT_TOLERANCE of a Light token (read from tokens.css), or any colour of a property it lists as
  // untokened; the P5-2 entry its generated box's background colour. Any other colour there fails as a leak. In the pixel
  // layer an entry excuses the hue pixels attributed to its elements: paint routes the DOM layer does not read are pixel-only.
  // Excused items are counted on a MONO-DEVIATION line instead of failing. On a route that renders the entries' scope
  // (MONO_DEVIATION_SCOPE), an entry that matches no rendered element is stale, and an element it matches on which it excuses
  // nothing (no DOM colour, no pixel) means the entry matches more than it excuses: both fail.
  // Native paint follows P6-5′ through the lib's predicates and box helpers: a "subtree" entry is skipped minus its
  // governed-in carve-outs; an "own" entry skips only its own paint. In the pixel layer an "own" entry's paint is its box
  // minus the boxes of its descendants that paint their own ground (P6-T3b), and within that, only the pixels that keep the
  // colour (within DEFAULT_TOLERANCE) they have with every descendant hidden: text, glyphs, borders and generated boxes
  // drawn on the native ground stay governed. Those native pixels print as MONO-NATIVE with counts per reason. What a
  // skip removed (subtree findings and pixels, an "own" entry's own colours, governed leaves under an exclusion box) prints
  // on MONO-SKIPPED and MONO-MASKED lines, never failed.
  {
    const monoTokens = await readFile(new URL("../src/styles/darkfield/tokens.css", import.meta.url), "utf8");
    const monoThreshold = monoChromaThreshold(monoTokens);
    const LIGHT_LABS = Object.values(parseTokenColours(monoTokens, "light")).map((rgb) => srgbToLab(rgb));
    invariant(LIGHT_LABS.length > 0, "tokens.css: no Light token colour read");
    // Whether entry k excuses a DOM colour ([r, g, b, alpha]) of this property.
    const devAllows = (k, property, [r, g, b, alpha]) => {
      const entry = MONO_DEVIATIONS[k];
      if (entry.reason === "P5-2") return property === "background-color";
      if ((entry.untokened ?? []).includes(property)) return true;
      return alpha === 1 && LIGHT_LABS.some((lab) => deltaE76(lab, srgbToLab([r, g, b])) <= DEFAULT_TOLERANCE);
    };
    invariant(monoThreshold - MONO_ROUNDING === 0, `Mono tokens: the largest chroma is ${monoThreshold - MONO_ROUNDING}, not 0, so a Mono token carries hue`);
    console.log(`MONO-THRESHOLD ${monoThreshold} (largest Mono token chroma ${monoThreshold - MONO_ROUNDING} + MONO_ROUNDING)`);
    const MONO_CELL = 8;
    // Page-side helpers shared by both layers, as source: a label, a rendered test, a clipped box and a colour reader.
    const MONO_PAGE = `{
      label: (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + [...el.classList].map((c) => "." + c).join(""),
      shown: (el) => el.isConnected && el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && el.getClientRects().length > 0,
      // The element's border box clipped by every ancestor that clips its overflow (null when nothing of it shows).
      box: (el) => {
        const r = el.getBoundingClientRect();
        let [x0, y0, x1, y1] = [r.left, r.top, r.right, r.bottom];
        for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (s.overflowX === "visible" && s.overflowY === "visible") continue;
          const b = n.getBoundingClientRect();
          x0 = Math.max(x0, b.left + parseFloat(s.borderLeftWidth)); y0 = Math.max(y0, b.top + parseFloat(s.borderTopWidth));
          x1 = Math.min(x1, b.right - parseFloat(s.borderRightWidth)); y1 = Math.min(y1, b.bottom - parseFloat(s.borderBottomWidth));
        }
        return x1 > x0 && y1 > y0 ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null;
      },
    }`;
    const MONO_DEVS = MONO_DEVIATIONS.map(({ selector, pseudo = "" }) => ({ selector, pseudo }));
    const devName = (d) => `${d.selector}${d.pseudo ?? ""}`;
    const monoDom = (page) => page.evaluate(([src, helpers, native, governedIn, excluded, threshold, devs, scope]) => {
      const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
      const { label, shown } = new Function(`return (${helpers});`)();
      const context = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
      const read = new Map();
      // 8-bit channels and alpha of one colour: rgb()/rgba() read directly, any other form painted on a canvas; a form
      // the canvas does not take is returned as null and reported.
      const rgba = (colour) => {
        if (read.has(colour)) return read.get(colour);
        const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(colour);
        let out = null;
        if (m) out = [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), m[4] === undefined ? 1 : +m[4]];
        else {
          context.fillStyle = "rgba(1, 2, 3, 0)";
          context.fillStyle = colour;
          if (context.fillStyle !== "rgba(1, 2, 3, 0)") {
            context.clearRect(0, 0, 1, 1); context.fillRect(0, 0, 1, 1);
            const d = context.getImageData(0, 0, 1, 1).data;
            out = [d[0], d[1], d[2], d[3] / 255];
          }
        }
        read.set(colour, out);
        return out;
      };
      const COLOUR = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/g;
      const findings = new Map();
      const ids = new Map([...document.querySelectorAll("*")].map((el, i) => [el, i]));
      const candidates = [];
      // A deviation renders when an element matches it and, for a generated box, that box is rendered.
      const renders = (el, pseudo) => {
        if (!pseudo) return true;
        const c = getComputedStyle(el, pseudo);
        return !["none", "normal"].includes(c.content) && c.display !== "none" && c.visibility === "visible";
      };
      const matched = devs.map((d) => [...document.querySelectorAll(d.selector)].filter((el) => shown(el) && renders(el, d.pseudo))
        .map((el) => ({ id: ids.get(el), label: `${label(el)}${d.pseudo}` })));
      const scoped = [...document.querySelectorAll(scope)].some(shown);
      const hidden = { subtree: new Map(), own: new Map() };
      const unread = new Set();
      const skipped = { excluded: 0, subtree: 0, own: 0 };
      const note = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
      const TEXT_FIELD = "input:not([type=checkbox], [type=radio], [type=range], [type=color], [type=hidden]), textarea, select";
      for (const el of document.querySelectorAll("*")) {
        if (!shown(el)) continue;
        if (el.closest(excluded)) { skipped.excluded += 1; continue; }
        const subtree = subtreeExcluded(el, native, governedIn);
        const own = ownPaintExcluded(el, native);
        if (subtree) skipped.subtree += 1;
        else if (own) skipped.own += 1;
        const svg = el instanceof SVGElement;
        for (const pseudo of ["", "::before", "::after"]) {
          const c = getComputedStyle(el, pseudo || null);
          if (pseudo && (["none", "normal"].includes(c.content) || c.display === "none" || c.visibility !== "visible")) continue;
          const text = pseudo ? c.content !== '""'
            : !svg && ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.matches(TEXT_FIELD));
          const paint = [];
          const ownPaint = [["background-color", c.backgroundColor], ["background-image", c.backgroundImage], ["box-shadow", c.boxShadow]];
          for (const side of ["Top", "Right", "Bottom", "Left"]) {
            if (parseFloat(c[`border${side}Width`]) > 0 && !["none", "hidden"].includes(c[`border${side}Style`])) ownPaint.push([`border-${side.toLowerCase()}-color`, c[`border${side}Color`]]);
          }
          if (text) paint.push(["color", c.color], ["text-shadow", c.textShadow]);
          if (text && c.textDecorationLine !== "none") paint.push(["text-decoration-color", c.textDecorationColor]);
          if (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) paint.push(["outline-color", c.outlineColor]);
          if (!pseudo && (el instanceof SVGGeometryElement || el instanceof SVGTextContentElement)) {
            if (c.fill !== "none") paint.push(["fill", c.fill]);
            if (c.stroke !== "none" && parseFloat(c.strokeWidth) > 0) paint.push(["stroke", c.stroke]);
          }
          const where = `${label(el)}${pseudo}`;
          for (const [list, ownList] of [[paint, false], [ownPaint, true]]) {
            for (const [property, value] of list) {
              for (const colour of value.match(COLOUR) ?? []) {
                const v = rgba(colour);
                if (!v) { unread.add(`${where} ${property} ${colour}`); continue; }
                if (v[3] === 0 || Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]) <= threshold) continue;
                const key = `${where} ${property} ${colour}`;
                if (subtree) { note(hidden.subtree, key); continue; }
                if (own && ownList && !pseudo) { note(hidden.own, key); continue; }
                const named = devs.flatMap((d, k) => (d.pseudo === pseudo && el.matches(d.selector) ? [k] : []));
                if (named.length) candidates.push({ key, id: ids.get(el), property, colour: v, devs: named });
                else note(findings, key);
              }
            }
          }
        }
      }
      const list = (map) => [...map].map(([key, n]) => (n > 1 ? `${key} (x${n})` : key));
      return { findings: [...findings], hidden: { subtree: list(hidden.subtree), own: list(hidden.own) }, unread: [...unread], skipped, candidates, matched, scoped };
    }, [PAGE_PREDICATES, MONO_PAGE, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE, EXCLUDED, monoThreshold, MONO_DEVS, MONO_DEVIATION_SCOPE]);
    // The boxes the pixel layer needs, and every rendered element in the viewport with its depth and painting generated boxes.
    const monoLook = (page) => page.evaluate(([src, helpers, native, governedIn, excluded, devs]) => {
      const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
      const { label, shown, box } = new Function(`return (${helpers});`)();
      // Task 3's ground rule (P6-T3b): a descendant paints its own ground when it has a background colour or image.
      const paintsGround = (el) => { const s = getComputedStyle(el); return s.backgroundImage !== "none" || !/^rgba\(.*,\s*0\)$|^transparent$/.test(s.backgroundColor); };
      const boxes = { excluded: [], subtree: [], subtreeGoverned: [], own: [] };
      for (const el of document.querySelectorAll(excluded)) if (shown(el)) { const b = box(el); if (b) boxes.excluded.push(b); }
      for (const entry of native) for (const el of document.querySelectorAll(entry.selector)) {
        if (!shown(el) || el.closest(excluded)) continue;
        if (entry.kind === "subtree") {
          for (const n of [el, ...el.querySelectorAll("*")]) {
            const b = shown(n) && box(n);
            if (b) (governedIn.length && n.closest(governedIn.join(", ")) ? boxes.subtreeGoverned : boxes.subtree).push(b);
          }
        } else {
          const b = box(el);
          if (b) boxes.own.push({ selector: entry.selector, reason: entry.reason, box: b,
            holes: [...el.querySelectorAll("*")].filter((d) => shown(d) && !d.closest(excluded) && paintsGround(d)).map(box).filter(Boolean) });
        }
      }
      const owners = [];
      const index = new Map();
      const ids = new Map([...document.querySelectorAll("*")].map((el, i) => [el, i]));
      const TEXT_FIELD = "input:not([type=checkbox], [type=radio], [type=range], [type=color], [type=hidden]), textarea, select";
      for (const el of document.querySelectorAll("body *")) {
        if (!shown(el)) continue;
        const b = box(el);
        if (!b || b.x >= innerWidth || b.y >= innerHeight || b.x + b.width <= 0 || b.y + b.height <= 0) continue;
        let parent = -1;
        for (let e = el.parentElement; e && parent < 0; e = e.parentElement) parent = index.get(e) ?? -1;
        index.set(el, owners.length);
        let depth = 0;
        for (let e = el; e; e = e.parentElement) depth += 1;
        const kind = el.closest(excluded) ? "excluded" : subtreeExcluded(el, native, governedIn) ? "subtree" : ownPaintExcluded(el, native) ? "own" : null;
        const generated = [];
        for (const pseudo of ["::before", "::after"]) {
          const c = getComputedStyle(el, pseudo);
          if (["none", "normal"].includes(c.content) || c.display === "none" || c.visibility !== "visible") continue;
          generated.push({ pseudo, background: c.backgroundColor, color: c.color });
        }
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const s = getComputedStyle(el);
        const lines = ["Top", "Right", "Bottom", "Left"].filter((side) => parseFloat(s[`border${side}Width`]) > 0 && !["none", "hidden"].includes(s[`border${side}Style`]))
          .map((side) => s[`border${side}Color`]);
        owners.push({ id: ids.get(el), label: label(el), box: b, depth, kind, generated, leaf: own || !el.childElementCount, parent,
          ink: own || el.matches(TEXT_FIELD) ? s.color : null, ground: s.backgroundColor, lines,
          devs: devs.flatMap((d, k) => (el.matches(d.selector) ? [k] : [])) });
      }
      return { boxes, owners };
    }, [PAGE_PREDICATES, MONO_PAGE, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE, EXCLUDED, MONO_DEVS]);
    const rgbOf = (colour) => { const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(colour); return m && (m[4] === undefined || +m[4] === 1) ? [+m[1], +m[2], +m[3]] : null; };
    const monoPixels = async (page) => {
      const look = await monoLook(page);
      const shot = () => page.screenshot({ animations: "disabled", caret: "hide" });
      const painted = await shot();
      // The same view with every descendant of every "own" entry hidden: what remains there is the entry's own paint.
      const own = [...new Set(look.boxes.own.map((o) => o.selector))];
      let bare = painted;
      if (own.length) {
        const style = await page.addStyleTag({ content: `${own.map((s) => `${s} *`).join(", ")} { visibility: hidden !important; transition: none !important; }` });
        bare = await shot();
        await style.evaluate((node) => node.remove());
      }
      const { width, height, rgb } = await decoder.evaluate(async (pngs) => {
        const read = async (data) => {
          const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
          const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, image.width, image.height);
        };
        const images = await Promise.all(pngs.map(read));
        const out = images.map((im) => {
          const bytes = new Uint8Array(im.width * im.height * 3);
          for (let i = 0, p = 0; i < im.data.length; i += 4, p += 3) { bytes[p] = im.data[i]; bytes[p + 1] = im.data[i + 1]; bytes[p + 2] = im.data[i + 2]; }
          let text = "";
          for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return btoa(text);
        });
        return { width: images[0].width, height: images[0].height, rgb: out };
      }, [painted, bare].map((png) => png.toString("base64")));
      const [A, B] = rgb.map((data) => Buffer.from(data, "base64"));
      const excludedMask = boxMask(nativeOwnBoxes(look.boxes.excluded, []), width, height);
      const subtreeMask = boxMask(nativeSubtreeBoxes(look.boxes.subtree, look.boxes.subtreeGoverned), width, height);
      const ownAt = new Int16Array(width * height).fill(-1);
      look.boxes.own.forEach((o, k) => { const mask = boxMask(nativeOwnBoxes([o.box], o.holes), width, height); for (let p = 0; p < mask.length; p += 1) if (mask[p] && ownAt[p] < 0) ownAt[p] = k; });
      // The deepest rendered element whose clipped box holds each pixel.
      const ownerAt = new Int32Array(width * height).fill(-1);
      const order = look.owners.map((o, i) => i).sort((a, b) => look.owners[a].depth - look.owners[b].depth);
      for (const i of order) {
        const b = look.owners[i].box;
        const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(width, Math.ceil(b.x + b.width));
        for (let y = Math.max(0, Math.floor(b.y)); y < Math.min(height, Math.ceil(b.y + b.height)); y += 1) if (x1 > x0) ownerAt.fill(i, y * width + x0, y * width + x1);
      }
      const lab = new Map();
      const labOf = (r, g, b) => { const key = (r << 16) | (g << 8) | b; let v = lab.get(key); if (!v) { v = srgbToLab([r, g, b]); lab.set(key, v); } return v; };
      const generatedLabs = look.owners.map((o) => o.generated.map((g) => ({ pseudo: g.pseudo, ground: rgbOf(g.background) })).filter((g) => g.ground)
        .map((g) => ({ pseudo: g.pseudo, lab: srgbToLab(g.ground) })));
      const labsOf = (colours) => colours.map(rgbOf).filter(Boolean).map((c) => srgbToLab(c));
      const paintLabs = look.owners.map((o) => ({ own: labsOf([o.ink, o.ground, ...o.lines].filter(Boolean)), ground: labsOf([o.ground]) }));
      const near = (labs, lab) => labs.some((l) => deltaE76(l, lab) <= DEFAULT_TOLERANCE);
      // The element (owner index, or -1) and generated box a pixel of this colour at owner i is attributed to (P6-T10f).
      const attributed = new Map();
      const attribute = (i, r, g, b) => {
        const key = `${i}|${(r << 16) | (g << 8) | b}`;
        let hit = attributed.get(key);
        if (hit) return hit;
        const lab = labOf(r, g, b);
        hit = { i, pseudo: "" };
        if (i >= 0) {
          const gen = generatedLabs[i].find((gl) => deltaE76(gl.lab, lab) <= DEFAULT_TOLERANCE);
          if (gen) hit = { i, pseudo: gen.pseudo };
          else if (!near(paintLabs[i].own, lab)) {
            for (let a = look.owners[i].parent; a >= 0; a = look.owners[a].parent) if (near(paintLabs[a].ground, lab)) { hit = { i: a, pseudo: "" }; break; }
          }
        }
        attributed.set(key, hit);
        return hit;
      };
      const excusedPx = MONO_DEVS.map(() => 0);
      const credited = new Map(); // "k|element id" -> excused pixels
      const nativeCounts = {};
      const leaks = { governed: new Map(), subtree: new Map() };
      const cols = Math.ceil(width / MONO_CELL);
      for (let p = 0, o = 0; p < width * height; p += 1, o += 3) {
        if (excludedMask[p]) continue;
        const [r, g, b] = [A[o], A[o + 1], A[o + 2]];
        const ch = chroma([r, g, b]);
        const k = ownAt[p];
        if (!subtreeMask[p] && k >= 0 && deltaE76(labOf(r, g, b), labOf(B[o], B[o + 1], B[o + 2])) <= DEFAULT_TOLERANCE) {
          const key = `${look.boxes.own[k].reason} ${look.boxes.own[k].selector}`;
          nativeCounts[key] = (nativeCounts[key] ?? 0) + 1;
          continue;
        }
        if (ch <= monoThreshold) continue;
        const at = attribute(ownerAt[p], r, g, b);
        if (!subtreeMask[p] && at.i >= 0) {
          const devs = look.owners[at.i].devs.filter((k) => MONO_DEVS[k].pseudo === at.pseudo);
          if (devs.length) {
            for (const k of devs) {
              excusedPx[k] += 1;
              const key = `${k}|${look.owners[at.i].id}`;
              credited.set(key, (credited.get(key) ?? 0) + 1);
            }
            continue;
          }
        }
        const grid = subtreeMask[p] ? leaks.subtree : leaks.governed;
        const x = p % width, y = (p - x) / width, key = Math.floor(y / MONO_CELL) * cols + Math.floor(x / MONO_CELL);
        const cell = grid.get(key) ?? { x0: x, y0: y, x1: x, y1: y, pixels: 0, max: 0, colours: new Map(), owners: new Map() };
        grid.set(key, cell);
        Object.assign(cell, { x0: Math.min(cell.x0, x), y0: Math.min(cell.y0, y), x1: Math.max(cell.x1, x), y1: Math.max(cell.y1, y), pixels: cell.pixels + 1, max: Math.max(cell.max, ch) });
        const colour = `rgb(${r}, ${g}, ${b})`;
        cell.colours.set(colour, (cell.colours.get(colour) ?? 0) + 1);
        const owner = at.i >= 0 ? `${look.owners[at.i].label}${at.pseudo}` : "(none)";
        cell.owners.set(owner, (cell.owners.get(owner) ?? 0) + 1);
      }
      // Cells grouped into clusters of 8-connected cells.
      const clusters = (grid) => {
        const seen = new Set();
        const out = [];
        for (const start of grid.keys()) {
          if (seen.has(start)) continue;
          seen.add(start);
          const c = { x0: Infinity, y0: Infinity, x1: -1, y1: -1, pixels: 0, max: 0, colours: new Map(), owners: new Map() };
          for (const stack = [start]; stack.length;) {
            const key = stack.pop(), cell = grid.get(key);
            Object.assign(c, { x0: Math.min(c.x0, cell.x0), y0: Math.min(c.y0, cell.y0), x1: Math.max(c.x1, cell.x1), y1: Math.max(c.y1, cell.y1), pixels: c.pixels + cell.pixels, max: Math.max(c.max, cell.max) });
            for (const [m, n] of cell.colours) c.colours.set(m, (c.colours.get(m) ?? 0) + n);
            for (const [m, n] of cell.owners) c.owners.set(m, (c.owners.get(m) ?? 0) + n);
            const cx = key % cols, cy = (key - cx) / cols;
            for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
              const next = (cy + dy) * cols + cx + dx;
              if (cx + dx >= 0 && cx + dx < cols && grid.has(next) && !seen.has(next)) { seen.add(next); stack.push(next); }
            }
          }
          const top = (map, n) => [...map].sort((a, b) => b[1] - a[1]).slice(0, n).map(([m, v]) => `${m} ${v}`);
          out.push({ x: c.x0, y: c.y0, width: c.x1 - c.x0 + 1, height: c.y1 - c.y0 + 1, pixels: c.pixels, max: c.max, colours: top(c.colours, 3), owners: top(c.owners, 6) });
        }
        return out.sort((a, b) => b.pixels - a.pixels);
      };
      const governed = clusters(leaks.governed);
      for (const c of governed) {
        Object.assign(c, await page.evaluate(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return { centre: hit ? hit.tagName.toLowerCase() + [...hit.classList].map((n) => "." + n).join("") : null };
        }, [c.x + c.width / 2, c.y + c.height / 2]));
      }
      // Governed leaves (own text, or no element child) at least half under the exclusion mask.
      const masked = look.owners.filter((o) => !o.kind && o.leaf).filter((o) => {
        const b = o.box;
        const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y)), x1 = Math.min(width, Math.ceil(b.x + b.width)), y1 = Math.min(height, Math.ceil(b.y + b.height));
        let area = 0, under = 0;
        for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { area += 1; under += excludedMask[y * width + x]; }
        return area && under * 2 >= area;
      }).map((o) => o.label);
      return { width, height, nativeCounts, governed, subtree: clusters(leaks.subtree), masked, excusedPx, credited };
    };
    for (const route of ROUTES) {
      await withPage({ theme: "mono", route }, async (page) => {
        await page.mouse.move(-1, -1);
        await frames(page);
        const html = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
        invariant(html === "mono", `mono ${route}: <html> data-theme is ${html}`);
        const dom = await monoDom(page);
        // A colour on a named element is excused by every entry naming it that allows it, else it is a leak.
        const leaks = new Map(dom.findings);
        const domCredit = new Map(); // "k|element id" -> excused DOM colours
        const domExcused = MONO_DEVS.map(() => 0);
        for (const c of dom.candidates) {
          const allowing = c.devs.filter((k) => devAllows(k, c.property, c.colour));
          if (!allowing.length) leaks.set(c.key, (leaks.get(c.key) ?? 0) + 1);
          for (const k of allowing) { domExcused[k] += 1; domCredit.set(`${k}|${c.id}`, (domCredit.get(`${k}|${c.id}`) ?? 0) + 1); }
        }
        for (const [key, n] of leaks) invariant(false, `mono ${route}: leak ${key}${n > 1 ? ` (x${n})` : ""}`);
        for (const colour of dom.unread) invariant(false, `mono ${route}: colour form not read ${colour}`);
        const px = await monoPixels(page);
        for (const c of px.governed) {
          invariant(false, `mono ${route}: ${c.pixels} hue px max ${c.max} in ${c.x},${c.y} ${c.width}x${c.height} at ${c.centre} owners ${JSON.stringify(c.owners)} colours ${JSON.stringify(c.colours)}`);
        }
        for (const [key, n] of Object.entries(px.nativeCounts)) console.log(`MONO-NATIVE ${key} ${route} ${n}`);
        MONO_DEVIATIONS.forEach((d, k) => {
          if (dom.matched[k].length || domExcused[k] || px.excusedPx[k]) console.log(`MONO-DEVIATION ${d.reason} ${devName(d)} ${route} dom=${domExcused[k]} px=${px.excusedPx[k]}`);
          if (!dom.scoped) return;
          if (!dom.matched[k].length) invariant(false, `mono ${route}: MONO_DEVIATIONS entry ${devName(d)} matches no rendered element, so the entry is stale`);
          const idle = dom.matched[k].filter(({ id }) => !domCredit.get(`${k}|${id}`) && !px.credited.get(`${k}|${id}`)).map((m) => m.label);
          if (idle.length) invariant(false, `mono ${route}: MONO_DEVIATIONS entry ${devName(d)} matches more than it excuses: nothing excused on ${idle.length} of ${dom.matched[k].length} ${JSON.stringify(idle.slice(0, 6))}`);
        });
        console.log(`MONO-SKIPPED ${route} elements excluded=${dom.skipped.excluded} subtree=${dom.skipped.subtree} own=${dom.skipped.own} dom-subtree=${JSON.stringify(dom.hidden.subtree)} dom-own=${JSON.stringify(dom.hidden.own)} px-subtree=${JSON.stringify(px.subtree.map((c) => `${c.pixels} px max ${c.max} ${c.x},${c.y} ${c.width}x${c.height} ${c.owners.join("; ")}`))}`);
        if (px.masked.length) console.log(`MONO-MASKED ${route} n=${px.masked.length} ${JSON.stringify(px.masked.slice(0, 25))}`);
      });
    }
  }
  // Phase 5 exit (Task 24): P5_ROUTES holds every route of ROUTES that is a Phase 5 page (master plan, Phase 5 table: the
  // simulations, the procedural animations, the terminal and the not-found probe) or renders project media, and at least
  // one procedural piece route; a route left out renders no project media.
  const P5_PAGE = /^\/(simulations|procedural-animations|terminal)(\/|$)|^\/darkfield-404-probe$/;
  invariant(ROUTES.every((route) => !P5_PAGE.test(route) || P5_ROUTES.includes(route)),
    `P5_ROUTES misses a Phase 5 page ${JSON.stringify(ROUTES.filter((route) => P5_PAGE.test(route) && !P5_ROUTES.includes(route)))}`);
  invariant(P5_ROUTES.some((route) => /^\/procedural-animations\/[^/]+$/.test(route)), "P5_ROUTES holds no procedural piece route");
  for (const route of ROUTES.filter((r) => !P5_ROUTES.includes(r))) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      const media = await page.locator(".project-media").count();
      invariant(media === 0, `${route} renders project media (${media}) but is not in P5_ROUTES`);
    });
  }
  for (const route of P5_ROUTES.filter((r) => /^\/(projects|case-studies)(\/|$)/.test(r))) {
    await withPage({ theme: THEMES[0], route }, async (page) => {
      invariant((await page.locator(".project-media").count()) > 0, `${route} is in P5_ROUTES for its project media but renders none`);
    });
  }
  // Phase 5 Task 18 (P5-1; §05 Roles; §10 Atmosphere by context). Rhythm Lab's held rain is always dark, so in Light its
  // page renders the Dark token set: every variable declared on a [data-theme] rule (the theme tokens and the variables
  // derived from them, such as --df-scrim) resolves inside the page exactly as inside a Dark element, and a ground
  // probe painted with the scrim matches, while the document and everything outside the page stay Light. In Dark and
  // Mono the page follows the site. Every Rhythm Lab element sits inside the page (no overlay leaves the scope).
  for (const theme of [...new Set([...THEMES, "mono"])]) {
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await page.locator(".rhythm-lab-highway").waitFor();
      const seen = await page.evaluate(() => {
        const names = new Set();
        const walk = (rules) => { for (const r of rules) { if (r.cssRules) walk(r.cssRules);
          if (r.selectorText && /\[data-theme(="dark")?\]/.test(r.selectorText)) for (const p of r.style) if (p.startsWith("--")) names.add(p); } };
        for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ } }
        const probe = (parent) => { const p = document.createElement("i"); p.style.backgroundColor = "var(--df-scrim)"; parent.append(p);
          const c = getComputedStyle(p); const out = { scrim: c.backgroundColor, vars: Object.fromEntries([...names].sort().map((n) => [n, c.getPropertyValue(n).trim()])) };
          p.remove(); return out; };
        const ref = (t) => { const d = document.createElement("div"); d.setAttribute("data-theme", t); document.body.append(d); const out = probe(d); d.remove(); return out; };
        return { html: document.documentElement.getAttribute("data-theme"), attr: document.querySelector(".rhythm-lab-page").getAttribute("data-theme"),
          names: [...names], inside: probe(document.querySelector(".rhythm-lab")), outside: probe(document.body), dark: ref("dark"), own: ref(document.documentElement.getAttribute("data-theme")),
          strays: [...document.querySelectorAll('[class*="rhythm-lab"]')].filter((e) => !e.closest(".rhythm-lab-page")).map((e) => e.className) };
      });
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      invariant(seen.html === theme, `${theme} rhythm lab: <html> data-theme is ${seen.html}`);
      invariant(seen.names.includes("--field") && seen.names.includes("--df-scrim") && seen.names.length > 20, `${theme} rhythm lab: themed variables not found ${JSON.stringify(seen.names)}`);
      invariant(seen.attr === (theme === "light" ? "dark" : null), `${theme} rhythm lab: page data-theme is ${seen.attr}`);
      invariant(same(seen.inside, theme === "light" ? seen.dark : seen.own), `${theme} rhythm lab: the page does not render the ${theme === "light" ? "Dark" : theme} set ${JSON.stringify([seen.inside, seen.dark])}`);
      invariant(same(seen.outside, seen.own), `${theme} rhythm lab: outside the page is not the site's ${theme} set`);
      invariant(seen.strays.length === 0, `${theme} rhythm lab: elements outside the scoped page ${JSON.stringify(seen.strays)}`);
    });
  }
  // Phase 5 Task 21 (P5-3 option B, ruled; P5-1; §05 Roles; D6 ruling). The Annals parchment is paper in every theme, so
  // the sheet renders the Light token set: inside it every variable declared on a [data-theme] or [data-theme="light"]
  // rule (the theme tokens and the variables derived from them, such as --df-scrim) and a ground probe painted with the
  // scrim resolve exactly as inside a Light element, while the document and everything outside the sheet keep the site's
  // set. Everything the page renders sits inside the sheet. No rule that matches an ancestor of the sheet (the page, the
  // unclassed route wrapper Layout.tsx renders, main and the layout shell up to the document) declares a variable that
  // reads a theme variable unless it also matches [data-theme], so no outer-theme value reaches the sheet through one.
  for (const theme of [...new Set([...THEMES, "mono"])]) {
    await withPage({ theme, route: "/simulations/annals" }, async (page) => {
      await page.locator(".annals-sheet [data-df-region]").first().waitFor();
      const seen = await page.evaluate(() => {
        const names = new Set();
        const rules = [];
        const walk = (list) => { for (const r of list) { if (r.cssRules) walk(r.cssRules); if (r.selectorText) rules.push(r);
          // A theme scope's own rules: a selector item that is the bare [data-theme] or [data-theme="light"] attribute.
          if (r.selectorText && r.selectorText.split(",").some((i) => /^\[data-theme(="light")?\]$/.test(i.trim()))) for (const p of r.style) if (p.startsWith("--")) names.add(p); } };
        for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ } }
        const probe = (parent) => { const p = document.createElement("i"); p.style.backgroundColor = "var(--df-scrim)"; parent.append(p);
          const c = getComputedStyle(p); const out = { scrim: c.backgroundColor, vars: Object.fromEntries([...names].sort().map((n) => [n, c.getPropertyValue(n).trim()])) };
          p.remove(); return out; };
        const ref = (t) => { const d = document.createElement("div"); d.setAttribute("data-theme", t); document.body.append(d); const out = probe(d); d.remove(); return out; };
        const sheet = document.querySelector(".annals-sheet");
        const ancestors = [];
        for (let e = sheet.parentElement; e; e = e.parentElement) ancestors.push(e);
        const reads = (v) => [...names].some((n) => new RegExp(`var\\(${n}(?![\\w-])`).test(v));
        const leaks = [];
        for (const r of rules) {
          if (/\[data-theme/.test(r.selectorText)) continue;
          const hit = ancestors.find((e) => { try { return e.matches(r.selectorText); } catch { return false; } });
          if (!hit) continue;
          for (const p of r.style) if (p.startsWith("--") && reads(r.style.getPropertyValue(p))) leaks.push(`${r.selectorText} { ${p} } on ${hit.tagName}.${hit.classList[0] ?? ""}`);
        }
        const pageEl = document.querySelector(".annals-page");
        return { html: document.documentElement.getAttribute("data-theme"), attr: sheet.getAttribute("data-theme"), names: [...names],
          inside: probe(sheet), outside: probe(document.body), light: ref("light"), own: ref(document.documentElement.getAttribute("data-theme")),
          chain: ancestors.slice(0, 3).map((e) => `${e.tagName.toLowerCase()}${e.className ? "." + e.className.split(" ")[0] : ""}`), leaks,
          strays: [...pageEl.children].filter((e) => e !== sheet).map((e) => e.outerHTML.slice(0, 60)) };
      });
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      invariant(seen.html === theme, `${theme} annals: <html> data-theme is ${seen.html}`);
      invariant(seen.names.includes("--field") && seen.names.includes("--df-scrim") && seen.names.length > 20, `${theme} annals: themed variables not found ${JSON.stringify(seen.names)}`);
      invariant(seen.attr === "light", `${theme} annals: the sheet's data-theme is ${seen.attr}`);
      invariant(same(seen.inside, seen.light), `${theme} annals: the sheet does not render the Light set ${JSON.stringify([seen.inside, seen.light])}`);
      invariant(same(seen.outside, seen.own), `${theme} annals: outside the sheet is not the site's ${theme} set`);
      // The chain names the unclassed route wrapper between .annals-page and main (Layout.tsx's motion.div).
      invariant(same(seen.chain, ["div.annals-page", "div", "main.app-content"]), `${theme} annals: the sheet's ancestors are ${JSON.stringify(seen.chain)}`);
      invariant(seen.leaks.length === 0, `${theme} annals: an ancestor of the sheet declares a theme-derived variable ${JSON.stringify(seen.leaks)}`);
      invariant(seen.strays.length === 0, `${theme} annals: page content outside the scoped sheet ${JSON.stringify(seen.strays)}`);
    });
  }
  // Phase 5 Task 21 amend (P5-T21c; §06 voices). Every element on the Annals sheet that carries a generated type class
  // renders that voice: its family, size, line height, weight, tracking and case equal those of a probe with the same class
  // in the sheet's own token set, so no utility class the element keeps overrides the voice. Checked at load, with the
  // hand available, and with the fork, the log and a watched soul's banner on the sheet, in every theme. Task 22 (§13
  // control model): every button and the seed field on the sheet carry a voice of their own, also with a verb chosen and
  // on the replayed baseline; in each of those states the P5 sweep finds nothing on the page, the fork's houses included;
  // and the watched soul's row is Selected through aria-pressed (the signal-deep band, a signal boundary and label, the
  // node at its upper-right corner) with its ★ marker in fg, all from the sheet's token set.
  const VOICE = /^df-(display|heading|body|label|readout|code|data|annotation)(-[\w-]+)?$/;
  const voices = (page) => page.evaluate((source) => {
    const re = new RegExp(source);
    const sheet = document.querySelector(".annals-sheet");
    const props = ["fontFamily", "fontSize", "lineHeight", "fontWeight", "letterSpacing", "textTransform"];
    const out = { checked: 0, bad: [], unvoiced: [] };
    for (const el of sheet.querySelectorAll("button, input")) {
      if (el.getClientRects().length && ![...el.classList].some((c) => re.test(c))) out.unvoiced.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 24)}"`);
    }
    for (const el of sheet.querySelectorAll("[class*='df-']")) {
      const voice = [...el.classList].find((c) => re.test(c));
      if (!voice || !el.getClientRects().length) continue;
      const probe = document.createElement("span"); probe.className = voice; sheet.append(probe);
      const [a, b] = [getComputedStyle(el), getComputedStyle(probe)];
      const diff = props.filter((p) => a[p] !== b[p]).map((p) => `${p} ${a[p]} != ${b[p]}`);
      probe.remove();
      out.checked += 1;
      if (diff.length) out.bad.push(`${el.tagName.toLowerCase()}.${voice} "${el.textContent.trim().slice(0, 24)}": ${diff.join("; ")}`);
    }
    return out;
  }, VOICE.source);
  const watched = (page) => page.evaluate(() => {
    const sheet = document.querySelector(".annals-sheet");
    const tok = (n) => { const p = document.createElement("i"); p.style.color = `var(${n})`; sheet.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    return [...sheet.querySelectorAll('.annals-living button[aria-pressed="true"]')].map((row) => {
      const [c, node, glyph] = [getComputedStyle(row), getComputedStyle(row, "::after"), row.querySelector(".annals-value")];
      return { glyph: glyph?.textContent, band: c.backgroundColor === tok("--signal-deep"), boundary: c.borderTopColor === tok("--signal"), label: c.color === tok("--signal"),
        node: node.content !== "none" && node.backgroundColor === tok("--signal"), value: glyph && getComputedStyle(glyph).color === tok("--fg") };
    });
  });
  for (const theme of [...new Set([...THEMES, "mono"])]) {
    await withPage({ theme, route: "/simulations/annals" }, async (page) => {
      await page.locator(".annals-sheet [data-df-region]").first().waitFor();
      const advance = page.getByRole("button", { name: "let a year pass →" });
      const off = '.annals-page aside .flex-wrap > button:is(:disabled, [aria-disabled="true"])';
      const seen = [["load", await voices(page), await p5Sweep(page)]];
      for (let year = 0; year < 3 && (await page.locator(off).count()); year++) await advance.click();
      seen.push(["available", await voices(page), await p5Sweep(page)]);
      await page.getByRole("button", { name: "exile", exact: true }).click();
      seen.push(["verb chosen", await voices(page), await p5Sweep(page)]);
      await page.locator(".annals-living button").first().click();
      await page.getByRole("button", { name: "the fork", exact: true }).click();
      await page.locator(".annals-living button").first().click();
      invariant(await page.locator(".annals-sheet > section").count() && await page.locator(".annals-banner").count(), `${theme} annals voices: the fork or the banner did not open`);
      invariant(await page.locator(".annals-sheet > section h3", { hasText: "Houses" }).count(), `${theme} annals voices: the fork shows no houses`);
      seen.push(["fork, log and banner", await voices(page), await p5Sweep(page)]);
      // Read once the click's Pressed acknowledgement has ended, with the pointer away (Selected, not Pressed or Hover).
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => !document.querySelector(".annals-sheet [data-df-pressed]"));
      await frames(page);
      const marks = await watched(page);
      invariant(marks.length === 1 && marks[0].glyph === "★" && Object.values(marks[0]).every(Boolean), `${theme} annals: the watched soul's row ${JSON.stringify(marks)}`);
      await page.getByRole("button", { name: "baseline", exact: true }).click();
      seen.push(["baseline", await voices(page), await p5Sweep(page)]);
      for (const [state, { checked, bad, unvoiced }, swept] of seen) {
        invariant(checked >= 12, `${theme} annals voices (${state}): only ${checked} voiced elements found`);
        invariant(bad.length === 0, `${theme} annals voices (${state}): ${JSON.stringify(bad)}`);
        invariant(unvoiced.length === 0, `${theme} annals voices (${state}): controls without a voice ${JSON.stringify(unvoiced)}`);
        invariant(swept.length === 0, `${theme} annals sweep (${state}): ${JSON.stringify(swept)}`);
      }
    });
  }
  // Phase 5 Task 22 (§13 Disabled, its reason; §06 voices). The verb hint keeps its box: at 1440, 375 and 320 px wide, for
  // every text it shows (at rest, with a verb chosen, and asking for the second soul of a two-soul verb, there with every
  // name the world can give a soul), its text lies inside the hint's box and nothing overflows it, and the roster heading
  // below stays the same distance from the hint, so the roster never moves as the hint changes. A child may be named after
  // a parent with " II" added, again for each generation (world.js), so the widest pool name is also tried with one and two.
  // Task 22 amend (§13 control model, target size): at 375 and 320 px the seed field is at least three cells tall and no
  // shorter than any button on its line (at 320 px the row wraps and none may share it).
  const { NAME_POOL } = await import(new URL("../src/pages/Annals/sim/names.js", import.meta.url));
  for (const theme of THEMES) {
    for (const width of [VIEW_W, 375, 320]) {
      await withPage({ theme, route: "/simulations/annals" }, async (page) => {
        if (width !== VIEW_W) { await page.setViewportSize({ width, height: 812 }); await frames(page); }
        await page.locator(".annals-sheet [data-df-region]").first().waitFor();
        if (width !== VIEW_W) {
          const seed = await page.evaluate(() => {
            const field = document.querySelector(".annals-sheet > div > input"); const f = field.getBoundingClientRect();
            const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h"));
            const line = [...field.parentElement.querySelectorAll(":scope > button")].map((b) => b.getBoundingClientRect())
              .filter((b) => b.bottom > f.top && b.top < f.bottom).map((b) => b.height);
            return { height: f.height, target: 3 * cell, line };
          });
          invariant(seed.height >= seed.target - 0.5 && seed.line.every((h) => seed.height >= h - 0.5),
            `${theme} ${width}px annals: the seed field is below the target or its row's buttons ${JSON.stringify(seed)}`);
        }
        const hint = () => page.evaluate(() => {
          const p = document.querySelector(".annals-columns aside > p");
          const living = [...p.parentElement.querySelectorAll(":scope > h2")].find((h) => /the living/i.test(h.textContent));
          const box = p.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(p);
          const outside = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0 &&
            (r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5 || r.left < box.left - 0.5 || r.right > box.right + 0.5)).length;
          return { text: p.textContent, outside, overflow: p.scrollHeight - p.clientHeight, below: Math.round((living.getBoundingClientRect().top - box.top) * 10) / 10 };
        });
        const advance = page.getByRole("button", { name: "let a year pass →" });
        const off = '.annals-page aside .flex-wrap > button:is(:disabled, [aria-disabled="true"])';
        const seen = [await hint()];
        for (let year = 0; year < 3 && (await page.locator(off).count()); year++) await advance.click();
        seen.push(await hint());
        await page.getByRole("button", { name: "give grain", exact: true }).click();
        seen.push(await hint());
        await page.getByRole("button", { name: "give grain", exact: true }).click();
        await page.getByRole("button", { name: "urge alliance", exact: true }).click();
        seen.push(await hint());
        await page.locator(".annals-living button").first().click();
        const second = await hint();
        const named = /\(([^)]+)\)/.exec(second.text)?.[1];
        invariant(named, `${theme} ${width}px annals hint: no second-soul text ${JSON.stringify(second.text)}`);
        seen.push(second);
        // Every name a soul can carry, written into the hint's own text for the measurement and then put back.
        const swap = ([from, to]) => { const t = document.querySelector(".annals-columns aside > p > span").firstChild; t.textContent = t.textContent.replace(`(${from})`, `(${to})`); };
        const widest = await page.evaluate((names) => {
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.font = getComputedStyle(document.querySelector(".annals-columns aside > p > span")).font;
          return names.reduce((a, b) => (ctx.measureText(b).width > ctx.measureText(a).width ? b : a));
        }, NAME_POOL);
        for (const name of named ? [...NAME_POOL, `${widest} II`, `${widest} II II`] : []) {
          await page.evaluate(swap, [named, name]);
          seen.push(await hint());
          await page.evaluate(swap, [name, named]);
        }
        const bad = seen.filter((h) => h.outside || h.overflow > 0);
        invariant(bad.length === 0, `${theme} ${width}px annals hint: text outside its box ${JSON.stringify(bad)}`);
        const below = [...new Set(seen.map((h) => h.below))];
        invariant(below.length === 1, `${theme} ${width}px annals hint: the roster moves as the hint changes ${JSON.stringify(seen.map((h) => [h.text.slice(0, 24), h.below]))}`);
      });
    }
  }
  // Phase 5 Task 19 (§13 control model; §06 voices; D7 context labels). Rhythm Lab's active session bar at phone widths,
  // while the run plays and while it is paused, in every theme Mono included: each item of the session's context (the
  // file and the two context labels) lies whole inside the viewport, inside every clipping ancestor and clear of the
  // breadcrumb and the actions, and nothing is drawn over its text. Only the file may end in an ellipsis, inside its own
  // box, and then its accessible name holds the whole name.
  const sessionContext = () => {
    const bar = document.querySelector(".rhythm-lab-active-bar");
    const blockers = [...bar.querySelectorAll(".rhythm-lab-active-actions > *, .rhythm-lab-back-link")].filter((e) => e.getClientRects().length)
      .map((e) => [e.textContent.trim(), e.getBoundingClientRect()]);
    const meets = (a, q) => a.left < q.right - 0.5 && a.right > q.left + 0.5 && a.top < q.bottom - 0.5 && a.bottom > q.top + 0.5;
    const out = [];
    for (const el of bar.querySelector(".rhythm-lab-active-context").children) {
      if (!el.getClientRects().length) continue;
      const name = el.textContent.trim(); const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 0.5 && !(el.matches(".rhythm-lab-active-filename") && c.textOverflow === "ellipsis" && el.getAttribute("aria-label") === name)) {
        out.push(`"${name}" truncated (${el.scrollWidth} > ${el.clientWidth})`);
      }
      if (r.width < 1 || r.left < -0.5 || r.right > innerWidth + 0.5) out.push(`"${name}" not wholly in the viewport (${r.left.toFixed(1)}..${r.right.toFixed(1)})`);
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const ac = getComputedStyle(a); if (ac.overflowX === "visible" && ac.overflowY === "visible") continue;
        const q = a.getBoundingClientRect();
        if (r.left < q.left - 0.5 || r.right > q.right + 0.5 || r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5) out.push(`"${name}" clipped by ${a.className.split(" ")[0]}`);
      }
      for (const [t, q] of blockers) if (meets(r, q)) out.push(`"${name}" under "${t}"`);
      // A truncated file name's text runs past its box: sample the part shown.
      const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect();
      const left = Math.max(t.left, r.left); const width = Math.min(t.right, r.right) - left;
      for (let i = 1; i < 6; i++) {
        const hit = document.elementFromPoint(left + (width * i) / 6, t.top + t.height / 2);
        if (!hit || (hit !== el && !el.contains(hit))) { out.push(`"${name}" covered by ${hit ? hit.className || hit.tagName : "nothing"}`); break; }
      }
    }
    return out;
  };
  // Three sessions: the silent starter run, a run of a local file with a long name, and a chart recording (no pause).
  const LONG_FILE = "a-rather-long-local-audio-file-name-for-the-session-bar.wav";
  for (const theme of [...new Set([...THEMES, "mono"])]) for (const width of [320, 343, 375, 390, 430]) for (const session of ["starter", "long file", "recording"]) {
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await page.setViewportSize({ width, height: 812 }); await frames(page);
      const start = page.getByRole("button", { name: "Start", exact: true }); await start.waitFor();
      if (session !== "starter") await rhythmFile(page, LONG_FILE, 20);
      if (session === "recording") await page.getByRole("button", { name: "Record chart", exact: true }).click();
      else await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Start").click());
      await page.locator(".rhythm-lab-active-bar").waitFor(); await frames(page);
      const playing = await page.evaluate(sessionContext);
      let paused = [];
      if (session !== "recording") {
        await page.keyboard.press("Escape"); await page.locator(".rhythm-lab-overlay").waitFor(); await frames(page);
        paused = await page.evaluate(sessionContext);
      }
      invariant(playing.length === 0 && paused.length === 0, `${theme} /simulations/rhythm-lab ${width}px ${session}: active session context ${JSON.stringify({ playing, paused })}`);
    });
  }
  // Before a run on a phone, with a file loaded, the ready check's Start is on screen and takes the pointer: the setup face
  // scrolls inside its own bound and never pushes the highway away. The panel tabs keep one line each, and in the
  // saved-songs menu every option is on screen and no wider than the menu: a long title ends in an ellipsis and its date
  // stays shown.
  for (const theme of [...new Set([...THEMES, "mono"])]) for (const [width, height] of [[320, 568], [320, 640], [343, 600], [375, 667]]) {
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await page.setViewportSize({ width, height }); await frames(page);
      await page.getByRole("button", { name: "Start", exact: true }).waitFor();
      await rhythmFile(page, "Daft Punk - Harder Better Faster Stronger (Alive 2007).wav");
      await rhythmFile(page, "probe-track.wav"); await frames(page);
      const seen = await page.evaluate(() => {
        const start = [...document.querySelectorAll(".rhythm-lab-overlay button")].find((b) => b.textContent.trim() === "Start");
        const r = start.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const tabs = [...document.querySelectorAll(".rhythm-lab-panel-tabs [role=tab]")].map((t) => { const range = document.createRange(); range.selectNodeContents(t);
          return [t.textContent.trim(), new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size, Math.round(t.getBoundingClientRect().height)]; });
        const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-h"));
        return { start: !!hit && (hit === start || start.contains(hit)), at: [Math.round(r.top), Math.round(r.bottom)], hit: hit ? String(hit.className || hit.tagName) : "none", tabs, cell };
      });
      invariant(seen.start, `${theme} /simulations/rhythm-lab ${width}x${height} file loaded: Start unreachable ${JSON.stringify(seen)}`);
      // One line each: no tab is taller than the control model's phone target (a wrapped name or marker adds a line).
      invariant(seen.tabs.every(([, lines, h]) => lines === 1 && h <= 3 * seen.cell + 0.5), `${theme} /simulations/rhythm-lab ${width}x${height}: tabs ${JSON.stringify(seen.tabs)}`);
      await page.locator(".rhythm-lab-song-selector-trigger").click(); await page.locator(".rhythm-lab-song-list").waitFor(); await frames(page);
      const menu = await page.evaluate(() => {
        const list = document.querySelector(".rhythm-lab-song-list"); const l = list.getBoundingClientRect(); const out = [];
        if (list.scrollWidth > list.clientWidth + 0.5) out.push(`list scrolls sideways ${list.scrollWidth} > ${list.clientWidth}`);
        for (const o of list.querySelectorAll(".rhythm-lab-song-option")) {
          const r = o.getBoundingClientRect(); const title = o.querySelector(".rhythm-lab-song-option-title"); const date = o.querySelector(".rhythm-lab-song-option-meta").getBoundingClientRect();
          if (r.left < l.left - 0.5 || r.right > l.right + 0.5) out.push(`option ${r.left.toFixed(1)}..${r.right.toFixed(1)} outside the menu ${l.left.toFixed(1)}..${l.right.toFixed(1)}`);
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit || (hit !== o && !o.contains(hit))) out.push(`option "${title.textContent}" not on screen (hit ${hit ? String(hit.className || hit.tagName) : "none"})`);
          if (date.width < 1 || date.right > r.right + 0.5) out.push(`date not shown in "${title.textContent}"`);
          if (title.scrollWidth > title.clientWidth + 0.5 && getComputedStyle(title).textOverflow !== "ellipsis") out.push(`"${title.textContent}" cut without an ellipsis`);
          if (getComputedStyle(title).textTransform !== "none") out.push(`"${title.textContent}" recased`);
        }
        return out;
      });
      invariant(menu.length === 0, `${theme} /simulations/rhythm-lab ${width}x${height}: saved-songs menu ${JSON.stringify(menu)}`);
    });
  }
  // Phase 5 Task 20 (§08 Layers and overlays; §06 voices; §13 control model, Focus; D8; P3-5). Rhythm Lab's overlays and
  // dialogs in each state they take, in every theme Mono included: the ready check (at load), the tutorial prompt, the
  // pause menu, the run summary, and the delete and import dialogs. Each is swept like the rest of the page (square
  // corners, a Darkfield family); a panel or dialog is an opaque surface-2 face in an edge boundary over the scrim; every
  // run of text in it reads fg or fg-muted of the page's token set, never the highway's pinned ink; every action is a
  // control, none is filled and all take one height. A dialog takes focus on open, keeps Escape, and gives focus back to
  // its opener on close.
  const rhythmInk = (page) => page.evaluate(() => {
    const host = document.querySelector(".rhythm-lab"); const p = document.createElement("i"); host.append(p);
    const read = (prop, v) => { p.style[prop] = v; return getComputedStyle(p)[prop]; };
    const out = { fg: read("color", "var(--fg)"), muted: read("color", "var(--fg-muted)"), surface: read("backgroundColor", "var(--surface-2)"),
      scrim: read("backgroundColor", "var(--df-scrim)") };
    p.style.border = "var(--stroke-hair) solid var(--edge)"; const b = getComputedStyle(p); out.border = `${b.borderTopStyle} ${b.borderTopWidth} ${b.borderTopColor}`;
    p.remove(); return out;
  });
  const rhythmFace = (page, face, ground) => page.evaluate(([f, g]) => {
    const el = document.querySelector(f); if (!el) return { missing: f };
    const c = getComputedStyle(el); const inks = new Set();
    for (const e of [el, ...el.querySelectorAll("*")]) {
      if (e.getClientRects().length && !e.closest("button") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) inks.add(getComputedStyle(e).color);
    }
    const buttons = [...el.querySelectorAll("button")];
    return { bg: c.backgroundColor, border: `${c.borderTopStyle} ${c.borderTopWidth} ${c.borderTopColor}`, inks: [...inks],
      ground: g ? getComputedStyle(document.querySelector(g)).backgroundColor : null,
      heights: [...new Set(buttons.filter((b) => b.getClientRects().length).map((b) => Math.round(b.getBoundingClientRect().height)))],
      plain: buttons.filter((b) => !b.matches(".df-control.df-label")).map((b) => b.textContent.trim()),
      filled: buttons.filter((b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)").map((b) => b.textContent.trim()) };
  }, [face, ground]);
  const checkFace = (where, seen, ink, { face = true, ground = true } = {}) => {
    if (seen.missing) { invariant(false, `${where}: ${seen.missing} not rendered`); return; }
    if (face) {
      invariant(seen.bg === ink.surface, `${where}: face ${seen.bg}, not opaque surface-2 ${ink.surface}`);
      invariant(seen.border === ink.border, `${where}: boundary ${seen.border}, not ${ink.border}`);
    }
    if (ground) invariant(seen.ground === ink.scrim, `${where}: ground ${seen.ground}, not the scrim ${ink.scrim}`);
    invariant(seen.inks.length > 0 && seen.inks.every((c) => c === ink.fg || c === ink.muted), `${where}: text inks ${JSON.stringify(seen.inks)} (fg ${ink.fg}, fg-muted ${ink.muted})`);
    invariant(seen.plain.length === 0 && seen.filled.length === 0, `${where}: actions ${JSON.stringify({ plain: seen.plain, filled: seen.filled })}`);
    // Actions side by side or stacked keep one control height: none is stretched by a neighbour's margin.
    invariant(seen.heights.length <= 1, `${where}: action heights ${JSON.stringify(seen.heights)}`);
  };
  const rhythmButton = (page, name) => page.locator(".rhythm-lab").getByRole("button", { name, exact: true });
  for (const theme of [...new Set([...THEMES, "mono"])]) {
    // Ready check, tutorial prompt, pause menu, run summary.
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await rhythmButton(page, "Start").waitFor(); await frames(page);
      const ink = await rhythmInk(page);
      const states = [["ready check", async () => {}],
        ["pause menu", async () => { await rhythmButton(page, "Start").click(); await page.locator(".rhythm-lab-active-bar").waitFor();
          await page.keyboard.press("Escape"); await page.locator(".rhythm-lab-pause-panel").waitFor(); }],
        ["run summary", async () => { await rhythmButton(page, "End Song").click(); await page.locator(".rhythm-lab-summary-panel").waitFor(); }]];
      for (const [state, reach] of states) {
        await reach(); await page.mouse.move(0, 0); await frames(page);
        const where = `${theme} /simulations/rhythm-lab ${state}`;
        invariant((await page.locator(".rhythm-lab-overlay").count()) === 1, `${where}: no overlay`);
        const bad = await p5Sweep(page);
        invariant(bad.length === 0, `${where}: ${JSON.stringify(bad)}`);
        checkFace(where, await rhythmFace(page, ".rhythm-lab-overlay-panel", ".rhythm-lab-overlay"), ink);
      }
    });
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await rhythmButton(page, "New here? Start tutorial").click(); await page.locator(".rhythm-lab-tutorial-prompt").waitFor();
      await page.mouse.move(0, 0); await frames(page);
      const where = `${theme} /simulations/rhythm-lab tutorial prompt`;
      const bad = await p5Sweep(page);
      invariant(bad.length === 0, `${where}: ${JSON.stringify(bad)}`);
      checkFace(where, await rhythmFace(page, ".rhythm-lab-tutorial-prompt", null), await rhythmInk(page), { face: false, ground: false });
    });
    // The delete dialog, opened from the keyboard, and the import dialog for a chart exported for another song.
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await rhythmLoad(page);
      const ink = await rhythmInk(page);
      const opener = rhythmButton(page, "Delete");
      await opener.focus(); await page.keyboard.press("Enter");
      await page.locator(".rhythm-lab-delete-dialog").waitFor(); await page.mouse.move(0, 0); await frames(page);
      let where = `${theme} /simulations/rhythm-lab delete dialog`;
      const open = await page.evaluate(() => ({ focus: document.activeElement?.textContent.trim(), inside: !!document.activeElement?.closest('[role="dialog"]'),
        cut: document.querySelector(".rhythm-lab-delete-dialog").classList.contains("df-cut-md") }));
      invariant(open.inside && open.focus === "Cancel" && open.cut, `${where}: on open ${JSON.stringify(open)}`);
      invariant((await p5Sweep(page)).length === 0, `${where}: ${JSON.stringify(await p5Sweep(page))}`);
      checkFace(where, await rhythmFace(page, ".rhythm-lab-delete-dialog", ".rhythm-lab-modal-backdrop"), ink);
      await page.keyboard.press("Escape"); await frames(page);
      const closed = await page.evaluate(() => ({ open: !!document.querySelector('[role="dialog"]'), focus: document.activeElement?.textContent.trim().slice(0, 30) ?? null }));
      invariant(!closed.open && closed.focus === "Delete", `${where}: after Escape ${JSON.stringify(closed)} (focus returns to Delete)`);
      await rhythmChart(page, { id: "probe-other-song", title: "Another song", durationMs: 2000, audioFileName: "another-song.wav" });
      await page.locator(".rhythm-lab-delete-dialog").waitFor(); await page.mouse.move(0, 0); await frames(page);
      where = `${theme} /simulations/rhythm-lab import dialog`;
      invariant(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') && document.activeElement.textContent.trim() === "Cancel"), `${where}: focus is not on Cancel`);
      invariant((await p5Sweep(page)).length === 0, `${where}: ${JSON.stringify(await p5Sweep(page))}`);
      checkFace(where, await rhythmFace(page, ".rhythm-lab-delete-dialog", ".rhythm-lab-modal-backdrop"), ink);
    });
    // On a narrow phone (320x568) the chamfered dialog face clips whatever crosses its edge: every action of each dialog
    // (delete, import, clear history), its boundary and its focus ring (the ring and the forced-colours outline) lie inside
    // the dialog's border box. Each action is reached by Tab, so its ring shows. Cancel gives focus back to the control
    // that opened the delete and the import dialogs (clearing history removes its opener, so that dialog only closes).
    const narrowActions = async (where) => {
      const out = [];
      for (const key of ["Tab", "Shift+Tab"]) {
        await page320.keyboard.press(key); await frames(page320);
        out.push(...await page320.evaluate(() => {
          const b = document.activeElement; const dialog = document.querySelector('[role="dialog"]');
          if (!dialog || !dialog.contains(b)) return [`focus left the dialog (${b?.tagName})`];
          const c = getComputedStyle(b); const r = b.getBoundingClientRect(); const d = dialog.getBoundingClientRect();
          const ring = Math.max(0, ...[...c.boxShadow.matchAll(/(-?[\d.]+)px(?=\s*(,|$))/g)].map((m) => parseFloat(m[1])));
          const outline = c.outlineStyle === "none" ? 0 : parseFloat(c.outlineWidth) + Math.max(0, parseFloat(c.outlineOffset));
          const e = Math.max(ring, outline); const name = b.textContent.trim();
          if (!ring) return [`${name}: no focus ring shown`];
          return r.left - e < d.left - 0.5 || r.right + e > d.right + 0.5 || r.top - e < d.top - 0.5 || r.bottom + e > d.bottom + 0.5
            ? [`${name} ${[r.left - e, r.right + e].map((v) => v.toFixed(1))} outside the dialog ${[d.left, d.right].map((v) => v.toFixed(1))}`] : [];
        }));
      }
      invariant(out.length === 0, `${where}: ${JSON.stringify(out)}`);
    };
    const cancelReturns = async (where, opener) => {
      const focus = await page320.evaluate(() => document.activeElement?.textContent.trim());
      invariant(focus === "Cancel", `${where}: Cancel does not hold focus before closing (${focus})`);
      await page320.keyboard.press("Enter"); await frames(page320);
      const after = await page320.evaluate(() => ({ open: !!document.querySelector('[role="dialog"]'), focus: document.activeElement?.textContent.trim().slice(0, 30) ?? null }));
      invariant(!after.open && after.focus === opener, `${where}: after Cancel ${JSON.stringify(after)} (focus returns to ${opener})`);
    };
    let page320;
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      page320 = page; await page.setViewportSize({ width: 320, height: 568 }); await frames(page);
      await rhythmButton(page, "Start").waitFor(); await rhythmLoad(page);
      await rhythmButton(page, "Delete").focus(); await page.keyboard.press("Enter"); await page.locator('[role="dialog"]').waitFor(); await frames(page);
      await narrowActions(`${theme} /simulations/rhythm-lab 320x568 delete dialog`);
      await cancelReturns(`${theme} /simulations/rhythm-lab 320x568 delete dialog`, "Delete");
      const importer = rhythmButton(page, "Import chart"); await importer.focus();
      // Through the hidden input rather than the file chooser, whose event is not reliably delivered; focus stays on
      // Import chart, so the dialog still takes it as the opener.
      await rhythmChart(page, { id: "probe-other-song", title: "Another song", durationMs: 2000, audioFileName: "another-song.wav" });
      await page.locator('[role="dialog"]').waitFor(); await frames(page);
      await narrowActions(`${theme} /simulations/rhythm-lab 320x568 import dialog`);
      await cancelReturns(`${theme} /simulations/rhythm-lab 320x568 import dialog`, "Import chart");
    });
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      page320 = page; await page.setViewportSize({ width: 320, height: 568 }); await frames(page);
      await rhythmButton(page, "Start").click(); await page.locator(".rhythm-lab-active-bar").waitFor();
      await page.keyboard.press("Escape"); await rhythmButton(page, "End Song").click();
      await rhythmButton(page, "Back to setup").click(); await page.getByRole("tab", { name: "History", exact: true }).click();
      const opener = rhythmButton(page, "Clear history"); await opener.focus(); await page.keyboard.press("Enter");
      await page.locator('[role="dialog"]').waitFor(); await frames(page);
      await narrowActions(`${theme} /simulations/rhythm-lab 320x568 clear-history dialog`);
      await page.keyboard.press("Escape"); await frames(page);
      invariant(await page.evaluate(() => !document.querySelector('[role="dialog"]') && document.activeElement?.textContent.trim() === "Clear history"),
        `${theme} /simulations/rhythm-lab 320x568 clear-history dialog: Escape does not close it and return focus to Clear history`);
    });
  }
  // The bounded setup face on a short phone (Task 19) scrolls a control that takes keyboard focus clear of its edge, so
  // the focus ring is never clipped by the face (§13 Focus): every control in it, reached by Tab, has its whole ring inside
  // the face's scrollport. After a saved song is chosen from the menu, by pointer or by keyboard, focus is on the trigger
  // (the chosen option is removed with the list).
  for (const theme of [...new Set([...THEMES, "mono"])]) {
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await page.setViewportSize({ width: 320, height: 568 }); await frames(page);
      await rhythmButton(page, "Start").waitFor(); await rhythmLoad(page);
      const bounded = await page.evaluate(() => { const h = document.querySelector(".rhythm-lab-header"); return h.scrollHeight > h.clientHeight + 1; });
      invariant(bounded, `${theme} /simulations/rhythm-lab 320x568: the setup face does not scroll (the check would be vacuous)`);
      await page.locator(".rhythm-lab-back-link").focus();
      const seen = [];
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab"); await frames(page);
        const at = await page.evaluate(() => {
          const el = document.activeElement; const face = document.querySelector(".rhythm-lab-header");
          if (!el || !face.contains(el)) return null;
          const spread = Math.max(0, ...[...getComputedStyle(el).boxShadow.matchAll(/(-?[\d.]+)px(?=\s*(,|$))/g)].map((m) => parseFloat(m[1])));
          const r = el.getBoundingClientRect(); const f = face.getBoundingClientRect();
          const port = { top: f.top + face.clientTop, left: f.left + face.clientLeft }; port.bottom = port.top + face.clientHeight; port.right = port.left + face.clientWidth;
          const ring = { top: r.top - spread, bottom: r.bottom + spread, left: r.left - spread, right: r.right + spread };
          const clipped = el.matches('input[type="file"]') ? false : ring.top < port.top - 0.5 || ring.bottom > port.bottom + 0.5 || ring.left < port.left - 0.5 || ring.right > port.right + 0.5;
          return { name: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24), spread, clipped,
            ring: [ring.top, ring.bottom].map((v) => +v.toFixed(1)), port: [port.top, port.bottom].map((v) => +v.toFixed(1)) };
        });
        if (!at) { if (seen.length) break; continue; }
        seen.push(at);
      }
      invariant(seen.length >= 8 && seen.every((s) => s.spread > 0), `${theme} /simulations/rhythm-lab 320x568: focus walk ${JSON.stringify(seen)}`);
      const clipped = seen.filter((s) => s.clipped);
      invariant(clipped.length === 0, `${theme} /simulations/rhythm-lab 320x568: focus ring clipped at the setup face's edge ${JSON.stringify(clipped)}`);
    });
    await withPage({ theme, route: "/simulations/rhythm-lab" }, async (page) => {
      await rhythmButton(page, "Start").waitFor();
      await rhythmFile(page, "first-probe-track.wav"); await rhythmFile(page, "second-probe-track.wav");
      const trigger = page.locator(".rhythm-lab-song-selector-trigger");
      const onTrigger = () => page.evaluate(() => ({ trigger: document.activeElement?.matches(".rhythm-lab-song-selector-trigger") ?? false,
        at: document.activeElement ? `${document.activeElement.tagName}.${document.activeElement.classList[0] ?? ""}` : null }));
      const wait = async () => { await frames(page); await page.waitForTimeout(250); await frames(page); };
      await trigger.click(); await page.locator(".rhythm-lab-song-option").first().waitFor();
      await page.locator('.rhythm-lab-song-option[aria-selected="false"]').first().click(); await wait();
      const byPointer = await onTrigger();
      await trigger.focus(); await page.keyboard.press("Enter"); await page.locator(".rhythm-lab-song-option").first().waitFor();
      await page.locator('.rhythm-lab-song-option[aria-selected="false"]').first().focus(); await page.keyboard.press("Enter"); await wait();
      const byKey = await onTrigger();
      await trigger.focus(); await page.keyboard.press("Enter"); await page.locator(".rhythm-lab-song-option").first().waitFor();
      await page.locator(".rhythm-lab-song-option").first().focus(); await page.keyboard.press("Escape"); await wait();
      const byEscape = await onTrigger();
      invariant(byPointer.trigger && byKey.trigger && byEscape.trigger,
        `${theme} /simulations/rhythm-lab: focus after the saved-songs menu closes ${JSON.stringify({ byPointer, byKey, byEscape })}`);
    });
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
// The routes whose route pass ran in every theme: in each shard, exactly its routes; the shards' lists together are ROUTES.
const RAN = ROUTES.filter((route) => THEMES.every((theme) => ran.has(`contrast|${theme}|${route}`)));
console.log(`RAN ${JSON.stringify(RAN)}`);
assert.deepEqual(RAN, SHARD_ROUTES, `shard ${SHARD.i}/${SHARD.n}: the route pass did not run exactly its routes`);
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
