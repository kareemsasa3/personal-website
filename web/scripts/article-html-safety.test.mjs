// Exercise the real article builder on synthetic Markdown in an isolated tree.
// No published article, generated file, or repository working tree is modified.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const workspace = await mkdtemp(join(tmpdir(), "article-html-safety-test-"));
after(async () => rm(workspace, { recursive: true, force: true }));

const isolatedWeb = join(workspace, "web");
const scriptsDir = join(isolatedWeb, "scripts");
const contentDir = join(isolatedWeb, "src/content/articles");
const generatedFile = join(isolatedWeb, "src/data/generated/articles.ts");
const fixtureFile = join(contentDir, "security-regression.md");
const builderFile = join(scriptsDir, "build-articles.mjs");

await mkdir(scriptsDir, { recursive: true });
await mkdir(contentDir, { recursive: true });
await copyFile(join(projectRoot, "scripts/build-articles.mjs"), builderFile);
// Resolve the exact installed dependencies, without installing or downloading anything.
await symlink(join(projectRoot, "node_modules"), join(isolatedWeb, "node_modules"), "dir");

const safeArticle = [
  "---",
  "slug: security-regression",
  "title: Security Regression",
  "kind: essay",
  "published: 2026-11-13",
  "description: Synthetic fixture verifying article HTML safety.",
  "---",
  "",
  "# Security Regression",
  "",
  "## Context",
  "",
  "A harmless [link](https://example.invalid).",
  "",
  "## Post-article material",
  "",
  "### Abstract",
  "",
  "A normal abstract.",
  "",
  "### Sources",
  "",
  "| Source | Locator |",
  "| --- | --- |",
  "| Example | https://example.invalid |",
  "",
  "### Fact-check table",
  "",
  "| Claim | Status |",
  "| --- | --- |",
  "| Example | Verified |",
  "",
  "### Editorial note: original synthesis",
  "",
  "A normal editorial note.",
  "",
].join("\n");

const buildFixture = async (markdown) => {
  await rm(generatedFile, { force: true });
  await writeFile(fixtureFile, markdown, "utf8");
  const result = spawnSync(process.execPath, [builderFile], {
    cwd: isolatedWeb,
    encoding: "utf8",
    timeout: 30_000,
    // The test fixture does not need CI credentials or the operator's environment.
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" },
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, result.stderr);
  return result;
};

const inject = (anchor, html) => {
  assert.equal(safeArticle.split(anchor).length, 2, "fixture anchor must be unique");
  return safeArticle.replace(anchor, anchor + html + "\n\n");
};

test("valid first-party Markdown builds successfully in isolation", async () => {
  const result = await buildFixture(safeArticle);
  assert.equal(result.status, 0, result.stderr);
  const generated = await readFile(generatedFile, "utf8");
  assert.match(generated, /export const articlesData/);
  assert.match(generated, /"slug": "security-regression"/);
});

for (const { label, anchor, payload } of [
  {
    label: "Article body",
    anchor: "## Context\n\n",
    payload: '<img src=x onerror="alert(1)">',
  },
  {
    label: "Article body",
    anchor: "## Context\n\n",
    payload: '<a href="javascript:alert(1)">unsafe link</a>',
  },
  {
    label: "Abstract",
    anchor: "### Abstract\n\n",
    payload: "<script>alert(1)</script>",
  },
  {
    label: "Sources",
    anchor: "### Sources\n\n",
    payload: '<a href="javascript:alert(1)">unsafe link</a>',
  },
  {
    label: "Fact-check table",
    anchor: "### Fact-check table\n\n",
    payload: '<svg onload="alert(1)"></svg>',
  },
  {
    label: "Editorial note: original synthesis",
    anchor: "### Editorial note: original synthesis\n\n",
    payload: '<img src=x onerror="alert(1)">',
  },
]) {
  test("unsafe Markdown fails the build in " + label + ": " + payload.slice(0, 18), async () => {
    const result = await buildFixture(inject(anchor, payload));
    assert.notEqual(result.status, 0, "unsafe HTML must fail the real article build");
    const diagnostic = result.stderr + result.stdout;
    assert.match(diagnostic, /contains HTML that DOMPurify would remove/);
    assert.ok(diagnostic.includes(label), diagnostic);
    await assert.rejects(readFile(generatedFile, "utf8"), { code: "ENOENT" });
  });
}
