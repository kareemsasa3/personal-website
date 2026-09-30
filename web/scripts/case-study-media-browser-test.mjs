// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/case-study-media-browser-test.mjs [base URL] [Playwright module] [browser executable]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = process.argv[2] || "http://localhost:5173";
const artifacts = process.env.MEDIA_ARTIFACTS || "/tmp/case-study-media-browser";
await mkdir(artifacts, { recursive: true });
const errors = [];

const run = async ({ reducedMotion = "no-preference", storage = {} } = {}, body) => {
  const context = await browser.newContext({ reducedMotion });
  context.setDefaultTimeout(10000);
  await context.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
  }, storage);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await body(page);
  } finally {
    await context.close();
  }
};

const helpers = (page) => {
  const button = (name) => page.getByRole("button", { name, exact: true });
  const focused = async (locator) => {
    try {
      await page.waitForFunction((el) => document.activeElement === el, await locator.elementHandle());
    } catch (error) {
      console.error("Expected focus:", locator.toString(), "actual:", await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 200)));
      throw error;
    }
  };
  // Check actual hit testing, not just bounding boxes or z-index numbers.
  const reachable = async (locator) => {
    try {
      await page.waitForFunction((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= -1 && r.left >= -1 &&
          r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 &&
          [[0.5, 0.5], [0.1, 0.1], [0.9, 0.9]].every(([x, y]) =>
            el.contains(document.elementFromPoint(r.left + r.width * x, r.top + r.height * y)));
      }, await locator.elementHandle());
    } catch (error) {
      console.error("Unreachable:", locator.toString(), await locator.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { rect: r.toJSON(), hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.outerHTML.slice(0, 200) };
      }));
      await page.screenshot({ path: `${artifacts}/failure.png` });
      throw error;
    }
  };
  const keyboardOpen = async (locator) => {
    await locator.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await locator.focus();
    await reachable(locator);
    await page.keyboard.press("Enter");
  };
  const shot = async (name) => {
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${artifacts}/${name}.png` });
  };
  // Rendered picture size inside an object-fit: contain box.
  const pictureArea = (locator) => locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const w = el.videoWidth || el.naturalWidth || Number(el.getAttribute("width"));
    const h = el.videoHeight || el.naturalHeight || Number(el.getAttribute("height"));
    const scale = Math.min(r.width / w, r.height / h);
    return { width: w * scale, height: h * scale, area: w * scale * h * scale, scale };
  });
  return { button, focused, reachable, keyboardOpen, shot, pictureArea };
};

const inlineVideo = (page) => page.locator(".case-study-hero-media video");
const viewerVideo = (page) => page.locator(".media-inspector video");
const isPaused = (locator) => locator.evaluate((el) => el.paused);

// Geometry, keyboard, focus, controls, and still presentation across viewports.
const viewports = [[1440, 900], [1024, 768], [768, 1024], [500, 834], [430, 740], [375, 667], [320, 568], [844, 390], [1280, 480], [568, 320], [1440, 900, "dock"], [500, 834, "dock"]];
for (const [width, height, navMode = "header"] of viewports) {
  await run({ storage: { "web-nav-mode": navMode } }, async (page) => {
    const { button, focused, reachable, keyboardOpen, shot, pictureArea } = helpers(page);
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/case-studies/erebus`);
    if (navMode === "dock") await page.locator(".dock-container").waitFor();
    const figure = page.locator(".case-study-hero-media");
    await figure.getByText("Why it matters").waitFor();
    assert.match(await figure.locator("figcaption").innerText(), /Shows[\s\S]*erebus events --follow[\s\S]*Why it matters/i);

    const opener = page.getByRole("button", { name: "Inspect erebus recording with playback controls" });
    const dialog = page.getByRole("dialog", { name: "erebus evidence" });
    const close = button("Close erebus evidence viewer");

    // Escape pressed straight after opening must close it; focus returns to the opener.
    await keyboardOpen(opener);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    await focused(opener);

    await keyboardOpen(opener);
    await dialog.waitFor();
    await focused(close);
    // Inline, compare against the largest scale at which the whole frame is visible at once
    // between the header/dock chrome.
    const inlineSize = await pictureArea(inlineVideo(page));
    const chrome = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return (parseFloat(style.getPropertyValue("--site-header-measured-offset")) || 0) +
        (parseFloat(style.getPropertyValue("--site-dock-safe-space")) || 0);
    });
    const visibleScale = Math.min(1, (height - chrome) / inlineSize.height);
    inlineSize.width *= visibleScale;
    inlineSize.height *= visibleScale;
    inlineSize.area = inlineSize.width * inlineSize.height;
    await page.waitForFunction(() => document.querySelector(".media-inspector video")?.readyState >= 1);
    const viewerSize = await pictureArea(viewerVideo(page));
    // The recording uses all the space the viewport allows: it fills the stage in its limiting
    // dimension. Where the inline hero is already near full width, that is only modestly larger.
    const stage = await page.locator(".media-inspector__stage").boundingBox();
    const ratio = viewerSize.area / inlineSize.area;
    assert.ok(viewerSize.width >= stage.width - 2 || viewerSize.height >= stage.height - 2, `${width}x${height}: recording does not fill stage`);
    assert.ok(ratio >= (width <= 600 ? 1.2 : 1.05), `${width}x${height}: viewer only ${ratio.toFixed(2)}x inline`);
    console.log(`  ${width}x${height} ${navMode}: inline ${Math.round(inlineSize.width)}x${Math.round(inlineSize.height)} -> viewer ${Math.round(viewerSize.width)}x${Math.round(viewerSize.height)} (${ratio.toFixed(2)}x area)`);

    // The viewer fits the viewport and nothing (header, dock) sits above it.
    const panel = page.locator(".media-inspector__panel");
    const box = await panel.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${width}x${height}: panel ${JSON.stringify(box)}`);
    await reachable(close);
    await reachable(viewerVideo(page));
    await reachable(page.locator(".media-inspector__caption"));
    // Every navigation control that is on screen is covered by the viewer.
    const uncovered = await page.evaluate(() => [...document.querySelectorAll(".site-header a, .site-header button, .dock-container a, .dock-container button")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth)
      .filter((r) => {
        const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
        return !document.elementFromPoint(x, y)?.closest(".media-inspector");
      }).length);
    assert.equal(uncovered, 0, `${width}x${height} ${navMode}: navigation above viewer`);
    const caption = page.locator(".media-inspector__caption");
    const noCaptionOverflow = await caption.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 || getComputedStyle(el).overflowY === "auto");
    assert.ok(noCaptionOverflow, `${width}x${height}: caption clipped`);

    // Native controls: seeking and pausing work, and Space toggles playback from the keyboard.
    const video = viewerVideo(page);
    assert.equal(await video.evaluate((el) => el.controls), true);
    await video.evaluate((el) => { el.pause(); el.currentTime = 12; });
    await page.waitForFunction(() => Math.abs(document.querySelector(".media-inspector video").currentTime - 12) < 0.5);
    await video.focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelector(".media-inspector video")?.paused === false);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelector(".media-inspector video").paused);

    // Focus stays inside the dialog.
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest(".media-inspector__panel"))), `${width}x${height}: focus escaped`);
    }
    await shot(`${width}x${height}-recording`);

    // Readable still: fits when legible, otherwise opens at 1:1 and pans.
    await button("still frame").click();
    const still = page.locator(".media-inspector__still img");
    await page.waitForFunction(() => document.querySelector(".media-inspector__still img")?.complete);
    assert.ok(await still.evaluate((el) => el.naturalWidth > 0));
    assert.equal(await video.isHidden(), true);
    const actual = button("actual size");
    const fitScale = (await pictureArea(still)).scale;
    const startsActual = (await actual.getAttribute("aria-pressed")) === "true";
    if (startsActual) {
      const region = page.getByRole("region", { name: "Still frame at actual size; scroll to pan" });
      const renderedWidth = (await still.boundingBox()).width;
      assert.equal(Math.round(renderedWidth), 1344);
      await region.focus();
      await page.keyboard.press("End");
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => {
        const el = document.querySelector(".media-inspector__still");
        return el.scrollLeft > 0 || el.scrollTop > 0;
      });
      await shot(`${width}x${height}-still-actual`);
      await actual.click();
      assert.ok((await pictureArea(still)).scale < 0.75);
    } else {
      assert.ok(fitScale >= 0.75, `${width}x${height}: fit ${fitScale}`);
      await shot(`${width}x${height}-still-fit`);
      await actual.click();
      assert.equal(Math.round((await still.boundingBox()).width), 1344);
    }
    await button("recording").click();
    assert.equal(await video.isVisible(), true);

    // Close button and backdrop both dismiss and return focus.
    await close.click();
    await dialog.waitFor({ state: "detached" });
    await focused(opener);

    const stillOpener = page.getByRole("button", { name: "Read erebus still frame" });
    await keyboardOpen(stillOpener);
    await dialog.waitFor();
    assert.equal(await button("still frame").getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    await focused(stillOpener);

    // Clicking non-interactive dialog content must not strand focus outside it.
    await keyboardOpen(opener);
    await page.locator(".media-inspector__title").click();
    assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest(".media-inspector__panel"))), `${width}x${height}: focus left dialog after click`);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    await focused(opener);

    // The backdrop dismisses where it is exposed (the panel is full-bleed on small screens).
    await keyboardOpen(opener);
    const backdropExposed = await page.evaluate(() => document.elementFromPoint(2, 2)?.classList.contains("media-inspector"));
    if (backdropExposed) {
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: "detached" });
    } else {
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
    }
    await focused(opener);

    // Scrolling over the open viewer does not move the page behind it.
    await keyboardOpen(opener);
    await dialog.waitFor();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => scrollY), before, `${width}x${height}: page scrolled behind viewer`);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    // Nothing is left locked: the page scrolls again after closing.
    assert.equal(await page.evaluate(() => document.documentElement.style.overflowY), "");
    await page.mouse.wheel(0, 300);
    await page.waitForFunction((start) => scrollY !== start, before);

    console.log(`PASS ${width}x${height} ${navMode}: caption, open/Escape/close/backdrop, focus return, fit, hit testing, controls, still`);
  });
}

// Media whose evidence is visual offers only the recording.
await run({}, async (page) => {
  const { keyboardOpen, reachable } = helpers(page);
  await page.setViewportSize({ width: 500, height: 834 });
  await page.goto(`${base}/case-studies/aether`);
  await page.locator(".case-study-hero-media figcaption").getByText("Why it matters").waitFor();
  assert.equal(await page.getByRole("button", { name: "Read aether still frame" }).count(), 0);
  await keyboardOpen(page.getByRole("button", { name: "Inspect aether recording with playback controls" }));
  await page.getByRole("dialog", { name: "aether evidence" }).waitFor();
  assert.equal(await page.getByRole("group", { name: "View" }).count(), 0);
  await reachable(viewerVideo(page));
  await page.keyboard.press("Escape");
  console.log("PASS aether: recording-only viewer");
});

// Playback hand-off keeps the visitor's pause choice.
await run({}, async (page) => {
  const { button, keyboardOpen } = helpers(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/case-studies/arachne`);
  const inline = inlineVideo(page);
  await page.waitForFunction(() => document.querySelector(".case-study-hero-media video")?.paused === false);
  const opener = page.getByRole("button", { name: "Inspect arachne recording with playback controls" });

  // Playing inline -> keeps playing in the viewer; the inline copy pauses meanwhile.
  await keyboardOpen(opener);
  await page.waitForFunction(() => document.querySelector(".media-inspector video")?.paused === false);
  assert.equal(await isPaused(inline), true);
  // Pausing in the viewer carries back as a user pause.
  await viewerVideo(page).evaluate((el) => el.pause());
  const pausedAt = await viewerVideo(page).evaluate((el) => el.currentTime);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  assert.equal(await isPaused(inline), true);
  assert.ok(Math.abs((await inline.evaluate((el) => el.currentTime)) - pausedAt) < 0.5);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);
  assert.equal(await isPaused(inline), true, "user pause should survive scrolling back into view");
  assert.equal(await button("Play arachne demo").count(), 1);

  // Viewing only the still does not count as pausing.
  await button("Play arachne demo").click();
  await page.waitForFunction(() => document.querySelector(".case-study-hero-media video")?.paused === false);
  await keyboardOpen(page.getByRole("button", { name: "Read arachne still frame" }));
  await page.locator(".media-inspector__still img").waitFor();
  assert.equal(await isPaused(viewerVideo(page)), true);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector(".case-study-hero-media video")?.paused === false);
  console.log("PASS playback hand-off: continue, user pause kept, still view does not pause");
});

// Reduced motion: nothing autoplays inline or in the viewer, and the overlay does not animate.
await run({ reducedMotion: "reduce", storage: { theme: "light" } }, async (page) => {
  const { keyboardOpen, reachable, shot } = helpers(page);
  await page.setViewportSize({ width: 500, height: 834 });
  await page.goto(`${base}/case-studies/erebus`);
  const inline = inlineVideo(page);
  await inline.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  assert.equal(await isPaused(inline), true);
  await keyboardOpen(page.getByRole("button", { name: "Inspect erebus recording with playback controls" }));
  await page.getByRole("dialog", { name: "erebus evidence" }).waitFor();
  assert.equal(await page.locator(".media-inspector").evaluate((el) => getComputedStyle(el).animationName), "none");
  await page.waitForTimeout(600);
  assert.equal(await isPaused(viewerVideo(page)), true);
  await reachable(page.locator(".media-inspector__caption"));
  await shot("500-light-reduced-recording");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  assert.equal(await isPaused(inline), true);
  await page.locator(".case-study-hero-media").screenshot({ path: `${artifacts}/500-light-inline.png` });
  console.log("PASS reduced motion + light theme: no autoplay, no overlay animation, caption visible");
});

assert.deepEqual(errors, []);
await browser.close();
