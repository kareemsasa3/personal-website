import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const buildDir = resolve(projectRoot, "build");
const siteUrl = "https://kareemsasa.dev";

// Run the independent physics suite using the existing TypeScript compiler.
execFileSync(process.execPath, ["--import", resolve(projectRoot, "scripts/orbital-test-loader.mjs"), resolve(projectRoot, "scripts/orbital.test.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, ["--import", resolve(projectRoot, "scripts/traffic-test-loader.mjs"), resolve(projectRoot, "scripts/traffic.test.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, ["--import", resolve(projectRoot, "scripts/route-metadata-test-loader.mjs"), resolve(projectRoot, "scripts/route-metadata.test.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, ["--import", resolve(projectRoot, "scripts/route-metadata-test-loader.mjs"), resolve(projectRoot, "scripts/scroll-progress.test.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, ["--import", resolve(projectRoot, "scripts/route-metadata-test-loader.mjs"), resolve(projectRoot, "scripts/simulation-routes.test.mjs")], { stdio: "inherit" });

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

// Production nginx 301s /path to the shell's directory URL /path/, so that is the canonical
// URL. JSON-LD @id values are identifiers, not links, and keep the bare path.
const canonicalUrlFor = (canonicalPath) =>
  `${siteUrl}${canonicalPath === "/" ? "/" : `${canonicalPath}/`}`;

const assertWebPage = (nodes, canonicalPath) => {
  const canonicalUrl = canonicalUrlFor(canonicalPath);
  const webPage = findNodeById(nodes, `${siteUrl}${canonicalPath}#webpage`);

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

  for (const { item } of breadcrumb.itemListElement ?? []) {
    if (!item.startsWith(`${siteUrl}/`) || !item.endsWith("/")) {
      throw new Error(`Expected ${canonicalPath} breadcrumb item ${item} to be a canonical URL`);
    }
  }

  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `Expected ${canonicalPath} breadcrumb ${JSON.stringify(
        expectedNames
      )}, got ${JSON.stringify(actualNames)}`
    );
  }
};

// The production CSP allows inline scripts only by hash. Every executable inline
// script in the build must be listed in the nginx policy's script-src, and every
// listed hash must belong to one, so editing an inline script cannot silently
// fall out of the policy.
const checkContentSecurityPolicy = async () => {
  const nginxConf = await readFile(
    resolve(projectRoot, "../infrastructure/nginx/conf.d/default.conf"),
    "utf8"
  );
  const headers = [...nginxConf.matchAll(/add_header\s+(Content-Security-Policy(?:-Report-Only)?)\s+"([^"]+)"/g)];
  if (headers.length !== 1) {
    throw new Error(`Expected one Content-Security-Policy header in nginx config, found ${headers.length}`);
  }
  const policy = headers[0][2];
  const scriptSrc = policy.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src "));
  if (!scriptSrc) throw new Error("CSP has no script-src directive");
  if (/'unsafe-(inline|eval)'/.test(scriptSrc)) {
    throw new Error(`CSP script-src must not allow unsafe-inline or unsafe-eval: ${scriptSrc}`);
  }
  // A nonce is only safe if it changes per response, so it must be nginx's $request_id.
  for (const nonce of scriptSrc.match(/'nonce-[^']*'/g) ?? []) {
    if (nonce !== "'nonce-$request_id'") {
      throw new Error(`CSP nonce must be the per-request 'nonce-$request_id', found ${nonce}`);
    }
  }
  const allowed = new Set(scriptSrc.match(/'sha256-[A-Za-z0-9+/=]+'/g)?.map((h) => h.slice(1, -1)) ?? []);

  const executable = /^(?:|text\/javascript|application\/javascript|module)$/i;
  const found = new Map();
  for (const file of await findFilesByExtension(buildDir, ".html")) {
    const html = await readFile(file, "utf8");
    for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/i.test(attributes)) continue;
      const type = attributes.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? "";
      if (!executable.test(type)) continue;
      const hash = `sha256-${createHash("sha256").update(body, "utf8").digest("base64")}`;
      if (!found.has(hash)) found.set(hash, file.replace(`${buildDir}/`, ""));
    }
  }

  const missing = [...found].filter(([hash]) => !allowed.has(hash));
  if (missing.length) {
    throw new Error(
      `Inline scripts missing from the CSP script-src in infrastructure/nginx/conf.d/default.conf: ${missing
        .map(([hash, file]) => `'${hash}' (${file})`)
        .join(", ")}`
    );
  }
  const stale = [...allowed].filter((hash) => !found.has(hash));
  if (stale.length) {
    throw new Error(`CSP script-src lists hashes no built inline script has: ${stale.join(", ")}`);
  }
};

// Every local <script src> in a built page must resolve to a non-empty file in the
// build. A missing file is served as the SPA's index.html, which the browser refuses
// to run. This happened in production when a .gitignore rule kept a vendored script
// out of the commit while it still existed in the local working tree.
const checkLocalScriptReferences = async () => {
  const missing = [];
  let checked = 0;
  for (const file of await findFilesByExtension(buildDir, ".html")) {
    const html = await readFile(file, "utf8");
    for (const [, attributes] of html.matchAll(/<script\b([^>]*)>/gi)) {
      const src = attributes.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
      if (!src) continue;
      const value = (src[1] ?? src[2] ?? src[3]).trim();
      // Skip URLs with a scheme (https:, data:, blob:) and protocol-relative URLs.
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) continue;
      const path = value.split(/[?#]/)[0];
      const target = path.startsWith("/") ? resolve(buildDir, `.${path}`) : resolve(dirname(file), path);
      checked += 1;
      const size = target.startsWith(`${buildDir}${sep}`)
        ? await stat(target).then((s) => (s.isFile() ? s.size : 0), () => 0)
        : 0;
      if (size === 0) missing.push(`${value} (in ${file.replace(`${buildDir}/`, "")})`);
    }
  }
  if (checked === 0) {
    throw new Error("Found no local <script src> in any built page; the script reference check read nothing");
  }
  if (missing.length) {
    throw new Error(`Built pages reference local scripts that are missing or empty in the build: ${missing.join(", ")}`);
  }
};

const main = async () => {
  const homepage = await readBuildFile("index.html");
  const projects = await readBuildFile("projects/index.html");
  const caseStudiesIndex = await readBuildFile("case-studies/index.html");
  const aetherCaseStudy = await readBuildFile("case-studies/aether/index.html");
  const arachneCaseStudy = await readBuildFile("case-studies/arachne/index.html");
  const erebusCaseStudy = await readBuildFile("case-studies/erebus/index.html");
  const specificationCaseStudy = await readBuildFile("case-studies/where-the-specification-lived/index.html");
  const experience = await readBuildFile("experience/index.html");
  const simulations = await readBuildFile("simulations/index.html");
  const orbital = await readBuildFile("simulations/orbital-simulator/index.html");
  assertIncludes(orbital, "Orbital Simulator", "orbital route shell");
  assertIncludes(orbital, 'href="https://kareemsasa.dev/simulations/orbital-simulator/"', "orbital canonical URL");
  assertIncludes(simulations, 'href="/simulations/orbital-simulator"', "simulations launch link");
  const traffic = await readBuildFile("simulations/traffic-simulator/index.html");
  assertIncludes(traffic, "Traffic Simulator", "traffic route shell");
  assertIncludes(traffic, 'href="https://kareemsasa.dev/simulations/traffic-simulator/"', "traffic canonical URL");
  assertIncludes(simulations, 'href="/simulations/traffic-simulator"', "simulations traffic launch link");
  const snake = await readBuildFile("simulations/snake/index.html");
  const spider = await readBuildFile("simulations/spider/index.html");
  const proceduralAnimations = await readBuildFile("procedural-animations/index.html");
  assertIncludes(proceduralAnimations, "Procedural Animations", "procedural animations route shell");
  assertIncludes(proceduralAnimations, 'href="https://kareemsasa.dev/procedural-animations/"', "procedural animations canonical URL");
  const terminal = await readBuildFile("terminal/index.html");
  const sitemap = await readBuildFile("sitemap.xml");
  const writingIndex = await readBuildFile("writing/index.html");
  const articleSlugs = [
    "what-should-still-be-hard",
    "presence-is-not-a-control",
    "the-centaur-era",
    "what-the-second-agent-is-for",
    "normal-is-not-inevitable",
    "when-programming-became-the-smaller-part",
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

  // Web manifest and theme-color (Darkfield Phase 4 Task 3): every shell carries both tags from the base
  // template, and the build ships the manifest and the three app icons it names.
  for (const [label, html] of [
    ["homepage", homepage],
    ["article shell", articleShells["the-machine-should-explain-itself"]],
  ]) {
    assertIncludes(html, '<link rel="manifest" href="/manifest.webmanifest" />', `${label} manifest link`);
    assertIncludes(html, '<meta name="theme-color" content="', `${label} theme-color`);
  }
  const manifest = JSON.parse(await readBuildFile("manifest.webmanifest"));
  for (const icon of manifest.icons) await readBuildFile(icon.src.slice(1));
  for (const path of ["icon-192.png", "icon-512.png", "icon-512-maskable.png"]) {
    if (!manifest.icons.some((icon) => icon.src === `/${path}`)) {
      throw new Error(`Expected the manifest to name /${path}`);
    }
    await readBuildFile(path);
  }

  // Homepage static shell. Without JavaScript the root must still say who the
  // site belongs to, name the featured systems, and link to the primary
  // destinations and public contact channels the hydrated homepage exposes.
  const homepagePositioning =
    "Systems engineer building production software for Linux, backend, and infrastructure-heavy products.";
  assertIncludes(homepage, homepagePositioning, "homepage shell positioning");
  assertIncludes(homepage, "Featured Systems", "homepage shell featured section");
  assertNotIncludes(homepage, 'aria-label="Loading site"', "homepage shell aria-label");

  for (const [title, href] of [
    ["Erebus", "/case-studies/erebus"],
    ["Arachne", "/case-studies/arachne"],
  ]) {
    assertIncludes(homepage, `<h3>${title}</h3>`, "homepage shell featured system title");
    assertIncludes(homepage, `href="${href}"`, "homepage shell featured system link");
  }

  for (const href of ["/projects", "/case-studies", "/writing", "/experience"]) {
    assertIncludes(homepage, `href="${href}"`, "homepage shell primary destination");
  }

  for (const href of [
    "https://github.com/kareemsasa",
    "https://linkedin.com/in/kareem-sasa",
    "mailto:kareemsasa.dev@proton.me",
  ]) {
    assertIncludes(homepage, `href="${href}"`, "homepage shell contact link");
  }

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
    { html: specificationCaseStudy, path: "/case-studies/where-the-specification-lived" },
    { html: experience, path: "/experience" },
    { html: simulations, path: "/simulations" },
    { html: orbital, path: "/simulations/orbital-simulator" },
    { html: traffic, path: "/simulations/traffic-simulator" },
    { html: snake, path: "/simulations/snake" },
    { html: spider, path: "/simulations/spider" },
    { html: proceduralAnimations, path: "/procedural-animations" },
    { html: terminal, path: "/terminal" },
  ];

  for (const route of routeShells) {
    assertWebPage(structuredDataNodes(route.html), route.path);
  }

  // Every route shell is stamped from the base index template, so the
  // homepage body must not leak into route-specific shells.
  for (const route of [
    ...routeShells,
    { html: writingIndex, path: "/writing" },
    {
      html: articleShells["the-machine-should-explain-itself"],
      path: "/writing/the-machine-should-explain-itself",
    },
  ]) {
    assertNotIncludes(route.html, homepagePositioning, `${route.path} shell body`);
    assertNotIncludes(route.html, "Featured Systems", `${route.path} shell body`);
    assertNotIncludes(route.html, 'class="homepage-fallback', `${route.path} shell body`);
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
    "Erebus",
  ]);
  assertBreadcrumb(
    structuredDataNodes(specificationCaseStudy),
    "/case-studies/where-the-specification-lived",
    ["Home", "Case Studies", "Where the Specification Lived"]
  );
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
  assertBreadcrumb(structuredDataNodes(proceduralAnimations), "/procedural-animations", [
    "Home",
    "Procedural Animations",
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
      "Linux audio-analysis daemon that publishes live frequency-band state through a sequence-versioned shared-memory region for independent local consumers."
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
  assertCaseStudySourceShape(specificationCaseStudy, "where-the-specification-lived");

  // The experiment case study: its shell carries the argument, both exact prompts,
  // and links to the live simulator; the simulator links back; its media ships.
  assertIncludes(
    specificationCaseStudy,
    "<title>Where the Specification Lived Case Study - Kareem Sasa</title>",
    "specification case study title"
  );
  assertIncludes(
    specificationCaseStudy,
    'href="https://kareemsasa.dev/case-studies/where-the-specification-lived/"',
    "specification case study canonical URL"
  );
  for (const text of [
    "Experiment Case Study",
    "Where specification can live",
    "Inspect the repository and existing site/simulations, then implement it completely and verify your work.",
    "Prefer a small coherent model with understandable behavior over superficial complexity.",
    "What changed before publication",
    "Limitations",
  ]) {
    assertIncludes(specificationCaseStudy, text, "specification case study content");
  }
  assertIncludes(specificationCaseStudy, 'href="/simulations/traffic-simulator"', "case study links to the simulator");
  assertIncludes(traffic, 'href="/case-studies/where-the-specification-lived"', "simulator links to the case study");
  assertIncludes(caseStudiesIndex, 'href="/case-studies/where-the-specification-lived"', "case studies index lists the experiment");
  const mediaPaths = [...specificationCaseStudy.matchAll(/href="(\/media\/[^"]+)"/g)].map((match) => match[1]);
  if (mediaPaths.length < 6) {
    throw new Error(`Expected the specification case study shell to link its media, found ${mediaPaths.length}`);
  }
  for (const path of mediaPaths) await readBuildFile(path.slice(1));

  assertIncludes(
    caseStudiesIndex,
    "<title>Case Studies - Kareem Sasa</title>",
    "case studies title"
  );
  assertIncludes(
    caseStudiesIndex,
    'href="https://kareemsasa.dev/case-studies/"',
    "case studies canonical URL"
  );
  assertIncludes(
    caseStudiesIndex,
    'href="/case-studies/erebus"',
    "case studies route link"
  );

  assertIncludes(
    erebusCaseStudy,
    "<title>Erebus Case Study - Kareem Sasa</title>",
    "Erebus case study title"
  );
  assertIncludes(
    erebusCaseStudy,
    'href="https://kareemsasa.dev/case-studies/erebus/"',
    "Erebus case study canonical URL"
  );
  assertIncludes(
    erebusCaseStudy,
    "Event-driven Linux coordination layer that records system context, infers higher-level state, and makes troubleshooting replayable.",
    "Erebus case study content"
  );

  for (const route of [
    "https://kareemsasa.dev/",
    "https://kareemsasa.dev/projects/",
    "https://kareemsasa.dev/case-studies/",
    "https://kareemsasa.dev/case-studies/erebus/",
    "https://kareemsasa.dev/case-studies/arachne/",
    "https://kareemsasa.dev/case-studies/aether/",
    "https://kareemsasa.dev/case-studies/where-the-specification-lived/",
    "https://kareemsasa.dev/experience/",
    "https://kareemsasa.dev/simulations/orbital-simulator/",
    "https://kareemsasa.dev/simulations/traffic-simulator/",
    "https://kareemsasa.dev/procedural-animations/",
  ]) {
    assertIncludes(sitemap, `<loc>${route}</loc>`, "sitemap canonical routes");
  }

  for (const disallowed of ["/work", "monitoring", "grafana", "admin", "/api", ".map"]) {
    assertNotIncludes(sitemap, disallowed, "sitemap private or non-canonical routes");
  }

  // Every sitemap entry is a URL production serves without a redirect, and it is the URL
  // that page's canonical, og:url and WebPage url declare.
  const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (sitemapLocs.length === 0) throw new Error("Expected sitemap entries");
  for (const loc of sitemapLocs) {
    const { pathname } = new URL(loc);
    if (!pathname.endsWith("/")) {
      throw new Error(`Expected sitemap entry ${loc} to end with a slash`);
    }
    const shell = await readBuildFile(`${pathname.slice(1)}index.html`);
    assertIncludes(shell, `<link rel="canonical" href="${loc}" />`, `${pathname} canonical`);
    assertIncludes(shell, `<meta property="og:url" content="${loc}" />`, `${pathname} og:url`);
    const webPages = findNodesByType(structuredDataNodes(shell), "WebPage");
    if (webPages.length !== 1 || webPages[0].url !== loc) {
      throw new Error(`Expected ${pathname} WebPage url to equal ${loc}`);
    }
  }

  // Each procedural animation has a canonical, indexable route shell; the raw artifact it
  // frames is a noindex resource with no third-party requests.
  const proceduralAnimationPieces = [
    ["mechanical-time", "Mechanical Time"],
    ["descent", "DESCENT"],
    ["observing", "Observing"],
    ["one-quiet-day", "One Quiet Day"],
    ["anastasis", "ANASTASIS"],
  ];
  for (const [slug, title] of proceduralAnimationPieces) {
    const path = `/procedural-animations/${slug}`;
    const shell = await readBuildFile(`procedural-animations/${slug}/index.html`);
    assertIncludes(shell, `<title>${title} - Kareem Sasa</title>`, `${path} shell title`);
    assertIncludes(shell, `href="${siteUrl}${path}/"`, `${path} canonical URL`);
    assertNotIncludes(shell, "noindex", `${path} shell`);
    assertNotIncludes(shell, 'class="homepage-fallback', `${path} shell body`);
    assertWebPage(structuredDataNodes(shell), path);
    assertBreadcrumb(structuredDataNodes(shell), path, ["Home", "Procedural Animations", title]);
    assertIncludes(proceduralAnimations, `href="${path}"`, "procedural animations index links to each piece");
    assertIncludes(sitemap, `<loc>${siteUrl}${path}/</loc>`, "sitemap procedural animation routes");
    assertNotIncludes(sitemap, `${path}/piece.html`, "sitemap raw artifacts");

    const artifact = await readBuildFile(`procedural-animations/${slug}/piece.html`);
    assertIncludes(artifact, '<meta name="robots" content="noindex, nofollow">', `${path}/piece.html robots`);
    if (/https?:\/\//.test(artifact)) {
      throw new Error(`Expected ${path}/piece.html to make no third-party requests`);
    }
  }

  const sourceMaps = await findFilesByExtension(buildDir, ".map");
  if (sourceMaps.length > 0) {
    throw new Error(`Expected no build sourcemaps, found: ${sourceMaps.join(", ")}`);
  }

  // The resolved build commit (CI BUILD_SHA, else the local checkout) must be
  // baked into the bundle for Settings > About.
  let expectedBuildSha = process.env.BUILD_SHA?.trim().toLowerCase();
  if (!expectedBuildSha) {
    try {
      expectedBuildSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      expectedBuildSha = undefined;
    }
  }
  if (expectedBuildSha) {
    const bundles = await Promise.all((await findFilesByExtension(buildDir, ".js")).map((file) => readFile(file, "utf8")));
    if (!bundles.some((bundle) => bundle.includes(expectedBuildSha))) {
      throw new Error(`Expected the build bundle to include commit ${expectedBuildSha}`);
    }
  }

  // 1. The index lists every published article.
  for (const title of [
    "What Should Still Be Hard",
    "Presence Is Not a Control",
    "The Centaur Era: Half Human, Half Machine",
    "What the Second Agent Is For",
    "Normal Is Not Inevitable",
    "When Programming Became the Smaller Part",
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
    "what-should-still-be-hard":
      "A preference is not a verdict.",
    "presence-is-not-a-control":
      "The reviewer is looking at a map drawn by the agent that traversed the territory.",
    "the-centaur-era":
      "Collaboration was itself a skill.",
    "what-the-second-agent-is-for":
      "The phrase is doing too much work.",
    "normal-is-not-inevitable":
      "Both are, as complete answers, false.",
    "when-programming-became-the-smaller-part":
      "My degree emphasized software engineering and cybersecurity.",
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
    "https://kareemsasa.dev/writing/",
    "https://kareemsasa.dev/writing/what-should-still-be-hard/",
    "https://kareemsasa.dev/writing/presence-is-not-a-control/",
    "https://kareemsasa.dev/writing/the-centaur-era/",
    "https://kareemsasa.dev/writing/what-the-second-agent-is-for/",
    "https://kareemsasa.dev/writing/normal-is-not-inevitable/",
    "https://kareemsasa.dev/writing/when-programming-became-the-smaller-part/",
    "https://kareemsasa.dev/writing/what-should-the-agent-have-to-figure-out/",
    "https://kareemsasa.dev/writing/the-work-the-agent-stopped-doing/",
    "https://kareemsasa.dev/writing/the-system-gets-a-brake-one-way-or-another/",
    "https://kareemsasa.dev/writing/bottlenecks-dont-disappear/",
    "https://kareemsasa.dev/writing/the-machine-should-explain-itself/",
  ]) {
    assertIncludes(sitemap, `<loc>${route}</loc>`, "sitemap writing routes");
  }

  // 5. Each article shell carries an Article node whose headline matches.
  const expectedHeadlines = {
    "what-should-still-be-hard": "What Should Still Be Hard",
    "presence-is-not-a-control": "Presence Is Not a Control",
    "the-centaur-era": "The Centaur Era: Half Human, Half Machine",
    "what-the-second-agent-is-for": "What the Second Agent Is For",
    "normal-is-not-inevitable": "Normal Is Not Inevitable",
    "when-programming-became-the-smaller-part": "When Programming Became the Smaller Part",
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
  //    whose anchors miss their targets is a silently broken control. An
  //    article with no body sections has no TOC entries and renders no nav.
  const articlesWithoutToc = new Set([
    "what-should-still-be-hard",
    "when-programming-became-the-smaller-part",
  ]);
  for (const slug of articleSlugs) {
    const html = articleShells[slug];
    const toc = html.match(
      /<nav class="route-fallback__toc"[\s\S]*?<\/nav>/
    );

    if (articlesWithoutToc.has(slug)) {
      if (toc) {
        throw new Error(`Expected ${slug} shell to have no contents nav`);
      }
      continue;
    }

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
      next: "the-centaur-era",
    },
    "the-centaur-era": {
      part: 4,
      previous: "what-should-the-agent-have-to-figure-out",
      next: "what-the-second-agent-is-for",
    },
    "what-the-second-agent-is-for": {
      part: 5,
      previous: "the-centaur-era",
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
    "what-should-still-be-hard",
    "presence-is-not-a-control",
    "the-machine-should-explain-itself",
    "the-work-the-agent-stopped-doing",
    "what-should-the-agent-have-to-figure-out",
    "the-centaur-era",
    "what-the-second-agent-is-for",
    "normal-is-not-inevitable",
    "when-programming-became-the-smaller-part",
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

  await checkContentSecurityPolicy();
  await checkLocalScriptReferences();

  // RFC 9116: Contact and Expires are required, and an expired file is invalid.
  const securityTxt = await readBuildFile(".well-known/security.txt");
  assertIncludes(securityTxt, "Contact: mailto:", "security.txt contact");
  assertIncludes(securityTxt, "Canonical: https://kareemsasa.dev/.well-known/security.txt", "security.txt canonical");
  const expires = securityTxt.match(/^Expires: (\S+)$/m)?.[1];
  if (!expires || Number.isNaN(Date.parse(expires))) {
    throw new Error("security.txt needs an RFC 3339 Expires line");
  }
  if (Date.parse(expires) <= Date.now()) {
    throw new Error(`security.txt expired on ${expires}; set a new Expires date within the next year`);
  }

  console.log("Smoke test passed.");
};

await main();
