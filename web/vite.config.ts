import { defineConfig, loadEnv } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  caseStudiesData,
  caseStudyCards,
  sectionTitle,
  type CaseStudy,
  type CaseStudyBlock,
  type CaseStudySectionId,
} from "./src/data/caseStudies";
import { caseStudyBlocksBySlug } from "./src/data/caseStudyBlocks";
import { projectsData } from "./src/data/projects";
import {
  proceduralAnimationsData,
  type ProceduralAnimation,
} from "./src/data/proceduralAnimations";
import {
  featuredProjectIds,
  heroContent,
  socialContent,
} from "./src/data/siteContent";
import { articlesData, articleBySlug } from "./src/data/generated/articles";
import {
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_URL,
  SITE_URL,
  type RouteMetadata,
  routeMetadataByPath,
  sitemapRouteMetadata,
} from "./src/data/routeMetadata";
import { getStructuredDataJson } from "./src/data/structuredData";
import type { BuildInfo } from "./src/types/buildInfo";

const DEFAULT_DEV_HOST = "0.0.0.0";
const DEFAULT_DEV_PORT = 5173;

const resolveDevHost = (env: Record<string, string>) =>
  env.DEV_HOST?.trim() || DEFAULT_DEV_HOST;

const resolveDevPort = (env: Record<string, string>) => {
  const candidate = Number(env.DEV_PORT ?? DEFAULT_DEV_PORT);
  return Number.isFinite(candidate) && candidate > 0
    ? candidate
    : DEFAULT_DEV_PORT;
};

const resolveOptionalPort = (value: string | undefined) => {
  const candidate = Number(value);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : undefined;
};

const resolveTailscaleIp = (env: Record<string, string>): string | undefined => {
  const configured = env.TAILSCALE_IP?.trim();
  if (configured) {
    return configured;
  }

  let interfaces: ReturnType<typeof os.networkInterfaces>;
  try {
    interfaces = os.networkInterfaces();
  } catch {
    return undefined;
  }
  const tailscaleInterfaces = interfaces.tailscale0 ?? [];

  for (const iface of tailscaleInterfaces) {
    if (iface?.family === "IPv4" && !iface.internal) {
      return iface.address;
    }
  }

  return undefined;
};

const devBannerPlugin = (
  tailscaleIp: string | undefined,
  port: number
): Plugin => ({
  name: "dev-banner",
  configureServer(server: ViteDevServer) {
    server.httpServer?.once("listening", () => {
      const localUrl = `http://localhost:${port}`;
      if (tailscaleIp) {
        const tailscaleUrl = `http://${tailscaleIp}:${port}`;
        server.config.logger.info(
          `\n  Local:     ${localUrl}\n  Tailscale: ${tailscaleUrl}\n`
        );
        return;
      }

      server.config.logger.info(`\n  Local:     ${localUrl}\n`);
    });
  },
});

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;

const runGit = (args: string[]) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

// CI passes the exact commit the image is built and tagged from. Otherwise use
// the local checkout; Docker builds exclude .git and resolve to "none".
const resolveBuildInfo = (env: Record<string, string>): BuildInfo => {
  const ciSha = env.BUILD_SHA?.trim().toLowerCase();
  if (ciSha) {
    if (!FULL_SHA_PATTERN.test(ciSha)) {
      throw new Error(`BUILD_SHA must be a full 40-character commit SHA, got "${ciSha}"`);
    }
    return { source: "ci", sha: ciSha };
  }

  try {
    const sha = runGit(["rev-parse", "HEAD"]);
    if (FULL_SHA_PATTERN.test(sha)) {
      return {
        source: "local",
        sha,
        dirty: runGit(["status", "--porcelain"]).length > 0,
      };
    }
  } catch {
    // No git binary or no checkout available.
  }

  return { source: "none" };
};

interface StaticRouteShell {
  path: string;
  title: string;
  description: string;
  canonicalPath: string;
  structuredDataJson: string;
  bodyHtml: string;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeScriptJson = (value: string) =>
  value.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");

const renderList = (items: string[]) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const renderLinkList = (
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
    unavailable?: boolean;
    unavailableLabel?: string;
  }>
) =>
  `<ul>${links
    .map((link) => {
      if (link.unavailable) {
        return `<li><span class="route-fallback__label">${escapeHtml(
          link.label
        )}</span>: ${escapeHtml(link.unavailableLabel ?? "Not public yet")}</li>`;
      }

      const target = link.external
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
      return `<li><a href="${escapeHtml(link.href)}"${target}>${escapeHtml(
        link.label
      )}</a></li>`;
    })
    .join("")}</ul>`;

const renderArtifactGrid = (
  artifacts: Array<{
    title: string;
    kind: string;
    status: string;
    description: string;
    href?: string;
    note?: string;
  }>
) => `
  <div class="route-fallback__grid">
    ${artifacts
      .map(
        (artifact) => `
          <article class="route-fallback__card">
            <p class="route-fallback__eyebrow">${escapeHtml(
              artifact.kind
            )} / ${escapeHtml(artifact.status)}</p>
            <h3>${escapeHtml(artifact.title)}</h3>
            <p>${escapeHtml(artifact.description)}</p>
            ${
              artifact.note
                ? `<p><strong>Note:</strong> ${escapeHtml(artifact.note)}</p>`
                : ""
            }
            ${
              artifact.href
                ? `<a class="route-fallback__card-link" href="${escapeHtml(
                    artifact.href
                  )}" target="_blank" rel="noopener noreferrer" aria-label="View artifact: ${escapeHtml(
                    artifact.title
                  )}">View artifact</a>`
                : ""
            }
          </article>
        `
      )
      .join("")}
  </div>
`;

const renderSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRouteMetadata
  .map((metadata) => `  <url>
    <loc>${SITE_URL}${metadata.canonicalPath}</loc>
    <changefreq>${metadata.sitemap?.changefreq}</changefreq>
    <priority>${metadata.sitemap?.priority}</priority>
  </url>`)
  .join("\n")}
</urlset>
`;

const primaryRouteShellPaths = [
  "/experience",
  "/journey",
  "/simulations",
  "/simulations/orbital-simulator",
  "/simulations/traffic-simulator",
  "/simulations/snake",
  "/simulations/spider",
  "/simulations/rhythm-lab",
  "/procedural-animations",
  "/terminal",
] as const;

const primaryRouteShellDetails: Record<
  (typeof primaryRouteShellPaths)[number],
  {
    eyebrow: string;
    heading: string;
    highlights: string[];
    links?: Array<{ label: string; href: string }>;
  }
> = {
  "/experience": {
    eyebrow: "Professional Work",
    heading: "Experience",
    highlights: [
      "Consulting, platform modernization, frontend stabilization, and backend architecture work.",
      "Public-safe summaries focus on systems clarity, production reliability, and software delivery.",
    ],
    links: [{ label: "View projects", href: "/projects" }],
  },
  "/journey": {
    eyebrow: "Background",
    heading: "Engineering Journey",
    highlights: [
      "A narrative route covering the experiences that shaped Kareem Sasa's engineering practice.",
      "The page connects technical interests, operating principles, and portfolio direction.",
    ],
  },
  "/simulations": {
    eyebrow: "Interactive Systems",
    heading: "Simulations",
    highlights: [
      "Interactive systems exploring state, rules, feedback loops, and emergent behavior.",
      "Includes Orbital Simulator, Traffic Simulator, Rhythm Lab, Snake, and Spider Solitaire.",
    ],
    links: [
      { label: "Open Orbital Simulator", href: "/simulations/orbital-simulator" },
      { label: "Open Traffic Simulator", href: "/simulations/traffic-simulator" },
      { label: "Open Snake", href: "/simulations/snake" },
      { label: "Open Spider Solitaire", href: "/simulations/spider" },
      { label: "Open Rhythm Lab", href: "/simulations/rhythm-lab" },
    ],
  },
  "/simulations/orbital-simulator": {
    eyebrow: "Interactive System",
    heading: "Orbital Simulator",
    highlights: [
      "Explore planetary orbits, binary stars, and three-body encounters with pairwise gravity.",
      "Change mass, position, and velocity in a live numerical simulation. JavaScript is required for the interactive field.",
    ],
    links: [{ label: "Back to simulations", href: "/simulations" }],
  },
  "/simulations/traffic-simulator": {
    eyebrow: "Interactive System",
    heading: "Traffic Simulator",
    highlights: [
      "Explore how congestion emerges from simple driver rules: coordinated signals, a lane drop, and stop-and-go waves on a ring road.",
      "Retime signals and change demand in a live traffic model with throughput and a time-space diagram. JavaScript is required for the interactive road.",
    ],
    links: [
      { label: "Back to simulations", href: "/simulations" },
      { label: "Read the case study: Where the Specification Lived", href: "/case-studies/where-the-specification-lived" },
    ],
  },
  "/simulations/snake": {
    eyebrow: "Interactive System",
    heading: "Snake",
    highlights: [
      "Discrete grid simulation with wrap-around topology, state-driven growth, and collision detection.",
      "The interactive system loads through the React application when JavaScript is available.",
    ],
    links: [{ label: "Back to simulations", href: "/simulations" }],
  },
  "/simulations/spider": {
    eyebrow: "Interactive System",
    heading: "Spider Solitaire",
    highlights: [
      "Constraint-based card sequencing system with tableau state management and completion detection.",
      "The interactive system loads through the React application when JavaScript is available.",
    ],
    links: [{ label: "Back to simulations", href: "/simulations" }],
  },
  "/simulations/rhythm-lab": {
    eyebrow: "Interactive System",
    heading: "Rhythm Lab",
    highlights: [
      "Three-lane input timing system with chart authoring, real-time feedback scoring, and run analytics.",
      "The interactive system loads through the React application when JavaScript is available.",
    ],
    links: [{ label: "Back to simulations", href: "/simulations" }],
  },
  "/procedural-animations": {
    eyebrow: "Computational Motion",
    heading: "Procedural Animations",
    highlights: [
      "Self-contained motion pieces where movement is generated in code from rules, time, and noise.",
      `Includes ${proceduralAnimationsData.map((piece) => piece.title).join(", ")}.`,
    ],
    links: [
      ...proceduralAnimationsData.map((piece) => ({
        label: `View ${piece.title}`,
        href: `/procedural-animations/${piece.slug}`,
      })),
      { label: "View simulations", href: "/simulations" },
    ],
  },
  "/terminal": {
    eyebrow: "Command Interface",
    heading: "Terminal",
    highlights: [
      "An interactive terminal route for exploring portfolio content through a command-driven interface.",
      "The full terminal experience loads through the React application when JavaScript is available.",
    ],
    links: [{ label: "View projects", href: "/projects" }],
  },
};

const renderPrimaryRouteBody = (metadata: RouteMetadata) => {
  const details =
    primaryRouteShellDetails[
      metadata.path as (typeof primaryRouteShellPaths)[number]
    ];

  if (!details) {
    throw new Error(`Missing primary route shell details for path: ${metadata.path}`);
  }

  return `
    <main class="route-fallback" aria-label="${escapeHtml(
      details.heading
    )} overview">
      <p class="route-fallback__eyebrow">${escapeHtml(details.eyebrow)}</p>
      <h1 class="route-fallback__title">${escapeHtml(details.heading)}</h1>
      <p class="route-fallback__summary">${escapeHtml(metadata.description)}</p>

      <section class="route-fallback__section">
        <h2>Page Overview</h2>
        ${renderList(details.highlights)}
      </section>

      ${
        details.links
          ? `<section class="route-fallback__section route-fallback__link-list">
              <h2>Related Routes</h2>
              ${renderLinkList(details.links)}
            </section>`
          : ""
      }
    </main>
  `;
};

const renderProceduralAnimationBody = (piece: ProceduralAnimation) => `
  <main class="route-fallback" aria-label="${escapeHtml(piece.title)} procedural animation">
    <p class="route-fallback__breadcrumbs"><a href="/procedural-animations">Procedural Animations</a> / ${escapeHtml(
      piece.title
    )}</p>
    <p class="route-fallback__eyebrow">Procedural Animation</p>
    <h1 class="route-fallback__title">${escapeHtml(piece.title)}</h1>
    <p class="route-fallback__summary">${escapeHtml(piece.description)}</p>

    <section class="route-fallback__section">
      <h2>Page Overview</h2>
      ${renderList([
        "A self-contained procedural animation rendered live in the browser.",
        "JavaScript is required to play the animation.",
      ])}
    </section>

    <section class="route-fallback__section route-fallback__link-list">
      <h2>Related Routes</h2>
      ${renderLinkList([{ label: "Back to Procedural Animations", href: "/procedural-animations" }])}
    </section>
  </main>
`;

const renderProjectsBody = (metadata: RouteMetadata) => `
  <main class="route-fallback" aria-label="Projects overview">
    <p class="route-fallback__eyebrow">Project Roster</p>
    <h1 class="route-fallback__title">Projects</h1>
    <p class="route-fallback__summary">${escapeHtml(metadata.description)}</p>

    <section class="route-fallback__section" aria-labelledby="projects-list-title">
      <h2 id="projects-list-title">All Projects</h2>
      <div class="route-fallback__grid">
        ${projectsData
          .map((project) => {
            const caseStudy = caseStudiesData.find(
              (entry) => entry.projectId === project.id
            );

            return `
              <article class="route-fallback__card">
                <h3>${escapeHtml(project.title)}</h3>
                <div class="route-fallback__meta">
                  <span class="route-fallback__pill">${escapeHtml(project.category)}</span>
                  <span class="route-fallback__pill">${escapeHtml(project.date)}</span>
                  <span class="route-fallback__pill">${escapeHtml(project.status)}</span>
                </div>
                <p>${escapeHtml(project.shortDescription)}</p>
                ${
                  caseStudy
                    ? `<a class="route-fallback__card-link" href="/case-studies/${escapeHtml(
                        caseStudy.slug
                      )}">Read case study</a>`
                    : ""
                }
                ${
                  project.githubUrl
                    ? `<a class="route-fallback__card-link" href="${escapeHtml(
                        project.githubUrl
                      )}" target="_blank" rel="noopener noreferrer">View code</a>`
                    : ""
                }
              </article>
            `;
          })
          .join("")}
      </div>
    </section>

    <section class="route-fallback__section route-fallback__link-list">
      <h2>Related Routes</h2>
      ${renderLinkList([{ label: "Read case studies", href: "/case-studies" }])}
    </section>
  </main>
`;

const renderCaseStudiesIndexBody = () => `
  <main class="route-fallback" aria-label="Case studies overview">
    <p class="route-fallback__eyebrow">Engineering Narrative</p>
    <h1 class="route-fallback__title">Case Studies</h1>
    <p class="route-fallback__summary">
      Structured engineering writeups for the portfolio’s strongest systems. Each page documents the problem, constraints, architecture, and implementation choices behind the work.
    </p>

    <section class="route-fallback__section" aria-labelledby="case-studies-list-title">
      <h2 id="case-studies-list-title">Available Case Studies</h2>
      <div class="route-fallback__grid">
        ${caseStudiesData
          .map(
            (caseStudy) => `
              <article class="route-fallback__card">
                <h3>${escapeHtml(caseStudy.title)}</h3>
                <p>${escapeHtml(caseStudy.shortDescription)}</p>
                <a class="route-fallback__card-link" href="/case-studies/${escapeHtml(
                  caseStudy.slug
                )}">Read case study</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  </main>
`;

// Mirrors CaseStudyBlocks: prose, prompts, captions, and tables as plain HTML; media as links.
const renderCaseStudyBlocks = (blocks: CaseStudyBlock[] | undefined) =>
  (blocks ?? [])
    .map((block) => {
      const heading = "heading" in block && block.heading ? `<h3>${escapeHtml(block.heading)}</h3>` : "";
      switch (block.kind) {
        case "prose":
          return `${heading}${block.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}`;
        case "list":
          return `${heading}${renderList(block.items)}`;
        case "prompts":
          return `${heading}${block.prompts
            .map(
              (prompt) => `
                <details>
                  <summary>${escapeHtml(prompt.label)} (${escapeHtml(prompt.summary)})</summary>
                  <blockquote>${prompt.text
                    .split("\n\n")
                    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
                    .join("")}</blockquote>
                </details>
              `
            )
            .join("")}`;
        case "images":
          return `<figure>${renderLinkList(
            block.images.map((image) => ({ label: `Image: ${image.alt}`, href: image.src }))
          )}<figcaption>${escapeHtml(block.caption)}</figcaption></figure>`;
        case "recording":
          return `<figure>${renderLinkList([
            { label: `Recording: ${block.media.video.label}`, href: block.media.video.src },
          ])}<figcaption>${escapeHtml(block.media.video.significance)}</figcaption></figure>`;
        case "comparison":
          return `
            <table>
              <caption>${escapeHtml(block.caption)}</caption>
              <thead><tr><td></td>${block.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead>
              <tbody>${block.rows
                .map(
                  (row) =>
                    `<tr><th scope="row">${escapeHtml(row.label)}</th>${row.values
                      .map((value) => `<td>${escapeHtml(value)}</td>`)
                      .join("")}</tr>`
                )
                .join("")}</tbody>
            </table>
            ${block.note ? `<p>${escapeHtml(block.note)}</p>` : ""}
          `;
        default:
          return "";
      }
    })
    .join("");

const blocksFor = (caseStudy: CaseStudy) => caseStudy.blocks ?? caseStudyBlocksBySlug[caseStudy.slug];
const blocksBefore = (caseStudy: CaseStudy, id: CaseStudySectionId) =>
  renderCaseStudyBlocks(blocksFor(caseStudy)?.[id]?.before);
const blocksAfter = (caseStudy: CaseStudy, id: CaseStudySectionId) =>
  renderCaseStudyBlocks(blocksFor(caseStudy)?.[id]?.after);

const renderCaseStudyBody = (slug: string) => {
  const caseStudy = caseStudiesData.find((entry) => entry.slug === slug);

  if (!caseStudy) {
    throw new Error(`Missing case study data for slug: ${slug}`);
  }

  return `
    <main class="route-fallback" aria-label="${escapeHtml(
      caseStudy.title
    )} case study">
      <p class="route-fallback__breadcrumbs"><a href="/case-studies">Case Studies</a> / ${escapeHtml(
        caseStudy.title
      )}</p>
      <p class="route-fallback__eyebrow">${
        caseStudy.kind === "experiment" ? "Experiment Case Study" : "Engineering Case Study"
      }</p>
      <h1 class="route-fallback__title">${escapeHtml(caseStudy.title)}</h1>
      <p class="route-fallback__summary">${escapeHtml(
        caseStudy.shortDescription
      )}</p>
      <div class="route-fallback__meta">
        ${caseStudy.focusAreas
          .map(
            (focusArea) =>
              `<span class="route-fallback__pill">${escapeHtml(focusArea)}</span>`
          )
          .join("")}
      </div>

      <section class="route-fallback__section">
        <h2>${escapeHtml(sectionTitle(caseStudy, "problem", "Problem"))}</h2>
        ${blocksBefore(caseStudy, "problem")}
        <p>${escapeHtml(caseStudy.problem)}</p>
        ${blocksAfter(caseStudy, "problem")}
      </section>

      <section class="route-fallback__section">
        <h2>${escapeHtml(sectionTitle(caseStudy, "constraints", "Constraints"))}</h2>
        ${blocksBefore(caseStudy, "constraints")}
        <div class="route-fallback__grid">
          <article class="route-fallback__card">
            <h3>${escapeHtml(caseStudy.constraintTitles?.[0] ?? "Technical Constraints")}</h3>
            <p>${escapeHtml(caseStudy.constraints.technicalLimitations)}</p>
          </article>
          <article class="route-fallback__card">
            <h3>${escapeHtml(caseStudy.constraintTitles?.[1] ?? "Environment")}</h3>
            <p>${escapeHtml(caseStudy.constraints.environment)}</p>
          </article>
          <article class="route-fallback__card">
            <h3>${escapeHtml(caseStudy.constraintTitles?.[2] ?? "Tradeoffs")}</h3>
            <p>${escapeHtml(caseStudy.constraints.tradeoffs)}</p>
          </article>
        </div>
        ${blocksAfter(caseStudy, "constraints")}
      </section>

      <section class="route-fallback__section">
        <h2>${escapeHtml(sectionTitle(caseStudy, "architecture", "Architecture"))}</h2>
        ${blocksBefore(caseStudy, "architecture")}
        ${renderList(caseStudy.architecture)}
        ${blocksAfter(caseStudy, "architecture")}
      </section>

      <section class="route-fallback__section">
        <h2>${escapeHtml(sectionTitle(caseStudy, "decisions", "Key Technical Decisions"))}</h2>
        ${blocksBefore(caseStudy, "decisions")}
        <div class="route-fallback__grid">
          ${caseStudy.keyTechnicalDecisions
            .map(
              (decision) => `
                <article class="route-fallback__card">
                  <h3>${escapeHtml(decision.title)}</h3>
                  <p>${escapeHtml(decision.rationale)}</p>
                </article>
              `
            )
            .join("")}
        </div>
        ${blocksAfter(caseStudy, "decisions")}
      </section>

      <section class="route-fallback__section">
        <h2>${escapeHtml(
          sectionTitle(
            caseStudy,
            "implementation",
            caseStudy.slug === "erebus" ? "Operational Capabilities" : "Implementation Highlights"
          )
        )}</h2>
        ${blocksBefore(caseStudy, "implementation")}
        <div class="route-fallback__grid">
          ${caseStudy.implementationHighlights
            .map(
              (highlight) => `
                <article class="route-fallback__card">
                  <h3>${escapeHtml(highlight.title)}</h3>
                  <p>${escapeHtml(highlight.detail)}</p>
                </article>
              `
            )
            .join("")}
        </div>
        ${blocksAfter(caseStudy, "implementation")}
      </section>

      <section class="route-fallback__section">
        <h2>${escapeHtml(
          sectionTitle(caseStudy, "outcome", caseStudy.slug === "erebus" ? "Current Outcome" : "Outcome")
        )}</h2>
        ${blocksBefore(caseStudy, "outcome")}
        ${renderList(caseStudy.outcome)}
        ${blocksAfter(caseStudy, "outcome")}
      </section>

      <section class="route-fallback__section">
        <h2>Evidence</h2>
        ${renderArtifactGrid(caseStudy.artifacts)}
      </section>

      <section class="route-fallback__section route-fallback__link-list">
        <h2>Links</h2>
        ${renderLinkList(caseStudy.links)}
      </section>
    </main>
  `;
};

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
                ${
                  article.series
                    ? `<p class="route-fallback__meta">${escapeHtml(
                        article.series.name
                      )} · Part ${article.series.part} of ${article.series.total}</p>`
                    : ""
                }
                <h3>${escapeHtml(article.title)}</h3>
                ${
                  article.showDescriptionOnCard !== false
                    ? `<p>${escapeHtml(article.description)}</p>`
                    : article.subtitle
                      ? `<p>${escapeHtml(article.subtitle)}</p>`
                      : ""
                }
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

const renderArticleBody = (slug: string) => {
  const article = articleBySlug[slug];

  if (!article) {
    throw new Error(`Missing article data for slug: ${slug}`);
  }

  const usesNumberedHeadings = article.toc.every((entry) =>
    /^\d+\.\s/.test(entry.label)
  );

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
      ${
        article.series
          ? `<p class="route-fallback__meta">Part ${article.series.part} of ${
              article.series.total
            } in ${escapeHtml(article.series.name)}</p>`
          : ""
      }
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
              <ol${
                usesNumberedHeadings
                  ? ' class="route-fallback__toc-list--pre-numbered"'
                  : ""
              }>${article.toc
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

      ${
        article.series
          ? `<nav class="route-fallback__series-nav" aria-label="${escapeHtml(
              article.series.name
            )} series">${
              article.series.previous
                ? `<p><a href="/writing/${escapeHtml(
                    article.series.previous.slug
                  )}">Previous: ${escapeHtml(article.series.previous.title)}</a></p>`
                : ""
            }${
              article.series.next
                ? `<p><a href="/writing/${escapeHtml(
                    article.series.next.slug
                  )}">Next: ${escapeHtml(article.series.next.title)}</a></p>`
                : ""
            }</nav>`
          : ""
      }

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

// Primary destinations the hydrated homepage reaches through the hero CTAs,
// the Featured Systems footer, and the global navigation. Descriptions come
// from route metadata so the shell never carries its own prose.
const homeDestinationPaths = [
  { path: "/projects", label: "Projects" },
  { path: "/case-studies", label: "Case Studies" },
  { path: "/writing", label: "Writing" },
  { path: "/experience", label: "Experience" },
] as const;

const renderHomeBody = () => {
  // Same selection and join as src/pages/Home/sections/FeaturedProjectsSection.tsx.
  const featuredSystems = featuredProjectIds.flatMap((id) => {
    const caseStudy = caseStudyCards.find((entry) => entry.projectId === id);
    return caseStudy ? [caseStudy] : [];
  });

  if (featuredSystems.length !== featuredProjectIds.length) {
    throw new Error("Missing case study card for a featured project id");
  }

  return `
    <main class="route-fallback" aria-label="Homepage overview">
      <p class="route-fallback__eyebrow">Systems Engineer</p>
      <h1 class="route-fallback__title">${escapeHtml(heroContent.title)}</h1>
      <p class="route-fallback__summary">${escapeHtml(heroContent.subtitle)}</p>

      <section class="route-fallback__section" aria-labelledby="home-featured-systems-title">
        <h2 id="home-featured-systems-title">Featured Systems</h2>
        <div class="route-fallback__grid">
          ${featuredSystems
            .map(
              (caseStudy) => `
                <article class="route-fallback__card">
                  <h3>${escapeHtml(caseStudy.title)}</h3>
                  <div class="route-fallback__meta">
                    <span class="route-fallback__pill">${escapeHtml(
                      caseStudy.status
                    )}</span>
                  </div>
                  <p>${escapeHtml(caseStudy.shortDescription)}</p>
                  <a class="route-fallback__card-link" href="/case-studies/${escapeHtml(
                    caseStudy.slug
                  )}">Read case study</a>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="route-fallback__section route-fallback__link-list" aria-labelledby="home-destinations-title">
        <h2 id="home-destinations-title">Explore</h2>
        <ul>
          ${homeDestinationPaths
            .map(({ path, label }) => {
              const metadata = getRouteMetadata(path);
              return `<li><a href="${escapeHtml(path)}">${escapeHtml(
                label
              )}</a>: ${escapeHtml(metadata.description)}</li>`;
            })
            .join("")}
        </ul>
      </section>

      <section class="route-fallback__section route-fallback__link-list" aria-labelledby="home-contact-title">
        <h2 id="home-contact-title">${escapeHtml(socialContent.title)}</h2>
        ${renderLinkList(
          socialContent.links.map((link) => ({
            label: link.name,
            href: link.url,
            external: !link.url.startsWith("mailto:"),
          }))
        )}
      </section>
    </main>
  `;
};

const replaceTag = (html: string, pattern: RegExp, replacement: string) => {
  if (!pattern.test(html)) {
    throw new Error(`Expected pattern not found in HTML: ${pattern}`);
  }

  return html.replace(pattern, replacement);
};

const applyRouteShell = (baseHtml: string, route: StaticRouteShell) => {
  const canonicalUrl = `${SITE_URL}${route.canonicalPath}`;

  return [
    {
      pattern: /<title>[\s\S]*?<\/title>/,
      replacement: `<title>${escapeHtml(route.title)}</title>`,
    },
    {
      pattern: /<meta name="description" content="[^"]*" \/>/,
      replacement: `<meta name="description" content="${escapeHtml(
        route.description
      )}" />`,
    },
    {
      pattern: /<link rel="canonical" href="[^"]*" \/>/,
      replacement: `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    },
    {
      pattern: /<meta property="og:url" content="[^"]*" \/>/,
      replacement: `<meta property="og:url" content="${escapeHtml(
        canonicalUrl
      )}" />`,
    },
    {
      pattern: /<meta property="og:title" content="[^"]*" \/>/,
      replacement: `<meta property="og:title" content="${escapeHtml(
        route.title
      )}" />`,
    },
    {
      pattern: /<meta property="og:description" content="[^"]*" \/>/,
      replacement: `<meta property="og:description" content="${escapeHtml(
        route.description
      )}" />`,
    },
    {
      pattern: /<meta name="twitter:title" content="[^"]*" \/>/,
      replacement: `<meta name="twitter:title" content="${escapeHtml(
        route.title
      )}" />`,
    },
    {
      pattern: /<meta name="twitter:description" content="[^"]*" \/>/,
      replacement: `<meta name="twitter:description" content="${escapeHtml(
        route.description
      )}" />`,
    },
    {
      pattern: /<meta property="og:image" content="[^"]*" \/>/,
      replacement: `<meta property="og:image" content="${escapeHtml(
        DEFAULT_IMAGE_URL
      )}" />`,
    },
    {
      pattern: /<meta property="og:image:alt" content="[^"]*" \/>/,
      replacement: `<meta property="og:image:alt" content="${escapeHtml(
        DEFAULT_IMAGE_ALT
      )}" />`,
    },
    {
      pattern: /<meta name="twitter:image" content="[^"]*" \/>/,
      replacement: `<meta name="twitter:image" content="${escapeHtml(
        DEFAULT_IMAGE_URL
      )}" />`,
    },
    {
      pattern: /<meta name="twitter:image:alt" content="[^"]*" \/>/,
      replacement: `<meta name="twitter:image:alt" content="${escapeHtml(
        DEFAULT_IMAGE_ALT
      )}" />`,
    },
    {
      pattern:
        /<script type="application\/ld\+json" data-site-structured-data="true">[\s\S]*?<\/script>/,
      replacement: `<script type="application/ld+json" data-site-structured-data="true">${escapeScriptJson(
        route.structuredDataJson
      )}</script>`,
    },
    {
      // The base index.html body is the template for every shell, including
      // "/": its <main class="route-fallback homepage-fallback"> element is
      // the anchor that each route-specific body replaces.
      pattern: /<main class="route-fallback homepage-fallback"[\s\S]*?<\/main>/,
      replacement: route.bodyHtml,
    },
  ].reduce(
    (html, update) => replaceTag(html, update.pattern, update.replacement),
    baseHtml
  );
};

const routeShellFromMetadata = (
  metadata: RouteMetadata,
  bodyHtml: string
): StaticRouteShell => ({
  path: metadata.path,
  title: metadata.title,
  description: metadata.description,
  canonicalPath: metadata.canonicalPath,
  structuredDataJson: getStructuredDataJson(metadata.path),
  bodyHtml,
});

const getRouteMetadata = (path: string) => {
  const metadata = routeMetadataByPath[path];

  if (!metadata) {
    throw new Error(`Missing route metadata for path: ${path}`);
  }

  return metadata;
};

const staticRouteShellPlugin = (): Plugin => {
  let outDir = "build";

  const primaryRoutes = primaryRouteShellPaths.map((path) => {
    const metadata = getRouteMetadata(path);
    return routeShellFromMetadata(metadata, renderPrimaryRouteBody(metadata));
  });

  const homeMeta = getRouteMetadata("/");
  const projectsMeta = getRouteMetadata("/projects");
  const caseStudiesIndexMeta = getRouteMetadata("/case-studies");
  const writingIndexMeta = getRouteMetadata("/writing");
  const routes: StaticRouteShell[] = [
    // "/" resolves to the build root, so this overwrites build/index.html.
    // closeBundle reads the base template before any shell is written.
    routeShellFromMetadata(homeMeta, renderHomeBody()),
    ...primaryRoutes,
    routeShellFromMetadata(projectsMeta, renderProjectsBody(projectsMeta)),
    routeShellFromMetadata(caseStudiesIndexMeta, renderCaseStudiesIndexBody()),
    ...caseStudiesData.map((caseStudy) => {
      const metadata = getRouteMetadata(`/case-studies/${caseStudy.slug}`);
      return routeShellFromMetadata(metadata, renderCaseStudyBody(caseStudy.slug));
    }),
    ...proceduralAnimationsData.map((piece) => {
      const metadata = getRouteMetadata(`/procedural-animations/${piece.slug}`);
      return routeShellFromMetadata(metadata, renderProceduralAnimationBody(piece));
    }),
    routeShellFromMetadata(writingIndexMeta, renderWritingIndexBody()),
    ...articlesData.map((article) => {
      const metadata = getRouteMetadata(`/writing/${article.slug}`);
      return routeShellFromMetadata(metadata, renderArticleBody(article.slug));
    }),
  ];

  return {
    name: "static-route-shells",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /<script type="application\/ld\+json" data-site-structured-data="true">[\s\S]*?<\/script>/,
        `<script type="application/ld+json" data-site-structured-data="true">${escapeScriptJson(
          getStructuredDataJson("/")
        )}</script>`
      );
    },
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const resolvedOutDir = resolve(process.cwd(), outDir);
      const baseHtml = await readFile(resolve(resolvedOutDir, "index.html"), "utf8");

      await Promise.all(
        routes.map(async (route) => {
          const routeDir = resolve(
            resolvedOutDir,
            route.path.replace(/^\/+/, "")
          );

          await mkdir(routeDir, { recursive: true });
          await writeFile(
            resolve(routeDir, "index.html"),
            applyRouteShell(baseHtml, route),
            "utf8"
          );
        })
      );

      await writeFile(resolve(resolvedOutDir, "sitemap.xml"), renderSitemap(), "utf8");
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const env = { ...fileEnv, ...process.env } as Record<string, string>;

  const devHost = resolveDevHost(env);
  const devPort = resolveDevPort(env);
  const tailscaleIp = command === "serve" ? resolveTailscaleIp(env) : undefined;

  const hmrHost = env.HMR_HOST?.trim() || env.VITE_HMR_HOST?.trim();
  const hmrClientPort = resolveOptionalPort(
    env.HMR_CLIENT_PORT?.trim() || env.VITE_HMR_CLIENT_PORT?.trim()
  );
  const allowedHosts = env.ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    define: {
      __BUILD_INFO__: JSON.stringify(resolveBuildInfo(env)),
    },
    plugins:
      command === "serve"
        ? [react(), devBannerPlugin(tailscaleIp, devPort)]
        : [react(), staticRouteShellPlugin()],
    server:
      command === "serve"
        ? {
            port: devPort,
            strictPort: true,
            host: devHost, // Allow external connections
            allowedHosts,
            open: true,
            hmr: {
              protocol: "ws",
              ...(hmrHost ? { host: hmrHost } : {}),
              ...(hmrClientPort ? { clientPort: hmrClientPort } : {}),
            },
            watch: {
              usePolling: true, // Use polling for Docker environments
            },
          }
        : undefined,
    build: {
      outDir: "build",
      sourcemap: false,
      chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
      rollupOptions: {
        output: {
          // Vite 8 (Rolldown) only accepts the function form of manualChunks.
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }
            if (id.includes("react-router")) {
              return "router-vendor";
            }
            if (id.includes("framer-motion")) {
              return "animation-vendor";
            }
            if (
              id.includes("react-icons") ||
              id.includes("@fortawesome/free-solid-svg-icons") ||
              id.includes("@fortawesome/react-fontawesome")
            ) {
              return "ui-vendor";
            }
            return undefined;
          },
        },
      },
      // Optimize dependencies
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "framer-motion"],
      exclude: ["three"], // Exclude unused Three.js
    },
  };
});
