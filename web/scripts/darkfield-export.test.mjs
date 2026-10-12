// web/scripts/darkfield-export.test.mjs
// Public regression tests for the exporter's fail-closed classification and safe refusals (plan r7).
// The canonical input is synthetic: the public runtime values plus placeholder private fields. No
// canonical text is used, and none is needed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { exportRuntime, parseCanonical, RUNTIME_PATH } from "./darkfield-export.mjs";

const committed = await readFile(RUNTIME_PATH, "utf8");
const MARKER = "zq injected placeholder prose";

// A canonical-shaped input: every runtime field from the committed export, every private field a marker.
const synthetic = () => {
  const { schema, ...runtime } = JSON.parse(committed);
  assert.equal(schema, "darkfield-runtime/1");
  const canonical = { name: MARKER, ...runtime };
  for (const group of Object.values(canonical)) {
    if (!Array.isArray(group?.tokens)) continue;
    group.note = MARKER;
    for (const token of group.tokens) token.usage = MARKER;
  }
  for (const theme of canonical.color.themes) theme.name = MARKER;
  for (const group of canonical.type.groups) {
    Object.assign(group, { name: MARKER, note: MARKER });
    for (const style of group.styles) Object.assign(style, { sample: MARKER, usage: MARKER });
  }
  return canonical;
};

// Refused, and the refusal repeats neither the injected text nor the offending key.
const refuses = (canonical, pattern, key) =>
  assert.throws(
    () => exportRuntime(canonical),
    (error) => {
      assert.match(error.message, pattern);
      assert.ok(!error.message.includes("zq"), "the refusal must not repeat injected text");
      if (key) assert.ok(!error.message.includes(key), "the refusal must not repeat the offending key");
      return true;
    },
  );

test("a valid synthetic canonical input reproduces the committed runtime bytes, deterministically", () => {
  assert.equal(exportRuntime(synthetic()), committed);
  assert.equal(exportRuntime(synthetic()), exportRuntime(synthetic()));
});

test("private fields never reach the runtime output", () => {
  assert.ok(!exportRuntime(synthetic()).includes("zq"));
});

const FORGED_KEYS = [
  ["a dotted top-level key", (c) => (c["type.families.sans"] = MARKER), "type.families.sans"],
  ["a dotted nested key", (c) => (c.type["families.sans"] = MARKER), "families.sans"],
  ["a bracketed key", (c) => (c.color["tokens[].name"] = MARKER), "tokens[].name"],
  ["an empty top-level key", (c) => (c[""] = { version: MARKER }), null],
  ["a key forging a private path", (c) => (c.type.groups[0]["styles[].sample"] = MARKER), "styles[].sample"],
];
for (const [label, mutate, key] of FORGED_KEYS) {
  test(`refuses ${label}`, () => {
    const canonical = synthetic();
    mutate(canonical);
    refuses(canonical, /^invalid canonical key \(\d+ chars\) under /, key);
  });
}

test("ordinary unknown fields remain refused, named only by length", () => {
  const canonical = synthetic();
  canonical.color.tokens[0]["zq-unknown"] = MARKER;
  refuses(canonical, /^unclassified canonical fields \(classify before exporting\): color\.tokens\[\]\.<10 chars>$/, "zq-unknown");
});

test("unexpected theme ids are refused without repeating them", () => {
  const canonical = synthetic();
  canonical.color.themes[2].id = MARKER;
  refuses(canonical, /^unexpected theme ids \(expected dark,light,mono\)$/);
});

test("malformed canonical JSON is refused without quoting it", () => {
  assert.throws(() => parseCanonical(Buffer.from(`{"note": ${MARKER}}`)), {
    message: "canonical tokens.json is not valid JSON",
  });
});
