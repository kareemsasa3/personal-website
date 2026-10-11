// web/scripts/darkfield-source.mjs
// Canonical verification: run only in an authorized environment holding a checkout of the private
// canonical repository at the pinned tag. A public checkout cannot run it and cannot by itself prove
// that the runtime export derives from the canonical source.
// node scripts/darkfield-source.mjs --verify <canonical-dir>
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { exportRuntime } from "./darkfield-export.mjs";

const web = resolve(import.meta.dirname, "..");
const flag = process.argv.indexOf("--verify");
if (flag === -1 || !process.argv[flag + 1]) {
  console.error("usage: node scripts/darkfield-source.mjs --verify <canonical-dir>");
  process.exit(2);
}
const canonicalDir = resolve(process.argv[flag + 1]);
const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`MISMATCH ${message}`);
};

for (const [vendored, entry] of Object.entries(source.files)) {
  const local = await readFile(resolve(web, vendored));
  if (entry.from) {
    // Copied files (fonts, licences): byte-identical to their canonical counterparts.
    const canonical = await readFile(resolve(canonicalDir, entry.from));
    if (sha(canonical) !== entry.sha256 || sha(local) !== entry.sha256) fail(vendored);
  } else if (entry.derivedFrom) {
    // Derived runtime tokens: re-export from the pinned canonical file and require identical bytes.
    const canonicalBytes = await readFile(resolve(canonicalDir, entry.derivedFrom));
    if (sha(canonicalBytes) !== entry.sourceSha256) fail(`${vendored}: canonical ${entry.derivedFrom} hash`);
    const canonical = JSON.parse(canonicalBytes.toString("utf8"));
    const exported = exportRuntime(canonical);
    if (exported !== local.toString("utf8") || sha(exported) !== entry.sha256) fail(`${vendored}: re-export differs`);
  } else {
    fail(`${vendored}: entry has neither from nor derivedFrom`);
  }
}
if (failures) process.exit(1);
console.log(`verified ${Object.keys(source.files).length} files against ${canonicalDir}`);
