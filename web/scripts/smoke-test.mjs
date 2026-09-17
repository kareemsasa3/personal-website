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
  const simulations = await readBuildFile("simulations/index.html");
  const snake = await readBuildFile("simulations/snake/index.html");
  const spider = await readBuildFile("simulations/spider/index.html");
  const terminal = await readBuildFile("terminal/index.html");
  const sitemap = await readBuildFile("sitemap.xml");
  const writingIndex = await readBuildFile("writing/index.html");
  const articleSlugs = [
    "the-work-the-agent-stopped-doing",
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
    { html: simulations, path: "/simulations" },
    { html: snake, path: "/simulations/snake" },
    { html: spider, path: "/simulations/spider" },
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
  assertBreadcrumb(structuredDataNodes(simulations), "/simulations", ["Home", "Simulations"]);
  assertBreadcrumb(structuredDataNodes(snake), "/simulations/snake", [
    "Home",
    "Simulations",
    "Snake",
  ]);
  assertBreadcrumb(structuredDataNodes(spider), "/simulations/spider", [
    "Home",
    "Simulations",
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

  // 1. The index lists every published article.
  for (const title of [
    "The Work the Agent Stopped Doing",
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
    "the-work-the-agent-stopped-doing":
      "The agent was doing less archaeology.",
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

  // 4. Sitemap covers the index and every article.
  for (const route of [
    "https://kareemsasa.dev/writing",
    "https://kareemsasa.dev/writing/the-work-the-agent-stopped-doing",
    "https://kareemsasa.dev/writing/the-system-gets-a-brake-one-way-or-another",
    "https://kareemsasa.dev/writing/bottlenecks-dont-disappear",
    "https://kareemsasa.dev/writing/the-machine-should-explain-itself",
  ]) {
    assertIncludes(sitemap, `<loc>${route}</loc>`, "sitemap writing routes");
  }

  // 5. Each article shell carries an Article node whose headline matches.
  const expectedHeadlines = {
    "the-work-the-agent-stopped-doing": "The Work the Agent Stopped Doing",
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

  console.log("Smoke test passed.");
};

await main();
