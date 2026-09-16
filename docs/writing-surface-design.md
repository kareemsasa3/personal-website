# Writing surface — design

**Date:** 2026-09-13
**Status:** Implemented — see `docs/writing-surface-implementation-plan.md`. The two-article inventory in §1, §7, and §10 is superseded: three articles shipped.
**Scope:** Add a first-class writing surface at `/writing` to the personal website, publishing two completed long-form articles with their provenance material.

---

## 1. Context

Two finished articles exist as markdown in `docs/articles/`:

| Article | Kind | Body words | Sections | Sources | Fact-check rows |
|---|---|---|---|---|---|
| `the-machine-should-explain-itself.md` | Essay | 5,881 | 10 (+15 subsections) | 10 | 13 |
| `bottlenecks-dont-disappear.md` | Field note | 2,951 | 9 (+2 subsections) | 7 | 12 |

Both share a thesis — that what is scarce relocates, and that operational intelligence should be recoverable from a system rather than resident in its operator — and both have been through a source-verification pass against primary texts.

Both carry an identical post-article structure: **Abstract → Sources → Fact-check table → Editorial note: original synthesis**. That structural parallel is what makes a single content type viable.

The site currently has no markdown rendering of any kind. Every page is TSX reading from centralized data modules in `web/src/data/`.

### 1.1 Goals

- Publish both articles at durable URLs with full SEO and no-JS support, matching the quality of the existing case-study routes.
- Keep the authoring workflow in markdown. Editing an article must not mean editing TSX.
- Render the provenance material as part of the published page, not as hidden repo-only working notes.
- Establish a content type that accommodates future pieces without rework.

### 1.2 Non-goals

- **No case study for an unreleased private system.** The general argument may be written about; the implementation may not.
- **No publication of the original slide deck.** `Bottlenecks don't disappear.pdf` is superseded by the essay and is retired to the repository as a source artifact. No asset pipeline, image gallery, or PDF viewer is in scope.
- **No CMS, no comments, no RSS, no tagging, no pagination.** Two articles do not justify them. Revisit at five.
- **No syntax highlighting.** See §3.4.

---

## 2. Constraints discovered during design

These are findings from inspecting the repository, not assumptions. Each one shaped a decision.

### 2.1 The Docker build context is `web/`, not the repository root

`.github/workflows/web-ci.yml:62` and `:74` build the image with `context: ./web`. `infrastructure/docker-compose.yml:23` and `infrastructure/dev/docker-compose.dev.yml:6` do the same. `web/Dockerfile` then runs `COPY . .`.

**Consequence:** the repository-root `docs/` directory does not exist inside the build container. A pipeline that reads `../docs/articles` would succeed on a developer machine and silently produce an article-less production site.

**Decision:** article markdown moves into `web/`. See §3.1.

### 2.2 Route shells prerender real content at build time

`web/vite.config.ts` registers `staticRouteShellPlugin`, which on `closeBundle` writes a per-route `index.html` for every published route. Each shell carries route-specific `<title>`, description, canonical URL, Open Graph and Twitter tags, JSON-LD structured data, and a `<main class="route-fallback">` body containing the route's actual content. The plugin also emits `sitemap.xml`.

Case studies render their full structured content into these shells (`renderCaseStudyBody`).

**Consequence:** a client-side-only markdown renderer would make articles the only routes on the site with empty shells — for the content that most needs to be crawlable.

**Decision:** markdown is converted to HTML at build time, before Vite config is loaded. See §3.

### 2.3 `vite.config.ts` imports application data modules directly

It imports from `./src/data/caseStudies`, `./src/data/routeMetadata`, and `./src/data/structuredData` at config-load time.

**Consequence:** any module the article pipeline generates must exist before `vite.config.ts` is evaluated — including during `npm run typecheck`, which does not run a build.

**Decision:** the generated module is committed, with a CI drift check. See §4.

### 2.4 Repository conventions to honour

From `AGENTS.md`:

- Centralized data in `web/src/data/` is preferred over copy scattered through components.
- The dark terminal/Matrix design language is preserved unless a change is explicitly requested.
- Dependencies are not added unless the task requires them.
- Route changes must be checked against `web/src/routes/index.tsx`, `web/src/data/navigation.ts`, `web/src/data/routeMetadata.ts`, `web/public/sitemap.xml`, and route-shell generation in `web/vite.config.ts`.

---

## 3. Content pipeline

### 3.1 File layout

```
web/src/content/articles/
  the-machine-should-explain-itself.md
  bottlenecks-dont-disappear.md

web/src/data/generated/
  articles.ts                          # generated, committed

docs/articles/
  *.drafting-notes.md                  # working material, stays out of web/
  Bottlenecks don't disappear.pdf      # retired source artifact
```

Article markdown moves into the build context. Drafting notes and the retired deck stay at the repository root, where the production build cannot see them.

### 3.2 Frontmatter schema

Each article gains YAML frontmatter, so the file remains self-describing rather than requiring a parallel manifest:

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

| Field | Type | Required | Notes |
|---|---|---|---|
| `slug` | string | yes | Must match the filename stem. Validated at build. |
| `title` | string | yes | Replaces the `# ` H1, which is removed from the body during conversion. |
| `subtitle` | string | no | Currently the `### ` line beneath the H1 in both files; removed from the body. |
| `kind` | `essay` \| `field-note` | yes | Drives the eyebrow label and index card styling. |
| `published` | ISO date | yes | Display and sitemap ordering. |
| `description` | string | yes | Meta/OG description. Target ≤ 160 characters; validated at build. |

`description` is authored by hand, distilled from each article's Abstract. It is not auto-derived: an abstract's first sentence is too long and reads poorly as a search result.

### 3.3 Build script

`web/scripts/build-articles.mjs`, run as a prebuild step:

```json
"scripts": {
  "build:articles": "node scripts/build-articles.mjs",
  "prebuild": "npm run build:articles"
}
```

`npm` runs `prebuild` automatically before `build`, so both `npm run build` and the `RUN npm run build` in `web/Dockerfile` regenerate the module before Vite loads its config.

`typecheck` is deliberately left as `tsc --noEmit`. Because the generated module is committed (§4), a fresh clone already has it, and a check command should not have the side effect of rewriting tracked files.

For each `web/src/content/articles/*.md` the script:

1. Parses and validates frontmatter against §3.2. **Fails the build** on a missing required field, a `slug` that disagrees with the filename, an unknown `kind`, a `published` value that is not an ISO date, or a `description` over 160 characters.
2. Strips the leading `# ` H1 and the `### ` subtitle line from the body, both being carried in frontmatter. **Fails the build** if the stripped H1 text does not equal `frontmatter.title`, or if a subtitle line is present and does not equal `frontmatter.subtitle`. Migration is the moment these can disagree, and a silent mismatch would publish a title that differs from the one in the source file.
3. Splits the remainder at the `## Post-article material` heading into **body** and **provenance**. **Fails the build** unless that delimiter occurs exactly once — zero means the provenance region is missing, more than one means the split point is ambiguous.
4. Splits provenance at its `### ` headings, matched on exact heading text:

   | Heading in source | Generated field |
   |---|---|
   | `### Abstract` | `abstractHtml` |
   | `### Sources` | `sourcesHtml` |
   | `### Fact-check table` | `factCheckHtml` |
   | `### Editorial note: original synthesis` | `editorialNoteHtml` |

   **Fails the build** if any of the four headings is absent or if an unrecognised `### ` heading appears in the provenance region, so the two articles cannot silently diverge in structure.
5. Converts each part to HTML with `marked`.
6. Derives `readingMinutes` from body word count at 225 wpm, rounded up.
7. Derives `toc` from `##` headings in the body. `###` subsections are not included — the machine essay has 15 of them and a two-level TOC would overwhelm the page. Heading IDs follow the contract in §3.5.
8. Writes `web/src/data/generated/articles.ts` with a banner comment naming the generator and warning against hand-editing.

### 3.4 Build dependencies

**Markdown:** `marked` as a **devDependency**. It supports GitHub-flavoured tables, which both articles require, and never enters the runtime bundle.

**Frontmatter:** the script splits the leading `---`-delimited block itself — a delimiter scan of a few lines — and parses that block with **`js-yaml`**, added as an explicitly declared, exactly pinned **devDependency**.

`js-yaml` is currently present in `node_modules` only as a transitive dependency of `eslint` (`eslint → @eslint/eslintrc → js-yaml`). Relying on that is not acceptable: hoisting is not a contract and ESLint may drop or change it. It must be declared directly.

**Validation:** the parsed frontmatter object is validated with **`zod`**, already a direct dependency at `web/package.json:22`. No new validation dependency is introduced, and the schema in §3.2 is expressed once as a zod schema whose inferred type is reused by the generator.

A purpose-built frontmatter package such as `gray-matter` was considered and rejected: it would add a third dependency to replace a delimiter scan of roughly five lines, against the dependency discipline in `AGENTS.md`.

Both new devDependencies are pinned to exact versions, not caret ranges, so that a transitive upgrade cannot change generated output and produce spurious CI drift (§8).

**No syntax highlighting.** `prismjs` is already a dependency but is used only by `web/src/components/Terminal/VimUI.tsx`. The 32 code fences across the two articles are almost entirely ASCII diagrams in ```` ```text ```` fences, plus one ```` ```ssh ```` config snippet. Highlighting would add weight and actively mislead on the diagrams. Code fences render as plain monospace blocks.

### 3.5 Heading ID contract

Heading IDs are computed **once**, in a single pass, and the same value is used in both places:

- as `toc[].id` in the generated module, and
- as the `id` attribute on the corresponding rendered `<h2 id="...">` in `bodyHtml`.

They are not derived independently by the TOC builder and the HTML renderer. A TOC whose anchors do not match the headings they target is a silently broken navigation control, and the sidebar is a first-class part of the article design (§6.2), not decorative metadata.

Slugification: lowercase, strip the leading section number (`## 2. Why this is…` → `why-this-is…`), replace non-alphanumerics with hyphens, collapse runs, trim leading and trailing hyphens.

**Duplicate headings** receive deterministic unique IDs by appending `-2`, `-3`, and so on in document order. Determinism matters because non-deterministic IDs would produce CI drift (§4) on every regeneration.

Implementation note: `marked` supports a custom renderer for headings. The generator supplies one that consumes IDs from the same computed list the TOC is built from, rather than re-slugifying heading text at render time.

A smoke assertion verifies the contract holds: every `toc[].id` for a published article resolves to an element with that `id` in the prerendered shell (§7, assertion 6).

### 3.6 Generated module shape

```ts
// web/src/data/generated/articles.ts
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

export const articlesData: Article[] = [ /* generated */ ];
export const articleBySlug: Record<string, Article>;
```

This mirrors the existing `caseStudies.ts` export shape (`caseStudiesData` plus `caseStudyBySlug`), so consumers follow a familiar pattern.

`sourceCount` and `factCheckRowCount` are counted at build time and displayed in the collapsed provenance summaries.

### 3.7 Trust boundary

Generated article HTML is injected into route shells **unescaped**, unlike every other renderer in `vite.config.ts`, which escapes all interpolated values.

This is correct because the source is first-party markdown committed to this repository and converted at build time. There is no user input anywhere in the path.

**Invariant to preserve:** if article content ever originates from outside this repository — a CMS, an API, a contributor pull request from an untrusted fork — HTML sanitization becomes mandatory before injection. This paragraph exists so that a future change cannot quietly violate the assumption.

---

## 4. Generated artifact and drift detection

`web/src/data/generated/articles.ts` is **committed to the repository**.

The alternative — generating it into a gitignored path — breaks `vite.config.ts`, which imports application data at config-load time. A fresh clone running `npm run typecheck` would fail before any build had produced the file.

Committed generated files drift from their sources. So CI regenerates and compares:

```yaml
- run: npm run build:articles
- run: git diff --exit-code -- src/data/generated/articles.ts
```

A drift check is declared intent verified against observed state — the reconciliation pattern both articles argue for. The site enforces the thing it publishes.

---

## 5. Routes, metadata, and SEO

| Concern | File | Change |
|---|---|---|
| Routes | `web/src/routes/index.tsx` | `writing` → `Writing` index, `writing/:slug` → `Article`, both via `lazyWithMinTime` |
| Navigation | `web/src/data/navigation.ts` | Eighth item: `{ path: "/writing", label: "Writing", icon: faPenNib }` |
| Metadata | `web/src/data/routeMetadata.ts` | Index entry plus per-article entries derived from `articlesData`, following the existing `caseStudiesData` derivation |
| Sitemap | — | Emitted automatically from `routeMetadata` entries carrying a `sitemap` field |
| Structured data | `web/src/data/structuredData.ts` | `Article` node per article with `headline`, `description`, `datePublished`, `wordCount`, `author` referencing `PERSON_ID`; `CollectionPage` for the index; breadcrumbs for both |
| Route shells | `web/vite.config.ts` | `renderWritingIndexBody()` and `renderArticleBody(slug)`, registered alongside the case-study shells |

Sitemap priorities: `/writing` at `0.8` with `changefreq: monthly`; individual articles at `0.7`, `monthly`. Articles change rarely once published; the index changes when a piece is added.

Route shells emit the full prose HTML plus a flattened provenance section — headings and tables, no `<details>` wrappers — so the no-JS and crawler view is the complete article rather than a summary.

---

## 6. Page design

The existing dark terminal palette is preserved: `--app-bg`, `--app-text`, `--brand-primary`, `--app-border` from `web/src/index.css`. New CSS lives in `web/src/pages/Writing/Writing.css` and `web/src/components/ArticlePage/ArticlePage.css`, following the per-feature CSS convention.

### 6.1 Index — `/writing`

Reuses the case-study card grid idiom (`interactive-card`), each card showing kind eyebrow, title, subtitle, published date, reading time, and the article description. Sorted by `published` descending.

### 6.2 Article — `/writing/:slug`

Single column, prose measure ~68ch, generous line height. Long-form reading is the whole point; the page should be quiet.

1. **Header** — kind eyebrow, title, subtitle, published date, reading time.
2. **Table of contents** — generated from `toc`. Sticky sidebar at ≥1200px where there is room beside the prose measure; a collapsed `<details>` element below that width. Rendered only when `toc.length >= 5`. Both current articles qualify (10 and 9); the condition is future-proofing for shorter notes.
3. **Body** — rendered `bodyHtml`. Tables wrapped in `overflow-x: auto` containers. Code fences in monospace with horizontal scroll, no highlighting.
4. **Provenance** — a visually distinct region after the conclusion, separated by a rule and labelled. Abstract renders open; Sources, Fact-check table, and Original synthesis render as `<details>` elements with counts in the summary (e.g. "Sources (10)", "Fact-check table (13)").
5. **Footer** — cross-links to the other article. The two pieces share a thesis, and each strengthens the other.

### 6.3 Why provenance is published

Both articles argue that a system should be able to explain itself to a stranger, and that the test is whether intent is recoverable from artifacts alone. Publishing the source table, the verification record — including the two corrections the verification pass forced — and the statement of which ideas are original is the page practising its own argument.

It is also a genuine differentiator. Personal sites do not ship fact-check tables.

Collapsing three of the four keeps the reading experience clean while leaving the material one click away.

---

## 7. Verification

| Change type | Commands |
|---|---|
| All | `npm run typecheck`, `npm run lint` |
| Routes, metadata, shells | `npm run build`, `npm test` |
| Generated data | `npm run build:articles` then `git diff --exit-code` |

New assertions in `web/scripts/smoke-test.mjs`:

1. `/writing/index.html` exists and lists both article titles.
2. Each `/writing/<slug>/index.html` contains prose from the article body — a distinctive sentence, not just the title — confirming shells are not empty.
3. Each article shell contains its provenance headings.
4. `sitemap.xml` contains all three new URLs.
5. Each article shell carries an `Article` JSON-LD node with a matching `headline`.
6. **TOC anchor integrity (§3.5).** For every published article, each `toc[].id` resolves to an element carrying that exact `id` in the prerendered shell. This catches a divergence between the TOC builder and the heading renderer that would otherwise only show up as a dead anchor a reader clicks.

Manual checks:

- **Mobile navigation at 320–430px.** An eighth nav item is a real overflow risk; `AGENTS.md` records prior work on mobile overflow at exactly these widths.
- **Table and code-fence overflow** on narrow screens. The machine essay's fact-check table has five columns.
- **TOC sticky behaviour** at the 1200px breakpoint.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Eighth nav item overflows mobile navigation | Explicit manual check at 320–430px; if it overflows, the nav needs a wrap or overflow treatment, which is in scope for this work |
| Generated file drifts from markdown source | CI drift check (§4) |
| Build container cannot see article source | Resolved by design: content moves into `web/` (§2.1). Smoke test assertion 2 catches any regression |
| Provenance sections diverge between articles | Build fails if any of the four sections is missing (§3.3 step 4) |
| `marked` output differs across versions, causing spurious drift | Pin an exact version in `package.json` rather than a caret range |

## 9. Open question for implementation

One citation in `bottlenecks-dont-disappear.md` — the attribution of Goldratt's five focusing steps to *The Haystack Syndrome* (1990), pp. 58–63 — rests on a peer-reviewed paper's bibliography rather than on the primary text, which was not reachable during verification. The fact-check table states this plainly.

This does not block implementation. It is recorded here so it is not forgotten if a copy of the book becomes available.

---

## 10. Change inventory

**New files**

```
web/src/content/articles/the-machine-should-explain-itself.md   (moved + frontmatter)
web/src/content/articles/bottlenecks-dont-disappear.md          (moved + frontmatter)
web/scripts/build-articles.mjs
web/src/data/generated/articles.ts                              (generated, committed)
web/src/pages/Writing/{Writing.tsx,Writing.css,index.ts}
web/src/pages/Article/{Article.tsx,index.ts}
web/src/components/ArticlePage/{ArticlePage.tsx,ArticlePage.css,index.ts}
```

**Modified files**

```
web/package.json                 marked + js-yaml devDependencies (exact pins); build:articles and prebuild scripts.
                                 typecheck is NOT modified — see §3.3.
web/src/routes/index.tsx         two routes
web/src/data/navigation.ts       Writing nav item
web/src/data/routeMetadata.ts    index + per-article metadata
web/src/data/structuredData.ts   Article and CollectionPage nodes
web/vite.config.ts               two shell renderers, registered
web/scripts/smoke-test.mjs       five assertions
.github/workflows/web-ci.yml     drift check step
```

**Removed**

```
docs/articles/the-machine-should-explain-itself.md    (moved into web/)
docs/articles/bottlenecks-dont-disappear.md           (moved into web/)
```

`docs/articles/*.drafting-notes.md` and the retired PDF remain in place.
