// web/scripts/darkfield-source.mjs
// Canonical verification: run only in an authorized environment holding a clone of the private
// canonical repository, checked out at the pinned tag. A public checkout cannot run it and cannot by
// itself prove that the runtime export derives from the canonical source.
// node scripts/darkfield-source.mjs --verify <canonical-dir>
// Local identity: <canonical-dir> must be the root of a git checkout whose annotated tag resolves to
// the commit pinned in SOURCE.json, with HEAD at that commit. Every canonical file is then read from
// that commit's blobs, never from the working tree, with git replace refs ignored. It trusts the object
// store of the fresh clone made by the same-session identity check: git does not re-hash objects on read.
// Remote identity is that authenticated owner-account check; a local origin URL proves nothing.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportRuntime, parseCanonical } from "./darkfield-export.mjs";

const COMMIT = /^[0-9a-f]{40}$/;
const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const BLOB_PATH = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

// git, confined to the canonical checkout: GIT_* variables that could redirect it are dropped, and
// --no-replace-objects stops refs/replace/* from substituting the objects it reads.
const gitIn = (dir) => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
  return (...args) => {
    try {
      return execFileSync("git", ["--no-replace-objects", "-C", dir, ...args], { env, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 });
    } catch {
      return null;
    }
  };
};

export const verifyCanonical = async (canonicalDir, source, web) => {
  const failures = [];
  const fail = (message) => failures.push(message);
  const git = gitIn(canonicalDir);
  const line = (bytes) => bytes?.toString("utf8").trim();
  const { tag, commit } = source.canonical;

  // Identity first; nothing is read from the checkout until it holds.
  if (!COMMIT.test(commit) || !TAG.test(tag)) fail("SOURCE.json: canonical tag or commit is malformed");
  else if (line(git("rev-parse", "--show-toplevel")) !== (await realpath(canonicalDir).catch(() => null))) fail("canonical: not the root of a git checkout");
  else if (line(git("cat-file", "-t", `refs/tags/${tag}`)) !== "tag") fail(`canonical: ${tag} is not an annotated tag`);
  else if (line(git("rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`)) !== commit) fail(`canonical: ${tag} does not resolve to ${commit}`);
  else if (line(git("rev-parse", "--verify", "--quiet", "HEAD")) !== commit) fail(`canonical: HEAD is not ${commit}`);
  if (failures.length) return failures;

  // Canonical bytes come from the pinned commit's blobs, so working-tree edits cannot affect the result.
  const pinned = (path) => (BLOB_PATH.test(path) ? git("cat-file", "blob", `${commit}:${path}`) : null);

  for (const [vendored, entry] of Object.entries(source.files)) {
    const local = await readFile(resolve(web, vendored));
    if (entry.from) {
      // Copied files (fonts, licences): byte-identical to their canonical counterparts.
      const canonical = pinned(entry.from);
      if (!canonical || sha(canonical) !== entry.sha256 || sha(local) !== entry.sha256) fail(vendored);
    } else if (entry.derivedFrom) {
      // Derived runtime tokens: re-export from the pinned canonical file and require identical bytes.
      const canonicalBytes = pinned(entry.derivedFrom);
      if (!canonicalBytes || sha(canonicalBytes) !== entry.sourceSha256) {
        fail(`${vendored}: canonical ${entry.derivedFrom} hash`);
        continue;
      }
      const canonical = parseCanonical(canonicalBytes);
      const exported = exportRuntime(canonical);
      if (exported !== local.toString("utf8") || sha(exported) !== entry.sha256) fail(`${vendored}: re-export differs`);
    } else {
      fail(`${vendored}: entry has neither from nor derivedFrom`);
    }
  }
  return failures;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const flag = process.argv.indexOf("--verify");
  if (flag === -1 || !process.argv[flag + 1]) {
    console.error("usage: node scripts/darkfield-source.mjs --verify <canonical-dir>");
    process.exit(2);
  }
  const web = resolve(import.meta.dirname, "..");
  const canonicalDir = resolve(process.argv[flag + 1]);
  const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
  const failures = await verifyCanonical(canonicalDir, source, web);
  for (const message of failures) console.error(`MISMATCH ${message}`);
  if (failures.length) process.exit(1);
  console.log(`verified ${Object.keys(source.files).length} files against ${canonicalDir}`);
}
