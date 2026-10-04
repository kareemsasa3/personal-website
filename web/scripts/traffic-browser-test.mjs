// Uses an existing Playwright installation; no app dependency required.
// node scripts/traffic-browser-test.mjs [base URL] [Playwright module] [browser executable]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = process.argv[2] || "http://localhost:5173";
const artifacts = process.env.TRAFFIC_ARTIFACTS || "/tmp/traffic-browser";
await mkdir(artifacts, { recursive: true });
const errors = [];
const warnings = []; // reported, not fatal: matches orbital-browser-test.mjs
const route = `${base}/simulations/traffic-simulator`;

const helpers = (page) => {
  const button = (name) => page.getByRole("button", { name, exact: true });
  const elapsed = async () => {
    const [m, s] = (await page.getByLabel("Elapsed simulated time").textContent()).split(":");
    return Number(m) * 60 + Number(s);
  };
  const advancing = async (by = 2) => {
    const before = await elapsed();
    await page.waitForFunction(
      ([value, by]) => {
        const [m, s] = document.querySelector('[aria-label="Elapsed simulated time"]').textContent.split(":");
        return Number(m) * 60 + Number(s) >= value + by;
      },
      [before, by],
    );
  };
  const pause = async () => {
    await button("Pause").click();
    const time = await elapsed();
    await page.waitForTimeout(600);
    assert.equal(await elapsed(), time, "paused clock must not advance");
  };
  const tile = async (label) =>
    Number(
      await page
        .locator(".traffic-tiles > div")
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator(".traffic-tile-value")
        .textContent(),
    );
  const canvasStats = () =>
    page.locator("canvas.traffic-canvas").evaluate((canvas) => {
      const { width, height } = canvas;
      const data = canvas.getContext("2d").getImageData(0, 0, width, height).data;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4 * 97) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      return { width, height, colors: colors.size, background: [...data.slice(0, 3)] };
    });
  const shot = async (name) => {
    console.log("CHECK", name);
    await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
  };
  const assertLayout = async () => {
    const result = await page.locator(".traffic-container").evaluate((root) => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      overflow: [...root.querySelectorAll("button, input, select, canvas, section, table, svg")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1);
        })
        .map((el) => el.outerHTML.slice(0, 120)),
      canvas: root.querySelector("canvas").getBoundingClientRect().toJSON(),
    }));
    assert.deepEqual(result.overflow, [], `overflow at ${result.width}px`);
    assert.ok(result.scroll <= result.width, `page scrolls horizontally at ${result.width}px`);
    assert.ok(result.canvas.height >= 240, "canvas tall enough to read");
    return result;
  };
  const setTheme = async (name) => {
    await button("Open settings").click();
    await button(name).click();
    await page.keyboard.press("Escape");
    await button("Close settings").waitFor({ state: "hidden" });
    assert.equal(await page.locator("html").getAttribute("data-theme"), name.toLowerCase());
  };
  return { button, elapsed, advancing, pause, tile, canvasStats, shot, assertLayout, setTheme };
};

const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    else if (m.type() === "warning") warnings.push(m.text());
  });
};

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  watch(page);
  const h = helpers(page);
  await page.goto(route);
  await page.getByRole("heading", { name: "Traffic Simulator", exact: true }).waitFor();
  assert.equal(await page.title(), "Traffic Simulator - Kareem Sasa");

  // Playback: runs on load, pauses exactly, steps one second at a time.
  await h.advancing();
  await h.pause();
  assert.equal(await h.button("Step 1 s").isDisabled(), false);
  const before = await h.elapsed();
  await h.button("Step 1 s").click();
  await h.button("Step 1 s").click();
  assert.equal(await h.elapsed(), before + 2);
  const drawn = await h.canvasStats();
  assert.ok(drawn.colors >= 4, `canvas draws the corridor (${drawn.colors} colours)`);

  // Speed and live measurements.
  await page.getByLabel("Speed").selectOption("8");
  await h.button("Play").click();
  assert.equal(await h.button("Step 1 s").isDisabled(), true);
  await h.advancing(90);
  await h.pause();
  assert.ok((await h.tile("Throughput")) > 0, "throughput measured");
  assert.ok((await h.tile("On the road")) > 0, "vehicles on the road");
  const signals = await page.getByRole("table", { name: "Signals and queues" }).innerText();
  assert.match(signals, /Green|Yellow/);
  assert.match(signals, /Red/);
  assert.ok((await page.locator(".traffic-spark-line").count()) === 2, "both trend lines drawn");
  await h.assertLayout();
  await h.shot("desktop-dark-steady");

  // Sliders are keyboard operable; Restart keeps settings, Reset restores the preset.
  const eastbound = page.getByLabel("Eastbound", { exact: true });
  await eastbound.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await eastbound.inputValue(), "850");
  assert.match(await page.locator('output[for="traffic-eastbound"]').textContent(), /850 veh\/h/);
  await h.button("Restart run").click();
  assert.equal(await h.elapsed(), 0);
  assert.equal(await eastbound.inputValue(), "850");
  await h.button("Reset scenario").click();
  assert.equal(await eastbound.inputValue(), "800");

  // Signal controls: actuated disables the fixed-time timing sliders.
  const mode = page.getByLabel("Control", { exact: true });
  await mode.selectOption("actuated");
  for (const name of ["Cycle length", "East–west green share", "Offset between signals"])
    assert.equal(await page.getByLabel(name, { exact: true }).isDisabled(), true, name);
  await page.getByText("Actuated signals").waitFor();
  await mode.selectOption("fixed");
  const offset = page.getByLabel("Offset between signals", { exact: true });
  await offset.focus();
  for (let i = 0; i < 15; i++) await page.keyboard.press("ArrowRight");
  assert.equal(await offset.inputValue(), "15");

  // Every scenario loads, explains its experiment, and runs without alerts.
  const scenario = page.getByLabel("Scenario", { exact: true });
  for (const [id, text] of [
    ["green-wave", /offset of 15 s, 0 s, and 45 s/],
    ["night-actuated", /fixed time and compare average delay/],
    ["rush-hour", /lengthen the cycle/],
  ]) {
    await scenario.selectOption(id);
    assert.equal(await h.elapsed(), 0);
    assert.match(await page.locator(".traffic-context").innerText(), text);
  }
  await h.button("Play").click();
  await page.waitForFunction(() => {
    const tiles = [...document.querySelectorAll(".traffic-tiles > div")];
    const stopped = tiles.find((t) => t.textContent.includes("Stopped"));
    return Number(stopped.querySelector(".traffic-tile-value").textContent) > 20;
  });
  await h.advancing(60);
  await h.pause();
  await h.shot("desktop-dark-rush-hour");

  // Zooming into one signal changes the drawing.
  const view = page.getByLabel("View", { exact: true });
  const corridor = await page.locator("canvas.traffic-canvas").screenshot();
  await view.selectOption("1");
  await page.waitForTimeout(100);
  assert.notDeepEqual(await page.locator("canvas.traffic-canvas").screenshot(), corridor);
  await h.shot("desktop-dark-signal-2");
  await view.selectOption("corridor");

  // Light theme repaints the canvas from its own palette.
  const darkBackground = (await h.canvasStats()).background;
  await h.setTheme("Light");
  await page.waitForTimeout(100);
  assert.notDeepEqual((await h.canvasStats()).background, darkBackground);
  await h.assertLayout();
  await h.shot("desktop-light");

  // Narrow screens: no horizontal overflow; the corridor turns vertical.
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 860 });
    await page.waitForTimeout(150);
    const { canvas } = await h.assertLayout();
    assert.ok(canvas.height > canvas.width, `vertical corridor at ${width}px`);
  }
  await h.shot("mobile-light");
  await h.setTheme("Dark");
  await h.shot("mobile-dark");

  // Keyboard: visible focus and activation.
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.button("Reset scenario").focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  assert.equal(focused.tag, "SELECT");
  assert.equal(focused.outline, "solid");
  await h.button("Play").focus();
  await page.keyboard.press("Enter");
  await h.advancing();
  await h.pause();

  // The simulations index links to the playable page with no unavailable badge.
  await page.goto(`${base}/simulations`);
  await page.getByRole("heading", { name: "Simulations", exact: true }).waitFor();
  const card = page.getByRole("link").filter({
    has: page.getByRole("heading", { name: "Traffic Simulator", exact: true }),
  });
  assert.equal(await card.count(), 1);
  assert.doesNotMatch(await card.innerText(), /In development|Planned|Coming soon/i);
  assert.match(await card.innerText(), /Interactive simulation/i);
  await card.click();
  await page.getByRole("heading", { name: "Traffic Simulator", exact: true }).waitFor();
  assert.match(page.url(), /simulations\/traffic-simulator$/);
  await context.close();

  // Reduced motion: starts paused, steps on request, plays only when asked.
  const reduced = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reduced.newPage();
  watch(reducedPage);
  const r = helpers(reducedPage);
  await reducedPage.goto(route);
  await r.button("Play").waitFor();
  await reducedPage.waitForTimeout(800);
  assert.equal(await r.elapsed(), 0);
  await r.button("Step 1 s").click();
  assert.equal(await r.elapsed(), 1);
  await r.button("Play").click();
  await r.advancing();
  await r.button("Pause").click();
  await reducedPage.screenshot({ path: `${artifacts}/reduced-motion.png`, fullPage: true });
  await reduced.close();
  console.log(
    "PASS: playback/step/speed, metrics and trends, sliders and keyboard, restart/reset, signal modes, scenarios, view zoom, themes, 320/375/430px layouts, card routing, reduced motion.",
  );
  console.log("Runtime/console errors:", errors);
  console.log("Console warnings:", warnings);
} finally {
  await browser.close();
}
assert.deepEqual(errors, []);
