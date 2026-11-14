import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { confinedFile, FileBoundaryError } from "./darkfield-file-boundary.mjs";
import { read as readCssSource } from "./darkfield-css-scope.mjs";

const root = await mkdtemp(join(tmpdir(), "darkfield-path-test-"));
test.after(() => rm(root, { recursive: true, force: true }));
const src = join(root, "src");
await mkdir(join(src, "components"), { recursive: true });
await writeFile(join(src, "components", "inside.css"), "synthetic css");
await writeFile(join(root, "outside.txt"), "synthetic outside");
await symlink(join(root, "outside.txt"), join(src, "escape.css"));
await symlink(join(src, "components", "inside.css"), join(src, "inside-link.css"));

test("normal file and in-tree symlink resolve inside the authorized directory", async () => {
  const file = await confinedFile(src, "components/inside.css");
  assert.equal(await readFile(file, "utf8"), "synthetic css");
  const linked = await confinedFile(src, "inside-link.css");
  assert.equal(await readFile(linked, "utf8"), "synthetic css");
});

test("absolute paths and parent traversal cannot escape the root", async () => {
  for (const path of ["../outside.txt", "components/../../outside.txt", join(root, "outside.txt")]) {
    await assert.rejects(confinedFile(src, path), FileBoundaryError);
  }
});

test("symlinks into another directory are rejected", async () => {
  await assert.rejects(confinedFile(src, "escape.css"), FileBoundaryError);
});

test("CSS reader rejects traversal and absolute paths", async () => {
  await assert.rejects(readCssSource("../package.json"), FileBoundaryError);
  await assert.rejects(readCssSource(resolve(root, "outside.txt")), FileBoundaryError);
});
