import { defineConfig, loadEnv } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import * as os from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { caseStudiesData } from "./src/data/caseStudies";
import {
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_URL,
  SITE_URL,
  type RouteMetadata,
  routeMetadataByPath,
  sitemapRouteMetadata,
} from "./src/data/routeMetadata";
import { getStructuredDataJson } from "./src/data/structuredData";

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
  "/projects",
  "/experience",
  "/journey",
  "/games",
  "/games/snake",
  "/games/spider",
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
  "/projects": {
    eyebrow: "Portfolio Systems",
    heading: "Projects",
    highlights: [
      "Flagship engineering systems across Linux infrastructure, research workflows, and product interfaces.",
      "Public project entries link to available repositories and case-study proof paths where applicable.",
    ],
    links: [{ label: "Read case studies", href: "/case-studies" }],
  },
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
  "/games": {
    eyebrow: "Interactive Experiments",
    heading: "Games & Experiments",
    highlights: [
      "Browser games and interactive frontend experiments outside the main portfolio proof path.",
      "Known game routes include Snake and Spider Solitaire.",
    ],
    links: [
      { label: "Open Snake", href: "/games/snake" },
      { label: "Open Spider Solitaire", href: "/games/spider" },
    ],
  },
  "/games/snake": {
    eyebrow: "Browser Game",
    heading: "Snake Game",
    highlights: [
      "A browser-based Snake implementation from the games and experiments section.",
      "The interactive game loads through the React application when JavaScript is available.",
    ],
    links: [{ label: "Back to games", href: "/games" }],
  },
  "/games/spider": {
    eyebrow: "Browser Game",
    heading: "Spider Solitaire",
    highlights: [
      "A browser-based Spider Solitaire implementation from the games and experiments section.",
      "The interactive card game loads through the React application when JavaScript is available.",
    ],
    links: [{ label: "Back to games", href: "/games" }],
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
      <p class="route-fallback__eyebrow">Engineering Case Study</p>
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
        <h2>Problem</h2>
        <p>${escapeHtml(caseStudy.problem)}</p>
      </section>

      <section class="route-fallback__section">
        <h2>Constraints</h2>
        <div class="route-fallback__grid">
          <article class="route-fallback__card">
            <h3>Technical Limitations</h3>
            <p>${escapeHtml(caseStudy.constraints.technicalLimitations)}</p>
          </article>
          <article class="route-fallback__card">
            <h3>Environment</h3>
            <p>${escapeHtml(caseStudy.constraints.environment)}</p>
          </article>
          <article class="route-fallback__card">
            <h3>Tradeoffs</h3>
            <p>${escapeHtml(caseStudy.constraints.tradeoffs)}</p>
          </article>
        </div>
      </section>

      <section class="route-fallback__section">
        <h2>Architecture</h2>
        ${renderList(caseStudy.architecture)}
      </section>

      <section class="route-fallback__section">
        <h2>Key Technical Decisions</h2>
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
      </section>

      <section class="route-fallback__section">
        <h2>Implementation Highlights</h2>
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
      </section>

      <section class="route-fallback__section">
        <h2>Outcome</h2>
        ${renderList(caseStudy.outcome)}
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

  const caseStudiesIndexMeta = getRouteMetadata("/case-studies");
  const routes: StaticRouteShell[] = [
    ...primaryRoutes,
    routeShellFromMetadata(caseStudiesIndexMeta, renderCaseStudiesIndexBody()),
    ...caseStudiesData.map((caseStudy) => {
      const metadata = getRouteMetadata(`/case-studies/${caseStudy.slug}`);
      return routeShellFromMetadata(metadata, renderCaseStudyBody(caseStudy.slug));
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

  return {
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
          manualChunks: {
            // Vendor chunks
            "router-vendor": ["react-router-dom"],
            "animation-vendor": ["framer-motion"],
            "ui-vendor": [
              "react-icons",
              "@fortawesome/free-solid-svg-icons",
              "@fortawesome/react-fontawesome",
            ],
            "syntax-vendor": ["prismjs"],
            // Note: add a utils chunk here only when needed to avoid empty chunks
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
