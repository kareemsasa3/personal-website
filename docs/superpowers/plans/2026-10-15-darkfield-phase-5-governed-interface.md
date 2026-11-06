# Darkfield Phase 5 (Governed interface around creative and native content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. One task, one commit, an independent reviewer between tasks (master plan, *Operational safety*). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give the site-owned frame around every creative or native surface Darkfield's grammar: procedural-animation index and piece bar, project media chrome, the Orbital and Traffic DOM controls, panels, legends and readouts, the whole Terminal, the Snake, Spider and Rhythm Lab chrome, the Annals chrome, the Simulations index, and the not-found, error, loading, toast and modal states. Native visuals (playfields, previews, canvases, iframes, recordings, the Annals parchment and narrative) stay pixel-identical. Phase 5 lifts the Phase 1 font holds the D6 ruling makes governed, keeps the ones it makes native, retires every remaining ledger entry it can fix, retires `--accent-color`, and deletes `bridge.css`.

**Authority (read in `$DF_TMP/darkfield` before each task):** README *Using the system*, principles 2, 4, 5, 6, 7; §05 *Roles*, *Semantic prominence → theme rendering*, *When bright signal appears*, *Rationing the secondary hues*, *State encoding*, *Monochrome*, *Contrast, verified*; §06 (all); §07 *The cell*, *Functions*, *Canonical glyph set*, *Limits*; §08 *The instrument grid*, *Composition modes*, *Layers and overlays*, *Not a dashboard*; §10 *Global limits*, *Atmosphere by context*; §12 *The six classes*, *Timing bands*, *Easing*, *What may repeat*, *Traces*, *Reduced motion, by class*; §13 (all, including *Direct manipulation*, *Errors*, *Processing*, *Disabled, unavailable, stale*); §15 *Data visualisation*, *Composition of a large graphic*. Supporting: §03 *Rules*; §09 *Line hierarchy*, *Dash semantics*, *Frames and corners*; §16 *Terminal cosplay*, *Gratuitous HUD elements*, *The three-question check*; §17 *Type*, *Corner radii*, *Chamfers*, *Opacity*, *Animation durations*, *Easing*, *Composite recipes*.

The master plan's *Phase 5* table and *Region marking* rules are the scope. Its *Scope boundary*, *Global Constraints*, *Operational safety* and *Validation model* apply unchanged.

**Inventory base:** `6f3042e` (Phase 1 Task 4). The working tree carried uncommitted Phase 1 Task 5 (Mono) edits when this was written; none touches a file in the Phase 5 list. Mono is D4(b) interim: supported, not offered, tracked by worklist (Decisions). **Execution base:** HEAD after Phase 4 exits (Phase 1 Tasks 5–7, Phase 2, Phase 3 and Phase 4 committed). Step 0 records it. Line numbers are at `6f3042e`; locate code by selector.

### Decisions this plan relies on

| Label | Decision | Status |
|---|---|---|
| D6 ruling | Snake `.game-scores`, `.game-over-content` governed; board, snake, food native. Spider `.spider-solitaire` font and text colour governed; cards, columns, playfield native (pin their own values when lifting). Rhythm Lab root `.rhythm-lab` governed; lanes, notes, judgement visuals native (pin locally). Annals: every control, heading, hint, legend, readout, log, banner, footer governed; the parchment and the six narrative markers native. `/simulations` previews native: Task 3's preview hold and six markers confirmed | Delegated ruling (progress.md), not an owner approval |
| P2-3 | Rhythm Lab keeps its own rain (`MatrixRain3DBackground`, `theme="dark"`, held settings) | Delegated ruling; owner confirmation open |
| C2 ruling | Rhythm Lab and Snake items on always-dark grounds (`rhythm-lab-eyebrow`, the three `rhythm-lab-modal-kicker`s, `.rhythm-lab-primary-action`, `.play-again-button`) are re-grounded with tokens first, then converted | Delegated ruling |
| P3-3, P3-5 precedents | Show an existing accessible name as the visible label; destructive actions lose the `fault` hue, arm-then-commit words go to the owner | Delegated rulings (Phase 3) |
| D4(b) interim | Mono is supported in code and tests but not offered in Settings. Check mode runs `dark,light`. Mono is tracked in record mode against `mono-worklist.json` (88 at Task 5): no task adds or worsens a Mono failure; Phase 3 and Phase 5 tasks clear their named Mono groups; Phase 6 requires 0, then flips D4 to (a) and adds Mono scope records | Delegated ruling (progress.md) |
| D8, D7, chamfer, dead-code | No filled primary; context labels; stricter README chamfer limit; already-dead code excluded by name, code a task makes dead may go | Delegated rulings |
| D10 | Ledger entries accepted for deferral | Owner, 2026-10-15 |
| D11(a) | Open. No file, test or comment here states a specification-defined limit; sizes, times and counts are token names or real data | Open |

**Planner proposals (defaults; controller confirms or overrules before the named task):**

| Id | Proposal | Tasks |
|---|---|---|
| P5-1 | **Scoped token set on a fixed native ground.** Governed chrome that sits on a native ground which does not follow the site theme renders in the token set that matches that ground, by a `data-theme` attribute on the wrapper (tokens.css theme blocks are not anchored to `<html>`). Rhythm Lab: its held rain is always dark, so `.rhythm-lab-page` carries `data-theme="dark"` when the site theme is Light (Dark and Mono follow the site). Annals: see P5-3. A variable derived from a colour token (Phase 3's `--df-scrim`, built from `--field`) is computed where it is declared, so a scoped subtree would inherit the page theme's value; every such derived variable is therefore declared on `:root, [data-theme]` (Task 2) | 2, 18, 21 |
| P5-2 | **Native-palette mirrors are holds.** Legend keys that mirror a creative palette keep its values: the Traffic speed ramp (P3-9), the Traffic signal lamps (`SIGNAL_COLORS` from the creative renderer, inline style), the Annals gold key. Their text is governed | 11, 21 |
| P5-3 | **Annals ground.** Default (B): the parchment sheet stays exactly as it is, the world's one panel; the governed chrome on it renders with the Light (paper) token set in every theme (`data-theme="light"` on `.annals-sheet`). Native pixels, geometry and the `creative`/`regions` records stay unchanged. Cost: in Mono the sheet's chrome keeps Light's ink hues (a recorded Mono residual for Phase 6 and the owner). Alternative (A): the parchment moves onto the world panels only and the chrome sits on `field`; it changes the rendered ground under native text (creative re-record) and the layout. **Controller rules before Task 21** | 21, 22 |
| P5-4 | **Annals verbs become §13 Disabled** (`aria-disabled` and a guarded handler, focusable). The browser test classifies `[aria-disabled="true"]` like `:disabled` (WCAG exempts both) and its Annals prepared state waits on either; the 12 `inactive` observations are re-recorded from the head build and reproduced by the reviewer. `inactive` is not part of D10 | 22 |
| P5-5 | **Markers on pointer-only playfields.** `.spider-board` and `.game-board` take `data-df-region="native"`: they contain no site control (no button, link, input, role or tabindex); their pointer targets are game pieces. Rhythm Lab marks only `.rhythm-lab-note` and `.rhythm-lab-target-windows` (lanes host governed labels and the hit-zone buttons) | 15, 17, 18 |
| P5-6 | **Processing.** The loader keeps Phase 2's row-form scan and adds the pending word and a per-second elapsed counter (ruled, progress.md). The Home actions disabled during a chunk load take the Processing signature. Long-wait stage or last-event content goes to the owner; the random messages are not stages | 5 |
| DEV-2 | **Loader show-after time not coded** (controller ruling): D11(a) stays open, so the pending word and counter mount with the overlay at the site's existing loader timing; owner publishes the §13 constant under D11(a) or accepts | 5 |
| P5-7 | **Terminal window buttons** (close, minimise, maximise) lose the coloured dots and show their existing accessible names as visible Instrument labels (P3-3 precedent); flagged for the owner | 12 |
| P5-8 | **Block cursor.** The terminal prompt hides the native caret and draws a block cell (§17 *Composite recipes*, Cursor) at the caret's cell, only while the input has focus and the prompt is shown; the Vim cursor becomes the same block, only while the editor has focus | 13 |
| P5-9 | **Toast states.** Success = §13 Confirmed (`›`, boundary decays), error = Error, warning = Warning, info = no marker; the Font Awesome type icons go (the success icon is a check mark, excluded by §07 and §05) | 4 |
| P5-10 | **Not found and error boundaries.** 404 takes the §13 Error signature (navigation failed: what failed and what to do next, in `fg`); a caught render error is a system-integrity fault and adds the Alarm band; no failure onset (glitch) is added | 3 |
| P5-11 | **Throughput chart** draws a step line (sampled data, §15 and §12 *Stepped or smooth*); the demand line is the comparison series (`coolant`) | 11 |
| DEV-1 | **Traffic sliders apply live** (Task 10 Step 3a): Current, Possible and the hard limits are drawn; Proposed and Committed are not, because no uncommitted value exists without commit-on-release behaviour. Recorded deviation; the controller keeps it (default) or orders a follow-up | 10 |
| P5-12 | **Snake HUD pairs.** Label and value split into an Instrument label and a Machine value only after the two Snake entries are retired (their ids name the text runs) | 16 |

### What Phase 5 does not change

- Creative-owned paths (master plan *Scope boundary*), `web/public/procedural-animations/**`, `web/public/media/**`, `MatrixRain3DBackground/` and the rain-hosting rules in `pages/RhythmLab/RhythmLab.css` (`.rhythm-lab-background`, `.rhythm-lab-page .matrix-rain-3d-background`), the rain's props, the Background animation and Speed settings (P2-3, P2-6).
- Native selectors (`NATIVE5`, Task 1) in mixed files, except the font and colour pins a task names. The Annals utility-class rules in `Annals.css` style native regions too; they are never edited. Governed Annals elements drop conflicting utility classes (keeping their first class) and gain appended classes.
- The `.simulation-preview > *` hold and the six preview markers (D6 ruling confirms them), `.spider-preview-card-face`'s held font, `.spider-column:empty`'s held border variable.
- Copy. Words, glyphs inside text nodes, and data stay. Owner hand-offs collect copy findings (Phase exit).
- Class names the browser test pairs on. Ledger, unmeasured and creative ids name an element's tag, **first class** and text; a covering element's **whole class list** appears in unmeasured reasons. So: a measured element keeps its tag, first class and text; `.rhythm-lab-overlay` and `.rhythm-lab-overlay-panel` keep their exact class lists; new classes are appended.

### Hand-offs received

| From | Hand-off | Task |
|---|---|---|
| Phase 2 | Terminal cursor blinks (`TerminalView.css`, `VimUI.css`) and `TopUI.css` `processUpdate` (`KEYFRAME_HANDOFF`) | 13, 14 |
| Phase 2 | `data/manPages.ts` names the deleted `MatrixBackground`; PageLoader fake-progress messages; Background animation/Speed labels and note now affect only Rhythm Lab | owner (copy); listed at exit |
| Phase 2 | Loader Processing signature; Rhythm Lab page background | 5, 18 |
| Phase 3 | `--accent-color` readers (`ErrorBoundary.css`, `NotFound.css .not-found h1`, Snake HUD and native `.food`, `.food-preview`) and the bridge file | 3, 8, 15, 23 |
| Phase 3 | C2 items | 15, 20 |
| Phase 3 | Readers of the Terminal aliases (Task 21), the Simulations scoped variables (Task 20) and the Traffic chart variable; Traffic speed-ramp hold (P3-9) | 8, 10, 11, 12, 14 |
| Phase 3 | Rhythm Lab page-local `--text-color` (bridge-test exception, both halves) | 18 |
| Phase 3 | Loader text on the scrim; `--border-radius-*`, `--spacing-*`, `--transition-normal` readers; `.error-details summary:hover` reads the undefined `--hover-color`; the ProjectMedia Light exception in the bridge test's `ALLOW` | 5, 8, 3, 7 |
| Phase 3 | Home `.btn`s disabled while a route chunk loads are Processing, not Disabled | 5 |
| Phase 2 | The inert `useTypewriter` history-entry field | 12 |
| Phase 1 | Font holds pinned in Task 4: `.spider-solitaire`, `.rhythm-lab` (governed → lift), `.game-scores`, `.game-over-content` (governed → lift), `.spider-preview-card-face` (native → stays); Task 3 item 5 `--terminal-primary` preview hold (stays) | 15, 17, 18, 8 |

---

## Inventory at `6f3042e`

From `web/src`. `P5` = the 27 `PHASE5` stylesheets of the Phase 3 plan.

| Evidence | Command | Result |
|---|---|---|
| Size | `wc -l $P5 \| tail -1` | 6895 lines; `RhythmLab.css` 2123, `SimulationCard.css` 674, `TrafficSimulator.css` 412, `TopUI.css` 357 |
| Radii | `cat $P5 \| grep -cE 'border(-[a-z-]+)?-radius\s*:'` | 122 (`RhythmLab.css` 44, `SimulationCard.css` 13) |
| Literal colours (not shadows) | `cat $P5 \| grep -vE 'box-shadow\|text-shadow\|backdrop' \| grep -cE '#[0-9a-fA-F]{3,8}\b\|rgba?\('` | 536 lines (`RhythmLab.css` 224, `Annals.css` 53, `VimUI.css` 37, `SimulationCard.css` 35, `Modal.css` 32, `TopUI.css` 29) |
| Gradients, transitions, families, uppercase, keyframes | same pattern with `gradient(`, `^\s*transition\s*:`, `font-family\s*:`, `uppercase`, `@keyframes` | 30, 35, 48, 41, 15 |
| Theme rules in mixed files | `grep -n "data-theme" components/RhythmLab/RhythmLab.css pages/RhythmLab/RhythmLab.css pages/Annals/Annals.css components/SnakeGame/SnakeGame.css` | none (P5-1 scoping is clean) |
| Terminal-variable reads | `rg -c 'var\(--terminal-' -g '*.css' .` | Phase 5 files: `RhythmLab.css` 24, `TerminalView.css` 29, `TopUI.css` 24, `Terminal.css` 23, `ManPageUI.css` 17, `SimulationCard.css` 12, `SnakeGame.css` 12, `TerminalWindow.css` 6, `Simulations.css` 4, `SpiderSolitaire.css` 3 |
| Font holds | `grep -n 'Courier New' components/{SnakeGame,SpiderSolitaire,RhythmLab,SimulationCard}/*.css` | `.game-scores`, `.game-over-content`, `.spider-solitaire`, `.rhythm-lab`, `.spider-preview-card-face` (literal stacks; `FONT_HOLDS` in `darkfield-bridge.test.mjs`, `HELD_FONTS` in the browser test) |
| Rhythm Lab page | `cat pages/RhythmLab/RhythmLab.css` | `.rhythm-lab-page`: `background: #0d0d0d`, `color-scheme: dark`, `--terminal-primary: #4caf50`, `--text-color: #ffffff`; rain canvas at reduced opacity over it (`MatrixRain3DBackground.css`) |
| Rhythm Lab native reads | `awk '/\{/{s=$0} /terminal-primary/{print NR": "s}' components/RhythmLab/RhythmLab.css` | one native reader, `.rhythm-lab-hit-zone`; 22 governed readers |
| Annals structure | `grep -n 'className\|data-df-region' pages/Annals/Annals.tsx` | one parchment sheet (`.annals-sheet`) holds all content; Tailwind-style utility classes; six narrative markers; verbs `disabled={!world.token}` |
| Unrendered terminal cursor | `rg -n '\bcursor\b' --glob '*.tsx' components/Terminal` | only `vim-cursor`; `TerminalView.css` `.cursor` and its `@keyframes blink` are dead CSS |
| Toast and modal users | `rg -n 'useToast\(\|<Modal' --glob '*.tsx' .` | `SettingsPanel.tsx` only (export, import, reset toasts; reset confirmation modal) |
| Coming-soon cards | `rg -n 'isAvailable' data/simulationsData.ts` | all six available: the coming-soon branch is reachable code but unrendered |
| Procedural pieces | `grep -o 'body[^{]*{[^}]*background' public/procedural-animations/*/piece.html` | each piece paints its own body ground |
| Range inputs | `rg -n 'type="range"' --glob '*.tsx' components pages` | Traffic sliders only |

**Ledger.** At `6f3042e`: 136 entries. Phase 3 retires 48; **88 remain**, all Phase 5's (`node -e` over `entries` by route): Light `/simulations/snake` "Score:" 2 → **Task 15**; Annals text 6 (`contrast` "your hand" ×2, `contrast` h2 "· spent" ×2, `state` "· available" ×2) → **Task 21**; Annals roster "·" 80 (`text` ×20, `interact` ×60) → **Task 22**. Phase 5 exits with **0 entries**. `unmeasured` 38 (Rhythm Lab overlay coverage) and `creative` 20 stay (Task 17 adds Spider board records and re-records its `regions`); `inactive` 12 are re-recorded in Task 22 (P5-4).

**Mono worklist** (`mono-worklist.json`, 88 at Task 5; 61 expected after Phase 3). Phase 5 groups and the count after each owning task: Task 8 clears the `/simulations` Annals and Rhythm Lab card links hovered, focused, pressed (h3 and badge runs, 12) → 49; Task 9 the Orbital `← Simulations` link `:hover`, `:focus`, `:active` (3) → 46; Task 10 the Traffic one (3) → 43; Task 21 the Annals "your hand" legend, "· spent" heading and prepared "· available" (3) → 40; Task 22 the 10 roster "·" text runs and 30 roster interaction runs → **0**.

---

## Shared procedures

Every Bash call sources the session environment (`DF_TMP`, `DF_PW`, `PLAYWRIGHT_BROWSERS_PATH`, `W`). Check exit codes with `; echo rc=$?`.

**Static gate (every task):** `cd "$W/web" && node --test scripts/darkfield-*.test.mjs`, `npm run typecheck`, `npm run lint`, `npm test` (log to `$DF_TMP/p5-smoke.log`), and `git status --porcelain -- src/data/generated/articles.ts` prints nothing.

**Foundation browser test (every task):** `bash "$DF_TMP/df-serve.sh" head "$W/web" 4173`, then `DARKFIELD_THEMES=dark,light node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p5-tN-foundation.log" 2>&1; echo rc=$?`; read the tail. Check mode never runs Mono while D4(b) holds.

**Mono worklist (every task, D4(b) interim):** `DARKFIELD_MODE=record DARKFIELD_THEMES=mono node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p5-tN-mono.log" 2>&1`; compare its failure `entries` with `$WS/mono-worklist.json` (`$WS` = this plan's directory). No id may be new and none worse (by more than the test's 0.05 tolerance); a task that owns a Mono group must clear exactly that group. Report the new count; the controller updates the worklist file. No task writes Mono scope records into the ledger (Phase 6 does).

**Named browser tests:** `node scripts/<name>-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`. `orbital` fails only at its line 196 (ledger note). `boot-shell` runs in every task that edits TSX.

**Ledger rule:** a STALE entry the task fixed is removed in the same commit and listed in the commit body. A new failure, a KNOWN entry worse than baseline, a `missing` (unpaired) entry, or a changed `regions`, `unmeasured`, `creative` or `inactive` record is a stop, except the re-records Tasks 17 and 22 authorize (dark and light only; no Mono record before Phase 6). A note changes only where a task quotes its first words.

**Contrast rule:** every new text/ground pair is a §05 *Contrast, verified* pair in the token set that renders it, or it is measured by the foundation test and passes. Text on a native ground (parchment, Rhythm Lab rain composite) is always measured.

**Task-base preview.** Step 0 creates `git -C "$W" worktree add --detach "$DF_TMP/p5-prev" HEAD` and links `$DF_TMP/p5-prev/web/node_modules` to `$W/web/node_modules`. Before each task: `git -C "$DF_TMP/p5-prev" checkout --detach <task base>` and `bash "$DF_TMP/df-serve.sh" prev "$DF_TMP/p5-prev/web" 4175`. BASE (`3c533b6` + Task 3 markers) stays on 4174; never edit `$DF_TMP/baseline`.

**Native comparison (every task that touches a mixed file, a native surface's page, or a creative container; named per task).** Scratch `$DF_TMP/p5-native.mjs <pw> <urlA> <urlB> <set> <themes>`, extending `$DF_TMP/native-compare.mjs` (Task 3):
- Each context: 1440×900, `deviceScaleFactor: 1`, `reducedMotion: "reduce"`, the Playwright clock installed before navigation, and `Math.random` replaced by a seeded generator in an init script, identically on both builds. Animations paused by the Task 3 `FIX` rule.
- Each set neutralises the **governed** ancestors' grounds to `#7f7f7f`, hides governed descendants, and captures whole-pixel clips of the native items. Native grounds are never neutralised.

| Set | Route | Captured | Hidden / neutralised |
|---|---|---|---|
| `previews` | `/simulations`, direct and from `/projects` | each `.simulation-preview` (Task 3 FIX) | frames |
| `snake` | `/simulations/snake` | `.game-board` | `.game-scores`, `.touch-controls`, overlays / `.snake-page`, `.snake-game-container` |
| `spider` | `/simulations/spider` | `.spider-board` | — / `.spider-page`, `.spider-solitaire` |
| `rhythm` | `/simulations/rhythm-lab`, started as the browser test's STATES `prepare` does, then fixed clock steps | `.rhythm-lab-highway` | `.rhythm-lab-background`, `.rhythm-lab-lane-label`, overlays / `.rhythm-lab-page`, `.rhythm-lab`, `.rhythm-lab-stage` |
| `annals` | `/simulations/annals` | each `[data-df-region]` | — (the parchment is native) |
| `canvas` | Orbital, Traffic | each `<canvas>` | / the canvas's ancestors |

- It first captures urlA twice; if they differ, the set is NONDETERMINISTIC and falls back to the computed-style check alone (reported).
- **Computed-style check (always):** for every element matched by the set's `NATIVE5` selectors, `color`, `background-color`, `background-image`, `border-*`, `border-radius`, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `box-shadow`, `opacity`, `transform`, `width`, `height` are equal.
- Run task-base (4175) vs head (4173) in `dark,light,mono`, and BASE (4174) vs head in `dark,light`. A task-base vs head DIFF is a stop. A BASE vs head DIFF that the task base already shows comes from an earlier phase (for example Phase 2's glow removal on the judgement word): report it with its origin; any other is a stop. Procedural pieces and project media are compared by `git diff --quiet <task base> -- web/public` plus unchanged iframe/asset boxes at 1440 and 375, plus their browser tests.

**Visual check:** Phase 2's `$DF_TMP/p2-shot.mjs` (head 4173 vs base 4174; base has no Mono), output `$DF_TMP/p5-tN-shots`, hover argument where named. Agent visual inspection, not owner sign-off.

**Staging:** `git add -- <exact paths>`; deletions with `git rm -- <path>`; `git diff --cached --name-only | sort` equals the task's list. Commit messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Phase 3 machinery reused:** `.df-control` (+ `--card`, `--light`, `--latch`, `--unavailable`), `.df-context`, `.df-prose`, `.df-cut-md`, `--df-scrim`, `--df-ground`/`--df-ground-up`, the generated `.df-*` type classes, `installPressAcknowledge`, `P3_CONTROLS` (tasks append `{ route, prepare?, scope?, selectors }`).

---

## Step 0: Preflight (no commit)

- [ ] `git status --porcelain` is empty; `git log` shows Phase 4's exit commit. Record HEAD as the Phase 5 base.
- [ ] Confirm Phase 3 outputs: `grammar.css` defines `.df-control`, `.df-control--card`, `--light`, `--latch`, `--unavailable`, `.df-cut-md`, `--df-scrim`; `bridge.css` holds only the fenced `--accent-color`; `darkfield-grammar.test.mjs` exports `PHASE5`; `P3_CONTROLS` exists in the browser test; `rg -n 'var\(--accent-color' web/src -g '*.css'` lists only the readers in *Hand-offs received*.
- [ ] Confirm the ledger holds 88 entries (the three groups above); a different count is a stop.
- [ ] Record the Mono worklist count. Expected after Phase 3: **61** (Phase 3 owns 27: status badges 16, case-study "Case Studies" link 8, 404 3). Phase 5 owns the rest: `/simulations` cards 12 (Task 8), Orbital back link 3 (Task 9), Traffic back link 3 (Task 10), Annals 43 (Task 21: 3; Task 22: 40). A different count or composition is a stop.
- [ ] Re-run the inventory; note moved counts by phase.
- [ ] Create `$DF_TMP/p5-prev` (Shared procedures) and `$DF_TMP/p5-native.mjs`; run it base-vs-base on every set to prove determinism; record NONDETERMINISTIC sets.
- [ ] Record P5-1…P5-12 in the progress ledger as awaiting confirmation. P5-3 must be ruled before Task 21.
- [ ] Static gate, foundation test and the Mono record run on the base → `$DF_TMP/p5-base-foundation.log`, `$DF_TMP/p5-base-mono.log`.

---

## Task 1: Phase 5 scope, native list and invariants (test-only)

**Files:** modify `web/scripts/darkfield-css-scope.mjs`, `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-restraint.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`; create `web/scripts/darkfield-surfaces.test.mjs`.

**Steps:**
- [ ] **1.** Move `PHASE3` and `PHASE5` from `darkfield-grammar.test.mjs`, and `NATIVE_KEYFRAMES` from `darkfield-restraint.test.mjs`, into `darkfield-css-scope.mjs` (exported, unchanged); both tests import them (same test names and count before and after).
- [ ] **2.** In `darkfield-css-scope.mjs` export:
  - `NATIVE5`: exact innermost selectors of native rules per mixed file, a superset of Phase 2's `NATIVE`. Seed: `SnakeGame.css` `.game-board`, `.snake-segment`, `.snake-segment.snake-head`, `.food`; `SpiderSolitaire.css` `.spider-board`, `.spider-column`, `.spider-column:empty`, every `.spider-card*` rule, `.spider-card-rank`, `.spider-card-back` (and their `@media` forms); `RhythmLab.css` `.rhythm-lab-highway*`, `.rhythm-lab-hot-streak …`, `.rhythm-lab-track`, `.rhythm-lab-lane`, `.rhythm-lab-lane-*` except `.rhythm-lab-lane-label`, `.rhythm-lab-note-motion`, `.rhythm-lab-note`, every `.rhythm-lab-target-*` rule, `.rhythm-lab-status*` and `.rhythm-lab-judgment-*` (the judgement display, including the Ready and Recording words that share its rules), `.rhythm-lab-hit-zones`, `.rhythm-lab-hit-zone*`; `SimulationCard.css` `.simulation-preview > *` (both forms) and every preview-content rule (`.snake-preview` … `.annals-preview-line-death`, `.placeholder` excluded); `Annals.css` `.annals-sheet` and every utility rule (`.annals-page .<utility>`). A grouped rule that mixes native and governed selectors (`SpiderSolitaire.css`'s reduced-motion `.spider-card, .spider-button`) is not listed here and not edited in this test-only task; Task 17 splits it under a native comparison and adds its native half.
  - `HOLDS5`: `{ file: [[innermost selector, property]] }` for P5-2 mirrors and the existing native-value holds (`.spider-solitaire --spider-empty-column-border`, Traffic speed ramp).
  - `DEAD_RULES5`: `TerminalView.css` `.cursor` and `@keyframes blink` (unrendered; excluded by name, not deleted).
- [ ] **3.** Create `darkfield-surfaces.test.mjs`:

```js
// web/scripts/darkfield-surfaces.test.mjs: Phase 5 static invariants (governed interface around creative content).
import test from "node:test";
import assert from "node:assert/strict";
import { read, governed, declarations, innermost, where, NATIVE, NATIVE_KEYFRAMES, PHASE5, NATIVE5, HOLDS5, DEAD_RULES5 } from "./darkfield-css-scope.mjs";

// Stylesheets a Phase 5 task has finished; the rules below hold for these. Task 24 requires DONE5 to equal PHASE5.
export const DONE5 = [];
const decls5 = async () => {
  const out = [];
  for (const file of (await governed(".css")).filter((f) => DONE5.includes(f))) {
    const skip = [...(NATIVE5[file] ?? []), ...(DEAD_RULES5[file] ?? [])];
    const frames = (NATIVE_KEYFRAMES[file] ?? []).map((k) => `@keyframes ${k}`);
    for (const d of declarations(await read(file))) {
      if (!skip.includes(innermost(d.selector)) && !frames.includes(d.selector.split(" >> ")[0])) out.push({ file, ...d });
    }
  }
  return out;
};
const held = (d) => (HOLDS5[d.file] ?? []).some(([s, p]) => s === innermost(d.selector) && p === d.prop);
const LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(|\b(white|black|red|green|blue|gray|grey|silver|gold|yellow)\b/i;
const RETIRED = /var\(--(terminal-|text-color|accent-color|hover-color|spacing-|border-radius-|transition-)/;
const UNTOKENED_TIME = /(?<![\w-])\d*\.?\d+m?s\b|\b(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier|steps)\b(?![\w-])/;

test("P5 scope: NATIVE5 covers Phase 2's NATIVE, every listed selector exists, DONE5 is within PHASE5", async () => {
  for (const [file, sels] of Object.entries(NATIVE)) for (const s of sels) assert.ok((NATIVE5[file] ?? []).includes(s), `${file} ${s}`);
  for (const [file, sels] of Object.entries(NATIVE5)) {
    const present = new Set(declarations(await read(file)).map((d) => innermost(d.selector)));
    for (const s of sels) assert.ok(present.has(s), `${file} ${s}`);
  }
  assert.deepEqual(DONE5.filter((f) => !PHASE5.includes(f)), []);
});
test("P5 colour: finished files name colours through tokens only, except holds", async () => {
  assert.deepEqual((await decls5()).filter((d) => LITERAL.test(d.value) && !held(d) && !/^(content|font-family|grid-template-areas)$/.test(d.prop)).map(where), []);
});
test("P5 geometry: square corners", async () => {
  assert.deepEqual((await decls5()).filter((d) => /radius$/.test(d.prop) && !/^(0|var\(--radius-0\))$/.test(d.value)).map(where), []);
});
test("P5 type: families and type metrics only through tokens or the generated classes", async () => {
  const bad = (await decls5()).filter((d) => (d.prop === "font-family" && !/^(inherit|var\(--font-(sans|narrow|mono)\))$/.test(d.value)) ||
    (/^(font|font-size|line-height|letter-spacing|font-weight)$/.test(d.prop) && !/^(inherit|var\(--[a-z0-9-]+\))$/.test(d.value)));
  assert.deepEqual(bad.map(where), []);
});
test("P5 timing and variables: token-timed motion; no retired variable read; no theme-keyed rule", async () => {
  const d5 = await decls5();
  const bad = d5.filter((d) => (/^(transition|animation)(-duration|-timing-function|-delay)?$/.test(d.prop) && d.value !== "none" &&
    (UNTOKENED_TIME.test(d.value.replace(/var\([^)]*\)/g, "")) || /\ball\b/.test(d.value))) || RETIRED.test(d.value) ||
    (/\[data-theme/.test(d.selector) && !held(d)));
  assert.deepEqual(bad.map(where), []);
});
```

  An icon sized by `font-size` that renders no text joins an `ICON_SIZES5` exception only with the commit body naming it (Phase 3 Task 14 rule).
- [ ] **4.** Browser test, inside `if (MODE === "check") {` after Phase 3's invariants:
  - `tokenRgb(page, name, scope)` gains an optional `scope` selector: the probe is appended inside `document.querySelector(scope)` when given, so a P5-1 scoped control resolves its own token set. `P3_CONTROLS` entries may carry `scope`.
  - Append:

```js
  // Phase 5 (§03, §06): on each listed route, governed elements outside creative regions have square corners and a
  // Darkfield family. P5_NATIVE: native elements outside any region (they host controls or governed labels).
  const P5_ROUTES = [];
  const P5_NATIVE = [];
  const P5_FAMILIES = ["Archivo", "Archivo Narrow", "IBM Plex Mono"];
  for (const theme of THEMES) {
    for (const route of P5_ROUTES) {
      await withPage({ theme, route }, async (page) => {
        const bad = await page.evaluate(([skip, families]) => {
          const out = new Set();
          for (const el of document.querySelectorAll("body *")) {
            if (!el.getClientRects().length || el.closest("[data-df-region], svg") || el.matches("img, video, canvas, iframe") || (skip && el.closest(skip))) continue;
            const c = getComputedStyle(el);
            if ([c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].some((r) => r !== "0px")) out.add(`radius ${el.tagName}.${el.classList[0] ?? ""}`);
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            const family = c.fontFamily.split(",")[0].replace(/["']/g, "").trim();
            if (own && !families.includes(family)) out.add(`family ${el.tagName}.${el.classList[0] ?? ""} ${family}`);
          }
          return [...out].slice(0, 12);
        }, [P5_NATIVE.join(", "), P5_FAMILIES]);
        invariant(bad.length === 0, `${theme} ${route}: ${JSON.stringify(bad)}`);
      });
    }
  }
```

- **Verify:** static gate (no build change; no browser run needed beyond confirming the empty loops parse: run the foundation test once). **Ledger:** none. **Commit:** `refactor(web): add the Phase 5 surface scope, native selector list and invariants`

---

## Task 2: State signatures and form fields in the shared grammar

**Spec:** §13 *The state model* (Warning, Error, Confirmed), *Errors*, *Disabled, unavailable, stale*; §05 *State encoding*, *Semantic prominence* (Alarm, Caution); §12 *Traces*, *Reduced motion, by class*; §17 *Composite recipes*; §06 (typed values are Machine).

**Files:** `web/src/styles/darkfield/grammar.css`, `web/scripts/darkfield-surfaces.test.mjs`.

**Steps:**
- [ ] **0. Derived variables (P5-1).** Change the rule that declares `--df-scrim` from `:root` to `:root, [data-theme]` (value unchanged). Test: in `grammar.css` and every `DONE5` file, a custom property whose value reads a colour token is declared only in rules whose selector list contains `[data-theme]` (or on the element that uses it); `tokens.css` is out of scope. Computed values on `<html>` are unchanged (the reviewer reads `--df-scrim` on `<html>` before and after).
- [ ] **1. Test first:** `grammar.css` defines `.df-error`, `.df-error--alarm`, `.df-warning`, `.df-confirmed`, `.df-field`; each glyph `content` carries empty alt text (`/ ""`); the existing Phase 3 T3 test (tokens only, token timing) still passes.
- [ ] **2.** Append (comments in our words; values only tokens):

```css
/* Error (§13 Error; §05 Alarm at control scale): an annunciator cell, a bold fault frame; the message stays fg.
   The word is the element's own text; the glyph is hidden from assistive technology. */
.df-error { border: var(--stroke-bold) solid var(--fault); color: var(--fg); }
.df-error::before {
  content: "×"; content: "×" / "";
  display: inline-block; inline-size: var(--cell-w); block-size: var(--cell-h); line-height: var(--cell-h);
  margin-inline-end: var(--space-2); text-align: center; vertical-align: middle;
  background-color: var(--fault); color: var(--on-fault); font-family: var(--font-mono);
}
/* A system-integrity fault takes the full Alarm signature: the tile carries the state word, on the Alarm local field. */
.df-error--alarm { background-color: var(--fault-deep); }
.df-error--alarm::before { content: "× FAULT"; content: "× FAULT" / ""; inline-size: auto; padding-inline: var(--space-1); font-family: var(--font-narrow); font-weight: 600; letter-spacing: inherit; }
/* Warning (§13 Warning; §05 Caution): ∆, a hairline caution frame. */
.df-warning { border: var(--stroke-hair) solid var(--caution); color: var(--fg); }
.df-warning::before { content: "∆"; content: "∆" / ""; margin-inline-end: var(--space-2); color: var(--caution); font-family: var(--font-mono); }
/* Confirmed (§13 Confirmed): the › echo marker; the boundary starts at signal and decays to idle. */
.df-confirmed { border: var(--stroke-hair) solid var(--edge); color: var(--fg); animation: df-confirmed-decay var(--dur-decay) var(--ease-standard); }
.df-confirmed::before { content: "›"; content: "›" / ""; margin-inline-end: var(--space-2); color: var(--signal); font-family: var(--font-mono); }
/* §12: state transition (afterglow) · a result was confirmed */
@keyframes df-confirmed-decay { from { border-color: var(--signal); } 50% { border-color: var(--signal-dim); } }
/* §12: state transition (afterglow, reduced) · a single signal-dim step, then rest */
@keyframes df-confirmed-step { from { border-color: var(--signal-dim); } }
@media (prefers-reduced-motion: reduce) { .df-confirmed { animation: df-confirmed-step var(--dur-decay) var(--ease-snap); } }
/* Inputs and selects (§13 Idle and Error; §06 typed values are Machine). */
.df-field {
  box-sizing: border-box; border: var(--stroke-hair) solid var(--edge); border-radius: var(--radius-0);
  background-color: var(--field-deep); color: var(--fg); font-family: var(--font-mono);
}
.df-field::placeholder { color: var(--fg-faint); }
.df-field:is([aria-invalid="true"], :user-invalid) { border: var(--stroke-bold) solid var(--fault); }
```

- **Verify:** static gate. No markup uses the classes yet, so no browser run. **Ledger:** none. **Commit:** `feat(web): add Darkfield error, warning, confirmed and form-field signatures to the shared grammar`

---

## Task 3: Not found and error boundaries (P5-10)

**Spec:** §13 *Errors*, *The state model* (Error); §05 *Semantic prominence* (Alarm); §06; §12 Failure (*Prohibited*: no glitch on the error message).

**Files:** `web/src/pages/NotFound/{NotFound.tsx,NotFound.css}`, `web/src/components/common/{ErrorBoundary.tsx,AppErrorBoundary.tsx,ErrorBoundary.css}`, `web/src/components/Terminal/{TerminalErrorBoundary.tsx,TerminalErrorBoundary.css}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** add the three CSS files to `DONE5`; `P5_ROUTES` adds `/darkfield-404-probe`; a static check that `NotFound.tsx` and the three boundary TSX files carry `df-error` on their content container.
- [ ] **2. 404.** `.not-found-content` gets `df-error`. `.not-found h1` ("404", a status code: Machine) keeps tag and class context (it is in `PAIRS`), takes `df-readout-xl` and `color: var(--fg)`; delete its `--accent-color` read. `h2` → `df-heading-2`; `p` → `df-body`. Delete radii and literal type declarations.
- [ ] **3. Boundaries.** `.error-content` (both) and `.terminal-error-boundary .error-message` get `df-error df-error--alarm`; headings `df-heading-2`, text `df-body`; delete every `--accent-color` read (`.error-content h1`, `.app-error .error-content` border, `.error-info h4`) and gradients; `.error-info h4` → `df-label`; `pre` → `df-code`, ground `field-deep`, `rule` seam; `.error-details summary` → `df-control df-control--latch df-label` (delete `.error-details summary:hover`, which read the undefined `--hover-color`); `.error-reload-button` → `df-control df-label` (its colour, radius and hover rules go).
- [ ] **4.** The boundaries render only on failure. For the visual check, make a route chunk fail with `page.route(/\/assets\/OrbitalSimulator-[\w-]+\.js$/, (r) => r.fulfill({ status: 500 }))` before clicking an Orbital link from `/simulations`; Layout's `ErrorBoundary` renders.

- **Verify:** static gate; foundation test; `boot-shell`, `route-metadata`.
- **Visual:** `/darkfield-404-probe` and the forced boundary; dark, light, mono; 1440 and 375. Expect a `×` cell, a bold fault frame, plain text in `fg`, no accent yellow.
- **Ledger:** none (the 404 entries left in Phase 3). **Commit:** `feat(web): show not-found and caught errors with the Darkfield error signature`

---

## Task 4: Toasts and the modal (P5-9)

**Spec:** §13 *Confirmed*, *Error*, *Warning*, *Avoid* (celebratory messages, confirmations that do not state the consequence); §08 *Layers and overlays*; §07 excluded glyphs; §14 (icons).

**Files:** `web/src/components/common/{Toast.tsx,Toast.css,ToastContainer.css,Modal.tsx,Modal.css}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += the three CSS files; `Toast.tsx` imports no `faCheckCircle`, `faExclamationCircle`, `faExclamationTriangle`, `faInfoCircle`; each toast type maps to `df-confirmed`, `df-error`, `df-warning` or no state class. `P3_CONTROLS` adds `{ route: "/", prepare: open Settings then Export, selectors: [".toast-close"] }` and `{ route: "/", prepare: open Settings then Reset, selectors: [".modal-button", ".modal-close"] }`.
- [ ] **2. Toast.** Panel on `surface-2` with the state class's boundary (§08 overlay layer, `layer-overlay`), square; delete the type icon element, its CSS and the fills/gradients per type; title → `df-label`, message → `df-body-sm`; `.toast-close` → `toast-close df-control` (first class kept; `PAIRS` hover); the countdown bar is a hairline in `edge` (structure reporting time left), not a hue.
- [ ] **3. Modal.** `.modal-content` → `surface-2`, `edge` boundary, `df-cut-md` (primary dialog, Phase 3 class); `.modal-title` → `df-heading-3`; body `df-body`; `.modal-button`, `.modal-close` → `df-control df-label` (first class kept); `.modal-button-warning` and `.modal-warning` lose their hue (no warning exists until an action is armed; P3-5 arm-then-commit words stay with the owner). Gradients and literals go.

- **Verify:** static gate; foundation test; `settings-panel`, `boot-shell`.
- **Visual:** `/` with Settings → Export (toast), and Settings → Reset (modal); dark, light, mono; 1440, 375. Expect `›` and a decaying boundary on success, no check icon, no green fill.
- **Ledger:** none. **Commit:** `feat(web): report toasts as confirmed, warning or error states and square the modal`

---

## Task 5: Processing: the route loader and the home actions (P5-6)

**Spec:** §13 *Processing*, *The state model* (Processing; precedence over Disabled), *Feedback timing*; §12 class 3 *Scan / inspection*, *Reduced motion, by class* (Scan); §05 *State encoding* (Pending); §08 *Layers and overlays*; §06.

**Files:** `web/src/components/common/{PageLoader.tsx,PageLoader.css}`, `web/src/styles/darkfield/grammar.css`, `web/src/pages/Home/sections/{HeroSection.tsx,FeaturedProjectsSection.tsx}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += `PageLoader.css`; Phase 2's amended T3 test (row-form scan timed by `dur-scan` and `ease-linear`) still passes; `PageLoader.tsx` renders the state word in a `df-label` element and an elapsed counter in a `df-annotation` element, both mounted with the overlay (DEV-2); under reduced motion the scan cell is replaced by the static label §12 *Reduced motion, by class* gives for a scan; the two Home navigation buttons set `aria-busy` while their chunk loads.
- [ ] **2. Panel.** `.loader-content` becomes the overlay panel: `surface-2`, `edge` boundary, square, on Phase 3's `--df-scrim` (its text no longer sits on the scrim, Phase 3 hand-off). Phase 2's row and scan stay; the message keeps its words (`df-body-sm`, `fg-muted`).
- [ ] **3. Word and counter (§13 *Processing*, unmeasurable work).** The row adds the §05 pending word with its `…` glyph (`df-label`) and an elapsed counter (`df-annotation`, `fg-faint`) that steps once per second, through one `setInterval` cleared on unmount; under reduced motion it still counts (a value, not motion). Both mount with the loader overlay, at the site's existing loader timing (controller ruling: D11(a) stays open, so the §13 show-after constant is not published or coded). This is **deviation DEV-2**: the owner either publishes that constant under D11(a) or accepts the departure.
- [ ] **4. Home actions (Phase 3 hand-off).** `HeroSection.tsx` and `FeaturedProjectsSection.tsx` keep `disabled` and their words while `isNavigating…` is true, and add `aria-busy={isNavigating…}`. `grammar.css` gives `.df-control[aria-busy="true"]` the Processing signature, which outranks Disabled (§13 precedence): solid `edge` boundary, `fg-muted` label, `cursor: progress`, and the row-form scan: one cell travelling the lower edge of the control (`::after`, `cell-w` by `stroke-bold`, `fg-muted`, `var(--dur-scan) var(--ease-linear) infinite`, annotated `/* §12: scan / inspection · the route chunk is loading */`; reduced motion: none). The test asserts `grammar.css` declares it with those tokens.
- [ ] **5.** Long-wait content (stage or last event) does not exist; the random messages are not stages. Both go to the owner (Phase exit).

- **Verify:** static gate; foundation test; Mono worklist; `boot-shell`. **Visual:** Phase 2 Task 3's delayed-chunk capture, held past a counter step, and the same delay clicked from a Home action; dark, light, mono; with and without reduced motion. **Ledger:** none. **Commit:** `feat(web): show route loading and pending home actions as Darkfield processing`

---

## Task 6: Procedural animations index and piece bar

**Spec:** §06; §13 (controls); §08; master plan row (artworks and the reduced-motion pass-through must not change).

**Files:** `web/src/pages/ProceduralAnimations/ProceduralAnimations.css`, `web/src/pages/ProceduralAnimationPiece/{ProceduralAnimationPiece.tsx,ProceduralAnimationPiece.css}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += both CSS files; `P5_ROUTES` += `/procedural-animations` and the first piece route from `data/proceduralAnimations.ts`; `P3_CONTROLS` += `{ route: <piece route>, selectors: [".animation-piece__control"] }`.
- [ ] **2. Index.** Header `h1` → `df-heading-1`, intro `p` → `df-body-lg`; the poster image loses its radius (the image pixels are unchanged; corners are a frame property). Card internals not done by Phase 3 Task 13 take `df-heading-3`, `df-body-sm`, `df-label` (the "View piece →" text).
- [ ] **3. Piece bar.** `.animation-piece` ground → `var(--field-deep)` (the iframe covers it; each piece paints its own body ground); family `inherit`. Bar: `surface-1`, L1 `rule` seam. `.animation-piece__control` → `animation-piece__control df-control df-control--light df-label`; title → `df-heading-3`. Delete the bar's radius, the control's colour and hover rules, and `.animation-piece__frame:focus-visible` (Phase 1's global ring already overrides its outline).
- [ ] **Native:** `git diff --quiet <task base> -- web/public/procedural-animations`; the iframe box is unchanged at 1440×900 and 375×812; `procedural-animations` browser test passes (reduced-motion pass-through). No marker: the iframe and the poster image are excluded by element type (master plan Phase 6 rule).

- **Verify:** static gate; foundation test; `procedural-animations`, `route-metadata`, `boot-shell`.
- **Visual:** `/procedural-animations`, one piece route; dark, light, mono; 1440, 375; hover the bar control. **Ledger:** none. **Commit:** `feat(web): give the procedural animation index and piece bar Darkfield chrome`

---

## Task 7: Project media and the media inspector

**Spec:** §13; §08 *Layers and overlays*; §06; principle 5 (the `▍` label glyphs mark nothing).

**Files:** `web/src/components/ProjectMedia/{ProjectMedia.css,ProjectMedia.tsx,MediaInspector.tsx,MediaCaption.tsx}`, `web/scripts/darkfield-bridge.test.mjs`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += `ProjectMedia.css`; remove `components/ProjectMedia/ProjectMedia.css [data-theme="light"] .project-media__bar .project-media__control` from the bridge test's `ALLOW` (the r8 Light exception ends); every `<video>` and content `<img>` in the two TSX files carries `data-df-region="evidence"`; `P3_CONTROLS` += `{ route: "/case-studies/aether", selectors: [".project-media__control"] }` and the inspector's controls with a `prepare` that clicks "Inspect aether recording with playback controls"; `P5_ROUTES` += `/case-studies/aether`.
- [ ] **2.** `.project-media__control` → `project-media__control df-control df-label` (first class kept; `PAIRS` keep their selectors). View and actual-size buttons are Selected through their existing `aria-pressed`. Delete the Light exception rule, the control's colour, radius, hover and pressed rules, and both `▍` `::before` rules. Bar: `surface-1` band, L1 seam, `df-label` label. Caption: `df-body-sm`, term `df-label-sm`. Inspector: scrim from Phase 3; panel `surface-2`, `edge`, `df-cut-md`; title `df-label-lg`; stage `field-deep`.
- [ ] **3. Markers:** `data-df-region="evidence"` on the `<video>` and `<img>` elements only (no text inside, so `regions` and `creative` do not change; the focusable `.media-inspector__still` wrapper is not marked).
- [ ] **Native:** `git diff --quiet <task base> -- web/public/media`; asset boxes unchanged at 1440 and 375; `case-study-media` passes.

- **Verify:** static gate; foundation test; `case-study-media`, `boot-shell`.
- **Visual:** `/case-studies/aether` with the inspector open (recording and still views); dark, light, mono; hover `.project-media__control`. **Ledger:** none expected (the r8 Light pair is now a verified model pair). **Commit:** `feat(web): give project media chrome and the media inspector the Darkfield control model`

---

## Task 8: Simulations index and cards

**Spec:** §13 (card controls, Unavailable); §06; §08 *Not a dashboard*; D6 ruling (previews native, hold and markers confirmed).

**Files:** `web/src/pages/Simulations/{Simulations.tsx,Simulations.css}`, `web/src/components/SimulationCard/{SimulationCard.tsx,SimulationCard.css}` (governed selectors and the `.food-preview` hold only), `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += both CSS files; `.food-preview` reads no `--accent-color`; `P5_ROUTES` += `/simulations`; `P3_CONTROLS` += `{ route: "/simulations", selectors: ["a.simulation-card"] }`. **Mono group (12):** the Annals and Rhythm Lab card links hovered, focused and pressed (their `h3` and badge runs) must leave the worklist: the card's hover ground is the model's surface step and its texts are `fg` and `fg-muted` on it; worklist expected 61 → 49.
- [ ] **2. Local hold.** Before any other edit, give `.food-preview` its own value: in the native `.food-preview` rule replace both `var(--accent-color)` reads with `#FFD700` (the bridge's held value, identical across themes) under a comment naming the D6 hold. This is the one native-selector edit in this task. Run the native comparison now (previews must be identical).
- [ ] **3. Index.** Delete the `.simulations-container` variable definitions left by Phase 3 Task 20 after replacing their readers with tokens (`--terminal-primary` → `signal-dim` reads become role reads: title `fg`, subtitle `fg-muted`); `.simulations-container` family `inherit`; title `df-heading-1`, subtitle `df-body-lg`; `--spacing-*` reads become the equal `--space-*` tokens (`xs`→`2`, `sm`→`4`, `md`→`6`, `lg`→`8`, `xl`→`12`).
- [ ] **4. Cards.** `Link`/`a` `.simulation-card` → `simulation-card df-control df-control--card`; coming-soon `div.simulation-card.coming-soon` → `df-control--unavailable` (unrendered today; static only). `h3` → `df-heading-3`; `p` → `df-body-sm`; `.simulation-card-badge` → `df-label-sm df-context`; `.launch-button` → `df-label` text inside the card (its `::before` ground fill and hover rules go). The preview frame `.simulation-preview` → `field-deep` well, L1 `rule` boundary, square. **Named exception (inspected):** the frame clips the native preview (`overflow: hidden`), so squaring it exposes the preview content's own corner pixels that the rounded frame hid. The native comparison already forces the frame square on both builds (Task 3 `FIX`), so the content must still compare identical; the visual check inspects the four corners of all six previews and the commit body names the exception. Every governed `--terminal-primary`, `--border-radius-*`, `--transition-normal` read goes; the `.simulation-preview > *` hold and every `NATIVE5` rule stay byte-identical.
- [ ] **Native:** set `previews` (direct and from `/projects`), task base vs head and BASE vs head.

- **Verify:** static gate; foundation test (r9 navigation invariants, held preview font); `orbital` (it starts from `/simulations`), `boot-shell`.
- **Visual:** `/simulations`, hover a card; dark, light, mono; 1440, 375. Previews unchanged against base except the named corner exposure. **Ledger:** none. **Mono:** 49. **Commit:** `feat(web): give the simulations index and cards Darkfield chrome and hold the snake preview's food colour locally`

---

## Task 9: Orbital simulator controls, panels and readouts

**Spec:** §13 (controls, *Errors*, Warning, *Direct manipulation*), §06 (Instrument labels, Machine values, units beside values), §08 *Composition modes* (rail and field), §05 *When bright signal appears*.

**Files:** `web/src/pages/OrbitalSimulator/{OrbitalSimulator.tsx,OrbitalSimulator.css}`, `web/src/components/OrbitalSimulator/{SimulationControls.tsx,BodyInspector.tsx}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`. Not touched: `renderer.ts`, `OrbitalCanvas.tsx` (theme selection already done in Phase 1 Task 5).

**Steps:**
- [ ] **1. Test first:** `DONE5` += `OrbitalSimulator.css`; `P5_ROUTES` += `/simulations/orbital-simulator`; `P3_CONTROLS` += the route's `button`s (`.orbital-actions button`, `.orbital-primary`), the checkbox label and the header's `← Simulations` link. **Mono group (3):** that link's `:hover`, `:focus` and `:active` runs; worklist expected 49 → 46.
- [ ] **1a. Back link.** The header `Link` gets `className="orbital-back df-control df-control--light df-label"` (an operable breadcrumb, Phase 3's breadcrumb rule; its text and tag are unchanged, so its run ids hold); delete `.orbital-header a` and `[data-theme="light"] .orbital-header a`. Its hover, focus and pressed states take the model's grounds and labels in every theme.
- [ ] **2.** Buttons → `df-control df-label` (`.orbital-primary` "Play/Pause" is a plain control placed first, D8; it is Latched while running only if it already exposes `aria-pressed`; do not add state). Its `disabled={editing || …}` becomes `aria-disabled` with a guarded handler (Phase 3's Disabled rule; it is enabled at load, so `inactive` is unaffected); if `orbital` then fails on a disabled-state assertion, keep `disabled` and record it. Selects and number inputs → `df-field`. The checkbox: `label.orbital-checkbox` → `df-control df-control--latch`, lamp filled by `:has(> input:checked)`, the native box visually hidden but focusable, ring drawn on the label by `:has(:focus-visible) { box-shadow: var(--focus-ring); }`. Add the `:has(> input:checked)` lamp rule to `grammar.css`'s latch block only if Task 10 needs it too; otherwise keep it in `OrbitalSimulator.css`.
- [ ] **3.** Panels: `.orbital-panel` → `surface-1`, L1 seams (§08: shared rules, not boxed cards); the canvas field panel is the bounded system: `edge` boundary. `dt` → `df-label-sm`, `dd` → `df-data` (`fg`; a value changing now is Live: `signal` plus the weight step only while the simulation runs). Notes `df-body-sm`, eyebrow already Phase 3. `.orbital-warning` (simulation error, `role="alert"`) → `df-error`; the editor's own `<p role="alert">` → `df-error` beside its fields, and the field with the invalid value gets `aria-invalid="true"` (Task 2's `.df-field` error frame). "Step budget reached" note → `df-warning` (a real degraded state). The `signal-dim` reads Phase 3 Task 2 left where the alias coloured text or accents take their role (`fg`, `fg-muted`, or the model); `[data-theme="light"] .orbital-header a` and literals go.
- [ ] **Native:** set `canvas` for `canvas.orbital-canvas`.

- **Verify:** static gate; foundation test; `orbital` (line-196 note only; its role, heading and button-name queries must still pass), `boot-shell`.
- **Visual:** route at rest, running, with the inspector open and an invalid value entered; dark, light, mono; 1440, 375; hover and press the back link. Canvas unchanged. **Ledger:** none. **Mono:** 46. **Commit:** `feat(web): give the orbital simulator's controls, panels and readouts the Darkfield grammar`

---

## Task 10: Traffic simulator controls, panels and readouts

**Spec:** §13 *Direct manipulation*, controls, Error, Warning; §06; §08.

**Files:** `web/src/pages/TrafficSimulator/{TrafficSimulator.tsx,TrafficSimulator.css}` (controls, panels, readouts, warnings), `web/src/components/TrafficSimulator/{TrafficControls.tsx,TrafficReadout.tsx}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`. Not touched: `renderer.ts`, `RoadCanvas.tsx`, `SpaceTimeCanvas.tsx`.

**Steps:**
- [ ] **1. Test first:** `P5_ROUTES` += `/simulations/traffic-simulator`; `P3_CONTROLS` += `.traffic-actions button` and the header's `← Simulations` link (made `traffic-back df-control df-control--light df-label` as in Task 9, deleting `[data-theme="light"] .traffic-header a` and its base rule). **Mono group (3):** that link's `:hover`, `:focus`, `:active`; worklist expected 46 → 43; static: the range inputs carry `df-range`; `TrafficSimulator.css` reads no `--terminal-*`, `--brand-*`. (`DONE5` waits for Task 11, which finishes the file.)
- [ ] **2.** Buttons → `df-control df-label` (`.traffic-primary` plain, first, D8); selects → `df-field`; panels as Task 9; metrics `dt`/`dd` → `df-label-sm`/`df-data`; warning and step-budget notes → `df-error`/`df-warning` as Task 9.
- [ ] **3. Sliders (§13 *Direct manipulation*).** In `TrafficSimulator.css`, `.traffic-slider input[type="range"].df-range`: track an L2 `edge` hairline rail (`appearance: none`), end bars at `stroke-bold` in `edge` (hard limits), the thumb a filled square `signal` handle (`cell-w` square, `radius-0`, both `::-webkit-slider-thumb` and `::-moz-range-thumb`), no progress fill, focus ring from Phase 1. The value readout beside it is `df-data`. Step ticks: each slider's TSX sets `--df-range-steps` inline to its own `(max − min) / step` (data from the control, not a design value), and the track draws one `stroke-hair` tick in `edge` per step with a `repeating-linear-gradient` sized `calc(100% / var(--df-range-steps))`.
- [ ] **3a. Direct-manipulation states, recorded (§13 *Direct manipulation*).** Current: implemented (filled square handle, attached readout). Possible: implemented (rail and step ticks). Constraints: hard-limit end bars implemented; no soft limit exists in the model, so no `caution` ticks. Invalid region: none exists (the range clamps to its limits and every step is accepted), so no hatch is drawn. **Proposed and Committed: not implemented — a recorded deviation (DEV-1) for the controller.** These sliders apply on every input event, so no uncommitted value ever exists; §13's open proposed handle, `dash-provisional` link, commit-on-release snap, previous-value `signal-trace` mark and the Enter/Esc keyboard pair all require commit-on-release behaviour, which changes how the simulation responds. Options for the controller: keep live apply (default, DEV-1 listed for the owner), or a follow-up task adds commit-on-release. Arrow, Page and Home/End keys are the native range's.
- [ ] **4.** Signal lamps keep `SIGNAL_COLORS` (P5-2, inline style from the creative renderer); the lamp is a square cell (`radius-0`), its state word is the existing text.
- [ ] **Native:** set `canvas` for both canvases.

- **Verify:** static gate; foundation test; `boot-shell`. **Visual:** route at rest and after "Brake one car"; dark, light, mono; 1440, 375; drag a slider; hover and press the back link. **Ledger:** none. **Mono:** 43. **Commit:** `feat(web): give the traffic simulator's controls and readouts the Darkfield grammar, with direct-manipulation sliders`

---

## Task 11: Traffic legends and throughput chart (§15) (P5-2, P5-11)

**Spec:** §15 *Data visualisation*, *Composition of a large graphic*; §09 *Line hierarchy*; §12 *Stepped or smooth*; §13 *Inspect*; §05 *Rationing the secondary hues*.

**Files:** `web/src/pages/TrafficSimulator/{TrafficSimulator.tsx,TrafficSimulator.css}` (legend and chart rules), `web/src/components/TrafficSimulator/ThroughputChart.tsx`, `web/scripts/darkfield-css-scope.mjs` (`HOLDS5`), `web/scripts/darkfield-surfaces.test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += `TrafficSimulator.css`; `HOLDS5` records the ten `--traffic-speed-*` definitions and the five `.traffic-swatch-*` backgrounds (P3-9 / P5-2); `ThroughputChart.tsx` builds its path from horizontal-then-vertical segments only (no diagonal `L` between samples).
- [ ] **2. Chart.** Axes: L2 tick rails in `edge`; gridlines L0 (`rule`); no chart border; ticks and units `df-annotation` in `fg-faint`; subject series `signal` (Phase 3); demand line → `coolant` (comparison); crosshair `dash-measure` in `edge`, shown only while the pointer inspects (§13 *Inspect*: no ground change, brackets and readout); tooltip → Inspect readout (`df-data` value, `df-label-sm` unit) on `surface-2` with `edge`; the active-point marker is a node (`radius-node`, §17 *Corner radii*). Step line: each sample holds until the next (sample-and-hold).
- [ ] **3. Legend.** `.traffic-legend` text `df-label-sm`, ranges `df-data`; swatches square; the speed-ramp values stay (held). The data table `<details>` summary → `df-control df-control--latch df-label`; cells `df-data`, row rules L1.

- **Verify:** static gate; foundation test. **Visual:** run until two samples exist; hover the chart; dark, light, mono. **Ledger:** none. **Commit:** `feat(web): draw the traffic throughput chart and legends as Darkfield diagrams`

---

## Task 12: Terminal shell, cell grid and window chrome (P5-7)

**Spec:** §07 *The cell*, *Limits*; §06 (Machine voice, prompt glyph); §16 *Terminal cosplay*; §05 *Roles* (`field-deep` for terminal regions, `surface-2` header band); §13.

**Files:** `web/src/components/Terminal/{Terminal.tsx,Terminal.css,TerminalView.tsx,TerminalView.css,TerminalWindow.tsx,TerminalWindow.css}`, `web/src/types/terminal.ts`, `web/src/hooks/{useTerminal.ts,useTerminalCore.ts}` and the call sites Step 2a lists, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += `TerminalView.css`, `TerminalWindow.css` (`Terminal.css` joins in Task 14, when its alias blocks go); `P5_ROUTES` += `/terminal`; `P3_CONTROLS` += `{ route: "/terminal", selectors: [".terminal-button"] }`; static: `Terminal.css`, `TerminalView.css` and `TerminalWindow.css` read no `--terminal-*` colour alias.
- [ ] **2. Tokens.** Replace every `var(--terminal-<role>)` read in the three files with the token Phase 3 Task 21 mapped it to (`text-primary`/`text-info`/`selection-text` → `fg`, `text-muted` → `fg-muted`, `text-error` → `fault`, `text-success` → `signal`, `window-bg` → `field-deep`, `header-bg` → `surface-2`, `border` → `edge`, `selection-bg` → `signal-deep`), The alias blocks in `Terminal.css` stay until Task 14: `TopUI.css`, `VimUI.css` and `ManPageUI.css` still read them. `--terminal-window-width/height` are layout, not colour: keep.
- [ ] **2a. Inert typewriter field (Phase 2 hand-off).** Delete the `useTypewriter` field Phase 2 left inert: from `HistoryEntry` (`types/terminal.ts`), the `createHistoryEntry` and `addToHistory`-style signatures in `hooks/useTerminalCore.ts` and `hooks/useTerminal.ts`, the `line.useTypewriter` branch in `TerminalView.tsx`, and every call site `rg -n 'useTypewriter|createHistoryEntry\(' web/src` lists (the positional argument goes; output text is unchanged). Add those files to this task's paths in the commit body.
- [ ] **3. Cell grid.** Output lines, the prompt and the input use `df-glyph` (each character one cell; no letter-spacing, no other line height); error lines `fault` with the existing text; suggestions `df-data`. The route intro (`h1`, description) is Narrator: `df-heading-1`, `df-body`; the title's letter-spacing and clamp sizes go.
- [ ] **4. Window chrome (P5-7).** `.terminal-header` → `surface-2` band; title `df-label`. The three `.terminal-button`s lose the coloured dots and become `terminal-button df-control df-label` showing their existing `aria-label` text as visible text (drop the now-duplicate `title`/`aria-label`); words unchanged.

- **Verify:** static gate; foundation test (`/terminal` passes in three themes); `boot-shell`.
- **Visual:** `/terminal` after `help`, `ls -l`, a failing command, a `grep` (Phase 3 Task 21's set); dark, light, mono; 1440, 375. **Ledger:** none. **Commit:** `feat(web): set the terminal on the Darkfield cell grid and replace its window dots with labelled controls`

---

## Task 13: Terminal block cursor, only while accepting input (P5-8)

**Spec:** §12 *What may repeat* (the cursor's blink, limited to input), *Reduced motion, by class* (Liveness); §16 *Terminal cosplay*; §17 *Composite recipes* (Cursor), `dur-blink`, `ease-snap`; §05 (`flare`, `on-flare`); §11 *Rules* (`glow-flare` only while focused, Dark).

**Files:** `web/src/components/Terminal/{TerminalView.tsx,TerminalView.css,VimUI.tsx,VimUI.css}`, `web/scripts/darkfield-restraint.test.mjs` (`KEYFRAME_HANDOFF`), `web/scripts/darkfield-css-scope.mjs`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** in `darkfield-restraint.test.mjs`, `KEYFRAME_HANDOFF` loses `VimUI.css blink` (it becomes annotated and token-timed) and `TerminalView.css blink`, which moves to a new `KEYFRAME_DEAD` constant that the T10 skip also reads (unrendered `.cursor`; dead-code ruling); browser invariant on `/terminal`: with the command input focused, exactly one `.terminal-cursor` is visible and its computed background is `--flare`; after `input.blur()`, it is hidden; under `reducedMotion: "reduce"`, `document.getAnimations()` on it is empty.
- [ ] **2. Prompt cursor.** `.command-input { caret-color: transparent; }`. A sibling `<span class="terminal-cursor" aria-hidden="true">` is rendered only while `showPrompt` and the input has focus (`onFocus`/`onBlur` state). Its inline offset is `selectionStart × cell-w − input.scrollLeft` from the input's content edge (Plex Mono `glyph`: one character per cell; `cell-w` read from the computed style), recomputed on `input`, `select`, `keyup` and `scroll`; the same cursor serves the reverse-search input. With an empty value the block sits on the first cell of the placeholder and redraws that placeholder character in `on-flare`; it is `cell-w × cell-h`, `flare` fill; the character under it, if any, is drawn in `on-flare` by duplicating that character inside the span. Blink: `animation: terminal-cursor-blink calc(var(--dur-blink) * 2) var(--ease-snap) infinite` with `/* §12: liveness (cursor) · the prompt takes input */` above `@keyframes terminal-cursor-blink { 50% { opacity: 0; } }`; reduced motion: steady. `glow-flare` in Dark while focused (the token is `none` in Light).
- [ ] **3. Vim cursor.** `.vim-cursor` becomes the same block (`flare`, `cell-w × cell-h`), rendered only while the editor has focus; `VimUI.tsx` computes `left`/`top` from `cell-w`/`cell-h` read once from `getComputedStyle(document.documentElement)` instead of its numeric pixel literals (the editor's lines take `df-glyph`, so line height is `cell-h`). Annotate and token-time its blink as above.

- **Verify:** static gate; foundation test; `boot-shell`. **Visual:** `/terminal` focused and blurred; `vim` open, focused and blurred; dark, light, mono; capture without `reducedMotion` at two frames a half-period apart. **Ledger:** none. **Commit:** `feat(web): show a Darkfield block cursor only while the terminal accepts input`

---

## Task 14: Terminal overlays: top, vim, man pages

**Spec:** §07; §06; §12 *Traces* (afterglow), *Reduced motion, by class*; §16 *Gratuitous HUD elements*, principle 5 (owner hand-off for invented telemetry).

**Files:** `web/src/components/Terminal/{TopUI.tsx,TopUI.css,VimUI.css,ManPageUI.tsx,ManPageUI.css,Terminal.css}`, `web/scripts/darkfield-restraint.test.mjs`, `web/scripts/darkfield-surfaces.test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += four stylesheets: `Terminal.css`, `TopUI.css`, `VimUI.css`, `ManPageUI.css`; no `components/Terminal/*.css` file reads or defines a Terminal colour alias (`--terminal-text-*`, `--terminal-window-bg`, `--terminal-header-bg`, `--terminal-border`, `--terminal-selection-*`). The scope is the Terminal files only: the native `.snake-segment`, `.snake-segment-preview` and `.rhythm-note` read `--terminal-primary`, which the preview hold defines, and stay untouched; `--terminal-window-width/height` are layout and stay; `KEYFRAME_HANDOFF` loses `TopUI.css processUpdate` (the constant is then empty and is deleted with its use); the T10 annotation test covers the new keyframes.
- [ ] **2. Top.** Panel `field-deep`, header band `surface-2`, every text `df-glyph` or `df-data`, column headers `df-label-sm`, the selected process row the §17 selected-row recipe (`signal-deep` ground, `fg` text, key column `signal`, square node), sort-active header Selected via its existing `aria-sort` if present (else unchanged). `processUpdate` becomes afterglow on the changed row: `@keyframes top-afterglow { from { color: var(--signal); } 50% { color: var(--signal-dim); } }`, `var(--dur-decay) var(--ease-standard)`, annotated `/* §12: accumulation (afterglow) · a row's values changed */`; reduced motion: none.
- [ ] **3. Vim and man.** Same token, voice and square rules; mode line `surface-2`; man-page section headings `df-label`, body `df-glyph`; literal colours and gradients go. Then delete the colour alias blocks from `Terminal.css`: `rg -n 'var\(--terminal-(text|window-bg|header-bg|border|selection)' web/src` must print nothing first.

- **Verify:** static gate; foundation test; `boot-shell`. **Visual:** `/terminal` with `top`, `vim about.txt`, `man ls`; dark, light, mono. **Ledger:** none. **Commit:** `feat(web): give the terminal's top, vim and man overlays the Darkfield grammar`

---

## Task 15: Snake: re-ground the HUD and overlays, lift the font holds (C2, P5-5)

**Spec:** §13 (controls, Pressed); §08 *Layers and overlays*; §06; D6 ruling; C2 ruling.

**Files:** `web/src/components/SnakeGame/{SnakeGame.tsx,SnakeGame.css}`, `web/src/pages/SnakeGame/SnakeGame.css`, `web/scripts/darkfield-bridge.test.mjs` (`FONT_HOLDS`), `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`, `web/scripts/darkfield-known-deficiencies.json`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += both CSS files; `FONT_HOLDS` loses `.game-scores` and `.game-over-content`; `.game-board` carries `data-df-region="native"`; `P5_ROUTES` += `/simulations/snake`; `P3_CONTROLS` += `{ route: "/simulations/snake", selectors: [".touch-btn"] }` at 375×812 if the controls render only on touch widths (else static only) and the `.play-again-button` with a `prepare` that ends a game (move into a wall with the arrow keys).
- [ ] **2. Re-ground (C2).** `.snake-game-container`: delete the translucent dim and blur leftovers; ground `field-deep` (a well). `.game-scores`: ground `surface-1`, L1 seam, square, family `inherit`. `.game-score` → `fg` (`df-data` class appended; the `p` stays the first element with its text, so the two entries go STALE, not missing). Between Tasks 15 and 16 the whole "Score: N" string is in the Machine voice; Task 16 gives the label its Instrument voice; `.game-high-score` → `fg-muted`, its `--accent-color` read gone. Overlays → `--df-scrim`; `.game-over-content` → `surface-2` panel, `edge`, square, family `inherit`; `h2` → `df-heading-2`, sentence case (delete `text-transform` and letter-spacing; words unchanged); `p` → `df-body`.
- [ ] **3. Controls.** `.play-again-button` → `df-control df-label` (fill, label colour, hover and its transition go). `.touch-btn` → `df-control` (square; the `:active` fill rule goes: the model's Pressed inverse replaces it); `.touch-controls` loses `opacity` (opacity never lowers a control's contrast).
- [ ] **4. Marker (P5-5).** `data-df-region="native"` on `.game-board` (no text: `regions` and `creative` unchanged).
- [ ] **Native:** set `snake` (board, segments, food computed styles; `.food` keeps its `--accent-color` fallback read, value `#FFD700` with or without the bridge).

- **Verify:** static gate; foundation test (r9 navigation invariants); `boot-shell`.
- **Visual:** `/simulations/snake` at rest, paused (Space), game over; dark, light, mono; 1440, 375 (touch controls). Board pieces unchanged against base.
- **Ledger:** the 2 Light `/simulations/snake` entries (`contrast … main p|Score: 0|"Score:"` and `|"0"`) go STALE and are removed. **Commit:** `feat(web): re-ground the snake HUD and overlays on Darkfield surfaces and lift their font holds`

---

## Task 16: Snake HUD label and value (P5-12)

**Spec:** §06 *Rules* (pair voices; units and labels beside values).
**Files:** `web/src/components/SnakeGame/{SnakeGame.tsx,SnakeGame.css}`.
- [ ] Inside each HUD `p`, wrap the label words in `<span class="df-label">` and the number in `<span class="df-data">` with the same text and spacing (copy unchanged). Allowed only now: no ledger entry names these runs after Task 15.
- **Native:** set `snake`.
- **Verify:** static gate; foundation test; Mono worklist; `boot-shell`. **Visual:** `/simulations/snake`; dark, light, mono. **Ledger:** none. **Commit:** `feat(web): pair the snake score labels and values in their own voices`

---

## Task 17: Spider: lift the container, pin the cards, confirm the win (P5-5)

**Spec:** §06; §13 *Confirmed*, Disabled; D6 ruling (pin card values locally); master plan *Region marking*.

**Files:** `web/src/components/SpiderSolitaire/{SpiderSolitaire.tsx,SpiderSolitaire.css}`, `web/src/pages/SpiderSolitaire/SpiderSolitaire.css`, `web/scripts/darkfield-bridge.test.mjs` (`FONT_HOLDS`), `web/scripts/darkfield-css-scope.mjs`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs` (`HELD_FONTS`), `web/scripts/darkfield-known-deficiencies.json` (`creative` only, Step 5).

**Steps:**
- [ ] **1. Test first:** `DONE5` += both CSS files; `FONT_HOLDS` replaces `.spider-solitaire` with `.spider-card`; `HELD_FONTS` replaces the `.spider-solitaire` entry with `{ route: "/simulations/spider", selector: ".spider-card", stack: '"Courier New", Monaco, monospace' }`; `P5_ROUTES` += `/simulations/spider`.
- [ ] **2. Pin, then lift.** Add `font-family: "Courier New", Monaco, monospace;` to the native `.spider-card` rule (the value it inherits today); run the native comparison (identical). Then `.spider-solitaire`: family `inherit` (Narrator), `color: var(--fg)` stays. Split the reduced-motion grouped rule `.spider-card, .spider-button { transition: none; }` into `.spider-card { transition: none; }` (native, byte-identical declaration; add it to `NATIVE5`) and the `.spider-button` half (governed; Phase 3's model already times it, so delete the half if it is redundant); re-run the native comparison under `reducedMotion: "reduce"` and without it.
- [ ] **3. Chrome.** Stats: inside each `span`, the label words in a `df-label-sm` span and the number in a `df-data` span (text and spacing unchanged; no ledger entry names these runs); `.spider-win-banner` → `df-confirmed` (a result just happened; "cleared" is the past-tense verb), its fills go.
- [ ] **4. Marker (P5-5).** `data-df-region="native"` on `.spider-board`.
- [ ] **5. Re-record (master plan *Region marking*).** The marker moves the card rank text from governed measurement into `creative`. Apply the identical attribute to a fresh baseline: `git -C "$W" worktree add --detach "$DF_TMP/baseline-p5" 3c533b6`, `git -C "$DF_TMP/baseline" diff | git -C "$DF_TMP/baseline-p5" apply`, add the attribute to `SpiderSolitaire.tsx` there, link `node_modules`, serve on 4176, run the foundation test in `DARKFIELD_MODE=record` (dark, light). Replace only the `/simulations/spider` `regions` count and add only its new `creative` records (card-rank text now falls inside a region and counts toward `regions`), dark and light only, never Mono (D4(b)); the reviewer reproduces both from `baseline-p5`.
- [ ] **Native:** set `spider` (cards and columns; `.spider-column:empty` hold unchanged).

- **Verify:** static gate; foundation test; Mono worklist (unchanged count); `boot-shell`. **Visual:** `/simulations/spider` at rest and after a deal; dark, light, mono; 1440, 375. **Ledger:** no entries; `regions` (`dark|/simulations/spider`, `light|/simulations/spider`) re-recorded and `creative` gains the card records, both listed in the commit body. **Commit:** `feat(web): lift the spider page into Darkfield type, keep its cards native and mark the playfield`

---

## Task 18: Rhythm Lab I: re-ground, lift the root, pin the native (P5-1, P5-5, C2)

**Spec:** §05 *Roles* (`field-deep` under rain); §06; §10 *Atmosphere by context*; D6 ruling; P2-3; C2 ruling.

**Files:** `web/src/pages/RhythmLab/{RhythmLab.tsx,RhythmLab.css}` (`.rhythm-lab-page` ground and variables, the wrapper's `data-theme` only), `web/src/components/RhythmLab/RhythmLab.css` (`.rhythm-lab` root, governed readers of the page variables, native pins), `web/src/components/RhythmLab/RhythmHighway.tsx` (markers), `web/scripts/darkfield-bridge.test.mjs` (`FONT_HOLDS`, the `--text-color` exception), `web/scripts/darkfield-css-scope.mjs`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs` (`HELD_FONTS`, `P5_NATIVE`).

**Steps:**
- [ ] **1. Test first:** `DONE5` += `pages/RhythmLab/RhythmLab.css`; the bridge test's named `--text-color` exception (both halves) is deleted; `FONT_HOLDS` replaces `.rhythm-lab` with the native text pins of Step 3; `HELD_FONTS` likewise; `P5_NATIVE` += `.rhythm-lab-highway` (native lanes host governed labels and hit-zone buttons); `P5_ROUTES` += `/simulations/rhythm-lab`; browser invariant: in Light, inside `.rhythm-lab-page` the computed `--field` and the background of a probe styled `background: var(--df-scrim)` equal those of a probe inside a `[data-theme="dark"]` element, and `<html>` keeps `data-theme="light"`; every derived variable Task 2's test lists is probed the same way.
- [ ] **2. Scope and ground (P5-1).** `RhythmLab.tsx` reads `useTheme()` and sets `data-theme="dark"` on `.rhythm-lab-page` when the theme is `light` (no attribute otherwise). `.rhythm-lab-page`: `background: var(--field-deep)`; keep `color-scheme: dark` (every rendering of this page is on a dark ground under P5-1); delete `--terminal-primary` and `--text-color`. **Named, inspected change:** the page ground shows through the held rain canvas, so the composite under the rain darkens slightly; the rain canvas itself must be unchanged (native set `rain`). The rain element, its props, `.rhythm-lab-background` and `.rhythm-lab-page .matrix-rain-3d-background` are untouched.
- [ ] **3. Pin, then lift.** Native rules that read the page variables or inherit the root font get their current values literally: `.rhythm-lab-hit-zone` `color: #4caf50` and `font-family: "Courier New", Monaco, monospace`; `.rhythm-lab-status` the same family; any other `NATIVE5` element the computed-style check reports as changed gets its own baseline value. Run the native comparison (identical). Then `.rhythm-lab`: `color: var(--fg)`, family `inherit`. Every governed reader of `--terminal-primary` (22) reads a role token (headings and active labels `fg`; Selected and Live via the model in Tasks 19–20; until then `fg-muted`); `.rhythm-lab-lane-label` → `df-label-sm`, `fg-muted`.
- [ ] **4. Markers (P5-5).** `data-df-region="native"` on each `.rhythm-lab-note` span and on `.rhythm-lab-target-windows` (no text; `unmeasured`, `regions`, `creative` unchanged).
- [ ] **Native:** set `rhythm` (lanes, notes, target windows, hit zones, judgement words) and a `rain` set: the `.rhythm-lab-background` canvas captured alone (content hidden, page ground neutralised) at a frozen clock, task base vs head; if it is NONDETERMINISTIC, the fallback is `git diff --quiet <task base> -- web/src/components/MatrixRain3DBackground` plus an unchanged `<MatrixRain3DBackground …>` element and props in `RhythmLab.tsx` (diff hunk check) and an unchanged computed style of the canvas.

- **Verify:** static gate; foundation test (STATES Rhythm Lab zones and every `unmeasured` reason unchanged); `boot-shell`.
- **Visual:** `/simulations/rhythm-lab` at load, playing (clock steps), paused; dark, light, mono; 1440, 375. Rain and lanes unchanged against base; Light renders the Dark set. **Ledger:** none. **Commit:** `feat(web): re-ground rhythm lab on Darkfield tokens and lift its root while pinning native gameplay`

---

## Task 19: Rhythm Lab II: menus, panels, inputs and HUD

**Spec:** §13 (Selected, Latched, Disabled, controls); §06; §08 *Not a dashboard*; §15 (analytics figures).

**Files:** `web/src/components/RhythmLab/RhythmLab.css` (header, audio panel, song selector, chart controls, panel tabs, run history, analytics, HUD, active session bar, their `@media` forms), `web/src/components/RhythmLab/{RhythmLab.tsx,SongControls.tsx,ChartControls.tsx,RunHistoryPanel.tsx,RunAnalyticsPanel.tsx,ActiveSessionHeader.tsx}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** a `RHYTHM_GOVERNED` selector-prefix list in the surfaces test (the families named in Files) whose declarations obey the five P5 rules (`RhythmLab.css` joins `DONE5` in Task 20); `P3_CONTROLS` += `{ route: "/simulations/rhythm-lab", scope: ".rhythm-lab-page", selectors: [".rhythm-lab-song-selector-trigger", ".rhythm-lab-panel-tabs button", ".rhythm-lab-preview-button", ".rhythm-lab-chart-management-button"] }` with a `prepare` that dismisses the ready check only if they are covered (they must not be measured through the overlay).
- [ ] **2.** Buttons, tabs, triggers, options → `df-control df-label` (tabs and song options Selected by `aria-selected`/`aria-current`; add the ARIA the TSX lacks where a class encodes state, e.g. `.is-active` → `aria-selected`); mode and preview toggles → `--latch` by `aria-pressed`; the danger compact action loses the `fault` hue (P3-5). Inputs and the chart `select` → `df-field`; the file picker: the visually hidden input keeps Phase 2's proxy ring; the picker button is a `df-control`. Panels `surface-1` with L1 seams; analytics and history values `df-data`, labels `df-label-sm`, positive/negative deltas carry their sign in text (no hue alone, §05); HUD readouts `df-data`, `fg` (Live `signal` plus weight only while playing). Radii, gradients and literals in these families go.

- **Verify:** static gate; foundation test; `boot-shell`. **Visual:** menus open, history and analytics tabs, a song selected; dark, light, mono; 1440, 375. **Native:** sets `rhythm` and `rain`. **Ledger:** none. **Commit:** `feat(web): give rhythm lab's menus, panels and readouts the Darkfield control model`

---

## Task 20: Rhythm Lab III: overlays, tutorial, results and dialogs (C2)

**Spec:** §08 *Layers and overlays*; §13 (controls, *Avoid* confirmations without consequence); §06; C2 ruling; P3-5.

**Files:** `web/src/components/RhythmLab/RhythmLab.css` (overlay, tutorial, actions, summary, pause, modal backdrop, dialogs, eyebrow, kickers), `web/src/components/RhythmLab/{RhythmLab.tsx,ReadyCheckPanel.tsx,PauseMenu.tsx,RunSummaryPanel.tsx,RhythmLabTutorial.tsx,RhythmLabDialogShell.tsx,DeleteChartDialog.tsx,ClearRunHistoryDialog.tsx,ImportChartMismatchDialog.tsx}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Test first:** `DONE5` += `components/RhythmLab/RhythmLab.css`; `.rhythm-lab-overlay` and `.rhythm-lab-overlay-panel` elements keep their exact class lists (static check over the TSX); `rhythm-lab-eyebrow` and every `rhythm-lab-modal-kicker` carry `df-label`; `P3_CONTROLS` += the ready-check Start (`.rhythm-lab-primary-action`, scope `.rhythm-lab-page`).
- [ ] **2. Re-ground (C2).** `.rhythm-lab-overlay` → `--df-scrim`; `.rhythm-lab-overlay-panel`, `.rhythm-lab-delete-dialog`, `.rhythm-lab-clear-history-dialog` → `surface-2`, `edge`, square (style through their existing classes; the dialogs, not the overlay panel, may take `df-cut-md`); `.rhythm-lab-modal-backdrop` → `--df-scrim`.
- [ ] **3. Voices and controls.** Eyebrow and kickers `df-label`; overlay `h2` and the tutorial headline `df-heading-2` sentence case; detail text `df-body`; summary score `df-readout-xl` (`fg`; Live only while counting), metrics `df-data`/`df-label-sm`; warnings → `df-warning` where a real degraded state is reported; `.rhythm-lab-primary-action`, `.rhythm-lab-secondary-action`, `.rhythm-lab-danger-button` → `df-control df-label` (no fills; danger loses `fault`, P3-5).

- **Verify:** static gate; foundation test (`unmeasured` reasons unchanged); `boot-shell`. **Visual:** ready check, tutorial, pause, results, delete dialog; dark, light, mono. **Native:** sets `rhythm` and `rain`. **Ledger:** none. **Commit:** `feat(web): re-ground rhythm lab's overlays and dialogs and give their actions the Darkfield control model`

---

## Task 21: Annals I: lift the root, scope the chrome, voice the text (P5-3, P5-2)

**Gate:** the controller has ruled P5-3. Steps below implement option B; if A is ruled, this task is re-planned before it runs.

**Spec:** §06; §05 *State encoding*, *Rationing the secondary hues* (`ion` for human marks); §15 (legends); D6 ruling.

**Files:** `web/src/pages/Annals/{Annals.tsx,Annals.css}`, `web/scripts/darkfield-bridge.test.mjs` (font test: the Annals directory skip becomes `FONT_HOLDS` entries), `web/scripts/darkfield-css-scope.mjs`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`, `web/scripts/darkfield-known-deficiencies.json`.

**Steps:**
- [ ] **1. Test first:** the font test stops skipping `pages/Annals/` and adds `["pages/Annals/Annals.css", ".annals-page .font-mono"]` to `FONT_HOLDS` (native utility; the serif stacks fall outside the legacy pattern); `P5_ROUTES` += `/simulations/annals`; `P5_NATIVE` += `.annals-sheet` (native parchment box); new Annals rules live after the utilities under a `/* Governed Annals chrome (D6 ruling) */` comment and obey the P5 rules (`Annals.css` joins `DONE5` in Task 22).
- [ ] **2. Pin, then lift.** Each of the six markers keeps what it inherits from `.annals-page` today: markers outside a `.font-mono` ancestor (header tagline, "no fates diverged" line, feuds list, "None yet") get the root serif stack; every marker that has no colour class of its own gets `color: #1c1917`. Write one pin rule per group, by the narrowest selector that matches only that group, and run the computed-style check on the base build first to list exactly which marker inherits which property. Run the native comparison (identical). Then `.annals-page`: family `inherit`, `color: var(--fg)`, `color-scheme` removed.
- [ ] **3. Scope (P5-3 B).** `data-theme="light"` on `.annals-sheet` (the parchment is paper in every theme). Browser invariant: in Dark and Mono, inside `.annals-sheet` the computed `--fg`, `--edge` and a `var(--df-scrim)` probe equal those inside a `[data-theme="light"]` probe element. Ruled (progress.md): the parchment ground behind the governed chrome is native; Phase 6 reports its pixels as native, not as a governed Mono leak.
- [ ] **4. Text.** `h1` → `df-heading-1`; the year readout → `df-readout-xl` with `Yr` split into a `df-label` span (text unchanged); census line `df-data`; section `h2`/`h3` names ("The Chronicle", "The Living", "Standing Feuds", "Intervention Log", "Fates That Diverged", "Houses", "Your Hand") → `df-label` (`fg-muted`); a phrase nested in such a heading ("· spent (every 3rd year)", "what your hand changed by year N") stays in the Narrator voice (`df-body-sm`, no uppercase, sans), never an uppercase label; hints and footer → `df-body-sm`, `fg-muted`; the intervention log → `df-data` on `field-deep` with L1 seams; the favourite banner → `ion-deep` band, `ion` boundary, `fg` text (a person's pin, §05). Governed elements drop the conflicting utility classes after their first class.
- [ ] **5. Ledger targets.** `h2` span "· spent (every 3rd year)" (class `text-stone-400` stays first): Held → `fg-muted`. `h2` span "· available" (`text-yellow-700` first): available → `signal`. Legend "Gold lines are your hand": the span's text → `fg`; a `::before` key cell in the chronicle's gold (`#a16207`, the native `text-yellow-700` value) is a P5-2 hold in `HOLDS5`. The fork legend `●`/`○` keys follow the same rule.
- [ ] **Native:** set `annals` (six regions; `.annals-sheet` computed style).

- **Verify:** static gate; foundation test (STATES Annals `texts`; `creative`, `regions` unchanged); `boot-shell`.
- **Visual:** `/simulations/annals` at load, after three years (verbs available), with a soul watched; dark, light, mono; 1440, 375. Parchment and narrative unchanged against base.
- **Mono group (3):** the "your hand" legend run, the "· spent" heading run and the prepared "· available" state leave the worklist; expected 43 → 40.
- **Ledger:** 6 entries go STALE and are removed: `contrast … "your hand"` (dark, light), `contrast … h2|Your Hand · spent` (dark, light), `state … Your Hand · available:prepared` (dark, light). **Commit:** `feat(web): set the Annals chrome in Darkfield voices on its parchment and keep the narrative native`

---

## Task 22: Annals II: controls, verbs and roster (P5-4)

**Spec:** §13 (*The state model*, Disabled, Selected, *Selection versus transient states*); §06; P5-4.

**Files:** `web/src/pages/Annals/{Annals.tsx,Annals.css}`, `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs` (inactive classification, STATES prepare, `P3_CONTROLS`), `web/scripts/darkfield-known-deficiencies.json` (entries, `inactive`, two notes).

**Steps:**
- [ ] **1. Test first:** `DONE5` += `pages/Annals/Annals.css`; `P3_CONTROLS` += `{ route: "/simulations/annals", scope: ".annals-sheet", selectors: [".annals-living button", <seed and replay buttons by role name>] }`. In the browser test: the inactive classification (`disabled: el.matches(":disabled")` and the interaction pass's skip) also matches `[aria-disabled="true"]`; the Annals STATES `prepare` counts `button:is(:disabled, [aria-disabled="true"])`.
- [ ] **2. Controls.** Every Annals `button` → `df-control df-label-sm` (roster buttons `df-control--card`, their `★`/`·` glyph `fg-muted`), seed input → `df-field`; drop their colour, border, radius, hover and `transition` utilities after the first class; pressed verbs and the watched soul are Selected through the existing `aria-pressed`; delete `.annals-page button[aria-pressed="true"]` and `.annals-page button:focus-visible` (Phase 1's ring governs focus); `.annals-page .ring-1` users become Selected and the rule is deleted if unused.
- [ ] **3. Verbs (P5-4).** Replace `disabled={!world.token}` with `aria-disabled={!world.token}` and return early in the handler when `!world.token`; the reason stays the existing hint text.
- [ ] **4. Re-record `inactive`.** The 12 observations change value (the disabled signature on paper). Replace them with the head's `INACTIVE` lines for the same ids, dark and light only (no Mono record, D4(b)); the reviewer reproduces each.
- [ ] **5. Notes.** Delete the note beginning `Annals roster glyph`; replace the note beginning `Annals verbs ("Your Hand")` with one that states the verbs are §13 Disabled (`aria-disabled`), classified inactive, re-recorded in this task.
- [ ] **Native:** set `annals`.

- **Verify:** static gate; foundation test; `boot-shell`. **Visual:** load, verbs available, a verb pressed, a soul watched, fork shown; dark, light, mono; 1440, 375; hover a roster button.
- **Ledger:** the 80 roster entries go STALE and are removed (`text` "·" ×10 per theme, `interact` ×30 per theme); `inactive` re-recorded (12); two notes. Entries now 0. **Mono group (40):** the 10 roster "·" text runs and 30 roster interaction runs leave the worklist; expected 40 → **0**. **Commit:** `feat(web): give the Annals controls the Darkfield control model and make its verbs focusable when disabled`

---

## Task 23: Retire `--accent-color` and delete the bridge

**Files:** delete `web/src/styles/darkfield/bridge.css`; modify `web/src/index.tsx`, `web/src/contexts/ThemeContext.tsx`, `web/scripts/darkfield-bridge.test.mjs`, `web/scripts/darkfield-grammar.test.mjs`, `web/scripts/darkfield-restraint.test.mjs`, `web/scripts/darkfield-css-scope.mjs`.

**Steps:**
- [ ] **1.** `rg -n 'var\(--accent-color' web/src -g '*.css' -g '*.tsx'` lists only `SnakeGame.css` native `.food` (with its `#FFD700` fallback) and `DEAD` files; anything else is a stop.
- [ ] **2. Tests first:** bridge test: `HELD` and the fence test become "no `bridge.css` exists and no file defines `--accent-color`"; theme-source, retired-alias, ground-text, boot-shell and font tests keep their assertions. Grammar test: T2 asserts the file is absent; T3's import-order list drops `bridge.css`. Restraint test: the scope test's reachability list drops `bridge.css`; T1's `--bg-` check reads nothing. `OUTSIDE` drops it.
- [ ] **3.** `git rm` the file; delete its import from `index.tsx`; update the comment above `applyThemeToDocument` in `web/src/contexts/ThemeContext.tsx` so it no longer names `bridge.css`.
- [ ] **Native:** sets `snake` (the native `.food` reads `--accent-color` and now always takes its `#FFD700` fallback) and `previews`.

- **Verify:** static gate; foundation test; `boot-shell`, `settings-panel`, `header-overlap`. **Visual:** none (no rendered value changes; the reviewer confirms with Phase 3 Task 2's computed-style snapshot, which must show no difference). **Ledger:** none. **Commit:** `refactor(web): retire the last held legacy colour and delete the Darkfield bridge`

---

## Task 24: Phase 5 exit sweep

**Files:** every `PHASE5` stylesheet the tests name, `web/src/index.css` (dead legacy definitions only), `web/scripts/darkfield-surfaces.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Tests first:** `DONE5` equals `PHASE5` (assert); `P5_ROUTES` contains every Phase 5 route of `ROUTES` plus one piece route; the P3 frames invariant (Phase 3 Task 17) runs on `P5_ROUTES`, its allowed list extended with `.df-error, .df-warning, .df-confirmed, .df-field` and the simulation field panels.
- [ ] **2.** Fix what the tests report, in the files they name. Keep `--border-radius-*` in `index.css`: the native `.spider-preview`, `.rhythm-preview` and `.annals-preview` read `--border-radius-md` with no fallback (and `.annals-sheet` with one). Delete `--transition-normal` only if `rg` finds no reachable non-`DEAD` reader; `--spacing-*` stays (`index.css` reads it).
- [ ] **3. Region audit.** List every creative container (master plan *Region marking*) and its mark or exclusion: previews (six markers), Annals (six), Snake and Spider boards, Rhythm notes and target windows, media assets (`evidence`), canvases and iframes (element type). Unmarked native boxes outside regions (`P5_NATIVE`: Rhythm Lab lanes and hit zones, the Annals sheet) go into the report for Phase 6.

- **Native:** every set, task base vs head and BASE vs head.
- **Verify:** static gate; foundation test; Mono worklist (0); all seven named browser tests. **Visual:** every Phase 5 route; dark, light, mono; 1440 and 375. **Ledger:** none. **Commit:** `fix(web): finish the Darkfield sweep of the surfaces around creative and native content`

---

## Phase exit (no commit)

- [ ] Static gate passes; foundation test passes in check mode (`dark,light`); the seven named browser tests pass (orbital line-196 note only).
- [ ] Mono record run: the worklist holds **0** entries (Phase 3's 27 and Phase 5's 61 cleared). Phase 6 then flips D4 to (a), adds Mono scope records and adds `mono` to check mode; Phase 5 does none of this.
- [ ] Native comparison of every set: task-base vs head and BASE vs head, all SAME.
- [ ] Ledger: **0 entries**. Remaining for the final report (not accepted by D10 or outside it): `unmeasured` 38 (Rhythm Lab overlay coverage, unchanged); `creative` 20 plus Task 17's Spider records (D6 evidence); `inactive` 12, re-recorded in Task 22; notes expected to remain (subject to Phases 2–3): `scripts/orbital-browser-test.mjs:196`, the marker baseline note, the re-written Annals verbs note, `r7's Annals parchment readings`, `Rhythm Lab: the lane tap zones`, `Unverified (never measured by this test)` (Annals conditional text, fork and copy-log controls stay unmeasured), `Light background residual`, `Limits of the rendered runs`, the 1280×800 section-dots note.
- [ ] Mono screenshots of every Phase 5 route with atmosphere as is (Rhythm Lab rain held); §16 three-question check per route, reviewer judgement in the report.
- [ ] Hand-offs recorded: **Owner** — P2-3 Rhythm Lab rain (and then Phase 2 Task 2); Background animation/Speed labels and note; `data/manPages.ts` naming `MatrixBackground` and "Matrix-style theming"; PageLoader fake-progress messages and TopUI's invented process table (principle 5, §16); "Oops! Something went wrong" and other dramatic error copy; P3-5 arm-then-commit words (settings reset modal, Rhythm Lab delete and clear dialogs); P5-7 terminal button labels; `★`, `●`, `○`, `⚔` glyphs in Annals and Snake/Spider copy (§07 excluded or unlisted glyphs); the Spider win banner's exclamation; label-in-one-string readouts (`Yr`, "Final Score:"); the terminal prompt text `portfolio@kareem-sasa:…$` (§16 *Terminal cosplay*: a host-style prompt; copy); loader long-wait stage or last-event content (§13 *Processing*) DEV-2 (loader show-after constant: publish under D11(a) or accept); DEV-1 (Traffic sliders apply live: no Proposed/Committed states). **Phase 6** — Mono residual on the Annals sheet (P5-3 B); P5-2 palette mirrors in Mono; unmarked native boxes (`P5_NATIVE`); `ICON_SIZES5`; the loader and cursor §12 annotations' class names.

## Risks and stop conditions

The master plan's stop conditions apply. Phase-specific:

1. **Native drift.** Any DIFF in the native comparison, or a computed-style change on a `NATIVE5` element, is a stop. Restyling a native visual is not reversible by review. Pins go in before lifts, in the same task, and are compared before the lift.
2. **Ledger identity.** A measured element that loses its tag, first class or text turns its entries `missing`: stop. Never add a class to `.rhythm-lab-overlay` or `.rhythm-lab-overlay-panel`.
3. **Scoped themes (P5-1, P5-3).** A `[data-theme]` rule in a component stylesheet could match the scoped wrapper's ancestors; none exists in the Rhythm Lab or Annals files today (inventory). A Phase 5 rule keyed on `[data-theme]` is rejected by the P5 static test.
4. **Records changed outside an authorization.** Only Task 17 (`regions` and `creative`, Spider) and Task 22 (`inactive`, Annals verbs) re-record, dark and light only; the reviewer reproduces each value on the build that defines it. Any other `regions`, `unmeasured`, `creative` or `inactive` change is a stop.
5. **Disabled at load.** Converting a control that renders disabled at load changes `inactive`; only the Annals verbs are expected. Another one is a stop.
6. **Determinism.** A native set that is NONDETERMINISTIC base-vs-base relies on the computed-style check alone; the reviewer confirms the fallback was reported.
7. **Mixed files.** A hunk outside a task's named selectors in `SnakeGame.css`, `SpiderSolitaire.css`, `RhythmLab.css`, `SimulationCard.css`, `Annals.css`, `SimulationCard.tsx` or `pages/RhythmLab/*` fails review; creative-owned paths are never edited.
8. **Spec ambiguity.** P5-1…P5-12 are readings, not rulings; P5-3 must be ruled before Task 21. If the controller overrules one, amend the task before it runs.
9. **Disclosure.** Plan, code, comments, tests and commits name tokens and sections only. Time thresholds (the loader's show-after, arm-then-commit windows), hatch pitch, node and chamfer sizes and display-line counts are never written; a reviewer who finds a specification number in a diff stops the task.
