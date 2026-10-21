// web/scripts/darkfield-vendor.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const web = resolve(import.meta.dirname, "..");
const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
const RUNTIME = "src/styles/darkfield/tokens.runtime.json";
const COPIED = [
  "public/fonts/darkfield/Archivo-Variable-Latin.woff2",
  "public/fonts/darkfield/ArchivoNarrow-Latin-500.woff2",
  "public/fonts/darkfield/ArchivoNarrow-Latin-600.woff2",
  "public/fonts/darkfield/IBMPlexMono-Regular.woff2",
  "public/fonts/darkfield/IBMPlexMono-Medium.woff2",
  "public/fonts/darkfield/IBMPlexMono-SemiBold.woff2",
  "public/fonts/darkfield/licenses/Archivo-OFL.txt",
  "public/fonts/darkfield/licenses/Archivo-Narrow-OFL.txt",
  "public/fonts/darkfield/licenses/IBM-Plex-Mono-OFL.txt",
  "public/favicon.ico",
];
// Registered R1 files shipped after the C2PA strip in darkfield-r1.mjs (recorded as transform "c2pa-strip").
const STRIPPED = [
  "public/favicon.svg",
  "public/favicon-16.png",
  "public/favicon-32.png",
  "public/favicon-48.png",
  "public/apple-touch-icon.png",
];
const sha = async (path) => createHash("sha256").update(await readFile(resolve(web, path))).digest("hex");

test("SOURCE.json pins the canonical revision and both archives", () => {
  assert.equal(source.system, "Darkfield");
  assert.equal(source.tokensVersion, 1);
  assert.deepEqual(source.canonical, {
    location: "github.com/kareemsasa/darkfield",
    tag: "tokens-v1-2026-10-09",
    commit: "4f02965bfa51eb060c39734608422dde0d288009",
  });
  assert.equal(source.export.sha256, "018116bd43d11890f280e6eab615bcdb08e3de0871e44215d1bfa7867346b6b8");
  assert.equal(source.r1.sha256, "595d8e2ee36b1366286ff678c73ebba66f0e604ee267d8d612dfcc6f1931bb42");
  assert.deepEqual(Object.keys(source).sort(), ["canonical", "export", "files", "r1", "system", "tokensVersion"]);
  assert.deepEqual(Object.keys(source.export).sort(), ["archive", "sha256"]);
  assert.deepEqual(Object.keys(source.r1).sort(), ["archive", "sha256"]);
  assert.deepEqual(Object.keys(source.files).sort(), [RUNTIME, ...COPIED, ...STRIPPED].sort());
});

test("the runtime tokens are declared as an allowlist export of the pinned canonical tokens.json", async () => {
  const entry = source.files[RUNTIME];
  assert.deepEqual(Object.keys(entry).sort(), ["derivedFrom", "exporter", "schema", "sha256", "sourceSha256"]);
  assert.equal(entry.derivedFrom, "tokens.json");
  assert.equal(entry.sourceSha256, "942115fc42277c33b45207ff2f20cfd4e2e8283930e1e8afcaed81dcab5a9bcc");
  assert.equal(entry.schema, "darkfield-runtime/1");
  assert.equal(entry.exporter, "scripts/darkfield-export.mjs");
  await access(resolve(web, entry.exporter));
  assert.equal(await sha(RUNTIME), entry.sha256);
});

test("no canonical file is copied into the public repository except fonts, licences and registered R1 files", async () => {
  await assert.rejects(access(resolve(web, "src/styles/darkfield/tokens.json")), "the canonical tokens.json must never be committed");
  for (const path of COPIED) assert.deepEqual(Object.keys(source.files[path]).sort(), ["from", "sha256"], path);
  for (const path of COPIED) assert.match(source.files[path].from, /^(fonts\/[A-Za-z0-9-]+\.woff2|licenses\/[A-Za-z-]+-OFL\.txt|r1\/favicon\/favicon\.ico)$/, path);
  for (const path of STRIPPED) {
    const entry = source.files[path];
    assert.deepEqual(Object.keys(entry).sort(), ["from", "sha256", "sourceSha256", "transform"], path);
    assert.equal(entry.transform, "c2pa-strip", path);
    assert.match(entry.from, /^r1\/(favicon|symbol)\/[a-z0-9-]+\.(png|svg)$/, path);
    assert.match(entry.sourceSha256, /^[0-9a-f]{64}$/, path);
  }
});

for (const path of [...COPIED, ...STRIPPED]) {
  test(`${path} matches SOURCE.json`, async () => {
    assert.equal(await sha(path), source.files[path].sha256);
  });
}
