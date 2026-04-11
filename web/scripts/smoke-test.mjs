import { readFile } from "node:fs/promises";
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

const main = async () => {
  const homepage = await readBuildFile("index.html");
  const caseStudiesIndex = await readBuildFile("case-studies/index.html");
  const erebusCaseStudy = await readBuildFile("case-studies/erebus/index.html");

  assertIncludes(homepage, '<div id="root"></div>', "homepage shell");
  assertIncludes(
    homepage,
    '<meta property="og:title" content="Kareem Sasa — Systems Engineer" />',
    "homepage metadata"
  );

  assertIncludes(
    caseStudiesIndex,
    "<title>Case Studies — Kareem Sasa</title>",
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
    "<title>Erebus OS Case Study — Kareem Sasa</title>",
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

  console.log("Smoke test passed.");
};

await main();
