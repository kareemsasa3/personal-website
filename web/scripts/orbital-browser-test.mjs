// Uses an existing Playwright installation; no app dependency required.
// node scripts/orbital-browser-test.mjs [base URL] [Playwright module] [browser executable]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = process.argv[2] || "http://localhost:5173";
const artifacts = process.env.ORBITAL_ARTIFACTS || "/tmp/orbital-browser";
await mkdir(artifacts, { recursive: true });
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "no-preference",
  });
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`${base}/simulations/orbital-simulator`);
  await page
    .getByRole("heading", { name: "Orbital Simulator", exact: true })
    .waitFor();
  const button = (name) => page.getByRole("button", { name, exact: true });
  const elapsed = () =>
    page.getByLabel("Elapsed years").textContent().then(Number);
  const advancing = async () => {
    const before = await elapsed();
    await page.waitForFunction(
      (value) =>
        Number(
          document.querySelector('[aria-label="Elapsed years"]').textContent,
        ) >
        value + 0.1,
      before,
    );
  };
  const pause = async () => {
    await button("Pause").click();
    const time = await elapsed();
    await page.waitForTimeout(250);
    assert.equal(await elapsed(), time);
  };
  const shot = async (name) => {
    console.log("CHECK", name);
    await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
  };
  const assertLayout = async () => {
    const result = await page
      .locator(".orbital-container")
      .evaluate((root) => ({
        width: document.documentElement.clientWidth,
        overflow: [
          ...root.querySelectorAll("button, input, select, canvas, section"),
        ]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.left < -1 || r.right > document.documentElement.clientWidth + 1
            );
          })
          .map((el) => el.outerHTML.slice(0, 120)),
        canvas: root.querySelector("canvas").getBoundingClientRect().height,
      }));
    assert.deepEqual(result.overflow, [], `overflow at ${result.width}px`);
    assert.ok(result.canvas >= 320);
  };
  await advancing();
  await pause();
  await button("Reset scenario").click();
  assert.equal(await elapsed(), 0);
  await page.getByLabel("Simulation speed").selectOption("1");
  assert.equal(await page.getByLabel("Simulation speed").inputValue(), "1");
  await button("Play").click();
  await advancing();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('[aria-label="Elapsed years"]').textContent,
      ) >= 1.2,
  );
  await pause();
  await assertLayout();
  await shot("desktop-dark-orbit");
  await page.getByLabel("Show trails").uncheck();
  assert.equal(await page.getByLabel("Show trails").isChecked(), false);
  await page.getByLabel("Show trails").check();
  await page.getByLabel("Selected body", { exact: true }).selectOption("star");
  assert.match(await page.locator(".orbital-readout").innerText(), /1.0000 M☉/);
  await page
    .getByLabel("Selected body", { exact: true })
    .selectOption("planet");
  await button("Reset scenario").click();
  await button("Pause & edit body").click();
  assert.equal(await button("Play").isDisabled(), true);
  await page.getByLabel("Y velocity (AU/yr)", { exact: true }).fill("8");
  await page
    .getByLabel("Mass (solar masses)", { exact: true })
    .fill("0.000006");
  await button("Apply changes").click();
  assert.match(await page.locator(".orbital-readout").innerText(), /8.0000/);
  assert.match(await page.locator(".orbital-readout").innerText(), /6.000e-6/);
  await button("Play").click();
  await advancing();
  await pause();
  await button("Pause & edit body").click();
  await page.getByLabel("Mass (solar masses)", { exact: true }).fill("-1");
  await button("Apply changes").click();
  assert.equal(
    await page
      .getByLabel("Mass (solar masses)", { exact: true })
      .evaluate((el) => el.validity.valid),
    false,
  );
  await button("Cancel edit").click();
  await button("Reset scenario").click();
  assert.equal(await elapsed(), 0);
  assert.match(await page.locator(".orbital-readout").innerText(), /3.000e-6/);
  await page.getByLabel("Scenario", { exact: true }).selectOption("binary");
  assert.equal(
    await page.getByLabel("Selected body", { exact: true }).inputValue(),
    "companion",
  );
  await button("Play").click();
  await advancing();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('[aria-label="Elapsed years"]').textContent,
      ) > 1,
  );
  await pause();
  await shot("desktop-dark-binary");
  const beforeZoom = await page.locator("canvas.orbital-canvas").screenshot();
  await button("Zoom in").click();
  await page.waitForTimeout(100);
  assert.notDeepEqual(
    await page.locator("canvas.orbital-canvas").screenshot(),
    beforeZoom,
  );
  await button("Zoom out").click();
  await button("Pan left").click();
  await button("Pan up").click();
  await button("Reset camera").click();
  await page.getByLabel("Camera follows").selectOption("selected");
  assert.equal(
    await page.getByLabel("Camera follows").inputValue(),
    "selected",
  );
  await button("Fit all").click();
  assert.equal(
    await page.getByLabel("Camera follows").inputValue(),
    "barycenter",
  );
  // Pointer selection: reset the binary, whose primary is left of the centered field.
  await button("Reset scenario").click();
  const canvas = page.locator("canvas.orbital-canvas");
  const bounds = await canvas.boundingBox();
  const scale = Math.min(bounds.width, bounds.height) / 4;
  await canvas.click({
    position: { x: bounds.width / 2 - 0.6 * scale, y: bounds.height / 2 },
  });
  assert.equal(
    await page.getByLabel("Selected body", { exact: true }).inputValue(),
    "primary",
  );
  const beforePan = await canvas.screenshot();
  await page.mouse.move(bounds.x + 50, bounds.y + 80);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 110, bounds.y + 100, { steps: 5 });
  await page.mouse.up();
  assert.notDeepEqual(await canvas.screenshot(), beforePan);
  await page.getByLabel("Scenario", { exact: true }).selectOption("planets");
  await button("Play").click();
  await advancing();
  await pause();
  await shot("desktop-multiplanet");
  await page.getByLabel("Scenario", { exact: true }).selectOption("three");
  await page.getByLabel("Simulation speed").selectOption("4");
  await button("Play").click();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('[aria-label="Elapsed years"]').textContent,
      ) > 5,
  );
  await pause();
  assert.equal(await page.getByRole("alert").count(), 0);
  await shot("desktop-three-body");
  await button("Open settings").click();
  await button("Switch to light mode").click();
  await page.keyboard.press("Escape");
  await button("Close settings").waitFor({ state: "hidden" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await assertLayout();
  await shot("desktop-light");
  await page.setViewportSize({ width: 375, height: 812 });
  await assertLayout();
  await shot("mobile-light");
  await page.getByLabel("Selected body", { exact: true }).selectOption("a");
  await button("Pause & edit body").click();
  await assertLayout();
  await shot("mobile-editor-light");
  await button("Cancel edit").click();
  await button("Open settings").click();
  await button("Switch to dark mode").click();
  await page.keyboard.press("Escape");
  await button("Close settings").waitFor({ state: "hidden" });
  await assertLayout();
  await shot("mobile-dark");
  await page.setViewportSize({ width: 320, height: 812 });
  await assertLayout();
  await page.setViewportSize({ width: 430, height: 812 });
  await assertLayout();
  // Real keyboard activation plus the site's visible focus rule.
  await button("Reset scenario").focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  assert.equal(focused.tag, "SELECT");
  assert.equal(focused.outline, "solid");
  await button("Play").focus();
  await page.keyboard.press("Enter");
  await advancing();
  await pause();
  await page.goto(`${base}/simulations`);
  await page
    .getByRole("heading", { name: "Simulations", exact: true })
    .waitFor();
  const card = page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "Orbital Simulator",
        exact: true,
      }),
    });
  assert.equal(await card.count(), 1);
  assert.doesNotMatch(await card.innerText(), /Planned|Coming soon/);
  await card.click();
  await page
    .getByRole("heading", { name: "Orbital Simulator", exact: true })
    .waitFor();
  assert.match(page.url(), /simulations\/orbital-simulator$/);
  const reduced = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reduced.newPage();
  reducedPage.on("pageerror", (e) => errors.push(e.message));
  await reducedPage.goto(`${base}/simulations/orbital-simulator`);
  await reducedPage
    .getByRole("button", { name: "Play", exact: true })
    .waitFor();
  await reducedPage.waitForTimeout(350);
  assert.equal(
    Number(await reducedPage.getByLabel("Elapsed years").textContent()),
    0,
  );
  await reducedPage.getByRole("button", { name: "Play", exact: true }).click();
  await reducedPage.waitForFunction(
    () =>
      Number(
        document.querySelector('[aria-label="Elapsed years"]').textContent,
      ) > 0.05,
  );
  await reducedPage.getByRole("button", { name: "Pause", exact: true }).click();
  await reducedPage.screenshot({
    path: `${artifacts}/reduced-motion.png`,
    fullPage: true,
  });
  console.log(
    "PASS: controls, presets, editing, camera, pointer selection/pan, keyboard focus, route/card, themes, 320/375/430px layouts, reduced motion.",
  );
  console.log("Runtime/console errors:", errors);
} finally {
  await browser.close();
}
assert.deepEqual(errors, []);
