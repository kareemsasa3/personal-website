// web/scripts/darkfield-measure-lib.mjs
// Pure helpers and shared lists for Darkfield conformance measurement (Phase 6, P6-3 and P6-5′).
// No file, network or canonical-clone access: callers pass tokens.css text, pixels, boxes and limits in.
// Limits are never held here; verdict() receives them from the run-time limits reader.

// ---- Approved non-specification constants ----
// A composited pixel's channels may each round by one 8-bit level either way, so a neutral source can spread by this much.
export const MONO_ROUNDING = 2;
// CIE76 ΔE at or under which a pixel takes the nearest token's colour (a common just-noticeable difference; adjustable).
export const DEFAULT_TOLERANCE = 2.3;
// Pixels by which exclusion boxes grow (and governed holes in them shrink) to cover fractional box edges.
export const EXCLUSION_DILATION_PX = 1;

// ---- Shared lists ----
// Boxes outside the governed interface: creative regions and content media (the R1 mark is inline SVG, so governed).
export const EXCLUDED = "[data-df-region], iframe, canvas, video, img, picture";
// The Rhythm Lab highway is native (D6 ruling) but unmarked: its lanes host governed labels and its hit zones are buttons.
export const P5_NATIVE = [".rhythm-lab-highway"];
// Governed chrome inside a P5_NATIVE element (Task 20): the in-highway overlays (ready check, pause, run summary,
// tutorial complete) with their controls, the tutorial prompt and the lane labels are swept like the rest of the page.
export const P5_GOVERNED_IN_NATIVE = [".rhythm-lab-overlay", ".rhythm-lab-tutorial-prompt", ".rhythm-lab-lane-label"];
// Native grounds (Task 22): the Annals parchment sheet's own box is native (D6 ruling, P5-3), and everything on it
// outside the six narrative markers is governed, so only the sheet itself and the marked subtrees are skipped.
export const P5_NATIVE_GROUND = [".annals-sheet"];
// Native paint outside creative regions, excluded from pixel measurement and reported separately (P6-5′).
// kind "own": the element's own paint only (its box minus its governed descendants' boxes).
// kind "subtree": the element and its descendants, except P5_GOVERNED_IN_NATIVE subtrees, which stay measured.
// Callers that skip a "subtree" entry list what they skipped; a skip is reported, never silent.
export const MEASURE_NATIVE = [
  ...P5_NATIVE.map((selector) => ({ selector, reason: "P5_NATIVE", kind: "subtree" })),
  ...P5_NATIVE_GROUND.map((selector) => ({ selector, reason: "P5-3", kind: "own" })),
  { selector: ".traffic-swatch", reason: "P5-2", kind: "own" },
  { selector: ".traffic-signal-lamp", reason: "P5-2", kind: "own" },
];
// Exact selectors whose Mono hue is a named deviation (Task 10; rulings P6-T10a–c, P6-T10g). Each names the leaking element
// itself, scoped under the Annals sheet, and the browser test matches it with Element.matches on the element a finding or a
// pixel is attributed to, never closest, so an entry that is also a container excuses only its own paint. pseudo, when set,
// names the generated box the entry stands for instead of the element. Reasons, and what each excuses in the DOM layer:
// P5-3, governed chrome on the sheet renders the Light token set in every theme, so only colours of that set; P5-2, a legend
// key that mirrors the narrative's palette is a hold, so only its background colour.
// untokened lists the properties of an entry that may hold a colour outside the Light set. Only the header rule
// (border-stone-800) carries one: its non-token colour is deviation DEV-8, pending the owner (rulings P6-T10b, P6-Mf),
// listed so that only that property passes.
export const MONO_DEVIATIONS = [
  ...[
    ".annals-sheet .annals-heading > .df-heading-1",
    ".annals-sheet .annals-readout",
    ".annals-sheet .annals-label",
    ".annals-sheet .annals-data",
    ".annals-sheet .annals-field",
    ".annals-sheet .annals-control",
    ".annals-sheet .annals-phrase",
    ".annals-sheet .annals-hint > .df-body-sm",
    ".annals-sheet .annals-hand",
    ".annals-sheet .annals-soul > span > .annals-value",
    ".annals-sheet .annals-soul b",
    ".annals-sheet .annals-soul .text-stone-500",
    ".annals-sheet .annals-soul abbr",
    ".annals-sheet .annals-footer",
    ".annals-sheet .annals-footer > i",
    ".annals-sheet .annals-footer > b",
  ].map((selector) => ({ selector, reason: "P5-3" })),
  { selector: ".annals-sheet .annals-chronicle", reason: "P5-3" },
  { selector: ".annals-sheet > header", reason: "P5-3", untokened: ["border-bottom-color"] },
  { selector: ".annals-sheet .annals-hand", pseudo: "::before", reason: "P5-2" },
];
// The element every MONO_DEVIATIONS selector is scoped under.
export const MONO_DEVIATION_SCOPE = ".annals-sheet";
// Phase 6 Task 9 (§12 What may repeat; rulings P6-T9a, P6-T9b). The rows of §12 What may repeat an idle animation can
// name. IDLE_ALLOWED: a governed animation allowed to run at idle on its route, with the condition under which it may;
// whileFocused, when set, is asserted (the element focused at both captures). LIVE_READOUTS: governed value elements whose
// pixels may change at idle because they report running data. Selectors are exact and name the moving or changing
// element itself, never a container of it; the browser test matches them with Element.matches.
export const IDLE_REPEATS = ["scan", "transmit", "processing", "heartbeat", "cursor", "accumulation"];
export const IDLE_ALLOWED = [
  { route: "/terminal", selector: ".terminal-body span.terminal-cursor", repeat: "cursor", whileFocused: "input.command-input",
    condition: "the cursor renders only while the prompt input holds focus, so it blinks only while typing goes to the prompt" },
];
export const LIVE_READOUTS = [
  { route: "/simulations/orbital-simulator", selector: ".orbital-status output.orbital-value", reports: "elapsed simulated time while the simulation runs" },
  { route: "/simulations/orbital-simulator", selector: ".orbital-status span.orbital-value", reports: "relative energy change since reset or edit" },
  { route: "/simulations/orbital-simulator", selector: ".orbital-readout .orbital-value.df-data--live", reports: "the selected body's speed, position and velocity" },
  { route: "/simulations/traffic-simulator", selector: ".traffic-status output.traffic-value", reports: "elapsed simulated time while the simulation runs" },
  { route: "/simulations/traffic-simulator", selector: ".traffic-metrics .traffic-value.df-data--live", reports: "the running traffic metrics" },
];

// ---- Tiers ----
// Area tiers by colour token. on-* tokens report under text. focus-ring is in no tier: it paints only on focus and
// measurement is at rest, so classify() reports it as itself and tierBounds() counts it nowhere.
export const TIERS = {
  field: ["field", "field-deep"],
  surface: ["surface-1", "surface-2", "surface-3"],
  structure: ["rule", "edge", "signal-trace"],
  text: ["fg", "fg-muted", "fg-faint"],
  signal: ["signal"],
  signalDimDeep: ["signal-dim", "signal-deep"],
  secondary: ["coolant", "ion", "coolant-deep", "ion-deep"],
  state: ["caution", "fault", "caution-deep", "fault-deep"],
  flare: ["flare"],
};
const TIER_OF = new Map(Object.entries(TIERS).flatMap(([tier, names]) => names.map((name) => [name, tier])));
export const tierOf = (name) => TIER_OF.get(name) ?? (name.startsWith("on-") ? "text" : null);

export const UNCLASSIFIED = "unclassified";
// classify() labels a pixel shared by tokens of different tiers "ambiguous:<tier>+<tier>" (tiers sorted).
const AMBIGUOUS = "ambiguous";

// ---- Token colours ----
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hexToRgb = (hex) => {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1, 7);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
// Bodies of the rule blocks whose selector list names [data-theme="<theme>"] (dark's block also carries :root).
const themeBlocks = (css, theme) => {
  const want = `[data-theme="${theme}"]`;
  const bodies = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.replace(/\/\*[\s\S]*?\*\//g, "").split(",").map((s) => s.trim()).includes(want))
    .map(([, , body]) => body);
  if (!bodies.length) throw new Error(`tokens.css has no block for theme ${theme}`);
  return bodies;
};
// { name: [r, g, b] } for every custom property of the theme's block whose value is one hex colour.
// Shadow tokens (glow-*, focus-ring) hold several values and are not colour tokens.
export function parseTokenColours(css, theme) {
  const out = {};
  for (const body of themeBlocks(css, theme)) {
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+)(?:;|$)/g)) {
      if (HEX.test(value.trim())) out[name] = hexToRgb(value.trim());
    }
  }
  return out;
}

// ---- Colour science (sRGB IEC 61966-2-1, CIELAB CIE 15, D65 white) ----
const SRGB_LINEAR_KNEE = 0.04045;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_GAMMA = 2.4;
const XYZ_FROM_LINEAR_SRGB = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const D65_WHITE = XYZ_FROM_LINEAR_SRGB.map((row) => row[0] + row[1] + row[2]);
const LAB_DELTA = 6 / 29;
const toLinear = (c8) => {
  const c = c8 / 255;
  return c <= SRGB_LINEAR_KNEE ? c / SRGB_LINEAR_SLOPE : ((c + SRGB_OFFSET) / (1 + SRGB_OFFSET)) ** SRGB_GAMMA;
};
const labF = (t) => (t > LAB_DELTA ** 3 ? Math.cbrt(t) : t / (3 * LAB_DELTA ** 2) + 4 / 29);
// 8-bit sRGB [r, g, b] → CIELAB [L, a, b].
export function srgbToLab([r, g, b]) {
  const lin = [toLinear(r), toLinear(g), toLinear(b)];
  const [fx, fy, fz] = XYZ_FROM_LINEAR_SRGB.map((row, i) => labF((row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]) / D65_WHITE[i]));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// CIE76 colour difference of two Lab colours.
export const deltaE76 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

// ---- Classification ----
const prepared = new WeakMap();
const prepare = (tokens) => {
  let list = prepared.get(tokens);
  if (!list) {
    list = Object.entries(tokens).map(([name, rgb]) => ({ name, lab: srgbToLab(rgb), tier: tierOf(name) ?? name }));
    prepared.set(tokens, list);
  }
  return list;
};
// The nearest token's name when it lies within tolerance, else "unclassified". Several nearest tokens of one tier give
// the first of them; nearest tokens of different tiers give "ambiguous:<tiers>". A token in no tier counts as its own.
export function classify(pixel, tokens, tolerance = DEFAULT_TOLERANCE) {
  const lab = srgbToLab(pixel);
  let best = Infinity;
  let hits = [];
  for (const token of prepare(tokens)) {
    const d = deltaE76(lab, token.lab);
    if (d < best) { best = d; hits = [token]; } else if (d === best) hits.push(token);
  }
  if (!(best <= tolerance)) return UNCLASSIFIED;
  const tiers = [...new Set(hits.map((h) => h.tier))].sort();
  return tiers.length === 1 ? hits[0].name : `${AMBIGUOUS}:${tiers.join("+")}`;
}
// counts: { label: pixels } from classify(); denominator: governed pixels. Shares per tier: lower counts only pixels
// classified to the tier's tokens; upper adds unclassified pixels and ambiguous pixels that name the tier.
export function tierBounds(counts, denominator) {
  if (!(denominator > 0)) throw new Error("tierBounds needs a positive denominator");
  const sums = Object.fromEntries(Object.keys(TIERS).map((tier) => [tier, { lower: 0, upper: 0 }]));
  for (const [label, n] of Object.entries(counts)) {
    if (label === UNCLASSIFIED || label === AMBIGUOUS) {
      for (const tier of Object.keys(sums)) sums[tier].upper += n;
    } else if (label.startsWith(`${AMBIGUOUS}:`)) {
      for (const tier of label.slice(AMBIGUOUS.length + 1).split("+")) if (tier in sums) sums[tier].upper += n;
    } else {
      const tier = tierOf(label);
      if (tier) { sums[tier].lower += n; sums[tier].upper += n; }
    }
  }
  return Object.fromEntries(Object.entries(sums).map(([tier, { lower, upper }]) => [tier, { lower: lower / denominator, upper: upper / denominator }]));
}
// bounds and limit in the same unit; direction "max" (at most) or "min" (at least). PASS when the unfavourable bound
// passes, FAIL when the favourable bound fails, else BORDERLINE; UNJUDGED when no limit was read (undefined or null).
export function verdict(bounds, limit, direction) {
  if (direction !== "max" && direction !== "min") throw new Error(`verdict direction must be max or min, not ${direction}`);
  if (limit == null) return "UNJUDGED";
  const ok = (v) => (direction === "max" ? v <= limit : v >= limit);
  const [unfavourable, favourable] = direction === "max" ? [bounds.upper, bounds.lower] : [bounds.lower, bounds.upper];
  if (ok(unfavourable)) return "PASS";
  if (!ok(favourable)) return "FAIL";
  return "BORDERLINE";
}

// ---- Void ----
// Size, in cells, of the largest 4-connected set of true cells in a grid of rows (false cells break components).
export function largestComponent(grid) {
  const rows = grid.length;
  const seen = grid.map((row) => row.map(() => false));
  let largest = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (!grid[y][x] || seen[y][x]) continue;
      let size = 0;
      const stack = [[y, x]];
      seen[y][x] = true;
      while (stack.length) {
        const [cy, cx] = stack.pop();
        size += 1;
        for (const [ny, nx] of [[cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1]]) {
          if (ny >= 0 && ny < rows && nx >= 0 && nx < grid[ny].length && grid[ny][nx] && !seen[ny][nx]) {
            seen[ny][nx] = true;
            stack.push([ny, nx]);
          }
        }
      }
      largest = Math.max(largest, size);
    }
  }
  return largest;
}

// ---- Mono ----
// Spread between the largest and smallest 8-bit channel.
export const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
// Largest chroma of any colour the Mono block declares (shadow colours included), plus MONO_ROUNDING.
// Only hex colours are read: a value holding any other word or function (rgb(), hsl(), color-mix(), a named
// colour, var()) throws, so a colour form this reader cannot parse never drops out of the threshold silently.
const HEX_LITERAL = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const NON_COLOUR_WORDS = new Set(["none", "inset"]);
export function monoChromaThreshold(css) {
  const colours = [];
  for (const body of themeBlocks(css, "mono")) {
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+)(?:;|$)/g)) {
      const rest = value.replace(HEX_LITERAL, " ").replace(/-?\d*\.?\d+[a-z%]*/gi, " ");
      const unread = (rest.match(/[a-z][\w-]*\(?/gi) ?? []).filter((word) => !NON_COLOUR_WORDS.has(word.toLowerCase()));
      if (unread.length) throw new Error(`tokens.css Mono --${name} holds a colour form the threshold cannot read: ${unread.join(" ")}`);
      for (const [, h] of value.matchAll(HEX_LITERAL)) colours.push(hexToRgb(`#${h.length <= 4 ? h.slice(0, 3) : h.slice(0, 6)}`));
    }
  }
  if (!colours.length) throw new Error("tokens.css Mono block declares no colour");
  return Math.max(...colours.map(chroma)) + MONO_ROUNDING;
}

// ---- Boxes ----
// Boxes are { x, y, width, height } in CSS pixels. Results are integer boxes; overlaps are allowed (use boxMask).
const grow = (r, d) => {
  const x = Math.floor(r.x) - d;
  const y = Math.floor(r.y) - d;
  return { x, y, width: Math.ceil(r.x + r.width) + d - x, height: Math.ceil(r.y + r.height) + d - y };
};
const shrink = (r, d) => {
  const x = Math.ceil(r.x) + d;
  const y = Math.ceil(r.y) + d;
  const width = Math.floor(r.x + r.width) - d - x;
  const height = Math.floor(r.y + r.height) - d - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
};
// a minus b as up to four disjoint integer boxes.
const subtract = (a, b) => {
  const ax1 = a.x + a.width;
  const ay1 = a.y + a.height;
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(ax1, b.x + b.width);
  const y1 = Math.min(ay1, b.y + b.height);
  if (x0 >= x1 || y0 >= y1) return [a];
  return [
    { x: a.x, y: a.y, width: a.width, height: y0 - a.y },
    { x: a.x, y: y1, width: a.width, height: ay1 - y1 },
    { x: a.x, y: y0, width: x0 - a.x, height: y1 - y0 },
    { x: x1, y: y0, width: ax1 - x1, height: y1 - y0 },
  ].filter((r) => r.width > 0 && r.height > 0);
};
const boxesMinus = (boxes, holes, dilation) => {
  let out = boxes.map((b) => grow(b, dilation));
  for (const hole of holes.map((h) => shrink(h, dilation)).filter(Boolean)) out = out.flatMap((b) => subtract(b, hole));
  return out;
};
// "own" entries: native boxes minus the boxes of their governed descendants.
export const nativeOwnBoxes = (boxes, governedDescendantBoxes, { dilation = EXCLUSION_DILATION_PX } = {}) =>
  boxesMinus(boxes, governedDescendantBoxes, dilation);
// "subtree" entries: native subtree boxes minus the boxes of the P5_GOVERNED_IN_NATIVE subtrees inside them.
export const nativeSubtreeBoxes = (boxes, governedInBoxes, { dilation = EXCLUSION_DILATION_PX } = {}) =>
  boxesMinus(boxes, governedInBoxes, dilation);
// Row-major 0/1 mask of a width × height grid covered by the boxes (clipped to the grid).
export function boxMask(boxes, width, height) {
  const mask = new Uint8Array(width * height);
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x));
    const y0 = Math.max(0, Math.floor(b.y));
    const x1 = Math.min(width, Math.ceil(b.x + b.width));
    const y1 = Math.min(height, Math.ceil(b.y + b.height));
    for (let y = y0; y < y1; y += 1) mask.fill(1, y * width + x0, y * width + Math.max(x0, x1));
  }
  return mask;
}

// ---- Page-side predicates ----
// These run in the page and use only their arguments. Playwright cannot pass functions, so callers inject the source:
//   page.evaluate(([src, native, governedIn]) => {
//     const { ownPaintExcluded, subtreeExcluded } = new Function(`return (${src});`)();
//     …
//   }, [PAGE_PREDICATES, MEASURE_NATIVE, P5_GOVERNED_IN_NATIVE]);
// True when the element's own paint is native (it matches an "own" entry).
export function ownPaintExcluded(el, native) {
  return native.some((entry) => entry.kind === "own" && el.matches(entry.selector));
}
// True when the element lies in a "subtree" entry and outside every governed-in subtree (the Phase 5 sweep's test).
export function subtreeExcluded(el, native, governedIn) {
  const inNative = native.some((entry) => entry.kind === "subtree" && el.closest(entry.selector) !== null);
  return inNative && !(governedIn.length && el.closest(governedIn.join(", ")));
}
// Source of an object expression holding both predicates.
export const PAGE_PREDICATES = `{ ownPaintExcluded: ${ownPaintExcluded}, subtreeExcluded: ${subtreeExcluded} }`;
