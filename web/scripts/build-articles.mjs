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
  showDescriptionOnCard: z.boolean().optional(),
  // Optional membership in a reading sequence. Only name and part are
  // declared; total and previous/next are resolved across the whole set.
  series: z
    .object({
      name: z.string().min(1),
      part: z.number().int().positive(),
    })
    .strict()
    .optional(),
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

// Series are declared per article (name + part) and resolved here across the
// whole set, so "part N of M" labels and previous/next links are computed once
// and cannot drift between the index, the article page, and the static shell.
const resolveSeries = (articles) => {
  const groups = new Map();
  for (const article of articles) {
    if (!article.series) continue;
    const members = groups.get(article.series.name) ?? [];
    members.push(article);
    groups.set(article.series.name, members);
  }

  for (const [name, members] of groups) {
    members.sort((left, right) => left.series.part - right.series.part);
    const parts = members.map((member) => member.series.part);
    // A one-member series is allowed: it is a sequence whose later parts are
    // not published yet. Parts must still run 1..N with no gaps or repeats.
    const contiguous = parts.every((part, index) => part === index + 1);
    if (!contiguous) {
      throw new Error(
        `build-articles: series "${name}" must number its parts 1..N with no gaps or duplicates (got ${parts.join(", ")})`
      );
    }

    const slug = slugifyHeading(name);
    members.forEach((member, index) => {
      const previous = members[index - 1];
      const next = members[index + 1];
      member.series = {
        name,
        slug,
        part: member.series.part,
        total: members.length,
        previous: previous ? { slug: previous.slug, title: previous.title } : null,
        next: next ? { slug: next.slug, title: next.title } : null,
      };
    });
  }

  return articles;
};

const compareNewestFirst = (left, right) =>
  left.published === right.published
    ? left.slug.localeCompare(right.slug)
    : right.published.localeCompare(left.published);

// Display order for the writing index and every other consumer of
// articlesData. The feed stays newest-first, but a series is one sortable
// unit: it is placed at the date of its most recently published member and
// then expanded into its members in ascending part order, so the index never
// shows Part 3 above Part 1. Articles outside any series are units of one and
// keep plain date order. Slug breaks ties so the output is deterministic.
const orderForIndex = (articles) => {
  const units = new Map();
  for (const article of articles) {
    const key = article.series
      ? `series:${article.series.slug}`
      : `article:${article.slug}`;
    const unit = units.get(key) ?? {
      published: article.published,
      slug: article.series ? article.series.slug : article.slug,
      members: [],
    };
    unit.members.push(article);
    if (article.published > unit.published) unit.published = article.published;
    units.set(key, unit);
  }

  return [...units.values()]
    .sort(compareNewestFirst)
    .flatMap((unit) =>
      unit.members.sort(
        (left, right) => (left.series?.part ?? 0) - (right.series?.part ?? 0)
      )
    );
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

export interface ArticleSeriesLink {
  slug: string;
  title: string;
}

export interface ArticleSeries {
  name: string;
  slug: string;
  part: number;
  total: number;
  previous: ArticleSeriesLink | null;
  next: ArticleSeriesLink | null;
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
  showDescriptionOnCard?: boolean;
  series?: ArticleSeries;
  readingMinutes: number;
  wordCount: number;
  toc: ArticleTocEntry[];
  bodyHtml: string;
  provenance: ArticleProvenance;
}

export const articlesData: Article[] = ${JSON.stringify(articles, null, 2)};

// Seeded with a null-prototype object so a URL slug matching an inherited
// Object.prototype key ("constructor", "toString", "__proto__", ...) resolves
// to undefined rather than to a truthy non-article.
export const articleBySlug: Record<string, Article> = articlesData.reduce<
  Record<string, Article>
>((articlesBySlug, article) => {
  articlesBySlug[article.slug] = article;
  return articlesBySlug;
}, Object.create(null) as Record<string, Article>);
`;

const main = async () => {
  const fileNames = (await readdir(contentDir))
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (fileNames.length === 0) {
    throw new Error(`build-articles: no markdown found in ${contentDir}`);
  }

  const articles = orderForIndex(
    resolveSeries(await Promise.all(fileNames.map(buildArticle)))
  );

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, renderModule(articles), "utf8");

  for (const article of articles) {
    console.log(
      `build-articles: ${article.slug} — ${article.wordCount} words, ${article.readingMinutes} min, ` +
        `${article.toc.length} TOC entries, ${article.provenance.sourceCount} sources, ` +
        `${article.provenance.factCheckRowCount} fact-check rows` +
        (article.series
          ? `, ${article.series.name} part ${article.series.part} of ${article.series.total}`
          : "")
    );
  }
};

await main();
