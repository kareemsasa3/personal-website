# Publication and revision dates

Case studies and essays carry dates that record **publication history**: when a
version reached production. They do not record repository activity, merges, or
evidence reviews. Owner decisions 79, 79A and 80 set these rules.

## Fields

| Field | Applies to | Meaning |
|---|---|---|
| `published` | Case studies (required, a date or `"unknown"`) | The first verified successful production release carrying the study. |
| `published` | Essays (required, a date) | The first production release carrying the essay, as for case studies. Decision 84 corrected two essays whose earlier value preceded that release. |
| `updated` | Case studies (required, a date or `"unknown"`) | The most recent **substantive** published content change. |
| `updated` | Essays (optional, a date) | Same meaning. Omit it when no substantive revision has been published. |

All dates are `YYYY-MM-DD` calendar days in **America/Chicago**, including daylight-saving
transitions. A date is the Chicago calendar day on which the production deploy that carried the
content completed. Merge or commit times are not used.

- Never estimate a date. When no reliable release evidence exists, write `"unknown"` (case studies
  only). Unknown values are omitted from the page and from JSON-LD, never replaced with a placeholder.
- A newly published study with no later substantive revision uses its publication date for both
  fields.
- A known `updated` never precedes a known `published`, and no date is later than today in
  America/Chicago.
- Evidence-review dates are a separate concept and are not represented by `updated` or by
  `dateModified`. No `reviewed` field exists yet.

## What counts as a substantive revision

A revision is substantive when it changes a factual claim, the scope, the meaning or
interpretation, or material content (including visible captions that explain what evidence shows).

These do **not** advance `updated`:

- typos, formatting and styling;
- routine link corrections;
- metadata-only changes (document titles, search titles, descriptions used only for SEO);
- evidence checks that leave the published content unchanged.

The classification is an editorial judgment made during review. It is deliberately not automated
from Git diffs. When a change is substantive, set `updated` to the Chicago date on which its
production deploy completed. That date is usually known only after release, so record it in a
follow-up change if needed.

## Where the rules are enforced

- `web/src/utils/publicationDates.mjs` holds the shared rules: calendar validity (including leap
  years), the America/Chicago "today", ordering, display and structured-data mapping.
- `web/scripts/build-articles.mjs` validates essay frontmatter.
- `web/vite.config.ts` validates every case study and essay before a production build.
- The smoke test checks that each built shell displays exactly the dates its JSON-LD carries.
- Unit tests: `node --test scripts/publication-dates.test.mjs` (from `web/`). The data test
  `scripts/publication-dates-data.test.mjs` imports TypeScript sources and runs with Node 22.18+ and
  `--import ./scripts/route-metadata-test-loader.mjs`.

## Display and structured data

- Case studies show "Published …" and, when it is a distinct later revision, "Updated …" below the
  summary. When publication is unknown and a revision date is known, only "Updated …" appears.
- Essays keep their existing date in the metadata line and add "Updated …" when `updated` is a
  distinct later date.
- JSON-LD: case-study `CreativeWork` nodes carry `datePublished` and `dateModified` when known.
  Essay `Article` nodes keep `datePublished` and add `dateModified` when `updated` is set.

The evidence behind each assigned case-study date is kept in a private, gitignored provenance record
(`docs/private/publication-date-provenance.md`). It is not published.
