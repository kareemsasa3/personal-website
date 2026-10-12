// web/scripts/darkfield-source.test.mjs
// Public regression tests for the git identity checks of canonical verification (plan r7). Every
// repository here is synthetic, built from public placeholder data, so the private canonical
// repository is never needed. Requires the git command; no network and no credentials.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportRuntime, RUNTIME_PATH } from "./darkfield-export.mjs";
import { verifyCanonical } from "./darkfield-source.mjs";

const TAG = "tokens-v0-test";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const root = await mkdtemp(join(tmpdir(), "darkfield-source-test-"));
test.after(() => rm(root, { recursive: true, force: true }));

// The test's own git calls ignore the operator's configuration.
const gitEnv = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: "1" };
const git = (dir, ...args) =>
  execFileSync("git", ["-C", dir, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgSign=false", "-c", "tag.gpgSign=false", ...args], {
    env: gitEnv,
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();

// Placeholder canonical content whose export is the committed runtime file, and a placeholder font.
const runtime = await readFile(RUNTIME_PATH, "utf8");
const { schema, ...runtimeFields } = JSON.parse(runtime);
const tokensJson = `${JSON.stringify({ name: "placeholder", ...runtimeFields }, null, 2)}\n`;
const FONT = Buffer.from("placeholder font bytes");
assert.equal(schema, "darkfield-runtime/1");
assert.equal(exportRuntime(JSON.parse(tokensJson)), runtime);

const web = join(root, "web");
await mkdir(join(web, "src/styles/darkfield"), { recursive: true });
await mkdir(join(web, "public/fonts/darkfield"), { recursive: true });
await writeFile(join(web, "src/styles/darkfield/tokens.runtime.json"), runtime);
await writeFile(join(web, "public/fonts/darkfield/Placeholder.woff2"), FONT);
const FONT_ENTRY = "public/fonts/darkfield/Placeholder.woff2";
const files = {
  "src/styles/darkfield/tokens.runtime.json": {
    derivedFrom: "tokens.json",
    sourceSha256: sha(tokensJson),
    exporter: "scripts/darkfield-export.mjs",
    schema: "darkfield-runtime/1",
    sha256: sha(runtime),
  },
  [FONT_ENTRY]: { from: "fonts/Placeholder.woff2", sha256: sha(FONT) },
};
const sourceFor = (commit) => ({ canonical: { location: "example.invalid/canonical", tag: TAG, commit }, files });

let count = 0;
const plainDir = async () => {
  const dir = join(root, `plain-${++count}`);
  await mkdir(join(dir, "fonts"), { recursive: true });
  await writeFile(join(dir, "tokens.json"), tokensJson);
  await writeFile(join(dir, "fonts/Placeholder.woff2"), FONT);
  return dir;
};
// A synthetic canonical repository: one commit with the placeholder files, an optional tag on it,
// and optionally a later commit that HEAD moves to.
const repo = async ({ tag = "annotated", later = false } = {}) => {
  const dir = await plainDir();
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "canonical");
  const pinned = git(dir, "rev-parse", "HEAD");
  if (tag === "annotated") git(dir, "tag", "-a", "-m", "pin", TAG);
  if (tag === "lightweight") git(dir, "tag", TAG);
  if (later) git(dir, "commit", "-q", "--allow-empty", "-m", "later");
  return { dir, pinned, head: git(dir, "rev-parse", "HEAD") };
};
// The authorized arrangement: a clone checked out (detached) at the tag, optionally shallow.
const cloneAtTag = (origin, ...options) => {
  const dir = join(root, `clone-${++count}`);
  git(root, "clone", "-q", ...options, "--branch", TAG, `file://${origin}`, dir);
  return dir;
};

test("a detached clone at the pinned annotated tag verifies", async () => {
  const { dir, pinned } = await repo();
  assert.deepEqual(await verifyCanonical(cloneAtTag(dir), sourceFor(pinned), web), []);
});

test("a shallow clone at the pinned annotated tag verifies", async () => {
  const { dir, pinned } = await repo();
  assert.deepEqual(await verifyCanonical(cloneAtTag(dir, "--depth", "1"), sourceFor(pinned), web), []);
});

test("working-tree edits do not change what is verified: canonical bytes come from the pinned commit", async () => {
  const { dir, pinned } = await repo();
  const clone = cloneAtTag(dir);
  await writeFile(join(clone, "tokens.json"), "not json");
  await writeFile(join(clone, "fonts/Placeholder.woff2"), "edited");
  assert.deepEqual(await verifyCanonical(clone, sourceFor(pinned), web), []);
});

test("a replace ref cannot substitute canonical bytes", async () => {
  const { dir, pinned } = await repo();
  const clone = cloneAtTag(dir);
  const forged = "forged font bytes";
  await writeFile(join(root, "forged"), forged);
  git(clone, "replace", git(clone, "rev-parse", `${pinned}:fonts/Placeholder.woff2`), git(clone, "hash-object", "-w", join(root, "forged")));
  assert.equal(git(clone, "cat-file", "blob", `${pinned}:fonts/Placeholder.woff2`), forged, "plain git follows the replace ref");
  const forgedWeb = join(root, `web-${++count}`);
  await mkdir(join(forgedWeb, "src/styles/darkfield"), { recursive: true });
  await mkdir(join(forgedWeb, "public/fonts/darkfield"), { recursive: true });
  await writeFile(join(forgedWeb, "src/styles/darkfield/tokens.runtime.json"), runtime);
  await writeFile(join(forgedWeb, FONT_ENTRY), forged);
  const source = sourceFor(pinned);
  source.files = { ...files, [FONT_ENTRY]: { ...files[FONT_ENTRY], sha256: sha(forged) } };
  assert.deepEqual(await verifyCanonical(clone, source, forgedWeb), [FONT_ENTRY]);
});

test("committed canonical content is still checked against SOURCE.json", async () => {
  const { dir, pinned } = await repo();
  const source = sourceFor(pinned);
  source.files = { ...files, [FONT_ENTRY]: { ...files[FONT_ENTRY], sha256: sha("other bytes") } };
  assert.deepEqual(await verifyCanonical(cloneAtTag(dir), source, web), [FONT_ENTRY]);
});

test("a plain directory fails", async () => {
  const { pinned } = await repo();
  assert.deepEqual(await verifyCanonical(await plainDir(), sourceFor(pinned), web), ["canonical: not the root of a git checkout"]);
});

test("a plain directory inside another checkout fails", async () => {
  const { dir, pinned } = await repo();
  const nested = join(dir, "fonts");
  assert.deepEqual(await verifyCanonical(nested, sourceFor(pinned), web), ["canonical: not the root of a git checkout"]);
});

test("GIT_DIR in the environment cannot make a plain directory pass", async () => {
  const { dir, pinned } = await repo();
  const saved = process.env.GIT_DIR;
  process.env.GIT_DIR = join(dir, ".git");
  try {
    assert.deepEqual(await verifyCanonical(await plainDir(), sourceFor(pinned), web), ["canonical: not the root of a git checkout"]);
  } finally {
    if (saved === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = saved;
  }
});

test("a missing tag fails", async () => {
  const { dir, pinned } = await repo({ tag: "none" });
  assert.deepEqual(await verifyCanonical(dir, sourceFor(pinned), web), [`canonical: ${TAG} is not an annotated tag`]);
});

test("a lightweight tag fails", async () => {
  const { dir, pinned } = await repo({ tag: "lightweight" });
  assert.deepEqual(await verifyCanonical(dir, sourceFor(pinned), web), [`canonical: ${TAG} is not an annotated tag`]);
});

test("an annotated tag resolving to a commit other than the pin fails", async () => {
  const { dir, head } = await repo({ later: true });
  assert.deepEqual(await verifyCanonical(dir, sourceFor(head), web), [`canonical: ${TAG} does not resolve to ${head}`]);
});

test("HEAD moved off the pinned commit fails", async () => {
  const { dir, pinned } = await repo({ later: true });
  assert.deepEqual(await verifyCanonical(dir, sourceFor(pinned), web), [`canonical: HEAD is not ${pinned}`]);
});

test("a malformed pin fails before git is consulted", async () => {
  const { dir } = await repo();
  assert.deepEqual(await verifyCanonical(dir, sourceFor("HEAD"), web), ["SOURCE.json: canonical tag or commit is malformed"]);
});
