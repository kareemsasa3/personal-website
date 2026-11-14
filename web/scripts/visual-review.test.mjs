import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

// Route planning is exercised through the CLI's --plan-only mode, so these
// tests cover exactly what the workflow runs. No browser is needed.
const script = new URL("./visual-review.mjs", import.meta.url).pathname;
const run = promisify(execFile);

const plan = async (changedFiles, extraArgs = []) => {
  const dir = await mkdtemp(join(tmpdir(), "visual-review-plan-"));
  const list = join(dir, "changed.txt");
  await writeFile(list, `${changedFiles.join("\n")}\n`);
  const { stdout } = await run(process.execPath, [script, "--plan-only", "--changed-files", list, ...extraArgs], {
    env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "", GITHUB_ACTIONS: "" },
  });
  return { plan: JSON.parse(stdout), dir };
};

// PR #20: caseStudies.ts alone maps to five routes, which used to fill the
// six-route cap ahead of /journey even though timelineData.ts changed directly.
const PR20_FILES = [
  "web/public/ai/capabilities.md",
  "web/public/ai/context.md",
  "web/public/ai/projects.md",
  "web/public/ai/site-manifest.json",
  "web/public/llms.txt",
  "web/scripts/generate-ai-context.mjs",
  "web/scripts/smoke-test.mjs",
  "web/src/data/caseStudies.ts",
  "web/src/data/projects.ts",
  "web/src/data/timelineData.ts",
];

test("every directly changed file gets a route before any file gets a second", async () => {
  const { plan: result } = await plan(PR20_FILES);
  assert.ok(result.routes.includes("/journey"), `routes: ${result.routes.join(" ")}`);
  assert.ok(result.routes.includes("/projects"));
  assert.ok(result.routes.includes("/case-studies"));
  assert.equal(result.routes.length, 6);
});

test("direct routes that miss the cap are reported as unreviewed", async () => {
  const { plan: result } = await plan(PR20_FILES);
  assert.deepEqual(result.unreviewed, ["/case-studies/where-the-specification-lived"]);
  assert.equal(result.coverage, "partial");
  assert.ok(result.notes.some((note) => note.includes("Directly affected") && note.includes("/case-studies/where-the-specification-lived")));
});

test("a direct route is never displaced by fallback routes", async () => {
  const { plan: result } = await plan(["web/src/data/timelineData.ts", "web/src/index.css"]);
  assert.equal(result.routes[0], "/journey");
  assert.deepEqual(result.unreviewed, []);
});

test("AI text assets are not part of the rendered site", async () => {
  const { plan: result } = await plan([
    "web/public/ai/capabilities.md",
    "web/public/ai/contact-policy.md",
    "web/public/ai/context.md",
    "web/public/ai/projects.md",
    "web/public/ai/site-manifest.json",
    "web/public/llms.txt",
  ]);
  assert.deepEqual(result.routes, []);
  assert.equal(result.coverage, "complete");
  assert.ok(result.files.every((file) => file.kind === "ignored"));
});

test("PR #22: AI assets beside a projects change capture only /projects", async () => {
  const { plan: result } = await plan([
    "web/public/ai/projects.md",
    "web/public/ai/site-manifest.json",
    "web/src/components/ProjectRoster/ProjectRoster.css",
    "web/src/data/projects.ts",
  ]);
  assert.deepEqual(result.routes, ["/projects"]);
  assert.equal(result.coverage, "complete");
});

test("other public files still fall back to the core routes", async () => {
  const { plan: result } = await plan(["web/public/og-image.png"]);
  assert.equal(result.files[0].kind, "unmapped");
  assert.equal(result.routes.length, 6);
});

test("plan-only writes a results file when --out is given", async () => {
  const { plan: result, dir } = await plan(["web/public/llms.txt"]);
  const out = join(dir, "out");
  await run(process.execPath, [script, "--plan-only", "--changed-files", join(dir, "changed.txt"), "--out", out], {
    env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "", GITHUB_ACTIONS: "" },
  });
  const written = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
  assert.deepEqual(written.pairs, []);
  assert.deepEqual(written.plan.routes, result.routes);
  assert.ok((await readFile(join(out, "summary.md"), "utf8")).includes("No route needed a screenshot"));
});
