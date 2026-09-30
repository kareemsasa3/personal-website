// Uses the existing standalone browser-test convention; no new dependency.
// node scripts/settings-panel-browser-test.mjs [base URL] [Playwright module] [browser executable]
// Optional EXPECTED_BUILD_TEXT asserts the exact About build label.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const { chromium } = await import(process.argv[3] || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[4] ? { executablePath: process.argv[4] } : {}),
});
const base = process.argv[2] || "http://localhost:5173";
const artifacts = process.env.SETTINGS_ARTIFACTS || "/tmp/settings-panel-browser";
await mkdir(artifacts, { recursive: true });
const errors = [];

const withPage = async ({ width, height, reducedMotion = false, navMode }, run) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reducedMotion ? "reduce" : "no-preference", acceptDownloads: true });
  context.setDefaultTimeout(10000);
  if (navMode) await context.addInitScript((mode) => localStorage.setItem("web-nav-mode", mode), navMode);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/projects`);
    await run(page);
  } finally {
    await context.close();
  }
};

const helpers = (page) => {
  const button = (name) => page.getByRole("button", { name, exact: true });
  const panel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
  const focused = (locator) => locator.evaluate((el) => document.activeElement === el);
  // Actual hit testing, as in header-overlap-browser-test.mjs.
  const reachable = async (locator) => {
    await locator.evaluate((el) => el.scrollIntoView({ block: "nearest", behavior: "instant" }));
    await page.waitForFunction((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 &&
        [[0.5, 0.5], [0.2, 0.3], [0.8, 0.7]].every(([x, y]) => el.contains(document.elementFromPoint(r.left + r.width * x, r.top + r.height * y)));
    }, await locator.elementHandle());
  };
  const open = async () => {
    const opener = button("Open settings");
    await opener.focus();
    await page.keyboard.press("Enter");
    await panel.waitFor();
    assert.ok(await focused(button("Close settings")), "Close receives focus on open");
    await reachable(button("Close settings"));
  };
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${artifacts}/${name}.png` });
  };
  return { button, panel, focused, reachable, open, shot };
};

// Header mode across widths: structure, tab order, theme, motion, scrolling, Escape.
for (const [width, height] of [[320, 568], [375, 667], [430, 740], [500, 834], [820, 1180], [1440, 900], [844, 390]]) {
  await withPage({ width, height }, async (page) => {
    const { button, panel, focused, reachable, open, shot } = helpers(page);
    await open();
    assert.deepEqual(await panel.locator(".settings-section-title").allTextContents(), ["Appearance", "Navigation", "Motion", "Data", "About"]);
    const text = await panel.textContent();
    for (const stale of ["Header Controls", "Web v1.0", "Backup & Restore"]) assert.ok(!text.includes(stale), `Removed copy still present: ${stale}`);
    assert.equal(await panel.getAttribute("aria-modal"), "false");

    const dockAvailable = width >= 430;
    assert.equal(await button("Dock").count(), dockAvailable ? 1 : 0);
    if (!dockAvailable) assert.ok(text.includes("this screen uses the header"));
    assert.equal(await page.getByRole("group", { name: "Theme" }).count(), 1);
    if (dockAvailable) assert.equal(await page.getByRole("group", { name: "Navigation Style" }).count(), 1);

    // Reading-order tab traversal up to Reset.
    const expected = ["Close settings", "Dark", "Light", ...(dockAvailable ? ["Dock", "Header"] : []), "background-animation-label", "background-motion-speed", "Export settings", "Import settings", "Reset all settings to defaults"];
    const seen = [];
    for (let i = 1; i < expected.length; i++) {
      await page.keyboard.press("Tab");
      const active = page.locator(":focus");
      assert.ok(await active.evaluate((el) => Boolean(el.closest(".settings-sidebar"))), "Focus stays in the panel");
      await reachable(active);
      seen.push(await active.evaluate((el) => el.getAttribute("aria-labelledby") || el.getAttribute("aria-label") || el.id || el.textContent.trim()));
    }
    assert.deepEqual(seen, expected.slice(1));

    // Theme segmented control.
    await button("Light").click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
    assert.equal(await button("Light").getAttribute("aria-pressed"), "true");
    assert.equal(await button("Dark").getAttribute("aria-pressed"), "false");
    await shot(`${width}x${height}-header-light`);
    await button("Dark").click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");

    // Background animation switch and speed slider.
    const animation = page.getByRole("switch", { name: "Background animation" });
    const speed = page.getByRole("slider", { name: "Speed" });
    assert.equal(await animation.getAttribute("aria-checked"), "true");
    await speed.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await speed.getAttribute("aria-valuetext"), "1.1 times");
    assert.ok((await panel.textContent()).includes("1.1×"));
    await animation.click();
    assert.equal(await animation.getAttribute("aria-checked"), "false");
    assert.ok(await speed.isDisabled(), "Speed is disabled while animation is off");
    await animation.focus();
    await page.keyboard.press("Space");
    assert.equal(await animation.getAttribute("aria-checked"), "true");
    assert.ok(!(await speed.isDisabled()));

    // Internal scrolling keeps the last controls reachable without page scroll.
    const content = panel.locator(".settings-content");
    const pageScroll = await page.evaluate(() => scrollY);
    const overflow = await content.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
      return el.scrollHeight > el.clientHeight;
    });
    if (overflow) assert.ok(await content.evaluate((el) => el.scrollTop > 0), "Panel scrolls internally");
    assert.equal(await page.evaluate(() => scrollY), pageScroll, "Panel scrolling does not scroll the page");
    await reachable(button("Reset all settings to defaults"));
    await reachable(page.locator(".settings-build"));
    await shot(`${width}x${height}-header-end`);

    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "detached" });
    assert.ok(await focused(button("Open settings")), "Focus returns to opener");
    console.log(`PASS header ${width}x${height}: structure, tab order, theme, motion, scrolling, Escape`);
  });
}

// Dock mode: tuning disclosure, inert widths, preserved values.
for (const [width, height, inert] of [[500, 834, true], [768, 1024, true], [820, 1180, false], [1440, 900, false]]) {
  await withPage({ width, height, navMode: "dock" }, async (page) => {
    const { button, panel, reachable, open, shot } = helpers(page);
    await page.locator(".dock-container").waitFor();
    await open();
    assert.equal(await button("Dock").getAttribute("aria-pressed"), "true");
    const toggle = button("Dock tuning");
    const tuning = page.locator("#dock-tuning-panel");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.ok(await tuning.isHidden());
    await toggle.focus();
    await page.keyboard.press("Enter");
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    await tuning.waitFor();
    const size = page.getByRole("slider", { name: "Size" });
    const responsiveness = page.getByRole("slider", { name: "Responsiveness" });
    const magnification = page.getByRole("slider", { name: "Magnification" });
    const note = page.locator("#dock-tuning-note");
    if (inert) {
      for (const slider of [size, responsiveness, magnification]) {
        assert.ok(await slider.isDisabled(), "Dock tuning is disabled where the dock ignores it");
        assert.equal(await slider.getAttribute("aria-describedby"), "dock-tuning-note");
      }
      assert.equal((await note.textContent()).trim(), "Dock tuning applies on wider screens.");
    } else {
      assert.equal(await note.count(), 0);
      for (const slider of [size, responsiveness, magnification]) assert.ok(!(await slider.isDisabled()));
      const before = await page.locator(".dock-icon").first().evaluate((el) => el.getBoundingClientRect().width);
      await size.focus();
      for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
      assert.equal(await size.getAttribute("aria-valuetext"), "50 px");
      await page.waitForFunction((w) => document.querySelector(".dock-icon").getBoundingClientRect().width > w, before);
      await responsiveness.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await responsiveness.getAttribute("aria-valuetext"), "450");
      await magnification.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await magnification.getAttribute("aria-valuetext"), "50%");
      // Collapse and reopen: values persist.
      await toggle.click();
      assert.ok(await tuning.isHidden());
      await toggle.click();
      assert.equal(await size.getAttribute("aria-valuetext"), "50 px");
    }
    await reachable(button("Close settings"));
    await reachable(page.locator(".dock-container"));
    await shot(`${width}x${height}-dock-tuning`);
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "detached" });
    console.log(`PASS dock ${width}x${height}: disclosure, ${inert ? "disabled inert tuning" : "live tuning and persistence"}`);
  });
}

// Reduced motion: overridden controls are disabled and explained.
for (const [width, height] of [[1440, 900], [375, 667]]) {
  await withPage({ width, height, reducedMotion: true, navMode: width > 768 ? "dock" : undefined }, async (page) => {
    const { button, open, shot } = helpers(page);
    await open();
    const animation = page.getByRole("switch", { name: "Background animation" });
    const speed = page.getByRole("slider", { name: "Speed" });
    assert.ok(await animation.isDisabled());
    assert.equal(await animation.getAttribute("aria-checked"), "false");
    assert.ok(await speed.isDisabled());
    for (const control of [animation, speed]) assert.equal(await control.getAttribute("aria-describedby"), "reduced-motion-note");
    assert.equal((await page.locator("#reduced-motion-note").textContent()).replace(/\s+/g, " ").trim(), "Your system prefers reduced motion; the background stays still.");
    if (width > 768) {
      await button("Dock tuning").click();
      assert.ok(!(await page.getByRole("slider", { name: "Size" }).isDisabled()), "Size still applies under reduced motion");
      assert.ok(await page.getByRole("slider", { name: "Magnification" }).isDisabled());
      assert.ok(await page.getByRole("slider", { name: "Responsiveness" }).isDisabled());
      assert.ok((await page.locator("#dock-tuning-note").textContent()).includes("reduced motion"));
    }
    await shot(`${width}x${height}-reduced-motion`);
    console.log(`PASS reduced motion ${width}x${height}: overridden controls disabled and explained`);
  });
}

// Data actions, reset confirmation, and the build identifier.
await withPage({ width: 1440, height: 900 }, async (page) => {
  const { button, panel, focused, reachable, open } = helpers(page);
  await open();

  const [download] = await Promise.all([page.waitForEvent("download"), button("Export settings").click()]);
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.version, 1);
  for (const key of ["dockSize", "dockStiffness", "magnification", "isAnimationPaused", "navMode", "theme", "backgroundMotionSpeed"]) assert.ok(key in exported, `Export includes ${key}`);
  await page.getByText("Settings Exported").waitFor();

  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), button("Import settings").click()]);
  await chooser.setFiles({ name: "settings.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, theme: "light", backgroundMotionSpeed: 1.5 })) });
  await page.getByText("Settings Imported").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
  assert.equal(await page.getByRole("slider", { name: "Speed" }).getAttribute("aria-valuetext"), "1.5 times");

  await button("Reset all settings to defaults").click();
  const reset = page.getByRole("dialog", { name: "Reset Settings", exact: true });
  await reset.waitFor();
  await page.keyboard.press("Escape");
  await reset.waitFor({ state: "detached" });
  assert.ok(await panel.isVisible(), "Escape in the reset dialog keeps Settings open");
  await button("Reset all settings to defaults").click();
  await reset.waitFor();
  await reset.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByText("Settings Reset").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  assert.equal(await page.getByRole("slider", { name: "Speed" }).getAttribute("aria-valuetext"), "1.0 times");

  const build = page.locator(".settings-build");
  await reachable(build);
  const label = (await build.textContent()).replace(/\s+/g, " ").trim();
  if (process.env.EXPECTED_BUILD_TEXT) assert.equal(label.replace(" ↗", ""), process.env.EXPECTED_BUILD_TEXT);
  const link = build.locator("a");
  const ci = /^Build ([0-9a-f]{7}) ↗$/.exec(label);
  if (ci) {
    const href = await link.getAttribute("href");
    assert.match(href, new RegExp(`^https://github\\.com/kareemsasa3/personal-website/commit/${ci[1]}[0-9a-f]{33}$`));
    assert.equal(await link.getAttribute("target"), "_blank");
    assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
    assert.equal(await page.getByRole("link", { name: `Build ${ci[1]}, view commit on GitHub`, exact: true }).count(), 1);
    await link.focus();
    assert.ok(await focused(link));
  } else {
    assert.match(label, /^(Local build · [0-9a-f]{7}( · modified)?|Development build)$/);
    assert.equal(await link.count(), 0, "Only CI builds link to GitHub");
  }
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  assert.ok(await focused(button("Open settings")));
  console.log(`PASS data actions, reset confirmation, build identifier (${label})`);
});

try {
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
