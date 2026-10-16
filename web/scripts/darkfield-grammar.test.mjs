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
  assert.deepEqual(PHASE3.filter((f) => f !== "styles/darkfield/grammar.css" && !css.includes(f)), [], "PHASE3 names a file the walk does not reach");
  assert.deepEqual(PHASE5.filter((f) => !css.includes(f)), [], "PHASE5 names a file the walk does not reach");
});

test("T2 bridge: only --app-overlay and the --accent-color hold remain", async () => {
  const defined = declarations(await read("styles/darkfield/bridge.css")).filter((d) => d.prop.startsWith("--")).map((d) => d.prop.slice(2));
  assert.deepEqual([...new Set(defined)].sort(), ["accent-color", "app-overlay"]);
});
