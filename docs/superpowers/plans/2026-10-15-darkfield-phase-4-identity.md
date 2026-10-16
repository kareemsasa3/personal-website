# Darkfield Phase 4 (Identity, R1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. One task, one commit, an independent reviewer between tasks (master plan, *Operational safety*). Steps use checkbox (`- [ ]`) syntax.

**Goal:** The site's identity follows R1. The header shows the registered R1 symbol, uncontained, in its theme colour, with clear space, beside the "Kareem Sasa" wordmark set as text; the KS monogram is gone. The head ships `theme-color` and a web manifest with the registered app icons. The social image is redrawn from tokens and the registered symbol, with no binary-digit strings. Every shipped R1 file is traceable to the pinned canonical bytes.

**Authority (read in `$DF_TMP/darkfield` before each task):** §18 (all; *Masters, containment and padding*, *Adopted mark*); `r1/SPEC.md` §1 *Canonical symbol*, §2 *Colour*, §3 *Favicon and app-icon containment*, §4 *Files*, §6 *Not included*; README *Using the system*; §04 *Overused symbols to avoid*; §16 (*Literal Matrix rain*, *The three-question check*); §06 (voices, *Interface label* row, *Rules*); §14 *Icons and the identity mark*. For the brand link's states: §13 *Hover*, *Focus in each theme*, *Activation*. For colour pairs: §05 *Contrast, verified*; §11 (no glow on the mark).

The master plan's *Phase 4: Identity (R1)* bullets are the scope. Its *Scope boundary*, *Global Constraints*, *Operational safety* and *Validation model* apply unchanged.

**Inventory base:** `6f3042e`. **Execution base:** HEAD after Phase 3 exits (Phase 1 Tasks 5–7, Phase 2, Phase 3 committed). Step 0 records it. Line numbers are at `6f3042e`; locate code by selector or anchor.

### Decisions this plan relies on

| Label | Decision | Status |
|---|---|---|
| D5 ruling | Registered R1 symbol (`currentColor` SVG), uncontained, `signal` in Dark, `fg` in Light, white in Mono, §18 clear space, beside the "Kareem Sasa" wordmark; KS retired | Delegated ruling (progress.md), not an owner approval |
| Dead-code ruling | Code already dead before Phase 4 is not deleted; it is excluded by name and listed for the owner | Delegated ruling (controller) |
| D2b | Publishes `tokens.runtime.json`, the six fonts and their licences. It does **not** name R1 assets | Owner, 2026-10-11 |
| D4(b) interim, D10 | Mono is supported in code but **not offered in Settings** (interim; Phase 6 requires zero Mono failures, then flips to D4(a)). Check-mode browser runs use `dark,light`; Mono is reached only through a stored theme of `mono` and measured in record mode against `mono-worklist.json`. 136 ledger entries accepted for deferral | Delegated ruling (progress.md); owner |
| D11(a) | Open. No test or comment states a specification limit (mark minimum, clear space, signal share, inset). Tests measure what the CSS declares; the reviewer judges the declared values against §18 and `r1/SPEC.md` §1 | Open |

**Planner proposals (defaults this plan uses; controller confirms or overrules before the named task):**

| Id | Proposal | Task |
|---|---|---|
| P4-1 | **Publication basis for R1 files.** D2b does not cover them. Basis: (a) README *Using the system* and §18 require the registered files and rule out redrawing, so the site must serve them; (b) owner commit `92fc157` already published six R1 favicon files in this public repository and deployed them; (c) after the C2PA strip the files hold only path geometry, token colours and the mark's name (an identifier already public in the master plan and in `92fc157`); (d) commits stay local. **Recorded deviation (controller ruling):** this departs from the master plan's *Required arrangement* item 3 (only runtime tokens, fonts and licences are published) and from its *Validation model* `darkfield-vendor.test.mjs` row (only fonts and licences are copied files); the basis is that the master plan's own Phase 4 requires the symbol and the app icons, and `92fc157` is the precedent. The Docs follow-up amends both lines; the owner confirms before any push. Cost if wrong: drop the commits before push | 1–4 |
| P4-2 | **Provenance in `SOURCE.json`, not a sibling manifest.** The master plan's *Required arrangement* item 2 makes `SOURCE.json` the pin for every published Darkfield source file, and `darkfield-source.mjs --verify` already walks it; a sibling would split canonical verification. A new entry kind records the strip: `{ from, transform: "c2pa-strip", sourceSha256, sha256 }`. `favicon.ico` carries no C2PA data and is a plain `{ from, sha256 }` copy | 1 |
| P4-3 | **Source package `r1/`, not `assets/`.** The PNG masters are byte-identical in both; the SVGs differ only in serialization. The shipped `favicon.svg` equals the stripped `r1/favicon/favicon.svg` byte for byte, so `r1/` keeps one source for every file | 1–3 |
| P4-4 | **Wordmark voice: Narrator, mixed case.** **Controller ruling (overrides the planner's Instrument proposal):** "Kareem Sasa" keeps its mixed-case presentation in the Narrator voice: Archivo through the generated `df-heading-3` class, `fg`, no `text-transform`. Smallest change to the owner's name; words and accessible name unchanged. Flagged to the owner. Cost if wrong: one class | 2 |
| P4-5 | **Brand link states never touch the mark.** The link is operable, but a ground step, bracket or inverse fill behind the symbol would contain it. The §13 hover ground and `›` marker, and the pressed inverse, apply to the wordmark span only; the mark keeps its colour in every state. On `/` the wordmark shows `fg`; no Selected band (the brand is not in the nav set). **Where the wordmark is hidden** (`@media (max-width: 900px)` hides `.site-header__brand-name`), the link is the mark alone; **controller ruling:** acknowledgement is drawn outside the mark's clear space and never behind it: an L2 rule (`::after` on the link) beneath the link's box, which already ends at the clear-space edge: `fg-muted` hairline on hover, `signal` at `stroke-bold` when pressed. Never by recolouring the mark or a ground behind it. `pressAcknowledge.ts` gains `.site-header__brand` as a target | 2 |
| P4-6 | **Focus ring.** The `focus-ring` is drawn outside the brand link, which holds both mark and wordmark. It is a transient keyboard indicator README and §13 require, not a container; the no-container check runs at rest, hover and pressed, not under focus. Alternative: ring the wordmark only (overrides the Phase 1 focus rule for one element). Cost if wrong: one rule | 2 |
| P4-7 | **Mark size and clear space from tokens.** `--df-mark-size: var(--space-6)`, `--df-mark-clear: var(--space-2)` on `.site-header__brand`; the clear space is a margin on the mark, so it holds whatever the header's padding is. Both are token names; the reviewer confirms the size meets `r1/SPEC.md` §1 *Minimum size* and *Pixel crispness*, and the clear space meets the clear-space bullet of §18 *Adopted mark* (and `r1/SPEC.md` §1) for that size. Crispness also needs a whole-device-pixel origin: see P4-11. If either fails, stop for a ruling | 2 |
| P4-8 | **`theme-color`.** One static `<meta name="theme-color">` holding Dark `field` (the default theme); `applyThemeToDocument` sets it to the active theme's computed `--field`. The boot script is not changed: a Light or Mono visitor's browser chrome shows Dark `field` until React mounts. Recorded residual | 3 |
| P4-9 | **Manifest.** `web/public/manifest.webmanifest` with `name`/`short_name` "Kareem Sasa" (existing words), `start_url` `/`, the three icons, `background_color` and `theme_color` Dark `field`. No `display` member, so no install-as-app behaviour is introduced | 3 |
| P4-10 | **Social image.** Dark theme. `og-image.svg` stays (`web/nginx.conf` serves it by name) and becomes a generated file: a script builds it from `tokens.runtime.json`, the vendored symbol and the image's own existing words; the same script renders `og-image.png` with the installed Playwright. Layout uses token sizes in a half-size `viewBox` drawn at twice the size. **Controller ruling on words:** the image keeps its own name, role and tagline ("Kareem Sasa", "Systems Engineer", "Production software for Linux, backend, and infrastructure-heavy products.") in their current casing; only the binary row and the two decorative slash-separated lists go; no new copy. `og:image:alt` ("Kareem Sasa logo") is not rewritten; flagged for the owner | 4 |
| P4-11 | **Pixel snapping.** The header's origin is fractional in common cases: `padding: 0.55rem 0.7rem` (and `0.5rem`, `0.45rem` in the media blocks) and centring (`justify-self: center`; at ≤768 `left: 50%; transform: translateX(-50%)` on an odd width). Header geometry is not Phase 4's, so a hook `useMarkSnap` (new, `Navigation/useMarkSnap.ts`) measures the mark's `getBoundingClientRect()` × `devicePixelRatio` and sets the mark span's `translate` to minus the fractional part (always up and left, under one device pixel, so it never moves toward the wordmark), Each snap first clears the applied `translate` and reads the rect without it (so the nudge is never measured, and repeated events do not toggle it), then sets the new one, in one synchronous pass. It runs in `useLayoutEffect` (first paint), then after `document.fonts.ready`, on window resize, header resize (`ResizeObserver`), header layout change, a `devicePixelRatio` change (a `matchMedia('(resolution: Ndppx)')` listener re-created for the new ratio after each change) and when the header's entry animation ends: a transform settling fires no resize, so `SiteNavigation.tsx`'s header `motion` element gets `onAnimationComplete` dispatching a `df:header-settled` window event, which the hook handles in the next `requestAnimationFrame`. A dock↔header mode toggle remounts the header, so the mount and animation-end runs cover it. Inline style on the span only, never on `<html>` | 2 |

### What Phase 4 does not change

- Creative-owned paths, `NATIVE`/`NATIVE_FILES`/`NATIVE_KEYFRAMES`, `data-df-region` markers.
- The five favicon links in `index.html` (lines 11–15) and the shipped favicon bytes (Task 1 records them; it does not change them).
- Route metadata, structured data, `vite.config.ts` route-shell patterns, `sitemap.xml`: the image URL, type and 1200×630 size stay (Inventory). Copy anywhere.
- Infrastructure and deployment, `web/nginx.conf` included.
- Already-dead legacy logo code (dead-code ruling): `web/src/assets/logo.svg`, `web/src/components/Logo/{Logo.tsx,Logo.css,index.ts}`, `web/src/components/MainContent/{MainContent.tsx,MainContent.css}`. Excluded by name in Task 2's test; listed for owner cleanup. The master plan's "remove with approval" stays pending approval.
- The no-JS boot shell (`index.html` `.route-fallback__title`) and dock mode: neither shows a mark today; residual for the owner.

---

## Inventory at `6f3042e`

Commands run from `web/` unless noted. `C` = `$DF_TMP/darkfield` (fresh canonical clone at `4f02965`).

| Evidence | Command | Result |
|---|---|---|
| Canonical R1 hashes | `grep -E 'r1/(favicon\|symbol)/' C/MANIFEST.sha256 \| sed 's#  \./#  #' \| sha256sum -c --quiet` (in `C`) | all match |
| Shipped vs canonical bytes | `sha256sum` of `public/{favicon.ico,favicon-16.png,favicon-32.png,favicon-48.png,apple-touch-icon.png,favicon.svg}` vs `C/r1/favicon/*` | only `favicon.ico` is byte-identical (`04556046…`). The other six differ |
| Why they differ | Python (scratch): list PNG chunks; drop `caBX`; for SVG drop `xmlns:c2pa="http://c2pa.org/manifest"` and `<metadata>…</metadata>` | canonical PNGs = `IHDR caBX IDAT IEND`; shipped = `IHDR IDAT IEND`. Stripped canonical == shipped, byte for byte, for the four PNGs and `favicon.svg`. `92fc157`'s message records the strip |
| Decoded pixels | PIL, RGBA compare, shipped vs `r1/favicon` and `assets/Favicon` | identical for all four PNGs |
| Files not yet shipped | `ls C/r1/favicon C/r1/symbol` | `icon-192.png` (`6af2cb14…`), `icon-512.png` (`a39653cf…`), `icon-512-maskable.png` (`36a64186…`), `darkfield-r1-symbol-currentcolor.svg` (`527680a1…`); each carries the same C2PA data; `r1/` and `assets/` PNGs identical |
| Symbol after strip | strip of `C/r1/symbol/darkfield-r1-symbol-currentcolor.svg` | one `<title>` (the mark's name) and one `<path fill="currentColor">` with the canonical geometry; no size attributes |
| Header brand | `sed -n 84,96p src/components/Navigation/HeaderNavigation.tsx` | `Link.site-header__brand` (`aria-label="Kareem Sasa home"`, `aria-current` on `/`) holding `span.site-header__brand-mark` (`aria-hidden`, text `KS`) and `span.site-header__brand-name` |
| Brand CSS | `sed -n 55,89p src/components/Navigation/SiteNavigation.css` | `.site-header__brand` (55), `.site-header__brand-mark` boxed: border, radius, `rgba` ground, mono 800 (65–77), Light override `color: var(--fg)` (81–83), `.site-header__brand-name` literal size/weight (85–89); focus group at 149 |
| Monogram elsewhere | `rg -n '"KS"\|>KS<\|\bKS\b' src index.html -g '!src/data/generated/**'` | only `HeaderNavigation.tsx:92` |
| Browser test | `grep -n 'brand' scripts/*.mjs scripts/*.json` | `darkfield-foundation-browser-test.mjs:45` PAIRS `{ selector: ".site-header__brand-mark", rendered: true }` (KS text). Ledger: no entry, `unmeasured`, `creative` or `inactive` row names the header brand |
| Head | `sed -n 8,34p index.html` | favicon links 11–15; no `theme-color`, no manifest; `og:image` = `/og-image.png`, `image/png`, 1200×630, alt "Kareem Sasa logo" |
| Image references | `rg -n 'og-image\|DEFAULT_IMAGE' src vite.config.ts scripts ../web/nginx.conf -g '!src/data/generated/**'` | `routeMetadata.ts:6-7`, `structuredData.ts:36` (`image: DEFAULT_IMAGE_URL`, no size), `App.tsx:51-56`, `vite.config.ts:972-993` (URL and alt only), `smoke-test.mjs:169-189` (URL, type, 1200, 630), `nginx.conf` `location = /og-image.svg` |
| Social image | `cat public/og-image.svg` | binary-digit row, two slash-separated uppercase lists, a boxed KS tile, `Courier New`, `#4caf50` and other literals |
| Dead legacy logo | `rg -n -l "MainContent\|components/Logo\|assets/logo\.svg" . -g '!**/node_modules/**' -g '!web/build/**'` (repo root) | importers only inside `MainContent.tsx` and `Logo.tsx` (plus two docs). Phase 2's `DEAD` list already names the `Logo/` and `MainContent/` files |
| Manifest MIME in production | `web/Dockerfile` uses `nginx:alpine` with stock `mime.types` | whether it maps `.webmanifest` is **unknown** here; owner check after deploy |

**Ledger effect expected for the phase:** none. The KS pair is replaced (Task 2), not dropped; the KS text had no ledger row.

---

## Shared procedures

Every Bash call starts with the session environment (`DF_TMP`, `DF_PW`, `PLAYWRIGHT_BROWSERS_PATH`, `W`). Check exit codes with `; echo rc=$?`.

**Static gate (every task):** `node --test scripts/darkfield-*.test.mjs`, `npm run typecheck`, `npm run lint`, `npm test` (log to `$DF_TMP/p4-smoke.log`), and `git status --porcelain -- src/data/generated/articles.ts` prints nothing.

**Foundation browser test (Tasks 2–4):** rebuild with `bash "$DF_TMP/df-serve.sh" head "$W/web" 4173`, then `DARKFIELD_THEMES=dark,light node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p4-tN-foundation.log" 2>&1; echo rc=$?`; read the tail. Its Phase 4 invariants also run one dedicated Mono pass each (a page with a stored theme of `mono`, as `withPage` sets it; never via Settings), independent of `DARKFIELD_THEMES`.

**Mono worklist (Tasks 2–4, D4(b) interim):** `DARKFIELD_MODE=record DARKFIELD_THEMES=mono node scripts/darkfield-foundation-browser-test.mjs http://127.0.0.1:4173 "$DF_PW" >"$DF_TMP/p4-tN-mono.json" 2>&1`, then a scratch comparison with `.superpowers/sdd/2026-10-11-darkfield-migration/mono-worklist.json`: every failure id in the run's `entries` is in the worklist and not worse than its `baseline`; `regions`, `unmeasured`, `creative` and `inactive` match. A new or worsened Mono id is a stop. The worklist is not edited by Phase 4 tasks.

**Named browser tests:** `node scripts/<name>-browser-test.mjs http://127.0.0.1:4173 "$DF_PW"`. `orbital` fails only at its line 196 (ledger note). `boot-shell` runs in every task that edits TSX.

**Canonical verification (Tasks 1–3, reviewer):** in a fresh directory, never the shared clone: `mkdir "$DF_TMP/p4-canon-tN" && DF_TMP="$DF_TMP/p4-canon-tN" bash "$DF_TMP/identity-check.sh" tokens-v1-2026-10-09 4f02965bfa51eb060c39734608422dde0d288009 && (cd "$W/web" && node scripts/darkfield-source.mjs --verify "$DF_TMP/p4-canon-tN/darkfield")`. Then the canonical disclosure scan over every added public file and the commit text. Expected identifier matches: the mark's name in the SVG `<title>`, token hex values, hashes, the path data. Anything else is a stop. Without canonical access, derivation is **UNVERIFIED**, never PASS.

**Ledger rule:** a STALE entry is removed only if the task fixed it, in the same commit. A new failure, a KNOWN entry worse than its baseline, or a changed `regions`, `unmeasured`, `creative` or `inactive` record is a stop.

**Visual check:** Phase 2's `$DF_TMP/p2-shot.mjs` (head 4173 vs base 4174; base has no Mono; Mono screenshots use a stored theme of `mono`, not Settings), output to `$DF_TMP/p4-tN-shots`. Agent visual inspection, not owner sign-off.

**Staging:** `git add -- <exact paths>`; `git diff --cached --name-only | sort` equals the task's list. Messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No specification prose or limit in any message, comment or test.

---

## Step 0: Preflight (no commit)

- [ ] `git status --porcelain` is empty; `git log --oneline -40` shows Phase 3's exit. Record HEAD as the Phase 4 base.
- [ ] Re-run the Inventory rows *Shipped vs canonical bytes*, *Why they differ*, *Header brand*, *Brand CSS*, *Browser test*, *Head*. A change not explained by Phases 2–3 is a stop.
- [ ] Phase 3's `BRAND_HOLD` (controller ruling: Phase 3 exempts the header brand and KS selectors from its static tests and Task 11): `rg -n 'BRAND_HOLD|site-header__brand' web/scripts web/src`. Confirm the `.site-header__brand*` rules equal their `6f3042e` text apart from Phase 3 Task 2's value-identical alias rewrites (`git diff 6f3042e -- web/src/components/Navigation/SiteNavigation.css`), and confirm `BRAND_HOLD` is defined in `web/scripts/darkfield-grammar.test.mjs` and where the `P3_SKIP` brand entry lives. The held forms are the base rules and their media forms: `@media (max-width: 900px)` `.site-header__brand-name { display: none }` and `@media (max-width: 375px)` `.site-header__brand-mark, .site-header__settings-button { width: 2.15rem }`. A brand rule changed otherwise is a stop.
- [ ] Confirm Phase 1 Task 6's focus rule and Phase 3's `grammar.css`, `pressAcknowledge.ts` (with a `TARGET` constant) and `tokens.css`'s `df-heading-3` exist. A missing one is a stop.
- [ ] Static gate and foundation browser test on the base → `$DF_TMP/p4-base-foundation.log`.

---

## Task 1: Record the shipped R1 favicon set with its canonical provenance

**Spec:** §18 *Adopted mark* (registered groups); `r1/SPEC.md` §4–§5; master plan *Specification authority*, *Required arrangement* items 2 and 4.
**Files:** create `web/scripts/darkfield-r1.mjs`, `web/scripts/darkfield-r1.test.mjs`; modify `web/src/styles/darkfield/SOURCE.json`, `web/scripts/darkfield-vendor.test.mjs`, `web/scripts/darkfield-source.mjs`, `web/scripts/darkfield-source.test.mjs`. No shipped byte changes.

**Steps:**
- [ ] **1. Strip module** (`darkfield-r1.mjs`), exported and pure:

```js
// web/scripts/darkfield-r1.mjs: the C2PA strip applied to registered R1 files before they ship (precedent 92fc157).
// PNG: drop every caBX chunk, keep all other chunks in order. SVG: drop the c2pa namespace attribute and the
// <metadata> element. Nothing else changes, so the stripped bytes are a pure function of the canonical bytes.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const pngChunks = (bytes) => {
  if (!bytes.subarray(0, 8).equals(PNG)) throw new Error("not a PNG");
  const chunks = [];
  for (let i = 8; i < bytes.length; ) {
    const end = i + 12 + bytes.readUInt32BE(i);
    if (end > bytes.length) throw new Error("truncated PNG chunk");
    chunks.push({ type: bytes.toString("latin1", i + 4, i + 8), raw: bytes.subarray(i, end) });
    i = end;
  }
  return chunks;
};
export const stripC2pa = (bytes, path) => {
  if (path.endsWith(".png")) return Buffer.concat([PNG, ...pngChunks(bytes).filter((c) => c.type !== "caBX").map((c) => c.raw)]);
  if (path.endsWith(".svg")) return Buffer.from(bytes.toString("utf8").replace(' xmlns:c2pa="http://c2pa.org/manifest"', "").replace(/<metadata>[\s\S]*?<\/metadata>/, ""), "utf8");
  throw new Error(`${path}: no strip defined`);
};
```

- [ ] **2. Tests first** (`darkfield-r1.test.mjs`, synthetic bytes only): a PNG `IHDR caBX IDAT IEND` strips to `IHDR IDAT IEND` with chunk bytes unchanged; stripping is idempotent; a bad signature and a truncated chunk throw; an SVG with the attribute and a `<metadata>` element strips to the same SVG without them; `.ico` throws. Plus, for every `SOURCE.json` entry with `transform`: the local PNG has no `caBX` chunk, the local SVG contains neither `<metadata` nor `c2pa`.
- [ ] **3. SOURCE.json.** Add six entries, hashes computed by the implementer and cross-checked against `C/MANIFEST.sha256`: `public/favicon.ico` → `{ "from": "r1/favicon/favicon.ico", "sha256" }`; `public/{favicon.svg,favicon-16.png,favicon-32.png,favicon-48.png,apple-touch-icon.png}` → `{ "from": "r1/favicon/<name>", "transform": "c2pa-strip", "sourceSha256": <canonical>, "sha256": <shipped> }`.
- [ ] **4. Vendor test.** `COPIED` gains `public/favicon.ico`; its `from` regex also accepts `^r1/favicon/favicon\.ico$`. New `STRIPPED` list (the five stripped paths). The key-set assertion becomes `[RUNTIME, ...COPIED, ...STRIPPED]`. Each `STRIPPED` entry has exactly `from`, `transform`, `sourceSha256`, `sha256`; `transform === "c2pa-strip"`; `from` matches `^r1/(favicon|symbol)/[a-z0-9-]+\.(png|svg)$`; `sourceSha256` is 64 hex; the local file hashes to `sha256`. Rename the third test to say fonts, licences and registered R1 files; keep its `tokens.json` rejection.
- [ ] **5. Verifier.** In `verifyCanonical`, before the `entry.from` branch: `if (entry.transform === "c2pa-strip")` → read `pinned(entry.from)`; fail unless its hash is `sourceSha256`, `stripC2pa(canonical, entry.from)` equals the local bytes, and the local hash is `sha256`. An unknown `transform` fails. Add two cases to `darkfield-source.test.mjs` with a placeholder `r1/favicon/placeholder.png` blob carrying a synthetic `caBX`: correct stripped copy → no failure; local copy with one byte changed → failure naming the path.

- **Verify:** static gate; canonical verification (shared procedure) prints `verified 16 files` (10 before, plus 6). Foundation browser test not required: no rendered or shipped byte changes (reviewer confirms `git diff --stat` touches only the six listed files).
- **Visual:** none.
- **Ledger effect:** none. **Commit:** `feat(web): record the shipped R1 favicon set in the Darkfield source manifest`

---

## Task 2: The registered R1 symbol in the header (D5)

**Spec:** §18 *Adopted mark* (colour, clear space, never contained); `r1/SPEC.md` §1, §2; §14 *Icons and the identity mark*; §06 (Narrator, P4-4 ruling); §13 *Hover*, *Focus in each theme*, *Activation*; §11 (no glow).
**Files:** create `web/src/assets/darkfield/darkfield-r1-symbol-currentcolor.svg`, `web/scripts/darkfield-identity.test.mjs`; modify `web/src/styles/darkfield/SOURCE.json`, `web/scripts/darkfield-vendor.test.mjs`, `web/src/components/Navigation/HeaderNavigation.tsx`, `web/src/components/Navigation/SiteNavigation.css` (`.site-header__brand*` rules, base and media forms, and the `.site-header__brand-mark` entry of the ≤375 selector list only), `web/src/utils/pressAcknowledge.ts` (`TARGET` only), `web/scripts/darkfield-foundation-browser-test.mjs`; create `web/src/components/Navigation/useMarkSnap.ts`; modify `web/src/components/Navigation/SiteNavigation.tsx` (header `onAnimationComplete` only, P4-11); plus `web/scripts/darkfield-grammar.test.mjs` (delete `BRAND_HOLD`).

**Steps:**
- [ ] **1. Vendor.** Write `stripC2pa(<C/r1/symbol/darkfield-r1-symbol-currentcolor.svg>)` to the new asset path (a scratch Node call importing `darkfield-r1.mjs`). Add its `STRIPPED` entry (`from: "r1/symbol/darkfield-r1-symbol-currentcolor.svg"`) to `SOURCE.json` and the vendor test.
- [ ] **2. Tests first** (`darkfield-identity.test.mjs`, node:test):
  - `T2 symbol`: the vendored SVG has exactly one `<path`, with `fill="currentColor"` and the `d` of the stripped canonical file (read from the vendored file itself; the test does not restate the path); no `stroke`, `transform`, `filter`, `<rect`, `<metadata` or `c2pa`.
  - `T2 header`: `HeaderNavigation.tsx` imports `../../assets/darkfield/darkfield-r1-symbol-currentcolor.svg?raw`; the `.site-header__brand-mark` span is `aria-hidden="true"` and renders that import; no `KS` text node remains (`/>\s*KS\s*</`); `.site-header__brand-name` carries `df-heading-3`, and no brand rule sets `text-transform`; the mark span has a ref passed to `useMarkSnap`, and `useMarkSnap.ts` writes only the span's `translate`, clears it before each measurement, uses `useLayoutEffect`, and subscribes to `document.fonts.ready`, `resize`, a `ResizeObserver`, the `(resolution: …dppx)` query (re-created per change) and `df:header-settled`; `SiteNavigation.tsx` dispatches `df:header-settled` from the header's `onAnimationComplete`.
  - `T2 uncontained`: in `SiteNavigation.css`, every rule, base or inside any `@media` block, any of whose selectors names `site-header__brand-mark` (including `.site-header__brand-mark svg`) declares only `display`, `flex`, `width`, `height`, `margin`, `color` (and, on the `svg` child, `pointer-events`); colour is `var(--signal)` in the base rule and `var(--fg)` under `[data-theme="light"]`. No `.site-header__brand` rule outside `:focus-visible` declares `background*`, `border*`, `box-shadow`, `outline`, `border-radius`, `clip-path` or `filter`, except `.site-header__brand::after` (the I2 rule beneath the link) and `.site-header__brand-name` (the wordmark). No selector list mixes `site-header__brand-mark` with another component's selector. If the scope helper's `declarations()` does not descend into `@media`, the test scans each `@media` block's text itself.
  - `T2 legacy`: `LEGACY_DEAD = ["assets/logo.svg", "components/Logo/Logo.tsx", "components/Logo/Logo.css", "components/Logo/index.ts", "components/MainContent/MainContent.tsx", "components/MainContent/MainContent.css"]` (dead-code ruling, owner cleanup). No `web/src` file outside that list imports any of them.
- [ ] **3. Browser invariant** (foundation test, check mode, each theme in `THEMES` (dark, light), plus the dedicated Mono pass (stored theme `mono`) with the same checks; `/` and `/projects` at the default viewport, then `/` after `page.setViewportSize` to 1181×900, 767×900 and 375×812 and reload; and once per theme on `/` at 1181×900 and 375×812 in a separate context with `deviceScaleFactor: 2`). Read the path from the vendored file in Node and pass it in:

```js
  // Phase 4 Task 2 (§18; r1/SPEC.md §1–§2; D5 ruling): the registered symbol, uncontained, one colour per theme, clear space kept.
  const markCheck = (path) => page.evaluate((d) => {
    const host = document.querySelector(".site-header__brand-mark"), svg = host?.querySelector("svg"), p = svg?.querySelector("path");
    if (!p || svg.querySelectorAll("path").length !== 1) return ["no single registered path"];
    const out = [], root = document.documentElement, brand = host.closest(".site-header__brand"), header = host.closest(".site-header");
    if (p.getAttribute("d") !== d) out.push("path differs from the registered file");
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(root).getPropertyValue(root.dataset.theme === "light" ? "--fg" : "--signal");
    document.body.append(probe); const want = getComputedStyle(probe).color; probe.remove();
    if (getComputedStyle(svg).color !== want || getComputedStyle(p).fill !== want) out.push(`colour ${getComputedStyle(p).fill} != ${want}`);
    const painted = (el) => { const c = getComputedStyle(el);
      return c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.backgroundImage !== "none" || c.boxShadow !== "none" || c.filter !== "none" || c.clipPath !== "none" ||
        (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) ||
        ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none"); };
    for (let el = p; el && el !== header; el = el.parentElement) if (painted(el)) out.push(`container on ${el.tagName}.${el.getAttribute("class")}`);
    const size = parseFloat(getComputedStyle(brand).getPropertyValue("--df-mark-size")), clear = parseFloat(getComputedStyle(brand).getPropertyValue("--df-mark-clear"));
    const r = svg.getBoundingClientRect();
    if (r.width !== size || r.height !== size || !Number.isInteger(r.width)) out.push(`size ${r.width}x${r.height} != ${size}`);
    // Pixel crispness (r1/SPEC.md §1): the origin lands on a device pixel (P4-11).
    const dpr = devicePixelRatio, off = (v) => Math.abs(v * dpr - Math.round(v * dpr));
    if (off(r.left) > 0.01 || off(r.top) > 0.01) out.push(`origin ${r.left},${r.top} not on a device pixel at ${dpr}x`);
    const zone = { l: r.left - clear, t: r.top - clear, rt: r.right + clear, b: r.bottom + clear };
    const h = header.getBoundingClientRect(), hc = getComputedStyle(header);
    if (zone.l < h.left + parseFloat(hc.borderLeftWidth) || zone.t < h.top + parseFloat(hc.borderTopWidth) || zone.b > h.bottom - parseFloat(hc.borderBottomWidth)) out.push("clear space crosses the header boundary");
    for (const el of header.querySelectorAll("*")) {
      if (el === host || host.contains(el) || el.contains(host) || !el.checkVisibility()) continue;
      const b = el.getBoundingClientRect();
      if (b.width && b.height && b.left < zone.rt && b.right > zone.l && b.top < zone.b && b.bottom > zone.t) out.push(`${el.tagName}.${el.getAttribute("class")} inside clear space`);
    }
    return out;
  }, path);
```

  Run `markCheck` at rest, with the pointer over the brand link (over the wordmark where shown, else over the mark), and with the mouse held down there (pressed; release away). Each must return `[]`. Where the wordmark is hidden (767 and 375), also assert the I2 rule: `getComputedStyle(brand, "::after")` has a transparent background at rest, `fg-muted` on hover and `signal` when pressed (colours resolved from the page's tokens), its `top` equals the link's height and its `left` equals `--df-mark-clear`, so it lies below the clear-space zone; and the mark's colour is unchanged in all three. On the first run, `grep -n 'Darkfield R1' "$DF_TMP/p4-t2-foundation.log"`: if the inline symbol's `<title>` is measured or listed as text by the sampler or text pass, stop and report (do not remove the `<title>`). Also: the mark/header-ground ratio is ≥ 3 (WCAG 1.4.11 floor, not a Darkfield limit) when the header's computed background is opaque; if it is not opaque, stop and report. In `PAIRS`, replace `{ selector: ".site-header__brand-mark", rendered: true }` with `{ selector: ".site-header__brand-name", rendered: true }`: the KS text no longer exists; the wordmark is the text that remains, and the mark is covered by the invariant above. Remove `.site-header__brand` from `P3_SKIP` (the brand joins Phase 3's voice, size, corner and frame invariants; the wordmark must read as Archivo there).
- [ ] **4. TSX.** Wire `useMarkSnap(markRef)` (P4-11) on the mark span. `import r1Symbol from "../../assets/darkfield/darkfield-r1-symbol-currentcolor.svg?raw";`. Brand: `<span className="site-header__brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: r1Symbol }} />` (the registered file, never re-drawn in JSX); `<span className="site-header__brand-name df-heading-3">Kareem Sasa</span>`. `aria-label`, `aria-current`, `to` unchanged.
- [ ] **5. CSS.** Replace the `.site-header__brand`, `.site-header__brand-mark`, its Light override and `.site-header__brand-name` rules (held unchanged by Phase 3's `BRAND_HOLD`) with:

```css
/* Identity (§18; r1/SPEC.md §1–§2; D5 ruling): the registered R1 symbol, one colour, no container, clear space
   as a margin. Size and clear space are token names the reviewer checks against r1/SPEC.md §1 and §18 (P4-7). */
.site-header__brand {
    --df-mark-size: var(--space-6);
    --df-mark-clear: var(--space-2);
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    min-width: max-content;
    color: var(--fg);
    text-decoration: none;
}
.site-header__brand-mark { display: block; flex: none; width: var(--df-mark-size); height: var(--df-mark-size); margin: var(--df-mark-clear); color: var(--signal); }
[data-theme="light"] .site-header__brand-mark { color: var(--fg); }
/* The registered file carries a <title>; the link already names itself, so the symbol takes no pointer (no tooltip). */
.site-header__brand-mark svg { display: block; width: 100%; height: 100%; pointer-events: none; }
/* The wordmark (§06 Narrator, mixed case, P4-4) takes the link's states (§13); the mark never does (P4-5). */
.site-header__brand-name { position: relative; padding: var(--space-2) var(--space-3); }
.site-header__brand-name::before { content: ""; position: absolute; inset-block: 0; inset-inline-start: var(--space-1); width: var(--cell-w); display: flex; align-items: center; font-family: var(--font-mono); pointer-events: none; }
.site-header__brand:hover .site-header__brand-name { background-color: var(--df-ground-up, var(--surface-1)); transition: background-color var(--dur-fast) var(--ease-standard); }
.site-header__brand:hover .site-header__brand-name::before { content: "›"; content: "›" / ""; }
.site-header__brand:is(:active, [data-df-pressed]) .site-header__brand-name { background-color: var(--signal); color: var(--on-signal); transition: none; }
```

  Media forms: in `@media (max-width: 900px)` keep `.site-header__brand-name { display: none; }` and add the I2 rule:

```css
    /* Wordmark hidden: the link is the mark alone. Its states draw an L2 rule beneath the link's box,
       which ends at the clear-space edge, never a ground behind the mark (P4-5 ruling). */
    .site-header__brand { position: relative; }
    .site-header__brand::after { content: ""; position: absolute; inset-inline: var(--df-mark-clear); top: 100%; height: var(--stroke-hair); background-color: transparent; pointer-events: none; }
    .site-header__brand:hover::after { background-color: var(--fg-muted); }
    .site-header__brand:is(:active, [data-df-pressed])::after { height: var(--stroke-bold); background-color: var(--signal); }
```

  In `@media (max-width: 375px)`, remove `.site-header__brand-mark` from the `width: 2.15rem` selector list (the settings button keeps its rule unchanged); the mark keeps its token size at every width. If the header sets `--df-ground-up`, keep it. No glow on the mark in any theme. Leave the `:focus-visible` group alone (P4-6).
- [ ] **6.** `pressAcknowledge.ts`: add `.site-header__brand` to `TARGET`. Delete Phase 3's `BRAND_HOLD` and every reference to it; Phase 3's static tests then cover the new brand rules and must pass.

- **Verify:** static gate; foundation browser test; `header-overlap`, `settings-panel`, `boot-shell`, `route-metadata`; canonical verification (`verified 17 files`). Record the header's height and the layout chosen by `useHeaderLayout` at 1440, 1181, 900, 768, 767, 640, 375, base vs head; a layout step-down that did not happen on the base is a stop.
- **Visual:** `/` and `/projects`; dark, light, mono (stored theme); 1440, 768 (menu layout), 375; at rest, brand hovered, brand pressed, brand focused by Tab. Header crops at device scale 2. Expect: the symbol crisp, uncontained, `signal`/`fg`/white, nothing within its clear space, no tooltip on hover, the wordmark in mixed-case Archivo; focus ring around the whole link.
- **Ledger effect:** none expected. The backdrop and interaction passes re-key the brand link from `KS Kareem Sasa` to `Kareem Sasa`; neither key has a ledger row. Any new failure is a stop. **Commit:** `feat(web): replace the KS monogram with the registered R1 symbol in the header`

---

## Task 3: Web manifest, app icons and per-theme `theme-color`

**Spec:** §18 *Masters, containment and padding*, *Adopted mark* (favicon containment table); `r1/SPEC.md` §3, §4, §6 (no manifest shipped by the package); §05 (`field` per theme).
**Files:** create `web/public/icon-192.png`, `web/public/icon-512.png`, `web/public/icon-512-maskable.png`, `web/public/manifest.webmanifest`; modify `web/index.html` (head only), `web/src/contexts/ThemeContext.tsx` (`applyThemeToDocument` only), `web/src/styles/darkfield/SOURCE.json`, `web/scripts/darkfield-vendor.test.mjs`, `web/scripts/darkfield-identity.test.mjs`, `web/scripts/smoke-test.mjs`, `web/scripts/darkfield-foundation-browser-test.mjs`.

**Steps:**
- [ ] **1. Vendor.** Write `stripC2pa(<C/r1/favicon/icon-*.png>)` for the three icons; add three `STRIPPED` entries. The masters are used at their own sizes, never scaled (r1 §3).
- [ ] **2. Tests first** (`darkfield-identity.test.mjs`):
  - `T3 manifest`: `manifest.webmanifest` parses; keys are exactly `name`, `short_name`, `start_url`, `icons`, `background_color`, `theme_color`; `name` and `short_name` are `"Kareem Sasa"`; `icons` is exactly `[{src:"/icon-192.png",sizes:"192x192",type:"image/png"},{src:"/icon-512.png",sizes:"512x512",type:"image/png"},{src:"/icon-512-maskable.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]`; each `src` is a `SOURCE.json` `STRIPPED` path whose PNG `IHDR` width and height match `sizes`; both colours equal `tokens.runtime.json` `field` for `dark`.
  - `T3 head`: `index.html` holds `<link rel="manifest" href="/manifest.webmanifest" />` and exactly one `<meta name="theme-color" content="…" />` whose content is Dark `field` from `tokens.runtime.json`; the five favicon links are unchanged.
  - `T3 theme`: `ThemeContext.tsx`'s `applyThemeToDocument` reads `--field` with `getComputedStyle` after setting `data-theme` and writes it to `meta[name="theme-color"]`.
- [ ] **3. Browser invariant** (`/`, check mode; dark and light from `THEMES`, plus the dedicated Mono pass with a stored theme of `mono`): `document.querySelector('meta[name="theme-color"]').content.toLowerCase()` equals `getComputedStyle(document.documentElement).getPropertyValue("--field").trim().toLowerCase()`; `/manifest.webmanifest` fetches with status 200 and parses; each icon URL fetches with status 200.
- [ ] **4. Implement.** Manifest per P4-9 (token hex written by the implementer from `tokens.runtime.json`; the test keeps it in sync). `index.html`: add the two tags after the `apple-touch-icon` link. `applyThemeToDocument`:

```ts
  // theme-color follows the active theme's field token (P4-8); tokens.css is applied before React mounts.
  const field = getComputedStyle(root).getPropertyValue("--field").trim();
  if (field) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", field);
```

- [ ] **5. Smoke.** In `smoke-test.mjs`, assert the homepage shell and one article shell include both new tags, and the build holds `manifest.webmanifest` and the three icons.

- **Verify:** static gate; foundation browser test; `settings-panel` (theme switching between Dark and Light; Mono is not in Settings), `boot-shell`, `route-metadata`; canonical verification (`verified 20 files`). Pixel check: open each icon in Chromium at its native size and compare decoded pixels with the canonical PNG (scratch script; must be identical).
- **Visual:** none beyond the pixel check (no page UI changes).
- **Ledger effect:** none. **Commit:** `feat(web): add the web manifest, R1 app icons and a theme-color that follows the theme`

---

## Task 4: The social image from tokens and the registered symbol

**Spec:** §04 *Overused symbols to avoid*; §16 (*Literal Matrix rain*, three-question check); §18 *Adopted mark*; `r1/SPEC.md` §1, §2 (Dark is primary); §06 (voices; display line); §05 *Contrast, verified*.
**Files:** create `web/scripts/darkfield-og-image.mjs`; modify `web/public/og-image.svg`, `web/public/og-image.png`, `web/scripts/darkfield-identity.test.mjs`. Metadata files unchanged (Inventory).

**Steps:**
- [ ] **1. Generator** (`darkfield-og-image.mjs`). Export a pure `buildOgSvg({ runtime, symbol, title, description })` and a CLI:
  - Words (P4-10 ruling): the current image's own name, role and tagline, in their current casing, held as three constants in the generator, copied verbatim from the `6f3042e` `og-image.svg`; its `<title>` and `<desc>` keep their words. The binary row and the two slash-separated lists are dropped. No other text.
  - Canvas: `width="1200" height="630" viewBox="0 0 600 315"`; ground a full-bleed `field` rect (Dark). No grid, texture or glow.
  - Mark: the vendored symbol's root `<svg>` element nested verbatim, adding only `x`, `y`, `width`, `height`; inside a `<g color="<signal>">`. Placed at `grid-margin` from the top-left; size `space-12`; nothing within its §18 clear space (reviewer-judged).
  - Text: one `<foreignObject>` from `grid-margin` to the canvas edge minus `grid-margin`, below the mark's clear space, bottom-aligned (flex column). Name in the `display-2` style, `fg` (the one display line); role in `heading-3`, `fg`; tagline in `body-lg`, `fg-muted`. No `text-transform`. Styles, families and `@font-face` rules (`/fonts/darkfield/*.woff2`, the shipped files) are generated from `tokens.runtime.json` (`type.groups`, `type.families`, `color.tokens` Dark values). Colours appear only as those generated token values.
  - CLI `node scripts/darkfield-og-image.mjs --write "$DF_PW"`: writes `public/og-image.svg`, then renders it with Chromium: a page routes `http://og.invalid/**` to files under `web/public`, opens `http://og.invalid/og-image.svg` at a 1200×630 viewport, `deviceScaleFactor: 1`, waits for `document.fonts.ready` and requires `document.fonts.check` for each family used, requires no overflow in the foreignObject (`scrollHeight <= clientHeight`) and the text block's top below the mark's clear space; then screenshots to `public/og-image.png`. `--check "$DF_PW"` renders to `$DF_TMP` and compares decoded pixels with the committed PNG in the page (canvas `getImageData` of both); any difference fails. No new dependency; Playwright is passed by path as in the browser tests.
- [ ] **2. Tests first** (`darkfield-identity.test.mjs`, `T4`): `buildOgSvg(...)` from the committed inputs equals `public/og-image.svg` byte for byte; the SVG has no run of eight or more `0`/`1` characters and no `KS`, `Courier`, `rx=` or `opacity`; every `#hex` in it is a Dark value in `tokens.runtime.json`; the registered path `d` occurs exactly once, with `fill="currentColor"`; the text content (tags stripped) is exactly the name, role and tagline constants, which the test compares with the three strings as they appear in the `6f3042e` `og-image.svg` (written once in the test), the kept `<title>`/`<desc>` words and the nested symbol's own `<title>`; `og-image.png`'s `IHDR` is 1200×630, matching `index.html`'s `og:image:width`/`height`.
- [ ] **3. Render.** Rebuild nothing for the render (it reads `web/public` directly). Run `--write`, then `--check` twice (determinism with Playwright 1.63.0's headless shell; a difference is a stop).

- **Verify:** static gate; `npm test` (smoke asserts the unchanged URL, type and size); foundation browser test (no page change expected); `route-metadata`.
- **Visual:** inspect `og-image.png` at full size and downscaled to 600 and 300 px wide (scratch); compare with the old image. Expect: the symbol uncontained in `signal`, name legible at 300 px, no binary strings, no boxes. The reviewer estimates the `signal` share (scratch pixel count) and judges it against §05 *How much of each*; the number is reported in the review, not committed.
- **Ledger effect:** none. **Commit:** `feat(web): redraw the social image from Darkfield tokens and the R1 symbol`

---

## Phase exit (no commit)

- [ ] Static gate; foundation browser test (`dark,light`, with the Phase 4 Mono passes); Mono record run compared with `mono-worklist.json` (no new or worsened id); every named browser test; canonical verification and disclosure scan over the four commits.
- [ ] Acceptance, each with its evidence:
  - Byte identity of every shipped R1 file to the pinned canonical bytes: `favicon.ico` directly; the other nine through the recorded `c2pa-strip` (`darkfield-source.mjs --verify`), plus decoded-pixel identity of every PNG.
  - DOM: the symbol has no container (Task 2 invariant, at rest, hover, pressed; dark and light in check mode and the stored-theme Mono pass; four widths, two densities).
  - Mark colour equals the theme's token (same invariant).
  - Clear space measured (same invariant; declared value reviewer-judged, D11(a)).
- [ ] Hand-offs. **Owner:** apple-touch-icon inset on a real iOS device (`r1/SPEC.md` §3 marks it provisional; not testable here); deletion of the `LEGACY_DEAD` files; P4-1 publication of R1 files, a recorded deviation from the master plan's arrangement item 3, confirmed before any push; P4-4 wordmark voice (Narrator, mixed case, controller ruling); `og:image:alt` wording; re-scrape of cached social previews after deploy; `curl -sI https://kareemsasa.dev/manifest.webmanifest` Content-Type on production; P4-8 boot-time `theme-color` for Light and Mono; no mark in dock mode or the no-JS shell. **Master plan text:** see *Docs follow-up* below. **Phase 6:** the mark's `signal` share in the §05 budget; three-question check (the mark is `signal` because §18 assigns it, not because it reports state).

### Docs follow-up (separate docs-only commit after Task 2, or carried by the final docs task)

- **Files:** `docs/superpowers/plans/2026-10-11-darkfield-migration.md` only. **Commit:** `docs(plans): note that the R1 header mark retires the KS exceptions`.
- In the *Validation model* row *Browser test, contrast sampler*, replace "(the KS mark excepted, r8)" with wording that the exception ended when Phase 4 Task 2 removed the KS text (cite the commit).
- D10: do **not** edit its acceptance record. Append a dated note after it (e.g. "Note, <date>: Phase 4 Task 2 (<sha>) removed the KS monogram; the boundary 'the KS mark's neutral letters in Light' no longer applies."), labelled as a record of a later change, not a change to the acceptance.
- *Required arrangement* item 3 and the *Validation model* `darkfield-vendor.test.mjs` row: add that registered R1 files (the stripped Favicon group and the `currentColor` symbol) are published under the Phase 4 deviation, recorded in `SOURCE.json` with the `c2pa-strip` transform and checked by canonical verification; mark it pending the owner's confirmation.
- Add a revision-log line. Verify with `git diff --check`; stage only that path.

---

## Risks and stop conditions

The master plan's stop conditions apply. Phase-specific:

1. **Phase 3 overlap.** Phase 3 holds the brand by name (`BRAND_HOLD`). Task 2 replaces the brand rules and deletes the hold in the same commit; a Phase 3 static test or invariant that fails on the new brand rules, or a hold left behind, is a stop.
2. **Header layout.** The brand's width changes; `useHeaderLayout` may step down at a width where the base did not. Stop and report with screenshots; do not shrink the mark below its declared token or the clear space.
3. **Container by accident.** Any rule that paints a ground, boundary, bracket or inverse on an element containing the mark (including Phase 3 control classes added to the brand link) fails Task 2's invariant. Never make the brand link a `df-control`.
4. **Registered bytes.** The mark and icons are written only by `stripC2pa` from the pinned canonical files. A hand edit (resizing, recolouring, removing the `<title>`, adding size attributes) is a stop. `og-image.svg` may add positioning attributes to the nested symbol, nothing else.
5. **Disclosure.** No test, comment or commit message states the mark minimum, clear space, inset, safe zone or a signal budget. The SVG `<title>` (the mark's name) is the only canonical text that ships; the reviewer's disclosure scan lists it as an identifier.
6. **Snapping.** `useMarkSnap` must not loop with `useHeaderLayout`'s measurement (it changes `translate`, which affects no layout size) and must clean up its observers. A crispness failure at any tested width or density is a stop, not a tolerance change.
7. **Rendering determinism.** `og-image.png` is reproducible only with the pinned Playwright and headless shell. A `--check` mismatch on an unchanged SVG is a stop, not a re-render.
8. **CI.** CI runs only `npm test`; the new node tests and `--check` run locally (master plan *Global Constraints*, CI Node version). No CI change.
