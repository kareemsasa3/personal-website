---
name: essay-intake
description: Use when an essay, field note, or article draft has been dropped in docs/articles/ and the author wants it published, ingested, or put on the site's /writing section, or says "intake", "publish this essay", or "put it on the site".
---

# Essay Intake

## Overview

Turn a draft in `docs/articles/` into a published article in `web/src/content/articles/<slug>.md` that passes `web/scripts/build-articles.mjs` and the smoke test.

**Core principle:** the author owns the words and the decisions. You own the structure, the provenance apparatus, and the verification. Every author decision is asked, every prose problem is reported, and every status in the fact-check table matches what you actually read in this session.

The finish line is **verified and uncommitted**. Do not commit, push, or delete the draft.

## 1. Read before touching anything

- The draft, plus `docs/articles/<anything>.drafting-notes.md` and `docs/articles/critiques/*` that relate to it. All of it is private source material, not content to publish. Drafting notes and critiques are gitignored. **The draft itself is only untracked, so `git add -A` would commit it.** Anyone staging files must name them by path.
- `web/scripts/build-articles.mjs`. It is the contract: frontmatter schema, H1/subtitle matching, the exact provenance headings, and table requirements.
- Two recent articles in `web/src/content/articles/`. Match their apparatus style (see §4).

## 2. Ask the author once, before editing

Use one `AskUserQuestion` batch. If that tool is unavailable, stop and return the questions instead. Recommend a default for each question, but do not decide any of them silently:

| Decision | Notes |
|---|---|
| Title + slug | Slug = kebab-case of the title (e.g. "Presence Is Not a Control" → `presence-is-not-a-control`). If the filename stem differs from that, ask which one to use. |
| Subtitle | If the draft has none, offer 2–3 candidates drawn from the draft's own sentences, plus "none". |
| Kind + series | `essay` or `field-note`. Series: none, or the next part of an existing series (list those series with their current part counts). |
| Published date | Default: today (ISO). |

Draft the `description` yourself (≤160 chars, drawn from the essay's thesis) and show it in the final report. Do not ask about it.

## 3. Body: structural changes only

The body prose must stay **byte-identical** to the draft, apart from these allowed changes:

- Add frontmatter. The title line becomes `# Title`, the subtitle becomes `### Subtitle`, followed by a `---` line.
- Normalize body section headings to `##` where the build requires it.
- Remove drafting-only sections (`Revision Notes`, TODOs, notes-to-self) and move them verbatim into the drafting notes (§6). Keep one `---` directly before `## Post-article material`, as every published article has.
- Leave inline citations (`[Author Year]`) exactly as written. Mention the format in the report.

**When verification contradicts a sentence, or a sentence may breach privacy** (client names, hostnames, private infrastructure; see AGENTS.md), leave the sentence unchanged. Record it as a blocker: the sentence, what the source actually says, where you read it, and proposed replacement text. The author decides.

Prove the body is unchanged by diffing the draft against the published file:

```bash
diff docs/articles/<draft>.md web/src/content/articles/<slug>.md
```

Every hunk must be one of the allowed changes above or the provenance section. Any other hunk means a prose change: undo it.

## 4. Provenance: `## Post-article material`

Write exactly these four headings, spelled exactly like this: `### Abstract`, `### Sources`, `### Fact-check table`, `### Editorial note: original synthesis`.

- **Abstract:** one paragraph stating the argument, not the topic.
- **Sources:** open with an `Inspection scope:` paragraph. Say what was accessed (full text, abstract, secondary description) and when. Then the table `| Source | Record | Locator |`, one row per work cited in the body or consulted to verify it.
- **Fact-check table:** `| Claim | Source / inspection | Status | Qualification |`, one row per empirical or attributed claim. Statuses:
  - `VERIFIED`: you read the supporting text in this session. Say which text (abstract, full text, page).
  - `QUALIFIED`: supported, with a caveat that the Qualification column states.
  - `INFERENCE` / `ANALOGY` / `ORIGINAL` / `AUTHOR`: the essay's own reasoning or experience. It is not checkable against a source.
  - `UNVERIFIED`: you could not reach the source, or you only have the claim from memory. **This is a blocker.**
  - `CONTRADICTED`: the source says otherwise, or the citation points to the wrong work or section. **This is a blocker.** Leave the prose unchanged (§3). Write "Pending author decision" in the Qualification column, and keep private drafting-note details out of this public file.

  Evidence can come from a secondary source, or from an extraction tool's reading of the full text. Name which one in the row.
- **Editorial note:** bold-labelled paragraphs, as in recent articles. Use **Inherited.**, **Adapted.**, **Analogical only.** and **This essay's contribution.**. Add **Corrected after review.** if anything was narrowed or corrected. End with **Limits.**. Leave out any label that has nothing under it.

Also resolve any "check before publication" items in the draft's revision notes. Record each result in the fact-check table or as a blocker.

## 5. Smoke test: add the slug to every per-article list

`web/scripts/smoke-test.mjs` hardcodes articles in several places. Add the new article to **every** list:

- `articleSlugs`
- the index-title list (HTML-escaped: `'` → `&#39;`)
- `distinctiveProse`: one short sentence copied verbatim from the body, containing no quotes, `&`, or `<`
- the sitemap route list
- `expectedHeadlines`
- `articlesWithoutToc`, if the body has no `##` sections (so the page renders no contents nav)
- `seriesMembers`, if the article is in a series. Also set the previous part's `next`.
- `expectedIndexOrder`: run `npm run build:articles` first, then copy the order from `web/src/data/generated/articles.ts`. Do not reason the order out yourself.

If an older article is missing from any of these lists, do not add it in this change. Report the gap as a separate follow-up.

## 6. Drafting notes

Create or append `docs/articles/<slug>.drafting-notes.md` (gitignored). Use the heading `### Change log: Draft → Published (<date>)` and record:
- the structural changes made
- the results of the page-checks
- the blockers
- the alternative subtitles
- the original Revision Notes, verbatim

## 7. Verify (from `web/`)

```bash
npm run build:articles && npm run build:articles && git diff --stat -- src/data/generated   # second run must add nothing
npm run typecheck && npm run lint && npm test
git diff --check
```

Then run `npm run preview` and check (Playwright snapshots land in the gitignored `.playwright-mcp/`) `/writing/<slug>` at 320, 375 and 1280 px:
- no horizontal page overflow; tables scroll inside `.article-table`
- every table-of-contents anchor resolves
- no console errors
- the card shows up on `/writing` in the expected position

## 8. Report

Follow the AGENTS.md reporting format (files changed, commands run, verification results, risks, suggested commit message `feat(web): publish <Title>`). Put these first:

1. **Blockers:** `UNVERIFIED` and `CONTRADICTED` rows, and privacy flags, each with a proposed fix.
2. **Author decisions** as answered, plus the description you drafted.
3. A note that the draft in `docs/articles/` is untouched and can be retired once the author commits.

## Common mistakes

| Mistake | Fix |
|---|---|
| "Fixing" a sentence the research contradicts | Record it as a blocker with proposed text. The prose stays as written. |
| `VERIFIED` based on memory or a secondary summary | Mark it `QUALIFIED` and name the secondary source, or mark it `UNVERIFIED`. |
| Choosing the slug, subtitle, series or date silently | Ask them in the §2 batch. |
| Adding the new slug only to `expectedIndexOrder` | Add it to every list in §5. |
| Leaving drafting notes in a worktree, where they get cleaned up | Write them to the main checkout's `docs/articles/`. |
| Deleting or moving the draft | Leave it in place. The author retires it. |
