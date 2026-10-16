// web/scripts/darkfield-grammar.test.mjs: Phase 3 (Grammar) static invariants.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { src, read, reachable, governed, declarations, NATIVE, NATIVE_FILES, innermost, where } from "./darkfield-css-scope.mjs";

// Phase ownership (plan: Phase 3 / Phase 5 boundary). Every reachable governed stylesheet is in exactly one list.
export const PHASE3 = ["index.css", "styles/components.css", "styles/darkfield/grammar.css",
  "components/StaticBackground/StaticBackground.css", "components/common/ViewportPortal.css",
  "components/Layout/Layout.css", "components/Layout/GlobalSectionNavigation.css", "components/Layout/GlobalScrollProgress.css",
  "components/Navigation/SiteNavigation.css", "components/Dock/Dock.css", "components/SettingsPanel/SettingsPanel.css",
  "pages/Home/Home.css", "pages/Home/sections/HeroSection.css", "pages/Home/sections/CapabilitiesSection.css",
  "pages/Home/sections/FeaturedProjectsSection.css", "pages/Home/sections/ContactStripSection.css",
  "pages/Home/sections/ExplorationChoiceSection.css", "pages/Projects/Projects.css", "components/ProjectRoster/ProjectRoster.css",
  "components/TerminalDropdown/TerminalDropdown.css", "pages/Work/Work.css", "components/WorkDetails/WorkDetails.css",
  "pages/Journey/Journey.css", "components/TimelineItem/TimelineItem.css", "pages/Writing/Writing.css",
  "components/ArticlePage/ArticlePage.css", "components/CaseStudyPage/CaseStudyPage.css"];
export const PHASE5 = ["components/ProjectMedia/ProjectMedia.css", "pages/ProceduralAnimations/ProceduralAnimations.css",
  "pages/ProceduralAnimationPiece/ProceduralAnimationPiece.css", "pages/Simulations/Simulations.css",
  "components/SimulationCard/SimulationCard.css", "pages/OrbitalSimulator/OrbitalSimulator.css",
  "pages/TrafficSimulator/TrafficSimulator.css", ...["Terminal", "TerminalView", "TerminalWindow", "TopUI", "VimUI", "ManPageUI",
  "TerminalErrorBoundary"].map((n) => `components/Terminal/${n}.css`), "components/SnakeGame/SnakeGame.css",
  "pages/SnakeGame/SnakeGame.css", "components/SpiderSolitaire/SpiderSolitaire.css", "pages/SpiderSolitaire/SpiderSolitaire.css",
  "components/RhythmLab/RhythmLab.css", "pages/RhythmLab/RhythmLab.css", "pages/Annals/Annals.css", "pages/NotFound/NotFound.css",
  ...["ErrorBoundary", "PageLoader", "Toast", "ToastContainer", "Modal"].map((n) => `components/common/${n}.css`)];
const OUTSIDE = ["styles/darkfield/bridge.css", ...NATIVE_FILES];
// Rules no component renders (dead-code ruling, P3-8): excluded by exact innermost selector, never deleted.
// A selector joins only after `rg` over web/src TSX shows nothing renders it; the commit body lists it.
const DEAD_RULES = {
  "pages/Projects/Projects.css": [".projects-cta", ".projects-cta-primary", ".projects-hero-actions"],
  "components/TimelineItem/TimelineItem.css": [".timeline-flip-hint", ".timeline-flip-container:hover .timeline-flip-hint"],
};
// Header brand, held unchanged for Phase 4 (D5: R1 symbol and wordmark replace the KS mark). Exact innermost selectors.
const BRAND_HOLD = { "components/Navigation/SiteNavigation.css": [".site-header__brand", ".site-header__brand-mark",
  '[data-theme="light"] .site-header__brand-mark', ".site-header__brand-name"] };
// Phase 3 declarations: PHASE3 files, governed and rendered selectors only.
export const phase3Decls = async () => {
  const out = [];
  for (const file of (await governed(".css")).filter((f) => PHASE3.includes(f))) {
    const skip = [...(NATIVE[file] ?? []), ...(DEAD_RULES[file] ?? []), ...(BRAND_HOLD[file] ?? [])];
    for (const d of declarations(await read(file))) if (!skip.includes(innermost(d.selector))) out.push({ file, ...d });
  }
  return out;
};

test("ownership: every reachable governed stylesheet belongs to exactly one phase", async () => {
  const css = (await governed(".css")).filter((f) => !OUTSIDE.includes(f));
  const missing = css.filter((f) => PHASE3.includes(f) === PHASE5.includes(f));
  assert.deepEqual(missing, [], "files in neither or both lists");
  assert.deepEqual(PHASE3.filter((f) => !css.includes(f)), [], "PHASE3 names a file the walk does not reach");
  assert.deepEqual(PHASE5.filter((f) => !css.includes(f)), [], "PHASE5 names a file the walk does not reach");
});

test("T2 bridge: only the --accent-color hold remains", async () => {
  const defined = declarations(await read("styles/darkfield/bridge.css")).filter((d) => d.prop.startsWith("--")).map((d) => d.prop.slice(2));
  assert.deepEqual([...new Set(defined)].sort(), ["accent-color"]);
});

test("scrim: grammar.css derives --df-scrim from --field and --opacity-dim only", async () => {
  const [d] = declarations(await read("styles/darkfield/grammar.css")).filter((x) => x.prop === "--df-scrim");
  assert.ok(d, "--df-scrim is not defined");
  assert.deepEqual([...new Set([...d.value.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]))].sort(), ["field", "opacity-dim"]);
  assert.doesNotMatch(d.value, /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i);
});

const LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(|\b(white|black|red|green|blue|gray|grey|silver|gold|yellow)\b/i;
test("T3 grammar.css: tokens only; imported after the bridge and before component CSS", async () => {
  const css = await read("styles/darkfield/grammar.css");
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), LITERAL);
  for (const d of declarations(css)) if (/^(transition|animation)/.test(d.prop)) assert.match(d.value, /^(none|.*var\(--dur-[a-z]+\).*var\(--ease-[a-z]+\).*)$/, where({ file: "grammar.css", ...d }));
  const index = await read("index.tsx");
  const order = ["tokens.css", "index.css", "bridge.css", "grammar.css", "components.css"].map((f) => index.indexOf(`/${f}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order); assert.ok(!order.includes(-1));
  for (const sel of [".df-control", ".df-control--latch", ".df-control--card", ".df-control--light", ".df-control--unavailable"]) assert.ok(css.includes(sel), sel);
  for (const f of ["pages/NotFound/NotFound.tsx", "components/common/ErrorBoundary.tsx", "components/common/AppErrorBoundary.tsx"]) {
    for (const m of (await read(f)).matchAll(/className="([^"]*(home-link|error-button)[^"]*)"/g)) assert.match(m[1], /\bdf-control\b/, `${f}: ${m[1]}`);
  }
  for (const f of ["pages/NotFound/NotFound.css", "components/common/ErrorBoundary.css"]) {
    for (const d of declarations(await read(f)).filter((x) => /home-link|error-button/.test(x.selector))) {
      assert.ok(!/^(background|color|border|border-color|border-radius|transform|transition)$/.test(d.prop), where({ file: f, ...d }));
    }
  }
});

test("T5 D7: statuses and tags are context labels without hue; • only on Live", async () => {
  const decls = await phase3Decls();
  const bad = decls.filter((d) => /status|tech-tag|highlight-tag|artifact-meta/.test(d.selector) &&
    (/^(background|background-color|border-radius|box-shadow)$/.test(d.prop) && !/^(none|transparent|var\(--radius-0\))$/.test(d.value)
     || d.prop === "color" && d.value !== "var(--fg-muted)" || /^--roster-status/.test(d.prop)));
  assert.deepEqual(bad.map(where), []);
  const live = decls.filter((d) => d.prop === "content" && /•/.test(d.value));
  assert.ok(live.length > 0 && live.every((d) => /\.df-context--live::before/.test(d.selector)), live.map(where).join("\n"));
  for (const f of ["components/ProjectRoster/ProjectRosterItem.tsx", "pages/CaseStudies/CaseStudies.tsx", "pages/Home/sections/FeaturedProjectsSection.tsx"]) {
    const code = await read(f);
    assert.doesNotMatch(code, /status-dot/, f);
    assert.match(code, /df-label-sm[^"`]*df-context|df-context[^"`]*df-label-sm/, f);
  }
});

test("T6 eyebrows speak in the Instrument voice (§06 Interface label); Rhythm Lab is the named Phase 5 exclusion", async () => {
  for (const f of (await governed(".tsx")).filter((x) => !/RhythmLab/.test(x))) {
    for (const [, cls] of (await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g).map((m) => [m[0], m[1] ?? m[2]])) {
      if (/eyebrow/.test(cls) && !/rhythm-lab-eyebrow/.test(cls)) assert.match(cls, /(^|\s)df-label(\s|$)/, `${f}: ${cls}`);
    }
  }
  const bad = [];
  for (const file of (await governed(".css")).filter((f) => !/RhythmLab/.test(f))) {
    for (const d of declarations(await read(file))) {
      if (!/eyebrow/.test(innermost(d.selector).replace(/:not\([^)]*\)/g, ""))) continue;
      if (/^(font-family|font-size|font-weight|letter-spacing|text-transform|line-height|text-shadow)$/.test(d.prop) ||
          d.prop === "color" && d.value !== "var(--fg-muted)") bad.push(where({ file, ...d }));
    }
  }
  assert.deepEqual(bad, []);
});
