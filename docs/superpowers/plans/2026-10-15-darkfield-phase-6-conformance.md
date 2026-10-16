# Darkfield Phase 6 (Conformance measurement and migration close-out) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. One task, one commit, an independent reviewer between tasks (master plan, *Operational safety*). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Measure the finished governed interface against the specification, make every limit-free requirement a committed invariant, keep every specification-limited requirement local (limits read at run time from the private canonical clone) or reviewer-judged, then close the migration: release Mono in Settings (D4(a)), record the end state in `AGENTS.md` and the master plan, run the full suite, and write the final report in `$DF_TMP`.

**Authority (read in `$DF_TMP/darkfield` before each task):** README *02 · Design principles* (principles 2, 3, 6), *Using the system*; §03 *Rules*; §05 *How much of each*, *Monochrome*, *Contrast, verified*; §06 *Rules*; §08 *Balancing density and emptiness*; §10 *Global limits*, *The zero-effects test*; §11 *Glow tokens*, *Rules*, *Light theme*; §12 *The six classes*, *What may repeat*, *Concurrency budget*, *Reduced motion, by class*, *Decorative motion to remove* (its final test); §13 *Focus in each theme*; §16 *The three-question check*; §17 *Corner radii*, *Chamfers*, *Glow strength and focus*, *Not tokenised*; §18 *Adopted mark*; `r1/SPEC.md` §1. The master plan's *Phase 6: Conformance measurement* table is the scope; its *Scope boundary*, *Global Constraints*, *Operational safety* and *Validation model* apply unchanged.

**Inventory base:** `4c273a3` (Phase 1 Task 5). **Execution base:** HEAD after Phase 5 exits (Phase 1 Tasks 6–7, Phases 2–5 committed). Step 0 records it. Lines are at `4c273a3`; locate code by anchor.

### Decisions this plan relies on

| Label | Decision | Status |
|---|---|---|
| D11(a) | Open. No committed file, test, comment or commit message states a specification-defined limit. Limit checks read limits at run time from the canonical clone, or are reviewer-judged (table below) | Open (owner) |
| D4(b) interim → (a) | Mono supported, not offered, until the Mono worklist is 0; Phase 6 Task 11 flips to (a), adds Mono scope records from the candidate (never Mono `entries`), and check mode becomes `dark,light,mono` | Delegated rulings (progress.md, Task 5) |
| P5-3 (B) | Annals parchment ground behind governed chrome is native; the Mono hue-leak check reports its pixels as native (measurement-only exclusion, listed separately) | Delegated ruling, flagged to owner |
| D3, D5–D8, chamfer, dead-code, P2-3, P3-3, P3-5, P4-1, P4-4, P5-1…P5-12, DEV-1, DEV-2 | As recorded in progress.md and the Phase 2–5 plans | Delegated rulings / recorded deviations |
| D10 | 136 entries accepted for Phase 1 deferral; Phases 3 and 5 retire all of them | Owner, 2026-10-15 |

**Planner proposals (controller confirms before the named task):**

| Id | Proposal | Task |
|---|---|---|
| P6-1 | Limits come from the pinned commit's blobs in `$DF_TMP/darkfield` through named extractors; an override file is accepted only from a path outside the repository; the reader prints limit names and `ok`/`missing`/`conflict`, never values | 1 |
| P6-2 | Mono hue-leak threshold = the maximum chroma (max−min channel, 8-bit) of the Mono colour tokens, read from `tokens.css` at run time (0 at `4c273a3`), plus 2. The 2 is rendering arithmetic, not a specification value: each channel of a composited pixel may round by one level in either direction, so a neutral source can show at most 2 between channels. Exclusion boxes are dilated by 1 px for fractional box edges | 10 |
| P6-3 | Area shares: governed pixels classified to the nearest colour token of the active theme within CIE76 ΔE ≤ 2.3 (a common just-noticeable-difference figure; CLI-adjustable, reported in every output), else `unclassified`; text pixels found by a hide-text diff and attributed to the computed colour of their text run; a colour shared by tokens of different tiers is `ambiguous`. Each tier reports a lower and an upper bound; the verdict is PASS when the unfavourable bound passes, FAIL when the favourable bound fails, else BORDERLINE (human verdict) | 2, 3 |
| P6-4 | The governed area is the denominator for shares and the void; the viewport share is reported beside it | 3 |
| P6-5 | `MEASURE_NATIVE` excludes only a native element's **own paint** (its background, border and shadow; in pixel layers, its box minus the boxes of its governed descendants), never its subtree. Entries: Phase 5's `P5_NATIVE` elements (Rhythm Lab lanes and hit zones, `.annals-sheet`) and the P5-2 mirrors `.traffic-swatch` and `.traffic-signal-lamp`. Governed chrome inside them stays measured by Tasks 6, 8, 9 and 10. Reported separately (P5-3 precedent). In Mono, pixels of the sheet's own ground are native (P5-3 ruling); any governed descendant whose Light-token ink leaks hue, and the Annals legend key cells (a `::before` P5-2 hold), are named deviations per exact selector in `MONO_DEVIATIONS` (reason P5-3 or P5-2), listed in the report | 2, 10 |
| P6-6 | Motion invariants run in the first theme of `THEMES` only: §12 *The same in every theme* makes motion theme-independent. The measurement script still captures every theme | 9 |
| P6-7 | Article (`/writing/:slug`) and procedural-piece routes join the browser test's `ROUTES`; their `regions`/`unmeasured`/`creative`/`inactive` records are taken from the candidate with a ledger note (Task 5 Mono precedent). Aliases (`/work`, `/games/*`) are not added | 5 |
| P6-8 | A new invariant that fails at the task base is a stop for that task. The controller orders a fix task (R-n: one concern, one commit, Phase 3/5 rules, inserted before the invariant lands) or records a deviation (DEV-n) and the invariant carries a named exception citing it | 5–10 |
| P6-10 | AGENTS.md *Operating Rules* sentence: minimal end-state wording ("committed in this repository", not "published"); flagged for the owner (controller ruling) | 12 |
| P6-9 | `liveness` is accepted as the §12 annotation class for the heartbeat and the cursor (they are §12 *What may repeat* rows and the *Reduced motion, by class* Liveness row, not one of the six class headings) | 4 |

### What Phase 6 does not change

- Creative-owned paths, `NATIVE`/`NATIVE5`/`NATIVE_KEYFRAMES` selectors, `data-df-region` markers, the held Rhythm Lab rain (P2-3) and its settings.
- Rendered output, except Task 11 (one Settings option) and any R-n fix task the controller inserts.
- Copy; the D10 acceptance text; `package.json`, CI, `.gitignore`, infrastructure.
- Pre-existing dead code (`DEAD`, `DEAD_RULES`, `DEAD_RULES5`, `LEGACY_DEAD`): reported for owner cleanup.

---

## Measurement model

**Governed interface** (master plan Phase 6): the viewport minus `[data-df-region]`, `iframe`, `canvas`, `video` and content `img`/`picture` boxes (every `img` on this site is content; the R1 mark is inline SVG and stays governed). Focus, keyboard and forced-colours checks exclude nothing. Every report states, per view: excluded share, creative-region share (`[data-df-region]` only), `MEASURE_NATIVE` share.

**Views:** every route in `ROUTES` plus every `/writing/<slug>` (from `src/data/generated/articles.ts`) and `/procedural-animations/<slug>` (from `src/data/proceduralAnimations.ts`); themes dark, light, mono; viewports 1440×900, 1280×800, 1920×1080, 768×1024, 375×812 (Task 3 Step 9 set); scroll top.

**Per-row disposition (D11(a)):**

| Requirement | Committed (public, limit-free) | Local only (`darkfield-measure.mjs` + limits read at run time) | Reviewer |
|---|---|---|---|
| Area budgets (§05 *How much of each*) | Classification library and its unit tests (Task 2) | Tier shares with bounds vs the §05 limits; the R1 mark's `signal` pixels listed (Phase 4 hand-off) | BORDERLINE verdicts; state hues present only when a state exists |
| Largest void (§08) | Component algorithm and tests | Largest 4-connected component of `grid-unit` square cells (the master plan's 8 px cell) that are field, vs the §08 limit | — |
| Emission (§11 *Rules*, *Light theme*) | Governed shadows are `none`, the focus ring while focused, or a glow token; Light renders none (Task 8) | `glow-signal`, `glow-flare` and `flare`-fill element counts per view vs limits | Glow only on live elements (three-question check) |
| Mono (§05 rule 7, Principle 3) | Hue-leak invariant, DOM and pixels (Task 10) | — | Reading order on Mono screenshots |
| Zero effects (§10) | — | Screenshots with atmosphere candidates hidden; candidate list per view | Identity and information intact; effect count vs §10 limit |
| Motion, idle (Principle 6) | After a 3 s settle, running governed animations ⊆ `IDLE_ALLOWED`; 2 s governed diff is zero outside `LIVE_READOUTS` (Task 9) | `IDLE_ALLOWED` heartbeat rows per view vs the Principle 6 allowance | Each allowed row's condition holds |
| Motion, reduced (§12) | No running governed animation; zero diff outside `LIVE_READOUTS` (Task 9) | — | — |
| Motion classes (§12 final test) | Every governed `@keyframes` and Framer transition annotated in the class vocabulary (Task 4) | — | Truth of each annotation |
| Typography (§06) | Families ∈ {sans, narrow, mono}; `text-transform: uppercase` text is narrow (Task 6) | — | Authored all-caps runs listed by the script |
| Geometry (§03, §17) | Radii `0px`, or `50%` on a text-free non-control (Task 6) | `50%` element sizes vs the §17 node limit; chamfered corners per container vs the README limit (chamfer ruling); mark size and clear space vs `r1/SPEC.md` §1 | — |
| Focus, contrast | Focus ring on every route and theme; forced colours on every route; contrast passes on every route (Tasks 5, 7) | Contrast record runs at the four other viewports and two arrivals: zero `entries` | Painted forced-colours ring, once |
| Three-question check (§16) | — | — | Per route, recorded in the report |
| Creative regions | — | Share per view; native comparison BASE vs head (Phase 5 `p5-native.mjs`) | NONDETERMINISTIC sets |

Reports and screenshots go to `$DF_TMP/phase6/` and are never committed. They may contain limit values; never copy those into the repository, a plan, a commit or PR text.

---

## Inventory

At `4c273a3` (commands run from the worktree root):

| Evidence | Command | Result |
|---|---|---|
| Settings themes | `grep -n -A3 'const THEME_OPTIONS' web/src/components/SettingsPanel/SettingsPanel.tsx` | lines 55–58: `dark`, `light` only |
| Settings test tab order | `sed -n 75p web/scripts/settings-panel-browser-test.mjs` | `const expected = ["Close settings", "Dark", "Light", …` (no Mono) |
| Browser test themes | `sed -n 17p web/scripts/darkfield-foundation-browser-test.mjs` | default `"dark,light"` |
| Browser test routes | `sed -n 22,27p` same file | 20 routes; none of the 11 article routes (`grep -c '^    "slug"' web/src/data/generated/articles.ts` → 11 top-level entries; nested `series` objects also carry `"slug": "agent-systems"` and repeat article slugs) and none of the 4 piece routes |
| Motion preference | `sed -n 150p` same file | `withPage` fixes `reducedMotion: "reduce"` |
| Scope asserts | `sed -n 1161,1165p` same file | `regions`, `unmeasured`, `creative`, `inactive` must equal the ledger |
| Ledger | `node -e` over `web/scripts/darkfield-known-deficiencies.json` | 136 entries, 4 `regions` keys (dark/light), 38 unmeasured, 20 creative, 12 inactive, 14 notes; 0 ids or keys contain `mono` |
| Mono token chroma | `node -e` over the `[data-theme="mono"]` block of `web/src/styles/darkfield/tokens.css` | 36 hex values, maximum chroma 0 |
| AGENTS end-state lines | `grep -c 'Published Darkfield runtime assets' AGENTS.md`; `grep -n 'Until Phase 1' AGENTS.md` | 0 (Task 7 Step 4 line absent); line 27 holds the "Until Phase 1 … publishes" sentence |
| Master plan | `grep -n '^## Revision log\|KS mark excepted' docs/superpowers/plans/2026-10-11-darkfield-migration.md` | revision log at 5035 (newest first); KS exception at 397 |
| Residual counts (Task 7 Step 2 baseline) | `rg -o '#[0-9a-fA-F]{3,8}\b\|rgba?\(' web/src -g '*.css' -g '!web/src/pages/Annals/sim/**' \| wc -l`; `rg -c 'var\(--(app-\|bg-\|primary-color\|text-color\|accent-color)' web/src -g '*.css'` (summed) | 951 literal colours; 398 alias reads; `bridge.css` 34 `var(--` lines |
| Extractor sources | `grep -n '^#' README.md spec/05-color.md spec/08-*.md spec/10-*.md spec/11-*.md spec/17-*.md r1/SPEC.md` in `$DF_TMP/darkfield` | every heading named in Task 1 exists at `4f02965` |

Expected at the execution base (Phase 5 exit, confirmed in Step 0): `bridge.css` absent; ledger `entries` 0; Mono worklist 0; `DONE5` equals `PHASE5`; `KEYFRAME_HANDOFF` deleted (Phase 5 Task 14 empties and deletes it; `rg -n KEYFRAME_HANDOFF web/scripts` prints nothing); `KEYFRAME_DEAD` exists (Phase 5 Task 13); `darkfield-css-scope.mjs` exports `PHASE3`, `PHASE5`, `NATIVE5`, `HOLDS5`, `DEAD_RULES5`, `NATIVE_KEYFRAMES`; the browser test defines `P5_ROUTES`, `P5_NATIVE`, `P5_FAMILIES`, `RING`, `FOCUS_ROUTES`, `P3_CONTROLS`.

---

## Shared procedures

Every Bash call sources the session environment (`DF_TMP`, `DF_PW`, `PLAYWRIGHT_BROWSERS_PATH`, `W`) and checks exit codes with `; echo rc=$?`. `$WS` is this plan's directory.

- **Static gate:** `cd "$W/web" && node --test scripts/darkfield-*.test.mjs`, `npm run typecheck`, `npm run lint`, `npm test` (log `$DF_TMP/p6-smoke.log`); `git status --porcelain -- src/data/generated/articles.ts` prints nothing.
- **Foundation test:** `bash "$DF_TMP/df-serve.sh" head "$W/web" 4173`, then `DARKFIELD_THEMES=dark,light node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p6-tN-foundation.log" 2>&1; echo rc=$?`; read the tail. From Task 11 on: `dark,light,mono` (the new default).
- **Mono worklist (until Task 11):** `DARKFIELD_MODE=record DARKFIELD_THEMES=mono …` → `$DF_TMP/p6-tN-mono.log`; its `entries` must be `[]` (worklist 0 since Phase 5). Any entry is a stop.
- **Named browser tests:** `node scripts/<name>-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"` for `boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata`, `procedural-animations`, `orbital` (fails only at line 196, ledger note). Each task names its set.
- **Canonical clone check (before any local limit read):** `git -C "$DF_TMP/darkfield" rev-parse HEAD` equals the `SOURCE.json` commit and `git -C "$DF_TMP/darkfield" status --porcelain` is empty. If the clone is missing or was not made by this session's identity check, run `identity-check.sh` (master plan) first.
- **Ledger rule:** only Tasks 5 and 11 add records, and only scope records from a candidate record run, with a note. A new failure, a STALE entry, or any other record change is a stop.
- **Disclosure (every task):** the reviewer runs the canonical disclosure scan over the diff and the commit message; `darkfield-limits.mjs` and its test get it in full. Named constants P6-2/P6-3 (2, 1 px, 2.3) and the master plan's 3 s / 2 s are listed as approved non-specification values.
- **Staging:** `git add -- <exact paths>`; `git diff --cached --name-only | sort` equals the task's list; messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Step 0: Preflight (no commit)

- [ ] `git status --porcelain` empty; `git log` shows Phase 5's exit commit; record HEAD as the Phase 6 base.
- [ ] Confirm every "expected at the execution base" item above; a mismatch is a stop.
- [ ] Phase 4 docs follow-up: `git log --oneline -- docs/superpowers/plans/2026-10-11-darkfield-migration.md` shows `docs(plans): note that the R1 header mark retires the KS exceptions` or not. Record which; Task 13 carries it if not.
- [ ] Phase 1 Task 7 Step 4: record whether `AGENTS.md` holds the line (Task 12 updates or adds it).
- [ ] Canonical clone check. Static gate, foundation test (`dark,light`) and the Mono record run on the base → `$DF_TMP/p6-base-*.log`.
- [ ] Record P6-1…P6-10 in progress.md as awaiting confirmation.

---

## Task 1: Limits reader, local only (P6-1)

**Files:** create `web/scripts/darkfield-limits.mjs`, `web/scripts/darkfield-limits.test.mjs`.

**Steps:**
- [ ] **1. Tests first** (`darkfield-limits.test.mjs`, node:test):
  - (a) After removing comments and every string literal (paths such as `spec/05-color.md` and headings such as `1. Canonical symbol` carry digits and are data, covered by the reviewer's disclosure scan), the module source has no numeric literal other than `0` and `1` (`/(?<![\w.])\d+(\.\d+)?(?![\w.])/g`). Every anchor in `EXTRACTORS` is a backticked token name or at most two words.
  - (b) `readLimits({ canonical, pin })` takes an injectable `pin` (default: `SOURCE.json`). A synthetic git repo (`git init`, one empty commit) with `pin` = its HEAD returns every `LIMIT_NAMES` entry as `missing` and no value; the same repo with another `pin` throws a pin-mismatch error.
  - (c) An override path inside the repository (`git rev-parse --show-toplevel` of the module's directory) is refused.
  - (d) The CLI's stdout lines all match `^(ok|missing|conflict) [a-z][\w.]*$`; error messages name only a limit name, a source path and a reason word, never canonical text (asserted on the synthetic repo with a source file whose content is a sentinel string: the sentinel never appears in stdout or stderr).
- [ ] **2. Module.** `export const LIMIT_NAMES` and `export async function readLimits({ canonical, pin, override })` (`pin` defaults to the `SOURCE.json` commit; tests inject it):
  - Reads the pin (`commit`) from `web/src/styles/darkfield/SOURCE.json`; requires `git --no-replace-objects -C <canonical> rev-parse HEAD` to equal it; reads each source with `git --no-replace-objects -C <canonical> show <commit>:<path>` (never the working tree), with `GIT_*` variables removed from the child environment (same rule as `darkfield-source.mjs`).
  - Splits a source into sections by heading text; finds, inside the named section, the single non-empty line (table row, list item, numbered item or paragraph line, so README principle paragraphs are included) containing the anchor; takes a quantity from that line by position rule ("before" = the nearest quantity preceding the anchor in that line). A backticked anchor matches only that exact backticked token (so `` `flare` `` never matches `glow-flare`). Quantity grammar (generic): a decimal, optional whitespace, then an optional `%` or `px` (`/(\d+(?:\.\d+)?)\s*(%|px)?/`); or an English cardinal word. No fraction forms are parsed. Zero or several matching lines → `missing`. No error, log line or exception message ever includes canonical text.
  - Extractors (name → source, section, anchor, rule). Anchors are token names, headings already cited publicly, or at most two consecutive words:

| Name | Source and section | Anchor | Rule |
|---|---|---|---|
| `share.field.min` | §05 *How much of each* | `field-deep` | first `%` |
| `share.surface.max` | same | `surface-1…3` | first `%` |
| `share.structure.max` | same | `signal-trace` | first `%` |
| `share.signal.max`, `share.signalDimDeep.max` | same | `signal-dim` | first, second `%` |
| `share.secondary.max` | same | `coolant` | first `%` |
| `count.flare.max` | same | `flare` | first quantity |
| `share.void.min` | §08 *Balancing density and emptiness* | contiguous void | first `%` |
| `count.glowSignal.max`, `count.glowFlare.max` | §11 *Rules* | the one line holding both `glow-signal` and `glow-flare` (another rule names `glow-flare` alone) | nearest quantity before each |
| `count.effects.max` | §10 *Global limits* | atmospheric effects | nearest quantity before |
| `count.heartbeat.max` | README *02 · Design principles* | heartbeat | nearest quantity before |
| `size.node.maxPx` | §17 *Corner radii* | `radius-node` | first `px` |
| `count.chamfer.perContainer` | README *Using the system* | `cut-*` | nearest quantity before |
| `size.mark.minPx` | `r1/SPEC.md` *1. Canonical symbol* | Minimum size | first `px` |
| `size.mark.clearUnits` | same | Clear space | first quantity (in the mark's grid units; the measurement converts it to px with the vendored symbol's `viewBox` width and `--df-mark-size`; the reviewer confirms in Step 3 that the unit is the `viewBox` unit) |

  - Cross-check: seven of the limits (field, void, full signal, secondary hues, glow-signal count, flare count, effects count) are restated in the budgets item of §17 *Not tokenised*. Extract each there too, by nearest quantity before its anchor; the anchors, in alphabetical order, are: atmospheric effects; contiguous void; field; flare; glows; secondary hues; `signal`. A disagreement is `conflict` (stop condition 7).
  - `override`: a JSON file outside the repository, `{ name: { value, unit } }`, filling `missing` names only, each tagged `source: "override"` in the returned map.
  - CLI: `node scripts/darkfield-limits.mjs <canonical-dir> [--limits <file>]` prints one `ok|missing|conflict <name>` line per limit; exit 1 on any `missing` or `conflict`. It never prints a value.
- [ ] **3. Local check (no commit content):** `node scripts/darkfield-limits.mjs "$DF_TMP/darkfield"` → every line `ok`. The reviewer reads each cited section and confirms each extracted value (printed by a scratch call into `$DF_TMP/phase6/limits.json`, never into the repository).

- **Verify:** static gate. No build change; no browser test. **Visual:** none. **Ledger:** none.
- **Commit:** `feat(web): read Darkfield conformance limits from the private canonical clone at run time`

---

## Task 2: Measurement library and shared measurement lists (P6-3, P6-5)

**Files:** create `web/scripts/darkfield-measure-lib.mjs`, `web/scripts/darkfield-measure.test.mjs`; modify `web/scripts/darkfield-foundation-browser-test.mjs` (import `P5_NATIVE` from the lib instead of defining it).

**Steps:**
- [ ] **1. Tests first** (synthetic arrays only; no token values typed; tokens are read from `tokens.css` in the test): `parseTokenColours(css, theme)` returns every colour token of each theme block; `deltaE76` is 0 for equal colours and symmetric; `classify` maps an exact token pixel to its token, a pixel beyond tolerance to `unclassified`, and a colour shared by tokens of two tiers to `ambiguous`; `tierBounds` returns `lower ≤ upper` and puts unclassified and ambiguous pixels only in upper bounds; `largestComponent` on a hand-built boolean grid returns the known size (4-connectivity, excluded cells break components); `chroma` is `max − min` of RGB; `monoChromaThreshold(css)` equals the Mono blocks' maximum chroma plus `MONO_ROUNDING` (2); `nativeOwnBoxes` returns the box with a descendant's rectangle removed (pixel count check on a synthetic grid).
- [ ] **2. Library** exports:
  - `EXCLUDED = "[data-df-region], iframe, canvas, video, img, picture"`; `MEASURE_NATIVE`: `[{ selector, reason }]` = Phase 5's `P5_NATIVE` selectors (reason `P5_NATIVE`) plus exactly `.traffic-swatch` and `.traffic-signal-lamp` (reason `P5-2`); no pseudo-element and no container such as `.spider-solitaire`. An entry excludes the matched element's own paint only (P6-5): helpers `ownPaintExcluded(el)` (the element itself matches) and `nativeOwnBoxes(boxes, governedDescendantBoxes)` (box minus descendant boxes). `P5_NATIVE` (exported for the browser test, unchanged content); `MONO_DEVIATIONS = []` (exact selectors with reason `P5-3` or `P5-2`, filled in Task 10).
  - `TIERS`: `field` (`field`, `field-deep`), `surface` (`surface-1…3`), `structure` (`rule`, `edge`, `signal-trace`), `text` (`fg`, `fg-muted`, `fg-faint`), `signal` (`signal`), `signalDimDeep` (`signal-dim`, `signal-deep`), `secondary` (`coolant`, `ion`, their `-deep`), `state` (`caution`, `fault`, their `-deep`), `flare` (`flare`). `on-*` tokens join the tier of their ground's partner: report them under `text`.
  - Pure functions: `parseTokenColours`, `srgbToLab`, `deltaE76`, `classify(pixel, tokens, tolerance)`, `tierBounds(counts, denominator)`, `verdict(bounds, limit, direction)` → `PASS|FAIL|BORDERLINE|UNJUDGED` (UNJUDGED when no limit), `largestComponent(grid)`, `chroma`, `monoChromaThreshold`, `IDLE_ALLOWED = []`, `LIVE_READOUTS = []` (filled in Task 9).
- [ ] **3.** Browser test: replace its `const P5_NATIVE = [...]` with an import from `./darkfield-measure-lib.mjs` (same values).

- **Verify:** static gate; foundation test once (import resolves; no behaviour change). **Visual:** none. **Ledger:** none.
- **Commit:** `feat(web): add the Darkfield conformance measurement library`

---

## Task 3: Local measurement script (P6-3, P6-4)

**Files:** create `web/scripts/darkfield-measure.mjs`.

**Usage:** `node scripts/darkfield-measure.mjs <base-url> <playwright-module> --out <dir> [--canonical <dir>] [--limits <file>] [--themes dark,light,mono] [--viewports 1440x900,…] [--routes …] [--tolerance 2.3]`. `--out` must resolve outside the repository (refuse otherwise). Without `--canonical`, every verdict is UNJUDGED and the raw measurements are still written.

**Per view (route × theme × viewport):**
- [ ] Context: viewport, `deviceScaleFactor: 1`, `reducedMotion: "reduce"`, stored theme, the browser test's seeded `Math.random` init script; load with `networkidle`, eager images, height settled (copy the browser test's `routePass` preparation).
- [ ] Token colours: resolve each colour token of the active theme by probe element (`getComputedStyle(probe).color` with `color: var(--<token>)`), so values come from the page.
- [ ] Boxes (in page, clipped to the viewport, rounded outward by 1 px): `EXCLUDED` boxes, creative-region boxes (subset), `MEASURE_NATIVE` boxes with reasons, text runs (`Range.getClientRects` of every visible text node outside exclusions, with the computed colour), the R1 mark box.
- [ ] Captures: screenshot A; inject the browser test's `HIDE_TEXT` rule on `body` (marker on `body`) → screenshot B; decode both through a decoder page canvas (browser test pattern) to RGBA.
- [ ] Classification: governed pixels = viewport − excluded boxes − `MEASURE_NATIVE` own-paint pixels (`nativeOwnBoxes`). Text pixels = A ≠ B, attributed to the run rect containing them (its computed colour's token, else `unclassified`); other pixels classified from B. Shares and bounds per tier; the mark's `signal` pixels listed separately.
- [ ] Void: square cells of `grid-unit` (read from the page; the master plan's 8 px cell); a cell is void when fully governed and every pixel is `field` tier in A; largest 4-connected component as a share of the governed area and of the viewport.
- [ ] DOM counts: visible governed elements whose computed `box-shadow` or `text-shadow` equals the resolved `--glow-signal` / `--glow-flare` (probe-resolved strings); elements whose `background-color` equals `flare`; `50%`-radius elements with their sizes; elements with a `clip-path` polygon and their cut-corner count; `--df-mark-size` and `--df-mark-clear` on `.site-header__brand`; authored all-caps own-text runs of four or more letters (list for the reviewer); atmosphere candidates (`canvas` and `aria-hidden` fixed or absolute layers covering at least half the viewport).
- [ ] Zero-effects capture: hide the atmosphere candidates (`visibility: hidden`) → screenshot C.
- [ ] Output: `<out>/<theme>/<viewport>/<route>.{json,A.png,C.png}`; `<out>/summary.json` and `<out>/summary.md` (one row per view: excluded, creative, native shares; tier bounds and verdicts; void; counts and verdicts; UNJUDGED where no limit). Limits (when read) appear only in the output directory.
- [ ] **Self-check:** run on head for `/` and `/simulations/annals`, dark and mono, 1440×900, with and without `--canonical`; inspect the JSON by hand (excluded share > 0 on Annals; Mono `secondary` lower bound 0).

- **Verify:** static gate (the script is not linted by `npm run lint`; `node --check scripts/darkfield-measure.mjs`). **Visual:** the self-check PNGs. **Ledger:** none.
- **Commit:** `feat(web): add the local Darkfield conformance measurement script`

---

## Task 4: §12 annotations: presence and class vocabulary (P6-9)

**Files:** create `web/scripts/darkfield-conformance.test.mjs`; modify `web/scripts/darkfield-css-scope.mjs` and `web/scripts/darkfield-restraint.test.mjs` only if `KEYFRAME_DEAD` is still defined in the restraint test (move it, unchanged, into the scope module and import it there; same test names and count before and after). Shared lists live in non-test modules; no test imports another test file.

**Steps:**
- [ ] **1. Test** (imports `governed`, `read`, `NATIVE_KEYFRAMES`, `KEYFRAME_DEAD` from `darkfield-css-scope.mjs`):
  - No file under `web/scripts` defines `KEYFRAME_HANDOFF` (Phase 5 deleted it).
  - Every `§12:` annotation in governed `.css` and `.tsx` files, in a block comment (`/* §12: … */`) or a line comment (`// §12: …`, the form Phase 2 Task 9 writes in `.tsx`), matches `/§12:\s*(state transition|signal propagation|propagation|scan \/ inspection|accumulation|synchronisation|failure \/ instability|liveness)(\s*\([^)]+\))?\s*·\s*(\S.{2,}?)\s*(\*\/|$)/m` (class, optional subtype, a reported state of at least three characters), and the state is not `TODO`, `-`, `n/a` or `none`.
  - Every governed `@keyframes` outside `NATIVE_KEYFRAMES` and `KEYFRAME_DEAD` has an annotation in the comment directly above it (Phase 2 T10 rule, re-asserted on the end state).
  - Every governed `.tsx` importing `framer-motion` has at least as many `§12:` annotations as `transition` props or keys (Phase 2 T9 rule, re-asserted).
- [ ] **2.** If any annotation fails the vocabulary, stop (P6-8): wording fixes are an R-n task on the named files.

- **Verify:** static gate (`darkfield-restraint.test.mjs` test names unchanged). **Visual:** none. **Ledger:** none. The reviewer reads every annotation and judges its truth (§12 final test); list in the report.
- **Commit:** `test(web): require a §12 class and a reported state on every governed animation`

---

## Task 5: Every route in the browser test (P6-7)

**Files:** modify `web/scripts/darkfield-foundation-browser-test.mjs`, `web/scripts/darkfield-known-deficiencies.json`.

**Steps:**
- [ ] **1.** After `ROUTES`, build `SLUG_ROUTES` in Node: `/writing/<slug>` for each top-level article entry of `src/data/generated/articles.ts` (lines matching `/^ {4}"slug": "([^"]+)"/m`; nested `series` objects sit deeper and also repeat article slugs), deduplicated; assert the list excludes `agent-systems` (a series slug, not a route) and has 11 entries at `4c273a3` (fail when it disagrees with the count of top-level `{` entries in `articlesData`, so a new article is picked up and a format change fails). `/procedural-animations/<slug>` for each `slug: "<v>"` in `src/data/proceduralAnimations.ts` (4). `ROUTES.push(...SLUG_ROUTES)`: 35 routes. Every later route loop (contrast passes, Phase 3/5 invariants that iterate `ROUTES`) now covers them.
- [ ] **1b. Run time.** Twenty routes take about 13 min for two themes; 35 routes take roughly 25 min for `dark,light` and 40 min for three themes, before Tasks 7 and 10 add focus and Mono passes. Add an optional `DARKFIELD_ROUTE_SHARD=i/n` (1 ≤ i ≤ n): the process runs the routes whose index in `ROUTES` satisfies `index % n === i - 1`, so shards are disjoint and their union is `ROUTES` by construction; a malformed value fails. No free-form route list exists, so no route name can be mistyped or dropped. Every route loop and the scope asserts honour the shard (they already filter by `ran`), and each process prints `SHARD i/n ROUTES <list>` at start and `RAN <list>` at the end. A per-task check-mode run may use n parallel shards against one preview; the reviewer confirms the printed `RAN` lists' union equals `ROUTES` and every shard passed. The Task 11 release run, Step F and the phase exit run unsharded.
- [ ] **2.** Record run on head: `DARKFIELD_MODE=record DARKFIELD_THEMES=dark,light` → `$DF_TMP/p6-t5-record.json`. Any `entries` id on a new route: stop (P6-8). Mono record run: `entries` `[]` (worklist stays 0).
- [ ] **3.** Merge the new routes' `regions` keys and `unmeasured`/`creative`/`inactive` records (ids whose route is in `SLUG_ROUTES`) into the ledger, unchanged otherwise. The reviewer reviews each candidate-sourced `unmeasured` record: its reason must name a real measurement limit (cover, clipping, painted ground), not a measurable failure; a doubtful one is a stop. Append a note: "Phase 6 Task 5: the article and procedural-piece routes joined the test; their scope records come from the Phase 6 candidate, because the baseline did not measure them. They carry no entries."

- **Verify:** static gate; foundation test (`dark,light`, check); Mono record run; `procedural-animations`, `route-metadata`. **Visual:** none (no rendered change). **Ledger:** scope records only, as above.
- **Commit:** `test(web): run the Darkfield browser checks on article and procedural-piece routes`

---

## Task 6: Typography and geometry on every route

**Files:** modify `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1.** Phase 5's invariant (`P5_ROUTES`, `P5_NATIVE`, `P5_FAMILIES`) loops over `ROUTES` instead of `P5_ROUTES`; keep `P5_ROUTES` if other code reads it. Its element filter also skips `EXCLUDED` (import) besides `[data-df-region], svg`. `P5_NATIVE` elements are skipped for their own radius and family only (`ownPaintExcluded`), never with `closest`, so governed chrome inside `.annals-sheet` and the Rhythm Lab lanes is checked.
- [ ] **2.** Radius rule: an element passes when all four computed radii are `0px`, or all four are `50%` and the element has no own text and does not match `CONTROLS`. Others report `radius <tag>.<class> <values>`.
- [ ] **3.** Uppercase rule: an element with own text whose computed `text-transform` is `uppercase` must have `Archivo Narrow` as its first family; report `upper <tag>.<class> <family>`.
- [ ] **4.** Run on head. Failures: stop (P6-8); list offenders by route, theme and rule.

- **Verify:** static gate; foundation test; Mono record run; `header-overlap`. **Visual:** none. **Ledger:** none.
- **Commit:** `test(web): check Darkfield families, uppercase voice and square corners on every route`

---

## Task 7: Focus and forced colours on every route

**Files:** modify `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1.** `FOCUS_ROUTES` becomes `ROUTES`. Before tabbing, the page marks every visible tabbable element with a `data-df-tab` index: `a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, iframe, video[controls], audio[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])`. `focusStates(page)` presses Tab until focus returns to the first element reached (one full cycle), capped at 1000 presses; hitting the cap fails.
- [ ] **2.** Invariant per theme and route: every reached element shows `RING[theme]` in its computed `box-shadow` (Phase 1 Task 6 assertion), including elements inside regions and `video` (focus excludes nothing). An `IFRAME` that holds focus counts as reached; the ring inside a piece's own document is the piece's, covered by the `procedural-animations` test.
- [ ] **3.** Every marked element is reached within the cycle; leftovers FAIL as `unreached <route> <label>` (P6-8).
- [ ] **4.** Forced colours: the existing `/` pass runs on every route in dark with the same full cycle: each reached element's outline is `solid` and `2px`.
- [ ] **5.** Run on head; failures: stop (P6-8).

- **Verify:** static gate; foundation test; `procedural-animations`, `header-overlap`, `settings-panel`. **Visual:** reviewer checks the painted forced-colours ring once on `/simulations/traffic-simulator` (a slider) in Chromium's emulation. **Ledger:** none.
- **Commit:** `test(web): check the Darkfield focus ring and forced-colours outline on every route`

---

## Task 8: Emission comes only from glow tokens; none in Light

**Files:** modify `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1.** Per theme and route (`withPage`, at rest, pointer away): resolve `--glow-trace`, `--glow-signal`, `--glow-flare`, `--glow-fault` as computed `box-shadow` and `text-shadow` strings via probes. For every visible element outside `EXCLUDED` (`MEASURE_NATIVE` elements skip only their own `box-shadow`): `box-shadow` is `none` or one resolved glow; `text-shadow` is `none` or one resolved glow; a `filter` containing `drop-shadow(` must be a chain of `drop-shadow()` functions whose layers equal one resolved glow's layers in order (§11 *Glow tokens*: glows without spread work as `drop-shadow()`; resolve by a probe with that chain). The focused element is skipped (focus is covered by Task 7).
- [ ] **2.** In Light every resolved glow is `none`, so the rule above already requires no emission there; add an explicit assertion that each resolved Light glow is `none`, so a future token change fails loudly.
- [ ] **3.** Run on head; failures: stop (P6-8).

- **Verify:** static gate; foundation test; Mono record run. **Visual:** none. **Ledger:** none.
- **Commit:** `test(web): require governed emission to come from Darkfield glow tokens`

---

## Task 9: Motion at idle and under reduced motion (P6-6)

**Files:** modify `web/scripts/darkfield-foundation-browser-test.mjs`, `web/scripts/darkfield-measure-lib.mjs` (`IDLE_ALLOWED`, `LIVE_READOUTS`), `web/scripts/darkfield-measure.test.mjs`.

**Steps:**
- [ ] **1. Probe first.** `withPage` gains `reducedMotion = "reduce"` (default unchanged). A helper `motionProbe(page)`: wait 3 s; list `document.getAnimations()` with `playState === "running"` whose target (or a pseudo-element's `element`) is visible, outside `EXCLUDED` and not itself a `MEASURE_NATIVE` element (descendants count), as `{ selector: tag.firstClass, name }`; then take two viewport screenshots 2 s apart and return the changed governed pixels' bounding boxes with the innermost element at each box centre. Run it on head in the first theme for every route, with `no-preference` and with `reduce`; write `$DF_TMP/p6-t9-probe.json`.
- [ ] **2. Classify** (reviewer, controller rules): each running animation at idle is either an `IDLE_ALLOWED` row `{ route, selector, repeat, condition }` where `repeat` names the §12 *What may repeat* row (`scan`, `transmit`, `processing`, `heartbeat`, `cursor`, `accumulation`) and `condition` says why it holds in the captured state (e.g. the terminal cursor while the prompt input has focus), or a defect (P6-8). Each changing region is either a `LIVE_READOUTS` row `{ route, selector, reports }` (a value driven by running data, such as a simulation readout) or a defect. Add the rows to the lib; the test asserts each row's selector is a non-empty string and `repeat` is in the list above.
- [ ] **3. Invariants** (first theme of `THEMES`): with `no-preference`, every running governed animation matches an `IDLE_ALLOWED` row for that route, and the changed pixels outside `LIVE_READOUTS` boxes (and outside `IDLE_ALLOWED` boxes) are zero; with `reduce`, there is no running governed animation at all, and changed pixels outside `LIVE_READOUTS` boxes are zero.

- **Verify:** static gate; foundation test; `boot-shell`, `procedural-animations` (reduced-motion pass-through). **Visual:** none. **Ledger:** none. The heartbeat count per view against the Principle 6 allowance is a local check in the measurement run (`IDLE_ALLOWED` rows with `repeat: "heartbeat"`).
- **Commit:** `test(web): check that idle governed views stay still and reduced motion stops them`

---

## Task 10: Mono hue leaks (P6-2, P6-5, P5-3)

**Files:** modify `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1.** A dedicated Mono pass in check mode (stored theme `mono`, regardless of `THEMES`; Task 11 folds it into the theme loop), every route, 1440×900. `threshold = monoChromaThreshold(tokens.css)`; the test also asserts the Mono tokens' maximum chroma is 0, so a token change surfaces.
- [ ] **2. DOM layer:** for every visible element outside `EXCLUDED` (`MEASURE_NATIVE` elements skip only their own background, border and shadow; their governed descendants are checked): computed `color`, `background-color`, each border colour with width > 0, `outline-color` when the outline style is not `none`, `text-decoration-color`, `fill` and `stroke` (SVG), and every `rgb()/rgba()` inside `background-image`, `box-shadow`, `text-shadow`: chroma ≤ threshold. Report `leak <route> <tag>.<class> <property> <value>`.
- [ ] **3. Pixel layer:** one viewport screenshot; governed pixels (dilated exclusion boxes and `MEASURE_NATIVE` own-paint pixels removed) with chroma > threshold count as leaks; report count and the innermost element (and pseudo-element, if the point lies in its box) at each leak cluster's centre.
- [ ] **4. Named deviations.** Pixels of the `.annals-sheet` own ground (within ΔE tolerance of its computed `background-color`) print as `MONO-NATIVE P5-3` with counts. A leak whose element matches an exact `MONO_DEVIATIONS` selector prints `MONO-DEVIATION <reason> <selector> <count>` and does not fail. `MONO_DEVIATIONS` starts empty: Step 5's first run lists the leaks; the controller rules each as a deviation (only governed Annals chrome on the sheet under P5-3, and the Annals legend key cells under P5-2; exact selectors, no subtree or container) or a defect (P6-8). Each deviation is recorded for the owner (Task 13, report).
- [ ] **5.** Run on head; leaks: stop (P6-8).

- **Verify:** static gate; foundation test (`dark,light` plus the dedicated Mono pass). **Visual:** reviewer inspects Mono screenshots of every route for reading order (Principle 3 test), recorded in the report. **Ledger:** none.
- **Commit:** `test(web): fail Mono views that leak hue outside native content`

---

## Step M: Measurement run and verdicts (no commit)

- [ ] Fresh previews: `bash "$DF_TMP/df-serve.sh" head "$W/web" 4173`; `bash "$DF_TMP/df-serve.sh" base "$DF_TMP/baseline/web" 4174`. Canonical clone check; `node scripts/darkfield-limits.mjs "$DF_TMP/darkfield"` all `ok`.
- [ ] `node scripts/darkfield-measure.mjs http://127.0.0.1:4173 "$DF_PW" --out "$DF_TMP/phase6/measure" --canonical "$DF_TMP/darkfield"` (all views).
- [ ] Contrast at the other viewports and arrivals: record mode, themes `dark,light,mono`, `DARKFIELD_VIEWPORT` each of 1280×800, 1920×1080, 768×1024, 375×812, and at 1440×900 with `DARKFIELD_ARRIVE_FROM=/projects` and `/simulations`: every `entries` list is `[]`; scope differences from the 1440×900 records are listed, not failed.
- [ ] Native comparison: `$DF_TMP/p5-native.mjs` every set, BASE (4174) vs head, `dark,light`; SAME, or a DIFF with the origin Phase 5 already reported, or NONDETERMINISTIC with the computed-style check SAME. `p5-native.mjs` has no iframe or evidence-media set (Phase 5 *Native comparison*): confirm that, then cover them as Phase 5 did: `git diff --quiet 3c533b6 HEAD -- web/public/procedural-animations web/public/media`; iframe and `ProjectMedia` asset boxes equal on BASE and head at 1440×900 and 375×812 (scratch script over every piece route and the four case studies); `procedural-animations` and `case-study-media` browser tests pass on both previews.
- [ ] Reviewer verdicts recorded in `$DF_TMP/phase6/verdicts.md`: BORDERLINE area rows; zero-effects (screenshots C, Rhythm Lab rain hidden) and effect counts vs §10; Mono reading order; three-question check per route (§16), naming the mark's `signal` as §18-assigned (Phase 4 hand-off); truth of every §12 annotation; authored all-caps runs; chamfer counts; Phase 3 hand-offs (`ICON_SIZES`, `GENERATED`, P3-10 dash approximation, aperture reveals, `●/○` prefixes) and Phase 5 hand-offs (`ICON_SIZES5`, P5-2 mirrors in Mono, `P5_NATIVE`).
- [ ] Every FAIL becomes an R-n fix task (controller rules files and scope; the Phase 3/5 procedures apply) or a DEV-n deviation for the owner. Re-run Step M after R-n tasks. No limit value leaves `$DF_TMP`.

---

## Task 11: Mono release (D4 → (a))

**Files:** modify `web/src/components/SettingsPanel/SettingsPanel.tsx`, `web/scripts/settings-panel-browser-test.mjs`, `web/scripts/darkfield-known-deficiencies.json`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Gate.** `DARKFIELD_MODE=record DARKFIELD_THEMES=mono` on head → `$DF_TMP/phase6/mono-release-record.json`: `entries` is `[]` (worklist 0). Record the run path and HEAD in progress.md. Anything else: stop.
- [ ] **2.** `THEME_OPTIONS` (anchor `const THEME_OPTIONS`): append `{ value: "mono", label: "Mono" }` after the Light option.
- [ ] **3.** Settings test (anchor `const expected = ["Close settings", "Dark", "Light"`): insert `"Mono"` after `"Light"`. After the Light assertions in the theme block, add: click `button("Mono")`; `data-theme` is `mono`; Mono `aria-pressed` is `true`, Dark and Light `false`; then click Dark as before (later assertions unchanged).
- [ ] **4.** `rg -n '"mono"|D4\(b\)' web/scripts web/src` and update any assertion or comment that encodes "not offered" (name each in the commit body).
- [ ] **5. Ledger:** merge the Mono `regions` keys and `unmeasured`/`creative`/`inactive` records from the Step 1 JSON (ids containing `|mono|`) into the ledger; never add Mono `entries`. Append a note: "Mono scope records come from the Phase 6 candidate (Mono release commit): the baseline has no Mono theme (delegated ruling, Task 5). Mono has no ledger entries."
- [ ] **6.** Browser test: default `DARKFIELD_THEMES` becomes `"dark,light,mono"`; header comment updated; the dedicated Mono passes (Phase 4 mark, Task 10 hue) run inside the theme loop when `THEMES` includes `mono` and as dedicated passes only otherwise.

- **Verify:** static gate; foundation test in check mode with the new default (`dark,light,mono`), unsharded; `settings-panel`, `boot-shell`, `header-overlap`. **Visual:** Settings open with each theme selected, 1440×900 and 375×812, dark/light/mono (`$DF_TMP/phase6/t11-shots`), agent inspection. **Ledger:** Mono scope records and one note.
- **Commit:** `feat(web): offer the Darkfield Mono theme in Settings`

---

## Task 12: AGENTS.md end state (docs only)

**Files:** `AGENTS.md`.

**Steps:**
- [ ] In the *Operating Rules* Darkfield bullet, replace the sentence that begins "Until Phase 1 of the migration plan publishes" with (P6-10, minimal; flagged for the owner): "`tokens.runtime.json`, the generated `tokens.css` and the licensed Darkfield fonts are committed in this repository; site CSS reads Darkfield values only through `tokens.css` custom properties." Keep the bullet's other sentences.
- [ ] *Project-Specific Notes*: if the master plan Task 7 Step 4 line exists, keep its text; otherwise add it verbatim. Append to that line: "Phase 1's legacy-variable bridge (`bridge.css`) was retired in Phase 5. `web/scripts/darkfield-limits.mjs` and `web/scripts/darkfield-measure.mjs` run only locally against the private canonical clone; their outputs and any limit values stay outside this repository."
- [ ] `git diff --check -- AGENTS.md`; reviewer disclosure scan.
- **Commit:** `docs: record the Darkfield end state in AGENTS.md`

---

## Task 13: Master plan records (docs only)

**Files:** `docs/superpowers/plans/2026-10-11-darkfield-migration.md`.

**Steps (append; never rewrite D10's acceptance text or earlier revision entries):**
- [ ] **Status:** append a dated paragraph "Delegated rulings recorded 2026-MM-DD (owner standing authorization of 2026-10-15; not owner approvals)": D3, D4 ((b) interim from Task 5, (a) at the Task 11 commit), D5, D6, D7, D8, the chamfer reading; D11(a) remains open; all commits local, nothing pushed.
- [ ] **Decision gates:** after the table, a "Delegated-ruling records" list, one dated line per gate with its basis and the commit that applied it. After D10's row, append notes: Phase 4's KS note (if Step 0 found the Phase 4 follow-up missing); "Note, <date>: Phases 3 and 5 retired all 136 entries; the ledger holds 0 entries at <sha>. The acceptance record above is unchanged."
- [ ] **Phase 4 docs follow-up** (only if Step 0 found it missing): the *Validation model* KS exception wording, *Required arrangement* item 3 and the `darkfield-vendor.test.mjs` row (R1 files published under the P4-1 deviation, pending owner confirmation), as the Phase 4 plan specifies.
- [ ] **Recorded deviations** (new subsection under *Phases 2–6*): DEV-1, DEV-2, P4-1, P5-3 (Mono residual on the Annals sheet), P2-3 (held Rhythm Lab rain), P3-10, P6-5, each `MONO_DEVIATIONS` selector (Task 10), P6-10, and every DEV-n from Step M, each one line with its owner decision.
- [ ] **Phase 6 section:** append the D11(a) disposition (committed / local / reviewer per row, as in this plan's table) and the new checks; *Validation model*: one row each for `darkfield-limits.mjs` (local only), `darkfield-measure.mjs` (local only), and the Task 4–10 invariants.
- [ ] **Revision log:** an r11 entry at the top.
- [ ] `git diff --check`; reviewer disclosure scan (no limit values; no spec phrases).
- **Commit:** `docs(plans): record Darkfield delegated rulings, deviations and Phase 6 checks`

---

## Step F: Final full-suite run and report (no commit)

- [ ] Fresh previews (head 4173, base 4174) through `df-serve.sh`.
- [ ] `cd "$W/web" && node --test scripts/*.test.mjs && npm run typecheck && npm run lint && npm test` (Task 7 Step 1).
- [ ] Foundation test, check mode, `dark,light,mono`, unsharded, on 4173 (passes; orbital note only). Every named browser test against 4173 and 4174; differences between them reported.
- [ ] Canonical identity check and `darkfield-source.mjs --verify` in the same session.
- [ ] Step M's measurement, contrast-viewport and native runs repeated on the final HEAD.
- [ ] Residual coverage at the end state vs `BASE` (Task 7 Step 2 list): literal colours in governed CSS (the inventory command, excluding creative-owned paths, split into holds `HOLDS5`/pins and other); bridged alias reads (expected 0); legacy-fence variables (expected 0); native-visual holds (`NATIVE5` selector count, font pins, `.simulation-preview > *`); UNCOVERED pairs (foundation log); ledger entries (0). Also: P3-7 spacing residual (governed declarations of `margin*`, `padding*`, `gap`, `inset*`, `top/right/bottom/left` whose value is not `0`, `auto`, `inherit` or a `var(--space-…)`/`calc` of them, counted per file with the scope helper); `ICON_SIZES`, `ICON_SIZES5`, `GENERATED`; `DEAD`, `DEAD_RULES*`, `LEGACY_DEAD` sizes.
- [ ] Write `$DF_TMP/phase6/REPORT.md`: commit range and HEAD; suite results; measurements per route, theme and viewport (summary table from `summary.md`, with excluded, creative and native shares); verdicts; deviations (DEV-1, DEV-2, P4-1, P5-3 Mono residual with counts, P5-2 mirrors, P2-3, P3-10, P6-5, DEV-n); owner decisions pending (D11(a); P2-3 and Phase 2 Task 2; P3-5, P3-7, P4-4, P5-7 confirmations; copy hand-offs from Phases 2–5; dead-code cleanup lists; apple-touch inset; production checks from Phase 4; CI wiring proposal with measured run time and the Node version constraint, Task 7 Step 5; push/PR/merge/deploy under D9). Limit values may appear only in this file.

---

## Phase exit (no commit)

- [ ] Static gate; foundation test in check mode with `dark,light,mono`, unsharded; seven named browser tests (orbital line 196 only).
- [ ] Ledger: 0 entries; Mono scope records present with their note; no Mono entries.
- [ ] Step M verdicts: no FAIL without an R-n commit or a DEV-n record; BORDERLINE rows judged.
- [ ] `REPORT.md` exists in `$DF_TMP/phase6/`; nothing under `$DF_TMP` or `.superpowers/` staged; nothing pushed.

## Risks and stop conditions

The master plan's stop conditions apply. Phase-specific:

1. **Disclosure.** A limit value, or a three-word spec phrase, in any committed file, comment, test name, ledger note or commit message is a stop. `darkfield-limits.mjs` is the most exposed file: its anchors are token names, cited headings or at most two words, and its test rejects numeric literals other than 0 and 1.
2. **Extractor drift.** A `missing` or `conflict` limit is a stop for the rows that need it; never guess a value. An override file inside the repository is refused by design.
3. **Invariants that find defects** (Tasks 4–10): P6-8. Never weaken an invariant to pass; an exception is named and cites a DEV-n record.
4. **Scope records** (Tasks 5, 11): only records for new routes or Mono, from a candidate record run, each with a note. Any other `regions`/`unmeasured`/`creative`/`inactive` change is a stop.
5. **Mono gate.** Task 11 runs only on a recorded Mono run with zero entries at its HEAD; an R-n task after it re-runs that gate.
6. **Nondeterminism.** Idle and reduced diffs depend on settled pages: a diff that varies between two runs of the same build is a stop for that route until the source is named (an `IDLE_ALLOWED`/`LIVE_READOUTS` row or a defect).
7. **Run time.** 35 routes, full focus cycles and three themes make the check-mode run long (Task 5 estimate). Per-task runs may use `DARKFIELD_ROUTE_SHARD` shards in parallel (union proven from the `RAN` lines); the Task 11 release run, Step F and the phase exit are unsharded. Never shorten coverage to save time.
8. **Measurement bounds.** A BORDERLINE area verdict is a human decision recorded in `verdicts.md`; never tighten or loosen `--tolerance` to change a verdict.
