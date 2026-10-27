// web/scripts/darkfield-measure.mjs
// Local-only Darkfield conformance measurement (Phase 6; P6-3, P6-4, P6-5′). Never part of a committed check.
// node scripts/darkfield-measure.mjs <base-url> <playwright-module> --out <dir> [--canonical <dir>] [--limits <file>]
//   [--themes dark,light,mono] [--viewports 1440x900,…] [--routes /,/projects,…] [--tolerance <ΔE>]
// --out must resolve outside this repository and outside every git checkout (an exported copy cannot tell which
// checkout is this repository's); it is refused otherwise, including through a symlink. Limits are read only through
// darkfield-limits.mjs, and only when --canonical is given; they are written only into --out, never to stdout or
// stderr. Without --canonical every verdict is UNJUDGED and the raw measurements are still written. stdout carries
// progress lines with verdict words only.
// Shared lists, tiers and classifiers come from darkfield-measure-lib.mjs; nothing measurement-defining lives here.
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { LimitsError, readLimits } from "./darkfield-limits.mjs";
import {
  DEFAULT_TOLERANCE, EXCLUDED, IDLE_ALLOWED, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE, PAGE_PREDICATES, TIERS, UNCLASSIFIED,
  boxMask, classify, deltaE76, largestComponent, nativeOwnBoxes, nativeSubtreeBoxes, parseTokenColours, srgbToLab, tierBounds, tierOf, verdict,
} from "./darkfield-measure-lib.mjs";

const WEB = resolve(import.meta.dirname, "..");
const DEFAULT_THEMES = ["dark", "light", "mono"];
// The plan's Views set (Phase 6 plan, Measurement model).
const DEFAULT_VIEWPORTS = ["1440x900", "1280x800", "1920x1080", "768x1024", "375x812"];

// ---- Arguments ----
const USAGE = "usage: node scripts/darkfield-measure.mjs <base-url> <playwright-module> --out <dir> [--canonical <dir>] " +
  "[--limits <file>] [--themes a,b] [--viewports WxH,…] [--routes /a,/b] [--tolerance <ΔE>]";
const FLAGS = ["--out", "--canonical", "--limits", "--themes", "--viewports", "--routes", "--tolerance"];
const fail = (message) => { console.error(message); process.exit(1); };
const parseArgs = (argv) => {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      if (!FLAGS.includes(argv[i]) || argv[i + 1] === undefined || argv[i + 1].startsWith("--")) fail(USAGE);
      flags[argv[i].slice(2)] = argv[++i];
    } else positional.push(argv[i]);
  }
  if (positional.length !== 2 || !flags.out) fail(USAGE);
  if (flags.limits && !flags.canonical) fail("--limits fills missing canonical limits only; it needs --canonical");
  const list = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);
  const viewports = list(flags.viewports ?? DEFAULT_VIEWPORTS.join(",")).map((v) => {
    const m = /^(\d+)x(\d+)$/.exec(v);
    if (!m) fail(`bad viewport ${v}`);
    return { width: Number(m[1]), height: Number(m[2]), key: v };
  });
  const tolerance = flags.tolerance === undefined ? DEFAULT_TOLERANCE : Number(flags.tolerance);
  if (!(tolerance >= 0)) fail("bad --tolerance");
  const routes = flags.routes ? list(flags.routes) : null;
  if (routes?.some((r) => !r.startsWith("/"))) fail("routes start with /");
  return { base: positional[0].replace(/\/$/, ""), playwright: positional[1], out: flags.out, canonical: flags.canonical,
    limits: flags.limits, themes: list(flags.themes ?? DEFAULT_THEMES.join(",")), viewports, routes, tolerance };
};

// ---- --out must lie outside the repository ----
// git confined to one directory, GIT_* variables dropped (the limits reader's rule); null on failure.
const gitIn = (dir) => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
  return (...args) => {
    try {
      return execFileSync("git", ["--no-replace-objects", "-C", dir, ...args], { env, stdio: ["ignore", "pipe", "ignore"] }).toString("utf8").trim();
    } catch {
      return null;
    }
  };
};
const real = (path) => realpath(path).catch(() => null);
const inside = (path, top) => path === top || path.startsWith(top.endsWith(sep) ? top : top + sep);
const present = (path) => lstat(path).then(() => true, () => false);
// The protected tree: this module's checkout (lexical and real), and any checkout sharing its git common directory.
// Run from an exported copy (no git), the copy that holds web/ is protected instead.
const protectedTrees = async () => {
  const git = gitIn(import.meta.dirname);
  const top = git("rev-parse", "--show-toplevel");
  const common = git("rev-parse", "--path-format=absolute", "--git-common-dir");
  const root = top ?? resolve(WEB, "..");
  return { tops: [...new Set([root, await real(root)].filter(Boolean))], common: common ? await real(common) : null };
};
const resolveOut = async (out) => {
  const lexical = resolve(out);
  let existing = lexical;
  const rest = [];
  while (!(await present(existing))) {
    rest.unshift(basename(existing));
    existing = dirname(existing);
  }
  const anchor = await real(existing);
  if (!anchor) fail("refused --out: its nearest existing ancestor does not resolve");
  const effective = join(anchor, ...rest);
  const { tops, common } = await protectedTrees();
  if (tops.some((top) => inside(lexical, top) || inside(effective, top))) fail("refused --out: inside the repository");
  const anchorGit = gitIn(anchor);
  const other = anchorGit("rev-parse", "--path-format=absolute", "--git-common-dir");
  if (common && other && (await real(other)) === common) fail("refused --out: inside a checkout of this repository");
  // Run from an exported copy, this module cannot name the repository, so no git checkout and no git directory (a
  // .git, a worktree's gitdir, a bare repository) is accepted. Every refusal happens before anything is created.
  if (anchorGit("rev-parse", "--is-inside-git-dir") === "true" || anchorGit("rev-parse", "--git-dir")) fail("refused --out: inside a git checkout or git directory");
  await mkdir(effective, { recursive: true });
  if ((await real(lexical)) !== effective) fail("refused --out: it changed while it was created");
  return effective;
};

// ---- Views ----
// Routes: the browser test's ROUTES (read from its source, so the two never drift), every top-level article slug of
// the generated articles (nested series objects repeat slugs one level deeper) and every procedural piece.
const readRoutes = async () => {
  const test = await readFile(join(WEB, "scripts/darkfield-foundation-browser-test.mjs"), "utf8");
  const block = /^const ROUTES = \[([\s\S]*?)\];/m.exec(test);
  if (!block) throw new Error("browser test ROUTES not found");
  const routes = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const articles = await readFile(join(WEB, "src/data/generated/articles.ts"), "utf8");
  const slugs = [...articles.matchAll(/^ {4}"slug": "([^"]+)"/gm)].map((m) => `/writing/${m[1]}`);
  const pieces = await readFile(join(WEB, "src/data/proceduralAnimations.ts"), "utf8");
  const pieceRoutes = [...pieces.matchAll(/^ {4}slug: "([^"]+)"/gm)].map((m) => `/procedural-animations/${m[1]}`);
  return [...new Set([...routes, ...slugs, ...pieceRoutes])];
};
const slug = (route) => (route === "/" ? "root" : route.replace(/^\//, "").replace(/[^\w.-]+/g, "__"));

// Report labels for atmosphere elements (names only; they change no measurement).
const ATMOSPHERE_LABELS = [{ route: "/simulations/rhythm-lab", element: "canvas.matrix-rain-3d-background", label: "P2-3" }];

// ---- Limits ----
// One row per verdict: the measured quantity, the limit name and the direction ("max" at most, "min" at least).
const SHARE_ROWS = [
  ["field", "share.field.min", "min"], ["surface", "share.surface.max", "max"], ["structure", "share.structure.max", "max"],
  ["signal", "share.signal.max", "max"], ["signalDimDeep", "share.signalDimDeep.max", "max"],
  ["secondary", "share.secondary.max", "max"],
];
// A limit in the unit of its measurement: % limits become fractions (shares are fractions of the governed area).
const limitOf = (limits, name) => {
  const entry = limits?.[name];
  if (!entry || entry.status !== "ok") return null;
  return entry.unit === "%" ? entry.value / 100 : entry.value;
};
const exact = (n) => ({ lower: n, upper: n });
const RANK = ["UNJUDGED", "PASS", "BORDERLINE", "FAIL"];
const worst = (verdicts, limit) => (limit == null ? "UNJUDGED" : verdicts.reduce((a, b) => (RANK.indexOf(b) > RANK.indexOf(a) ? b : a), "PASS"));

// ---- Page preparation (copied from the browser test: withPage, its seeded Math.random init script, the stored
// theme, the routePass preparation (networkidle, eager images, height settled) and settled) ----
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
const openView = async (browser, { base, route, theme, viewport }) => {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
  await context.addInitScript(() => {
    let seed = 1;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = "eager";
    await Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((done) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    })));
  });
  await page.waitForLoadState("networkidle");
  await settled(page, () => page.evaluate(() => String(document.documentElement.scrollHeight)), `${route}: the page's height did not hold still`);
  await page.evaluate(() => document.fonts.ready.then(() => scrollTo({ top: 0, behavior: "instant" })));
  await page.mouse.move(0, 0);
  return { context, page, errors };
};

// HIDE_TEXT, copied from the browser test (anchor HIDE_TEXT): with the marker on <body>, every text run is hidden.
const HIDE_TEXT = ["", " *", "::before", "::after", " *::before", " *::after"].map((s) => `[data-df-measuring]${s}`).join(", ") +
  " { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; outline-color: transparent !important; }" +
  " [data-df-cover], [data-df-cover] * { pointer-events: auto !important; }";
const HIDE_ATMOSPHERE = "[data-df-atmosphere] { visibility: hidden !important; }";
const HIDE_LAYERS = "[data-df-atmosphere-layer] { visibility: hidden !important; }";

// Captures the viewport; two captures must agree (up to three attempts), as the browser test's captureRuns requires.
const capture = async (page) => {
  let last = null, previous = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const first = await page.screenshot({ animations: "disabled", scale: "css" });
    const second = await page.screenshot({ animations: "disabled", scale: "css" });
    if (first.equals(second)) return { png: first, stable: true };
    [previous, last] = [first, second];
    await page.waitForTimeout(100);
  }
  return { png: last, other: previous, stable: false };
};
// Decoder page pattern (browser test anchor `const decoder`): PNG → RGBA, returned as base64.
const decode = (decoder, png) => decoder.evaluate(async (data) => {
  const image = new Image();
  image.src = `data:image/png;base64,${data}`;
  await image.decode();
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const { data: px } = context.getImageData(0, 0, image.width, image.height);
  let text = "";
  for (let i = 0; i < px.length; i += 0x8000) text += String.fromCharCode(...px.subarray(i, i + 0x8000));
  return { width: image.width, height: image.height, rgba: btoa(text) };
}, png.toString("base64")).then(({ width, height, rgba }) => ({ width, height, px: Buffer.from(rgba, "base64") }));

// ---- In-page collection ----
// Token colours and glow strings by probe, so values come from the page. A subtree may set its own theme (the Annals
// sheet is Light, Rhythm Lab is Dark under Light): each theme in use is probed inside an element that carries it, and
// every pixel, run and element is judged against the tokens of the theme its nearest [data-theme] sets.
const probeTokens = (page, names) => page.evaluate((list) => {
  const scopes = [document.documentElement, ...document.body.querySelectorAll("[data-theme]")];
  const byTheme = {};
  for (const scope of scopes) {
    const theme = scope.getAttribute("data-theme");
    if (!theme || byTheme[theme]) continue;
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden";
    (scope === document.documentElement ? document.body : scope).append(probe);
    const colours = {};
    for (const name of list) { probe.style.color = `var(--${name})`; colours[name] = getComputedStyle(probe).color; }
    const glow = {};
    for (const name of ["glow-signal", "glow-flare"]) {
      probe.style.color = ""; probe.style.boxShadow = `var(--${name})`; probe.style.textShadow = `var(--${name})`;
      const s = getComputedStyle(probe);
      glow[name] = { box: s.boxShadow, text: s.textShadow };
    }
    probe.remove();
    byTheme[theme] = { colours, glow };
  }
  return { root: document.documentElement.getAttribute("data-theme"), byTheme,
    gridUnit: getComputedStyle(document.documentElement).getPropertyValue("--grid-unit").trim() };
}, names);

// Every box and DOM count. probed: probeTokens' byTheme.
const collect = (page, args) => page.evaluate(([src, excludedSelector, native, governedIn, idle, probed]) => {
  const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
  const [W, H] = [innerWidth, innerHeight];
  const name = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + [...el.classList].slice(0, 2).map((c) => `.${c}`).join("");
  const visible = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  // The clip of every clipping ancestor's padding box, from `from` up (the browser test's probeRuns boxes()); null when
  // an ancestor hides everything (screen-reader-only text).
  const clipFrom = (from) => {
    let [cl, ct, cr, cb] = [0, 0, W, H];
    for (let n = from; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.clip === "rect(0px, 0px, 0px, 0px)" || /^inset\(50%/.test(s.clipPath)) return null;
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const b = n.getBoundingClientRect();
      cl = Math.max(cl, b.left + parseFloat(s.borderLeftWidth));
      ct = Math.max(ct, b.top + parseFloat(s.borderTopWidth));
      cr = Math.min(cr, b.right - parseFloat(s.borderRightWidth));
      cb = Math.min(cb, b.bottom - parseFloat(s.borderBottomWidth));
    }
    return [cl, ct, cr, cb];
  };
  const clipped = (rects, clip) => (clip ? rects.map((r) => {
    const [x0, y0, x1, y1] = [Math.max(r.left, clip[0]), Math.max(r.top, clip[1]), Math.min(r.right, clip[2]), Math.min(r.bottom, clip[3])];
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }).filter((r) => r.width > 0 && r.height > 0) : []);
  // An element's boxes; display: contents has none of its own, so its children's stand in.
  const rectsOf = (el) => (getComputedStyle(el).display === "contents" ? [...el.children].flatMap(rectsOf) : [el.getBoundingClientRect()]);
  const boxesOf = (el) => (visible(el) ? clipped(rectsOf(el), clipFrom(el.parentElement)) : []);
  const inView = (el) => boxesOf(el).length > 0;
  const outsideExcluded = (el) => !el.closest(excludedSelector);
  const themeOf = (el) => el.closest("[data-theme]")?.getAttribute("data-theme") ?? null;
  const themes = [...document.body.querySelectorAll("[data-theme]")].map((el) => ({ element: name(el), theme: el.getAttribute("data-theme"), boxes: boxesOf(el) }));
  // A descendant paints a ground over a native element's own paint when it has a background colour or image.
  const paintsGround = (el) => {
    const s = getComputedStyle(el);
    return s.backgroundImage !== "none" || !/^rgba\(.*,\s*0\)$|^transparent$/.test(s.backgroundColor);
  };

  // Atmosphere candidates (the zero-effects capture hides them): canvas and aria-hidden layers, fixed or absolute,
  // covering at least half the viewport. A candidate canvas outside every creative region is an atmosphere layer
  // (P6-T3c): it is not box-excluded, and governed pixels are read from the capture with the atmosphere hidden.
  const atmosphere = [];
  const layers = new Set();
  for (const el of document.querySelectorAll('canvas, [aria-hidden="true"]')) {
    const s = getComputedStyle(el);
    if (!["fixed", "absolute"].includes(s.position) || !visible(el)) continue;
    const boxes = boxesOf(el);
    const area = boxes.reduce((sum, b) => sum + b.width * b.height, 0);
    if (area < (W * H) / 2) continue;
    const layer = el.tagName === "CANVAS" && !el.closest("[data-df-region]");
    if (layer) { layers.add(el); el.setAttribute("data-df-atmosphere-layer", ""); }
    el.setAttribute("data-df-atmosphere", String(atmosphere.length));
    atmosphere.push({ el, element: name(el), route: location.pathname, position: s.position, viewportShare: area / (W * H), layer, boxes });
  }
  // A candidate inside another candidate is the same effect: only the outermost count toward the effects.
  for (const row of atmosphere) row.nested = atmosphere.some((other) => other !== row && other.el.contains(row.el));
  for (const row of atmosphere) delete row.el;

  // Border and shadow paint of an element as boxes (P6-T3b): each border side with a width, a style and a visible
  // colour; each visible box-shadow layer, outer ones as their extent outside the border box, inset ones as the box.
  const visibleColour = (colour) => !/^rgba\(.*,\s*0\)$|^transparent$|\/\s*0\)$/.test(colour.trim());
  const ring = (o, i) => [
    { left: o.left, top: o.top, right: o.right, bottom: Math.min(i.top, o.bottom) },
    { left: o.left, top: Math.max(i.bottom, o.top), right: o.right, bottom: o.bottom },
    { left: o.left, top: Math.max(o.top, i.top), right: Math.min(i.left, o.right), bottom: Math.min(o.bottom, i.bottom) },
    { left: Math.max(i.right, o.left), top: Math.max(o.top, i.top), right: o.right, bottom: Math.min(o.bottom, i.bottom) },
  ];
  const paintOf = (el) => {
    if (!visible(el)) return { kinds: [], boxes: [] };
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const kinds = [];
    const rects = [];
    const side = (name, rect) => {
      const Name = name[0].toUpperCase() + name.slice(1);
      const width = parseFloat(s[`border${Name}Width`]);
      if (!(width > 0) || ["none", "hidden"].includes(s[`border${Name}Style`]) || !visibleColour(s[`border${Name}Color`])) return;
      kinds.push(`border-${name}`);
      rects.push(rect(width));
    };
    side("top", (w) => ({ left: r.left, top: r.top, right: r.right, bottom: r.top + w }));
    side("bottom", (w) => ({ left: r.left, top: r.bottom - w, right: r.right, bottom: r.bottom }));
    side("left", (w) => ({ left: r.left, top: r.top, right: r.left + w, bottom: r.bottom }));
    side("right", (w) => ({ left: r.right - w, top: r.top, right: r.right, bottom: r.bottom }));
    if (s.boxShadow !== "none") {
      for (const layer of s.boxShadow.split(/,(?![^(]*\))/)) {
        const colour = layer.match(/(rgba?|color)\([^)]*\)/)?.[0] ?? "";
        if (colour && !visibleColour(colour)) continue;
        const [x = 0, y = 0, blur = 0, spread = 0] = layer.replace(colour, " ").match(/-?\d*\.?\d+px/g)?.map(parseFloat) ?? [];
        kinds.push("shadow");
        if (/\binset\b/.test(layer)) { rects.push(r); continue; }
        const g = blur + spread;
        rects.push(...ring({ left: r.left + x - g, top: r.top + y - g, right: r.right + x + g, bottom: r.bottom + y + g }, r));
      }
    }
    return { kinds, boxes: clipped(rects, clipFrom(el.parentElement)) };
  };

  const excluded = [...document.querySelectorAll(excludedSelector)].filter((el) => !layers.has(el)).flatMap((el) => boxesOf(el).map((box) => ({
    element: name(el), region: el.getAttribute("data-df-region"), box,
  })));

  const nativeOut = [];
  const skipped = {};
  for (const entry of native) {
    for (const el of document.querySelectorAll(entry.selector)) {
      const boxes = boxesOf(el);
      if (!boxes.length) continue;
      if (entry.kind === "own") {
        // Governed descendants that paint a ground; text drawn on the native ground is governed too (measurePixels).
        // Their border and shadow paint is governed too, without the hole shrink (a strip may be a pixel wide).
        const descendants = [...el.querySelectorAll("*")].filter(outsideExcluded);
        const holes = descendants.filter(paintsGround).flatMap(boxesOf);
        const paint = descendants.map((d) => ({ element: name(d), ground: paintsGround(d), ...paintOf(d) })).filter((p) => p.boxes.length);
        nativeOut.push({ ...entry, element: name(el), boxes, holes, paint });
      } else {
        const governed = [...el.querySelectorAll(governedIn.join(", ") || ":not(*)")].filter((d) => !d.parentElement.closest(governedIn.join(", ")));
        const holes = governed.flatMap(boxesOf);
        const list = [...el.querySelectorAll("*")].filter((d) => subtreeExcluded(d, native, governedIn));
        const tally = {};
        for (const d of list) tally[name(d)] = (tally[name(d)] || 0) + 1;
        skipped[entry.selector] = { reason: entry.reason, elements: list.length + 1, kinds: tally };
        nativeOut.push({ ...entry, element: name(el), boxes, holes });
      }
    }
  }

  // Text runs: every visible text node outside exclusions and native subtrees, with its parent's computed colour.
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !node.textContent.trim() || !visible(parent) || !outsideExcluded(parent)) continue;
    if (subtreeExcluded(parent, native, governedIn)) continue;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(parent.tagName)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = clipped([...range.getClientRects()], clipFrom(parent));
    if (rects.length) runs.push({ element: name(parent), colour: getComputedStyle(parent).color, theme: themeOf(parent), rects });
  }

  // DOM counts over visible governed elements and their generated boxes. Native "own" entries skip their own paint
  // (background, border, shadow, shape); native subtrees are skipped and listed above.
  const glowSignal = [], glowFlare = [], flareFill = [], nodes = [], chamfers = [], caps = [];
  const ownSkipped = [];
  const counted = (el, pseudo, s, viewable) => {
    const at = pseudo ? `${name(el)}${pseudo}` : name(el);
    const row = { element: at, inView: viewable, theme: themeOf(el) };
    const box = el.getBoundingClientRect();
    const { colours, glow } = probed[themeOf(el)] ?? {};
    if (glow) {
      if (glow["glow-signal"].box !== "none" && (s.boxShadow === glow["glow-signal"].box || s.textShadow === glow["glow-signal"].text)) glowSignal.push(row);
      if (glow["glow-flare"].box !== "none" && (s.boxShadow === glow["glow-flare"].box || s.textShadow === glow["glow-flare"].text)) glowFlare.push(row);
      if (s.backgroundColor === colours.flare) flareFill.push(row);
    }
    if ([s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius].includes("50%")) {
      nodes.push({ ...row, width: box.width, height: box.height, text: !pseudo && el.textContent.trim().length > 0 });
    }
    if (s.clipPath.startsWith("polygon(")) {
      const points = s.clipPath.slice(s.clipPath.indexOf("(") + 1, -1).split(",").length;
      chamfers.push({ ...row, points, cuts: Math.max(0, points - 4) });
    }
  };
  for (const el of document.body.querySelectorAll("*")) {
    if (!visible(el) || !outsideExcluded(el) || subtreeExcluded(el, native, governedIn)) continue;
    const viewable = inView(el);
    const s = getComputedStyle(el);
    if (ownPaintExcluded(el, native)) ownSkipped.push(name(el));
    else counted(el, "", s, viewable);
    for (const pseudo of ["::before", "::after"]) {
      const p = getComputedStyle(el, pseudo);
      if (p.content !== "none" && p.content !== "normal" && p.display !== "none") counted(el, pseudo, p, viewable);
    }
    // Authored all-caps runs of four or more letters in the element's own text, for the reviewer.
    if (viewable) {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();
      if (/\p{Lu}{4,}/u.test(own)) caps.push({ element: name(el), text: own.slice(0, 80), family: s.fontFamily, transform: s.textTransform });
    }
  }
  // The R1 mark: its rendered box, its symbol's viewBox and the two custom properties that place it.
  const brand = document.querySelector(".site-header__brand");
  const svg = document.querySelector(".site-header__brand-mark svg");
  const mark = brand && svg ? {
    box: boxesOf(svg)[0] ?? null,
    rendered: (() => { const b = svg.getBoundingClientRect(); return { width: b.width, height: b.height }; })(),
    viewBoxWidth: svg.viewBox?.baseVal?.width || null,
    size: getComputedStyle(brand).getPropertyValue("--df-mark-size").trim(),
    clear: getComputedStyle(brand).getPropertyValue("--df-mark-clear").trim(),
    margin: getComputedStyle(svg.parentElement).margin,
  } : null;

  // Heartbeat rows: IDLE_ALLOWED rows for this route that repeat as a heartbeat and are on screen.
  const heartbeat = idle.filter((row) => row.route === location.pathname && row.repeat === "heartbeat")
    .filter((row) => [...document.querySelectorAll(row.selector)].some(inView)).map((row) => row.selector);

  return { width: W, height: H, themes, excluded, native: nativeOut, nativeSkipped: { subtree: skipped, own: ownSkipped }, runs,
    glowSignal, glowFlare, flareFill, nodes, chamfers, caps, atmosphere, mark, heartbeat };
}, args);

// ---- Pixels ----
const parseColour = (css) => {
  const m = /^rgba?\(([^)]+)\)$/.exec(css.trim());
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
};
// A text run's token. Its colour is resolved against the theme's tokens with each on-* token standing in for the ground
// token whose colour it shares (dark field-deep, light surface-1): text in that colour is the on-* ink, and on-* report
// under text. Other shared colours (Mono) stay ambiguous. Translucent ink is unclassified.
const textTokenMap = (tokens) => {
  const on = Object.entries(tokens).filter(([n]) => n.startsWith("on-"));
  const taken = new Set(on.map(([, c]) => c.join()));
  return Object.fromEntries(Object.entries(tokens).filter(([n, c]) => n.startsWith("on-") || !taken.has(c.join())));
};

// tokensByTheme: { theme: { name: [r, g, b] } } from the page probes; root: the page's theme.
const measurePixels = ({ A, B, data, tokensByTheme, root, tolerance }) => {
  const { width: W, height: H } = A;
  const viewport = W * H;
  const dilate = (boxes) => nativeOwnBoxes(boxes, []); // grows boxes by the lib's exclusion dilation
  const excludedMask = boxMask(dilate(data.excluded.map((e) => e.box)), W, H);
  const creativeMask = boxMask(dilate(data.excluded.filter((e) => e.region !== null).map((e) => e.box)), W, H);
  const nativeByReason = {};
  for (const entry of data.native) {
    const boxes = entry.kind === "own" ? nativeOwnBoxes(entry.boxes, entry.holes) : nativeSubtreeBoxes(entry.boxes, entry.holes);
    (nativeByReason[entry.reason] ??= []).push(...boxes);
  }
  const reasons = Object.keys(nativeByReason);
  const nativeMasks = reasons.map((reason) => boxMask(nativeByReason[reason], W, H));
  // Border and shadow paint of the descendants of "own" entries: governed over the native ground (P6-T3b).
  const paintMask = boxMask(data.native.flatMap((entry) => (entry.paint ?? []).flatMap((p) => p.boxes)), W, H);

  // Theme per pixel: the page's, overridden by each nested [data-theme] box in document order (deeper ones later).
  const themeNames = [root, ...new Set(data.themes.map((t) => t.theme))].filter((t, i, all) => all.indexOf(t) === i);
  const themeAt = new Uint8Array(viewport);
  for (const t of data.themes) {
    const mask = boxMask(t.boxes, W, H);
    const index = themeNames.indexOf(t.theme);
    for (let i = 0; i < viewport; i++) if (mask[i]) themeAt[i] = index;
  }
  const maps = themeNames.map((theme) => {
    const tokens = tokensByTheme[theme] ?? {};
    return { ground: Object.fromEntries(Object.entries(tokens).filter(([n]) => !n.startsWith("on-"))), ink: textTokenMap(tokens) };
  });

  // Run index per pixel (later runs paint over earlier ones), run rects grown like every other box.
  const runAt = new Int32Array(viewport).fill(-1);
  const runLabels = data.runs.map((run, index) => {
    for (const r of dilate(run.rects)) {
      for (let y = Math.max(0, r.y); y < Math.min(H, r.y + r.height); y++) runAt.fill(index, y * W + Math.max(0, r.x), y * W + Math.min(W, r.x + r.width));
    }
    const c = parseColour(run.colour);
    const map = maps[Math.max(0, themeNames.indexOf(run.theme))].ink;
    return c && c.alpha === 1 ? classify(c.rgb, map, tolerance) : UNCLASSIFIED;
  });

  const cache = new Map();
  const counts = {};
  const nativeCounts = reasons.map(() => 0);
  let governed = 0, textPixels = 0, textOnNative = 0, paintOnNative = 0;
  const outside = new Uint8Array(viewport); // 1 where the pixel is not governed
  const field = new Uint8Array(viewport); // 2 = field for certain, 1 = field possible (ambiguous or unclassified), 0 = not
  const fieldOf = (label) => (tierOf(label) === "field" ? 2 : label === UNCLASSIFIED || (label.startsWith("ambiguous:") && label.split(/[:+]/).includes("field")) ? 1 : 0);
  const labels = new Array(viewport);
  for (let i = 0; i < viewport; i++) {
    if (excludedMask[i]) { outside[i] = 1; continue; }
    const o = i * 4;
    // Text pixels: they change when the text is hidden and lie in a run's box. Other pixels (including currentColor
    // paint the hidden-text rule also clears, such as icons and borders) are classified from capture A.
    const text = runAt[i] >= 0 && (A.px[o] !== B.px[o] || A.px[o + 1] !== B.px[o + 1] || A.px[o + 2] !== B.px[o + 2]);
    let native = -1;
    for (let k = 0; k < nativeMasks.length && native < 0; k++) if (nativeMasks[k][i]) native = k;
    if (native >= 0) {
      // Governed text drawn on a native ground stays measured; the rest of the native paint is excluded.
      if (!text && !paintMask[i]) { nativeCounts[native] += 1; outside[i] = 1; continue; }
      if (text) textOnNative += 1; else paintOnNative += 1;
    }
    governed += 1;
    let label;
    if (text) {
      label = runLabels[runAt[i]];
      textPixels += 1;
    } else {
      const key = themeAt[i] * 0x1000000 + ((A.px[o] << 16) | (A.px[o + 1] << 8) | A.px[o + 2]);
      label = cache.get(key);
      if (label === undefined) { label = classify([A.px[o], A.px[o + 1], A.px[o + 2]], maps[themeAt[i]].ground, tolerance); cache.set(key, label); }
    }
    counts[label] = (counts[label] || 0) + 1;
    field[i] = fieldOf(label);
    labels[i] = label;
  }
  const share = (mask) => mask.reduce((n, v) => n + v, 0) / viewport;
  const themeShares = Object.fromEntries(themeNames.map((t, k) => [t, themeAt.reduce((n, v) => n + (v === k ? 1 : 0), 0) / viewport]));
  const shares = {
    excluded: share(excludedMask), creative: share(creativeMask),
    native: Object.fromEntries(reasons.map((reason, k) => [reason, nativeCounts[k] / viewport])),
    governed: governed / viewport, themes: themeShares,
  };

  // Void: grid-unit square cells wholly governed and wholly field in capture A; partial edge cells are not void.
  const voidOf = (unit, minimum) => {
    const rows = [];
    for (let cy = 0; cy + unit <= H; cy += unit) {
      const row = [];
      for (let cx = 0; cx + unit <= W; cx += unit) {
        let ok = true;
        for (let y = cy; ok && y < cy + unit; y++) for (let x = cx; x < cx + unit; x++) {
          const i = y * W + x;
          if (outside[i] || field[i] < minimum) { ok = false; break; }
        }
        row.push(ok);
      }
      rows.push(row);
    }
    return largestComponent(rows) * unit * unit;
  };
  return { governed, viewport, counts, textPixels, textOnNative, paintOnNative, shares, labels, outside, excludedMask, voidOf };
};

// ---- One view ----
const measureView = async ({ browser, decoder, options, route, theme, viewport, tokenNames, css, limits, dir }) => {
  const started = Date.now();
  const { context, page, errors } = await openView(browser, { base: options.base, route, theme, viewport });
  try {
    const probed = await probeTokens(page, tokenNames);
    // Probed colours per theme; names whose probe is not an opaque colour, or differs from this checkout's tokens.css,
    // are listed (the preview may serve another build).
    const tokensByTheme = {};
    const unread = [];
    const differs = [];
    for (const [name, { colours }] of Object.entries(probed.byTheme)) {
      let declared = {};
      try { declared = parseTokenColours(css, name); } catch { differs.push(`${name}:*`); }
      tokensByTheme[name] = {};
      for (const [token, value] of Object.entries(colours)) {
        const c = parseColour(value);
        if (c && c.alpha === 1) tokensByTheme[name][token] = c.rgb; else unread.push(`${name}:${token}`);
        if (declared[token] && (!c || c.rgb.join() !== declared[token].join())) differs.push(`${name}:${token}`);
      }
    }
    const gridUnit = parseFloat(probed.gridUnit);
    const data = await collect(page, [PAGE_PREDICATES, EXCLUDED, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE, IDLE_ALLOWED, probed.byTheme]);
    // Captures: A as rendered; B with text hidden; C with every atmosphere candidate hidden (the zero-effects capture).
    // On a view with atmosphere layers, L hides only the layers and LB hides the layers and the text; governed pixels
    // are read from L and LB there (P6-T3c), and from A and B elsewhere.
    const layered = data.atmosphere.some((row) => row.layer);
    const hide = (text, atmosphere) => page.evaluate(([textCss, allCss, layerCss, t, at]) => {
      for (const [id, css, on] of [["df-measuring", textCss, t], ["df-atmosphere", allCss, at === "all"], ["df-layers", layerCss, at === "layers"]]) {
        if (!document.getElementById(id)) document.head.append(Object.assign(document.createElement("style"), { id, textContent: css }));
        document.getElementById(id).disabled = !on;
      }
      document.body.toggleAttribute("data-df-measuring", t);
    }, [HIDE_TEXT, HIDE_ATMOSPHERE, HIDE_LAYERS, text, atmosphere]);
    const a = await capture(page);
    await hide(true, "none");
    const b = await capture(page);
    let [l, lb] = [null, null];
    if (layered) {
      await hide(false, "layers"); l = await capture(page);
      await hide(true, "layers"); lb = await capture(page);
    }
    await hide(false, "all");
    const c = await capture(page);
    const [read, readHidden] = layered ? [l, lb] : [a, b];
    const [A, B] = [await decode(decoder, read.png), await decode(decoder, readHidden.png)];
    if (A.width !== data.width || A.height !== data.height) throw new Error(`capture ${A.width}x${A.height} is not the viewport ${data.width}x${data.height}`);

    if (probed.root !== theme) throw new Error(`the page renders theme ${probed.root}, not the stored ${theme}`);
    const px = measurePixels({ A, B, data, tokensByTheme, root: theme, tolerance: options.tolerance });
    // A capture whose two shots never agreed: count the governed pixels that differ between them (creative content
    // such as an animating iframe may change; governed pixels should not).
    let governedPixelsChanging = 0;
    if (!read.stable) {
      const other = await decode(decoder, read.other);
      for (let i = 0; i < px.viewport; i++) {
        const o = i * 4;
        if (!px.outside[i] && (other.px[o] !== A.px[o] || other.px[o + 1] !== A.px[o + 1] || other.px[o + 2] !== A.px[o + 2])) governedPixelsChanging += 1;
      }
    }
    // The atmosphere's share: pixels inside the candidates' boxes (an animating iframe never counts) whose colour moves by
    // more than the tolerance (CIE76) between the rendered capture and the zero-effects capture; of the viewport outside
    // the box exclusions, and of the governed area (governed pixels only). Per candidate: the pixels that move when only
    // that candidate is hidden.
    const shown = layered ? await decode(decoder, a.png) : A;
    const labOf = new Map();
    const lab = (p, i) => {
      const key = (p.px[i * 4] << 16) | (p.px[i * 4 + 1] << 8) | p.px[i * 4 + 2];
      if (!labOf.has(key)) labOf.set(key, srgbToLab([p.px[i * 4], p.px[i * 4 + 1], p.px[i * 4 + 2]]));
      return labOf.get(key);
    };
    const moved = (p, q, i) => (p.px[i * 4] !== q.px[i * 4] || p.px[i * 4 + 1] !== q.px[i * 4 + 1] || p.px[i * 4 + 2] !== q.px[i * 4 + 2])
      && deltaE76(lab(p, i), lab(q, i)) > options.tolerance;
    const changedShare = (hidden, boxes) => {
      const inBox = boxMask(boxes, A.width, A.height);
      let [n, g] = [0, 0];
      for (let i = 0; i < px.viewport; i++) {
        if (!inBox[i] || px.excludedMask[i] || !moved(shown, hidden, i)) continue;
        n += 1;
        if (!px.outside[i]) g += 1;
      }
      return { ofViewport: n / px.viewport, ofGoverned: g / px.governed };
    };
    const atmosphereShare = data.atmosphere.length
      ? changedShare(await decode(decoder, c.png), data.atmosphere.flatMap((row) => row.boxes))
      : { ofViewport: 0, ofGoverned: 0 };
    const atmosphereRows = [];
    for (const [index, { boxes, ...row }] of data.atmosphere.entries()) {
      await page.evaluate((i) => {
        for (const id of ["df-atmosphere", "df-layers"]) document.getElementById(id).disabled = true;
        const one = document.getElementById("df-atmosphere-one") ?? document.head.appendChild(Object.assign(document.createElement("style"), { id: "df-atmosphere-one" }));
        one.textContent = `[data-df-atmosphere="${i}"] { visibility: hidden !important; }`;
      }, index);
      const alone = await capture(page);
      const label = ATMOSPHERE_LABELS.find((l) => l.route === route && l.element === row.element)?.label ?? null;
      atmosphereRows.push({ ...row, label, changed: changedShare(await decode(decoder, alone.png), boxes), stable: alone.stable });
    }
    const bounds = tierBounds(px.counts, px.governed);
    const tiers = Object.fromEntries(Object.keys(TIERS).map((tier) => {
      const row = SHARE_ROWS.find(([t]) => t === tier);
      const limit = row ? limitOf(limits, row[1]) : null;
      return [tier, { ...bounds[tier], limit: row?.[1] ?? null, verdict: row ? verdict(bounds[tier], limit, row[2]) : "UNJUDGED" }];
    }));
    const voidBounds = { lower: px.voidOf(gridUnit, 2) / px.governed, upper: px.voidOf(gridUnit, 1) / px.governed };
    const voidRow = { ...voidBounds, ofViewport: { lower: voidBounds.lower * px.shares.governed, upper: voidBounds.upper * px.shares.governed },
      gridUnit, verdict: verdict(voidBounds, limitOf(limits, "share.void.min"), "min") };

    // The mark's signal pixels, listed separately (they also count in the signal tier): lower counts pixels classified
    // signal; upper adds unclassified pixels and ambiguous ones that name signal (Mono shares signal's colour).
    const markSignal = { lower: 0, upper: 0 };
    if (data.mark?.box) {
      const inMark = boxMask([data.mark.box], A.width, A.height);
      for (let i = 0; i < inMark.length; i++) {
        const label = inMark[i] ? px.labels[i] : undefined;
        if (!label) continue;
        if (tierOf(label) === "signal") { markSignal.lower += 1; markSignal.upper += 1; }
        else if (label === UNCLASSIFIED || (label.startsWith("ambiguous:") && label.split(/[:+]/).includes("signal"))) markSignal.upper += 1;
      }
    }
    const inViewCount = (list) => list.filter((row) => row.inView).length;
    const count = (list, name) => {
      const n = inViewCount(list);
      return { inView: n, page: list.length, elements: list, verdict: verdict(exact(n), limitOf(limits, name), "max") };
    };
    // Flare fills: where the theme gives flare's colour to another token too (Mono), a fill in it may be that token, so
    // such elements count only in the upper bound.
    const flareShared = Object.fromEntries(Object.entries(tokensByTheme).map(([t, tokens]) => [t,
      Object.entries(tokens).filter(([n, c]) => n !== "flare" && tokens.flare && c.join() === tokens.flare.join()).map(([n]) => n)]));
    const flareRows = data.flareFill.map((row) => ({ ...row, sharedWith: flareShared[row.theme] ?? [] }));
    const flareBounds = { lower: flareRows.filter((r) => r.inView && !r.sharedWith.length).length, upper: inViewCount(flareRows) };
    const nodeLimit = limitOf(limits, "size.node.maxPx");
    const nodes = data.nodes.map((n) => ({ ...n, verdict: verdict(exact(Math.max(n.width, n.height)), nodeLimit, "max") }));
    const chamferLimit = limitOf(limits, "count.chamfer.perContainer");
    const chamfers = data.chamfers.map((n) => ({ ...n, verdict: verdict(exact(n.cuts), chamferLimit, "max") }));
    let mark = null;
    if (data.mark) {
      const sizePx = Math.min(data.mark.rendered.width, data.mark.rendered.height);
      const clearPx = parseFloat(data.mark.clear);
      const clearUnits = data.mark.viewBoxWidth ? clearPx / (data.mark.rendered.width / data.mark.viewBoxWidth) : null;
      mark = { ...data.mark, sizePx, clearPx, clearUnits, signalPixels: markSignal,
        signalShare: { lower: markSignal.lower / px.governed, upper: markSignal.upper / px.governed },
        sizeVerdict: verdict(exact(sizePx), limitOf(limits, "size.mark.minPx"), "min"),
        clearVerdict: clearUnits == null ? "UNJUDGED" : verdict(exact(clearUnits), limitOf(limits, "size.mark.clearUnits"), "min") };
    }
    const result = {
      view: { route, theme, viewport: viewport.key }, url: `${options.base}${route}`, tolerance: options.tolerance,
      denominator: "governed area (P6-4); shares of the viewport are given beside it",
      captures: { stableA: a.stable, stableB: b.stable, stableC: c.stable, stableL: l?.stable ?? null, stableLB: lb?.stable ?? null, governedPixelsChanging },
      pageErrors: errors,
      tokens: { source: "page probe", themes: Object.keys(tokensByTheme), unread, differsFromTokensCss: differs },
      themes: data.themes.map(({ element, theme: t }) => ({ element, theme: t })),
      pixels: { viewport: px.viewport, governed: px.governed, text: px.textPixels, textOnNative: px.textOnNative, paintOnNative: px.paintOnNative, labels: px.counts },
      shares: px.shares,
      tiers,
      void: voidRow,
      counts: {
        glowSignal: count(data.glowSignal, "count.glowSignal.max"),
        glowFlare: count(data.glowFlare, "count.glowFlare.max"),
        flareFill: { ...flareBounds, inView: flareBounds.upper, page: flareRows.length, elements: flareRows, verdict: verdict(flareBounds, limitOf(limits, "count.flare.max"), "max") },
        heartbeat: { inView: data.heartbeat.length, rows: data.heartbeat, verdict: verdict(exact(data.heartbeat.length), limitOf(limits, "count.heartbeat.max"), "max") },
      },
      nodes: { elements: nodes, verdict: worst(nodes.filter((n) => n.inView).map((n) => n.verdict), nodeLimit) },
      chamfers: { elements: chamfers, verdict: worst(chamfers.filter((n) => n.inView).map((n) => n.verdict), chamferLimit) },
      mark,
      caps: data.caps,
      atmosphere: { layered, read: layered ? "L (atmosphere layers hidden)" : "A", share: atmosphereShare, candidates: atmosphereRows, outermost: data.atmosphere.filter((row) => !row.nested).length,
        verdict: verdict(exact(data.atmosphere.filter((row) => !row.nested).length), limitOf(limits, "count.effects.max"), "max"),
        note: "candidates only; the reviewer judges effects and identity on capture C" },
      native: { boxes: data.native.map(({ selector, reason, kind, element, boxes }) => ({ selector, reason, kind, element, boxes })), skipped: data.nativeSkipped,
        // Descendants of "own" entries whose border or shadow paint is governed; ground: false marks border-only ones.
        governedPaint: data.native.flatMap((entry) => (entry.paint ?? []).map(({ element, ground, kinds }) => ({ on: entry.element, element, ground, kinds }))) },
      excluded: data.excluded,
      textRuns: data.runs.length,
      seconds: (Date.now() - started) / 1000,
    };
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${slug(route)}.json`), JSON.stringify(result, null, 1));
    await writeFile(join(dir, `${slug(route)}.A.png`), a.png);
    await writeFile(join(dir, `${slug(route)}.C.png`), c.png);
    return result;
  } finally {
    await context.close();
  }
};

// ---- Summary ----
const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(2)}%`);
const bound = (b) => `${pct(b.lower)}–${pct(b.upper)}`;
const summaryRow = (r) => {
  if (r.error) return `| ${r.view.theme} | ${r.view.viewport} | ${r.view.route} | ERROR: ${r.error} |`;
  const native = Object.entries(r.shares.native).map(([k, v]) => `${k} ${pct(v)}`).join(", ") || "—";
  const tiers = Object.keys(TIERS).map((t) => `${bound(r.tiers[t])} ${r.tiers[t].verdict}`);
  const c = r.counts;
  return [
    r.view.theme, r.view.viewport, r.view.route, pct(r.shares.governed), pct(r.shares.excluded), pct(r.shares.creative), native,
    ...tiers, `${bound(r.void)} ${r.void.verdict}`,
    `${c.glowSignal.inView} ${c.glowSignal.verdict}`, `${c.glowFlare.inView} ${c.glowFlare.verdict}`, `${c.flareFill.lower}–${c.flareFill.upper} ${c.flareFill.verdict}`,
    `${r.nodes.elements.filter((n) => n.inView).length} ${r.nodes.verdict}`, `${r.chamfers.elements.filter((n) => n.inView).length} ${r.chamfers.verdict}`,
    r.mark ? `${r.mark.sizeVerdict}/${r.mark.clearVerdict}, signal ${r.mark.signalPixels.lower}–${r.mark.signalPixels.upper}px` : "—",
    `${r.atmosphere.outermost} ${r.atmosphere.verdict}, changes ${pct(r.atmosphere.share.ofViewport)} of viewport` +
      r.atmosphere.candidates.map((a) => `; ${a.element}${a.label ? ` (${a.label})` : ""}${a.layer ? " layer" : ""}${a.nested ? " nested" : ""}`).join(""), `${c.heartbeat.inView} ${c.heartbeat.verdict}`, r.caps.length,
    `${r.seconds.toFixed(1)}s${r.captures.governedPixelsChanging ? `, governed pixels moving: ${r.captures.governedPixelsChanging}` : ""}`,
  ].join(" | ").replace(/^/, "| ").concat(" |");
};
const writeSummary = async (out, { options, limits, results, started }) => {
  const limitStatus = limits ? Object.fromEntries(Object.entries(limits).map(([n, e]) => [n, e.status])) : null;
  await writeFile(join(out, "summary.json"), JSON.stringify({
    base: options.base, tolerance: options.tolerance, themes: options.themes, viewports: options.viewports.map((v) => v.key),
    denominator: "governed area (P6-4)", canonical: options.canonical ?? null, limits: limits ?? null, started, finished: new Date().toISOString(),
    views: results.map((r) => (r.error ? r : { view: r.view, seconds: r.seconds, shares: r.shares, tiers: r.tiers, void: r.void,
      counts: Object.fromEntries(Object.entries(r.counts).map(([k, v]) => [k, { inView: v.inView, verdict: v.verdict }])),
      nodes: r.nodes.verdict, chamfers: r.chamfers.verdict, mark: r.mark && { sizeVerdict: r.mark.sizeVerdict, clearVerdict: r.mark.clearVerdict, signalPixels: r.mark.signalPixels },
      atmosphere: { layered: r.atmosphere.layered, share: r.atmosphere.share, outermost: r.atmosphere.outermost, candidates: r.atmosphere.candidates.map(({ element, label, layer, nested, changed }) => ({ element, label, layer, nested, changed })), verdict: r.atmosphere.verdict }, caps: r.caps.length, captures: r.captures })),
  }, null, 1));
  const header = ["theme", "viewport", "route", "governed/viewport", "excluded", "creative", "native", ...Object.keys(TIERS), "void",
    "glow-signal", "glow-flare", "flare fill", "50% nodes", "chamfers", "mark size/clear", "atmosphere", "heartbeat", "caps runs", "time"];
  const lines = [
    "# Darkfield conformance measurement", "",
    `Base ${options.base}. Tolerance: CIE76 ΔE ≤ ${options.tolerance}. Denominator: the governed area (P6-4: viewport minus excluded`,
    "boxes minus native pixels); `governed/viewport` gives its share of the viewport. Tier cells are lower–upper bounds and verdict;",
    "excluded, creative and native shares are of the viewport. Counts are elements in view. Verdicts are UNJUDGED without --canonical.",
    "An atmosphere layer (a candidate canvas outside creative regions) is not box-excluded; on a view with one, governed pixels",
    "are read from the capture with the atmosphere hidden. The atmosphere column gives the share of the viewport it changes.",
    `Limits: ${limitStatus ? Object.entries(limitStatus).map(([n, s]) => `${n} ${s}`).join(", ") : "not read (UNJUDGED)"}.`, "",
    `| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`, ...results.map(summaryRow), "",
  ];
  await writeFile(join(out, "summary.md"), lines.join("\n"));
};

// ---- Main ----
const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const out = await resolveOut(options.out);
  let limits = null;
  if (options.canonical) {
    try {
      limits = await readLimits({ canonical: options.canonical, override: options.limits });
    } catch (error) {
      fail(`error ${error instanceof LimitsError ? error.reason : "internal"}`);
    }
    for (const [name, entry] of Object.entries(limits)) if (entry.status !== "ok") console.log(`limit ${entry.status} ${name} (its verdicts are UNJUDGED)`);
  }
  const allRoutes = await readRoutes();
  const routes = options.routes ?? allRoutes;
  const css = await readFile(join(WEB, "src/styles/darkfield/tokens.css"), "utf8");
  const { chromium } = await import(options.playwright);
  const browser = await chromium.launch({ headless: true });
  const decoder = await browser.newPage();
  const results = [];
  const started = new Date().toISOString();
  try {
    for (const theme of options.themes) {
      const tokenNames = Object.keys(parseTokenColours(css, theme));
      for (const viewport of options.viewports) {
        for (const route of routes) {
          const dir = join(out, theme, viewport.key);
          try {
            const r = await measureView({ browser, decoder, options, route, theme, viewport, tokenNames, css, limits, dir });
            results.push(r);
            const words = Object.entries(r.tiers).filter(([, t]) => t.limit).map(([k, t]) => `${k} ${t.verdict}`).join(", ");
            console.log(`view ${theme} ${viewport.key} ${route} ${r.seconds.toFixed(1)}s: ${words}, void ${r.void.verdict}`);
          } catch (error) {
            results.push({ view: { route, theme, viewport: viewport.key }, error: error.message.split("\n")[0] });
            console.log(`view ${theme} ${viewport.key} ${route}: ERROR ${error.message.split("\n")[0]}`);
          }
        }
      }
    }
  } finally {
    await browser.close();
    await writeSummary(out, { options, limits, results, started });
  }
  console.log(`wrote ${results.length} views to ${out}`);
  if (results.some((r) => r.error)) process.exitCode = 1;
};

await main();
