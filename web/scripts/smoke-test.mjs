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
    "what-should-the-agent-have-to-figure-out",
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

  assertIncludes(projects, "Project Roster", "Projects route-shell roster framing");
  assertIncludes(
    projects,
    'id="projects-list-title"',
    "Projects route-shell roster list"
  );
  assertIncludes(
    projects,
    "Event-driven Linux coordination layer with replayable system state.",
    "Projects route-shell short description"
  );
  assertNotIncludes(projects, "Flagship", "Projects route-shell flagship framing");
  assertNotIncludes(projects, "Systems Archive", "Projects route-shell archive framing");

  const aetherSourceCodeEntry = projectsSourceCodeEntries.find((entry) =>
    String(entry["@id"]).endsWith("#aether")
  );

  if (
    !aetherSourceCodeEntry ||
    aetherSourceCodeEntry.description !==
      "Real-time audio infrastructure for Linux that publishes live acoustic state through lock-free shared memory for low-latency cross-process consumers."
  ) {
    throw new Error(
      "Expected projects JSON-LD SoftwareSourceCode to carry the full project description"
    );
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
    "What Should the Agent Have to Figure Out?",
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
    "what-should-the-agent-have-to-figure-out":
      "You have hidden an assumption in infrastructure.",
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
    "https://kareemsasa.dev/writing/what-should-the-agent-have-to-figure-out",
    "https://kareemsasa.dev/writing/the-work-the-agent-stopped-doing",
    "https://kareemsasa.dev/writing/the-system-gets-a-brake-one-way-or-another",
    "https://kareemsasa.dev/writing/bottlenecks-dont-disappear",
    "https://kareemsasa.dev/writing/the-machine-should-explain-itself",
  ]) {
    assertIncludes(sitemap, `<loc>${route}</loc>`, "sitemap writing routes");
  }

  // 5. Each article shell carries an Article node whose headline matches.
  const expectedHeadlines = {
    "what-should-the-agent-have-to-figure-out":
      "What Should the Agent Have to Figure Out?",
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

  // 7. Series affordance. The agent essays declare their reading order on the
  //    index and in each shell, with previous/next links that resolve to real
  //    article routes and a matching isPartOf/position in JSON-LD. Articles
  //    outside the series carry no series label.
  const SERIES_NAME = "Agent Systems";
  const seriesMembers = {
    "the-machine-should-explain-itself": {
      part: 1,
      previous: null,
      next: "the-work-the-agent-stopped-doing",
    },
    "the-work-the-agent-stopped-doing": {
      part: 2,
      previous: "the-machine-should-explain-itself",
      next: "what-should-the-agent-have-to-figure-out",
    },
    "what-should-the-agent-have-to-figure-out": {
      part: 3,
      previous: "the-work-the-agent-stopped-doing",
      next: null,
    },
  };
  const seriesTotal = Object.keys(seriesMembers).length;

  for (const slug of articleSlugs) {
    const html = articleShells[slug];
    const expected = seriesMembers[slug];

    if (!expected) {
      assertNotIncludes(html, SERIES_NAME, `${slug} series label`);
      continue;
    }

    assertIncludes(
      html,
      `Part ${expected.part} of ${seriesTotal} in ${SERIES_NAME}`,
      `${slug} series position`
    );

    const nav = html.match(
      /<nav class="route-fallback__series-nav"[\s\S]*?<\/nav>/
    );
    if (!nav) {
      throw new Error(`Expected ${slug} shell to include a series nav`);
    }

    for (const [label, target] of [
      ["Previous", expected.previous],
      ["Next", expected.next],
    ]) {
      const linked = target ? nav[0].includes(`href="/writing/${target}"`) : false;
      if (target && !linked) {
        throw new Error(
          `Expected ${slug} series nav to link ${label} to /writing/${target}`
        );
      }
      if (!target && nav[0].includes(`${label}:`)) {
        throw new Error(`Expected ${slug} series nav to have no ${label} link`);
      }
    }

    const [articleNode] = findNodesByType(structuredDataNodes(html), "Article");
    if (
      articleNode.isPartOf?.name !== SERIES_NAME ||
      articleNode.position !== expected.part
    ) {
      throw new Error(
        `Expected ${slug} Article JSON-LD to declare isPartOf ${JSON.stringify(SERIES_NAME)} at position ${expected.part}`
      );
    }
  }

  for (let part = 1; part <= seriesTotal; part += 1) {
    assertIncludes(
      writingIndex,
      `${SERIES_NAME} · Part ${part} of ${seriesTotal}`,
      "writing index series labels"
    );
  }

  // 8. Index ordering. The feed is newest-first, but a series is placed as one
  //    unit at its newest member's date and expanded in ascending part order,
  //    so the index never shows Part 3 above Part 1 and never repeats a member.
  const indexOrder = [
    ...writingIndex.matchAll(
      /class="route-fallback__card-link" href="\/writing\/([^"]+)"/g
    ),
  ].map((m) => m[1]);

  const expectedIndexOrder = [
    "the-machine-should-explain-itself",
    "the-work-the-agent-stopped-doing",
    "what-should-the-agent-have-to-figure-out",
    "the-system-gets-a-brake-one-way-or-another",
    "bottlenecks-dont-disappear",
  ];
  if (JSON.stringify(indexOrder) !== JSON.stringify(expectedIndexOrder)) {
    throw new Error(
      `Expected writing index order ${JSON.stringify(expectedIndexOrder)}, got ${JSON.stringify(indexOrder)}`
    );
  }

  if (new Set(indexOrder).size !== indexOrder.length) {
    throw new Error(`Writing index repeats an article: ${indexOrder.join(", ")}`);
  }

  const memberPositions = Object.keys(seriesMembers)
    .map((slug) => ({ slug, part: seriesMembers[slug].part, index: indexOrder.indexOf(slug) }))
    .sort((left, right) => left.index - right.index);
  memberPositions.forEach((member, offset) => {
    if (member.index === -1) {
      throw new Error(`Series member ${member.slug} is missing from the writing index`);
    }
    if (member.index !== memberPositions[0].index + offset) {
      throw new Error(`Series members are not contiguous on the writing index: ${JSON.stringify(memberPositions)}`);
    }
    if (member.part !== offset + 1) {
      throw new Error(`Series members are not in ascending part order on the writing index: ${JSON.stringify(memberPositions)}`);
    }
  });

  console.log("Smoke test passed.");
};

await main();
