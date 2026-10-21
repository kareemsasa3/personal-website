// web/scripts/darkfield-surfaces.test.mjs: Phase 5 static invariants (governed interface around creative content).
import test from "node:test";
import assert from "node:assert/strict";
import { read, governed, declarations, innermost, where, NATIVE, NATIVE_KEYFRAMES, PHASE5, NATIVE5, HOLDS5, DEAD_RULES5 } from "./darkfield-css-scope.mjs";

// Stylesheets a Phase 5 task has finished; the rules below hold for these. Task 24 requires DONE5 to equal PHASE5.
export const DONE5 = ["pages/NotFound/NotFound.css", "components/common/ErrorBoundary.css", "components/Terminal/TerminalErrorBoundary.css",
  "components/common/Toast.css", "components/common/ToastContainer.css", "components/common/Modal.css"];
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

// Selector helpers: top-level comma items, and the subject compound (pseudo-class arguments and pseudo-elements dropped).
const topLevel = (sel) => {
  const out = [""]; let depth = 0;
  for (const ch of sel) { if (ch === "(") depth += 1; if (ch === ")") depth -= 1; if (ch === "," && !depth) out.push(""); else out[out.length - 1] += ch; }
  return out.map((s) => s.trim());
};
const flat = (sel) => { let out = "", depth = 0; for (const ch of sel) { if (ch === "(") depth += 1; else if (ch === ")") depth -= 1; else if (!depth) out += ch; } return out; };
const subject = (item) => flat(item).trim().split(/\s*[\s>+~]\s*/).pop().replace(/::[\w-]+$/, "");
const reads = (value, name) => new RegExp(`var\\(${name.replace(/[\\.]/g, "\\$&")}(?![\\w-])`).test(value);
// Elements that can sit above a [data-theme] wrapper (P5-1: .rhythm-lab-page, .annals-sheet): the document root, the
// app mount and the layout shell around every route, and the Annals page around its sheet.
const ANCESTOR = (compound) => /:root\b|^(html|body|main)\b|#(root|main-content-area)\b/.test(compound) ||
  [...compound.matchAll(/\.([\w-]+)/g)].some(([, c]) => /^(layout-foreground|nav-mode-[\w-]+|has-section-rail|app-content|page-content|annals-page)$/.test(c));
const derivedOnAncestors = (decls, colours) => {
  const derived = new Set(colours);
  for (let grew = true; grew;) {
    grew = false;
    for (const d of decls) if (d.prop.startsWith("--") && !derived.has(d.prop) && [...derived].some((n) => reads(d.value, n))) { derived.add(d.prop); grew = true; }
  }
  return decls.filter((d) => d.prop.startsWith("--") && derived.has(d.prop) && !colours.has(d.prop))
    .filter((d) => { const items = topLevel(innermost(d.selector)); return !items.includes("[data-theme]") && items.some((i) => ANCESTOR(subject(i))); });
};
const colourTokens = async () => new Set(declarations(await read("styles/darkfield/tokens.css")).filter((d) => /\[data-theme=/.test(d.selector) && d.prop.startsWith("--")).map((d) => d.prop));

// P5-1: a custom property whose value reads a colour token is computed where it is declared. Declared on an element
// above a [data-theme] wrapper, it reaches the wrapper's subtree with the outer theme's colour, so there it must be
// declared on a rule that also matches [data-theme]. Declared on the element that reads it, it is resolved in that
// element's own theme and needs nothing. tokens.css is out of scope.
test("P5 derived variables: colour-derived custom properties on a scoped wrapper's ancestors are also declared on [data-theme]", async () => {
  const colours = await colourTokens();
  assert.ok(colours.has("--field") && colours.has("--fault"), "colour tokens not found in tokens.css");
  const decls = [];
  for (const file of ["styles/darkfield/grammar.css", ...DONE5]) for (const d of declarations(await read(file))) decls.push({ file, ...d });
  const scrim = decls.find((d) => d.prop === "--df-scrim");
  assert.ok(scrim && topLevel(innermost(scrim.selector)).includes(":root") && topLevel(innermost(scrim.selector)).includes("[data-theme]"), "--df-scrim");
  assert.deepEqual(derivedOnAncestors(decls, colours).map(where), []);
});
test("P5 derived variables: the check flags a root-level derived variable and passes an element-local one", async () => {
  const colours = await colourTokens();
  const css = ":root { --x: var(--field); }\n.layout-foreground.nav-mode-dock { --y: var(--x); }\n.error-button { --df-ground-up: var(--surface-2); }\n" +
    ".df-control:hover { --df-bracket-ink: var(--fg-muted); }\n:root, [data-theme] { --z: var(--field); }";
  assert.deepEqual(derivedOnAncestors(declarations(css).map((d) => ({ file: "probe.css", ...d })), colours).map((d) => d.prop), ["--x", "--y"]);
});

// §13 state model and §05 state encoding: glyph, word and colour together mark a state; the glyph is generated content
// with empty alternative text, so assistive technology reads only the element's own words.
test("P5 state signatures: error, alarm, warning, confirmed and field are defined from tokens; glyphs are silent", async () => {
  const g = declarations(await read("styles/darkfield/grammar.css"));
  const rule = (sel) => Object.fromEntries(g.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const has = (sel, want) => { const r = rule(sel); for (const [p, v] of Object.entries(want)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  has(".df-error", { border: "var(--stroke-bold) solid var(--fault)", color: "var(--fg)" });
  has(".df-error::before", { content: '"×" / ""', "background-color": "var(--fault)", color: "var(--on-fault)", "font-family": "var(--font-mono)" });
  has(".df-error--alarm", { "background-color": "var(--fault-deep)" });
  has(".df-error--alarm::before", { content: '"× FAULT" / ""' });
  has(".df-warning", { border: "var(--stroke-hair) solid var(--caution)", color: "var(--fg)" });
  has(".df-warning::before", { content: '"∆" / ""', color: "var(--caution)", "font-family": "var(--font-mono)" });
  has(".df-confirmed", { border: "var(--stroke-hair) solid var(--edge)", color: "var(--fg)" });
  has(".df-confirmed::before", { content: '"›" / ""', color: "var(--fg-muted)", "font-family": "var(--font-mono)",
    animation: "df-confirmed-marker var(--dur-decay) var(--ease-standard)" });
  assert.equal(rule(".df-confirmed").animation, "df-confirmed-decay var(--dur-decay) var(--ease-standard)");
  assert.equal(rule("@keyframes df-confirmed-decay >> from")["border-color"], "var(--signal)");
  assert.equal(rule("@keyframes df-confirmed-marker >> from").color, "var(--signal)");
  assert.equal(rule("@keyframes df-confirmed-step >> from")["border-color"], "var(--signal)");
  // Reduced motion: signal on arrival, held for dur-decay, one step to rest; !important outranks the site-wide reduced rule.
  has("@media (prefers-reduced-motion: reduce) >> .df-confirmed", { animation: "df-confirmed-step var(--dur-decay) var(--ease-snap) !important" });
  has("@media (prefers-reduced-motion: reduce) >> .df-confirmed::before", { animation: "df-confirmed-marker var(--dur-decay) var(--ease-snap) !important" });
  has(".df-field", { border: "var(--stroke-hair) solid var(--edge)", "border-radius": "var(--radius-0)", "background-color": "var(--field-deep)",
    color: "var(--fg)", "font-family": "var(--font-mono)" });
  has(".df-field::placeholder", { color: "var(--fg-faint)" });
  has('.df-field:is(:disabled, [aria-disabled="true"])', { "border-style": "dashed", color: "var(--fg-faint)" });
  has('.df-field[aria-invalid="true"]', { border: "var(--stroke-bold) solid var(--fault)" });
  assert.deepEqual(g.filter((d) => /user-invalid/.test(d.selector)).map((d) => d.selector), [], "invalid is shown only through aria-invalid");
  // Every generated glyph in the shared grammar ends with empty alternative text (the plain form before it is the fallback).
  const glyphs = Object.entries(Object.fromEntries(g.filter((d) => d.prop === "content" && d.value !== '""').map((d) => [d.selector, d.value])));
  assert.ok(glyphs.length >= 6, "glyph rules not found");
  assert.deepEqual(glyphs.filter(([, v]) => !/^"[^"]+" \/ ""$/.test(v)).map(([s, v]) => `${s} { content: ${v} }`), []);
});

// WCAG 2 contrast of every ink/ground pair the signatures introduce, read from tokens.css in each theme:
// text and glyphs at least 4.5:1, frames and field boundaries at least 3:1.
test("P5 state signatures: text and boundary pairs meet contrast in all three themes", async () => {
  const theme = {};
  for (const d of declarations(await read("styles/darkfield/tokens.css"))) {
    const t = /\[data-theme="(\w+)"\]/.exec(d.selector)?.[1];
    if (t && /^#[0-9a-f]{6}$/i.test(d.value)) (theme[t] ??= {})[d.prop.slice(2)] = d.value;
  }
  assert.deepEqual(Object.keys(theme).sort(), ["dark", "light", "mono"]);
  const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const GROUNDS = ["field", "field-deep", "surface-1", "surface-2", "surface-3"];
  const PAIRS = [
    ["fg", [...GROUNDS, "fault-deep"], 4.5], // messages, including on the alarm band
    ["on-fault", ["fault"], 4.5], // the annunciator glyph and word
    ["caution", GROUNDS, 4.5], ["signal", GROUNDS, 4.5], ["fg-muted", GROUNDS, 4.5], // warning glyph; confirmed marker on arrival and at rest
    ["fg-faint", ["field-deep"], 4.5], // field placeholder, and a disabled field's value
    ["fault", [...GROUNDS, "fault-deep"], 3], ["caution", GROUNDS, 3], ["signal-dim", GROUNDS, 3], ["edge", GROUNDS, 3], // frames
  ];
  const bad = [];
  for (const [t, c] of Object.entries(theme)) for (const [ink, grounds, min] of PAIRS) for (const gr of grounds) {
    const r = ratio(c[ink], c[gr]);
    if (!(r >= min)) bad.push(`${t}: ${ink} on ${gr} ${r.toFixed(2)} < ${min}`);
  }
  assert.deepEqual(bad, []);
});

// §13 Errors (P5-10): the not-found page reports a failed navigation with the error signature; a caught render error is
// a system-integrity fault and adds the alarm band. The signature sits on the container that holds the message and the
// next step. The heading words name the fault; the generated tile is silent.
test("P5 errors: the not-found page and the error boundaries carry the error signature on their content container", async () => {
  const CONTAINERS = [["pages/NotFound/NotFound.tsx", "not-found-content", false], ["components/common/ErrorBoundary.tsx", "error-content", true],
    ["components/common/AppErrorBoundary.tsx", "error-content", true], ["components/Terminal/TerminalErrorBoundary.tsx", "error-message", true]];
  for (const [file, container, alarm] of CONTAINERS) {
    const classes = [...(await read(file)).matchAll(/className="([^"]*)"/g)].map((m) => m[1].split(/\s+/)).filter((c) => c[0] === container);
    assert.equal(classes.length, 1, `${file}: one .${container}`);
    assert.ok(classes[0].includes("df-error"), `${file}: .${container} lacks df-error`);
    assert.equal(classes[0].includes("df-error--alarm"), alarm, `${file}: .${container} df-error--alarm`);
  }
  // Controls do not rest on the alarm band: the idle edge boundary is under 3:1 on fault-deep in Mono, so the actions sit on the field.
  for (const [file, tray] of [["components/common/ErrorBoundary.css", ".error-content .error-actions"], ["components/Terminal/TerminalErrorBoundary.css", ".terminal-error-boundary .error-actions"]]) {
    assert.ok(declarations(await read(file)).some((d) => topLevel(d.selector).includes(tray) && d.prop === "background-color" && d.value === "var(--field)"), `${file}: ${tray}`);
  }
});

// §13 Confirmed, Warning and Error (P5-9): a toast reports its outcome with the shared state signature, success as
// Confirmed (no check mark: §07 excludes it), and an informational toast with none. The pictogram type icons go (§14).
// The toast leaves when its exit transition ends, not on a timer of its own. The modal is a primary overlay (§08):
// the chamfer, and controls that follow the control model.
test("P5 toasts and modal: outcome states use the shared signatures; dialog controls are df-controls", async () => {
  const toast = await read("components/common/Toast.tsx");
  for (const icon of ["faCheckCircle", "faExclamationCircle", "faExclamationTriangle", "faInfoCircle"]) assert.doesNotMatch(toast, new RegExp(`\\b${icon}\\b`), icon);
  const map = /const TOAST_STATE\b[^=]*=\s*\{([^}]*)\}/.exec(toast);
  assert.ok(map, "Toast.tsx: TOAST_STATE map");
  assert.deepEqual(Object.fromEntries([...map[1].matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]])),
    { success: "df-confirmed", error: "df-error", warning: "df-warning", info: "" });
  assert.match(toast, /className=\{`toast toast-\$\{type\}[^`]*\$\{TOAST_STATE\[type\]\}`\}/, "the toast element takes its state class");
  assert.doesNotMatch(toast, /setTimeout\([^;]*,\s*\d+\s*\)/, "Toast.tsx: a hand-timed exit");
  const classes = (code, first) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].split(/\s+/)).filter((c) => c[0] === first);
  assert.ok(classes(toast, "toast-close").every((c) => c.includes("df-control")) && classes(toast, "toast-close").length === 1, "toast-close df-control");
  const modal = await read("components/common/Modal.tsx");
  assert.ok(classes(modal, "modal-content").length === 1 && classes(modal, "modal-content")[0].includes("df-cut-md"), "modal-content df-cut-md");
  for (const first of ["modal-close", "modal-button"]) {
    const found = classes(modal, first);
    assert.ok(found.length > 0 && found.every((c) => c.includes("df-control") && c.includes("df-label")), `${first}: df-control df-label`);
  }
});
