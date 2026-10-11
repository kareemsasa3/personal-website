// web/scripts/darkfield-runtime.test.mjs
// Public verification of the runtime token artifact (D2b, D11(b)): exact schema, value grammar, and
// no private metadata. It cannot prove derivation from the private canonical file; that is the
// credentialed canonical verification (darkfield-source.mjs --verify).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dir = resolve(import.meta.dirname, "../src/styles/darkfield");
const runtime = JSON.parse(await readFile(resolve(dir, "tokens.runtime.json"), "utf8"));
const THEMES = ["dark", "light", "mono"];
const UNTHEMED = ["spacing", "radius", "cut", "stroke", "dash", "opacity", "duration", "easing", "grid", "layer"];
const keys = (o) => Object.keys(o).sort();

const NAME = /^[a-z][a-z0-9-]*(\.[0-9]+)?$/;
const PX = /^\d+(\.\d+)?px$/;
const SHADOW_ITEM = "(?:-?\\d+(?:\\.\\d+)?(?:px)? ){2,4}#[0-9a-f]{6,8}";
const GRAMMAR = {
  color: /^#[0-9a-f]{6}$/,
  shadow: new RegExp(`^(none|${SHADOW_ITEM}(, ${SHADOW_ITEM})*)$`),
  spacing: PX,
  radius: /^(0|50%)$/,
  cut: PX,
  stroke: PX,
  dash: /^\d+( \d+)+$/,
  opacity: /^(0|1|0\.\d+)$/,
  duration: /^\d+ms$/,
  easing: /^(linear|cubic-bezier\((-?\d*\.?\d+, ){3}-?\d*\.?\d+\)|steps\(\d+, (start|end)\))$/,
  grid: /^\d+(px|ch)?$/,
  layer: /^\d+$/,
};
const FONT_NAME = '(?:"[A-Z][A-Za-z0-9 -]*"|[A-Za-z][A-Za-z-]*)';
const STACK = new RegExp(`^${FONT_NAME}(, ${FONT_NAME})*$`);

test("top level has exactly the runtime groups", () => {
  assert.deepEqual(keys(runtime), ["color", "schema", "shadow", "type", "version", ...UNTHEMED].sort());
  assert.equal(runtime.schema, "darkfield-runtime/1");
  assert.ok(Number.isInteger(runtime.version));
});

test("themed tokens carry exactly a name and one value per theme", () => {
  assert.deepEqual(runtime.color.themes, THEMES.map((id) => ({ id })));
  assert.deepEqual(keys(runtime.color), ["themes", "tokens"]);
  assert.deepEqual(keys(runtime.shadow), ["tokens"]);
  for (const group of ["color", "shadow"]) {
    assert.ok(runtime[group].tokens.length > 0, group);
    for (const t of runtime[group].tokens) {
      assert.deepEqual(keys(t), ["name", "value"], `${group} ${t.name}`);
      assert.match(t.name, NAME);
      assert.deepEqual(keys(t.value), [...THEMES].sort(), `${group} ${t.name}`);
      for (const id of THEMES) assert.match(t.value[id], GRAMMAR[group], `${group} ${t.name} ${id}`);
    }
  }
});

test("unthemed tokens carry exactly a name and a grammatical value", () => {
  for (const group of UNTHEMED) {
    assert.deepEqual(keys(runtime[group]), ["tokens"], group);
    assert.ok(runtime[group].tokens.length > 0, group);
    for (const t of runtime[group].tokens) {
      assert.deepEqual(keys(t), ["name", "value"], `${group} ${t.name}`);
      assert.match(t.name, NAME);
      assert.match(t.value, GRAMMAR[group], `${group} ${t.name}`);
    }
  }
});

test("type data carries only fonts, families and style metrics", () => {
  assert.deepEqual(keys(runtime.type), ["families", "fonts", "groups"]);
  assert.deepEqual(keys(runtime.type.families), ["mono", "narrow", "sans"]);
  for (const stack of Object.values(runtime.type.families)) assert.match(stack, STACK);
  for (const f of runtime.type.fonts) {
    assert.deepEqual(keys(f), ["family", "file", "style", "weight"]);
    assert.match(f.family, /^[A-Z][A-Za-z ]*$/);
    assert.match(f.file, /^fonts\/[A-Za-z0-9-]+\.woff2$/);
    assert.match(f.weight, /^\d{3}( \d{3})?$/);
    assert.match(f.style, /^(normal|italic)$/);
  }
  for (const g of runtime.type.groups) {
    assert.deepEqual(keys(g), ["family", "styles"]);
    assert.ok(["sans", "narrow", "mono"].includes(g.family));
    for (const s of g.styles) {
      assert.ok(keys(s).every((k) => ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "name"].includes(k)), s.name);
      assert.match(s.name, NAME);
      assert.match(s.fontSize, PX);
      assert.match(s.lineHeight, /^\d+(\.\d+)?(px)?$/);
      assert.ok(Number.isInteger(s.fontWeight) && s.fontWeight >= 100 && s.fontWeight <= 900, s.name);
      if ("letterSpacing" in s) assert.match(s.letterSpacing, /^(0|-?\d*\.?\d+em)$/);
    }
  }
});
