// PR visual review: deterministic base/head screenshots of the routes a change
// can affect, plus a report that separates visual differences from capture and
// runtime failures. Uses the standalone browser-test convention; no app
// dependency, and nothing here changes what visitors get.
//
// node scripts/visual-review.mjs --base-url URL --head-url URL --out DIR
//   [--changed-files FILE] [--routes "/a /b"] [--theme dark|light]
//   [--mode compare|same-revision] [--base-sha SHA] [--head-sha SHA]
//   [--playwright MODULE] [--browser EXECUTABLE] [--plan-only]
//
// --changed-files lists repo-relative paths, one per line. --routes overrides
// selection. --plan-only prints route selection and coverage without a browser.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    "base-url": { type: "string" },
    "head-url": { type: "string" },
    out: { type: "string", default: "/tmp/visual-review" },
    "changed-files": { type: "string" },
    routes: { type: "string", default: "" },
    theme: { type: "string", default: "dark" },
    mode: { type: "string", default: "compare" },
    "base-sha": { type: "string", default: "" },
    "head-sha": { type: "string", default: "" },
    playwright: { type: "string", default: "playwright" },
    browser: { type: "string" },
    "plan-only": { type: "boolean", default: false },
  },
});
assert.ok(["dark", "light"].includes(args.theme), "--theme must be dark or light");
assert.ok(["compare", "same-revision"].includes(args.mode), "--mode must be compare or same-revision");

const repoRoot = resolve(import.meta.dirname, "../..");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 667 },
];
const MAX_ROUTES = 6;
const MAX_CAPTURE_HEIGHT = 4000;
const SETTLE_MS = 250;
const MAX_SETTLE_ATTEMPTS = 20;
const FIXED_TIME = "2026-01-01T12:00:00Z";
const RANDOM_SEED = 20260101;
// Rendered by pages/NotFound; any route showing it on one side is "missing" there.
const NOT_FOUND_ROUTE = "/visual-review-missing-route";
// Resolved from the head build's sitemap so the route never goes stale.
const FIRST_ARTICLE = "<first article>";

// Captured when shared code changes or a file has no specific mapping.
const CORE_ROUTES = ["/", "/projects", "/case-studies", "/case-studies/aether", "/writing", "/experience"];
const CASE_STUDY_ROUTES = [
  "/case-studies",
  "/case-studies/aether",
  "/case-studies/erebus",
  "/case-studies/arachne",
  "/case-studies/where-the-specification-lived",
];

// Paths are relative to web/. First match wins; anything under web/ that no
// rule matches falls back to CORE_ROUTES and is reported as unmapped.
// kind: routes = these routes; shared = global input, core set;
// live = not representable as a frozen frame, needs a live preview;
// ignored = not part of the previewed build.
const RULES = [
  { match: /^(docs\/|README|Dockerfile|nginx\.conf$|eslint\.config\.js$)/, kind: "ignored" },
  { match: /^scripts\/(?!build-articles\.mjs$|visual-review\.mjs$)/, kind: "ignored" },
  // Background canvases are hidden in captures so seeded randomness can't leak into diffs.
  { match: /^src\/components\/(AppBackground|MatrixBackground|MatrixRain3DBackground|BionicBackground|StaticBackground)\//, kind: "live" },
  { match: /^src\/(pages|components)\/(OrbitalSimulator|TrafficSimulator|Annals|SnakeGame|SpiderSolitaire|RhythmLab|ProceduralAnimationPiece|Terminal|DataStructureVisualizer)\//, kind: "live" },
  { match: /^src\/hooks\/(useTerminal|useTerminalCore|useTopCommand|useWindowManagement)\.ts$/, kind: "live" },
  { match: /^src\/data\/(fileSystem|fileContents|manPages|processData)\.ts$/, kind: "live" },
  { match: /^public\/procedural-animations\//, kind: "live" },
  { match: /^src\/data\/proceduralAnimations\.ts$/, kind: "routes", routes: ["/procedural-animations"], live: true },
  { match: /^src\/pages\/ProceduralAnimations\//, kind: "routes", routes: ["/procedural-animations"] },
  { match: /^src\/(pages\/Home\/|components\/SkillItem\/)/, kind: "routes", routes: ["/"] },
  { match: /^src\/data\/siteContent\.ts$/, kind: "routes", routes: ["/", "/experience"] },
  { match: /^src\/(pages\/Projects\/|components\/(ProjectRoster|TerminalDropdown)\/|data\/projects\.ts$)/, kind: "routes", routes: ["/projects"] },
  { match: /^src\/components\/ProjectMedia\//, kind: "routes", routes: ["/projects", "/case-studies", "/case-studies/aether"] },
  { match: /^src\/pages\/CaseStudies\//, kind: "routes", routes: ["/case-studies"] },
  { match: /^src\/pages\/CaseStudyAether\//, kind: "routes", routes: ["/case-studies/aether"] },
  { match: /^src\/pages\/CaseStudyErebus\//, kind: "routes", routes: ["/case-studies/erebus"] },
  { match: /^src\/pages\/CaseStudyArachne\//, kind: "routes", routes: ["/case-studies/arachne"] },
  { match: /^src\/(pages\/CaseStudySpecification\/|data\/specificationExperimentPrompts\.ts$)/, kind: "routes", routes: ["/case-studies/where-the-specification-lived"] },
  { match: /^src\/(components\/CaseStudyPage\/|data\/caseStudies\.ts$|data\/caseStudyBlocks\.ts$)/, kind: "routes", routes: CASE_STUDY_ROUTES },
  { match: /^src\/pages\/Writing\//, kind: "routes", routes: ["/writing"] },
  { match: /^src\/content\/articles\/.+\.md$/, kind: "routes", routes: ["/writing"], article: true },
  { match: /^(src\/(pages\/Article\/|components\/ArticlePage\/|utils\/articleFormatting\.ts$|data\/generated\/articles\.ts$)|scripts\/build-articles\.mjs$)/, kind: "routes", routes: ["/writing", FIRST_ARTICLE] },
  { match: /^src\/(pages\/Work\/|components\/(WorkDetails|WorkList)\/|data\/workExperience\.ts$)/, kind: "routes", routes: ["/experience"] },
  { match: /^src\/(pages\/Journey\/|components\/TimelineItem\/|data\/timelineData\.ts$)/, kind: "routes", routes: ["/journey"] },
  { match: /^src\/(pages\/Simulations\/|components\/SimulationCard\/|data\/simulationsData\.ts$)/, kind: "routes", routes: ["/simulations"] },
  { match: /^src\/pages\/NotFound\//, kind: "routes", routes: [NOT_FOUND_ROUTE] },
  { match: /^src\/(index\.css|App\.css|App\.tsx|main\.tsx|styles\/|contexts\/|providers\/|routes\/|components\/(Layout|Navigation|Dock|SettingsPanel|common|TypeWriterText)\/|components\/AnimatedSection\.tsx$|data\/(navigation|routeMetadata|scrollProgressRoutes)\.ts$)|^(index\.html|vite\.config\.ts|package\.json|package-lock\.json)$/, kind: "shared" },
];
// Changes here alter light-theme rendering, which a dark-only run cannot show.
const THEME_SENSITIVE = /^src\/(index\.css|App\.css|styles\/|contexts\/Theme)/;
const HARNESS_FILES = new Set([".github/workflows/visual-review.yml", "web/scripts/visual-review.mjs"]);

const classifyFile = async (file) => {
  if (HARNESS_FILES.has(file)) return { file, kind: "harness", routes: CORE_ROUTES };
  if (!file.startsWith("web/")) return { file, kind: "ignored", routes: [] };
  const path = file.slice("web/".length);
  const rule = RULES.find((candidate) => candidate.match.test(path));
  if (!rule) return { file, kind: "unmapped", routes: CORE_ROUTES };
  const entry = { file, kind: rule.kind, routes: rule.kind === "shared" ? CORE_ROUTES : rule.routes ?? [] };
  if (rule.live) entry.live = true;
  if (rule.article) {
    // Articles route by their frontmatter slug; a deleted file has none to read.
    const source = await readFile(resolve(repoRoot, file), "utf8").catch(() => "");
    const slug = /^slug:\s*["']?([\w-]+)["']?\s*$/m.exec(source)?.[1];
    entry.routes = ["/writing", slug ? `/writing/${slug}` : FIRST_ARTICLE];
  }
  if (THEME_SENSITIVE.test(path)) entry.themeSensitive = true;
  return entry;
};

const planCapture = async () => {
  const changed = args["changed-files"]
    ? (await readFile(args["changed-files"], "utf8")).split("\n").map((line) => line.trim()).filter(Boolean)
    : [];
  const files = await Promise.all(changed.map(classifyFile));
  const explicit = args.routes.split(/\s+/).filter(Boolean);
  const notes = [];
  let source;
  let wanted;
  if (explicit.length) {
    source = "explicit --routes";
    wanted = explicit.map((route) => (route.startsWith("/") ? route : `/${route}`));
  } else if (args.mode === "same-revision") {
    source = "same-revision core set";
    wanted = CORE_ROUTES;
  } else {
    source = "changed files";
    // Specific routes first so the cap trims the generic fallback, not the evidence.
    const specific = files.filter((f) => f.kind === "routes").flatMap((f) => f.routes);
    const broad = files.filter((f) => ["shared", "unmapped", "harness"].includes(f.kind)).flatMap((f) => f.routes);
    wanted = [...specific, ...broad];
  }
  const unique = [...new Set(wanted)];
  const routes = unique.slice(0, MAX_ROUTES);
  const omitted = unique.slice(MAX_ROUTES);

  const unmapped = files.filter((f) => f.kind === "unmapped");
  const live = files.filter((f) => f.kind === "live" || f.live);
  const harnessOnly = files.length > 0 && files.every((f) => f.kind === "harness" || f.kind === "ignored") && files.some((f) => f.kind === "harness");
  const auto = source === "changed files";
  if (explicit.length) notes.push("Routes were chosen explicitly, not derived from changed files.");
  if (auto && unmapped.length) notes.push(`${unmapped.length} changed file(s) have no specific route mapping; the core route set was captured as a conservative fallback, so affected UI outside that set may be missed.`);
  if (live.length) notes.push(`${live.length} changed file(s) affect motion, canvas, or interactive surfaces that a frozen screenshot cannot represent; review them in a live preview.`);
  if (omitted.length) notes.push(`${omitted.length} route(s) exceeded the ${MAX_ROUTES}-route cap and were not captured: ${omitted.join(" ")}. Re-run with workflow_dispatch routes to cover them.`);
  if (args.theme === "dark" && files.some((f) => f.themeSensitive)) notes.push("Theme-sensitive files changed but only the dark theme was captured; re-run with theme=light to check light mode.");
  if (harnessOnly) notes.push("Only the visual-review harness changed, so the app is identical on both sides: every pair should be unchanged.");
  const coverage = explicit.length ? "explicit" : notes.length === 0 || (harnessOnly && notes.length === 1) ? "complete" : "partial";
  return { source, routes, omitted, files, notes, coverage, expectIdentical: args.mode === "same-revision" || harnessOnly };
};

const resolveArticle = async (routes, headUrl) => {
  if (!routes.includes(FIRST_ARTICLE)) return { routes };
  const sitemap = await fetch(`${headUrl}/sitemap.xml`).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const article = /<loc>https?:\/\/[^/<]+(\/writing\/[\w-]+)\/?<\/loc>/.exec(sitemap)?.[1];
  if (article) return { routes: routes.map((r) => (r === FIRST_ARTICLE ? article : r)) };
  return { routes: routes.filter((r) => r !== FIRST_ARTICLE), note: "Could not resolve an article route from the head sitemap; article pages were not captured." };
};

const plan = await planCapture();
if (args["plan-only"]) {
  console.log(JSON.stringify(plan, null, 2));
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `capture=${plan.routes.length > 0}\n`);
  if (!plan.routes.length && process.env.GITHUB_STEP_SUMMARY) {
    const notes = plan.notes.map((note) => `- ${note}\n`).join("");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Visual review\n\nNo route needed a screenshot, so nothing was captured. **Coverage: ${plan.coverage}**\n\n${notes}\n${fileTable(plan.files)}\n`);
  }
  process.exit(0);
}

assert.ok(args["base-url"] && args["head-url"], "--base-url and --head-url are required");
const baseUrl = args["base-url"].replace(/\/$/, "");
const headUrl = args["head-url"].replace(/\/$/, "");
const out = resolve(args.out);
await mkdir(resolve(out, "base"), { recursive: true });
await mkdir(resolve(out, "head"), { recursive: true });

const resolved = await resolveArticle(plan.routes, headUrl);
plan.routes = resolved.routes;
if (resolved.note) {
  plan.notes.push(resolved.note);
  plan.coverage = "partial";
}

// Runs in every page before app code: seeded randomness and fixed preferences.
function prepareDocument({ seed, theme }) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    localStorage.setItem("theme", theme);
    localStorage.setItem("web-nav-mode", "header");
  } catch {
    // Storage-less contexts still render with the app defaults.
  }
}

// Injected into captured pages only; decorative canvases are reviewed live. A
// persistent tag, not Playwright's per-screenshot `style` option: re-injecting
// per shot toggles layout and frames then alternate instead of settling.
const CAPTURE_STYLE = "canvas.matrix-rain-3d-background, canvas.matrix-background, canvas.bionic-canvas { visibility: hidden !important; }";

let environment = null;
let browser;
try {
  const { chromium } = await import(args.playwright);
  browser = await chromium.launch({ headless: true, ...(args.browser ? { executablePath: args.browser } : {}) });
} catch (error) {
  await writeReport({ fatal: `Browser unavailable: ${error.message.split("\n")[0]}`, pairs: [] });
  console.error(error);
  process.exit(2);
}
environment = { browser: `chromium ${browser.version()}`, playwright: args.playwright };

const capture = async (side, origin, route, viewport) => {
  const result = { side, status: "captured", reason: null, errors: [], blocked: [], notFound: false, errorBoundary: false, overflowX: 0, clipped: false, attempts: 0, sha256: null, file: null };
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: args.theme,
    locale: "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
  });
  try {
    context.setDefaultTimeout(20000);
    await context.addInitScript(prepareDocument, { seed: RANDOM_SEED, theme: args.theme });
    // Only the local preview server is reachable, so third-party responses can't vary a capture.
    await context.route((url) => url.origin !== origin, (request) => {
      result.blocked.push(request.request().url());
      return request.abort("blockedbyclient");
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    page.on("pageerror", (error) => result.errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("ERR_BLOCKED_BY_CLIENT")) result.errors.push(`console: ${message.text()}`);
    });

    let stage = "navigation";
    try {
      await page.goto(`${origin}${route}`, { waitUntil: "load" });
      stage = "app-ready";
      await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
      stage = "network idle";
      await page.waitForLoadState("networkidle");
      stage = "fonts";
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.addStyleTag({ content: CAPTURE_STYLE });
      stage = "scroll-through";
      // once-only in-view animations must fire before a full-page capture.
      await page.evaluate(async (maxHeight) => {
        const frame = () => new Promise((done) => requestAnimationFrame(() => done()));
        const step = Math.max(200, Math.floor(innerHeight * 0.75));
        const end = Math.min(document.documentElement.scrollHeight, maxHeight);
        for (let y = 0; y < end; y += step) {
          scrollTo({ top: y, behavior: "instant" });
          await frame();
          await frame();
        }
        scrollTo({ top: 0, behavior: "instant" });
        await frame();
      }, MAX_CAPTURE_HEIGHT);

      const state = await page.evaluate(() => ({
        notFound: Boolean(document.querySelector(".not-found")),
        errorBoundary: Boolean(document.querySelector(".error-boundary")),
        height: document.documentElement.scrollHeight,
        overflowX: document.documentElement.scrollWidth - innerWidth,
      }));
      result.notFound = state.notFound;
      result.errorBoundary = state.errorBoundary;
      result.overflowX = Math.max(0, state.overflowX);
      result.clipped = state.height > MAX_CAPTURE_HEIGHT;
      const options = {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        ...(result.clipped ? { clip: { x: 0, y: 0, width: viewport.width, height: MAX_CAPTURE_HEIGHT } } : {}),
      };

      stage = "settle";
      // Only a frame that repeats exactly is kept; one that never settles is a capture failure, not a difference.
      let previous = null;
      let stable = null;
      while (!stable && result.attempts < MAX_SETTLE_ATTEMPTS) {
        await page.waitForTimeout(SETTLE_MS);
        const shot = await page.screenshot(options);
        result.attempts += 1;
        if (previous?.equals(shot)) stable = shot;
        previous = shot;
      }
      if (!stable) throw new Error(`page did not settle after ${MAX_SETTLE_ATTEMPTS} screenshots`);
      result.sha256 = createHash("sha256").update(stable).digest("hex");
      result.file = `${side}/${pairId(route, viewport)}.png`;
      await writeFile(resolve(out, result.file), stable);
    } catch (error) {
      result.status = "failed";
      result.reason = `${stage}: ${error.message.split("\n")[0]}`;
      // Keep whatever is on screen as evidence, labelled as a failure.
      try {
        result.file = `${side}/${pairId(route, viewport)}.failed.png`;
        await page.screenshot({ path: resolve(out, result.file) });
      } catch {
        result.file = null;
      }
    }
  } finally {
    await context.close();
  }
  return result;
};

function pairId(route, viewport) {
  const slug = route.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_") || "home";
  return `${slug}--${viewport.width}x${viewport.height}`;
}

// Failures outrank differences: a pair is only "changed" when both sides captured cleanly.
const verdictFor = (route, base, head) => {
  if (base.status === "failed" || head.status === "failed") return "capture-failed";
  if (base.errors.length || head.errors.length || base.errorBoundary || head.errorBoundary) return "runtime-error";
  if (route !== NOT_FOUND_ROUTE && (base.notFound || head.notFound)) {
    if (base.notFound && head.notFound) return "missing-both";
    return base.notFound ? "missing-in-base" : "missing-in-head";
  }
  return base.sha256 === head.sha256 ? "unchanged" : "changed";
};

const pairs = [];
for (const route of plan.routes) {
  for (const viewport of VIEWPORTS) {
    const base = await capture("base", baseUrl, route, viewport);
    const head = await capture("head", headUrl, route, viewport);
    const pixels = base.sha256 && head.sha256 ? (base.sha256 === head.sha256 ? "identical" : "different") : "not compared";
    const pair = { id: pairId(route, viewport), route, viewport: `${viewport.name} ${viewport.width}x${viewport.height}`, verdict: verdictFor(route, base, head), pixels, base, head };
    pairs.push(pair);
    console.log(`${pair.verdict.padEnd(16)} ${route} @ ${pair.viewport} (pixels ${pixels})`);
  }
}
await browser.close();

const failing = pairs.filter((pair) =>
  plan.expectIdentical
    ? pair.verdict !== "unchanged"
    : ["capture-failed", "missing-in-head", "missing-both"].includes(pair.verdict) ||
      (pair.verdict === "runtime-error" && (pair.head.errors.length || pair.head.errorBoundary)),
);
await writeReport({ pairs, failing });
process.exit(failing.length ? 1 : 0);

function fileTable(files) {
  if (!files.length) return "_No changed files supplied._";
  const rows = files.map((f) => `| \`${f.file}\` | ${f.kind}${f.live ? " + live" : ""}${f.themeSensitive ? " + theme" : ""} | ${f.routes.join(" ") || "–"} |`);
  return ["| Changed file | Classification | Routes |", "| --- | --- | --- |", ...rows].join("\n");
}

async function writeReport({ pairs, failing = [], fatal = null }) {
  const count = (verdict) => pairs.filter((pair) => pair.verdict === verdict).length;
  const missing = count("missing-in-base") + count("missing-in-head") + count("missing-both");
  const short = (sha) => (sha ? sha.slice(0, 10) : "n/a");
  const lines = [
    "## Visual review",
    "",
    `Mode **${args.mode}** · base \`${short(args["base-sha"])}\` · head \`${short(args["head-sha"])}\` · theme ${args.theme} · ${environment?.browser ?? "no browser"}`,
    "",
  ];
  if (fatal) lines.push(`**Harness failure:** ${fatal}. No screenshots were compared.`, "");
  else {
    lines.push(
      `**${count("changed")} changed · ${count("unchanged")} unchanged · ${missing} missing · ${count("runtime-error")} runtime error · ${count("capture-failed")} capture failed**`,
      "",
      "_changed_ means the pixels differ between two clean captures; review the images, it is not by itself a regression. _capture failed_ and _runtime error_ pairs are never compared as visual results.",
      "",
    );
    if (plan.expectIdentical) {
      const why = args.mode === "same-revision" ? "same revision on both sides" : "harness-only change";
      const result = count("changed")
        ? `**${count("changed")} pair(s) differ, so captures are not deterministic here; do not rely on changed/unchanged verdicts until fixed.**`
        : failing.length ? `no pixel differences, but ${failing.length} pair(s) could not be compared cleanly.` : "all pairs were unchanged.";
      lines.push(`Expected identical captures (${why}): ${result}`, "");
    }
  }
  lines.push(`**Coverage: ${plan.coverage}** (routes from ${plan.source}; ${VIEWPORTS.map((v) => `${v.width}x${v.height}`).join(", ")}; ${args.theme} theme; background canvases hidden)`, "");
  for (const note of plan.notes) lines.push(`- ${note}`);
  if (plan.notes.length) lines.push("");
  if (pairs.length) {
    lines.push("| Route | Viewport | Verdict | Pixels | Notes |", "| --- | --- | --- | --- | --- |");
    for (const pair of pairs) {
      const notes = [];
      for (const side of [pair.base, pair.head]) {
        if (side.status === "failed") notes.push(`${side.side} capture failed (${side.reason})`);
        if (side.errorBoundary) notes.push(`${side.side} rendered the error boundary`);
        if (side.errors.length) notes.push(`${side.side}: ${side.errors.length} runtime error(s)`);
        if (side.notFound && pair.route !== NOT_FOUND_ROUTE) notes.push(`${side.side} rendered 404`);
        if (side.blocked.length) notes.push(`${side.side} blocked ${side.blocked.length} external request(s)`);
      }
      if (pair.head.overflowX > 0) notes.push(`head overflows horizontally by ${pair.head.overflowX}px`);
      if (pair.head.clipped) notes.push(`clipped at ${MAX_CAPTURE_HEIGHT}px`);
      lines.push(`| \`${pair.route}\` | ${pair.viewport} | ${pair.verdict} | ${pair.pixels} | ${notes.join("; ").replace(/\|/g, "\\|") || "–"} |`);
    }
    lines.push("");
    const errors = pairs.flatMap((pair) => [pair.base, pair.head].flatMap((side) => side.errors.map((e) => `- \`${pair.route}\` ${pair.viewport} ${side.side}: ${e.split("\n")[0]}`)));
    if (errors.length) lines.push("<details><summary>Runtime errors</summary>", "", ...[...new Set(errors)].slice(0, 50), "", "</details>", "");
  }
  lines.push("<details><summary>Route selection</summary>", "", fileTable(plan.files), "", "</details>", "");
  lines.push("Screenshots and a side-by-side `index.html` are in this run's `visual-review` artifact.");
  const markdown = `${lines.join("\n")}\n`;

  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, "summary.md"), markdown);
  await writeFile(resolve(out, "results.json"), `${JSON.stringify({ args, plan, environment, fatal, pairs }, null, 2)}\n`);
  await writeFile(resolve(out, "index.html"), renderHtml(pairs, markdown));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
  console.log(`\nReport: ${resolve(out, "index.html")}`);
}

function renderHtml(pairs, markdown) {
  const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const side = (capture) =>
    `<figure><figcaption>${capture.side} · ${capture.status}${capture.reason ? ` — ${escape(capture.reason)}` : ""}</figcaption>${
      capture.file ? `<a href="${capture.file}"><img loading="lazy" src="${capture.file}" alt="${capture.side} screenshot"></a>` : "<p>No image.</p>"
    }${capture.errors.length ? `<pre>${escape(capture.errors.join("\n"))}</pre>` : ""}</figure>`;
  const sections = pairs
    .map((pair) => `<section class="${pair.verdict}"><h2><code>${escape(pair.route)}</code> · ${pair.viewport} · <span>${pair.verdict}</span></h2><div class="sides">${side(pair.base)}${side(pair.head)}</div></section>`)
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Visual review</title>
<style>
body { margin: 0; padding: 16px; font: 14px/1.5 system-ui, sans-serif; background: #111; color: #ddd; }
pre.summary { white-space: pre-wrap; background: #1b1b1b; padding: 12px; border-radius: 6px; }
section { border-top: 1px solid #333; padding: 12px 0; }
h2 { font-size: 15px; }
section.changed h2 span { color: #f5b041; } section.unchanged h2 span { color: #7dcea0; }
section.capture-failed h2 span, section.runtime-error h2 span, section[class^="missing"] h2 span { color: #ec7063; }
.sides { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; align-items: start; }
figure { margin: 0; } img { width: 100%; height: auto; border: 1px solid #333; }
pre { white-space: pre-wrap; color: #ec7063; font-size: 12px; }
</style></head><body>
<pre class="summary">${escape(markdown)}</pre>
${sections}
</body></html>
`;
}
