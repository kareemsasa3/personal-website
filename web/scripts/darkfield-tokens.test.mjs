// web/scripts/darkfield-tokens.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildTokensCss, compileTokens, OUTPUT_PATH, SOURCE_PATH } from "./darkfield-tokens.mjs";

const tokens = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
const css = compileTokens(tokens, "test");
const block = (opening) => {
  const start = css.indexOf(opening);
  assert.notEqual(start, -1, `missing block ${opening}`);
  return css.slice(start, css.indexOf("}", start));
};
const THEME_BLOCKS = {
  dark: ':root,\n[data-theme="dark"] {',
  light: '[data-theme="light"] {',
  mono: '[data-theme="mono"] {',
};

test("dark is the default theme and carries the reference values", () => {
  const dark = block(THEME_BLOCKS.dark);
  assert.match(dark, /--field: #070b08;/);
  assert.match(dark, /--signal: #6cff95;/);
  assert.match(dark, /--focus-ring: 0 0 0 2px #070b08, 0 0 0 4px #6cff95;/);
});

test("light is paper: no emission", () => {
  const light = block(THEME_BLOCKS.light);
  assert.match(light, /--field: #eff4f1;/);
  for (const glow of ["glow-trace", "glow-signal", "glow-flare", "glow-fault"]) {
    assert.match(light, new RegExp(`--${glow}: none;`));
  }
});

test("mono removes hue", () => {
  const mono = block(THEME_BLOCKS.mono);
  assert.match(mono, /--signal: #ffffff;/);
  assert.match(mono, /--coolant: #d7d7d7;/);
});

test("every themed token is defined exactly once per theme", () => {
  const themed = [...tokens.color.tokens, ...tokens.shadow.tokens].map((t) => t.name);
  for (const opening of Object.values(THEME_BLOCKS)) {
    const body = block(opening);
    for (const name of themed) {
      assert.equal(body.split(`--${name}:`).length - 1, 1, `${opening} ${name}`);
    }
  }
});

test("dotted names are escaped (§17)", () => {
  assert.match(css, /--space-0\\\.5: 2px;/);
});

test("fonts are self-hosted and swap in", () => {
  const faces = css.match(/@font-face \{[^}]*\}/g) ?? [];
  assert.equal(faces.length, tokens.type.fonts.length);
  for (const face of faces) {
    assert.match(face, /url\("\/fonts\/darkfield\/[A-Za-z0-9-]+\.woff2"\) format\("woff2"\)/);
    assert.match(face, /font-display: swap;/);
  }
});

test("labels speak in the Instrument voice; machine text has the slashed zero", () => {
  const label = block(".df-label {");
  assert.match(label, /font-family: var\(--font-narrow\);/);
  assert.match(label, /text-transform: uppercase;/);
  assert.match(block(".df-data {"), /font-feature-settings: "zero";/);
  assert.doesNotMatch(block(".df-body {"), /text-transform/);
});

test("the committed tokens.css matches tokens.runtime.json", async () => {
  assert.equal(await readFile(OUTPUT_PATH, "utf8"), await buildTokensCss());
});
