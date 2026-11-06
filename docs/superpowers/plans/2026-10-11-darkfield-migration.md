# Darkfield Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (provisionally chosen) to implement this plan task-by-task, with an independent reviewer between tasks (see [Operational safety](#operational-safety)). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Govern the personal website's own interface with the Darkfield design system. Every visual value comes from Darkfield's `tokens.json`, and R1 Constant Seam is the identity mark. Independently authored creative work keeps its own identity.

**Architecture:** This is a master plan; Phase 0 (provenance) and Phase 1 (foundation) are fully specified.
- An allowlist exporter, run only where the private canonical repository is available, projects the canonical `tokens.json` into a public runtime file, `tokens.runtime.json`, that holds only token names and values. A Node compiler turns that file into `tokens.css`. Public builds need no private access.
- A hand-written `bridge.css` re-points the site's legacy CSS variables at Darkfield roles. Where re-pointing would mislead or would reach creative content, the variable keeps its legacy value, and the place is recorded.
- Theme switching shrinks to setting `data-theme`.

Phases 2–6 replace the bridge with real Darkfield grammar, surface by surface. Each gets its own sub-plan after Phase 1 merges and its gates are answered.

**Tech Stack:** React 18, Vite 8, TypeScript, plain CSS. Tests use `node:test` (`web/scripts/*.test.mjs`) and the standalone Playwright browser-test convention (`web/scripts/*-browser-test.mjs`, Playwright passed in by path). No new npm dependencies.

**Revision:** r10, 2026-10-14 (Task 3 per-run measurement correction and contrast repairs). r9 (2026-10-13) added the Task 3 native-colour compatibility hold, browser-clock correction and inactive-control classification; r8 (2026-10-13) made the Task 3 measurement and contrast corrections; r1–r7 were written on 2026-10-11. See the [Revision log](#revision-log).

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

**Delegated rulings recorded 2026-11-05 (owner standing authorization of 2026-10-15; not owner approvals).** Under the owner's standing authorization of 2026-10-15 (complete the migration locally, rule bounded design decisions, commit locally; no push, pull request, merge, publication or deployment), the migration controller ruled D3, D4 (option (b) as an interim from Phase 1 Task 5, `4c273a3` (pre-rebase hash, see *Delegated-ruling records*); option (a) at Phase 6 Task 11, `d607cce`), D5, D6, D7, D8 and the chamfer reading. Each is listed with its basis and the commit that applied it under *Decision gates*, *Delegated-ruling records*. These are delegated rulings, not owner approvals, and each stays open to the owner's review. D11(a) remains open. All migration commits are local on `feat/darkfield-foundation` (no upstream configured; no remote-tracking ref contains them); nothing is pushed.

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

   **Phase 4 deviation (2026-10-21; pending the owner's confirmation, required before any push).** Registered R1 files are published as well: the Favicon group (Phase 4 Task 1, `502f631`, recording the six files already shipped; Task 3, `73c1d51`, adding the three app icons) and the `currentColor` symbol (Task 2, `ddbebf1`). Each is recorded in `SOURCE.json`: the C2PA-stripped files with the `c2pa-strip` transform, and `favicon.ico`, which carries no C2PA data, as a plain copy. Canonical verification checks all of them against the pinned canonical bytes. Basis and cost if not confirmed: the Phase 4 plan, P4-1. Update 2026-11-05: confirmed (owner, direct); see *Release records* after the appendix.
4. **The canonical `tokens.json` stays the sole authority for token values.**
   - `tokens.runtime.json` is a deterministic export of it.
   - `tokens.css` is generated from the runtime file and checked for sync.
   - **Public verification** checks the published files against `SOURCE.json`, the approved schema and value grammar, and the absence of private fields.
   - **Canonical verification**, run only in an authorized environment, re-exports from the pinned canonical file and requires identical bytes and identical compiled CSS. It first proves the checkout's local git identity (the annotated tag resolves to the commit pinned in `SOURCE.json`, which is also `HEAD`) and reads every canonical file from that commit's blobs. The remote side is the authenticated canonical identity check, defined under [Runtime token propagation](#runtime-token-propagation) and run in the same session.
   - A public checkout alone cannot establish derivation.
5. **Agents read the spec from the canonical repository at the pinned tag** before each task, never from memory or a local archive. `AGENTS.md` says where. The repository is private, so reading it needs the owner account's access. A clean checkout or CI without that access can still build the website and run its public tests, because the runtime assets are published. It cannot re-verify provenance, which is a local, credentialed step.
6. **Changes go one way.** A later Darkfield edit is exported, committed and tagged canonically. The website then re-exports and re-publishes in its own commit, following [Runtime token propagation](#runtime-token-propagation). The website never edits published Darkfield files by hand.

### Runtime token propagation

**When to run it:** a new canonical Darkfield tag is created, or the canonical schema changes. The steps below are the only way a canonical token change reaches this repository. Each run is its own reviewed commit.

1. **Authorize.** The owner approves the new tag, and the canonical commit it points to, for the website under D9.
2. **Pin.** In an authorized environment, run the canonical identity check (below) with `<tag>` the new tag and `<commit>` the canonical commit approved with it in step 1. It clones `kareemsasa/darkfield` at that tag with credentials explicitly bound to `kareemsasa`, and fails unless the tag resolves to that commit. Record the commit SHA for `SOURCE.json`.
3. **Export.** Run `cd web && node scripts/darkfield-export.mjs <canonical-dir>`.
   - A canonical field the exporter has not classified makes it fail. So does an object key outside the key grammar (Task 1).
   - Classifying a new field as RUNTIME, which publishes it, is a code change to the exporter's allowlist. It needs the owner's D2b/D11 confirmation for that field.
   - Classifying it as PRIVATE needs no publication decision.
4. **Regenerate.** Run `cd web && node scripts/darkfield-tokens.mjs`. Update `SOURCE.json`: the new tag, commit, `tokensVersion`, archive checksums (if a new export archive exists), canonical `tokens.json` hash, runtime file hash, and font and licence hashes. In the same commit, update the pinned literals in `darkfield-vendor.test.mjs` (tag, commit, `tokensVersion`, archive checksums and canonical `tokens.json` hash) so that the public test pins the new revision.
5. **Verify.**
   - Public tests: `darkfield-vendor`, `darkfield-runtime`, `darkfield-export`, `darkfield-source` and `darkfield-tokens`. If a value-grammar regex rejects a legitimate new value, widen it deliberately in the same commit, with the reviewer's agreement; never loosen it to accept free text.
   - Canonical verification: the canonical identity check, then `darkfield-source.mjs --verify`, in the same session.
   - Review the value diff of `tokens.runtime.json` against the previous commit.
6. **Disclosure check.** The independent reviewer runs the canonical disclosure scan defined below over the full diff: the runtime file, CSS, manifest, tests, commit message and PR text. Any unapproved match is a **stop**.
7. **Commit** with exact-path staging. The canonical `tokens.json` and any canonical prose must never be staged.

**Canonical identity check (defined once; run in the same session as every canonical verification).** It ties the local checkout to the private repository. `<tag>` and `<commit>` are the pinned tag and commit: those in `SOURCE.json`, or, for a new pin, the tag and commit approved in step 1 above.

```bash
cat >"$DF_TMP/identity-check.sh" <<'EOF'
# identity-check.sh <tag> <commit>: the canonical identity check, run as its own bash process.
set -eu
tag=$1 commit=$2
# Read the stored kareemsasa credential, not an inherited token. Assign before exporting, so a failed
# lookup stops here instead of hiding behind export's own status.
unset GH_TOKEN GITHUB_TOKEN
GH_TOKEN=$(gh auth token --user kareemsasa)
test -n "$GH_TOKEN"
export GH_TOKEN
login=$(gh api user --jq .login); test "$login" = kareemsasa
visibility=$(gh api repos/kareemsasa/darkfield --jq .visibility); test "$visibility" = private
# Task P2 Step 5's clone, made concrete: a fresh clone at the tag, through the same verified identity.
# The token reaches git only through a credential helper, never the URL or the clone's configuration.
test ! -e "$DF_TMP/darkfield"
git -c advice.detachedHead=false -c credential.helper= \
  -c 'credential.helper=!f(){ echo username=x-access-token; echo "password=$GH_TOKEN"; }; f' \
  clone -q --branch "$tag" https://github.com/kareemsasa/darkfield.git "$DF_TMP/darkfield"
# The remote tag object is the local one, and it peels to the pinned commit.
remote_tag=$(gh api "repos/kareemsasa/darkfield/git/ref/tags/$tag" --jq .object.sha)
local_tag=$(git -C "$DF_TMP/darkfield" rev-parse "refs/tags/$tag")
test "$remote_tag" = "$local_tag"
remote_commit=$(gh api "repos/kareemsasa/darkfield/commits/$tag" --jq .sha); test "$remote_commit" = "$commit"
echo "canonical identity OK"
EOF
DF_TMP="$DF_TMP" bash "$DF_TMP/identity-check.sh" <tag> <commit>
```

How it fails:
- The check runs as its own `bash` process, so `set -eu` holds whatever the calling shell does. A shell that runs commands inside an `&&` or `||` list, or under `if`, switches errexit off for everything it runs itself, subshells included. Never source the script or paste its body into the calling shell.
- Its exit status is the result. It is 0 only after the final line prints `canonical identity OK`. Any non-zero exit is a **stop**.
- Each lookup, the token included, is assigned before it is compared or exported. A failed lookup therefore ends the process instead of comparing empty strings.
- `GH_TOKEN` exists only inside that process and is never printed, so no cleanup step can mask a failure.
- Chain anything that depends on the check with `&&`, for example `… identity-check.sh <tag> <commit> && (cd web && node scripts/darkfield-source.mjs --verify "$DF_TMP/darkfield")`. Never let an unchained command follow it in the same invocation: that command's exit status would replace the check's.
- For a shallow clone, add `--depth 1` to the clone line; the verifier accepts both.

Expected git output: the clone prints one warning, that `refs/tags/<tag>` is not a commit. The tag is annotated, and git checks out the commit it points to. `advice.detachedHead=false` turns off only the informational detached-HEAD advice. Neither changes the exit status, and git still reports real errors.

`darkfield-source.mjs --verify "$DF_TMP/darkfield"` then proves the local identity itself: the directory is the root of a git checkout, `<tag>` is an annotated tag resolving to `<commit>`, and `HEAD` is `<commit>`. It reads every canonical file from that commit's blobs, never from the working tree, with replace refs disabled (`git --no-replace-objects`), and ignores `GIT_*` environment overrides. A local `origin` URL is not evidence of repository identity.

**Trust boundary.** The verifier trusts the object store of the fresh clone made by this check in the same session. Git does not re-hash objects when it reads them, so an object file altered on disk after the clone would go undetected; `--no-replace-objects` stops only replace refs. Verify from that fresh clone, immediately after the check, and never from a reused or shared checkout.

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
| Runtime file | The allowlist projection plus fail-on-unclassified fields and fail-on-invalid keys in the exporter. The public exact-key and value-grammar tests (`darkfield-runtime.test.mjs`) structurally constrain names and values to fixed formats. They cannot rule out every short phrase hidden in a name or a font stack, so canonical verification and the canonical disclosure scan remain required. |
| Generated CSS | The compiler writes only two fixed header comments, which `darkfield-runtime.test.mjs` asserts. Token values are the only other content. |
| `SOURCE.json` | Identifiers and hashes only; `darkfield-vendor.test.mjs` asserts each entry's exact keys. |
| Test fixtures and plan examples | Only approved token values, hashes and site data; no usage notes or specification limits (D11(a) remains open). |
| Logs | The exporter prints only a hash. Its refusals name only known schema paths, show any other key by its length, and never quote canonical input (JSON parse errors included). The verifier prints only file paths, mismatches and the public pins. Canonical verification never runs in public CI. |
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
| `/simulations` | Cards, launch buttons, layout | Card previews that depict native game visuals (`.food-preview`, `.spider-preview-card-face` in `SimulationCard.css`; the Orbital and Traffic SVGs in `SimulationCard.tsx`). r9: Task 3 holds the previews' ink at its baseline colours, a provisional compatibility hold, not a D6 decision. r10: Task 3 marks the six preview roots with `data-df-region="native"`, a measurement boundary, not a D6 decision | — | DOM | **confirm** |
| `/simulations/orbital-simulator` | DOM controls, panels, readouts (`OrbitalSimulator.css`) | Canvas render (`OrbitalSimulator/renderer.ts`) | — | `<canvas>` | — |
| `/simulations/traffic-simulator` | DOM controls, panels (`TrafficSimulator.css`) | Canvas renders (`RoadCanvas.tsx`, `SpaceTimeCanvas.tsx`, `renderer.ts`) | — | `<canvas>` | — |
| `/simulations/snake` | Page chrome, buttons | Board, snake, food (`.food` reads `--accent-color`) | — | DOM/CSS | **confirm**: is the score HUD and game-over overlay (`.game-scores`, `.game-over-content`) chrome or native? |
| `/simulations/spider` | Page chrome, buttons, status | Cards, columns, playfield (`.spider-column:empty` reads `--app-border`) | — | DOM/CSS | **confirm**: container font and text colour (`.spider-solitaire`) |
| `/simulations/rhythm-lab` | Menus, song selector, settings, tutorial, results | Gameplay lanes, notes, judgement visuals | — | DOM/CSS. One stylesheet (`RhythmLab.css`, 2123 lines) mixes both | **confirm**: root `.rhythm-lab` font and colour |
| `/simulations/annals` | Page chrome, navigation | The world presentation: serif parchment panels (`Annals.css:6,14-20,159`). r8: Task 3 marks only its authored narrative, 6 elements, with `data-df-region="native"`. Headings, hints, legends, readouts, logs, the banner, the footer and every control stay governed | — | DOM (`pages/Annals/sim/*`) | **confirm**: which Annals controls are site chrome |
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

Mixed files (governed and native visuals in one file): `SnakeGame.css`, `SpiderSolitaire.css`, `RhythmLab.css`, `SimulationCard.css`, `Annals.css`, and `SimulationCard.tsx` (its preview SVGs; r9). A task may change a creative-owned path or a native-visual selector in a mixed file only where the task names it explicitly. Reviewers reject anything else.

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
- **Text contrast** (README *Using the system*). Opacity is never used to lower text contrast; text uses the `fg`, `fg-muted` and `fg-faint` tokens. One owner-authorized exception (r8): Task 3 Step 7 item 4 lets the media bar's text take a ground or `on-*` token. This plan limits that exception to Light, because no such token passes in Dark, where the existing colours already pass. Every text/ground pair introduced by this migration must be a pair from §05 *Contrast, verified*, or be measured ≥ 4.5:1 in every shipped theme.
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
| **D10** | Accept the known-deficiency ledger | Created in Task 3 from a baseline run. Accepting it means those pre-existing failures (`entries`) are tracked, not fixed, in Phase 1. The ledger's `creative` (D6 evidence) and `unmeasured` (open verification, each with its reason) lists are not accepted by D10 (r8). Nor is `inactive` (r9): disabled controls, which WCAG 1.4.3 exempts, recorded as observations rather than required contrast failures. The same controls are measured normally once enabled. | **Accepted 2026-10-15 (owner), for Phase 1 deferral:** all 136 `entries` in `web/scripts/darkfield-known-deficiencies.json` (recorded against `BASE` `3c533b6` with the Task 3 Step 3 markers; every entry reproduced by the independent review, which passed) are tracked, not fixed, in Phase 1, and keep their follow-up obligations. The 80 Annals roster "·" runs stay classified as deficiencies, pending D6. **Not accepted, still open:** the 38 `unmeasured` runs, the 12 `inactive` observations, the 20 `creative` observations, and every documented finding outside the ledger (its `notes` and the Task 3 Step 11 report), the Dark `/writing` eyebrow among them. **One-time exception to Task 3 Step 9's repair-isolation stop**, for one CHROME line only: Light `/projects` `button.stat-card::before`, `left`, `right` and `inset`, seen in 1 of 4 full runs; `Projects.css` is not a Step 7 item 6 file and was identical in both builds; 3 further full runs and 3 scoped reruns printed no CHROME line. Transition timing (`.stat-card::before` animates `left`, and the script clicks that card) is plausible but unproven. The exception covers no other line, property or route, and no run after a change to that CSS. **Acknowledged, provisional boundaries kept:** the KS mark's neutral letters in Light and the ProjectMedia exception in Light only (Step 7 item 4); the lost Launch hover sweep (item 6); the six preview markers, a measurement boundary and not a D6 decision (Step 3 item 2); the item 5 hold, provisional and not a D6 decision, with the residual page variables still global. **Note, 2026-10-21 (a record of a later change, not a change to this acceptance):** Phase 4 Task 2 (`ddbebf1`) replaced the KS monogram with the registered R1 symbol, so the acknowledged boundary for the KS mark's neutral letters in Light no longer applies. **Note, 2026-11-05 (a record of later changes, not a change to this acceptance):** Phases 2, 3 and 5 retired all 136 entries (Phase 2 Task 1 retired 8, Phase 3 retired 40, Phase 5 retired the remaining 88); the ledger holds 0 entries at `35b70da` (Phase 5 exit) and still at `370f41d`. The acceptance record above is unchanged. | — |
| **D11** | Publication of private design thresholds | **(a)** An automated check that asserts a specification-defined limit (for example area and void budgets, glow/flare/effect counts, lit-cell density, node size and chamfer limits, mark minimum size, heartbeat allowance, display-line count, motion cadence ratios, or any other specification-defined limit) would place that limit in this public repository. **(b)** Whether the canonical `tokens.json` usage notes may be published. | **(a) Open.** Owner decision; nothing is pre-authorized. Without it, such checks stay reviewer-judged or read their limits from the private repository at run time. **(b) Decided 2026-10-11:** usage notes stay private. Only runtime token values, through the allowlist export `tokens.runtime.json`, plus the OFL fonts and licences, are published. See Task 1. | (a) Phase 6 automated budget checks and any test asserting such a limit |

**Delegated-ruling records (appended 2026-11-05, r11).** Rulings by the migration controller under the owner's standing authorization of 2026-10-15; none is an owner approval. Source: the migration's progress ledger. A hash marked *pre-rebase* was recorded before this branch was rebased onto `origin/main` (`b4283dc`) on 2026-10-19: it is reachable from the local backup ref `backup/darkfield-foundation-before-main-reconcile-20261019`, not from the branch head, whose rebased commits carry the same patches (the ledger records all 48 rebased patches matching by range-diff).
- **D3**, 2026-10-15: no rain or other animated background on any route; the site ground is the static `field` with the L0 grid; rain and matrix components left dead are deleted. Basis: the owner's rain direction; §10 *Global limits* and *Atmosphere by context*; §16. Applied by Phase 2 Task 1, `f60ee68` (pre-rebase). The Rhythm Lab rain is held under P2-3 (*Recorded deviations*).
- **D4 (b) interim**, 2026-10-15: Mono supported in code and tests, not offered in Settings, because the Phase 1 Task 5 Mono record found contrast failures that D10 does not cover and that may not be ledgered; Mono was tracked as a work list no later task could grow. Basis: the gate's option (b) is acceptable. Applied by Phase 1 Task 5, `4c273a3` (pre-rebase).
- **D4 (a)**, 2026-11-05: Mono offered in Settings once an unsharded Mono record at `933f932` held no entries; Mono scope records joined the ledger with a note, never Mono entries. Basis: the gate's recommendation (a). Applied by Phase 6 Task 11, `d607cce`, with rulings P6-T11a (the foundation test's Settings guard widened to Mono, non-weakening, confirmed by review) and P6-T11b (the Phase 5 loops keep their theme set unchanged), both `d607cce`. Owner item: Mono offered in Settings.
- **D5**, 2026-10-15: the registered R1 symbol, uncontained, beside the "Kareem Sasa" wordmark; the KS monogram retired. Basis: this plan's Goal; §18; the shipped R1 favicon (`92fc157`). Applied by Phase 4 Task 2, `ddbebf1`.
- **D6**, 2026-10-15: the surface inventory's confirm rows. Governed: Snake's scores and game-over overlay; the Spider container's font and text colour; the Rhythm Lab root's font and colour; every Annals control, heading, hint, legend, readout, log, banner and footer. Native: boards, cards and columns, lanes, notes and judgement visuals, the Annals parchment world panels and its six authored-narrative markers, and the `/simulations` previews. Basis: *Scope boundary*. Applied across Phase 5, `09cd750..35b70da`.
- **D7**, 2026-10-15: lifecycle statuses become context labels (narrow uppercase label in `fg-muted`, no hue), with `•` only on Live. Basis: the gate's recommendation. Applied by Phase 3 Task 5, `01e4e19` (pre-rebase). Owner note: Live's `•` renders in `fg-muted`.
- **D8**, 2026-10-15: no filled primary button; idle controls bounded by `edge`; prominence from position; Pressed is the §13 inverse. Basis: the gate's recommendation. Applied by Phase 3 Tasks 9–13: `cfea7d9`, `1044293`, `278a99b`, `4565d19`, `d1aa6d6` (all pre-rebase).
- **Chamfer reading**, 2026-10-15: where README *Using the system* and §09/§17 differ on chamfers, the stricter README per-container limit applies. Basis: this plan's standing default (*Phase 3*, *Geometry*). Applied by Phase 3 Task 10, `1044293` (pre-rebase), whose one chamfer at that commit was the Projects tech-stack dialog's (P3-2); the same `df-cut-md` class has since been used on other overlays: the shared modal (`2a23016`), the media inspector (`9285e82`), the Snake game-over and paused panels (`4247156`) and the Rhythm Lab dialogs (`a7e629e`) (P6-T13c). Phase 6 Step M's chamfer-count verdict passed (local, reviewer-judged).
- **D11(a)**: open; nothing ruled. Phase 6's per-row disposition is recorded under *Phase 6: Conformance measurement*.

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
  - runs the canonical identity check and canonical verification itself, in the same session, in an authorized environment;
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
| `darkfield-vendor.test.mjs` | **Invariant** (static, public) | `SOURCE.json` pins the canonical revision, the archives and the canonical `tokens.json` hash. Published files equal their manifest hashes. Only fonts and licences are copied files; the runtime file is declared as an allowlist export. Since Phase 4 (`502f631`, `ddbebf1`, `73c1d51`; a deviation pending the owner's confirmation, see *Required arrangement* item 3), registered R1 files are recorded too: C2PA-stripped copies under the `c2pa-strip` transform, and `favicon.ico` as a plain copy (confirmed by the owner 2026-11-05; see *Release records*) | That the runtime file truly derives from the canonical file (canonical verification only) |
| `darkfield-runtime.test.mjs` | **Invariant** (static, public) | `tokens.runtime.json` has exactly the approved keys, per-group value grammar and no private fields. `tokens.css` carries only its two fixed header comments | Value correctness against the canonical file (canonical verification only) |
| `darkfield-export.test.mjs` | **Invariant** (static, public; r7) | The exporter is a deterministic projection: a synthetic canonical-shaped input reproduces the committed runtime bytes. Keys outside the key grammar and unclassified fields are refused, and refusals repeat neither unknown keys nor injected text | That the committed runtime file derives from the private canonical file |
| `darkfield-source.test.mjs` | **Invariant** (public, synthetic git repositories; r7) | Canonical verification refuses a plain directory, a directory inside another checkout, a missing or lightweight tag, a tag resolving to another commit, a moved `HEAD` and a malformed pin. It accepts detached and shallow clones at the tag, and reads canonical bytes from the pinned commit rather than the working tree or a replace ref | The identity of the real canonical repository |
| `darkfield-source.mjs --verify` | **Canonical verification** (authorized environment only) | Local git identity: the annotated tag resolves to the commit pinned in `SOURCE.json`, which is also `HEAD`. Fonts and licences, read from that commit's blobs, are byte-identical. The runtime file is a byte-identical re-export of the pinned canonical `tokens.json`, whose hash matches. From Task 2 onward, compiling either input gives identical CSS | Remote repository identity (the canonical identity check, same session); the integrity of the clone's object store (see the trust boundary); anything about rendered output |
| `darkfield-tokens.test.mjs` | **Invariant** (static) | `tokens.css` is a faithful compile of `tokens.runtime.json` (values, escapes, themes, fonts, type classes) and is in sync | That the site uses the tokens correctly |
| `darkfield-bridge.test.mjs` | **Invariant** (static) | Single theme source; every legacy variable mapped or explicitly held; no literal colours outside the legacy fence; no text colour reads a ground alias; font families unified outside held selectors | Rendered contrast or semantic correctness |
| `darkfield-settings.test.mjs` | **Invariant** (unit) | Settings import accepts old exports and `mono`, and rejects unknown themes | — |
| Browser test, invariants section | **Invariant** (rendered) | Page ground is `field` per theme. No inline custom property on `<html>` except the three layout measurements, as px lengths, with negative controls (r8). Spider and Snake read their direct-load colours on every listed navigation path, and `<html>` defines no `--terminal-primary` there; the portaled Projects modal reads the page's scoped value (r9). Unknown stored theme falls back to dark; no-JS shell is on `field`; fonts served and loaded; focus ring on every element reached by Tab on the listed routes; outline present under forced colors | Focus on elements not reached in 25 Tabs; the painted colour under forced colors (human check); navigation paths not listed, and page variables other than `--terminal-primary` (r9) |
| Browser test, enumerated pairs | **Regression** (rendered, baseline-aware) | Contrast of every fill/text pair whose ground the bridge changes (inventory E-6), in every theme, including hover where listed. A pair whose selector is not rendered on the listed routes is reported **UNCOVERED**, never passed. | Pairs not in the inventory |
| Browser test, contrast sampler | **Sampler** (rendered, baseline-aware) | Text matched by the sampler selectors on the listed routes, against composited background *colours*. Where a background image or gradient lies under the text, against the rendered pixels behind each text run, in that run's own colour (r8); a painted-text pass also measures every other own-text element on a painted ground. Creative regions are counted and measured apart, and must match the baseline record (r8). Disabled controls are recorded as `inactive` observations, held to the baseline record and never counted as failures (r9) | Text over canvases, iframes, or content `<img>`/`<video>` elements. On a colour stack, descendant text in its own colour (only the matched element's colour is compared). Text under a backdrop filter, which is measured on its colour stack (the r8 exception for the KS mark ended when Phase 4 Task 2, `ddbebf1`, removed the KS text). Text covered by another element or on a moving ground (listed as `unmeasured`, with the reason). States not rendered (hover, open menus). Text outside the sampler selectors. Routes not listed. It is not a WCAG audit. |
| Browser test, text, interaction and backdrop passes (r10) | **Regression** (rendered, baseline-aware, per run) | Every visible element's own text outside creative regions, measured once, nested text included (`text`, `painted`). Every enabled control with text, outside creative regions, hovered, focused and pressed, each text run a result of its own (`interact`). Every header control with text over the header's worst ground (black in Light, white in Dark and Mono), at rest and in each state, on `/projects` (`backdrop`). Runs and elements are paired by stable keys; a repeated id fails | Text a route renders only after further interaction; a run that only an ancestor clips (no control); text that visibly overflows its parent (measured only inside it); content positioned outside a clipping ancestor's box (may be clipped by it); viewports other than the one run (Step 9 compares four more) |
| Browser test, measurement controls (r10) | **Invariant** (check mode, fixture pages) | The passes still detect a failing nested label on a gradient and on a solid ground, and a state worse than its rest state. They measure a nested label exactly and each text once, never read a border, outline or screen-reader-only text as ground, and class a disabled control `inactive`. A worsened run beside a failing run is still reported (masking), and repeated elements pair with themselves (pairing). The header backdrop is in force | Defects outside the fixtures' cases |
| Run-by-run comparison (r10; scratch script, Task 3 Step 9) | **Regression** (record mode, baseline versus candidate, every run) | No run fails on the candidate only, or more than 0.05 worse than on the baseline, at 1440×900, 1280×800, 1920×1080, 768×1024 or 375×812, or after client-side arrival from `/projects` or `/simulations`. Every run pairs, with the same capture size and scroll position, and the measured scope matches. Every governed run neither build could measure is listed, and so, after an arrival, is every run the direct load records and neither build does; only the expected ones may appear | Viewports, scroll positions and arrivals not run; states the test does not create; runs listed as unmeasured on both builds |
| Repair isolation (r10; scratch script, Task 3 Step 9, run once) | **Regression** (computed styles, before versus after Step 7 item 6) | On direct load of every listed route, with the Projects modal open, only the repaired selectors' rendered properties change | Hover and pressed states (the interaction pass measures them); rendering after client-side navigation |
| Browser test, prepared states (r8) | **Regression** (rendered, baseline-aware) | Against the rendered ground: the Annals verbs enabled, hovered and pressed, and the aside headings once the verbs are enabled; the Rhythm Lab lane tap zones playing, lane key held and pointer-pressed, under a page clock frozen before navigation and advanced only in fixed steps (r9). The paused state is recorded as covered, not measured | Other prepared states, including the Annals conditional controls and text; Rhythm Lab zones under moving notes |
| Whole-text comparison (r8; scratch script, Task 3 Step 9) | **Regression** (rendered, colour stack, baseline versus candidate) | Every visible element's own text outside creative regions on the listed routes: no text is both below 4.5:1 and more than 0.05 worse than on the baseline | Text on painted grounds or with unparsed colours; elements that cannot be paired between builds |
| Native comparison (r9; scratch script, Task 3 Step 9) | **Regression** (rendered pixels and computed colours, baseline versus candidate) | Each `/simulations` card preview, reached directly and from `/projects`, is pixel-identical to the baseline on a fixed neutral ground, in both themes. Spider and Snake read the baseline's direct-load colours | Preview motion (captured frozen); the preview frames, which are governed chrome |
| Hold isolation (r9; scratch script, Task 3 Step 9, run once) | **Regression** (computed styles, before versus after Step 7 item 5) | On direct load of the routes the hold can reach, with the Projects modal open, no element's rendered properties change outside the preview content | Rendering after client-side navigation, where the hold deliberately changes Light Spider and Snake to their direct-load colours (the navigation invariants cover it); routes not listed; states not rendered |
| Existing browser tests (`boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata`, `procedural-animations`, `orbital`) and `npm test` | **Regression** (baseline-aware) | Existing behaviour holds | — |
| Visual review screenshots (`scripts/visual-review.mjs`) | **Human** | Composition, readability of the transitional mixed palette, boundaries that disappeared, creative regions visibly unchanged | Anything not looked at |
| `darkfield-limits.mjs` (r11; Phase 6 Task 1, `058d1c6`) | **Local only** (authorized environment, private canonical clone) | Reads each named specification limit at run time from the pinned commit's blobs, through named extractors; prints limit names with `ok`, `missing` or `conflict`, never values; accepts an override file only from a path outside the repository. Its public test, `darkfield-limits.test.mjs`, keeps numeric literals other than 0 and 1 out of the module and holds its anchors to token names, cited headings or at most two words | Any limit value in this repository (none is committed; D11(a) open); correctness beyond the cited sections (reviewer-checked) |
| `darkfield-measure.mjs` (r11; Task 3, `b68acd5`), with `darkfield-measure-lib.mjs` and `darkfield-measure.test.mjs` (Task 2, `ac34a8a`; extended by Tasks 9 and 10) | **Sampler, local only**; the library and its unit tests are public and limit-free | Per route, theme and viewport: governed tier shares with lower and upper bounds, the largest field void, emission counts, zero-effects captures and authored all-caps runs, each judged PASS, FAIL, BORDERLINE or UNJUDGED (without the canonical clone). Excluded, creative and native shares are reported per view. Output is refused inside any git checkout | Human verdicts (Step M, kept under `$DF_TMP`); anything committed: its outputs may hold limit values and never enter this repository |
| `darkfield-conformance.test.mjs` (r11; Task 4, `6582c5f`) | **Invariant** (static, public) | Every governed `@keyframes` and Framer Motion transition carries a §12 class annotation and a reported state, read from real comment ranges only | That each annotation is true (reviewer; R-1, `4dda750`, corrected three; Step M judged all true) |
| Browser test, all routes (r11; Task 5, `8a9f04e`) | **Invariant and regression** (rendered, baseline-aware) | The 11 article and 4 procedural-piece routes join `ROUTES` (35 routes), derived from the data files, so every route loop and contrast pass covers them; `DARKFIELD_ROUTE_SHARD` splits a run, with the union proven from the `RAN` lines | Aliases (`/work`, `/games/*`); `UNCOVERED` pairs in sharded runs (read only from unsharded runs) |
| Browser test, typography and geometry (r11; Task 6, `72bfc63`) | **Invariant** (rendered) | On every route: governed families are sans, narrow or mono; uppercase text is narrow; radii are `0px`, or `radius-node` on a text-free non-control. A `MEASURE_NATIVE` element is skipped for its own radius and family only (P6-5′, P6-T6a) | The node size limit (local); the size of a text-free round box (Step M verdict) |
| Browser test, focus and forced colours (r11; Task 7, `b424fd1`; R-3, `600272b`) | **Invariant** (rendered) | On every route one full Tab cycle reaches every visible tabbable element, each showing the focus ring; under forced colours an outline is present; `TAB_CONSUMERS` names the terminal input (DEV-6), which is cycled with Shift+Tab. Since R-3: under forced colours every visible range input paints, and every Selected control and latched-on control differs from its off state | Overlays and dialogs (not cycled, P6-T7e); a headed browser's Tab exit from the piece frames (owner check, P6-T7b); Firefox; the dark forced palette (screenshot only) |
| Browser test, emission (r11; Task 8, `3f3aa59`) | **Invariant** (rendered) | Every governed `box-shadow`, `text-shadow` and `drop-shadow()` filter is `none` or one resolved glow token of the nearest theme scope; a Light scope renders none. The focused element skips only its own `box-shadow` (P6-T8a–c) | Glow counts per view (local); whether a glowing element is live (reviewer) |
| Browser test, motion (r11; Task 9, `6e61c28`) | **Invariant** (rendered, first theme) | After a settle, running governed animations are within `IDLE_ALLOWED` (the terminal cursor, and only when its input has focus) and changed governed pixels lie only inside `LIVE_READOUTS` value boxes; under reduced motion no governed animation runs. `MOTION-SKIPPED` and `MASKED` lines report what the exclusions hide | Readouts below the fold (P6-T9e); governed text under exclusion masks (listed, P6-T9d, P6-T9g); the heartbeat allowance (local) |
| Browser test, Mono hue (r11; Task 10, `dc7153f`; R-6, `e10e34a`; inside the theme loop since Task 11, `d607cce`) | **Invariant** (rendered, DOM and pixels) | In Mono, a governed DOM colour or pixel above the hue threshold fails unless a `MONO_DEVIATIONS` entry names its element (exact selectors under the Annals sheet, matched on the attributed element; a P5-3 entry excuses only Light-set colours or its named `untokened` property, the P5-2 entry only its background); a stale or over-broad entry fails | States not rendered at load (P5-3 and P5-2 residuals, listed); paint routes the DOM layer does not read (pixel layer only); reading order (reviewer) |

**Baseline-aware ledger.** `web/scripts/darkfield-known-deficiencies.json` records failures that exist at the baseline commit.
- **How it is created.** Task 3 runs the regression and sampler checks against the baseline preview in `DARKFIELD_MODE=record`. Every candidate is reproduced by the reviewer, and the owner accepts the list (D10).
- **Comparable scope (r8).**
  - The baseline preview carries the same creative-region markers as the candidate (Task 3 Step 3).
  - The ledger records the region counts (`regions`), the text no method here can measure, each with its reason (`unmeasured`), the creative-region contrast (`creative`) and, from r9, the contrast of disabled controls (`inactive`).
  - Check mode requires all four to match. So no failure can disappear through a changed exclusion, and neither creative content nor an inactive control can change unnoticed.
  - `creative` is D6 evidence and `inactive` an observation; neither is part of D10.
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
| `SimulationCard.css`, `SimulationCard.tsx` | `.simulation-preview > *` (the preview content, not its frame); the Orbital and Traffic preview SVGs | `--terminal-primary`; the SVGs' inline `color` | Held at the baseline preview colours in Task 3 Step 7 item 5 (r9) |

`SpiderSolitaire.css:12` and `RhythmLab.css:12` set the container text colour through `--text-color`. Container text is governed by default, so it follows `fg`. D6 may reclassify.

**File map:**

| File | Responsibility |
|---|---|
| `web/src/styles/darkfield/SOURCE.json` | Create. Provenance manifest (D2): canonical pins and hashes only |
| `web/scripts/darkfield-export.mjs` | Create. Allowlist exporter, canonical `tokens.json` → `tokens.runtime.json`; run only in an authorized environment |
| `web/src/styles/darkfield/tokens.runtime.json` | Create, **exported** and committed. Runtime token names and values only (D2b, D11(b)) |
| `web/public/fonts/darkfield/*.woff2`, `…/licenses/*.txt` | Create. Copied fonts and OFL licences (D2b) |
| `web/scripts/darkfield-source.mjs` | Create. `--verify <canonical-dir>`: canonical verification of the checkout's git identity, `SOURCE.json`, the runtime re-export and compiler equivalence |
| `web/scripts/darkfield-tokens.mjs` | Create. Compiles `tokens.runtime.json` into `tokens.css`; `--check` |
| `web/src/styles/darkfield/tokens.css` | Create, **generated** and committed |
| `web/src/styles/darkfield/bridge.css` | Create. Legacy variable → Darkfield role mapping, plus the legacy fence |
| `web/scripts/darkfield-known-deficiencies.json` | Create. Baseline ledger (D10) |
| `web/src/index.tsx`, `web/src/index.css`, `web/src/contexts/ThemeContext.tsx`, `web/index.html` | Modify. Single theme source, focus ring |
| `web/src/pages/Home/Home.css` | Modify. Fill/text pairs |
| The control-boundary files in Task 3 Step 7 | Modify. `edge` boundaries |
| `web/src/components/SpiderSolitaire/SpiderSolitaire.css` | Modify. Pin `.spider-column:empty` (authorized native-visual hold) |
| `web/src/pages/Annals/Annals.tsx` | Modify (r8). 6 `data-df-region="native"` attributes on authored narrative only; nothing else |
| `web/src/components/ProjectRoster/ProjectRoster.css`, `web/src/components/ProjectMedia/ProjectMedia.css`, `web/src/pages/NotFound/NotFound.css`, `web/src/components/Navigation/SiteNavigation.css` | Modify (r8). Task 3 contrast repairs |
| `web/src/components/SimulationCard/SimulationCard.tsx` | Modify (r10). Six `data-df-region="native"` attributes on the preview roots; nothing else beyond r9's change |
| `web/src/components/SimulationCard/SimulationCard.css`, `web/src/components/Navigation/SiteNavigation.css`, `web/src/pages/OrbitalSimulator/OrbitalSimulator.css`, `web/src/pages/TrafficSimulator/TrafficSimulator.css` | Modify (r10). Task 3 contrast repairs (Step 7 item 6) |
| `web/src/pages/Home/sections/ContactStripSection.css`, `web/src/pages/Home/sections/FeaturedProjectsSection.css`, `web/src/components/CaseStudyPage/CaseStudyPage.css`, `web/src/pages/Writing/Writing.css`, `web/src/pages/ProceduralAnimations/ProceduralAnimations.css` | Modify (r10). Task 3 contrast repairs (Step 7 item 6), new to Task 3: the contact links, the card calls to action and, in `Writing.css`, the `/writing` eyebrow (owner ruling). Each holds the rule that sets its label's colour |
| `web/src/components/SimulationCard/SimulationCard.css`, `web/src/components/SimulationCard/SimulationCard.tsx`, `web/src/pages/Simulations/Simulations.css`, `web/src/pages/Projects/Projects.css` | Modify (r9). Task 3 native-colour compatibility hold: the preview hold, and `--terminal-primary` scoped to its pages |
| Files listed by Task 4's scan | Modify. Font families |
| Mono files (Task 5) | Modify |
| `TerminalDropdown.css`, `RhythmLab.css` focus blocks (Task 6) | Modify. Governed menu controls only |
| `web/scripts/darkfield-{vendor,runtime,export,source,tokens,bridge,settings}.test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs` | Create |

**Branch:** `feat/darkfield-foundation`, from `origin/main` after Phase 0 merges (D9).

### Task 1: Publish the runtime token export, fonts and licences with provenance (D2, D2b, D11(b) decided; needs Phase 1 D9 and a completed Task P2)

**Status (r7).** Task 1 was committed as specified at r6. Its independent review found two contract defects ([E-10](#evidence-summary)): forged canonical keys could bypass classification, and canonical verification did not prove the checkout's git identity. The r7 code below supersedes the r6 code; the correction lands as a separate commit (Step 7), and the r6 commit is not rewritten.

**Publication model (D2b as clarified by D11(b)).**
- The canonical `tokens.json` never enters this repository. It stays only in the private repository at the pinned tag.
- An allowlist exporter, run only in an authorized environment that holds the canonical checkout, projects it into `tokens.runtime.json`. That file contains exactly the token names and values the compiler consumes, and nothing else.
- Fonts and OFL licences are copied byte-for-byte, as before.

**Canonical schema the exporter relies on** (inspected at `tokens-v1-2026-10-09`):

| Kind | Fields |
|---|---|
| Runtime fields | `version` · `color.themes[].id` · `color.tokens[].{name, value.{dark,light,mono}}` · `shadow.tokens[].{name, value.{dark,light,mono}}` · `<group>.tokens[].{name, value}` for `spacing`, `radius`, `cut`, `stroke`, `dash`, `opacity`, `duration`, `easing`, `grid`, `layer` · `type.fonts[].{family, file, weight, style}` · `type.families.{sans, narrow, mono}` · `type.groups[].{family, styles[].{name, fontSize, lineHeight, fontWeight, letterSpacing?}}` |
| Private fields | Top-level `name` · every group `note` · every token `usage` · `color.themes[].name` · `type.groups[].{name, note}` · `type.groups[].styles[].{sample, usage}` |

The private fields hold the specification prose and quantitative usage notes that D11(b) keeps out of the public repository. Any other canonical field makes the export fail until it is classified. Every canonical object key must also match `^[A-Za-z][A-Za-z0-9_-]*$` (r7), checked before any path is built: paths join keys with `.` and mark arrays with `[]`, so a key containing `.`, `[` or `]`, or an empty key, could otherwise forge a classified path and be accepted or dropped instead of refused. The canonical keys at the pinned tag all match it. An empty object or array carries no value and is ignored; this cannot disclose anything, and from Task 2 onward the compiler-equivalence check in canonical verification catches any consumer impact.

**Why a same-shape projection.**
- `tokens.runtime.json` keeps the canonical nesting for the runtime fields (adding a `schema` marker). The Task 2 compiler and its tests therefore consume it unchanged apart from the input path and header text.
- Compiling the runtime file produces CSS identical to compiling the canonical file: verified in the 2026-10-11 dry run, and enforced by canonical verification.
- A flatter schema would be marginally smaller, but would require rewriting the compiler and its validated tests for no disclosure benefit. The private fields are dropped either way.

**Two kinds of verification:**
- **Public verification** (any clean checkout, no credentials): the runtime file has the exact approved schema and value grammar and contains no private fields; every published file matches `SOURCE.json`; `tokens.css` is in sync and carries only its fixed header comments. This cannot establish that the runtime file truly derives from the private canonical file.
- **Canonical verification** (authorized environment only, with `kareemsasa` read access to the canonical repository, never in CI): `darkfield-source.mjs --verify <canonical checkout at the pinned tag>` first proves the checkout's local git identity against `SOURCE.json`, then re-exports from the canonical `tokens.json`, read from the pinned commit's blobs, and requires byte-identical output, a matching canonical hash, and identical copied fonts and licences. The authenticated canonical identity check runs in the same session. Task 2 adds compiler equivalence.

**Files:**
- Create: `web/scripts/darkfield-export.mjs` (exporter; public code, contains no specification content)
- Create (exported): `web/src/styles/darkfield/tokens.runtime.json`
- Create: `web/src/styles/darkfield/SOURCE.json`
- Create: `web/public/fonts/darkfield/` (6 woff2 files) and `web/public/fonts/darkfield/licenses/` (3 OFL texts)
- Create: `web/scripts/darkfield-source.mjs` (canonical verifier)
- Test: `web/scripts/darkfield-vendor.test.mjs`, `web/scripts/darkfield-runtime.test.mjs`
- Test (r7, Step 7): `web/scripts/darkfield-export.test.mjs`, `web/scripts/darkfield-source.test.mjs`

**Interfaces:**
- Produces `tokens.runtime.json`, schema `darkfield-runtime/1`, with the runtime fields in the table above and a top-level `schema` field. It is consumed by Task 2 through `SOURCE_PATH`.
- Produces `SOURCE.json`, with shape `{ system, tokensVersion, canonical: { location, tag, commit }, export: { archive, sha256 }, r1: { archive, sha256 }, files }`.
  - The runtime entry: `files["src/styles/darkfield/tokens.runtime.json"] = { derivedFrom: "tokens.json", sourceSha256, exporter: "scripts/darkfield-export.mjs", schema: "darkfield-runtime/1", sha256 }`.
  - Every font and licence entry: `{ from: "<path in canonical repo>", sha256 }`.
  - `SOURCE.json` holds only identifiers and hashes, never canonical text.
- Exports `exportRuntime(canonical) → string` (deterministic: fixed key order, two-space indent, trailing newline), plus `parseCanonical(bytes)` (r7), `RUNTIME_PATH`, `RUNTIME_SCHEMA`, `THEMES`, `THEMED_GROUPS`, `UNTHEMED_GROUPS` and `FAMILIES`.
- `darkfield-source.mjs` exports `verifyCanonical(canonicalDir, source, web) → Promise<string[]>` (r7): the list of mismatches, empty when verification passes. Its `--verify` command prints them and sets the exit code.

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

- [ ] **Step 3: Write the exporter and the canonical verifier.** This is the r7 code. The r6 code lacked the key grammar, the safe refusals and the git identity checks.

  ```js
  // web/scripts/darkfield-export.mjs
  // Exports the public runtime subset of the private canonical Darkfield tokens.json (D2b, D11(b)).
  // Run only in an authorized environment that holds the canonical checkout:
  //   node scripts/darkfield-export.mjs <canonical-dir>   rewrite src/styles/darkfield/tokens.runtime.json
  // Allowlist projection: only the fields named below are emitted. Every canonical field must be
  // classified as RUNTIME or PRIVATE; an unclassified field fails the export instead of being dropped
  // or copied. A key outside KEY fails it too: it could otherwise forge another field's path.
  // The script never prints canonical text: only a hash, and refusals that name known fields only.
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

  // Every canonical object key must match KEY. Paths join keys with "." and mark arrays with "[]", so a
  // key containing ".", "[" or "]", or an empty key, could collide with a classified path.
  const KEY = /^[A-Za-z][A-Za-z0-9_-]*$/;

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

  // Refusals name only path segments the classification already knows; any other segment is shown by
  // its length, so a diagnostic never repeats unknown canonical text.
  const KNOWN = new Set([...PRIVATE, ...RUNTIME].flatMap((p) => p.split(".").map((s) => s.replace(/(\[\])+$/, ""))));
  const safePath = (path) =>
    path
      .split(".")
      .map((segment) => {
        const key = segment.replace(/(\[\])+$/, "");
        return KNOWN.has(key) ? segment : `<${key.length} chars>${segment.slice(key.length)}`;
      })
      .join(".");

  const leafPaths = (node, path = "", out = new Set()) => {
    if (Array.isArray(node)) node.forEach((item) => leafPaths(item, `${path}[]`, out));
    else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (!KEY.test(key)) throw new Error(`invalid canonical key (${key.length} chars) under ${path ? safePath(path) : "the root"}`);
        leafPaths(value, path ? `${path}.${key}` : key, out);
      }
    } else out.add(path);
    return out;
  };

  // JSON.parse errors can quote a fragment of their input; refuse without repeating it.
  export const parseCanonical = (bytes) => {
    try {
      return JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new Error("canonical tokens.json is not valid JSON");
    }
  };

  const text = (value, where) => {
    if (typeof value !== "string") throw new Error(`${where}: expected a string`);
    return value;
  };

  export const exportRuntime = (canonical) => {
    const unclassified = [...leafPaths(canonical)].filter((p) => !PRIVATE.has(p) && !RUNTIME.has(p));
    if (unclassified.length) throw new Error(`unclassified canonical fields (classify before exporting): ${unclassified.map(safePath).join(", ")}`);
    const ids = canonical.color.themes.map((theme) => theme.id);
    if (JSON.stringify(ids) !== JSON.stringify(THEMES)) throw new Error(`unexpected theme ids (expected ${THEMES.join(",")})`);
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
    const json = exportRuntime(parseCanonical(await readFile(resolve(dir, "tokens.json"))));
    await writeFile(RUNTIME_PATH, json);
    console.log(`wrote tokens.runtime.json · sha256 ${createHash("sha256").update(json).digest("hex")}`);
  }
  ```

  ```js
  // web/scripts/darkfield-source.mjs
  // Canonical verification: run only in an authorized environment holding a clone of the private
  // canonical repository, checked out at the pinned tag. A public checkout cannot run it and cannot by
  // itself prove that the runtime export derives from the canonical source.
  // node scripts/darkfield-source.mjs --verify <canonical-dir>
  // Local identity: <canonical-dir> must be the root of a git checkout whose annotated tag resolves to
  // the commit pinned in SOURCE.json, with HEAD at that commit. Every canonical file is then read from
  // that commit's blobs, never from the working tree, with git replace refs ignored. It trusts the object
  // store of the fresh clone made by the same-session identity check: git does not re-hash objects on read.
  // Remote identity is that authenticated owner-account check; a local origin URL proves nothing.
  import { execFileSync } from "node:child_process";
  import { createHash } from "node:crypto";
  import { readFile, realpath } from "node:fs/promises";
  import { resolve } from "node:path";
  import { fileURLToPath } from "node:url";
  import { exportRuntime, parseCanonical } from "./darkfield-export.mjs";

  const COMMIT = /^[0-9a-f]{40}$/;
  const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  const BLOB_PATH = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*$/;
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

  // git, confined to the canonical checkout: GIT_* variables that could redirect it are dropped, and
  // --no-replace-objects stops refs/replace/* from substituting the objects it reads.
  const gitIn = (dir) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
    return (...args) => {
      try {
        return execFileSync("git", ["--no-replace-objects", "-C", dir, ...args], { env, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 });
      } catch {
        return null;
      }
    };
  };

  export const verifyCanonical = async (canonicalDir, source, web) => {
    const failures = [];
    const fail = (message) => failures.push(message);
    const git = gitIn(canonicalDir);
    const line = (bytes) => bytes?.toString("utf8").trim();
    const { tag, commit } = source.canonical;

    // Identity first; nothing is read from the checkout until it holds.
    if (!COMMIT.test(commit) || !TAG.test(tag)) fail("SOURCE.json: canonical tag or commit is malformed");
    else if (line(git("rev-parse", "--show-toplevel")) !== (await realpath(canonicalDir).catch(() => null))) fail("canonical: not the root of a git checkout");
    else if (line(git("cat-file", "-t", `refs/tags/${tag}`)) !== "tag") fail(`canonical: ${tag} is not an annotated tag`);
    else if (line(git("rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`)) !== commit) fail(`canonical: ${tag} does not resolve to ${commit}`);
    else if (line(git("rev-parse", "--verify", "--quiet", "HEAD")) !== commit) fail(`canonical: HEAD is not ${commit}`);
    if (failures.length) return failures;

    // Canonical bytes come from the pinned commit's blobs, so working-tree edits cannot affect the result.
    const pinned = (path) => (BLOB_PATH.test(path) ? git("cat-file", "blob", `${commit}:${path}`) : null);

    for (const [vendored, entry] of Object.entries(source.files)) {
      const local = await readFile(resolve(web, vendored));
      if (entry.from) {
        // Copied files (fonts, licences): byte-identical to their canonical counterparts.
        const canonical = pinned(entry.from);
        if (!canonical || sha(canonical) !== entry.sha256 || sha(local) !== entry.sha256) fail(vendored);
      } else if (entry.derivedFrom) {
        // Derived runtime tokens: re-export from the pinned canonical file and require identical bytes.
        const canonicalBytes = pinned(entry.derivedFrom);
        if (!canonicalBytes || sha(canonicalBytes) !== entry.sourceSha256) {
          fail(`${vendored}: canonical ${entry.derivedFrom} hash`);
          continue;
        }
        const canonical = parseCanonical(canonicalBytes);
        const exported = exportRuntime(canonical);
        if (exported !== local.toString("utf8") || sha(exported) !== entry.sha256) fail(`${vendored}: re-export differs`);
      } else {
        fail(`${vendored}: entry has neither from nor derivedFrom`);
      }
    }
    return failures;
  };

  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const flag = process.argv.indexOf("--verify");
    if (flag === -1 || !process.argv[flag + 1]) {
      console.error("usage: node scripts/darkfield-source.mjs --verify <canonical-dir>");
      process.exit(2);
    }
    const web = resolve(import.meta.dirname, "..");
    const canonicalDir = resolve(process.argv[flag + 1]);
    const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
    const failures = await verifyCanonical(canonicalDir, source, web);
    for (const message of failures) console.error(`MISMATCH ${message}`);
    if (failures.length) process.exit(1);
    console.log(`verified ${Object.keys(source.files).length} files against ${canonicalDir}`);
  }
  ```

- [ ] **Step 4: Export, copy and record provenance (authorized environment).**
  - Check out the canonical repository at `tokens-v1-2026-10-09` into `$DF_TMP/darkfield` with credentials explicitly bound to `kareemsasa` (Task P2 identity rule), as part of the canonical identity check.
  - Confirm `git -C "$DF_TMP/darkfield" rev-parse HEAD` is `4f02965bfa51eb060c39734608422dde0d288009`.
  - Run `cd web && node scripts/darkfield-export.mjs "$DF_TMP/darkfield"`. It prints only a hash; never paste canonical content into logs, commits or PR text.
  - Copy `fonts/*.woff2` and `licenses/*.txt` from the canonical checkout to the paths above. Copy nothing else from it.
  - The copied fonts and licences are verified by hash. Never normalize their bytes (line endings, whitespace) to satisfy whitespace tooling. `git diff --check` warnings on them are expected: the IBM Plex Mono licence uses CRLF line endings.
  - Write `SOURCE.json`:
    - `system`: `"Darkfield"`; `tokensVersion`: the canonical `version` (currently `1`).
    - `canonical`: `github.com/kareemsasa/darkfield`, `tokens-v1-2026-10-09`, `4f02965bfa51eb060c39734608422dde0d288009`.
    - `export` and `r1`: the archive names and checksums in [Specification authority](#specification-authority).
    - The runtime entry: `sourceSha256` is the canonical `tokens.json` hash (`942115fc42277c33b45207ff2f20cfd4e2e8283930e1e8afcaed81dcab5a9bcc`), and `sha256` is the exported file's hash.
    - One `{ from, sha256 }` entry per font and licence.
    - Record no owner-held editing copies or URLs.

- [ ] **Step 5: Verify.**
  - Public: `cd web && node --test scripts/darkfield-vendor.test.mjs scripts/darkfield-runtime.test.mjs`. Expected: PASS, 16 tests (12 + 4). After Step 7, the public set is 39 tests (see Step 7).
  - Canonical, in the authorized environment: the canonical identity check, then `cd web && node scripts/darkfield-source.mjs --verify "$DF_TMP/darkfield"`. Expected: `verified 10 files`.
  - The reviewer independently repeats the canonical identity check and canonical verification. In the authorized environment, it also runs the canonical disclosure scan (see [Runtime token propagation](#runtime-token-propagation)) over `tokens.runtime.json`, `SOURCE.json` and the test files. It expects only approved-value matches.
  - If the reviewer has no canonical access, it reports derivation as **UNVERIFIED**, never as PASS.

- [ ] **Step 6: Commit** exactly these paths: the exporter, `tokens.runtime.json`, `SOURCE.json`, the 6 fonts, the 3 licences, `darkfield-source.mjs`, and the two tests.

  Message: `feat(web): publish Darkfield runtime tokens and OFL fonts with a source manifest`.

  The canonical `tokens.json` must not appear in `git diff --cached --name-only`.

- [ ] **Step 7: Conformance correction (r7; one further commit).** It corrects the two defects recorded in [E-10](#evidence-summary) and leaves the r6 commit as it is.
  - Modify `web/scripts/darkfield-export.mjs` and `web/scripts/darkfield-source.mjs` to the Step 3 code.
  - Create the two regression tests below. Their inputs are synthetic: the public runtime values with placeholder private fields, and throwaway git repositories. They need the `git` command, but no network, credentials or canonical access.
  - `tokens.runtime.json`, `SOURCE.json`, the 6 fonts and the 3 licences must stay byte-identical to the r6 commit. If the correction would change any of them, **stop**.

  ```js
  // web/scripts/darkfield-export.test.mjs
  // Public regression tests for the exporter's fail-closed classification and safe refusals (plan r7).
  // The canonical input is synthetic: the public runtime values plus placeholder private fields. No
  // canonical text is used, and none is needed.
  import test from "node:test";
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";
  import { exportRuntime, parseCanonical, RUNTIME_PATH } from "./darkfield-export.mjs";

  const committed = await readFile(RUNTIME_PATH, "utf8");
  const MARKER = "zq injected placeholder prose";

  // A canonical-shaped input: every runtime field from the committed export, every private field a marker.
  const synthetic = () => {
    const { schema, ...runtime } = JSON.parse(committed);
    assert.equal(schema, "darkfield-runtime/1");
    const canonical = { name: MARKER, ...runtime };
    for (const group of Object.values(canonical)) {
      if (!Array.isArray(group?.tokens)) continue;
      group.note = MARKER;
      for (const token of group.tokens) token.usage = MARKER;
    }
    for (const theme of canonical.color.themes) theme.name = MARKER;
    for (const group of canonical.type.groups) {
      Object.assign(group, { name: MARKER, note: MARKER });
      for (const style of group.styles) Object.assign(style, { sample: MARKER, usage: MARKER });
    }
    return canonical;
  };

  // Refused, and the refusal repeats neither the injected text nor the offending key.
  const refuses = (canonical, pattern, key) =>
    assert.throws(
      () => exportRuntime(canonical),
      (error) => {
        assert.match(error.message, pattern);
        assert.ok(!error.message.includes("zq"), "the refusal must not repeat injected text");
        if (key) assert.ok(!error.message.includes(key), "the refusal must not repeat the offending key");
        return true;
      },
    );

  test("a valid synthetic canonical input reproduces the committed runtime bytes, deterministically", () => {
    assert.equal(exportRuntime(synthetic()), committed);
    assert.equal(exportRuntime(synthetic()), exportRuntime(synthetic()));
  });

  test("private fields never reach the runtime output", () => {
    assert.ok(!exportRuntime(synthetic()).includes("zq"));
  });

  const FORGED_KEYS = [
    ["a dotted top-level key", (c) => (c["type.families.sans"] = MARKER), "type.families.sans"],
    ["a dotted nested key", (c) => (c.type["families.sans"] = MARKER), "families.sans"],
    ["a bracketed key", (c) => (c.color["tokens[].name"] = MARKER), "tokens[].name"],
    ["an empty top-level key", (c) => (c[""] = { version: MARKER }), null],
    ["a key forging a private path", (c) => (c.type.groups[0]["styles[].sample"] = MARKER), "styles[].sample"],
  ];
  for (const [label, mutate, key] of FORGED_KEYS) {
    test(`refuses ${label}`, () => {
      const canonical = synthetic();
      mutate(canonical);
      refuses(canonical, /^invalid canonical key \(\d+ chars\) under /, key);
    });
  }

  test("ordinary unknown fields remain refused, named only by length", () => {
    const canonical = synthetic();
    canonical.color.tokens[0]["zq-unknown"] = MARKER;
    refuses(canonical, /^unclassified canonical fields \(classify before exporting\): color\.tokens\[\]\.<10 chars>$/, "zq-unknown");
  });

  test("unexpected theme ids are refused without repeating them", () => {
    const canonical = synthetic();
    canonical.color.themes[2].id = MARKER;
    refuses(canonical, /^unexpected theme ids \(expected dark,light,mono\)$/);
  });

  test("malformed canonical JSON is refused without quoting it", () => {
    assert.throws(() => parseCanonical(Buffer.from(`{"note": ${MARKER}}`)), {
      message: "canonical tokens.json is not valid JSON",
    });
  });
  ```

  ```js
  // web/scripts/darkfield-source.test.mjs
  // Public regression tests for the git identity checks of canonical verification (plan r7). Every
  // repository here is synthetic, built from public placeholder data, so the private canonical
  // repository is never needed. Requires the git command; no network and no credentials.
  import test from "node:test";
  import assert from "node:assert/strict";
  import { execFileSync } from "node:child_process";
  import { createHash } from "node:crypto";
  import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { exportRuntime, RUNTIME_PATH } from "./darkfield-export.mjs";
  import { verifyCanonical } from "./darkfield-source.mjs";

  const TAG = "tokens-v0-test";
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const root = await mkdtemp(join(tmpdir(), "darkfield-source-test-"));
  test.after(() => rm(root, { recursive: true, force: true }));

  // The test's own git calls ignore the operator's configuration.
  const gitEnv = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: "1" };
  const git = (dir, ...args) =>
    execFileSync("git", ["-C", dir, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgSign=false", "-c", "tag.gpgSign=false", ...args], {
      env: gitEnv,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

  // Placeholder canonical content whose export is the committed runtime file, and a placeholder font.
  const runtime = await readFile(RUNTIME_PATH, "utf8");
  const { schema, ...runtimeFields } = JSON.parse(runtime);
  const tokensJson = `${JSON.stringify({ name: "placeholder", ...runtimeFields }, null, 2)}\n`;
  const FONT = Buffer.from("placeholder font bytes");
  assert.equal(schema, "darkfield-runtime/1");
  assert.equal(exportRuntime(JSON.parse(tokensJson)), runtime);

  const web = join(root, "web");
  await mkdir(join(web, "src/styles/darkfield"), { recursive: true });
  await mkdir(join(web, "public/fonts/darkfield"), { recursive: true });
  await writeFile(join(web, "src/styles/darkfield/tokens.runtime.json"), runtime);
  await writeFile(join(web, "public/fonts/darkfield/Placeholder.woff2"), FONT);
  const FONT_ENTRY = "public/fonts/darkfield/Placeholder.woff2";
  const files = {
    "src/styles/darkfield/tokens.runtime.json": {
      derivedFrom: "tokens.json",
      sourceSha256: sha(tokensJson),
      exporter: "scripts/darkfield-export.mjs",
      schema: "darkfield-runtime/1",
      sha256: sha(runtime),
    },
    [FONT_ENTRY]: { from: "fonts/Placeholder.woff2", sha256: sha(FONT) },
  };
  const sourceFor = (commit) => ({ canonical: { location: "example.invalid/canonical", tag: TAG, commit }, files });

  let count = 0;
  const plainDir = async () => {
    const dir = join(root, `plain-${++count}`);
    await mkdir(join(dir, "fonts"), { recursive: true });
    await writeFile(join(dir, "tokens.json"), tokensJson);
    await writeFile(join(dir, "fonts/Placeholder.woff2"), FONT);
    return dir;
  };
  // A synthetic canonical repository: one commit with the placeholder files, an optional tag on it,
  // and optionally a later commit that HEAD moves to.
  const repo = async ({ tag = "annotated", later = false } = {}) => {
    const dir = await plainDir();
    git(dir, "init", "-q", "-b", "main");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "canonical");
    const pinned = git(dir, "rev-parse", "HEAD");
    if (tag === "annotated") git(dir, "tag", "-a", "-m", "pin", TAG);
    if (tag === "lightweight") git(dir, "tag", TAG);
    if (later) git(dir, "commit", "-q", "--allow-empty", "-m", "later");
    return { dir, pinned, head: git(dir, "rev-parse", "HEAD") };
  };
  // The authorized arrangement: a clone checked out (detached) at the tag, optionally shallow.
  const cloneAtTag = (origin, ...options) => {
    const dir = join(root, `clone-${++count}`);
    git(root, "clone", "-q", ...options, "--branch", TAG, `file://${origin}`, dir);
    return dir;
  };

  test("a detached clone at the pinned annotated tag verifies", async () => {
    const { dir, pinned } = await repo();
    assert.deepEqual(await verifyCanonical(cloneAtTag(dir), sourceFor(pinned), web), []);
  });

  test("a shallow clone at the pinned annotated tag verifies", async () => {
    const { dir, pinned } = await repo();
    assert.deepEqual(await verifyCanonical(cloneAtTag(dir, "--depth", "1"), sourceFor(pinned), web), []);
  });

  test("working-tree edits do not change what is verified: canonical bytes come from the pinned commit", async () => {
    const { dir, pinned } = await repo();
    const clone = cloneAtTag(dir);
    await writeFile(join(clone, "tokens.json"), "not json");
    await writeFile(join(clone, "fonts/Placeholder.woff2"), "edited");
    assert.deepEqual(await verifyCanonical(clone, sourceFor(pinned), web), []);
  });

  test("a replace ref cannot substitute canonical bytes", async () => {
    const { dir, pinned } = await repo();
    const clone = cloneAtTag(dir);
    const forged = "forged font bytes";
    await writeFile(join(root, "forged"), forged);
    git(clone, "replace", git(clone, "rev-parse", `${pinned}:fonts/Placeholder.woff2`), git(clone, "hash-object", "-w", join(root, "forged")));
    assert.equal(git(clone, "cat-file", "blob", `${pinned}:fonts/Placeholder.woff2`), forged, "plain git follows the replace ref");
    const forgedWeb = join(root, `web-${++count}`);
    await mkdir(join(forgedWeb, "src/styles/darkfield"), { recursive: true });
    await mkdir(join(forgedWeb, "public/fonts/darkfield"), { recursive: true });
    await writeFile(join(forgedWeb, "src/styles/darkfield/tokens.runtime.json"), runtime);
    await writeFile(join(forgedWeb, FONT_ENTRY), forged);
    const source = sourceFor(pinned);
    source.files = { ...files, [FONT_ENTRY]: { ...files[FONT_ENTRY], sha256: sha(forged) } };
    assert.deepEqual(await verifyCanonical(clone, source, forgedWeb), [FONT_ENTRY]);
  });

  test("committed canonical content is still checked against SOURCE.json", async () => {
    const { dir, pinned } = await repo();
    const source = sourceFor(pinned);
    source.files = { ...files, [FONT_ENTRY]: { ...files[FONT_ENTRY], sha256: sha("other bytes") } };
    assert.deepEqual(await verifyCanonical(cloneAtTag(dir), source, web), [FONT_ENTRY]);
  });

  test("a plain directory fails", async () => {
    const { pinned } = await repo();
    assert.deepEqual(await verifyCanonical(await plainDir(), sourceFor(pinned), web), ["canonical: not the root of a git checkout"]);
  });

  test("a plain directory inside another checkout fails", async () => {
    const { dir, pinned } = await repo();
    const nested = join(dir, "fonts");
    assert.deepEqual(await verifyCanonical(nested, sourceFor(pinned), web), ["canonical: not the root of a git checkout"]);
  });

  test("GIT_DIR in the environment cannot make a plain directory pass", async () => {
    const { dir, pinned } = await repo();
    const saved = process.env.GIT_DIR;
    process.env.GIT_DIR = join(dir, ".git");
    try {
      assert.deepEqual(await verifyCanonical(await plainDir(), sourceFor(pinned), web), ["canonical: not the root of a git checkout"]);
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = saved;
    }
  });

  test("a missing tag fails", async () => {
    const { dir, pinned } = await repo({ tag: "none" });
    assert.deepEqual(await verifyCanonical(dir, sourceFor(pinned), web), [`canonical: ${TAG} is not an annotated tag`]);
  });

  test("a lightweight tag fails", async () => {
    const { dir, pinned } = await repo({ tag: "lightweight" });
    assert.deepEqual(await verifyCanonical(dir, sourceFor(pinned), web), [`canonical: ${TAG} is not an annotated tag`]);
  });

  test("an annotated tag resolving to a commit other than the pin fails", async () => {
    const { dir, head } = await repo({ later: true });
    assert.deepEqual(await verifyCanonical(dir, sourceFor(head), web), [`canonical: ${TAG} does not resolve to ${head}`]);
  });

  test("HEAD moved off the pinned commit fails", async () => {
    const { dir, pinned } = await repo({ later: true });
    assert.deepEqual(await verifyCanonical(dir, sourceFor(pinned), web), [`canonical: HEAD is not ${pinned}`]);
  });

  test("a malformed pin fails before git is consulted", async () => {
    const { dir } = await repo();
    assert.deepEqual(await verifyCanonical(dir, sourceFor("HEAD"), web), ["SOURCE.json: canonical tag or commit is malformed"]);
  });
  ```

  **Verify:**
  - Against the r6 scripts, the new tests fail. Against the r7 scripts: `cd web && node --test scripts/darkfield-vendor.test.mjs scripts/darkfield-runtime.test.mjs scripts/darkfield-export.test.mjs scripts/darkfield-source.test.mjs`. Expected: PASS, 39 tests (12 + 4 + 10 + 13), also from a clean checkout without credentials or network.
  - The sha256 of each published Darkfield file equals both `SOURCE.json` and the r6 commit.
  - `npm run typecheck`, `npm run lint` and `npm test` pass, with no diff in `web/src/data/generated/articles.ts`.
  - In the authorized environment, after the canonical identity check: `--verify` prints `verified 10 files`; a re-export with the r7 exporter is byte-identical to `tokens.runtime.json`. In a temporary copy of the clone, never pushed: a local commit that moves `HEAD` fails; the tag re-created as a lightweight tag on the pinned commit fails; an edited working-tree `tokens.json` still verifies, and so does a replace ref on its blob.
  - The reviewer repeats these checks and runs the canonical disclosure scan over the four files and the commit message.

  **Commit** exactly these four paths: `web/scripts/darkfield-export.mjs`, `web/scripts/darkfield-source.mjs`, `web/scripts/darkfield-export.test.mjs`, `web/scripts/darkfield-source.test.mjs`.

  Message: `fix(web): refuse forged Darkfield token keys and verify the canonical git identity`.

  Task 2 starts from this commit. Its Step 5 insertion point (the `derivedFrom` branch, after the re-export comparison, with `canonical`, `exported`, `vendored` and `fail` in scope) is unchanged.

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

**Status (r10).** The r9 changes were applied to the uncommitted work, and every r9 check passed. Work stopped before D10 again ([E-13](#evidence-summary)): a supplementary scan measured text that the r9 test never reaches, and found regressions there.
- **What the r9 test missed.** The painted-text pass skipped text nested inside sampler matches. No pass measured hover, focus or pressed states beyond the listed pairs, and the translucent header was measured only over whatever the run left behind it.
- **What r10's first draft missed** (found by its independent review). Its interaction pass kept one value per control and state: the lowest of the control's text runs. A run that already failed, such as a status badge or a card description, then hid a different run that got worse, such as the card's call to action. r10 now measures and compares every text run on its own (Step 2).
- **What r10's second draft missed** (found by its independent review). If any one run of an element was covered or partly off screen, the whole element went unmeasured, and a wrapped link was checked against the paragraph around it. That left one `/case-studies` card's label and the Traffic case-study link at 1280×800 and 375×812, and three controls on `/case-studies/where-the-specification-lived` at 1280×800, unmeasured on every build, and the comparison counted them as paired. r10 now skips and retries such runs on their own, measures a wrapped run over its line boxes, and lists every governed run neither build could measure (Steps 2 and 9).
- **The regressions found** (all genuine contrast losses, none a sampling artifact; [E-13](#evidence-summary)):
  - Dark: the "Launch" label on every `/simulations` card, on card hover, focus and press.
  - Light:
    - the header navigation links on hover, press and as the current page, and the header's disclosure toggle ("Explore", "Menu") in every state at narrower viewports, against content scrolled behind the header;
    - the Home contact links ("Email", "GitHub", "LinkedIn") on hover;
    - the call-to-action labels of the Home featured cards, the `/case-studies` cards, the `/writing` cards and the `/procedural-animations` cards, on card hover;
    - the `/writing` cards' eyebrows ("Essay", "Field Note"), on card hover;
    - the Orbital "← Simulations" link in every state, and its Traffic twin at 1280×800;
    - the Traffic case-study link when pressed.

The owner ruled (r10):
- plan a local repair for each, the header link included, measured against the header's worst translucent ground;
- separate genuine regressions from sampling artifacts, and waive none that is confirmed;
- keep the Launch repair and the measurement correction;
- mark the six `/simulations` preview roots, provided no governed content lies inside them. That is a measurement boundary, not a D6 decision.

After the review, the owner ruled further:
- every text run is measured, paired and compared on its own, with masking and pairing controls;
- every governed card call-to-action regression is repaired locally, by selector, with existing public tokens, preferably by changing only the label's local foreground colour. No global token, no site-wide hover override;
- the Launch repair may drop the hover sweep, but the card keeps a perceptible hover and focus response;
- a regression outside the card calls to action, or outside r10's approved scope, goes to the owner first.

After the second review, the owner ruled on the `/writing` card eyebrows, which are governed text though not calls to action:
- a failure Task 3 introduces or worsens gets the smallest local repair with existing tokens, to at least 4.5:1, preserving the card's geometry, content, hierarchy, interactions and other styling;
- a deficiency Task 3 leaves unchanged or improves is classified for D10, not repaired;
- no other new category is authorized: a regression needing a different scope goes to the owner.

The eyebrow worsens in Light on card hover (repaired in Step 7 item 6) and fails, improved, in Dark at some scroll positions (classified for D10).

D10 stays the owner's to decide. Apply the r10 changes to the uncommitted work:
- the Step 2 test;
- the Step 3 preview markers and the re-recorded ledger;
- Step 7 item 6.

Then re-run Step 3 and Steps 8–10, including the new Step 9 comparisons and repair isolation. The r10 work stays in the same Task 3 commit.

**Status (r9).** The r8 changes were applied to the uncommitted work, which stopped before D10 again ([E-12](#evidence-summary)). The independent review of that work found three defects, and r9 corrects them:
- **Native previews recoloured.** On `/simulations`, Task 3 changed the Snake and Rhythm Lab previews in Light, and the Orbital and Traffic SVGs in both themes.
- **Navigation-dependent game colours.** In Light, Spider and Snake rendered different colours after client-side navigation than on direct load.
- **A flaky clock.** The Rhythm Lab clock pause could fail under load ("Cannot fast-forward to the past").

The owner approved option A″ for the first two: a four-file compatibility hold (Step 7 item 5). It is provisional and not a D6 decision. r9 also classifies disabled controls as `inactive` observations, outside D10. Apply the r9 changes to the uncommitted work:
- the Step 2 test;
- the Step 3 re-record, which adds `inactive`;
- Step 7 item 5.

Then re-run Step 3 and Steps 8–10, including the new Step 9 comparisons. The r9 work stays in the same Task 3 commit.

**Status (r8).** Steps 1–7 were implemented at r7 and stopped before D10, uncommitted ([E-11](#evidence-summary)).
- The r7 browser test rejected the three layout measurements the site writes on `<html>`.
- It also measured the Annals parchment against the page field, which it cannot see.
- In Light, Task 3 made several already-failing texts worse. [E-11](#evidence-summary) lists them by element, including two that the r7 sampler did not cover.

r8 corrects the test and the measurement boundary, and authorizes a local contrast repair for every element Task 3 made worse. Apply the r8 changes to the uncommitted work:
- the Step 2 test;
- the Step 3 region markers and re-recorded ledger;
- the Step 7 item 4 repairs.

Then re-run Step 3 and Steps 8–10. The working tree already carries Steps 5–7, so Step 4's expected failures are confirmed against the baseline worktree instead (as in [E-11](#evidence-summary)). The r8 work stays in the same Task 3 commit.

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
  - `web/src/pages/Annals/Annals.tsx` (r8, Step 3: six `data-df-region` attributes only; authorized edit in a mixed component)
  - `web/src/components/ProjectRoster/ProjectRoster.css`, `web/src/components/ProjectMedia/ProjectMedia.css`, `web/src/pages/NotFound/NotFound.css` and `web/src/components/Navigation/SiteNavigation.css` (r8, Step 7 item 4: contrast repairs). `ProjectMedia.css` and `SiteNavigation.css` are also control-boundary files.
  - `web/src/components/SimulationCard/SimulationCard.css`, `web/src/components/SimulationCard/SimulationCard.tsx`, `web/src/pages/Simulations/Simulations.css` and `web/src/pages/Projects/Projects.css` (r9, Step 7 item 5: the native-colour compatibility hold; owner-approved option A″)
  - r10:
    - `SimulationCard.tsx`: six `data-df-region` attributes on the preview roots (Step 3), attributes only.
    - `SimulationCard.css`, `SiteNavigation.css`, `OrbitalSimulator.css` and `TrafficSimulator.css`: contrast repairs (Step 7 item 6). All four are already listed.
    - New to Task 3, contrast repairs (Step 7 item 6). Each file holds the rule that sets its label's colour, so the repair sits beside that rule:
      - `web/src/pages/Home/sections/ContactStripSection.css`
      - `web/src/pages/Home/sections/FeaturedProjectsSection.css`
      - `web/src/components/CaseStudyPage/CaseStudyPage.css` (it styles the `/case-studies` cards too)
      - `web/src/pages/Writing/Writing.css`
      - `web/src/pages/ProceduralAnimations/ProceduralAnimations.css`

**Interfaces:**
- Produces:
  - Every legacy variable in `LEGACY`, defined only in `bridge.css`.
  - `applyThemeToDocument(theme)` sets only `data-theme` and `color-scheme`.
  - The ledger format (r9): `{ baseline: "<sha>", notes: [string], regions: { "<theme>|<route>": count }, unmeasured: [{ id, reason }], entries: [{ id, check, theme, route, detail, baseline }], creative: [{ id, check, theme, route, detail, baseline }], inactive: [{ id, check, theme, route, detail, baseline }] }`. It keeps five kinds of result apart:
    - **`entries`: verified failures.** Each is measured on a colour stack, or on rendered pixels run by run and marked `(rendered ground)`; governed text on a painted ground is measured this way, never against the page field. D10 accepts `entries` only. r10 adds the checks `text`, `interact` and `backdrop` (Step 2), and makes rendered results per run: such an entry's id ends with its text run's key, so each run has its own baseline value.
    - **`creative`: independently authored presentation** inside `[data-df-region]`, measured as D6 evidence. It is neither accepted under D10 nor treated as unverified.
    - **`unmeasured`: governed text or states** that no method here could measure, each with its reason. They are never passed. They are reported to the owner with their effect on D10 (Step 11).
    - **`inactive`: disabled controls (r9).** WCAG 1.4.3 exempts inactive controls, so their contrast is an observation, not a failure. It is never an entry and never accepted under D10. Check mode holds it to the baseline record, within 0.05, so a change is reported. Once enabled, the same controls are measured like any other text (the Step 2 prepared states). The rule covers every disabled control the test sees; at r9 those are only the six Annals verbs. Check mode fails on any `inactive` id not in the record, and any other disabled control needs the owner's review before it joins the record.
    - **Unverified states** the test cannot reach are listed in `notes`.

    `regions` holds the creative exclusion counts that keep the baseline and the candidate comparable. Governed text on a painted ground that measures at least 4.5:1 passes like any other text.

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

  It has four parts: invariants, enumerated pairs, the sampler and prepared states (r8). r10 adds a text pass, an interaction pass, a header backdrop pass, per-run measurement and measurement controls. It is baseline-aware.
  - **Inline properties (r8).** Exactly three layout measurements may sit inline on `<html>`: `--site-header-measured-offset` and `--site-dock-safe-space` (`SiteNavigation.tsx`), and `--dock-icon-size` (`useDock.ts`). Each must hold a px length. Anything else fails, including any legacy theme variable, any Darkfield token, any other custom property, or a non-length value.
    - **Negative controls:** a control run proves the rendered layout properties pass. It then injects five properties and requires every one to be rejected: a legacy variable, a token, an unknown name, and two non-length values.
  - **Rendered ground (r8).** Where a background image or gradient lies under text, the colour stack cannot describe the ground. The element is then measured against rendered pixels:
    - its text is hidden, and the pixels behind each text run are compared with that run's own colour (its parent element's), so a coloured span inside a heading is measured as itself;
    - the lowest ratio over all runs is reported, marked `(rendered ground)`;
    - a capture counts only if nothing covers the text and two consecutive captures agree. Otherwise the result is `unmeasured`, with the reason, for example `covered by div.rhythm-lab-overlay`. It is never passed.
  - **Painted-text pass (r8).** Every other visible element with its own text on a painted ground is measured the same way (its own text runs only), as check `painted`, or listed as `unmeasured`. This covers elements the sampler selectors do not match and that are not inside one: readouts, labels, spans and footers on painted grounds.
    - Disabled controls are marked `(disabled)`. r9: their results go to `inactive`, not `entries` (see Interfaces). Check mode prints them as INACTIVE and requires them to match the baseline record.
  - **Creative regions (r8).** Elements inside `[data-df-region]` are counted per theme and route (`regions`), and their contrast is reported as `creative`. They never count as interface results.
    - Check mode requires `regions`, `unmeasured` (ids and reasons) and `creative` to match the baseline record, `creative` within the same 0.05.
    - So baseline and candidate always measure the same interface, and creative content stays unchanged.
  - **Prepared states (r8).** States a route load does not render are brought about deliberately and measured on rendered pixels:
    - the Annals verbs, which are disabled at load: enabled, hovered and pressed (each state verified); and the aside headings once the verbs are enabled ("Your Hand · available");
    - the Rhythm Lab lane tap zones, with the page clock frozen so that notes and feedback hold still: playing, lane key held, pointer-pressed, and under the pause overlay. Step 3 gives the state table.
  - **Deterministic clock (r9).** r8 froze the clock after the run started, with `pauseAt(Date.now() + 1)`. Under load the page's clock could pass that time first, and the call failed with "Cannot fast-forward to the past" ([E-12](#evidence-summary)).
    - r9 installs the clock at a fixed time and pauses it at a fixed later time, before navigation.
    - Virtual time then moves only through `runFor`: in 100 ms steps until Start shows (at most 50 steps), then 150 ms after Start.
    - The assertions and the measured states are unchanged.
  - **Navigation invariants (r9).** Spider and Snake are each reached by the eight `NAVIGATION` paths: two direct loads (the route and its `/games` alias) and six client-side paths, through `/simulations`, `/projects`, `/terminal` (`cd`) and the browser's Back.
    - On every path, `<html>` must define no `--terminal-primary`, and the game's probes must read the colours of its direct load in that theme.
    - An intermediate page counts as reached only once its own content renders, so its stylesheet has loaded.
  - **Portal invariant (r9).** The Projects tech-stack modal renders through a portal, outside `.projects-container`.
    - With the modal open, it must read the page's `--terminal-primary`, and its technology names must render in the page eyebrow's colour.
    - The check also fails if the modal stops being portaled, so that it keeps testing the portal.
  - **Repair coverage (r8).** The last five `PAIRS` cover the Step 7 item 4 repairs:
    - the roster and media hover states;
    - the media label and the KS mark, which lie outside the sampler's selectors. The mark is measured on rendered pixels, because the header is a translucent backdrop filter;
    - the 404 heading's large-text floor (`min: 3`).
  - **Text pass (r10).** It replaces r8's painted-text pass, which skipped any text nested inside a sampler match. Every visible element with its own text, outside creative regions, is measured exactly once:
    - an element a sampler selector matches is measured by the sampler;
    - inside a match measured on rendered pixels, the match already measured every run, so the element is skipped;
    - inside a match measured on its colour stack, the element is skipped only when it has the match's colour and ground, so the match's result is its own;
    - anything else is measured in its own colour: on its colour stack (check `text`) or, on a painted ground, on rendered pixels (check `painted`).

    Text that renders nothing is skipped: screen-reader-only text (a box of at most one pixel, or a clip that hides it all), and text under an ancestor at opacity 0 or `visibility: hidden`. Creative text is reported under `creative`, never dropped.
  - **Rendered runs (r10).**
    - **The run.** A run is its visible part only: its own box, inside its parent's padding box and every clipping ancestor's padding box. So a border is never read as ground, and screen-reader-only text yields nothing. Text that overflows its control, such as a tooltip, still counts. A run is measured over its line boxes, each clipped the same way, so a run that wraps is never read against the text around it.
    - **The capture.** One region of the page holds every run and is captured twice. Outlines are hidden during the capture, so a focus ring is never read as ground. Every pixel of each run's line boxes is compared with that run's colour.
    - **Covers.** While covers are checked, the measured subtree takes pointer events. So text drawn by a pointer-transparent element is found, not what lies beneath it.
    - **Ownership.** A run inside a nested sampler match belongs to that match and is measured there, never twice.
    - **Covered and off-screen runs.** A run that something covers, or that lies partly off screen, is skipped on its own, with its reason; the element's other runs are still measured. A card taller than the viewport, or one whose top run lies under the fixed header, so loses no other run.
      - Where the pass can re-enter the element's state, the run is then retried on its own, at up to three places: scrolled so that its middle lies at the middle of the viewport, then at 30% and at 70% of the viewport's height. Each time, its state is entered again with the pointer on the run itself, the run is measured alone, and its state is verified after the capture. Every build tries the same places in the same order.
      - The passes that retry: the sampler, the text pass and the `PAIRS` entries without hover, which have no state to re-enter, and the interaction pass, which re-enters hover, focus or press. The passes that do not: the hover `PAIRS` entries (a retry could re-enter only the rest state, not the hover), the backdrop pass and the prepared-state checks.
      - A run that still cannot be measured is `unmeasured` under its own id, with its reason.
  - **Per run (r10).** Each run is a result of its own, never folded into a minimum with the element's other runs.
    - **Its key.** The run's key is the element path from the measured element to the run's parent, then its text, then its occurrence among identical paths and texts.
    - **Stable numbering.** Occurrences are numbered over every text node in document order, before any node is skipped, so a run keeps its key on every build.
    - **Its id.** The id is check, theme, route, element (with its state) and run key.
    - **What is recorded.** The run's ratio, foreground colour, lowest ground pixel, the size of each of its line boxes, and its scroll position (a retried run's own).
    - **Colour stacks too.** An element measured on its colour stack gives each of its own text runs the same result, under the keys a rendered measurement would give them. So a run pairs across builds even if a repair changes how its ground is measured. The text pass records check `text` either way, and a rendered result's detail says `(rendered ground)`.
  - **Recording and pairing (r10).** Every measurement, passing or failing, is recorded under its id. Record mode prints the ledger candidates and then a `MEASURED` line holding all of them.
    - **Element identity.** Elements are numbered by name and text over everything the pass can measure, in page order, before any skip that depends on colour. So the n-th identical element pairs with the n-th on every build.
    - **Duplicates.** An id recorded twice is a pairing defect: record mode prints it as `DUPLICATE` and exits non-zero, and check mode fails.
    - **Check mode compares run by run.** Each failing run is compared with its own baseline value. A ledger run this build did not measure at all fails as missing; it does not pass as stale.
  - **Interaction pass (r10).** Every enabled control with text outside creative regions is measured hovered, focused (`:focus-visible`) and pressed, as check `interact`. The controls are `a[href]`, `button`, `[role="button"]`, `summary` and button-type inputs, outer controls only. Each state is verified, then each of the control's text runs, nested ones included, is measured on rendered pixels as a result of its own.
    - Transitions and animations are off, so a state renders at once.
    - A control is entered at the first point inside it that nothing covers: the middle of its box, then of each of its line boxes, then of each of its text runs. A link that wraps may have no text at the middle of its box.
    - Each state is verified before and after its capture. Entry is retried up to three times, and so is a measurement that finds no rendered text or a ground that does not hold still: a section scrolled into view may still be fading in.
    - A control with no uncovered point, or a state that still does not take or hold, is `unmeasured`, with the reason.
    - A press is released away from the control, so nothing is activated. A navigation fails the test.
    - It runs last on each route but one (the backdrop pass), because it moves the pointer, focus and scroll.
  - **Header backdrop (r10).** The header is translucent, so the ground of its text depends on what is scrolled behind it.
    - The test hides everything but the header over the page colour farthest from the header's text: black in Light, white in Dark and Mono. That is the header's worst ground in each theme.
    - On `/projects`, in each theme, it measures every visible header control with text at rest, hovered, focused and pressed, each state verified, run by run, as check `backdrop`. That covers the brand link and its mark, the navigation links (the current page included) and, at narrower viewports, the disclosure toggle.
    - An invariant confirms that the backdrop is in force, so the pass cannot quietly measure an ordinary ground.
  - **Determinism (r10).**
    - `Math.random` is seeded on every page, because the background's reduced-motion frame is random and shows through translucent grounds.
    - Transitions are off before the `PAIRS` hovers, which were otherwise measured mid-transition.
    - **Scrolling.** Every capture first scrolls its element to the middle of the viewport, instantly. Its scroll position then depends only on the element, never on where an earlier step left the page, so both builds capture it alike. Instant, because the site's smooth scrolling would otherwise animate the scroll. An element in a fixed or sticky container is always in view and is not scrolled for.
    - **Fade-ins.** After that scroll, the test waits in the page until the opacity and transform of the element, its ancestors and its descendants hold for three samples 16 ms apart (at most 2 s). A section scrolled into view may fade in, and reduced motion keeps opacity fades. On a page whose clock is frozen, nothing animates and no timer runs, so this wait and the two-frame settle return at once.
    - **Hover.** Every hover scrolls first, waits two animation frames, then moves the pointer. A pointer moved while a scroll is still settling loses its hover moments later. Playwright's `hover()`, which scrolls and moves at once, lost the `.btn-outline` hover within 50 ms on every try.
    - **Every pointer state.** Hover, focus and press each settle for two animation frames, because script-driven state styles (the section dots' hover and press scale, for example) apply a frame later. Each is then verified before the capture and again after it; a press must keep its hover. A state that does not hold is retried. One that never holds is `unmeasured` (for example `not hover` or `hover not held`), never passed.
    - **Layout.** A route page loads every lazy image first and waits until the page's height holds still. Lazy images that loaded mid-pass changed the layout and the scroll positions between runs.
    - Repeated records of one build are byte-identical ([E-13](#evidence-summary)).
  - **Viewport and arrival (r10).**
    - `DARKFIELD_VIEWPORT=<width>x<height>` selects the viewport. The ledger is recorded at the default 1440×900.
    - `DARKFIELD_ARRIVE_FROM=<route>` makes the route passes reach each route by client-side navigation from that route, so the stylesheets it loaded stay attached. The arriving route fades in through its transition wrapper, `main`'s direct child. So the test waits until the opacity and transform of `main`, its ancestors and its children stop changing; deeper content, such as a game's moving playfield, is not sampled.
    - **In-view fade-ins after an arrival.** Sections that fade in when first scrolled into view start at opacity 0 after a client-side arrival, though a direct load renders them at once, and the text pass would skip them. So, after an arrival, the test scrolls the page through in half-viewport steps and back to the top, then waits until every element in `main` with an inline opacity holds still. Pages with a frozen clock are not swept.
    - Step 9 compares the builds at four more viewports and for two arrivals.
  - **Measurement controls (r10).** In check mode, the passes run on fixture pages with known answers. Each control fails if the passes stop measuring what they must:
    - a failing nested label on a gradient, and one on a solid ground;
    - a state that fails while its rest state passes;
    - a passing nested label's exact ratio;
    - one text measured twice;
    - a border, outline or screen-reader-only text read as ground, or screen-reader-only text skipped as covered instead of excluded;
    - a disabled control not classed `inactive`;
    - masking: in a link that also holds a failing badge, a label that passes on one fixture build and fails on the next must be reported fresh, and a failing label that falls further must be reported worse;
    - pairing: of three identical cards, only the second worsens, and every changed result must be the second card's, with no duplicate and no missing run;
    - run pairing: one link holds two identical text runs, and only the second worsens; every changed run must be the second, with no duplicate;
    - covered, off-screen and wrapped runs: a card taller than the viewport, a card whose top run lies under a fixed bar when the card is centred, and a link that wraps inside a paragraph. Every worsened label must be reported fresh in every state, and nothing may be left unmeasured;
    - a colour-dependent skip: of three identical notes, the first has its link's colour and ground on one fixture build only, so the text pass skips it there, and the second worsens. The worsening must be the second note's alone;
    - re-entry: a card taller than the viewport, measured on rendered pixels. Without a way to re-enter its state, as for a hover pair, both off-screen runs must stay unmeasured, each with its reason; at rest, both must be retried and measured.

  ```js
  // web/scripts/darkfield-foundation-browser-test.mjs
  // Uses the existing standalone browser-test convention; no new dependency.
  // node scripts/darkfield-foundation-browser-test.mjs [base URL] [Playwright module] [browser executable]
  // DARKFIELD_MODE=check (default): invariants must pass; regressions are compared with the ledger.
  // DARKFIELD_MODE=record: run regression checks only and print ledger candidates (use on the baseline).
  // DARKFIELD_THEMES=dark,light[,mono] selects themes.
  // DARKFIELD_VIEWPORT=<width>x<height> selects the viewport (r10; default 1440x900, where the ledger is recorded).
  // DARKFIELD_ARRIVE_FROM=<route> (r10): the route passes reach each route by client-side navigation from this
  // route instead of a direct load, so the stylesheets it loaded stay attached (Step 9 compares arrivals).
  // Record mode also prints every measurement on a MEASURED line (r10), for Step 9's run-by-run comparison.
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";
  const { chromium } = await import(process.argv[3] || "playwright");
  const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
  const base = process.argv[2] || "http://127.0.0.1:4173";
  const MODE = process.env.DARKFIELD_MODE || "check";
  const THEMES = (process.env.DARKFIELD_THEMES || "dark,light").split(",");
  const [VIEW_W, VIEW_H] = (process.env.DARKFIELD_VIEWPORT || "1440x900").split("x").map(Number);
  const ARRIVE_FROM = process.env.DARKFIELD_ARRIVE_FROM || null;
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
  // The last five cover the r8 contrast repairs: states and elements the route-load sampler does not
  // reach, and the 404 heading's large-text floor. min is 4.5 unless set (WCAG 3:1 for large text).
  // rendered: measure against the rendered pixels; the header's backdrop filter is not a colour stack.
  const PAIRS = [
    { selector: ".btn-primary" }, { selector: ".btn-outline", hover: true },
    { selector: ".work-contact-link.primary" }, { selector: ".work-dates", hover: true },
    { selector: ".tech-tag", hover: true }, { selector: ".site-header__link.active" },
    { selector: ".modal-close", hover: true }, { selector: ".toast-close", hover: true },
    { selector: '.settings-segmented__button[aria-pressed="true"]' },
    { selector: ".error-button.primary" }, { selector: ".home-link" },
    { selector: ".project-roster__action--primary", hover: true },
    { selector: ".project-media__bar .project-media__control", hover: true },
    { selector: ".not-found h1", min: 3 },
    { selector: ".project-media__label" }, { selector: ".site-header__brand-mark", rendered: true },
  ];
  // Layout measurements the site writes on <html> (SiteNavigation.tsx, useDock.ts), each a px length.
  // Any other inline custom property, or any other value, is a theme value written inline.
  const INLINE_LAYOUT = ["--site-header-measured-offset", "--site-dock-safe-space", "--dock-icon-size"];
  const unexpectedInline = (properties) =>
    properties.filter(([name, value]) => name.startsWith("--") && !(INLINE_LAYOUT.includes(name) && /^\d+(\.\d+)?px$/.test(value.trim())));
  // Interaction states a route load does not render, prepared and then measured against the rendered
  // ground. Each state's enter function brings one control into the state, verifies it, and may return
  // an exit function. texts: governed text measured once in the prepared state. A state that cannot be
  // measured is listed as unmeasured, never passed.
  const STATES = [
    {
      // Annals verbs ("Your Hand", Annals.tsx): disabled at load, enabled every third year. The aside
      // headings change with them ("Your Hand · available").
      route: "/simulations/annals",
      controls: ".annals-page aside .flex-wrap > button",
      texts: [".annals-page aside > h2"],
      prepare: async (page) => {
        const advance = page.getByRole("button", { name: "let a year pass →" });
        for (let year = 0; year < 3 && (await page.locator(".annals-page aside .flex-wrap > button:disabled").count()); year++) await advance.click();
        if (await page.locator(".annals-page aside .flex-wrap > button:disabled").count()) throw new Error("annals: verbs not enabled");
      },
      states: {
        enabled: async (page) => { await page.mouse.move(0, 0); },
        hover: async (page, control) => {
          // Scroll, settle, then move (r10), as every hover does.
          await reveal(control);
          await frames(page);
          const box = await control.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await frames(page);
          if (!(await control.evaluate((el) => el.matches(":hover")))) throw new Error("annals: verb not hovered");
        },
        pressed: async (page, control) => {
          await control.click();
          await page.mouse.move(0, 0);
          if ((await control.getAttribute("aria-pressed")) !== "true") throw new Error("annals: verb did not press");
          return () => control.click();
        },
      },
    },
    {
      // Rhythm Lab lane tap zones (RhythmHighway.tsx): enabled buttons, pointer-operated (tabIndex -1)
      // and mirrored by the lane keys. At load the Ready Check overlay covers them (the sampler lists
      // them as unmeasured). Here the page clock is frozen before navigation and only advanced in fixed
      // steps, so the run starts at the same virtual moment every time and notes and feedback hold still.
      // Each zone is measured playing, with its lane key held, and pointer-pressed. It is then checked
      // under the pause overlay, where it is expected to be listed as covered.
      route: "/simulations/rhythm-lab",
      controls: ".rhythm-lab-hit-zone",
      clock: true,
      prepare: async (page) => {
        const start = page.getByRole("button", { name: "Start", exact: true });
        for (let step = 0; step < 50 && !(await start.isVisible()); step++) await page.clock.runFor(100);
        await start.click();
        await page.clock.runFor(150);
        if (await page.locator(".rhythm-lab-overlay").count()) throw new Error("rhythm-lab: the run did not start");
      },
      states: {
        playing: async (page) => { await page.mouse.move(0, 0); },
        key: async (page, control) => {
          const key = (await control.textContent()).trim()[0].toLowerCase();
          await page.keyboard.down(key);
          if (!(await control.evaluate((el) => el.classList.contains("rhythm-lab-hit-zone-input")))) throw new Error("rhythm-lab: no key feedback");
          return async () => { await page.keyboard.up(key); await page.clock.runFor(100); };
        },
        pointer: async (page, control) => {
          const box = await control.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          if (!(await control.evaluate((el) => el.matches(":active")))) throw new Error("rhythm-lab: zone not pressed");
          return async () => { await page.mouse.up(); await page.mouse.move(0, 0); await page.clock.runFor(100); };
        },
        paused: async (page) => {
          await page.keyboard.press("Escape");
          if (!(await page.locator(".rhythm-lab-overlay").count())) throw new Error("rhythm-lab: did not pause");
          return async () => {
            await page.keyboard.press("Escape");
            if (await page.locator(".rhythm-lab-overlay").count()) throw new Error("rhythm-lab: did not resume");
          };
        },
      },
    },
  ];
  const invariantFailures = [];
  const regressions = [];
  const creative = [];
  const inactive = [];
  const regions = {};
  const unmeasured = [];
  // Every measurement, passing or failing, by id (r10): record mode prints it, and Step 9 compares builds run
  // by run from it. An id recorded twice is a pairing defect.
  const measured = {};
  const duplicates = [];
  const ran = new Set();
  const uncovered = new Set(PAIRS.map((p) => p.selector));
  const errors = [];
  const invariant = (ok, message) => { if (!ok) invariantFailures.push(message); };
  // A page that needs a frozen clock gets it before navigation: installed at a fixed time and paused at a
  // fixed later time that no real elapsed time can reach first, then advanced only by runFor.
  const CLOCK_START = new Date("2026-01-01T00:00:00Z");
  const CLOCK_PAUSED = new Date("2026-01-01T01:00:00Z");

  const withPage = async ({ theme, route = "/", javaScriptEnabled = true, forcedColors = "none", clock = false, routePass = false }, run) => {
    const context = await browser.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, javaScriptEnabled, forcedColors, reducedMotion: "reduce" });
    if (theme) await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    // Seeded randomness (r10): decorative backgrounds draw a random static frame under reduced motion, and it
    // shows through translucent grounds. The same seed on every load and build keeps rendered grounds
    // reproducible, so the baseline and the candidate are compared on the same frame.
    await context.addInitScript(() => {
      let seed = 1;
      Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${route}: ${error.message}`));
    if (clock) {
      await page.clock.install({ time: CLOCK_START });
      await page.clock.pauseAt(CLOCK_PAUSED);
      // Its animation frames and timers run only when the test advances the clock (r10: see frames and steady).
      frozen.add(page);
    }
    try {
      if (routePass && ARRIVE_FROM && ARRIVE_FROM !== route) {
        // The router follows popstate, so this is the client-side navigation a link would make.
        await page.goto(`${base}${ARRIVE_FROM}`, { waitUntil: "networkidle" });
        await page.evaluate((to) => { history.pushState({}, "", to); dispatchEvent(new PopStateEvent("popstate")); }, route);
        await page.waitForFunction((to) => location.pathname === to, route);
        await page.waitForLoadState("networkidle");
        // The arriving route fades in through its transition wrapper, the visible main's direct child: wait
        // until the opacity and transform of main, its ancestors and its children stop changing (three samples
        // 150 ms apart agree), so it is measured settled, as a direct load is. Deeper content, such as a game's
        // moving playfield, is not sampled.
        const sample = () => page.evaluate(() => {
          const main = [...document.querySelectorAll("main")].find((m) => m.checkVisibility());
          if (!main) return "";
          const look = (n) => { const s = getComputedStyle(n); return `${s.opacity}${s.transform}`; };
          const chain = [];
          for (let n = main; n; n = n.parentElement) chain.push(look(n));
          return chain.join() + "|" + [...main.children].map(look).join();
        });
        await settled(page, sample, `${route}: did not settle after client-side arrival from ${ARRIVE_FROM}`);
        // Sections that fade in when first scrolled into view (once) start at opacity 0 after a client-side
        // arrival, though a direct load renders them at once, and the painted pass would skip them. The page is
        // scrolled through in half-viewport steps, instantly, and back to the top, so each has been in view;
        // then every element in main with an inline opacity must hold still (three samples 150 ms apart agree).
        // Pages with a frozen clock animate nothing and are not swept (r10).
        if (!frozen.has(page)) {
          await page.evaluate(async () => {
            const pause = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo({ top: y, behavior: "instant" }); await pause(); }
            scrollTo({ top: 0, behavior: "instant" });
            await pause();
          });
          await settled(page, () => page.evaluate(() => {
            const main = [...document.querySelectorAll("main")].find((m) => m.checkVisibility());
            return `opacity:${main ? [...main.querySelectorAll("[style*='opacity']")].map((n) => getComputedStyle(n).opacity).join() : ""}`;
          }), `${route}: in-view fade-ins did not settle after client-side arrival from ${ARRIVE_FROM}`);
        }
      } else {
        await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      }
      if (routePass) {
        // Lazy images load as they near the viewport and change the page's height, which moved controls from
        // under the pointer and changed scroll positions between runs. Every image is loaded first, and the
        // page's height must hold still before anything is measured.
        await page.evaluate(async () => {
          for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = "eager";
          await Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((done) => {
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          })));
        });
        await page.waitForLoadState("networkidle");
        await settled(page, () => page.evaluate(() => String(document.documentElement.scrollHeight)), `${route}: the page's height did not hold still`);
      }
      await run(page);
    } finally {
      await context.close();
    }
  };

  // Two animation frames. A pointer moved while a scroll is still settling loses its hover moments later, so
  // every hover scrolls first, waits for these frames, and only then moves the pointer (r10).
  // Pages whose clock is frozen produce no frames and run no timers on their own; nothing on them animates, so
  // the waits below return at once there.
  const frozen = new WeakSet();
  const frames = (page) => (frozen.has(page) ? null : page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))));
  // Scrolls an element to the middle of the viewport, instantly (r10). Its scroll position then depends only on
  // the element, never on where the previous step left the page, so both builds capture it alike; the site's
  // smooth scrolling would otherwise animate the scroll. An element in a fixed or sticky container is always in
  // view, and scrolling for it only moves the page beneath it, so it is left where it is.
  // Waits in the page until the opacity and transform of the element, its ancestors and its descendants hold
  // for three samples 16 ms apart (at most 2 s): an element brought into view may start a fade-in (r10). A timer,
  // not animation frames, paces it, because a frame is not always produced.
  const steady = (locator) => (frozen.has(locator.page()) ? null : locator.evaluate(async (el) => {
    const look = () => {
      const parts = [];
      for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); parts.push(s.opacity, s.transform); }
      for (const n of [el, ...el.querySelectorAll("*")]) { const s = getComputedStyle(n); parts.push(s.opacity, s.transform); }
      return parts.join();
    };
    let [last, same] = [look(), 0];
    for (let i = 0; i < 120 && same < 3; i++) {
      await new Promise((done) => setTimeout(done, 16));
      const now = look();
      same = now === last ? same + 1 : 0;
      last = now;
    }
  }));
  const reveal = (locator) => locator.evaluate((el) => {
    for (let n = el; n; n = n.parentElement) if (["fixed", "sticky"].includes(getComputedStyle(n).position)) return;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  });
  // A pointer press is hover and press together: a control that stays :active after losing :hover no longer
  // shows its pressed appearance (a tooltip shown on hover hides, for example), so both must hold.
  const STATE_SELECTOR = { hover: ":hover", focus: ":focus-visible", active: ":active:hover" };

  // Waits until sample() returns the same non-empty value three times, 150 ms apart (at most 9 s).
  const settled = async (page, sample, failure) => {
    let [previous, same] = [await sample(), 0];
    for (let step = 0; step < 60 && same < 2; step++) {
      await page.waitForTimeout(150);
      const next = await sample();
      same = next && next === previous ? same + 1 : 0;
      previous = next;
    }
    if (same < 2) throw new Error(failure);
  };

  // Rendered-ground contrast, for text whose ground the colour stack cannot describe (a gradient, image or
  // backdrop filter below it) and for prepared states. The element's text is hidden, and the pixels behind
  // each text run are compared with that run's own colour (its parent element's); the lowest ratio over all
  // runs is reported, with that run's text. own: only the element's own text runs, not its descendants'.
  // r10, per run: every run is also returned on its own (runs), keyed by the path from the measured element to
  // the run's parent, the run's text and its occurrence among identical paths and texts. The occurrence is
  // numbered over every text node in document order, before any is skipped, so a run keeps its key on every
  // build. exclude: a selector whose nested matches own their runs; those runs are measured there, not here.
  // r10: a run is only its visible part, inside its parent's padding box (never the parent's border) and
  // inside every clipping ancestor, so screen-reader-only text is not measured; outlines are hidden during
  // the capture, so a focus ring is never read as ground. A capture counts only if nothing covers the text and
  // two captures agree (the ground holds still). Otherwise the ratio is null, with the reason. r10 (round 3): a
  // covered or off-screen run is skipped and retried on its own, never failing the element's other runs.
  const HIDE_TEXT = ["", " *", "::before", "::after", " *::before", " *::after"].map((s) => `[data-df-measuring]${s}`).join(", ") +
    " { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; outline-color: transparent !important; }" +
    // While covers are checked, the measured subtree takes pointer events, so that elementFromPoint finds text
    // drawn by a pointer-transparent element (a tooltip) rather than whatever lies beneath it.
    " [data-df-cover], [data-df-cover] * { pointer-events: auto !important; }";
  const decoder = await browser.newPage();
  const RETRY_PLACES = [0.5, 0.3, 0.7];
  // One measurement of an element's runs (r10). only: measure that run alone, scrolled first so that its middle
  // lies at the fraction place of the viewport's height (a retry). Each run is measured over its line boxes, each clipped as above: a run that wraps is
  // never read against the text around it. A run covered or partly off screen is skipped on its own, with its
  // reason; the element's other runs are still measured.
  const probeRuns = (locator, { own, exclude, only, place = 0.5, mark = true }) => locator.evaluate((el, [css, ownOnly, excluded, onlyKey, at, marking]) => {
    if (!document.getElementById("df-measuring")) document.head.append(Object.assign(document.createElement("style"), { id: "df-measuring", textContent: css }));
    const runs = [];
    const skipped = [];
    const nodes = ownOnly ? [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE) : [];
    if (!ownOnly) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
    }
    const seen = {};
    const keyed = nodes.filter((node) => node.textContent.trim()).map((node) => {
      const path = [];
      for (let n = node.parentElement; n && n !== el; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.classList[0] ? `.${n.classList[0]}` : ""));
      const text = node.textContent.trim().replace(/\s+/g, " ").slice(0, 24);
      const base = `${path.join(">")}${path.length ? ">" : ""}"${text}"`;
      seen[base] = (seen[base] || 0) + 1;
      return { node, text, key: seen[base] === 1 ? base : `${base}#${seen[base]}` };
    });
    // The visible line boxes of a run: each of its own boxes, inside its parent's padding box and every
    // clipping ancestor's padding box. A clip that hides all of it (screen-reader-only text) leaves nothing.
    const boxes = (node) => {
      let [cl, ct, cr, cb] = [-Infinity, -Infinity, Infinity, Infinity];
      for (let n = node.parentElement, first = true; n && n !== document.documentElement; n = n.parentElement, first = false) {
        const s = getComputedStyle(n);
        if (s.clip === "rect(0px, 0px, 0px, 0px)" || /^inset\(50%/.test(s.clipPath)) return [];
        if (!first && s.overflowX === "visible" && s.overflowY === "visible") continue;
        const b = n.getBoundingClientRect();
        cl = Math.max(cl, b.left + parseFloat(s.borderLeftWidth));
        ct = Math.max(ct, b.top + parseFloat(s.borderTopWidth));
        cr = Math.min(cr, b.right - parseFloat(s.borderRightWidth));
        cb = Math.min(cb, b.bottom - parseFloat(s.borderBottomWidth));
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()]
        .map((r) => ({ left: Math.max(r.left, cl), top: Math.max(r.top, ct), right: Math.min(r.right, cr), bottom: Math.min(r.bottom, cb) }))
        .filter((r) => r.right - r.left >= 1 && r.bottom - r.top >= 1);
    };
    const name = (hit) => `${hit.tagName.toLowerCase()}${[...hit.classList].map((c) => `.${c}`).join("")}`;
    el.setAttribute("data-df-cover", "");
    for (const { node, text, key } of keyed) {
      if (onlyKey !== null && key !== onlyKey) continue;
      // Text that renders nothing (an ancestor at opacity 0 or visibility hidden) is not measured, nor is
      // creative text inside a governed element measured as part of it (r10).
      if (!node.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      if (node.parentElement.closest("[data-df-region]") && !el.closest("[data-df-region]")) continue;
      // A run that a nested measured element owns is measured there, never twice (r10).
      if (excluded) {
        const owner = node.parentElement.closest(excluded);
        if (owner && owner !== el && el.contains(owner)) continue;
      }
      if (onlyKey !== null) {
        // A retry: the run itself goes to its place in the viewport, instantly.
        const all = boxes(node);
        if (all.length) {
          const [top, bottom] = [Math.min(...all.map((r) => r.top)), Math.max(...all.map((r) => r.bottom))];
          window.scrollBy({ top: (top + bottom) / 2 - innerHeight * at, behavior: "instant" });
        }
      }
      let parts = boxes(node);
      if (!parts.length) continue;
      // Read before the text is hidden: computed styles are live.
      const color = getComputedStyle(node.parentElement).color;
      if (parts.some((r) => r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)) { skipped.push({ key, text, reason: "partly off screen" }); continue; }
      const points = [[0.5, 0.5], [0.05, 0.1], [0.95, 0.1], [0.05, 0.9], [0.95, 0.9]];
      let cover;
      for (const r of parts) {
        cover = points.map(([fx, fy]) => document.elementFromPoint(r.left + (r.right - r.left) * fx, r.top + (r.bottom - r.top) * fy)).find((hit) => !hit || !el.contains(hit));
        if (cover !== undefined) break;
      }
      if (cover !== undefined) { skipped.push({ key, text, reason: cover ? `covered by ${name(cover)}` : "off screen" }); continue; }
      parts = parts.map((r) => { const [x, y] = [Math.ceil(r.left), Math.ceil(r.top)]; return { x, y, width: Math.floor(r.right) - x, height: Math.floor(r.bottom) - y }; }).filter((c) => c.width >= 1 && c.height >= 1);
      const centre = parts[0] && { x: parts[0].x + parts[0].width / 2, y: parts[0].y + parts[0].height / 2 };
      if (parts.length) runs.push({ color, crops: parts, text, key, centre });
    }
    el.removeAttribute("data-df-cover");
    if (!runs.length && !skipped.length) return { reason: "no rendered text" };
    if (!runs.length || !marking) return { runs, skipped, y: Math.round(scrollY) };
    el.setAttribute("data-df-measuring", "");
    // One capture of the viewport region that holds every run's boxes; crops are relative to it.
    const crops = runs.flatMap((r) => r.crops);
    const region = { x: Math.min(...crops.map((c) => c.x)), y: Math.min(...crops.map((c) => c.y)) };
    region.width = Math.max(...crops.map((c) => c.x + c.width)) - region.x;
    region.height = Math.max(...crops.map((c) => c.y + c.height)) - region.y;
    for (const c of crops) { c.x -= region.x; c.y -= region.y; }
    return { runs, skipped, region, y: Math.round(scrollY) };
  }, [HIDE_TEXT, own, exclude, only, place, mark]);
  // Captures the region twice (the ground must hold still) and measures every pixel of each run's boxes.
  const captureRuns = async (page, locator, probe) => {
    let png = null;
    for (let attempt = 0; attempt < 3 && !png; attempt++) {
      const first = await page.screenshot({ clip: probe.region, animations: "disabled", scale: "css" });
      const second = await page.screenshot({ clip: probe.region, animations: "disabled", scale: "css" });
      if (first.equals(second)) png = first;
      else await page.waitForTimeout(100);
    }
    await locator.evaluate((el) => el.removeAttribute("data-df-measuring"));
    if (!png) return null;
    return decoder.evaluate(async ([data, runs, y]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const lum = (r, g, b) => { const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      return runs.map(({ color, crops, text, key }) => {
        let lowest = Infinity;
        let worst = null;
        const parts = color.match(/\(([^)]+)\)/)[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        const srgb = color.startsWith("color(") ? parts.slice(1) : parts.map((v, i) => (i < 3 ? v / 255 : v));
        const [fr, fg, fb, fa = 1] = srgb;
        for (const { x, y: top, width, height } of crops) {
          const pixels = context.getImageData(x, top, width, height).data;
          for (let i = 0; i < pixels.length; i += 4) {
            const [br, bg, bb] = [pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255];
            const [hi, lo] = [lum(fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa)), lum(br, bg, bb)].sort((a, b) => b - a);
            const value = (hi + 0.05) / (lo + 0.05);
            if (value < lowest) [lowest, worst] = [value, [pixels[i], pixels[i + 1], pixels[i + 2]]];
          }
        }
        return { key, text, ratio: Math.round(lowest * 100) / 100, fg: color, ground: `rgb(${worst.join(", ")})`, size: crops.map((c) => `${c.width}x${c.height}`).join("+"), y };
      });
    }, [png.toString("base64"), probe.runs, probe.y]);
  };
  // r10, per run: a run skipped as covered or partly off screen is retried on its own when the caller can
  // re-enter its state (enter: { reset, at(x, y), held }; the rest state re-enters trivially): the run is
  // scrolled so that its middle lies at the middle of the viewport, then at 30% and at 70% of its height (a
  // fixed element, such as the section dots, may sit at the middle), the state is entered on the run itself,
  // and the run is measured alone, its state verified after the capture. A run that still cannot be measured
  // keeps its own reason. Every build tries the same places in the same order.
  const renderedContrast = async (page, locator, { own = false, exclude = null, enter = null } = {}) => {
    await reveal(locator);
    await steady(locator);
    const probe = await probeRuns(locator, { own, exclude, only: null });
    if (probe.reason) return { ratio: null, reason: probe.reason };
    const runs = probe.runs.length ? await captureRuns(page, locator, probe) : [];
    if (!runs) return { ratio: null, reason: "ground does not hold still" };
    const held = enter && (await enter.held());
    if (held) return { ratio: null, reason: held };
    const skipped = [];
    for (const miss of probe.skipped) {
      let reason = miss.reason;
      for (const place of RETRY_PLACES) {
        if (!enter || !reason) break;
        await enter.reset();
        await probeRuns(locator, { own, exclude, only: miss.key, place, mark: false });
        await frames(page);
        await steady(locator);
        const again = await probeRuns(locator, { own, exclude, only: miss.key, place, mark: false });
        const run = again.runs?.[0];
        if (!run) { reason = again.skipped?.[0]?.reason ?? again.reason ?? "no rendered text"; continue; }
        reason = await enter.at(run.centre.x, run.centre.y);
        if (reason) continue;
        const settledProbe = await probeRuns(locator, { own, exclude, only: miss.key, place });
        if (!settledProbe.runs?.length) { reason = settledProbe.skipped?.[0]?.reason ?? settledProbe.reason ?? "no rendered text"; continue; }
        const measuredRun = await captureRuns(page, locator, settledProbe);
        reason = measuredRun ? await enter.held() : "ground does not hold still";
        if (!reason) runs.push(measuredRun[0]);
      }
      if (reason) skipped.push({ key: miss.key, text: miss.text, reason });
    }
    if (!runs.length) return { ratio: null, reason: skipped[0].reason, runs, skipped, y: probe.y };
    const lowest = runs.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    return { ratio: lowest.ratio, run: lowest.text, runs, ...(skipped.length ? { skipped } : {}), y: probe.y };
  };
  // The rest state re-enters trivially: nothing to reset, enter or hold.
  const AT_REST = { reset: async () => {}, at: async () => null, held: async () => null };

  // WCAG 2 contrast against the composited background-colour stack. A sampler: canvases and iframes
  // under text are not seen, and on a colour stack only the element's own colour is compared. Where a
  // background image or gradient lies under the text, the colour stack cannot describe the ground, so the
  // element is measured against the rendered pixels instead, run by run (null, with a reason, when that is
  // impossible). Elements inside [data-df-region] are creative content, reported apart from the interface.
  // painted (the text pass, r10): every other element with its own text, so that no rendered text is
  // skipped: nested text inside a sampler match included. Each text occurrence is measured once: an element
  // the sampler matched is measured there; inside a match measured on rendered pixels, every run already was;
  // inside a match measured on its colour stack, a descendant is skipped only when it has the match's colour
  // and ground (the match's result is that text). The rest is measured in its own colour: on its colour stack
  // or, on a painted ground, on rendered pixels. Either way it is check "text" (r10); a rendered result's
  // detail says "(rendered ground)".
  const contrastOf = async (page, selector, { all = true, rendered = false, painted = false, enter = AT_REST } = {}) => {
    const results = await page.evaluate(([sel, every, forceRendered, paintedPass, sampled]) => {
      const parse = (value) => {
        let m = value.match(/^rgba?\(([^)]+)\)$/);
        if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p[3] ?? 1 }; }
        m = value.match(/^color\(srgb ([^)]+)\)$/);
        if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
        return null;
      };
      const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
      const lum = ({ r, g, b }) => { const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      // null when the ground is painted: a background image lies under the text before any opaque colour.
      const ground = (el) => {
        const layers = [];
        for (let n = el; n; n = n.parentElement) {
          const style = getComputedStyle(n);
          if (style.backgroundImage !== "none") return null;
          const c = parse(style.backgroundColor);
          if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
        }
        let out = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 1, g: 1, b: 1, a: 1 };
        while (layers.length) out = over(layers.pop(), out);
        return out;
      };
      const found = [];
      // Element identity (r10): name and text, numbered over the elements this call can measure, in page order,
      // before any skip that depends on colour, so the n-th identical element pairs with the n-th on every build.
      const seen = {};
      for (const el of document.querySelectorAll(sel)) {
        if (!el.checkVisibility?.() || !el.textContent.trim()) continue;
        const region = Boolean(el.closest("[data-df-region]"));
        if (region && !every) continue;
        if (paintedPass) {
          const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
          if (!own || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName) || el.matches(sampled)) continue;
          if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          // Screen-reader-only text renders nothing: a box of at most one pixel, or a clip that hides all of it.
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (box.width * box.height <= 1 || style.clip === "rect(0px, 0px, 0px, 0px)" || /^inset\(50%/.test(style.clipPath)) continue;
        }
        const text = (paintedPass ? [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(" ") : el.textContent).trim().replace(/\s+/g, " ").slice(0, 30);
        const name = el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : "");
        const base = paintedPass ? `${name}|${text}` : text;
        seen[base] = (seen[base] || 0) + 1;
        const key = seen[base] === 1 ? base : `${base}#${seen[base]}`;
        if (paintedPass) {
          const host = el.parentElement?.closest(sampled);
          // Text inside a creative region is measured and reported as creative, never dropped (r10).
          if (host && !region) {
            const [hostGround, ownGround] = [ground(host), ground(el)];
            if (!hostGround) continue;
            const same = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 1 / 255;
            if (ownGround && getComputedStyle(el).color === getComputedStyle(host).color && same(ownGround, hostGround)) continue;
          }
        }
        const bg = forceRendered ? null : ground(el);
        let ratio = null;
        if (bg) {
          const fg = over(parse(getComputedStyle(el).color), bg);
          const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
          ratio = Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
        } else {
          el.setAttribute("data-df-probe", String(found.length));
        }
        const colour = (c) => (c ? `rgb(${[c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(", ")})` : null);
        // On a colour stack, the element's own text runs share its result; they take the keys a rendered
        // measurement gives them, so a run pairs across builds even if a repair changes how its ground is measured.
        const ownRuns = [];
        if (bg) {
          const runSeen = {};
          for (const node of el.childNodes) {
            if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
            const runText = node.textContent.trim().replace(/\s+/g, " ").slice(0, 24);
            runSeen[runText] = (runSeen[runText] || 0) + 1;
            ownRuns.push({ key: runSeen[runText] === 1 ? `"${runText}"` : `"${runText}"#${runSeen[runText]}`, text: runText, ratio, fg: getComputedStyle(el).color, ground: colour(bg), size: null });
          }
        }
        found.push({ text: key, ratio, region, rendered: !bg, disabled: el.matches(":disabled"), fg: getComputedStyle(el).color, ground: colour(bg), y: Math.round(scrollY), ...(ownRuns.length ? { runs: ownRuns } : {}) });
        if (!every) break;
      }
      return found;
    }, [selector, all, rendered, painted, SAMPLER_SELECTORS.join(", ")]);
    for (const [index, result] of results.entries()) {
      if (result.rendered) Object.assign(result, await renderedContrast(page, page.locator(`[data-df-probe="${index}"]`), { own: painted, exclude: painted ? null : SAMPLER_SELECTORS.join(", "), enter }));
    }
    await page.evaluate(() => document.querySelectorAll("[data-df-probe]").forEach((el) => el.removeAttribute("data-df-probe")));
    return results;
  };

  // Interaction pass (r10): every enabled control with text, outside creative regions, hovered, focused
  // (focus-visible) and pressed, each state verified and measured on rendered pixels over all its text runs,
  // nested ones included. Transitions are off, so a state renders at once. A covered control is never
  // entered; it and any state that cannot be entered are listed as unmeasured, with the reason. A press is
  // released away from the control, so nothing is activated; a navigation fails the test.
  const CONTROLS = 'a[href], button, [role="button"], summary, input[type="submit"], input[type="button"], input[type="reset"]';
  const interactions = async (page) => {
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    const start = page.url();
    const controls = await page.evaluate((sel) => {
      const seen = {};
      return [...document.querySelectorAll(sel)].flatMap((el, i) => {
        if (!el.checkVisibility?.() || !el.textContent.trim() || el.closest("[data-df-region]") || el.matches(":disabled") || el.parentElement?.closest(sel)) return [];
        el.setAttribute("data-df-control", String(i));
        const base = `${el.tagName.toLowerCase()}|${el.textContent.trim().replace(/\s+/g, " ").slice(0, 30)}`;
        seen[base] = (seen[base] || 0) + 1;
        return [{ i, key: `${base}#${seen[base]}` }];
      });
    }, CONTROLS);
    const results = [];
    for (const { i, key } of controls) {
      const control = page.locator(`[data-df-control="${i}"]`);
      for (const state of ["hover", "focus", "active"]) {
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement?.blur?.());
        let reason = null;
        let pressed = false;
        let measuredState = null;
        // Enters the state with the pointer at (x, y), inside the control, and verifies it.
        const enterAt = async (x, y) => {
          if (state === "focus") {
            await control.evaluate((el) => el.focus({ focusVisible: true }));
            await frames(page);
            return (await control.evaluate((el) => el.matches(":focus-visible"))) ? null : "not focusable";
          }
          await page.mouse.move(x, y);
          if (state === "active") { await page.mouse.down(); pressed = true; }
          await frames(page);
          return (await control.evaluate((el, s) => el.matches(s), STATE_SELECTOR[state])) ? null : `not ${state}`;
        };
        const coverAt = (x, y) => page.evaluate(([px, py, index]) => {
          const hit = document.elementFromPoint(px, py);
          if (!hit) return "off screen";
          return document.querySelector(`[data-df-control="${index}"]`).contains(hit) ? null : `covered by ${hit.tagName.toLowerCase()}${[...hit.classList].map((c) => `.${c}`).join("")}`;
        }, [x, y, i]);
        // A run retried on its own (r10): the state is left, then entered again on the run itself.
        const enter = {
          reset: async () => {
            await page.mouse.move(0, 0);
            if (pressed) { await page.mouse.up(); pressed = false; }
            await page.evaluate(() => document.activeElement?.blur?.());
          },
          at: async (x, y) => (await coverAt(x, y)) ?? enterAt(x, y),
          held: async () => ((await control.evaluate((el, s) => el.matches(s), STATE_SELECTOR[state])) ? null : `${state} not held`),
        };
        // A state that does not take, or does not hold through its capture, is retried (r10): a settling scroll
        // or a late layout shift can take the control from under the pointer. Only a state that fails three
        // times is unmeasured; a press is released away first.
        for (let attempt = 0; attempt < 3 && (attempt === 0 || reason); attempt++) {
          if (pressed) { await page.mouse.move(0, 0); await page.mouse.up(); pressed = false; }
          reason = null;
          try {
            await reveal(control);
            await frames(page);
            // r10: the control is entered at the first point inside it that nothing covers: the middle of its
            // box, then of each of its line boxes, then of each of its text runs' boxes. A link that wraps may
            // have no text at the middle of its box.
            const point = await page.evaluate((index) => {
              const el = document.querySelector(`[data-df-control="${index}"]`);
              const candidates = [el.getBoundingClientRect(), ...el.getClientRects()];
              const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
              for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                if (!n.textContent.trim()) continue;
                const range = document.createRange();
                range.selectNodeContents(n);
                candidates.push(...range.getClientRects());
              }
              let first = null;
              for (const r of candidates) {
                if (r.width < 1 || r.height < 1) continue;
                const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
                const hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
                if (hit && el.contains(hit)) return { x, y };
                first ??= hit ? `covered by ${hit.tagName.toLowerCase()}${[...hit.classList].map((c) => `.${c}`).join("")}` : "off screen";
              }
              return { reason: first ?? "off screen" };
            }, i);
            // A state's script-driven styles (a scale on hover or press) apply on a later animation frame, so
            // the state settles two frames before it is checked and captured.
            reason = point.reason ?? (await enterAt(point.x, point.y));
          } catch {
            reason = `could not enter ${state}`;
          }
          if (!reason) {
            // The state is verified again after the capture, inside the measurement, before any run is retried.
            // A measurement that found no rendered text, or a ground that would not hold still, is retried too: a
            // section scrolled into view may still be fading in (r10).
            measuredState = await renderedContrast(page, control, { enter });
            if (measuredState.reason && !measuredState.skipped) reason = measuredState.reason;
          }
        }
        const result = reason ? { ratio: null, reason } : measuredState;
        results.push({ key, state, ...result });
        await page.mouse.move(0, 0);
        if (pressed) await page.mouse.up();
        if (page.url() !== start) throw new Error(`interaction pass: ${key}:${state} navigated to ${page.url()}`);
      }
    }
    await page.evaluate(() => document.querySelectorAll("[data-df-control]").forEach((el) => el.removeAttribute("data-df-control")));
    return results;
  };

  // Header backdrop (r10): the header is translucent, so the ground of its text depends on what is scrolled
  // behind it. Its worst ground is the header over the page colour farthest from its text: black under Light's
  // dark text, white under Dark's (and Mono's) light text. Everything else stops painting, over that page. On
  // BACKDROP_ROUTES every visible header control with text is measured at rest, hovered,
  // focused (focus-visible) and pressed, each state verified, on rendered pixels over all its text runs; a
  // press is released away.
  const BACKDROP_ROUTES = ["/projects"];
  const backdrop = async (page, theme) => {
    const [page_, rgb] = theme === "light" ? ["#000", "rgb(0, 0, 0)"] : ["#fff", "rgb(255, 255, 255)"];
    const style = await page.addStyleTag({ content: `html, body { background: ${page_} !important; } body * { visibility: hidden !important; } .site-header, .site-header * { visibility: visible !important; }` });
    // The backdrop must be in force: the theme's worst page colour with the content hidden (checked in check mode).
    invariant(await page.evaluate((expected) => getComputedStyle(document.body).backgroundColor === expected && getComputedStyle(document.querySelector("main")).visibility === "hidden", rgb),
      `header backdrop: the page around the header is not hidden over ${page_}`);
    const controls = await page.evaluate(() => {
      const seen = {};
      return [...document.querySelectorAll(".site-header a[href], .site-header button")].flatMap((el, i) => {
        if (!el.checkVisibility() || !el.textContent.trim()) return [];
        el.setAttribute("data-df-backdrop", String(i));
        const base = `${el.tagName.toLowerCase()}|${el.textContent.trim().replace(/\s+/g, " ").slice(0, 30)}`;
        seen[base] = (seen[base] || 0) + 1;
        return [{ i, key: `${base}#${seen[base]}` }];
      });
    });
    const at = async (locator) => { const box = await locator.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); };
    const results = [];
    for (const { i, key } of controls) {
      const control = page.locator(`[data-df-backdrop="${i}"]`);
      for (const [state, enter] of [["rest"], ["hover", at], ["focus", (l) => l.evaluate((el) => el.focus({ focusVisible: true }))], ["active", async (l) => { await at(l); await page.mouse.down(); return true; }]]) {
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement?.blur?.());
        const pressed = await enter?.(control);
        await frames(page);
        const entered = state === "rest" || (await control.evaluate((el, s) => el.matches(s), STATE_SELECTOR[state]));
        results.push({ key: `${key}:${state}`, ...(entered ? await renderedContrast(page, control) : { ratio: null, reason: `not ${state}` }) });
        await page.mouse.move(0, 0);
        if (pressed) await page.mouse.up();
      }
    }
    await page.evaluate(() => document.querySelectorAll("[data-df-backdrop]").forEach((el) => el.removeAttribute("data-df-backdrop")));
    await style.evaluate((el) => el.remove());
    return results;
  };

  const detail = ({ ratio, rendered, disabled, run }) => `${ratio}:1${rendered ? " (rendered ground)" : ""}${disabled ? " (disabled)" : ""}${run ? ` [${run}]` : ""}`;
  // Recording (r10): every measurement goes into the inventory, keyed by check, theme, route, element and, on
  // rendered pixels, text run, so each run is compared with its own baseline value, never hidden behind another
  // run's. Creative and inactive results are filed apart. An id recorded twice is a pairing defect.
  const newSink = () => ({ measured: {}, regressions: [], creative: [], inactive: [], unmeasured: [], duplicates: [] });
  const SINK = { measured, regressions, creative, inactive, unmeasured, duplicates };
  const record = (check, theme, route, key, result, { limit = 4.5, sink = SINK } = {}) => {
    const base = `${check}|${theme}|${route}|${key}`;
    const kind = result.region ? "creative" : result.disabled ? "inactive" : null;
    const items = result.runs || result.skipped
      ? [...(result.runs ?? []).map((r) => ({ id: `${base}|${r.key}`, value: r.ratio, fg: r.fg, ground: r.ground, setup: `${r.size ?? ""}@${r.y ?? result.y}`, detail: detail({ ratio: r.ratio, rendered: result.rendered !== false, disabled: result.disabled, run: r.text }) })),
        ...(result.skipped ?? []).map((r) => ({ id: `${base}|${r.key}`, reason: r.reason }))]
      : result.ratio === null ? [{ id: base, reason: result.reason }]
      : [{ id: base, value: result.ratio, fg: result.fg, ground: result.ground, setup: `@${result.y}`, detail: detail(result) }];
    for (const item of items) {
      const id = kind === "creative" || (kind === "inactive" && !item.reason) ? item.id.replace(/^[a-z]+/, kind) : item.id;
      if (sink.measured[id]) sink.duplicates.push(id);
      const failing = !kind && !item.reason && item.value < limit;
      sink.measured[id] = item.reason ? { reason: item.reason }
        : { value: item.value, fg: item.fg, ground: item.ground, setup: item.setup, ...(failing ? { failing } : {}), ...(limit !== 4.5 ? { limit } : {}) };
      if (kind === "creative") sink.creative.push({ id, detail: item.detail ?? `null:1 (${item.reason})`, value: item.value ?? null });
      else if (item.reason) sink.unmeasured.push({ id, reason: item.reason });
      else if (kind === "inactive") sink.inactive.push({ id, detail: item.detail, value: item.value });
      else if (failing) sink.regressions.push({ id, detail: item.detail, value: item.value });
    }
  };
  // Per-run comparison (r10), for check mode and the measurement controls: the baseline's failing runs
  // (entries, with their baseline values) against every measurement of this build. fresh: fails here only.
  // worse: fails on both, more than 0.05 lower here. stale: measured here and passing. missing: not measured
  // here at all, so it cannot be paired.
  const compareRuns = (entries, current, inScope = () => true) => {
    const known = new Map(entries.map((e) => [e.id, e]));
    const failing = Object.entries(current).filter(([, m]) => m.failing);
    return {
      fresh: failing.filter(([id]) => !known.has(id)).map(([id]) => id),
      worse: failing.filter(([id, m]) => known.has(id) && m.value < known.get(id).baseline - 0.05).map(([id]) => id),
      stale: entries.filter((e) => inScope(e.id) && current[e.id] && !current[e.id].reason && !current[e.id].failing).map((e) => e.id),
      missing: entries.filter((e) => inScope(e.id) && !current[e.id]).map((e) => e.id),
    };
  };

  for (const theme of THEMES) {
    for (const route of ROUTES) {
      await withPage({ theme, route, routePass: true }, async (page) => {
        ran.add(`contrast|${theme}|${route}`);
        ran.add(`pair|${theme}|${route}`);
        ran.add(`text|${theme}|${route}`);
        ran.add(`interact|${theme}|${route}`);
        if (BACKDROP_ROUTES.includes(route)) ran.add(`backdrop|${theme}|${route}`);
        for (const selector of SAMPLER_SELECTORS) {
          for (const result of await contrastOf(page, selector)) {
            if (result.region) regions[`${theme}|${route}`] = (regions[`${theme}|${route}`] || 0) + 1;
            record("contrast", theme, route, `${selector}|${result.text}`, result);
          }
        }
        for (const result of await contrastOf(page, "body *", { painted: true })) {
          if (result.region) regions[`${theme}|${route}`] = (regions[`${theme}|${route}`] || 0) + 1;
          record("text", theme, route, result.text, result);
        }
        // Transitions off before any hover (r10): a hover measured mid-transition depends on timing.
        await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
        for (const pair of PAIRS) {
          const target = page.locator(pair.selector).first();
          if (!(await target.count()) || !(await target.isVisible())) continue;
          uncovered.delete(pair.selector);
          // A hover is verified before it is measured (r10): a late layout shift can move the element from under
          // the pointer. It is retried, and a hover that never holds is unmeasured, never passed.
          // It must still hold after the measurement, or both are retried.
          const key = `${pair.selector}${pair.hover ? ":hover" : ""}`;
          let [hovered, result] = [!pair.hover, null];
          for (let attempt = 0; attempt < 3; attempt++) {
            if (pair.hover) {
              await reveal(target);
              await frames(page);
              const box = await target.boundingBox();
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await frames(page);
              hovered = await target.evaluate((el) => el.matches(":hover"));
              if (!hovered) continue;
            }
            // A hover pair is not retried at rest (r10): a skipped run of it stays unmeasured, with its reason.
            [result] = await contrastOf(page, pair.selector, { all: false, rendered: pair.rendered, enter: pair.hover ? null : AT_REST });
            if (!pair.hover || (await target.evaluate((el) => el.matches(":hover")))) break;
            [hovered, result] = [false, null];
          }
          if (!hovered) { record("pair", theme, route, key, { ratio: null, reason: "not hover" }); continue; }
          if (result) record("pair", theme, route, key, result, { limit: pair.min ?? 4.5 });
        }
        if (MODE === "check" && route === "/") {
          const state = await page.evaluate(() => ({
            theme: document.documentElement.dataset.theme,
            body: getComputedStyle(document.body).backgroundColor,
            inline: [...document.documentElement.style].map((name) => [name, document.documentElement.style.getPropertyValue(name)]),
          }));
          const leaked = unexpectedInline(state.inline);
          invariant(state.theme === theme, `${theme}: data-theme is ${state.theme}`);
          invariant(state.body === FIELD[theme], `${theme}: page ground ${state.body} is not Darkfield field`);
          invariant(leaked.length === 0, `${theme}: unexpected inline custom properties on <html>: ${leaked.map(([name, value]) => `${name}: ${value}`).join("; ")}`);
        }
        for (const result of await interactions(page)) record("interact", theme, route, `${result.key}:${result.state}`, result);
        // Last on the route: it hides the page around the header.
        if (BACKDROP_ROUTES.includes(route)) {
          for (const result of await backdrop(page, theme)) record("backdrop", theme, route, result.key, result);
        }
      });
    }
    for (const state of STATES) {
      await withPage({ theme, route: state.route, clock: state.clock }, async (page) => {
        ran.add(`state|${theme}|${state.route}`);
        await state.prepare(page);
        await page.mouse.move(0, 0);
        for (const selector of state.texts ?? []) {
          const texts = page.locator(selector);
          for (let i = 0; i < (await texts.count()); i++) {
            const label = (await texts.nth(i).textContent()).trim().replace(/\s+/g, " ").slice(0, 30);
            record("state", theme, state.route, `${label}:prepared`, await renderedContrast(page, texts.nth(i)));
          }
        }
        const controls = page.locator(state.controls);
        const count = await controls.count();
        if (!count) throw new Error(`${state.route}: no ${state.controls}`);
        for (let i = 0; i < count; i++) {
          const control = controls.nth(i);
          const label = (await control.textContent()).trim().replace(/\s+/g, " ").slice(0, 30);
          for (const [name, enter] of Object.entries(state.states)) {
            const exit = await enter(page, control);
            record("state", theme, state.route, `${label}:${name}`, await renderedContrast(page, control));
            if (exit) await exit();
          }
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
    // Controls for the inline-property invariant: the rendered layout properties pass, and each injected
    // property is rejected (a legacy theme variable, a Darkfield token, an unknown name, non-length values).
    await withPage({ theme: "dark" }, async (page) => {
      const read = () => page.evaluate(() => [...document.documentElement.style].map((name) => [name, document.documentElement.style.getPropertyValue(name)]));
      const rendered = await read();
      const accepted = rendered.some(([name]) => INLINE_LAYOUT.includes(name)) && unexpectedInline(rendered).length === 0;
      invariant(accepted, "inline-property control: the rendered layout properties are not accepted");
      const injected = [
        ["--app-bg", "#1a1a1a"], ["--field", "#000000"], ["--darkfield-probe", "1px"],
        ["--dock-icon-size", "#ff0000"], ["--site-dock-safe-space", "var(--field)"],
      ];
      await page.evaluate((list) => list.forEach(([name, value]) => document.documentElement.style.setProperty(name, value)), injected);
      const rejected = unexpectedInline(await read()).map(([name]) => name).sort();
      const expected = injected.map(([name]) => name).sort();
      invariant(JSON.stringify(rejected) === JSON.stringify(expected), `inline-property control: rejected ${rejected.join(", ") || "nothing"}`);
    });
    // Navigation-independent game colours (r9). A lazily loaded page stylesheet stays attached after
    // client-side navigation, so a variable it defines on :root or [data-theme] reaches every later route.
    // Each game is reached by direct load and by client-side paths; on each, <html> must not define
    // --terminal-primary, and the game's probes must read the colours of its direct load. The probes are
    // Spider's card ranks (native) and buttons (page chrome) and Snake's score (a D6 confirm row).
    const GAMES = { spider: [".spider-card-rank", ".spider-button"], snake: [".game-score"] };
    // A page counts as reached once its own content renders, which is after its stylesheet has loaded.
    const READY = { "/projects": ".projects-container", "/simulations": ".simulation-preview", "/terminal": "input.command-input:visible" };
    const follow = async (page, href) => {
      await page.locator(`a[href="${href}"]:visible`).first().click();
      await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === href);
      if (READY[href]) await page.locator(READY[href]).first().waitFor();
      await page.waitForLoadState("networkidle");
    };
    const cd = async (page, path) => {
      const input = page.locator("input.command-input:visible").first();
      await input.fill(`cd ${path}`);
      await input.press("Enter");
      await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === `/${path}`);
      await page.waitForLoadState("networkidle");
    };
    const NAVIGATION = [
      { name: "direct", start: (game) => `/simulations/${game}` },
      { name: "/games alias", start: (game) => `/games/${game}` },
      { name: "/simulations, card", start: () => "/simulations", go: (page, game) => follow(page, `/simulations/${game}`) },
      { name: "/projects, /simulations, card", start: () => "/projects", go: async (page, game) => { await follow(page, "/simulations"); await follow(page, `/simulations/${game}`); } },
      { name: "/terminal, cd", start: () => "/terminal", go: (page, game) => cd(page, `simulations/${game}`) },
      { name: "/projects, /terminal, cd", start: () => "/projects", go: async (page, game) => { await follow(page, "/terminal"); await cd(page, `simulations/${game}`); } },
      { name: "/simulations, /terminal, cd", start: () => "/simulations", go: async (page, game) => { await follow(page, "/terminal"); await cd(page, `simulations/${game}`); } },
      { name: "game, /projects, Back", start: (game) => `/simulations/${game}`, go: async (page) => { await follow(page, "/projects"); await page.goBack({ waitUntil: "networkidle" }); } },
    ];
    for (const theme of THEMES) {
      for (const [game, probes] of Object.entries(GAMES)) {
        let direct = null;
        for (const path of NAVIGATION) {
          await withPage({ theme, route: path.start(game) }, async (page) => {
            if (path.go) await path.go(page, game);
            await page.locator(probes[0]).first().waitFor();
            const seen = await page.evaluate((selectors) => ({
              at: location.pathname.replace(/\/$/, ""),
              root: getComputedStyle(document.documentElement).getPropertyValue("--terminal-primary").trim(),
              colors: selectors.map((s) => (document.querySelector(s) ? getComputedStyle(document.querySelector(s)).color : "absent")).join(" "),
            }), probes);
            direct ??= seen.colors;
            const label = `${theme} ${game} via ${path.name}`;
            invariant(seen.at === `/simulations/${game}`, `${label}: arrived at ${seen.at}`);
            invariant(seen.root === "", `${label}: <html> defines --terminal-primary: ${seen.root}`);
            invariant(!seen.colors.includes("absent") && seen.colors === direct, `${label}: ${seen.colors}; direct load: ${direct}`);
          });
        }
      }
      // The Projects tech-stack modal is portaled outside .projects-container (r9). It must read the page's
      // scoped value, so the modal renders as the page does.
      await withPage({ theme, route: "/projects" }, async (page) => {
        await page.getByTitle("View technical coverage").click();
        const modal = await page.locator(".tech-stack-modal").evaluate((el) => {
          const scope = document.querySelector(".projects-container");
          const value = (node) => getComputedStyle(node).getPropertyValue("--terminal-primary").trim();
          return {
            portaled: !scope.contains(el), modal: value(el), page: value(scope),
            name: getComputedStyle(el.querySelector(".tech-name")).color,
            eyebrow: getComputedStyle(scope.querySelector(".projects-eyebrow")).color,
          };
        });
        invariant(modal.portaled, `${theme}: the tech-stack modal is not portaled; this check no longer tests the portal`);
        invariant(modal.page !== "" && modal.modal === modal.page && modal.name === modal.eyebrow,
          `${theme}: tech-stack modal ${modal.modal} / ${modal.name}; page ${modal.page} / ${modal.eyebrow}`);
      });
    }
    // Measurement controls (r10): the contrast passes, run on a fixture with known answers, so that a pass
    // that stops measuring nested text, interaction states or inactive controls, or that reads borders,
    // outlines or screen-reader-only text as ground, fails here.
    const FIXTURE = `<!doctype html><style>
      body { margin: 0; background: #ffffff; color: #000000; font: 16px/1.5 sans-serif; }
      main { display: grid; gap: 24px; padding: 24px; justify-items: start; }
      a, button { display: inline-block; padding: 8px 12px; color: #000000; background: #ffffff; text-decoration: none; font: inherit; }
      .gradient { display: inline-block; padding: 4px 8px; color: #ffffff; background: linear-gradient(90deg, #ffffff, #d0d0d0); }
      .solid { display: inline-block; padding: 4px 8px; color: #777777; background: #888888; }
      .shade { color: #111111; }
      .worse:hover .label, .worse:focus-visible .label, .worse:active .label { color: #eeeeee; }
      .framed { border: 6px solid #000000; outline: 4px solid #000000; outline-offset: -16px; padding: 0 4px; line-height: 2; position: relative; }
      .sr-only { color: #eeeeee; position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
      button:disabled { color: #999999; background: #aaaaaa; border: 0; }
    </style><main>
      <a href="#a">Card A <span class="gradient">Gradient label</span></a>
      <a href="#b">Card B <span class="solid">Solid label</span></a>
      <a href="#c" class="worse"><span class="label">Hover worse</span></a>
      <a href="#d"><span class="shade">Passing nested</span></a>
      <a href="#e"><span>Same colour and ground</span></a>
      <a href="#f" class="framed">Framed<span class="sr-only"> for the fixture (opens in a new tab)</span></a>
      <button disabled>Disabled control</button>
    </main>`;
    await withPage({ theme: "dark" }, async (page) => {
      await page.setContent(FIXTURE);
      const sampled = [...(await contrastOf(page, "a")), ...(await contrastOf(page, "button"))];
      const texts = await contrastOf(page, "body *", { painted: true });
      const states = await interactions(page);
      const text = (label) => texts.filter((r) => r.text.endsWith(`|${label}`));
      const state = (label, name) => states.find((r) => r.key.startsWith(`a|${label}`) && r.state === name);
      const control = (ok, message) => invariant(ok, `measurement control: ${message}`);
      control(text("Gradient label").length === 1 && text("Gradient label")[0].rendered && text("Gradient label")[0].ratio < 4.5, "a failing nested label on a gradient is not detected");
      control(text("Solid label").length === 1 && !text("Solid label")[0].rendered && text("Solid label")[0].ratio < 4.5, "a failing nested label on a solid ground is not detected");
      const rest = sampled.find((r) => r.text === "Hover worse");
      control(rest?.ratio >= 4.5 && ["hover", "focus", "active"].every((name) => state("Hover worse", name)?.ratio < 4.5), "a state that worsens while the rest state passes is not detected");
      control(text("Passing nested").length === 1 && Math.abs(text("Passing nested")[0].ratio - 18.88) <= 0.05, `passing nested text is mismeasured: ${text("Passing nested")[0]?.ratio}`);
      control(text("Same colour and ground").length === 0 && sampled.filter((r) => r.text === "Same colour and ground").length === 1, "one text occurrence is measured twice");
      control(["hover", "focus", "active"].every((name) => state("Framed", name)?.ratio >= 20 && !state("Framed", name).skipped) && !texts.some((r) => r.text.includes("for the fixture")), "a border, outline or screen-reader-only text is read as text contrast, or skipped instead of excluded");
      const disabled = sampled.find((r) => r.text === "Disabled control");
      control(disabled?.disabled === true && disabled.ratio < 4.5 && !states.some((r) => r.key.startsWith("button|Disabled")), "an inactive control is not classified as inactive");
    });
    // Masking and pairing controls (r10): the per-run comparison, on two fixture builds with known differences.
    // Masking: a link holds a failing badge and a label; on the candidate, a label that passed on the baseline
    // fails on hover, focus and press (fresh), and a label that already failed falls further (worse). Pairing:
    // three identical cards; only the second worsens, so every changed result must be the second card's. Run
    // pairing: one link holds two identical runs; only the second worsens, so every changed run must be it.
    const BUILD = (label1, label2, card2, twin2, edge, note1, note2) => `<!doctype html><style>
      body { margin: 0; background: #ffffff; color: #000000; font: 16px/1.5 sans-serif; }
      main { display: grid; gap: 24px; padding: 60vh 24px; justify-items: start; }
      .bar { position: fixed; top: 0; left: 0; right: 0; height: 30vh; background: #ffffff; }
      .dots { position: fixed; top: 50%; transform: translateY(-50%); left: 280px; width: 20px; height: 60px; background: #000000; }
      .beside { margin-left: 240px; } .beside:hover .label, .beside:focus-visible .label, .beside:active .label { color: ${edge}; }
      .tall, .under { display: block; } .tall .gap { display: block; height: 130vh; } .under .gap { display: block; height: 70vh; }
      .tall:hover .label, .tall:focus-visible .label, .tall:active .label, .under:hover .label, .under:focus-visible .label, .under:active .label,
      .wrap:hover .label, .wrap:focus-visible .label, .wrap:active .label { color: ${edge}; }
      .wrapper { width: 220px; margin: 0; } .wrapper a.wrap { display: inline; padding: 0; }
      .note-1 .note { color: ${note1}; } .note-2 .note { color: ${note2}; } .note-3 .note { color: #000000; }
      a { display: inline-block; padding: 8px 12px; color: #000000; background: #ffffff; text-decoration: none; }
      .badge { color: #999999; background: #aaaaaa; padding: 0 4px; }
      .one:hover .label, .one:focus-visible .label, .one:active .label { color: ${label1}; }
      .two:hover .label, .two:focus-visible .label, .two:active .label { color: ${label2}; }
      .card { color: #959595; } .card-2 .card { color: ${card2}; } .card-3 .card { color: #000000; }
      .twin { color: #000000; } .twin .go + .go { color: ${twin2}; }
    </style><main>
      <a href="#one" class="one"><span class="badge">Done</span> <span class="label">Read more →</span></a>
      <a href="#two" class="two"><span class="badge">Done</span> <span class="label">Read on →</span></a>
      <a href="#c1" class="card-1"><span class="card">Read →</span></a>
      <a href="#c2" class="card-2"><span class="card">Read →</span></a>
      <a href="#c3" class="card-3"><span class="card">Read →</span></a>
      <a href="#tw" class="twin"><span class="go">Go</span> <span class="go">Go</span></a>
    </main><main>
      <a href="#tall" class="tall"><span class="label">Above →</span><span class="gap"></span><span class="label">Below →</span></a>
      <a href="#under" class="under"><span class="label">Under bar →</span><span class="gap"></span><span class="label">Clear →</span></a>
      <a href="#beside" class="beside"><span class="label">Beside the dots →</span></a>
      <a href="#n1" class="note-1"><span class="note">Note</span></a>
      <a href="#n2" class="note-2"><span class="note">Note</span></a>
      <a href="#n3" class="note-3"><span class="note">Note</span></a>
      <p class="wrapper">Before it comes <a href="#wrap" class="wrap"><span class="label">the wrapped link label</span></a> ends here.</p>
    </main><div class="bar"></div><div class="dots"></div>`;
    const fixtureBuild = async (html) => {
      const sink = newSink();
      await withPage({ theme: "dark" }, async (page) => {
        await page.setContent(html);
        for (const r of await contrastOf(page, "body *", { painted: true })) record("text", "fixture", "/", r.text, r, { sink });
        for (const r of await interactions(page)) record("interact", "fixture", "/", `${r.key}:${r.state}`, r, { sink });
      });
      return sink;
    };
    const before = await fixtureBuild(BUILD("#767676", "#787878", "#777777", "#777777", "#767676", "#000000", "#787878"));
    const after = await fixtureBuild(BUILD("#7b7b7b", "#808080", "#888888", "#888888", "#7b7b7b", "#010101", "#808080"));
    const diff = compareRuns(before.regressions.map((r) => ({ id: r.id, baseline: r.value })), after.measured);
    const ofLabel = (list, text) => list.filter((id) => id.startsWith("interact|") && id.endsWith(`"${text}"`));
    const control = (ok, message) => invariant(ok, `measurement control: ${message}`);
    control(ofLabel(diff.fresh, "Read more →").length === 3 && ofLabel(diff.worse, "Read on →").length === 3,
      `a worsened label beside a failing badge is masked: fresh ${diff.fresh.length}, worse ${diff.worse.length}`);
    const changed = [...diff.fresh, ...diff.worse].filter((id) => id.includes("Read →"));
    control(before.duplicates.length === 0 && after.duplicates.length === 0 && diff.missing.length === 0 && changed.length >= 2 &&
      changed.every((id) => id.includes("Read →#2")),
      `repeated cards are not paired with themselves: ${changed.join("; ") || "nothing changed"}; duplicates ${before.duplicates.length + after.duplicates.length}`);
    const twins = diff.worse.filter((id) => id.startsWith("interact|") && id.includes("|a|Go Go#1:"));
    control(before.duplicates.length === 0 && after.duplicates.length === 0 && twins.length === 3 && twins.every((id) => id.endsWith('span.go>"Go"#2')),
      `repeated runs in one control are not paired with themselves: ${twins.join("; ") || "nothing changed"}`);
    // Covered, off-screen and wrapped runs (r10): a run off screen or under a fixed bar when its card is centred,
    // a run under a fixed box at the middle of the viewport (like the section dots), and a link that wraps inside
    // a paragraph, are each measured on their own, never hiding the card's other runs; every worsened label is
    // reported fresh in every state, and nothing is left unmeasured.
    const edgeLabels = ["Above →", "Below →", "Under bar →", "Clear →", "Beside the dots →", "the wrapped link label"];
    const edgeUnmeasured = [...before.unmeasured, ...after.unmeasured].map(({ id, reason }) => `${id} (${reason})`);
    control(edgeLabels.every((text) => ofLabel(diff.fresh, text).length === 3) && edgeUnmeasured.length === 0,
      `a covered, off-screen or wrapped run is not measured on its own: ${edgeLabels.map((text) => `${text} ${ofLabel(diff.fresh, text).length}`).join(", ")}; unmeasured ${edgeUnmeasured.join("; ") || "none"}`);
    // Element pairing across a colour-dependent skip (r10): the first of three identical notes has its link's
    // colour and ground on the baseline only, so the text pass skips it there; the second already fails and
    // worsens. Elements are numbered before that skip, so the worsening must be the second note's alone.
    const notes = [...diff.fresh, ...diff.worse].filter((id) => id.startsWith("text|") && id.includes("span.note|Note"));
    control(notes.length === 1 && diff.worse.includes('text|fixture|/|span.note|Note#2|"Note"'),
      `elements are not paired across a colour-dependent skip: ${notes.join("; ") || "nothing changed"}`);
    // Re-entry (r10): a card taller than the viewport, measured on rendered pixels. Without a way to re-enter its
    // state (a hover pair), both off-screen runs stay unmeasured, each with its reason; at rest they are retried
    // and measured.
    await withPage({ theme: "dark" }, async (page) => {
      await page.setContent(BUILD("#767676", "#787878", "#777777", "#777777", "#767676", "#000000", "#787878"));
      const [without] = await contrastOf(page, ".tall", { all: false, rendered: true, enter: null });
      const [rest] = await contrastOf(page, ".tall", { all: false, rendered: true });
      control(without?.ratio === null && without.skipped?.length === 2 && !without.runs?.length && rest?.runs?.length === 2 && !rest.skipped,
        `re-entry is not honoured: without ${without?.runs?.length ?? 0} measured, ${without?.skipped?.length ?? 0} skipped; at rest ${rest?.runs?.length ?? 0} measured, ${rest?.skipped?.length ?? 0} skipped`);
    });
    // Task 4 and Task 6 add their invariants here.
  }

  await browser.close();
  console.log(`UNCOVERED pairs (not rendered on any listed route): ${[...uncovered].join(", ") || "none"}`);

  const row = ({ id, detail: text, value }) => ({ id, check: id.split("|")[0], theme: id.split("|")[1], route: id.split("|")[2], detail: text, baseline: value });
  if (MODE === "record") {
    // The ledger candidates, then every measurement on one MEASURED line (r10). A repeated id fails the record.
    for (const id of duplicates) console.log(`DUPLICATE ${id}`);
    console.log(JSON.stringify({ regions, unmeasured, entries: regressions.map(row), creative: creative.map(row), inactive: inactive.map(row) }, null, 2));
    console.log(`MEASURED ${JSON.stringify(measured)}`);
    process.exit(duplicates.length ? 1 : 0);
  }

  const ledger = JSON.parse(await readFile(new URL("./darkfield-known-deficiencies.json", import.meta.url), "utf8"));
  const scope = (id) => id.split("|").slice(0, 3).join("|");
  const known = new Map(ledger.entries.map((entry) => [entry.id, entry]));
  const details = new Map(regressions.map((r) => [r.id, r.detail]));
  // Per run (r10): each failing run against its own baseline value; ledger runs this build did not measure fail
  // as missing rather than passing as stale.
  const { fresh, worse, stale, missing } = compareRuns(ledger.entries, measured, (id) => ran.has(scope(id)));
  // Baseline and candidate must exclude the same creative content, and creative content is never restyled.
  const recordedRegions = Object.fromEntries(Object.entries(ledger.regions).filter(([key]) => ran.has(`contrast|${key}`)));
  const recordedCreative = new Map(ledger.creative.filter((c) => ran.has(scope(c.id).replace(/^creative/, "contrast"))).map((c) => [c.id, c.baseline]));
  const measuredCreative = new Map(creative.map((c) => [c.id, c.value]));
  const creativeChanged = [...new Set([...recordedCreative.keys(), ...measuredCreative.keys()])]
    .filter((id) => !(recordedCreative.has(id) && measuredCreative.has(id) && Math.abs(measuredCreative.get(id) - recordedCreative.get(id)) <= 0.05))
    .map((id) => `${id} ${recordedCreative.get(id) ?? "absent"} -> ${measuredCreative.get(id) ?? "absent"}`);
  // Inactive controls (r9): WCAG 1.4.3 exempts them, so they are observations, never entries. Each must
  // still match the baseline record, so a change to them is reported rather than passing unnoticed.
  const recordedInactive = new Map(ledger.inactive.filter((c) => ran.has(scope(c.id).replace(/^inactive/, "contrast"))).map((c) => [c.id, c.baseline]));
  const measuredInactive = new Map(inactive.map((c) => [c.id, c.value]));
  const inactiveChanged = [...new Set([...recordedInactive.keys(), ...measuredInactive.keys()])]
    .filter((id) => !(recordedInactive.has(id) && measuredInactive.has(id) && Math.abs(measuredInactive.get(id) - recordedInactive.get(id)) <= 0.05))
    .map((id) => `${id} ${recordedInactive.get(id) ?? "absent"} -> ${measuredInactive.get(id) ?? "absent"}`);
  for (const r of regressions.filter((r) => known.has(r.id))) console.log(`KNOWN ${r.id} ${r.detail}`);
  for (const { id, reason } of unmeasured) console.log(`UNMEASURED ${id} (${reason})`);
  for (const { id, detail: text } of inactive) console.log(`INACTIVE ${id} ${text}`);
  assert.deepEqual(invariantFailures, [], "Darkfield invariants");
  assert.deepEqual(regions, recordedRegions, "creative-region exclusions differ from the baseline record");
  const ids = (list) => list.map(({ id, reason }) => `${id} (${reason})`).sort();
  assert.deepEqual(ids(unmeasured), ids(ledger.unmeasured.filter(({ id }) => ran.has(scope(id)))), "unmeasurable text differs from the baseline record");
  assert.deepEqual(creativeChanged, [], "creative content measured differently from the baseline record");
  assert.deepEqual(inactiveChanged, [], "inactive controls measured differently from the baseline record");
  assert.deepEqual(duplicates, [], "measurement ids recorded twice (a pairing defect)");
  assert.deepEqual(fresh.map((id) => `${id} ${details.get(id)}`), [], "new regressions (not in the baseline ledger)");
  assert.deepEqual(worse.map((id) => `${id} ${details.get(id)}`), [], "known deficiencies that got worse than baseline");
  assert.deepEqual(missing, [], "ledger runs this build did not measure (unpaired)");
  assert.deepEqual(stale, [], "ledger entries that no longer reproduce: remove them in this commit");
  assert.deepEqual(errors, [], "page errors");
  console.log("darkfield foundation browser test passed");
  ```

- [ ] **Step 3: Mark the Annals creative regions, then record the baseline ledger** (D10).

  1. **Mark the Annals creative regions (r8; attributes only).**
     - In `web/src/pages/Annals/Annals.tsx`, add `data-df-region="native"` to exactly these 6 elements, located by anchor. They are the independently authored narrative. Change nothing else: no class, style, text, markup or behaviour.
     - This is a measurement boundary, not a D6 decision. Which Annals controls are site chrome stays open.

     | Element | Purpose: why it is creative | Anchor | Line at `a16c70f` |
     |---|---|---|---|
     | Masthead tagline | The world's authored subtitle | `<p className="text-stone-600 text-sm mt-1">` | 216 |
     | Fork, no-divergence line | Narrative of the counterfactual | `<p className="text-stone-500 italic font-serif">` | 285 |
     | Fork, fates list | The world's account of each named soul | `<div className="space-y-1.5">` | 291 |
     | Chronicle entries | The world-authored history | the `<div>` directly inside `.annals-chronicle` (`flex flex-col-reverse">`, then `<div>`) | 347 |
     | Feuds list | The world's account of the houses' feuds | `<div className="space-y-1">` | 412 |
     | Feuds empty state | World-voice prose | `<p className="text-sm text-stone-400">` | 423 |

     **Everything else in `.annals-sheet` stays governed and unmarked.** No marker may sit on an ancestor of any of these:
     - the route's only `h1`, and the masthead's year and population readouts;
     - every section heading (`h2`, `h3`), including "Your Hand · available/spent", which reports the verbs' state;
     - the verb hint, and the chronicle legend ("Gold lines are your hand…");
     - the fork totals line and the fork houses list, readouts keyed to that legend;
     - the favourite banner, which answers the visitor's watch action;
     - the intervention log, which records the visitor's own actions;
     - the footer, which holds usage instructions;
     - every control, including the conditional ones;
     - every scroll container: `.annals-chronicle`, the fork section, the intervention log and `<aside>`.

     So never mark `.annals-sheet`, `.annals-columns`, the masthead, the fork section, the chronicle section or its scroller, the controls row or `<aside>`. Each contains governed elements, and a marker reaches every descendant (`closest`), with no way back in.
     - The governed parchment text sits on a gradient, so the sampler and its painted-text pass measure it on rendered pixels, run by run (Step 2).

     **Checked** ([E-11](#evidence-summary)). No marked subtree contains a heading, legend, label, control, `tabindex`, handler, ARIA role, component or scroll container.
     - Statically: over the JSX, including conditional branches.
     - Rendered, in both themes at 1440 and 700 px wide: at load, with the verbs enabled, with a verb pending, and with the fork, banner and log shown.
     - Tab never reached an element inside a marker.

     **What a marker excludes.** A marked element leaves:
     - this sampler (its contrast is reported as `creative` instead);
     - every Phase 6 measurement of the governed interface: area budgets, void, emission, Mono hue leaks, idle and reduced motion, typography families and geometry.

     No keyboard, focus or forced-colours check reads the marker.

     **Annals focus is unverified until Phase 6.**
     - Phase 1's focus checks do not visit `/simulations/annals` (Task 6 `FOCUS_ROUTES`).
     - The chronicle log, the intervention log and (from 768 px wide, `Annals.css`) the fork section are scroll containers that Chrome makes keyboard-focusable while their content overflows. Task 6's ring rule does not match them.
     - All three stay unmarked.

     Verify:

     ```bash
     test "$(grep -c 'data-df-region="native"' web/src/pages/Annals/Annals.tsx)" = 6
     git show "$BASE":web/src/pages/Annals/Annals.tsx | diff - <(sed 's/ data-df-region="native"//g' web/src/pages/Annals/Annals.tsx)
     ```

     The `diff` prints nothing: the change is attribute-only.
  2. **Mark the `/simulations` preview roots (r10; attributes only).**
     - In `web/src/components/SimulationCard/SimulationCard.tsx`, add `data-df-region="native"` to exactly these six elements, each the root of one card's preview. Change nothing else.
     - This is a measurement boundary, not a D6 decision. D6 still decides whether the previews are native. The owner approved the markers on condition that no marked subtree holds governed content.

     | Preview | Root (anchor) | Line at `a16c70f` | Content |
     |---|---|---|---|
     | Snake | `<div className="snake-preview" aria-hidden="true">` | 24 | four empty shapes |
     | Spider | `<div className="spider-preview" aria-hidden="true">` | 33 | card shapes and four rank glyphs (K, 9, Q, 7) |
     | Rhythm Lab | `<div className="rhythm-preview" aria-hidden="true">` | 61 | lanes, notes and a target line |
     | Annals | `<div className="annals-preview" aria-hidden="true">` | 76 | masthead and line shapes |
     | Orbital | the `orbital` case's `<svg viewBox="0 0 240 140" … aria-hidden="true">` | 87 | ellipses and circles |
     | Traffic | the `traffic` case's `<svg viewBox="0 0 240 140" … aria-hidden="true">` | 97 | lines and rectangles |

     - **Why.** Without the markers, the r10 text pass measures the Spider preview's decorative rank glyphs (1.01–1.07:1 on their card shapes) as governed text.
     - **Checked** ([E-13](#evidence-summary)).
       - Each marker is the first child of its `.simulation-preview`, and `aria-hidden`.
       - Statically, over the JSX, and rendered, in both themes at 1440, 768 and 375 px wide: no marked subtree holds a control, link, heading, label, image, `tabindex`, handler, ARIA role or label, or scroll container. Its only text is the four rank glyphs.
       - The card's heading, badges, description and "Launch" label all lie outside the markers, and Tab never reached inside one.
     - **What stays unmarked.** The preview frame (`.simulation-preview`) stays governed. The unused `placeholder` case is not marked.
     - **Apply and verify.** The same `MARK` expression marks the baseline in item 3.
       - `MARK` adds the attribute only where it is absent, so applying it twice changes nothing.
       - `MARKED` counts occurrences, not lines, and fails if any element carries the attribute twice.

     ```bash
     MARK='s/(className="(?:snake|spider|rhythm|annals)-preview" aria-hidden="true")(?! data-df-region)/$1 data-df-region="native"/; s/(<svg viewBox="0 0 240 140" width="240" height="140" aria-hidden="true")(?! data-df-region)/$1 data-df-region="native"/'
     MARKED() { test "$(grep -o 'data-df-region="native"' "$1" | wc -l)" = 6 && ! grep -q 'data-df-region="native"[^>]*data-df-region' "$1"; }
     perl -pi -e "$MARK" web/src/components/SimulationCard/SimulationCard.tsx
     MARKED web/src/components/SimulationCard/SimulationCard.tsx
     git show "$BASE":web/src/components/SimulationCard/SimulationCard.tsx | sed 's/var(--brand-primary)/var(--terminal-primary)/' | diff - <(sed 's/ data-df-region="native"//g' web/src/components/SimulationCard/SimulationCard.tsx)
     ```

     `MARKED` succeeds and the `diff` prints nothing. Apart from the markers, the file differs from `BASE` only by Step 7 item 5's two inline colours.
  3. **Record against a baseline with the same markers.** The baseline worktree gets the identical attribute-only patches, so the baseline and the candidate exclude exactly the same creative content. From r10, that means both the Annals markers and the preview markers.
     - Never record against an unmarked baseline: it would measure the parchment against the page field.
     - The browser test enforces this: check mode compares `regions` with the record.
     - At session end, run `git -C "$DF_TMP/baseline" checkout -- web/src/pages/Annals/Annals.tsx web/src/components/SimulationCard/SimulationCard.tsx` before Task P0's `git worktree remove "$DF_TMP/baseline"`. Removal refuses a modified worktree.

     ```bash
     git diff -- web/src/pages/Annals/Annals.tsx > "$DF_TMP/annals-regions.patch"
     git -C "$DF_TMP/baseline" apply "$DF_TMP/annals-regions.patch"
     (cd "$DF_TMP/baseline" && perl -pi -e "$MARK" web/src/components/SimulationCard/SimulationCard.tsx)   # r10, item 2
     MARKED "$DF_TMP/baseline/web/src/components/SimulationCard/SimulationCard.tsx"
     git -C "$DF_TMP/baseline" status --porcelain   # exactly two lines (r10): " M web/src/components/SimulationCard/SimulationCard.tsx" and " M web/src/pages/Annals/Annals.tsx"
     bash "$DF_TMP/df-serve.sh" base "$DF_TMP/baseline/web" 4174
     cp web/scripts/darkfield-foundation-browser-test.mjs "$DF_TMP/"
     cd web && DARKFIELD_MODE=record node "$DF_TMP/darkfield-foundation-browser-test.mjs" http://127.0.0.1:4174 "$DF_PW" > "$DF_TMP/ledger-candidates.txt"
     ```

  4. **Rhythm Lab lane tap zones: state-specific verification (r8).**
     - **The zones.** The zones (`RhythmHighway.tsx`) are enabled `<button>`s with `tabIndex={-1}`: operated by pointer, and mirrored by the lane keys. Their text is the key hint, for example "A / J / Left", at 0.72–0.95 rem bold. That is not large text, so the criterion is 4.5:1.
     - **The overlays.** `.rhythm-lab-overlay` (`RhythmLab.css`) covers them during Ready Check, pause, run summary and tutorial. It sits at `z-index` 8 over the zones' 6, with a 78% black scrim and a backdrop blur.
     - **The procedure.** The browser test does not wait for the animated route to settle. It brings each state about and checks it, with the page clock frozen before navigation and advanced only in fixed steps (r9; Step 2 `STATES`):

     | State | How it is reached | Control state | Pixels behind the hint | Criterion | Valid evidence |
     |---|---|---|---|---|---|
     | Ready Check (load) | page load | Enabled but not operable: the overlay takes the pointer, and lane keys give no feedback. Not focusable | the overlay over the zone | None asserted. The hint is obscured by a modal scrim and the zone is inactive | `unmeasured`, reason `covered by div.rhythm-lab-overlay`. Never PASS |
     | Playing | Advance the frozen clock in 100 ms steps until Start shows, press Start, then advance 150 ms (r9) | Enabled; pointer and key operable; not focusable | the highway gradient, with notes frozen | ≥ 4.5:1 | Rendered ground; nothing covers the text; two captures agree |
     | Lane key held | the zone's first key held down | Input feedback class present; its 80 ms expiry is held by the frozen clock | the input gradient over the highway | ≥ 4.5:1 | As above, with the class verified present |
     | Pointer pressed | mouse button held at the zone's centre | `:active` verified | the active gradient over the highway | ≥ 4.5:1 | As above |
     | Paused | Escape | Enabled but not operable: the overlay | the pause overlay | None asserted, as at load | `unmeasured`, covered. Never PASS |

     - **Context.** Like the whole browser test, these states run with `prefers-reduced-motion: reduce`.
     - **Results.** A failure in a measurable state is an `entries` failure, compared with the baseline like any other. A state whose capture is covered or moving is `unmeasured`, with its reason.
     - **Not assessed.** The hint under moving notes, which belong to the native playfield, is not assessed: the frozen state is the evidence.
     - **Reporting.** Step 11 reports every Rhythm Lab `unmeasured` state to the owner as open, with no effect on `entries` and no PASS. Classifying the zones (governed or native) is D6's.

  5. **Build `web/scripts/darkfield-known-deficiencies.json`.** Record mode prints the UNCOVERED line, then one JSON object.
     - `baseline` is the `BASE` SHA.
     - `regions`, `unmeasured`, `entries`, `creative` and `inactive` (r9) are copied from that object unchanged.
     - `notes` lists:
       - the two known baseline issues in [Validation model](#validation-model);
       - `.error-button.primary` (below);
       - that the baseline was recorded with the 6 Annals markers applied, and from r10 with the 6 preview markers (item 2);
       - the Annals verb note: the verbs are disabled at load and enabled every third year. Their r7 readings measured the page field, not their ground, and were unreliable. r8 measures every state against the rendered ground. r9 records the six disabled verbs as `inactive` observations, which WCAG 1.4.3 exempts, not as D10 entries; enabled, hovered and pressed, they are measured as usual;
       - that r7's Annals parchment readings were invalid. They are not carried into `entries`, and their absence there is not an improvement. The authored narrative is recorded under `creative` for D6. The governed parchment text is measured on rendered pixels, run by run, and its failures are `entries`;
       - the Rhythm Lab states recorded in `unmeasured` (state table above), and that none of them is a PASS;
       - the residual page variables (r9, Step 7 item 5): global as at `BASE`, outside the hold, and with their effect after navigation unmeasured;
       - the states this test never measures, which therefore stay unverified:
         - the Annals conditional baseline, your-hand and fork buttons (including the pressed "close fork" state) and copy-log, which a load never renders;
         - the Annals conditional governed text: the favourite banner, the fork headings, houses list and totals, and the intervention log;
         - the Annals roster glyph and the seed field's value text. The glyph sits inside each roster button, on the button's opaque colour, where only the button's own colour is compared.
           - The glyph is "·", which is decorative, at 2.19:1. Once a soul is watched it becomes "★", the visible state of the watch, at 2.35:1 on its yellow ground.
           - Both values are the same in both themes and on `BASE` ([E-11](#evidence-summary)).
           - The watched "★" is a known pre-existing failure outside the ledger's coverage. It is not a PASS.
         - Annals focus;
         - the Rhythm Lab hint under moving notes.

         r10's interaction pass measures the hover, focus and pressed states of every control a route renders at load. So the hover states of cast world, replay seed and the advance button are no longer in this list. Its text pass measures the roster's "·" glyph, which is now an entry (2.19:1 in both themes, on `BASE` and the Task 3 work alike). The watched "★" still needs a watch action no step performs, and stays a known failure outside the ledger.
       - r10: the Light background residual (Step 7 item 6), with its measured range;
       - r10: the limits of the rendered runs ([E-13](#evidence-summary)):
         - no control covers a run that only an ancestor clips;
         - text that visibly overflows its parent is measured only inside the parent;
         - content positioned outside a clipping ancestor's box may be clipped by that ancestor anyway;
         - the interaction pass measures header controls over whatever the earlier steps left behind the header. The backdrop pass gives their bound in each theme: black under Light, white under Dark and Mono;
         - a run is identified by its element path, text and occurrence, so a change to a card's markup or text unpairs its runs. Step 9 reports every unpaired run.

     The reviewer re-runs the record against the marked baseline. It confirms that every entry reproduces, and that `regions`, `unmeasured`, `creative` and `inactive` equal the ledger's. The owner accepts `entries` (D10) before the Step 11 commit. `creative`, `unmeasured` and `inactive` are not part of D10.

  Expect at least:
  - `.home-link` on the 404 probe: white on gold, 1.40:1, both themes.
  - `.btn-outline:hover`, Dark: 2.78:1 (`.btn-outline` is rendered by `FeaturedProjectsSection.tsx`).
  - r8: at load, `regions` counts 2 per theme on `/simulations/annals`: the tagline and the feuds empty state. Those 2 elements per theme are in `creative`.
  - r8: governed Annals parchment text that fails, measured run by run and identical on `BASE` and the Task 3 work. These are pre-existing failures for D10, not Task 3 regressions:
    - the "Your Hand" heading, through its status span: "spent" at load, "available" in the prepared state;
    - the chronicle legend, through its "your hand" span.

    The rest of the governed parchment text (the `h1`, other headings, the verb hint, readouts, labels and the footer) measured at least 4.5:1.
  - r9: the six disabled verbs, in both themes, under `inactive` and not `entries`, marked `(rendered ground) (disabled)`. They are the only disabled controls the r9 dry run recorded ([E-12](#evidence-summary)).
  - r10 ([E-13](#evidence-summary)):
    - `regions`: 4 per theme on `/simulations` (the Spider preview's rank glyphs), and 5 per theme on `/simulations/annals`, where the text pass now also reaches spans nested in the marked narrative. Each is recorded under `creative`.
    - `backdrop`: in Light, over black, the brand link (its "KS" mark, 2.69:1) and the current-page link (4.35:1) in every state, and every other navigation link hovered and pressed; at narrower viewports, the disclosure toggle too. In Dark, over white, the current-page link in every state and every other link hovered and pressed (3.32:1). The Task 3 work repairs all of them: Dark through the bridge (5.63:1 or more), Light through Step 7 item 6.
    - `interact`: the Dark "Launch" label on every `/simulations` card, hovered, focused and pressed.
    - `text`: nested governed text the r9 test never measured. Examples are the status badges reading "Completed" (1.96:1 in Dark) and each Annals roster glyph (`·`).
    - `unmeasured`: still only Rhythm Lab text under its overlay or panel, now including the zones' `interact` states.
    - Each rendered entry is one run: its id ends with the run's key, for example `…|interact|light|/writing|a|…#1:hover|span.writing-card-link>"Read →"`.
  - r8: in Light, the Step 7 item 4 selectors fail:
    - the roster primary action, at rest and at hover;
    - the media bar controls, at rest and at hover;
    - the media labels;
    - the KS mark, on every route with a header;
    - `.not-found h1`.
  - r8: `unmeasured` holds, in both themes, each with its reason:
    - the Rhythm Lab zones at load and when paused, `covered by div.rhythm-lab-overlay`;
    - the lane labels and the "Ready" lane text at load, covered by the Ready Check overlay or its panel.

  The r8 dry run ([E-11](#evidence-summary)) recorded these values; the reviewer compares them:
  - the disabled verbs at 1.15–1.17:1 Dark and 1.22–1.24:1 Light;
  - every Annals verb state, and every measurable Rhythm Lab state, measured at least 4.5:1 in both themes;
  - the Annals status span: 1.86:1 Dark and 2.01:1 Light at load ("spent"), and 3.70:1 Dark and 3.99:1 Light prepared ("available"). The legend span measured 3.74:1 Dark and 4.03:1 Light.

  `.error-button.primary` has the same 1.40:1 pattern, but it renders only when an error boundary fires, so the run reports it UNCOVERED. Add it to the ledger `notes` with the static evidence (`ErrorBoundary.css:54`).

- [ ] **Step 4: Confirm the head checks fail.**

  Run: `cd web && node --test scripts/darkfield-bridge.test.mjs`

  Expected: FAIL on all four tests.
  - "theme switching only selects a theme".
  - The two bridge tests, which fail with `ENOENT` because `bridge.css` does not exist yet.
  - "no text colour reads an alias that resolves to a ground", on `pages/Home/Home.css`: `[data-theme="light"] .btn-secondary:hover` sets `color: var(--primary-color-dark)`. Step 7 item 1 deletes that rule, and the test then passes. (r7 omitted this expected failure; r8 adds it.)

  Run: `bash "$DF_TMP/df-serve.sh" head web 4173 && cd web && node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`

  Expected: FAIL on invariants (`page ground rgb(26, 26, 26) is not Darkfield field`).

  r9: the navigation invariants fail too, because `Simulations.css` and `Projects.css` define `--terminal-primary` on `:root` and `[data-theme="light"]`. On the uncommitted Task 3 work before item 5, the r9 dry run recorded 30 navigation failures ([E-12](#evidence-summary)):
  - in both themes, `<html>` defined the variable on the five paths that load either page;
  - in Light, on the same paths, the game probes differed from direct load;
  - the direct loads and `/terminal, cd` passed.

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

  4. **Contrast repairs (r8).** In Light, Task 3's darker field and re-pointed text roles made already-failing texts worse ([E-11](#evidence-summary)). Each is repaired here. None is grandfathered.
     - The criterion is the measured result. This plan prescribes no colour values.
     - The [E-11](#evidence-summary) dry run shows each criterion can be met with existing tokens.

     | File | Selector (what it is) | States | Themes | Required | Baseline → r7 head, Light |
     |---|---|---|---|---|---|
     | `ProjectRoster.css` | `.project-roster__action--primary` (the "Case study" links on `/projects`) | rest, hover, focus | Dark, Light | ≥ 4.5:1 | 4.47 → 4.16 |
     | `ProjectMedia.css` | `.project-media__bar .project-media__control` (the playback controls on the case-study routes) and `.project-media__label` (the label on every media bar) | default, hover, focus-visible, active, playing (label "pause") | Dark, Light | ≥ 4.5:1 | controls 2.00 → 1.94, hover 3.04 → 3.10; label 2.00 → 1.94 |
     | `NotFound.css` | `.not-found h1` (the 404 heading, 6rem, large text) | rest | Light (Dark measures 14.12:1 and must not change) | ≥ 3:1, and the *Text contrast* rule below | 1.34 → 1.26 |
     | `SiteNavigation.css` | `.site-header__brand-mark` (the `KS` mark in the header's home link) | default, and link hover and focus, which do not change its colour; at every scroll position | Light (Dark passes and improved; it must not get worse) | ≥ 4.5:1 against the darkest ground the header can give it | colour stack 3.49 → 3.22; rendered, darkest observed 2.65 → 2.49 |

     **Rules for all four files:**
     - **Values.** Use existing Darkfield tokens through `var(--…)`, or existing aliases that resolve to them.
       - No literal colours.
       - No new or changed token, alias or held value: `tokens.runtime.json`, `tokens.css` and `bridge.css` stay as they are.
       - `--accent-color`, `--brand-primary` and `--roster-accent` keep their global values. No global brand-token changes.
     - **Global Constraints *Text contrast*.** Each new text/ground pair must be a §05 *Contrast, verified* pair, or measure ≥ 4.5:1 in every shipped theme. The only exception is the ProjectMedia one below. For the 404 heading, the 3:1 above is the test's floor, not a relaxation of that rule.
     - **Scope.** Change only the named selectors and their states. Other consumers of the same variables keep their values.
       - The roster toggle is unchanged.
       - The `.project-media__actions` and `MediaInspector` controls, including the `[aria-pressed="true"]` view toggles, are unchanged.
       - The 404 change applies only under `[data-theme="light"]`. `.home-link` stays a recorded deficiency (Phase 3).
     - **Nothing else changes.** Borders keep the item 2 `edge` treatment. Geometry, layout, motion and copy are untouched, and focus styles are Task 6's.

     **ProjectMedia foreground exception (owner-authorized, r8).**
     - **What it permits.** The bar controls and the label may take an existing ground token as their foreground: `field`, `field-deep`, `surface-1`, `surface-2` or `surface-3`. They may also take an `on-*` token: `on-signal`, `on-fault` or `on-flare`.
     - **Why it is needed.** The bar stays the fixed `#181818`, which matches the recordings' letterbox. In Light, the text tokens reach only 1.01, 1.94 and 2.91:1 on it, while every listed ground and `on-*` token reaches 13.44–17.04:1 ([E-11](#evidence-summary)).
     - **Light only: this plan's reading.** The owner's requirement covers both themes. No single token works in both, because in Dark the ground and `on-*` tokens are near-black and reach 1.01–1.16:1.
       - The plan therefore applies the exception in Light only.
       - Dark keeps its current rules, which already pass (8.36:1 default, 6.78:1 hover) and must not get worse.
       - Step 11 reports this reading to the owner.
     - **States.** Every state's text must reach ≥ 4.5:1. Hover may keep its border change and may use a different permitted token. The decorative `▍` before each label keeps its colour.
     - **Not authorized:**
       - colour mixing;
       - a control fill;
       - a different bar or frame background;
       - any change to bar geometry, media presentation, playback, video or image content, or other case-study styles.

     **KS mark: a local accessibility correction, not a D5 ruling.**
     - **What changes.** Only the mark's Light foreground colour changes, under `[data-theme="light"] .site-header__brand-mark`. It takes a text token, per Global Constraints *Text contrast*: `fg`, `fg-muted` or `fg-faint`.
     - **What stays.** The letters, family, size, weight, box, border (which keeps `--brand-primary`), placement and `aria-hidden` stay as they are.
     - **The ground.** The header is translucent: `--app-overlay`, with a backdrop blur. Content scrolled behind it therefore darkens the mark's ground. The requirement holds at the darkest case: the mark's 20% black over the header's 88% field, over black. The test's rendered pair checks each route as the run leaves it.
     - **The dry run.** Of the text tokens, only `fg` meets the requirement in Light: 7.83:1 at the darkest observed position, against an analytic bound of 7.82:1. `fg-muted` falls to 3.98:1. No green token would reach it either (`signal` 2.79:1).
     - **The effect.** So the correction makes the letters neutral instead of green in Light. The plan treats that as the authorized foreground-colour correction, not a redesign of the mark. Step 11 asks the owner to acknowledge it.
     - **WCAG note.** WCAG 1.4.3 exempts logotypes; the owner's requirement applies regardless.

     **Regressions and stale entries.** No other text may get worse: Step 8 and the Step 9 comparison enforce this. The sampler entries and the r8 pairs for these selectors then go stale, so remove exactly those entries in this commit.
     - If the repaired heading measures between 3:1 and 4.5:1, its sampler entry (threshold 4.5) stays KNOWN with an improved value.

     **Commit record.** Record in the commit body the repaired ratio of every listed state and theme, including the states no test renders: focus, active and the media "playing" state. For the KS mark, give its ratio at the analytic darkest case.

     **Stop rule.** If no permitted token meets a criterion, stop and report to the owner. Do not choose another route.

  5. **Native-colour compatibility hold (r9; owner-approved option A″).** This is a provisional compatibility hold, not a D6 decision: D6 still decides whether the previews and the game HUDs are native.
     - **Root cause.**
       - `Simulations.css` and `Projects.css` are lazily loaded with their pages. Each defines `--terminal-primary` on `:root` (`#4CAF50`) and on `[data-theme="light"]` (`var(--brand-primary)`, which the bridge points at `signal-dim`).
       - A lazily loaded stylesheet stays attached after client-side navigation, so its global definition reaches every later route.
       - Spider and Snake read `var(--terminal-primary, #4CAF50)`. On direct load the variable is undefined, and they render `#4CAF50`. After either page, in Light, they rendered `#2a7331` at `BASE` and `#397247` (`signal-dim`) on the Task 3 work. In Dark both values are `#4CAF50`, so the leak does not show.
       - A path such as `/projects` → `/terminal` → `cd simulations/spider` never loads `Simulations.css` or `SimulationCard`, so no change confined to the simulations files can stop the leak ([E-12](#evidence-summary)).
     - **Preview causes.**
       - The Snake and Rhythm Lab previews read `--terminal-primary`, which follows the bridge in Light.
       - The Orbital and Traffic SVGs set `color: "var(--brand-primary)"` inline (`SimulationCard.tsx`), which the bridge re-points in both themes.
       - The preview frame (the `.simulation-preview` border) and the card chrome also read `--terminal-primary`. So the hold sits on the preview's content, not on its frame.
     - **First,** take the Step 9 hold-isolation snapshot of the work without item 5.
     - **The change, exactly.**
       - `web/src/components/SimulationCard/SimulationCard.css`, directly above the `.simulation-preview` rule:

         ```css
         /* Native previews depict game visuals: their ink keeps its pre-Darkfield values until D6 classifies them.
            Held on the preview content only; the preview frame stays on the bridge. */
         .simulation-preview > * { --terminal-primary: #4CAF50; }
         [data-theme="light"] .simulation-preview > * { --terminal-primary: #2a7331; }
         ```

       - `web/src/components/SimulationCard/SimulationCard.tsx`: in the `orbital` and `traffic` preview SVGs, change the inline `color: "var(--brand-primary)"` to `color: "var(--terminal-primary)"`. Nothing else in the file changes.
       - `web/src/pages/Simulations/Simulations.css`: delete only the two `--terminal-primary` declarations, from `:root` and from `[data-theme="light"]`, and add above `:root` (after the file's opening comment):

         ```css
         /* The Simulations page's accent, scoped to the page: on :root it outlived the page after client-side
            navigation and recoloured the games' native visuals. */
         .simulations-container { --terminal-primary: #4CAF50; }
         [data-theme="light"] .simulations-container { --terminal-primary: var(--brand-primary); }
         ```

       - `web/src/pages/Projects/Projects.css`: the same, scoped to the page and its portaled modal:

         ```css
         /* The Projects page's accent, scoped to the page and its portaled modal: on :root it outlived the page
            after client-side navigation and recoloured the games' native visuals. */
         .projects-container,
         .tech-stack-modal { --terminal-primary: #4CAF50; }
         [data-theme="light"] .projects-container,
         [data-theme="light"] .tech-stack-modal { --terminal-primary: var(--brand-primary); }
         ```

         The modal selector is required. `.tech-stack-modal` renders through a portal, outside `.projects-container`. Without the selector the modal lost the variable, and in the dry run its Light colours changed on 32 elements ([E-12](#evidence-summary)).
     - **Values.**
       - `#4CAF50` and `#2a7331` are the pre-Darkfield values at `BASE`, carried over unchanged, as the Spider hold's are.
       - The page-scoped declarations keep each page's existing values, so the pages render as before.
     - **Acceptance target** (owner, r9):
       - All six previews keep their baseline appearance in both themes, reached directly and from `/projects` (the Step 9 native comparison).
       - Spider and Snake render the same native colours on direct load and on all eight `NAVIGATION` paths, in both themes (the Step 2 navigation invariants).
         - The direct-load colour, `#4CAF50`, is the reference.
         - The navigation-dependent `#2a7331` at `BASE` is a cascade defect being corrected, not behaviour to preserve.
       - The Projects modal keeps its existing rendered appearance (the portal invariant, and the Step 9 isolation check).
       - The site-owned card chrome stays on the bridge: on direct load, nothing outside the preview content renders differently (the Step 9 isolation check). After client-side navigation, the only intended change is Light Spider and Snake taking their direct-load colours, page chrome such as Spider's buttons included.
       - No global Darkfield token, bridge mapping, game artwork or unrelated page variable changes.
     - **Not changed (a recorded residual).**
       - The other page variables in the same `:root` and `[data-theme="light"]` blocks stay global, as at `BASE`: `--terminal-font`, `--terminal-text-light`, `--terminal-text-muted`, `--terminal-error`, `--terminal-background` and `--terminal-header-bg`.
       - Some have readers on other routes. Examples: `Journey.css` reads `--terminal-text-light`, with no fallback; the Spider and Rhythm Lab containers read `--terminal-font`, with a fallback stack.
       - Whether they change rendering after navigation is unmeasured. They are pre-existing and outside this hold, and Step 11 reports them.
     - **Stop rule.** If the acceptance target cannot be met within these four files, or a check shows any other change, stop and report to the owner. Do not widen the hold.
  6. **Contrast repairs (r10).** The r10 test, compared run by run at five viewports (Step 9), found these Task 3 regressions ([E-13](#evidence-summary)). The census covered every governed text run the test measures, card calls to action included, at rest, hovered, focused and pressed, in both themes; client-side arrivals from `/projects` and `/simulations` changed no result. The runs that neither build could measure are listed in Step 9 and E-13; none is a card call to action.
     - **Each is genuine, not a sampling artifact.** The lowest pixels lie at the same place on `BASE` and on the Task 3 work, and every percentile of the run falls, not only the minimum. Removing the text's decoration, or the element itself, leaves those pixels: they are the ground behind the text. The card labels and the eyebrow were also confirmed by independent probes ([E-13](#evidence-summary)).
     - Each is repaired here. None is grandfathered. The eyebrow's repair is under the owner's ruling (Status (r10)); its Dark deficiency, which Task 3 improves, is classified for D10 below.

     | File | Selector (what it is) | States | Themes | Required | `BASE` → Task 3, measured |
     |---|---|---|---|---|---|
     | `SimulationCard.css` | `.launch-button` and its `::before` (the "Launch" label on each `/simulations` card) | rest, and card hover, focus and press | Dark, Light | ≥ 4.5:1 | Dark: card hover, focus and press 2.85 → 2.67 at 1440×900, lowest 2.82 → 2.64 at 1280×800; rest 3.06 → 3.57 (independent) |
     | `SiteNavigation.css` | `.site-header__link` (the header navigation) | hover, press and current page (`.active`); focus keeps its rest colour | Light | ≥ 4.5:1 over the header's worst ground (black behind it in Light) | over black (backdrop pass), current page in every state and the others hovered and pressed: 4.35 → 3.94 at every viewport; with page content behind (independent sweep), for example `/case-studies` current page 4.43 → 4.02, `/projects` hover 4.52 → 4.01 |
     | `SiteNavigation.css` | `.site-header__disclosure-toggle` (the "Explore" and "Menu" toggles, rendered below the widest layout) | every state | Light | ≥ 4.5:1 over the header's worst ground | over black: rest and focus 4.08 → 3.94, hover and press 2.69 → 2.47; with page content behind, at 375×812: rest 3.49 → 3.22, focus 2.98 → 2.74, hover and press 2.72 → 2.50 |
     | `ContactStripSection.css` | `.contact-strip-link` (the Home contact links) | hover, press | Light | ≥ 4.5:1 | "Email" 4.58 → 4.45 at 1440×900; "GitHub" 4.42 → 4.30 at 768×1024; "LinkedIn" 4.59 → 4.46 at 375×812 |
     | `FeaturedProjectsSection.css` | `.featured-project-link-text` (the Home "Read case study →" label) | card hover, press | Light | ≥ 4.5:1 | 4.44 → 4.32 at 1440×900; 4.58 → 4.45 at 1280×800; 4.49 → 4.37 at 375×812 |
     | `CaseStudyPage.css` | `.case-study-card-link` (the `/case-studies` "Read case study →" label) | card hover, press | Light | ≥ 4.5:1 | 4.35 → 4.22 at 1440×900; lowest 4.11 → 3.99 at 375×812 |
     | `Writing.css` | `.writing-card-link` (the `/writing` "Read →" label) | card hover, press | Light | ≥ 4.5:1 | 4.35 → 4.22 at 1440×900; lowest 4.11 → 3.99 at 375×812 |
     | `Writing.css` | `.writing-card-eyebrow` (the card's "Essay" or "Field Note" eyebrow; owner ruling, not a call to action) | card hover, press | Light | ≥ 4.5:1 | 4.48 → 4.35 at 1440×900, 768×1024 and 375×812; 4.52 → 4.39 at 1280×800 |
     | `ProceduralAnimations.css` | `.procedural-animations-card__link` (the "View piece →" label) | card hover, press | Light | ≥ 4.5:1 | 4.42 → 4.30 at 1440×900; lowest 4.11 → 3.99 at 375×812 |
     | `OrbitalSimulator.css` | `.orbital-header a` (the "← Simulations" link) | every state | Light | ≥ 4.5:1 | 4.66 → 4.49 at 1440×900, 4.62 → 4.49 at 1280×800; passes at the other viewports |
     | `TrafficSimulator.css` | `.traffic-header a` (its "← Simulations" link) | every state | Light | ≥ 4.5:1 | 4.62 → 4.49 at 1280×800; passes at the other viewports |
     | `TrafficSimulator.css` | `.traffic-context a` (the case-study link in "About the model"; unstyled, so it is pressed in the browser's red) | press | Light | ≥ 4.5:1 | 4.00 → 3.84 at every viewport |

     - **Why they regressed.**
       - **Launch.** The bridge re-points `--text-color` and `--primary-color-dark`. In Dark, `fg` sits on a gradient through `#4CAF50`, and card hover and focus reveal a reversed gradient. No foreground can fix it: even white reaches only about 2.78:1 against `#4CAF50`.
       - **The Light green links.** The bridge maps `--brand-primary` to `signal-dim` (`#397247`): 5.14:1 on `field`, against 5.59:1 for the legacy `#2a7331` on the legacy field. Wherever the ground is darker than `field`, that margin is gone. Darker grounds come from content behind the translucent header, and from the background's grid lines showing through hover tints and the header scrim.
       - **The card calls to action and the `/writing` eyebrow.** Their labels, and the eyebrow, are `signal-dim` on the cards' green hover tint, through which the background's grid lines show: the same loss of margin. The first r10 draft did not see them, because each card's lowest run was a description or badge that already failed (Status (r10)).
       - **The disclosure toggle.** Its `fg-muted` label (green when hovered, pressed or open) sits on a 20% black tint over the translucent header, and the bridge's darker field and re-pointed text roles lowered every state.
       - **The Traffic case-study link.** Its panel changed from white to `surface-1`, under the browser's pressed red.
     - **The change, exactly.**
       - `SimulationCard.css`: in `.launch-button` and in `.launch-button::before`, replace the `linear-gradient(…)` background with `background: var(--primary-color-dark);`. Add above `.launch-button`:

         ```css
         /* The label is fg on a solid signal-deep ground in every state, a verified pair: the gradient through the
            accent fell below 4.5:1 behind the label, worst on card hover and focus. */
         ```

       - `SiteNavigation.css`, directly after the `.site-header__link:hover, .site-header__link.active` rule:

         ```css
         /* Light: the hover and current-page label is fg; green falls below 4.5:1 when dark content scrolls
            behind the translucent header. The tint and border keep the brand colour. */
         [data-theme="light"] .site-header__link:hover,
         [data-theme="light"] .site-header__link.active {
             color: var(--fg);
         }
         ```

       - `SiteNavigation.css`, directly after the `.site-header__disclosure-toggle:hover, .site-header__disclosure-toggle.active, .site-header__disclosure-toggle[aria-expanded="true"]` rule:

         ```css
         /* Light: the label is fg in every state; fg-muted and green fall below 4.5:1 on the toggle's dark tint
            when dark content scrolls behind the translucent header. */
         [data-theme="light"] .site-header__disclosure-toggle,
         [data-theme="light"] .site-header__disclosure-toggle:hover,
         [data-theme="light"] .site-header__disclosure-toggle.active,
         [data-theme="light"] .site-header__disclosure-toggle[aria-expanded="true"] {
             color: var(--fg);
         }
         ```

       - **The Launch hover sweep.** With both the button and its `::before` on `--primary-color-dark`, the `::before` reveal on card hover and focus no longer changes anything visible. The gradient sweep is lost, and r10 accepts that. The card still responds, as [E-13](#evidence-summary) measured:
         - on hover and on any focus, its shadow, background and border change, and the button's glow changes;
         - without reduced motion, the card lifts and the button scales;
         - keyboard focus adds the card's `:focus-visible` outline.

         Nothing else in the file changes.
       - `ContactStripSection.css`, directly after `.contact-strip-link:hover`:

         ```css
         /* Light: the hover label is fg; green falls below 4.5:1 where the background shows through the hover tint. */
         [data-theme="light"] .contact-strip-link:hover {
           color: var(--fg);
         }
         ```

       - `FeaturedProjectsSection.css`, directly after `.featured-project-link-text`:

         ```css
         /* Light: on card hover the label is fg; green falls below 4.5:1 where the background shows through the hover tint. */
         [data-theme="light"] .featured-project-link:hover .featured-project-link-text {
           color: var(--fg);
         }
         ```

       - `CaseStudyPage.css`, directly after `.case-study-card-link`:

         ```css
         /* Light: on card hover the label is fg; green falls below 4.5:1 where the background shows through the hover tint. */
         [data-theme="light"] .case-study-card:hover .case-study-card-link {
           color: var(--fg);
         }
         ```

       - `Writing.css`, directly after `.writing-card-eyebrow`:

         ```css
         /* Light: on card hover the eyebrow is fg-muted, still secondary to the title; green falls below 4.5:1 where the
            background shows through the hover tint. */
         [data-theme="light"] .writing-card:hover .writing-card-eyebrow {
           color: var(--fg-muted);
         }
         ```

         The eyebrow takes `fg-muted`, the smallest change that clears 4.5:1 with margin: it keeps the eyebrow secondary to the card's title, as `signal-dim` did. `fg` would also pass.
       - `Writing.css`, directly after `.writing-card-link`:

         ```css
         /* Light: on card hover the label is fg; green falls below 4.5:1 where the background shows through the hover tint. */
         [data-theme="light"] .writing-card:hover .writing-card-link {
           color: var(--fg);
         }
         ```

       - `ProceduralAnimations.css`, directly after `.procedural-animations-card__link`:

         ```css
         /* Light: on card hover the label is fg; green falls below 4.5:1 where the background shows through the hover tint. */
         [data-theme="light"] .procedural-animations-card:hover .procedural-animations-card__link {
           color: var(--fg);
         }
         ```

       - `OrbitalSimulator.css`, directly after `.orbital-header a`, and `TrafficSimulator.css`, directly after `.traffic-header a`, each with its own selector:

         ```css
         /* Light: green falls below 4.5:1 on the background's grid lines behind the header. */
         [data-theme="light"] .orbital-header a {
           color: var(--fg-muted);
         }
         ```

       - `TrafficSimulator.css`, directly after `.traffic-context p`:

         ```css
         /* Light: the pressed link label is fg; the browser's pressed red falls below 4.5:1 on the panel. */
         [data-theme="light"] .traffic-context a:active {
           color: var(--fg);
         }
         ```

     - **Results** (the [E-13](#evidence-summary) dry run).
       - **Launch:** 9.90:1 Dark and 14.22:1 Light, in every state, on all six cards, at 1440 and 375 px. `fg` on `signal-deep` is a §05 *Contrast, verified* pair.
       - **Header links:** 12.40:1 over the darkest ground at 1440, 768 and 375 px, and at least 12.40:1 over every scroll position swept. Focus keeps `fg-muted`, at 6.22:1 over the darkest ground.
       - **Disclosure toggle:** 7.76:1 over the darkest ground, in every state, at 768 and 375 px.
       - **The rest:** the contact links at least 13.51:1; the card labels at least 12.55:1 (featured 13.58, case study 12.55, writing 12.55, procedural animations 12.55); the `/writing` eyebrow at least 6.95:1, with `fg-muted`; the Orbital and Traffic back links at least 7.17:1, and at each of nine viewports from 375 to 1920 px wide in an independent sweep; the Traffic case-study link pressed 17.26:1. Except where marked independent, these are the lowest candidate values over every viewport and arrival in the final records.
       - **Dark:** the values of the Light-only repairs are unchanged.
     - **Rules.**
       - **Values.**
         - Existing Darkfield tokens or aliases only: no literal colour, and no new or changed token, alias, held value or global brand value.
         - Text takes `fg` or `fg-muted`: Global Constraints *Text contrast*, and §13's state model gives the Hover label `fg`.
         - Launch's ground is `signal-deep`, through `--primary-color-dark`.
       - **Scope.**
         - Only the named selectors and states change. Light-only rules sit under `[data-theme="light"]`; Dark is unchanged.
         - Tints, borders, geometry, copy and focus styles are untouched. Focus is Task 6's. The only motion change is the lost Launch sweep (above).
         - No rule targets hover labels site-wide: each repair names its own card or control.
       - **Pairs.** Every new text/ground pair is a §05 *Contrast, verified* pair, or measures ≥ 4.5:1 in the theme it applies to.
     - **Stop rule.** If a criterion cannot be met within these files and rules, stop and report to the owner.
     - **Residual, not repaired (pre-existing, reported in Step 11).**
       - **The finding.** The Light background's darkest pixels lie at grid intersections near the viewport's edges: about `rgb(212, 218, 214)` on the Task 3 work and `rgb(217, 218, 213)` on `BASE`. There, `signal-dim` text measures 4.03–4.12:1 and, on `BASE`'s pixels, `#2a7331` 4.16–4.23:1. Both are below 4.5:1, and Task 3's value is 0.11–0.13 lower.
       - **What it reaches.** Which text lies over such a pixel depends on the viewport and the scroll position. The test measures fixed positions. Step 9's run-by-run comparisons, at five viewports and two arrivals, found no other text crossing 4.5:1.
       - **Why it is not repaired here.** Removing the exposure needs a global brand mapping or a background change. The first is outside Task 3's rules; the second is the Phase 2 atmosphere work (D3).
       - **Where it is recorded.** The ledger `notes`.
     - **Classified for D10, not repaired (pre-existing; owner ruling on the `/writing` eyebrow).**
       - **The finding.** In Dark, on card hover and press, the `/writing` eyebrow fails 4.5:1 where the background's grid lines show through the hover tint. Task 3 improves it but does not clear it: `BASE` → Task 3, 3.41 → 4.27 at 768×1024, on the last card at the foot of the page (the final records and an independent probe agree), and, in the round-3 reviewer's sweep over five scroll places, down to 3.16 → 3.95 at 1440×900. At the probe's centred positions it passes at the other viewports (`BASE` at least 5.11, Task 3 at least 6.17).
       - **Why it is not repaired.** Task 3 neither introduces nor worsens it, so under the owner's ruling it is classified for D10 rather than repaired. At rest and on keyboard focus it passes in both themes.
       - **What the test sees.** The test captures each card at one scroll position. There, the Dark eyebrow fails only at 768×1024; the round-3 reviewer's sweep found a failing position at 1440×900 too ([E-13](#evidence-summary)).
       - **Where it is recorded.** The ledger `notes`, and Step 11's report for D10.

- [ ] **Step 8: Run all checks and confirm they pass.**

  ```bash
  cd web && node --test scripts/darkfield-bridge.test.mjs scripts/darkfield-tokens.test.mjs && npm run typecheck && npm run lint
  bash "$DF_TMP/df-serve.sh" head web 4173
  node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"
  git status --porcelain --untracked-files=all   # build must not have changed tracked files
  ```

  Expected:
  - PASS.
  - Only ledger entries are printed as KNOWN. Only the ledger's `unmeasured` ids are printed as UNMEASURED, each with its reason.
  - r9: only the ledger's `inactive` ids are printed as INACTIVE, and the navigation and portal invariants pass.
  - The `UNCOVERED` line lists only pairs that genuinely need state the test does not create, such as the settings panel being open. Record that line in the commit body.
  - **Stale entries (r8).** The stale entries removed in this commit are exactly the ones this task fixes. Each is re-measured as an improvement while `regions` matches the baseline, so no entry can leave through an exclusion. They are:
    - the Step 7 item 1 fixes and the bridge's improvements, as recorded in [E-11](#evidence-summary);
    - every entry for a Step 7 item 4 selector.
  - The r7 Annals parchment entries never appear as stale: r8 never records them as entries.
  - **r10.**
    - The measurement controls, the masking and pairing controls and the backdrop invariant pass.
    - No id is recorded twice, and no ledger run is missing.
    - KNOWN prints only ledger entries, run by run, including the r10 checks' `text`, `interact` and `backdrop` entries that `BASE` already failed.
    - The stale entries removed are the bridge's improvements and every entry for a Step 7 item 4 or item 6 selector.

- [ ] **Step 9: Run the existing regression tests against both previews.**

  Run `boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata` and `procedural-animations` against 4173 and 4174. A test failing on head but not on base is a regression to fix in this task. A test failing on both is recorded in the ledger `notes`.

  **Whole-text comparison (r8).**
  - **What it covers.** The browser test covers selected text. This comparison covers every visible element's own text, on its colour stack, outside creative regions, on every listed route and theme.
  - **How to run it.** Install the script in `$DF_TMP` and run it against both previews:

  ```bash
  cat > "$DF_TMP/text-compare.mjs" <<'EOF'
  // text-compare.mjs <base URL> <head URL> <Playwright module>
  // Every visible element with its own text, outside [data-df-region], on every routed page and theme:
  // contrast against its composited background-colour stack, baseline versus candidate. Prints each text
  // that is below 4.5:1 on the candidate and more than 0.05 worse than on the baseline, then how many
  // elements it compared, skipped (painted ground or unparsed colour) or could not pair. It finds candidates for review;
  // the browser test and the ledger decide.
  const [baseUrl, headUrl, playwright] = process.argv.slice(2);
  const { chromium } = await import(playwright);
  const browser = await chromium.launch({ headless: true });
  const ROUTES = [
    "/", "/projects", "/case-studies", "/case-studies/aether", "/case-studies/erebus", "/case-studies/arachne",
    "/case-studies/where-the-specification-lived", "/writing", "/simulations", "/simulations/orbital-simulator",
    "/simulations/traffic-simulator", "/simulations/annals", "/simulations/snake", "/simulations/spider",
    "/simulations/rhythm-lab", "/procedural-animations", "/experience", "/journey", "/terminal", "/darkfield-404-probe",
  ];
  const scan = async (url, theme, route) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    const page = await context.newPage();
    await page.goto(`${url}${route}`, { waitUntil: "networkidle" });
    const found = await page.evaluate(() => {
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
          const style = getComputedStyle(n);
          if (style.backgroundImage !== "none") return null;
          const c = parse(style.backgroundColor);
          if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
        }
        let out = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 1, g: 1, b: 1, a: 1 };
        while (layers.length) out = over(layers.pop(), out);
        return out;
      };
      const path = (el) => { const parts = []; for (let n = el; n && n !== document.body; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + [...n.classList].slice(0, 2).map((c) => `.${c}`).join("")); return parts.slice(-4).join(">"); };
      const out = { rows: [], painted: 0 };
      for (const el of document.body.querySelectorAll("*")) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
        if (!own || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName) || el.closest("[data-df-region]")) continue;
        if (!el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) continue;
        const bg = ground(el);
        const color = parse(getComputedStyle(el).color);
        if (!bg || !color) { out.painted++; continue; }
        const [hi, lo] = [lum(over(color, bg)), lum(bg)].sort((a, b) => b - a);
        out.rows.push([`${path(el)}|${own.replace(/\s+/g, " ").slice(0, 30)}`, Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100]);
      }
      return out;
    });
    await context.close();
    const lowest = new Map();
    for (const [key, ratio] of found.rows) lowest.set(key, Math.min(ratio, lowest.get(key) ?? Infinity));
    return { lowest, painted: found.painted };
  };
  let compared = 0, painted = 0, unpaired = 0, worse = 0;
  for (const theme of ["dark", "light"]) {
    for (const route of ROUTES) {
      const [before, after] = [await scan(baseUrl, theme, route), await scan(headUrl, theme, route)];
      painted += after.painted;
      for (const [key, ratio] of after.lowest) {
        if (!before.lowest.has(key)) { unpaired++; continue; }
        compared++;
        if (ratio < 4.5 && ratio < before.lowest.get(key) - 0.05) { worse++; console.log(`WORSE ${theme} ${route} ${key} ${before.lowest.get(key)} -> ${ratio}`); }
      }
    }
  }
  await browser.close();
  console.log(`compared ${compared}; worse ${worse}; painted ground or unparsed colour (not compared) ${painted}; unpaired ${unpaired}`);
  EOF
  node "$DF_TMP/text-compare.mjs" http://127.0.0.1:4174 http://127.0.0.1:4173 "$DF_PW"
  ```

  - **Expected.** `worse 0`.
  - **A WORSE line is a regression.** If its file is one that Step 7 item 4 authorizes, it is repaired under item 4's rules; otherwise it is a stop (stop condition 6). It is never accepted into the ledger.
  - **Recording.** Record the summary line in the commit body.
  - **What it cannot compare.** On a painted ground, the elements it could not compare are covered by the browser test's sampler and painted-text pass. Elements with an unparsed colour, or that cannot be paired between builds, are not covered by this comparison.

  **Native comparison (r9).**
  - **What it covers.** Creative visuals, apart from governed chrome:
    - the `/simulations` card previews, against the baseline, pixel for pixel;
    - Spider's and Snake's direct-load colours, against the baseline.
  - **How to run it.** Install the script in `$DF_TMP` and run it against both previews:

  ```bash
  cat > "$DF_TMP/native-compare.mjs" <<'EOF'
  // native-compare.mjs <base URL> <head URL> <Playwright module>
  // Native visuals, baseline versus candidate (r9). 1) Each /simulations card preview, reached by direct
  // load and from /projects, captured on a fixed neutral ground with its frame and motion suppressed, so
  // only the preview's own content is compared; the two captures must be pixel-identical. 2) Each game's
  // probes on direct load must read the same colours on both builds. Prints one line per comparison.
  const [baseUrl, headUrl, playwright] = process.argv.slice(2);
  const { chromium } = await import(playwright);
  const browser = await chromium.launch({ headless: true });
  const FIX = ".simulation-preview { background: #7f7f7f !important; border-color: transparent !important; box-shadow: none !important; border-radius: 0 !important; width: 320px !important; min-width: 320px !important; max-width: 320px !important; flex: none !important; margin-inline: 0 !important; }" +
    " *, *::before, *::after { animation-play-state: paused !important; animation-delay: 0s !important; animation-duration: 0s !important; transition: none !important; caret-color: transparent !important; }";
  const GAMES = { spider: [".spider-card-rank", ".spider-button"], snake: [".game-score"] };
  const open = async (url, theme, route) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    const page = await context.newPage();
    await page.goto(`${url}${route}`, { waitUntil: "networkidle" });
    return { context, page };
  };
  const previews = async (url, theme, arrival) => {
    const { context, page } = await open(url, theme, arrival === "direct" ? "/simulations" : "/projects");
    if (arrival !== "direct") await page.locator('a[href="/simulations"]:visible').first().click();
    await page.locator(".simulation-preview").first().waitFor();
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({ content: FIX });
    await page.evaluate(() => document.fonts.ready);
    const shots = [];
    for (let i = 0; i < (await page.locator(".simulation-preview").count()); i++) {
      const preview = page.locator(".simulation-preview").nth(i);
      await preview.scrollIntoViewIfNeeded();
      // Whole-pixel interior of the preview: a fractional box would also capture a strip of the card around it.
      const box = await preview.boundingBox();
      const [x, y] = [Math.ceil(box.x), Math.ceil(box.y)];
      const clip = { x, y, width: Math.floor(box.x + box.width) - x, height: Math.floor(box.y + box.height) - y };
      shots.push({ kind: await preview.evaluate((el) => el.firstElementChild?.classList[0] ?? el.firstElementChild?.tagName.toLowerCase()), png: await page.screenshot({ clip, animations: "disabled" }) });
    }
    await context.close();
    return shots;
  };
  const decoder = await browser.newPage();
  const differing = (a, b) => decoder.evaluate(async ([x, y]) => {
    const pixels = async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height);
      canvas.getContext("2d").drawImage(image, 0, 0);
      return { w: image.width, h: image.height, d: canvas.getContext("2d").getImageData(0, 0, image.width, image.height).data };
    };
    const [p, q] = [await pixels(x), await pixels(y)];
    if (p.w !== q.w || p.h !== q.h) return `size ${p.w}x${p.h} vs ${q.w}x${q.h}`;
    let n = 0;
    for (let i = 0; i < p.d.length; i += 4) if (p.d[i] !== q.d[i] || p.d[i + 1] !== q.d[i + 1] || p.d[i + 2] !== q.d[i + 2] || p.d[i + 3] !== q.d[i + 3]) n++;
    return n;
  }, [a.toString("base64"), b.toString("base64")]);
  let identical = 0, changed = 0, games = 0, gameChanged = 0;
  for (const theme of ["dark", "light"]) {
    for (const arrival of ["direct", "from /projects"]) {
      const [before, after] = [await previews(baseUrl, theme, arrival), await previews(headUrl, theme, arrival)];
      if (before.length !== after.length) { changed++; console.log(`CHANGED ${theme} ${arrival}: ${before.length} previews on base, ${after.length} on head`); continue; }
      for (const [i, shot] of after.entries()) {
        const diff = shot.png.equals(before[i].png) ? 0 : await differing(before[i].png, shot.png);
        if (diff === 0) { identical++; console.log(`IDENTICAL ${theme} ${arrival} preview ${i} ${shot.kind}`); }
        else { changed++; console.log(`CHANGED ${theme} ${arrival} preview ${i} ${shot.kind}: ${diff}${typeof diff === "number" ? " pixels differ" : ""}`); }
      }
    }
    for (const [game, probes] of Object.entries(GAMES)) {
      const read = async (url) => {
        const { context, page } = await open(url, theme, `/simulations/${game}`);
        await page.locator(probes[0]).first().waitFor();
        const colors = await page.evaluate((selectors) => selectors.map((s) => getComputedStyle(document.querySelector(s)).color).join(" "), probes);
        await context.close();
        return colors;
      };
      const [before, after] = [await read(baseUrl), await read(headUrl)];
      games++;
      if (before === after) console.log(`SAME ${theme} ${game} direct load: ${after}`);
      else { gameChanged++; console.log(`CHANGED ${theme} ${game} direct load: ${before} -> ${after}`); }
    }
  }
  await browser.close();
  console.log(`previews identical ${identical}, changed ${changed}; games' direct-load colours same ${games - gameChanged}, changed ${gameChanged}`);
  EOF
  node "$DF_TMP/native-compare.mjs" http://127.0.0.1:4174 http://127.0.0.1:4173 "$DF_PW"
  ```

  - **Expected.** `previews identical 24, changed 0; games' direct-load colours same 4, changed 0`. That is six previews, in two themes, by two arrivals.
  - **A CHANGED line is a stop.** It is never accepted into the ledger.
  - **Recording.** Record the summary line in the commit body.
  - **What it does not compare.** Preview motion, because the captures are frozen. The preview frames, which are governed chrome: the isolation check below covers them.

  **Hold isolation (r9; once, when Step 7 item 5 is applied).**
  - **What it covers.** Governed chrome, apart from creative visuals: every computed property of every element on direct load of the routes the hold can reach, with the Projects modal open, before and after item 5. It does not cover rendering after client-side navigation, which the hold changes on purpose; the Step 2 navigation invariants cover that.
  - **How to run it.** Snapshot the work before applying item 5, then serve the snapshot as a third preview and compare:

  ```bash
  # Before applying item 5, from the repository root: snapshot the work without it.
  mkdir -p "$DF_TMP/prehold" && git ls-files -co --exclude-standard -- web | tar -cf - -T - | tar -xf - -C "$DF_TMP/prehold"
  (cd "$DF_TMP/prehold/web" && npm ci)
  ```

  ```bash
  # After applying item 5.
  cat > "$DF_TMP/chrome-compare.mjs" <<'EOF'
  // chrome-compare.mjs <before URL> <after URL> <Playwright module>
  // Task 3 Step 7 item 5 isolation (r9): every computed property of every element and pseudo-element on the
  // routes the hold can reach, before and after the hold, with the Projects modal open. The page clock is
  // paused and Math.random seeded, so both builds render the same state. Custom properties are not compared.
  // Prints each element whose rendered properties differ, marked PREVIEW inside .simulation-preview, else CHROME.
  const [beforeUrl, afterUrl, playwright] = process.argv.slice(2);
  const { chromium } = await import(playwright);
  const browser = await chromium.launch({ headless: true });
  const ROUTES = ["/simulations", "/projects", "/simulations/spider", "/simulations/snake", "/terminal", "/journey"];
  const dump = async (url, theme, route) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript((value) => {
      localStorage.setItem("theme", value);
      let seed = 42;
      Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    }, theme);
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
    await page.goto(`${url}${route}`, { waitUntil: "networkidle" });
    await page.clock.runFor(3000);
    if (route === "/projects") await page.getByTitle("View technical coverage").click();
    const rows = await page.evaluate(() => {
      const path = (el) => { const parts = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) parts.unshift(`${n.tagName.toLowerCase()}${[...n.classList].map((c) => `.${c}`).join("")}[${n.parentElement ? [...n.parentElement.children].indexOf(n) : 0}]`); return parts.join(">"); };
      const out = [];
      for (const el of [document.documentElement, ...document.querySelectorAll("*")]) {
        for (const pseudo of [null, "::before", "::after"]) {
          const style = getComputedStyle(el, pseudo);
          if (pseudo && ["none", "normal"].includes(style.content)) continue;
          const props = {};
          for (let i = 0; i < style.length; i++) if (!style[i].startsWith("--")) props[style[i]] = style.getPropertyValue(style[i]);
          out.push([path(el) + (pseudo ?? ""), Boolean(el.closest(".simulation-preview > *")), props]);
        }
      }
      return out;
    });
    await context.close();
    return rows;
  };
  let chrome = 0, preview = 0;
  for (const theme of ["dark", "light"]) {
    for (const route of ROUTES) {
      const [before, after] = [await dump(beforeUrl, theme, route), await dump(afterUrl, theme, route)];
      const index = new Map(after.map(([key, inPreview, props]) => [key, props]));
      if (before.length !== after.length) { chrome++; console.log(`CHROME ${theme} ${route}: ${before.length} elements before, ${after.length} after`); }
      for (const [key, inPreview, props] of before) {
        const next = index.get(key);
        if (!next) { chrome++; console.log(`CHROME ${theme} ${route} missing after: ${key.slice(-120)}`); continue; }
        const changed = Object.keys(props).filter((p) => props[p] !== next[p]);
        if (!changed.length) continue;
        inPreview ? preview++ : chrome++;
        console.log(`${inPreview ? "PREVIEW" : "CHROME"} ${theme} ${route} ${key.slice(-120)}: ${changed.map((p) => `${p} ${props[p]} -> ${next[p]}`).join("; ").slice(0, 240)}`);
      }
    }
  }
  await browser.close();
  console.log(`chrome elements changed ${chrome}; preview elements changed ${preview}`);
  EOF
  bash "$DF_TMP/df-serve.sh" prehold "$DF_TMP/prehold/web" 4175
  node "$DF_TMP/chrome-compare.mjs" http://127.0.0.1:4175 http://127.0.0.1:4173 "$DF_PW"
  bash "$DF_TMP/df-serve.sh" prehold "$DF_TMP/prehold/web" 4175 stop
  ```

  - **Expected.** `chrome elements changed 0`. PREVIEW lines appear only inside the previews' content: the Orbital and Traffic cards in both themes, and the Snake and Rhythm Lab cards in Light.
  - **A CHROME line is a stop.**
  - **Recording.** Record the summary line in the commit body.

  **Run-by-run comparison (r10).**
  - **What it covers.** Every measurement of the two builds, run by run, in five viewports and for two client-side arrivals. Check mode sees only the ledger's failures at one viewport after direct loads, so this comparison covers what it cannot:
    - text that passes on one build and fails on the other, wherever it is;
    - text over the translucent header or the Light background that meets a different ground at another viewport. In [E-13](#evidence-summary), the Traffic "← Simulations" link failed at 1280×800 and passed at 1440×900;
    - stylesheets that stay attached after client-side navigation.
  - **How to run it.** The test runs in record mode against both previews: at 1440×900 and four more viewports, then at 1440×900 arriving from `/projects` and from `/simulations`. The records are compared run by run:

  ```bash
  cat > "$DF_TMP/record-compare.mjs" <<'EOF'
  // record-compare.mjs <baseline record> <candidate record> [label] [reference record]
  // Two DARKFIELD_MODE=record outputs of the browser test, compared run by run (r10). Each record holds the
  // UNCOVERED line, the ledger candidates and a MEASURED line with every measurement: one text run, in one
  // state, measured on its colour stack or on rendered pixels. fresh: fails on the candidate only, including a
  // run measured on the candidate only. worse: fails on both, more than 0.05 lower on the candidate. UNPAIRED:
  // recorded on one build only (measured or not), or measured on one and unmeasurable on the other. UNMEASURED: a governed run
  // unmeasurable on both builds, listed with its reason so that no gap in coverage passes as paired. SETUP: a
  // paired run both builds captured on rendered pixels, at a different scroll position, with a different number
  // of line boxes, or with a line box more than 1 px different in size. METHOD: a paired run measured
  // on rendered pixels on one build and on its colour stack on the other (a repair changed its ground).
  // SCOPE: regions, creative and inactive values (within 0.05), and the UNCOVERED line. DUPLICATE: an id
  // recorded twice. ABSENT (with a reference record, such as the baseline's direct load for an arrival): a governed
  // id the reference records and neither build does, so a run that both builds skip is never taken as verified.
  import { readFileSync } from "node:fs";
  const load = (path) => {
    const text = readFileSync(path, "utf8");
    const lines = text.split("\n");
    const at = text.lastIndexOf("\nMEASURED ");
    return {
      uncovered: lines[0],
      duplicates: lines.filter((line) => line.startsWith("DUPLICATE ")),
      measured: JSON.parse(text.slice(at + "\nMEASURED ".length).split("\n")[0]),
      ...JSON.parse(text.slice(text.indexOf("{"), at)),
    };
  };
  const [basePath, candidatePath, label = "", referencePath] = process.argv.slice(2);
  const [base, candidate] = [load(basePath), load(candidatePath)];
  const absent = referencePath ? Object.keys(load(referencePath).measured).filter((id) => /^(creative|inactive)\|/.test(id) === false && !(id in base.measured) && !(id in candidate.measured)).sort() : [];
  const fails = (m) => !m.reason && m.value < (m.limit ?? 4.5);
  const governed = (id) => !/^(creative|inactive)\|/.test(id);
  const show = (m) => `${m.value} (${m.fg} on ${m.ground})`;
  const [fresh, worse, unpaired, both, setup, method, scope] = [[], [], [], [], [], [], []];
  let paired = 0;
  for (const id of [...new Set([...Object.keys(base.measured), ...Object.keys(candidate.measured)])].sort()) {
    const [b, c] = [base.measured[id], candidate.measured[id]];
    if (!b || !c) {
      unpaired.push(`${id} recorded on the ${b ? "baseline" : "candidate"} only (${(b ?? c).reason ?? "measured"})`);
      if (c && governed(id) && fails(c)) fresh.push(`${id} unpaired -> ${show(c)}`);
      continue;
    }
    if (b.reason !== c.reason) { unpaired.push(`${id} ${b.reason ?? b.value} -> ${c.reason ?? c.value}`); continue; }
    paired++;
    if (b.reason) { if (governed(id)) both.push(`${id} (${b.reason})`); continue; }
    const [bSize, cSize] = [b.setup.split("@")[0], c.setup.split("@")[0]];
    if (Boolean(bSize) !== Boolean(cSize)) method.push(`${id} ${bSize ? "rendered" : "colour stack"} -> ${cSize ? "rendered" : "colour stack"}`);
    else if (bSize) {
      // The scroll position must match exactly; each line box may differ by 1 px in each dimension, from rounding.
      const boxes = (size) => size.split("+").map((box) => box.split("x").map(Number));
      const [bb, cb] = [boxes(bSize), boxes(cSize)];
      if (b.setup.split("@")[1] !== c.setup.split("@")[1] || bb.length !== cb.length || bb.some(([w, h], k) => Math.abs(w - cb[k][0]) > 1 || Math.abs(h - cb[k][1]) > 1)) setup.push(`${id} ${b.setup} -> ${c.setup}`);
    }
    if (!governed(id)) { if (Math.abs(b.value - c.value) > 0.05) scope.push(`${id} ${b.value} -> ${c.value}`); continue; }
    if (fails(c) && !fails(b)) fresh.push(`${id} ${show(b)} -> ${show(c)}`);
    else if (fails(c) && c.value < b.value - 0.05) worse.push(`${id} ${show(b)} -> ${show(c)}`);
  }
  if (JSON.stringify(base.regions) !== JSON.stringify(candidate.regions)) scope.push("regions differ");
  if (base.uncovered !== candidate.uncovered) scope.push("UNCOVERED lines differ");
  for (const x of [...base.duplicates, ...candidate.duplicates]) console.log(x);
  for (const x of fresh) console.log(`FRESH ${x}`);
  for (const x of worse) console.log(`WORSE ${x}`);
  for (const x of unpaired) console.log(`UNPAIRED ${x}`);
  for (const x of both) console.log(`UNMEASURED ${x}`);
  for (const x of setup) console.log(`SETUP ${x}`);
  for (const x of method) console.log(`METHOD ${x}`);
  for (const x of scope) console.log(`SCOPE ${x}`);
  for (const x of absent) console.log(`ABSENT ${x}`);
  console.log(`${label}: paired ${paired}; fresh ${fresh.length}; worse ${worse.length}; unpaired ${unpaired.length}; unmeasured on both ${both.length}; setup differences ${setup.length}; method changes ${method.length}; scope differences ${scope.length}; duplicates ${base.duplicates.length + candidate.duplicates.length}${referencePath ? `; absent from both ${absent.length}` : ""}`);
  EOF
  for run in 1440x900: 1280x800: 1920x1080: 768x1024: 375x812: 1440x900:/projects 1440x900:/simulations; do
    vp=${run%%:*} from=${run#*:} name=$(printf '%s%s' "$vp" "$from" | tr / -)
    for side in base:4174 head:4173; do
      DARKFIELD_MODE=record DARKFIELD_VIEWPORT=$vp DARKFIELD_ARRIVE_FROM=$from node "$DF_TMP/darkfield-foundation-browser-test.mjs" "http://127.0.0.1:${side#*:}" "$DF_PW" > "$DF_TMP/runs-${side%%:*}-$name.txt"
    done
    ref=; [ -n "$from" ] && ref="$DF_TMP/runs-base-1440x900.txt"   # an arrival is checked against BASE's direct load
    node "$DF_TMP/record-compare.mjs" "$DF_TMP/runs-base-$name.txt" "$DF_TMP/runs-head-$name.txt" "$name" $ref
  done
  ```

  - **Expected.** For every viewport and arrival: `fresh 0; worse 0; unpaired 0; setup differences 0; scope differences 0; duplicates 0`, and `unmeasured on both` counts only the expected runs below.
    - Method changes appear only where Step 7 item 6 changes the kind of a ground: the 12 "Launch" label runs (six cards, two themes), on a gradient on `BASE` and on a solid ground after the repair.
    - Any other METHOD line is a stop.
    - **ABSENT** lines (the two arrivals only) list governed runs that `BASE`'s direct load records and neither build records after the arrival, so a run both builds skip is never taken as measured. Each must be a Spider card rank (`span.spider-card-rank`): Spider deals a different hand after an arrival, because the arriving page has already used the seeded random numbers. Any other is a stop: a coverage gap, reported to the owner.
    - **UNMEASURED** lines list governed runs that neither build could measure, each with its reason, so that a gap in coverage never passes as paired. Each must be Rhythm Lab text under its overlay or panel (the ledger's `unmeasured` class) or, at 1280×800 only, the six "Open the Traffic Simulator" runs on `/case-studies/where-the-specification-lived` that the fixed section dots cover at every scroll position ([E-13](#evidence-summary)); Step 11 reports both. Any other is a stop: a coverage gap, reported to the owner.
  - **A FRESH or WORSE line is a regression.**
    - It is repaired under Step 7 item 6's rules only if it is a selector and state that item 6 already names, or the label of a governed card call to action.
    - Anything else is a stop (stop condition 6), reported to the owner for a ruling before the plan grows.
    - It is never accepted into the ledger.
  - **Any other line is a stop:** UNPAIRED, SETUP, SCOPE or DUPLICATE. Such a line means the two builds were not measured alike.
  - **Recording.** Record each summary line in the commit body.

  **Repair isolation (r10; once, when Step 7 item 6 is applied).**
  - **What it covers.** Every computed property of every element, on direct load of every listed route, with the Projects modal open, before and after item 6. The hover and pressed repairs do not render at load; the browser test's interaction pass measures them.
  - **How to run it.** Snapshot the work before applying item 6, then serve the snapshot as a third preview and compare:

  ```bash
  # Before applying item 6, from the repository root: snapshot the work without it.
  mkdir -p "$DF_TMP/prerepair" && git ls-files -co --exclude-standard -- web | tar -cf - -T - | tar -xf - -C "$DF_TMP/prerepair"
  (cd "$DF_TMP/prerepair/web" && npm ci)
  ```

  ```bash
  # After applying item 6.
  cat > "$DF_TMP/repair-compare.mjs" <<'EOF'
  // repair-compare.mjs <before URL> <after URL> <Playwright module>
  // Task 3 Step 7 item 6 isolation (r10): every computed property of every element and pseudo-element on every
  // listed route, before and after the repairs, with the Projects modal open. The page clock is paused and
  // Math.random seeded, so both builds render the same state. Custom properties are not compared. Prints each
  // element whose rendered properties differ: REPAIR inside a repaired selector's subtree, else CHROME.
  const [beforeUrl, afterUrl, playwright] = process.argv.slice(2);
  const { chromium } = await import(playwright);
  const browser = await chromium.launch({ headless: true });
  const ROUTES = [
    "/", "/projects", "/case-studies", "/case-studies/aether", "/case-studies/erebus", "/case-studies/arachne",
    "/case-studies/where-the-specification-lived", "/writing", "/simulations", "/simulations/orbital-simulator",
    "/simulations/traffic-simulator", "/simulations/annals", "/simulations/snake", "/simulations/spider",
    "/simulations/rhythm-lab", "/procedural-animations", "/experience", "/journey", "/terminal", "/darkfield-404-probe",
  ];
  // The repairs visible at rest: the Launch label's ground (both themes); in Light, the current-page header link,
  // the header's disclosure toggle and the Orbital and Traffic back links. Hover and pressed repairs do not
  // render at rest.
  const REPAIR = { dark: ".launch-button", light: ".launch-button, .site-header__link.active, .site-header__disclosure-toggle, .orbital-header a, .traffic-header a" };
  const dump = async (url, theme, route) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript((value) => {
      localStorage.setItem("theme", value);
      let seed = 42;
      Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    }, theme);
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
    await page.goto(`${url}${route}`, { waitUntil: "networkidle" });
    await page.clock.runFor(3000);
    if (route === "/projects") await page.getByTitle("View technical coverage").click();
    const rows = await page.evaluate((sel) => {
      const path = (el) => { const parts = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) parts.unshift(`${n.tagName.toLowerCase()}${[...n.classList].map((c) => `.${c}`).join("")}[${n.parentElement ? [...n.parentElement.children].indexOf(n) : 0}]`); return parts.join(">"); };
      const out = [];
      for (const el of [document.documentElement, ...document.querySelectorAll("*")]) {
        for (const pseudo of [null, "::before", "::after"]) {
          const style = getComputedStyle(el, pseudo);
          if (pseudo && ["none", "normal"].includes(style.content)) continue;
          const props = {};
          for (let i = 0; i < style.length; i++) if (!style[i].startsWith("--")) props[style[i]] = style.getPropertyValue(style[i]);
          out.push([path(el) + (pseudo ?? ""), Boolean(el.closest(sel)), props]);
        }
      }
      return out;
    }, REPAIR[theme]);
    await context.close();
    return rows;
  };
  let chrome = 0, repairs = 0;
  for (const theme of ["dark", "light"]) {
    for (const route of ROUTES) {
      const [before, after] = [await dump(beforeUrl, theme, route), await dump(afterUrl, theme, route)];
      const index = new Map(after.map(([key, repaired, props]) => [key, props]));
      if (before.length !== after.length) { chrome++; console.log(`CHROME ${theme} ${route}: ${before.length} elements before, ${after.length} after`); }
      for (const [key, repaired, props] of before) {
        const next = index.get(key);
        if (!next) { chrome++; console.log(`CHROME ${theme} ${route} missing after: ${key.slice(-120)}`); continue; }
        const changed = Object.keys(props).filter((p) => props[p] !== next[p]);
        if (!changed.length) continue;
        repaired ? repairs++ : chrome++;
        console.log(`${repaired ? "REPAIR" : "CHROME"} ${theme} ${route} ${key.slice(-120)}: ${changed.map((p) => `${p} ${props[p]} -> ${next[p]}`).join("; ").slice(0, 240)}`);
      }
    }
  }
  await browser.close();
  console.log(`chrome elements changed ${chrome}; repair elements changed ${repairs}`);
  EOF
  bash "$DF_TMP/df-serve.sh" prerepair "$DF_TMP/prerepair/web" 4175
  node "$DF_TMP/repair-compare.mjs" http://127.0.0.1:4175 http://127.0.0.1:4173 "$DF_PW"
  bash "$DF_TMP/df-serve.sh" prerepair "$DF_TMP/prerepair/web" 4175 stop
  ```

  - **Expected.** `chrome elements changed 0`. REPAIR lines appear only for:
    - the "Launch" labels and their `::before`, in both themes;
    - in Light, the current-page header link, the disclosure toggle (where the route renders it) and the Orbital and Traffic back links.
  - **A CHROME line is a stop.**
  - **Recording.** Record the summary line in the commit body.

- [ ] **Step 10: Run the visual review (human).**

  ```bash
  node scripts/visual-review.mjs --base-url http://127.0.0.1:4174 --head-url http://127.0.0.1:4173 --mode compare --routes "<every route in ROUTES>" --theme dark --out "$DF_TMP/review-dark" --playwright "$DF_PW"
  ```

  Repeat with `--theme light`. Inspect every pair for:
  - unreadable text
  - control boundaries that vanished
  - creative regions (iframes, canvases, Snake/Spider/Rhythm Lab playfields, Annals panels, project media) that changed. Any change there is a **stop**.
  - r8: the marked Annals narrative renders exactly as before. The browser test also holds its measured contrast to the baseline record.
  - r9: the `/simulations` previews look as they do on the baseline. The Step 9 native comparison is the measured evidence; any visible change is a stop.
  - r10: the Step 7 item 6 labels read as intended.
    - In Light, the header's current-page link keeps its tint and border with an `fg` label.
    - The card labels turn `fg` only on card hover.
    - The "Launch" labels sit on a solid ground in both themes. Their gradient sweep is gone, but the card visibly responds to hover and to keyboard focus.

- [ ] **Step 11: Commit** after D10.
  - **Before asking for D10, report to the owner:**
    - the ledger `entries`;
    - every `unmeasured` id, with its reason and its effect on D10. None is accepted or passed by D10; each stays an open verification item;
    - the states recorded in `notes` as unverified;
    - the Step 9 comparison summary;
    - for acknowledgement: the KS mark's letters turn neutral in Light, and the ProjectMedia exception applies in Light only (Step 7 item 4);
    - the known pre-existing failures that the test does not cover, starting with the Annals watched-roster "★" (Step 3 notes);
    - r9: the `inactive` observations, which D10 does not accept;
    - r9: that the Step 7 item 5 hold is provisional and not a D6 decision; the Step 9 native comparison and isolation summaries; and the residual page variables that stay global (item 5);
    - r9: the browser-test runs under load, as supporting evidence, not a guarantee of future reliability.
    - r10:
      - the Step 7 item 6 repairs and their ratios, with the census of card calls to action;
      - the loss of the Launch hover sweep;
      - the Light background residual (item 6) and the limits of the rendered runs (Step 3 notes);
      - the six preview markers: a measurement boundary, not a D6 decision;
      - the Step 9 viewport comparison and repair isolation summaries, with every run listed as unmeasured on both builds;
      - the Dark `/writing` eyebrow, classified for D10 (item 6), and the section dots that overlap the "Open the Traffic Simulator" link at 1280×800, a pre-existing layout finding;
      - that the links in the opened "Explore" panel are not measured by the test ([E-13](#evidence-summary) limits).
  - **Owner rulings first.** If a Step 7 item 4 repair reached its stop rule, the commit waits for the owner's ruling.
  - **The reviewer (r8)** also:
    - re-runs the Step 9 comparison and confirms `worse 0`;
    - checks every `unmeasured` reason against the Step 3 state table (check mode already holds the reasons to the baseline);
    - confirms that no marker sits on, or above, a governed element;
    - confirms that the ProjectMedia exception is used only within its scope;
    - r9: re-runs the Step 9 native comparison and confirms its expected summary;
    - r9: confirms that the item 5 diff in its four files is exactly the change item 5 gives, and that no token, bridge mapping or other variable changed;
    - r9: runs the browser test at least three times in a row, under representative load, and reports every result.
    - r10:
      - confirms that the preview markers sit only on the six roots, with nothing governed beneath them;
      - confirms that the item 6 diff in its nine files is exactly the change item 6 gives;
      - re-runs the Step 9 run-by-run comparison and the repair isolation;
      - runs the measurement-control bypasses of [E-13](#evidence-summary), including those that mask runs or break pairing. Each must fail its own control.
  - **Paths:** the Files list above, with the confirmed control-boundary files. r8 adds `Annals.tsx`, `ProjectRoster.css` and `NotFound.css`; `ProjectMedia.css` and `SiteNavigation.css` are already control-boundary files. r9 adds `SimulationCard.css`, `SimulationCard.tsx`, `Simulations.css` and `Projects.css`. r10 adds `ContactStripSection.css`, `FeaturedProjectsSection.css`, `CaseStudyPage.css`, `Writing.css` and `ProceduralAnimations.css`. Its other files are already listed.
  - **Message:** `feat(web): drive themes from Darkfield tokens through a legacy-variable bridge`.

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
| Simulations index | Cards, launch controls | Previews of native visuals as D6 decides. D6 lifts or confirms Task 3's provisional preview hold (r9) and its preview markers (r10) | D6 |
| NotFound, errors, loaders, toasts, modals | §13 Error and Processing signatures; no celebratory toasts | — | — |

**Region marking.** Each Phase 5 task marks its creative containers with `data-df-region="artwork|native|evidence"`.
- The Phase 1 sampler already skips elements inside such regions. Phase 6 measurements depend on these marks; an unmarked creative region is a Phase 5 defect.
- Task 3 already marks the Annals authored narrative (r8). Its headings, hints, legends, readouts, logs, footer and controls stay governed.
- Task 3 also marks the six `/simulations` preview roots (r10). The preview frames and the cards stay governed. D6 confirms or lifts these markers along with the preview hold.
- A marker reaches every descendant, so it goes only on a subtree with no interactive control.
- A marker removes its subtree from the Phase 1 sampler and from every Phase 6 governed-interface measurement listed below. It never removes anything from keyboard, focus or forced-colours checks.
- A task that adds or moves markers records the baseline with the same markers.

### Phase 6: Conformance measurement

Limits are read from the canonical repository at the pinned tag; this plan cites them without restating them. Any row whose automated method would put a specification limit into public code is gated by D11.

All measurements run on the **governed interface**: the viewport minus `[data-df-region]`, `<iframe>`, `<canvas>`, `<video>` and content `<img>` boxes. Focus, keyboard and forced-colours checks are the exception: they exclude nothing (r8). Each report also states the excluded share of the viewport, so the exclusions stay visible.

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

**Phase 6 execution record (appended 2026-11-05, r11).** Sub-plan `docs/superpowers/plans/2026-10-15-darkfield-phase-6-conformance.md`; execution base `35b70da` (Phase 5 exit); Phase 6 commits `058d1c6` to `370f41d`, all local. Limit values and measurement outputs stay under `$DF_TMP/phase6/`, outside this repository.

*D11(a) disposition by row.* D11(a) stays open. Committed means public and limit-free; local means `darkfield-measure.mjs` with limits read at run time from the canonical clone; reviewer means a human verdict kept outside the repository.

| Requirement | Committed | Local only | Reviewer |
|---|---|---|---|
| Area budgets (§05 *How much of each*) | Classification library and its unit tests (Task 2) | Tier shares with bounds against the limits; the R1 mark's `signal` pixels listed | BORDERLINE verdicts; state hues present only where a state exists |
| Largest void (§08 *Balancing density and emptiness*) | Component algorithm and its tests (Task 2) | Largest connected field component against the limit | — |
| Emission (§11 *Rules*, *Light theme*) | Governed shadows are `none`, the focus ring while focused, or one glow token; none in Light (Task 8) | Glow and flare counts per view | Glow only on live elements |
| Mono (§05 *Monochrome*; Principle 3) | Hue-leak invariant, DOM and pixels (Task 10) | — | Reading order on Mono screenshots |
| Zero effects (§10 *The zero-effects test*) | — | Captures with atmosphere candidates hidden; candidates listed per view | Identity and information intact; effect count |
| Motion, idle (Principle 6) | `IDLE_ALLOWED` and `LIVE_READOUTS` (Task 9) | Heartbeat rows per view against the allowance | Each allowed row's condition |
| Motion, reduced (§12) | No running governed animation; no change outside `LIVE_READOUTS` (Task 9) | — | — |
| Motion classes (§12) | Annotation presence and class vocabulary (Task 4) | — | Truth of each annotation |
| Typography (§06) | Families; uppercase text is narrow (Task 6) | — | Authored all-caps runs |
| Geometry (§03, §17) | Square corners, or `radius-node` on a text-free non-control (Task 6) | Node sizes; chamfers per container; mark size and clear space against `r1/SPEC.md` §1 | — |
| Focus, contrast | Focus ring and forced colours on every route; contrast on every route (Tasks 5 and 7; R-3) | Contrast records at the four other viewports and two arrivals, with no entries | Painted forced-colours ring |
| Three-question check (§16) | — | — | Per route |
| Creative regions | — | Share per view; native comparison against `BASE` | Nondeterministic sets |

*New checks.* Committed: `darkfield-limits.mjs` and its test (Task 1, `058d1c6`); `darkfield-measure-lib.mjs` and `darkfield-measure.test.mjs` (Task 2, `ac34a8a`); `darkfield-measure.mjs` (Task 3, `b68acd5`; run only locally); `darkfield-conformance.test.mjs` (Task 4, `6582c5f`); the browser-test invariants of Tasks 5 to 10 (`8a9f04e`, `72bfc63`, `b424fd1`, `3f3aa59`, `6e61c28`, `dc7153f`), the forced-colours paint invariant (R-3, `600272b`), the arrival wait for piece routes (R-5, `9ba1087`) and the Journey card's reduced-motion assertion (R-8, `933f932`). Mono joined the default check themes at Task 11 (`d607cce`). Each has a row in *Validation model*. Step M (no commit) ran the local measurement, contrast records at the other viewports and arrivals, the native comparison and the asset-box check on `dc7153f`, and again on `933f932` after R-5 to R-8; its reviewer verdicts are kept in `$DF_TMP/phase6/verdicts.md`.

*Phase 6 rulings outside the R-n and DEV-n lines.* Step 0: P6-0a (`KEYFRAME_DEAD` never existed, so Task 4 imports `NATIVE_KEYFRAMES` only) and P6-0b with P6-5′ (*Recorded deviations*). Step M: P6-Ma (ordered R-5); P6-Mb and P6-Mj (an asset box that changes only through the governed layout around it, with the asset's own paint, crop and aspect unchanged, is not a restyle, so the asset-box stop closed without an R-n); P6-Mc to P6-Me (ordered R-6 to R-8); P6-Mf to P6-Mi (DEV-8 to DEV-11); P6-M2a (*Recorded deviations*). These are rulings only, with no commit of their own.

*Fix tasks (R-n under P6-8: one concern per commit, ordered by the controller before the invariant that found the defect landed):*
- **R-1**, `4dda750`: three §12 annotations corrected to what they animate (`TopUI.css`, `grammar.css`, `Toast.tsx`); the surfaces test's pinned annotation follows (P6-R1a). Comments and test only.
- **R-2**, `ec8144d`: the Prism editor theme imported by `VimUI.tsx` styled article code in every theme (a Light contrast defect); the import is removed, and a static test rejects such theme imports.
- **R-3**, `600272b`: governed sliders and Selected and latch states visible again in forced colours, changed only inside `@media (forced-colors: active)` (P6-R3a–d; DEV-7).
- **R-4**, `6dbc820`: Orbital and Traffic live values keep a constant character count, so their labels and units stay still (P6-T9c, P6-R4a–c).
- **R-5**, `9ba1087`: test only; client-side arrivals into procedural-piece routes wait for the piece frame to settle (P6-Ma, P6-R5a–c).
- **R-6**, `46510d9`, `78c7ed3`, `e10e34a`: the home tagline in `fg-muted`; article code fences on `field-deep`; the Annals chronicle and fork grounds opaque `field`, with the chronicle's `untokened` Mono entry removed (P6-Mc, P6-R6a–c; P6-R6b).
- **R-7**, `52454ec`, `5fe2760`, `a5fffb7`: the Orbital, Traffic and Rhythm Lab setup faces set on `field` (P6-Md, P6-R7a–c; DEV-12).
- **R-8**, `9c77aa8`, `933f932`: the project roster detail and the Journey card reveal through an aperture instead of a height change and a rotation (P6-Me, P6-R8a–d).
- **R-9**, `8859716`: the static route shell in `web/index.html` (the pre-hydration and no-JS loading state) squares its card, pill, table-of-contents/series-nav and `pre` corners through the square radius token with a zero fallback, and the bridge test rejects any shell radius that does not resolve to zero (P6-Fd; final review I-2).
- **R-10**, `abe0d0b`: Pressed is acknowledged for the primary pointer button only; keyboard, touch and pen presses are unchanged, and a node test runs the module against a fake document (final review M-5).

Other Phase 6 commits: Task 11, `d607cce` (Mono offered in Settings, D4 (a)); Task 12, `370f41d` (`AGENTS.md` end state, P6-10).

### Recorded deviations (Phases 2–6)

Appended 2026-11-05 (r11). One line per deviation: what differs, the ruling and commit, and the owner's decision. *Pending* means the owner has not decided; this record resolves nothing. *Pre-rebase* hashes are as described under *Delegated-ruling records*.
- **DEV-1**: Traffic sliders apply their value live, so the §13 *Direct manipulation* states that need an uncommitted value are not drawn (the current value, the possible range and the hard limits are). Phase 5 plan record; Phase 5 Task 10, `c5c2e15`. Owner: pending, with the undrawn proximity brackets (Phase 5 Task 10 review M-5).
- **DEV-2**: the processing word and elapsed counter mount with the loader overlay at the site's existing timing, not after the §13 delay, which is a specification-defined value under D11(a). Phase 5 Task 5 ruling; `b7a759b`. Owner: pending (publish the value under D11(a), or accept).
- **DEV-3**: inline prose links take the hover ground step and underline change without the `›` marker, since running text leaves no free cell ahead of a link; controls keep the marker. Phase 3 Task 8 ruling (review I-2); `9ebbf6b` (pre-rebase). Owner: pending.
- **DEV-4**: in the header's phone row the `›` hover cue is omitted at phone widths whatever the pointer, and the focus ring's outer layer overlaps neighbouring controls across the row's narrow gaps. Phase 3 Task 11 ruling (phone-row exception b'); `278a99b` (pre-rebase). Owner: pending.
- **DEV-5**: a procedural artwork frame's keyboard-entry focus ring is drawn inside the frame's edges, over the artwork's outer band while focused. Phase 5 Task 6 ruling; `614e780`. Owner: approved 2026-10-21 (direct).
- **DEV-6**: the terminal input consumes forward Tab for completion; focus leaves by Shift+Tab, so it is not trapped; the browser test names it in `TAB_CONSUMERS`. Ruling P6-T7a; `b424fd1`. Owner: pending (whether forward Tab should leave). Related owner check: Tab forward out of the descent and observing frames in a headed browser (P6-T7b).
- **DEV-7**: forced colours map states by system colour keywords, not tokens: sliders return to native appearance; a Selected control's band is `SelectedItem` and its node `SelectedItemText`, with its label ink left to forced colours; lamps that are on fill with `CanvasText`. Rulings P6-R3a–d; R-3, `600272b`. Owner: pending, with the emulated-palette contrast figures, the disabled Speed slider looking enabled, Traffic tick marks not drawn in forced colours, and Firefox untested.
- **DEV-8**: the Annals masthead keeps its heavy near-black rule, a non-token colour on governed chrome, as part of the sheet's narrative look; `MONO_DEVIATIONS` lists it as the one `untokened` property. Ruling P6-Mf; no commit (ruling only; the entry dates from `dc7153f`, its comment naming DEV-8 from `e10e34a`). Owner: pending (alternative R-n: a token `rule` hairline).
- **DEV-9**: the `●`/`○` prefixes on `TerminalDropdown` options stay. Ruling P6-Mg; no commit (ruling only). Owner: pending (alternative: the §13 Selected signature), alongside the glyph items `★ ● ○ ⚔` and the Journey toggle's `↻` (P6-R8b).
- **DEV-10**: under reduced motion the afterglow ends at the element's rest tier in a single step once `dur-decay` has passed, where §12 *Reduced motion, by class* names another end tier; basis §05 *State encoding*. Ruling P6-Mh; no commit (ruling only). Owner: pending.
- **DEV-11**: on the Erebus case study at 768 px wide the governed surface share is over budget only because the excluded video leaves the governed denominator; area budgets are reported, not enforced, where the governed area is a bar or a frame around excluded evidence. Ruling P6-Mi; no commit (ruling only). Owner: pending (alternative: the media frame ground on `field` on every case study).
- **DEV-12**: Rhythm Lab at 375 px wide misses the field, surface and void budgets, because the ready-check dialog (`surface-2`, §08 *Layers and overlays*) and the highway fill the viewport. Ruling P6-R7c; no commit (ruling only; measured after R-7, `a5fffb7`). Owner: pending (an R-n would need a narrow-layout redesign).
- **P2-3**: the Rhythm Lab rain is held as part of the game's native presentation (the owner restored it in `05b1348`), against D3's removal; Phase 2 Task 2 is held with it (P2-6). Ruling: P2-3 reversed; no commit (ruling only). Owner: pending, including Step M's question of the hold against §10.
- **P3-10**: the disabled boundary is a CSS dashed border in `edge`, an approximation of `dash-provisional`, which a CSS border cannot take. Phase 3 plan reading, accepted by the controller; Phase 3 Task 3, `8457b34` (pre-rebase). Owner: pending (the exact dash, or this deviation).
- **P4-1**: registered R1 files are published and recorded in `SOURCE.json` (`502f631`, `ddbebf1`, `73c1d51`), beyond the runtime-assets-only arrangement of *Required arrangement* item 3. Ruling I5 (Phase 4 plan review). Owner: confirmation pending, before any push. Update 2026-11-05: confirmed (owner, direct); see *Release records* after the appendix.
- **P5-3**: option B; Annals chrome on the parchment sheet renders the Light token set in every theme, and the parchment ground is native; the Mono residual on the sheet (Light-set ink and lines that keep their hue in Mono) is accepted. Ruling confirmed at Phase 5 Task 1; Phase 5 Tasks 21 (`d343e2e`) and 22 (`3c89af9`); its Mono hue is excused only through `MONO_DEVIATIONS` (below). Owner: pending.
- **P5-2 mirrors**: the Traffic speed-ramp swatches (`.traffic-swatch`), the signal lamps (`.traffic-signal-lamp`) and the Annals legend key cells (`.annals-hand::before`) keep the creative palette's hues, in Mono too; their text is governed. Ruling P5-2; Phase 5 Tasks 10 (`c5c2e15`), 11 (`efa18ba`) and 21 (`d343e2e`). Owner: pending.
- **P6-5′**: `MEASURE_NATIVE` mirrors the reviewed Phase 5 boundary. `own` entries (`.annals-sheet` under P5-3; `.traffic-swatch` and `.traffic-signal-lamp` under P5-2) exclude only their own paint; the `subtree` entry (`.rhythm-lab-highway`, D6) excludes its subtree except the governed-in subtrees, which stay measured; skipped subtrees are listed. Ruling P6-0b/P6-5′ (Step 0, 2026-10-27); Task 2, `ac34a8a`. Owner: none recorded (controller ruling).
- **`MONO_DEVIATIONS`** (`web/scripts/darkfield-measure-lib.mjs`, 19 entries at `370f41d`): added by Task 10, `dc7153f` (rulings P6-T10a–c, P6-T10g); changed by R-6, `e10e34a` (the chronicle's `untokened` entry removed). Owner: pending with P5-3, P5-2 and DEV-8. Each entry, by reason:
  - P5-3: `.annals-sheet .annals-heading > .df-heading-1`
  - P5-3: `.annals-sheet .annals-readout`
  - P5-3: `.annals-sheet .annals-label`
  - P5-3: `.annals-sheet .annals-data`
  - P5-3: `.annals-sheet .annals-field`
  - P5-3: `.annals-sheet .annals-control`
  - P5-3: `.annals-sheet .annals-phrase`
  - P5-3: `.annals-sheet .annals-hint > .df-body-sm`
  - P5-3: `.annals-sheet .annals-hand`
  - P5-3: `.annals-sheet .annals-soul > span > .annals-value`
  - P5-3: `.annals-sheet .annals-soul b`
  - P5-3: `.annals-sheet .annals-soul .text-stone-500`
  - P5-3: `.annals-sheet .annals-soul abbr`
  - P5-3: `.annals-sheet .annals-footer`
  - P5-3: `.annals-sheet .annals-footer > i`
  - P5-3: `.annals-sheet .annals-footer > b`
  - P5-3: `.annals-sheet .annals-chronicle`
  - P5-3, `untokened` `border-bottom-color` (DEV-8): `.annals-sheet > header`
  - P5-2, pseudo `::before`: `.annals-sheet .annals-hand`
- **P6-10**: `AGENTS.md`'s end-state sentence ("committed in this repository") replaced the sentence that began "Until Phase 1"; P6-T12a: its "only through `tokens.css`" is stated without a native-surface qualifier (native surfaces keep their own values under the same bullet's carve-out). Rulings P6-10 (confirmed at Step 0) and P6-T12a; `370f41d`. Owner: pending.
- **P6-R6b** (a scope-record change by ruling, not a deviation of the site): plan Risk 4 makes any creative scope-record change outside new routes or Mono a stop, and R-6 hit it. One Light creative record on `/simulations/annals` now holds the ratio measured on the new opaque ground (its native ink is unchanged), and a ledger note cites R-6. Ruling P6-R6b; `e10e34a`. Owner: none recorded.
- **P6-M2a** (a ruling, from the Step M re-run): Annals native rows inside region boxes changed after R-6; they follow R-6's opaque frame ground (`e10e34a`), not a native change. A controller run with `hold.css` plus the two frames' ground held equal in both builds gives 16 of 16 SAME; evidence `$DF_TMP/phase6/ctl-annals-ground/` (local, with its PROVENANCE). Phase-exit native comparisons of Annals use that hold. No commit (ruling only). Owner: none recorded.
- **P5 T17 creative records** (a scope-record change by ruling, recorded under P6-Fe): the `/simulations/spider` creative records, dark and light, were recorded from the Task 17 head build, not the baseline, because the baseline deals a different seeded hand and the card faces sit on a page ground that earlier phases changed; the parent and head builds measured all 20 card-rank runs identically, and the region records come from the baseline. Ruling: Phase 5 Task 17 Step 5, Option A (no other id); `edecf9c`. Owner: pending (accept the candidate-derived records or re-baseline).
- **P5-T20a** (a scope-record change by ruling, recorded under P6-Fe): two ledger `unmeasured` reasons (and the Mono worklist's) were re-recorded, because the Rhythm Lab "Ready" text is now covered by `.rhythm-lab-overlay` rather than its panel once the ready-check panel became shorter; the record keeps its meaning (covered by governed UI, unmeasured, never a pass). Ruling P5-T20a; Phase 5 Task 20, `a7e629e`. Owner: pending (accept the candidate-derived records or re-baseline).
- **P5 T22 inactive records** (a scope-record change, recorded under P6-Fe): the dark and light `inactive` records of the Annals verbs were re-recorded at the same ids on the new Disabled signature. The progress ledger names no ruling id for it; the Task 22 review (PASS) verified it, and the task landed as `3c89af9`. Owner: pending (accept the candidate-derived records or re-baseline).
- **Ledger baseline** (P6-Fe): `web/scripts/darkfield-known-deficiencies.json` names `baseline` `3c533b6`, which predates the branch base `b4283dc` (the upstream merges of pull requests #27 and #26 lie between them). No ledger change. Owner: pending, with the three records above.

### Final review records (2026-11-05)

Appended 2026-11-05 (r12). The final whole-branch review of `b4283dc..d874e45` (local, outside this repository) returned READY WITH FIXES. These are the controller's rulings on it; none is an owner approval, and this record resolves nothing.
- **Release blocker, P6-Fc** (commit messages): the messages of `de60b7d`, `dcf31bf`, `f92fd52`, `8a652b3` and `52b73af`, with `600272b` from the earlier list and `5207787` listed for checking, are reworded on a candidate ref, `refs/darkfield/reworded-candidate`, made after every other commit, with a backup ref of the branch, a tree-equality proof for every commit, an old-to-new hash map committed as a docs appendix on the candidate, and an independent disclosure re-scan of all messages. `feat/darkfield-foundation` is not moved. Adopting the candidate re-hashes history, including every hash this plan cites, and is an owner release step. Owner: pending. Update 2026-11-05: adopted (owner, direct); see *Release records* after the appendix.
- **Release blocker, P6-Ff** (owner visual pass): every Human row of *Validation model* was closed by agent inspection; an owner visual pass is required before release. Screenshot set: `$DF_TMP/phase6/owner-visual/`. Owner: pending. Update 2026-11-05: approved (owner, direct), static screenshots only; see *Release records* after the appendix.
- **Owner item, M-2** (copy): the terminal's minimized-state label "Terminal minimized — reopen" (`6b86d15`) is new visitor-facing copy without owner sign-off. Owner: pending (confirm or revert).
- **Owner item, M-3** (dead-code cleanup list): `.rhythm-lab-audio-resume` in `RhythmLab.css` (rounded; nothing renders it), `.annals-page .rounded` in `Annals.css` (an unused utility), the `.projects-cta-primary` literal colour rule in `Projects.css` (dead, P3-8) and `toggleTheme` in `ThemeContext.tsx` (no caller). Owner: pending.
- **Owner item, P5-T24a** (`35b70da`): two of the six closed boxes allowed in `P5_FRAMED` rest on a review PASS only. The Rhythm Lab setup face (`.rhythm-lab-header`) is now on `field` after R-7 (`a5fffb7`); the Annals chronicle (`.annals-chronicle`) is on opaque `field` after R-6 (`e10e34a`). Whether either entry is still needed is unverified, and no test changes here. Owner: pending (a basis for each entry, or its removal).
- **Owner note, route-shell `pre`**: the R-2 review's owner note on the shell's rounded `pre` is superseded by R-9 (`8859716`), which squared it with the shell's other three rounded rules.

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
| Inline layout properties (r8) | `SiteNavigation.tsx`: `style.setProperty("--site-header-measured-offset"` and `style.setProperty("--site-dock-safe-space"`; `useDock.ts`: `"--dock-icon-size"` |
| `Annals.tsx` region markers (r8) | the 6 anchors in Task 3 Step 3 |
| `SiteNavigation.css` KS mark (r8) | `.site-header__brand-mark {` |
| `ProjectMedia.css` label (r8) | `.project-media__bar {` (the label's colour); `.project-media__label::before {` |
| Rhythm Lab zones and overlay (r8) | `RhythmHighway.tsx`: `className="rhythm-lab-hit-zones"`; `RhythmLab.css`: `.rhythm-lab-hit-zone {`, `.rhythm-lab-overlay {`; `helpers.ts`: `INPUT_FEEDBACK_MS` |
| `ProjectRoster.css` primary action (r8) | `.project-roster__action--primary {` |
| `ProjectMedia.css` bar control (r8) | the rule that begins a line with `.project-media__control {` (line 31); `.project-media__control:hover {` |
| `NotFound.css` heading (r8) | `.not-found h1 {` |

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
- **E-10. Task 1 review findings** (2026-10-11, Task 1 at r6; reproduced with synthetic input only).
  - Exporter: five key forms bypassed classification: a dotted top-level key, a dotted nested key, a bracketed key, an empty top-level key, and a key forging a private path. None emitted content, and the output stayed byte-identical. Ordinary unknown keys were refused, but the refusal repeated the key, and JSON parse errors can quote part of their input.
  - Verifier: it never read the tag or commit in `SOURCE.json` and read canonical files from the working tree, so a plain copy of the right files verified.
  - Neither defect affected the published files: every canonical key matches the r7 key grammar, and the pin was checked by hand in Task 1 and again by its reviewer.
  - Accepted limitations, not defects: the public tests cannot detect a short phrase in a name or a font stack, or an altered value with a recomputed hash. Only canonical verification can (see Leakage controls and the Validation model).
- **E-11. Task 3 at r7, and the r8 dry runs** (2026-10-11 to 2026-10-13).
  - **The previews** were throwaway builds outside the repository. Nothing was written to the repository.
    - One of `BASE`, and one of the uncommitted Task 3 work. Both had the 6 Annals markers, applied by the same attribute-only patch.
    - For feasibility only, a third: the Task 3 work plus illustrative repairs. It was never committed, and the plan prescribes no values.
  - **Inline properties.**
    - `SiteNavigation.tsx:90,133` and `useDock.ts:86` write `--site-header-measured-offset`, `--site-dock-safe-space` and `--dock-icon-size` on `<html>`, each a px length. An `rg` over `web/src` found no other custom property written there.
    - r7's invariant rejected all three.
    - r8's controls passed: the three rendered properties are accepted, and all five injected properties are rejected.
    - Two deliberately broken predicates each failed the controls: one that accepts everything, and r7's, which rejects every inline custom property.
  - **Bridge test.** At `BASE`, 4 of 4 tests fail, and test 4 names only `pages/Home/Home.css` (line 134). On the Task 3 work, 4 of 4 pass.
  - **Annals.**
    - `.annals-sheet` (`Annals.tsx:209`) wraps every Annals control and has a gradient background (`Annals.css`). r7's colour-stack sampler cannot see a gradient, so it measured the parchment text against the page field.
    - **Checked:** the 6 marked subtrees contain no heading, legend, label, control, `tabindex`, handler, ARIA role, component or scroll container.
      - Statically: the JSX, including conditional branches.
      - Rendered, in both themes at 1440 and 700 px: load, verbs enabled, verb pending, and fork, banner and log shown.
      - Tab never reached an element inside a marker.
    - **Rendered measurements, run by run, identical on `BASE` and on the Task 3 work:**
      - governed parchment text that fails:
        - the "Your Hand" heading's status span, "spent" 1.86:1 Dark and 2.01:1 Light, and "available" 3.70:1 Dark and 3.99:1 Light;
        - the legend's "your hand" span, 3.74:1 Dark and 4.03:1 Light.

        An earlier draft compared these spans with their parent's colour and wrongly passed them. The independent review found it, and the method now measures each run in its own colour;
      - the rest of the governed parchment text (the `h1`, the other headings, the verb hint, readouts, the seed label and the footer): every value at least 4.5:1;
      - creative: the tagline 6.08:1 Dark and 6.54:1 Light; the feuds empty state 1.85:1 Dark and 1.99:1 Light;
      - disabled verbs: 1.15–1.17:1 Dark and 1.22–1.24:1 Light. r7's field-based reading of 1.38 → 1.33 was unreliable;
      - enabled, hovered and pressed verbs: at least 4.5:1.
  - **Rhythm Lab.**
    - The lane zones are enabled buttons with `tabIndex -1`, neither inert nor `aria-hidden`.
    - Under the Ready Check and pause overlays (`z-index` 8 over 6; a 78% black scrim with a 10 px backdrop blur), the pointer hits the overlay, and lane keys give no feedback.
    - A differential capture (text shown versus hidden) put the hint's effective contrast through the scrim at 1.03–1.04:1, so it is illegible.
    - With the page clock frozen, playing, lane-key and pointer-pressed states measured at least 4.5:1 in both themes, identical on both builds. The 80 ms key feedback (`INPUT_FEEDBACK_MS`) held under the frozen clock.
    - Under a running clock, notes moved through the zones and two captures disagreed; that is why the clock is frozen.
    - **Measured on the Ready Check overlay:** its texts sit on a painted ground and measured at least 4.5:1.
    - **Covered, so `unmeasured`:** the lane labels and the "Ready" lane text.
    - **Elsewhere:** the painted-text pass found no painted-ground text outside Annals and Rhythm Lab on the listed routes.
  - **Repair feasibility** (public `tokens.runtime.json`, and rendered pixels):
    - **Media bar** (`#181818`, uniform):
      - Light: `fg`, `fg-muted` and `fg-faint` reach 1.01, 1.94 and 2.91:1; the ground and `on-*` tokens reach 13.44–17.04:1.
      - Dark: the ground and `on-*` tokens reach 1.01–1.16:1; the current colours reach 8.36:1 (default) and 6.78:1 (hover).
    - **KS mark.** At scroll position 0 its ground is the same on every route. Content scrolled behind the header darkens it.
      - At the darkest observed position, Light: `fg` 7.83:1, `fg-muted` 3.98:1, `fg-faint` 2.66:1, `signal` 2.79:1, `signal-dim` 2.49:1 (baseline 2.65:1).
      - The analytic bound for black content behind gives `fg` 7.82:1.
      - Dark `signal-dim`, darkest observed: 6.23:1 (baseline 5.41:1).
    - **Roster tint** (16% `signal-dim` over `field`, `#d2dfd6`): `fg` 13.07:1, `fg-muted` 6.64:1, `signal` 4.66:1.
    - **404 heading on the field:** `fg` 16.16:1, `fg-muted` 8.21:1, `fg-faint` 5.48:1.
  - **Determinism.** Two record runs on `BASE` gave byte-identical output.
  - **Check of the Task 3 work** (r8 test, ledger built from that record):
    - Invariants, `regions`, `unmeasured` and `creative` pass, and there is no new regression.
    - Worse: only the Step 7 item 4 selectors. The roster links (at rest and hover), media controls, media labels and 404 heading were worse in Light, and the KS mark on every route with a header.
    - Stale: the Step 7 item 1 fixes and the bridge's improvements ("Read Case Studies", `.btn-primary`, `.btn-outline:hover` and "7Projects listed", all Dark).
  - **With the illustrative repairs:**
    - there was no new regression and nothing worse, and every item 4 entry went stale;
    - after removing exactly the stale entries, the test passed;
    - the only UNMEASURED items were Rhythm Lab's covered states.
  - **Guards.** Each fails as required: against an empty `regions`, against a `creative` value shifted by 0.06, with one `unmeasured` id removed, and with one `unmeasured` reason changed.
  - **Whole-text comparison** (Step 9 script):
    - `BASE` → Task 3 work: every worsened element belongs to an item 4 selector.
    - `BASE` → illustrative repairs: `worse 0`.
  - **Known gaps.** These are recorded, not resolved:
    - Annals focus;
    - the Annals conditional controls, and the hover states of cast world, replay seed and advance;
    - Rhythm Lab's covered states, and its hint under moving notes;
    - whether any colour-stack `entries` (for example on Snake or Spider) sit over a canvas: unknown;
    - text under other backdrop filters, which is measured on its colour stack;
    - Mono, and viewports other than 1440×900 (the Annals census also ran at 700 px);
    - ledger ids are not unique: for example, two "play" buttons on one route share an id. The baseline comparison then uses one of them, a property carried over from r7;
    - on a colour stack, only the matched element's own colour is compared. The independent review measured the Annals roster glyph that way: "·" at 2.19:1, and "★" at 2.35:1 once a soul is watched. Both values are the same in both themes and on `BASE`, and the test does not record them. The seed field's value text is not measured.
- **E-12. Task 3 r8 application, its review, and the r9 dry runs** (2026-10-13). The previews were throwaway builds outside the repository, and nothing was written to the repository.
  - **The r8 application.**
    - As recorded in that session's report: the browser test passed, as did the 52 public tests, typecheck, lint, build and smoke.
    - The Step 9 tests passed on both builds, except `orbital`, which failed identically on both at line 196 (the known note).
    - The whole-text comparison found `worse 0`.
    - Work stopped before D10.
  - **The independent review found:**
    - native previews recoloured on `/simulations`: Snake and Rhythm Lab in Light, and the Orbital and Traffic SVGs in both themes;
    - Spider's card ranks and buttons, and Snake's score, rendering a different colour in Light after client-side navigation;
    - the r8 clock pause failing intermittently.
  - **Root cause** (Step 7 item 5), confirmed by an independent verifier. Each game was reached by eight paths per theme.
    - On the pre-hold work, Light Spider and Snake rendered `#397247` on every path that loaded `/simulations` or `/projects`. On direct load, the `/games` alias and `/terminal, cd`, they rendered `#4CAF50`.
    - `BASE` showed the same pattern, at `#2a7331`.
    - The verifier built a variant confined to the three simulations files. On the `/projects` paths, it still rendered `#397247`.
  - **Option A″ (Step 7 item 5), dry runs:**
    - **Native comparison** against `BASE`: previews identical 24, changed 0; games' direct-load colours the same, 4 of 4. Against the pre-hold work, 12 captures differed: Orbital and Traffic in both themes, and Snake and Rhythm Lab in Light, by both arrivals.
    - **Navigation invariants:** pass. On the pre-hold work there were 30 failures; Step 4 describes them.
    - **Hold isolation** against the pre-hold work: chrome elements changed 0, and preview elements changed 38, all inside the expected previews.
    - **The Projects modal:** every computed property of its 93 elements is unchanged, in both themes. A variant without the modal selector (A′) changed 32 elements in Light, and the portal invariant fails on it in both themes.
  - **Inactive classification.**
    - A `BASE` record with the r9 test gave 57 entries, 12 `inactive`, 20 `unmeasured`, 4 `creative`, and the same `regions`.
    - The 12 `inactive` are the six Annals verbs in both themes. The record contains no other disabled control. It sees only disabled elements with text that the sampler selectors or the painted-text pass reach, so a disabled `input`, `select` or untexted control would not appear.
    - Checking A″ marked exactly 44 entries stale. Without them, the 13 remaining entries equal the r8 ledger's entries minus its 12 disabled readings.
    - The check then passed, with 13 KNOWN, 20 UNMEASURED and 12 INACTIVE.
    - Two guards fail as required: an `inactive` value shifted by 0.06, and one `inactive` id removed.
  - **Record determinism under load.** A second `BASE` record, run under load, differed from the first in one value: the Light KS-mark pair on `/case-studies/where-the-specification-lived`, 3.48:1 against 2.81:1, on its rendered ground behind the translucent header. The cause is unknown. Task 3 repairs that entry and removes it as stale, so the ledger's content is unaffected. E-11 does not record the load under which its two byte-identical records ran.
  - **Clock.** Runs were under `stress -c 12`. These results are supporting evidence, not a guarantee of future reliability.
    - Ten alternating runs of the clock change alone, at 1-minute load averages of 14–30. The r8 test passed 5 of 10; the other 5 failed with "Cannot fast-forward to the past". The r9 clock passed 10 of 10. The retained log holds each run's exit code, load and last line. The identical KNOWN, UNMEASURED and UNCOVERED sets were compared at the time; the per-run outputs were not retained.
    - The r9 test before the `inactive` change, against A″: 5 of 5 passed. Load averages were 23–29 from the second run; the first started as the load rose (4.13).
    - The final r9 test against A″, with the scratch r9 ledger: 5 of 5 passed, at load averages of 13–19. All five printed the same KNOWN (13), INACTIVE (12), UNMEASURED (20) and UNCOVERED lines.
  - **After the independent review.** The navigation invariant's missing-probe guard could never fire: `join` turned a missing probe into an empty string. Missing probes now read `absent`.
    - The corrected test passed on A″ (13 KNOWN, 12 INACTIVE, 20 UNMEASURED).
    - A variant whose Spider probe matches nothing failed the invariant on every path.
    - The load runs above used the test before this one-string correction.
- **E-13. Task 3 r9 application, the r10 findings and the r10 dry runs** (2026-10-13 to 2026-10-14). The previews were throwaway builds outside the repository, and nothing was written to the repository.
  - **The r9 application** (as recorded in that session's report).
    - Every prescribed r9 check passed: the browser test (13 KNOWN, 12 INACTIVE, 20 UNMEASURED), 5 of 5 runs under `stress -c 12`, the whole-text comparison (`worse 0`) and the native comparison (24 of 24).
    - `orbital` failed identically on both builds at line 196, the known note.
    - A supplementary hover and focus scan then found the Dark "Launch" regression, and showed that the painted pass never measured text nested in sampler matches. A first r10 scratch test found the Light worsenings listed in Status (r10).
  - **The builds for the r10 dry runs (2026-10-14).**
    - `BASE`, with the 6 Annals markers and the 6 preview markers;
    - the Task 3 work as reviewed under r9, with the preview markers;
    - the candidate: that work plus Step 7 item 6, in its nine files.

    Unless stated otherwise, every run was at 1440×900, in both themes, with reduced motion and seeded randomness.
  - **The first draft and its review.**
    - The first r10 draft passed every check it defined.
    - Its independent review failed it, for one blocking defect: the interaction pass kept the lowest run per control and state, so a failing badge or description hid a call-to-action label that got worse. Reproduced: on card hover in Light, the label run alone fell from 4.42 to 4.29 (`/case-studies`), 4.35 to 4.22 (`/writing`) and 4.27 to 4.15 (`/procedural-animations`), while that draft reported `worse 0`.
    - The review's other findings:
      - repeated ids were numbered only among reported failures, so a fixed failure could re-pair the next one;
      - the black backdrop is a bound in Light only;
      - the Launch repair removes the hover sweep;
      - the marker expression was not idempotent.

      Each is corrected in this revision (Step 2, Step 3 item 2 and Step 7 item 6).
  - **The second draft and its review.**
    - Its independent review failed it, for one blocking defect: a run covered or partly off screen failed its whole element, and a wrapped link was checked against its paragraph, so the fourth `/case-studies` card and the Traffic case-study link at 1280×800 and 375×812, and three controls on `/case-studies/where-the-specification-lived` at 1280×800, were unmeasured on every build, and the comparison counted them as paired. The reviewer measured the hidden card label on card hover in Light: 4.39 → 4.26 at 1280×800 and 4.11 → 3.99 at 375×812, and 13.4 and 12.55 on the candidate.
    - A second blocking finding: three table values in Step 7 item 6 came from records taken before the scroll-centring fix. They are replaced from the final records below.
    - Non-blocking: no control caught element numbering moved after the colour-dependent skip; the `/writing` eyebrow lay outside the approved call-to-action scope; Step 9's repair rule was wider than the approved selectors; and the commit text called the header's Dark bound its darkest ground.
    - Corrections: runs are skipped and retried on their own, at three places in the viewport; wrapped runs are measured over their line boxes; a control is entered at its first uncovered point; measurement reasons are retried; the comparison lists runs neither build measured; new controls cover each (Step 2). The eyebrow went to the owner, who ruled (Status (r10)). Step 9's rule and the commit text were narrowed.
    - Section dots: after the first correction, three controls on `/case-studies/where-the-specification-lived` stayed unmeasured at 1280×800, each with one run under the fixed section dots, which sit at the middle of the viewport's height. Retrying at 30% and 70% of the height as well measures the two summaries. The link's run stays covered at every place: see below.
  - **The third draft's review.** It failed only the proposed commit text, which still said the eyebrow awaited a ruling; the plan passed every required check, and the reviewer found no measurement blind spot. Its non-blocking findings are corrected here: the eyebrow probe now measures line boxes (the Dark values below are revised), the opened "Explore" panel is reported as unmeasured, and the comparison script calls a one-sided run recorded, not measured.
  - **The fourth draft's review.** It found one blocking gap: after a client-side arrival, each record lacked 54 of the direct load's runs on every build, unreported, because the comparison could not see a run absent from both. 44 were sections that fade in when first scrolled into view, still at opacity 0 (per theme, 14 `/journey` dates and, on Home, the capability indices, the featured labels and status badges); 10 were Spider card ranks, a different deal. Corrections: arrivals scroll the page through first, and Step 9 checks each arrival against `BASE`'s direct load, listing every run both builds lack as ABSENT. After them, each arrival pairs 7,064 runs, as a direct load does; the 44 runs equal their direct-load values exactly, no run measured before changed, and only the 10 Spider ranks are absent. Its non-blocking wording findings are corrected too.
  - **The sixth draft's review.** It found that the plan and the commit text wrongly said the `PAIRS` entries do not retry. They measure through the sampler's path, which retried every skipped run at rest, hover pairs included, so a hover pair's run could have been retried without its hover. Corrections: hover pairs no longer retry, so their skipped runs stay unmeasured, each with its reason; a re-entry control covers the mechanism; the plan gives the three retry places. No hover `PAIRS` run was skipped in any record: none carries a reason. A non-hover pair's run that was skipped and then retried successfully would leave no trace, so that case is not established. The 23 records taken after the change are byte-identical to those before it.
  - **The per-run census** (the final test, run by run, `BASE` → the Task 3 work):

    | Comparison | Runs paired | Fresh | Worse | Unmeasured on both |
    |---|---|---|---|---|
    | 1440×900 | 7,064 | 26 | 79 | 38 |
    | 1280×800 | 7,064 | 26 | 77 | 44 |
    | 1920×1080 | 7,064 | 34 | 60 | 38 |
    | 768×1024 | 6,040 | 8 | 111 | 38 |
    | 375×812 | 6,040 | 43 | 167 | 38 |
    | 1440×900, arriving from `/projects` | 7,064 | 26 | 79 | 38 |
    | 1440×900, arriving from `/simulations` | 7,064 | 26 | 79 | 38 |

    Every comparison had no unpaired run, no setup difference, no scope difference and no duplicate. Checked against `BASE`'s direct load, each arrival is absent only 10 runs on both builds, all Spider card ranks (below). The 841 fresh and worse runs, counted across all seven comparisons, are grouped below.

    - **Every fresh or worse run** belongs to these groups, all now repaired in Step 7 item 6:
      - Dark: the "Launch" label.
      - Light:
        - the header links and the disclosure toggle;
        - the Home contact links;
        - the featured, case-study, writing and procedural-animation card labels, and the `/writing` eyebrow;
        - the Orbital and Traffic back links;
        - the Traffic case-study link when pressed.
    - **Nothing outside these groups.** No Dark regression besides "Launch", and no governed text outside the card calls to action, the eyebrow (owner ruling) and r10's first-draft scope.
    - **Measured on neither build:** 38 runs in every comparison, all Rhythm Lab text under its overlay or panel (the ledger's `unmeasured`). At 1280×800 only, 6 more: the "Open the Traffic Simulator" run on `/case-studies/where-the-specification-lived`, hovered, focused and pressed in both themes. The fixed section dots overlap it at every scroll position the page allows, on every build: it sits at the foot of the page, under the dots' column. Measured independently at 1280×800 with the dots hidden, at rest, hovered, focused and pressed, both themes: `BASE` at least 11.83, Task 3 and candidate at least 13.12. The overlap itself is pre-existing layout, reported in Step 11 and not repaired here.
    - **Client-side arrivals** from `/projects` and from `/simulations` gave the same regressions as direct loads: the same 105 runs (26 fresh, 79 worse) as the direct load at 1440×900, from both; the two arrival records are byte-identical.
  - **The findings, measured independently.** Each was measured as the per-pixel distribution of the rendered ground behind the text, with the text hidden. Values are minima unless stated.
    - **Launch:**
      - Dark: `BASE` rest 3.06, hover, focus and press 2.85; Task 3 3.57 and 2.67; candidate 9.90 in every state.
      - Light: `BASE` 1.99 and 2.17; Task 3 6.16 and 4.52; candidate 14.22.
      - Six cards, at 1440 and 375 px.
    - **Launch hover and focus.** The first `/simulations` card at rest, hovered and keyboard-focused, both themes, with and without reduced motion:
      - The candidate changes the card's shadow, background and border and the button's glow on hover and on keyboard focus. Without reduced motion, it also lifts the card and scales the button. Keyboard focus adds the `:focus-visible` outline.
      - That is 193,697–217,725 pixels of the card changed on the candidate, against 207,314–230,942 on `BASE`. The difference is the lost gradient sweep.
    - **Header links (Light).**
      - Swept over every scroll position, in 150 px steps, on six routes: `BASE` 4.35–4.77, Task 3 3.94–4.36. For example, `/case-studies` current page 4.43 → 4.02, and `/projects` hover 4.52 → 4.01.
      - With black under the header: 4.35 → 3.94. The analytic bound is 4.36 → 4.00.
      - Candidate: at least 12.40 at 1440, 768 and 375 px. Focus keeps `fg-muted`: 6.22 over black.
      - Dark, unchanged on the candidate: at least 5.63 over every scroll position swept. Black is not Dark's worst ground; the backdrop pass measures Dark over white (Step 2).
    - **Disclosure toggle** (Light, 768 and 375 px, over black): `BASE` rest 4.08, hover and press 2.69; Task 3 3.94 and 2.47; candidate 7.76.
    - **Contact links** (Light hover): "Email" 4.58 → 4.45 (first percentile 4.71 → 4.59; median 5.03 → 4.89), candidate 13.99. "GitHub" and "LinkedIn" fall the same way at narrower viewports (from the records).
    - **Featured label** (Light card hover): the Erebus card 4.61 → 4.48 (median 5.04 → 4.89); the Arachne card 4.87 → 4.74, passing. Candidate 14.07 and 14.91.
    - **Card calls to action** (Light card hover, label run only): the first review's reproduction, at the first draft's capture positions, was `/case-studies` 4.42 → 4.29, `/writing` 4.35 → 4.22 and `/procedural-animations` 4.27 → 4.15. In the final records: `/case-studies` 4.35 → 4.22, `/writing` 4.35 → 4.22 and `/procedural-animations` 4.42 → 4.30 at 1440×900, each falling to 3.99 at 375×812; featured 4.44 → 4.32 at 1440×900. Candidate, over every viewport and arrival: at least 12.55 (case study 12.55, writing 12.55, procedural animations 12.55, featured 13.58).
    - **The `/writing` eyebrow** (an independent probe, separate from the test: every card's eyebrow centred in the viewport, rest, hover, focus-visible and press, each state verified, both themes, five viewports; and the round-3 reviewer's own sweep):
      - Light, card hover and press: at the probe's positions `BASE` 4.48–4.73 → Task 3 4.35–4.59, failing on both at 768×1024 and 375×812. The final records, at the test's positions, agree: 4.48 → 4.35 at 1440×900, and a fresh failure at 1280×800, 4.52 → 4.39. The round-3 reviewer's sweep over five scroll places gave `BASE` 4.34–4.62 → Task 3 4.22–4.50. With `fg-muted`, at least 6.95 at the probe's positions and 6.74 in the reviewer's sweep; with `fg`, at least 13.67.
      - Light, rest and keyboard focus: 5.59 → 5.14, passing.
      - Dark, card hover and press: 3.41 → 4.27 at 768×1024 (the last card, at the foot of the page), passing at the probe's positions elsewhere (`BASE` at least 5.11, Task 3 at least 6.17); the reviewer's sweep found 3.16 → 3.95 at 1440×900, at one of its five scroll places, on three cards, and Task 3 higher than `BASE` at every position by at least 0.79. Improved but failing: classified for D10. The failing pixels are the background's grid lines through the hover tint.
      - Dark, rest and keyboard focus: 6.26 → 7.57, passing.
      - The probe measures each eyebrow's text line boxes with the text hidden. A first version measured the paragraph's whole box, and overstated the Dark failures.
    - **Orbital back link** (Light, every state): 4.66 → 4.49 (median 5.12 → 4.98). Candidate 7.17.
    - **Traffic back link** (Light): 4.62 → 4.49 at 1280×800; it passes at the other eight viewports from 375 to 1920 px wide (4.50–4.68). Candidate at least 7.17 at all nine.
    - **Traffic case-study link** (Light, pressed): a uniform ground, 4.00 → 3.84. That is the browser's pressed red on white, then on `surface-1`. Candidate 17.26.
    - **Why none is an artifact.**
      - In each case the lowest pixels lie at the same coordinates on both builds, and the whole distribution shifts, not only the minimum.
      - For the Orbital link, removing the underline, or hiding the element, left the same lowest pixel: a minor grid line of the fixed background, at viewport y = 140.
      - For Email, hiding the element left it too, slightly lighter without the link's own hover tint.
      - None is antialiasing.
    - **The Light background** (all content hidden; 1440, 1280, 1920, 768 and 375 px wide).
      - Darkest pixels: `rgb(212, 218, 214)` to `rgb(215, 220, 217)` on the Task 3 work, and `rgb(217, 218, 213)` to `rgb(218, 220, 216)` on `BASE`, at grid intersections near the edges.
      - Computed against them: `signal-dim` 4.03–4.12, and `#2a7331` on `BASE`'s pixels 4.16–4.23.
    - **Preview markers.**
      - Checked as Step 3 item 2 states: the six roots only, nothing governed beneath them, Tab never inside. Both themes, at 1440, 768 and 375 px.
      - `MARK` applied twice gives the same bytes as once, on the `BASE` and Task 3 files.
      - `MARKED` fails on a file with one duplicate attribute, and on one whose count is right but has a duplicate on one element.
  - **The measurement model, checked.**
    - **Arrival.** After a client-side arrival, the route's transition wrapper fades in from opacity 0.
      - Measured at once, 73 runs were missing on `/writing` and `/case-studies`.
      - Waiting for everything in `main` to hold still never ended on `/simulations/snake`, whose playfield keeps moving, so the wait samples the wrapper only.
      - With that wait, arrivals from `/projects` to `/simulations/snake`, `/writing` and `/case-studies` matched direct loads exactly: 1,478 runs paired, none unpaired, no setup difference.
    - **Determinism.** Five defects made records differ, or set up captures differently on the two builds, and all five are fixed (Step 2):
      - lazy images that loaded mid-pass moved the long case-study page by 350 px;
      - Playwright's `hover()` lost its hover within 50 ms after scrolling. Scrolling, waiting two frames, then moving held it for 2 s in every try;
      - the section dots' hover and press scale is script-driven and lands a frame after the pointer, so a pressed dot was captured at either scale. Each state now settles for two frames;
      - a Home section scrolled into view fades in, so after an arrival the "GitHub" link's pressed state was captured as `no rendered text` on one build and measured on the other. Captures now wait for the element to hold still. A first version of that wait paced itself by animation frames and hung on the Rhythm Lab's frozen-clock page, so it runs on a timer and is skipped where the clock is frozen;
      - each capture scrolled only if needed, so its scroll position depended on the step before. On the candidate, the "Launch" labels' colour stack needs no scroll, and the next captures sat about 100 px lower than on `BASE` at 375×812. Every capture now centres its element.

      Earlier drafts had also recorded `pair|dark|/|.btn-outline:hover` without its hover, in 1 of 15 `BASE` records, and `interact|dark|/|button|Read Case Studies#1:hover` as `not hover`, in 2 of 14.
  - **Records.** Every record, and the check-mode runs and bypasses below, ran on the Step 2 test (SHA-256 `b23fc14636218507a9a4dfece9014b8ac9b9dfacc5efc6121c54f74164452f4f`); each record's command line and load average were logged. All 23 records are byte-identical to those taken on the two previous test versions, which lacked the hover-pair change, the newer check-mode controls and, for the direct loads, the arrival scroll-through.
    - **Determinism.** Two records of each build at 1440×900, run six at a time, were byte-identical: `BASE` and the candidate.
    - **`BASE` → candidate, run by run (Step 9):** at 1440×900 (7,064 runs), 1280×800 (7,064), 1920×1080 (7,064), 768×1024 (6,040) and 375×812 (6,040), and arriving from `/projects` and from `/simulations` (7,064 each), every comparison gave `fresh 0; worse 0; unpaired 0; setup differences 0; scope differences 0; duplicates 0`, with 12 method changes and the same runs unmeasured on both builds as `BASE` → the Task 3 work; each arrival gave `absent from both 10`, all Spider card ranks.
    - **The method changes** are exactly the 12 "Launch" label runs.
    - **The ledger.** `BASE` records 639 entries at 1440×900, and the candidate 136. Every one of the 136 is also a `BASE` entry, so the ledger is those 136. Its `unmeasured` (38, all Rhythm Lab text under its overlay or panel), `creative` (20) and `inactive` (12) are identical on both builds.
  - **The other comparisons**, against the candidate with all nine files, rebuilt after the eyebrow ruling:
    - native comparison, `BASE` → candidate: `previews identical 24, changed 0; games' direct-load colours same 4, changed 0`;
    - repair isolation, the Task 3 work → candidate: `chrome elements changed 0; repair elements changed 43`. The changes are the six "Launch" labels and their `::before` in both themes, and in Light the current-page link on 17 routes and the two back links. The card repairs and the disclosure toggle do not render at rest at 1440×900;
    - whole-text comparison (r8), `BASE` → candidate: `compared 2294; worse 0`, with 12 elements unpaired. An instrumented copy, rerun, gave `compared 2296; worse 0` with 8 unpaired and named them: the "Launch" labels, which it measures on the candidate only (on `BASE` their gradient makes them painted), and Spider card ranks. The r8 script does not seed randomness, so Spider deals differently on every load, and the count varies from run to run;
    - the 52 public tests, `darkfield-tokens.mjs --check`, typecheck and lint pass;
    - against both previews, `boot-shell`, `settings-panel`, `header-overlap`, `case-study-media`, `route-metadata` and `procedural-animations` pass, and `orbital` fails identically on both at line 196, the known note.
  - **Check mode** (scratch ledger: 136 entries, 12 `inactive`, 38 `unmeasured`, 20 `creative`). Five of five runs of the Step 2 test passed against the candidate. Three ran together beside `stress -c 12` (load averages 7.1, 10.8 and 13.7 as they started), then two more beside a second `stress -c 12` (4.2 and 10.7). All five printed the same KNOWN (136), INACTIVE (12), UNMEASURED (38) and UNCOVERED lines. Earlier test versions, differing only in the arrival branch, the hover-pair retry and check-mode controls, passed fifteen more runs the same way at load averages of 4.6–15.1. These are supporting evidence, not a guarantee of future reliability.
  - **Check-mode bypasses.** Each single change below was made to the final test, scoped to `/projects` in Dark, and run in check mode; the unchanged scoped test passed. Each change failed its own control, except the last, a redundant guard.
    - No interaction pass: the state, masking, pairing, border and coverage controls.
    - Outlines read as ground: the border and screen-reader control, and the coverage control.
    - No run clipping: the border and screen-reader control (the screen-reader-only run is skipped instead of excluded).
    - r9's nested-text skip: both nested-label controls, the exact-ratio control and the colour-skip control.
    - No `inactive` class: the inactive control.
    - No backdrop: the backdrop invariant (Dark's white page).
    - The lowest run per control and state (the first draft's model): the masking, run-pairing, colour-skip and coverage controls.
    - No element numbering: both pairing controls and the colour-skip control.
    - No run numbering: both pairing controls.
    - Elements numbered after the colour-dependent skip (the second review's variant): the colour-skip control.
    - A covered or off-screen run failing its whole element (the second draft's model): the coverage and re-entry controls.
    - No per-run retry: the coverage and re-entry controls.
    - A run measured as one box around its line boxes: the coverage control (the wrapped link).
    - A control entered only at the middle of its box: the coverage control (the wrapped link).
    - Retrying only at the middle of the viewport: the coverage control (the run beside the fixed box).
    - Retrying at rest whatever the caller's re-entry (the sixth draft's model): the re-entry control.
    - r9's guards still fire: an absent Spider probe fails the navigation invariant on every path, and an inline filter that accepts everything fails the inline-property control.
    - Removing only the explicit screen-reader clip line did not fail the controls. The clipping loop still excludes that text, so the line is a redundant guard.
  - **Step 9 ABSENT detection (not a check-mode control).** The scroll-through after an arrival has no check-mode control: the test arrives client-side only when `DARKFIELD_ARRIVE_FROM` is set, which Step 8's check-mode run never does. Its negative case is the fourth draft's own arrival records, made before the scroll-through existed. Compared with `BASE`'s direct load, as Step 9 compares them, each gives `absent from both 54`: the 44 in-view fade-ins still at opacity 0 and the 10 Spider card ranks.
  - **The r9 navigation timeout.** It is load-dependent, and r10 leaves r9's assertions unchanged.
    - **Where it appeared.** Under extreme oversubscription, r9's navigation step and r8's Annals verb click each timed out once or more. That load was 11–15 concurrent browser tests plus `stress -c 12` on 12 cores, at load averages near 22.
    - **The first case.** The navigation step clicks the header's "Projects" link from a game page; the link was reported not visible for 30 s.
    - **A later batch.** Seven of thirteen scoped runs timed out. The four whose output was examined stopped at the Annals verb click (`locator.click: Timeout 30000ms exceeded`); the other three outputs were overwritten before they were read.
    - **What did not fail.**
      - A diagnostic that repeats the navigation step, in the test's conditions, ran 120 navigations (4 × 30, logged) at a load average near 19, with no failure. Full check runs and `stress -c 12` ran at the same time; the diagnostic's logs record its own navigations, not those runs.
      - No full check run failed at any load.
      - Rerun at moderate load, every scoped run behaved as expected.
    - **Cause.** Unknown. Both steps are r8 and r9 code that r10 does not change; r10 adds no delay and no retry to them.
  - **Limits** (the last four reported by the first r10 session's verifier):
    - each element is captured at the scroll positions the test chooses. The Dark `/writing` eyebrow also fails at a position the test does not reach at 1440×900, which the round-3 reviewer's sweep found (above);
    - the links in the opened "Explore" panel (768 and 375 px) are never listed or measured: the panel opens only on interaction. The round-3 reviewer opened it and measured them on colour stacks: in Light, rest 8.86 → 8.77, and the first link hovered 5.73 → 5.34 on Task 3 and 16.8 on the candidate; Dark improves (hover 3.73 → 6.96). No regression below 4.5:1 was found, but the gap is reported in Step 11;
    - a run covered at all three retry places stays unmeasured, and Step 9 lists it;
    - no control detects a defect in clipping by an ancestor alone;
    - text that visibly overflows its parent is measured only inside it;
    - positioned content may be clipped by an ancestor that does not contain it;
    - the interaction pass measures header controls over whatever earlier steps left behind the header. From r10 the backdrop pass bounds them, with black under Light and white under Dark and Mono.
  - **Not run:** Mono, and the r10 changes in the working tree (this is a plan amendment).
- **Dry runs in a throwaway local workspace, 2026-10-11:**
  - The Task 2 compiler and tests: 8/8 pass.
  - The bridge fence check against the r1 bridge, after the fence fix.
  - The Task 5 settings test: fails only on `mono`, as intended.
  - The Task 4 replacement pattern: 46 replaced with only the Annals exclusion.
- **Not run:** the r2 browser test as a whole, the serve script, the ledger record mode, and the r2 `FONT_HOLDS` test. Their first execution is in Phase 1, under review.

## Revision log

- **r15 (2026-11-06, integration with `origin/main` recorded; docs only).** Added an *Integration with origin/main* entry to *Release records*: the owner's approval, the merge and its verification. The *Revision* line under the title is left as it was.
- **r14 (2026-11-05, P4-1 confirmed; docs only).** Recorded the owner's confirmation of P4-1:
  - dated updates on *Required arrangement* item 3, the `darkfield-vendor.test.mjs` row of *Validation model*, and the P4-1 line of *Recorded deviations*;
  - a P4-1 entry in *Release records*, with the confirmed file list and the provenance it keeps.
  - The *Revision* line under the title is left as it was.
- **r13 (2026-11-05, release records; docs only).** Recorded the owner's approval of the P6-Ff visual pass and the adoption of the P6-Fc reworded history:
  - dated updates on the two release-blocker lines under *Final review records*;
  - *Release records* after the appendix, whose hashes are on the reworded history.
  - The *Revision* line under the title is left as it was.
- **r12 (2026-11-05, final whole-branch review: records; docs only).** Added, with two r11 lines corrected under P6-T13c (DEV-12's §08 heading; the chamfer-reading line now dates its one chamfer to Phase 3 Task 10 and names the overlays that use the class since):
  - *Phase 6*: R-9 (`8859716`) and R-10 (`abe0d0b`) after R-8.
  - *Recorded deviations*: the P5 T17, P5-T20a and P5 T22 scope records and the ledger baseline note (P6-Fe).
  - *Final review records*: the release blockers P6-Fc and P6-Ff and the owner items M-2, M-3 and P5-T24a, and the superseded route-shell `pre` note.
  - The *Revision* line under the title is left as it was.
- **r11 (2026-11-05, Phase 6 Task 13: delegated rulings, deviations and Phase 6 checks recorded; docs only).** Appended, with no earlier text changed:
  - *Status*: a paragraph on the delegated rulings (owner standing authorization of 2026-10-15; not owner approvals); D11(a) open; nothing pushed.
  - *Decision gates*: a dated note in D10's cell after its unchanged acceptance record (all 136 entries retired; 0 at `35b70da`), and *Delegated-ruling records* after the table (D3, D4 (b) and (a), D5–D8, the chamfer reading).
  - *Validation model*: nine rows for the Phase 6 checks (`darkfield-limits.mjs` and `darkfield-measure.mjs`, local only; the Task 4 to Task 10 invariants).
  - *Phase 6*: the execution record (D11(a) disposition by row, new checks, Phase 6 rulings, R-1 to R-8 with commits).
  - *Phases 2–6*: *Recorded deviations* (DEV-1 to DEV-12, P2-3, P3-10, P4-1, P5-3, the P5-2 mirrors, P6-5′, each `MONO_DEVIATIONS` entry, P6-10, and the P6-R6b and P6-M2a rulings), each with its owner decision, almost all pending.
  - The Phase 4 docs follow-up was already present (`0ca760f`), so r11 does not carry it. The *Revision* line under the title is left as it was.
- **2026-10-21 (Phase 4 docs follow-up; no new revision number).** The R1 header mark (Phase 4 Task 2, `ddbebf1`) retires the KS exceptions: the *Validation model* sampler row now says the KS backdrop exception has ended, and a dated note after D10's unchanged acceptance record says its KS boundary no longer applies. *Required arrangement* item 3 and the `darkfield-vendor.test.mjs` row record the Phase 4 publication of registered R1 files (`502f631`, `ddbebf1`, `73c1d51`), pending the owner's confirmation.
- **r10 (2026-10-14, Task 3 measurement correction and contrast repairs).**
  - **Measurement.** The browser test gains:
    - a text pass, which measures nested text once;
    - an interaction pass (hover, focus-visible and press);
    - a header backdrop pass, over the header's worst ground in each theme;
    - per-run measurement, with stable run and element keys, a `MEASURED` inventory and a failure on repeated ids;
    - check mode compared run by run, with missing runs failing;
    - a selectable viewport and client-side arrival;
    - seeded randomness, stable pointer states and settled layout;
    - fixture measurement controls, masking and pairing among them.
  - **After the first draft's independent review failed** for masked runs, the per-run model replaced the minimum per control, and a census found the card calls to action.
  - **After the second draft's review failed** for runs left unmeasured on both builds, covered and off-screen runs are skipped and retried on their own, wrapped runs are measured over their line boxes, and the comparison lists every run neither build measured, with new controls for each. After the fourth review, arrivals scroll the page through so in-view fade-ins are measured, and each arrival is checked against the direct load for runs both builds skip.
  - **Preview markers.** Step 3 item 2 marks the six `/simulations` preview roots (owner-approved conditionally): a measurement boundary, not a D6 decision. The baseline is recorded with them, by an idempotent, guarded command.
  - **Contrast repairs.** Step 7 item 6 repairs every Task 3 regression found:
    - the "Launch" label (Dark), losing its hover sweep;
    - in Light: the header links and disclosure toggle, the Home contact links, the featured, case-study, writing and procedural-animation card calls to action, the `/writing` eyebrow (owner ruling), the Orbital and Traffic back links, and the Traffic case-study link when pressed.

    It names five files new to Task 3, records a pre-existing Light background residual, and classifies the Dark `/writing` eyebrow for D10.
  - **Step 9** gains a run-by-run comparison, over five viewports and two arrivals, and a one-time repair isolation.
  - **Records.** E-13, and updates to the Validation model, the surface inventory, Phase 5 and the file map.
  - **Unchanged:**
    - token values, the bridge and every global brand value;
    - game artwork and every other creative surface;
    - the r8 and r9 requirements, holds and invariants;
    - the 0.05 tolerance;
    - D5, D6 and every other open decision; D10 stays the owner's to decide;
    - Tasks 1, 2 and 4–7.
- **r9 (2026-10-13, Task 3 native-colour hold, clock correction and inactive controls).**
  - **Native-colour compatibility hold (owner-approved option A″).** Step 7 item 5 authorizes four files:
    - `SimulationCard.css` holds the preview content's ink at its baseline colours; the preview frame stays on the bridge.
    - `SimulationCard.tsx` points the Orbital and Traffic SVGs at the held variable.
    - `Simulations.css` and `Projects.css` scope `--terminal-primary` to their pages, and `Projects.css` also to its portaled modal.

    The root cause: lazily loaded global variable definitions persisted after client-side navigation. The hold is provisional, not a D6 decision. The other page variables stay global and are recorded as a residual.
  - **Coverage.**
    - The browser test gains navigation invariants (eight paths per game, in each theme) and a portal invariant.
    - Step 9 gains a native comparison (preview pixels and direct-load colours, against `BASE`) and a one-time hold-isolation check (computed styles, before versus after the hold).
  - **Clock.** The clock is fixed before navigation and advanced only in bounded steps, replacing `pauseAt(Date.now() + 1)`. The assertions and the measured states are unchanged.
  - **Inactive controls.** Disabled controls are `inactive` observations, held to the baseline record, outside `entries` and outside D10. Once enabled, they are measured as usual. The six disabled Annals verbs move there.
  - **Records.** E-12, and updates to the Validation model, the file map, the native-visual holds, the surface inventory, the D10 row and the Phase 5 row.
  - **Unchanged:**
    - token values, the bridge and every global brand value;
    - game artwork and every other creative surface;
    - the r8 accessibility, contrast-repair, disclosure and creative-boundary requirements;
    - the 0.05 tolerance;
    - D5, D6 and every other open decision; D10 stays the owner's to decide;
    - Tasks 1, 2 and 4–7.
- **r8 (2026-10-13, Task 3 measurement and contrast corrections).**
  - **Inline invariant.** It permits exactly the three inline layout measurements on `<html>`, as px lengths, and rejects legacy theme variables, Darkfield tokens, unknown names and non-length values. Negative controls were added.
  - **Step 4.** Adds the omitted expected failure: the ground-alias text test on `Home.css`, which Step 7 fixes.
  - **Annals boundary.** Only the authored narrative is marked: 6 elements, attributes only. Governed and unmarked:
    - the `h1`;
    - the section headings, including "Your Hand";
    - the verb hint and the legend;
    - the readouts, the banner, the logs and the footer;
    - every control and every scroll container.

    The baseline is recorded with the identical patch.
  - **Measured scope.** The ledger records `regions`, `unmeasured` (with reasons) and `creative`, and check mode requires them to match the baseline.
  - **Rendered ground.** Text on a painted ground is measured against the rendered pixels behind each text run, in that run's own colour, never against the page field. A painted-text pass covers the elements the sampler selectors miss. Covered or moving grounds are listed as `unmeasured`, never passed. The governed Annals spans that fail on the parchment are recorded as pre-existing `entries`. The roster glyph, on a colour stack, is recorded in the notes as a known failure outside the ledger.
  - **Prepared states.** The Annals verbs are measured enabled, hovered and pressed. The Rhythm Lab lane zones get a state table and a frozen-clock procedure.
  - **Contrast repairs.** Step 7 item 4 authorizes local repairs for every element Task 3 made worse: the roster action, the media bar controls and labels (with an owner-authorized ground or `on-*` foreground exception, which this plan limits to Light), the 404 heading and the KS mark (not a D5 ruling). Each has a measured criterion and a stop rule.
  - **Verification.** Pairs cover the repairs. A Step 9 whole-text comparison catches worsened text outside the sampler, and the reviewer re-runs it.
  - **Invalid readings.** r7's Annals parchment readings were invalid. Their absence from `entries` is not an improvement.
  - **D10's scope.** The D10 row now names what D10 accepts: `entries` only, not `creative` or `unmeasured`. The gate itself, an owner decision, is unchanged.
  - **Unchanged:**
    - token values and the bridge;
    - `--accent-color` and the other global brand values;
    - every creative surface;
    - Annals' and Rhythm Lab's appearance and behaviour;
    - the 0.05 tolerance;
    - D5, D6 and every other open decision; D10 stays the owner's to decide;
    - Tasks 1, 2 and 4–7.
- **r7 (2026-10-11, Task 1 conformance correction).**
  - Exporter: every canonical object key must match `^[A-Za-z][A-Za-z0-9_-]*$`, checked before any path is built. Refusals show unknown path segments only by length, theme-id and JSON parse refusals no longer repeat input, and `parseCanonical` is exported.
  - Verifier: proves the checkout's local git identity (checkout root; annotated tag resolving to the pinned commit; `HEAD` at that commit), reads canonical files from the pinned commit's blobs with replace refs disabled, and ignores `GIT_*` environment overrides. `verifyCanonical` is exported for public tests on synthetic repositories.
  - Defined the canonical identity check (authenticated remote side, same session; one fail-fast script run as its own `bash` process, which makes Task P2 Step 5's clone concrete) and its trust boundary, and required it wherever canonical verification runs.
  - Added `darkfield-export.test.mjs` and `darkfield-source.test.mjs` as Task 1 Step 7, a separate correction commit. The public Task 1 set is now 39 tests.
  - Recorded E-10, and that copied fonts and licences are verified by hash and never normalized.
  - Unchanged: the runtime schema, token values, published files, Task 2's insertion point, every open decision, the Status and D9 entries, and Task P0's wording.
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

## Appendix: commit hashes after the release message rewording

Every commit hash cited above this appendix, and in the phase plans and the ledger, is a pre-rewording hash; the table below gives its hash on the reworded history. Only messages were edited: every commit in the table keeps its tree, author, committer and dates.

Reworded messages (pre-rewording hash, message line counted from the subject as line 1):

- `8a652b3` line 4
- `f92fd52` line 4
- `f92fd52` line 7
- `de60b7d` line 22
- `dcf31bf` line 4
- `dcf31bf` line 22
- `614e780` line 19
- `9285e82` line 6
- `52b73af` line 10
- `d343e2e` line 25
- `d343e2e` line 44
- `600272b` line 3
- `abe0d0b` line 3

Old to new hash, from the first reworded commit (`8a652b3`) to the end of the branch (103 commits; the 15 commits before it keep their hashes):

| Old | New |
| --- | --- |
| `8a652b3` | `2e176e1` |
| `4a096f8` | `b05354e` |
| `46b941d` | `69f110b` |
| `35156c9` | `0bc4d81` |
| `96db9cf` | `c6b9bae` |
| `e9575e9` | `c937cb3` |
| `240f7cd` | `e8c4798` |
| `75b8a39` | `a82a6b8` |
| `eb1380a` | `c8d081f` |
| `065d1cf` | `4807ec9` |
| `6cdb6d5` | `31a8339` |
| `f92fd52` | `cab56b8` |
| `88c0cb6` | `730f447` |
| `44542b9` | `60ede27` |
| `78f02a1` | `750387f` |
| `a4fa16f` | `2c3e567` |
| `b974992` | `b063c25` |
| `7c4034d` | `b5245b4` |
| `c214d3d` | `053cea2` |
| `4b07799` | `783b865` |
| `b4185c3` | `362fbfc` |
| `de60b7d` | `73bc42d` |
| `7c1fdb3` | `f39470b` |
| `4de4fe4` | `52a88bd` |
| `cd78048` | `5b86734` |
| `444ec49` | `664fd75` |
| `6b86d15` | `60dc50e` |
| `91884ee` | `f7e7096` |
| `c1706a1` | `660a0dc` |
| `59bfd03` | `0dedf14` |
| `544d89f` | `e9522e8` |
| `a29fff8` | `5b60b55` |
| `0a34388` | `6736d2f` |
| `bd28fc7` | `1d9b696` |
| `d83983b` | `0e459cf` |
| `bd41d10` | `49ee044` |
| `bedadd8` | `42f3ac4` |
| `dcf31bf` | `a2149ae` |
| `f9d549d` | `24c07c7` |
| `8b2725c` | `df0f66d` |
| `e81bd05` | `dfa49ef` |
| `f218fe5` | `8722332` |
| `fc3fcdc` | `dc6ca8b` |
| `f76e673` | `23fa812` |
| `502f631` | `540e6f8` |
| `ddbebf1` | `ac933a9` |
| `73c1d51` | `e08f5b2` |
| `ef37c06` | `a36e53a` |
| `0ca760f` | `ea0999d` |
| `09cd750` | `d237337` |
| `fb6e2b2` | `26d08d5` |
| `fa4d2e6` | `512aa6c` |
| `030a31f` | `93faa8d` |
| `2a23016` | `e29e4b5` |
| `b7a759b` | `0bddc3e` |
| `614e780` | `97c447b` |
| `9285e82` | `2fd08b1` |
| `52b73af` | `9280522` |
| `8e60298` | `ad98a3a` |
| `c5c2e15` | `5fc85d4` |
| `efa18ba` | `c231aa0` |
| `dd6580d` | `9ce5b17` |
| `1f33d89` | `a92d4bb` |
| `66469d9` | `de6e5f3` |
| `4247156` | `5a066e3` |
| `b0026a7` | `c001982` |
| `edecf9c` | `ae8f783` |
| `3e60e5d` | `7350bff` |
| `5207787` | `36fc59f` |
| `a7e629e` | `1161253` |
| `d343e2e` | `6b4774c` |
| `3c89af9` | `4991787` |
| `44a7a2d` | `62c8a52` |
| `35b70da` | `881b77a` |
| `058d1c6` | `2af1a98` |
| `ac34a8a` | `671e19f` |
| `b68acd5` | `88a221d` |
| `6582c5f` | `36af0a0` |
| `4dda750` | `c5768a1` |
| `ec8144d` | `50a5e5e` |
| `8a9f04e` | `bc788f4` |
| `72bfc63` | `056ee7a` |
| `b424fd1` | `c2071fe` |
| `600272b` | `3b12b22` |
| `3f3aa59` | `969b85f` |
| `6dbc820` | `edd87ad` |
| `6e61c28` | `48472cb` |
| `dc7153f` | `86a28fe` |
| `9ba1087` | `6df62fb` |
| `46510d9` | `9037ac2` |
| `78c7ed3` | `dc19d93` |
| `e10e34a` | `f013bd7` |
| `52454ec` | `bee391c` |
| `5fe2760` | `85cf7cc` |
| `a5fffb7` | `cd4cbe4` |
| `9c77aa8` | `83160e6` |
| `933f932` | `a849a08` |
| `d607cce` | `7644f58` |
| `370f41d` | `a1b9eac` |
| `d874e45` | `240b6c6` |
| `8859716` | `271ef71` |
| `abe0d0b` | `2928f84` |
| `fea5b74` | `fe0caba` |

## Release records (2026-11-05)

This section follows the appendix. Its hashes are on the reworded history unless marked "pre-rewording". These records note owner approvals and controller checks; they resolve nothing else.

- **P6-Ff, owner visual pass: approved 2026-11-05 (owner, direct).**
  - **What was reviewed:** the 259-screenshot contact sheet (`$DF_TMP/phase6/owner-visual/`, local) of tree `9430bca`. That tree is pre-rewording `fea5b74` and `fe0caba` here. It covered Dark, Light and Mono at desktop and phone widths, plus Settings open, forced colours, reduced motion and the no-JavaScript route shell.
  - **What it accepts:** composition, readability, theme consistency, responsive layouts and the preservation of independently authored creative surfaces.
  - **Scope:** static screenshots only. Live-interaction checks the owner has not shown stay open: hover, pressed and focus behaviour in a live browser; the headed-browser Tab-out check of the descent and observing frames (P6-T7b); Firefox and Safari (all checks ran in Chromium); real-device checks (the apple-touch icon inset on iOS, forced colours on Windows); and the production checks after deploy.
- **P6-Fc, reworded history: adopted 2026-11-05 (owner, direct approval; run by the controller).**
  - **The move:** `git reset --keep refs/darkfield/reworded-candidate` moved `feat/darkfield-foundation` from pre-rewording `fea5b74` to `84c962e`.
  - **Recovery ref:** `refs/darkfield/backup-pre-reword` keeps pre-rewording `fea5b74` and is not moved or deleted. `refs/darkfield/reworded-candidate` stays at `84c962e`.
  - **Checks before the move:**
    - the worktree, branch and clean tree;
    - all 118 rebuilt commits paired with the originals, each with the same tree, the same author and committer lines, and parents mapped;
    - no merges in the range, and no signatures to lose;
    - exactly the 13 message lines listed in the appendix differ;
    - the candidate's only file change is the appendix (128 lines added).
  - **Checks after the move:** the branch head is `84c962e`; the working tree is clean; the tree of `fe0caba` equals the pre-rewording tree; and the only file difference from pre-rewording `fea5b74` is the appendix.
- **P4-1, registered R1 files: confirmed 2026-11-05 (owner, direct).**
  - **What is confirmed:** publication of exactly these ten registered R1 files:
    - the Favicon group: `web/public/favicon.ico`, `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png` and `apple-touch-icon.png`;
    - the three app icons: `web/public/icon-192.png`, `icon-512.png` and `icon-512-maskable.png`;
    - the symbol: `web/src/assets/darkfield/darkfield-r1-symbol-currentcolor.svg`.
  - **Commits:** `540e6f8`, `ac933a9` and `e08f5b2` (pre-rewording `502f631`, `ddbebf1`, `73c1d51`).
  - **Provenance kept unchanged:**
    - each file stays recorded in `web/src/styles/darkfield/SOURCE.json` with its canonical source path;
    - the nine C2PA-stripped copies keep the `c2pa-strip` transform and both hashes; `favicon.ico` stays a plain copy;
    - canonical verification still checks every file against the pinned canonical bytes;
    - `darkfield-vendor.test.mjs` still requires each published file to equal its manifest hash.
  - **Not covered:** any other R1 file, any change to these files, and any publication of the canonical `tokens.json`. Each needs its own approval; D2b and D11(b) are unchanged.
  - **Effect:** P4-1 no longer blocks a push. Push and every later step remain under D9.
- **Integration with `origin/main`: merged and verified 2026-11-06 (owner approval, direct; run by the controller).**
  - **Remote state:** the owner fetched `main` on 2026-11-06; the remote `main` was `2c16f65`, the same seven commits reviewed earlier (PRs #28, #29 and #31). They change code ownership, the README, a new development guide, and the vite (^8.0.16 to ^8.1.6) and zod (^4.0.5 to ^4.6.7) ranges with the lockfile.
  - **The merge:** `f83f06c` merges `2c16f65` into `2316a32`. It was merged, not rebased, so every branch hash above stays as adopted. There were no conflicts, and no file is changed on both sides. The merge tree equals `git merge-tree`, and it changes only main's five files. Both recovery refs are unchanged.
  - **Independent merge review:** PASS. It found no rewritten commit and no spec wording in the message. It raised two documentation mismatches as owner items, not fixed here:
    - `AGENTS.md` still points to `README.md` for infrastructure commands, which now live in `docs/DEVELOPMENT.md`;
    - `AGENTS.md` says `npm install` where the guide says `npm ci`.
  - **Integration verification:** run on exports of `f83f06c`, each with a clean `npm ci` (vite 8.1.6, zod 4.6.7). The reference was a fresh build of pre-rewording `fea5b74`, which resolves vite 8.0.16 and zod 4.3.5.
    - **Static gate:** typecheck, lint, `npm test` and the generated-articles check pass. The node tests have the same 258 names and statuses as the reference, including the three known non-Darkfield failures.
    - **Foundation test:** unsharded, check mode, Dark, Light and Mono: passes. Its log is identical to the reference with numbers masked.
    - **Seven named browser tests:** the same results as the reference against BASE, with the P6-Fk divergences and the known orbital failure only.
    - **Mono record:** no entries, and equal to the reference record.
    - **Canonical checks:** the clone is at the pin and clean, `--verify` passes, and the provenance node tests pass.
    - **Build:** the same file list apart from hashed JavaScript names, and the same route shells, sitemap and fonts. CSS, images and fonts are byte-identical. The JavaScript differs by the zod update (its version is visible in the bundle; the size split between zod and vite is an estimate) and by small code-generation changes attributed to vite (inferred).
    - **Rendered output:** every screenshot pair is pixel-identical except `/simulations` (Dark and Light) and `/simulations/rhythm-lab` (all three themes). Those pairs differ only in animated content, which also differs between two captures of the same build: the preview-card animations, and Rhythm Lab's full-viewport rain canvas. With the animations paused and the canvas hidden, they are pixel-identical.
  - **Local note:** the worktree's own `node_modules` predates the merged lockfile; `npm ci` refreshes it before local development.
  - **Not approved here:** push, pull request, merge to `main` and deploy stay open under D9.
- **Still open before release:** D9 push, pull request, merge and deploy, each separately approvable. D11(a) is open. The owner decisions and deviations recorded above are unchanged.
