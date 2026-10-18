# Darkfield Phase 3 (Grammar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. One task, one commit, an independent reviewer between tasks (master plan, *Operational safety*). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give the site's own interface Darkfield's grammar: each text element speaks one voice; rank and state use structural signatures (D7); every governed control follows the §13 state model (D8); corners are square; lines follow L1/L2; no literal colour remains in Phase 3 surfaces; the local colour-variable systems and the bridge's aliases are retired into tokens. At the end of Phase 3, governed CSS reads tokens directly and `bridge.css` holds only the documented `--accent-color` hold, which Phase 5 retires.

**Authority (read in `$DF_TMP/darkfield` before each task):** README *Using the system*, principles 3, 5, 7; §03 *Ranks of form*, *Rules* (frames and boundaries, nodes, nested structures); §05 *Roles*, *Semantic prominence → theme rendering*, *State encoding*, *Rationing the secondary hues*, *Contrast, verified*; §06 (all); §08 *The instrument grid*, *Layers and overlays*, *Not a dashboard*; §09 *Line hierarchy*, *Dash semantics*, *Frames and corners*, *Opacity and colour*; §13 *Channels*, *The state model*, *Hover: operable, inspectable, static*, *Focus in each theme*, *Activation*, *Selection versus transient states*, *Disabled, unavailable, stale*, *Direct manipulation*, *Feedback timing*, *Avoid*; §17 *Corner radii*, *Chamfers*, *Line weights*, *Opacity*, *Animation durations*, *Easing*, *Composite recipes*. Supporting: §16 *Over-framing*, *Terminal cosplay*.

The master plan's *Phase 3: Grammar* bullets are the scope. Its *Scope boundary*, *Global Constraints*, *Operational safety* and *Validation model* apply unchanged.

**Inventory base:** `6f3042e` (Phase 1 Task 4 with its fix). **Execution base:** HEAD after Phase 2 exits (Phase 1 Tasks 5–7 and Phase 2 Tasks 1, 3–10 committed; Phase 2 Task 2 is held). Step 0 records it. Line numbers are at `6f3042e`; locate code by selector.

### Decisions this plan relies on

| Label | Decision | Status |
|---|---|---|
| D7 ruling | Lifecycle statuses become context labels: `label-sm`, `fg-muted`, no hue; `•` only on Live | Delegated ruling (progress.md), not an owner approval |
| D8 ruling | No filled primary button; idle controls on an `edge` boundary; prominence from position; pressed is the §13 inverse | Delegated ruling |
| Chamfer ruling | Where README *Using the system* and §09/§17 differ on chamfers, the stricter README per-container limit governs | Delegated ruling |
| Dead-code ruling | Code already dead before a task is not deleted; it is excluded by name. Code a task makes dead may be deleted (listed per task) | Delegated ruling (controller) |
| D4(b) interim, D6, P2-1, P2-3, P2-4 | Mono supported in code, not offered in Settings; check mode runs `dark,light`, Mono is a record-mode work list (controller ruling); D6 rows; Phase 3 supplies the hover Phase 2 removed; Rhythm Lab rain held; pre-existing dead files untouched | Delegated rulings (progress.md, Phase 2 plan) |
| D10 | 136 ledger entries accepted for deferral | Owner, 2026-10-15 |
| D11(a) | Open. No file or test here states a specification-defined limit; sizes are written only as token names | Open |

**Planner proposals (defaults this plan uses; controller to confirm or overrule before the named task):**

| Id | Proposal | Task |
|---|---|---|
| P3-1 | §08 overlay reading: the layer behind an overlay shows at `opacity-dim`, so the scrim is `field` at `1 − opacity-dim` alpha, computed from tokens | 4 |
| P3-2 | Chamfers on Phase 3 surfaces: only the Projects tech-stack dialog takes a `cut-md` chamfer, at its top-left corner, within the stricter README per-container limit. No `cut-sm` on controls: D8 gives prominence by position, and `clip-path` would cut the focus ring §13 draws outside the boundary | 10 |
| P3-3 | Home exploration choice (`ExplorationChoiceSection.tsx`): the red/blue capsule graphic goes (an out-of-palette hue pair and a glossy pill); each link shows its existing accessible name as its visible Instrument label. Words unchanged | 9 |
| P3-4 | Phase 3 applies five site-wide rules on Phase 5 surfaces too (eyebrows on Layout routes, the two P2-1 hover controls there on theme grounds, the `.interactive-card` link cards, the overlay scrim, the bridge aliases, the Terminal/Simulations/Traffic variable systems), besides the two ledgered accent buttons the master plan assigns it. Everything else on those surfaces is Phase 5 | 2, 4, 6, 13, 15, 20, 21 |
| P3-5 | Settings "Reset" (`.settings-action--danger`) loses the `fault` hue (no error exists). §13 arm-then-commit needs new words (`∆ ARMED` + consequence); the existing confirmation stays; hand-off to the owner | 12 |
| P3-6 | Category hues on the Work timeline nodes and Journey timeline icons are removed; kind stays carried by the existing icon and text (§05: secondary hues have fixed meanings) | 19 |
| P3-7 | **Ruled (controller):** where Phase 3 voices text it also sets its size through the generated `.df-*` type classes (Task 14). Spacing tokens are not converted site-wide; Phase 6 measures and reports the residual for the owner | 14 |
| P3-8 | `.projects-cta`, `.projects-cta:hover`, the responsive `.projects-cta` rule, `.projects-cta-primary` and both `.projects-hero-actions` rules are already dead (no TSX renders them; `rg -n "projects-cta\|projects-hero-actions" web/src -g '*.tsx'` prints nothing). Excluded by name, not deleted. Phase 2's P2-1 list therefore has six live controls, not seven | 10 |
| P3-9 | Traffic: the speed-ramp legend swatches mirror the canvas palette in `TrafficSimulator/renderer.ts`; they are a documented native hold. The throughput chart line is the subject series → `signal` | 20 |
| P3-10 | Disabled boundary uses CSS `border-style: dashed` in `edge`: `dash-provisional` is an SVG dash array a CSS border cannot take. Recorded for Phase 6 | 3 |

### Phase 3 / Phase 5 boundary

Task 1's test enforces it: every reachable governed CSS file sits in exactly one of `PHASE3` and `PHASE5`.

| Owner | Surfaces (CSS files under `web/src`) |
|---|---|
| **Phase 3** | Global and shared: `index.css`, `styles/components.css`, `styles/darkfield/grammar.css` (new), `components/StaticBackground/StaticBackground.css`, `components/common/ViewportPortal.css`. Layout and navigation: `components/Layout/{Layout,GlobalSectionNavigation,GlobalScrollProgress}.css`, `components/Navigation/SiteNavigation.css`, `components/Dock/Dock.css`, `components/SettingsPanel/SettingsPanel.css`. Home: `pages/Home/Home.css`, `pages/Home/sections/{HeroSection,CapabilitiesSection,FeaturedProjectsSection,ContactStripSection,ExplorationChoiceSection}.css`. Projects: `pages/Projects/Projects.css`, `components/ProjectRoster/ProjectRoster.css`, `components/TerminalDropdown/TerminalDropdown.css`. Experience/Journey: `pages/Work/Work.css`, `components/WorkDetails/WorkDetails.css`, `pages/Journey/Journey.css`, `components/TimelineItem/TimelineItem.css`. Writing and case studies: `pages/Writing/Writing.css`, `components/ArticlePage/ArticlePage.css`, `components/CaseStudyPage/CaseStudyPage.css` |
| **Phase 5** | `components/ProjectMedia/ProjectMedia.css` (MediaInspector, media bar), `pages/ProceduralAnimations/ProceduralAnimations.css`, `pages/ProceduralAnimationPiece/ProceduralAnimationPiece.css`, `pages/Simulations/Simulations.css`, `components/SimulationCard/SimulationCard.css`, `pages/OrbitalSimulator/OrbitalSimulator.css`, `pages/TrafficSimulator/TrafficSimulator.css`, `components/Terminal/{Terminal,TerminalView,TerminalWindow,TopUI,VimUI,ManPageUI,TerminalErrorBoundary}.css`, `components/SnakeGame/SnakeGame.css`, `pages/SnakeGame/SnakeGame.css`, `components/SpiderSolitaire/SpiderSolitaire.css`, `pages/SpiderSolitaire/SpiderSolitaire.css`, `components/RhythmLab/RhythmLab.css`, `pages/RhythmLab/RhythmLab.css`, `pages/Annals/Annals.css`, `pages/NotFound/NotFound.css`, `components/common/{ErrorBoundary,PageLoader,Toast,ToastContainer,Modal}.css` |
| Phase 3 on Phase 5 files (P3-4) | Eyebrows on Layout routes (Task 6); `.home-link` and `.error-button` (Task 3, ledgered); `.spider-button`, `.terminal-sidecar` (Task 15); `.procedural-animations-card` (Task 13, a `.interactive-card` link); `--app-overlay` readers (Task 4); bridge alias reads (Task 2); `Simulations.css` and `TrafficSimulator.css` variable blocks (Task 20); `Terminal.css` variable blocks and `TerminalView.css` `.grep-highlight` ground (Task 21) |
| Not governed here | `NATIVE_FILES`, `NATIVE` selectors and `NATIVE_KEYFRAMES` of `darkfield-restraint.test.mjs`; creative-owned paths; `DEAD` files; `styles/darkfield/tokens.css` |

### Phase 2 hand-offs received

| Hand-off (Phase 2 exit) | Disposition |
|---|---|
| Hover rules left empty | Six live controls. Phase 3: `.project-roster__toggle` (Task 10), `.exploration-pill` (Task 9), `.spider-button`, `.terminal-sidecar` (Task 15). Phase 5 (C2 ruling: always-dark grounds): `.rhythm-lab-primary-action`, `.play-again-button`. `.projects-cta` is dead (P3-8) |
| Timeline flip | `.timeline-flip-toggle` is operable (it turns the card) → control (Task 13); the card itself is static |
| Segmented and roster-toggle signatures | Selected and Latched via ARIA (Tasks 3, 10, 12) |
| Gradients on buttons; modal and toast panels | Buttons on Phase 3 surfaces: Tasks 9–13, 19. Modal and toast panels: Phase 5 |
| Overlay dim value (§08) | Task 4 (P3-1) |
| Aperture reveals for five menus | Not adopted: they stay class 1 opacity creates (P2-5). §12 is outside Phase 3's authority; recorded for Phase 6 review |

### What Phase 3 does not change

- Creative-owned paths, `NATIVE`/`NATIVE_FILES`/`NATIVE_KEYFRAMES`, `data-df-region` markers. The `.simulation-preview > *` hold in `SimulationCard.css` and the Traffic speed ramp stay.
- The header brand (`BRAND_HOLD`, Task 1: `.site-header__brand`, `.site-header__brand-mark`, `[data-theme="light"] .site-header__brand-mark`, `.site-header__brand-name` in `SiteNavigation.css`, base and media forms). Exempt from every Phase 3 static test and from Task 11's header restyle; only Task 2's value-identical alias rewrite touches it. Phase 4 replaces KS with the R1 symbol and a Narrator-voice wordmark (D5).
- Copy. D7 changes how statuses look, not their words. `text-transform: uppercase` on Instrument labels is presentation. The `●/○` prefixes in `TerminalDropdown.tsx` and `Loading...` texts stay.
- `--accent-color` (bridge hold): after Task 3 its readers are `ErrorBoundary.css` (`.error-content h1`, `.app-error .error-content`, `.error-info h4`), `NotFound.css` `.not-found h1`, `SnakeGame.css` (governed HUD and native `.food`, both with a fallback) and `SimulationCard.css` `.food-preview` (native). Phase 5 retires it with those surfaces and gives `.food-preview` a local hold.
- Already-dead code (P3-8; Phase 2 `DEAD`). `index.css` `--border-radius-*`, `--spacing-*` stay: their remaining readers are Phase 5 or dead files.

---

## Inventory at `6f3042e`

From `web/src` unless noted; `P3` is the Phase 3 file list above minus `grammar.css` (`StaticBackground.css` and `ViewportPortal.css` included). Counts are at `6f3042e`; Step 0 compares them after subtracting what Phase 2's own inventory says it removes.

| Evidence | Command | Result |
|---|---|---|
| `index.html` boot shell | `grep -n 'var(--' index.html` (from `web/`) | six retired aliases read with literal fallbacks (`--app-text`, `--app-bg`, `--brand-primary` ×2, `--app-text-muted`, `--app-border` ×4, `--app-surface` ×2); the `--brand-primary` fallback `#4caf50` is not a token value |
| Bridge alias reads | `rg -o "var\(--(<31 alias names>)[,)]" . -g '!styles/darkfield/bridge.css' \| wc -l` | 674 reads in 54 files (643 outside `DEAD`). Phase 2 removes the `shadow`/`bg-*` readers |
| Readers per alias | `for v in <names>; do rg -o "var\(--$v[,)]" . -g '!styles/darkfield/bridge.css' \| wc -l; done` | 576 reads of the 29 aliases Task 2 retires, in 44 CSS files outside `DEAD` (no live TSX reads one); e.g. `primary-color` 87, `brand-primary` 87, `font-family-mono` 64, `text-color` 57, `border-color` 42, `app-border` 39, `app-text-secondary` 39; six of the 29 have no reader outside `DEAD` |
| `--app-overlay` readers after Phase 2 | `rg -n "var\(--app-overlay" .` | `Modal.css`, `ProjectMedia.css`, `PageLoader.css` (Phase 2 re-grounds header, dock and settings panel) |
| Status hues | `rg -n "status-badge\.\|--roster-status" -g '*.css'` | `components.css` 3 fills; `ProjectRoster.css` 5 variables + dot glow |
| Eyebrows | `rg -n "eyebrow\|kicker" -g '*.tsx'` | Phase 3: `projects-eyebrow`, `case-study-eyebrow` (×2 TSX), `writing-eyebrow`, `writing-card-eyebrow`, `work-contact-eyebrow`, `article-eyebrow`. Phase 5 files: `procedural-animations-eyebrow`, `orbital-eyebrow`, `traffic-eyebrow`, `rhythm-lab-eyebrow`, `rhythm-lab-modal-kicker` (×3 TSX) |
| Mono on Narrator containers | `rg -n 'font-family: var\(--(font-family-mono\|terminal-font)' $P3` | 41 declarations; containers `.home-container`, `.projects-container`, `.case-study-container`, `.writing-container`, `.project-roster`, `.work-details-container`, `.dock-container`, `.terminal-dropdown` set whole pages in mono |
| Radii in P3 | `rg -c 'border-radius\s*:' $P3` | 92 in 19 files; pills (`999px`) and circles (`50%`) on controls, tags, dots, switches, sliders |
| Borders in P3 | `rg -c '^\s*border(-(top\|right\|bottom\|left))?(-color)?\s*:' $P3` | 138 |
| Literal colours in P3 (not shadows) | `rg -n '#[0-9a-fA-F]{3,8}\b\|rgba?\(' $P3 \| grep -v -E 'box-shadow\|text-shadow\|backdrop' \| wc -l` | 126, of which 11 in `StaticBackground.css` (Phase 2 Task 1 rewrites it to tokens) (TerminalDropdown 29, Projects 24, ExplorationChoice 12, components.css 9, SettingsPanel 8, ProjectRoster 7, Work 6, …); plus `white`/`black` keywords in `components.css`, `Home.css` |
| Gradients in P3 | `rg -n 'gradient\(' $P3` | 39, of which 24 in `StaticBackground.css` (Phase 2 rewrites it); the other 15: title underlines (`Home.css`, `Work.css`, `Projects.css`), Work timeline rails, scroll progress, exploration capsule, sheens (Phase 2 deletes sheens) |
| Transitions in P3 | `rg -c '^\s*transition\s*:' $P3` | 47, literal seconds and keywords; `index.css` `--transition-*`, `--interaction-transition` |
| Local colour systems | `rg -n '^\s*--[a-z0-9-]+\s*:' -g '*.css'` | `Terminal.css` (10 vars × dark/light), `Projects.css` and `Simulations.css` (scoped `--terminal-primary`; global `:root --terminal-font`; global `[data-theme="light"]` `--terminal-text-light/-muted/-error/-background/-header-bg`), `ProjectRoster.css` (`--roster-*`), `TrafficSimulator.css` (`--traffic-*`), `ExplorationChoiceSection.css` (`--pill-*`), `SettingsPanel.css` (`--settings-danger`, `--settings-divider`, `--range-*`), `Dock.css` (`--dock-*`) |
| Global leak | `rg -n 'var\(--terminal-(text-light\|text-muted\|header-bg\|background)' -g '*.css'` | Projects' and Simulations' global light blocks reach `Journey.css`, `TerminalDropdown.css`, `ProjectRoster.css`, `SimulationCard.css` and every `Terminal/*.css` reader after client-side navigation (ledger note "Residual page variables") |
| Ground tokens as text | `rg -nP '(?<![-\w])color:\s*var\(--(app-bg\|background-color\|card-background\|…\|field)\b' -g '*.css'` | `Work.css .work-contact-link.primary`, `Home.css .btn-outline:hover`, `ProjectMedia.css [data-theme="light"] .project-media__bar .project-media__control` (r8 exception); two `WorkDetails.css` hovers that Phase 2 deletes |
| Dead CSS | see P3-8 | `.projects-cta*`, `.projects-hero-actions` |

**Ledger at `6f3042e`** (136 entries): Phase 3 is expected to retire 48: `/darkfield-404-probe` `.home-link` 8 (Task 3), `status-badge` "Completed" 32 (Task 5), Light `/simulations/spider` `.spider-button` 8 (Task 15). The other 88 (Annals 86, Snake "Score:" 2) are Phase 5's.

---

## Shared procedures

Every Bash call starts with the session environment (`DF_TMP`, `DF_PW`, `PLAYWRIGHT_BROWSERS_PATH`, `W`). Check exit codes with `; echo rc=$?`.

**Static gate (every task)** — Phase 2's, unchanged: `node --test scripts/darkfield-*.test.mjs`, `npm run typecheck`, `npm run lint`, `npm test` (log to `$DF_TMP/p3-smoke.log`), and `git status --porcelain -- src/data/generated/articles.ts` prints nothing.

**Foundation browser test (every task):** rebuild with `bash "$DF_TMP/df-serve.sh" head "$W/web" 4173`, then `DARKFIELD_THEMES=dark,light node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p3-tN-foundation.log" 2>&1; echo rc=$?` and read the tail.

**Mono work list (every task; D4(b) interim):** `DARKFIELD_MODE=record DARKFIELD_THEMES=mono node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p3-tN-mono.json"`, then compare its `entries` ids and values with `.superpowers/sdd/2026-10-11-darkfield-migration/mono-worklist.json` (88 entries at Phase 3 start). A new id, or a value worse than the list's, is a stop. Ids the task owns (below) must be gone; report the new count. The controller updates the work list; the task never edits it. Phase 3 owns 27 ids: the 16 Mono `status-badge` "Completed" ids (Task 5), the 3 `/darkfield-404-probe` "Return Home" ids (Task 3), and the 8 "Case Studies#2" breadcrumb hover/active ids on the four case studies (Task 13). Expected count after Task 3: 85; after Task 5: 69; after Task 13: 61; every other task leaves it unchanged.

**Named browser tests:** `node scripts/<name>-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`. `orbital` fails only at its line 196 (ledger note). Each task names its set; `boot-shell` runs in every task that edits TSX.

**Ledger rule:** a STALE entry the task fixed is removed in the same commit and listed in the commit body. A new failure, a KNOWN entry worse than its baseline, or a changed `regions`, `unmeasured`, `creative` or `inactive` record is a stop. Note lines in `notes` change only where a task authorizes it by quoting the note's first words.

**Contrast rule:** every new text/ground pair is a §05 *Contrast, verified* pair in the three themes (check the row's ground list: `fg-faint` and `signal-dim` are not verified on `surface-3`), or it is measured by the foundation test and passes WCAG 4.5:1. Control boundaries and lamps use `edge`, `fg-muted` or `signal`, which §05 verifies for WCAG 1.4.11 non-text contrast on every ground. Light-control brackets at rest use `fg-faint`, verified only on `field`, `field-deep`, `surface-1` and `surface-2`; a `--light` control never sits on `surface-3`.
- **Visual check:** Phase 2's `$DF_TMP/p2-shot.mjs` (head 4173 vs base 4174; base has no Mono), output to `$DF_TMP/p3-tN-shots`, with the hover argument where a task names one; Mono shots stay (the theme is reachable by `localStorage`). Agent visual inspection, not owner sign-off.

**Staging:** `git add -- <exact paths>`; deleted paths with `git rm -- <path>`; `git diff --cached --name-only | sort` equals the task's list. Commit messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Keep class names.** Add `df-*` classes beside existing ones; never rename a class the browser test names (`PAIRS`, `STATES`, invariants). Coverage is never removed.

---

## Step 0: Preflight (no commit)

- [ ] `git log --oneline -14` shows Phase 2 Tasks 1, 3–10 on `feat/darkfield-foundation`; `git status --porcelain` is empty. Record HEAD as the Phase 3 base.
- [ ] Confirm Phase 2 outputs: `web/scripts/darkfield-restraint.test.mjs` defines `reachable`, `declarations`, `NATIVE`, `NATIVE_FILES`, `DEAD`; `web/src/utils/motionTokens.ts` exports `parseDuration`; `bridge.css` fences only `--accent-color`; `rg -n 'var\(--(app-shadow|shadow-color|bg-)' web/src` prints nothing.
- [ ] Re-run the inventory commands; a count that moved for a reason other than Phase 2 is a stop.
- [ ] Record P3-1…P3-10 in the progress ledger as awaiting controller confirmation; P3-7 needs a ruling before Phase 3 exits, not before Task 1.
- [ ] Static gate and foundation browser test on the base → `$DF_TMP/p3-base-foundation.log`; Mono record run → `$DF_TMP/p3-base-mono.json`, whose ids equal the work list's (88).

---

## Task 1: Shared CSS scope and phase ownership (test-only refactor)

**Files:** create `web/scripts/darkfield-css-scope.mjs`, `web/scripts/darkfield-grammar.test.mjs`; modify `web/scripts/darkfield-restraint.test.mjs`.

**Steps:**
- [ ] **1.** Move `web`, `src`, `read`, `isFile`, `CREATIVE`, `reachable`, `governed`, `declarations`, `NATIVE_FILES`, `NATIVE`, `DEAD`, `innermost`, `governedDecls` and `where` from `darkfield-restraint.test.mjs` into `darkfield-css-scope.mjs` unchanged, exported. The restraint test imports them; its `test(...)` bodies do not change (same assertions, same count: `node --test scripts/darkfield-restraint.test.mjs` reports the same test names before and after).
- [ ] **2.** Create the grammar test:

```js
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
  "pages/Projects/Projects.css": [".projects-cta", ".projects-cta:hover", ".projects-cta-primary", ".projects-hero-actions"],
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
```

  Task 3 removes the `grammar.css` exception once the file exists. Later tasks append one `test(...)` each.

- **Verify:** `node --test scripts/darkfield-*.test.mjs`; typecheck and lint. No build change, so no browser test. **Ledger effect:** none. **Commit:** `refactor(web): share the governed-CSS scope and assign each stylesheet to Phase 3 or Phase 5`

---

## Task 2: Retire the bridge's colour and font aliases into tokens (value-identical)

**Spec:** §17 (one token source); README *Using the system*.

**Map** (the bridge's own definitions, resolved to the token):

| Alias | Token |
|---|---|
| `font-family-primary` / `font-family-mono` | `font-sans` / `font-mono` |
| `app-bg`, `background-color` | `field` |
| `app-bg-secondary`, `app-surface`, `background-color-secondary`, `card-background`, `panel-bg-color` | `surface-1` |
| `app-surface-elevated`, `background-color-tertiary` | `surface-2` |
| `app-text`, `text-color` | `fg` |
| `app-text-secondary`, `app-text-muted`, `text-color-secondary`, `text-secondary`, `text-color-muted`, `text-muted-color` | `fg-muted` |
| `app-border`, `border-color` | `rule` |
| `brand-primary`, `brand-primary-medium`, `primary-color`, `primary-color-medium` | `signal-dim` |
| `brand-primary-soft`, `brand-primary-dark`, `primary-color-light`, `primary-color-dark` | `signal-deep` |

Not in this task: `--app-overlay` (Task 4, not value-identical) and `--accent-color` (held).

**Files:** `web/src/styles/darkfield/bridge.css`, `web/scripts/darkfield-bridge.test.mjs`, `web/scripts/darkfield-grammar.test.mjs`, `web/index.html` (the pre-CSS boot shell, Step 3a), and every reachable non-`DEAD` `.css`/`.tsx` file that reads an alias (the Step 3 script lists them; at `6f3042e` 44 CSS files). Mixed files: only alias reads change; no native selector reads an alias except `Annals.css .annals-sheet` (`--shadow-color`, removed by Phase 2).

**Steps:**
- [ ] **1. Snapshot before.** Scratch script `$DF_TMP/p3-computed.mjs <pw> <out.json>`: for each theme in dark, light, mono and each route in `ROUTES` of the foundation test plus `/writing/what-should-still-be-hard`, load with reduced motion, wait 800 ms, and record for every element (by DOM path) the computed `color`, `background-color`, `background-image`, `border-*-color`, `outline-color`, `fill`, `stroke`, `font-family`, `text-decoration-color`, `caret-color`, `column-rule-color`. Run it on the pre-task head preview.
- [ ] **2. Tests first.** In `darkfield-bridge.test.mjs`:
  - `LEGACY` becomes `RETIRED` (the 29 names above). The test "legacy variables are defined only by the bridge" becomes **"retired aliases are defined nowhere and read nowhere"**: no reachable non-`DEAD` CSS/TSX file and not `index.html` contains `var(--<name>` or `--<name>:`, and `bridge.css` does not define it. One named exception, both halves: the definition `--text-color: #ffffff` in `pages/RhythmLab/RhythmLab.css .rhythm-lab-page` and its reader `components/RhythmLab/RhythmLab.css .rhythm-lab { color: var(--text-color, …) }` are Rhythm Lab's page-local variable, not the bridge alias; Phase 5 retires both. `HELD` keeps `accent-color`; `app-overlay` stays mapped until Task 4.
  - "no text colour reads an alias that resolves to a ground" becomes **"no text colour reads a ground token"**: in reachable governed CSS no `color:` (not `background-color`) reads `--field`, `--field-deep`, `--surface-1..3`, `--rule`, `--signal-deep`, `--signal-trace` or a `-deep` hue, except an `ALLOW` list of file + innermost selector: `pages/Work/Work.css .work-contact-link.primary` (Task 13 removes), `pages/Home/Home.css .btn-outline:hover` (Task 9 removes), `components/ProjectMedia/ProjectMedia.css [data-theme="light"] .project-media__bar .project-media__control` (r8 Light exception; Phase 5). Stronger than before: the old test covered four aliases only.
  - The font test's two `assert.match(bridge, /--font-family-…/)` become `assert.doesNotMatch`; `FONT_HOLDS` is unchanged.
  - Confirm the new assertions fail on the unmodified tree.
- [ ] **3. Rewrite reads.** A scratch Node script (in `$DF_TMP`) walks the reachable non-`DEAD` files and replaces `var(--ALIAS)` and `var(--ALIAS, <fallback>)` with `var(--TOKEN)`. It parses the fallback with a parenthesis counter (fallbacks contain `rgba(...)`); tokens are always defined, so fallbacks are dropped. It skips the Rhythm Lab exception. Local variables defined from an alias (`--dock-primary: var(--brand-primary)`, `--roster-rule: var(--border-color)`) become token reads too.
- [ ] **3a. Boot shell.** `index.html`'s inline shell styles run before any stylesheet, so each read keeps a literal fallback: `var(--app-text, …)` → `var(--fg, <dark fg>)`, `--app-bg` → `--field`, `--brand-primary` → `--signal-dim`, `--app-text-muted` → `--fg-muted`, `--app-border` → `--rule`, `--app-surface` → `--surface-1`. Each fallback is the token's Dark value copied from `tokens.css` (the `#4caf50` fallback becomes the `signal-dim` Dark value). Add to `darkfield-bridge.test.mjs` **"boot-shell fallbacks equal the Dark token values"**: for every `var(--NAME, #hex)` in `index.html`, `NAME` is a token and `#hex` equals (case-insensitive) its value in the `:root, [data-theme="dark"]` block of `tokens.css`; a re-export that changes a Dark value then fails until `index.html` follows. The scratch rewrite of Step 3 does not touch `index.html` (it would drop the fallbacks).
- [ ] **4. Bridge.** Delete the 29 mapped aliases from `:root`; keep `--app-overlay` and the fenced `--accent-color`. Rewrite the header comment: the bridge now holds one derived ground (`--app-overlay`, Task 4) and one held legacy value.
- [ ] **5. Snapshot after** on the rebuilt head preview; `diff` the two JSON files. Any difference is a stop (no local token override exists: `rg -n "^\s*--(field|surface-[123]|fg|signal|…)\s*:" web/src -g '!styles/darkfield/tokens.css'` printed nothing at `6f3042e`).
- [ ] **6.** Grammar test: append `test("T2 bridge: only --app-overlay and the --accent-color hold remain", …)` that parses `bridge.css` custom-property definitions and expects exactly `["accent-color", "app-overlay"]`.

- **Verify:** static gate; foundation browser test; `boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata`, `procedural-animations`, `orbital`.
- **Visual:** none needed; Step 5's diff is the evidence (reviewer re-runs it). **Ledger effect:** none.
- **Commit:** `refactor(web): read Darkfield tokens directly and retire the bridge's colour and font aliases`

---

## Task 3: The §13 control model, and the ledgered accent buttons as its first controls

- **Spec:** §13 *Channels*, *The state model*, *Hover*, *Activation*, *Selection versus transient states*, *Disabled, unavailable, stale*, *Feedback timing*, *Avoid*; §05 *Contrast, verified*; §09 L2; §17 *Composite recipes* (contact, latched lamp, disabled, selected row).
- **Files:** create `web/src/styles/darkfield/grammar.css`, `web/src/utils/pressAcknowledge.ts`; modify `web/src/index.tsx` (`index.css`'s global `a, button, input, textarea, select { transition }` rule stays: `.df-control` outranks it, and Task 22 tokenises it), `web/src/pages/NotFound/NotFound.tsx`, `web/src/pages/NotFound/NotFound.css` (`.home-link`, `.home-link:hover` only), `web/src/components/common/ErrorBoundary.tsx`, `web/src/components/common/AppErrorBoundary.tsx`, `web/src/components/common/ErrorBoundary.css` (`.error-button`, `.error-button.primary`, `.error-button.primary:hover`, `.error-button.secondary`, `.error-button.secondary:hover`, the responsive `.error-button` rule only), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`, `web/scripts/darkfield-known-deficiencies.json`.

**Steps:**
- [ ] **1. Tests first.** Grammar test: drop the `grammar.css` exception from the ownership test, and append:

```js
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
```

- [ ] **2. grammar.css.** Exactly this content (comments in our words; no specification limit):

```css
/* web/src/styles/darkfield/grammar.css
   Shared Darkfield grammar for the site interface (§13 control model, §05 context labels, §06 prose
   measure, §09 chamfer). Values come only from tokens.css; type styles are the generated .df-* classes. */

/* Idle (§13). --df-ground is the ground the control shows at rest; a container on a surface sets
   --df-ground-up to the surface one step above its own (§13 Hover). */
.df-control {
  position: relative;
  box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  border: var(--stroke-hair) solid var(--edge);
  border-radius: var(--radius-0);
  background-color: var(--df-ground, transparent);
  color: var(--fg-muted);
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard),
    color var(--dur-fast) var(--ease-standard);
}
.df-control--card { color: var(--fg); }
/* Light control: open corner brackets instead of a closed boundary. */
.df-control--light {
  --df-bracket: linear-gradient(var(--df-bracket-ink, var(--fg-faint)), var(--df-bracket-ink, var(--fg-faint)));
  border-color: transparent;
  background-image: var(--df-bracket), var(--df-bracket), var(--df-bracket), var(--df-bracket),
    var(--df-bracket), var(--df-bracket), var(--df-bracket), var(--df-bracket);
  background-origin: border-box;
  background-repeat: no-repeat;
  background-position: left top, left top, right top, right top, left bottom, left bottom, right bottom, right bottom;
  background-size: var(--grid-unit) var(--stroke-hair), var(--stroke-hair) var(--grid-unit), var(--grid-unit) var(--stroke-hair),
    var(--stroke-hair) var(--grid-unit), var(--grid-unit) var(--stroke-hair), var(--stroke-hair) var(--grid-unit),
    var(--grid-unit) var(--stroke-hair), var(--stroke-hair) var(--grid-unit);
}

/* Hover marker: reserved at rest in the leading padding, so nothing moves or resizes on hover. */
.df-control::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--space-1);
  width: var(--cell-w);
  display: flex;
  align-items: center;
  font-family: var(--font-mono);
  pointer-events: none;
}

/* Hover (§13, operable): the ground rises a surface step; the boundary turns fg-muted and the label fg; the › marker shows. */
.df-control:hover:where(:not(:disabled, [aria-disabled="true"], .df-control--unavailable)) {
  background-color: var(--df-ground-up, var(--surface-1));
  border-color: var(--fg-muted);
  --df-bracket-ink: var(--fg-muted);
  color: var(--fg);
}
.df-control:hover:where(:not(:disabled, [aria-disabled="true"], .df-control--unavailable))::before { content: "›"; content: "›" / ""; }

/* Selected (§13): the current pick in a set. The ground is the signal-deep band; boundary and label turn signal; a square node marks the upper-right corner. */
.df-control:is([aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch)) {
  background-color: var(--signal-deep);
  border-color: var(--signal);
  --df-bracket-ink: var(--signal);
  color: var(--signal);
}
.df-control:is([aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch))::after {
  content: "";
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  width: var(--grid-half);
  height: var(--grid-half);
  background-color: var(--signal);
}

/* Light controls keep open brackets, never a closed boundary, in every state but Pressed
   (three classes: outranks Hover, ties Selected and comes after it). */
.df-control--light.df-control--light.df-control--light { border-color: transparent; }

/* Latched (§13): a persistent mode. A lamp cell ahead of the label, filled while the mode is on. */
.df-control--latch { display: inline-flex; align-items: center; gap: var(--space-2); }
.df-control--latch::after {
  content: "";
  order: -1;
  flex: none;
  width: var(--cell-w);
  height: var(--cell-h);
  box-sizing: border-box;
  border: var(--stroke-hair) solid var(--edge);
}
.df-control--latch:is([aria-pressed="true"], [aria-checked="true"], [aria-expanded="true"], details[open] > *) { color: var(--fg); }
.df-control--latch:is([aria-pressed="true"], [aria-checked="true"], [aria-expanded="true"], details[open] > *)::after {
  background-color: var(--signal);
  border-color: var(--signal);
}

/* Disabled (§13; P3-10) and Unavailable: both ignore hover and press. */
.df-control:is(:disabled, [aria-disabled="true"]) { border-style: dashed; color: var(--fg-faint); cursor: not-allowed; }
.df-control--unavailable { border-color: transparent; background-image: none; color: var(--fg-faint); cursor: default; }

/* Pressed (§13): the inverse, shown on contact and held for dur-instant (pressAcknowledge.ts).
   The doubled class outranks Selected. */
.df-control.df-control:is(:active, [data-df-pressed]):where(:not(:disabled, [aria-disabled="true"], .df-control--unavailable)) {
  background-color: var(--signal);
  border-color: var(--signal);
  --df-bracket-ink: var(--signal);
  color: var(--on-signal);
  transition: none;
}
.df-control--card.df-control--card:is(:active, [data-df-pressed]) * { color: inherit; }
```

  Task 4 adds `--df-scrim`, Task 5 `.df-context`, Task 8 `.df-prose`, Task 10 `.df-cut-md`. Import it in `index.tsx` directly after `bridge.css`.
- [ ] **3. pressAcknowledge.ts** (§13 *Activation*; reuses Phase 2's `parseDuration`):

```ts
// Pressed acknowledgement (§13 Activation): contact shows the inverse at once (CSS :active cannot see
// key-down on links) and keeps it until at least dur-instant has passed since contact. Values come from tokens.css.
import { parseDuration } from "./motionTokens";

const ATTR = "data-df-pressed";
const TARGET = ".df-control, .df-prose a";
const BUTTONISH = "button, summary, [role='button'], [role='option'], [role='switch'], [role='combobox']";

export const installPressAcknowledge = (doc: Document = document): (() => void) => {
  const since = new Map<Element, number>();
  const hold = () => parseDuration(getComputedStyle(doc.documentElement).getPropertyValue("--dur-instant") || "0ms") * 1000;
  const press = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      if (event.repeat || !(event.key === "Enter" || event.key === " ")) return;
    }
    const el = (event.target as Element | null)?.closest?.(TARGET);
    if (!el || el.matches(":disabled, [aria-disabled='true'], .df-control--unavailable")) return;
    if (event instanceof KeyboardEvent && event.key === " " && !el.matches(BUTTONISH)) return;
    el.setAttribute(ATTR, "");
    since.set(el, performance.now());
  };
  const release = () => {
    const minimum = hold();
    for (const [el, start] of since) {
      since.delete(el);
      const left = minimum - (performance.now() - start);
      if (left > 0) window.setTimeout(() => el.removeAttribute(ATTR), left);
      else el.removeAttribute(ATTR);
    }
  };
  const on: Array<[EventTarget, string, EventListener]> = [
    [doc, "pointerdown", press], [doc, "keydown", press], [doc, "pointerup", release],
    [doc, "pointercancel", release], [doc, "keyup", release], [window, "blur", release],
  ];
  for (const [t, type, fn] of on) t.addEventListener(type, fn, true);
  return () => { for (const [t, type, fn] of on) t.removeEventListener(type, fn, true); release(); };
};
```

  Call `installPressAcknowledge()` once in `index.tsx` before `root.render`.
- [ ] **4. First controls.** `NotFound.tsx`: `className="home-link df-control"`. `ErrorBoundary.tsx`, `AppErrorBoundary.tsx`: each `error-button` gets `df-control`. In the named rules delete `background`, `color`, `border*`, `border-radius`, `transition`, `transform`, `padding`, `font-*`, `text-decoration`, and both `:hover` rules; keep `display` and margins. The model supplies padding; the label class below supplies type. Add `df-label` to the three classNames (Instrument voice for control labels, §06). `--accent-hover` (never defined at `6f3042e`) is then unread; `--hover-color` (also never defined) stays read by `.error-details summary:hover`, which is Phase 5's.
- [ ] **5. Browser invariant** (inside `if (MODE === "check") {`, after Phase 2's invariants):

```js
  // Phase 3 (§13): every listed control is a df-control and renders Idle, Hover, Pressed and its hold.
  // Tasks 9–13 and 15 add entries; prepare(page) brings controls on screen (Settings open, dock mode). Token colours are read from the page.
  const P3_CONTROLS = [{ route: "/darkfield-404-probe", selectors: [".home-link"] }];
  const tokenRgb = (page, name) => page.evaluate((n) => { const p = document.createElement("i"); p.style.color = `var(${n})`;
    document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, name);
  const look = (el) => el.evaluate((e) => { const c = getComputedStyle(e); return { b: c.borderTopColor, bg: c.backgroundColor,
    fg: c.color, r: c.borderTopLeftRadius, marker: getComputedStyle(e, "::before").content, card: e.matches(".df-control--card"),
    sel: e.matches('[aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]:not(.df-control--latch)'),
    off: e.matches(':disabled, [aria-disabled="true"], .df-control--unavailable') }; });
  for (const theme of THEMES) {
    for (const { route, prepare, selectors } of P3_CONTROLS) {
      await withPage({ theme, route }, async (page) => {
        if (prepare) await prepare(page);
        const t = {}; for (const n of ["--edge", "--fg-muted", "--fg", "--signal", "--on-signal"]) t[n] = await tokenRgb(page, n);
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
            if (!rest.sel && !rest.card) invariant(rest.fg === t["--fg-muted"], `${theme} ${route}: ${selector} idle label ${rest.fg}`);
            await el.hover(); await frames(page);
            const hover = await look(el);
            invariant(hover.marker.startsWith('"›"'), `${theme} ${route}: ${selector} hover marker ${hover.marker}`);
            if (!rest.sel) invariant(hover.bg !== rest.bg, `${theme} ${route}: ${selector} hover has no ground step`);
            await page.mouse.down(); await frames(page);
            const down = await look(el);
            invariant(down.bg === t["--signal"] && down.fg === t["--on-signal"], `${theme} ${route}: ${selector} pressed ${down.bg} ${down.fg}`);
            await page.mouse.move(0, 0); await page.mouse.up(); // released off the control: no activation (§13)
            await page.waitForTimeout(instant * 2);
            // Hold: contact and release in one task, sampled before any timer can run (synthetic events never click).
            const hold = await el.evaluate((e) => { e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
              e.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
              return [e.hasAttribute("data-df-pressed"), getComputedStyle(e).backgroundColor]; });
            invariant(hold[0] && hold[1] === t["--signal"], `${theme} ${route}: ${selector} inverse not held after a quick release ${hold}`);
            await page.waitForTimeout(instant * 2);
            invariant(!(await el.evaluate((e) => e.hasAttribute("data-df-pressed"))), `${theme} ${route}: ${selector} inverse never released`);
            await el.evaluate((e) => e.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
            invariant(await el.evaluate((e) => e.hasAttribute("data-df-pressed")), `${theme} ${route}: ${selector} no key-down acknowledgement`);
            await el.evaluate((e) => e.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true })));
            await page.waitForTimeout(instant * 2);
          }
        }
      });
    }
  }
```

  Confirm it fails before Steps 2–4 (`.home-link is not a df-control`).
- [ ] **6. Ledger.** Remove the 8 `/darkfield-404-probe` entries the run reports STALE (`contrast` ×2, `pair` ×2, `interact` ×4, Dark and Light). In `notes`, delete the line beginning `.error-button.primary: white text on the --accent-color fill` (the pattern no longer exists; the pair stays UNCOVERED because the boundary does not render). In `bridge.css`, the accent comment names only the remaining readers.

- **Verify:** static gate; foundation browser test; `boot-shell`, `header-overlap`, `settings-panel`.
- **Visual:** `/darkfield-404-probe` with hover `.home-link`; dark, light, mono; both widths. Expect a square `edge`-bounded control, `›` on hover, no fill at rest.
- **Ledger effect:** 8 entries retired (listed above). **Mono:** `contrast|mono|/darkfield-404-probe|a|Return Home`, `pair|mono|/darkfield-404-probe|.home-link`, `interact|mono|/darkfield-404-probe|a|Return Home#1:focus` gone; count 85. **Commit:** `feat(web): add the Darkfield control state model and apply it to the not-found and error-boundary actions`

---

## Task 4: Overlay scrim from `opacity-dim` (P3-1)

- **Spec:** §08 *Layers and overlays*; §17 *Opacity*.
- **Files:** `web/src/styles/darkfield/grammar.css`, `web/src/styles/darkfield/bridge.css`, `web/src/components/common/Modal.css`, `web/src/components/ProjectMedia/ProjectMedia.css`, `web/src/components/common/PageLoader.css` (each: the one `var(--app-overlay)` read), `web/scripts/darkfield-bridge.test.mjs`, `web/scripts/darkfield-grammar.test.mjs`.

**Steps:**
- [ ] **1. Tests first.** Bridge test: add `app-overlay` to `RETIRED`. Grammar test T2 expects only `["accent-color"]` in the bridge, and a new assertion: `grammar.css` defines `--df-scrim` from `--field` and `--opacity-dim` only.
- [ ] **2.** Add to `grammar.css` (top): `:root { --df-scrim: color-mix(in srgb, var(--field) calc((1 - var(--opacity-dim)) * 100%), transparent); }` with the comment "§08: what lies behind an overlay shows at opacity-dim (P3-1)". Replace the three reads with `var(--df-scrim)`; delete `--app-overlay` from the bridge.
- [ ] **3.** Check in Chromium that the computed background of `.modal-overlay` is a colour with alpha `1 − opacity-dim` (read both from the page).

- **Verify:** static gate; foundation browser test; `case-study-media` (opens the media inspector), `boot-shell` (waits for the loader overlay).
- **Visual:** `/case-studies/aether` with the media inspector open, and the delayed loader capture from Phase 2 Task 3; dark, light, mono at 1440. Expect a lighter dim than before; text inside panels unchanged. If the loader's message, which sits on the scrim itself, measures below WCAG 4.5:1 against the rendered pixels, stop (Phase 5 owns the loader composition).
- **Ledger effect:** none. **Commit:** `feat(web): dim behind overlays with a scrim built from Darkfield tokens and retire --app-overlay`

---

## Task 5: Lifecycle statuses and tags as context labels (D7)

- **Spec:** §05 *Semantic prominence* (rank 6 Context), *State encoding*, *Rationing the secondary hues*; §06 *Interface label*; §03 (no pills).
- **Files:** `web/src/styles/darkfield/grammar.css`, `web/src/styles/components.css` (`.status-badge*`, `.tech-tag`, `.tech-tag:hover` if Phase 2 left it), `web/src/components/ProjectRoster/ProjectRoster.css` (`--roster-status-*`, `.project-roster__status*`), `web/src/components/ProjectRoster/ProjectRosterItem.tsx`, `web/src/pages/CaseStudies/CaseStudies.tsx`, `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`, `web/src/components/CaseStudyPage/CaseStudyPage.tsx`, `web/src/components/CaseStudyPage/CaseStudyPage.css` (`.case-study-artifact-meta span`), `web/src/components/WorkDetails/WorkDetails.tsx`, `web/src/components/WorkDetails/WorkDetails.css` (`.tech-tag`, `.highlight-tag`), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-known-deficiencies.json`.

**Steps:**
- [ ] **1. Test first.**

```js
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
```

- [ ] **2. grammar.css:** `.df-context { color: var(--fg-muted); }` and `.df-context--live::before { content: "•"; content: "•" / ""; font-family: var(--font-mono); margin-inline-end: var(--space-1); }` (the word carries the meaning; the glyph is hidden from assistive technology).
- [ ] **3. Markup.** Status elements get `df-label-sm df-context`, plus `df-context--live` when the status is `Live` (case-insensitive compare of the data value; words unchanged). `ProjectRosterItem.tsx`: delete the `project-roster__status-dot` span. Tags (`.tech-tag`, `.highlight-tag`, `.case-study-artifact-meta span`) get `df-label-sm df-context`.
- [ ] **4. CSS.** `.status-badge`: delete fills, `color`, radius, padding, type declarations; delete `.status-badge.live/.development/.completed`. `ProjectRoster.css`: delete `--roster-status-*`, `.project-roster__status-dot` and the five `--roster-status-color` rules (made dead by Step 3); `.project-roster__status` keeps layout only. Tags: delete fill, border, radius, type, colour; keep layout and gaps.

- **Verify:** static gate; foundation browser test; `case-study-media`.
- **Visual:** `/`, `/case-studies`, `/projects` (expand one roster item), `/experience`, `/case-studies/aether`; dark, light, mono. Expect uppercase narrow muted words; `•` only before Live.
- **Ledger effect:** the 32 `status-badge` "Completed" entries go STALE and are removed: `text` `/` ×2, `interact` `/` ×6, `text` `/case-studies` ×6, `interact` `/case-studies` ×18 (Dark and Light). **Mono:** the 16 `status-badge` "Completed" ids (`text` `/` ×1, `interact` `/` ×3, `text` `/case-studies` ×3, `interact` `/case-studies` ×9) gone; count 69. **Commit:** `feat(web): show project statuses and tags as uncoloured context labels`

---

## Task 6: Eyebrows speak in the Instrument voice (all Layout routes, P3-4)

- **Spec:** §06 *Interface label*, *Rules*.
- **Files:** TSX: `pages/Projects/Projects.tsx`, `pages/CaseStudies/CaseStudies.tsx`, `components/CaseStudyPage/CaseStudyPage.tsx`, `pages/Writing/Writing.tsx`, `pages/Work/Work.tsx`, `components/ArticlePage/ArticlePage.tsx`, `pages/ProceduralAnimations/ProceduralAnimations.tsx`, `pages/OrbitalSimulator/OrbitalSimulator.tsx`, `pages/TrafficSimulator/TrafficSimulator.tsx`. CSS (eyebrow rules only, including their media-query forms): `Projects.css`, `CaseStudyPage.css`, `Writing.css`, `Work.css`, `ArticlePage.css`, `ProceduralAnimations.css`, `OrbitalSimulator.css`, `TrafficSimulator.css`. **Not here (C2 ruling, Phase 5):** `rhythm-lab-eyebrow` and the three `rhythm-lab-modal-kicker`s sit on grounds that stay dark in every theme (`pages/RhythmLab/RhythmLab.css .rhythm-lab-page` and the Rhythm Lab panels); Phase 5 re-grounds them with tokens first. Plus `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-known-deficiencies.json` (one note, below). All under `web/src` except the scripts.

**Steps:**
- [ ] **1. Test first:** every `className` in reachable TSX containing `eyebrow` also contains `df-label`, except `rhythm-lab-eyebrow` (named Phase 5 exclusion); every CSS rule outside `RhythmLab.css` whose innermost selector contains `eyebrow` declares none of `font-family`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `line-height`, `text-shadow`, and its `color`, if any, is `var(--fg-muted)`.
- [ ] **2.** Add `df-label` to each eyebrow element in the Files list; strip the listed declarations; set `color: var(--fg-muted)`. Delete `[data-theme="light"] .writing-card:hover .writing-card-eyebrow` and its comment (the eyebrow is `fg-muted` in every state now; Task 13 gives the card a solid hover ground).

- **Verify:** static gate; foundation browser test; `procedural-animations`, `orbital`.
- **Visual:** `/projects`, `/case-studies`, `/case-studies/aether`, `/writing` (hover `.writing-card`), `/writing/what-should-still-be-hard`, `/experience`, `/procedural-animations`, `/simulations/traffic-simulator`; dark, light, mono.
- **Ledger effect:** none in entries. In `notes`, delete the line beginning `Dark /writing card eyebrow, classified for D10` only if the reviewer's hover screenshots of every `/writing` card at 768×1024 and 1440×900 show the eyebrow on a solid ground (after Task 13 it is; if Task 13 has not landed, keep the note and let Task 13 remove it). **Commit:** `feat(web): set eyebrows and kickers as Instrument labels`

---

## Task 7: Voices on Phase 3 surfaces

**Spec:** §06 (all). Rule: a sentence or heading is Narrator (inherit `--font-sans` from `body`); a name of a control, region or channel is Instrument (`df-label` / `df-label-sm`, `fg-muted` at rest); a computed or typed value, date or identifier is Machine (`--font-mono`, or `df-data`/`df-annotation`). Uppercase is Instrument only.

| Current mono declaration | Becomes |
|---|---|
| Containers `.home-container`, `.projects-container`, `.case-study-container`, `.writing-container`, `.project-roster`, `.work-details-container`, `.dock-container`, `.terminal-dropdown`, `.work-contact-cta` | delete (Narrator inherits) |
| `.projects-title`, `.work-title`, `.journey-title`, `.work-subtitle`, `.journey-subtitle`, `.work-company`, `.work-role`, `.work-location`, `.project-item` | delete (Narrator) |
| WorkDetails `.section-title`, `.highlights-title`; SettingsPanel `.settings-section-title`; `.site-header__explore-label`, `.site-header__panel-heading`, `.dock-tooltip`, `.dock-explore__link`, `.site-header[data-layout="wide"] .site-header__explore .site-header__link`; `.terminal-dropdown-trigger`, `.terminal-dropdown-option`; `.settings-segmented__button`, `.setting-switch`, `.settings-action` | Instrument: TSX adds `df-label`; CSS drops family/size/weight/tracking/case |
| `.work-dates`, `.setting-value`, `.settings-about .settings-build`, `.article-prose code`, `index.css` `pre`, `code, kbd, samp` | Machine: keep `var(--font-mono)`; `.work-dates` and `.settings-build` add `df-annotation` |
| `.site-header__brand-mark`, `.site-header__brand-name` | unchanged (`BRAND_HOLD`, Phase 4) |

**Files:** the CSS files holding those selectors (`Home.css`, `Projects.css`, `CaseStudyPage.css`, `Writing.css`, `ProjectRoster.css`, `WorkDetails.css`, `Dock.css`, `TerminalDropdown.css`, `Work.css`, `Journey.css`, `SettingsPanel.css`, `SiteNavigation.css`), their TSX (`WorkDetails.tsx`, `SettingsPanel.tsx`, `SettingsControls.tsx`, `HeaderNavigation.tsx`, `DockIcon.tsx`, `DockExploreStack.tsx`, `TerminalDropdown.tsx`), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`. Any other P3 rule with `text-transform: uppercase` on Narrator text loses it; an uppercase label gains `df-label*` instead. Headings that are uppercase by CSS become sentence case by deleting the transform (copy unchanged).

**Steps:**
- [ ] **1. Tests first.** Static: in `phase3Decls()`, `font-family` is only `var(--font-mono)` on the Machine selectors above (an explicit `MACHINE` list), `inherit`, or absent; `--terminal-font` is not read. Browser invariant:

```js
  // Phase 3 Task 7 (§06): Narrator text is Archivo; uppercase text is Archivo Narrow.
  const P3_ROUTES = ["/", "/projects", "/case-studies", "/case-studies/aether", "/writing", "/writing/what-should-still-be-hard", "/experience", "/journey"];
  // Not Phase 3's on these routes: creative regions, project media chrome (Phase 5), the header mark (Phase 4).
  const P3_SKIP = "[data-df-region], .project-media, .media-inspector, .site-header__brand";
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
```

  `P3_ROUTES` and `P3_SKIP` are reused by Tasks 8, 14, 16 and 17. The invariant's output at Step 1 is the authority for the remaining offenders; add any file it names to the commit and record it in the body. An offender in a Phase 5 file is reported, not fixed (stop if one appears on a P3 route). Sizes are Task 14's; this task removes only family, case and tracking that set the voice.
- [ ] **2.** Implement the table.

- **Verify:** static gate; foundation browser test; `settings-panel`, `header-overlap`, `case-study-media`.
- **Visual:** all `P3_ROUTES` plus Settings open; dark, light, mono; both widths. Expect prose and headings in Archivo, labels narrow uppercase, dates and code in Plex Mono. Check that no label now wraps or overflows at 375.
- **Ledger effect:** none expected (font changes can move text runs; a worse KNOWN entry is a stop). **Commit:** `feat(web): give Phase 3 surfaces the Narrator, Instrument and Machine voices`

---

## Task 8: Prose measure and inline links

- **Spec:** §06 *Hierarchy* (body measure); §13 *Hover* (operable); §17 `measure-body`.
- **Files:** `web/src/styles/darkfield/grammar.css`, `web/src/components/ArticlePage/ArticlePage.css` (every literal `ch` measure, including the grid track), `web/src/components/ArticlePage/ArticlePage.tsx`, `web/src/components/CaseStudyPage/CaseStudyPage.css` (the two `max-width: 760px` text rules and `.case-study-figure figcaption`), `web/src/components/CaseStudyPage/CaseStudyPage.tsx`, `web/src/components/ProjectRoster/ProjectRoster.css` (`62ch`, `72ch`), `web/src/pages/Home/sections/HeroSection.css` (text max-widths), `web/src/pages/Work/Work.css`, `web/src/pages/Journey/Journey.css` (subtitle max-widths), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Tests first.** Static: no `phase3Decls()` `max-width` (or grid track) holds a literal `ch` value; prose containers in `ArticlePage.tsx` and `CaseStudyPage.tsx` carry `df-prose`. Browser invariant on `P3_ROUTES`: every Narrator `main p` with own text, outside `P3_SKIP`, is no wider than a probe `<span style="position:absolute;visibility:hidden;width:var(--measure-body)">` appended to it (the probe resolves `ch` in the paragraph's font); report `route tag.class width/limit`.
- [ ] **2. grammar.css:**

```css
/* Narrator prose (§06): running text keeps to measure-body. Inline links are operable (§13 Hover). */
.df-prose { max-width: var(--measure-body); }
.df-prose a {
  position: relative;
  color: var(--fg);
  text-decoration-line: underline;
  text-decoration-color: var(--edge);
  text-decoration-thickness: var(--stroke-hair);
  text-underline-offset: var(--space-1);
  transition: background-color var(--dur-fast) var(--ease-standard), text-decoration-color var(--dur-fast) var(--ease-standard);
}
.df-prose a:hover { background-color: var(--df-ground-up, var(--surface-1)); text-decoration-color: var(--fg-muted); }
.df-prose a:hover::before { content: "›"; content: "›" / ""; position: absolute; inset-inline-end: 100%; font-family: var(--font-mono); }
.df-prose a:is(:active, [data-df-pressed]) { background-color: var(--signal); color: var(--on-signal); text-decoration-color: currentColor; transition: none; }
```

- [ ] **3.** Put `df-prose` on the element that holds running text (article body, case-study section bodies); replace literal measures with `var(--measure-body)`; other text blocks above the measure take `max-width: var(--measure-body)`. Wider elements (figures, tables, comparison grids) stay outside `.df-prose`.

- **Verify:** static gate; foundation browser test; `case-study-media`.
- **Visual:** `/writing/what-should-still-be-hard`, `/case-studies/aether`, `/`, `/projects` (expanded item); dark, light, mono; 1440, plus 1920×1080 once in Dark. Hover an inline article link.
- **Ledger effect:** none. **Commit:** `feat(web): hold running text to the Darkfield body measure and give inline links the hover signature`

---

## Tasks 9–13: The control model on Phase 3 surfaces (D8)

Shared rules for Tasks 9–13:
- Each listed control gets `df-control` (plus a modifier) and the `df-label` class when its visible text is a control label (not on cards). Its component rules lose `background*`, `color`, `border*`, `border-radius`, `box-shadow`, `transform`, `transition`, gradients, padding and type declarations; layout stays. Exception: `--card` controls keep their padding (inline-start padding at least `var(--space-3)`, so the marker fits) and their descendants' type; descendants lose explicit colours other than `var(--fg-muted)` so the pressed inverse reaches them. Its `:hover`, `:active`, `.active`, `[aria-*]` state rules are deleted: the model's ARIA states replace them. Where a class encodes state (`.active`, `.selected`, `.open`), the TSX already sets the matching ARIA attribute (checked at `6f3042e`, Inventory); add it where missing.
- A container on a surface sets `--df-ground-up` to the next surface for its controls (`surface-1` → `surface-2` → `surface-3`).
- A §13 Disabled control keeps focus: it uses `aria-disabled="true"` and a guarded handler, not the `disabled` attribute (`TerminalDropdown`'s `disabled` prop, Task 10; Settings controls disabled under reduced motion, Task 12). The Home `.btn`s disabled while a route chunk loads are Processing, not Disabled; they keep `disabled` and their words (hand-off to Phase 5 Task 5, *Route loader*, P5-6: Processing signature).
- Former filled primaries (`.btn-primary`, `.work-contact-link.primary`, `.project-roster__action--primary`) become plain idle controls placed first in their row (D8).
- Each task appends its routes and selectors to `P3_CONTROLS` and adds the coverage check: every rendered element matching the task's selectors has `df-control`.
- Static test per task (`T9`…`T13`): each listed class in the named TSX appears only in `className`s that include `df-control`; no `phase3Decls()` rule whose innermost selector names a listed class declares a colour, ground, border colour, radius or transition.

| Task | Controls (selector → modifier) | Files (under `web/src`) | Routes for `P3_CONTROLS` |
|---|---|---|---|
| **9 Home** | `.btn` (primary, secondary, outline) → plain; `.hero-text-link` → `--light`; `a.featured-project-link` → `--card`; `.contact-strip-link` → plain; `.exploration-pill` → plain (P3-3: delete the capsule span; render the link's existing `aria-label` text as its visible label, then drop the now-duplicate `aria-label`/`title`; delete `--pill-*`, capsule rules) | `pages/Home/Home.css`, `sections/{HeroSection,FeaturedProjectsSection,ContactStripSection,ExplorationChoiceSection}.{tsx,css}` | `/` |
| **10 Projects** | `.stat-card` (filters → Selected; the tech-stack card → `--latch`); `.terminal-dropdown-trigger` → plain; `.terminal-dropdown-option` → plain (Selected by `aria-selected`); `.project-roster__toggle` → `--latch`; `.project-roster__action` (+`--primary`) → plain; `.close-tech-stack` → plain; tech-stack dialog panel → `df-cut-md` (P3-2), on `surface-2`, bounded in `edge` (§08), `--df-ground-up: var(--surface-3)` | `pages/Projects/Projects.{tsx,css}`, `components/TerminalDropdown/TerminalDropdown.{tsx,css}`, `components/ProjectRoster/ProjectRoster{Item.tsx,.css}`, `styles/darkfield/grammar.css` | `/projects` |
| **11 Header and dock** | `BRAND_HOLD` selectors untouched (Phase 4); `.site-header__link` → `--light` (Selected by `aria-current`); `.site-header__disclosure-toggle`, `.dock-explore__toggle` → `--latch`; `.site-header__settings-button` → `--latch` (`aria-pressed`); `.dock-nav-link`, `.dock-explore__link` → plain (Selected by `aria-current`); `.dock-settings-button` → `--latch` (add `aria-pressed={isOpen}`); tooltips → `df-label` on `surface-2` with `edge` boundary; delete `.dock-active-indicator`, `.dock-nav-link.active::after`, `.dock-explore__toggle.active::after` dots and the `--dock-*` variables (made dead) | `components/Navigation/{HeaderNavigation.tsx,SiteNavigation.css}`, `components/Dock/{Dock.css,DockIcon.tsx,DockExploreStack.tsx,DockSettingsButton.tsx,Dock.tsx}`, and `web/scripts/header-overlap-browser-test.mjs` only if it reads a deleted class | `/`, `/projects` (header layout), and `/` in dock mode |
| **12 Settings and section rail** | `.settings-close`, `.settings-action` → plain (`--danger` loses `fault`, P3-5; delete `--settings-danger`); the build link in `BuildIdentifier.tsx` → `--light`; `.settings-segmented__button` → plain (Selected by `aria-pressed`); `.setting-switch` → `--latch` (delete the track and thumb spans in `SettingsControls.tsx` and their rules; keep the On/Off text); `.settings-disclosure__toggle` → `--latch`; `.setting-range` → §13 direct manipulation: square handle in `signal`, track an `edge` hairline rail, no progress fill (`--range-*` deleted); panel sets `--df-ground-up: var(--surface-3)`; scrollbar literals → `var(--rule)`/`var(--edge)`; `.nav-dot` → plain, square, `aria-current="location"` → Selected; delete the `.nav-dot::before` dot rules (the model's marker uses `::before`; the square control is the cell); `.dot-tooltip` → `df-label`, `surface-2`, `edge`; delete `.nav-dot` opacity and `.nav-dots::before` opacity (opacity never lowers a boundary's contrast; the rail becomes an L1 `rule`) | `components/SettingsPanel/{SettingsPanel.tsx,SettingsControls.tsx,BuildIdentifier.tsx,SettingsPanel.css}`, `components/Layout/{GlobalSectionNavigation.tsx,GlobalSectionNavigation.css}`, and `web/scripts/settings-panel-browser-test.mjs` only if it reads a deleted class | `{ route: "/", prepare: (page) => page.locator(".site-header__settings-button").click(), selectors: [".settings-close", ".settings-action", ".settings-segmented__button", ".setting-switch", ".settings-disclosure__toggle"] }`; `{ route: "/case-studies/aether", selectors: [".nav-dot"] }` |
| **13 Reading and record surfaces** | `a.interactive-card`, `.writing-card`, `.case-study-card`, and `.procedural-animations-card` (I5: the shared `.interactive-card` link card on a Phase 5 page) → `--card`; Journey flip (I4 ruling): delete `TimelineItem.tsx`'s `onPointerEnter`/`onPointerLeave` and the then-dead `handleMouseEnter`/`handleMouseLeave`, and the two `cursor: pointer` rules on `.timeline-flip-container`; the card no longer reacts to hover and turns only through `.timeline-flip-toggle` (a `button`: click, Enter, Space); `.timeline-flip-hint` rules are already dead (no TSX renders the class) and are excluded by name; words unchanged; `.case-study-link` → plain; `.case-study-link.disabled` → `--unavailable` (it is a `div`; not focusable, stays so); `.case-study-artifact-link` → plain; `.article-series-link` → plain; `.work-contact-link` (+`.primary`) → plain; `.timeline-flip-toggle` → `--latch` (its `aria-pressed` is a mode: the card shows its image); breadcrumb links (`.case-study-breadcrumbs a`, `.article-breadcrumbs a`) and the article table-of-contents links → `--light` (TOC `aria-current="location"` → Selected); the series link in `.article-series` sits in Narrator text → `df-prose` link; every `summary` in `ArticlePage.tsx` (4) and `CaseStudyBlocks.tsx` (1) → `--latch` (open state from `details[open]`); `.writing-card-link`, `.featured-project-link-text` stay text inside their card | `components/CaseStudyPage/{CaseStudyPage.tsx,CaseStudyBlocks.tsx,CaseStudyPage.css}`, `pages/CaseStudies/CaseStudies.tsx`, `pages/Writing/Writing.{tsx,css}`, `components/ArticlePage/ArticlePage.{tsx,css}`, `pages/Work/Work.{tsx,css}`, `components/TimelineItem/TimelineItem.{tsx,css}`, `pages/ProceduralAnimations/ProceduralAnimations.tsx`, `pages/ProceduralAnimations/ProceduralAnimations.css` (`.procedural-animations-card` ground, border, radius and colour declarations and `[data-theme="light"] .procedural-animations-card:hover .procedural-animations-card__link` only), `styles/components.css` (`.interactive-card` keeps position and padding; `a.interactive-card:hover` goes; static uses lose frames in Task 17) | `/case-studies`, `/case-studies/aether`, `/writing`, `/writing/what-should-still-be-hard`, `/experience`, `/journey`, `/procedural-animations` |

Per task also: the grammar test file and the browser test; Task 9 removes `pages/Home/Home.css .btn-outline:hover` from the bridge test's `ALLOW` (edit `darkfield-bridge.test.mjs`), Task 13 removes `pages/Work/Work.css .work-contact-link.primary`; its static test also requires every reachable non-`DEAD` TSX element whose `className` contains `interactive-card` and that is a `Link` or `a` to carry `df-control--card`, and adds a `/journey` invariant: hovering a `.timeline-flip-container.has-image` leaves its toggle's `aria-pressed` at `"false"`. `ProjectRoster.css .project-roster__toggle` reads `--terminal-background` as its text colour; Task 10 replaces it (Task 18 then retires the variable) (the toggle's colour comes from the model).

Task 10 adds the chamfer to `grammar.css` (P3-2). `clip-path` removes the boundary along the cut, so a pseudo-element draws the diagonal in `edge`:

```css
/* Primary-dialog chamfer at the top-left corner (§09 Frames and corners, §17 Chamfers; P3-2). */
.df-cut-md { position: relative; clip-path: polygon(var(--cut-md) 0, 100% 0, 100% 100%, 0 100%, 0 var(--cut-md)); }
.df-cut-md::before {
  content: ""; position: absolute; inset-block-start: 0; inset-inline-start: 0; pointer-events: none;
  /* the diagonal of a cut-md square; 1.4142 is the square root of two, not a design value */
  width: calc(var(--cut-md) * 1.4142); height: var(--stroke-hair); background-color: var(--edge);
  transform-origin: 0 0; transform: translateY(var(--cut-md)) rotate(-45deg);
}
```

  The dialog's own `::before`, if any, moves to `::after`. Task 10's static test asserts `.df-cut-md` appears on exactly one element in `Projects.tsx`.

- **Verify (each):** static gate; foundation browser test; Task 9: `boot-shell`; Task 10: `settings-panel`; Task 11: `header-overlap`, `settings-panel`, `boot-shell`; Task 12: `settings-panel` (dock-size slider and theme buttons), `header-overlap`; Task 13: `case-study-media`, `route-metadata`, `procedural-animations`.
- **Visual (each):** the task's routes, dark, light, mono, 1440 and 375, at rest and with the hover argument on one control of each kind; Task 11 also at 768 (menu layout) with the explore panel open. Expect square `edge` controls, `fg-muted` labels, a ground step and `›` on hover, Selected bands with a corner node, lamps on latches, no fills at rest.
- **Ledger effect:** Task 9, 11–13: none expected. Task 10: none in entries; in `notes`, delete the line beginning `Dark Projects stat-card green-on-green` (the stat-card now has the model's colours; the reviewer confirms in Dark screenshots). Task 13: if Task 6 kept the Writing eyebrow note, delete it here after the same check; **Mono:** the 8 `interact|mono|/case-studies/<slug>|a|Case Studies#2:hover` and `:active` ids (aether, erebus, arachne, where-the-specification-lived) gone; count 61. They are taken to be the `.case-study-breadcrumbs a` link (second "Case Studies" anchor in DOM order after the header link); confirm from the Step 1 record run's element path before relying on it, and stop if they belong to another element. Tasks 9–12: Mono count unchanged.

**Commits:**
- 9: `feat(web): give the home page's actions the Darkfield control model`
- 10: `feat(web): give the projects page's filters, roster actions and dialog the Darkfield control model`
- 11: `feat(web): give header and dock navigation the Darkfield control model`
- 12: `feat(web): give the settings panel and section rail the Darkfield control model`
- 13: `feat(web): give case study, writing and experience actions the Darkfield control model`

---

## Task 14: Type sizes from the generated type classes (P3-7 ruling)

**Spec:** §06 *Hierarchy*, *Rules* (weights); §17 *Type*. Sizes, line heights, weights and tracking come only from the `.df-*` classes in `tokens.css`.

| Element on Phase 3 surfaces | Class |
|---|---|
| The Home hero name (the view's one display line) | `df-display-2` |
| Page titles (`h1`) | `df-heading-1` |
| Section headings (`h2`) | `df-heading-2` |
| Card, panel and timeline titles (`h3`) | `df-heading-3` |
| Lead text: hero and page subtitles, the article body container | `df-body-lg` |
| Running text | `df-body` |
| Dense text: card descriptions, captions, meta lines, settings help | `df-body-sm` |
| Labels, values, dates, code; control labels | the `df-label*`, `df-data`, `df-annotation`, `df-code` classes of Tasks 5–7 and 9–13 |

**Files:** the TSX and CSS of the Phase 3 surfaces the T14 test names after Step 1 (expected: every `PHASE3` CSS file except `grammar.css`, `StaticBackground.css`, `ViewportPortal.css`, `Layout.css`; their TSX), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Tests first.** Static: no `phase3Decls()` declaration of `font`, `font-size`, `line-height`, `letter-spacing` or `font-weight` has a value other than `inherit` or a `var(--…)`, except three exact residual lists: `GENERATED`, rules for elements inside the generated article HTML (`.article-prose` descendants: headings, lists, blockquotes, tables), whose markup Phase 3 cannot class; and `ICON_SIZES`, rules that size an icon or glyph through `font-size` (icon size is §14's, not type): at `6f3042e` `.timeline-icon-wrapper`, `.terminal-dropdown-arrow`, `.site-header__caret`, `.project-roster__toggle-icon`, `.settings-disclosure__icon`, `.settings-action svg`, `.dock-icon` (its `calc()` size). A selector joins `ICON_SIZES` only if its element renders no text, only an icon, glyph or SVG; the commit body lists it. The third list, `RESET_HOLD`, pins only the existing normalize rules in `index.css` for `html`, `h1`, `pre`, `b, strong`, `code, kbd, samp`, `small`, `sub, sup` and the native form controls. These rules still govern Phase 5 text; removing them in Phase 3 changes its size, weight or line box. Phase 3 type classes override them where needed. Phase 5 retires a reset rule only after the affected native surfaces lift their type, and Phase 6 confirms the remaining list. Browser invariant on `P3_ROUTES` (one theme): every visible element with own text outside `P3_SKIP` and `.article-prose` has a computed `font-size` equal to that of one of the `.df-*` classes (elements matched by `ICON_SIZES` excepted), read from probe elements carrying each class (no size is typed in the test).
- [ ] **2.** Add the class to each element's `className`; delete its literal type declarations, including responsive overrides in `@media` blocks. A heading that wraps or overflows at 375 px after the change is reported with a screenshot; do not shrink it with a literal size (stop for a ruling).

**Owner ruling (2026-10-18):** After reviewing before/after 375 px screenshots of the Home name, the “Observability and Reliability” capability heading, and the “What Should Still Be Hard” article title, keep the planned generated type classes and their natural two-line wraps. The Home proof strip moving mostly below the first viewport is accepted. No smaller type class is authorized merely to preserve the former line count. Task 14 still requires the final full browser verification and Task 13's independent re-review before completion.

- **Verify:** static gate; foundation browser test; `header-overlap`, `settings-panel`, `case-study-media`, `boot-shell`.
- **Visual:** all `P3_ROUTES` and Settings open; dark, light, mono; 1440, 768 and 375.
- **Ledger effect:** none expected; text runs move, so a worse KNOWN entry is a stop. **Commit:** `feat(web): size the site's own text with the Darkfield type styles`

---

## Task 15: Hover for the two P2-1 controls on Phase 5 surfaces whose grounds follow the theme (P3-4)

- **Spec:** §13 *Hover*, *The state model*; D6 ruling (governed controls). **C2 ruling:** `.rhythm-lab-primary-action` and `.play-again-button` sit on grounds that stay dark in every theme (Rhythm Lab page and panels; Snake game-over overlay); token labels there fail in Light, so Phase 5 re-grounds and converts them. This task takes `.spider-button` and `.terminal-sidecar`, which sit on the Layout field.
- **Files:** `web/src/components/SpiderSolitaire/SpiderSolitaire.tsx`, `web/src/components/SpiderSolitaire/SpiderSolitaire.css` (`.spider-button` and its states only), `web/src/components/Terminal/Terminal.tsx`, `web/src/components/Terminal/Terminal.css` (`.terminal-sidecar` and its states only), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`, `web/scripts/darkfield-known-deficiencies.json`.

**Steps:**
- [ ] **1. Test first:** the two classes appear only in `className`s with `df-control df-label`; their rules declare no colour, ground, border colour, radius, opacity or transition, and no `:hover`, `:active` or `:disabled` rule for them remains (`.terminal-sidecar`'s static `translateY(-50%)` positioning stays). `P3_CONTROLS` adds `{ route: "/simulations/spider", selectors: [".spider-button"] }` and `{ route: "/terminal", selectors: [".terminal-sidecar"] }`. Before implementing, read the computed ground behind each control in Light (an ancestor with a non-transparent `background-color`); anything other than a token ground is a stop.
- [ ] **2.** Apply the shared rules of Tasks 9–13. `.spider-button:disabled` loses `opacity: 0.4`; the button uses `aria-disabled` and a guarded handler (Disabled stays focusable, §13). `.terminal-sidecar` keeps its position and size; its icon stays; `border-radius: 50%` goes (a control is square).

- **Verify:** static gate; foundation browser test; `orbital` (unchanged).
- **Visual:** `/simulations/spider`, `/terminal`; dark, light, mono; hover each control. Native playfields unchanged against base.
- **Ledger effect:** the 8 Light `/simulations/spider` entries go STALE and are removed: `contrast` "New Game", "Deal"; `interact` "New Game#1" and "Deal#1" `:hover`, `:focus`, `:active`. **Commit:** `feat(web): give the spider and terminal side actions the Darkfield control model`

---

## Task 16: Square corners on Phase 3 surfaces

- **Spec:** §03 *Ranks of form* (no rounded rectangles or pills); §17 *Corner radii*; README *Using the system*.
- **Files:** every `PHASE3` file the T16 test names after Step 1 (expected: `Projects.css`, `Work.css`, `WorkDetails.css`, `ArticlePage.css`, `components.css`, `HeroSection.css`, `TimelineItem.css`, `CaseStudyPage.css`, `Journey.css`, `Home.css`, `index.css`, `ContactStripSection.css`, `SiteNavigation.css`, `Dock.css`, `SettingsPanel.css`, `GlobalSectionNavigation.css`), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** every `phase3Decls()` `border-radius` (and `border-*-radius`) value is `0` or `var(--radius-0)`; no `phase3Decls()` value reads `--border-radius-` or `--dock-border-radius`. No governed element on Phase 3 surfaces is a live node, so the `radius-node` allowlist is empty; a candidate is a stop for a ruling. Browser invariant on `P3_ROUTES`: every visible element outside `P3_SKIP` that is not an `img`, `video`, `canvas` or `iframe` has computed corner radii `0px`.
- [ ] **2.** Replace or delete each declaration (delete where the element has no boundary or ground). Timeline nodes (`.timeline-node`, `.timeline-icon-wrapper`) become square nodes (§03: a filled square is a state point; nothing here is live).

- **Verify:** static gate; foundation browser test; `header-overlap`, `case-study-media`.
- **Visual:** all `P3_ROUTES`; dark and mono; 1440 and 375.
- **Ledger effect:** none. **Commit:** `fix(web): square every corner on the site's own pages`

---

## Task 17: Lines: seams, boundaries and flat frames

**Spec:** §09 *Line hierarchy*, *Frames and corners*, *Opacity and colour*; §03 *Frames and boundaries*, *Nested structures*, *Modules*; §08 *Not a dashboard*; §16 *Over-framing*.

**Rules:** a divider between regions is one L1 seam (`var(--stroke-hair) solid var(--rule)`). A closed boundary belongs only to controls, inputs and dialogs (L2 `edge`; controls get it from the model). Static content cards (`article.interactive-card`, `.case-study-section`, `.work-details-container`, `.timeline-content`, `.stat-card` rows' container, `.hero-proof-strip`, `.contact-strip`, `.project-roster` items, `.writing-card` grid wrapper) lose their closed outline and their ground: they share seams with their neighbours. Table cells keep row rules only. Decorative heading underlines (`.section-title::after` in `Home.css` and `CapabilitiesSection.css`, the `Projects.css` and `Work.css` title underlines) go: they mark nothing (README principle 5). The Work timeline rails become a solid L2 `edge` axis without gradient. Borders never use opacity or `color-mix` to fake a colour.

**Files:** every `PHASE3` file the T17 test and the frame invariant name (expected: `components.css`, `CaseStudyPage.css`, `WorkDetails.css`, `Work.css`, `TimelineItem.css`, `Journey.css`, `HeroSection.css`, `ContactStripSection.css`, `CapabilitiesSection.css`, `Home.css`, `Projects.css`, `ProjectRoster.css`, `Writing.css`, `ArticlePage.css`), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Tests first.** Static: in `phase3Decls()`, every `border*` and `outline` colour is one of `var(--rule)`, `var(--edge)`, `var(--signal)`, `var(--fg-muted)`, `var(--fg-faint)`, `transparent`, `currentColor` (focus rules excepted: `outline: 2px solid transparent` from Phase 1 Task 6); every width is `var(--stroke-hair)`, `var(--stroke-bold)` or `0`; no `::after`/`::before` rule whose innermost selector ends in `title::after` or `title::before` paints a background. Browser invariant on `P3_ROUTES`, every theme:

```js
  // Phase 3 Task 17 (§03, §09): a closed frame is a control, an input or a dialog.
  const frames16 = await page.evaluate((skip) => {
    const closed = (el) => { const c = getComputedStyle(el);
      return ["Top", "Right", "Bottom", "Left"].every((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none" && !/rgba\(.*, 0\)$/.test(c[`border${s}Color`])); };
    const allowed = '.df-control, input, select, textarea, [role="dialog"], dialog, .settings-panel, .site-header__panel, .dock-explore__panel, .terminal-dropdown-options, .dot-tooltip, .dock-tooltip, pre';
    return [...document.querySelectorAll("body *")].filter((el) => el.getClientRects().length && !el.closest(skip) && closed(el) && !el.matches(allowed))
      .map((el) => `${el.tagName}.${el.className}`).slice(0, 10);
  }, P3_SKIP);
  invariant(frames16.length === 0, `${theme} ${route}: closed frames ${JSON.stringify(frames16)}`);
```

  (Inside a `withPage` loop over `THEMES × P3_ROUTES`.)
- [ ] **2.** Implement the rules. Where removing a card's ground puts its text on `field`, the pair becomes `fg`/`fg-muted` on `field` (verified).

- **Verify:** static gate; foundation browser test; `case-study-media`, `header-overlap`.
- **Visual:** all `P3_ROUTES`; dark, light, mono; both widths. Expect modules separated by hairline seams, no boxes inside boxes, no underline bars under headings.
- **Ledger effect:** none expected; grounds under text change, so a worse KNOWN entry or a new failure is a stop. **Commit:** `fix(web): separate regions with seams and keep closed frames for controls and dialogs`

---

## Task 18: Retire the Projects and Roster colour systems and the global terminal-variable leak

- **Spec:** §17; §05 *Roles*.
- **Files:** `web/src/pages/Projects/Projects.css`, `web/src/components/ProjectRoster/ProjectRoster.css`, `web/src/components/TerminalDropdown/TerminalDropdown.css`, `web/src/pages/Journey/Journey.css`, `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs` (comment on `PAIRS` mentioning `.projects-cta-primary`: unchanged; it stays true).

**Steps:**
- [ ] **1. Test first:** no `PHASE3` file defines or reads `--terminal-*`, `--roster-*`, `--pill-*`, `--dock-*` (layout `--dock-icon-size` excepted), `--settings-danger`, `--range-*`. Browser invariant: after client-side navigation `/projects` → `/journey` and `/projects` → `/terminal` (Light), `<html>` computes no `--terminal-text-light` and no `--terminal-header-bg` from `Projects.css` (read `getComputedStyle(document.documentElement).getPropertyValue(...)`; after `/projects` → `/journey` expect `""` for both; after `/projects` → `/terminal` expect `""` for `--terminal-text-light` and, for `--terminal-header-bg`, `Terminal.css`'s own light value (no `Terminal/*.css` is loaded on `/journey`).
- [ ] **2.** `Projects.css`: delete the scoped `--terminal-primary` rules, `:root { --terminal-font }` and the global `[data-theme="light"]` block. Readers in `Projects.css`, `ProjectRoster.css` (`--roster-accent`, `--roster-rule`), `TerminalDropdown.css` and `Journey.css` (`--terminal-text-light`) read tokens by role: headings and titles `fg`; accents that marked nothing `fg-muted`; rules `rule`; boundaries `edge`; the dropdown menu `surface-2`, bounded in `edge`. Delete `--roster-accent` and `--roster-rule`.

- **Verify:** static gate; foundation browser test (its r9 navigation invariants for Spider and Snake must still pass); `settings-panel`.
- **Visual:** `/projects` (dropdown open, roster item expanded, tech-stack dialog open), `/journey` reached from `/projects`; dark, light, mono.
- **Ledger effect:** none. **Commit:** `refactor(web): retire the projects page's terminal colour variables into Darkfield tokens`

---

## Task 19: Literal colours on Phase 3 surfaces

- **Spec:** §05 *Roles*, *Rationing the secondary hues*, *When bright signal appears*; §17 (one token source).
- **Files:** every `PHASE3` file the T19 test names after Step 1 (expected at this point, after Tasks 10 and 18 removed the dropdown, roster and Projects literals: `GlobalScrollProgress.css`, `Dock.css`, `SiteNavigation.css`, `GlobalSectionNavigation.css`, `Work.css`, `TimelineItem.css`, `WorkDetails.css`, `CaseStudyPage.css`, `ContactStripSection.css`, `Home.css`, `SettingsPanel.css`). Run the test once before starting: an offender in `TerminalDropdown.css`, `Projects.css` or `ProjectRoster.css` means Task 10 or 18 is incomplete — stop, `web/scripts/darkfield-grammar.test.mjs`.

**Mapping rules:** text → `fg` (content), `fg-muted` (secondary), `fg-faint` (annotation, only on `field`, `field-deep`, `surface-1`, `surface-2`); grounds → `field`, `field-deep`, `surface-1..3`; translucent tints (`rgba(0,255,0,0.05)` hovers, `rgba(0,0,0,0.2)` wells) → delete (controls get grounds from the model) or the surface step; the scroll progress bar reports the current position → solid `signal` (§05 *When bright signal appears*); category hues (Work timeline nodes, Journey timeline icons) → `fg-muted` (P3-6); gradients → solid token or delete.

**Steps:**
- [ ] **1. Test first:**

```js
test("T19 literals: Phase 3 surfaces name colours only through tokens", async () => {
  const bad = (await phase3Decls()).filter((d) => LITERAL.test(d.value) && !/^(font-family|content|grid-template-areas)$/.test(d.prop));
  assert.deepEqual(bad.map(where), []);
});
```

- [ ] **2.** Apply the mapping. `TimelineItem.css` category colours and `Work.css` node colours: one rule each, no per-category selectors.

- **Verify:** static gate; foundation browser test; Mono work-list run (no hue-only state left on these routes); `header-overlap`.
- **Visual:** `/experience`, `/journey`, `/` (scroll so the progress bar shows), `/projects`; dark, light, mono.
- **Ledger effect:** none. **Commit:** `fix(web): replace literal colours on the site's own pages with Darkfield roles`

---

## Task 20: Retire the Simulations and Traffic chrome colour systems (P3-4, P3-9)

**Files:** `web/src/pages/Simulations/Simulations.css` (variable blocks and its `--terminal-font` reader only), `web/src/pages/TrafficSimulator/TrafficSimulator.css` (`--traffic-chart-line` and the comment above the speed ramp only), `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-known-deficiencies.json` (one note).

**Steps:**
- [ ] **1. Test first:** `Simulations.css` defines no custom property on `:root` or `[data-theme="light"]`; its `.simulations-container` defines `--terminal-primary: var(--signal-dim)`, `--terminal-text-light: var(--fg)`, `--terminal-text-muted: var(--fg-muted)` and nothing else, with no theme block; `TrafficSimulator.css` defines `--traffic-chart-line: var(--signal)` and keeps the ten `--traffic-speed-*` literals under a comment naming the hold. A `HOLDS` constant in the grammar test records `pages/TrafficSimulator/TrafficSimulator.css: --traffic-speed-0..4` (native palette mirror, P3-9) for Phase 5.
- [ ] **2.** Implement. `.simulations-container` keeps its scope, so the preview hold (`.simulation-preview > *`) still wins for native previews, and Snake and Spider still read their fallbacks. `Simulations.css`'s `font-family: var(--terminal-font)` becomes `var(--font-mono)` (value-identical; its voice is Phase 5's).

- **Verify:** static gate; foundation browser test (r9 navigation invariants; the native comparison of previews must be unchanged: re-run Phase 1 Task 3's native comparison scratch if present in `$DF_TMP`, else compare preview screenshots head vs pre-task); `orbital`.
- **Visual:** `/simulations`, `/simulations/traffic-simulator` (run until the chart draws); dark, light, mono.
- **Ledger effect:** none in entries. In `notes`, delete the line beginning `Residual page variables (r9, Task 3 Step 7 item 5)`: after Tasks 18 and 20 neither file defines page variables on `:root` or `[data-theme="light"]`. **Commit:** `refactor(web): retire the simulations and traffic chrome colour variables into Darkfield tokens`

---

## Task 21: Retire the Terminal colour system (P3-4)

**Spec:** §05 *Roles* (`field-deep` for terminal regions, `surface-2` header band), *State encoding*; §17 *Composite recipes* (selected row).

| Variable | Token |
|---|---|
| `--terminal-text-primary`, `--terminal-text-info`, `--terminal-selection-text` | `fg` |
| `--terminal-text-muted` | `fg-muted` |
| `--terminal-text-error` | `fault` |
| `--terminal-text-success` | `signal` |
| `--terminal-window-bg` | `field-deep` |
| `--terminal-header-bg` | `surface-2` |
| `--terminal-border` | `edge` |
| `--terminal-selection-bg` | `signal-deep` |

**Files:** `web/src/components/Terminal/Terminal.css` (the two variable blocks only), `web/src/components/Terminal/TerminalView.css` (`.grep-highlight` background only: `var(--terminal-selection-bg)`, a match band, because `fg` on `fault` is not a verified pair), `web/scripts/darkfield-grammar.test.mjs`.

**Steps:**
- [ ] **1. Test first:** `Terminal.css` defines its colour variables once, on `:root`, each `var(--<token>)` per the table; no `[data-theme]` block defines a `--terminal-*` colour; no `Terminal/*.css` literal colour sits in those definitions.
- [ ] **2.** Implement. Readers are unchanged (Phase 5 replaces them with token reads and deletes the aliases).

- **Verify:** static gate; foundation browser test (`/terminal` text and interaction passes in three themes); `boot-shell`.
- **Visual:** `/terminal` after `help`, `ls -l`, a failing command and a `grep` (as Phase 1 Task 4 did); dark, light, mono. Expect `fg` text on `field-deep`, `fault` for errors, a `signal-deep` band for matches and selections.
- **Ledger effect:** none (no `/terminal` entries). **Commit:** `refactor(web): retire the terminal's colour variables into Darkfield tokens`

---

## Task 22: Motion timing on Phase 3 surfaces

- **Spec:** §12 *Timing bands*, *Easing* (Phase 2 authority, applied here to CSS transitions); §13 *Feedback timing*; §17 *Animation durations*, *Easing*.
- **Files:** every `PHASE3` file the T22 test names (and, only if Step 2's native check finds a `NATIVE` control without its own `transition`, that file at that selector; expected: `index.css` body transition, `--interaction-transition` and `--transition-*`, `SiteNavigation.css`, `Dock.css`, `SettingsPanel.css`, `GlobalSectionNavigation.css`, `TimelineItem.css`, `CaseStudyPage.css`, `Writing.css`, and any rule Tasks 9–20 left), `web/scripts/darkfield-grammar.test.mjs`.

**Steps:**
- [ ] **1. Test first:**

```js
test("T22 timing: Phase 3 transitions and animations use duration and easing tokens", async () => {
  const bad = (await phase3Decls()).filter((d) => /^(transition|animation)(-duration|-timing-function|-delay)?$/.test(d.prop) && d.value !== "none" &&
    (/(?<![\w-])\d*\.?\d+m?s\b|\b(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier|steps)\b(?![\w-])/.test(d.value.replace(/var\([^)]*\)/g, "")) || /\ball\b/.test(d.value)));
  assert.deepEqual(bad.map(where), []);
});
```

- [ ] **2.** Hover-like and colour transitions → `var(--dur-fast) var(--ease-standard)`; panel and size changes → `var(--dur-base) var(--ease-standard)`; `transition: all` lists name their properties. Delete `body`'s theme transition (theme switches are instant: `html.theme-switching`). `--interaction-transition` becomes a token list (`background-color`, `color`, `border-color`, each `var(--dur-fast) var(--ease-standard)`); the global `a, button, input, textarea, select` rule keeps reading it and so still times Phase 5 controls. Native check (I6): list every `NATIVE` selector that matches one of those elements; each must declare its own `transition` (at `6f3042e` `.rhythm-lab-hit-zone` does: `transform`, `background-color`, `box-shadow` at its own literal timing, which outranks the global rule). One that does not gets a named local declaration holding the value `--interaction-transition` had at the Phase 3 base, in its own file, listed in the commit body. Delete `--transition-fast`, `--transition-slow` (no readers) only if this task's edits made them unread; at `6f3042e` they already had none, so they stay (dead-code ruling). `--transition-normal` keeps its `SimulationCard.css` readers (Phase 5).

- **Verify:** static gate; foundation browser test; `settings-panel`, `header-overlap`. **Visual:** a spot check of hover timing on `/` only (the state invariant holds the end states).
- **Ledger effect:** none. **Commit:** `fix(web): time the site's own transitions by Darkfield duration and easing tokens`

---

## Bridge retirement summary

Task 2 retires the 29 colour and font aliases (readers read tokens, value-identical); Task 4 retires `--app-overlay` (readers read `--df-scrim`); Phase 5 retires the fenced `--accent-color` hold with the NotFound and ErrorBoundary chrome and the Snake HUD, giving `.food-preview` a local hold, and then deletes `bridge.css`. After Phase 3, `bridge.css` holds its header comment and the fenced `--accent-color` block, and `darkfield-bridge.test.mjs` asserts: theme switching writes no token values (unchanged); every retired alias is defined and read nowhere (stronger than "mapped in the bridge"); literals only in the fence, only for `accent-color`; no text colour reads a ground token, `ALLOW` = the ProjectMedia Light exception only; fonts only through Darkfield families, `FONT_HOLDS` unchanged, and no `--font-family-*` exists; `index.html` boot-shell fallbacks equal the Dark token values.

## Phase exit (no commit)

- [ ] `node --test scripts/darkfield-*.test.mjs` passes, including every `T*` test in `darkfield-grammar.test.mjs`; the static gate passes.
- [ ] Foundation browser test passes in check mode with `dark,light`; the Mono record run shows 61 ids, none of Phase 3's 27, none new or worse; all seven named browser tests pass (orbital line-196 note only). The ledger holds 88 entries (136 − 48); `regions`, `unmeasured`, `creative`, `inactive` unchanged.
- [ ] `rg -n "var\(--(app-|brand-|primary-color|text-color|text-secondary|card-background|panel-bg|border-color|background-color|font-family-)" web/src -g '*.css' -g '*.tsx'` lists only `DEAD` files and the Rhythm Lab exception.
- [ ] Mono screenshots of every `P3_ROUTES` route: reading order survives without hue (§05 *Monochrome*); three-question check (§16) per route, reviewer judgement in the report.
- [ ] Hand-offs recorded: **Phase 4** — `BRAND_HOLD` (header brand: KS mark and name, still on legacy radius, literal ground and literal type). **Phase 5** — `--accent-color` and the bridge file; C2 items (`rhythm-lab-eyebrow`, the three Rhythm Lab modal kickers, `.rhythm-lab-primary-action`, `.play-again-button`: re-ground, then the control model and label voice); Terminal/Simulations/Traffic alias readers; Traffic speed-ramp hold (P3-9); Rhythm Lab `--text-color`; loader text on the scrim; `--border-radius-*`, `--spacing-*`, `--transition-normal` readers; `RESET_HOLD` normalize declarations after native type lift (Task 14). **Phase 6** — `ICON_SIZES` and `GENERATED` type residuals (Task 14), and any `RESET_HOLD` not retired in Phase 5; disabled dash approximation (P3-10); aperture reveals; `●/○` dropdown prefixes; chamfer and node sizes (D11(a)). **Owner** — P3-5 arm-then-commit words; P3-7 spacing residual (Phase 6 report); headings inside generated article HTML (Task 14 `GENERATED`); P3-8 dead CSS cleanup with the Phase 2 `DEAD` list.

## Risks and stop conditions

The master plan's stop conditions apply. Phase-specific:

1. **Cascade order.** Lazy chunks load component CSS after `grammar.css`, so a component rule of equal specificity overrides the model. The control invariant reads computed values; a failure there means a component rule was not stripped. Never raise specificity with `!important`.
2. **Ground changes move measurements** (Tasks 5, 9–17). Controls lose fills and cards lose grounds, so text sits on new grounds. Every new pair must be verified or measured; a KNOWN entry worse than its baseline, or a new failure, is a stop.
3. **Disabled controls at load** are recorded as `inactive`. Restyling one that renders disabled at load changes the record: stop and report (none is expected on Phase 3 routes).
4. **Navigation-order variables.** Tasks 18, 20 and 21 change what `Terminal`, `Journey` and `SimulationCard` read after client-side navigation. The r9 navigation invariants must still pass; a native preview or game colour change is a stop (restyling a native visual is not reversible by review).
5. **Coverage.** Do not rename classes in `PAIRS`, `STATES`, `SAMPLER_SELECTORS` or invariants; a selector that stops rendering is a stop, not a deletion.
6. **Mixed files.** Tasks 2, 3, 4, 6, 13, 15, 20, 21 edit Phase 5 files only at the selectors they name; any other hunk fails review. No task touches `NATIVE`, `NATIVE_FILES`, `NATIVE_KEYFRAMES`, `pages/RhythmLab/*` or creative paths.
7. **Spec ambiguity.** P3-1 (scrim reading), P3-10 (dash approximation) and the Selected node position are readings, not rulings; if the controller overrules one, amend the task before it runs.
8. **Disclosure.** Plan, code comments, tests and commits name tokens and sections only. The control model's sizes are token names (`grid-half`, `cell-w`, `cell-h`, `grid-unit`); a reviewer who finds a specification number in a diff stops the task.
