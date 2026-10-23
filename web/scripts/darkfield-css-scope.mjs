// web/scripts/darkfield-css-scope.mjs: the governed-CSS scope shared by the Darkfield static tests.
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

export const web = resolve(import.meta.dirname, "..");
export const src = resolve(web, "src");
export const read = (path) => readFile(resolve(src, path), "utf8");
export const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

// Governed scope: modules reachable from src/index.tsx through relative imports, minus creative-owned
// paths (master plan Scope boundary), the generated token file and generated data.
export const CREATIVE = [/^pages\/Annals\/sim\//, /^components\/OrbitalSimulator\/renderer\.ts$/,
  /^components\/TrafficSimulator\/renderer\.ts$/, /RoadCanvas\.tsx$/, /SpaceTimeCanvas\.tsx$/,
  /^styles\/darkfield\/tokens\.css$/, /^data\/generated\//];
export const reachable = async () => {
  const seen = new Set();
  const queue = [resolve(src, "index.tsx")];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.endsWith(".css")) continue;
    const code = await readFile(file, "utf8");
    for (const [, a, b, c] of code.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const spec = a ?? b ?? c;
      if (!spec.startsWith(".")) continue;
      const base = resolve(dirname(file), spec);
      for (const ext of ["", ".tsx", ".ts", ".css", "/index.tsx", "/index.ts"]) {
        if (await isFile(base + ext)) { queue.push(base + ext); break; }
      }
    }
  }
  return [...seen].map((f) => relative(src, f)).filter((f) => !CREATIVE.some((re) => re.test(f))).sort();
};
export const governed = async (ext) => (await reachable()).filter((f) => f.endsWith(ext));

// Declarations with their selector context ("@media … >> .a:hover"); comments blanked, line numbers kept.
export const declarations = (css) => {
  const out = [];
  const stack = [];
  let buf = "", line = 1, start = 1;
  const flush = () => {
    // Standard properties are letters and hyphens; custom properties may also hold digits, underscores and escapes.
    const m = /^(--(?:[-\w]|\\.)+|[-a-z]+)\s*:\s*([\s\S]*)$/i.exec(buf.trim().replace(/\s+/g, " "));
    if (m && stack.length) out.push({ selector: stack.join(" >> "), prop: m[1].toLowerCase(), value: m[2], line: start });
    buf = "";
  };
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))) {
    if (ch === "{") { stack.push(buf.trim().replace(/\s+/g, " ")); buf = ""; }
    else if (ch === ";") flush();
    else if (ch === "}") { flush(); stack.pop(); }
    else { if (!buf.trim() && ch.trim()) start = line; buf += ch; }
    if (ch === "\n") line += 1;
  }
  return out;
};

// Rhythm Lab's own rain (P2-3, delegated ruling; owner confirmation open): native game presentation on an
// immersive route, held out of governed scope.
export const NATIVE_FILES = ["components/MatrixRain3DBackground/MatrixRain3DBackground.tsx", "components/MatrixRain3DBackground/MatrixRain3DBackground.css"];
// Native visuals in mixed files (D6 ruling, delegated): never restyled by Phase 2. Exact innermost selector.
export const NATIVE = {
  "components/SnakeGame/SnakeGame.css": [".snake-segment", ".snake-segment.snake-head", ".food"],
  "components/SpiderSolitaire/SpiderSolitaire.css": [".spider-card", ".spider-card.selected", ".spider-card.run-start", ".spider-card-back"],
  "components/RhythmLab/RhythmLab.css": [".rhythm-lab-highway", ".rhythm-lab-highway::after", ".rhythm-lab-note",
    ".rhythm-lab-target-window::before", ".rhythm-lab-target-window-line", ".rhythm-lab-target-input .rhythm-lab-target-window-line",
    ".rhythm-lab-target-hit .rhythm-lab-target-window-line", ".rhythm-lab-target-hit::after",
    ".rhythm-lab-hit-zone", ".rhythm-lab-hit-zone:active", ".rhythm-lab-hit-zone-input"],
  "components/SimulationCard/SimulationCard.css": [".snake-segment-preview", ".food-preview", ".spider-preview-card", ".rhythm-target-line", ".rhythm-note"],
  "pages/Annals/Annals.css": [".annals-sheet"],
};
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
// Keyframes of native visuals (D6 ruling, delegated): excluded from the governed keyframe rules by name.
export const NATIVE_KEYFRAMES = { "components/SnakeGame/SnakeGame.css": ["pulse"], "components/SimulationCard/SimulationCard.css": ["snakeMove", "pulse", "rhythmPreviewDrift"], "components/RhythmLab/RhythmLab.css": ["rhythmLabHitBurst", "rhythmLabJudgmentReadout"] };
// Annals utility classes (Tailwind-style; `.annals-page .<utility>` in Annals.css).
const ANNALS_UTILITIES = [...String.raw`max-w-5xl mx-auto flex grid flex-1 flex-wrap flex-col-reverse items-center items-end justify-between
  gap-1\.5 gap-2 gap-3 gap-6 w-24 w-full h-8 h-\[460px\] max-h-\[120px\] max-h-\[230px\] overflow-y-auto p-2
  p-4 px-2 px-3 px-4 px-5 py-1 py-1\.5 py-2 py-8 pb-3 pt-2 pt-3 pr-1 mb-1\.5 mb-2 mb-3 mb-4 mb-5 mt-1 mt-1\.5
  mt-2 mt-4 mt-6 ml-2 ml-4 mr-1 mr-2 rounded border border-b-2 border-t border-stone-200 border-stone-300
  border-stone-400 border-stone-700 border-stone-800 border-yellow-300 border-yellow-400 border-yellow-500
  border-yellow-600 border-yellow-700 border-red-300 bg-stone-50 bg-stone-50\/70 bg-stone-50\/80 bg-stone-100
  bg-stone-800 bg-stone-900 bg-yellow-50 bg-yellow-100 bg-yellow-600 bg-red-50 text-stone-50 text-stone-300
  text-stone-400 text-stone-500 text-stone-600 text-stone-700 text-stone-900 text-yellow-700 text-yellow-800
  text-yellow-900 text-amber-800 text-emerald-700 text-emerald-800 text-sky-800 text-red-700 text-red-800
  text-red-900 text-white hover\:bg-stone-200:hover hover\:bg-stone-700:hover hover\:bg-stone-800:hover
  hover\:bg-yellow-50:hover hover\:text-stone-50:hover ring-1 ring-yellow-400 ring-yellow-500 font-serif
  font-mono font-normal font-medium font-semibold font-bold italic text-xs text-sm text-\[13px\] text-4xl
  text-5xl text-left text-right leading-none leading-relaxed tracking-tight tracking-widest uppercase
  tabular-nums select-none transition cursor-not-allowed md\:grid-cols-\[1fr_320px\]`.split(/\s+/),
  ...["0\\.5", "1", "1\\.5"].map((n) => `space-y-${n} > * + *`)].map((u) => `.annals-page .${u}`);
// Phase 5 native list (D6 ruling, delegated): exact innermost selectors of native rules in mixed files, a superset of
// NATIVE. Phase 5 never restyles them, except the font and colour pins a task names. A grouped rule that mixes native
// and governed selectors is not listed; the task that owns its file splits it under a native comparison.
export const NATIVE5 = {
  "components/SnakeGame/SnakeGame.css": [".game-board", ".snake-segment", ".snake-segment.snake-head", ".food"],
  "components/SpiderSolitaire/SpiderSolitaire.css": [".spider-board", ".spider-column", ".spider-column:empty",
    ".spider-card", ".spider-card.face-up", ".spider-card.face-up:active", ".spider-card.face-down", ".spider-card.selected",
    ".spider-card.run-start", ".spider-card.dragging", ".spider-card-rank", ".spider-card-back"],
  "components/RhythmLab/RhythmLab.css": [".rhythm-lab-highway", ".rhythm-lab-highway::before, .rhythm-lab-highway::after",
    ".rhythm-lab-highway::before", ".rhythm-lab-highway::after", ".rhythm-lab-active-session .rhythm-lab-highway",
    ".rhythm-lab-hot-streak .rhythm-lab-highway::before", ".rhythm-lab-hot-streak .rhythm-lab-highway::after",
    ".rhythm-lab-hot-streak .rhythm-lab-target-window::before", ".rhythm-lab-track", ".rhythm-lab-lane",
    ".rhythm-lab-lane:first-child", ".rhythm-lab-lane-input", ".rhythm-lab-note-motion", ".rhythm-lab-note",
    ".rhythm-lab-target-windows", ".rhythm-lab-target-window", ".rhythm-lab-target-window::before",
    ".rhythm-lab-target-window-line", ".rhythm-lab-target-window-line-top", ".rhythm-lab-target-window-line-bottom",
    ".rhythm-lab-target-input .rhythm-lab-target-window-line", ".rhythm-lab-target-hit .rhythm-lab-target-window-line",
    ".rhythm-lab-target-hit::after", ".rhythm-lab-status", ".rhythm-lab-status-readout", ".rhythm-lab-status-ready",
    ".rhythm-lab-status-recording", ".rhythm-lab-status-readout > span", ".rhythm-lab-status small",
    ".rhythm-lab-status-recording > span", ".rhythm-lab-judgment-perfect", ".rhythm-lab-judgment-good",
    ".rhythm-lab-judgment-miss", ".rhythm-lab-hit-zones", ".rhythm-lab-hit-zone", ".rhythm-lab-hit-zone:first-child",
    ".rhythm-lab-hit-zone:active", ".rhythm-lab-hit-zone-input", ".rhythm-lab-hit-zone span"],
  "components/SimulationCard/SimulationCard.css": [".simulation-preview > *", '[data-theme="light"] .simulation-preview > *',
    ".snake-preview", ".snake-segment-preview", ".snake-segment-preview:nth-child(2)", ".snake-segment-preview:nth-child(3)",
    ".food-preview", ".spider-preview", ".spider-preview-column, .spider-preview-stock", ".spider-preview-column-tall",
    ".spider-preview-stock", ".spider-preview-card", ...[1, 2, 3, 4].map((n) => `.spider-preview-card:nth-child(${n})`),
    ".spider-preview-card-back", ".spider-preview-card-face", ".spider-preview-stock .spider-preview-card:nth-child(1)",
    ".spider-preview-stock .spider-preview-card:nth-child(2)", ".spider-preview, .rhythm-preview", ".rhythm-preview",
    ".rhythm-lane", ".rhythm-lane:first-child", ".rhythm-lane::before", ".rhythm-target-line", ".rhythm-note",
    ".rhythm-note-one", ".rhythm-note-two", ".rhythm-note-three", ".annals-preview", ".annals-preview-masthead",
    ".annals-preview-line", ...[2, 3, 4, 5, 6].map((n) => `.annals-preview-line:nth-child(${n})`),
    ".annals-preview-line-hand", ".annals-preview-line-death"],
  // The parchment sheet and the utility-class rules (they style native regions too; never edited).
  "pages/Annals/Annals.css": [".annals-sheet", ".annals-page .annals-sheet", ...ANNALS_UTILITIES],
  // The Orbital canvas: its size, pointer behaviour and the type it inherited before its chrome was governed (Task 9).
  "pages/OrbitalSimulator/OrbitalSimulator.css": [".orbital-canvas"],
  // The Traffic road and time-space canvases: their size, pointer behaviour and corners, and the type they inherited
  // before their chrome was governed (Task 10).
  "pages/TrafficSimulator/TrafficSimulator.css": [".traffic-canvas, .traffic-spacetime", ".traffic-canvas", ".traffic-spacetime"],
};
// Phase 5 holds: [innermost selector, property] pairs that keep a native value inside a governed rule. P5-2 palette
// mirrors and the existing native-value holds (Spider's empty-column border, Traffic's speed ramp and the legend
// swatches that show it, the parchment shadow).
const trafficRamp = (selector) => [0, 1, 2, 3, 4].map((i) => [selector, `--traffic-speed-${i}`]);
const trafficSwatches = [0, 1, 2, 3, 4].map((i) => [`.traffic-swatch-${i}`, "background"]);
export const HOLDS5 = {
  "components/SpiderSolitaire/SpiderSolitaire.css": [[".spider-solitaire", "--spider-empty-column-border"],
    ['[data-theme="light"] .spider-solitaire', "--spider-empty-column-border"]],
  "pages/TrafficSimulator/TrafficSimulator.css": [...trafficRamp(".traffic-container"), ...trafficRamp('html[data-theme="light"] .traffic-container'),
    ...trafficSwatches],
  "pages/Annals/Annals.css": [[".annals-page", "--annals-sheet-shadow"], ['[data-theme="light"] .annals-page', "--annals-sheet-shadow"]],
};
// Phase 5 rules nothing renders (dead-code ruling): excluded by exact innermost selector or at-rule. Empty since Task 13,
// which removed the terminal's unrendered .cursor rule together with the `blink` keyframes VimUI.css also defined, so
// no cursor can fall back to a same-named excluded animation. Kept for later dead rules.
export const DEAD_RULES5 = {};
// Code already unreachable from src/index.tsx before Phase 2 (P2-4, delegated ruling): not deleted, not
// governed, left for an owner cleanup decision. The scope test fails if this list and the walk disagree.
export const DEAD = [
  "App.css", "algorithms/bst.ts", "animations/navigation.ts", "components/AnimatedSection.tsx",
  "components/BionicBackground/BionicBackground.css", "components/BionicBackground/BionicBackground.tsx",
  "components/CertificationDetails/CertificationDetails.css", "components/CertificationDetails/CertificationDetails.tsx",
  "components/CertificationDetails/index.ts", "components/DataStructureVisualizer/Tree.tsx", "components/Layout/index.ts",
  "components/LoadingSpinner/LoadingSpinner.css", "components/LoadingSpinner/LoadingSpinner.tsx", "components/LoadingSpinner/index.ts",
  "components/Logo/Logo.css", "components/Logo/Logo.tsx", "components/Logo/index.ts",
  "components/MainContent/MainContent.css", "components/MainContent/MainContent.tsx",
  "components/Navigation/NavItem.tsx", "components/Navigation/Navigation.css", "components/Navigation/SettingsNavButton.tsx",
  "components/PageTransition/PageTransition.css", "components/PageTransition/PageTransition.tsx", "components/PageTransition/index.ts",
  "components/SkillItem/SkillItem.css", "components/SkillItem/SkillItem.tsx", "components/SkillItem/index.ts",
  "components/SnakeGame/index.ts", "components/Terminal/commands/VimCommand.ts",
  "components/WorkList/WorkList.css", "components/WorkList/WorkList.tsx", "components/WorkList/index.ts",
  "components/index.ts", "data/aiContext.ts", "data/processData.ts",
  "pages/Home/sections/AboutSection.tsx", "pages/Home/sections/SkillsSection.tsx", "pages/Home/sections/SocialLinksSection.tsx",
];
export const innermost = (selector) => selector.split(" >> ").pop();
export const governedDecls = async () => {
  const out = [];
  for (const file of await governed(".css")) {
    if (NATIVE_FILES.includes(file)) continue;
    for (const d of declarations(await read(file))) if (!(NATIVE[file] ?? []).includes(innermost(d.selector))) out.push({ file, ...d });
  }
  return out;
};
export const where = (d) => `${d.file}:${d.line} ${d.selector} { ${d.prop}: ${d.value} }`;
