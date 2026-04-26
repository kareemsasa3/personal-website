import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const buildDir = resolve(projectRoot, "build");

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

const main = async () => {
  const homepage = await readBuildFile("index.html");
  const caseStudiesIndex = await readBuildFile("case-studies/index.html");
  const erebusCaseStudy = await readBuildFile("case-studies/erebus/index.html");
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

  const structuredData = parseStructuredData(homepage);
  const structuredDataTypes = structuredData
    .flatMap((entry) => entry["@graph"] ?? [entry])
    .map((entry) => entry["@type"]);

  for (const type of ["Person", "WebSite", "SoftwareSourceCode", "CreativeWork"]) {
    if (!structuredDataTypes.includes(type)) {
      throw new Error(`Expected JSON-LD graph to include ${type}`);
    }
  }

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
