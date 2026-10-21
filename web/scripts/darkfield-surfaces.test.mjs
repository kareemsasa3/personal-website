// web/scripts/darkfield-surfaces.test.mjs: Phase 5 static invariants (governed interface around creative content).
import test from "node:test";
import assert from "node:assert/strict";
import { read, governed, declarations, innermost, where, NATIVE, NATIVE_KEYFRAMES, PHASE5, NATIVE5, HOLDS5, DEAD_RULES5 } from "./darkfield-css-scope.mjs";

// Stylesheets a Phase 5 task has finished; the rules below hold for these. Task 24 requires DONE5 to equal PHASE5.
export const DONE5 = [];
const decls5 = async () => {
  const out = [];
  for (const file of (await governed(".css")).filter((f) => DONE5.includes(f))) {
    const skip = [...(NATIVE5[file] ?? []), ...(DEAD_RULES5[file] ?? [])];
    // Native keyframes, and dead ones named by their at-rule in DEAD_RULES5.
    const frames = [...(NATIVE_KEYFRAMES[file] ?? []).map((k) => `@keyframes ${k}`), ...skip.filter((s) => s.startsWith("@keyframes "))];
    for (const d of declarations(await read(file))) {
      if (!skip.includes(innermost(d.selector)) && !frames.includes(d.selector.split(" >> ")[0])) out.push({ file, ...d });
    }
  }
  return out;
};
const held = (d) => (HOLDS5[d.file] ?? []).some(([s, p]) => s === innermost(d.selector) && p === d.prop);
const LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(|\b(white|black|red|green|blue|gray|grey|silver|gold|yellow)\b/i;
const RETIRED = /var\(--(terminal-|text-color|accent-color|hover-color|spacing-|border-radius-|transition-)/;
const UNTOKENED_TIME = /(?<![\w-])\d*\.?\d+m?s\b|\b(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier|steps)\b(?![\w-])/;

test("P5 scope: NATIVE5 covers Phase 2's NATIVE, every listed selector exists, DONE5 is within PHASE5", async () => {
  for (const [file, sels] of Object.entries(NATIVE)) for (const s of sels) assert.ok((NATIVE5[file] ?? []).includes(s), `${file} ${s}`);
  for (const [file, sels] of Object.entries(NATIVE5)) {
    const present = new Set(declarations(await read(file)).map((d) => innermost(d.selector)));
    for (const s of sels) assert.ok(present.has(s), `${file} ${s}`);
  }
  assert.deepEqual(DONE5.filter((f) => !PHASE5.includes(f)), []);
});
test("P5 colour: finished files name colours through tokens only, except holds", async () => {
  assert.deepEqual((await decls5()).filter((d) => LITERAL.test(d.value) && !held(d) && !/^(content|font-family|grid-template-areas)$/.test(d.prop)).map(where), []);
});
test("P5 geometry: square corners", async () => {
  assert.deepEqual((await decls5()).filter((d) => /radius$/.test(d.prop) && !/^(0|var\(--radius-0\))$/.test(d.value)).map(where), []);
});
test("P5 type: families and type metrics only through tokens or the generated classes", async () => {
  const bad = (await decls5()).filter((d) => (d.prop === "font-family" && !/^(inherit|var\(--font-(sans|narrow|mono)\))$/.test(d.value)) ||
    (/^(font|font-size|line-height|letter-spacing|font-weight)$/.test(d.prop) && !/^(inherit|var\(--[a-z0-9-]+\))$/.test(d.value)));
  assert.deepEqual(bad.map(where), []);
});
test("P5 timing and variables: token-timed motion; no retired variable read; no theme-keyed rule", async () => {
  const d5 = await decls5();
  const bad = d5.filter((d) => (/^(transition|animation)(-duration|-timing-function|-delay)?$/.test(d.prop) && d.value !== "none" &&
    (UNTOKENED_TIME.test(d.value.replace(/var\([^)]*\)/g, "")) || /\ball\b/.test(d.value))) || RETIRED.test(d.value) ||
    (/\[data-theme/.test(d.selector) && !held(d)));
  assert.deepEqual(bad.map(where), []);
});
test("P5 parser: custom property names with digits and escapes are parsed; standard properties as before", () => {
  const css = ":root { --space-0\\.5: 2px; --surface-3: var(--x); }\n@media (min-width: 1px) { .a:hover { color: red; --traffic-speed-4: #000; } }";
  assert.deepEqual(declarations(css).map((d) => `${d.selector} ${d.prop}`),
    [":root --space-0\\.5", ":root --surface-3", "@media (min-width: 1px) >> .a:hover color", "@media (min-width: 1px) >> .a:hover --traffic-speed-4"]);
});
test("P5 holds: every HOLDS5 pair names a real declaration", async () => {
  for (const [file, pairs] of Object.entries(HOLDS5)) {
    const present = new Set(declarations(await read(file)).map((d) => `${innermost(d.selector)} ${d.prop}`));
    for (const [s, p] of pairs) assert.ok(present.has(`${s} ${p}`), `${file} ${s} ${p}`);
  }
});
