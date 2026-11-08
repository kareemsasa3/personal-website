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
  { slug: "anastasis", title: "ANASTASIS", api: "__anastasis" },
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

// Explore navigation lists the section as "Animations".
{
  const { context, page } = await open();
  await page.goto(`${base}/projects/`);
  const link = page.locator('.site-header a[href="/procedural-animations"]');
  assert.equal((await link.textContent())?.trim(), "Animations", "Explore nav label");
  console.log("PASS navigation: Explore includes Animations");
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
  // ANASTASIS keeps its preference in a closure, so its probe is the fan check below.
  for (const piece of pieces.filter((p) => p.slug in checks)) {
    await page.goto(`${base}/procedural-animations/${piece.slug}/`);
    const frame = await pieceFrame(page, piece);
    if (piece.slug === "one-quiet-day") await frame.waitForFunction(() => window.OQD.ready);
    assert.equal(await frame.evaluate(checks[piece.slug]), true, `${piece.slug}: artifact applies its reduced-motion behavior`);
  }
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("PASS reduced motion: each artifact applies its own handling inside the frame");
  await context.close();
}

// ANASTASIS fan check. The published copy differs from the source in one behaviour edit: under reduced
// motion its fan rotors stop (`var spin=reduceMotion?0:dt*Pnow;`). Paused past power-on, with the piece's
// own overlays hidden, the rotors are the only real-time motion left on the canvas under reduced motion
// (checked when the piece was added). So: a control copy with that edit reverted must change between two
// samples (the check detects rotation, and where it changes is the rotor region); the published copy must
// not change there under reduced motion; and in normal mode it must still change there. Tests may drive
// the piece's __anastasis hook; the site never references it.
{
  const fanGate = "var spin=reduceMotion?0:dt*Pnow;";
  const sampleCanvas = async ({ reducedMotion, control = false }) => {
    const { context, page, problems } = await open({ width: 1280, height: 720, reducedMotion });
    if (control) {
      await page.route("**/procedural-animations/anastasis/piece.html", async (route) => {
        const response = await route.fetch();
        const body = await response.text();
        assert.equal(body.split(fanGate).length, 2, "piece.html holds the fan gate exactly once");
        await route.fulfill({ response, body: body.replace(fanGate, "var spin=dt*Pnow;") });
      });
    }
    await page.goto(`${base}/procedural-animations/anastasis/`);
    const frame = await pieceFrame(page, pieces.find((piece) => piece.slug === "anastasis"));
    await frame.evaluate(() => {
      window.__anastasis.seek(38);
      for (const id of ["title", "labels", "bar", "hint"]) document.getElementById(id).style.visibility = "hidden";
    });
    await page.waitForTimeout(2500);
    // A clipped page screenshot of the frame (the piece's canvas fills it). An element screenshot would wait
    // for two stable animation frames, which a software-rendered WebGL scene may not deliver in time.
    const clip = await (await page.$("iframe.animation-piece__frame")).boundingBox();
    const shots = [await page.screenshot({ clip })];
    await page.waitForTimeout(1200);
    shots.push(await page.screenshot({ clip }));
    assert.deepEqual(problems, [], problems.join("\n"));
    await context.close();
    return shots;
  };
  // Pixels that differ between two PNGs: their count and bounding box, optionally within a box.
  const changed = async ([a, b], within) => {
    const page = await browser.newPage();
    const result = await page.evaluate(async ([a64, b64, box]) => {
      const load = async (s) => createImageBitmap(await (await fetch(`data:image/png;base64,${s}`)).blob());
      const [ia, ib] = await Promise.all([load(a64), load(b64)]);
      const ctx = new OffscreenCanvas(ia.width, ia.height).getContext("2d");
      ctx.drawImage(ia, 0, 0);
      const da = ctx.getImageData(0, 0, ia.width, ia.height).data;
      ctx.drawImage(ib, 0, 0);
      const db = ctx.getImageData(0, 0, ia.width, ia.height).data;
      const [bx0, by0, bx1, by1] = box ?? [0, 0, ia.width - 1, ia.height - 1];
      let count = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
          const i = (y * ia.width + x) * 4;
          if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) {
            count++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
        }
      }
      return { count, box: count ? [x0, y0, x1, y1] : null };
    }, [a.toString("base64"), b.toString("base64"), within ?? null]);
    await page.close();
    return result;
  };

  const control = await changed(await sampleCanvas({ reducedMotion: "reduce", control: true }));
  assert.ok(control.count > 0, "control (fan gate reverted): the rotors turn under reduced motion, so the check detects rotation");
  const reduced = await changed(await sampleCanvas({ reducedMotion: "reduce" }), control.box);
  assert.equal(reduced.count, 0, `published copy: the rotor region ${JSON.stringify(control.box)} is still under reduced motion`);
  const normal = await changed(await sampleCanvas({ reducedMotion: "no-preference" }), control.box);
  assert.ok(normal.count > 0, "published copy: the rotor region still moves in normal mode");
  console.log(`PASS ANASTASIS fan check: rotor region ${JSON.stringify(control.box)} changes ${control.count} px in the control, 0 under reduced motion, ${normal.count} px in normal mode`);
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
