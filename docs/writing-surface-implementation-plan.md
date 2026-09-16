# Writing Surface Implementation Plan

> **Execution model (decided 2026-09-16):** REQUIRED SUB-SKILL: superpowers:executing-plans. Execute **inline in one agent thread, one task at a time, with a checkpoint for review after each task.** Do not dispatch fresh subagents unless a later task develops a concrete reason that isolated context would be safer; raise that at a checkpoint rather than deciding unilaterally. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish three finished long-form articles at durable, crawlable URLs under `/writing`, authored as markdown and converted to HTML at build time.

**Architecture:** Article markdown moves into the Vite build context (`web/src/content/articles/`). A prebuild Node script (`web/scripts/build-articles.mjs`) parses frontmatter, splits body from provenance, converts both to HTML with `marked`, and writes a committed TypeScript module (`web/src/data/generated/articles.ts`). Everything downstream — routes, navigation, route metadata, sitemap, JSON-LD, and the prerendered static route shells in `vite.config.ts` — reads that one module, exactly as case studies read `caseStudies.ts` today. A CI drift check regenerates the module and fails if it differs from the committed copy.

**Tech Stack:** React 18, Vite 8 (Rolldown), TypeScript 5, React Router 7, `marked` (new, build-time only), `js-yaml` (new, build-time only), `zod` (already a dependency).

**Spec:** [`docs/writing-surface-design.md`](./writing-surface-design.md) — approved design. This plan implements it. Read both.

**Base branch:** `writing-surface`, cut from `main` at `c017768`.

---

## Global Constraints

Copied from `AGENTS.md` and the design. Every task's requirements implicitly include this section.

- **Preserve the dark terminal/Matrix design language.** New CSS uses existing tokens from `web/src/index.css`: `--app-bg`, `--app-bg-secondary`, `--app-text`, `--app-text-secondary`, `--app-text-muted`, `--app-border`, `--brand-primary`. Do not introduce a new palette.
- **No new runtime dependencies.** The two new packages (`marked`, `js-yaml`) are `devDependencies` and must never be imported from `web/src/**` application code.
- **Both new devDependencies are pinned to exact versions**, not caret ranges (design §8), so a transitive upgrade cannot change generated output and produce spurious CI drift.
- **Do not modify `typecheck`.** It stays `tsc --noEmit`. A check command must not rewrite tracked files (design §3.3).
- **Centralize content in data modules** (`web/src/data/`), not in components.
- **One concern per commit.** Conventional Commits, matching repo history (`feat:`, `chore:`, `docs:`, `refactor:`, `fix:`).
- **Do not touch** `infrastructure/`, deployment config, or unrelated package scripts.
- **Do not publish anything from `docs/private/`.**
- **Node 20+** is the floor: `web/Dockerfile` uses `node:20-alpine`, both CI workflows use `node-version: 20`. Local dev is on Node 22.
- **Trust boundary (design §3.7):** generated article HTML is injected into route shells unescaped. This is correct *only* because the source is first-party markdown committed to this repository. If article content ever originates outside this repo, sanitization becomes mandatory. Preserve the comment that says so.

---

## 0. Repository reconciliation

The design was written on 2026-09-13 against commit `c017768`. The repository was re-inspected on 2026-09-16 while writing this plan. What follows is every place the design and the repository disagree, with the smallest reconciliation for each. **The design remains authoritative everywhere it is not listed here.**

### 0.1 Discrepancies and reconciliations

| # | Design says | Repository reality | Smallest reconciliation |
|---|---|---|---|
| D1 | Two articles (§1, §7, §10) | Three finished articles exist. `docs/articles/the-system-gets-a-brake-one-way-or-another.md` (442 lines, 7,919 body words) is complete and **already conforms to the generator contract**: valid frontmatter with all six fields, H1 matching `title`, `###` subtitle matching `subtitle`, exactly one `## Post-article material`, and exactly the four required provenance headings. | Treat the two-article inventory as stale scope. All three ship in the initial implementation. See §0.3. |
| D2 | "Each article gains YAML frontmatter" (§3.2) | Articles 1 and 2 have **no frontmatter at all**. Article 3 already has it. | Task 2 adds frontmatter to articles 1 and 2 only; article 3's file is moved byte-for-byte. Exact blocks are given in Task 2. |
| D3 | `marked` and `js-yaml` as pinned devDependencies (§3.4) | `marked` is **absent** from `node_modules`. `js-yaml` is present at **4.3.2**, but only transitively via `eslint → @eslint/eslintrc`. | Task 1 declares both explicitly with exact pins: `marked@18.0.13` (current latest) and `js-yaml@4.3.2`. Pinning js-yaml to the already-hoisted 4.3.2 rather than latest (5.4.2) adds **zero** new packages to the tree. |
| D4 | Frontmatter parsed with `js-yaml` (§3.4) | **Verified trap:** js-yaml's default schema parses the unquoted `published: 2026-09-16` into a JavaScript `Date`, not a string, which fails the zod `string` check. | Parse with `yaml.load(text, { schema: yaml.JSON_SCHEMA })`. Confirmed against the installed js-yaml 4.3.2: JSON_SCHEMA yields the string `"2026-09-16"` and still folds `>-` blocks correctly. |
| D5 | Smoke assertion 6 checks every `toc[].id` resolves in the prerendered shell (§3.5, §7) | `web/scripts/smoke-test.mjs` is plain `.mjs` and **cannot import the generated `.ts` module**, so it has no way to read the TOC ids. | The article route shell renders the TOC as a `<nav class="route-fallback__toc">` of `<a href="#id">` links. The smoke test then checks, entirely within one document, that every `href="#…"` in that nav resolves to a matching `id`. This also improves the no-JS/crawler view. This is the only *addition* to the design's shell contract. |
| D6 | Drift check added to `.github/workflows/web-ci.yml` (§10) | Two workflows run lint+typecheck: `ci.yml` (Node only) and `web-ci.yml` (Node + Docker build + Trivy). | Follow the design: add it to `web-ci.yml`, which is also where the approved smoke-test step goes (D7). Noted for the record: `ci.yml` duplicates lint/typecheck and could also carry both. Not doing that — `ci.yml` is explicitly out of scope under decision D-Q3. |
| D7 | Six new smoke assertions (§7) | **Neither workflow runs `npm test`.** The smoke test would only ever run locally. | **Resolved by decision D-Q3:** add `npm test` to `web-ci.yml`. The assertions are meant to be an enforced gate, not a local courtesy. Explicitly approved as a scope addition beyond the design's change inventory, kept narrow — invoke the existing command, change nothing else about CI. |
| D8 | Index/article footer "cross-links to the other article" (§6.2 item 5) | With three articles there is no single "other article". | Footer links to **all other articles** (two of them). |
| D9 | Body is the markdown after the H1 and subtitle are stripped (§3.3 step 2) | All three files have a `---` horizontal rule immediately after the subtitle, which would render as a stray `<hr>` at the very top of every article. | The generator also strips a single leading `---` thematic break when it is the first non-empty line after the subtitle. Documented in the generator, verified by eye on all three. |
| D10 | — | `npm run lint` runs ESLint over **all** of `src` with `--max-warnings 0`, so the committed generated module **will be linted**. | No eslint ignore is added. Verified: all three article sources are free of irregular whitespace (U+00A0, U+200B, U+2028, …), the main realistic trigger. Task 3 validates with a real `npm run lint` run. Contingency, only if lint actually fails: add `"src/data/generated/**"` to the `ignores` array in `eslint.config.js`. |

### 0.2 Design claims re-verified as still true

Do not re-litigate these; they were checked on 2026-09-16 and hold.

- **§2.1 Docker build context is `web/`.** `web/Dockerfile` does `COPY package*.json .` → `RUN npm ci` → `COPY . .` → `RUN npm run build`. `.github/workflows/web-ci.yml:62,74` and `infrastructure/docker-compose.yml:23` use `context: ./web`. The repository-root `docs/` really is invisible inside the image, and `web/.dockerignore` excludes only `node_modules`, build output, env files, `.git`, and editor/OS cruft — so `src/content/**` *is* copied in. `npm ci` installs devDependencies, so `marked` and `js-yaml` are available when `prebuild` runs. **Moving the markdown into `web/` is load-bearing, not cosmetic.**
- **§2.2 Route shells prerender real content.** `staticRouteShellPlugin` in `web/vite.config.ts:568` writes a per-route `index.html` on `closeBundle` and emits `sitemap.xml`. `applyRouteShell` requires `<main class="route-fallback homepage-fallback" …>` to exist in the built `index.html`; it does, at `web/index.html:302`.
- **§2.3 `vite.config.ts` imports app data at config-load time** (`./src/data/caseStudies`, `./src/data/routeMetadata`, `./src/data/structuredData`, lines 7–16). The generated module must therefore exist on a fresh clone → it is committed.
- **Sitemap is automatic.** `renderSitemap()` maps over `sitemapRouteMetadata`, which filters `routeMetadata` for entries that have a `sitemap` field *and* whose `path === canonicalPath`. Adding metadata entries is the whole of the sitemap change.
- **Client-side head updates need no change.** `RouteMetadataUpdater` in `web/src/App.tsx:21` looks up `routeMetadataByPath[location.pathname]` by exact path. Because per-article metadata entries are derived into that map, `/writing/<slug>` gets correct title/description/canonical/JSON-LD on client-side navigation automatically.
- **`faPenNib` exists** in the installed `@fortawesome/free-solid-svg-icons@7`.
- **Nav already handles overflow.** `.site-header__nav` is `display:flex; overflow-x:auto` with hidden scrollbars; at ≤768px labels are hidden except on the active item and links are `flex: 1 1 0`. An eighth item is absorbed by shrinking, not by breaking. The manual check at 320–430px is still required (design §8).

### 0.3 What article #3 changed in the inventory

| Area | Design (2 articles) | This plan (3 articles) |
|---|---|---|
| Content files moved into `web/src/content/articles/` | 2 | 3 |
| Frontmatter blocks to author | 2 | 2 (article 3 already has one — it is moved unmodified) |
| Route metadata entries | 1 index + 2 articles | 1 index + 3 articles |
| Sitemap URLs added | 3 | 4 |
| Route shells generated | 3 | 4 |
| `Article` JSON-LD nodes | 2 | 3 |
| Smoke assertion 1 ("lists both titles") | both | all three |
| Footer cross-links | "the other article" | the other two articles |
| Total published body words | ~8,800 | ~16,700 |

Article #3's measured generator outputs (computed from the source on 2026-09-16, for use as expected values in Task 3):

| Article | kind | words | readingMinutes | TOC entries | sources | fact-check rows |
|---|---|---|---|---|---|---|
| `the-machine-should-explain-itself` | essay | 5,861 | 27 | 10 | 10 | 13 |
| `bottlenecks-dont-disappear` | field-note | 2,933 | 14 | 9 | 7 | 12 |
| `the-system-gets-a-brake-one-way-or-another` | essay | 7,919 | 36 | 10 | 35 | 35 |

The source and fact-check counts for the first two match the design's §1 table exactly, which confirms the counting rule in Task 3 is the one the design intended.

### 0.4 Decisions (resolved 2026-09-16)

All four open questions were decided at plan approval. **These are settled. Do not reopen them mid-implementation**; if implementation surfaces evidence that contradicts one, stop at the next checkpoint and say so rather than deciding alone.

- **D-Q1 — `published` dates. DECIDED: both articles get `2026-09-13`.** `The Machine Should Explain Itself` → `2026-09-13`; `Bottlenecks Don't Disappear` → `2026-09-13`. That is the date both files entered the repository (`c017768`) and the date the design's §3.2 example uses; **no different date may be invented without evidence.** Because the dates tie, the generator keeps the deterministic secondary sort — `published` descending, then `slug` ascending — which places `bottlenecks-dont-disappear` above `the-machine-should-explain-itself`.
- **D-Q2 — main-bundle weight. DECIDED: keep the approved single-generated-module architecture.** `routeMetadata.ts` imports `articlesData` and `App.tsx` imports `routeMetadata.ts`, so all three articles' full HTML lands in the eagerly-loaded main chunk — roughly 16,700 words of prose plus two 35-row tables. Implement it exactly as designed (§3.6). **Task 10 Step 3 measures the production bundle impact and reports it.** Do not split metadata from article HTML during this implementation; that split is only reconsidered if the measured result justifies reopening the design, which is a separate decision.
- **D-Q3 — smoke tests in CI. DECIDED: add `npm test` to `web-ci.yml` as part of this work.** This overrides the plan's earlier default of leaving CI alone. The writing-surface smoke assertions are intended to be an enforced gate, not local-only checks. Explicitly approved despite falling outside the design's §10 change inventory. **Keep it narrowly scoped:** invoke the existing `npm test` command in the existing job. Do not restructure jobs, add workflows, change triggers, or touch `ci.yml`. See Task 9 Step 2.
- **D-Q4 — Goldratt citation. DECIDED: leave unchanged.** The attribution of the five focusing steps to *The Haystack Syndrome* (1990), pp. 58–63 rests on a secondary bibliography. The fact-check table already discloses this, implementation does not depend on it, and the article text is not to be edited.

---

## 1. File structure

**Created**

```
web/src/content/articles/the-machine-should-explain-itself.md      moved + frontmatter added
web/src/content/articles/bottlenecks-dont-disappear.md             moved + frontmatter added
web/src/content/articles/the-system-gets-a-brake-one-way-or-another.md   moved unmodified
web/scripts/build-articles.mjs                                     the generator; sole writer of the module below
web/src/data/generated/articles.ts                                 generated, committed; types + articlesData + articleBySlug
web/src/utils/articleFormatting.ts                                 kind labels + published-date formatting, shared by both pages
web/src/pages/Writing/{Writing.tsx,Writing.css,index.ts}           /writing index: header + card grid
web/src/pages/Article/{Article.tsx,index.ts}                       /writing/:slug: slug lookup + 404 fallback
web/src/components/ArticlePage/{ArticlePage.tsx,ArticlePage.css,index.ts}   article rendering: header, TOC, body, provenance, footer
```

**Modified**

```
web/package.json                 2 exact-pinned devDependencies; build:articles + prebuild scripts
web/package-lock.json            regenerated by npm install
web/src/routes/index.tsx         2 lazy imports, 2 routes
web/src/data/navigation.ts       8th nav item
web/src/data/routeMetadata.ts    /writing entry + per-article entries derived from articlesData
web/src/data/structuredData.ts   Article nodes, CollectionPage for the index, breadcrumbs, /writing/:slug dispatch
web/vite.config.ts               renderWritingIndexBody() + renderArticleBody(slug), registered in the shell plugin
web/scripts/smoke-test.mjs       6 new assertions
.github/workflows/web-ci.yml     drift-check step + smoke-test step (decision D-Q3)
docs/writing-surface-design.md   status line updated to "Implemented"
```

**Removed**

```
docs/articles/the-machine-should-explain-itself.md          moved into web/
docs/articles/bottlenecks-dont-disappear.md                 moved into web/
docs/articles/the-system-gets-a-brake-one-way-or-another.md moved into web/ (currently untracked)
```

`docs/articles/*.drafting-notes.md` and `docs/articles/Bottlenecks don't disappear.pdf` stay where they are. They are already gitignored by the root `.gitignore` and must never enter `web/`.

**Responsibility boundaries.** `build-articles.mjs` is the only writer of `src/data/generated/`. `ArticlePage.tsx` renders one article and knows nothing about routing. `Article.tsx` does slug lookup and the not-found fallback. `Writing.tsx` renders the index only. The shell renderers in `vite.config.ts` are the no-JS mirror of the two pages and share no code with them — that duplication is the existing pattern (`renderCaseStudyBody`) and is intentional.

---

## 2. Tasks

### Task 1: Build dependencies and scripts

**Files:**
- Modify: `web/package.json` (`devDependencies`, `scripts`)
- Modify: `web/package-lock.json` (regenerated)
- Create: `/tmp/marked-probe.mjs` (throwaway, not committed)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run build:articles` script name; `marked` and `js-yaml` importable from `web/scripts/*.mjs`; a confirmed `marked` renderer API shape for Task 3.

- [ ] **Step 1: Install both packages with exact pins**

```bash
cd web
npm install --save-exact --save-dev marked@18.0.13 js-yaml@4.3.2
```

`--save-exact` writes `"marked": "18.0.13"` with no caret. Design §8 requires this so a transitive upgrade cannot silently change generated HTML and produce spurious drift. `js-yaml@4.3.2` matches the copy already hoisted for ESLint, so the install adds one package, not two trees.

- [ ] **Step 2: Verify the pins are exact and nothing moved to `dependencies`**

Run: `node -e "const p=require('./package.json'); console.log(p.devDependencies.marked, p.devDependencies['js-yaml'], 'runtime-leak:', Boolean(p.dependencies.marked || p.dependencies['js-yaml']))"`
Expected: `18.0.13 4.3.2 runtime-leak: false`

- [ ] **Step 3: Add the generator scripts**

In `web/package.json`, inside `"scripts"`, add these two entries. Leave `typecheck` exactly as it is.

```json
    "build:articles": "node scripts/build-articles.mjs",
    "prebuild": "npm run build:articles",
```

`npm` runs `prebuild` automatically before `build`, so both `npm run build` and the `RUN npm run build` in `web/Dockerfile` regenerate the module before Vite loads its config. `test:smoke` calls `npm run build`, so it is covered too.

- [ ] **Step 4: Probe the `marked` renderer API before writing the generator**

The heading and table renderer signatures changed across `marked` major versions. Confirm the v18 shape rather than assuming it.

```bash
cat > /tmp/marked-probe.mjs <<'PROBE'
import { Marked, Renderer } from "marked";
const instance = new Marked({
  renderer: {
    heading(token) {
      return `<h${token.depth} id="probe">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
    },
    table(token) {
      return `<div class="article-table">${Renderer.prototype.table.call(this, token)}</div>`;
    },
  },
});
console.log(instance.parse("## Hello *world*\n\n| a | b |\n|---|---|\n| 1 | 2 |\n"));
const tokens = instance.lexer("## One\n\n### Two\n");
console.log(JSON.stringify(tokens.map((t) => ({ type: t.type, depth: t.depth, text: t.text }))));
PROBE
node /tmp/marked-probe.mjs
```

Expected: an `<h2 id="probe">Hello <em>world</em></h2>`, a `<div class="article-table"><table>…</table></div>`, and `[{"type":"heading","depth":2,"text":"One"},{"type":"heading","depth":3,"text":"Two"}]`.

This probe pins down four things the generator depends on: the `Marked` class is a named export, `new Marked({ renderer })` accepts renderer overrides at construction, the `heading`/`table` overrides receive a token object and can reach `this.parser`, and `instance.lexer()` returns heading tokens with `depth` and `text`.

If the output differs, the installed `marked` uses a different renderer signature. Adapt the two renderer bodies in Task 3 to whatever this probe prints — **do not** change the id-computation strategy, which is what design §3.5 actually constrains.

- [ ] **Step 5: Confirm no unrelated churn, then commit**

Run: `git diff --stat`
Expected: only `web/package.json` and `web/package-lock.json`.

```bash
rm -f /tmp/marked-probe.mjs
git add web/package.json web/package-lock.json
git commit -m "chore(web): add pinned marked and js-yaml build dependencies

Adds the article build pipeline's two build-time dependencies as exact-pinned
devDependencies, plus the build:articles and prebuild scripts. typecheck is
deliberately unchanged.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Move article sources into the build context

**Files:**
- Create: `web/src/content/articles/the-machine-should-explain-itself.md`
- Create: `web/src/content/articles/bottlenecks-dont-disappear.md`
- Create: `web/src/content/articles/the-system-gets-a-brake-one-way-or-another.md`
- Delete: the three corresponding files under `docs/articles/`

**Interfaces:**
- Consumes: nothing.
- Produces: three markdown files with valid frontmatter at a path inside the Docker build context, which Task 3's generator reads.

- [ ] **Step 1: Create the directory and move the two tracked files with history**

```bash
cd /home/kareem/code/personal/website
mkdir -p web/src/content/articles
git mv docs/articles/the-machine-should-explain-itself.md web/src/content/articles/the-machine-should-explain-itself.md
git mv docs/articles/bottlenecks-dont-disappear.md web/src/content/articles/bottlenecks-dont-disappear.md
```

- [ ] **Step 2: Move the third article, which is untracked**

`git mv` will not work on an untracked file. Move it, then stage it at the new path.

```bash
mv "docs/articles/the-system-gets-a-brake-one-way-or-another.md" \
   "web/src/content/articles/the-system-gets-a-brake-one-way-or-another.md"
git add web/src/content/articles/the-system-gets-a-brake-one-way-or-another.md
```

**This file is already correct. Do not edit a single byte of it.** Its sha256 is `d75576f063b58036981f6aff3eb923478c42989a40fc914ea587a199f4cd617e`.

- [ ] **Step 3: Verify the move preserved content exactly**

Run: `sha256sum web/src/content/articles/the-system-gets-a-brake-one-way-or-another.md`
Expected: `d75576f063b58036981f6aff3eb923478c42989a40fc914ea587a199f4cd617e`

Run: `ls docs/articles/`
Expected: only the two `.drafting-notes.md` files and the PDF remain.

- [ ] **Step 4: Prepend frontmatter to `the-machine-should-explain-itself.md`**

Insert exactly this block at the very top of the file, before the existing `# The Machine Should Explain Itself` line. The `title` and `subtitle` values must match the existing H1 and `###` lines character for character — the generator fails the build if they do not.

```yaml
---
slug: the-machine-should-explain-itself
title: The Machine Should Explain Itself
subtitle: Operational knowledge for AI agents belongs in the system, not in the agent
kind: essay
published: 2026-09-13
description: >-
  A three-layer model of what AI agents know, and why operational intent belongs
  in versioned artifacts rather than in agent memory.
---

```

(`description` is 130 characters when folded — under the 160 limit. It is taken verbatim from design §3.2.)

- [ ] **Step 5: Prepend frontmatter to `bottlenecks-dont-disappear.md`**

```yaml
---
slug: bottlenecks-dont-disappear
title: Bottlenecks Don't Disappear. They Move.
subtitle: A field note on constraints, second-order effects, and what stays scarce
kind: field-note
published: 2026-09-13
description: >-
  Improving a constrained system relocates its bottleneck rather than removing
  it — and generative AI moved the constraint from production to judgment.
---

```

The apostrophe in `Don't` is an ASCII `'` (U+0027) in the source H1 — verified. Do not substitute a typographic apostrophe. `description` folds to 149 characters and is distilled from the article's own Abstract. `published` is the Q1 default; see §0.4.

- [ ] **Step 6: Verify both new frontmatter blocks parse and agree with their headings**

```bash
cd web
node -e '
const yaml = require("js-yaml");
const fs = require("node:fs");
for (const slug of ["the-machine-should-explain-itself","bottlenecks-dont-disappear","the-system-gets-a-brake-one-way-or-another"]) {
  const raw = fs.readFileSync(`src/content/articles/${slug}.md`, "utf8");
  const end = raw.indexOf("\n---\n", 3);
  const fm = yaml.load(raw.slice(4, end + 1), { schema: yaml.JSON_SCHEMA });
  const body = raw.slice(end + 5);
  const h1 = (body.match(/^# (.+)$/m) || [])[1];
  const sub = (body.match(/^### (.+)$/m) || [])[1];
  console.log(slug,
    "| slug-ok:", fm.slug === slug,
    "| h1-ok:", h1 === fm.title,
    "| sub-ok:", sub === fm.subtitle,
    "| kind:", fm.kind,
    "| published:", JSON.stringify(fm.published),
    "| desc-len:", fm.description.length);
}'
```

Expected — all three lines report `slug-ok: true`, `h1-ok: true`, `sub-ok: true`, a `published` printed as a quoted **string** (not a Date), and `desc-len` of 130, 149, and 149:

```
the-machine-should-explain-itself | slug-ok: true | h1-ok: true | sub-ok: true | kind: essay | published: "2026-09-13" | desc-len: 130
bottlenecks-dont-disappear | slug-ok: true | h1-ok: true | sub-ok: true | kind: field-note | published: "2026-09-13" | desc-len: 149
the-system-gets-a-brake-one-way-or-another | slug-ok: true | h1-ok: true | sub-ok: true | kind: essay | published: "2026-09-16" | desc-len: 149
```

- [ ] **Step 7: Commit**

```bash
cd /home/kareem/code/personal/website
git add docs/articles web/src/content/articles
git commit -m "feat(web): move article sources into the build context

The Docker build context is web/, so docs/ does not exist inside the image.
Article markdown moves to web/src/content/articles/ and gains the frontmatter
the build pipeline validates. Drafting notes and the retired deck stay in docs/.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The generator and the committed module

**Files:**
- Create: `web/scripts/build-articles.mjs`
- Create: `web/src/data/generated/articles.ts` (written by the script, then committed)

**Interfaces:**
- Consumes: `web/src/content/articles/*.md`; `marked`, `js-yaml`, `zod`.
- Produces: `web/src/data/generated/articles.ts` exporting exactly:
  - `interface ArticleTocEntry { id: string; label: string }`
  - `interface ArticleProvenance { abstractHtml: string; sourcesHtml: string; factCheckHtml: string; editorialNoteHtml: string; sourceCount: number; factCheckRowCount: number }`
  - `interface Article { slug: string; title: string; subtitle?: string; kind: "essay" | "field-note"; published: string; description: string; readingMinutes: number; wordCount: number; toc: ArticleTocEntry[]; bodyHtml: string; provenance: ArticleProvenance }`
  - `const articlesData: Article[]` — sorted by `published` descending, then `slug` ascending
  - `const articleBySlug: Record<string, Article>`

This mirrors `caseStudies.ts` (`caseStudiesData` + `caseStudyBySlug`) so consumers follow a familiar pattern.

- [ ] **Step 1: Write the generator**

Create `web/scripts/build-articles.mjs`:

```js
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Marked, Renderer } from "marked";
import yaml from "js-yaml";
import { z } from "zod";

const projectRoot = resolve(import.meta.dirname, "..");
const contentDir = resolve(projectRoot, "src/content/articles");
const outputDir = resolve(projectRoot, "src/data/generated");
const outputFile = resolve(outputDir, "articles.ts");

const WORDS_PER_MINUTE = 225;
const PROVENANCE_DELIMITER = "## Post-article material";

// Heading text in the source -> field in the generated provenance object.
// Matched on exact text so the articles cannot silently diverge in structure.
const PROVENANCE_SECTIONS = [
  ["Abstract", "abstractHtml"],
  ["Sources", "sourcesHtml"],
  ["Fact-check table", "factCheckHtml"],
  ["Editorial note: original synthesis", "editorialNoteHtml"],
];

const frontmatterSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1).optional(),
  kind: z.enum(["essay", "field-note"]),
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)"),
  description: z.string().min(1).max(160),
});

const fail = (file, message) => {
  throw new Error(`build-articles: ${file}: ${message}`);
};

// js-yaml's default schema parses an unquoted ISO date into a JS Date.
// JSON_SCHEMA keeps it a string while still folding ">-" blocks.
const parseFrontmatter = (file, raw) => {
  if (!raw.startsWith("---\n")) {
    fail(file, "missing YAML frontmatter block");
  }
  const end = raw.indexOf("\n---\n", 3);
  if (end === -1) {
    fail(file, "unterminated YAML frontmatter block");
  }
  const parsed = yaml.load(raw.slice(4, end + 1), { schema: yaml.JSON_SCHEMA });
  const result = frontmatterSchema.safeParse(parsed);
  if (!result.success) {
    fail(file, `invalid frontmatter: ${JSON.stringify(result.error.issues)}`);
  }
  return { frontmatter: result.data, rest: raw.slice(end + 5) };
};

// The H1 and the subtitle live in frontmatter; strip them from the body and
// fail loudly if they disagree, because migration is when they can drift.
const stripHeader = (file, frontmatter, rest) => {
  const lines = rest.split("\n");
  let index = 0;
  const nextContent = () => {
    while (index < lines.length && lines[index].trim() === "") index += 1;
  };

  nextContent();
  const h1 = lines[index]?.match(/^# (.+)$/);
  if (!h1) {
    fail(file, "expected a level-1 heading after the frontmatter");
  }
  if (h1[1] !== frontmatter.title) {
    fail(file, `H1 ${JSON.stringify(h1[1])} does not equal frontmatter title ${JSON.stringify(frontmatter.title)}`);
  }
  index += 1;

  nextContent();
  const subtitle = lines[index]?.match(/^### (.+)$/);
  if (subtitle) {
    if (subtitle[1] !== frontmatter.subtitle) {
      fail(file, `subtitle ${JSON.stringify(subtitle[1])} does not equal frontmatter subtitle ${JSON.stringify(frontmatter.subtitle)}`);
    }
    index += 1;
    // A thematic break directly under the subtitle is decoration for the
    // markdown file, not content; it would render as a stray <hr> at the top.
    nextContent();
    if (lines[index]?.trim() === "---") index += 1;
  } else if (frontmatter.subtitle) {
    fail(file, "frontmatter declares a subtitle but the body has no '### ' line");
  }

  return lines.slice(index).join("\n");
};

const splitProvenance = (file, markdown) => {
  const occurrences = markdown
    .split("\n")
    .filter((line) => line.trim() === PROVENANCE_DELIMITER).length;
  if (occurrences !== 1) {
    fail(file, `expected exactly one "${PROVENANCE_DELIMITER}" heading, found ${occurrences}`);
  }
  const [body, provenance] = markdown.split(`${PROVENANCE_DELIMITER}\n`);
  return { bodyMarkdown: body.trimEnd(), provenanceMarkdown: provenance };
};

const splitProvenanceSections = (file, provenanceMarkdown) => {
  const found = new Map();
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current !== null) found.set(current, buffer.join("\n").trim());
    buffer = [];
  };

  for (const line of provenanceMarkdown.split("\n")) {
    const heading = line.match(/^### (.+)$/);
    if (heading) {
      flush();
      current = heading[1];
      if (!PROVENANCE_SECTIONS.some(([name]) => name === current)) {
        fail(file, `unrecognised provenance heading "### ${current}"`);
      }
      continue;
    }
    if (current !== null) buffer.push(line);
  }
  flush();

  for (const [name] of PROVENANCE_SECTIONS) {
    if (!found.has(name)) fail(file, `missing provenance heading "### ${name}"`);
  }
  return found;
};

// Data rows of the first markdown table in a section: the contiguous run of
// lines starting with "|", minus the header row and the delimiter row.
const countTableRows = (file, label, sectionMarkdown) => {
  const block = [];
  for (const line of sectionMarkdown.split("\n")) {
    const isRow = line.trim().startsWith("|");
    if (isRow) block.push(line);
    else if (block.length > 0) break;
  }
  const rows = block.length - 2;
  if (rows < 1) fail(file, `expected a markdown table with at least one row under "### ${label}"`);
  return rows;
};

const slugifyHeading = (heading) =>
  heading
    .replace(/^\s*\d+(?:\.\d+)*\.?\s+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Deterministic de-duplication: identical headings get -2, -3, ... in document
// order. Non-deterministic ids would produce CI drift on every regeneration.
const computeHeadingIds = (headings) => {
  const seen = new Map();
  return headings.map((heading) => {
    const base = slugifyHeading(heading) || "section";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
};

const wrapTable = {
  table(token) {
    return `<div class="article-table">${Renderer.prototype.table.call(this, token)}</div>\n`;
  },
};

// One id list, consumed by both the TOC and the heading renderer, produced by
// the same marked instance that renders the HTML. A TOC whose anchors do not
// match its headings is a silently broken navigation control, so the ids are
// never derived twice.
const renderBody = (bodyMarkdown) => {
  let ids = [];
  let cursor = 0;

  const instance = new Marked({
    renderer: {
      ...wrapTable,
      heading(token) {
        const content = this.parser.parseInline(token.tokens);
        if (token.depth !== 2) {
          return `<h${token.depth}>${content}</h${token.depth}>\n`;
        }
        const id = ids[cursor];
        cursor += 1;
        return `<h2 id="${id}">${content}</h2>\n`;
      },
    },
  });

  const headings = instance
    .lexer(bodyMarkdown)
    .filter((token) => token.type === "heading" && token.depth === 2)
    .map((token) => token.text);

  ids = computeHeadingIds(headings);
  const toc = headings.map((label, index) => ({ id: ids[index], label }));

  const bodyHtml = instance.parse(bodyMarkdown);
  if (cursor !== ids.length) {
    throw new Error(`build-articles: heading id desync (${cursor} rendered, ${ids.length} computed)`);
  }
  return { bodyHtml, toc };
};

const renderSection = (markdown) => new Marked({ renderer: { ...wrapTable } }).parse(markdown);

const countWords = (markdown) => markdown.split(/\s+/).filter(Boolean).length;

const buildArticle = async (fileName) => {
  const filePath = resolve(contentDir, fileName);
  const expectedSlug = fileName.replace(/\.md$/, "");
  const raw = await readFile(filePath, "utf8");

  const { frontmatter, rest } = parseFrontmatter(fileName, raw);
  if (frontmatter.slug !== expectedSlug) {
    fail(fileName, `frontmatter slug ${JSON.stringify(frontmatter.slug)} does not match the filename stem ${JSON.stringify(expectedSlug)}`);
  }

  const withoutHeader = stripHeader(fileName, frontmatter, rest);
  const { bodyMarkdown, provenanceMarkdown } = splitProvenance(fileName, withoutHeader);
  const sections = splitProvenanceSections(fileName, provenanceMarkdown);
  const { bodyHtml, toc } = renderBody(bodyMarkdown);

  const wordCount = countWords(bodyMarkdown);
  const provenance = {
    sourceCount: countTableRows(fileName, "Sources", sections.get("Sources")),
    factCheckRowCount: countTableRows(fileName, "Fact-check table", sections.get("Fact-check table")),
  };
  for (const [name, field] of PROVENANCE_SECTIONS) {
    provenance[field] = renderSection(sections.get(name));
  }

  return {
    ...frontmatter,
    readingMinutes: Math.ceil(wordCount / WORDS_PER_MINUTE),
    wordCount,
    toc,
    bodyHtml,
    provenance: {
      abstractHtml: provenance.abstractHtml,
      sourcesHtml: provenance.sourcesHtml,
      factCheckHtml: provenance.factCheckHtml,
      editorialNoteHtml: provenance.editorialNoteHtml,
      sourceCount: provenance.sourceCount,
      factCheckRowCount: provenance.factCheckRowCount,
    },
  };
};

const renderModule = (articles) => `// AUTO-GENERATED by web/scripts/build-articles.mjs — do not edit by hand.
// Source of truth: web/src/content/articles/*.md
// Regenerate with: npm run build:articles
//
// Trust boundary: this HTML is injected into static route shells unescaped.
// That is safe only because the source is first-party markdown committed to
// this repository. If article content ever comes from anywhere else, HTML
// sanitisation becomes mandatory before injection.

export interface ArticleTocEntry {
  id: string;
  label: string;
}

export interface ArticleProvenance {
  abstractHtml: string;
  sourcesHtml: string;
  factCheckHtml: string;
  editorialNoteHtml: string;
  sourceCount: number;
  factCheckRowCount: number;
}

export interface Article {
  slug: string;
  title: string;
  subtitle?: string;
  kind: "essay" | "field-note";
  published: string;
  description: string;
  readingMinutes: number;
  wordCount: number;
  toc: ArticleTocEntry[];
  bodyHtml: string;
  provenance: ArticleProvenance;
}

export const articlesData: Article[] = ${JSON.stringify(articles, null, 2)};

export const articleBySlug: Record<string, Article> = articlesData.reduce<
  Record<string, Article>
>((articlesBySlug, article) => {
  articlesBySlug[article.slug] = article;
  return articlesBySlug;
}, {});
`;

const main = async () => {
  const fileNames = (await readdir(contentDir))
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (fileNames.length === 0) {
    throw new Error(`build-articles: no markdown found in ${contentDir}`);
  }

  const articles = await Promise.all(fileNames.map(buildArticle));

  // Newest first; slug breaks ties so output is deterministic and drift-free.
  articles.sort((left, right) =>
    left.published === right.published
      ? left.slug.localeCompare(right.slug)
      : right.published.localeCompare(left.published)
  );

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, renderModule(articles), "utf8");

  for (const article of articles) {
    console.log(
      `build-articles: ${article.slug} — ${article.wordCount} words, ${article.readingMinutes} min, ` +
        `${article.toc.length} TOC entries, ${article.provenance.sourceCount} sources, ` +
        `${article.provenance.factCheckRowCount} fact-check rows`
    );
  }
};

await main();
```

If the Task 1 probe showed a different `heading`/`table` signature, adapt only those two renderer bodies.

- [ ] **Step 2: Run the generator and check the reported metrics**

Run: `cd web && npm run build:articles`
Expected — exactly these three lines, in this order, matching §0.3's table:

```
build-articles: the-system-gets-a-brake-one-way-or-another — 7919 words, 36 min, 10 TOC entries, 35 sources, 35 fact-check rows
build-articles: bottlenecks-dont-disappear — 2933 words, 14 min, 9 TOC entries, 7 sources, 12 fact-check rows
build-articles: the-machine-should-explain-itself — 5861 words, 27 min, 10 TOC entries, 10 sources, 13 fact-check rows
```

A mismatch in the source or fact-check counts for the first two articles means the table-counting rule is wrong — those two values are independently attested by design §1.

- [ ] **Step 3: Verify the TOC anchor contract holds in the generated HTML**

```bash
cd web
node -e '
const src = require("node:fs").readFileSync("src/data/generated/articles.ts","utf8");
const articles = JSON.parse(src.match(/articlesData: Article\[\] = (\[[\s\S]*?\]);\n\nexport const articleBySlug/)[1]);
for (const a of articles) {
  const ids = new Set([...a.bodyHtml.matchAll(/<h2 id="([^"]+)"/g)].map(m => m[1]));
  const missing = a.toc.filter(e => !ids.has(e.id));
  console.log(a.slug, "toc:", a.toc.length, "h2-ids:", ids.size, "missing:", missing.length ? missing : "none");
}'
```

Expected: every line reports `missing: none` and equal `toc`/`h2-ids` counts.

- [ ] **Step 4: Verify determinism — the generator is idempotent**

```bash
cd web && npm run build:articles && git status --porcelain src/data/generated/articles.ts
```
Expected after the first commit of the file: no output. Right now, before it is committed, expect `?? src/data/generated/articles.ts`. Run it twice and diff to be sure:

```bash
cd web && cp src/data/generated/articles.ts /tmp/a1.ts && npm run build:articles && diff /tmp/a1.ts src/data/generated/articles.ts && echo "deterministic"
```
Expected: `deterministic`.

- [ ] **Step 5: Negative test — the validator actually fails the build**

```bash
cd web
cp src/content/articles/bottlenecks-dont-disappear.md /tmp/bottlenecks.bak
sed -i 's/^kind: field-note$/kind: opinion/' src/content/articles/bottlenecks-dont-disappear.md
npm run build:articles; echo "exit=$?"
cp /tmp/bottlenecks.bak src/content/articles/bottlenecks-dont-disappear.md
npm run build:articles
```
Expected: the middle run prints a `build-articles: bottlenecks-dont-disappear.md: invalid frontmatter:` error mentioning `kind` and reports a non-zero `exit=`. The final run succeeds. Confirm the restore with `git diff --stat src/content/articles` → empty.

- [ ] **Step 6: Typecheck and lint the generated module**

Run: `cd web && npm run typecheck && npm run lint`
Expected: both pass with no output. `lint` covers all of `src` with `--max-warnings 0`, so this is where D10 is settled. Only if lint fails on the generated file, add `"src/data/generated/**"` to the `ignores` array in `eslint.config.js` and rerun.

- [ ] **Step 7: Commit the script and the generated module together**

```bash
cd /home/kareem/code/personal/website
git add web/scripts/build-articles.mjs web/src/data/generated/articles.ts
git commit -m "feat(web): generate article data from markdown at build time

Adds build-articles.mjs: validates frontmatter, splits body from provenance,
converts both with marked, and writes a committed TypeScript module. The
module is committed because vite.config.ts imports application data at
config-load time, so a fresh clone must have it before any build runs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Routes, navigation, metadata, and structured data

**Files:**
- Modify: `web/src/data/routeMetadata.ts`
- Modify: `web/src/data/navigation.ts`
- Modify: `web/src/data/structuredData.ts`
- Modify: `web/src/routes/index.tsx`

**Interfaces:**
- Consumes: `articlesData` from Task 3.
- Produces: `routeMetadataByPath["/writing"]` and `routeMetadataByPath["/writing/<slug>"]`; four new `sitemapRouteMetadata` entries; `getStructuredDataGraph("/writing/<slug>")` returning an `Article` graph; `writing` and `writing/:slug` routes resolving to the page modules built in Tasks 5 and 6.

This task deliberately lands before the pages exist, because the shells and pages both read from it. Routes are added last within the task, once their targets exist — so do Tasks 5 and 6 before Step 5 if you prefer a compiling tree at every step; the commit boundary is what matters.

- [ ] **Step 1: Route metadata**

In `web/src/data/routeMetadata.ts`, add the import beside the existing one:

```ts
import { articlesData } from "./generated/articles";
```

Add this entry to `staticRouteMetadata`, after the `/case-studies` entry:

```ts
  {
    path: "/writing",
    title: "Writing - Kareem Sasa",
    description:
      "Long-form essays and field notes on constraints, coordination, and systems that can explain themselves — each published with its sources and verification record.",
    canonicalPath: "/writing",
    sitemap: { changefreq: "monthly", priority: "0.8" },
  },
```

Add the derivation beside `caseStudyRouteMetadata`, following its shape exactly:

```ts
const articleRouteMetadata: RouteMetadata[] = articlesData.map((article) => ({
  path: `/writing/${article.slug}`,
  title: `${article.title} - Kareem Sasa`,
  description: article.description,
  canonicalPath: `/writing/${article.slug}`,
  sitemap: { changefreq: "monthly", priority: "0.7" },
}));
```

Extend the exported list:

```ts
export const routeMetadata = [
  ...staticRouteMetadata,
  ...caseStudyRouteMetadata,
  ...articleRouteMetadata,
] as const;
```

Priorities are from design §5: `/writing` at `0.8` monthly, articles at `0.7` monthly.

- [ ] **Step 2: Navigation**

In `web/src/data/navigation.ts`, add `faPenNib` to the `@fortawesome/free-solid-svg-icons` import, then add the eighth item after Case Studies:

```ts
  { path: "/writing", label: "Writing", icon: faPenNib },
```

Placing it after Case Studies groups the two long-form reading surfaces together.

- [ ] **Step 3: Structured data**

In `web/src/data/structuredData.ts`, add the import:

```ts
import { articlesData, articleBySlug, type Article } from "./generated/articles";
```

Add the node factory beside `createCaseStudyEntry`:

```ts
const createArticleEntry = (article: Article): StructuredDataNode => ({
  "@type": "Article",
  "@id": `${SITE_URL}/writing/${article.slug}#article`,
  headline: article.title,
  ...(article.subtitle ? { alternativeHeadline: article.subtitle } : {}),
  description: article.description,
  datePublished: article.published,
  wordCount: article.wordCount,
  url: `${SITE_URL}/writing/${article.slug}`,
  author: { "@id": PERSON_ID },
  inLanguage: "en-US",
});
```

Add the two graphs beside `createCaseStudiesIndexGraph`:

```ts
const createWritingIndexGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/writing", {
      type: ["CollectionPage", "WebPage"],
      hasPart: articlesData.map((article) => ({
        "@id": `${SITE_URL}/writing/${article.slug}#webpage`,
      })),
    }),
    createBreadcrumbList("/writing", [
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing" },
    ]),
  ]);

const createArticleGraph = (article: Article) => {
  const articlePath = `/writing/${article.slug}`;

  return graph([
    ...baseEntries(),
    createWebPageEntry(articlePath, {
      mainEntity: { "@id": `${SITE_URL}${articlePath}#article` },
    }),
    createBreadcrumbList(articlePath, [
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing" },
      { name: article.title, path: articlePath },
    ]),
    createArticleEntry(article),
  ]);
};
```

Wire the index graph into `createDefaultRouteGraph`, beside the `/case-studies` line:

```ts
  if (canonicalPath === "/writing") return createWritingIndexGraph();
```

Wire the per-article dispatch into `getStructuredDataGraph`, directly after the existing case-study match block:

```ts
  const articleMatch = canonicalPath.match(/^\/writing\/([^/]+)$/);

  if (articleMatch) {
    const article = articleBySlug[articleMatch[1]];

    if (article) {
      return createArticleGraph(article);
    }
  }
```

- [ ] **Step 4: Sanity-check the wiring by eye**

There is no TypeScript runner in this repo (`tsx` and `ts-node` are not dependencies — do not add one), so these four facts are verified by reading the diff now and by machine in Tasks 7 and 8:

- `articleRouteMetadata` produces one entry per article, with `path === canonicalPath` — both conditions are required by `sitemapRouteMetadata`'s filter, and a mismatch silently drops the URL from the sitemap.
- `/writing` carries `sitemap: { changefreq: "monthly", priority: "0.8" }` and articles carry `"0.7"`.
- `createDefaultRouteGraph` returns the `CollectionPage` graph for `/writing`.
- `getStructuredDataGraph` matches `/writing/<slug>` **before** falling through to `createDefaultRouteGraph`, mirroring the case-study block directly above it.

Task 7 Step 5 greps the built sitemap for all four URLs, and Task 8 asserts the `Article` node and breadcrumbs on every shell.

- [ ] **Step 5: Routes**

In `web/src/routes/index.tsx`, add two lazy imports beside the existing ones:

```ts
const Writing = lazyWithMinTime(() => import("../pages/Writing"));
const Article = lazyWithMinTime(() => import("../pages/Article"));
```

And two entries in the `routes` array, after the case-study routes:

```ts
  { path: "writing", element: React.createElement(Writing) },
  { path: "writing/:slug", element: React.createElement(Article) },
```

- [ ] **Step 6: Typecheck, lint, commit**

Run: `cd web && npm run typecheck && npm run lint`
Expected: both pass. (This requires Tasks 5 and 6 to exist; sequence the commit accordingly.)

```bash
git add web/src/data/routeMetadata.ts web/src/data/navigation.ts web/src/data/structuredData.ts web/src/routes/index.tsx
git commit -m "feat(web): register writing routes, metadata, and structured data

Adds /writing and /writing/:slug to the route table, an eighth nav item,
route metadata derived from articlesData (which the sitemap reads), and
Article plus CollectionPage JSON-LD with breadcrumbs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: The `/writing` index page

**Files:**
- Create: `web/src/utils/articleFormatting.ts`
- Create: `web/src/pages/Writing/Writing.tsx`
- Create: `web/src/pages/Writing/Writing.css`
- Create: `web/src/pages/Writing/index.ts`

**Interfaces:**
- Consumes: `articlesData` (already sorted newest-first by the generator).
- Produces: default-exported `Writing` component for the `writing` route; `KIND_LABELS: Record<Article["kind"], string>` and `formatPublished(published: string): string` from `web/src/utils/articleFormatting.ts`, both consumed by Task 6.

- [ ] **Step 1: `web/src/utils/articleFormatting.ts`**

These live in `utils/`, not in the page, because `ArticlePage` needs them too and ESLint's `react-refresh/only-export-components` rule runs with `--max-warnings 0` — exporting non-component values from a component module would fail the lint gate.

```ts
import type { Article } from "../data/generated/articles";

export const KIND_LABELS: Record<Article["kind"], string> = {
  essay: "Essay",
  "field-note": "Field Note",
};

export const formatPublished = (published: string) =>
  new Date(`${published}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
```

- [ ] **Step 2: `index.ts`**

```ts
export { default } from "./Writing";
```

- [ ] **Step 3: `Writing.tsx`**

Reuses the case-study card idiom (`interactive-card`, `page-content`, `TypeWriterText`) so the page reads as part of the existing site.

```tsx
import { Link } from "react-router-dom";
import TypeWriterText from "../../components/TypeWriterText";
import { articlesData } from "../../data/generated/articles";
import { KIND_LABELS, formatPublished } from "../../utils/articleFormatting";
import "./Writing.css";

const Writing = () => {
  return (
    <div className="page-content writing-page">
      <div className="writing-container">
        <header id="writing-overview" className="writing-header">
          <p className="writing-eyebrow">Long-form</p>
          <h1>
            <TypeWriterText text="Writing" speed={60} />
          </h1>
          <p>
            Essays and field notes on constraints, coordination, and systems
            that can explain themselves. Each piece is published with its
            sources and the record of how its claims were verified.
          </p>
        </header>

        <section id="writing-list" className="writing-grid">
          {articlesData.map((article) => (
            <Link
              key={article.slug}
              to={`/writing/${article.slug}`}
              className="writing-card interactive-card"
            >
              <p className="writing-card-eyebrow">{KIND_LABELS[article.kind]}</p>
              <h2>{article.title}</h2>
              {article.subtitle ? (
                <p className="writing-card-subtitle">{article.subtitle}</p>
              ) : null}
              <p className="writing-card-description">{article.description}</p>
              <p className="writing-card-meta">
                <time dateTime={article.published}>
                  {formatPublished(article.published)}
                </time>
                <span aria-hidden="true"> · </span>
                <span>{article.readingMinutes} min read</span>
              </p>
              <span className="writing-card-link">Read →</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Writing;
```

- [ ] **Step 4: `Writing.css`**

```css
.writing-container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  min-width: 0;
  font-family: "Courier New", "Monaco", "Menlo", monospace;
}

.writing-container > * + * {
  margin-top: 1.5rem;
}

.writing-header h1 {
  margin: 0.35rem 0 0.75rem;
}

.writing-eyebrow {
  margin: 0;
  color: var(--brand-primary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
}

.writing-header p {
  color: var(--app-text-secondary);
  max-width: 68ch;
}

.writing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
}

.writing-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.25rem;
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.writing-card h2 {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.3;
}

.writing-card-eyebrow {
  margin: 0;
  color: var(--brand-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.7rem;
}

.writing-card-subtitle {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 0.9rem;
}

.writing-card-description {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.88rem;
  line-height: 1.55;
}

.writing-card-meta {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.78rem;
}

.writing-card-link {
  margin-top: auto;
  color: var(--brand-primary);
  font-size: 0.85rem;
  font-weight: 650;
}

@media (max-width: 480px) {
  .writing-grid {
    grid-template-columns: 1fr;
  }

  .writing-card {
    padding: 1rem;
  }
}
```

- [ ] **Step 5: Verify in the dev server**

Run: `cd web && npm run dev`, then open `http://localhost:5173/writing`.
Expected: three cards, newest first — *The System Gets a Brake One Way or Another*, then *Bottlenecks Don't Disappear. They Move.*, then *The Machine Should Explain Itself*. Eyebrows read `Essay`, `Field Note`, `Essay`. Reading times read 36, 14, 27 min.

- [ ] **Step 6: Commit**

```bash
git add web/src/utils/articleFormatting.ts web/src/pages/Writing
git commit -m "feat(web): add the /writing index page

Card grid over articlesData, newest first, reusing the interactive-card
idiom from the case-study index.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: The article page

**Files:**
- Create: `web/src/components/ArticlePage/ArticlePage.tsx`
- Create: `web/src/components/ArticlePage/ArticlePage.css`
- Create: `web/src/components/ArticlePage/index.ts`
- Create: `web/src/pages/Article/Article.tsx`
- Create: `web/src/pages/Article/index.ts`

**Interfaces:**
- Consumes: `articleBySlug`, `articlesData`, `KIND_LABELS`, `formatPublished`.
- Produces: default-exported `Article` page for the `writing/:slug` route; `ArticlePage` component taking `{ article: Article }`.

- [ ] **Step 1: `web/src/components/ArticlePage/index.ts`**

```ts
export { default } from "./ArticlePage";
```

- [ ] **Step 2: `ArticlePage.tsx`**

Single column, ~68ch measure. TOC is a sticky sidebar at ≥1200px and a collapsed `<details>` below that, rendered only when there are at least five entries (design §6.2). Abstract renders open; the other three provenance sections are `<details>` with counts in the summary.

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  articlesData,
  type Article as ArticleData,
} from "../../data/generated/articles";
import { KIND_LABELS, formatPublished } from "../../utils/articleFormatting";
import "./ArticlePage.css";

const MIN_TOC_ENTRIES = 5;
const TOC_SIDEBAR_QUERY = "(min-width: 1200px)";

interface ArticlePageProps {
  article: ArticleData;
}

const ArticlePage = ({ article }: ArticlePageProps) => {
  const [isSidebarWidth, setIsSidebarWidth] = useState(
    () => window.matchMedia(TOC_SIDEBAR_QUERY).matches
  );

  useEffect(() => {
    const query = window.matchMedia(TOC_SIDEBAR_QUERY);
    const handleChange = (event: MediaQueryListEvent) =>
      setIsSidebarWidth(event.matches);

    setIsSidebarWidth(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const otherArticles = articlesData.filter(
    (entry) => entry.slug !== article.slug
  );
  const showToc = article.toc.length >= MIN_TOC_ENTRIES;

  return (
    <div className="page-content article-page">
      <div className="article-container">
        <p className="article-breadcrumbs">
          <Link to="/writing">Writing</Link>
          <span aria-hidden="true"> / </span>
          <span>{article.title}</span>
        </p>

        <header className="article-header">
          <p className="article-eyebrow">{KIND_LABELS[article.kind]}</p>
          <h1 className="article-title">{article.title}</h1>
          {article.subtitle ? (
            <p className="article-subtitle">{article.subtitle}</p>
          ) : null}
          <p className="article-meta">
            <time dateTime={article.published}>
              {formatPublished(article.published)}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{article.readingMinutes} min read</span>
          </p>
        </header>

        <div className="article-layout">
          {showToc ? (
            <details
              className="article-toc"
              open={isSidebarWidth}
              key={String(isSidebarWidth)}
            >
              <summary>Contents</summary>
              <nav aria-label="Article contents">
                <ol>
                  {article.toc.map((entry) => (
                    <li key={entry.id}>
                      <a href={`#${entry.id}`}>{entry.label}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>
          ) : null}

          <article
            className="article-body"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        </div>

        <section className="article-provenance" aria-labelledby="provenance-title">
          <h2 id="provenance-title">Provenance</h2>
          <p className="article-provenance-note">
            This piece is published with the material behind it: what it argues
            in brief, what it drew on, how its claims were checked, and which
            ideas are original to it.
          </p>

          <div className="article-provenance-section">
            <h3>Abstract</h3>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.abstractHtml,
              }}
            />
          </div>

          <details className="article-provenance-section">
            <summary>Sources ({article.provenance.sourceCount})</summary>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.sourcesHtml,
              }}
            />
          </details>

          <details className="article-provenance-section">
            <summary>
              Fact-check table ({article.provenance.factCheckRowCount})
            </summary>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.factCheckHtml,
              }}
            />
          </details>

          <details className="article-provenance-section">
            <summary>Editorial note: original synthesis</summary>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.editorialNoteHtml,
              }}
            />
          </details>
        </section>

        {otherArticles.length > 0 ? (
          <footer className="article-footer">
            <h2>More writing</h2>
            <ul>
              {otherArticles.map((entry) => (
                <li key={entry.slug}>
                  <Link to={`/writing/${entry.slug}`}>{entry.title}</Link>
                  <span className="article-footer-kind">
                    {KIND_LABELS[entry.kind]} · {entry.readingMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

export default ArticlePage;
```

The `key={String(isSidebarWidth)}` remounts the `<details>` when the breakpoint is crossed, so `open` is re-applied rather than being stuck at whatever the reader last toggled.

- [ ] **Step 3: `ArticlePage.css`**

```css
.article-container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  min-width: 0;
}

.article-container > * + * {
  margin-top: 1.5rem;
}

.article-breadcrumbs,
.article-eyebrow,
.article-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--app-text-muted);
}

.article-eyebrow {
  color: var(--brand-primary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.article-title {
  margin: 0.4rem 0 0.4rem;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  line-height: 1.2;
}

.article-subtitle {
  margin: 0 0 0.6rem;
  max-width: 68ch;
  color: var(--app-text-secondary);
  font-size: 1rem;
  line-height: 1.5;
}

.article-layout {
  display: block;
}

/* Body: quiet, long-form, ~68ch measure. */
.article-body,
.article-prose {
  min-width: 0;
  color: var(--app-text);
  font-size: 1rem;
  line-height: 1.75;
}

.article-body {
  max-width: 68ch;
}

.article-body h2 {
  margin: 2.5rem 0 0.75rem;
  font-size: 1.35rem;
  line-height: 1.3;
  scroll-margin-top: 6rem;
}

.article-body h3 {
  margin: 1.75rem 0 0.5rem;
  font-size: 1.1rem;
  color: var(--app-text-secondary);
}

.article-body p,
.article-prose p {
  margin: 0 0 1.1rem;
}

.article-body blockquote {
  margin: 1.5rem 0;
  padding: 0.25rem 0 0.25rem 1rem;
  border-left: 3px solid var(--brand-primary);
  color: var(--app-text-secondary);
}

.article-body a,
.article-prose a {
  color: var(--brand-primary);
  overflow-wrap: anywhere;
}

/* Code fences: plain monospace, horizontal scroll, no highlighting. */
.article-body pre,
.article-prose pre {
  max-width: 100%;
  overflow-x: auto;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-bg-secondary);
  font-size: 0.82rem;
  line-height: 1.5;
}

.article-body code,
.article-prose code {
  font-family: "Courier New", "Monaco", "Menlo", monospace;
  font-size: 0.88em;
}

/* Tables: the generator wraps every table in .article-table. */
.article-table {
  max-width: 100%;
  overflow-x: auto;
  margin: 1.25rem 0;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.article-table table {
  border-collapse: collapse;
  min-width: 34rem;
  width: 100%;
  font-size: 0.85rem;
}

.article-table th,
.article-table td {
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--app-border);
  text-align: left;
  vertical-align: top;
}

.article-table th {
  color: var(--brand-primary);
  white-space: nowrap;
}

/* Table of contents. */
.article-toc {
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-bg-secondary);
  font-size: 0.85rem;
}

.article-toc summary {
  cursor: pointer;
  color: var(--brand-primary);
  font-weight: 650;
}

.article-toc ol {
  margin: 0.75rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.4rem;
}

.article-toc a {
  color: var(--app-text-secondary);
  text-decoration: none;
}

.article-toc a:hover,
.article-toc a:focus-visible {
  color: var(--brand-primary);
  text-decoration: underline;
}

/* Provenance: a visually distinct region after the conclusion. */
.article-provenance {
  padding-top: 1.5rem;
  border-top: 2px solid var(--app-border);
}

.article-provenance > h2 {
  margin: 0 0 0.4rem;
  color: var(--brand-primary);
  font-size: 1.15rem;
}

.article-provenance-note {
  max-width: 68ch;
  margin: 0 0 1.25rem;
  color: var(--app-text-muted);
  font-size: 0.85rem;
}

.article-provenance-section {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.article-provenance-section > h3,
.article-provenance-section > summary {
  margin: 0;
  color: var(--app-text);
  font-size: 0.95rem;
  font-weight: 650;
}

.article-provenance-section > summary {
  cursor: pointer;
}

.article-provenance-section .article-prose {
  margin-top: 0.85rem;
  font-size: 0.9rem;
}

.article-footer {
  padding-top: 1.25rem;
  border-top: 1px solid var(--app-border);
}

.article-footer h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: var(--app-text-secondary);
}

.article-footer ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.6rem;
}

.article-footer a {
  color: var(--brand-primary);
  text-decoration: none;
}

.article-footer-kind {
  display: block;
  color: var(--app-text-muted);
  font-size: 0.78rem;
}

/* Sticky sidebar where there is room beside the prose measure. */
@media (min-width: 1200px) {
  .article-layout {
    display: grid;
    grid-template-columns: minmax(0, 68ch) minmax(0, 1fr);
    gap: 2.5rem;
    align-items: start;
  }

  .article-toc {
    grid-column: 2;
    grid-row: 1;
    position: sticky;
    top: 6rem;
    margin-bottom: 0;
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
  }

  .article-toc summary {
    list-style: none;
    cursor: default;
  }

  .article-toc summary::-webkit-details-marker {
    display: none;
  }

  .article-body {
    grid-column: 1;
    grid-row: 1;
  }
}

@media (max-width: 480px) {
  .article-provenance-section {
    padding: 0.75rem;
  }

  .article-table table {
    min-width: 28rem;
  }
}
```

- [ ] **Step 4: `web/src/pages/Article/Article.tsx`**

```tsx
import { useParams } from "react-router-dom";
import ArticlePage from "../../components/ArticlePage";
import NotFound from "../NotFound";
import { articleBySlug } from "../../data/generated/articles";

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articleBySlug[slug] : undefined;

  if (!article) {
    return <NotFound />;
  }

  return <ArticlePage article={article} />;
};

export default Article;
```

- [ ] **Step 5: `web/src/pages/Article/index.ts`**

```ts
export { default } from "./Article";
```

- [ ] **Step 6: Verify all three articles render**

Run: `cd web && npm run dev`, then visit each of:
- `/writing/the-system-gets-a-brake-one-way-or-another`
- `/writing/bottlenecks-dont-disappear`
- `/writing/the-machine-should-explain-itself`
- `/writing/does-not-exist` → expect the 404 page, not a crash.

Expected on each article: header with eyebrow/title/subtitle/date/reading time; a TOC listing every `##` section; body prose with working in-page anchors; a Provenance region with an open Abstract and three collapsed `<details>` whose summaries read `Sources (35)` / `Fact-check table (35)` for the brake essay, `Sources (7)` / `Fact-check table (12)` for the field note, and `Sources (10)` / `Fact-check table (13)` for the machine essay; a footer listing the other two articles.

- [ ] **Step 7: Typecheck, lint, commit**

Run: `cd web && npm run typecheck && npm run lint`
Expected: both pass.

```bash
git add web/src/components/ArticlePage web/src/pages/Article
git commit -m "feat(web): add the article reading page

Single-column prose at a 68ch measure, a TOC that is a sticky sidebar at
1200px and a collapsed details element below it, and a provenance region
that publishes the abstract, sources, fact-check table, and editorial note.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Prerendered route shells

**Files:**
- Modify: `web/vite.config.ts`

**Interfaces:**
- Consumes: `articlesData`, `articleBySlug`, and the `/writing` route metadata from Task 4.
- Produces: `build/writing/index.html` and `build/writing/<slug>/index.html` for all three articles, each with real content; four new `sitemap.xml` entries (automatic).

- [ ] **Step 1: Import the generated data**

Beside the existing `caseStudiesData` import at the top of `web/vite.config.ts`:

```ts
import { articlesData, articleBySlug } from "./src/data/generated/articles";
```

- [ ] **Step 2: Add the index shell renderer**

Place it after `renderCaseStudiesIndexBody`:

```ts
const renderWritingIndexBody = () => `
  <main class="route-fallback" aria-label="Writing overview">
    <p class="route-fallback__eyebrow">Long-form</p>
    <h1 class="route-fallback__title">Writing</h1>
    <p class="route-fallback__summary">
      Essays and field notes on constraints, coordination, and systems that can explain themselves. Each piece is published with its sources and the record of how its claims were verified.
    </p>

    <section class="route-fallback__section" aria-labelledby="writing-list-title">
      <h2 id="writing-list-title">Published Writing</h2>
      <div class="route-fallback__grid">
        ${articlesData
          .map(
            (article) => `
              <article class="route-fallback__card">
                <p class="route-fallback__eyebrow">${escapeHtml(
                  article.kind === "essay" ? "Essay" : "Field Note"
                )}</p>
                <h3>${escapeHtml(article.title)}</h3>
                <p>${escapeHtml(article.description)}</p>
                <p>${escapeHtml(article.published)} · ${article.readingMinutes} min read</p>
                <a class="route-fallback__card-link" href="/writing/${escapeHtml(
                  article.slug
                )}">Read article</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  </main>
`;
```

- [ ] **Step 3: Add the article shell renderer**

```ts
const renderArticleBody = (slug: string) => {
  const article = articleBySlug[slug];

  if (!article) {
    throw new Error(`Missing article data for slug: ${slug}`);
  }

  // Article HTML is injected unescaped. See the trust-boundary note in
  // src/data/generated/articles.ts: the source is first-party markdown
  // converted at build time, with no user input anywhere in the path.
  return `
    <main class="route-fallback" aria-label="${escapeHtml(article.title)}">
      <p class="route-fallback__breadcrumbs"><a href="/writing">Writing</a> / ${escapeHtml(
        article.title
      )}</p>
      <p class="route-fallback__eyebrow">${escapeHtml(
        article.kind === "essay" ? "Essay" : "Field Note"
      )}</p>
      <h1 class="route-fallback__title">${escapeHtml(article.title)}</h1>
      ${
        article.subtitle
          ? `<p class="route-fallback__summary">${escapeHtml(article.subtitle)}</p>`
          : ""
      }
      <p class="route-fallback__meta">${escapeHtml(
        article.published
      )} · ${article.readingMinutes} min read · ${article.wordCount} words</p>

      ${
        article.toc.length > 0
          ? `<nav class="route-fallback__toc" aria-label="Article contents">
              <h2>Contents</h2>
              <ol>${article.toc
                .map(
                  (entry) =>
                    `<li><a href="#${escapeHtml(entry.id)}">${escapeHtml(
                      entry.label
                    )}</a></li>`
                )
                .join("")}</ol>
            </nav>`
          : ""
      }

      <section class="route-fallback__section">${article.bodyHtml}</section>

      <section class="route-fallback__section">
        <h2>Provenance</h2>
        <h3>Abstract</h3>
        ${article.provenance.abstractHtml}
        <h3>Sources (${article.provenance.sourceCount})</h3>
        ${article.provenance.sourcesHtml}
        <h3>Fact-check table (${article.provenance.factCheckRowCount})</h3>
        ${article.provenance.factCheckHtml}
        <h3>Editorial note: original synthesis</h3>
        ${article.provenance.editorialNoteHtml}
      </section>
    </main>
  `;
};
```

Provenance is flattened — headings and tables, no `<details>` wrappers — so the no-JS and crawler view is the complete article rather than a summary (design §5). The TOC `<nav>` is the D5 addition that makes smoke assertion 6 checkable.

- [ ] **Step 4: Register the shells**

In `staticRouteShellPlugin`, extend the `routes` array:

```ts
  const writingIndexMeta = getRouteMetadata("/writing");
  const routes: StaticRouteShell[] = [
    ...primaryRoutes,
    routeShellFromMetadata(caseStudiesIndexMeta, renderCaseStudiesIndexBody()),
    ...caseStudiesData.map((caseStudy) => {
      const metadata = getRouteMetadata(`/case-studies/${caseStudy.slug}`);
      return routeShellFromMetadata(metadata, renderCaseStudyBody(caseStudy.slug));
    }),
    routeShellFromMetadata(writingIndexMeta, renderWritingIndexBody()),
    ...articlesData.map((article) => {
      const metadata = getRouteMetadata(`/writing/${article.slug}`);
      return routeShellFromMetadata(metadata, renderArticleBody(article.slug));
    }),
  ];
```

- [ ] **Step 5: Build and inspect the generated shells**

Run: `cd web && npm run build`
Expected: the build succeeds and `prebuild` regenerates the article module first (its three log lines appear before Vite's output).

```bash
cd web
ls build/writing build/writing/*/index.html
grep -c "<h2 id=" build/writing/the-system-gets-a-brake-one-way-or-another/index.html
grep -o "<title>[^<]*</title>" build/writing/bottlenecks-dont-disappear/index.html
grep -o "https://kareemsasa.dev/writing[^<]*" build/sitemap.xml
```
Expected: four shell directories; `10` h2 ids in the brake essay; `<title>Bottlenecks Don&#39;t Disappear. They Move. - Kareem Sasa</title>` — the apostrophe is escaped because `applyRouteShell` runs every title through `escapeHtml`; and four `/writing…` sitemap URLs.

- [ ] **Step 6: Confirm real prose is in the shell, not just the title**

Run: `grep -c "You are a passenger" build/writing/the-system-gets-a-brake-one-way-or-another/index.html`
Expected: `1`. This is the property that makes the whole build-time pipeline worth having.

- [ ] **Step 7: Commit**

```bash
git add web/vite.config.ts
git commit -m "feat(web): prerender writing route shells

Emits static shells for /writing and each article with the full prose, a
contents nav, and a flattened provenance section, so crawlers and no-JS
readers get the complete article. Sitemap entries follow from route metadata.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Smoke assertions

**Files:**
- Modify: `web/scripts/smoke-test.mjs`

**Interfaces:**
- Consumes: the built `build/writing/**` shells and `build/sitemap.xml` from Task 7.
- Produces: six new assertions covering design §7.

- [ ] **Step 1: Read the new shells**

In `main()`, beside the existing `readBuildFile` calls:

```js
  const writingIndex = await readBuildFile("writing/index.html");
  const articleSlugs = [
    "the-system-gets-a-brake-one-way-or-another",
    "bottlenecks-dont-disappear",
    "the-machine-should-explain-itself",
  ];
  const articleShells = Object.fromEntries(
    await Promise.all(
      articleSlugs.map(async (slug) => [
        slug,
        await readBuildFile(`writing/${slug}/index.html`),
      ])
    )
  );
```

- [ ] **Step 2: Assertions 1–3 — index lists all three, shells carry real prose and provenance**

```js
  // 1. The index lists every published article.
  for (const title of [
    "The System Gets a Brake One Way or Another",
    "Bottlenecks Don&#39;t Disappear. They Move.",
    "The Machine Should Explain Itself",
  ]) {
    assertIncludes(writingIndex, title, "writing index article titles");
  }

  // 2. Each article shell contains distinctive prose from its body, not just
  //    its title — an empty shell for long-form content would be the worst
  //    possible regression.
  const distinctiveProse = {
    "the-system-gets-a-brake-one-way-or-another":
      "You are a passenger.",
    "bottlenecks-dont-disappear":
      "Consider a line with three serial stages.",
    "the-machine-should-explain-itself":
      "A workstation is managed through a Git repository",
  };

  for (const [slug, prose] of Object.entries(distinctiveProse)) {
    assertIncludes(articleShells[slug], prose, `${slug} shell body prose`);
  }

  // 3. Each article shell publishes its provenance.
  for (const slug of articleSlugs) {
    for (const heading of [
      "Abstract",
      "Sources (",
      "Fact-check table (",
      "Editorial note: original synthesis",
    ]) {
      assertIncludes(articleShells[slug], heading, `${slug} provenance section`);
    }
  }
```

The index assertion uses `&#39;` because `escapeHtml` in `vite.config.ts` escapes apostrophes.

- [ ] **Step 3: Assertions 4–5 — sitemap and Article JSON-LD**

```js
  // 4. Sitemap covers the index and every article.
  for (const route of [
    "https://kareemsasa.dev/writing",
    "https://kareemsasa.dev/writing/the-system-gets-a-brake-one-way-or-another",
    "https://kareemsasa.dev/writing/bottlenecks-dont-disappear",
    "https://kareemsasa.dev/writing/the-machine-should-explain-itself",
  ]) {
    assertIncludes(sitemap, `<loc>${route}</loc>`, "sitemap writing routes");
  }

  // 5. Each article shell carries an Article node whose headline matches.
  const expectedHeadlines = {
    "the-system-gets-a-brake-one-way-or-another":
      "The System Gets a Brake One Way or Another",
    "bottlenecks-dont-disappear": "Bottlenecks Don't Disappear. They Move.",
    "the-machine-should-explain-itself": "The Machine Should Explain Itself",
  };

  for (const [slug, headline] of Object.entries(expectedHeadlines)) {
    const nodes = structuredDataNodes(articleShells[slug]);
    const articleNodes = findNodesByType(nodes, "Article");

    if (articleNodes.length !== 1) {
      throw new Error(
        `Expected ${slug} JSON-LD to include exactly one Article node`
      );
    }

    if (articleNodes[0].headline !== headline) {
      throw new Error(
        `Expected ${slug} Article headline to equal ${JSON.stringify(headline)}, got ${JSON.stringify(articleNodes[0].headline)}`
      );
    }

    assertWebPage(nodes, `/writing/${slug}`);
    assertBreadcrumb(nodes, `/writing/${slug}`, ["Home", "Writing", headline]);
  }

  assertWebPage(structuredDataNodes(writingIndex), "/writing");
  assertBreadcrumb(structuredDataNodes(writingIndex), "/writing", [
    "Home",
    "Writing",
  ]);
```

- [ ] **Step 4: Assertion 6 — TOC anchor integrity**

```js
  // 6. Every contents link resolves to a heading in the same document. A TOC
  //    whose anchors miss their targets is a silently broken control.
  for (const slug of articleSlugs) {
    const html = articleShells[slug];
    const toc = html.match(
      /<nav class="route-fallback__toc"[\s\S]*?<\/nav>/
    );

    if (!toc) {
      throw new Error(`Expected ${slug} shell to include a contents nav`);
    }

    const anchors = [...toc[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);

    if (anchors.length === 0) {
      throw new Error(`Expected ${slug} contents nav to include anchors`);
    }

    for (const anchor of anchors) {
      if (!html.includes(`id="${anchor}"`)) {
        throw new Error(
          `Expected ${slug} shell to include an element with id "${anchor}" targeted by its contents nav`
        );
      }
    }
  }
```

- [ ] **Step 5: Run the smoke test**

Run: `cd web && npm test`
Expected: the build runs (with the three `build-articles:` lines) and the script prints `Smoke test passed.`

- [ ] **Step 6: Prove assertion 6 can fail**

Temporarily break the contract to confirm the assertion is real: in `vite.config.ts`, change the TOC anchor to `href="#${escapeHtml(entry.id)}-x"`, run `npm test`, confirm it fails with `targeted by its contents nav`, then revert and rerun until it passes.

Run: `git diff --stat web/vite.config.ts` after reverting.
Expected: empty.

- [ ] **Step 7: Commit**

```bash
git add web/scripts/smoke-test.mjs
git commit -m "test(web): assert writing shells, sitemap, JSON-LD, and TOC anchors

Six assertions from the writing-surface design: the index lists all three
articles, each shell carries real body prose and its provenance sections,
the sitemap covers all four URLs, each shell has a matching Article node,
and every contents anchor resolves to a heading in the same document.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: CI gates and design-doc status

**Files:**
- Modify: `.github/workflows/web-ci.yml`
- Modify: `docs/writing-surface-design.md`

**Interfaces:**
- Consumes: the `build:articles` script, the committed generated module, and the smoke assertions from Task 8.
- Produces: a CI step that fails when the committed module disagrees with the markdown sources, and a CI step that runs the smoke test.

- [ ] **Step 1: Add the drift check**

In `.github/workflows/web-ci.yml`, insert between the `Lint` and `Typecheck` steps:

```yaml
      - name: Check generated article data is in sync
        working-directory: web
        run: |
          npm run build:articles
          git diff --exit-code -- src/data/generated/articles.ts
```

A committed generated file drifts from its source unless something checks. This is declared intent verified against observed state — the reconciliation pattern both of the first two articles argue for. The site enforces the thing it publishes.

- [ ] **Step 2: Add the smoke test (decision D-Q3)**

In the same workflow, insert directly **after** the `Typecheck` step and before `Set up Docker Buildx`:

```yaml
      - name: Smoke test
        working-directory: web
        run: npm test
```

This makes the writing-surface assertions an enforced gate rather than a local-only check. `npm test` runs `test:smoke`, which runs `npm run build` (and therefore `prebuild` → `build:articles`) before asserting against `build/`. It must come after the drift check so that CI verifies the *committed* module before anything regenerates it.

**Scope discipline:** this step and Step 1 are the only changes to CI. Do not restructure jobs, add a workflow, change triggers, adjust Node or cache settings, or touch `.github/workflows/ci.yml`.

- [ ] **Step 3: Verify the drift check locally, exactly as CI runs it**

```bash
cd web
npm run build:articles
git diff --exit-code -- src/data/generated/articles.ts && echo "in sync"
```
Expected: `in sync`.

Then prove it catches drift:

```bash
cd web
sed -i 's/^published: 2026-09-13$/published: 2026-09-12/' src/content/articles/bottlenecks-dont-disappear.md
npm run build:articles
git diff --exit-code -- src/data/generated/articles.ts; echo "exit=$?"
git checkout -- src/content/articles/bottlenecks-dont-disappear.md
npm run build:articles
git diff --exit-code -- src/data/generated/articles.ts && echo "restored"
```
Expected: a non-zero `exit=` in the middle, then `restored`.

- [ ] **Step 4: Verify the workflow file is valid and minimally changed**

```bash
cd /home/kareem/code/personal/website
git diff .github/workflows/web-ci.yml
python3 -c "import sys,yaml; yaml.safe_load(open('.github/workflows/web-ci.yml')); print('workflow parses')"
```
Expected: the diff adds exactly two steps and touches nothing else, and the parse check prints `workflow parses`.

- [ ] **Step 5: Update the design document's status line**

In `docs/writing-surface-design.md`, change:

```
**Status:** Approved for implementation planning
```

to:

```
**Status:** Implemented — see `docs/writing-surface-implementation-plan.md`. The two-article inventory in §1, §7, and §10 is superseded: three articles shipped.
```

Do not rewrite the design's body. It is the record of what was decided and why.

- [ ] **Step 6: Commit as two separate changes**

```bash
git add .github/workflows/web-ci.yml
git commit -m "ci: enforce article data drift check and smoke test

Regenerates the committed article module and fails on any difference, then
runs the smoke test so the writing-surface assertions are an enforced gate
rather than a local-only check.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"

git add docs/writing-surface-design.md
git commit -m "docs: mark the writing surface design as implemented

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Full verification

**Files:** none modified. This task is the gate.

- [ ] **Step 1: Run every documented gate, in order**

```bash
cd web
npm run build:articles
git diff --exit-code -- src/data/generated/articles.ts
npm run typecheck
npm run lint
npm run build
npm test
```

Expected, in order: three `build-articles:` lines; no diff output; silence from `tsc`; silence from ESLint; a successful Vite build; `Smoke test passed.`

**Do not claim completion on any of these without having seen the output.** If a command fails, fix the cause and rerun the whole sequence from the top.

- [ ] **Step 2: Verify the Docker build context really contains the articles**

This is the failure mode design §2.1 exists to prevent: it would pass every check above and still ship an article-less production site.

```bash
cd /home/kareem/code/personal/website
docker build -t web:writing-check ./web
docker run --rm web:writing-check ls /usr/share/nginx/html/writing
docker run --rm web:writing-check grep -c "You are a passenger" \
  /usr/share/nginx/html/writing/the-system-gets-a-brake-one-way-or-another/index.html
```
Expected: the four writing directories are listed, and the grep returns `1`.

If Docker is unavailable locally, record that this check was not run and rely on the PR's `Build web image (local, PRs only)` job — but note that job does not assert content, so the check is weaker.

- [ ] **Step 3: Measure the production bundle impact (decision D-Q2)**

D-Q2 keeps the single-module architecture, so this step **measures and reports** — it does not change anything.

```bash
cd /home/kareem/code/personal/website/web
ls -la build/assets/*.js | sort -k5 -n | tail -5 > /tmp/bundle-after.txt
git stash list >/dev/null   # ensure a clean tree before switching
git -C .. worktree add /tmp/baseline-main main
cd /tmp/baseline-main/web && npm ci --silent && npm run build --silent
ls -la build/assets/*.js | sort -k5 -n | tail -5 > /tmp/bundle-before.txt
cd /home/kareem/code/personal/website && git worktree remove --force /tmp/baseline-main
diff /tmp/bundle-before.txt /tmp/bundle-after.txt
```

If building a `main` baseline is impractical, fall back to reading the post-change sizes alone and reporting the largest chunk.

Report at the checkpoint: the largest chunk's size before and after, the delta in kB, and whether Vite emitted a chunk-size warning it did not emit before (`chunkSizeWarningLimit` is 1000 kB). **A new warning does not authorise splitting the module** — it is the evidence that would justify reopening the design decision, which is the user's call, not the implementer's.

- [ ] **Step 4: Manual render checks**

Run `npm run build && npm run preview` and walk through every item. These are the design §7 manual checks plus the two that article #3 makes sharper.

- [ ] `/writing` renders three cards, newest first, with correct kind eyebrows and reading times.
- [ ] `/writing/the-system-gets-a-brake-one-way-or-another` renders in full.
- [ ] `/writing/bottlenecks-dont-disappear` renders in full.
- [ ] `/writing/the-machine-should-explain-itself` renders in full.
- [ ] **Prerendered prose:** with JavaScript disabled in the browser, each article URL still shows the complete article text and its provenance.
- [ ] **Provenance sections:** Abstract is open; Sources, Fact-check table, and Editorial note are collapsed, with counts in the summaries (35/35, 7/12, 10/13).
- [ ] **Sitemap:** `view-source:http://localhost:4173/sitemap.xml` lists all four new URLs and no others that are new.
- [ ] **Article JSON-LD headline** matches the article title on each of the three pages (DevTools → Elements → the `application/ld+json` script).
- [ ] **Mobile navigation at 320, 375, and 430 px:** the eighth nav item does not break the header. Labels collapse to icons, the active item keeps its label, and the nav scrolls horizontally rather than overflowing. `AGENTS.md` records prior mobile-overflow work at exactly these widths — this is the single highest-risk visual regression in this change.
- [ ] **Table overflow at 320 px:** the fact-check tables scroll horizontally inside their own container. The brake essay's table has five columns and 35 rows; the machine essay's has four. Neither may cause page-level horizontal scroll.
- [ ] **Code-fence overflow at 320 px:** the ASCII diagrams in the machine essay and the field note scroll inside their `<pre>`, with no page-level horizontal scroll.
- [ ] **TOC behaviour across 1200 px:** at ≥1200 px it is a sticky sidebar beside the prose that stays put while scrolling; below 1200 px it is a collapsed `<details>` above the body. Resize across the breakpoint and confirm it switches.
- [ ] **TOC anchors:** click three entries in each article and confirm each jumps to its heading with the `scroll-margin-top` offset clearing the fixed header.
- [ ] **Footer cross-links** on each article list the other two and navigate correctly.
- [ ] **Unknown slug:** `/writing/nope` renders the 404 page.

- [ ] **Step 5: Final review of the whole change**

```bash
git log --oneline main..HEAD
git diff --stat main...HEAD
```
Expected: nine commits, and a diff touching only the files listed in §1.

---

## 3. Validation gates

| Gate | When | Passing output |
|---|---|---|
| `npm run build:articles` | Tasks 3, 9, 10 | three `build-articles:` metric lines |
| `git diff --exit-code -- src/data/generated/articles.ts` | after `build:articles`, Tasks 9 and 10; and in CI | no output, exit 0 |
| `npm run typecheck` | Tasks 3, 4, 6, 10 | no output |
| `npm run lint` | Tasks 3, 4, 6, 10 | no output (`--max-warnings 0`) |
| `npm run build` | Tasks 7, 10 | prebuild lines, then a successful Vite build |
| `npm test` | Tasks 8, 10; and in CI from Task 9 onward | `Smoke test passed.` |
| `docker build ./web` + content grep | Task 10 | article HTML present inside the image |

After Task 9, CI enforces the drift check, lint, typecheck, and the smoke test on every pull request. Before Task 9, all of them are local-only.

---

## 4. Out of scope

Do not do any of these as part of this work.

- Annals v2 (`docs/annals-v2-world-design-brief.md`) — a separate branch and a separate concern.
- The evidence-linked case-studies spec (`docs/evidence-linked-case-studies-spec.md`).
- Pruning merged branches.
- Any change under `infrastructure/`.
- Any dependency beyond the two the design requires.
- Resolving the Goldratt citation (decision D-Q4). The fact-check table already discloses it.
- Splitting the generated module into metadata and HTML (decision D-Q2). Measure and report; do not implement.
- Any CI change beyond the two steps in Task 9. `ci.yml` is not touched (decision D-Q3).
- Syntax highlighting. `prismjs` is present but used only by the terminal's VimUI; the article code fences are almost entirely ASCII diagrams, where highlighting would actively mislead (design §3.4).
- RSS, tags, pagination, comments, or a CMS. Two articles did not justify them; three do not either. Design §1.2 says revisit at five.
- Publishing `Bottlenecks don't disappear.pdf` or the drafting notes.
