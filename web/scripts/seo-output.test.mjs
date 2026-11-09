// Integration checks against production HTML, run by the existing smoke command.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SITE_URL,
  getCanonicalUrl,
  routeMetadata,
  sitemapRouteMetadata,
} from "../src/data/routeMetadata.ts";
import { simulationsData } from "../src/data/simulationsData.ts";
import { caseStudiesData } from "../src/data/caseStudies.ts";

const buildDir = resolve(import.meta.dirname, "../build");
const shellPath = (path) => `${path.replace(/^\//, "")}index.html`;
const readBuild = (path) => readFile(resolve(buildDir, path), "utf8");
const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const shells = new Map(await Promise.all(routeMetadata.map(async (metadata) => [
  metadata.path,
  await readBuild(shellPath(metadata.path === "/" ? "/" : `${metadata.path}/`)),
])));
const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
  .map((match) => new URL(decode(match[1]), SITE_URL))
  .filter((url) => url.origin === SITE_URL)
  .map((url) => url.pathname.replace(/\/+$/, "") || "/");

test("every public route shell has consistent, unique metadata and one primary heading", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const metadata of routeMetadata) {
    const html = shells.get(metadata.path);
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
    const canonical = getCanonicalUrl(metadata.canonicalPath);
    const singleValue = (pattern, expected) => {
      const matches = [...head.matchAll(pattern)];
      assert.equal(matches.length, 1, `${metadata.path}: ${pattern}`);
      assert.equal(decode(matches[0][1]), expected, metadata.path);
    };
    singleValue(/<title>([^<]+)<\/title>/g, metadata.title);
    singleValue(/<meta name="description" content="([^"]+)"/g, metadata.description);
    singleValue(/<link rel="canonical" href="([^"]+)"/g, canonical);
    singleValue(/<meta property="og:url" content="([^"]+)"/g, canonical);
    for (const [attribute, name] of [["property", "og"], ["name", "twitter"]]) {
      singleValue(new RegExp(`<meta ${attribute}="${name}:title" content="([^"]+)"`, "g"), metadata.title);
      singleValue(new RegExp(`<meta ${attribute}="${name}:description" content="([^"]+)"`, "g"), metadata.description);
    }
    assert.doesNotMatch(head, /<meta[^>]+(?:noindex|nofollow)/i, metadata.path);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, metadata.path);
    const graph = JSON.parse(head.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1])["@graph"];
    const webpage = graph.filter((entry) => [].concat(entry["@type"]).includes("WebPage"));
    assert.equal(webpage.length, 1, metadata.path);
    assert.equal(webpage[0].url, canonical, metadata.path);
    assert.equal(webpage[0].name, metadata.title, metadata.path);
    assert.equal(webpage[0].description, metadata.description, metadata.path);
    // Canonical aliases deliberately share the destination's search metadata.
    if (metadata.path === metadata.canonicalPath) {
      assert.ok(!titles.has(metadata.title), `Duplicate title: ${metadata.path}`);
      assert.ok(!descriptions.has(metadata.description), `Duplicate description: ${metadata.path}`);
      titles.add(metadata.title);
      descriptions.add(metadata.description);
    }
  }
});

test("the generated sitemap contains exactly the indexable canonical routes", async () => {
  const sitemap = await readBuild("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(urls).size, urls.length, "No duplicate sitemap entries");
  assert.deepEqual(urls.sort(), sitemapRouteMetadata.map((metadata) => getCanonicalUrl(metadata.canonicalPath)).sort());
  assert.ok(!urls.includes(`${SITE_URL}/work/`), "Alias stays out of sitemap");
  assert.ok(urls.includes(`${SITE_URL}/simulations/annals/`));
});

test("every sitemap page can be discovered from homepage HTML without JavaScript", () => {
  const visited = new Set();
  const pending = ["/"];
  while (pending.length) {
    const path = pending.shift();
    if (visited.has(path)) continue;
    visited.add(path);
    if (shells.has(path)) pending.push(...links(shells.get(path)).filter((link) => shells.has(link)));
  }
  for (const metadata of sitemapRouteMetadata) {
    assert.ok(visited.has(metadata.path), `Not reachable: ${metadata.path}`);
  }
  const simulationLinks = links(shells.get("/simulations"));
  for (const simulation of simulationsData.filter((entry) => entry.isAvailable)) {
    assert.ok(simulationLinks.includes(simulation.path), `Missing launch link: ${simulation.title}`);
  }
});

test("engineering search titles preserve the authored case-study headings and summaries", () => {
  for (const study of caseStudiesData) {
    const html = shells.get(`/case-studies/${study.slug}`);
    assert.equal(decode(html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1]), study.title);
    assert.ok(decode(html).includes(study.shortDescription), study.slug);
  }
});
