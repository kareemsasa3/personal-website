// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/header-overlap-browser-test.mjs [base URL] [Playwright module] [browser executable]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = process.argv[2] || "http://localhost:5173";
const artifacts = process.env.OVERLAP_ARTIFACTS || "/tmp/header-overlap-browser";
await mkdir(artifacts, { recursive: true });
const errors = [];
try {
  const context = await browser.newContext();
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const button = (name) => page.getByRole("button", { name, exact: true });
  const focused = async (locator) => {
    try {
      await page.waitForFunction((el) => document.activeElement === el, await locator.elementHandle());
    } catch (error) {
      console.error("Expected focus:", locator.toString(), "actual:", await page.evaluate(() => document.activeElement?.outerHTML));
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
        [[0.5, 0.5], [0.2, 0.2], [0.8, 0.8]].every(([x, y]) =>
          el.contains(document.elementFromPoint(r.left + r.width * x, r.top + r.height * y)));
    }, await locator.elementHandle());
    } catch (error) {
      console.error("Unreachable:", locator.toString(), await locator.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { rect: r.toJSON(), hit: document.elementFromPoint(r.x+r.width/2, r.y+r.height/2)?.outerHTML, focused: document.activeElement?.outerHTML };
      }));
      await page.screenshot({ path: `${artifacts}/failure.png` });
      throw error;
    }
  };
  const keyboardOpen = async (locator) => {
    await locator.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await locator.focus();
    await reachable(locator);
    await page.keyboard.press("Enter");
  };
  const shot = async (name) => {
    // Let springs finish before capturing the visual review artifact.
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${artifacts}/${name}.png` });
  };

  for (const [width, height] of [[1440, 900], [500, 834], [430, 740], [375, 667], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/projects`);
    const coverageOpener = page.getByRole("button", { name: /Technical coverage/ });
    const coverage = page.getByRole("dialog", { name: "Technical Coverage", exact: true });
    await keyboardOpen(coverageOpener);
    await focused(button("Close technology list"));
    await reachable(button("Close technology list"));
    await shot(`${width}-coverage`);
    await page.keyboard.press("Tab");
    await focused(page.getByRole("region", { name: "Technologies by project" }));
    await page.keyboard.press("End");
    await page.waitForFunction(() => document.querySelector(".tech-stack-grid").scrollTop > 0);
    await page.keyboard.press("Tab");
    await focused(button("Close technology list"));
    await page.keyboard.press("Escape");
    await coverage.waitFor({ state: "detached" });
    await focused(coverageOpener);
    await keyboardOpen(coverageOpener);
    await button("Close technology list").click();
    await focused(coverageOpener);
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await coverageOpener.click();
    await reachable(button("Close technology list"));
    await page.keyboard.press("Escape");
    await focused(coverageOpener);

    const settingsOpener = button("Open settings");
    const settings = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await keyboardOpen(settingsOpener);
    await focused(button("Close settings"));
    await reachable(button("Close settings"));
    assert.equal(await settings.getAttribute("aria-modal"), "false");
    await shot(`${width}-settings`);
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press("Tab");
      const active = page.locator(":focus");
      assert.ok(await active.evaluate(el => Boolean(el.closest(".settings-sidebar"))));
      await reachable(active);
      if (await active.getAttribute("aria-label") === "Reset all settings to defaults") break;
      assert.ok(i < 23, "Reset control was not keyboard reachable");
    }
    await page.keyboard.press("Enter");
    const reset = page.getByRole("dialog", { name: "Reset Settings", exact: true });
    await reset.waitFor();
    await focused(button("Close modal"));
    await reachable(button("Close modal"));
    await reachable(button("Cancel"));
    await page.keyboard.press("Escape");
    await reset.waitFor({ state: "detached" });
    await focused(button("Reset all settings to defaults"));
    assert.ok(await settings.isVisible(), "Nested Escape must leave settings open");
    await page.keyboard.press("Escape");
    await settings.waitFor({ state: "detached" });
    await focused(settingsOpener);
    await keyboardOpen(settingsOpener);
    await button("Close settings").click();
    await focused(settingsOpener);
    await settings.waitFor({ state: "detached" });

    await page.goto(`${base}/terminal`);
    const input = page.locator(".command-input");
    await focused(input);
    await page.keyboard.press("Shift+Tab");
    await focused(button("Maximize terminal"));
    for (const name of ["Close terminal", "Minimize terminal", "Maximize terminal"]) await reachable(button(name));
    const normalTop = await page.locator(".terminal-container").evaluate(el => el.getBoundingClientRect().top);
    const headerBottom = await page.locator(".site-header").evaluate(el => el.getBoundingClientRect().bottom);
    assert.ok(normalTop >= headerBottom - 1, "Normal terminal must clear header");
    await shot(`${width}-terminal`);
    await page.keyboard.press("Enter");
    await reachable(button("Restore terminal"));
    await page.keyboard.press("Escape");
    await focused(button("Maximize terminal"));
    await reachable(button("Maximize terminal"));
    await page.keyboard.press("Enter");
    await button("Restore terminal").click();
    await focused(button("Maximize terminal"));
    await page.keyboard.press("Shift+Tab");
    await focused(button("Minimize terminal"));
    await page.keyboard.press("Enter");
    await focused(button("Restore terminal window"));
    await reachable(button("Restore terminal window"));
    await page.keyboard.press("Enter");
    await focused(button("Minimize terminal"));
    await reachable(button("Minimize terminal"));
    const title = await page.locator(".terminal-title").boundingBox();
    await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2);
    await page.mouse.down();
    await page.mouse.move(0, 0, { steps: 8 });
    await page.mouse.up();
    await reachable(button("Close terminal"));
    assert.ok(await page.locator(".terminal-container").evaluate(el => el.getBoundingClientRect().top >= document.querySelector(".site-header").getBoundingClientRect().bottom - 1));
    await keyboardOpen(settingsOpener);
    await reachable(button("Close settings"));
    await page.keyboard.press("Escape");
    await focused(settingsOpener);
    await settings.waitFor({ state: "detached" });
    await button("Close terminal").click();
    await page.waitForURL(`${base}/`);
    console.log(`PASS header ${width}x${height}: geometry, keyboard, Escape, focus return, reopen, nested reset, terminal drag/minimize/maximize`);
  }
  // Dock mode, including focus return when changing modes replaces the opener.
  for (const width of [1440, 500]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${base}/projects`);
    await keyboardOpen(button("Open settings"));
    await button("Dock").click();
    await page.locator(".dock-container").waitFor();
    await page.locator(".site-header").waitFor({ state: "detached" });
    await reachable(button("Close settings"));
    await reachable(button("Open settings"));
    await page.keyboard.press("Escape");
    await focused(button("Open settings"));
    await keyboardOpen(button("Open settings"));
    await button("Close settings").click();
    await focused(button("Open settings"));
    await page.locator(".settings-sidebar").waitFor({ state: "detached" });
    await keyboardOpen(page.getByRole("button", { name: /Technical coverage/ }));
    await reachable(button("Close technology list"));
    await page.keyboard.press("Escape");
    await page.goto(`${base}/terminal`);
    await focused(page.locator(".command-input"));
    await reachable(button("Maximize terminal"));
    await keyboardOpen(button("Open settings"));
    await shot(`${width}-dock-settings`);
    await button("Header").click();
    await page.locator(".site-header").waitFor();
    await page.locator(".dock-container").waitFor({ state: "detached" });
    await reachable(button("Close settings"));
    await page.keyboard.press("Escape");
    await focused(button("Open settings"));
    console.log(`PASS dock ${width}: panels, terminal, mode changes, focus return`);
  }

  // A short, light-theme, reduced-motion viewport and simulated enlarged text.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/projects`);
  await keyboardOpen(button("Open settings"));
  await page.locator(".theme-toggle").click();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await reachable(button("Close settings"));
  await shot("375-enlarged-settings");
  await page.setViewportSize({ width: 667, height: 375 });
  await reachable(button("Close settings"));
  await page.keyboard.press("Escape");
  await focused(button("Open settings"));
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  await keyboardOpen(page.getByRole("button", { name: /Technical coverage/ }));
  await reachable(button("Close technology list"));
  await shot("667-light-reduced-coverage");
  await page.keyboard.press("Escape");
  await page.goto(`${base}/terminal`);
  await focused(page.locator(".command-input"));
  await page.setViewportSize({ width: 320, height: 400 });
  await reachable(button("Maximize terminal"));
  await shot("320-short-terminal");
  console.log("PASS light theme, reduced motion, live height resize, simulated 200% text");
  await page.setViewportSize({ width: 500, height: 834 });
  await page.goto(`${base}/projects`);
  await keyboardOpen(button("Open settings"));
  await button("Reset all settings to defaults").click();
  await button("Reset").click();
  await reachable(button("Close notification"));
  await button("Close notification").click();
  await reachable(button("Close settings"));
  await button("Close settings").click();
  console.log("PASS settings confirmation and feedback stay visible above panel");
  assert.deepEqual(errors, []);
  await context.close();
} finally {
  await browser.close();
}
