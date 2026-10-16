# Darkfield Phase 2 (Restraint) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. One task, one commit, an independent reviewer between tasks (master plan, *Operational safety*). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove the costume layer from the site's own interface: glow on content that is not live, shadows and glass, hover lift/scale/sheen, animated atmosphere behind the site (rain and drift; Rhythm Lab's own rain is held, P2-3), typing and reveal effects on prose, springs and overshoot, and the circular spinner. Phase 2 removes. It does not redesign controls; that is Phase 3.

**Authority (read these sections in `$DF_TMP/darkfield` before each task):** README *02 · Design principles* (principles 1, 4, 6) and *Using the system*; §10 *Global limits*, *Effects*, *Atmosphere by context*, *The zero-effects test*; §11 *Materials*, *Glow tokens*, *Rules*, *Light theme*; §12 *The six classes* (class 1 *Create / remove* and *Reveal / conceal* rows), *Timing bands*, *Easing*, *What may repeat*, *Reduced motion, by class*, *Decorative motion to remove*; §13 *Channels*, *Hover: operable, inspectable, static*, *Processing*, *Avoid*; §16 (rows *Excessive neon*, *Literal Matrix rain*, *Unreadably dense screens*) and *The three-question check*. Supporting: §06 *Rules* (prose is never typed out), §08 *Layers and overlays*, §09 *Line hierarchy* (L0), §05 *Light environments*, §17 *Glow strength and focus*, *Animation durations*, *Easing*, *Opacity*, *Line weights*, *Grid increments*.

The master plan's *Phase 2: Restraint* table is the scope. Its *Scope boundary*, *Global Constraints*, *Operational safety* and *Validation model* apply unchanged.

**Inventory base:** `d7e424e` (Task 4). The working tree carried an uncommitted Task 4 review fix (font-family lines in `RhythmLab.css`, `SimulationCard.css`, `SpiderSolitaire.css`, and the browser test) when this was written; it touches none of the declarations below.

**Execution base:** HEAD after Phase 1 Tasks 5, 6 and 7 are committed. Step 0 records it. Line numbers below are at `d7e424e`; locate code by selector, not line.

### Decisions this plan relies on

| Label | Decision | Status |
|---|---|---|
| D3 ruling | Remove rain and every animated background on all routes; the ground is static `field` plus the L0 grid; delete rain/matrix background components that become dead; remove the Background animation/speed settings once no animated atmosphere remains | Delegated ruling (progress.md), not an owner approval |
| D6 ruling | Snake `.game-scores`, `.game-over-content`: governed. Spider container font/colour: governed; cards native. Rhythm Lab root: governed; lanes, notes, judgement visuals native. Annals controls governed; parchment native. `/simulations` previews native | Delegated ruling |
| D4(b) interim ruling | Mono is supported in code and tests but **not offered in Settings** until Phase 6 clears its failures. Check-mode browser runs use `dark,light`; each task also runs Mono in record mode against the tracked work list (`mono-worklist.json`) and must not add or worsen a Mono failure id | Delegated ruling (progress.md, Task 5) |
| D10 | Ledger accepted for deferral | Owner, 2026-10-15 |
| D11(a) | Open. No test or file here states a specification-defined limit | Open |
| P2-1 | Interim hover: **Phase 3 provides it.** See *Hover decision* below. Consequence: Phase 2 is not separately releasable; seven operable controls have no hover response until Phase 3 lands | Delegated ruling (controller, plan review r1) |
| P2-2 | Dock magnification is hover scale (§13 *Channels*: size never changes). Remove it and its spring, and retire the Magnification and Responsiveness sliders, which would then do nothing. Old exports still import | Delegated ruling (controller, plan review r1) |
| P2-3 | **Rhythm Lab keeps its own rain.** `pages/RhythmLab/RhythmLab.tsx` mounts `MatrixRain3DBackground` on an immersive route outside `Layout`; the owner restored it deliberately (`05b1348`). It is held as native game presentation and is not removed in Phase 2; the component stays. **Open: owner confirmation** | Delegated ruling (controller, plan review r1); owner confirmation open |
| P2-4 | Code that was already unreachable before Phase 2 (including `BionicBackground` and `LoadingSpinner`) is **not deleted**. The restraint test names it in an explicit `DEAD` list. Code that a Phase 2 task itself makes dead may be deleted; each task lists it | Delegated ruling (controller, plan review r1) |
| P2-5 | Surviving opacity fades are timed as §12 class 1 enters: `dur-base` with `ease-settle`; exits use `ease-depart` | Delegated ruling (controller, plan review r1) |
| P2-6 | The Background animation and Speed settings stay in Phase 2 (Task 2 is held): after P2-3 they still pause and pace the Rhythm Lab rain, and removing them would leave that moving background with no user pause control | Proposed consequence of P2-3; controller to confirm |

**Hover decision (P2-1).** Where removal leaves an operable control with no hover response, Phase 2 adds nothing and Phase 3 supplies the §13 Hover signature. Reasons:
1. §13 Hover is one signature: ground step, boundary, label and the `›` marker. Phase 3 builds it per control.
2. Several affected controls are filled accent buttons with dark labels (`.play-again-button`, `.rhythm-lab-primary-action`). A ground step on them needs a new label colour, which is redesign.
3. An interim ground step adds hover text/ground pairs that the interaction pass measures. Phase 2 would then have to fix new failures by redesign.
4. Every affected control keeps its focus ring (Phase 1 Task 6) and pointer cursor. Phase 2 is therefore not separately releasable: if the owner releases by commit range, Phase 2 ships only together with Phase 3.

Phase 3 receives this list (hover rules that the removals leave empty): `.project-roster__toggle` (also loses its expanded-state glow), `.rhythm-lab-primary-action`, `.play-again-button`, `.spider-button`, `.terminal-sidecar`, `.exploration-pill`, `.projects-cta`.

### What Phase 2 does not change

- Creative-owned paths (master plan *Scope boundary*). None is edited.
- Native selectors in mixed files (`SnakeGame.css`, `SpiderSolitaire.css`, `RhythmLab.css`, `SimulationCard.css`, `Annals.css`). They keep their shadows, glows, transforms and keyframes. The restraint test lists each one by exact selector in `NATIVE` (Task 1) and `NATIVE_KEYFRAMES` (Task 10), and fails if a listed selector disappears. `.annals-sheet` keeps its shadow through a local hold (Task 4). The governed selectors Phase 2 edits in these files are named in Tasks 4–6.
- The Rhythm Lab rain (P2-3): `MatrixRain3DBackground` and its stylesheet, the Rhythm Lab page wrapper, and `scripts/matrix-rain-resize.test.mjs`. The test's `NATIVE_FILES` excludes the component from governed scope.
- Iframe artworks, canvases, recordings. Their reduced-motion pass-through stays (`procedural-animations-browser-test.mjs`).
- Terminal cursor blinks (`TerminalView.css`, `VimUI.css` `@keyframes blink`) and `TopUI.css` `@keyframes processUpdate`: Phase 5 terminal task.
- Copy. The PageLoader messages are fake progress text (Principle 5); they stay for Phase 5 (loaders).
- Literal colours, radii, pills, gradients on buttons, the `--accent-color` hold: Phase 3.
- Code already unreachable before Phase 2 (P2-4). The full list is the `DEAD` constant in Task 1's test (39 files at `d7e424e`, among them `BionicBackground/`, `LoadingSpinner/`, `Navigation/Navigation.css`, `SkillItem/`, `App.css`, `data/processData.ts`). The test fails if a file outside `DEAD` becomes unreachable or a `DEAD` file becomes reachable. Listed for an owner cleanup decision. One exception to "not edited": `SocialLinksSection.tsx` gets a one-line change in Task 8 so `tsc` keeps passing.

---

## Inventory at `d7e424e`

Commands (from `web/`; all-file totals, governed or not):

```bash
rg -c 'text-shadow\s*:' src -g '*.css' | awk -F: '{s+=$2} END {print s}'                        # 34
rg -c 'box-shadow\s*:' src -g '*.css' | awk -F: '{s+=$2} END {print s}'                         # 129
rg -c '(-webkit-)?backdrop-filter\s*:' src -g '*.css' | awk -F: '{s+=$2} END {print s}'          # 32
```

The governed breakdown below comes from the reachability walk and declaration parser that Task 1 lands in `darkfield-restraint.test.mjs`; once that file exists, each task's test prints its remaining offenders (`node --test --test-name-pattern=T<n> scripts/darkfield-restraint.test.mjs`). The unreachable-file list is the test's `DEAD` constant.

Governed scope: 57 CSS files. In it, excluding the native selectors and `none` values:

| Property | Governed declarations | Files |
|---|---|---|
| `text-shadow` | 31 | `RhythmLab.css` 5; `Projects.css` 4; `HeroSection.css` 4; `PageLoader.css` 3; `TerminalDropdown.css` 3; `SnakeGame.css` 3; `Modal.css` 3; one each in `ProjectRoster.css`, `SimulationCard.css`, `Home.css`, `Journey.css`, `Simulations.css`, `Work.css` |
| `box-shadow` | 92 | `Projects.css` 10; `Work.css` 9; `RhythmLab.css` 8; `SimulationCard.css` 8; `GlobalSectionNavigation.css` 7 (3 in `@keyframes pulse`); `TerminalDropdown.css` 5; `Dock.css`, `SettingsPanel.css`, `WorkDetails.css`, `Modal.css`, `Home.css` 4 each; `SiteNavigation.css`, `ProjectRoster.css` 3 each; `SnakeGame.css`, `Terminal.css`, `TimelineItem.css`, `HeroSection.css` 2 each; one each in `GlobalScrollProgress.css`, `ProjectMedia.css`, `SpiderSolitaire.css`, `TerminalWindow.css`, `ErrorBoundary.css`, `Toast.css`, `index.css` (reading scrim), `Annals.css` (`.annals-page .ring-1`), `ExplorationChoiceSection.css`, `Journey.css`, `components.css` |
| `backdrop-filter` (incl. `-webkit-`) | 24 | `SettingsPanel.css` 6; `Dock.css`, `SiteNavigation.css`, `RhythmLab.css`, `SnakeGame.css`, `PageLoader.css`, `HeroSection.css` 2 each; one each in `CaseStudyPage.css`, `ProjectMedia.css`, `SimulationCard.css`, `Modal.css`, `index.css`, `Projects.css` |
| `filter` | 3 | `StaticBackground.css` (blur), `ExplorationChoiceSection.css` (brightness, ×2) |

Phase 1 Task 6 deletes two of the box-shadows first (`RhythmLab.css` `.rhythm-lab-chart-name-input:focus`, `TerminalDropdown.css` `.terminal-dropdown-trigger:focus`) and adds `box-shadow: var(--focus-ring) !important` in `index.css`.

Other evidence:
- **Atmosphere.** `AppBackground.tsx` (mounted only in `Layout.tsx`) renders `MatrixRain3DBackground` in Dark and `StaticBackground` otherwise (Mono included after Task 5); it is the only importer of `MatrixBackground` (`rg -n "^import" src | rg MatrixBackground`). `/simulations/rhythm-lab` is an immersive route outside `Layout` (`routes/index.tsx` `immersiveRoutes`; `App.tsx` renders it outside the `Layout` route); its page renders `MatrixRain3DBackground` itself (P2-3, held). `StaticBackground.css` animates two layers (`static-background-drift`, `static-background-topology-drift`) and paints highlights, a vignette and topology. Every `--bg-*` variable is read only by `StaticBackground.css` and `MatrixBackground.css`. Reading scrims: `index.css` `.prose-surface:not(.prose-surface--reading)::before` (feathered gradient) and `.prose-surface--reading` (translucent ground, blur, shadow). `scripts/matrix-rain-resize.test.mjs` tests the rain component; CI does not run it.
- **Settings for removed motion.** "Background animation" switch and "Speed" slider (`SettingsPanel.tsx` Motion section), state in `LayoutContext.tsx`, persistence and import in `utils/settings.ts`, props in `SiteNavigation.tsx`; asserted by `settings-panel-browser-test.mjs`.
- **Loader.** `PageLoader.css`: two rotating ring arcs (`matrix-spin`), a "01" text with `flicker` glow, glass overlay. `LoadingSpinner/` is imported only by its own `index.ts` (`rg -n LoadingSpinner src`); it stays (P2-4, in `DEAD`).
- **Hover.** `components.css:31-40` (`.interactive-card` lift, glow, sheen) applies to static `article`s on case-study pages (`CaseStudyPage.tsx:54,97,101,105,139,159,185`) and `.contact-strip-content` (a `div`); its operable uses are all `<a>` (`Link`). Sheens: `.interactive-card`, `.btn`, `.modal-button`, `.stat-card`, `.simulation-card` (`::before` `left` sweeps). Static hover targets: `.tech-tag`, `.highlight-tag`, `.work-details-container`, `.work-dates`, `.timeline-node`, `.timeline-item`, `.tech-item`, `.coming-soon`, `.case-study-link.disabled`.
- **Framer motion (reachable files).** `whileHover`/`whileTap` in `Toast.tsx`, `Modal.tsx` (×3), `GlobalSectionNavigation.tsx`, `DockSettingsButton.tsx`, `SettingsPanel.tsx`, `FeaturedProjectsSection.tsx`, `ContactStripSection.tsx`. Springs: `TypeWriterText.tsx`, `DockSettingsButton.tsx`, `DockIcon.tsx` (`useSpring`), `SettingsPanel.tsx`, `Modal.tsx`, `Toast.tsx`. Overshoot: `Layout.tsx` (`ease: "anticipate"`). Parallax: `Home.tsx` (`useScroll`/`useTransform`). Blur/scale nav-mode variants: `SiteNavigation.tsx`, `Dock.tsx`. Fly-ins: `Toast.tsx` (`x: 300`), `SettingsPanel.tsx` (`x: "100%"`).
- **Narrator motion.** `TypeWriterText` in `Writing.tsx`, `Journey.tsx` (×2), `TerminalView.tsx` (×2), `HeroSection.tsx` (×2), `ProceduralAnimations.tsx`, `CaseStudies.tsx`, `Work.tsx`, `CaseStudyPage.tsx`, plus the unreachable `SocialLinksSection.tsx`. `whileInView` reveals: `HeroSection.tsx` 5, `FeaturedProjectsSection.tsx` 4, `ContactStripSection.tsx` 4, `CapabilitiesSection.tsx` 3, `TimelineItem.tsx` 1.
- **Decorative loops.** `@keyframes titleUnderline` (`Projects.css`, `Work.css`), `titleUnderlineScale` and unused `float` (`Home.css`), `capabilitiesTitleUnderline` (`CapabilitiesSection.css`), `pulse` (`GlobalSectionNavigation.css`, `Terminal.css` `.sidecar-icon`), `matrixGlow` (`TopUI.css` `.top-container::before`, a glowing area). Surviving reveals: `site-header-panel-in`, `dropdownSlideDown`, `dock-explore-panel-in`, `media-inspector-in`, `project-roster-reveal`.

---

## Shared procedures

Every Bash call starts with the session environment the master plan's *Operational safety* sets up: `DF_TMP`, `DF_PW`, `PLAYWRIGHT_BROWSERS_PATH`, and `W` (the worktree path). Check exit codes with `; echo rc=$?`.

**Static gate (every task):**

```bash
cd "$W/web" && node --test scripts/darkfield-*.test.mjs; echo rc=$?
npm run typecheck; echo rc=$?
npm run lint; echo rc=$?
npm test >"$DF_TMP/p2-smoke.log" 2>&1; echo rc=$?; tail -5 "$DF_TMP/p2-smoke.log"
git status --porcelain -- src/data/generated/articles.ts   # must print nothing
```

**Foundation browser test (every task), check mode, three themes:**

```bash
bash "$DF_TMP/df-serve.sh" head "$W/web" 4173; echo rc=$?
cd "$W/web" && DARKFIELD_THEMES=dark,light node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p2-tN-foundation.log" 2>&1; echo rc=$?
tail -40 "$DF_TMP/p2-tN-foundation.log"
```

**Mono record run (every task, D4(b) interim):** on the same head preview, record Mono and compare its failures with the tracked work list. No Mono id may be new, and none may be more than 0.05 worse than its work-list value (the check-mode tolerance). Report the count; the controller updates the work list.

```bash
cd "$W/web" && DARKFIELD_MODE=record DARKFIELD_THEMES=mono node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p2-tN-mono.log" 2>&1; echo rc=$?
node -e '
const fs = require("fs");
const log = fs.readFileSync(process.argv[1], "utf8").split("\n");
const json = log.slice(log.findIndex((l) => l === "{"), log.findIndex((l) => l.startsWith("MEASURED "))).join("\n");
const head = JSON.parse(json).entries, list = new Map(JSON.parse(fs.readFileSync(process.argv[2], "utf8")).entries.map((e) => [e.id, e.baseline]));
const fresh = head.filter((e) => !list.has(e.id)), worse = head.filter((e) => list.has(e.id) && e.baseline < list.get(e.id) - 0.05);
console.log(`mono failures ${head.length} (work list ${list.size}); new ${fresh.length}; worse ${worse.length}`);
for (const e of [...fresh, ...worse]) console.log(e.id, e.detail);
process.exit(fresh.length || worse.length ? 1 : 0);
' "$DF_TMP/p2-tN-mono.log" "$W/.superpowers/sdd/2026-10-11-darkfield-migration/mono-worklist.json"; echo rc=$?
```

**Named browser tests:** `node scripts/<name>-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`. `orbital` fails at its line 196 on every build (ledger note); any other failure is a regression.

**Ledger rule:** a STALE entry that this task's change fixed is removed from `web/scripts/darkfield-known-deficiencies.json` in the same commit, and listed in the commit body. Anything else (a new failure, a KNOWN entry worse than its baseline, a changed `creative`, `inactive`, `unmeasured` or `regions` record) is a stop: report ids, base and head values. Do not re-record the ledger.

**Visual check:** a scratch script, created once (not in the repo):

```js
// $DF_TMP/p2-shot.mjs <playwright-module> <out-dir> <routes,comma> <themes,comma> [hover-selector]
// head = 4173 (this task), base = 4174 (3c533b6 + markers; no Mono there).
import { mkdir } from "node:fs/promises";
const [pw, out, routes, themes, hover] = process.argv.slice(2);
const { chromium } = await import(pw);
const browser = await chromium.launch();
await mkdir(out, { recursive: true });
for (const [build, port] of [["head", 4173], ["base", 4174]]) for (const theme of themes.split(",")) {
  if (build === "base" && theme === "mono") continue;
  for (const [w, h] of [[1440, 900], [375, 812]]) for (const route of routes.split(",")) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    if (hover && (await page.locator(hover).count())) { await page.locator(hover).first().hover(); await page.waitForTimeout(300); }
    const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "_");
    await page.screenshot({ path: `${out}/${build}-${theme}-${w}-${slug}${hover ? "-hover" : ""}.png` });
    await context.close();
  }
}
await browser.close();
```

Run: `bash "$DF_TMP/df-serve.sh" base "$DF_TMP/baseline/web" 4174` (if not running), then `node "$DF_TMP/p2-shot.mjs" "$DF_PW" "$DF_TMP/p2-tN-shots" "<routes>" dark,light,mono [selector]` (Mono is still captured on head: it is reachable through stored settings and is the colour-independence check, even though Settings does not offer it). The reviewer inspects the pairs. This is agent visual inspection, not owner sign-off (progress.md ruling).

**Staging:** `git add -- <exact paths>` only; `git diff --cached --name-only | sort` equals the task's list; nothing under `.superpowers/` or `docs/private/`. Deleted paths are staged with `git rm -- <path>`. Commit messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Step 0: Preflight (no commit)

- [ ] `git log --oneline -6` shows Phase 1 Tasks 5, 6 and 7 committed on `feat/darkfield-foundation`; `git status --porcelain` is empty. Record HEAD as the Phase 2 base.
- [ ] Confirm Phase 1 Task 6's global rule exists: `rg -n 'box-shadow: var\(--focus-ring\) !important' web/src/index.css`.
- [ ] Confirm Task 5's Mono block in `bridge.css` holds only `--bg-*` lines: `rg -n -A9 '^\[data-theme="mono"\]' web/src/styles/darkfield/bridge.css`.
- [ ] Re-run the three `rg` totals. A total that differs by more than Phase 1 Task 6's changes (two `box-shadow` deletions, one `box-shadow: var(--focus-ring)` addition) is a stop.
- [ ] Record the open owner confirmation for P2-3 (Rhythm Lab rain) in the progress ledger; Phase 2 proceeds without it.
- [ ] Run the static gate and the foundation browser test once on the base. Record the log as `$DF_TMP/p2-base-foundation.log`.

---

## Task 1: Atmosphere: one static ground behind every Layout route (D3 ruling, P2-3)

**Spec:** README principle 4; §10 *Global limits*, *Atmosphere by context*, *The zero-effects test*; §16 *Literal Matrix rain*, *Unreadably dense screens*; §12 *Decorative motion to remove* (drifting gradients); §09 *Line hierarchy* (L0); §05 *Light environments*; §17 *Opacity*, *Line weights*, *Grid increments*.

**Files:**
- Modify: `web/src/components/AppBackground/AppBackground.tsx`, `web/src/components/StaticBackground/StaticBackground.tsx`, `web/src/components/StaticBackground/StaticBackground.css`, `web/src/index.css`, `web/src/styles/darkfield/bridge.css`, `web/scripts/darkfield-bridge.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`
- Create: `web/scripts/darkfield-restraint.test.mjs`
- Delete (made dead by this task): `web/src/components/MatrixBackground/` (`MatrixBackground.tsx`, `MatrixBackground.css`, `index.ts`; `AppBackground.tsx` is its only importer, and `index.ts` imports only the component).
- Not touched (P2-3): `MatrixRain3DBackground/`, `pages/RhythmLab/*`, `scripts/matrix-rain-resize.test.mjs`. Not deleted (P2-4): `BionicBackground/`.

**Steps:**
- [ ] **1. Test first.** Create `web/scripts/darkfield-restraint.test.mjs` with the shared helpers and the Task 1 test. Later tasks append one `test(...)` each.

```js
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
```

  Confirm it fails: `cd "$W/web" && node --test scripts/darkfield-restraint.test.mjs; echo rc=$?` (expected before Steps 2–6: the T1 test fails, and the scope test fails only on `components/MatrixBackground/index.ts`, which Step 4 deletes).
- [ ] **2. Ground.** `StaticBackground.tsx` takes no props and renders `<div className="static-background" aria-hidden="true" />`. Replace `StaticBackground.css` with:

```css
/* Site ground (D3 ruling; §10, §09 L0, §05 Light environments): static field plus the L0 grid.
   No atmosphere, no motion. Values come only from tokens.css. */
.static-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: var(--field);
}

.static-background::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--rule) var(--stroke-hair), transparent var(--stroke-hair)),
    linear-gradient(to bottom, var(--rule) var(--stroke-hair), transparent var(--stroke-hair));
  background-size: var(--grid-major) var(--grid-major);
  opacity: var(--opacity-ghost);
}
```

- [ ] **3. Rain off every Layout route.** `AppBackground.tsx` becomes `const AppBackground = () => <StaticBackground />;` with no theme, layout-context or reduced-motion reads. The Rhythm Lab page is not touched (P2-3).
- [ ] **4. Delete `components/MatrixBackground/`.** Check module imports and re-exports outside the component's own directory: `rg -n "from ['\"][^'\"]*/MatrixBackground(/MatrixBackground)?['\"]" web/src -g '!**/components/MatrixBackground/**'` must list exactly `components/AppBackground/AppBackground.tsx` (edited in Step 3); anything else is a stop. Inside the directory, `index.ts` re-exports the component and `MatrixBackground.tsx` imports its own stylesheet; all three files go. Expected non-import mentions, left unchanged: `data/manPages.ts` (terminal man-page copy that names `MatrixBackground`; after deletion it names a component that no longer exists, a §16 real-string question handed to the Phase 5 terminal task; copy is not rewritten here), `data/processData.ts` (in `DEAD`), and `scripts/visual-review.mjs` (route-selection pattern and capture style).
- [ ] **5. Scrims.** In `index.css` delete the two `.prose-surface:not(.prose-surface--reading)` rules and the comment above them (their job was dimming rain behind text). Keep `.prose-surface--start`. Change `.prose-surface--reading` to `background: var(--app-bg); border-radius: 8px;` (opaque field: reading text sits on no grid, §16 *Unreadably dense screens*; radius is Phase 3). Update the `.page-content` comment that mentions the scrim to describe only `overflow-x: clip`.
- [ ] **6. Bridge.** Delete every `--bg-*` line: in `:root` (`--bg-canvas-fill`), in both fenced blocks, and in Task 5's `[data-theme="mono"]` block (delete the block if it becomes empty). Rewrite the fence comment so it names only what is still held (`accent-color`, `app-shadow`). In `darkfield-bridge.test.mjs` remove the eight `bg-*` names from `LEGACY` and the seven from `HELD`.
- [ ] **7. Browser invariant.** In `darkfield-foundation-browser-test.mjs`, inside the `if (MODE === "check") {` block, immediately above the line `// Task 4 and Task 6 add their invariants here.` (or, if Phase 1 Task 6 removed it, at the end of that block), add:

```js
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
```

**Verify:** static gate; foundation browser test; Mono record run; `boot-shell`, `procedural-animations`, `route-metadata`, `orbital` (line-196 note only), `case-study-media`.

**Visual:** `/`, `/writing/what-should-still-be-hard`, `/projects`, `/simulations/spider`, `/case-studies/aether`, plus `/simulations/rhythm-lab` (must be unchanged against base); dark, light, mono. Expect: no rain on Layout routes; a barely visible L0 grid; reading surfaces solid; Rhythm Lab rain as before.

**Ledger effect:** none expected, but rendered grounds change wherever a translucent ground sat over the old backgrounds, in every theme: in Dark the browser test drew a seeded static rain frame behind translucent grounds, and in Light and Mono the drifting gradients. Watch Light `/simulations/spider` `.spider-button` (`New Game`, `Deal` interact entries at 2.21 and 2.27), Annals text on the 0.97-alpha parchment (`creative`, `inactive`), and Dark entries measured on rendered grounds. A STALE entry is removed; a worse KNOWN entry or a changed record is a stop.

**Commit:** `feat(web): replace rain and drifting backgrounds behind the site with a static Darkfield ground`

---

## Task 2: Background-motion settings: held (P2-6, no commit in Phase 2)

The D3 ruling retires the Background animation and Speed settings once no animated atmosphere remains. After Task 1 the Layout routes have none, but the Rhythm Lab rain kept by P2-3 still reads both settings (`pages/RhythmLab/RhythmLab.tsx` passes `isAnimationPaused` and `backgroundMotionSpeed` to `MatrixRain3DBackground`). Removing them would leave that moving background with only the reduced-motion preference as an off switch (§10 *Global limits* asks for a user preference as well). So this task is held until the owner confirms P2-3:
- If the owner keeps the Rhythm Lab rain, the settings stay. After Task 1 they affect only `/simulations/rhythm-lab`, because the Layout ground is static. Their labels and the reduced-motion note still read as if they apply site-wide. That copy is a hand-off to Phase 5 or the owner; it is not rewritten here.
- If the owner removes it, this task runs: remove the settings from `settings.ts`, `LayoutContext.tsx`, `SettingsPanel.tsx`, `SettingsControls.tsx` (`SettingSwitch`, then dead), `settingsConstants.ts`, `SettingsPanel.css` and `SiteNavigation.tsx`. Imports still accept the old keys and ignore them. `settings-panel-browser-test.mjs` then asserts that the controls are absent.

Nothing in Tasks 3–10 depends on this task.

---

## Task 3: Loader: a row scan replaces the glowing ring; no glow, flicker or glass

**Spec:** §13 *Processing* (the loader panel holds a full text row, so the row form applies: a single cell travelling the row's lower edge; the compact quadrant form is for spaces too small to hold a row), *Avoid*; §12 class 3 *Scan / inspection*, *What may repeat*, *Reduced motion, by class*, *Decorative motion to remove*; §05 *State encoding* (pending colour); §11 *Rules*; §08 *Layers and overlays*; §04 (binary-digit motif, already cited by the master plan for `og-image`).

**Scope:** Phase 2 removes the glow, flicker, glass and the ring, and puts the scan in the ring's place. The rest of the §13 Processing signature (the pending word, the elapsed counter, a reduced-motion label) and the loader's copy are Phase 5 Task 5 (hand-off).

**Files:** `web/src/components/common/PageLoader.tsx`, `web/src/components/common/PageLoader.css`, `web/scripts/darkfield-restraint.test.mjs`. `LoadingSpinner/` is not touched (P2-4: already unreachable, listed in `DEAD`).

**Steps:**
- [ ] **1. Test first.**

```js
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
```

- [ ] **2. Implement.** In `PageLoader.tsx` delete the `matrix-spinner` element and its "01" child. Keep the overlay, `role="status"`, `aria-live`, the message and its copy. Wrap the message so the scan runs along its bottom edge: `<div className="page-loader__row"><p className="loading-text">{message}</p><span className="page-loader__scan" aria-hidden="true" /></div>`. Replace the spinner, flicker and loading-text glow rules in `PageLoader.css`:

```css
.page-loader-overlay {
    /* …position, size, z-index and flex rules unchanged… */
    background: var(--app-overlay);
    animation: page-loader-in var(--dur-base) var(--ease-settle);
}

/* §12: state transition (create) · a route chunk started loading */
@keyframes page-loader-in {
    from { opacity: 0; }
}

.page-loader__row {
    position: relative;
    padding-bottom: var(--stroke-bold);
}

.page-loader__scan {
    position: absolute;
    bottom: 0;
    left: 0;
    width: var(--cell-w);
    height: var(--stroke-bold);
    background: var(--fg-muted);
    animation: page-loader-scan var(--dur-scan) var(--ease-linear) infinite;
}

/* §12: scan / inspection · repeats only while the route chunk loads (§13 Processing, row form) */
@keyframes page-loader-scan {
    from { left: 0; }
    to { left: calc(100% - var(--cell-w)); }
}

@media (prefers-reduced-motion: reduce) {
    .page-loader-overlay,
    .page-loader__scan { animation: none; }
}
```

  Under reduced motion the scan cell stands still at the start of the row; §12's reduced form for a scan adds a word and a counter, which is Phase 5 Task 5 (hand-off). Remove the `text-shadow` from `.loading-text`; keep its colour and type. Delete `@keyframes matrix-spin`, `flicker` and `fadeIn`, and the `.matrix-spinner*` rules.

**Verify:** static gate; foundation browser test; Mono record run; `boot-shell` (it waits for `.page-loader-overlay`, kept).

**Visual:** the loader is too brief to catch unaided. In a copy of the shot script, delay the chunk the way `boot-shell-browser-test.mjs` does (`page.route(/\/assets\/CaseStudies-[\w-]+\.js$/, …)` holding the request for a few seconds), open `/projects/`, click `a[href="/case-studies"]:visible`, wait for `.page-loader-overlay`, and screenshot twice, a short interval apart (no `reducedMotion` in the context). Dark and light at 1440 (Mono head-only). Expect the message on a dimmed field with one small cell moving along its bottom edge; no ring.

**Ledger effect:** none.

**Commit:** `feat(web): show route loading as a row scan instead of a glowing ring`

---

## Task 4: Emission and shadows

**Spec:** README principle 1 and *Using the system* (regions separate by surface and rule, never shadow); §11 *Materials*, *Rules*, *Light theme*; §13 *Channels* (shadow never changes); §16 *Excessive neon*; §17 *Glow strength and focus*.

**Rule:** in governed CSS, every `text-shadow` and every `box-shadow` is deleted (drop, inset, bevel, glow), except `box-shadow: var(--focus-ring)` (Phase 1 Task 6, and the one proxy ring below). No governed element qualifies for a `var(--glow-*)`: none is a live value, path or cursor (§11 *Rules*), and the one live readout candidate, Snake's `.game-score`, is below the §11 *Rules* text size floor. The allowlist of live glows is empty. Delete a rule left empty. Delete keyframes that only animated a shadow, and the `animation` that used them.

**Files:** every governed CSS file in the inventory's `text-shadow` and `box-shadow` rows (after Tasks 1 and 3 remove `index.css`'s scrim and `PageLoader.css`'s glows), plus `web/src/components/Terminal/TopUI.css` (the glowing area below; it has no shadow, so the T4 output does not list it), `web/src/styles/darkfield/bridge.css`, `web/scripts/darkfield-bridge.test.mjs`, `web/scripts/darkfield-restraint.test.mjs`. Exact list at execution: the files in `node --test --test-name-pattern=T4 scripts/darkfield-restraint.test.mjs` output after Step 1, plus these four. Mixed-file governed selectors edited: `SnakeGame.css` `.game-score`, `.game-high-score`, `.game-over-content h2`, `.play-again-button:hover`, `.touch-btn:active`; `SpiderSolitaire.css` `.spider-button:hover:not(:disabled)`; `RhythmLab.css` `.rhythm-lab h1`, `.rhythm-lab-status-readout > span`, `.rhythm-lab-tutorial-headline`, `.rhythm-lab-tutorial-detail`, `.rhythm-lab-summary-score strong`, `.rhythm-lab-back-link`, `.rhythm-lab-audio-picker:focus-within` (proxy ring, below), `.rhythm-lab-hud span` (both rules), `.rhythm-lab-overlay-panel`, `.rhythm-lab-primary-action`, `.rhythm-lab-delete-dialog`, `.rhythm-lab-danger-button`; `SimulationCard.css` `.simulation-card h3`, `.simulation-card` (+ `:hover`, `:focus`), `.simulation-preview` (frame), `.launch-button` (+ hover/focus forms), `.coming-soon:hover`, `.simulation-card.coming-soon:hover`; `Annals.css` `.annals-page .ring-1`.

**Steps:**
- [ ] **1. Test first.**

```js
const isFocusRing = (v) => /^var\(--focus-ring\)(\s*!important)?$/.test(v);
test("T4 emission: no text-shadow; box-shadow only the focus ring", async () => {
  const bad = (await governedDecls()).filter((d) =>
    (d.prop === "text-shadow" && d.value !== "none") || (d.prop === "box-shadow" && d.value !== "none" && !isFocusRing(d.value)));
  assert.deepEqual(bad.map(where), []);
});
```

- [ ] **2. Remove** per the rule. Specific cases:
  - `GlobalSectionNavigation.css`: delete the three `box-shadow`s on `.nav-dot::before`, `:hover::before`, `.active::before`, the `animation: pulse` on `.nav-dot.active::before`, and `@keyframes pulse`.
  - `TopUI.css`: delete `.top-container::before` (a glowing area, §11 *Rules*) and `@keyframes matrixGlow`.
  - `GlobalScrollProgress.css`: the bar loses its glow; it is a scroll meter, not live data.
  - `Annals.css` `.annals-page .ring-1`: a spread-only selection boundary, not a shadow. Replace with `outline: var(--stroke-hair) solid var(--annals-ring-color, currentColor);` (same geometry). While such a button has keyboard focus, Phase 1 Task 6's `outline: 2px solid transparent !important` hides this outline and the focus ring stands in for it; that is accepted.
  - `RhythmLab.css` `.rhythm-lab-audio-picker:focus-within`: the picker wraps a file input that is visually hidden at narrow widths, so this rule is the picker's only visible focus cue there. Replace its `box-shadow` with a proxy ring: delete the old `box-shadow` line (keep the `:focus-within` border change) and add `.rhythm-lab-audio-picker:has(:focus-visible) { box-shadow: var(--focus-ring); }` inside the existing `@media (max-width: 768px)` block (RhythmLab.css:1646 at `d7e424e`), the block that clips `.rhythm-lab-audio-input`. Wider screens keep the input's own ring, so they get no second ring. T4 allows `var(--focus-ring)`.
  - `Annals.css` `.annals-sheet` (native): local hold. Replace its `var(--shadow-color, …)` with `var(--annals-sheet-shadow)` and add, directly above it:

```css
/* Native parchment (D6 ruling): keeps its own shadow, held at the legacy values the bridge carried. */
.annals-page { --annals-sheet-shadow: rgba(0, 0, 0, 0.3); }
[data-theme="light"] .annals-page { --annals-sheet-shadow: rgba(0, 0, 0, 0.08); }
```

  - Delete `box-shadow: none` lines whose only job was to cancel a shadow this task removed (`CaseStudyPage.css` `.case-study-link.disabled`, `RhythmLab.css` second `.rhythm-lab-hud span`, `Projects.css` `.tech-item, .tech-item:hover`, `SimulationCard.css` `.simulation-card.coming-soon:hover`).
  - In governed selectors only (not in `NATIVE`, not in `NATIVE_FILES`, not under `pages/Annals/` utility classes such as `.annals-page .transition`), remove `box-shadow` from `transition` lists, so no transition names a property that no longer changes. Find candidates with `rg -n -U 'transition:[^;]*box-shadow' web/src -g '*.css'` and skip every native hit (at `d7e424e`: `SpiderSolitaire.css` `.spider-card`, `RhythmLab.css` `.rhythm-lab-target-window-line` and `.rhythm-lab-hit-zone`, the lane tap zone, now in `NATIVE` as gameplay under the D6 ruling).
- [ ] **3. Release the shadow hold.** `bridge.css`: delete `--shadow-color` from `:root` and `--app-shadow` from both fenced blocks; update the fence comment. `Dock.css`: delete `--dock-shadow`. `rg -n 'var\(--(app-shadow|shadow-color|dock-shadow)' web/src` must print only nothing. `darkfield-bridge.test.mjs`: remove `app-shadow` and `shadow-color` from `LEGACY`, `app-shadow` from `HELD` (leaving `accent-color`).

**Verify:** static gate; foundation browser test; Mono record run; `case-study-media`, `settings-panel`, `header-overlap`.

**Visual:** `/`, `/projects` (open the tech-stack modal once by hand in a scratch run if practical), `/experience`, `/simulations`, `/simulations/snake`, `/simulations/annals`; dark, light, mono. Expect flat panels separated by rules; Annals parchment and the native previews unchanged against base.

**Ledger effect:** none expected; shadows paint outside text grounds except inset ones (`.settings-segmented__button[aria-pressed="true"]`, `.spider-card-back` is native). A stale or worse entry follows the ledger rule.

**Commit:** `fix(web): remove glow and drop shadows from the site interface and release the shadow hold`

---

## Task 5: Glass

**Spec:** §11 *Materials* (glass is not in the system); §08 *Layers and overlays* (an overlay dims, never blurs); README *Using the system*.

**Rule:** delete every governed `backdrop-filter`, `-webkit-backdrop-filter` and `filter: blur(…)`. A panel that was glass gets an opaque ground from the bridged variable it mixed. A full-viewport overlay keeps its translucent dim.

| Selector | Change |
|---|---|
| `SiteNavigation.css` `.site-header` | `background: var(--app-bg)` |
| `Dock.css` `--dock-background` | `var(--app-bg)` |
| `SettingsPanel.css` `.settings-panel` (both rules, including the narrow-width one that already reads `--app-bg`) | `background: var(--app-surface-elevated)` (bridge → `surface-2`; §08 *Layers and overlays* puts menus and dialogs on that surface) |
| `SettingsPanel.css` `.settings-header`, `.settings-close` | `background: var(--app-surface-elevated)` (same ground as the panel) |
| `HeroSection.css` `.hero-proof-strip` | `background: var(--background-color)` |
| `CaseStudyPage.css` `.case-study-hero, .case-study-section`; `SimulationCard.css` `.simulation-card` | blur deleted (grounds unchanged); delete the rule if empty |
| `Modal.css` `.modal-overlay`; `ProjectMedia.css` `.media-inspector`; `Projects.css` `.tech-stack-modal`; `RhythmLab.css` `.rhythm-lab-overlay`, `.rhythm-lab-modal-backdrop`; `SnakeGame.css` `.game-over-overlay, .game-overlay`, `.snake-game-container` (page container, governed) | overlays/dims: blur deleted, background unchanged |

**Files:** `web/src/components/Navigation/SiteNavigation.css`, `web/src/components/Dock/Dock.css`, `web/src/components/SettingsPanel/SettingsPanel.css`, `web/src/pages/Home/sections/HeroSection.css`, `web/src/components/CaseStudyPage/CaseStudyPage.css`, `web/src/components/SimulationCard/SimulationCard.css`, `web/src/components/common/Modal.css`, `web/src/components/ProjectMedia/ProjectMedia.css`, `web/src/pages/Projects/Projects.css`, `web/src/components/RhythmLab/RhythmLab.css`, `web/src/components/SnakeGame/SnakeGame.css`, `web/scripts/darkfield-restraint.test.mjs`

**Steps:**
- [ ] **1. Test first.**

```js
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
```

- [ ] **2. Implement** the table.

**Verify:** static gate; foundation browser test (the header `backdrop` pass now measures an opaque header); Mono record run; `header-overlap`, `settings-panel`, `case-study-media`.

**Visual:** `/projects` scrolled so content passes under the header; Settings open; `/case-studies/aether` with the media inspector open; `/simulations/snake` (game-over overlay is not reachable statically, skip); dark, light, mono, both widths.

**Ledger effect:** none expected (no ledger entry is a `backdrop` check).

**Commit:** `fix(web): replace glass panels with opaque Darkfield grounds`

---

## Task 6: Hover in CSS: controls neither move nor shine; static content stays still

**Spec:** §13 *Hover: operable, inspectable, static*, *Channels*, *Avoid*; README principle 7 is not in scope (Phase 3).

**Rule:**
1. In every governed rule whose innermost selector has `:hover`, `:active`, `:focus`, `:focus-visible` or `:focus-within`, delete `transform`, `translate`, `scale`, `rotate` and `filter`. (Shadows went in Task 4.) Delete `transform: none` lines that only cancelled a lift. Delete a rule left empty.
2. Delete each sheen: the `::before` base rule and its `:hover::before` / `:focus::before` rule, for `.interactive-card`, `.btn`, `.modal-button`, `.stat-card`, `.simulation-card`, `.coming-soon`. First confirm with a read that the pseudo-element does nothing else. `.launch-button::before` is a ground fill, not a sheen; keep it.
3. Static content does not react to the pointer: every declaration of its hover rules goes:
   - `components.css`: `.interactive-card:hover` becomes `a.interactive-card:hover` (every operable use is a `Link`; static uses are `article`, `section` and `div`). Delete `.tech-tag:hover`.
   - `WorkDetails.css`: delete `.work-details-container:hover`, `.work-dates:hover`, `.tech-tag:hover`, `.highlight-tag:hover`.
   - `Work.css`: delete `.timeline-node:hover`. `TimelineItem.css`: delete `.timeline-item:hover .timeline-icon-wrapper` and `.timeline-item:hover .timeline-content` (the image flip on `.has-image` stays; Phase 3 reviews it as Inspect).
   - `Projects.css`: `.tech-item, .tech-item:hover { … }` becomes `.tech-item { cursor: default; }`.
   - `SimulationCard.css`: `.simulation-card:hover`, `:focus` and their `.launch-button` forms become `a.simulation-card…` (operable cards are `Link` or `a`; the coming-soon card is a `div`). Delete `.coming-soon:hover`, `.coming-soon:hover::before`, `.simulation-card.coming-soon:hover`, and the reduced-motion rules whose only declaration cancels a transform. In the grouped reduce rule `.simulation-card, .simulation-card::before, .simulation-preview * { animation: none !important; transition: none !important; }` remove only `.simulation-card::before` from the selector list (the sheen is gone); `.simulation-preview *` stops the native previews under reduced motion and must stay.
   - `CaseStudyPage.css`: `.case-study-link:hover` becomes `a.case-study-link:hover`; delete both `.case-study-link.disabled:hover` rules.
   - `ExplorationChoiceSection.css`: delete the `brightness`/`translateY` hover and focus-visible rules (focus shows through Phase 1 Task 6's ring).
4. Remove `transform` from `transition` lists on the edited selectors, and delete `will-change: transform, box-shadow` and `transform: translateZ(0)` from `.interactive-card`.

**Files:** `web/src/styles/components.css`, `web/src/components/WorkDetails/WorkDetails.css`, `web/src/pages/Work/Work.css`, `web/src/components/TimelineItem/TimelineItem.css`, `web/src/pages/Projects/Projects.css`, `web/src/components/SimulationCard/SimulationCard.css`, `web/src/components/CaseStudyPage/CaseStudyPage.css`, `web/src/pages/Home/sections/ExplorationChoiceSection.css`, `web/src/pages/Home/Home.css`, `web/src/components/common/Modal.css`, `web/src/components/common/ErrorBoundary.css`, `web/src/components/Layout/GlobalSectionNavigation.css`, `web/src/components/SettingsPanel/SettingsPanel.css`, `web/src/components/Terminal/Terminal.css`, `web/src/pages/NotFound/NotFound.css`, `web/src/components/RhythmLab/RhythmLab.css` (governed `.rhythm-lab-primary-action:hover`, `.rhythm-lab-danger-button:hover` only), `web/src/components/SnakeGame/SnakeGame.css` (`.play-again-button:hover`, its `transition`), `web/src/components/SpiderSolitaire/SpiderSolitaire.css` (`.spider-button:hover:not(:disabled)`), `web/scripts/darkfield-restraint.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`. The T6 test output after Step 1 is the authority; add any file it names and record it in the commit body.

**Steps:**
- [ ] **1. Test first.**

```js
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
```

- [ ] **2. Implement** the rule.
- [ ] **3. Browser invariant** (same insertion point as Task 1):

```js
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
```

**Verify:** static gate; foundation browser test; Mono record run; `case-study-media`, `procedural-animations`, `settings-panel`.

**Visual:** with the hover argument: `/case-studies` (`a.interactive-card`), `/case-studies/aether` (`article.interactive-card`), `/simulations` (`a.simulation-card`), `/projects` (`.stat-card`), `/` (`.btn-primary`); dark, light, mono. Expect: operable cards keep their colour change, nothing moves, no sweep; static articles do not change.

**Ledger effect:** hover values can only move toward the rest values. A KNOWN `:hover` entry measured worse than its baseline is a stop. The D10 exception for `.stat-card::before` (`left`, `right`, `inset` CHROME line) no longer applies once the sweep is gone; say so in the commit body.

**Commit:** `fix(web): drop hover lift, scale and sheen; static content no longer reacts to hover`

---

## Task 7: Dock without magnification (P2-2)

**Spec:** §13 *Channels* (size never changes), *Avoid*; §12 *Easing* (no spring physics).

**Files:** `web/src/components/Dock/DockIcon.tsx`, `web/src/components/Dock/Dock.tsx`, `web/src/components/Dock/useDock.ts`, `web/src/components/Dock/DockExploreStack.tsx` (only if it passes the removed props), `web/src/components/Navigation/SiteNavigation.tsx`, `web/src/components/SettingsPanel/SettingsPanel.tsx`, `web/src/components/SettingsPanel/settingsConstants.ts`, `web/src/utils/settings.ts`, `web/scripts/settings-panel-browser-test.mjs`, `web/scripts/darkfield-settings.test.mjs`, `web/scripts/darkfield-restraint.test.mjs`

**Steps:**
- [ ] **1. Tests first.** `darkfield-settings.test.mjs`:

```js
test("exports that carry retired dock tuning still import, and the keys are ignored", () => {
  assert.deepEqual(parseSettingsImport({ version: 1, dockSize: 50, dockStiffness: 900, magnification: 5 }), { dockSize: 50 });
});
```

  `darkfield-restraint.test.mjs`:

```js
test("T7 dock: fixed-size icons, no magnification or responsiveness", async () => {
  for (const f of ["components/Dock/DockIcon.tsx", "components/Dock/Dock.tsx", "components/Dock/useDock.ts", "components/SettingsPanel/SettingsPanel.tsx", "components/Navigation/SiteNavigation.tsx"]) {
    // The settings panel's own slide spring goes in Task 9, so this pattern names only dock tuning.
    assert.doesNotMatch(await read(f), /[Mm]agnification|dockStiffness|DockStiffness|DOCK_STIFFNESS|Responsiveness|useSpring/, f);
  }
});
```

- [ ] **2. Implement.**
  - `DockIcon.tsx`: delete `MAGNIFICATION_RANGE`, the `mouseX`, `stiffness`, `magnification` props, the icon-centre measurement, `distance`, `size`, `useSpring` and the derived font size. The icon is a plain `div` sized `baseSize` with font size `baseSize * 0.6` (the existing ratio). Leave the tooltip's motion to Task 9.
  - `Dock.tsx`: stop passing the removed props; delete the `onMouseMove`/`onMouseLeave` pointer tracking if nothing else reads `mouseX`.
  - `useDock.ts`: state, schema, reducer and storage hold `dockSize` only (zod's `z.object` drops unknown keys, so stored values from older builds still parse); delete `mouseX`/`useMotionValue` if unused; delete the stiffness and magnification handlers.
  - `SiteNavigation.tsx`: the dock safe space is `size + 60` (no magnification term); stop passing the removed props.
  - `SettingsPanel.tsx`: delete the Responsiveness and Magnification sliders, `isMagnificationInert`, their reset/import calls and the comments about the spring. The Size slider stays, and so does the narrow-screen branch of `dockTuningNote` ("Dock tuning applies on wider screens."). Delete its reduced-motion branch (SettingsPanel.tsx:100 at `d7e424e`, which names the removed sliders), together with `isMagnificationInert`. `settingsConstants.ts`: delete `DOCK_STIFFNESS_CONFIG`, `MAGNIFICATION_CONFIG`.
  - `settings.ts`: drop `dockStiffness`, `magnification` from `UserSettings`, `DEFAULT_SETTINGS`, `validateDockSettings` and `ranges`; the import ignores them.
- [ ] **3. Browser test.** `settings-panel-browser-test.mjs`: in the dock-tuning block keep Size; assert `getByRole("slider", { name: "Responsiveness" })` and `{ name: "Magnification" }` have count 0; in the reduced-motion block replace the Magnification assertion the same way; drop both keys from the export-key list.

**Verify:** static gate; foundation browser test; Mono record run; `settings-panel`, `header-overlap` (dock layout and safe space).

**Visual:** dock mode at 1440 with the pointer over the middle icon (hover `.dock-nav-link`); dark, light, mono. Expect same-size icons.

**Ledger effect:** none.

**Commit:** `refactor(web): remove dock magnification and its spring tuning`

---

## Task 8: Narrator text appears without typing or reveal

**Spec:** §06 *Rules* (prose is never typed out); §12 *Decorative motion to remove* (typing effects on running text), *Reduced motion, by class*; master plan acceptance (no reveal animation on Narrator text).

**Files:** `web/src/pages/Writing/Writing.tsx`, `web/src/pages/Journey/Journey.tsx`, `web/src/pages/ProceduralAnimations/ProceduralAnimations.tsx`, `web/src/pages/CaseStudies/CaseStudies.tsx`, `web/src/pages/Work/Work.tsx`, `web/src/components/CaseStudyPage/CaseStudyPage.tsx`, `web/src/components/Terminal/TerminalView.tsx`, `web/src/components/Terminal/Terminal.css`, `web/src/pages/Home/Home.tsx`, `web/src/pages/Home/sections/HeroSection.tsx`, `web/src/pages/Home/sections/HeroSection.css`, `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`, `web/src/pages/Home/sections/CapabilitiesSection.tsx`, `web/src/pages/Home/sections/ContactStripSection.tsx`, `web/src/components/TimelineItem/TimelineItem.tsx`, `web/src/pages/Home/sections/SocialLinksSection.tsx` (unreachable; edited only so typecheck keeps passing), `web/scripts/darkfield-restraint.test.mjs`. Delete: `web/src/components/TypeWriterText/` (`index.ts`, `TypeWriterText.tsx`, `TypeWriterText.css`).

**Steps:**
- [ ] **1. Test first.**

```js
test("T8 narrator: no typing or reveal animation", async () => {
  assert.ok(!(await readdir(resolve(src, "components"))).includes("TypeWriterText"), "TypeWriterText still exists");
  const bad = [];
  for (const f of (await reachable()).filter((x) => x.endsWith(".tsx"))) if (/\bwhileInView\b|TypeWriterText/.test(await read(f))) bad.push(f);
  assert.deepEqual(bad, []);
});
```

- [ ] **2. Implement.**
  - Each `TypeWriterText` use becomes its `text` value, in the same parent element. The heading text is unchanged. `Work.tsx`: `location`/`useLocation` and the comment above them existed only to key the typewriter; remove them if nothing else reads `location` (the T8 test also rejects the word in comments).
  - `HeroSection.tsx`/`Home.tsx`: `hasShownHomeIntro`, `onIntroComplete`, `handleIntroComplete` and the `home-intro-shown` storage write become dead; remove them. `HeroSection.css`: remove `.hero-subtitle .typewriter-word` from its selector list.
  - `TerminalView.tsx`: render the welcome line as plain text. Where `!hasShownIntro`, call `onIntroComplete()` from a `useEffect` on mount, so the prompt appears exactly as it did after typing. Lines with `useTypewriter` render through the plain-text branch. Remove the `AnimatePresence` wrapper. The `useTypewriter` field stays in types and hooks, inert (Phase 5 terminal). `Terminal.css`: delete `.typewriter-text` and its comment.
  - Remove `initial`/`whileInView`/`viewport` and their `transition` from the elements in `HeroSection.tsx`, `FeaturedProjectsSection.tsx`, `CapabilitiesSection.tsx`, `ContactStripSection.tsx`; a `motion.*` element with no motion props left becomes the plain element. `TimelineItem.tsx`: remove `itemVariants`, `initial`, `whileInView`, `viewport` from the item (keep the flip for Task 9).
  - `SocialLinksSection.tsx`: replace its `TypeWriterText` with the title text.
- [ ] **3. Delete** `components/TypeWriterText/`. `rg -n TypeWriterText web/src` prints nothing.

**Verify:** static gate; foundation browser test (headings are now plain text; sampler and pairing keys use text, so expect no change); Mono record run; `procedural-animations`, `case-study-media`, `route-metadata`, `boot-shell`.

**Visual:** `/` (first visit: clear storage), `/writing`, `/journey`, `/experience`, `/terminal`; dark, light, mono. Run once without `reducedMotion` (edit the context option in a copy of the script) to confirm nothing types or rises in.

**Ledger effect:** none.

**Commit:** `fix(web): show headings and prose without typing or scroll-reveal animation`

---

## Task 9: Framer motion: no springs, overshoot, hover scale, parallax or fly-ins; token timing

**Spec:** §12 *Easing* (no spring, overshoot, bounce), class 1 *Create / remove* and *Reveal / conceal* rows, *Timing bands*, *Reduced motion, by class*, *Decorative motion to remove* (parallax without real depth); §13 *Channels*, *Avoid*, *The state model* (Selected enters by snap); §17 *Animation durations*, *Easing*.

**Files:** create `web/src/utils/motionTokens.ts`, `web/scripts/darkfield-motion.test.mjs`. Modify: `web/src/components/Layout/Layout.tsx`, `web/src/components/Navigation/SiteNavigation.tsx`, `web/src/components/Dock/Dock.tsx`, `web/src/components/Dock/DockIcon.tsx`, `web/src/components/Dock/DockSettingsButton.tsx`, `web/src/components/common/Toast.tsx`, `web/src/components/common/Modal.tsx`, `web/src/components/SettingsPanel/SettingsPanel.tsx`, `web/src/components/Layout/GlobalSectionNavigation.tsx`, `web/src/pages/Home/Home.tsx`, `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`, `web/src/pages/Home/sections/ContactStripSection.tsx`, `web/src/pages/Work/Work.tsx`, `web/src/pages/Journey/Journey.tsx`, `web/src/components/TimelineItem/TimelineItem.tsx`, `web/src/components/ProjectRoster/ProjectRosterItem.tsx`, `web/src/components/Terminal/VimUI.tsx`, `web/scripts/darkfield-restraint.test.mjs`.

**Steps:**
- [ ] **1. Tests first.** `web/scripts/darkfield-motion.test.mjs` (imports `.ts`; local Node ≥ 22.18, like `darkfield-settings.test.mjs`):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseDuration, parseEase } from "../src/utils/motionTokens.ts";

const tokens = await readFile(new URL("../src/styles/darkfield/tokens.css", import.meta.url), "utf8");
const values = (prefix) => [...tokens.matchAll(new RegExp(`--(${prefix}-[a-z]+):\\s*([^;]+);`, "g"))].map(([, n, v]) => [n, v]);

test("every duration token parses to seconds", () => {
  for (const [name, value] of values("dur")) {
    const ms = parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
    assert.equal(parseDuration(value), ms / 1000, name);
  }
});

test("every easing token parses to a Framer easing that runs from 0 to 1", () => {
  for (const [name, value] of values("ease")) {
    const ease = parseEase(value);
    if (typeof ease === "function") { assert.equal(ease(0), 0, name); assert.equal(ease(1), 1, name); }
    else if (Array.isArray(ease)) assert.equal(ease.length, 4, name);
    else assert.equal(ease, "linear", name);
  }
});
```

  `darkfield-restraint.test.mjs`:

```js
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
```

- [ ] **2. Helper.** `web/src/utils/motionTokens.ts`:

```ts
// Darkfield motion tokens for Framer Motion, which cannot read CSS custom properties (§17).
// Values come only from tokens.css; this module parses them and defines none.
export type Easing = [number, number, number, number] | "linear" | ((t: number) => number);

export const parseDuration = (value: string): number => {
  const v = value.trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) throw new Error(`not a duration: ${v}`);
  return v.endsWith("ms") ? n / 1000 : n;
};

export const parseEase = (value: string): Easing => {
  const v = value.trim();
  if (v === "linear") return "linear";
  const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(v);
  if (bezier) {
    const p = bezier[1].split(",").map(Number);
    if (p.length === 4 && p.every(Number.isFinite)) return p as [number, number, number, number];
  }
  const steps = /^steps\((\d+)\s*(?:,\s*(?:end|jump-end))?\)$/.exec(v);
  if (steps) {
    const n = Number(steps[1]);
    return (t: number) => (t >= 1 ? 1 : Math.floor(t * n) / n);
  }
  throw new Error(`not an easing: ${v}`);
};

/** Reduced motion (§12 Reduced motion, by class): the new state appears at once. */
export const INSTANT = { duration: 0 } as const;

const read = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** A tween timed by a duration token and an easing token. Call during render, not at module load. */
export const motionToken = (duration: `--dur-${string}`, ease: `--ease-${string}`) => {
  const d = read(duration);
  const e = read(ease);
  if (!d || !e) return INSTANT; // tokens.css not applied: show the end state rather than throw in render
  return { type: "tween" as const, duration: parseDuration(d), ease: parseEase(e) };
};
```

- [ ] **3. Convert.** Pattern: `const reduce = useReducedMotion();` and `transition={reduce ? INSTANT : motionToken(…)}`, with a `// §12: <class> · <state reported>` comment on the line above every `transition` prop or key. Per site:

| Site | Change | Tokens |
|---|---|---|
| `Layout.tsx` page wrapper | variants: opacity only (drop `y`); drop `anticipate` | enter `--dur-base`, `--ease-settle` (the wrapper has no exit variant); `// §12: state transition (create) · the route changed` |
| `SiteNavigation.tsx` header variants; `Dock.tsx` dock variants | opacity only (drop `y`, `scale`, `filter`); one variant set, reduced uses `INSTANT` | enter `--dur-base` `--ease-settle`, exit `--dur-fast` `--ease-depart`; `// §12: state transition (create / remove) · navigation mode changed` |
| `DockIcon.tsx` tooltip | opacity only | enter `--dur-base` `--ease-settle`, exit `--dur-fast` `--ease-depart`; create · label shown for the hovered or focused link |
| `DockSettingsButton.tsx` | delete `whileHover`, `whileTap`; active indicator renders without motion (no `layoutId`, no scale); a plain element shown when active | Selected snaps (§13); no transition |
| `Toast.tsx` | enter/leave opacity only (drop `x`, `scale`); close button loses `whileHover`/`whileTap`; progress bar keeps its linear countdown: compute `const progressSeconds = duration / 1000;` above the JSX and use `{ ...motionToken("--dur-base", "--ease-linear"), duration: progressSeconds }` (the toast's own lifetime is data, not a design value); under reduced motion render the bar without animation | enter `--dur-base` `--ease-settle`, exit `--dur-fast` `--ease-depart`; bar: continuous change · time until dismissal |
| `Modal.tsx` | content opacity only (drop `scale`, `y`, spring); three buttons lose `whileHover`/`whileTap`; overlay fade tokenised | `--dur-base` `--ease-settle` / exit `--dur-fast` `--ease-depart` |
| `SettingsPanel.tsx` | panel: opacity only (drop the `x` slide, which leaves off-screen, and the spring); close button loses `whileHover`/`whileTap`; inner fade: drop `delay`, tokenise | as Modal |
| `GlobalSectionNavigation.tsx` | nav: opacity only (drop `x`); dots lose `whileHover`, `whileTap` and the active `animate` scale (`motion.button` becomes `button`) | enter `--dur-base` `--ease-settle`; create · page sections listed |
| `Home.tsx` | delete `useScroll`/`useTransform` parallax; the three `motion.div` wrappers become `div` with the same `id` | — |
| `FeaturedProjectsSection.tsx` | delete the article's `whileHover`; `ContactStripSection.tsx` link's `whileHover` | — |
| `Work.tsx`, `Journey.tsx` | page-level opacity fades duplicate Layout's; `motion.div` becomes `div` | — |
| `TimelineItem.tsx` flip | keep the existing turn; tokenise (`--dur-base`, `--ease-standard`); `// §12: state transition (reveal) · card turned to its image`; Phase 3 reviews the flip as Inspect | — |
| `ProjectRosterItem.tsx` detail | keep height/opacity; tokenise (`--dur-base`, `--ease-settle`) | continuous change · detail panel opened |
| `VimUI.tsx` | tokenise the opacity fade | enter `--dur-base` `--ease-settle`, exit `--dur-fast` `--ease-depart`; create · editor opened |

  Remove unused framer imports after each change; `npm run lint` catches leftovers.

**Verify:** static gate (both new tests); foundation browser test; Mono record run; `settings-panel`, `header-overlap`, `boot-shell`, `case-study-media`.

**Visual:** open Settings, a toast (Settings → Export), and switch header ↔ dock on `/` at 1440; record several frames during the first half second after each action (no `reducedMotion` in the context) in dark only, plus one settled frame in light and mono. Expect fades, no slides, scales or blur.

**Ledger effect:** none.

**Commit:** `fix(web): time site motion by Darkfield tokens and remove springs, overshoot, parallax and hover scale`

---

## Task 10: Decorative CSS loops; surviving keyframes annotated and token-timed

**Spec:** §12 *Decorative motion to remove* (perpetual pulsing), *What may repeat*, class 1 rows, *Easing*, *Reduced motion, by class*; Phase 6 *Motion classes* row (annotation format `§12: <class> · <state reported>`).

**Files:** `web/src/pages/Home/Home.css`, `web/src/pages/Projects/Projects.css`, `web/src/pages/Work/Work.css`, `web/src/pages/Home/sections/CapabilitiesSection.css`, `web/src/components/Terminal/Terminal.css`, `web/src/components/Navigation/SiteNavigation.css`, `web/src/components/TerminalDropdown/TerminalDropdown.css`, `web/src/components/Dock/Dock.css`, `web/src/components/ProjectMedia/ProjectMedia.css`, `web/src/components/ProjectRoster/ProjectRoster.css`, `web/scripts/darkfield-restraint.test.mjs`. Add any file the T10 test names and record it in the commit body.

**Steps:**
- [ ] **1. Test first.**

```js
// Terminal cursor and top-row motion: the Phase 5 terminal task. Native keyframes: D6 ruling.
const KEYFRAME_HANDOFF = { "components/Terminal/TerminalView.css": ["blink"], "components/Terminal/VimUI.css": ["blink"], "components/Terminal/TopUI.css": ["processUpdate"] };
const NATIVE_KEYFRAMES = { "components/SnakeGame/SnakeGame.css": ["pulse"], "components/SimulationCard/SimulationCard.css": ["snakeMove", "pulse", "rhythmPreviewDrift"], "components/RhythmLab/RhythmLab.css": ["rhythmLabHitBurst", "rhythmLabJudgmentReadout"] };
test("T10 keyframes: each governed @keyframes is annotated and timed by tokens", async () => {
  const bad = [];
  for (const f of await governed(".css")) {
    const css = await read(f);
    const skip = [...(KEYFRAME_HANDOFF[f] ?? []), ...(NATIVE_KEYFRAMES[f] ?? [])];
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
```

- [ ] **2. Remove decorative loops.** Delete the `animation` and the `@keyframes`, and set the pseudo-element to the animation's end state where its base rule does not already describe it:
  - `Home.css` `.section-title::after`: delete `titleUnderlineScale`; add `transform: translateX(-50%);` (the end state centres it). Delete the unused `@keyframes float`.
  - `CapabilitiesSection.css` `.capabilities-section .section-title::after`: delete `animation-name` and `capabilitiesTitleUnderline`; set `transform: none;` (it is left-aligned; without this it would inherit the centring translate).
  - `Projects.css`, `Work.css`: delete `titleUnderline`; set the underline's `width` to the keyframe's `to` width if the base rule differs.
  - `Terminal.css`: delete `.sidecar-icon`'s `animation: pulse`, the `.sidecar-icon:hover { animation: none; }` rule and `@keyframes pulse`.
- [ ] **3. Annotate and tokenise survivors.** Each gets `/* §12: <class> · <state reported> */` directly above its `@keyframes`, and its `animation` uses tokens:

| Keyframes | Annotation | Animation |
|---|---|---|
| `site-header-panel-in` | state transition (create) · header menu opened | `var(--dur-base) var(--ease-settle)` |
| `dock-explore-panel-in` | state transition (create) · explore menu opened | `var(--dur-base) var(--ease-settle)` |
| `media-inspector-in` | state transition (create) · media inspector opened | `var(--dur-base) var(--ease-settle)` |
| `dropdownSlideDown` | state transition (create) · dropdown opened | `var(--dur-base) var(--ease-settle)`; drop its `translateY` (opacity only) |
| `project-roster-reveal` | state transition (create) · project detail opened | `var(--dur-base) var(--ease-settle)`; drop its `translateY` |

  Each already has a reduced-motion `none`, or sits inside `prefers-reduced-motion: no-preference`; confirm with a read and add the `reduce` rule where missing. All five are opacity fades, so they are annotated and timed as class 1 enters (P2-5). The spec's form for a reveal is an aperture; whether any of these menus should open that way is a Phase 3 hand-off.

**Verify:** static gate; foundation browser test; Mono record run; `header-overlap`, `case-study-media`.

**Visual:** `/`, `/projects`, `/experience` (underlines static and placed as before), `/terminal` (sidecar still); dark, light, mono.

**Ledger effect:** none.

**Commit:** `fix(web): stop decorative title and icon loops and time the remaining reveals by tokens`

---

## Phase exit (no commit)

- [ ] Every test in `darkfield-restraint.test.mjs` and `darkfield-motion.test.mjs` passes; the full static gate passes.
- [ ] The foundation browser test passes in check mode with `dark,light`; the Mono record run shows no new or worsened id against `mono-worklist.json` (report the count); all seven named browser tests pass (orbital line-196 note only).
- [ ] Re-run the inventory: governed `text-shadow` 0; governed `box-shadow` only `var(--focus-ring)`; governed `backdrop-filter` 0; reachable TSX has no spring, `whileHover`, `whileTap`, `whileInView` or parallax.
- [ ] Three-question check (§16 *The three-question check*) per route on Mono screenshots with atmosphere off (there is none left): reviewer judgement, recorded in the report.
- [ ] Hand-offs recorded: Phase 3 (hover list above; the timeline flip; aperture reveals for the five menus; segmented-button and roster-toggle state signatures that lost their ring or glow; gradients on buttons, modal and toast panels; the overlay dim value, §08), Phase 5 (terminal cursor and `processUpdate`; `data/manPages.ts` naming the deleted `MatrixBackground`; Phase 5 Task 5: the loader's pending word, elapsed counter, reduced-motion label and copy; Rhythm Lab page background), owner (P2-3 Rhythm Lab rain, then Task 2; the Background animation/Speed labels and note, which now affect only Rhythm Lab; cleanup of the `DEAD` files).

## Risks and stop conditions

The master plan's stop conditions apply. Phase-specific:

1. **Ground change moves rendered measurements.** Task 1 changes what sits behind translucent controls (Light Spider buttons, Annals parchment at 0.97 alpha, and in Dark any rendered ground that showed the seeded rain frame). A KNOWN entry worse than its baseline, or a `creative`/`inactive` change beyond the test's tolerance, is a stop. Report ids and values; the fix (a ground for the control, or a ruled re-record) is a controller decision.
2. **L0 grid behind text.** §16 *Unreadably dense screens* forbids texture behind text; the D3 ruling keeps the L0 grid site-wide. Reading surfaces get an opaque field (Task 1 Step 5); headings and cards elsewhere sit over the ghost grid or their own grounds. The reviewer judges the screenshots; if the grid reads as texture behind prose, stop and ask for a ruling (options: mask the grid under `main`, or keep it only in empty regions).
3. **Loader form.** Task 3 uses the §13 row form timed by `dur-scan` and `ease-linear` tokens only; if the reviewer judges the loader panel too small to hold a row, stop and ask for a ruling rather than encode any spec limit.
4. **Settings removals change a user-visible panel** (Task 7, P2-2, ruled). Task 2 stays held until the owner answers P2-3; if the owner removes the Rhythm Lab rain, Task 2 runs after Task 10.
5. **Line drift.** Tasks 5 and 6 of Phase 1 land first; selectors, not lines, are authoritative. A selector named here that no longer exists is a stop.
6. **Mixed files.** A diff touching a selector in `NATIVE` or `NATIVE_KEYFRAMES`, a file in `NATIVE_FILES` or `pages/RhythmLab/` (P2-3), or any creative-owned path, fails review. The one named exception is Task 4's `.annals-sheet` local hold.
7. **Typecheck reaches dead files.** `tsconfig` includes all of `src`, so deleting a component breaks unreachable importers (`SocialLinksSection.tsx` in Task 8). Edit such a file minimally; never delete pre-existing dead files here.
8. **Framer token reads** run in render (`getComputedStyle`). `tokens.css` is the first stylesheet `src/index.tsx` imports (line 3), so it should apply before any component renders; `motionToken` still returns `INSTANT` if a token reads empty, so a missing token degrades to no animation instead of a render error. The reviewer confirms no page errors in the browser tests (the foundation test fails on any).
