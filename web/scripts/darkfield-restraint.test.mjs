// web/scripts/darkfield-restraint.test.mjs: Phase 2 (Restraint) static invariants.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { src, read, CREATIVE, reachable, governed, declarations, NATIVE, NATIVE_KEYFRAMES, DEAD, innermost, governedDecls, where } from "./darkfield-css-scope.mjs";

test("scope: the walk reaches the shell, skips creative paths, matches DEAD, and every NATIVE selector exists", async () => {
  const files = await reachable();
  for (const f of ["index.css", "App.tsx", "components/Layout/Layout.tsx"]) assert.ok(files.includes(f), f);
  assert.ok(!files.some((f) => f.startsWith("pages/Annals/sim/")));
  const all = (await readdir(src, { recursive: true })).filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith(".d.ts") && !CREATIVE.some((re) => re.test(f)));
  assert.deepEqual(all.filter((f) => !files.includes(f)).sort(), [...DEAD].sort(), "unreachable files differ from DEAD");
  for (const [file, selectors] of Object.entries(NATIVE)) {
    const present = new Set(declarations(await read(file)).map((d) => innermost(d.selector)));
    for (const s of selectors) assert.ok(present.has(s), `${file} ${s}`);
  }
});

test("T1 atmosphere: one static ground behind Layout, no drift or reading scrim; rain only on Rhythm Lab", async () => {
  assert.ok(!(await readdir(resolve(src, "components"))).includes("MatrixBackground"), "MatrixBackground still exists");
  const importers = [];
  for (const f of (await reachable()).filter((x) => /\.tsx?$/.test(x))) if (/\bfrom\s*["'][^"']*\/MatrixRain3DBackground["']/.test(await read(f))) importers.push(f);
  assert.deepEqual(importers, ["pages/RhythmLab/RhythmLab.tsx"], "rain mounted outside Rhythm Lab");
  const ground = declarations(await read("components/StaticBackground/StaticBackground.css"));
  assert.ok(!ground.some((d) => /^animation/.test(d.prop)), "the ground animates");
  assert.ok(!ground.some((d) => /#[0-9a-f]{3,8}\b|rgba?\(|--bg-|radial-gradient/i.test(d.value)), "the ground uses a literal, legacy or radial colour");
  assert.ok(!declarations(await read("index.css")).some((d) => /prose-surface/.test(d.selector) && /shadow|backdrop|gradient/.test(`${d.prop} ${d.value}`)), "reading scrim");
});

test("T3 loader: a row scan; no circular spinner, glow or glass", async () => {
  const css = await read("components/common/PageLoader.css");
  assert.doesNotMatch(css, /rotate\(|border-radius:\s*50%|text-shadow|backdrop-filter/);
  const scan = declarations(css).find((d) => innermost(d.selector) === ".page-loader__scan" && d.prop === "animation");
  assert.ok(scan && /var\(--dur-scan\)/.test(scan.value) && /var\(--ease-linear\)/.test(scan.value), "scan timed by dur-scan and ease-linear");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  const tsx = await read("components/common/PageLoader.tsx");
  assert.match(tsx, /className="page-loader__scan"/);
  assert.doesNotMatch(tsx, />\s*01\s*</, "binary-digit motif");
});

const isFocusRing = (v) => /^var\(--focus-ring\)(\s*!important)?$/.test(v);
// The one emitter on the site's own interface (Phase 5 Task 13; §11 Rules, §17 Composite recipes, Cursor): the block
// cursor's flare glow, on a modifier its component adds only in Dark and only while the cursor exists (input focused).
const CURSOR_GLOW = ["components/Terminal/TerminalView.css .terminal-cursor--glow", "components/Terminal/VimUI.css .vim-cursor--glow"];
const isCursorGlow = (d) => d.value === "var(--glow-flare)" && CURSOR_GLOW.includes(`${d.file} ${d.selector}`);
test("T4 emission: no text-shadow; box-shadow limited to the focus-ring token plus two cursor glow modifiers", async () => {
  const bad = (await governedDecls()).filter((d) =>
    (d.prop === "text-shadow" && d.value !== "none") || (d.prop === "box-shadow" && d.value !== "none" && !isFocusRing(d.value) && !isCursorGlow(d)));
  assert.deepEqual(bad.map(where), []);
});

test("T5 glass: no backdrop or blur filter; former glass panels are opaque", async () => {
  const decls = await governedDecls();
  const bad = decls.filter((d) => (/backdrop-filter$/.test(d.prop) && d.value !== "none") || (d.prop === "filter" && /blur\(/.test(d.value)));
  const panels = { "components/Navigation/SiteNavigation.css": ".site-header", "components/SettingsPanel/SettingsPanel.css": ".settings-panel", "pages/Home/sections/HeroSection.css": ".hero-proof-strip" };
  for (const [file, sel] of Object.entries(panels)) {
    for (const d of decls.filter((x) => x.file === file && innermost(x.selector) === sel && /^background(-color)?$/.test(x.prop))) {
      if (/transparent|--app-overlay/.test(d.value)) bad.push(d);
    }
  }
  assert.deepEqual(bad.map(where), []);
});

const STATE = /:(hover|active|focus|focus-visible|focus-within)\b/;
const STATIC = [".interactive-card", ".tech-tag", ".highlight-tag", ".work-details-container", ".work-dates",
  ".timeline-node", ".timeline-item", ".tech-item", ".coming-soon", ".case-study-link.disabled"];
test("T6 hover: controls neither move nor shine; static content ignores the pointer", async () => {
  const decls = await governedDecls();
  const moves = decls.filter((d) => STATE.test(innermost(d.selector)) && /^(transform|translate|scale|rotate|filter)$/.test(d.prop) && d.value !== "none");
  const sheen = decls.filter((d) => /:(hover|focus)[^,]*::?(before|after)/.test(innermost(d.selector)) && /^(left|right|inset|transform|background-position)$/.test(d.prop));
  const still = decls.filter((d) => innermost(d.selector).split(",").some((part) => STATIC.some((s) =>
    part.includes(`${s}:hover`) && !(s === ".interactive-card" && /(^|\s)a\.interactive-card:hover/.test(part.trim())))));
  assert.deepEqual([...moves, ...sheen, ...still].map(where), []);
});

test("T7 dock: fixed-size icons, no magnification or responsiveness", async () => {
  for (const f of ["components/Dock/DockIcon.tsx", "components/Dock/Dock.tsx", "components/Dock/useDock.ts", "components/SettingsPanel/SettingsPanel.tsx", "components/Navigation/SiteNavigation.tsx"]) {
    // The settings panel's own slide spring goes in Task 9, so this pattern names only dock tuning.
    assert.doesNotMatch(await read(f), /[Mm]agnification|dockStiffness|DockStiffness|DOCK_STIFFNESS|Responsiveness|useSpring/, f);
  }
});

test("T8 narrator: no typing or reveal animation", async () => {
  assert.ok(!(await readdir(resolve(src, "components"))).includes("TypeWriterText"), "TypeWriterText still exists");
  const bad = [];
  for (const f of (await reachable()).filter((x) => x.endsWith(".tsx"))) if (/\bwhileInView\b|TypeWriterText/.test(await read(f))) bad.push(f);
  assert.deepEqual(bad, []);
});

const NUMERIC = /\b(duration|delay|staggerChildren|delayChildren)\s*:[^,}\n]*?(?<![\w.$])(?:0?\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)(?![\w.])/;
test("T9 framer: no springs, overshoot, hover scale, parallax or literal timing; transitions annotated", async () => {
  const bad = [];
  for (const f of await governed(".tsx")) {
    const code = await read(f);
    if (!/from "framer-motion"/.test(code)) continue;
    for (const re of [/type:\s*["']spring["']/, /\buseSpring\b/, /\bstiffness\b/, /\bdamping\b/, /\bwhileHover\b/, /\bwhileTap\b/,
      /\blayoutId\b/, /\bease:\s*["']/, /filter:\s*["']blur/, /\bscale:\s*[\d.]/, NUMERIC]) if (re.test(code)) bad.push(`${f}: ${re}`);
    if (/\buseScroll\b/.test(code) && f !== "components/Layout/GlobalScrollProgress.tsx") bad.push(`${f}: useScroll`);
    const transitions = (code.match(/\btransition\s*[=:]/g) ?? []).length;
    const notes = (code.match(/§12:/g) ?? []).length;
    if (notes < transitions) bad.push(`${f}: ${transitions} transitions, ${notes} §12 annotations`);
  }
  assert.deepEqual(bad, []);
});

// Native keyframes are excluded by name (D6 ruling). Every other keyframes rule is governed: the terminal's hand-offs
// (the cursor blinks, Task 13; the top rows' afterglow, Task 14) are covered here like the rest.
test("T10 keyframes: each governed @keyframes is annotated and timed by tokens", async () => {
  const bad = [];
  for (const f of await governed(".css")) {
    const css = await read(f);
    const skip = NATIVE_KEYFRAMES[f] ?? [];
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
      if (skip.includes(m[1])) continue;
      if (!/§12:[^*]*\*\/\s*$/.test(css.slice(Math.max(0, m.index - 240), m.index))) bad.push(`${f}: @keyframes ${m[1]} lacks a §12 annotation`);
      for (const d of declarations(css).filter((x) => x.prop === "animation" && new RegExp(`\\b${m[1]}\\b`).test(x.value))) {
        if (!/var\(--dur-/.test(d.value) || !/var\(--ease-/.test(d.value)) bad.push(`${where({ file: f, ...d })} not timed by tokens`);
      }
    }
  }
  assert.deepEqual(bad, []);
});
