// Evidence capture for the blinded Traffic Simulator comparison.
// node capture.mjs <outDir> [job,...]
// Needs production previews of both candidates. Set CANDIDATE_1_URL and CANDIDATE_2_URL
// (defaults http://localhost:4301 and :4302), PLAYWRIGHT_MODULE (default "playwright"), and
// optionally CHROMIUM_PATH. Local paths and ports were moved into these variables after the
// captures ran; the capture logic is unchanged.
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const out = process.argv[2];
const only = process.argv[3]; // optional: run one job by name
await mkdir(`${out}/raw`, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const log = [];

const URLS = {
  1: process.env.CANDIDATE_1_URL || "http://localhost:4301",
  2: process.env.CANDIDATE_2_URL || "http://localhost:4302",
};

async function open(candidate, { width = 1360, height = 1000, dpr = 1, theme = "dark" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: "no-preference" });
  await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${URLS[candidate]}/simulations/traffic-simulator`);
  await page.getByRole("heading", { name: "Traffic Simulator", level: 1 }).waitFor();
  await page.waitForTimeout(800);
  return { page, context, errors };
}

const rectOf = (page, selectors) =>
  page.evaluate((sels) => {
    const rects = sels.map((s) => {
      const el = typeof s === "string" ? document.querySelector(s) : null;
      if (!el) throw new Error(`missing ${s}`);
      return el.getBoundingClientRect();
    });
    const x = Math.min(...rects.map((r) => r.left)), y = Math.min(...rects.map((r) => r.top));
    const r = Math.max(...rects.map((r) => r.right)), b = Math.max(...rects.map((r) => r.bottom));
    return { x: Math.floor(x + scrollX) - 8, y: Math.floor(y + scrollY) - 8, width: Math.ceil(r - x) + 16, height: Math.ceil(b - y) + 16 };
  }, selectors);

async function still(page, name, selectors, meta) {
  const clip = await rectOf(page, selectors);
  const path = `${out}/raw/${name}.png`;
  await page.screenshot({ path, clip, fullPage: true });
  const elapsed = await page.getByLabel("Elapsed simulated time").textContent();
  log.push({ name, kind: "still", clip, elapsed, ...meta });
  console.log("still", name, elapsed, JSON.stringify(clip));
}

// Screencast frames for a duration, then encode an H.264 clip cropped to `selectors`.
async function record(page, name, selectors, seconds, during, meta) {
  const clip = await rectOf(page, selectors);
  await page.setViewportSize({ width: page.viewportSize().width, height: Math.max(page.viewportSize().height, clip.height + 120) });
  await page.evaluate((y) => window.scrollTo(0, y - 104), clip.y);
  await page.waitForTimeout(400);
  const vp = await page.evaluate(() => ({ sy: scrollY, dpr: devicePixelRatio }));
  const dir = `${out}/raw/${name}-frames`;
  await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`;
    frames.push({ file, t: metadata.timestamp });
    await writeFile(file, Buffer.from(data, "base64"));
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92 });
  const start = Date.now();
  if (during) await during(page);
  const rest = seconds * 1000 - (Date.now() - start);
  if (rest > 0) await page.waitForTimeout(rest);
  await cdp.send("Page.stopScreencast");
  await page.waitForTimeout(300);
  const lines = [];
  frames.forEach((f, i) => {
    const next = frames[i + 1]?.t ?? f.t + 1 / 30;
    lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1).file}'`);
  await writeFile(`${dir}/list.txt`, lines.join("\n"));
  const s = vp.dpr;
  const cx = Math.max(0, clip.x) * s, cy = (clip.y - vp.sy) * s;
  const cw = Math.floor((clip.width * s) / 2) * 2, ch = Math.floor((clip.height * s) / 2) * 2;
  const mp4 = `${out}/raw/${name}.mp4`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", `${dir}/list.txt`,
    "-vf", `crop=${cw}:${ch}:${cx}:${cy},fps=30,format=yuv420p`, "-an", "-c:v", "libx264", "-profile:v", "high",
    "-preset", "slow", "-crf", "24", "-movflags", "+faststart", mp4]);
  log.push({ name, kind: "video", clip, frames: frames.length, seconds, ...meta });
  console.log("video", name, frames.length, "frames");
}

const select = (page, label, option) => page.getByLabel(label, { exact: true }).selectOption({ label: option });
const sliderEnd = async (page, name, key = "End") => { const s = page.getByRole("slider", { name }); await s.focus(); await page.keyboard.press(key); };

const C1 = { road: '[aria-label="Road"]', meas: '[aria-label="Live measurements"]', controls: '[aria-label="Simulation controls"]' };
const c1Charts = async (page) => page.evaluate(() => { const h = [...document.querySelectorAll("h2")].find((x) => x.textContent === "Time-space diagram"); h.closest("section, div").parentElement.id = "c1-charts"; h.closest("section, div").id = "c1-timespace"; });
const C2 = { corridor: '[aria-label="Traffic corridor"]', settings: '[aria-label="Traffic and signal settings"]', controls: '[aria-label="Simulation controls"]' };
const c2Meas = async (page) => page.evaluate(() => { const h = [...document.querySelectorAll("h2")].find((x) => x.textContent === "Live measurements"); h.parentElement.id = "c2-measurements"; });

const jobs = {
  async c1Corridor() {
    for (const mode of ["Green wave", "Reverse wave"]) {
      const { page, context, errors } = await open(1);
      await c1Charts(page);
      await select(page, "Signal coordination", mode);
      await page.getByRole("button", { name: "Restart run" }).click();
      await select(page, "Playback", "16× real time");
      await page.waitForTimeout(26000);
      await select(page, "Playback", "2× real time");
      await page.waitForTimeout(1500);
      const slug = mode === "Green wave" ? "greenwave" : "reversewave";
      await still(page, `c1-corridor-${slug}`, [C1.controls, C1.road, C1.meas, "#c1-charts"], { candidate: 1, scenario: "Signal corridor", settings: `${mode}, defaults otherwise` });
      await still(page, `c1-corridor-${slug}-timespace`, ["#c1-timespace"], { candidate: 1, scenario: "Signal corridor", settings: `${mode}, defaults otherwise` });
      log.push({ name: `c1-corridor-${slug}`, errors });
      await context.close();
    }
  },
  async c1LaneDrop() {
    const { page, context, errors } = await open(1);
    await c1Charts(page);
    await select(page, "Scenario", "Lane drop");
    await select(page, "Playback", "16× real time");
    await page.waitForTimeout(26000);
    await select(page, "Playback", "2× real time");
    await page.waitForTimeout(1500);
    await still(page, "c1-lanedrop", [C1.controls, C1.road, C1.meas, "#c1-charts"], { candidate: 1, scenario: "Lane drop", settings: "defaults (3600 veh/h)" });
    log.push({ name: "c1-lanedrop", errors });
    await context.close();
  },
  async c1Ring() {
    const { page, context, errors } = await open(1);
    await c1Charts(page);
    await select(page, "Scenario", "Ring road");
    await select(page, "Playback", "2× real time");
    await page.waitForTimeout(20000);
    await record(page, "c1-ring-brake", [C1.road, C1.meas, "#c1-timespace"], 24, async (p) => {
      await p.waitForTimeout(2500);
      await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Brake one car").click());
    }, { candidate: 1, scenario: "Ring road", settings: "defaults (34 vehicles, 0.6 m/s²), 2× playback, Brake one car at ~2.5 s" });
    await page.waitForTimeout(12000);
    await still(page, "c1-ring-jam", [C1.controls, C1.road, C1.meas, "#c1-charts"], { candidate: 1, scenario: "Ring road", settings: "defaults, one brake tap" });
    await still(page, "c1-ring-jam-timespace", ["#c1-timespace"], { candidate: 1, scenario: "Ring road", settings: "defaults, one brake tap" });
    log.push({ name: "c1-ring", errors });
    await context.close();
  },
  async c2Rush() {
    const { page, context, errors } = await open(2);
    await select(page, "Scenario", "Rush hour");
    await select(page, "Speed", "8× real time");
    await page.waitForTimeout(8000);
    await select(page, "View", "Signal 1");
    await select(page, "Speed", "4× real time");
    await page.waitForTimeout(500);
    await record(page, "c2-rush-signal1", [C2.corridor, C2.settings], 24, null, { candidate: 2, scenario: "Rush hour", settings: "defaults (EB 2000, WB 1200, side 400 veh/h), View: Signal 1, 4× playback after ~64 s at 8×" });
    await select(page, "Speed", "8× real time");
    await page.waitForTimeout(20000);
    await select(page, "Speed", "1× real time");
    await page.waitForTimeout(800);
    await c2Meas(page);
    await still(page, "c2-rush-signal1", [C2.controls, C2.corridor, C2.settings], { candidate: 2, scenario: "Rush hour", settings: "defaults, View: Signal 1" });
    await still(page, "c2-rush-measurements", ["#c2-measurements"], { candidate: 2, scenario: "Rush hour", settings: "defaults" });
    log.push({ name: "c2-rush", errors });
    await context.close();
  },
  async c2GreenWave() {
    for (const offset of ["15", "0"]) {
      const { page, context, errors } = await open(2);
      await select(page, "Scenario", "Green wave");
      if (offset === "0") { await sliderEnd(page, "Offset between signals", "Home"); await page.getByRole("button", { name: "Restart run" }).click(); }
      await select(page, "Speed", "8× real time");
      await page.waitForTimeout(30000);
      await select(page, "Speed", "1× real time");
      await page.waitForTimeout(800);
      await c2Meas(page);
      await still(page, `c2-greenwave-offset${offset}`, [C2.controls, C2.corridor, C2.settings, "#c2-measurements"], { candidate: 2, scenario: "Green wave", settings: `offset ${offset} s, preset otherwise` });
      await still(page, `c2-greenwave-offset${offset}-measurements`, ["#c2-measurements"], { candidate: 2, scenario: "Green wave", settings: `offset ${offset} s` });
      log.push({ name: `c2-greenwave-${offset}`, errors });
      await context.close();
    }
  },
  async c2Mobile() {
    const { page, context, errors } = await open(2, { width: 390, height: 844, dpr: 2 });
    await select(page, "Scenario", "Rush hour");
    await select(page, "Speed", "8× real time");
    await page.waitForTimeout(12000);
    await select(page, "Speed", "1× real time");
    await page.waitForTimeout(800);
    await still(page, "c2-mobile-corridor", [C2.corridor], { candidate: 2, scenario: "Rush hour", settings: "defaults, 390 px viewport @2x" });
    log.push({ name: "c2-mobile", errors });
    await context.close();
  },
  async c1Mobile() {
    const { page, context, errors } = await open(1, { width: 390, height: 844, dpr: 2 });
    await c1Charts(page);
    await select(page, "Scenario", "Ring road");
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Brake one car" }).click();
    await select(page, "Playback", "4× real time");
    await page.waitForTimeout(15000);
    await select(page, "Playback", "1× real time");
    await still(page, "c1-mobile-ring", [C1.road], { candidate: 1, scenario: "Ring road", settings: "defaults, one brake tap, 390 px viewport @2x" });
    await still(page, "c1-mobile-timespace", ["#c1-timespace"], { candidate: 1, scenario: "Ring road", settings: "defaults, one brake tap, 390 px viewport @2x" });
    log.push({ name: "c1-mobile", errors });
    await context.close();
  },
};

const names = only ? only.split(",") : Object.keys(jobs);
await Promise.all(names.map((n) => jobs[n]()));
await writeFile(`${out}/raw/capture-log-${only ?? "all"}.json`, JSON.stringify(log, null, 2));
await browser.close();
