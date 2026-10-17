// Runs visual-review.mjs end to end against two local fixture servers, so the
// capture, clipping, diff, network, and overflow behavior is checked with a real
// browser. Uses the standalone browser-test convention; no new dependency.
// node scripts/visual-review-browser-test.mjs [Playwright module] [browser executable]
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = new URL("./visual-review.mjs", import.meta.url).pathname;
const playwright = process.argv[2] || "playwright";
const browserPath = process.argv[3];

// Each route renders the same page on both sides except where `marker` says.
// The app's readiness contract is the app-ready class, so fixtures set it.
const page = ({ height, marker = "", markerTop = 0, extra = "" }) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;background:#111;color:#eee;font:16px monospace}</style></head>
<body><div style="position:relative;height:${height}px">
<p style="position:absolute;top:${markerTop}px;left:20px;margin:0">${marker}</p>${extra}</div>
<script>document.documentElement.classList.add("app-ready")</script></body></html>`;

const ROUTES = {
  "/tall-below": (side) => page({ height: 6000, marker: side === "head" ? "HEAD CHANGE" : "base text", markerTop: 5000 }),
  "/tall-above": (side) => page({ height: 6000, marker: side === "head" ? "HEAD CHANGE" : "base text", markerTop: 300 }),
  "/tall-same": () => page({ height: 6000, marker: "same", markerTop: 5000 }),
  "/short-changed": (side) => page({ height: 1200, marker: side === "head" ? "HEAD CHANGE" : "base text", markerTop: 300 }),
  "/short-same": () => page({ height: 1200, marker: "same", markerTop: 300, extra: '<img src="https://example.invalid/pixel.png" alt="">' }),
  "/wide": () => page({ height: 800, marker: "wide", extra: '<div style="width:600px;height:10px;background:#333"></div>' }),
};

const serve = (side) =>
  new Promise((ready) => {
    const server = createServer((request, response) => {
      const route = new URL(request.url, "http://x").pathname;
      const render = ROUTES[route];
      response.writeHead(render ? 200 : 404, { "content-type": "text/html" });
      response.end(render ? render(side) : "not found");
    });
    server.listen(0, "127.0.0.1", () => ready(server));
  });

const base = await serve("base");
const head = await serve("head");
const out = await mkdtemp(join(tmpdir(), "visual-review-browser-"));
const url = (server) => `http://127.0.0.1:${server.address().port}`;

const exitCode = await new Promise((done) => {
  const child = execFile(
    process.execPath,
    [
      script,
      "--base-url", url(base),
      "--head-url", url(head),
      "--out", out,
      "--routes", Object.keys(ROUTES).join(" "),
      "--playwright", playwright,
      ...(browserPath ? ["--browser", browserPath] : []),
    ],
    { env: { ...process.env, GITHUB_STEP_SUMMARY: "", GITHUB_ACTIONS: "" }, maxBuffer: 16 * 1024 * 1024 },
    (error) => done(error ? error.code : 0),
  );
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
});
base.close();
head.close();

const results = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
const summary = await readFile(join(out, "summary.md"), "utf8");
const pairs = (route) => results.pairs.filter((pair) => pair.route === route);
const verdicts = (route) => pairs(route).map((pair) => pair.verdict);
const isPng = async (file) => (await readFile(join(out, file))).subarray(1, 4).toString() === "PNG";

// Clipped pages identical above 4000px must not be reported as unchanged.
assert.deepEqual(verdicts("/tall-below"), ["unverified-below-clip", "unverified-below-clip"]);
assert.deepEqual(verdicts("/tall-same"), ["unverified-below-clip", "unverified-below-clip"]);
assert.ok(pairs("/tall-below").every((pair) => pair.base.clipped && pair.head.clipped && pair.head.height === 6000));
assert.match(summary, /\| `\/tall-below` \| desktop 1440x900 \| unverified-below-clip \|/);
assert.doesNotMatch(summary, /\| `\/tall-(below|same)` \|[^|]+\| unchanged \|/);

// A clipped page that differs above the clip is still a change.
assert.deepEqual(verdicts("/tall-above"), ["changed", "changed"]);

// Coverage cannot be complete when part of a captured page was never compared.
assert.equal(results.plan.coverage, "partial");
assert.ok(results.plan.notes.some((note) => note.includes("4000px") && note.includes("/tall-below")), results.plan.notes.join("\n"));

// Changed pairs get a diff image that locates the change.
for (const pair of [...pairs("/short-changed"), ...pairs("/tall-above")]) {
  assert.equal(pair.verdict, "changed");
  assert.ok(pair.diff?.file, `${pair.id} has no diff`);
  assert.ok(await isPng(pair.diff.file), `${pair.diff.file} is not a PNG`);
  assert.ok(pair.diff.changedPixels > 0);
  assert.ok(pair.diff.rows[0] >= 290 && pair.diff.rows[1] <= 340, `${pair.id} rows ${pair.diff.rows}`);
}
for (const pair of [...pairs("/short-same"), ...pairs("/tall-below")]) assert.equal(pair.diff, null, `${pair.id} should have no diff`);

// Existing checks are intact: repeatability, viewports, network, overflow.
assert.deepEqual(verdicts("/short-same"), ["unchanged", "unchanged"]);
assert.deepEqual([...new Set(results.pairs.map((pair) => pair.viewport))], ["desktop 1440x900", "mobile 375x667"]);
assert.ok(results.pairs.every((pair) => pair.base.attempts >= 2 && pair.head.attempts >= 2));
assert.ok(pairs("/short-same").every((pair) => pair.head.blocked.length > 0 && pair.head.errors.length === 0));
assert.ok(pairs("/wide").find((pair) => pair.viewport.startsWith("mobile")).head.overflowX > 0);
for (const pair of results.pairs) {
  assert.ok(await isPng(pair.base.file));
  assert.ok((await stat(join(out, pair.head.file))).size > 0);
}

// Nothing failed to capture, so the run itself succeeds.
assert.equal(exitCode, 0);
console.log(`visual-review browser test passed (${results.pairs.length} pairs, report ${join(out, "index.html")})`);
