// web/scripts/darkfield-measure.test.mjs
// Public regression tests for the conformance measurement library. Colours come from tokens.css or from
// synthetic fixtures; fixture numbers are arbitrary and stand for no Darkfield value or limit.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Script } from "node:vm";
import {
  DEFAULT_TOLERANCE, EXCLUDED, EXCLUSION_DILATION_PX, IDLE_ALLOWED, LIVE_READOUTS, MEASURE_NATIVE, MONO_DEVIATIONS,
  MONO_ROUNDING, P5_GOVERNED_IN_NATIVE, P5_NATIVE, P5_NATIVE_GROUND, PAGE_PREDICATES, TIERS, UNCLASSIFIED,
  boxMask, chroma, classify, deltaE76, largestComponent, monoChromaThreshold, nativeOwnBoxes, nativeSubtreeBoxes,
  ownPaintExcluded, parseTokenColours, srgbToLab, subtreeExcluded, tierBounds, tierOf, verdict,
} from "./darkfield-measure-lib.mjs";

const here = import.meta.dirname;
const css = await readFile(resolve(here, "../src/styles/darkfield/tokens.css"), "utf8");
const browserTest = await readFile(resolve(here, "darkfield-foundation-browser-test.mjs"), "utf8");
const THEMES = ["dark", "light", "mono"];
const count = (mask) => mask.reduce((sum, v) => sum + v, 0);
const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
// The declaration block whose selector list names the theme, found independently of the library.
const blockOf = (theme) => {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const hit = blocks.filter(([, sel]) => sel.split(",").map((s) => s.trim()).includes(`[data-theme="${theme}"]`));
  assert.equal(hit.length, 1, `one ${theme} block in tokens.css`);
  return hit[0][2];
};

test("approved constants and the empty Task 9/10 lists", () => {
  assert.equal(MONO_ROUNDING, 2);
  assert.equal(DEFAULT_TOLERANCE, 2.3);
  assert.equal(EXCLUSION_DILATION_PX, 1);
  assert.equal(EXCLUDED, "[data-df-region], iframe, canvas, video, img, picture");
  assert.deepEqual(IDLE_ALLOWED, []);
  assert.deepEqual(LIVE_READOUTS, []);
  assert.deepEqual(MONO_DEVIATIONS, []);
});

test("Phase 5 lists keep their values and MEASURE_NATIVE derives from them (P6-5′)", () => {
  assert.deepEqual(P5_NATIVE, [".rhythm-lab-highway"]);
  assert.deepEqual(P5_GOVERNED_IN_NATIVE, [".rhythm-lab-overlay", ".rhythm-lab-tutorial-prompt", ".rhythm-lab-lane-label"]);
  assert.deepEqual(P5_NATIVE_GROUND, [".annals-sheet"]);
  assert.deepEqual(MEASURE_NATIVE, [
    { selector: ".rhythm-lab-highway", reason: "P5_NATIVE", kind: "subtree" },
    { selector: ".annals-sheet", reason: "P5-3", kind: "own" },
    { selector: ".traffic-swatch", reason: "P5-2", kind: "own" },
    { selector: ".traffic-signal-lamp", reason: "P5-2", kind: "own" },
  ]);
  assert.deepEqual(MEASURE_NATIVE.filter((e) => e.reason === "P5_NATIVE").map((e) => e.selector), P5_NATIVE);
  assert.deepEqual(MEASURE_NATIVE.filter((e) => e.reason === "P5-3").map((e) => e.selector), P5_NATIVE_GROUND);
  assert.ok(MEASURE_NATIVE.every((e) => !e.selector.includes("::") && !e.selector.includes(".spider-solitaire")));
});

test("the browser test imports the Phase 5 lists instead of defining them", () => {
  for (const name of ["P5_NATIVE", "P5_GOVERNED_IN_NATIVE", "P5_NATIVE_GROUND"]) {
    assert.doesNotMatch(browserTest, new RegExp(`\\bconst ${name}\\b`), `${name} is defined in the browser test`);
  }
  const imported = browserTest.match(/^import \{([^}]*)\} from "\.\/darkfield-measure-lib\.mjs";$/m);
  assert.ok(imported, "browser test imports from darkfield-measure-lib.mjs");
  const names = imported[1].split(",").map((s) => s.trim()).filter(Boolean).sort();
  assert.deepEqual(names, ["P5_GOVERNED_IN_NATIVE", "P5_NATIVE", "P5_NATIVE_GROUND"]);
});

test("parseTokenColours returns every single-colour token of each theme block", () => {
  for (const theme of THEMES) {
    const block = blockOf(theme);
    const declared = [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)].map((m) => m[1]).sort();
    const tokens = parseTokenColours(css, theme);
    assert.ok(declared.length > 0, `${theme} declares colour tokens`);
    assert.deepEqual(Object.keys(tokens).sort(), declared, `${theme} token names`);
    for (const [name, rgb] of Object.entries(tokens)) {
      assert.equal(rgb.length, 3);
      assert.ok(rgb.every((c) => Number.isInteger(c) && c >= 0 && c <= 255), `${theme} ${name}`);
      assert.ok(block.toLowerCase().includes(`--${name}: ${hex(rgb)};`), `${theme} ${name} round-trips to its declaration`);
    }
  }
  assert.notDeepEqual(parseTokenColours(css, "dark").field, parseTokenColours(css, "light").field);
  // Synthetic: shorthand hex, a shadow token (not a single colour) and a selector list.
  const synthetic = ':root,\n[data-theme="dark"] {\n  --a: #1a2b3c;\n  --b: #fa0;\n  --g: 0 0 1px #ffffff;\n  --n: none;\n}\n[data-theme="light"] { --a: #000000; }';
  assert.deepEqual(parseTokenColours(synthetic, "dark"), { a: [26, 43, 60], b: [255, 170, 0] });
  // A last declaration without its semicolon is read too.
  assert.deepEqual(parseTokenColours('[data-theme="light"] { --a: #000000; --b: #fa0 }', "light"), { a: [0, 0, 0], b: [255, 170, 0] });
  // Every block naming the theme is read, not only one of them.
  const split = '[data-theme="dark"] { --a: #1a2b3c; }\n.x { --z: #ffffff; }\n[data-theme="dark"] { --b: #fa0; }';
  assert.deepEqual(parseTokenColours(split, "dark"), { a: [26, 43, 60], b: [255, 170, 0] });
  assert.deepEqual(parseTokenColours(synthetic, "light"), { a: [0, 0, 0] });
  assert.throws(() => parseTokenColours(synthetic, "mono"), /mono/);
});

test("every TIERS member is a colour token in every theme, and every colour token has a tier", () => {
  for (const theme of THEMES) {
    const tokens = parseTokenColours(css, theme);
    const missing = Object.values(TIERS).flat().filter((name) => !(name in tokens));
    assert.deepEqual(missing, [], `${theme}: TIERS names without a colour token`);
    const untiered = Object.keys(tokens).filter((name) => tierOf(name) === null);
    assert.deepEqual(untiered, [], `${theme}: colour tokens without a tier`);
    assert.ok(Object.keys(tokens).some((name) => name.startsWith("on-")), `${theme} has on-* tokens`);
  }
  // The plan's tier table (Task 2 Step 2), token names only.
  assert.deepEqual(TIERS, {
    field: ["field", "field-deep"],
    surface: ["surface-1", "surface-2", "surface-3"],
    structure: ["rule", "edge", "signal-trace"],
    text: ["fg", "fg-muted", "fg-faint"],
    signal: ["signal"],
    signalDimDeep: ["signal-dim", "signal-deep"],
    secondary: ["coolant", "ion", "coolant-deep", "ion-deep"],
    state: ["caution", "fault", "caution-deep", "fault-deep"],
    flare: ["flare"],
  });
  assert.equal(tierOf("on-signal"), "text");
  assert.equal(tierOf("signal-dim"), "signalDimDeep");
  assert.equal(tierOf("focus-ring"), null);
  const all = Object.values(TIERS).flat();
  assert.equal(new Set(all).size, all.length, "a token belongs to one tier");
});

test("srgbToLab and deltaE76", () => {
  const white = srgbToLab([255, 255, 255]);
  const black = srgbToLab([0, 0, 0]);
  assert.ok(Math.abs(white[0] - 100) < 1e-6 && Math.abs(white[1]) < 1e-6 && Math.abs(white[2]) < 1e-6);
  assert.deepEqual(black.map((v) => Math.abs(v) < 1e-9), [true, true, true]);
  const greyA = srgbToLab([100, 100, 100]);
  const greyB = srgbToLab([140, 140, 140]);
  assert.ok(greyA[0] < greyB[0], "L rises with grey level");
  const p = srgbToLab([12, 200, 99]);
  const q = srgbToLab([240, 17, 63]);
  assert.equal(deltaE76(p, p), 0);
  assert.equal(deltaE76(p, q), deltaE76(q, p));
  assert.ok(deltaE76(p, q) > 0);
  assert.ok(Math.abs(deltaE76(white, black) - 100) < 1e-6);
  // Reference values from standard colour science (IEC 61966-2-1 sRGB, CIE 15 CIELAB, D65), not Darkfield values.
  const near = (actual, expected, tol, what) =>
    assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) <= tol), `${what}: ${actual} vs ${expected}`);
  near(srgbToLab([255, 0, 0]), [53.2408, 80.0925, 67.2032], 0.002, "sRGB red");
  near(srgbToLab([128, 128, 128]), [53.585, 0, 0], 0.002, "sRGB grey 128");
  // Dark greys sit on both linear segments: sRGB decodes c/12.92 below its knee, and CIE L* = (24389/27)·Y below its
  // ε. Channel 10.2 (c = 0.04) lies between the knee and the next 8-bit level, so it also pins the knee itself.
  const kappa = 24389 / 27;
  near(srgbToLab([10, 10, 10]), [kappa * (10 / 255 / 12.92), 0, 0], 1e-4, "sRGB grey 10");
  near(srgbToLab([10.2, 10.2, 10.2]), [kappa * (0.04 / 12.92), 0, 0], 1e-4, "sRGB c = 0.04");
  // CIE76 on a textbook pair: Sharma, Wu and Dalal (2005), CIEDE2000 test data, pair 1 (Lab inputs).
  assert.ok(Math.abs(deltaE76([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 4.0011) < 1e-4);
});

test("classify: exact token, tolerance boundary, ambiguous across tiers, same tier, untiered token", () => {
  const tokens = { field: [20, 20, 20], fg: [20, 20, 20], "surface-1": [90, 90, 90], "surface-2": [90, 90, 90], signal: [40, 200, 90] };
  assert.equal(classify([40, 200, 90], tokens), "signal");
  assert.equal(classify([20, 20, 20], tokens), "ambiguous:field+text");
  assert.ok(["surface-1", "surface-2"].includes(classify([90, 90, 90], tokens)), "shared within one tier is not ambiguous");
  assert.equal(tierOf(classify([90, 90, 90], tokens)), "surface");
  assert.equal(classify([250, 0, 250], tokens), UNCLASSIFIED);
  // Boundary: the result follows deltaE76 against the tolerance, with both outcomes present.
  const signalLab = srgbToLab(tokens.signal);
  const seen = new Set();
  for (let d = 0; d <= 8; d += 1) {
    const pixel = [40 + d, 200 - d, 90];
    const within = deltaE76(srgbToLab(pixel), signalLab) <= DEFAULT_TOLERANCE;
    assert.equal(classify(pixel, tokens), within ? "signal" : UNCLASSIFIED, `pixel ${pixel}`);
    assert.equal(classify(pixel, tokens, DEFAULT_TOLERANCE), classify(pixel, tokens), "default tolerance");
    seen.add(within);
  }
  assert.deepEqual([...seen].sort(), [false, true], "the sweep crosses the tolerance");
  const far = [48, 192, 90];
  assert.equal(classify(far, tokens, deltaE76(srgbToLab(far), signalLab)), "signal", "an explicit tolerance is honoured");
  // A token outside TIERS reports as itself; nearest wins over a farther in-tolerance token.
  assert.equal(classify([1, 2, 3], { "focus-ring": [1, 2, 3], field: [2, 2, 3] }), "focus-ring");
  // Every real token's own colour classifies to itself, or to an ambiguity that includes its tier.
  for (const theme of THEMES) {
    const real = parseTokenColours(css, theme);
    for (const [name, rgb] of Object.entries(real)) {
      const label = classify(rgb, real);
      const ok = label.startsWith("ambiguous:") ? label.slice("ambiguous:".length).split("+").includes(tierOf(name)) : tierOf(label) === tierOf(name);
      assert.ok(ok, `${theme} ${name} → ${label}`);
    }
  }
});

test("tierBounds: lower ≤ upper; unclassified and ambiguous only in upper bounds; untiered tokens in no tier", () => {
  const counts = { field: 613, "field-deep": 94, fg: 47, "on-signal": 11, signal: 19, "ambiguous:field+text": 43, [UNCLASSIFIED]: 29, "focus-ring": 144 };
  const b = tierBounds(counts, 1000);
  assert.deepEqual(Object.keys(b).sort(), Object.keys(TIERS).sort());
  for (const [tier, { lower, upper }] of Object.entries(b)) assert.ok(lower <= upper, tier);
  assert.deepEqual(b.field, { lower: 707 / 1000, upper: (707 + 43 + 29) / 1000 });
  assert.deepEqual(b.text, { lower: 58 / 1000, upper: (58 + 43 + 29) / 1000 });
  assert.deepEqual(b.signal, { lower: 19 / 1000, upper: (19 + 29) / 1000 });
  assert.deepEqual(b.flare, { lower: 0, upper: 29 / 1000 });
  const lowers = Object.values(b).reduce((sum, { lower }) => sum + lower, 0);
  assert.ok(Math.abs(lowers - 784 / 1000) < 1e-12, "focus-ring, unclassified and ambiguous add to no lower bound");
  assert.throws(() => tierBounds(counts, 0), /denominator/);
});

test("verdict: PASS on the unfavourable bound, FAIL on the favourable bound, else BORDERLINE; UNJUDGED without a limit", () => {
  const limit = 0.43;
  assert.equal(verdict({ lower: 0.11, upper: 0.27 }, limit, "max"), "PASS");
  assert.equal(verdict({ lower: 0.11, upper: 0.57 }, limit, "max"), "BORDERLINE");
  assert.equal(verdict({ lower: 0.47, upper: 0.59 }, limit, "max"), "FAIL");
  assert.equal(verdict({ lower: 0.51, upper: 0.67 }, limit, "min"), "PASS");
  assert.equal(verdict({ lower: 0.37, upper: 0.61 }, limit, "min"), "BORDERLINE");
  assert.equal(verdict({ lower: 0.13, upper: 0.29 }, limit, "min"), "FAIL");
  assert.equal(verdict({ lower: limit, upper: limit }, limit, "max"), "PASS");
  assert.equal(verdict({ lower: limit, upper: limit }, limit, "min"), "PASS");
  assert.equal(verdict({ lower: 0.11, upper: 0.27 }, undefined, "max"), "UNJUDGED");
  assert.equal(verdict({ lower: 0.11, upper: 0.27 }, null, "min"), "UNJUDGED");
  assert.throws(() => verdict({ lower: 0, upper: 0 }, limit, "sideways"), /direction/);
});

test("largestComponent: 4-connectivity on a hand-built grid", () => {
  const X = true;
  const _ = false;
  const grid = [
    [X, X, _, _, X],
    [X, _, _, X, _],
    [X, X, _, X, X],
    [_, _, _, _, X],
    [X, _, X, X, X],
  ];
  // Left component 5 cells; right component 7 cells (the lone top-right cell touches it only diagonally).
  assert.equal(largestComponent(grid), 7);
  const broken = grid.map((row) => [...row]);
  broken[3][4] = false; // an excluded cell splits the right component into 3 and 3
  assert.equal(largestComponent(broken), 5);
  assert.equal(largestComponent([[_, _], [_, _]]), 0);
  assert.equal(largestComponent([]), 0);
});

test("chroma and the Mono threshold", () => {
  assert.equal(chroma([10, 10, 10]), 0);
  assert.equal(chroma([12, 40, 30]), 28);
  // Independent: every hex literal in the Mono block, channel spread, plus MONO_ROUNDING.
  const spreads = [...blockOf("mono").matchAll(/#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?\b/g)]
    .map(([, h]) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)))
    .map((rgb) => Math.max(...rgb) - Math.min(...rgb));
  assert.ok(spreads.length > 0);
  assert.equal(monoChromaThreshold(css), Math.max(...spreads) + MONO_ROUNDING);
  // Shadow colours count: the glow's 8-digit colour has the largest spread here.
  const synthetic = '[data-theme="mono"] { --a: #101010; --b: #1a2b3c; --g: 0 0 1px #1b4e7780; --n: none; }';
  assert.equal(monoChromaThreshold(synthetic), 92 + MONO_ROUNDING);
  assert.equal(monoChromaThreshold('[data-theme="mono"] { --a: #101010; --b: #1a2b3c; }'), 34 + MONO_ROUNDING);
  // A colour form the threshold does not parse fails loudly instead of dropping out.
  for (const value of ["rgb(26 43 60)", "hsl(120 40% 50%)", "color-mix(in srgb, #ffffff, #000000)", "0 0 1px teal", "var(--x)", "transparent"]) {
    assert.throws(() => monoChromaThreshold(`[data-theme="mono"] { --a: #101010; --b: ${value}; }`), /cannot read/, value);
  }
  assert.equal(monoChromaThreshold('[data-theme="mono"] { --a: #fff; }'), MONO_ROUNDING);
  // Every colour of a multi-colour value counts, not only the first.
  assert.equal(monoChromaThreshold('[data-theme="mono"] { --a: #101010; --g: 0 0 1px #101010, 0 0 2px #1a2b3c; }'), 34 + MONO_ROUNDING);
  // A last declaration without its semicolon is still read, and still fails loudly when unread.
  assert.equal(monoChromaThreshold('[data-theme="mono"] { --a: #101010; --b: #1a2b3c }'), 34 + MONO_ROUNDING);
  assert.throws(() => monoChromaThreshold('[data-theme="mono"] { --a: #101010; --b: rgb(26 43 60) }'), /cannot read/);
});

test("nativeOwnBoxes and nativeSubtreeBoxes: pixel counts on synthetic grids", () => {
  const box = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(count(boxMask(nativeOwnBoxes([box], [], { dilation: 0 }), 10, 10)), 100);
  assert.equal(count(boxMask(nativeOwnBoxes([box], [{ x: 2, y: 2, width: 3, height: 4 }], { dilation: 0 }), 10, 10)), 88);
  // Overlapping descendants are removed once.
  const holes = [{ x: 1, y: 1, width: 4, height: 4 }, { x: 3, y: 3, width: 4, height: 4 }];
  assert.equal(count(boxMask(nativeOwnBoxes([box], holes, { dilation: 0 }), 10, 10)), 100 - (16 + 16 - 4));
  // Subtree: the highway minus its governed-in subtrees, one of them partly outside it.
  const lane = { x: 0, y: 0, width: 20, height: 10 };
  const governedIn = [{ x: 5, y: 2, width: 4, height: 3 }, { x: 18, y: 8, width: 6, height: 6 }];
  assert.equal(count(boxMask(nativeSubtreeBoxes([lane], governedIn, { dilation: 0 }), 30, 30)), 200 - 12 - 4);
  // Default dilation: the native box grows outward and each hole shrinks inward by EXCLUSION_DILATION_PX.
  const fractional = { x: 2.5, y: 2.5, width: 4, height: 4 };
  assert.equal(count(boxMask(nativeOwnBoxes([fractional], []), 12, 12)), 7 * 7); // floor 2 − 1 … ceil 6.5 + 1
  assert.equal(count(boxMask(nativeOwnBoxes([box], [{ x: 2, y: 2, width: 4, height: 4 }]), 10, 10)), 100 - 4);
  assert.equal(count(boxMask(nativeOwnBoxes([box], [{ x: 2, y: 2, width: 2, height: 2 }]), 10, 10)), 100, "a hole too small to survive");
  // The mask clips to the grid.
  assert.equal(count(boxMask([{ x: -3, y: 8, width: 5, height: 9 }], 10, 10)), 2 * 2);
});

test("page predicates: injected source parses and implements own and subtree exclusion", () => {
  new Script(`(${PAGE_PREDICATES})`); // parses
  const injected = new Function(`return (${PAGE_PREDICATES});`)();
  assert.deepEqual(Object.keys(injected).sort(), ["ownPaintExcluded", "subtreeExcluded"]);
  // A minimal element: class selectors only, enough for the lists' selectors.
  const node = (cls, parent = null) => {
    const el = { cls, parent };
    el.matches = (list) => list.split(",").some((s) => s.trim() === `.${cls}`);
    el.closest = (list) => { for (let at = el; at; at = at.parent) if (at.matches(list)) return at; return null; };
    return el;
  };
  const sheet = node("annals-sheet");
  const onSheet = node("annals-legend", sheet);
  const highway = node("rhythm-lab-highway");
  const lane = node("rhythm-lab-lane", highway);
  const overlay = node("rhythm-lab-overlay", highway);
  const button = node("df-control", overlay);
  const lamp = node("traffic-signal-lamp");
  const page = node("page");
  for (const impl of [injected, { ownPaintExcluded, subtreeExcluded }]) {
    const own = (el) => impl.ownPaintExcluded(el, MEASURE_NATIVE);
    const sub = (el) => impl.subtreeExcluded(el, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE);
    assert.deepEqual([sheet, onSheet, lamp, highway, lane, page].map(own), [true, false, true, false, false, false]);
    assert.deepEqual([highway, lane, overlay, button, sheet, onSheet, page].map(sub), [true, true, false, false, false, false, false]);
  }
});
