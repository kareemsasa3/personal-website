# ANASTASIS gallery integration

Date: 2026-10-22. Repository references: `origin/main` at `b4283dc`, and the Darkfield work on local branch `feat/darkfield-foundation` at `6ee0d6c` (not on `main`). Scope: publishing the ANASTASIS animation as a piece in `/procedural-animations`. Terminal discovery is deferred (section 4).

Status: **design approved; implementation not authorized.**

- On 2026-10-22 the owner approved the design. That covers:
  - the three-layer ownership boundary, preservation requirements and provenance rules;
  - the dependency strategy and the reduced-motion fan gate;
  - the validation requirements and the implementation sequencing;
  - decisions A1–A13 (section 3), and decisions O1–O5, O8 and O9 (section 5).
- This approval closes the architectural design review.
- It does not authorize implementation, vendoring dependencies, integration changes, pushing, merging or deploying.
- Still open, at implementation time: verification items O6 and O7, and the review gates G1–G3 (section 5).
- Nothing is implemented: no animation change, no vendored file, no route, test or data change, no implementation commit.

## Evidence labels

- **[code]**: read in this repository at the ref named (`main` = `origin/main` `b4283dc`; `df` = `feat/darkfield-foundation` `6ee0d6c`).
- **[artifact]**: read in the ANASTASIS source file identified in 2.1. Line numbers refer to that file.
- **[network]**: fetched and checked on 2026-10-22.
- **[spec]**: read in the canonical Darkfield specification at tag `tokens-v1-2026-10-09`. Cited by section only; the specification is private and is not quoted here.
- **[owner]**: stated by the owner on 2026-10-22.
- **[inference]**: reasoning from the evidence above, not separately verified.
- **[unverified]**: not checked in this session.

---

## 1. Intent

ANASTASIS is a completed, standalone creative piece: a 40-second Three.js assembly of the owner's workstation. The goal is to give it a natural place on the site, not to make it bigger or more elaborate. [owner]

**Goals**

- Publish it in the Animations gallery as its primary home, with its full authored experience: the 40-second assembly, its own playback controls, the cinematic camera and the exploded view. [owner]
- Serve it entirely from the site's own origin, like the existing pieces. [owner]
- Stop the fan rotors under reduced motion, through one approved change to the published copy (A6). [owner]

**Non-goals**

- Terminal discovery (deferred, section 4.1).
- A Home placement (rejected). [owner]
- Any redesign, restyle or animation-development pass on the piece, including restyling its internal interface with Darkfield. [owner]
- Making Pause suspend ambient animation in normal mode (recorded, section 4.2). [owner]
- The companion case study (section 4.3). It is a planned deliverable, but creating it and adding links between it and the piece are outside this integration's implementation scope. [owner]

**Anti-goals: these would be failures even if the page worked**

- Any change to the original source artifact.
- Any request to a third-party origin from the piece or its route.
- Site behaviour that depends on the piece's diagnostic hooks (`window.__anastasis*`).
- Any edit to the published copy beyond the list in 6.2.
- Interfering with the active Darkfield migration work.

---

## 2. Verified facts

### 2.1 The source artifact

- File `anastasis_b53d8da9.html`, 101,209 bytes, dated 2026-10-20, SHA-256 `b53d8da9b8cec3b307f1ed4a01de74e632bed6e420d6bc5b28734d109888fb4f`. The owner keeps it outside the repository. [artifact]
- It is a single 1,002-line HTML file. All of its logic is one inline script, a strict-mode IIFE spanning lines 140–999. [artifact]
- **External loads.** These account for all 13 `http(s)://` strings in the file: [artifact]
  - lines 7–8: two `preconnect` links (Google Fonts);
  - line 9: one Google Fonts stylesheet, loading Michroma and Instrument Serif in normal and italic;
  - lines 129–138: ten `<script src>` tags (three.js r128 and nine `examples/js` add-ons).
- It has no `robots` meta. [artifact]
- **Its own interface:**
  - a title block (`ANASTASIS`, a tagline, a one-line hardware summary);
  - component labels with leader lines and a drag hint;
  - a playback bar: play/pause, restart, timeline scrubber, speed (0.5×–2×), Exploded view, Cinematic camera;
  - an error panel (`#err`) with two authored messages: one when `window.THREE` is missing (it asks the viewer to check their connection), and one when WebGL is unavailable (it asks them to turn on hardware acceleration);
  - keyboard controls on its own document: Space, ←/→ (±2 s), E, R and C.

  [artifact]
- **Timeline:**
  - `DUR = 40` (line 691);
  - autoplay: `playing=true` (line 724);
  - power-on at `t ≥ 32.7` s (`powerAt`, line 788).

  [artifact]
- **Reduced motion.** `reduceMotion` is read once at load from `matchMedia` (line 146) and lives inside the IIFE closure. A CSS rule removes the hint's transition (line 100). [artifact]
  - **Frozen under reduced motion:**
    - RGB cycling (807–808);
    - the I/O light pulse (813);
    - the RAM shader time (814);
    - workstation bobbing (908);
    - the final camera sway (911).
  - **Not gated:**
    - the assembly autoplay and the cinematic camera;
    - the five fan rotors (two case fans, the cooler, the cooler front fan and the PSU) at line 909, `var spin=dt*Pnow;`.
  - **How the rotors move.** They advance on the real-time frame delta, scaled by power (`Pnow`), independent of `playing`. After power-on they therefore turn under reduced motion, while paused, and indefinitely after the timeline ends.
- **Diagnostics.**
  - `window.__anastasis` exposes `seek`, `explode`, `state` and `audit` (line 995). `seek` sets the time and pauses.
  - Eight further `window.__anastasis*` diagnostics are defined at lines 922–976.

  [artifact]
- **Motion source.** Part and camera motion are driven by hand-written keyframe tables: per-part `keys` passed to `comp(...)` (defined at line 599) and the camera table `CK` (from line 693). [artifact]
- **Characters.** The only non-ASCII character the piece renders is `×` (U+00D7, the speed button). `≈` appears only inside a code comment (line 633). [artifact]

### 2.2 Third-party assets

**three.js.**

- The npm registry's `three@0.128.0` tarball matched its published `dist.integrity` (SHA-512). [network]
- All ten files the piece loads are byte-identical to that tarball. That includes `three.min.js` as served by cdnjs (`r128`). [network]
- The licence is MIT: the tarball's `LICENSE` (SHA-256 `7dddf7c5b8fd10ee654db8857d75d104b5557889aa5a91fc4ca545ea7c07062f`) and the `three.min.js` header (`SPDX-License-Identifier: MIT`). [network]

| Path in `three@0.128.0` | Bytes | SHA-256 |
|---|---:|---|
| `build/three.min.js` | 603,445 | `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2` |
| `examples/js/controls/OrbitControls.js` | 26,375 | `02bb4ade710f3e607329e37a21f098bc3ac70eb6e33daf8a65e79f4db785e7b2` |
| `examples/js/environments/RoomEnvironment.js` | 3,425 | `94fd17363598048cb3faf3b3d7d663e561e8bc929b0162716f33424af30695ad` |
| `examples/js/shaders/CopyShader.js` | 606 | `6b5da4fe3b410286974590885f82fe4a446f25c728f7d6c888e2a2a331333949` |
| `examples/js/postprocessing/EffectComposer.js` | 6,271 | `4fc320fa3185847797332bc2b0125b1a39b9cf5fc4170a2f180cfa54fb057a2b` |
| `examples/js/postprocessing/ShaderPass.js` | 1,416 | `2e64890b8e4c4dafcfd796d5c84877f2ad36a101c83263211c500ec40eaf1240` |
| `examples/js/postprocessing/RenderPass.js` | 1,746 | `57a549b2d6a947cddf0385a804dc70c3b2d155663d908e99e35d42274b3878be` |
| `examples/js/shaders/LuminosityHighPassShader.js` | 1,228 | `00ed0682e61ca207d9c62298269472d6d4eedd9d33528400e7cbc633da8544da` |
| `examples/js/postprocessing/UnrealBloomPass.js` | 12,612 | `1ed342b273e9b077a3e92e5caeecd45043f03071306c696564d5b53f0562dced` |
| `examples/js/shaders/GammaCorrectionShader.js` | 679 | `77c8fdedf8f488b7cab5392afb2d55f1acadf9d9086961b61dfd28f7ae80bdc3` |

That is 657,803 bytes in total, uncompressed. [network]

**Fonts.**

- **Licences.** Both are SIL OFL 1.1, according to the `google/fonts` repository's `METADATA.pb` and `OFL.txt` on its `main` branch. [network] That branch is not pinned, so the check would need to be re-read at implementation.
  - Michroma: Copyright 2011 The Michroma Project Authors.
  - Instrument Serif: Copyright 2022 The Instrument Serif Project Authors.
- **Reserved Font Name.** I read only each `OFL.txt` copyright line, and neither carries one. [network] The full licence text was not read for this point. [unverified]
- **What Google Fonts serves.** The `css2` endpoint for the piece's exact query serves Michroma v21 and Instrument Serif v5, each as `latin` and `latin-ext` WOFF2 subsets. [network]
- **Subset coverage.** The `latin` subset covers every character the piece renders (2.1). [inference]
- **Not yet recorded:** the font files' bytes and hashes. [unverified]

### 2.3 How the gallery works today

- **Mounting.** Pieces are self-contained `piece.html` files under `web/public/procedural-animations/<slug>/`. The site frames each one in a same-origin `<iframe>` (`ProceduralAnimationPiece.tsx`). This was introduced by `fa2bb54` and `2c9ab9c`, both on `main`. [code, main]
- **One data entry drives everything.** A typed entry in `web/src/data/proceduralAnimations.ts` (`slug`, `title`, `description`, `poster`, `artifactPath`) produces: [code, df]
  - the route;
  - the route metadata (`routeMetadata.ts:149–155`): title `<title> - Kareem Sasa`, description from the entry, sitemap priority 0.3;
  - the breadcrumb structured data (`structuredData.ts`);
  - the static route shell and sitemap entry (`vite.config.ts`);
  - the gallery card (poster, title, description);
  - the iframe title, `<title>, procedural animation`.
- **Posters.**
  - Each is `web/public/media/<slug>-card.webp`. All four are 960×540 lossy WebP. [code]
  - The data model describes them as rendered from the piece itself, and so does the message of `fa2bb54`. [code]
  - The repository doesn't record how they were captured. [unverified]
- **Font precedent.** `descent/fonts/` and `observing/fonts/` hold the WOFF2 files, their licences and a `README.txt` with provenance. DESCENT's Cormorant Garamond is the Google Fonts `latin` subset. [code]
- **Smoke test** (`web/scripts/smoke-test.mjs`; the piece list is at line 539 on `main` and 557 on `df`). It hardcodes the pieces. For each one it requires: [code]
  - the route shell's title, canonical URL, WebPage and breadcrumb;
  - a link from the gallery and a sitemap entry, with `piece.html` absent from the sitemap;
  - `piece.html` to contain exactly `<meta name="robots" content="noindex, nofollow">`;
  - `piece.html` to contain no `http://` or `https://` substring.
- **`web/scripts/procedural-animations-browser-test.mjs`** hardcodes the pieces, each with a global the test waits for. It runs against a production preview and checks: [code]
  - layout at 1600×900 and 390×844, with no scrolling;
  - the iframe's title and `src`, and the tab order;
  - no third-party requests, page errors or console errors;
  - a per-piece probe that the piece applies its own reduced-motion handling;
  - keyboard-activated fullscreen.
- **`web/scripts/darkfield-foundation-browser-test.mjs`** (only on `df`) hardcodes `PIECES` at line 3253. It uses the list for the frame's keyboard focus ring: entry and exit, fullscreen, the ring at four widths, and title fit at 320–390 px. [code, df]
- **Generated AI-context files.** `web/scripts/generate-ai-context.mjs` reads `proceduralAnimations.ts`, among other data files. Every run writes six files: `public/llms.txt`, `public/ai/context.md`, `ai/projects.md`, `ai/capabilities.md`, `ai/contact-policy.md` and `ai/site-manifest.json`. [code, df]
  - Two of them reference the pieces: `context.md` lists each one, and `site-manifest.json` contains 11 `procedural-animations` references. [code, df]
  - The outputs were last changed in `96bc69e` (2026-10-10). Some generator inputs have changed since, so a fresh run may also bring in changes unrelated to this piece. I have not run it to check. [code, unverified]
  - No package script, build step or CI workflow invokes the generator; I searched `vite.config.ts`, `package.json`, `scripts/` and `.github/`. [code]
- **Gallery copy.** The gallery intro (`ProceduralAnimations.tsx:17–21`) and its meta description (`routeMetadata.ts:127`) describe the pieces' movement as generated in code rather than keyframed by hand. Each piece's iframe title calls it a "procedural animation". [code, df]
- **Production headers.** On 2026-10-22, production served `/procedural-animations/descent/piece.html` with `x-frame-options: SAMEORIGIN` and no `Content-Security-Policy`. [network] The repository's only CSP is in `infrastructure/nginx/conf.d.disabled/`. [code]

### 2.4 Darkfield scope

- The migration plan (`docs/superpowers/plans/2026-10-11-darkfield-migration.md`) puts the owner's future animation work outside the migration's scope. [code, main]
  - Its *Scope boundary* lists `web/public/procedural-animations/**` as creative-owned. Creative content is never restyled, and Darkfield governs only the frame around it.
  - For creative content, the plan sets an accessibility floor instead of Darkfield styling: existing behaviour must not regress, and the reduced-motion preference must reach the artifact.
  - Phase 6's motion measurements exclude `<iframe>` boxes.
- The specification's motion section (§12) and the README's usage rules govern the system's interface. [spec] Read literally, §12 would exclude this piece's assembly and rotating parts. That supports the plan's reading: §12 governs the frame, not the artwork. [inference]
- Phase 5 Task 6 (`614e780`, only on `df`) gives the gallery and piece bar their Darkfield chrome, plus a keyboard focus ring drawn inside the frame. [code, df]
- On 2026-10-22, `df` was 76 local commits ahead of `origin/main` and not pushed. Phase 5 was in progress, with Task 11's amendment uncommitted. [code]
- I found no declared WCAG conformance target. I searched the plans under `docs/superpowers/plans/` (on `df`) and `AGENTS.md`. [code]

### 2.5 Public naming

The site's published essays already name Anastasis as the owner's workstation, for example `web/src/content/articles/the-work-the-agent-stopped-doing.md`. [code]

### 2.6 Case-study conventions

**Current implementation.** [code, df]

- **Data model.** `web/src/data/caseStudies.ts` defines each study.
  - **Sections:** a fixed, ordered set: problem, constraints, architecture, decisions, implementation, outcome, evidence, links. A study can retitle sections (`sectionTitles`) and add content blocks before or after a section: prose, list, prompts, images, recording, comparison.
  - **Type:** `kind` is `system` or `experiment`. `projectId` is optional, and `projects.ts` has no Anastasis entry.
  - **Evidence:** each entry has a kind (private operator artifact, sanitized architecture summary, repository provenance, local system evidence, evaluation record) and a status (Public, Private, Sanitized, Unavailable).
- **Slugs.** The three system studies are named after their project (`aether`, `erebus`, `arachne`). The one experiment study is named after its title (`where-the-specification-lived`).
- **Registration.** Each study has a hand-written route entry (`web/src/routes/index.tsx`) and its own page component (`web/src/pages/CaseStudy*`), which renders the shared `CaseStudyPage`. Route metadata and structured data are generated from the data file.
- **Linking precedent (study and artifact).** *Where the Specification Lived* links to its artifact through an "Open the Traffic Simulator" entry in its `links`. The simulator links back through a sentence in its page intro (`TrafficSimulator.tsx:150`).
- **Evidence storage.** That study's evaluation evidence lives under `docs/evidence/traffic-simulator-experiment/`, and the study links to it as an evaluation record.
- **Name usage.** The published essays use "Anastasis" for both the workstation and its configuration repository (`the-work-the-agent-stopped-doing.md`).

**Approved, not yet implemented.**

- `docs/evidence-linked-case-studies-spec.md` has the status "approved design, implementation pending". It is subject to a 2026-09-26 supersession, recorded in that file, that separates homepage curation from evidence qualification. [code]
- Its per-claim evidence model and its personal/client publication gate do not exist in the current data model. [code, df]

---

## 3. Approved decisions

All of these were approved by the owner on 2026-10-22.

| Id | Decision |
|---|---|
| A1 | The Animations gallery is the primary home, with the full authored experience: its own controls, the cinematic camera and the exploded view. |
| A2 | No Home placement. |
| A3 | **Three-layer boundary.** (1) The original artifact is immutable. (2) The published copy contains only the documented delivery changes and the single approved behaviour change (6.2). (3) The site interface around it is the existing Darkfield gallery. |
| A4 | Self-host three.js and the fonts, with verified versions, licences and provenance. |
| A5 | The piece's internal interface stays as authored. Darkfield does not restyle it. |
| A6 | **Reduced-motion fan gate.** In the published copy only, line 909 `var spin=dt*Pnow;` becomes `var spin=reduceMotion?0:dt*Pnow;`. The original stays unchanged, and the provenance record documents the difference. |
| A7 | Autoplay of the 40-second assembly stays as authored. The existing reduced-motion behaviour meets the verified site requirements (2.4). |
| A8 | **Testing.** Verify that the fan rotors stay stationary under reduced motion and that normal-mode behaviour is unchanged. Don't rely only on pixel equality of whole screenshots, because labels and transient UI can change independently. Tests may use the diagnostic hooks; production behaviour must not depend on them. |
| A9 | The gallery poster comes from an actual rendered frame of the piece. |
| A10 | The hardware and OS details shown in the piece are approved for publication. |
| A11 | Integration happens on a clean baseline after the active Darkfield work is ready. |
| A12 | Terminal discovery is a separate, deferred change. |
| A13 | The Pause observation (4.2) is recorded as a separate, nonblocking note and is out of scope. |

---

## 4. Deferred work

### 4.1 Terminal discovery

Intended as a `neofetch`-style command that prints the workstation's specifications and points to the piece. [owner]

- **Current facts.** The terminal has eight commands (`ls`, `cd`, `help`, `clear`, `pwd`, `exit`, `history`, `man`; `web/src/hooks/useTerminalCore.ts:515`). Route navigation goes through `cd`. No `neofetch` command exists. [code, df]
- **Governance.** The plan treats the whole terminal as governed interface, with §07 covering its text graphics. The Phase 5 terminal work had not been done on 2026-10-22. [code, df]
- **Next step.** This needs its own design, after that work and after this integration. It is not part of this document's acceptance.

### 4.2 Pause does not suspend ambient animation in normal mode

- **What happens.** In normal mode, these keep moving while paused and after the timeline ends, because they run on the real-time clock, not the timeline: the fan rotors after power-on, bobbing, RGB cycling, the RAM shader and, at the end, the camera sway. [artifact]
- **Status.** The repository declares no WCAG target (2.4), but that alone doesn't settle the accessibility question. WCAG 2.2.2 (Pause, Stop, Hide) is a relevant reference; whether it applies here has not been assessed. [unverified]
- **Scope.** This is not addressed by this integration. [owner]

### 4.3 Companion case study

The original project plan includes both the animation and a case study documenting how it was built, with navigation between them. The case study is a planned companion deliverable. [owner]

- **The two pages.** The animation is the completed artifact. The case study explains the engineering and creative process behind it: reference-photo fidelity, modelling and assembly decisions, iterations, collision corrections, validation evidence, and human-directed AI collaboration. [owner]
- **Intended outcome.** Visitors can move both ways: from the animation to the case study, and from the case study to the animation. [owner]
- **Separate work.** Creating the case study and implementing the links are separate from this gallery integration. [owner]
  - The integration's artifact, generated-file refresh, integration and copy commits contain no case-study link (section 8).
  - The three-layer boundary (A3) is unchanged, and the source artifact stays unchanged.
  - Any link placed in the piece's frame or in the gallery would change files this integration leaves unchanged (6.1). It is therefore its own change to the Darkfield-governed interface, needing its own approval. [code, inference]
- **Conventions.** The study would be built within the case-study conventions in 2.6. Any evidence it publishes would follow the publication rules of the evidence-linked case-study specification, once those are implemented. [code]
- **Public-safety review.** Every piece of evidence goes through the public-safety review in `AGENTS.md` before publication. Private reference photos, AI conversations and development records are not assumed to be publishable. [owner]
  - The piece's own collision and audit diagnostics are part of the source artifact (2.1). [artifact]
  - Whether other process records exist, and whether any can be published, has not been checked. [unverified]

**Open owner decisions.** None of these is resolved by this document.

| Id | Decision |
|---|---|
| C1 | **Title and slug.** Existing conventions are mixed (2.6), and "Anastasis" already names the workstation and its configuration repository in published essays. |
| C2 | **Study type.** `system` or `experiment`, and whether the study needs a project entry. |
| C3 | **Exact link placement in each direction.** From the study to the piece, an entry in the study's `links` matches the existing precedent. From the piece or gallery to the study, the options touch files this integration leaves unchanged (see above). |
| C4 | **Publication sequencing** of the case study and its links, relative to the gallery integration. |
| C5 | **Editorial structure:** section titles and content blocks. |
| C6 | **Evidence:** which process evidence exists, what passes public-safety review, and whether it is stored under `docs/evidence/`. |

---

## 5. Owner decisions and remaining gates

The owner decided O1–O5, O8 and O9 on 2026-10-22; the decisions are recorded below as given. O6 and O7 are verification requirements to be met during implementation, not owner decisions. [owner]

### Decided

| Id | Item | Owner decision (2026-10-22) |
|---|---|---|
| O1 | **Title and description** | Title: `ANASTASIS`. Description: "A procedural 3D assembly of the workstation behind the work." The description appears on the gallery card, in the meta description and route shell, and in the generated AI-context files (subject to O8). |
| O2 | **Slug** | `anastasis`. The canonical route is `/procedural-animations/anastasis`. |
| O3 | **Gallery position** | Appended after One Quiet Day. The existing order of the other pieces is unchanged. |
| O4 | **Poster** | See the bullets below this table. |
| O5 | **Darkfield readiness** | Three conditions, all of which must hold: (1) the relevant Darkfield work has merged into `main`; (2) the resulting baseline passes its required validation; (3) the integration can begin on a clean branch without interfering with active work. Local completion or an unmerged branch is not sufficient. |
| O8 | **Generated AI-context files** | **Option (c)**: a separately reviewed, current baseline of the generated files is established first, then the outputs are regenerated for ANASTASIS. See the bullets below this table. |
| O9 | **Gallery copy** | Revise the inaccurate claim that the pieces are not keyframed by hand. The gallery includes both procedurally constructed systems and authored keyframe choreography. Approved direction: "Code-driven explorations of motion, from procedural systems to choreographed three-dimensional scenes." The *Procedural Animations* category name is kept: the term still fits the collection, and only the absolute claim about keyframing is wrong. The exact copy changes still need preparing and separate approval (see below). |

**O4 poster:**

- The completed, illuminated workstation at about 37.5 seconds.
- Cinematic camera on; exploded view off.
- The piece's own ANASTASIS title treatment is kept.
- The playback controls, component labels and drag hint are hidden for the capture only.
- The frame is authentic and rendered, with only resizing and WebP encoding applied.
- The 960×540 composition is checked before it is accepted.
- No creative change to the hardware and no invented visual details.
- If this composition doesn't work at the poster's aspect ratio, report it rather than improvise a different shot or crop.

**O8 generated files:**

- The baseline refresh runs against the appropriate post-Darkfield baseline (O5).
- The complete regeneration diff is inspected and reported to the owner.
- Unrelated or unexpected changes need explicit approval; the generator's output does not authorize committing them.

### Remaining gates

| Id | Gate | Kind |
|---|---|---|
| O6 | **Font files.** Exact files, bytes and hashes. Also re-read each OFL file in full for a Reserved Font Name statement. | Verification at implementation |
| O7 | **Fan-check method.** Confirm that the measurement in 6.6 isolates the rotors as 6.6 expects (the assumption marked [inference] there). | Verification at implementation |
| G1 | **Generated-file review (O8).** The complete diff of the baseline refresh, and then of the ANASTASIS regeneration, is reported to the owner. Only approved changes are committed. | Owner review at implementation |
| G2 | **Copy review (O9).** Exact copy changes, following the approved direction, are prepared and submitted for separate review. Nothing is committed until the owner approves the exact text. | Owner approval of exact text |
| G3 | **Poster composition (O4).** The 960×540 capture is checked before acceptance. If the composition doesn't work, it is reported rather than improvised. | Check at implementation; report to owner if it fails |

---

## 6. Implementation requirements

### 6.1 Files

New, all public:

```
web/public/procedural-animations/anastasis/
  piece.html                    published copy (6.2)
  PROVENANCE.txt                provenance record (6.3)
  vendor/three-r128/            the ten files of 2.2 at their package paths, plus LICENSE
  fonts/                        Michroma, Instrument Serif (normal, italic) WOFF2; OFL texts; README.txt
web/public/media/anastasis-card.webp
```

Changed:

- `web/src/data/proceduralAnimations.ts`: one entry, at the position from O3.
- `web/scripts/smoke-test.mjs`: one row in the piece list.
- `web/scripts/procedural-animations-browser-test.mjs`: one piece, its reduced-motion probe and the fan check (6.6).
- `web/scripts/darkfield-foundation-browser-test.mjs`: one slug in `PIECES`, if that file is on the baseline.
- The generated AI-context files (2.3): refreshed first in a separate reviewed commit, then regenerated for ANASTASIS (O8, option (c)). Only owner-approved changes from each complete diff are committed (G1). At least `public/ai/context.md` and `public/ai/site-manifest.json` describe the pieces.

**Not changed by this integration:**

- `ProceduralAnimationPiece.*` and `ProceduralAnimations.*`;
- routes, navigation, `routeMetadata.ts`, `structuredData.ts` and `vite.config.ts`. The new piece's own metadata, shell and sitemap entry all derive from the data entry;
- `package.json`, dependencies, CI and infrastructure.

**Separate copy concern (O9 revises the gallery copy; exact text pending gate G2):**

- The integration itself never changes the gallery copy.
- The O9 revision is its own concern. Its exact text needs the owner's approval (G2), and it gets its own commit. It is never folded into the artifact or integration commits.
- It touches only the files that carry the approved text, and the test assertions that check that text.
  - The keyframing claim is currently in the gallery intro (`ProceduralAnimations.tsx`) and the gallery meta description (`routeMetadata.ts`) (2.3).
  - The exact file list is part of the G2 review.
- The *Procedural Animations* category name is kept (O9). Anything that uses the term only as the category name is not part of this change, unless G2 says otherwise.

**My calls (the builder may revisit the first two):**

- `vendor/` sits inside the piece's own directory, like the per-piece `fonts/` precedent, rather than in a shared location.
- The provenance record is a separate `PROVENANCE.txt`, because it covers more than fonts.
- **Stop rule.** None of the existing checks has been run against this piece. If any fails, stop and report; this includes the console-error, no-scroll, tab-order and title-fit checks. Don't add a test exception, a further edit to the published copy, or a change to the gallery components without the owner's approval.
- **Where "done" stops.** Implementation ends at local commits, checked against a local production preview. Pushing, opening a PR, merging and deploying each need separate approval, as with the Darkfield work. If the piece is deployed later, re-check on production: the response headers for `piece.html` and the vendored files, that every vendored file is served (including the extensionless `LICENSE`), and that the live route makes no third-party requests.

### 6.2 The published copy: the complete list of edits

`piece.html` is the source artifact with exactly these edits and nothing else.

| Id | Kind | Edit |
|---|---|---|
| D1 | Delivery | Remove the two `preconnect` links (lines 7–8). Replace the Google Fonts stylesheet (line 9) with `@font-face` rules that load from `fonts/` by relative URL. Keep the family names the CSS already uses (`Michroma`, `Instrument Serif`), with normal and italic styles for Instrument Serif. |
| D2 | Delivery | Add `<meta name="robots" content="noindex, nofollow">` to `<head>`. |
| D3 | Delivery | Point the ten `<script src>` URLs (lines 129–138) at `vendor/three-r128/<package path>`, keeping their order. |
| B1 | Behaviour (A6) | At line 909, `var spin=dt*Pnow;` becomes `var spin=reduceMotion?0:dt*Pnow;`. |

Everything else stays byte-identical. That covers the title, copy, error text, labels, controls, keyboard handling, timing, camera, materials and diagnostics.

Removing the 13 URLs is what satisfies the smoke test's no-URL rule. No other part of the file needs to change for that. [inference from 2.1]

### 6.3 Provenance record

`PROVENANCE.txt` records:

- the source file's name, size and SHA-256 (2.1), and that the original is kept unchanged outside the repository;
- each edit D1–D3 and B1. For B1, the before and after text, the reason (reduced motion leaves the rotors turning) and the approval date;
- three.js: the package and version, the tarball's integrity value, and each file's path, size and SHA-256 (2.2);
- the fonts: family, style, version, source, subset, licence and SHA-256 for each file (O6);
- the poster's capture record (6.4).

It contains no local paths or account names.

### 6.4 Poster

- A 960×540 WebP at `web/public/media/anastasis-card.webp`, matching the existing piece posters.
- **Authentic frame.** It derives from an authentic frame rendered by the published copy, running in a production preview, at the moment set in O4. [owner]
- **Permitted processing:** ordinary capture, resizing to 960×540, and WebP encoding. [owner]
- **Not permitted:** fabricated or creatively altered content. [owner] My reading of that, as examples:
  - compositing, retouching, painting over, or adding or removing elements;
  - re-lighting or colour grading;
  - generative fill or upscaling.

  If any other step seems necessary, such as a crop to reach the aspect ratio, raise it with the owner first. [inference]
- **Hardware as rendered.** The poster preserves the actual-hardware representation. [owner] My reading: no component or hardware detail is changed, hidden or added. [inference]
- **The piece's DOM overlays (O4).** The playback controls, component labels and drag hint are hidden for the poster capture only. The piece's own ANASTASIS title treatment stays as rendered. No other overlay is altered. [owner]
- **Selecting the frame (O4).** The completed, illuminated workstation at about 37.5 seconds, with the cinematic camera on and the exploded view off. [owner] Setting these through the piece's own states is selection, not alteration. Capture tooling may drive the piece through its own keyboard controls or its diagnostic hooks; the site only references the static image.
- **Composition check (G3).** The 960×540 result is checked before it is accepted. If the composition doesn't work at that aspect ratio, report it rather than improvise a different shot or crop. [owner]
- **Capture record (my call).** `PROVENANCE.txt` records how the poster was made: the timeline time, the camera mode, exploded or not, the viewport and device pixel ratio, the reduced-motion setting, and each processing step.

### 6.5 Integration through the existing gallery

Adding the data entry is the only integration step (2.3). The gallery card, the piece bar, fullscreen and the frame's focus ring are the existing Darkfield components on the baseline. They are not changed for this piece.

### 6.6 Tests

- **Smoke test:** add the piece's slug and title.
- **`procedural-animations-browser-test.mjs`:**
  - Add the piece with `api: "__anastasis"`, so every existing per-piece check applies to it: layout at both sizes, no scrolling, iframe title and `src`, tab order, no third-party requests, no page or console errors.
  - Its reduced-motion probe is the fan check below. `reduceMotion` is closure-scoped, so the test can't read it the way it reads other pieces' state. [artifact]
- **Fan check (A8):**
  - **Under reduced motion.** Seek past power-on (`__anastasis.seek`, which also pauses), so the timeline is static. Hide the piece's DOM overlays in the test frame (title, labels, bar, hint). Then sample a region of the rendered canvas covering a fan rotor at two times at least one second apart. The region must be unchanged.
    - This assumes that, under reduced motion and paused, the rotors are the only real-time motion in that region. [inference] That assumption follows from 2.1 and must be confirmed in the negative control below (O7).
  - **Negative control.** The same check fails against an unmodified copy of the source, run with only the delivery edits D1–D3. This shows the check detects rotation.
  - **Normal mode unchanged.**
    - *Static evidence:* the source-to-published diff shows B1 as the only script change. With `reduceMotion` false, B1 evaluates to the original `dt*Pnow`.
    - *Runtime evidence:* without reduced motion, the same region changes between samples. This shows motion remains. Bobbing moves the model too, so on its own this does not isolate the rotors.
  - Whole-screenshot equality is not the pass criterion.
- **`darkfield-foundation-browser-test.mjs`** (if on the baseline): add the slug to `PIECES`, so the frame focus ring and title-fit checks cover the piece.
- **Production independence.** No site source references `__anastasis`. A search of `web/src` returns nothing.

### 6.7 Validation commands

Run from `web/`, per `AGENTS.md` for a route or page change:

- `npm run typecheck`, `npm run lint`, `npm run build` and `npm test`;
- `node scripts/procedural-animations-browser-test.mjs` against `npm run preview`;
- the Darkfield foundation browser suite, if it is on the baseline;
- a visual check of the gallery and the piece at 320–430 px and at desktop width, in each theme the site offers.

**Copy commit (O9; exact text approved under G2).** This commit is validated on its own, separately from the artifact and integration commits. It needs:

- `npm run typecheck`, `npm run lint`, `npm run build` and `npm test`. The smoke test checks the gallery's route shell.
- The browser tests that cover the changed text, run against `npm run preview`:
  - `procedural-animations-browser-test.mjs`, which asserts the iframe title;
  - `route-metadata-browser-test.mjs`, which includes `/procedural-animations`;
  - the Darkfield foundation browser suite, if it is on the baseline.
- Every assertion affected by the revised copy, updated within this commit only to match the approved text.
- A visual check of the gallery, and of a piece's frame if the iframe title changed, at 320–430 px and at desktop width.

---

## 7. Acceptance criteria

1. The source artifact's SHA-256 is unchanged from 2.1.
2. A diff of the source against `piece.html` shows only D1, D2, D3 and B1.
3. `piece.html` contains no `http://` or `https://` substring, and does contain the exact robots meta.
4. Each vendored three.js file matches the SHA-256 in 2.2. `LICENSE` is present. Each font file matches the hash in `PROVENANCE.txt`, and its OFL text is present.
5. Loading `/procedural-animations/anastasis/` makes no request to another origin, and raises no page or console errors, at 1600×900 and at 390×844.
6. The piece autoplays its 40-second assembly. Its controls, cinematic camera, exploded view and keyboard controls behave as in the source.
7. The fan check passes under reduced motion and its negative control fails against the unmodified copy. In normal mode, the static diff evidence and the runtime motion check both hold.
8. The gallery shows the new card with the O4 poster and the O1 copy. The card navigates to the piece, and Back to Animations returns to the gallery.
9. The poster meets 6.4: an authentic rendered frame with only capture, resizing and WebP encoding applied, and its capture record is in `PROVENANCE.txt`.
10. The route shell, sitemap entry, canonical URL and breadcrumb exist for the piece, and `piece.html` is not in the sitemap.
11. The generated-file baseline was refreshed in its own reviewed commit before the ANASTASIS regeneration (O8, option (c)). The complete diff of each was inspected and reported to the owner, and only owner-approved changes are committed (G1).
12. The artifact and integration commits leave the gallery copy unchanged. The O9 revision lands only as the owner-approved exact text (G2), in its own commit, and passes its own validation (6.7).
13. The frame focus-ring checks pass for the piece, where the Darkfield suite is on the baseline.
14. No site source references the piece's diagnostic hooks.
15. Typecheck, lint, build and `npm test` pass. The production preview has been checked visually as described in 6.7.
16. No dependency, package script, CI or infrastructure file changed.

---

## 8. Sequencing

Following `AGENTS.md`, one concern per commit:

0. **Wait** for the baseline trigger (A11, O5). Start a fresh branch from the resulting `main`.
1. **Artifact commit:** the published copy, `vendor/`, `fonts/` and `PROVENANCE.txt`. This is inert until a data entry references it.
2. **Generated-file refresh commit** (O8, option (c)): the current generated files, refreshed against the post-Darkfield baseline, with no ANASTASIS entry yet. It holds only changes the owner approved after reviewing the complete diff (G1), and it is reviewed on its own. It lands before the integration commit.
3. **Integration commit:** the data entry, the poster, the test updates and the ANASTASIS regeneration of the generated files. Its complete generated diff is also reviewed under G1.

**Copy commit** (O9, exact text approved under G2): its own commit, holding only the approved text and the test assertions that check it (6.1). It is never combined with the artifact, refresh or integration commits, and it is validated on its own (6.7). The owner's decisions don't fix where it falls in the order.

Terminal discovery follows separately (4.1).

---

## 9. Risks

- **Payload.** About 658 KB of JavaScript plus fonts load on the piece route only; the gallery runs no live animation (asserted by the existing browser test). Load time and frame rate on phones have not been measured. [unverified]
- **Missing engine or no WebGL.** The piece shows its own authored error panel (2.1). The missing-engine message asks the viewer to check their connection. That was written for CDN loading, and once the engine is self-hosted it would mostly mean a missing vendored file. It stays as authored (A5).
- **Hardcoded test lists.** Three test files keep separate piece lists (6.6), so they can drift.
- **Font subsets.** The `latin` subsets cover today's text. Characters added to the piece later would fall back to system fonts.
- **Baseline drift.** Line references in this document are against `b4283dc`, `6ee0d6c` and the source artifact. Line numbers in the repository files may move by the time of implementation.
