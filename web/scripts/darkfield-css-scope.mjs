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
    const m = /^([-a-z]+)\s*:\s*([\s\S]*)$/i.exec(buf.trim().replace(/\s+/g, " "));
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
