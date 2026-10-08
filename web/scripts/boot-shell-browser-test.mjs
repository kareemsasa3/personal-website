// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/boot-shell-browser-test.mjs [base URL] [Playwright module] [browser executable]
//
// A cold direct load paints the route's static shell before React starts. The shell must
// stay on screen until the lazy route has rendered, and the branded PageLoader must not
// cover it during startup. Client-side navigation keeps the loader, and a route that fails
// to load must still reveal the error UI. Route chunks are delayed so the startup window is
// wide enough to observe. Run it against a production build (`npm run build && npm run
// preview`), since only the build has static shells and split route chunks.
import assert from "node:assert/strict";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const CHUNK_DELAY_MS = 1200;

// Sampled after every DOM mutation and every animation frame, so each recorded state is one
// the browser could have painted.
const recordVisibleStates = () => {
  const t0 = performance.now();
  const samples = [];
  window.__bootSamples = samples;
  const shown = (element) =>
    !!element && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden";
  const sample = () => {
    const state = {
      shell: shown(document.querySelector(".route-fallback")),
      loader: shown(document.querySelector(".page-loader-overlay")),
      route: shown(document.querySelector("#main-content-area .page-content")),
      error: shown(document.querySelector(".error-boundary")),
    };
    const previous = samples[samples.length - 1];
    if (!previous || ["shell", "loader", "route", "error"].some((key) => previous[key] !== state[key])) {
      samples.push({ ms: Math.round(performance.now() - t0), ...state });
    }
  };
  new MutationObserver(sample).observe(document, { subtree: true, childList: true, attributes: true });
  const frame = () => {
    sample();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

const describe = (samples) =>
  samples
    .map(({ ms, ...state }) => `${ms}ms ${Object.entries(state).filter(([, on]) => on).map(([key]) => key).join("+") || "blank"}`)
    .join(" → ");

const newPage = async ({ reducedMotion = "no-preference", delayChunk, failChunk } = {}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(recordVisibleStates);
  if (delayChunk) {
    await page.route(delayChunk, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
      await route.continue();
    });
  }
  if (failChunk) {
    await page.route(failChunk, (route) => route.abort());
  }
  return { context, page, errors };
};

const samplesOf = (page) => page.evaluate(() => window.__bootSamples);

const assertCleanColdLoad = async (path, chunk, reducedMotion) => {
  const { context, page } = await newPage({ delayChunk: chunk, reducedMotion });
  await page.goto(`${base}${path}`);
  await page.locator("#main-content-area .page-content").first().waitFor({ state: "visible" });
  await page.waitForTimeout(300);
  const samples = await samplesOf(page);
  const label = `${path} (${reducedMotion})`;
  const firstRoute = samples.findIndex((sample) => sample.route);

  assert.ok(samples.some((sample) => sample.shell), `${label}: static shell was never visible\n${describe(samples)}`);
  assert.ok(firstRoute > 0 && samples.slice(0, firstRoute).some((sample) => sample.shell),
    `${label}: static shell did not precede the React route\n${describe(samples)}`);
  assert.ok(!samples.some((sample) => sample.loader), `${label}: PageLoader was visible during startup\n${describe(samples)}`);
  const firstShell = samples.findIndex((sample) => sample.shell);
  assert.ok(!samples.slice(firstShell).some((sample) => !sample.shell && !sample.route),
    `${label}: after the shell painted, a frame showed neither the shell nor the route\n${describe(samples)}`);
  const last = samples[samples.length - 1];
  assert.ok(last.route && !last.shell, `${label}: React route did not replace the shell\n${describe(samples)}`);
  console.log(`PASS cold load ${label}: ${describe(samples)}`);
  await context.close();
};

// 1–2 and 5: direct loads keep the shell until the route renders, with and without reduced motion.
for (const reducedMotion of ["no-preference", "reduce"]) {
  await assertCleanColdLoad("/writing/what-should-still-be-hard/", /\/assets\/Article-[\w-]+\.js$/, reducedMotion);
  await assertCleanColdLoad("/projects/", /\/assets\/Projects-[\w-]+\.js$/, reducedMotion);
}

// 3: after startup, navigating to an unloaded lazy route still shows the PageLoader.
{
  const { context, page } = await newPage({ delayChunk: /\/assets\/CaseStudies-[\w-]+\.js$/ });
  await page.goto(`${base}/projects/`);
  await page.locator("#main-content-area .page-content").first().waitFor({ state: "visible" });
  await page.locator('a[href="/case-studies"]:visible').first().click();
  await page.locator(".page-loader-overlay").waitFor({ state: "visible" });
  await page.locator(".case-studies-page").waitFor({ state: "visible" });
  await page.locator(".page-loader-overlay").waitFor({ state: "detached" });
  console.log("PASS client navigation: PageLoader covers the unloaded /case-studies chunk");
  await context.close();
}

// 4: a route chunk that fails to load reveals the error UI instead of leaving the shell up.
{
  const { context, page } = await newPage({ failChunk: /\/assets\/Article-[\w-]+\.js$/ });
  await page.goto(`${base}/writing/what-should-still-be-hard/`);
  await page.locator(".error-boundary").waitFor({ state: "visible" });
  const samples = await samplesOf(page);
  const last = samples[samples.length - 1];
  assert.ok(last.error && !last.shell, `failed chunk: error UI not revealed\n${describe(samples)}`);
  console.log(`PASS failed route chunk: ${describe(samples)}`);
  await context.close();
}

// 5: without JavaScript the static shell is the whole page.
{
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/writing/what-should-still-be-hard/`);
  assert.ok(await page.locator(".route-fallback").isVisible(), "no-JS: static shell hidden");
  assert.ok(await page.locator(".route-fallback h1").isVisible(), "no-JS: static shell has no heading");
  assert.equal(await page.locator(".page-loader-overlay").count(), 0, "no-JS: PageLoader rendered");
  console.log("PASS no-JS: static article shell is visible");
  await context.close();
}

await browser.close();
