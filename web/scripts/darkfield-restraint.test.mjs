// web/scripts/darkfield-restraint.test.mjs: Phase 2 (Restraint) static invariants.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const web = resolve(import.meta.dirname, "..");
const src = resolve(web, "src");
const read = (path) => readFile(resolve(src, path), "utf8");
const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

// Governed scope: modules reachable from src/index.tsx through relative imports, minus creative-owned
// paths (master plan Scope boundary), the generated token file and generated data.
const CREATIVE = [/^pages\/Annals\/sim\//, /^components\/OrbitalSimulator\/renderer\.ts$/,
  /^components\/TrafficSimulator\/renderer\.ts$/, /RoadCanvas\.tsx$/, /SpaceTimeCanvas\.tsx$/,
  /^styles\/darkfield\/tokens\.css$/, /^data\/generated\//];
const reachable = async () => {
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
const governed = async (ext) => (await reachable()).filter((f) => f.endsWith(ext));

// Declarations with their selector context ("@media … >> .a:hover"); comments blanked, line numbers kept.
const declarations = (css) => {
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
const NATIVE_FILES = ["components/MatrixRain3DBackground/MatrixRain3DBackground.tsx", "components/MatrixRain3DBackground/MatrixRain3DBackground.css"];
// Native visuals in mixed files (D6 ruling, delegated): never restyled by Phase 2. Exact innermost selector.
const NATIVE = {
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
const DEAD = [
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
const innermost = (selector) => selector.split(" >> ").pop();
const governedDecls = async () => {
  const out = [];
  for (const file of await governed(".css")) {
    if (NATIVE_FILES.includes(file)) continue;
    for (const d of declarations(await read(file))) if (!(NATIVE[file] ?? []).includes(innermost(d.selector))) out.push({ file, ...d });
  }
  return out;
};
const where = (d) => `${d.file}:${d.line} ${d.selector} { ${d.prop}: ${d.value} }`;

test("scope: the walk reaches the shell, skips creative paths, matches DEAD, and every NATIVE selector exists", async () => {
  const files = await reachable();
  for (const f of ["index.css", "App.tsx", "styles/darkfield/bridge.css", "components/Layout/Layout.tsx"]) assert.ok(files.includes(f), f);
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
  assert.doesNotMatch(await read("styles/darkfield/bridge.css"), /--bg-/, "bridge still defines --bg-*");
  assert.ok(!declarations(await read("index.css")).some((d) => /prose-surface/.test(d.selector) && /shadow|backdrop|gradient/.test(`${d.prop} ${d.value}`)), "reading scrim");
});
