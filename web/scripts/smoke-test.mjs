import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const buildDir = resolve(projectRoot, "build");
const siteUrl = "https://kareemsasa.dev";

const readBuildFile = async (relativePath) =>
  readFile(resolve(buildDir, relativePath), "utf8");

const assertIncludes = (haystack, needle, label) => {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(needle)}`);
  }
};

const assertNotIncludes = (haystack, needle, label) => {
  if (haystack.includes(needle)) {
    throw new Error(`Expected ${label} not to include ${JSON.stringify(needle)}`);
  }
};

const findFilesByExtension = async (directory, extension) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await findFilesByExtension(entryPath, extension)));
    } else if (entry.name.endsWith(extension)) {
      matches.push(entryPath);
    }
  }

  return matches;
};

const parseStructuredData = (html) => {
  const matches = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];

  if (matches.length === 0) {
    throw new Error("Expected homepage to include JSON-LD structured data");
  }

  return matches.map((match) => JSON.parse(match[1]));
};

const structuredDataNodes = (html) =>
  parseStructuredData(html).flatMap((entry) => entry["@graph"] ?? [entry]);

const nodeHasType = (node, type) => {
  const nodeType = node["@type"];
  return Array.isArray(nodeType) ? nodeType.includes(type) : nodeType === type;
};

const findNodeById = (nodes, id) => nodes.find((node) => node["@id"] === id);

const findNodesByType = (nodes, type) =>
  nodes.filter((node) => nodeHasType(node, type));

const assertNodeType = (nodes, type, label) => {
  if (findNodesByType(nodes, type).length === 0) {
    throw new Error(`Expected ${label} to include ${type}`);
  }
};

const assertWebPage = (nodes, canonicalPath) => {
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const webPage = findNodeById(nodes, `${canonicalUrl}#webpage`);

  if (!webPage || !nodeHasType(webPage, "WebPage")) {
    throw new Error(`Expected ${canonicalPath} JSON-LD to include WebPage`);
  }

  if (webPage.url !== canonicalUrl) {
    throw new Error(
      `Expected ${canonicalPath} WebPage url to equal ${canonicalUrl}`
    );
  }
};

const assertBreadcrumb = (nodes, canonicalPath, expectedNames) => {
  const breadcrumb = findNodeById(nodes, `${siteUrl}${canonicalPath}#breadcrumb`);

  if (!breadcrumb || !nodeHasType(breadcrumb, "BreadcrumbList")) {
    throw new Error(`Expected ${canonicalPath} JSON-LD to include BreadcrumbList`);
  }

  const actualNames = (breadcrumb.itemListElement ?? []).map((item) => item.name);

  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `Expected ${canonicalPath} breadcrumb ${JSON.stringify(
        expectedNames
      )}, got ${JSON.stringify(actualNames)}`
    );
  }
};

const main = async () => {
  const homepage = await readBuildFile("index.html");
  const projects = await readBuildFile("projects/index.html");
  const caseStudiesIndex = await readBuildFile("case-studies/index.html");
  const aetherCaseStudy = await readBuildFile("case-studies/aether/index.html");
  const arachneCaseStudy = await readBuildFile("case-studies/arachne/index.html");
  const erebusCaseStudy = await readBuildFile("case-studies/erebus/index.html");
  const experience = await readBuildFile("experience/index.html");
  const games = await readBuildFile("games/index.html");
  const snake = await readBuildFile("games/snake/index.html");
  const spider = await readBuildFile("games/spider/index.html");
  const terminal = await readBuildFile("terminal/index.html");
  const sitemap = await readBuildFile("sitemap.xml");

  assertIncludes(homepage, '<div id="root"></div>', "homepage shell");
  assertIncludes(
    homepage,
    '<meta property="og:title" content="Kareem Sasa - Systems Engineer" />',
    "homepage metadata"
  );
  assertIncludes(
    homepage,
    '<meta property="og:image" content="https://kareemsasa.dev/og-image.png" />',
    "active OG image metadata"
  );
  assertIncludes(
    homepage,
    '<meta property="og:image:type" content="image/png" />',
    "active OG image type metadata"
  );
  assertIncludes(
    homepage,
    '<meta property="og:image:width" content="1200" />',
    "active OG image width metadata"
  );
  assertIncludes(
    homepage,
    '<meta property="og:image:height" content="630" />',
    "active OG image height metadata"
  );
  assertIncludes(
    homepage,
    '<meta name="twitter:image" content="https://kareemsasa.dev/og-image.png" />',
    "active Twitter image metadata"
  );

  const homepageNodes = structuredDataNodes(homepage);
  assertNodeType(homepageNodes, "ProfilePage", "homepage JSON-LD graph");
  assertNodeType(homepageNodes, "Person", "homepage JSON-LD graph");
  assertNodeType(homepageNodes, "WebSite", "homepage JSON-LD graph");
  assertWebPage(homepageNodes, "/");

  if (findNodesByType(homepageNodes, "CreativeWork").length > 0) {
    throw new Error("Expected homepage JSON-LD not to include CreativeWork dump");
  }

  if (findNodesByType(homepageNodes, "SoftwareSourceCode").length > 0) {
    throw new Error(
      "Expected homepage JSON-LD not to include SoftwareSourceCode dump"
    );
  }

  const routeShells = [
    { html: projects, path: "/projects" },
    { html: caseStudiesIndex, path: "/case-studies" },
    { html: aetherCaseStudy, path: "/case-studies/aether" },
    { html: arachneCaseStudy, path: "/case-studies/arachne" },
    { html: erebusCaseStudy, path: "/case-studies/erebus" },
    { html: experience, path: "/experience" },
    { html: games, path: "/games" },
    { html: snake, path: "/games/snake" },
    { html: spider, path: "/games/spider" },
    { html: terminal, path: "/terminal" },
  ];

  for (const route of routeShells) {
    assertWebPage(structuredDataNodes(route.html), route.path);
  }

  assertBreadcrumb(structuredDataNodes(projects), "/projects", [
    "Home",
    "Projects",
  ]);
  assertBreadcrumb(structuredDataNodes(caseStudiesIndex), "/case-studies", [
    "Home",
    "Case Studies",
  ]);
  assertBreadcrumb(structuredDataNodes(erebusCaseStudy), "/case-studies/erebus", [
    "Home",
    "Case Studies",
    "Erebus OS",
  ]);
  assertBreadcrumb(structuredDataNodes(experience), "/experience", [
    "Home",
    "Experience",
  ]);
  assertBreadcrumb(structuredDataNodes(games), "/games", ["Home", "Games"]);
  assertBreadcrumb(structuredDataNodes(snake), "/games/snake", [
    "Home",
    "Games",
    "Snake",
  ]);
  assertBreadcrumb(structuredDataNodes(spider), "/games/spider", [
    "Home",
    "Games",
    "Spider Solitaire",
  ]);
  assertBreadcrumb(structuredDataNodes(terminal), "/terminal", [
    "Home",
    "Terminal",
  ]);

  const projectsSourceCodeEntries = findNodesByType(
    structuredDataNodes(projects),
    "SoftwareSourceCode"
  );

  if (projectsSourceCodeEntries.length === 0) {
    throw new Error("Expected projects JSON-LD to include public source entries");
  }

  for (const entry of projectsSourceCodeEntries) {
    if (
      typeof entry.codeRepository !== "string" ||
      !entry.codeRepository.startsWith("https://github.com/")
    ) {
      throw new Error(
        `Expected SoftwareSourceCode codeRepository to use a public GitHub URL, got ${entry.codeRepository}`
      );
    }

    if (entry.url !== entry.codeRepository) {
      throw new Error("Expected SoftwareSourceCode url to match codeRepository");
    }
  }

  for (const privateProjectId of ["erebus", "mnemosyne"]) {
    if (
      projectsSourceCodeEntries.some((entry) =>
        String(entry["@id"]).endsWith(`#${privateProjectId}`)
      )
    ) {
      throw new Error(
        `Expected projects JSON-LD not to include ${privateProjectId} SoftwareSourceCode`
      );
    }
  }

  const assertCaseStudySourceShape = (
    html,
    slug,
    expectedSourceRepository
  ) => {
    const nodes = structuredDataNodes(html);
    const creativeWorks = findNodesByType(nodes, "CreativeWork");
    const sourceCodeEntries = findNodesByType(nodes, "SoftwareSourceCode");

    if (creativeWorks.length !== 1) {
      throw new Error(
        `Expected ${slug} JSON-LD to include exactly one CreativeWork`
      );
    }

    if (expectedSourceRepository) {
      if (sourceCodeEntries.length !== 1) {
        throw new Error(
          `Expected ${slug} JSON-LD to include exactly one SoftwareSourceCode`
        );
      }

      if (sourceCodeEntries[0].codeRepository !== expectedSourceRepository) {
        throw new Error(
          `Expected ${slug} codeRepository to equal ${expectedSourceRepository}`
        );
      }
    } else if (sourceCodeEntries.length > 0) {
      throw new Error(`Expected ${slug} JSON-LD not to include SoftwareSourceCode`);
    }
  };

  assertCaseStudySourceShape(
    aetherCaseStudy,
    "aether",
    "https://github.com/kareemsasa3/aether"
  );
  assertCaseStudySourceShape(
    arachneCaseStudy,
    "arachne",
    "https://github.com/kareemsasa3/arachne"
  );
  assertCaseStudySourceShape(erebusCaseStudy, "erebus");

  assertIncludes(
    caseStudiesIndex,
    "<title>Case Studies - Kareem Sasa</title>",
    "case studies title"
  );
  assertIncludes(
    caseStudiesIndex,
    'href="https://kareemsasa.dev/case-studies"',
    "case studies canonical URL"
  );
  assertIncludes(
    caseStudiesIndex,
    'href="/case-studies/erebus"',
    "case studies route link"
  );

  assertIncludes(
    erebusCaseStudy,
    "<title>Erebus OS Case Study - Kareem Sasa</title>",
    "Erebus case study title"
  );
  assertIncludes(
    erebusCaseStudy,
    'href="https://kareemsasa.dev/case-studies/erebus"',
    "Erebus case study canonical URL"
  );
  assertIncludes(
    erebusCaseStudy,
    "Event-driven Linux coordination layer that records system context, infers higher-level state, and makes troubleshooting replayable.",
    "Erebus case study content"
  );

  for (const route of [
    "https://kareemsasa.dev/",
    "https://kareemsasa.dev/projects",
    "https://kareemsasa.dev/case-studies",
    "https://kareemsasa.dev/case-studies/erebus",
    "https://kareemsasa.dev/case-studies/arachne",
    "https://kareemsasa.dev/case-studies/aether",
    "https://kareemsasa.dev/experience",
  ]) {
    assertIncludes(sitemap, `<loc>${route}</loc>`, "sitemap canonical routes");
  }

  for (const disallowed of ["/work", "monitoring", "grafana", "admin", "/api", ".map"]) {
    assertNotIncludes(sitemap, disallowed, "sitemap private or non-canonical routes");
  }

  const sourceMaps = await findFilesByExtension(buildDir, ".map");
  if (sourceMaps.length > 0) {
    throw new Error(`Expected no build sourcemaps, found: ${sourceMaps.join(", ")}`);
  }

  console.log("Smoke test passed.");
};

await main();
