// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/route-metadata-browser-test.mjs [base URL] [Playwright module] [browser executable]
//
// Production nginx redirects /path to /path/ and serves the route's static shell, which
// already carries the right title and canonical. This loads each route as production
// serves it, lets the app hydrate, and checks the client kept the shell's metadata
// instead of replacing it with the homepage's. Run it against a production build
// (`npm run build && npm run preview`) or a deployed site.
import assert from "node:assert/strict";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");

const routes = [
  "/",
  "/projects",
  "/experience",
  "/case-studies",
  "/case-studies/where-the-specification-lived",
  "/case-studies/aether",
  "/simulations",
  "/simulations/traffic-simulator",
  "/writing/what-the-second-agent-is-for",
  "/terminal",
];

const shellMetadata = (html) => ({
  title: html.match(/<title>([^<]*)<\/title>/)?.[1],
  canonical: html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],
  ogUrl: html.match(/<meta property="og:url" content="([^"]+)"/)?.[1],
  description: html.match(/<meta name="description" content="([^"]+)"/)?.[1],
});

const decode = (value) =>
  value?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const failures = [];
const context = await browser.newContext();
context.setDefaultTimeout(15000);
const page = await context.newPage();

for (const route of routes) {
  const slashed = route === "/" ? "/" : `${route}/`;
  const response = await context.request.get(`${base}${slashed}`);
  assert.equal(response.status(), 200, `${slashed}: static shell`);
  const shell = shellMetadata(await response.text());
  const expected = Object.fromEntries(Object.entries(shell).map(([key, value]) => [key, decode(value)]));
  assert.ok(expected.title && expected.canonical, `${slashed}: shell has a title and canonical`);
  if (route !== "/") {
    assert.notEqual(new URL(expected.canonical).pathname, "/", `${slashed}: shell canonical is not the homepage`);
  }

  for (const spelling of route === "/" ? ["/"] : [slashed, route]) {
    await page.goto(`${base}${spelling}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
    await page.waitForTimeout(300);
    const actual = await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      description: document.querySelector('meta[name="description"]')?.content,
    }));
    for (const key of Object.keys(expected)) {
      if (actual[key] !== expected[key]) {
        failures.push(`${spelling} ${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`);
      }
    }
  }
}

await browser.close();
assert.deepEqual(failures, [], `route metadata after hydration:\n${failures.join("\n")}`);
console.log(`PASS route metadata: ${routes.length} routes keep their shell metadata after hydration, with and without a trailing slash`);
