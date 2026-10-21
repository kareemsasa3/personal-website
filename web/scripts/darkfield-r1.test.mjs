// web/scripts/darkfield-r1.test.mjs
// Public tests for the C2PA strip applied to registered R1 files. The strip cases use synthetic bytes only;
// the last test checks the committed files that SOURCE.json records as stripped.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pngChunks, stripC2pa } from "./darkfield-r1.mjs";

const web = resolve(import.meta.dirname, "..");
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// A chunk is length, type, data and a CRC; the strip never reads the CRC, so a fixed placeholder serves.
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, "latin1"), Buffer.from(data), Buffer.from([1, 2, 3, 4])]);
};
const IHDR = chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
const CABX = chunk("caBX", "synthetic provenance payload");
const IDAT = chunk("IDAT", [1, 2, 3, 4, 5]);
const IEND = chunk("IEND", []);
const png = (...chunks) => Buffer.concat([SIGNATURE, ...chunks]);
const SVG_BARE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>placeholder</title><path d="M0 0H10V10H0Z"/></svg>\n';
const SVG_TAGGED = SVG_BARE.replace('viewBox="0 0 10 10">', 'xmlns:c2pa="http://c2pa.org/manifest" viewBox="0 0 10 10"><metadata>\n  <c2pa:manifest>synthetic</c2pa:manifest>\n</metadata>');

test("a PNG strips to its chunks without caBX, every other chunk byte-identical and in order", () => {
  const stripped = stripC2pa(png(IHDR, CABX, IDAT, IEND), "x.png");
  assert.deepEqual(stripped, png(IHDR, IDAT, IEND));
  assert.deepEqual(pngChunks(stripped).map((c) => c.type), ["IHDR", "IDAT", "IEND"]);
});

test("stripping is idempotent", () => {
  const once = stripC2pa(png(IHDR, CABX, IDAT, IEND), "x.png");
  assert.deepEqual(stripC2pa(once, "x.png"), once);
  const svg = stripC2pa(Buffer.from(SVG_TAGGED), "x.svg");
  assert.deepEqual(stripC2pa(svg, "x.svg"), svg);
});

test("a bad PNG signature and a truncated chunk throw", () => {
  const bad = png(IHDR, IEND);
  bad[1] = 0x51;
  assert.throws(() => stripC2pa(bad, "x.png"), /not a PNG/);
  const whole = png(IHDR, IDAT, IEND);
  assert.throws(() => stripC2pa(whole.subarray(0, whole.length - 3), "x.png"), /truncated PNG chunk/);
});

test("an SVG strips the c2pa namespace attribute and the metadata element, nothing else", () => {
  assert.notEqual(SVG_TAGGED, SVG_BARE);
  assert.equal(stripC2pa(Buffer.from(SVG_TAGGED), "x.svg").toString("utf8"), SVG_BARE);
});

test("a file type without a defined strip throws", () => {
  assert.throws(() => stripC2pa(Buffer.from([0, 0, 1, 0]), "favicon.ico"), /no strip defined/);
});

test("every file SOURCE.json records as stripped ships without C2PA data", async () => {
  const source = JSON.parse(await readFile(resolve(web, "src/styles/darkfield/SOURCE.json"), "utf8"));
  const stripped = Object.entries(source.files).filter(([, entry]) => "transform" in entry);
  assert.ok(stripped.length > 0, "SOURCE.json records no stripped file");
  for (const [path, entry] of stripped) {
    assert.equal(entry.transform, "c2pa-strip", path);
    const bytes = await readFile(resolve(web, path));
    if (path.endsWith(".png")) assert.ok(!pngChunks(bytes).some((c) => c.type === "caBX"), path);
    else if (path.endsWith(".svg")) {
      const text = bytes.toString("utf8");
      assert.ok(!text.includes("<metadata") && !text.includes("c2pa"), path);
    } else assert.fail(`${path}: unexpected stripped file type`);
  }
});
