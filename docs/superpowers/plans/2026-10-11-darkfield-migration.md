# Darkfield Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (provisionally chosen) to implement this plan task-by-task, with an independent reviewer between tasks (see [Operational safety](#operational-safety)). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Govern the personal website's own interface with the Darkfield design system. Every visual value comes from Darkfield's `tokens.json`, and R1 Constant Seam is the identity mark. Independently authored creative work keeps its own identity.

**Architecture:** This is a master plan; Phase 0 (provenance) and Phase 1 (foundation) are fully specified.
- An allowlist exporter, run only where the private canonical repository is available, projects the canonical `tokens.json` into a public runtime file, `tokens.runtime.json`, that holds only token names and values. A Node compiler turns that file into `tokens.css`. Public builds need no private access.
- A hand-written `bridge.css` re-points the site's legacy CSS variables at Darkfield roles. Where re-pointing would mislead or would reach creative content, the variable keeps its legacy value, and the place is recorded.
- Theme switching shrinks to setting `data-theme`.

Phases 2–6 replace the bridge with real Darkfield grammar, surface by surface. Each gets its own sub-plan after Phase 1 merges and its gates are answered.

**Tech Stack:** React 18, Vite 8, TypeScript, plain CSS. Tests use `node:test` (`web/scripts/*.test.mjs`) and the standalone Playwright browser-test convention (`web/scripts/*-browser-test.mjs`, Playwright passed in by path). No new npm dependencies.

**Revision:** r6, 2026-10-11 (D11(b) runtime publication model). r1–r5 were written the same day; see the [Revision log](#revision-log).

## Status

**Established by the owner (2026-10-11):**
- **D1 is approved.** Darkfield is the governing design system across the entire personal website.
- **The authority is the complete Darkfield specification** (README thesis and principles, §03–§19, `tokens.json`, plates, assets), not merely the R1 mark spec.
- **No visitor-facing page or interface is categorically exempt.**
- **Creative work may keep its identity.** Independent artwork, animations, project artifacts, experimental evidence, and native game and simulation visuals may retain their own creative identities. Darkfield governs the surrounding site-owned interface: navigation, controls, layout, interactions and presentation.
- **Rain direction.** Decorative rain is to be removed from reading and working surfaces.
- **No unrelated creative projects.** This migration neither restyles independently authored creative works nor starts or absorbs any separate creative project; the owner's future animation work is out of scope.
- **Execution is provisionally subagent-driven**, with independent verification between tasks.

**Approved by the owner after the r2 review (2026-10-11):**
- **D2.** The canonical Darkfield specification lives in a dedicated **private** GitHub repository, **`kareemsasa/darkfield`**.
- **D2b.** The runtime Darkfield token values, the six OFL fonts and their licences may be committed to the public website repository. That happens in Phase 1 Task 1, which is itself not yet authorized.
- **D11(b) (decided 2026-10-11).** The canonical `tokens.json` usage notes, and any other private quantitative or prose content in it, stay out of the public repository. The canonical file is never copied. Only the allowlist runtime export (`tokens.runtime.json`) is published, and the complete canonical `tokens.json` remains unchanged in the private repository as the sole authority for token values.
- **D9, Phase 0 scope only.** Approved:
  - local documentation commits on the website branch `docs/darkfield-migration-plan` (Tasks P1 and 0);
  - creating the private `kareemsasa/darkfield` repository and pushing to it (Task P2);
  - a local clean-history replacement: the branch `docs/darkfield-migration-sanitized`, created directly from `main` at `a16c70f` in a separate worktree, carrying only the sanitized plan and `AGENTS.md` as local commits. The earlier local branch is superseded and is never to be published.

  Each task still starts only on the owner's instruction.

**Not approved:**
- Pushing any website branch, including both local documentation branches.
- Publishing the Phase 0 documentation: pushing the clean-history branch, opening a pull request, merging. Each needs its own approval.
- Deploying.
- Any Phase 1 implementation or commit.
- Every remaining design, licensing, publication and release decision (D3–D8, D10, D11(a)).

These are listed as gates below and must not be inferred.

**Phase 1 readiness.** Phase 1 can start only when all of these hold:
- Tasks P2 and 0 are complete.
- The Phase 0 documentation has been published to `main` through a separately approved clean-history branch, PR and merge.
- D9 is extended to Phase 1 branches and commits.
- The Phase 0 preflight passes again on the new base.

D10 is answered inside Task 3; D4 gates only Task 5. D11(b) is decided and already reflected in Task 1. D11(a) does not affect Phase 1, because no Phase 1 test asserts a specification-defined limit.

## Specification authority

**Established in Task P2 (2026-10-11):**

| Item | Identity | Notes |
|---|---|---|
| Canonical repository | `kareemsasa/darkfield`, **private** | The only authoritative copy of the specification. Owner-held editing copies are not provenance sources and are never cited in public documents. |
| Version tag | `tokens-v1-2026-10-09` (annotated) → commit `4f02965bfa51eb060c39734608422dde0d288009` | Immutable pin for this migration |
| Design-system export | `darkfield-design-system.zip`, sha256 `018116bd43d11890f280e6eab615bcdb08e3de0871e44215d1bfa7867346b6b8` | Imported unmodified at the repository root |
| R1 production package | `darkfield-r1.zip`, sha256 `595d8e2ee36b1366286ff678c73ebba66f0e604ee267d8d612dfcc6f1931bb42` | Imported unmodified under `r1/`. It contains `r1/SPEC.md`, `favicon.ico` and a validation record, which the export lacks. |
| `tokens.json` (canonical) | sha256 `942115fc42277c33b45207ff2f20cfd4e2e8283930e1e8afcaed81dcab5a9bcc`, version 1 | Private; never copied into this repository (D11(b)). Its runtime projection `tokens.runtime.json` is published (D2b). |
| R1 package vs export assets | PNG masters are byte-identical. The six SVGs have identical geometry but different bytes (serialization and embedded provenance metadata). | The two packages are kept and verified as separate byte sets; neither is normalized |
| Website repository | `kareemsasa3/personal-website` is **public** | Anything committed here is published. Never commit specification prose, private URLs or local environment details. |

**Why a canonical repository is required:** an exported archive on one machine, or a live editing copy, is neither immutable nor reachable from a clean checkout.

**Required arrangement** (the contract; D2 approved the location):
1. **One canonical, versioned copy of the full export with the R1 production package**, in `kareemsasa/darkfield`. Every export that the website pins becomes an immutable, annotated tag there. Layout:
   - The export's `darkfield-design-system/` contents at the repository root.
   - The complete R1 package under `r1/`, including `r1/SPEC.md`, which this plan cites as the R1 spec.
   - `MANIFEST.sha256` at the root.

   The export's `assets/Mark` and `assets/Favicon` remain the registered asset groups. README *Using the system* requires using the registered assets rather than redrawing the mark. `r1/` is the production package as delivered.
2. **A source manifest in this repository**, `web/src/styles/darkfield/SOURCE.json`. It pins:
   - the canonical revision: repository, tag, commit;
   - the two archive checksums above;
   - the canonical `tokens.json` hash from which the runtime file is exported;
   - the sha256 of every published Darkfield source file: the runtime export, fonts and licences. The generated `tokens.css` is not listed; it is checked by compiler sync instead.

   Public provenance rests only on these identifiers.
3. **Only runtime assets are published** in this repository (D2b, D11(b)): `tokens.runtime.json` (an allowlist export containing only token names and values), and the six woff2 fonts with their OFL licences. The website build never needs the spec prose, and no specification text is copied into public files. Public documents cite sections (§NN, README sections, `r1/SPEC.md` sections) and state requirements in their own words.
4. **The canonical `tokens.json` stays the sole authority for token values.**
   - `tokens.runtime.json` is a deterministic export of it.
   - `tokens.css` is generated from the runtime file and checked for sync.
   - **Public verification** checks the published files against `SOURCE.json`, the approved schema and value grammar, and the absence of private fields.
   - **Canonical verification**, run only in an authorized environment, re-exports from the pinned canonical file and requires identical bytes and identical compiled CSS.
   - A public checkout alone cannot establish derivation.
5. **Agents read the spec from the canonical repository at the pinned tag** before each task, never from memory or a local archive. `AGENTS.md` says where. The repository is private, so reading it needs the owner account's access. A clean checkout or CI without that access can still build the website and run its public tests, because the runtime assets are published. It cannot re-verify provenance, which is a local, credentialed step.
6. **Changes go one way.** A later Darkfield edit is exported, committed and tagged canonically. The website then re-exports and re-publishes in its own commit, following [Runtime token propagation](#runtime-token-propagation). The website never edits published Darkfield files by hand.

### Runtime token propagation

**When to run it:** a new canonical Darkfield tag is created, or the canonical schema changes. The steps below are the only way a canonical token change reaches this repository. Each run is its own reviewed commit.

1. **Authorize.** The owner approves the new tag for the website under D9.
2. **Pin.** In an authorized environment, check out `kareemsasa/darkfield` at the new tag, with credentials explicitly bound to `kareemsasa`, and record the commit SHA.
3. **Export.** Run `cd web && node scripts/darkfield-export.mjs <canonical-dir>`.
   - A canonical field the exporter has not classified makes it fail.
   - Classifying a new field as RUNTIME, which publishes it, is a code change to the exporter's allowlist. It needs the owner's D2b/D11 confirmation for that field.
   - Classifying it as PRIVATE needs no publication decision.
4. **Regenerate.** Run `cd web && node scripts/darkfield-tokens.mjs`. Update `SOURCE.json`: the new tag, commit, `tokensVersion`, archive checksums (if a new export archive exists), canonical `tokens.json` hash, runtime file hash, and font and licence hashes. In the same commit, update the pinned literals in `darkfield-vendor.test.mjs` (tag, commit, `tokensVersion`, archive checksums and canonical `tokens.json` hash) so that the public test pins the new revision.
5. **Verify.**
   - Public tests: `darkfield-vendor`, `darkfield-runtime` and `darkfield-tokens`. If a value-grammar regex rejects a legitimate new value, widen it deliberately in the same commit, with the reviewer's agreement; never loosen it to accept free text.
   - Canonical verification: `darkfield-source.mjs --verify`.
   - Review the value diff of `tokens.runtime.json` against the previous commit.
6. **Disclosure check.** The independent reviewer runs the canonical disclosure scan defined below over the full diff: the runtime file, CSS, manifest, tests, commit message and PR text. Any unapproved match is a **stop**.
7. **Commit** with exact-path staging. The canonical `tokens.json` and any canonical prose must never be staged.

**Canonical disclosure scan (defined once, used by every reviewer step that cites it).** It runs only in an authorized environment with the canonical checkout. Nothing is printed except line numbers, categories and lengths. The scanned corpus is:
- all specification prose: `README.md`, `spec/*.md`, plate READMEs and previews, asset READMEs, `design-system.json`, `r1/` text, and the `<title>` and `<metadata>` text of the export's asset SVGs;
- **the private fields of the canonical `tokens.json`**: every `note`, `usage` and `sample`, and the theme and type-group display `name`s.

The scan must report:
1. any quoted string of three or more words that occurs in the corpus;
2. any run of five or more consecutive words shared with the corpus;
3. any specification-defined limit (a non-token design value) that appears in the artifact.

Approved token values, font stacks, hashes and identifiers are expected matches and are listed separately. Anything else is a **stop**.

**Leakage controls, by channel:**

| Channel | Control |
|---|---|
| Runtime file | The allowlist projection plus fail-on-unclassified fields in the exporter. The public exact-key and value-grammar tests (`darkfield-runtime.test.mjs`) structurally constrain names and values to fixed formats. They cannot rule out every short phrase hidden in a name or a font stack, so canonical verification and the canonical disclosure scan remain required. |
| Generated CSS | The compiler writes only two fixed header comments, which `darkfield-runtime.test.mjs` asserts. Token values are the only other content. |
| `SOURCE.json` | Identifiers and hashes only; `darkfield-vendor.test.mjs` asserts each entry's exact keys. |
| Test fixtures and plan examples | Only approved token values, hashes and site data; no usage notes or specification limits (D11(a) remains open). |
| Logs | The exporter prints only a hash, and the verifier prints only file paths and mismatches. Canonical verification never runs in public CI. |
| Commits, PRs, reviews | Exact-path staging; reviewer disclosure scan (step 6); no canonical text in messages. |

## Scope boundary: governed interface vs creative work

**The rule:**
- Every visitor-facing route is governed. Its site-owned interface follows Darkfield: navigation, page chrome, layout, headings and prose presentation, controls, menus, HUD chrome, captions, legends, focus, interaction states, loading and error states, transitions and atmosphere.
- Creative content inside a route keeps its own identity and is **never restyled by this migration**. That covers embedded artworks, native game and simulation visuals, recorded media, and historical evidence. Darkfield governs only the frame around such content.
- Selecting which of a creative work's *existing* palettes to show for the active theme is plumbing, not restyling. Changing the palette's values is restyling.

**Accessibility floor for creative content (not Darkfield styling):**
- Site-owned controls around creative content get Darkfield focus and keyboard behaviour.
- Existing accessibility behaviour inside creative content must not regress. Today the procedural pieces handle `prefers-reduced-motion` themselves, and `web/scripts/procedural-animations-browser-test.mjs` verifies that the preference reaches each artifact through its frame.

**Surface inventory.** Verified against `a16c70f`; all "how mounted" facts were checked by `rg` over `web/src` on 2026-10-11. Classifications marked **confirm** are D6 questions.

| Route(s) | Governed interface | Creative or native content (retains identity) | Evidence (never restyled) | How mounted | D6 |
|---|---|---|---|---|---|
| `/`, `/projects`, `/experience` (`/work`), `/journey`, `/writing`, `/writing/:slug` | Everything | — | `TimelineItem` images (dark/light variants); article images | DOM | — |
| `/case-studies`, 4 case studies | Everything, including the `MediaInspector` chrome | — | `ProjectMedia` recordings and screenshots, for example the Aether visualizer clip | DOM + `<video>`/`<img>` | — |
| `/procedural-animations`, `/procedural-animations/:slug` | Index, page chrome, the `.animation-piece__control` bar | `public/procedural-animations/*/piece.html` (own fonts and motion) | — | `<iframe>` (`ProceduralAnimationPiece.tsx:41-44`) | — |
| `/terminal` | The whole terminal interface (site-owned feature; §07 governs its text graphics) | — | — | DOM | — |
| `/simulations` | Cards, launch buttons, layout | Card previews that depict native game visuals (`.food-preview`, `.spider-preview-card-face` in `SimulationCard.css`) | — | DOM | **confirm** |
| `/simulations/orbital-simulator` | DOM controls, panels, readouts (`OrbitalSimulator.css`) | Canvas render (`OrbitalSimulator/renderer.ts`) | — | `<canvas>` | — |
| `/simulations/traffic-simulator` | DOM controls, panels (`TrafficSimulator.css`) | Canvas renders (`RoadCanvas.tsx`, `SpaceTimeCanvas.tsx`, `renderer.ts`) | — | `<canvas>` | — |
| `/simulations/snake` | Page chrome, buttons | Board, snake, food (`.food` reads `--accent-color`) | — | DOM/CSS | **confirm**: is the score HUD and game-over overlay (`.game-scores`, `.game-over-content`) chrome or native? |
| `/simulations/spider` | Page chrome, buttons, status | Cards, columns, playfield (`.spider-column:empty` reads `--app-border`) | — | DOM/CSS | **confirm**: container font and text colour (`.spider-solitaire`) |
| `/simulations/rhythm-lab` | Menus, song selector, settings, tutorial, results | Gameplay lanes, notes, judgement visuals | — | DOM/CSS. One stylesheet (`RhythmLab.css`, 2123 lines) mixes both | **confirm**: root `.rhythm-lab` font and colour |
| `/simulations/annals` | Page chrome, navigation | The world presentation: serif parchment panels (`Annals.css:6,14-20,159`) | — | DOM (`pages/Annals/sim/*`) | **confirm**: which Annals controls are site chrome |
| All routes (background) | Rain, bionic and static grid backgrounds are site atmosphere | — | — | `<canvas>` | Rain direction decided; D3 covers what remains |
| `*` (NotFound), error boundary, loaders, toasts, modals | Everything | — | — | DOM | — |
| Head, social | Favicon, `theme-color`, manifest, `og-image` | — | — | static | — |

**Creative-owned paths:**
- `web/public/procedural-animations/**`
- `web/public/media/**`
- `web/src/pages/Annals/sim/**`
- `web/src/components/OrbitalSimulator/renderer.ts`
- `web/src/components/TrafficSimulator/renderer.ts`
- `RoadCanvas.tsx`
- `SpaceTimeCanvas.tsx`

Mixed files (governed and native visuals in one stylesheet): `SnakeGame.css`, `SpiderSolitaire.css`, `RhythmLab.css`, `SimulationCard.css`, `Annals.css`. A task may change a creative-owned path or a native-visual selector in a mixed file only where the task names it explicitly. Reviewers reject anything else.

## Global Constraints

Every task's requirements implicitly include these.

- **One token source** (§17). Token values come only from the canonical `tokens.json`, through the published runtime export `tokens.runtime.json`. Never hand-type a Darkfield hex, duration or easing into site CSS; reference `var(--<token>)`.
- **Area and emission budgets.** Each view of the governed interface must stay within every budget the specification defines. This public plan names the budgets and cites their sources, but does not restate their limits. Implementers and reviewers read the exact values from the canonical repository at the pinned tag.

  | Budget | Defined in |
  |---|---|
  | Minimum share of `field` and `field-deep` | §05 *How much of each*; §17 *Not tokenised* |
  | Minimum largest contiguous void | §08 *Balancing density and emptiness*; §17 *Not tokenised* |
  | Maximum surface share, and maximum structure share | §05 *How much of each* |
  | Maximum full-intensity `signal` share, and maximum combined `signal-dim` + `signal-deep` share | §05 *How much of each* |
  | Maximum combined secondary-hue share | §05 *How much of each* |
  | Maximum `glow-signal` elements, and maximum `flare` elements | §05 *How much of each*; §11 *Rules*; §17 *Glow strength and focus* |
  | Maximum simultaneous atmospheric effects | §10 *Global limits* |

  See [Phase 6](#phase-6-conformance-measurement).
- **Geometry** (README *Using the system*, §03, §17 *Corner radii*). Every corner is square (`radius-0`): containers, controls, inputs, cells and panels. The single exception is circular nodes within the size limit of §17 *Corner radii* (`radius-node`). `cut-*` chamfers follow README *Using the system*, §09 *Frames and corners* and §17 *Chamfers*. The README summary sets a stricter per-container limit than §09/§17. Until the owner rules which reading governs, the stricter limit applies.
- **Text contrast** (README *Using the system*). Opacity is never used to lower text contrast; text uses the `fg`, `fg-muted` and `fg-faint` tokens. Every text/ground pair introduced by this migration must be a pair from §05 *Contrast, verified*, or be measured ≥ 4.5:1 in every shipped theme.
- **Focus** (README *Using the system*, §13 *Focus in each theme*, §17 `focus-ring`). Keyboard focus is always shown with the `focus-ring` token: two 2 px layers taken from the token's value, the outer one in signal colour and the inner one matching the ground. A glow never substitutes for it.
- **Motion** (README *Using the system*, §12 *Reduced motion, by class*). Every animation honours `prefers-reduced-motion`, using the per-class reduced form that §12 defines.
- **Fonts** (README *Using the system*, §07). The site loads the bundled OFL font files from the export rather than third-party hosted subsets, which lack the glyph coverage text graphics need.
- **Identity mark** (README *Using the system*, §18, `r1/SPEC.md` §1). Only the registered mark assets are used. The mark is never redrawn, mirrored, rotated, skewed, outlined, recoloured into two colours, or placed in a container.
- **No component bundle** (README *Map*). The plates are reference specimens, not importable components. Never copy plate `preview.html` markup into the site.
- **Creative boundary.** Never restyle creative-owned content (see [Scope boundary](#scope-boundary-governed-interface-vs-creative-work)).
- **CI Node version (future constraint; do not change CI here).**
  - `.github/workflows/web-ci.yml:31` pins `node-version: 20`.
  - Node 20 cannot import `.ts` modules from `node:test` files; unflagged type stripping needs Node ≥ 22.18. `darkfield-settings.test.mjs` therefore runs locally only, like the existing `scroll-progress.test.mjs`, which CI does not run either: CI runs `npm test`, which is the smoke test.
  - Any proposal to run the Darkfield tests in CI (Task 7 Step 5) must include either a CI Node upgrade to ≥ 22.18 or a TypeScript-free form of those tests. Both are CI changes that need approval.
- **Repository rules (`AGENTS.md`).**
  - No new npm dependencies.
  - No `package.json` script, CI or infrastructure changes without approval.
  - Don't rename routes or remove canonical aliases.
  - Don't rewrite copy.
  - One concern per commit.
  - Docs-only commits stay separate.
  - Never commit `docs/private/`.

## Decision gates

D1 is approved. Each remaining gate blocks only the tasks named.

| ID | Decision | Options and consequences | Recommendation | Blocks |
|---|---|---|---|---|
| **D1** | Adopt Darkfield site-wide | — | **Approved 2026-10-11** | — |
| **D2** | Where the canonical full Darkfield export lives | Options considered in r2: **(A)** in this public repository; **(B)** a dedicated repository; **(C)** archive and hosted artifact only, rejected as not reproducible | **Approved 2026-10-11: option B, private, `kareemsasa/darkfield`** | — |
| **D2b** | Publish runtime assets in this public repository: runtime token values, six OFL fonts with licences | Token values are already public through served CSS once shipped. OFL permits redistribution with the licence. | **Approved 2026-10-11, scoped by D11(b):** publish the allowlist runtime export `tokens.runtime.json`, never the canonical `tokens.json`. Publication happens in Task 1, which is not yet authorized under D9. | — |
| **D3** | What remains of rain | Removal from reading and working surfaces is decided. Still open: whether rain survives anywhere (§10 *Atmosphere by context* permits it only in cover, empty-state and loading contexts), and whether the "Background animation" setting stays (`SettingsPanel.tsx:362-370`). | Keep rain only as an opt-in cover effect on Home, behind no text, with §07 glyphs; or remove it entirely. Keep the setting only if rain remains. | Phase 2 atmosphere task |
| **D4** | Mono theme exposure | **(a)** A user-facing third theme. **(b)** Supported in code and tests but not offered in Settings (QA-only). **(c)** None. Option (c) would make §05's pre-release Mono check (*Monochrome*) impossible to perform. | (a); (b) is acceptable | Task 5; Phase 6 Mono checks |
| **D5** | Header identity | R1 symbol (uncontained, `signal`, clear space per §18) beside "Kareem Sasa", or keep the "KS" monogram (`HeaderNavigation.tsx:91-93`). §18 excludes letters and initials from the mark, so KS can never be the Darkfield mark. | Your call | Phase 4 |
| **D6** | Confirm the **confirm** rows of the surface inventory | Until confirmed, Phase 1 **holds** the ambiguous selectors at their legacy values (see Task 3 and Task 4). Holding is reversible; restyling a native visual by mistake is not. | Confirm row by row | Phase 5 tasks for Snake, Spider, Rhythm Lab, Annals and Simulations previews; lifting Phase 1 holds |
| **D7** | Project lifecycle statuses (Live, Active Development, Demo Ready, Maintenance, Completed) | These are not §05 system states; their current hues collide with Darkfield's reserved meanings (`ProjectRoster.css:17-21`: violet ≈ `ion`, yellow ≈ `caution`) | Context labels (`label-sm`, `fg-muted`, no hue), with `•` only on Live | Phase 3 |
| **D8** | Primary call-to-action styling | The §13 control model has no filled primary button; a solid fill is reserved for the Pressed inverse | Idle controls on an `edge` boundary; prominence from position | Phase 3 |
| **D9** | Execution authorization | Each is separately approvable: create branches; commit per task; push; open pull requests; merge; deploy. Your global rule is to commit or push only when asked. | **Phase 0 approved 2026-10-11:** website branch `docs/darkfield-migration-plan` with local documentation commits (P1, Task 0; superseded, never to be published); creation of private `kareemsasa/darkfield` and pushing to it (P2); the local clean-history replacement branch `docs/darkfield-migration-sanitized` from `main` at `a16c70f`, with local documentation commits. **Still open:** publication of the Phase 0 documentation: pushing the clean-history branch, a PR and a merge, each separately approved. Also open: all Phase 1 branches and commits; deploys. | Merging Phase 0; all of Phase 1 |
| **D10** | Accept the known-deficiency ledger | Created in Task 3 from a baseline run. Accepting it means those pre-existing failures are tracked, not fixed, in Phase 1. | Review entries, then accept | Task 3 commit |
| **D11** | Publication of private design thresholds | **(a)** An automated check that asserts a specification-defined limit (for example area and void budgets, glow/flare/effect counts, lit-cell density, node size and chamfer limits, mark minimum size, heartbeat allowance, display-line count, motion cadence ratios, or any other specification-defined limit) would place that limit in this public repository. **(b)** Whether the canonical `tokens.json` usage notes may be published. | **(a) Open.** Owner decision; nothing is pre-authorized. Without it, such checks stay reviewer-judged or read their limits from the private repository at run time. **(b) Decided 2026-10-11:** usage notes stay private. Only runtime token values, through the allowlist export `tokens.runtime.json`, plus the OFL fonts and licences, are published. See Task 1. | (a) Phase 6 automated budget checks and any test asserting such a limit |

## Operational safety

**Workspace:**
- Each execution session creates `DF_TMP=$(mktemp -d -t darkfield.XXXXXX)` and keeps every temporary file, PID file, log and screenshot there.
- Never write scratch output into the repository, including tool output directories inside it.
- Run all commands from the repository root unless a step says `cd web`.

**Preview servers: identity-verified start and stop.** Install this script once per session; it lives in `$DF_TMP`, not in the repo.

```bash
cat > "$DF_TMP/df-serve.sh" <<'EOF'
#!/usr/bin/env bash
# df-serve.sh <name> <web-dir> <port> [start|stop]
# Builds <web-dir> and (re)starts its production preview on 127.0.0.1:<port>.
# Stops only a process this script started AND whose cmdline and cwd prove it is
# that preview. Never kills by pattern: a pattern can match the calling shell.
set -euo pipefail
name=$1; dir=$(realpath "$2"); port=$3; action=${4:-start}
state="${DF_TMP:?DF_TMP is not set}/$name.pid"
owned() {
  [ -r "/proc/$1/cmdline" ] || return 1
  tr '\0' ' ' <"/proc/$1/cmdline" | grep -q "node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port $port " || return 1
  [ "$(readlink "/proc/$1/cwd")" = "$dir" ]
}
if [ -f "$state" ]; then
  pid=$(cat "$state")
  if owned "$pid"; then kill "$pid"; while kill -0 "$pid" 2>/dev/null; do sleep 0.2; done; fi
  rm -f "$state"
fi
[ "$action" = stop ] && exit 0
if ss -ltnH "sport = :$port" | grep -q .; then
  echo "STOP: port $port is held by a process this script did not start" >&2; exit 3
fi
(cd "$dir" && npm run build)
cd "$dir"
nohup node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port "$port" --strictPort >"$DF_TMP/$name.log" 2>&1 &
echo $! >"$state"
for _ in $(seq 50); do curl -fsS "http://127.0.0.1:$port/" >/dev/null 2>&1 && exit 0; sleep 0.2; done
echo "STOP: preview $name did not start; see $DF_TMP/$name.log" >&2; exit 4
EOF
```

How the script is used:
- **Head preview:** `bash "$DF_TMP/df-serve.sh" head web 4173`.
- **Baseline preview:** `bash "$DF_TMP/df-serve.sh" base "$DF_TMP/baseline/web" 4174`, served from a detached worktree of the baseline commit (Task P0).
- **Stop:** `… stop`.
- Running `vite.js` directly, rather than through `npx`, makes `$!` the server itself.
- The build output is `web/build/`, which is gitignored (`web/.gitignore:12`).

**Playwright** (no repo change; matches `PLAYWRIGHT_VERSION` in `.github/workflows/visual-review.yml:42`):

```bash
npm install --prefix "$DF_TMP/pw" --no-save --no-package-lock --ignore-scripts --no-audit --no-fund playwright@1.63.0
PLAYWRIGHT_BROWSERS_PATH="$DF_TMP/browsers" node "$DF_TMP/pw/node_modules/playwright/cli.js" install --only-shell chromium
export PLAYWRIGHT_BROWSERS_PATH="$DF_TMP/browsers" DF_PW="$DF_TMP/pw/node_modules/playwright/index.mjs"
```

**Staging and commits:**
- Stage only the exact paths a task lists, with `git add -- <paths>`.
- Never use `git add -A`, `git add .`, `git add -u <dir>` or `git commit -a`.
- Before every commit:
  - `git diff --cached --name-only | sort` must equal the task's path list, sorted. Anything extra means unstage and **stop**.
  - `git status --porcelain --untracked-files=all` must show nothing outside that list.
- `npm run build` regenerates `web/src/data/generated/articles.ts`. Any diff there is unexpected; **stop** and report.
- One task, one commit, on the task's branch. Nothing is pushed, opened as a PR, merged or deployed without D9.

**Independent review between tasks (subagent-driven).** For each task:
- The **implementer** receives:
  - the task text
  - the cited spec sections from the canonical source at the pinned tag
  - the current ledger
- The **reviewer** is a different agent, on the most capable model. It receives:
  - the task text
  - the cited spec sections
  - the diff from the task's base commit
  - the staged path list
  - the ledger

  It must:
  1. Re-run every verification command itself, from freshly started previews.
  2. Confirm the staged paths equal the task's list.
  3. Confirm no creative-owned path or native-visual selector changed unless the task names it.
  4. Confirm every new ledger entry reproduces on the baseline preview.
  5. Confirm no test, selector or route was removed from coverage.

  For Task 1, Task 2, and any later runtime re-export, the reviewer also:
  - runs canonical verification itself in an authorized environment;
  - runs the canonical disclosure scan (defined under [Runtime token propagation](#runtime-token-propagation)) over every published Darkfield artifact: `tokens.runtime.json`, `tokens.css`, `SOURCE.json`, test fixtures, and the commit and PR text. Its corpus includes the private fields of the canonical `tokens.json`;
  - reports derivation as **UNVERIFIED**, never PASS, when it has no canonical access.

  The reviewer edits nothing. It returns PASS or FAIL with command output. A FAIL goes back to the implementer; a second FAIL on the same task is a stop condition.

**Stop conditions.** Halt, change nothing further, and report to the owner when any of these occur:
1. The branch, baseline SHA, tree state or checksums disagree with the preflight record.
2. A required gate is unanswered.
3. A step needs a file outside the task's list, a creative-owned path, a package script, a dependency, CI, or infrastructure.
4. A port is held by a process the serve script did not start.
5. An unexpected diff appears after a build.
6. A new regression appears that the task cannot fix within its own files.
7. The spec is ambiguous or seems to conflict with this plan; the spec wins, but the plan must be amended by the owner first.
8. A reviewer fails the same task twice.

## Validation model

| Check | Kind | Establishes | Does not establish |
|---|---|---|---|
| `darkfield-vendor.test.mjs` | **Invariant** (static, public) | `SOURCE.json` pins the canonical revision, the archives and the canonical `tokens.json` hash. Published files equal their manifest hashes. Only fonts and licences are copied files; the runtime file is declared as an allowlist export | That the runtime file truly derives from the canonical file (canonical verification only) |
| `darkfield-runtime.test.mjs` | **Invariant** (static, public) | `tokens.runtime.json` has exactly the approved keys, per-group value grammar and no private fields. `tokens.css` carries only its two fixed header comments | Value correctness against the canonical file (canonical verification only) |
| `darkfield-source.mjs --verify` | **Canonical verification** (authorized environment only) | Fonts and licences byte-identical to canonical. The runtime file is a byte-identical re-export of the pinned canonical `tokens.json`, whose hash matches. From Task 2 onward, compiling either input gives identical CSS | Anything about rendered output |
| `darkfield-tokens.test.mjs` | **Invariant** (static) | `tokens.css` is a faithful compile of `tokens.runtime.json` (values, escapes, themes, fonts, type classes) and is in sync | That the site uses the tokens correctly |
| `darkfield-bridge.test.mjs` | **Invariant** (static) | Single theme source; every legacy variable mapped or explicitly held; no literal colours outside the legacy fence; no text colour reads a ground alias; font families unified outside held selectors | Rendered contrast or semantic correctness |
| `darkfield-settings.test.mjs` | **Invariant** (unit) | Settings import accepts old exports and `mono`, and rejects unknown themes | — |
| Browser test, invariants section | **Invariant** (rendered) | Page ground is `field` per theme; no inline theme tokens; unknown stored theme falls back to dark; no-JS shell is on `field`; fonts served and loaded; focus ring on every element reached by Tab on the listed routes; outline present under forced colors | Focus on elements not reached in 25 Tabs; the painted colour under forced colors (human check) |
| Browser test, enumerated pairs | **Regression** (rendered, baseline-aware) | Contrast of every fill/text pair whose ground the bridge changes (inventory E-6), in every theme, including hover where listed. A pair whose selector is not rendered on the listed routes is reported **UNCOVERED**, never passed. | Pairs not in the inventory |
| Browser test, contrast sampler | **Sampler** (rendered, baseline-aware) | Text matched by the sampler selectors on the listed routes, against composited background *colours* | Text over images, canvases, gradients or iframes; states not rendered (hover, open menus); routes not listed. It is not a WCAG audit. |
| Existing browser tests (`boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata`, `procedural-animations`, `orbital`) and `npm test` | **Regression** (baseline-aware) | Existing behaviour holds | — |
| Visual review screenshots (`scripts/visual-review.mjs`) | **Human** | Composition, readability of the transitional mixed palette, boundaries that disappeared, creative regions visibly unchanged | Anything not looked at |

**Baseline-aware ledger.** `web/scripts/darkfield-known-deficiencies.json` records failures that exist at the baseline commit.
- **How it is created.** Task 3 runs the regression and sampler checks against the baseline preview in `DARKFIELD_MODE=record`. Every candidate is reproduced by the reviewer, and the owner accepts the list (D10).
- **How `check` mode treats results:**
  - A failure not in the ledger is a **new regression** and fails.
  - A failure in the ledger is printed as **KNOWN** and does not fail, unless its measured value got worse than the recorded baseline value.
  - A ledger entry whose check ran but no longer fails is **stale** and fails until it is removed in the same commit that fixed it.
- **Coverage is never removed to make a run pass.**
- **Known baseline issues outside the ledger's checks** are recorded in the ledger's `notes` array, not as entries:
  - `web/scripts/orbital-browser-test.mjs:196` clicks a "Switch to light mode" button that no longer exists.
  - Dark Projects stat-card green-on-green, about 1.15:1 (a deferred finding from the earlier theme work).

---

## Phase 0: Preflight and provenance (docs and verification only)

### Task P0: Preflight gate (no changes)

Run this before Phase 0 and again before Phase 1. Record the output in the session report.

- [ ] **Step 1: Check the repository state.**

  ```bash
  git fetch origin
  git rev-parse --abbrev-ref HEAD          # Phase 0: main. Phase 1: the Phase 1 branch, created from origin/main after Phase 0 merges.
  BASE=$(git rev-parse origin/main); echo "$BASE"
  git status --porcelain --untracked-files=all
  git worktree list
  ```

  Expected:
  - The branch is as noted.
  - `git status` shows only `?? docs/superpowers/plans/2026-10-11-darkfield-migration.md` before Task P1, and nothing afterwards.
  - No worktree has a Darkfield branch checked out.

  If `BASE` ≠ `a16c70fefc1e577b3bdfdef102d961a4b775b017`:
  - Re-verify every anchor in the [Reference index](#reference-index) by its search pattern.
  - Update line numbers in the plan, in a docs-only commit, before continuing.
  - Any anchor that no longer matches is a **stop**.

- [ ] **Step 2: Verify the source.** The canonical repository's tag `tokens-v1-2026-10-09` must resolve to commit `4f02965bfa51eb060c39734608422dde0d288009`. From Phase 1 Task 1 onwards, it must also match `SOURCE.json`. Check the resolution with credentials explicitly bound to the owner account; see Task P2's identity rule. A mismatch is a **stop**.

- [ ] **Step 3: Verify the toolchain.**
  - `node --version` must be ≥ 22.18 (unflagged type stripping for `darkfield-settings.test.mjs`; v22.23.3 on 2026-10-11).
  - `cd web && npm ci` must succeed with no lockfile change.
  - Ports 4173 and 4174 must be free: `ss -ltnH 'sport = :4173 or sport = :4174'` prints nothing.

- [ ] **Step 4: Prepare the baseline.** For Phase 1 only:
  ```bash
  git worktree add --detach "$DF_TMP/baseline" "$BASE"
  (cd "$DF_TMP/baseline/web" && npm ci)
  ```
  Remove it at session end with `git worktree remove "$DF_TMP/baseline"`.

- [ ] **Step 5: Confirm the plan is preserved.** For Phase 1 only, `git log -1 --format=%H -- docs/superpowers/plans/2026-10-11-darkfield-migration.md` must print a commit reachable from `BASE`.

### Task P1: Preserve this plan (docs only; completed locally 2026-10-11)

The plan was committed on a local documentation branch. Publication happens only through a separately approved clean-history branch (see D9).

**Files:**
- Create: `docs/superpowers/plans/2026-10-11-darkfield-migration.md` (already on disk, untracked)

- [ ] **Step 1: Create the branch.** `git switch -c docs/darkfield-migration-plan` from `main` at `BASE`.
- [ ] **Step 2: Check the file.** `git diff --no-index --check /dev/null docs/superpowers/plans/2026-10-11-darkfield-migration.md` reports no whitespace errors. Its exit code is 1 because the files differ; that is expected.
- [ ] **Step 3: Commit.**
  ```bash
  git add -- docs/superpowers/plans/2026-10-11-darkfield-migration.md
  git commit -m "docs(plans): add Darkfield migration plan"
  ```

  This must land before Task 0, because Task 0 makes `AGENTS.md` point at this file.

### Task P2: Establish the canonical specification source (completed 2026-10-11)

**Result:**
- The private repository `kareemsasa/darkfield` exists, with default branch `main` at `4f02965bfa51eb060c39734608422dde0d288009`.
- The annotated tag `tokens-v1-2026-10-09` resolves to that commit.
- The repository holds 77 files: 58 export files at the root, 18 R1 package files under `r1/`, and `MANIFEST.sha256`.
- Checks (a)–(d) below passed twice, on a fresh clone of the local repository before the push and on a fresh clone from GitHub after it.
- Privacy was confirmed through the authenticated API (`visibility=private`), and anonymous requests returned 404.

The procedure below is kept as the contract for verifying the pin and for importing any future Darkfield export under a new tag.

**Destination:** `kareemsasa/darkfield`, **private**. Work happens outside the website repository, in `$DF_TMP/darkfield`, and nothing in the website repository changes.

**Stop conditions** (in addition to the general ones):
- The authenticated identity is not `kareemsasa`.
- The repository (first import) or the tag (later imports) already exists.
- The repository is not private.
- Any verification below fails.

- [ ] **Step 1: Pin the identity.** Never rely on a CLI's default or "active" account. Bind every GitHub API call and push to credentials for the owner account, and verify the authenticated login before any write.

  ```bash
  export GH_TOKEN="<token for the kareemsasa account, obtained without printing it>"
  test "$(gh api user --jq .login)" = kareemsasa
  gh api repos/kareemsasa/darkfield >/dev/null 2>&1 && { echo "STOP: kareemsasa/darkfield exists"; exit 3; } || true   # first import only
  ```

  Contact no host other than GitHub. Before pushing, confirm that the SSH route used for the push authenticates as `kareemsasa` (`ssh -T` against that route), and test nothing else.

- [ ] **Step 2: Assemble the tree from the verified archives.** `EXPORT_ZIP` and `R1_ZIP` are the operator's local paths to the two archives; their checksums must match [Specification authority](#specification-authority).

  ```bash
  sha256sum "$EXPORT_ZIP" "$R1_ZIP"   # must match Specification authority
  mkdir -p "$DF_TMP/src" "$DF_TMP/darkfield"
  unzip -q "$EXPORT_ZIP" -d "$DF_TMP/src"
  unzip -q "$R1_ZIP" -d "$DF_TMP/src"
  cp -a "$DF_TMP/src/darkfield-design-system/." "$DF_TMP/darkfield/"
  mkdir "$DF_TMP/darkfield/r1" && cp -a "$DF_TMP/src/darkfield-r1/." "$DF_TMP/darkfield/r1/"
  cd "$DF_TMP/darkfield"
  find . -type f ! -path './.git/*' ! -name MANIFEST.sha256 -print0 | sort -z | xargs -0 sha256sum > MANIFEST.sha256
  git init -b main && git add -A && git commit -m "Import Darkfield export (tokens v1, 2026-10-09) and R1 production package"
  git tag -a tokens-v1-2026-10-09 -m "Darkfield export: design-system.zip sha256 018116bd…b6b8; darkfield-r1.zip sha256 595d8e2e…bb42"
  ```

  `git add -A` is acceptable here and only here: the directory is a fresh repository holding nothing but the assembled files.

- [ ] **Step 3: Verify before pushing.** Run all four checks from a fresh clone of the local repository at the tag, so that what is checked is what git stores:

  ```bash
  git clone -q --branch tokens-v1-2026-10-09 "$DF_TMP/darkfield" "$DF_TMP/verify" && C="$DF_TMP/verify"
  # (a) every original export file, individually, against its canonical counterpart at the root
  (cd "$DF_TMP/src/darkfield-design-system" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$DF_TMP/export.sha256"
  (cd "$C" && sha256sum --strict --quiet -c "$DF_TMP/export.sha256")
  # (b) every R1 package file, individually, against its counterpart under r1/
  (cd "$DF_TMP/src/darkfield-r1" && find . -type f -print0 | sort -z | xargs -0 sha256sum) | sed 's#  \./#  ./r1/#' > "$DF_TMP/r1.sha256"
  (cd "$C" && sha256sum --strict --quiet -c "$DF_TMP/r1.sha256")
  # (c) the manifest validates against the stored files
  (cd "$C" && sha256sum --strict --quiet -c MANIFEST.sha256)
  # (d) the stored tree is exactly export ∪ r1 ∪ {MANIFEST.sha256}: no missing and no extra files
  diff <(cd "$C" && git ls-files | sort) \
       <({ sed 's#^[0-9a-f]\{64\}  \./##' "$DF_TMP/export.sha256" "$DF_TMP/r1.sha256"; echo MANIFEST.sha256; } | sort)
  ```

  Expected: exit 0 from every command, and no output apart from the detached-HEAD notice that `git clone --branch <tag>` prints. A dry run of Steps 2–3 on a throwaway local repository on 2026-10-11 (no GitHub involved) gave:
  - exit 0 for checks (a)–(d), with 58 export files plus 18 R1 files plus the manifest, so 77 tracked files;
  - a deliberately altered `spec/05-color.md` failed (a);
  - an extra committed file failed (d).

  This replaces r2's whole-tree `diff -r`, which could never come out empty: the canonical tree adds `r1/` and `MANIFEST.sha256` to the export.

- [ ] **Step 4: Create the private repository and push.**

  ```bash
  gh repo create kareemsasa/darkfield --private --description "Darkfield design system: canonical specification, tokens and identity assets"
  test "$(gh api repos/kareemsasa/darkfield --jq .visibility)" = private
  cd "$DF_TMP/darkfield" && git remote add origin git@github.com:kareemsasa/darkfield.git   # or the operator's SSH route that authenticates as kareemsasa
  git push origin main && git push origin tokens-v1-2026-10-09
  ```

- [ ] **Step 5: Verify the remote.**
  - Clone `kareemsasa/darkfield` at the tag, through the same verified identity, into a new directory, and repeat Step 3's checks (a)–(d) against it.
  - Confirm that `git ls-remote origin refs/tags/tokens-v1-2026-10-09^{}` matches the local tag's commit.
  - Record the repository (`github.com/kareemsasa/darkfield`), the tag, and the commit SHA for Task 0 and `SOURCE.json`.
  - Unset `GH_TOKEN`.

### Task 0: Repository instructions (docs only; completed 2026-10-11)

**Files:**
- Modify: `AGENTS.md`

**Result.** `AGENTS.md` now establishes five things:
- **Governing system.** In Operating Rules, Darkfield is the governing design system for the site's own interface on every visitor-facing route, and no page is categorically exempt. The governed list is non-exhaustive, and all visual values come from Darkfield's `tokens.json`.
- **Pre-Phase-1 deferral.** UI work that needs Darkfield values waits until Phase 1 publishes the runtime token export (`tokens.runtime.json`), the generated `tokens.css` and the licensed fonts. The canonical `tokens.json` is never copied into the repository.
- **Creative boundary.** Independently authored creative work, project artifacts and media, experimental and historical evidence, and native simulation and game visuals keep their identities; Darkfield governs the interface around them. New Matrix-theme styling is prohibited.
- **Plan authority.** This plan is the authoritative local reference for migration sequencing, scope, constraints, validation and gates.
- **Source and transition.** The Repository Overview records the transition from the terminal/Matrix theme. Project-Specific Notes name the canonical source: private `kareemsasa/darkfield`, tag `tokens-v1-2026-10-09`, commit `4f02965bfa51eb060c39734608422dde0d288009`, with the R1 spec at `r1/SPEC.md`.

The committed `AGENTS.md` text is authoritative for the exact wording. An independent read-only review passed it twice.

**Verification contract** (for any later edit to these instructions):
- `git diff --check -- AGENTS.md` prints nothing.
- Only `AGENTS.md` is staged.
- The text cites, but never quotes, the private specification.
- Commit message: `docs(agents): adopt Darkfield for the site interface`.

Phase 0 ends here. Publishing the Phase 0 documentation (clean-history branch, push, PR, merge) needs separate D9 approvals.

---

## Phase 1: Foundation

**Outcome:**
- The governed interface renders on the Darkfield palette in Dark, Light and (with D4) Mono.
- The Darkfield fonts are self-hosted.
- Theme values have one source.
- Keyboard focus uses `focus-ring` and survives forced-colors mode.
- No creative content is restyled.

**What Phase 1 does and does not deliver.**

| Delivered (foundation coverage) | Not delivered (full conformance comes in Phases 2–6) |
|---|---|
| Variables read through the bridge resolve to Darkfield roles per theme | About 250 literal greens, including 102 in `RhythmLab.css`, 29 in `SimulationCard.css`, 28 in `TerminalDropdown.css` and 22 in `Projects.css` (rg count of `#4caf50`, `rgba(0,255,0`, `#00ff`, `rgba(76,175,80`); 27 literal white text colours; and local colour variables in 8 stylesheets (Terminal 18, Traffic 12, …). Expect a visibly **mixed palette** until Phase 3 and Phase 5. |
| Archivo and IBM Plex Mono replace the system and Courier stacks (41 declarations; 6 held per D6) | Voice assignment. Prose that is wrongly set in mono stays mono, now Plex. |
| `focus-ring` everywhere | §13 control states, hover grammar, pressed inverse |
| Contrast held or improved for every enumerated pair | Rank and prominence semantics. `signal-dim` replaces Material green wherever the brand green was used, including decorative uses, so green-means-signal is not yet true. |
| One theme source; Mono support (D4) | Geometry, lines, glow, shadows, atmosphere, motion |

**Bridge mapping review** (evidence: every consumer found by a rule-level scan of `web/src/**/*.css` on 2026-10-11; contrast computed with WCAG 2 relative luminance):

| Legacy variable | r1 mapping | r2 decision | Why |
|---|---|---|---|
| `--brand-primary`, `--primary-color` (≈ 220 reads) | `signal-dim` | **Keep** `signal-dim` | §05 *When bright signal appears*: full `signal` is reserved for live, current or focused elements; resting elements take `signal-dim`, `fg-muted` or `fg`. Text on grounds: Dark 7.57:1 (was 6.26), Light 5.14:1 (was 5.59), both verified pairs. Known limitation: decorative uses keep looking like signal until Phase 3. |
| `--brand-primary-dark`, `--primary-color-dark` (fills) | `signal-deep` | **Keep**, and fix the text colour in Task 3 | `.btn-primary` inherits `color: white` from `.btn` (`Home.css:80`). On Light `signal-deep` (`#ccedd2`) that would be **1.26:1**, down from 7.87:1. Fix: the rule uses `var(--text-color)`, so the pair becomes `fg` on `signal-deep`, a §05-verified pair (≥ 9.9 Dark, ≥ 13.6 Light). `.projects-cta-primary` (`Projects.css:118-120`) has the same pattern but no component renders it (`rg` over `web/src/**/*.tsx`). It is left untouched and listed for Phase 3 cleanup; deleting dead CSS needs approval. |
| `--brand-primary-soft`, `--primary-color-light` | `signal-deep` | **Keep** | Consumers are tinted grounds (`color-mix` 14–75 %) and a gradient (`SkillItem.css:71`); no text uses them (static test enforces this). |
| `--accent-color` | `fg` | **Hold legacy** `#FFD700` | Read by Snake's native visuals (`SnakeGame.css` ×4, including `.food`) and `SimulationCard.css:154` `.food-preview`; mapping would restyle them. It also fills `.error-button.primary` (`ErrorBoundary.css:54`) and `.home-link` (`NotFound.css:34`) under white text: **1.40:1** at baseline. Mapping to `fg` would leave 1.40:1 and only move the failure; holding keeps it a recorded known deficiency, fixed in Phase 3. |
| `--app-shadow`, `--shadow-color` | `transparent` | **Hold legacy** (Dark `rgba(0,0,0,0.3)`, Light `rgba(0,0,0,0.08)`) | Annals' native parchment panel uses it (`Annals.css:20`). Shadow removal is Phase 2 restraint work, not foundation. |
| `--app-border`, `--border-color` | `rule` | **Keep** `rule` for seams; **re-point control boundaries to `edge`** in Task 3 | `rule` would lower control outlines from 2.13:1 to 1.47:1 (Dark) and from 1.51:1 to 1.41:1 (Light). `edge` gives 4.26:1 and 4.15:1 and is the boundary §13 assigns to the Idle state (a one-pixel `edge` outline). |
| `--app-text-muted`, `--app-text-secondary` | `fg-muted` | **Keep** | §06: `fg-faint` is reserved for annotations |
| `--bg-*` atmosphere | legacy | **Keep** legacy (fenced); Mono derived from tokens | Phase 2 owns atmosphere |
| Aliases with no readers (`--overlay-color-light`, `--overlay-color-medium`, `--background-color-transparent`, `--background-color-overlay`, `--bg-canvas-glyph`) | dropped | **Keep dropped** | `rg` found no consumer in `web/src` other than `index.css`, `ThemeContext.tsx` and the `index.html` head script |

**Native-visual holds in Phase 1** (D6 may lift them):

| File | Selector | Variable or declaration | Hold |
|---|---|---|---|
| `SnakeGame.css` | `.food`, score and overlay rules | `--accent-color`; `font-family` at 18 and 84 | Covered by the legacy accent; fonts excluded from Task 4 |
| `SpiderSolitaire.css` | `.spider-column:empty` (183) | `--app-border` | Pinned to its legacy per-theme value in Task 3 |
| `SpiderSolitaire.css` | `.spider-solitaire` (13) | `font-family` | Excluded from Task 4 |
| `RhythmLab.css` | `.rhythm-lab` (13) | `font-family` | Excluded from Task 4 |
| `SimulationCard.css` | `.spider-preview-card-face` (≈ 250) | `font-family` | Excluded from Task 4 |
| `Annals.css` | panel (20) | `--shadow-color` | Covered by the legacy shadow |

`SpiderSolitaire.css:12` and `RhythmLab.css:12` set the container text colour through `--text-color`. Container text is governed by default, so it follows `fg`. D6 may reclassify.

**File map:**

| File | Responsibility |
|---|---|
| `web/src/styles/darkfield/SOURCE.json` | Create. Provenance manifest (D2): canonical pins and hashes only |
| `web/scripts/darkfield-export.mjs` | Create. Allowlist exporter, canonical `tokens.json` → `tokens.runtime.json`; run only in an authorized environment |
| `web/src/styles/darkfield/tokens.runtime.json` | Create, **exported** and committed. Runtime token names and values only (D2b, D11(b)) |
| `web/public/fonts/darkfield/*.woff2`, `…/licenses/*.txt` | Create. Copied fonts and OFL licences (D2b) |
| `web/scripts/darkfield-source.mjs` | Create. `--verify <canonical-dir>`: canonical verification of `SOURCE.json`, the runtime re-export and compiler equivalence |
| `web/scripts/darkfield-tokens.mjs` | Create. Compiles `tokens.runtime.json` into `tokens.css`; `--check` |
| `web/src/styles/darkfield/tokens.css` | Create, **generated** and committed |
| `web/src/styles/darkfield/bridge.css` | Create. Legacy variable → Darkfield role mapping, plus the legacy fence |
| `web/scripts/darkfield-known-deficiencies.json` | Create. Baseline ledger (D10) |
| `web/src/index.tsx`, `web/src/index.css`, `web/src/contexts/ThemeContext.tsx`, `web/index.html` | Modify. Single theme source, focus ring |
| `web/src/pages/Home/Home.css` | Modify. Fill/text pairs |
| The control-boundary files in Task 3 Step 7 | Modify. `edge` boundaries |
| `web/src/components/SpiderSolitaire/SpiderSolitaire.css` | Modify. Pin `.spider-column:empty` (authorized native-visual hold) |
| Files listed by Task 4's scan | Modify. Font families |
| Mono files (Task 5) | Modify |
| `TerminalDropdown.css`, `RhythmLab.css` focus blocks (Task 6) | Modify. Governed menu controls only |
| `web/scripts/darkfield-{vendor,runtime,tokens,bridge,settings}.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs` | Create |

**Branch:** `feat/darkfield-foundation`, from `origin/main` after Phase 0 merges (D9).

### Task 1: Publish the runtime token export, fonts and licences with provenance (D2, D2b, D11(b) decided; needs Phase 1 D9 and a completed Task P2)

**Publication model (D2b as clarified by D11(b)).**
- The canonical `tokens.json` never enters this repository. It stays only in the private repository at the pinned tag.
- An allowlist exporter, run only in an authorized environment that holds the canonical checkout, projects it into `tokens.runtime.json`. That file contains exactly the token names and values the compiler consumes, and nothing else.
- Fonts and OFL licences are copied byte-for-byte, as before.

**Canonical schema the exporter relies on** (inspected at `tokens-v1-2026-10-09`):

| Kind | Fields |
|---|---|
| Runtime fields | `version` · `color.themes[].id` · `color.tokens[].{name, value.{dark,light,mono}}` · `shadow.tokens[].{name, value.{dark,light,mono}}` · `<group>.tokens[].{name, value}` for `spacing`, `radius`, `cut`, `stroke`, `dash`, `opacity`, `duration`, `easing`, `grid`, `layer` · `type.fonts[].{family, file, weight, style}` · `type.families.{sans, narrow, mono}` · `type.groups[].{family, styles[].{name, fontSize, lineHeight, fontWeight, letterSpacing?}}` |
| Private fields | Top-level `name` · every group `note` · every token `usage` · `color.themes[].name` · `type.groups[].{name, note}` · `type.groups[].styles[].{sample, usage}` |

The private fields hold the specification prose and quantitative usage notes that D11(b) keeps out of the public repository. Any other canonical field makes the export fail until it is classified. An empty object or array carries no value and is ignored; this cannot disclose anything, and from Task 2 onward the compiler-equivalence check in canonical verification catches any consumer impact.

**Why a same-shape projection.**
- `tokens.runtime.json` keeps the canonical nesting for the runtime fields (adding a `schema` marker). The Task 2 compiler and its tests therefore consume it unchanged apart from the input path and header text.
- Compiling the runtime file produces CSS identical to compiling the canonical file: verified in the 2026-10-11 dry run, and enforced by canonical verification.
- A flatter schema would be marginally smaller, but would require rewriting the compiler and its validated tests for no disclosure benefit. The private fields are dropped either way.

**Two kinds of verification:**
- **Public verification** (any clean checkout, no credentials): the runtime file has the exact approved schema and value grammar and contains no private fields; every published file matches `SOURCE.json`; `tokens.css` is in sync and carries only its fixed header comments. This cannot establish that the runtime file truly derives from the private canonical file.
- **Canonical verification** (authorized environment only, with `kareemsasa` read access to the canonical repository, never in CI): `darkfield-source.mjs --verify <canonical checkout at the pinned tag>` re-exports from the canonical `tokens.json` and requires byte-identical output, a matching canonical hash, and identical copied fonts and licences. Task 2 adds compiler equivalence.

**Files:**
- Create: `web/scripts/darkfield-export.mjs` (exporter; public code, contains no specification content)
- Create (exported): `web/src/styles/darkfield/tokens.runtime.json`
- Create: `web/src/styles/darkfield/SOURCE.json`
- Create: `web/public/fonts/darkfield/` (6 woff2 files) and `web/public/fonts/darkfield/licenses/` (3 OFL texts)
- Create: `web/scripts/darkfield-source.mjs` (canonical verifier)
- Test: `web/scripts/darkfield-vendor.test.mjs`, `web/scripts/darkfield-runtime.test.mjs`

**Interfaces:**
- Produces `tokens.runtime.json`, schema `darkfield-runtime/1`, with the runtime fields in the table above and a top-level `schema` field. It is consumed by Task 2 through `SOURCE_PATH`.
- Produces `SOURCE.json`, with shape `{ system, tokensVersion, canonical: { location, tag, commit }, export: { archive, sha256 }, r1: { archive, sha256 }, files }`.
  - The runtime entry: `files["src/styles/darkfield/tokens.runtime.json"] = { derivedFrom: "tokens.json", sourceSha256, exporter: "scripts/darkfield-export.mjs", schema: "darkfield-runtime/1", sha256 }`.
  - Every font and licence entry: `{ from: "<path in canonical repo>", sha256 }`.
  - `SOURCE.json` holds only identifiers and hashes, never canonical text.
- Exports `exportRuntime(canonical) → string` (deterministic: fixed key order, two-space indent, trailing newline), plus `RUNTIME_PATH`, `RUNTIME_SCHEMA`, `THEMES`, `THEMED_GROUPS`, `UNTHEMED_GROUPS` and `FAMILIES`.

- [ ] **Step 1: Write the failing public tests.**

  ```js
  // web/scripts/darkfield-vendor.test.mjs
  import test from "node:test";
  import assert from "node:assert/strict";
  import { createHash } from "node:crypto";
  import { access, readFile } from "node:fs/promises";
  import { resolve } from "node:path";

  const web = resolve(import.meta.dirname, "..");
  const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
  const RUNTIME = "src/styles/darkfield/tokens.runtime.json";
  const COPIED = [
    "public/fonts/darkfield/Archivo-Variable-Latin.woff2",
    "public/fonts/darkfield/ArchivoNarrow-Latin-500.woff2",
    "public/fonts/darkfield/ArchivoNarrow-Latin-600.woff2",
    "public/fonts/darkfield/IBMPlexMono-Regular.woff2",
    "public/fonts/darkfield/IBMPlexMono-Medium.woff2",
    "public/fonts/darkfield/IBMPlexMono-SemiBold.woff2",
    "public/fonts/darkfield/licenses/Archivo-OFL.txt",
    "public/fonts/darkfield/licenses/Archivo-Narrow-OFL.txt",
    "public/fonts/darkfield/licenses/IBM-Plex-Mono-OFL.txt",
  ];
  const sha = async (path) => createHash("sha256").update(await readFile(resolve(web, path))).digest("hex");

  test("SOURCE.json pins the canonical revision and both archives", () => {
    assert.equal(source.system, "Darkfield");
    assert.equal(source.tokensVersion, 1);
    assert.deepEqual(source.canonical, {
      location: "github.com/kareemsasa/darkfield",
      tag: "tokens-v1-2026-10-09",
      commit: "4f02965bfa51eb060c39734608422dde0d288009",
    });
    assert.equal(source.export.sha256, "018116bd43d11890f280e6eab615bcdb08e3de0871e44215d1bfa7867346b6b8");
    assert.equal(source.r1.sha256, "595d8e2ee36b1366286ff678c73ebba66f0e604ee267d8d612dfcc6f1931bb42");
    assert.deepEqual(Object.keys(source).sort(), ["canonical", "export", "files", "r1", "system", "tokensVersion"]);
    assert.deepEqual(Object.keys(source.export).sort(), ["archive", "sha256"]);
    assert.deepEqual(Object.keys(source.r1).sort(), ["archive", "sha256"]);
    assert.deepEqual(Object.keys(source.files).sort(), [RUNTIME, ...COPIED].sort());
  });

  test("the runtime tokens are declared as an allowlist export of the pinned canonical tokens.json", async () => {
    const entry = source.files[RUNTIME];
    assert.deepEqual(Object.keys(entry).sort(), ["derivedFrom", "exporter", "schema", "sha256", "sourceSha256"]);
    assert.equal(entry.derivedFrom, "tokens.json");
    assert.equal(entry.sourceSha256, "942115fc42277c33b45207ff2f20cfd4e2e8283930e1e8afcaed81dcab5a9bcc");
    assert.equal(entry.schema, "darkfield-runtime/1");
    assert.equal(entry.exporter, "scripts/darkfield-export.mjs");
    await access(resolve(web, entry.exporter));
    assert.equal(await sha(RUNTIME), entry.sha256);
  });

  test("no canonical file is copied into the public repository except fonts and licences", async () => {
    await assert.rejects(access(resolve(web, "src/styles/darkfield/tokens.json")), "the canonical tokens.json must never be committed");
    for (const path of COPIED) assert.deepEqual(Object.keys(source.files[path]).sort(), ["from", "sha256"], path);
    for (const path of COPIED) assert.match(source.files[path].from, /^(fonts\/[A-Za-z0-9-]+\.woff2|licenses\/[A-Za-z-]+-OFL\.txt)$/, path);
  });

  for (const path of COPIED) {
    test(`${path} matches SOURCE.json`, async () => {
      assert.equal(await sha(path), source.files[path].sha256);
    });
  }
  ```

  ```js
  // web/scripts/darkfield-runtime.test.mjs
  // Public verification of the runtime token artifact (D2b, D11(b)): exact schema, value grammar, and
  // no private metadata. It cannot prove derivation from the private canonical file; that is the
  // credentialed canonical verification (darkfield-source.mjs --verify).
  import test from "node:test";
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";
  import { resolve } from "node:path";

  const dir = resolve(import.meta.dirname, "../src/styles/darkfield");
  const runtime = JSON.parse(await readFile(resolve(dir, "tokens.runtime.json"), "utf8"));
  const THEMES = ["dark", "light", "mono"];
  const UNTHEMED = ["spacing", "radius", "cut", "stroke", "dash", "opacity", "duration", "easing", "grid", "layer"];
  const keys = (o) => Object.keys(o).sort();

  const NAME = /^[a-z][a-z0-9-]*(\.[0-9]+)?$/;
  const PX = /^\d+(\.\d+)?px$/;
  const SHADOW_ITEM = "(?:-?\\d+(?:\\.\\d+)?(?:px)? ){2,4}#[0-9a-f]{6,8}";
  const GRAMMAR = {
    color: /^#[0-9a-f]{6}$/,
    shadow: new RegExp(`^(none|${SHADOW_ITEM}(, ${SHADOW_ITEM})*)$`),
    spacing: PX,
    radius: /^(0|50%)$/,
    cut: PX,
    stroke: PX,
    dash: /^\d+( \d+)+$/,
    opacity: /^(0|1|0\.\d+)$/,
    duration: /^\d+ms$/,
    easing: /^(linear|cubic-bezier\((-?\d*\.?\d+, ){3}-?\d*\.?\d+\)|steps\(\d+, (start|end)\))$/,
    grid: /^\d+(px|ch)?$/,
    layer: /^\d+$/,
  };
  const FONT_NAME = '(?:"[A-Z][A-Za-z0-9 -]*"|[A-Za-z][A-Za-z-]*)';
  const STACK = new RegExp(`^${FONT_NAME}(, ${FONT_NAME})*$`);

  test("top level has exactly the runtime groups", () => {
    assert.deepEqual(keys(runtime), ["color", "schema", "shadow", "type", "version", ...UNTHEMED].sort());
    assert.equal(runtime.schema, "darkfield-runtime/1");
    assert.ok(Number.isInteger(runtime.version));
  });

  test("themed tokens carry exactly a name and one value per theme", () => {
    assert.deepEqual(runtime.color.themes, THEMES.map((id) => ({ id })));
    assert.deepEqual(keys(runtime.color), ["themes", "tokens"]);
    assert.deepEqual(keys(runtime.shadow), ["tokens"]);
    for (const group of ["color", "shadow"]) {
      assert.ok(runtime[group].tokens.length > 0, group);
      for (const t of runtime[group].tokens) {
        assert.deepEqual(keys(t), ["name", "value"], `${group} ${t.name}`);
        assert.match(t.name, NAME);
        assert.deepEqual(keys(t.value), [...THEMES].sort(), `${group} ${t.name}`);
        for (const id of THEMES) assert.match(t.value[id], GRAMMAR[group], `${group} ${t.name} ${id}`);
      }
    }
  });

  test("unthemed tokens carry exactly a name and a grammatical value", () => {
    for (const group of UNTHEMED) {
      assert.deepEqual(keys(runtime[group]), ["tokens"], group);
      assert.ok(runtime[group].tokens.length > 0, group);
      for (const t of runtime[group].tokens) {
        assert.deepEqual(keys(t), ["name", "value"], `${group} ${t.name}`);
        assert.match(t.name, NAME);
        assert.match(t.value, GRAMMAR[group], `${group} ${t.name}`);
      }
    }
  });

  test("type data carries only fonts, families and style metrics", () => {
    assert.deepEqual(keys(runtime.type), ["families", "fonts", "groups"]);
    assert.deepEqual(keys(runtime.type.families), ["mono", "narrow", "sans"]);
    for (const stack of Object.values(runtime.type.families)) assert.match(stack, STACK);
    for (const f of runtime.type.fonts) {
      assert.deepEqual(keys(f), ["family", "file", "style", "weight"]);
      assert.match(f.family, /^[A-Z][A-Za-z ]*$/);
      assert.match(f.file, /^fonts\/[A-Za-z0-9-]+\.woff2$/);
      assert.match(f.weight, /^\d{3}( \d{3})?$/);
      assert.match(f.style, /^(normal|italic)$/);
    }
    for (const g of runtime.type.groups) {
      assert.deepEqual(keys(g), ["family", "styles"]);
      assert.ok(["sans", "narrow", "mono"].includes(g.family));
      for (const s of g.styles) {
        assert.ok(keys(s).every((k) => ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "name"].includes(k)), s.name);
        assert.match(s.name, NAME);
        assert.match(s.fontSize, PX);
        assert.match(s.lineHeight, /^\d+(\.\d+)?(px)?$/);
        assert.ok(Number.isInteger(s.fontWeight) && s.fontWeight >= 100 && s.fontWeight <= 900, s.name);
        if ("letterSpacing" in s) assert.match(s.letterSpacing, /^(0|-?\d*\.?\d+em)$/);
      }
    }
  });
  ```

  Task 2 appends one more test to `darkfield-runtime.test.mjs`, covering `tokens.css` header comments.

- [ ] **Step 2: Run them and confirm they fail.**

  Run: `cd web && node --test scripts/darkfield-vendor.test.mjs scripts/darkfield-runtime.test.mjs`

  Expected: FAIL with `ENOENT` on `SOURCE.json` and `tokens.runtime.json`.

- [ ] **Step 3: Write the exporter and the canonical verifier.**

  ```js
  // web/scripts/darkfield-export.mjs
  // Exports the public runtime subset of the private canonical Darkfield tokens.json (D2b, D11(b)).
  // Run only in an authorized environment that holds the canonical checkout:
  //   node scripts/darkfield-export.mjs <canonical-dir>   rewrite src/styles/darkfield/tokens.runtime.json
  // Allowlist projection: only the fields named below are emitted. Every canonical field must be
  // classified as RUNTIME or PRIVATE; an unclassified field fails the export instead of being dropped
  // or copied. The script never prints canonical text: only a hash.
  import { createHash } from "node:crypto";
  import { readFile, writeFile } from "node:fs/promises";
  import { resolve } from "node:path";
  import { fileURLToPath } from "node:url";

  export const RUNTIME_PATH = resolve(import.meta.dirname, "../src/styles/darkfield/tokens.runtime.json");
  export const RUNTIME_SCHEMA = "darkfield-runtime/1";
  export const THEMES = ["dark", "light", "mono"];
  export const THEMED_GROUPS = ["color", "shadow"];
  export const UNTHEMED_GROUPS = ["spacing", "radius", "cut", "stroke", "dash", "opacity", "duration", "easing", "grid", "layer"];
  export const FAMILIES = ["sans", "narrow", "mono"];

  // Field classification of the canonical schema (tokens.json v1). Keys are canonical paths with [] for arrays.
  const PRIVATE = new Set([
    "name", "color.note", "color.themes[].name", "color.tokens[].usage", "shadow.note", "shadow.tokens[].usage",
    "type.groups[].name", "type.groups[].note", "type.groups[].styles[].sample", "type.groups[].styles[].usage",
    ...UNTHEMED_GROUPS.flatMap((g) => [`${g}.note`, `${g}.tokens[].usage`]),
  ]);
  const RUNTIME = new Set([
    "version", "color.themes[].id",
    ...THEMED_GROUPS.flatMap((g) => [`${g}.tokens[].name`, ...THEMES.map((id) => `${g}.tokens[].value.${id}`)]),
    ...UNTHEMED_GROUPS.flatMap((g) => [`${g}.tokens[].name`, `${g}.tokens[].value`]),
    "type.fonts[].family", "type.fonts[].file", "type.fonts[].weight", "type.fonts[].style",
    ...FAMILIES.map((f) => `type.families.${f}`),
    "type.groups[].family", "type.groups[].styles[].name", "type.groups[].styles[].fontSize",
    "type.groups[].styles[].lineHeight", "type.groups[].styles[].fontWeight", "type.groups[].styles[].letterSpacing",
  ]);

  const leafPaths = (node, path = "", out = new Set()) => {
    if (Array.isArray(node)) node.forEach((item) => leafPaths(item, `${path}[]`, out));
    else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) leafPaths(value, path ? `${path}.${key}` : key, out);
    else out.add(path);
    return out;
  };

  const text = (value, where) => {
    if (typeof value !== "string") throw new Error(`${where}: expected a string`);
    return value;
  };

  export const exportRuntime = (canonical) => {
    const unclassified = [...leafPaths(canonical)].filter((p) => !PRIVATE.has(p) && !RUNTIME.has(p));
    if (unclassified.length) throw new Error(`unclassified canonical fields (classify before exporting): ${unclassified.join(", ")}`);
    const ids = canonical.color.themes.map((theme) => theme.id);
    if (JSON.stringify(ids) !== JSON.stringify(THEMES)) throw new Error(`unexpected theme ids: ${ids.join(",")}`);
    if (!Number.isInteger(canonical.version)) throw new Error("version: expected an integer");
    const token = (t, where, themed) => ({
      name: text(t.name, `${where}.name`),
      value: themed
        ? Object.fromEntries(THEMES.map((id) => [id, text(t.value?.[id], `${where}.value.${id}`)]))
        : text(t.value, `${where}.value`),
    });
    const runtime = { schema: RUNTIME_SCHEMA, version: canonical.version };
    runtime.color = {
      themes: THEMES.map((id) => ({ id })),
      tokens: canonical.color.tokens.map((t, i) => token(t, `color.tokens[${i}]`, true)),
    };
    runtime.shadow = { tokens: canonical.shadow.tokens.map((t, i) => token(t, `shadow.tokens[${i}]`, true)) };
    for (const group of UNTHEMED_GROUPS) {
      runtime[group] = { tokens: canonical[group].tokens.map((t, i) => token(t, `${group}.tokens[${i}]`, false)) };
    }
    runtime.type = {
      fonts: canonical.type.fonts.map((f, i) => ({
        family: text(f.family, `type.fonts[${i}].family`),
        file: text(f.file, `type.fonts[${i}].file`),
        weight: text(f.weight, `type.fonts[${i}].weight`),
        style: text(f.style, `type.fonts[${i}].style`),
      })),
      families: Object.fromEntries(FAMILIES.map((key) => [key, text(canonical.type.families[key], `type.families.${key}`)])),
      groups: canonical.type.groups.map((g, i) => ({
        family: text(g.family, `type.groups[${i}].family`),
        styles: g.styles.map((s, j) => {
          const where = `type.groups[${i}].styles[${j}]`;
          if (!Number.isInteger(s.fontWeight)) throw new Error(`${where}.fontWeight: expected an integer`);
          const style = {
            name: text(s.name, `${where}.name`),
            fontSize: text(s.fontSize, `${where}.fontSize`),
            lineHeight: text(s.lineHeight, `${where}.lineHeight`),
            fontWeight: s.fontWeight,
          };
          if (s.letterSpacing !== undefined) style.letterSpacing = text(s.letterSpacing, `${where}.letterSpacing`);
          return style;
        }),
      })),
    };
    return `${JSON.stringify(runtime, null, 2)}\n`;
  };

  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const dir = process.argv[2];
    if (!dir) {
      console.error("usage: node scripts/darkfield-export.mjs <canonical-dir>");
      process.exit(2);
    }
    const json = exportRuntime(JSON.parse(await readFile(resolve(dir, "tokens.json"), "utf8")));
    await writeFile(RUNTIME_PATH, json);
    console.log(`wrote tokens.runtime.json · sha256 ${createHash("sha256").update(json).digest("hex")}`);
  }
  ```

  ```js
  // web/scripts/darkfield-source.mjs
  // Canonical verification: run only in an authorized environment holding a checkout of the private
  // canonical repository at the pinned tag. A public checkout cannot run it and cannot by itself prove
  // that the runtime export derives from the canonical source.
  // node scripts/darkfield-source.mjs --verify <canonical-dir>
  import { createHash } from "node:crypto";
  import { readFile } from "node:fs/promises";
  import { resolve } from "node:path";
  import { exportRuntime } from "./darkfield-export.mjs";

  const web = resolve(import.meta.dirname, "..");
  const flag = process.argv.indexOf("--verify");
  if (flag === -1 || !process.argv[flag + 1]) {
    console.error("usage: node scripts/darkfield-source.mjs --verify <canonical-dir>");
    process.exit(2);
  }
  const canonicalDir = resolve(process.argv[flag + 1]);
  const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  let failures = 0;
  const fail = (message) => {
    failures += 1;
    console.error(`MISMATCH ${message}`);
  };

  for (const [vendored, entry] of Object.entries(source.files)) {
    const local = await readFile(resolve(web, vendored));
    if (entry.from) {
      // Copied files (fonts, licences): byte-identical to their canonical counterparts.
      const canonical = await readFile(resolve(canonicalDir, entry.from));
      if (sha(canonical) !== entry.sha256 || sha(local) !== entry.sha256) fail(vendored);
    } else if (entry.derivedFrom) {
      // Derived runtime tokens: re-export from the pinned canonical file and require identical bytes.
      const canonicalBytes = await readFile(resolve(canonicalDir, entry.derivedFrom));
      if (sha(canonicalBytes) !== entry.sourceSha256) fail(`${vendored}: canonical ${entry.derivedFrom} hash`);
      const canonical = JSON.parse(canonicalBytes.toString("utf8"));
      const exported = exportRuntime(canonical);
      if (exported !== local.toString("utf8") || sha(exported) !== entry.sha256) fail(`${vendored}: re-export differs`);
    } else {
      fail(`${vendored}: entry has neither from nor derivedFrom`);
    }
  }
  if (failures) process.exit(1);
  console.log(`verified ${Object.keys(source.files).length} files against ${canonicalDir}`);
  ```

- [ ] **Step 4: Export, copy and record provenance (authorized environment).**
  - Check out the canonical repository at `tokens-v1-2026-10-09` into `$DF_TMP/darkfield` with credentials explicitly bound to `kareemsasa` (Task P2 identity rule).
  - Confirm `git -C "$DF_TMP/darkfield" rev-parse HEAD` is `4f02965bfa51eb060c39734608422dde0d288009`.
  - Run `cd web && node scripts/darkfield-export.mjs "$DF_TMP/darkfield"`. It prints only a hash; never paste canonical content into logs, commits or PR text.
  - Copy `fonts/*.woff2` and `licenses/*.txt` from the canonical checkout to the paths above. Copy nothing else from it.
  - Write `SOURCE.json`:
    - `system`: `"Darkfield"`; `tokensVersion`: the canonical `version` (currently `1`).
    - `canonical`: `github.com/kareemsasa/darkfield`, `tokens-v1-2026-10-09`, `4f02965bfa51eb060c39734608422dde0d288009`.
    - `export` and `r1`: the archive names and checksums in [Specification authority](#specification-authority).
    - The runtime entry: `sourceSha256` is the canonical `tokens.json` hash (`942115fc42277c33b45207ff2f20cfd4e2e8283930e1e8afcaed81dcab5a9bcc`), and `sha256` is the exported file's hash.
    - One `{ from, sha256 }` entry per font and licence.
    - Record no owner-held editing copies or URLs.

- [ ] **Step 5: Verify.**
  - Public: `cd web && node --test scripts/darkfield-vendor.test.mjs scripts/darkfield-runtime.test.mjs`. Expected: PASS, 16 tests (12 + 4).
  - Canonical, in the authorized environment: `cd web && node scripts/darkfield-source.mjs --verify "$DF_TMP/darkfield"`. Expected: `verified 10 files`.
  - The reviewer independently repeats canonical verification. In the authorized environment, it also runs the canonical disclosure scan (see [Runtime token propagation](#runtime-token-propagation)) over `tokens.runtime.json`, `SOURCE.json` and the test files. It expects only approved-value matches.
  - If the reviewer has no canonical access, it reports derivation as **UNVERIFIED**, never as PASS.

- [ ] **Step 6: Commit** exactly these paths: the exporter, `tokens.runtime.json`, `SOURCE.json`, the 6 fonts, the 3 licences, `darkfield-source.mjs`, and the two tests.

  Message: `feat(web): publish Darkfield runtime tokens and OFL fonts with a source manifest`.

  The canonical `tokens.json` must not appear in `git diff --cached --name-only`.

### Task 2: Compile tokens.runtime.json into tokens.css

The compiler logic is unchanged from r1. Only its input path and its two header comments change, because it now reads the public runtime export from Task 1 instead of a copy of the canonical `tokens.json`. Dry run on 2026-10-11 against a runtime file exported from the pinned canonical `tokens.json`: 8/8 tests pass, `--check` is clean, and the CSS body is identical to compiling the canonical file directly.

**Spec:**
- §17 *Naming* (role names; a dot in a token name is backslash-escaped in CSS), *Colour* and *Glow strength and focus* (per-theme values), *Type* (style table), and *Not tokenised* (the consuming site applies uppercase to `label-*` styles; Machine text enables the slashed-zero feature).
- §06 fallbacks; the README fonts rule.

**Files:**
- Create: `web/scripts/darkfield-tokens.mjs`
- Create (generated): `web/src/styles/darkfield/tokens.css`
- Modify: `web/scripts/darkfield-runtime.test.mjs` (append the CSS-comment test), `web/scripts/darkfield-source.mjs` (add compiler equivalence)
- Modify: `web/src/index.tsx`, adding `import "./styles/darkfield/tokens.css";` above `import "./index.css";`
- Test: `web/scripts/darkfield-tokens.test.mjs`

**Interfaces:**
- Consumes: `tokens.runtime.json` (Task 1), through `SOURCE_PATH`. The compiler reads only `version`, `color.themes[].id`, the themed and unthemed `tokens[].{name, value}`, `type.fonts`, `type.families` and `type.groups[].{family, styles}`, which is exactly the runtime projection.
- Produces:
  - `--<token>` custom properties, with colours, glows and focus defined per theme under `:root, [data-theme="dark"]`, `[data-theme="light"]` and `[data-theme="mono"]`.
  - Families `--font-sans`, `--font-narrow`, `--font-mono`.
  - `.df-<style>` type classes.
  - Exports `compileTokens(tokens, sha256)`, `buildTokensCss()`, `SOURCE_PATH`, `OUTPUT_PATH`.

  The `df-` prefix is namespacing: §17's names (`.code`, `.data`, `.label`, `.body`) are generic enough to collide with component classes.

- [ ] **Step 1: Write the failing test.**

  ```js
  // web/scripts/darkfield-tokens.test.mjs
  import test from "node:test";
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";
  import { buildTokensCss, compileTokens, OUTPUT_PATH, SOURCE_PATH } from "./darkfield-tokens.mjs";

  const tokens = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
  const css = compileTokens(tokens, "test");
  const block = (opening) => {
    const start = css.indexOf(opening);
    assert.notEqual(start, -1, `missing block ${opening}`);
    return css.slice(start, css.indexOf("}", start));
  };
  const THEME_BLOCKS = {
    dark: ':root,\n[data-theme="dark"] {',
    light: '[data-theme="light"] {',
    mono: '[data-theme="mono"] {',
  };

  test("dark is the default theme and carries the reference values", () => {
    const dark = block(THEME_BLOCKS.dark);
    assert.match(dark, /--field: #070b08;/);
    assert.match(dark, /--signal: #6cff95;/);
    assert.match(dark, /--focus-ring: 0 0 0 2px #070b08, 0 0 0 4px #6cff95;/);
  });

  test("light is paper: no emission", () => {
    const light = block(THEME_BLOCKS.light);
    assert.match(light, /--field: #eff4f1;/);
    for (const glow of ["glow-trace", "glow-signal", "glow-flare", "glow-fault"]) {
      assert.match(light, new RegExp(`--${glow}: none;`));
    }
  });

  test("mono removes hue", () => {
    const mono = block(THEME_BLOCKS.mono);
    assert.match(mono, /--signal: #ffffff;/);
    assert.match(mono, /--coolant: #d7d7d7;/);
  });

  test("every themed token is defined exactly once per theme", () => {
    const themed = [...tokens.color.tokens, ...tokens.shadow.tokens].map((t) => t.name);
    for (const opening of Object.values(THEME_BLOCKS)) {
      const body = block(opening);
      for (const name of themed) {
        assert.equal(body.split(`--${name}:`).length - 1, 1, `${opening} ${name}`);
      }
    }
  });

  test("dotted names are escaped (§17)", () => {
    assert.match(css, /--space-0\\\.5: 2px;/);
  });

  test("fonts are self-hosted and swap in", () => {
    const faces = css.match(/@font-face \{[^}]*\}/g) ?? [];
    assert.equal(faces.length, tokens.type.fonts.length);
    for (const face of faces) {
      assert.match(face, /url\("\/fonts\/darkfield\/[A-Za-z0-9-]+\.woff2"\) format\("woff2"\)/);
      assert.match(face, /font-display: swap;/);
    }
  });

  test("labels speak in the Instrument voice; machine text has the slashed zero", () => {
    const label = block(".df-label {");
    assert.match(label, /font-family: var\(--font-narrow\);/);
    assert.match(label, /text-transform: uppercase;/);
    assert.match(block(".df-data {"), /font-feature-settings: "zero";/);
    assert.doesNotMatch(block(".df-body {"), /text-transform/);
  });

  test("the committed tokens.css matches tokens.runtime.json", async () => {
    assert.equal(await readFile(OUTPUT_PATH, "utf8"), await buildTokensCss());
  });
  ```

- [ ] **Step 2: Run it and confirm it fails.**

  Run: `cd web && node --test scripts/darkfield-tokens.test.mjs`

  Expected: FAIL with `Cannot find module …/darkfield-tokens.mjs`.

- [ ] **Step 3: Write the compiler.**

  ```js
  // web/scripts/darkfield-tokens.mjs
  // Compiles the public runtime token export (tokens.runtime.json) into CSS custom properties (§17).
  // node scripts/darkfield-tokens.mjs          rewrite src/styles/darkfield/tokens.css
  // node scripts/darkfield-tokens.mjs --check  exit 1 when tokens.css is out of date
  import { createHash } from "node:crypto";
  import { readFile, writeFile } from "node:fs/promises";
  import { resolve } from "node:path";
  import { fileURLToPath } from "node:url";

  const DIR = resolve(import.meta.dirname, "../src/styles/darkfield");
  export const SOURCE_PATH = resolve(DIR, "tokens.runtime.json");
  export const OUTPUT_PATH = resolve(DIR, "tokens.css");
  const FONT_URL_BASE = "/fonts/darkfield/";
  const UNTHEMED_GROUPS = ["spacing", "radius", "cut", "stroke", "dash", "opacity", "duration", "easing", "grid", "layer"];
  const THEMED_GROUPS = ["color", "shadow"];

  // §17 Naming: a dot in a token name is backslash-escaped in the CSS property name.
  const property = (name) => `--${name.replaceAll(".", "\\.")}`;

  export const compileTokens = (tokens, sourceSha256) => {
    const out = [
      "/* Generated by scripts/darkfield-tokens.mjs from tokens.runtime.json. Do not edit by hand. */",
      `/* Darkfield runtime tokens v${tokens.version} · tokens.runtime.json sha256 ${sourceSha256} */`,
    ];

    for (const font of tokens.type.fonts) {
      out.push(
        "",
        "@font-face {",
        `  font-family: "${font.family}";`,
        `  src: url("${FONT_URL_BASE}${font.file.replace(/^fonts\//, "")}") format("woff2");`,
        `  font-weight: ${font.weight};`,
        `  font-style: ${font.style};`,
        "  font-display: swap;",
        "}",
      );
    }

    out.push("", ":root {");
    for (const [key, stack] of Object.entries(tokens.type.families)) out.push(`  --font-${key}: ${stack};`);
    for (const group of UNTHEMED_GROUPS) {
      for (const token of tokens[group].tokens) out.push(`  ${property(token.name)}: ${token.value};`);
    }
    out.push("}");

    for (const { id } of tokens.color.themes) {
      // Dark is the default: these values apply before data-theme is set (no-JS route shells).
      out.push("", id === "dark" ? ':root,\n[data-theme="dark"] {' : `[data-theme="${id}"] {`);
      for (const group of THEMED_GROUPS) {
        for (const token of tokens[group].tokens) out.push(`  ${property(token.name)}: ${token.value[id]};`);
      }
      out.push("}");
    }

    for (const group of tokens.type.groups) {
      for (const style of group.styles) {
        out.push(
          "",
          `.df-${style.name} {`,
          `  font-family: var(--font-${group.family});`,
          `  font-size: ${style.fontSize};`,
          `  line-height: ${style.lineHeight};`,
          `  font-weight: ${style.fontWeight};`,
        );
        if (style.letterSpacing) out.push(`  letter-spacing: ${style.letterSpacing};`);
        // §17 Not tokenised: the site uppercases label-* styles; Machine (mono) text enables the slashed zero.
        if (group.family === "narrow") out.push("  text-transform: uppercase;");
        if (group.family === "mono") out.push('  font-feature-settings: "zero";');
        out.push("}");
      }
    }

    return `${out.join("\n")}\n`;
  };

  export const buildTokensCss = async () => {
    const raw = await readFile(SOURCE_PATH);
    const sha256 = createHash("sha256").update(raw).digest("hex");
    return compileTokens(JSON.parse(raw.toString("utf8")), sha256);
  };

  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const css = await buildTokensCss();
    if (process.argv.includes("--check")) {
      const current = await readFile(OUTPUT_PATH, "utf8").catch(() => "");
      if (current !== css) {
        console.error("tokens.css is out of date: run node scripts/darkfield-tokens.mjs");
        process.exit(1);
      }
    } else {
      await writeFile(OUTPUT_PATH, css);
    }
  }
  ```

- [ ] **Step 4: Generate, import and verify.**

  Run: `cd web && node scripts/darkfield-tokens.mjs`, then add the import to `index.tsx`.

  Run: `cd web && node --test scripts/darkfield-tokens.test.mjs && node scripts/darkfield-tokens.mjs --check && npm run typecheck && npm run lint`

  Expected: PASS. The commit is visually inert, because nothing reads the variables yet. A head preview screenshot pair against the baseline confirms it (human check: no visible difference).

- [ ] **Step 5: Extend the runtime test and the canonical verifier.**
  - In `darkfield-runtime.test.mjs`, add `const css = await readFile(resolve(dir, "tokens.css"), "utf8");` after the `runtime` line, and append:

    ```js
    test("generated CSS carries only the two fixed header comments", () => {
      const comments = css.match(/\/\*[\s\S]*?\*\//g) ?? [];
      assert.equal(comments.length, 2);
      assert.equal(comments[0], "/* Generated by scripts/darkfield-tokens.mjs from tokens.runtime.json. Do not edit by hand. */");
      assert.match(comments[1], /^\/\* Darkfield runtime tokens v\d+ · tokens\.runtime\.json sha256 [0-9a-f]{64} \*\/$/);
    });
    ```

  - In `darkfield-source.mjs`, add `import { compileTokens } from "./darkfield-tokens.mjs";` below the `exportRuntime` import. In the `derivedFrom` branch, after the re-export comparison, add:

    ```js
    // The projection must keep everything the compiler consumes: identical CSS from both inputs.
    if (compileTokens(canonical, "-") !== compileTokens(JSON.parse(exported), "-")) fail(`${vendored}: compiled CSS differs from canonical`);
    ```

  - Run the public tests: `cd web && node --test scripts/darkfield-runtime.test.mjs scripts/darkfield-tokens.test.mjs`. Expected: PASS, 5 + 8.
  - Run canonical verification in the authorized environment: `cd web && node scripts/darkfield-source.mjs --verify "$DF_TMP/darkfield"`. Expected: `verified 10 files`.

- [ ] **Step 6: Commit** these six paths: `web/scripts/darkfield-tokens.mjs`, `web/scripts/darkfield-tokens.test.mjs`, `web/src/styles/darkfield/tokens.css`, `web/src/index.tsx`, `web/scripts/darkfield-runtime.test.mjs`, `web/scripts/darkfield-source.mjs`.

  Message: `feat(web): compile Darkfield tokens into CSS custom properties`.

### Task 3: One theme source, the bridge, and the baseline ledger (D10 gates the commit)

**Spec:**
- §05 Roles and *When bright signal appears*; §05 *Contrast, verified*.
- §13 state model: the Idle boundary (one-pixel `edge`) and the Hover label colour (`fg`).

**Evidence:**
- [Bridge mapping review](#phase-1-foundation).
- Theme values are written in three places at `a16c70f`: `index.css:245-296`, `ThemeContext.tsx:23-142` and `index.html` (head script, lines 67-131).

**Files:**
- Create:
  - `web/src/styles/darkfield/bridge.css`
  - `web/scripts/darkfield-bridge.test.mjs`
  - `web/scripts/darkfield-foundation-browser-test.mjs`
  - `web/scripts/darkfield-known-deficiencies.json`
- Modify:
  - `web/src/index.tsx` (import `bridge.css` below `./index.css`)
  - `web/src/index.css` (delete colour and alias definitions)
  - `web/src/contexts/ThemeContext.tsx` (`applyThemeToDocument`)
  - `web/index.html` (head script; shell fallbacks)
  - `web/src/pages/Home/Home.css`
  - `web/src/components/SpiderSolitaire/SpiderSolitaire.css`
  - The control-boundary files confirmed in Step 7

**Interfaces:**
- Produces:
  - Every legacy variable in `LEGACY`, defined only in `bridge.css`.
  - `applyThemeToDocument(theme)` sets only `data-theme` and `color-scheme`.
  - The ledger format: `{ baseline: "<sha>", notes: [string], entries: [{ id, check, theme, route, detail, baseline }] }`.

- [ ] **Step 1: Write the failing static test.**

  ```js
  // web/scripts/darkfield-bridge.test.mjs
  import test from "node:test";
  import assert from "node:assert/strict";
  import { readdir, readFile } from "node:fs/promises";
  import { resolve } from "node:path";

  const web = resolve(import.meta.dirname, "..");
  const read = (path) => readFile(resolve(web, path), "utf8");
  const cssFiles = async () => (await readdir(resolve(web, "src"), { recursive: true })).filter((f) => f.endsWith(".css"));
  // Every legacy variable still read in src/ or index.html (rg, 2026-10-11).
  const LEGACY = [
    "app-bg", "app-bg-secondary", "app-surface", "app-surface-elevated", "app-overlay",
    "app-text", "app-text-secondary", "app-text-muted", "app-border", "app-shadow",
    "brand-primary", "brand-primary-soft", "brand-primary-medium", "brand-primary-dark",
    "primary-color", "primary-color-light", "primary-color-medium", "primary-color-dark", "accent-color",
    "background-color", "background-color-secondary", "background-color-tertiary",
    "card-background", "panel-bg-color", "text-color", "text-color-secondary", "text-secondary",
    "text-color-muted", "text-muted-color", "border-color", "shadow-color",
    "bg-canvas-fill", "bg-glow-color", "bg-grid-major", "bg-grid-minor", "bg-topology",
    "bg-signal", "bg-center-lift", "bg-vignette",
  ];
  // Variables whose legacy literal values are deliberately held (Phase 1 review): only these may sit in the fence.
  const HELD = ["accent-color", "app-shadow", "bg-glow-color", "bg-grid-major", "bg-grid-minor", "bg-topology", "bg-signal", "bg-center-lift", "bg-vignette"];
  // Aliases that resolve to grounds (signal-deep), so they must never colour text.
  const GROUND_ALIASES = "brand-primary-soft|primary-color-light|brand-primary-dark|primary-color-dark";
  const FENCE = /\/\* legacy:start \*\/([\s\S]*?)\/\* legacy:end \*\//g;

  test("theme switching only selects a theme; it never writes token values", async () => {
    for (const file of ["src/contexts/ThemeContext.tsx", "index.html"]) {
      assert.doesNotMatch(await read(file), /setProperty\(\s*["']--/, file);
    }
  });

  test("legacy variables are defined only by the bridge", async () => {
    const indexCss = await read("src/index.css");
    const bridge = await read("src/styles/darkfield/bridge.css");
    for (const name of LEGACY) {
      assert.doesNotMatch(indexCss, new RegExp(`^\\s*--${name}\\s*:`, "m"), `index.css still defines --${name}`);
      assert.match(bridge, new RegExp(`--${name}:`), `bridge.css does not map --${name}`);
    }
  });

  test("literal colours appear only inside the legacy fence, and only for held variables", async () => {
    const bridge = await read("src/styles/darkfield/bridge.css");
    assert.doesNotMatch(bridge.replace(FENCE, ""), /#[0-9a-f]{3,8}\b|rgba?\(/i, "literal colour outside the fence");
    for (const [, fenced] of bridge.matchAll(FENCE)) {
      for (const [, name] of fenced.matchAll(/--([a-z0-9-]+)\s*:/g)) {
        assert.ok(HELD.includes(name), `--${name} is not an approved held variable`);
      }
    }
  });

  test("no text colour reads an alias that resolves to a ground", async () => {
    for (const file of await cssFiles()) {
      const css = await read(`src/${file}`);
      assert.doesNotMatch(css, new RegExp(`(?<![-\\w])color:\\s*var\\(--(${GROUND_ALIASES})\\b`), file);
    }
  });
  ```

- [ ] **Step 2: Write the browser test.**

  It has three parts: invariants, enumerated pairs and the sampler. It is baseline-aware.

  ```js
  // web/scripts/darkfield-foundation-browser-test.mjs
  // Uses the existing standalone browser-test convention; no new dependency.
  // node scripts/darkfield-foundation-browser-test.mjs [base URL] [Playwright module] [browser executable]
  // DARKFIELD_MODE=check (default): invariants must pass; regressions are compared with the ledger.
  // DARKFIELD_MODE=record: run regression checks only and print ledger candidates (use on the baseline).
  // DARKFIELD_THEMES=dark,light[,mono] selects themes.
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";
  const { chromium } = await import(process.argv[3] || "playwright");
  const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
  const base = process.argv[2] || "http://127.0.0.1:4173";
  const MODE = process.env.DARKFIELD_MODE || "check";
  const THEMES = (process.env.DARKFIELD_THEMES || "dark,light").split(",");
  const FIELD = { dark: "rgb(7, 11, 8)", light: "rgb(239, 244, 241)", mono: "rgb(10, 10, 10)" };
  // Every routed page (web/src/routes/index.tsx at a16c70f) plus one 404 probe. /work aliases /experience.
  const ROUTES = [
    "/", "/projects", "/case-studies", "/case-studies/aether", "/case-studies/erebus", "/case-studies/arachne",
    "/case-studies/where-the-specification-lived", "/writing", "/simulations", "/simulations/orbital-simulator",
    "/simulations/traffic-simulator", "/simulations/annals", "/simulations/snake", "/simulations/spider",
    "/simulations/rhythm-lab", "/procedural-animations", "/experience", "/journey", "/terminal", "/darkfield-404-probe",
  ];
  const SAMPLER_SELECTORS = ["main p", "main li", "h1", "h2", "h3", "a", "button", ".tech-tag"];
  // Fill/text pairs whose ground the bridge changes (rule-level scan, 2026-10-11).
  // .projects-cta-primary is excluded: no component renders it (dead CSS, Phase 3).
  // .error-button.primary renders only when an error boundary fires, so expect it UNCOVERED.
  const PAIRS = [
    { selector: ".btn-primary" }, { selector: ".btn-outline", hover: true },
    { selector: ".work-contact-link.primary" }, { selector: ".work-dates", hover: true },
    { selector: ".tech-tag", hover: true }, { selector: ".site-header__link.active" },
    { selector: ".modal-close", hover: true }, { selector: ".toast-close", hover: true },
    { selector: '.settings-segmented__button[aria-pressed="true"]' },
    { selector: ".error-button.primary" }, { selector: ".home-link" },
  ];
  const invariantFailures = [];
  const regressions = [];
  const ran = new Set();
  const uncovered = new Set(PAIRS.map((p) => p.selector));
  const errors = [];
  const invariant = (ok, message) => { if (!ok) invariantFailures.push(message); };

  const withPage = async ({ theme, route = "/", javaScriptEnabled = true, forcedColors = "none" }, run) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled, forcedColors, reducedMotion: "reduce" });
    if (theme) await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${route}: ${error.message}`));
    try {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      await run(page);
    } finally {
      await context.close();
    }
  };

  // WCAG 2 contrast against the composited background-colour stack. A sampler:
  // background images, gradients, canvases and iframes under text are not seen.
  const contrastOf = (page, selector, { all = true } = {}) => page.evaluate(([sel, every]) => {
    const parse = (value) => {
      let m = value.match(/^rgba?\(([^)]+)\)$/);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p[3] ?? 1 }; }
      m = value.match(/^color\(srgb ([^)]+)\)$/);
      if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
      return null;
    };
    const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const lum = ({ r, g, b }) => { const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ground = (el) => {
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
      }
      let out = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 1, g: 1, b: 1, a: 1 };
      while (layers.length) out = over(layers.pop(), out);
      return out;
    };
    const results = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!el.checkVisibility?.() || !el.textContent.trim() || el.closest("[data-df-region]")) continue;
      const bg = ground(el);
      const fg = over(parse(getComputedStyle(el).color), bg);
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      results.push({ text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 30), ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100 });
      if (!every) break;
    }
    return results;
  }, [selector, all]);

  const regression = (check, theme, route, key, detail, value) => {
    regressions.push({ id: `${check}|${theme}|${route}|${key}`, scope: `${check}|${theme}|${route}`, detail, value });
  };

  for (const theme of THEMES) {
    for (const route of ROUTES) {
      await withPage({ theme, route }, async (page) => {
        ran.add(`contrast|${theme}|${route}`);
        ran.add(`pair|${theme}|${route}`);
        for (const selector of SAMPLER_SELECTORS) {
          for (const { text, ratio } of await contrastOf(page, selector)) {
            if (ratio < 4.5) regression("contrast", theme, route, `${selector}|${text}`, `${ratio}:1`, ratio);
          }
        }
        for (const pair of PAIRS) {
          const target = page.locator(pair.selector).first();
          if (!(await target.count()) || !(await target.isVisible())) continue;
          uncovered.delete(pair.selector);
          if (pair.hover) await target.hover();
          const [result] = await contrastOf(page, pair.selector, { all: false });
          if (result && result.ratio < 4.5) regression("pair", theme, route, `${pair.selector}${pair.hover ? ":hover" : ""}`, `${result.ratio}:1`, result.ratio);
        }
        if (MODE === "check" && route === "/") {
          const state = await page.evaluate(() => ({
            theme: document.documentElement.dataset.theme,
            body: getComputedStyle(document.body).backgroundColor,
            inline: [...document.documentElement.style].filter((name) => name.startsWith("--")),
          }));
          invariant(state.theme === theme, `${theme}: data-theme is ${state.theme}`);
          invariant(state.body === FIELD[theme], `${theme}: page ground ${state.body} is not Darkfield field`);
          invariant(state.inline.length === 0, `${theme}: theme values written inline on <html>`);
        }
      });
    }
  }

  if (MODE === "check") {
    await withPage({ theme: "neon" }, async (page) => {
      invariant(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "unknown stored theme must fall back to dark");
    });
    await withPage({ javaScriptEnabled: false, route: "/projects" }, async (page) => {
      invariant(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === FIELD.dark, "no-JS route shell is not on Darkfield field");
    });
    // Task 4 and Task 6 add their invariants here.
  }

  await browser.close();
  console.log(`UNCOVERED pairs (not rendered on any listed route): ${[...uncovered].join(", ") || "none"}`);

  if (MODE === "record") {
    console.log(JSON.stringify(regressions.map(({ id, detail, value }) => ({ id, check: id.split("|")[0], theme: id.split("|")[1], route: id.split("|")[2], detail, baseline: value })), null, 2));
    process.exit(0);
  }

  const ledger = JSON.parse(await readFile(new URL("./darkfield-known-deficiencies.json", import.meta.url), "utf8"));
  const known = new Map(ledger.entries.map((entry) => [entry.id, entry]));
  const found = new Set(regressions.map((r) => r.id));
  const fresh = regressions.filter((r) => !known.has(r.id));
  const worse = regressions.filter((r) => known.has(r.id) && r.value < known.get(r.id).baseline - 0.05);
  const stale = ledger.entries.filter((e) => ran.has(e.id.split("|").slice(0, 3).join("|")) && !found.has(e.id));
  for (const r of regressions.filter((r) => known.has(r.id))) console.log(`KNOWN ${r.id} ${r.detail}`);
  assert.deepEqual(invariantFailures, [], "Darkfield invariants");
  assert.deepEqual(fresh.map((r) => `${r.id} ${r.detail}`), [], "new regressions (not in the baseline ledger)");
  assert.deepEqual(worse.map((r) => `${r.id} ${r.detail}`), [], "known deficiencies that got worse than baseline");
  assert.deepEqual(stale.map((e) => e.id), [], "ledger entries that no longer reproduce: remove them in this commit");
  assert.deepEqual(errors, [], "page errors");
  console.log("darkfield foundation browser test passed");
  ```

- [ ] **Step 3: Record the baseline ledger** (D10).

  ```bash
  bash "$DF_TMP/df-serve.sh" base "$DF_TMP/baseline/web" 4174
  cp web/scripts/darkfield-foundation-browser-test.mjs "$DF_TMP/"
  cd web && DARKFIELD_MODE=record node "$DF_TMP/darkfield-foundation-browser-test.mjs" http://127.0.0.1:4174 "$DF_PW" > "$DF_TMP/ledger-candidates.txt"
  ```

  Then build `web/scripts/darkfield-known-deficiencies.json`:
  - `baseline` is the `BASE` SHA.
  - `entries` are the recorded candidates.
  - `notes` lists the two known baseline issues in [Validation model](#validation-model).

  The reviewer re-runs the record against the baseline and confirms every entry reproduces. The owner accepts the ledger (D10) before the Step 11 commit.

  Expect at least:
  - `.home-link` on the 404 probe: white on gold, 1.40:1, both themes.
  - `.btn-outline:hover`, Dark: 2.78:1 (`.btn-outline` is rendered by `FeaturedProjectsSection.tsx`).

  `.error-button.primary` has the same 1.40:1 pattern, but it renders only when an error boundary fires, so the run reports it UNCOVERED. Add it to the ledger `notes` with the static evidence (`ErrorBoundary.css:54`).

- [ ] **Step 4: Confirm the head checks fail.**

  Run: `cd web && node --test scripts/darkfield-bridge.test.mjs`

  Expected: FAIL on "theme switching only selects a theme", plus the two bridge tests, which fail with `ENOENT` because `bridge.css` does not exist yet.

  Run: `bash "$DF_TMP/df-serve.sh" head web 4173 && cd web && node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`

  Expected: FAIL on invariants (`page ground rgb(26, 26, 26) is not Darkfield field`).

- [ ] **Step 5: Create the bridge.**

  ```css
  /* web/src/styles/darkfield/bridge.css
     Darkfield bridge: the site's legacy variables re-pointed at Darkfield roles (§05), so every
     existing surface follows data-theme. Values live in tokens.css. Variables whose re-pointing
     would mislead or reach creative content keep their legacy values inside the legacy fence;
     later phases remove them. Remove an alias once nothing reads it. */
  :root {
    /* Grounds and surfaces. */
    --app-bg: var(--field);
    --app-bg-secondary: var(--surface-1);
    --app-surface: var(--surface-1);
    --app-surface-elevated: var(--surface-2);
    --app-overlay: color-mix(in srgb, var(--field) 88%, transparent);

    /* Text. fg-faint is reserved for annotations (§06), so both old muted levels map to fg-muted. */
    --app-text: var(--fg);
    --app-text-secondary: var(--fg-muted);
    --app-text-muted: var(--fg-muted);

    /* Seams are rule (L1). Control boundaries use var(--edge) directly (L2, §13 Idle). */
    --app-border: var(--rule);

    /* Signal at rest; full signal is for live, active, current, focus, new (§05). */
    --brand-primary: var(--signal-dim);
    --brand-primary-medium: var(--signal-dim);
    --brand-primary-soft: var(--signal-deep);
    --brand-primary-dark: var(--signal-deep);

    --primary-color: var(--brand-primary);
    --primary-color-light: var(--brand-primary-soft);
    --primary-color-medium: var(--brand-primary-medium);
    --primary-color-dark: var(--brand-primary-dark);

    --background-color: var(--app-bg);
    --background-color-secondary: var(--app-bg-secondary);
    --background-color-tertiary: var(--app-surface-elevated);
    --card-background: var(--app-surface);
    --panel-bg-color: var(--app-surface);
    --text-color: var(--app-text);
    --text-color-secondary: var(--app-text-secondary);
    --text-secondary: var(--app-text-secondary);
    --text-color-muted: var(--app-text-muted);
    --text-muted-color: var(--app-text-muted);
    --border-color: var(--app-border);
    --shadow-color: var(--app-shadow);

    --bg-canvas-fill: var(--field);
  }

  /* Held legacy values, carried over unchanged from index.css and ThemeContext.tsx at a16c70f.
     accent: read by Snake's native visuals and by two buttons with a recorded 1.40:1 deficiency (Phase 3).
     app-shadow: read by Annals' native panel; shadow removal is Phase 2.
     bg-*: atmosphere, re-derived in Phase 2. Mono inherits the :root (dark) values unless overridden. */
  /* legacy:start */
  :root,
  [data-theme="dark"] {
    --accent-color: #FFD700;
    --app-shadow: rgba(0, 0, 0, 0.3);
    --bg-glow-color: rgba(108, 117, 125, 0.10);
    --bg-grid-major: rgba(129, 199, 132, 0.08);
    --bg-grid-minor: rgba(129, 199, 132, 0.03);
    --bg-topology: rgba(129, 199, 132, 0.12);
    --bg-signal: rgba(129, 199, 132, 0.16);
    --bg-center-lift: rgba(255, 255, 255, 0.03);
    --bg-vignette: rgba(0, 0, 0, 0.18);
  }

  [data-theme="light"] {
    --app-shadow: rgba(0, 0, 0, 0.08);
    --bg-glow-color: rgba(106, 106, 106, 0.10);
    --bg-grid-major: rgba(0, 0, 0, 0.11);
    --bg-grid-minor: rgba(0, 0, 0, 0.055);
    --bg-topology: rgba(42, 115, 49, 0.16);
    --bg-signal: rgba(42, 115, 49, 0.08);
    --bg-center-lift: rgba(255, 255, 255, 0.18);
    --bg-vignette: rgba(18, 24, 32, 0.06);
  }
  /* legacy:end */
  ```

  Add `import "./styles/darkfield/bridge.css";` directly below `import "./index.css";` in `web/src/index.tsx`.

- [ ] **Step 6: Make the theme source single.**
  1. **`index.css`.** In `web/src/index.css` `:root`, delete from `--app-bg: #1a1a1a;` through `--shadow-color: var(--app-shadow);`, including the comments between them. This also drops the unread aliases listed in the mapping review.
  2. **`ThemeContext.tsx`.** Replace the whole `applyThemeToDocument` function (anchor: `const applyThemeToDocument = (theme: Theme) => {`) with:

     ```ts
     // Theme values live in src/styles/darkfield/tokens.css (generated from tokens.runtime.json)
     // and the legacy aliases in bridge.css; switching a theme only selects one.
     const applyThemeToDocument = (theme: Theme) => {
       const root = document.documentElement;
       root.setAttribute("data-theme", theme);
       root.style.colorScheme = theme === "light" ? "light" : "dark";
     };
     ```

  3. **`index.html` head script.** Replace `function applyTheme(theme) { … }` (anchor: `function applyTheme(theme) {`) and `resolveTheme` with:

     ```html
             var THEMES = ["dark", "light"];

             function resolveTheme() {
               try {
                 var saved = localStorage.getItem(STORAGE_KEY);
                 if (THEMES.indexOf(saved) !== -1) {
                   return saved;
                 }
               } catch (_) {}

               return "dark";
             }

             // Theme values live in the built CSS (Darkfield tokens.css); this only selects one.
             function applyTheme(theme) {
               root.dataset.theme = theme;
               root.style.colorScheme = theme === "light" ? "light" : "dark";
             }
     ```

     Leave `resolveNavMode` and the two trailing calls unchanged.
  4. **Shell fallbacks.** `rg -n "var\(--app-[a-z-]+, #[0-9a-fA-F]+\)" web/index.html` lists the route-shell fallbacks. Replace each fallback hex with the §17 Dark value for its role:

     | Variable | Fallback |
     |---|---|
     | `--app-bg` | `#070b08` |
     | `--app-text` | `#d0ddd4` |
     | `--app-text-muted` | `#a6b6aa` |
     | `--app-border` | `#27312a` |
     | `--app-surface` | `#0d130f` |

- [ ] **Step 7: Fix the fill/text pairs and control boundaries the bridge would break.**
  1. **`Home.css`.**
     - In `.btn-primary`, add `color: var(--text-color);`. It inherits `color: white` from `.btn` (`Home.css:80`) today. The result is `fg` on `signal-deep`, a §05-verified pair.
     - In `.btn-secondary:hover`, change `color: var(--primary-color);` to `color: var(--text-color);`. §13 assigns the `fg` label colour to the Hover state.
     - Delete `[data-theme="light"] .btn-secondary:hover { color: var(--primary-color-dark); }` and its comment.
     - In `.btn-outline:hover` (anchor: `.btn-outline:hover`), change `color: white;` to `color: var(--background-color);`. That is `field` on `signal-dim`, the same verified pair as `signal-dim` on `field`: Dark 7.57:1, Light 5.14:1. It replaces a baseline 2.78:1 Dark failure; remove that ledger entry in this commit.
  2. **Control boundaries → `edge`.** The scan found these candidates, each a `border` on an operable control that reads `--app-border` or `--border-color`:
     - `SiteNavigation.css` `.site-header__disclosure-toggle`, `.site-header__settings-button`
     - `SettingsPanel.css` `.settings-segmented`
     - `ProjectMedia.css` `.project-media__control`
     - `TimelineItem.css` `.timeline-flip-toggle`
     - `ErrorBoundary.css` `.error-button.secondary`
     - `Modal.css` `.modal-button-secondary`
     - `Home.css` `.btn-secondary` (border only)
     - `OrbitalSimulator.css` `.orbital-container :is(button, select, input)`
     - `TrafficSimulator.css` `.traffic-container :is(button, select)`
     - `ProceduralAnimationPiece.css` `.animation-piece__control:hover`

     For each, open the rule and confirm it is an operable control, not a region. Then replace the variable inside that `border`/`border-color` declaration with `var(--edge)`, keeping any `color-mix` percentage. Leave regions (for example `Projects.css` `.projects-controls`) on `rule`. List the confirmed files in the commit body.
  3. **Spider hold (authorized native-visual edit).** In `SpiderSolitaire.css`, change `.spider-column:empty`'s `var(--app-border)` to `var(--spider-empty-column-border)`, and add at the top of the file:

     ```css
     /* Native playfield colour, held at its pre-Darkfield value until D6 classifies it. */
     .spider-solitaire { --spider-empty-column-border: #495057; }
     [data-theme="light"] .spider-solitaire { --spider-empty-column-border: #cfcec8; }
     ```

- [ ] **Step 8: Run all checks and confirm they pass.**

  ```bash
  cd web && node --test scripts/darkfield-bridge.test.mjs scripts/darkfield-tokens.test.mjs && npm run typecheck && npm run lint
  bash "$DF_TMP/df-serve.sh" head web 4173
  node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  git status --porcelain --untracked-files=all   # build must not have changed tracked files
  ```

  Expected:
  - PASS.
  - Only ledger entries are printed as KNOWN.
  - The `UNCOVERED` line lists only pairs that genuinely need state the test does not create, such as the settings panel being open. Record that line in the commit body.

- [ ] **Step 9: Run the existing regression tests against both previews.**

  Run `boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata` and `procedural-animations` against 4173 and 4174. A test failing on head but not on base is a regression to fix in this task. A test failing on both is recorded in the ledger `notes`.

- [ ] **Step 10: Run the visual review (human).**

  ```bash
  node scripts/visual-review.mjs --base-url http://127.0.0.1:4174 --head-url http://127.0.0.1:4173 --mode compare --routes "<every route in ROUTES>" --theme dark --out "$DF_TMP/review-dark" --playwright "$DF_PW"
  ```

  Repeat with `--theme light`. Inspect every pair for:
  - unreadable text
  - control boundaries that vanished
  - creative regions (iframes, canvases, Snake/Spider/Rhythm Lab playfields, Annals panels, project media) that changed. Any change there is a **stop**.

- [ ] **Step 11: Commit** after D10.
  - Paths: the Files list above, with the confirmed control-boundary files.
  - Message: `feat(web): drive themes from Darkfield tokens through a legacy-variable bridge`.

### Task 4: Font families

**Spec:**
- §06 *Rules* (fallbacks) and README *Using the system*: use the font files shipped with the export, not third-party hosted subsets.
- §07 *The cell*: text graphics require the shipped Plex Mono files; a fallback face breaks the cell grid.
- §17 Type families.

**Evidence:**
- 47 `font-family` declarations hardcode Courier, Monaco, Menlo, Ubuntu Mono or ui-monospace stacks. One is in Annals and is excluded (creative).
- 5 are held for D6: `SnakeGame.css:18,84`, `SpiderSolitaire.css:13`, `RhythmLab.css:13`, and `SimulationCard.css` `.spider-preview-card-face`.
- That leaves **41** to replace.
- The `index.html` route shell sets `-apple-system…` (line 153 at `a16c70f`).
- `--terminal-font` is defined in `Simulations.css:4` and `Projects.css:13`.

**Files:**
- Modify:
  - `web/src/index.css` (font pair)
  - `web/src/styles/darkfield/bridge.css`
  - `web/index.html`
  - `web/src/pages/Simulations/Simulations.css`
  - `web/src/pages/Projects/Projects.css`
  - The files printed by Step 4's scan (saved to `$DF_TMP/task4-files.txt`)
- Test: `darkfield-bridge.test.mjs`, browser test

- [ ] **Step 1: Add the failing static test** (append to `darkfield-bridge.test.mjs`).

  ```js
  // Held for D6 (native-visual or preview typography) and Annals (creative): file → selector.
  const FONT_HOLDS = [
    ["components/SnakeGame/SnakeGame.css", ".game-scores"],
    ["components/SnakeGame/SnakeGame.css", ".game-over-content"],
    ["components/SpiderSolitaire/SpiderSolitaire.css", ".spider-solitaire"],
    ["components/RhythmLab/RhythmLab.css", ".rhythm-lab"],
    ["components/SimulationCard/SimulationCard.css", ".spider-preview-card-face"],
  ];
  test("site CSS names fonts only through the Darkfield families, except recorded holds", async () => {
    const legacyStack = /(font-family|--terminal-font):[^;]*(Courier New|Monaco|Menlo|Ubuntu Mono|ui-monospace|-apple-system)[^;]*;/g;
    for (const file of await cssFiles()) {
      if (file.startsWith("pages/Annals/") || file === "styles/darkfield/tokens.css") continue;
      const css = await read(`src/${file}`);
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!legacyStack.test(rule[2])) continue;
        legacyStack.lastIndex = 0;
        const selector = rule[1].trim().split(/\s*\n\s*/).pop();
        assert.ok(FONT_HOLDS.some(([f, s]) => f === file && selector.endsWith(s)), `${file} ${selector}`);
      }
      legacyStack.lastIndex = 0;
    }
    assert.doesNotMatch(await read("index.html"), /font-family:[^;]*-apple-system/, "index.html route shell");
    const bridge = await read("src/styles/darkfield/bridge.css");
    assert.match(bridge, /--font-family-primary: var\(--font-sans\);/);
    assert.match(bridge, /--font-family-mono: var\(--font-mono\);/);
  });
  ```

- [ ] **Step 2: Add the failing browser invariant.** Insert at the `// Task 4 and Task 6 add their invariants here.` marker:

  ```js
  await withPage({ theme: "dark" }, async (page) => {
    for (const file of ["Archivo-Variable-Latin", "ArchivoNarrow-Latin-600", "IBMPlexMono-Regular"]) {
      const response = await page.request.get(`${base}/fonts/darkfield/${file}.woff2`);
      invariant(response.status() === 200, `${file}.woff2 not served (${response.status()})`);
    }
    const fonts = await page.evaluate(async () => ({
      body: getComputedStyle(document.body).fontFamily,
      archivo: (await document.fonts.load('15px "Archivo"')).length,
      plexMono: (await document.fonts.load('13px "IBM Plex Mono"')).length,
    }));
    invariant(/^"?Archivo"?,/.test(fonts.body), `body is set in ${fonts.body}`);
    invariant(fonts.archivo > 0 && fonts.plexMono > 0, "Darkfield faces did not load");
  });
  ```

- [ ] **Step 3: Confirm the tests fail.**

  Run: `cd web && node --test scripts/darkfield-bridge.test.mjs`

  Expected: FAIL naming the first unheld file.

- [ ] **Step 4: Implement.**
  1. Delete `--font-family-primary` and `--font-family-mono` (with their comment) from `index.css` `:root`.
  2. Add to the bridge's `:root` block:

     ```css
       /* Three voices (§06): Narrator sans, Machine mono. Instrument (narrow) is applied per element in Phase 3. */
       --font-family-primary: var(--font-sans);
       --font-family-mono: var(--font-mono);
     ```

  3. Replace the unheld stacks:

     ```bash
     cd web
     rg -l "font-family:[^;]*(Courier New|Monaco|Menlo|Ubuntu Mono|ui-monospace)" src -g '*.css' \
       -g '!**/Annals/**' -g '!**/SnakeGame/**' -g '!**/SpiderSolitaire/**' -g '!**/RhythmLab/**' -g '!**/SimulationCard/**' \
       | tee "$DF_TMP/task4-files.txt" \
       | xargs perl -pi -e 's/font-family:[^;]*?(?:Courier New|Monaco|Menlo|Ubuntu Mono|ui-monospace)[^;]*;/font-family: var(--font-family-mono);/g'
     ```

  4. In `SimulationCard.css`, replace the stacks by hand in `.simulation-card h3`, `.simulation-card-badge` and `.launch-button` only. Leave `.spider-preview-card-face` held, and add `src/components/SimulationCard/SimulationCard.css` to `$DF_TMP/task4-files.txt`.
  5. In `Simulations.css:4` and `Projects.css:13`, change the definition to `--terminal-font: var(--font-family-mono);`.
  6. In the `index.html` route-shell `<style>` (anchor: `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;`), replace the stack with `font-family: var(--font-sans, "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif);`. The fallback is §17's `sans` stack.

  On 2026-10-11 a dry run of the step 3 pattern on a scratch copy of `web/src` with only the Annals exclusion replaced 46 declarations and left none. With the four additional exclusions and the hand edit, expect 41.

- [ ] **Step 5: Verify.**

  ```bash
  cd web && node --test scripts/darkfield-bridge.test.mjs && npm run lint
  bash "$DF_TMP/df-serve.sh" head web 4173
  node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  ```

  Expected: PASS.

  Human check: the Terminal route at 1440 and 390. Plex Mono shares Courier New's 0.6 em advance but not its vertical metrics, so check that prompts and box-drawing still align.

- [ ] **Step 6: Commit.**
  - Paths: `index.css`, `bridge.css`, `index.html`, `Simulations.css`, `Projects.css`, `darkfield-bridge.test.mjs`, `darkfield-foundation-browser-test.mjs`, and every path in `$DF_TMP/task4-files.txt`.
  - Message: `feat(web): set site type in bundled Archivo and IBM Plex Mono`.

### Task 5: Mono theme (gated on D4)

**Spec:**
- README §02 Principle 3 and its Mono test: reading order must survive when every hue is removed.
- §05 Monochrome; §16, question 3.

**Files:**
- Modify:
  - `ThemeContext.tsx` (type; `resolveInitialTheme`)
  - `ThemeContextTypes.tsx`
  - `index.html` (`THEMES`)
  - `utils/settings.ts`: the two `"light" | "dark"` unions and the `Invalid theme` check
  - `SettingsPanel.tsx` (`THEME_OPTIONS`, only under D4 option a)
  - `TimelineItem.tsx` (image variant selection)
  - `OrbitalSimulator/renderer.ts` (palette selection: authorized creative-owned edit, selection only)
  - `bridge.css`
  - `scripts/visual-review.mjs` (theme assertion)
- Test: `web/scripts/darkfield-settings.test.mjs`; browser test with `DARKFIELD_THEMES=dark,light,mono`

**Interfaces:**
- Produces: `type Theme = "light" | "dark" | "mono"`. `parseSettingsImport` accepts `"mono"`; the export format stays version `1`, because adding an allowed value keeps every existing export valid.

- [ ] **Step 1: Write the failing test.** This was dry-run on 2026-10-11 against the current `settings.ts`: Node v22.23.3 imported it with type stripping, the old-export and rejection cases passed, and the `mono` case failed with `Invalid theme`, as intended.

  ```js
  // web/scripts/darkfield-settings.test.mjs
  import test from "node:test";
  import assert from "node:assert/strict";
  import { parseSettingsImport } from "../src/utils/settings.ts";

  test("settings exports from before the migration still import", () => {
    assert.equal(parseSettingsImport({ version: 1, theme: "light" }).theme, "light");
    assert.equal(parseSettingsImport({ version: 1, theme: "dark" }).theme, "dark");
  });

  test("mono is an importable theme", () => {
    assert.equal(parseSettingsImport({ version: 1, theme: "mono" }).theme, "mono");
  });

  test("unknown themes are still rejected", () => {
    assert.throws(() => parseSettingsImport({ version: 1, theme: "neon" }), /Invalid theme/);
  });
  ```

- [ ] **Step 2: Confirm it fails.**

  Run: `cd web && node --test scripts/darkfield-settings.test.mjs`

  Expected: FAIL in "mono is an importable theme".

- [ ] **Step 3: Implement.**
  1. Widen the theme type to `"light" | "dark" | "mono"` in `ThemeContext.tsx`, `ThemeContextTypes.tsx` and both `settings.ts` unions.
  2. Accept `"mono"` in `resolveInitialTheme`, in `settings.ts`'s `Invalid theme` check, and in `index.html` (`var THEMES = ["dark", "light", "mono"];`).
  3. Leave `toggleTheme` as is: it toggles dark⇄light, and Mono toggles to Light.
  4. Under D4(a) only, add `{ value: "mono", label: "Mono" }` to `THEME_OPTIONS`.
  5. **Dark-ground selection.** Mono is a dark ground, so code that branches on `theme === "dark"` would hand it the light variant. Flip each such branch to test for light.
     - `rg` on 2026-10-11 found these consumers that render in Mono:
       - `TimelineItem.tsx:56-57`: `theme === "light" ? image.light : image.dark` and its fallback.
       - `OrbitalSimulator/renderer.ts:64,65,71`: rewrite each `theme === "dark" ? <dark> : <light>` as `theme === "light" ? <light> : <dark>`, keeping both colour literals. This selects an existing palette; it does not change one.
     - Branches inside `MatrixRain3DBackground` and `MatrixBackground` need nothing, because those render only in Dark (`AppBackground.tsx`).
     - Re-run the `rg` (`theme === "dark"|isLight|=== "light"`) and record the result. Any other Mono-reachable branch is added to this step with the same rule.
  6. Append to `bridge.css`, outside the fence. It names no literal colour (L0 grid at `opacity-ghost`, §09):

     ```css
     [data-theme="mono"] {
       --bg-glow-color: transparent;
       --bg-grid-major: color-mix(in srgb, var(--fg) 6%, transparent);
       --bg-grid-minor: transparent;
       --bg-topology: transparent;
       --bg-signal: transparent;
       --bg-center-lift: transparent;
       --bg-vignette: transparent;
     }
     ```

     The fence test allows these: they are outside the fence and contain no literals.
  7. In `visual-review.mjs`, change the theme assertion (anchor: `"--theme must be dark or light"`) to accept `mono`.

- [ ] **Step 4: Verify.**

  ```bash
  cd web && node --test scripts/darkfield-settings.test.mjs scripts/darkfield-bridge.test.mjs && npm run typecheck && npm run lint
  bash "$DF_TMP/df-serve.sh" head web 4173
  DARKFIELD_THEMES=dark,light,mono node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  node scripts/settings-panel-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  ```

  Expected: PASS. Mono contrast failures are new by definition, because the baseline has no Mono. They must be fixed, not ledgered.

  Known gap to report: Mono canvases and other creative content keep their hue. That is by the scope rule, not a defect.

- [ ] **Step 5: Commit** the Files list, plus the test.

  Message: `feat(web): add the Darkfield Mono theme`.

### Task 6: Focus ring

**Spec:**
- §13 state model (Focus row) and *Focus in each theme*: a square two-layer ring outside the control (an inner gap in the ground colour plus an outer solid ring of equal width). It appears on `:focus-visible`, moves instantly and never uses glow.
- §17 *Glow strength and focus*: `focus-ring` is defined as a spread `box-shadow` value, and no glow may stand in for it.

**Evidence:**
- The global rule is a `2px solid var(--primary-color)` outline with 0 specificity (`index.css:361`).
- These governed menu-control rules replace it with glow or tint: `TerminalDropdown.css:48-53`; `RhythmLab.css` at 69, 218, 281, 328, 541, 573, 710, 924, 1383 and 1467 (`outline: none` within `:focus`/`:focus-visible` blocks).
- Verified 2026-10-11 in Chromium via Playwright: `forcedColors: "active"` computes `box-shadow` as `none`, and paints a `2px solid transparent` outline in a system colour.

**Design (additive; no spec deviation):**
- `box-shadow: var(--focus-ring)` carries the spec ring.
- The transparent outline is what forced-colors mode paints.
- `!important` enforces §17's rule that the focus ring is never removed and never swapped for a glow.
- Focus is interaction, which the site governs, so focusable elements inside games get the ring too.

**Files:**
- Modify: `web/src/index.css` (anchor: `:where(a, button, input, textarea, select, [tabindex]):focus-visible {`)
- Modify: `web/src/components/TerminalDropdown/TerminalDropdown.css`
- Modify: `web/src/components/RhythmLab/RhythmLab.css` (the listed focus blocks only: authorized governed-control edits)
- Test: browser test

- [ ] **Step 1: Add the failing invariant.** Insert at the marker:

  ```js
  const RING = { dark: "rgb(108, 255, 149)", light: "rgb(4, 110, 48)", mono: "rgb(255, 255, 255)" };
  const FOCUS_ROUTES = ["/", "/projects", "/terminal", "/simulations/rhythm-lab", "/simulations/orbital-simulator", "/procedural-animations"];
  const focusStates = async (page, presses = 25) => {
    const states = [];
    for (let i = 0; i < presses; i += 1) {
      await page.keyboard.press("Tab");
      const state = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el.tagName === "IFRAME") return null;
        const c = getComputedStyle(el);
        return { label: `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}`, boxShadow: c.boxShadow, outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth };
      });
      if (state) states.push(state);
    }
    return states;
  };
  for (const theme of THEMES) {
    for (const route of FOCUS_ROUTES) {
      await withPage({ theme, route }, async (page) => {
        for (const state of await focusStates(page)) {
          invariant(state.boxShadow.includes(`${RING[theme]} 0px 0px 0px 4px`), `${theme} ${route}: ${state.label} lacks focus-ring (${state.boxShadow})`);
        }
      });
    }
  }
  await withPage({ theme: "dark", route: "/", forcedColors: "active" }, async (page) => {
    for (const state of await focusStates(page, 10)) {
      invariant(state.outlineStyle === "solid" && state.outlineWidth === "2px", `forced colors: ${state.label} outline ${state.outlineStyle} ${state.outlineWidth}`);
    }
  });
  ```

  Focus that enters an `<iframe>` belongs to the artwork's own document and is not asserted here. The existing `procedural-animations-browser-test.mjs` covers the pieces' keyboard behaviour.

- [ ] **Step 2: Confirm it fails.**

  Run: `bash "$DF_TMP/df-serve.sh" head web 4173 && cd web && node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`

  Expected: FAIL with `dark /: A KSKareem Sasa lacks focus-ring`.

- [ ] **Step 3: Implement.** Replace the global focus rule with:

  ```css
  /* Keyboard focus (§13, §17): the focus-ring token, enforced over component rules; glow never
     stands in for it. box-shadow draws the token's ring; the transparent outline is what forced-
     colors mode paints, because it discards box-shadow. */
  :is(a, button, input, textarea, select, summary, [tabindex]):focus-visible {
    outline: 2px solid transparent !important;
    outline-offset: 2px;
    box-shadow: var(--focus-ring) !important;
  }
  ```

  In `TerminalDropdown.css` and each listed `RhythmLab.css` focus block, delete only the `outline: none;` and `box-shadow:` lines. Keep border and background changes, because those are inside the control (§13). Delete a block that becomes empty.

  If Step 1 names an element type outside the selector list, add it to `:is(…)` and record it in the commit body.

- [ ] **Step 4: Verify.**

  ```bash
  cd web && npm run lint
  bash "$DF_TMP/df-serve.sh" head web 4173
  DARKFIELD_THEMES=dark,light,mono node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  node scripts/header-overlap-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  node scripts/procedural-animations-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  ```

  Drop `mono` from `DARKFIELD_THEMES` without D4.

  Human check: the painted forced-colors ring, once, using Chromium DevTools' forced-colors emulation.

- [ ] **Step 5: Commit** these three paths: `index.css`, `TerminalDropdown.css`, `RhythmLab.css`, plus the browser test.

  Message: `fix(web): use the Darkfield focus ring everywhere, including forced colors`.

### Task 7: Phase 1 release check (report; docs-only commit)

- [ ] **Step 1: Run the full suite against fresh previews.**

  ```bash
  cd web && node --test scripts/*.test.mjs && npm run typecheck && npm run lint && npm test
  ```

  Then run the browser test in all approved themes, and every existing browser test, against both 4173 and 4174.

  The known stale `orbital-browser-test.mjs:196` click is in the ledger `notes`. Report it; do not fix it here.

- [ ] **Step 2: Measure residual coverage.** Record these counts from Phase 1 head versus `BASE`:
  - literal colour declarations in governed CSS: `rg -o '#[0-9a-fA-F]{3,8}\b|rgba?\(' web/src -g '*.css'`, excluding creative-owned paths
  - bridged alias reads
  - legacy-fence variables
  - native-visual holds
  - UNCOVERED pairs
  - ledger entries

  These numbers are the honest statement of Phase 1 coverage.

- [ ] **Step 3: Visual review.** Run every route in every approved theme, base against head, inspected by a human.

- [ ] **Step 4: Docs-only commit.** Add one line to `AGENTS.md` Project-Specific Notes:

  "Published Darkfield runtime assets and `SOURCE.json` live under `web/src/styles/darkfield/` and `web/public/fonts/darkfield/`. `tokens.runtime.json` is exported from the private canonical `tokens.json` by `web/scripts/darkfield-export.mjs`, only in an authorized environment; the canonical file is never copied here. `tokens.css` is generated by `node web/scripts/darkfield-tokens.mjs`. Neither file is edited by hand."

  Commit only `AGENTS.md`.

- [ ] **Step 5: Propose CI wiring.** Adding the Darkfield tests to `npm test` or `web-ci.yml` needs approval. Propose it to the owner with the measured run time, and resolve the CI Node version constraint in [Global Constraints](#global-constraints): Node 20 in CI versus ≥ 22.18 for tests that import TypeScript.

---

## Phases 2–6: scoped, with sub-plans to follow

Each phase gets its own plan in this directory after Phase 1 merges. The scope boundary applies throughout: these phases change the governed interface only.

### Phase 2: Restraint

**Authority:** Principles 1, 4 and 6; §10; §11 rules 2–5; §12 *Decorative motion to remove*; §13 *Hover*; §16.

| Work | Evidence (`a16c70f`) | Acceptance |
|---|---|---|
| Remove glow from content that isn't live | `HeroSection.css:27,36,139,143`; `components.css:34`; `ProjectRoster.css:128,204`; `SimulationCard.css:162` (card chrome); 34 `text-shadow` declarations | Static: no `text-shadow` or glow in governed CSS except `var(--glow-*)` on a named live element |
| Remove shadows and glass; release the `--app-shadow` hold for governed consumers | 146 `box-shadow`, 32 `backdrop-filter`; reading scrim `index.css:416` | Governed `box-shadow` only via `--focus-ring`/`--glow-*`. The Annals panel keeps its own value via a local hold, unless D6 says otherwise. |
| Remove hover lift, scale and sheen | `components.css:1-41` on static case-study articles (`CaseStudyPage.tsx:54,97-105`); `components.css:106-110`; `Home.css:112-130` | Static: no `transform` in governed `:hover` rules; static content has no hover response |
| Atmosphere: remove rain from reading and working surfaces (decided); the rest per D3 | `AppBackground.tsx:8,15-24`; hex glyphs `MatrixRain3DBackground.tsx:7`; scrims `index.css:412-416` | No rain on any route except a D3-approved cover; any survivor uses §07 glyphs, stays within the lit-cell density limit of §10 *Effects* and §17 *Composite recipes* (Rain), and freezes under reduced motion (already true, `MatrixRain3DBackground.tsx:428-430`) |
| Typewriter and spring motion in site UI | `TypeWriterText` on headings (`CaseStudies.tsx:57`, `Writing.tsx:18`, `ProceduralAnimations.tsx:16`, `CaseStudyPage.tsx:65`); springs in `TypeWriterText.tsx`, `DockSettingsButton.tsx:44-46`, `Dock` | Narrator (prose) text is shown without typing or reveal animation (§06 *Rules*); no springs in governed UI; every governed animation carries a §12 class annotation (Phase 6 check) |
| Circular spinners | `LoadingSpinner.css:18-46` (component unused per `rg`); `PageLoader.css` | Quadrant spinner or scan (§13 *Processing*); deleting the unused component needs approval |

### Phase 3: Grammar

**Authority:** §03, §05 *Semantic prominence* and *State encoding*, §06, §08, §09, §13.

- **Voices.** Narrator, Instrument and Machine per element; prose limited to `measure-body`; eyebrows become `.df-label`.
- **Rank and state.** D7. The ledgered accent buttons (`.error-button.primary`, `.home-link`) are redesigned as §13 controls, which retires their ledger entries.
- **Geometry.** `radius-0` (230 declarations in 45 files at `a16c70f`, governed share to be measured); `cut-*` chamfers only where §17 *Chamfers* assigns them: primary containers, plus the `cut-sm` uses §17 lists for controls and tags carrying a primary marking. They stay within the corner limits of README *Using the system*, §09 *Frames and corners* and §17 *Chamfers*, applying the stricter README limit until the owner rules.
- **Lines.** L1 seams, L2 control and axis boundaries (≥ 3:1), flattened nested frames.
- **Interaction.** §13 state model: Idle; Hover (`›` marker, ground step); Pressed, an inverse fill shown within the `dur-instant` acknowledgement window. See also D8.
- **Literal colours.** Replace the ~250 literal greens and 27 literal whites in governed selectors; retire the local colour-variable systems (Terminal, Traffic chrome, Projects, Simulations, Roster) into tokens.
- **Dead CSS.** Propose deleting `.projects-cta-primary` (`Projects.css:118`); no component renders it. Deletion needs approval.

### Phase 4: Identity (R1)

**Authority:** §18; R1 `SPEC.md` §1–§3.

- **Header mark (D5).** Use the registered `darkfield-r1-symbol-currentcolor.svg`, uncontained, at or above the minimum uncontained size in `r1/SPEC.md` §1, with the clear space §18 defines.
- **Head metadata.** `theme-color` and a web manifest with the 192, 512 and maskable icons (deferred in `92fc157`).
- **Apple touch icon.** Validate the provisional inset on a real device.
- **Social image.** Redesign `og-image.svg`, which contains binary-digit strings, a motif §04 *Overused symbols to avoid* rules out.
- **Dead legacy logo.** Remove `src/assets/logo.svg`, `Logo/` and `MainContent/` (unused per `rg`), with approval.
- **Acceptance.**
  - Pixel identity of any shipped R1 master against the canonical source.
  - A DOM check that the symbol has no container.

### Phase 5: Governed interface around creative and native content

**Authority:** §08, §10 *Atmosphere by context*, §13 (including *Direct manipulation* for simulation controls), §15 for site-drawn diagrams and legends. The scope boundary and D6 apply.

| Surface | Governed work | Must not change | Gate |
|---|---|---|---|
| Procedural animations | Index cards, piece header and control bar, captions, loading and error states, focus | `piece.html` artworks; the existing reduced-motion pass-through (`procedural-animations-browser-test.mjs`) | — |
| Case studies and project media | `MediaInspector` chrome, captions, controls | Recordings, screenshots, evidence images | — |
| Orbital, Traffic | DOM controls as §13 direct manipulation (current, proposed, committed, invalid), panels, legends and readouts in the three voices | Canvas renderers' drawing and palettes. Theme *selection* only. | — |
| Terminal | Whole interface: §07 cell grid, Plex Mono, block cursor shown only while the terminal is accepting input (§12, §16) | — | — |
| Snake, Spider, Rhythm Lab | Page chrome, menus, settings, buttons, and the HUD and overlay as D6 decides | Playfield visuals (board, cards, lanes, notes) | D6 |
| Annals | Chrome and controls as D6 decides | World presentation (serif parchment) | D6 |
| Simulations index | Cards, launch controls | Previews of native visuals as D6 decides | D6 |
| NotFound, errors, loaders, toasts, modals | §13 Error and Processing signatures; no celebratory toasts | — | — |

**Region marking.** Each Phase 5 task marks its creative containers with `data-df-region="artwork|native|evidence"`. The Phase 1 sampler already skips elements inside such regions. Phase 6 measurements depend on these marks; an unmarked creative region is a Phase 5 defect.

### Phase 6: Conformance measurement

Limits are read from the canonical repository at the pinned tag; this plan cites them without restating them. Any row whose automated method would put a specification limit into public code is gated by D11.

All measurements run on the **governed interface**: the viewport minus `[data-df-region]`, `<iframe>`, `<canvas>`, `<video>` and content `<img>` boxes. Each report also states the excluded share of the viewport, so the exclusions stay visible.

| Requirement | Method | Kind |
|---|---|---|
| Area budgets: every share limit in §05 *How much of each*, read from the pinned specification | Screenshot per route, theme and viewport. Classify governed pixels by nearest token colour within ΔE tolerance; unclassified pixels are reported as such. Because §05 allows these budgets to be assessed approximately, results carry a tolerance rather than exact pass/fail on anti-aliased edges. | Sampler, with a human verdict |
| Largest contiguous void at or above the §08 *Balancing density and emptiness* minimum | Largest 8 px-cell connected component of field-classified governed cells | Sampler |
| Emission: `glow-signal` and `glow-flare` counts per view within the §11 *Rules* budget; no glow in Light (§11 *Light theme*) | Computed `box-shadow`/`text-shadow`/`filter` of governed elements, matched against glow token values | Invariant |
| Mono (§05 rule 7; Principle 3) | In Mono, governed pixels with chroma above threshold are hue leaks (invariant). Reading order surviving is judged on Mono screenshots by a human. | Invariant + human |
| Zero-effects test (§10) | Screenshots with atmosphere off; identity and information intact | Human |
| Motion, idle (Principle 6) | After a 3 s settle: `document.getAnimations()` outside regions, plus a 2 s governed-area screenshot diff. The heartbeat allowance of Principle 6 (README §02) is not exceeded. | Invariant |
| Motion, reduced (§12 table) | With `reduce`: no running governed animations, and a zero governed-area diff over 2 s | Invariant |
| Motion classes (§12 "Final test") | Static: every governed `@keyframes` and Framer Motion variant carries a `§12: <class> · <state reported>` comment | Invariant (presence); human (truth) |
| Typography (§06) | Computed families of governed text ∈ {sans, narrow, mono}; uppercase text uses narrow | Invariant |
| Geometry (§03) | Computed `border-radius` of governed elements is 0, except `radius-node` on elements within the §17 *Corner radii* node size limit | Invariant |
| Focus, contrast | Phase 1 checks, extended to every route | Invariant / sampler |
| Three-question check (§16) | Reviewer sign-off per route | Human |

Creative regions are reported separately: their share of each view, plus confirmation that their pixels did not change across the migration (baseline comparison, where the capture is deterministic).

---

## Reference index

Every line number refers to `a16c70f`. Implementers locate code by the anchor, not the line.

| Reference | Anchor |
|---|---|
| `index.css` theme values | `--app-bg: #1a1a1a;` … `--shadow-color: var(--app-shadow);` |
| `index.css` focus rule | `:where(a, button, input, textarea, select, [tabindex]):focus-visible {` |
| `ThemeContext.tsx` | `const applyThemeToDocument = (theme: Theme) => {` |
| `index.html` head script | `function applyTheme(theme) {` |
| `index.html` shell font | `font-family: -apple-system, BlinkMacSystemFont` |
| `Home.css` button text | `.btn {` … `color: white;`; `.btn-primary {`; `.btn-outline:hover`; `[data-theme="light"] .btn-secondary:hover` |
| `SpiderSolitaire.css` empty column | `.spider-column:empty` |
| `settings.ts` theme check | `throw new Error("Invalid theme")` |
| `TimelineItem.tsx` image choice | `const preferred = theme === "dark"` |
| `OrbitalSimulator/renderer.ts` palette | `theme === "dark" ? "#` |
| `visual-review.mjs` theme check | `"--theme must be dark or light"` |
| `TerminalDropdown.css` focus | `.terminal-dropdown-trigger:focus {` |

## Evidence summary

**Audit, 2026-10-11 (`main` at `a16c70f`):**
- **Darkfield in the repo.** It appears only in `web/public/favicon.svg`. The R1 favicon set matches the R1 masters pixel for pixel. None of the eight Darkfield Dark values checked appears in `web/src` or `index.html`, and no Archivo or Plex Mono is used outside `public/procedural-animations`.
- **Rendered.** Body `#1a1a1a`, system sans. Courier New prose. Glowing hero text. KS monogram. Rain frozen under reduced motion.
- **Drift counts (CSS).**
  - 93 `#4CAF50`, 60 `rgba(0,255,0`, 46 `Courier New`.
  - 230 `border-radius`, 146 `box-shadow`, 34 `text-shadow`, 32 `backdrop-filter`.
  - 33 `@keyframes`.

**Revision r2, 2026-10-11:**
- **E-1. Repository.** `main` = `origin/main` = `a16c70f`; only this plan is untracked; the repo is public; there is no Darkfield repository.
- **E-2. Spec copies.** Before Task P2, the owner's editing copy matched the export archive. All file sizes were identical, and a subset of files (including `tokens.json` and the core specification files) was also hash-identical; the rest were compared by size only. Since Task P2, only the canonical repository is authoritative, and its contents were hash-verified file by file against both archives.
- **E-3. Mounting.** Creative and native surfaces are mounted as `<iframe>` (procedural pieces), `<canvas>` (Orbital, Traffic, backgrounds), `<video>`/`<img>` (project media), and DOM/CSS (Snake, Spider, Rhythm Lab, Annals).
- **E-4. Procedural pieces.** Each piece handles `prefers-reduced-motion` itself, and `procedural-animations-browser-test.mjs` verifies the pass-through.
- **E-5. Bridged aliases inside creative and native selectors.**
  - Snake `--accent-color` ×4.
  - Spider `--app-border` (`.spider-column:empty`).
  - Annals `--shadow-color` (panel).
  - Container `--text-color` in Spider and Rhythm Lab.
  - `font-family` holds: Snake ×2, Spider, Rhythm Lab, the SimulationCard spider preview.
- **E-6. Fill/text pairs whose ground the bridge changes.** The rule-level scan found the eleven selectors in `PAIRS` (`.error-button.primary` renders only on error), plus `.projects-cta-primary`, which no component renders. Computed contrast:

  | Pair | Before | After the r1 mapping |
  |---|---|---|
  | Light `.btn-primary` | 7.87:1 | **1.26:1** |
  | Dark `.btn-outline:hover` | 2.78:1 | 2.62:1 |
  | Accent buttons, white on gold | 1.40:1 | 1.40:1 |
  | Control boundaries, `rule` (Dark) | 2.13:1 | 1.47:1 |
  | Control boundaries, `edge` (Dark) | 2.13:1 | 4.26:1 |
  | Control boundaries, `rule` (Light) | 1.51:1 | 1.41:1 |
  | Control boundaries, `edge` (Light) | 1.51:1 | 4.15:1 |

- **E-7. Outside the bridge.**
  - About 250 literal greens (RhythmLab 102, SimulationCard 29, TerminalDropdown 28, Projects 22, Snake 13, Spider 8, …).
  - 27 literal white text colours.
  - Local colour variables in 8 stylesheets (Terminal 18, Traffic 12, Simulations 6, Projects 6, ExplorationChoice 6, ProjectRoster 6, RhythmLab page 2, SettingsPanel 2).
  - `[data-theme="light"]` overrides in 7 stylesheets.
- **E-8. Process safety.** Killing processes by command-line pattern can terminate the calling shell; this was observed during the 2026-10-11 audit. Hence the identity-verified stop in [Operational safety](#operational-safety). Build output is `web/build/`, which is gitignored.
- **E-9. Runtime export dry run** (2026-10-11, throwaway workspace; nothing written to the repository).
  - The canonical `tokens.json` at `tokens-v1-2026-10-09` has 12 token groups (92 tokens), 6 fonts, 3 font families and 18 type styles. Its private content sits only in `note`, `usage`, `sample` and display-`name` fields.
  - The allowlist exporter produced a deterministic file: two runs gave the same hash.
  - None of the canonical prose strings appear in the runtime file.
  - Public tests passed: vendor 12/12, runtime 5/5, tokens 8/8. Canonical verification confirmed all 10 files and identical compiled CSS.
  - Six negative cases each failed as required:
    - an unclassified canonical field (export refused);
    - an injected private key (runtime test);
    - prose inside a value (runtime grammar);
    - an extra CSS comment (runtime test);
    - an altered value (canonical verification and the vendor test);
    - a dropped token (canonical verification).
- **Dry runs in a throwaway local workspace, 2026-10-11:**
  - The Task 2 compiler and tests: 8/8 pass.
  - The bridge fence check against the r1 bridge, after the fence fix.
  - The Task 5 settings test: fails only on `mono`, as intended.
  - The Task 4 replacement pattern: 46 replaced with only the Annals exclusion.
- **Not run:** the r2 browser test as a whole, the serve script, the ledger record mode, and the r2 `FONT_HOLDS` test. Their first execution is in Phase 1, under review.

## Revision log

- **r6 (2026-10-11, D11(b) runtime publication model).**
  - Recorded D11(b): usage notes stay private, and the canonical `tokens.json` is never copied into this repository. D2b is scoped accordingly.
  - Replaced Task 1's copy of `tokens.json` with an allowlist runtime export (`tokens.runtime.json`, schema `darkfield-runtime/1`) produced by `darkfield-export.mjs`. The canonical field classification is inspected and listed, and unclassified fields fail the export.
  - Added `darkfield-runtime.test.mjs`.
  - Rewrote the vendor test and the `SOURCE.json` runtime entry (`derivedFrom`, `sourceSha256`, `exporter`, `schema`, `sha256`).
  - Split public verification from canonical verification. The canonical verifier now re-exports and checks compiler equivalence.
  - Changed only the compiler's input path and header comments; its logic and token values are unchanged.
  - Added [Runtime token propagation](#runtime-token-propagation) with per-channel leakage controls, plus reviewer canonical-verification and disclosure duties.
  - After independent review:
    - defined the canonical disclosure scan once, with a corpus that includes the canonical `tokens.json` private fields;
    - added public guards for `SOURCE.json` exact keys and the absence of a canonical `tokens.json`;
    - corrected the gate records, command working directories, the token count and an overclaim.
  - For the clean-history replacement:
    - corrected the pre-Phase-1 wording (the runtime export is published, never the canonical file);
    - recorded the local replacement branch under D9;
    - specified the `SOURCE.json` `system` and `tokensVersion` values, which the vendor test now asserts.
  - D11(a) remains open, and the chamfer ambiguity and all other open decisions are unchanged.

- **r5 (2026-10-11, final publication sanitization).**
  - Removed the named future animation project, keeping the out-of-scope rule for unrelated creative projects.
  - Replaced every specification-defined numeric limit with a named budget and its canonical section, in Global Constraints, Phases 2–4 and Phase 6: area and void budgets, glow/flare/effect counts, lit-cell density, node size limit, chamfer limits and mark minimum size. The heartbeat allowance now cites README §02 Principle 6, and the press timing is expressed through the `dur-instant` token. No requirement was dropped. The structure share, previously omitted from Global Constraints, is now listed.
  - Replaced a Phase 3 chamfer count with citations to the specification's corner limits. The README summary is stricter than §09/§17, so the stricter limit applies until the owner rules; this is recorded as an open ambiguity.
  - Added D11 for any future publication of private thresholds in public code, and for confirming D2b's coverage of `tokens.json` usage notes.

- **r4 (2026-10-11, publication sanitization).** Prepared for public publication.
  - Replaced every verbatim specification excerpt with section references and original wording. Every requirement value is preserved: budgets, geometry, focus, motion, fonts, mark rules, contrast and validation obligations.
  - Removed the owner's private editing-copy URL and version from the plan and from the `SOURCE.json` schema. Provenance now rests on the canonical repository, tag, commit, archive checksums and file hashes, and the schema gains an `r1` archive checksum.
  - Removed local account, SSH-alias, machine-path and workspace details while keeping the identity-pinning safeguards.
  - Recorded Tasks P2 and 0 as completed.
  - Restated the D9 publication gates for a clean-history branch.

- **r3 (2026-10-11, Task P1).**
  - Recorded the approvals of D2 (private `kareemsasa/darkfield`), D2b, and the Phase 0 scope of D9, plus what remains unapproved.
  - Added the Task P0 findings:
    - no pre-existing Darkfield repository;
    - an explicit identity-pinning requirement for every GitHub write;
    - R1 package versus export byte differences.
  - Rewrote Task P2 for the approved destination:
    - explicit owner-identity pinning;
    - `r1/` layout including `r1/SPEC.md`, which r2 omitted although the plan cites it;
    - per-file verification of export files and R1 files, manifest validation, and an exact tree-set check, replacing the impossible whole-tree `diff -r`;
    - a private-visibility check and remote re-verification.
  - Filled the Task 0 source note.
  - Recorded the CI Node 20 versus ≥ 22.18 constraint. CI is unchanged.
- **r1 (2026-10-11).** Initial master plan; Phase 1 fully specified.
- **r2 (2026-10-11).**
  - Recorded the owner's established decisions; D1 approved.
  - Added [Specification authority](#specification-authority) with verified facts, the canonical-source contract, D2 rewritten, and D2b.
  - Added Phase 0, sequenced so the plan is committed (Task P1) before `AGENTS.md` references it (Task 0).
  - Added the [Scope boundary](#scope-boundary-governed-interface-vs-creative-work) with a verified surface inventory, and rewrote D6 and Phase 5 around governed interface versus creative content.
  - Re-reviewed the bridge against actual consumers. `--accent-color` and `--app-shadow` are now held. Two fill/text pairs and the control boundaries are fixed in Task 3. Native-visual holds and font holds are added. Phase 1 coverage versus conformance is stated explicitly.
  - Replaced the selector-removal fallback with a baseline-aware ledger (D10), enumerated pair checks with UNCOVERED reporting, and a check-kind table.
  - Added the [Operational safety](#operational-safety) contract: identity-verified preview stop, `$DF_TMP` workspace, exact-path staging, a reviewer protocol and stop conditions. Removed r1's `git add -u` and `pkill` patterns.
  - Defined [Phase 6](#phase-6-conformance-measurement) measurements on the governed interface, with region exclusion.
  - Added D9 (execution authorization) and D10 (ledger acceptance).
  - Narrowed D3 to what remains after the rain decision.
