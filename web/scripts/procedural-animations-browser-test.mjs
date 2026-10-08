// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/procedural-animations-browser-test.mjs [base URL] [Playwright module] [browser executable]
//
// Each procedural animation is published as a self-contained artifact framed by an immersive
// route. This checks the canonical routes as production serves them: the artifact loads in a
// same-origin iframe that fills the space under a slim bar, nothing scrolls, the tab order follows
// the bar (Back to Animations, Fullscreen) and then the piece, the artifact's own reduced-motion handling
// and diagnostics survive framing, and nothing is requested from another origin. Run it against
// a production build (`npm run build && npm run preview`).
import assert from "node:assert/strict";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const origin = new URL(base).origin;

const pieces = [
  { slug: "mechanical-time", title: "Mechanical Time", api: "MT" },
  { slug: "descent", title: "DESCENT", api: "DESCENT" },
  { slug: "observing", title: "Observing", api: "__seek" },
  { slug: "one-quiet-day", title: "One Quiet Day", api: "OQD" },
];

const open = async ({ width = 1600, height = 900, reducedMotion = "no-preference" } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, reducedMotion });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const problems = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) problems.push(`third-party request: ${url}`);
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") problems.push(`console error: ${message.text()}`); });
  return { context, page, problems };
};

const pieceFrame = async (page, piece) => {
  const handle = await page.waitForSelector("iframe.animation-piece__frame");
  const frame = await handle.contentFrame();
  await frame.waitForFunction((api) => api in window, piece.api);
  return frame;
};

// Direct canonical loads at desktop 16:9 and phone width.
for (const [width, height] of [[1600, 900], [390, 844]]) {
  for (const piece of pieces) {
    const { context, page, problems } = await open({ width, height });
    const path = `/procedural-animations/${piece.slug}/`;
    await page.goto(`${base}${path}`);
    const frame = await pieceFrame(page, piece);
    await page.waitForTimeout(1500);
    const label = `${path} @${width}x${height}`;

    const layout = await page.evaluate(() => {
      const bar = document.querySelector(".animation-piece__bar").getBoundingClientRect();
      const iframe = document.querySelector("iframe.animation-piece__frame");
      const box = iframe.getBoundingClientRect();
      const de = document.documentElement;
      return {
        title: document.title,
        robots: document.querySelector('meta[name="robots"]')?.content ?? null,
        iframeTitle: iframe.title,
        iframeSrc: iframe.getAttribute("src"),
        siteChrome: Boolean(document.querySelector(".site-header, #dock-container")),
        active: document.activeElement === document.body,
        barBottom: Math.round(bar.bottom),
        frame: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.bottom)],
        viewport: [innerWidth, innerHeight],
        pageScrolls: de.scrollHeight > de.clientHeight || de.scrollWidth > de.clientWidth,
      };
    });
    assert.equal(layout.title, `${piece.title} - Kareem Sasa`, `${label}: document title`);
    assert.equal(layout.robots, null, `${label}: canonical route must stay indexable`);
    assert.equal(layout.iframeTitle, `${piece.title}, procedural animation`, `${label}: iframe title`);
    assert.equal(layout.iframeSrc, `/procedural-animations/${piece.slug}/piece.html`, `${label}: iframe src`);
    assert.equal(layout.siteChrome, false, `${label}: site header/dock must not render`);
    assert.equal(layout.active, true, `${label}: focus must not move on load`);
    assert.deepEqual(layout.frame, [0, layout.barBottom, layout.viewport[0], layout.viewport[1]], `${label}: iframe fills the space under the bar`);
    assert.equal(layout.pageScrolls, false, `${label}: page must not scroll`);

    const inner = await frame.evaluate(() => {
      const de = document.documentElement;
      return {
        robots: document.querySelector('meta[name="robots"]')?.content,
        scrolls: de.scrollHeight > de.clientHeight || de.scrollWidth > de.clientWidth,
      };
    });
    assert.equal(inner.robots, "noindex, nofollow", `${label}: raw artifact robots`);
    assert.equal(inner.scrolls, false, `${label}: artifact must not scroll inside the frame`);

    // Keyboard order matches the bar: Back to Animations, Fullscreen, then the piece.
    const stops = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === "IFRAME" ? "iframe" : el?.textContent?.trim();
      }));
    }
    assert.deepEqual(stops, ["Back to Animations", "Fullscreen", "iframe"], `${label}: tab order`);

    assert.deepEqual(problems, [], `${label}:\n${problems.join("\n")}`);
    console.log(`PASS ${label}`);
    await context.close();
  }
}

// The piece's own keyboard controls work once focus is in the frame (Mechanical Time: Space pauses).
{
  const { context, page, problems } = await open();
  await page.goto(`${base}/procedural-animations/mechanical-time/`);
  const frame = await pieceFrame(page, pieces[0]);
  for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
  await page.keyboard.press(" ");
  assert.equal(await frame.evaluate(() => document.getElementById("bPlay").textContent), "Play", "Space inside the frame pauses Mechanical Time");
  assert.equal(await frame.evaluate(() => typeof window.MT.escCheck), "function", "window.MT diagnostics survive framing");
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("PASS keyboard: Tab into the frame, then the artifact's own Space control works");
  await context.close();
}

// Client-side navigation: gallery -> piece -> Back to Animations, without a full reload.
{
  const { context, page, problems } = await open();
  await page.goto(`${base}/procedural-animations/`);
  await page.waitForSelector(".procedural-animations-card");
  const posters = await page.$$eval(".procedural-animations-card__poster", (images) => images.map((image) => image.getAttribute("src")));
  assert.deepEqual(posters, pieces.map((piece) => `/media/${piece.slug}-card.webp`), "gallery shows a static poster per piece");
  assert.equal(await page.locator(".procedural-animations-page iframe, .procedural-animations-page canvas").count(), 0, "gallery runs no live animations");
  await page.evaluate(() => { window.__noReload = true; });
  await page.click('a.procedural-animations-card[href="/procedural-animations/descent"]');
  await pieceFrame(page, pieces[1]);
  assert.equal(new URL(page.url()).pathname, "/procedural-animations/descent", "card navigates to the piece");
  await page.click("text=Back to Animations");
  await page.waitForSelector(".procedural-animations-card");
  assert.equal(new URL(page.url()).pathname, "/procedural-animations", "Back to Animations returns to the gallery");
  assert.equal(await page.evaluate(() => window.__noReload), true, "navigation stayed client-side");
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("PASS client navigation: gallery -> DESCENT -> Back to Animations");
  await context.close();
}

// The system reduced-motion preference reaches each artifact's own handling through the frame.
{
  const { context, page, problems } = await open({ reducedMotion: "reduce" });
  const checks = {
    "mechanical-time": () => !document.getElementById("rm").hidden,
    descent: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    observing: () => S.ambient === true,
    "one-quiet-day": () => window.OQD.App.mot === 0.35,
  };
  for (const piece of pieces) {
    await page.goto(`${base}/procedural-animations/${piece.slug}/`);
    const frame = await pieceFrame(page, piece);
    if (piece.slug === "one-quiet-day") await frame.waitForFunction(() => window.OQD.ready);
    assert.equal(await frame.evaluate(checks[piece.slug]), true, `${piece.slug}: artifact applies its reduced-motion behavior`);
  }
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("PASS reduced motion: each artifact applies its own handling inside the frame");
  await context.close();
}

// Fullscreen, activated from the keyboard, puts the piece (not the page) into fullscreen and
// moves focus into it so the piece's own controls respond.
for (const [width, height] of [[1600, 900], [390, 844]]) {
  const { context, page, problems } = await open({ width, height });
  await page.goto(`${base}/procedural-animations/observing/`);
  await pieceFrame(page, pieces[2]);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.fullscreenElement?.tagName === "IFRAME");
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), "IFRAME", `@${width}: focus moves into the piece in fullscreen`);
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log(`PASS fullscreen @${width}x${height}: keyboard-activated, the iframe enters fullscreen with focus inside it`);
  await context.close();
}

await browser.close();
