// web/scripts/darkfield-surfaces.test.mjs: Phase 5 static invariants (governed interface around creative content).
import test from "node:test";
import assert from "node:assert/strict";
import { read, governed, declarations, innermost, where, NATIVE, NATIVE_KEYFRAMES, PHASE5, NATIVE5, HOLDS5, DEAD_RULES5, ANNALS_MARKER_PINS } from "./darkfield-css-scope.mjs";

// Stylesheets a Phase 5 task has finished; the rules below hold for these. Task 24 requires DONE5 to equal PHASE5.
export const DONE5 = ["pages/NotFound/NotFound.css", "components/common/ErrorBoundary.css", "components/Terminal/TerminalErrorBoundary.css",
  "components/common/Toast.css", "components/common/ToastContainer.css", "components/common/Modal.css", "components/common/PageLoader.css",
  "pages/ProceduralAnimations/ProceduralAnimations.css", "pages/ProceduralAnimationPiece/ProceduralAnimationPiece.css",
  "components/ProjectMedia/ProjectMedia.css", "pages/Simulations/Simulations.css", "components/SimulationCard/SimulationCard.css",
  "pages/OrbitalSimulator/OrbitalSimulator.css", "pages/TrafficSimulator/TrafficSimulator.css",
  "components/Terminal/TerminalView.css", "components/Terminal/TerminalWindow.css", "components/Terminal/Terminal.css",
  "components/Terminal/TopUI.css", "components/Terminal/VimUI.css", "components/Terminal/ManPageUI.css",
  "components/SnakeGame/SnakeGame.css", "pages/SnakeGame/SnakeGame.css",
  "components/SpiderSolitaire/SpiderSolitaire.css", "pages/SpiderSolitaire/SpiderSolitaire.css", "pages/RhythmLab/RhythmLab.css",
  "components/RhythmLab/RhythmLab.css"];
// Rhythm Lab rules that were already dead (never rendered) when Task 19 found them: kept as found, excluded by name.
const RHYTHM_CSS = "components/RhythmLab/RhythmLab.css";
const RHYTHM_DEAD = [".rhythm-lab-audio-resume", ".rhythm-lab-record-button-active"];
const decls5 = async () => {
  const out = [];
  for (const file of (await governed(".css")).filter((f) => DONE5.includes(f))) {
    const skip = [...(NATIVE5[file] ?? []), ...(DEAD_RULES5[file] ?? []), ...(file === RHYTHM_CSS ? RHYTHM_DEAD : [])];
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
// The terminal colour aliases (and the preview hold's --terminal-primary) are retired; the terminal window's layout
// variables (--terminal-window-width, --terminal-safe-top, --terminal-floor-rows and the like) are not colours and stay.
const RETIRED = /var\(--(terminal-(text-|window-bg|header-bg|border|selection-|primary\b)|text-color|accent-color|hover-color|spacing-|border-radius-|transition-)/;
const UNTOKENED_TIME = /(?<![\w-])\d*\.?\d+m?s\b|\b(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier|steps)\b(?![\w-])/;

test("P5 scope: NATIVE5 covers Phase 2's NATIVE, every listed selector exists, DONE5 is within PHASE5", async () => {
  for (const [file, sels] of Object.entries(NATIVE)) for (const s of sels) assert.ok((NATIVE5[file] ?? []).includes(s), `${file} ${s}`);
  for (const [file, sels] of Object.entries(NATIVE5)) {
    const present = new Set(declarations(await read(file)).map((d) => innermost(d.selector)));
    for (const s of sels) assert.ok(present.has(s), `${file} ${s}`);
  }
  assert.deepEqual(DONE5.filter((f) => !PHASE5.includes(f)), []);
});
// The P5 rules, one predicate each: a declaration they return true for breaks the rule.
const P5_RULE = {
  colour: (d) => LITERAL.test(d.value) && !held(d) && !/^(content|font-family|grid-template-areas)$/.test(d.prop),
  geometry: (d) => /radius$/.test(d.prop) && !/^(0|var\(--radius-0\))$/.test(d.value),
  type: (d) => (d.prop === "font-family" && !/^(inherit|var\(--font-(sans|narrow|mono)\))$/.test(d.value)) ||
    (/^(font|font-size|line-height|letter-spacing|font-weight)$/.test(d.prop) && !/^(inherit|var\(--[a-z0-9-]+\))$/.test(d.value)),
  timing: (d) => (/^(transition|animation)(-duration|-timing-function|-delay)?$/.test(d.prop) && d.value !== "none" &&
    (UNTOKENED_TIME.test(d.value.replace(/var\([^)]*\)/g, "")) || /\ball\b/.test(d.value))) || RETIRED.test(d.value) ||
    (/\[data-theme/.test(d.selector) && !held(d)),
};
test("P5 colour: finished files name colours through tokens only, except holds", async () => {
  assert.deepEqual((await decls5()).filter(P5_RULE.colour).map(where), []);
});
test("P5 geometry: square corners", async () => {
  assert.deepEqual((await decls5()).filter(P5_RULE.geometry).map(where), []);
});
test("P5 type: families and type metrics only through tokens or the generated classes", async () => {
  assert.deepEqual((await decls5()).filter(P5_RULE.type).map(where), []);
});
test("P5 timing and variables: token-timed motion; no retired variable read; no theme-keyed rule", async () => {
  assert.deepEqual((await decls5()).filter(P5_RULE.timing).map(where), []);
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
// The route wrapper between main and every page (Layout.tsx's motion.div) has no class and is styled only inline; a rule
// can reach it only through main's child combinator, so a selector item ending there names an ancestor too (Task 21).
const ROUTE_WRAPPER = /(^|[\s>])(main|#main-content-area|\.app-content)\s*>\s*(div|\*)$/;
const derivedOnAncestors = (decls, colours) => {
  const derived = new Set(colours);
  for (let grew = true; grew;) {
    grew = false;
    for (const d of decls) if (d.prop.startsWith("--") && !derived.has(d.prop) && [...derived].some((n) => reads(d.value, n))) { derived.add(d.prop); grew = true; }
  }
  return decls.filter((d) => d.prop.startsWith("--") && derived.has(d.prop) && !colours.has(d.prop))
    .filter((d) => { const items = topLevel(innermost(d.selector)); return !items.includes("[data-theme]") && items.some((i) => ANCESTOR(subject(i)) || ROUTE_WRAPPER.test(flat(i).trim())); });
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
    ".df-control:hover { --df-bracket-ink: var(--fg-muted); }\n:root, [data-theme] { --z: var(--field); }\n.app-content > div { --w: var(--fg); }\n" +
    ".annals-page > .annals-sheet { --v: var(--fg); }";
  assert.deepEqual(derivedOnAncestors(declarations(css).map((d) => ({ file: "probe.css", ...d })), colours).map((d) => d.prop), ["--x", "--y", "--w"]);
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

// §13 Processing (P5-6) and the owner's loading decisions (2026-10-21). The loader keeps Phase 2's row-form scan. It
// states LOADING (with the §05 … glyph) and one plain message in a polite status region, and shows mm:ss beside it,
// outside that region, counted by a single interval from the moment the overlay mounts (DEV-2: no delay before it shows).
// Two later messages replace the first at the owner's thresholds and derive from the same count. Under reduced motion the
// travelling cell goes and the word stands alone. The overlay is a §08 panel over the dimmed page and leaves with
// ease-depart (§12 Create / remove). The Home actions keep their labels while their route loads, stay disabled, and
// set aria-busy; the grammar's busy rule takes over from Disabled and from hover and press.
test("P5 processing: the loader says LOADING with a plain message and mm:ss; the waiting home actions are busy", async () => {
  const tsx = await read("components/common/PageLoader.tsx");
  const classOf = (first) => [...tsx.matchAll(/className="([^"]*)"/g)].map((m) => m[1].split(/\s+/)).filter((c) => c[0] === first);
  const one = (first, type) => { const c = classOf(first); assert.ok(c.length === 1 && c[0].includes(type), `PageLoader.tsx: .${first} ${type}`); };
  one("page-loader__state", "df-label");
  one("page-loader__elapsed", "df-annotation");
  one("loading-text", "df-body-sm");
  assert.match(tsx, /className="page-loader__state df-label"[^>]*>\s*LOADING\s*</, "the state word");
  assert.doesNotMatch(tsx, /PENDING|SCANNING|SCAN/, "one state word");
  // The announced region holds the word and the message only; the timer is outside it and not announced.
  const status = /<div className="page-loader__status" role="status" aria-live="polite">([\s\S]*?)<\/div>/.exec(tsx);
  assert.ok(status, "a polite status region");
  assert.match(status[1], /page-loader__state[\s\S]*loading-text/);
  assert.doesNotMatch(status[1], /page-loader__elapsed/, "the timer is outside the status region");
  assert.match(tsx, /className="page-loader__elapsed df-annotation" role="timer" aria-live="off"/);
  assert.equal((tsx.match(/role="status"/g) ?? []).length, 1, "one status region");
  // Copy (owner): one generic line, then the two long-wait lines; no invented activity.
  for (const line of ["Loading the page.", "Still loading. This is taking longer than expected.", "Still waiting for the page to load."]) {
    assert.ok(tsx.includes(`"${line}"`), line);
  }
  assert.doesNotMatch(tsx, /loadingMessages|Math\.random|Reticulating|Compiling/, "invented loading messages");
  // Mounted with the overlay; one interval drives both the counter and the long-wait lines.
  assert.doesNotMatch(tsx, /setTimeout\(/, "PageLoader.tsx: a timeout");
  assert.doesNotMatch(tsx, /&&\s*\(?\s*<(span|p) className="(page-loader__(state|elapsed)|loading-text)/, "PageLoader.tsx: a conditional word, counter or message");
  assert.equal((tsx.match(/setInterval\(/g) ?? []).length, 1, "one interval");
  assert.match(tsx, /clearInterval\(/, "the interval is cleared on unmount");
  assert.match(tsx, /\{messageFor\(elapsed\)\}/, "the message derives from the elapsed count");

  const css = declarations(await read("components/common/PageLoader.css"));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const has = (sel, want) => { const r = rule(sel); for (const [p, v] of Object.entries(want)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  has(".page-loader-overlay", { background: "var(--df-scrim)" });
  has(".loader-content", { "background-color": "var(--surface-2)", border: "var(--stroke-hair) solid var(--edge)" });
  has(".loading-text", { margin: "0", color: "var(--fg-muted)" });
  has(".page-loader__state", { color: "var(--fg-muted)" });
  has(".page-loader__state::before", { content: '"…" / ""', "font-family": "var(--font-mono)" });
  has(".page-loader__elapsed", { color: "var(--fg-faint)" });
  has("@media (prefers-reduced-motion: reduce) >> .page-loader__scan", { display: "none" });
  has(".page-loader-overlay--leaving", { animation: "page-loader-out var(--dur-fast) var(--ease-depart) forwards", "pointer-events": "none" });
  assert.match(tsx, /page-loader-overlay--leaving/, "the leaving copy takes the leave class");

  // The Home actions: disabled and aria-busy together; the label never changes while busy.
  for (const [file, flags] of [["pages/Home/sections/HeroSection.tsx", ["isNavigatingToCaseStudies", "isNavigatingToWork"]],
    ["pages/Home/sections/FeaturedProjectsSection.tsx", ["isNavigatingToCaseStudies", "isNavigatingToProjects"]]]) {
    const code = await read(file);
    for (const flag of flags) {
      assert.match(code, new RegExp(`disabled=\\{${flag}\\}\\s*aria-busy=\\{${flag}\\}`), `${file}: ${flag}`);
      assert.doesNotMatch(code, new RegExp(`\\{${flag} \\?`), `${file}: ${flag} swaps the label`);
    }
    assert.doesNotMatch(code, /Loading\.\.\./, `${file}: a Loading... label`);
  }

  const g = declarations(await read("styles/darkfield/grammar.css"));
  const grule = (sel) => Object.fromEntries(g.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const busy = '.df-control[aria-busy="true"]';
  // The cell is drawn only where ::after is free: not on a latch (lamp) or a selected control (node).
  const cell = `${busy}:where(:not(.df-control--latch, [aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"]))::after`;
  for (const [p, v] of Object.entries({ "border-style": "solid", "border-color": "var(--edge)", color: "var(--fg-muted)", cursor: "progress" })) {
    assert.equal(grule(busy)[p], v, `${busy} { ${p} }`);
  }
  for (const [p, v] of Object.entries({ "inset-block-end": "0", width: "var(--cell-w)", height: "var(--stroke-bold)", "background-color": "var(--fg-muted)",
    animation: "df-processing-scan var(--dur-scan) var(--ease-linear) infinite" })) assert.equal(grule(cell)[p], v, `busy ::after { ${p} }`);
  assert.deepEqual(g.filter((d) => /aria-busy/.test(d.selector) && /::after/.test(d.selector) && d.selector.split(" >> ").pop() !== cell).map(where), [], "an unscoped busy ::after");
  assert.equal(grule(`@media (prefers-reduced-motion: reduce) >> ${cell}`).display, "none", "reduced: no cell");
  // Equal specificity: the busy rule comes after Disabled, so it takes over.
  const at = (sel) => g.findIndex((d) => d.selector === sel);
  assert.ok(at(busy) > at('.df-control:is(:disabled, [aria-disabled="true"])') && at('.df-control:is(:disabled, [aria-disabled="true"])') >= 0, "busy after Disabled");
  // Hover, press and the pressed value leave a busy control alone: every rule gated on the inactive states also names busy.
  const gate = g.filter((d) => /:is\(:hover, \[data-df-active\]\)|:is\(:active, \[data-df-pressed\]\)/.test(d.selector) && /:where\(:not\(:disabled/.test(d.selector));
  assert.ok(gate.length >= 4, "hover and press rules found");
  assert.deepEqual(gate.filter((d) => !/:where\(:not\([^)]*\[aria-busy="true"\]/.test(d.selector)).map(where), [], "hover or press reaches a busy control");
});

// Project media (Phase 5 Task 7; §13, §08 Layers and overlays, §06, principle 5). Recordings and stills are evidence: every
// <video> and content <img> carries the evidence marker, and nothing that holds a site control does (the focusable still
// wrapper stays unmarked). The chrome around them is governed: controls follow the control model in the label voice (the
// view switch is Selected through aria-pressed; actual size is a latch with its lamp), the bar is a surface-1 band over an
// L1 seam, the figure has seams but no closed frame, the caption is Narrator body with label-voice terms kept to the
// measure, and the inspector is a primary overlay over the scrim: its panel one surface above the bar, outlined in edge
// with the cut-md corner, its stage on field-deep. The bar's glyphs marked nothing and are gone.
test("P5 project media: evidence markers, control model, bar, caption and inspector surfaces", async () => {
  const files = { inline: await read("components/ProjectMedia/ProjectMedia.tsx"), inspector: await read("components/ProjectMedia/MediaInspector.tsx"),
    caption: await read("components/ProjectMedia/MediaCaption.tsx") };
  const tags = (code, tag) => [...code.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((m) => m[0]);
  for (const [name, code] of Object.entries({ inline: files.inline, inspector: files.inspector })) {
    const media = [...tags(code, "video"), ...tags(code, "img")];
    assert.ok(media.length >= (name === "inline" ? 2 : 2), `${name}: media elements not found`);
    for (const el of media) assert.match(el, /\bdata-df-region="evidence"/, `${name}: ${el.slice(0, 60)}`);
    assert.equal((code.match(/data-df-region=/g) ?? []).length, media.length, `${name}: a marker on something other than a video or img`);
    // A marked element holds no site control: video and img hold only <source> children.
    for (const m of code.matchAll(/<video\b[\s\S]*?<\/video>/g)) assert.doesNotMatch(m[0], /<(button|a|input|select|textarea)\b|tabIndex|role=/, `${name}: control inside a video`);
  }
  assert.doesNotMatch(/<div[^>]*media-inspector__still[^>]*>/.exec(files.inspector)?.[0] ?? "<div>", /data-df-region/, "the focusable still wrapper is marked");
  const classLists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].split(/\s+/));
  for (const [name, code] of Object.entries({ inline: files.inline, inspector: files.inspector })) {
    const controls = classLists(code).filter((c) => c[0] === "project-media__control");
    assert.ok(controls.length > 0 && controls.every((c) => c.includes("df-control") && c.includes("df-label")), `${name}: project-media__control df-control df-label`);
  }
  assert.equal((files.inspector.match(/aria-pressed=/g) ?? []).length, 3, "the view switch and actual size keep aria-pressed");
  // The view switch picks one of two views (Selected); actual size toggles a viewing mode on or off (Latched).
  const pressed = [...files.inspector.matchAll(/className="([^"]*)"\s+aria-pressed=\{([^}]*)\}/g)].map((m) => [m[2], m[1].split(/\s+/)]);
  assert.deepEqual(pressed.map(([v, c]) => [v, c.includes("df-control--latch")]),
    [['view === "recording"', false], ['view === "still"', false], ["actualSize", true]], "Selected views and a latched actual size");
  const has = (code, first, cls, where) => assert.ok(classLists(code).some((c) => c[0] === first && c.includes(cls)), `${where}: .${first} ${cls}`);
  has(files.inline, "project-media__label", "df-label", "ProjectMedia.tsx");
  has(files.inspector, "media-inspector__panel", "df-cut-md", "MediaInspector.tsx");
  has(files.inspector, "media-inspector__title", "df-label-lg", "MediaInspector.tsx");
  assert.match(files.caption, /\["project-media__caption", "df-body-sm",/, "MediaCaption.tsx: the caption takes df-body-sm");
  assert.ok(classLists(files.caption).filter((c) => c[0] === "project-media__caption-term").every((c) => c.includes("df-label-sm")) &&
    classLists(files.caption).some((c) => c[0] === "project-media__caption-term"), "MediaCaption.tsx: terms take df-label-sm");

  const cssText = await read("components/ProjectMedia/ProjectMedia.css");
  assert.doesNotMatch(cssText, /▍/, "label glyphs that mark nothing");
  const css = declarations(cssText);
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  // No closed frame around the figure: its border is transparent and outside its ground.
  want(".project-media", { border: "var(--stroke-hair) solid transparent", "background-clip": "padding-box" });
  want(".project-media > .project-media__caption p", { "max-width": "var(--measure-body)" });
  want(".media-inspector__caption", { "grid-template-columns": "repeat(auto-fill, min(100%, var(--measure-body)))" });
  want(".project-media__bar", { "background-color": "var(--surface-1)", "border-bottom": "var(--stroke-hair) solid var(--rule)", "--df-ground-up": "var(--surface-2)" });
  want(".project-media__label", { color: "var(--fg-muted)" });
  want(".project-media__caption", { "background-color": "var(--surface-1)", color: "var(--fg)" });
  want(".project-media__caption-term", { color: "var(--fg-muted)" });
  want(".media-inspector", { background: "var(--df-scrim)" });
  want(".media-inspector__panel", { "background-color": "var(--surface-2)", border: "var(--stroke-hair) solid var(--edge)", color: "var(--fg)",
    "--df-ground-up": "var(--surface-3)" });
  want(".media-inspector__stage", { "background-color": "var(--field-deep)" });
  // The controls take their colours from the control model only.
  assert.deepEqual(css.filter((d) => /project-media__control/.test(d.selector) && /^(color|background|background-color|border|border-color|border-radius)$/.test(d.prop)).map(where), []);
  assert.deepEqual(css.filter((d) => /\[data-theme/.test(d.selector)).map(where), [], "a theme-keyed rule");

  // Every text and boundary pair the chrome renders, read from tokens.css, in all three themes.
  const theme = {};
  for (const d of declarations(await read("styles/darkfield/tokens.css"))) {
    const t = /\[data-theme="(\w+)"\]/.exec(d.selector)?.[1];
    if (t && /^#[0-9a-f]{6}$/i.test(d.value)) (theme[t] ??= {})[d.prop.slice(2)] = d.value;
  }
  assert.deepEqual(Object.keys(theme).sort(), ["dark", "light", "mono"]);
  const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const PAIRS = [
    ["fg-muted", ["surface-1", "surface-2"], 4.5], // bar label, caption terms, idle controls on the bar, the actions row and the panel
    ["fg", ["surface-1", "surface-2", "surface-3"], 4.5], // caption text, the title, hovered controls one step up
    ["signal", ["signal-deep"], 4.5], ["on-signal", ["signal"], 4.5], // Selected view; the pressed inverse
    ["edge", ["surface-1", "surface-2", "surface-3"], 3], // control and panel boundaries
  ];
  const bad = [];
  for (const [t, c] of Object.entries(theme)) for (const [ink, grounds, min] of PAIRS) for (const gr of grounds) {
    const r = ratio(c[ink], c[gr]);
    if (!(r >= min)) bad.push(`${t}: ${ink} on ${gr} ${r.toFixed(2)} < ${min}`);
  }
  assert.deepEqual(bad, []);
});

// Simulations index and cards (Phase 5 Task 8; §13 card controls and Unavailable, §06, §08 Not a dashboard; D6 ruling). Each
// linked card is a card control: its title is a Narrator heading that carries the hover marker, the mode and status tags
// are context labels, Launch is an Instrument label, and the preview frame is a square field-deep well with an L1 rule
// boundary. A card that cannot be opened is Unavailable. The previews stay native: the hold on their content is kept
// as it is, and the snake preview's food keeps its own colour now that the bridge value it read is going away (D6 hold).
test("P5 simulations: index and card chrome, the preview frame, and the food preview's local hold", async () => {
  const classLists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].split(/\s+/));
  const card = await read("components/SimulationCard/SimulationCard.tsx");
  const cards = classLists(card).filter((c) => c[0] === "simulation-card");
  assert.deepEqual(cards.map((c) => c.join(" ")), ["simulation-card coming-soon df-control df-control--card df-control--unavailable",
    "simulation-card df-control df-control--card", "simulation-card df-control df-control--card"], "the three card forms");
  const has = (code, first, cls, file) => { const lists = classLists(code).filter((c) => c[0] === first);
    assert.ok(lists.length > 0 && lists.every((c) => cls.every((k) => c.includes(k))), `${file}: .${first} ${cls.join(" ")}`); };
  has(card, "simulation-card-badge", ["df-label-sm", "df-context"], "SimulationCard.tsx");
  has(card, "launch-button", ["df-label"], "SimulationCard.tsx");
  assert.equal((card.match(/<h3 className="df-heading-3">/g) ?? []).length, 3, "SimulationCard.tsx: each card title is df-heading-3");
  assert.equal((card.match(/<p className="df-body-sm">/g) ?? []).length, 3, "SimulationCard.tsx: each description is df-body-sm");
  const index = await read("pages/Simulations/Simulations.tsx");
  has(index, "simulations-title", ["df-heading-1"], "Simulations.tsx");
  has(index, "simulations-subtitle", ["df-body-lg"], "Simulations.tsx");

  const sim = declarations(await read("pages/Simulations/Simulations.css"));
  assert.deepEqual(sim.filter((d) => d.prop.startsWith("--")).map(where), [], "the page-scoped variables are gone");
  const simRule = (sel) => Object.fromEntries(sim.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  assert.equal(simRule(".simulations-container")["font-family"], "inherit");
  assert.equal(simRule(".simulations-title").color, "var(--fg)");
  assert.equal(simRule(".simulations-subtitle").color, "var(--fg-muted)");

  const css = declarations(await read("components/SimulationCard/SimulationCard.css"));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  want(".simulation-preview", { "background-color": "var(--field-deep)", border: "var(--stroke-hair) solid var(--rule)", overflow: "hidden", color: "var(--fg)" });
  // A pressed card does not pass its inverse ink into the preview: the frame keeps the at-rest ink.
  want(".simulation-card.df-control--card:is(:active, [data-df-pressed]) .simulation-preview.simulation-preview", { color: "var(--fg)" });
  assert.ok(!("border-radius" in rule(".simulation-preview")), "the preview frame is square");
  // The preview content's hold stays exactly as Phase 1 set it (D6 ruling confirms it).
  want(".simulation-preview > *", { "--terminal-primary": "#4CAF50" });
  want('[data-theme="light"] .simulation-preview > *', { "--terminal-primary": "#2a7331" });
  // The food preview keeps the value it rendered in every theme, held in its own rule.
  const food = css.filter((d) => d.selector === ".food-preview");
  assert.deepEqual(food.filter((d) => /var\(--accent-color/.test(d.value)).map(where), [], ".food-preview reads --accent-color");
  want(".food-preview", { "background-color": "#FFD700", "box-shadow": "0 0 8px #FFD700" });
  // A pressed card inverts its chrome only: native content in a marked region keeps its own ink (grammar.css).
  assert.ok(declarations(await read("styles/darkfield/grammar.css")).some((d) => d.prop === "color" && d.value === "inherit" &&
    /:is\(:active, \[data-df-pressed\]\) :not\([^)]*\[data-df-region\] \*\)$/.test(d.selector)), "the pressed card's colour reaches native regions");
  // Launch is a label inside the card, not a filled button: no ground of its own and no hover fill.
  assert.deepEqual(css.filter((d) => /launch-button/.test(d.selector) && /^(background|background-color|border|border-radius)$/.test(d.prop)).map(where), []);
  assert.deepEqual(css.filter((d) => /launch-button::before/.test(d.selector)).map(where), []);
  // The cards take their colours from the control model only.
  assert.deepEqual(css.filter((d) => /^(.* >> )?(a)?\.simulation-card(:[\w-]+)?$/.test(d.selector))
    .filter((d) => /^(color|background|background-color|border|border-color|border-radius|outline)$/.test(d.prop)).map(where), []);
});

// Orbital simulator chrome (Phase 5 Task 9; §13 control model, Disabled, Errors, Warning; §06 voices; §08 rail and field;
// §05 When bright signal appears). The header link is an operable breadcrumb (a light control); the eyebrow is Narrator
// supporting text, not a label. Every button is a control in the label voice; Play stays focusable while it cannot act
// (aria-disabled, guarded handler) and points at the reason. Selects and number inputs are fields; an input the browser
// rejects on submit is marked invalid beside the editor's error message. Show trails is a latch whose lamp follows the
// native checkbox, which stays focusable while the label draws the ring, and a keyboard press on it is Space, not Enter.
// The regions form one surface-1 face with no boxes of their own (§08 Not a dashboard): the canvas region is the one
// closed edge boundary, the inspector shares it, and the others meet on a single rule. Readouts pair Instrument labels
// with Machine values and units; a value that is changing (the simulation is running) takes the shared Live value
// class, and the inspector's heading carries the Live marker. The canvas is native: it keeps the inherited family and
// line height it rendered with.
test("P5 orbital: controls, fields, panels and readouts", async () => {
  const page = await read("pages/OrbitalSimulator/OrbitalSimulator.tsx");
  const controls = await read("components/OrbitalSimulator/SimulationControls.tsx");
  const inspector = await read("components/OrbitalSimulator/BodyInspector.tsx");
  const all = { "OrbitalSimulator.tsx": page, "SimulationControls.tsx": controls, "BodyInspector.tsx": inspector };
  const lists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].trim().split(/\s+/));
  const first = (code, name) => lists(code).filter((c) => c[0] === name);
  const one = (code, name, cls, file) => { const f = first(code, name); assert.ok(f.length === 1 && cls.every((k) => f[0].includes(k)), `${file}: .${name} ${cls.join(" ")}`); };
  one(page, "orbital-back", ["df-control", "df-control--light", "df-label"], "OrbitalSimulator.tsx");
  assert.match(page, /<Link className="orbital-back[^"]*" to="\/simulations">← Simulations<\/Link>/, "the back link keeps its words");
  one(page, "orbital-eyebrow", ["df-body-sm"], "OrbitalSimulator.tsx");
  assert.ok(!first(page, "orbital-eyebrow")[0].some((c) => /^df-label/.test(c)), "the eyebrow is not a label");
  assert.match(page, /<h1 className="[^"]*\bdf-heading-1\b[^"]*">Orbital Simulator<\/h1>/);
  // Every button in the three files is a df-control in the label voice; none uses the native disabled attribute.
  for (const [file, code] of Object.entries(all)) {
    const buttons = [...code.matchAll(/<button\b[^>]*?>/g)].map((m) => m[0]);
    assert.ok(buttons.length > 0 || file === "OrbitalSimulator.tsx", `${file}: buttons not found`);
    for (const b of buttons) assert.match(b, /className="[^"]*\bdf-control\b[^"]*\bdf-label\b[^"]*"/, `${file}: ${b.slice(0, 60)}`);
    assert.doesNotMatch(code, /(?<![\w-])disabled=\{/, `${file}: native disabled`);
    for (const el of [...code.matchAll(/<(select|input)\b[^>]*?>/g)].map((m) => m[0]).filter((e) => !/type="checkbox"/.test(e))) {
      assert.match(el, /className="[^"]*\bdf-field\b[^"]*\bdf-data\b[^"]*"/, `${file}: ${el.slice(0, 60)}`);
    }
  }
  one(controls, "orbital-primary", ["df-control", "df-label"], "SimulationControls.tsx");
  assert.match(controls, /aria-disabled=\{blocked \|\| undefined\}/, "Play: aria-disabled");
  assert.match(controls, /onClick=\{\(\) => \{\s*if \(!blocked\) simulation\.toggle\(\);?\s*\}\}/, "Play: the handler ignores a blocked press");
  assert.match(controls, /aria-describedby=\{reasons \|\| undefined\}/, "Play: the reason is linked");
  assert.match(page, /id="orbital-error"/); assert.match(page, /id="orbital-editing-note"/);
  one(controls, "orbital-checkbox", ["df-control", "df-control--latch", "df-label"], "SimulationControls.tsx");
  // States and readouts.
  const warning = first(page, "orbital-panel").filter((c) => c.includes("orbital-warning"));
  assert.ok(warning.length === 1 && warning[0].includes("df-error"), "OrbitalSimulator.tsx: the simulation's alert is an error");
  assert.match(page, /className="orbital-note df-warning[^"]*"[^>]*>\s*Step budget reached/, "the step-budget note is a warning");
  assert.match(inspector, /<p className="orbital-editor-error df-error[^"]*" role="alert">\{error\}<\/p>/, "the editor's message is an error");
  assert.match(inspector, /aria-invalid=\{invalid\.has\(field\.key\) \|\| undefined\}/, "a rejected field is marked invalid");
  assert.match(inspector, /onInvalid=/, "fields are marked when the browser rejects them on submit");
  assert.ok((inspector.match(/<dt className="df-label-sm">/g) ?? []).length === 4, "BodyInspector.tsx: dt df-label-sm");
  // Speed, position and velocity change while running; mass does not, so it is never Live.
  assert.ok((inspector.match(/<span className=\{`orbital-value df-data\$\{live\}`\}>/g) ?? []).length === 3, "BodyInspector.tsx: values df-data");
  assert.match(inspector, /<span className="orbital-value orbital-value--fixed df-data">\s*\{format\(body\.mass\)\}/, "BodyInspector.tsx: mass is a fixed value");
  // Live: the shared grammar class while running, on every changing value (elapsed, energy change, speed, position, velocity).
  for (const [file, code, n] of [["OrbitalSimulator.tsx", page, 2], ["BodyInspector.tsx", inspector, 3]]) {
    assert.match(code, /const live = simulation\.playing \? " df-data--live" : "";/, `${file}: the Live class follows the running state`);
    assert.equal((code.match(/className=\{`orbital-value df-data\$\{live\}`\}/g) ?? []).length, n, `${file}: Live values`);
    assert.doesNotMatch(code, /orbital-live/, `${file}: a local Live rule`);
  }
  assert.match(inspector, /className=\{`df-heading-3\$\{simulation\.playing \? " df-context--live" : ""\}`\}/, "the inspector heading carries the Live marker");
  const g = declarations(await read("styles/darkfield/grammar.css"));
  const liveRule = Object.fromEntries(g.filter((d) => d.selector === ".df-data.df-data--live").map((d) => [d.prop, d.value]));
  assert.deepEqual(liveRule, { color: "var(--signal)", "font-weight": "500" }, "grammar.css: the shared Live value class");
  // A checkbox or radio is pressed from the keyboard by Space, never Enter (pressAcknowledge.ts).
  const press = await read("utils/pressAcknowledge.ts");
  assert.match(press, /if \(event\.key === "Enter" && isToggle\(event\.target\)\) return;/, "Enter on a checkbox shows no press");
  assert.match(press, /event\.key === " " && !el\.matches\(BUTTONISH\) && !isToggle\(event\.target\)/, "Space on a checkbox presses its control");

  const css = declarations(await read("pages/OrbitalSimulator/OrbitalSimulator.css"));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  // One face: surface-1 regions with no gap; only the canvas region is closed (edge); the others draw one rule each.
  want(":is(.orbital-controls, .orbital-workspace, .orbital-messages, .orbital-context)", { "background-color": "var(--surface-1)", "--df-ground-up": "var(--surface-2)" });
  want(".orbital-field", { border: "var(--stroke-hair) solid var(--edge)", position: "relative" });
  want(".orbital-workspace", { gap: "0" });
  want(".orbital-controls", { "border-bottom": "var(--stroke-hair) solid var(--rule)", "margin-bottom": "calc(-1 * var(--stroke-hair))" });
  want(".orbital-messages, .orbital-context", { "border-top": "var(--stroke-hair) solid var(--rule)", "margin-top": "calc(-1 * var(--stroke-hair))" });
  assert.deepEqual(css.filter((d) => /^border(-(color|style|width))?$/.test(d.prop) && innermost(d.selector) !== ".orbital-field" &&
    !/orbital-checkbox.*::after$/.test(d.selector)).map(where), [], "a closed box other than the canvas region (the latch lamp aside)");
  assert.deepEqual(css.filter((d) => /orbital-(panel|inspector|workspace)/.test(d.selector) && /^border/.test(d.prop)).map(where), [], "a region line of its own");
  want(".orbital-checkbox:has(> input:checked)", { color: "var(--fg)" });
  want(".orbital-checkbox:has(> input:checked)::after", { "background-color": "var(--signal)", "border-color": "var(--signal)" });
  want(".orbital-checkbox:has(:focus-visible)", { "box-shadow": "var(--focus-ring)" });
  want(".orbital-eyebrow", { color: "var(--fg-muted)" });
  // The canvas keeps what it inherited before the chrome changed (native, D6).
  want(".orbital-canvas", { "font-family": "var(--font-mono)", "line-height": "1.55" });
  assert.ok(NATIVE5["pages/OrbitalSimulator/OrbitalSimulator.css"]?.includes(".orbital-canvas"), "the canvas rule is native");
  assert.deepEqual(css.filter((d) => /signal-dim|accent-color|terminal-/.test(d.value) || /\[data-theme/.test(d.selector)).map(where), []);
  // Controls take their colours from the control model only.
  assert.deepEqual(css.filter((d) => /(button|orbital-primary|orbital-back|orbital-checkbox)(:[\w-]+)*$/.test(d.selector) &&
    /^(color|background|background-color|border|border-color|border-radius)$/.test(d.prop)).map(where), []);
});

// Traffic simulator chrome (Phase 5 Task 10; §13 control model, Disabled, Errors, Warning, Direct manipulation; §06
// voices; §08 Not a dashboard; §05 When bright signal appears). As on the Orbital route: the header link is an operable
// breadcrumb, the eyebrow is Narrator supporting text, every button is a control in the label voice, Play stays
// focusable while it cannot act and points at the alert, selects are fields, and the simulation's alert and the
// step-budget note carry the error and warning signatures. The regions form one surface-1 face: the road region is the
// one closed edge boundary and the others meet on single rules. Readouts pair Instrument labels with Machine values and
// units; changing values take the shared Live value class while running and the groups' headings carry the Live
// marker. Each slider is a direct-manipulation control: a hairline in the edge colour along its range, a mark at every
// step (the count comes from the control), a heavier mark closing each end, and its value as a solid signal-coloured
// square with nothing filled behind it. The signal lamps are square
// cells that keep the renderer's colours. The canvases are native: they keep the type they inherited.
test("P5 traffic: controls, sliders, fields, panels and readouts", async () => {
  const page = await read("pages/TrafficSimulator/TrafficSimulator.tsx");
  const controls = await read("components/TrafficSimulator/TrafficControls.tsx");
  const readout = await read("components/TrafficSimulator/TrafficReadout.tsx");
  const all = { "TrafficSimulator.tsx": page, "TrafficControls.tsx": controls, "TrafficReadout.tsx": readout };
  const lists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].trim().split(/\s+/));
  const first = (code, name) => lists(code).filter((c) => c[0] === name);
  const one = (code, name, cls, file) => { const f = first(code, name); assert.ok(f.length === 1 && cls.every((k) => f[0].includes(k)), `${file}: .${name} ${cls.join(" ")}`); };
  one(page, "traffic-back", ["df-control", "df-control--light", "df-label"], "TrafficSimulator.tsx");
  assert.match(page, /<Link className="traffic-back[^"]*" to="\/simulations">← Simulations<\/Link>/, "the back link keeps its words");
  one(page, "traffic-eyebrow", ["df-body-sm"], "TrafficSimulator.tsx");
  assert.ok(!first(page, "traffic-eyebrow")[0].some((c) => /^df-label/.test(c)), "the eyebrow is not a label");
  assert.match(page, /<p className="traffic-eyebrow[^"]*">Local rules \/ queues \/ emergent congestion<\/p>/, "the eyebrow keeps its words");
  assert.match(page, /<h1 className="[^"]*\bdf-heading-1\b[^"]*">Traffic Simulator<\/h1>/);
  for (const [file, code] of Object.entries(all)) {
    const buttons = [...code.matchAll(/<button\b[^>]*?>/g)].map((m) => m[0]);
    assert.ok(buttons.length > 0 || file !== "TrafficControls.tsx", `${file}: buttons not found`);
    for (const b of buttons) assert.match(b, /className="[^"]*\bdf-control\b[^"]*\bdf-label\b[^"]*"/, `${file}: ${b.slice(0, 60)}`);
    assert.doesNotMatch(code, /(?<![\w-])disabled=\{/, `${file}: native disabled`);
    for (const el of [...code.matchAll(/<select\b[^>]*?>/g)].map((m) => m[0])) {
      assert.match(el, /className="[^"]*\bdf-field\b[^"]*\bdf-data\b[^"]*"/, `${file}: ${el.slice(0, 60)}`);
    }
  }
  assert.equal((controls.match(/<button\b/g) ?? []).length, 4, "TrafficControls.tsx: four buttons");
  assert.equal((controls.match(/<select\b/g) ?? []).length, 3, "TrafficControls.tsx: three selects");
  // Play: plain, first, and Disabled through aria-disabled with a guarded handler that names the alert.
  one(controls, "traffic-primary", ["df-control", "df-label"], "TrafficControls.tsx");
  assert.ok(controls.indexOf("traffic-primary") < controls.indexOf("Restart run"), "Play comes first");
  assert.match(controls, /aria-disabled=\{blocked \|\| undefined\}/, "Play: aria-disabled");
  assert.match(controls, /onClick=\{\(\) => \{\s*if \(!blocked\) simulation\.toggle\(\);?\s*\}\}/, "Play: the handler ignores a blocked press");
  assert.match(controls, /aria-describedby=\{blocked \? "traffic-error" : undefined\}/, "Play: the reason is linked");
  assert.match(page, /<p id="traffic-error" className="traffic-panel traffic-warning df-error[^"]*" role="alert">/, "the simulation's alert is an error");
  assert.match(page, /className="traffic-note df-warning[^"]*">\s*Step budget reached/, "the step-budget note is a warning");
  // Sliders: the range input carries df-range and its step count comes from the control's own range and step.
  const ranges = [...controls.matchAll(/<input\b[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.equal(ranges.length, 1, "one range input per control");
  assert.match(ranges[0], /className="df-range"/); assert.match(ranges[0], /type="range"/);
  assert.match(controls, /const stepCount = \(control: ControlSpec\) => Math\.round\(\(control\.max - control\.min\) \/ control\.step\);/, "the tick count is the control's data");
  assert.match(controls, /<span className="traffic-range" style=\{\{ "--df-range-steps": stepCount\(control\) \} as CSSProperties\}>\s*<RangeTicks steps=\{stepCount\(control\)\} \/>\s*<input/, "the marks and the input share the count");
  assert.match(controls, /<span className="traffic-range-ticks" aria-hidden="true">/, "the marks are decorative");
  assert.match(controls, /Array\.from\(\{ length: Math\.max\(0, steps - 1\) \}, \(_, i\) => \(\s*<span key=\{i\} style=\{\{ "--df-range-tick": i \+ 1 \} as CSSProperties\} \/>/, "one mark per step between the ends");
  // Page Up and Page Down share the Settings sliders' ten-step page (one helper for both); the other keys are native.
  assert.match(ranges[0], /onKeyDown=\{pageStepHandler\(params\[control\.key\], control\.min, control\.max, control\.step,/, "Traffic: page keys");
  assert.match(await read("components/SettingsPanel/SettingsControls.tsx"), /const pageStep = pageStepHandler\(value, min, max, step, onChange, disabled\);/, "Settings: the same page keys");
  assert.match(await read("utils/sliderPageStep.ts"), /\+ \(key === "PageUp" \? 10 : -10\)/, "ten steps per page");
  assert.match(controls, /<span id=\{`traffic-\$\{control\.key\}-label`\} className="df-label-sm">/, "the slider's name is a label");
  assert.match(controls, /<small className="df-body-sm">Changing this restarts the run\.<\/small>/);
  // Readouts and Live.
  assert.match(readout, /<dt className="df-label-sm">\{label\}<\/dt>/, "dt df-label-sm");
  assert.match(readout, /const live = simulation\.playing \? " df-data--live" : "";/);
  assert.match(page, /const live = simulation\.playing \? " df-data--live" : "";/);
  assert.match(page, /<output className=\{`traffic-value df-data\$\{live\}`\}/, "elapsed is Live while running");
  assert.match(readout, /fixed \? "traffic-value traffic-value--fixed df-data" : `traffic-value df-data\$\{live\}`/, "fixed values are never Live");
  assert.match(readout, /\["Density", value\([^\]]*"veh\/km", true\)\]/, "the ring's density is fixed");
  assert.match(readout, /const heading = `df-heading-3\$\{simulation\.playing \? " df-context--live" : ""\}`;/, "Live groups mark their headings");
  assert.equal((readout.match(/<h2 className=\{heading\}>/g) ?? []).length, 2, "Measurements and Signals headings");
  assert.match(page, /className=\{`df-label-sm df-context\$\{simulation\.playing \? " df-context--live" : ""\}`\}/, "the run state carries the Live marker");
  assert.doesNotMatch(Object.values(all).join("\n"), /traffic-live/, "a local Live rule");
  // The lamp keeps the renderer's colour inline (P5-2).
  assert.match(readout, /<span className="traffic-signal-lamp" style=\{\{ background: SIGNAL_COLORS\[signal\.state\] \}\} aria-hidden="true" \/>/);

  const css = declarations(await read("pages/TrafficSimulator/TrafficSimulator.css"));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  // One face: surface-1 regions; only the road region is closed (edge); the others draw one rule each, without gaps.
  want(":is(.traffic-controls, .traffic-workspace, .traffic-messages, .traffic-charts, .traffic-context)", { "background-color": "var(--surface-1)", "--df-ground-up": "var(--surface-2)" });
  want(".traffic-field", { border: "var(--stroke-hair) solid var(--edge)", position: "relative" });
  want(".traffic-workspace", { gap: "0" });
  want(".traffic-controls", { "border-bottom": "var(--stroke-hair) solid var(--rule)", "margin-bottom": "calc(-1 * var(--stroke-hair))" });
  want(".traffic-messages, .traffic-context", { "border-top": "var(--stroke-hair) solid var(--rule)", "margin-top": "calc(-1 * var(--stroke-hair))" });
  want(".traffic-charts", { "border-top": "var(--stroke-hair) solid var(--rule)", "margin-top": "calc(-1 * var(--stroke-hair))" });
  assert.deepEqual(css.filter((d) => /^border(-(color|style|width))?$/.test(d.prop) && !/^(0|none)$/.test(d.value) &&
    innermost(d.selector) !== ".traffic-field" && !/traffic-(swatch|chart|table)/.test(d.selector)).map(where), [], "a closed box other than the road region");
  assert.deepEqual(css.filter((d) => /traffic-(panel|readout-panel|workspace)/.test(d.selector) && /^border/.test(d.prop)).map(where), [], "a region line of its own");
  // Sliders (§13 Direct manipulation).
  const slider = '.traffic-slider input[type="range"].df-range';
  want(slider, { appearance: "none", "background-color": "transparent", border: "0" });
  const s = rule(slider);
  assert.equal(s["background-image"], "var(--df-range-rail), var(--df-range-rail), var(--df-range-rail)", "end marks and hairline");
  assert.equal(s["--df-range-rail"], "linear-gradient(var(--edge), var(--edge))", "the hairline and end marks are edge");
  assert.match(s["background-size"], /^var\(--stroke-bold\) var\(--cell-h\), var\(--stroke-bold\) var\(--cell-h\), calc\(100% - var\(--cell-h\)\) var\(--stroke-hair\)$/, "heavier end marks and a hairline");
  assert.deepEqual(css.filter((d) => /traffic-(slider|range)/.test(d.selector) && /gradient\(/.test(d.value) && d.prop !== "--df-range-rail").map(where), [], "no step marks from a gradient");
  want(".traffic-range", { "--df-range-inset": "calc(var(--cell-h) / 2)", position: "relative" });
  want(".traffic-range-ticks > span", { width: "var(--stroke-hair)", height: "var(--grid-unit)", "background-color": "var(--edge)", position: "absolute" });
  assert.match(rule(".traffic-range-ticks > span")["inset-inline-start"], /var\(--df-range-tick\) \/ var\(--df-range-steps\)/, "each mark sits at its step");
  // The handle is the Settings sliders' square (one slider look across the site).
  for (const thumb of [".traffic-slider .df-range::-webkit-slider-thumb", ".traffic-slider .df-range::-moz-range-thumb"]) {
    want(thumb, { "background-color": "var(--signal)", "border-radius": "var(--radius-0)", width: "var(--cell-h)", height: "var(--cell-h)" });
  }
  want(".traffic-slider .df-range::-moz-range-progress", { "background-color": "transparent" });
  assert.deepEqual(css.filter((d) => /accent-color/.test(d.prop)).map(where), [], "no native accent fill");
  // The lamp is a square cell.
  want(".traffic-signal-lamp", { width: "var(--cell-w)", height: "var(--cell-w)", "border-radius": "var(--radius-0)" });
  want(".traffic-eyebrow", { color: "var(--fg-muted)" });
  // The canvases keep what they inherited before the chrome changed (native, D6).
  want(".traffic-canvas, .traffic-spacetime", { "font-family": "var(--font-mono)", "font-size": "medium", "line-height": "1.55" });
  for (const sel of [".traffic-canvas, .traffic-spacetime", ".traffic-canvas", ".traffic-spacetime"]) {
    assert.ok(NATIVE5["pages/TrafficSimulator/TrafficSimulator.css"]?.includes(sel), `${sel} is native`);
  }
  // No retired variable; the only theme-keyed rule is the held speed ramp.
  assert.deepEqual(css.filter((d) => /signal-dim|accent-color|terminal-|brand-/.test(d.value) ||
    (/\[data-theme/.test(d.selector) && !/^--traffic-speed-/.test(d.prop))).map(where), []);
  // Controls take their colours from the control model only.
  assert.deepEqual(css.filter((d) => /(button|traffic-primary|traffic-back)(:[\w-]+)*$/.test(d.selector) &&
    /^(color|background|background-color|border|border-color|border-radius)$/.test(d.prop)).map(where), []);
});

// Traffic legends, chart and tables (Phase 5 Task 11; §15 Data visualisation; §09 Line hierarchy, Dash semantics; §12
// Stepped or smooth; §13 Inspect; §05 Rationing the secondary hues). The throughput is sampled, so its line steps: each
// sample holds level until the next sample's time, then the line steps to the new value, with no diagonal between
// samples. The axes are tick rails in edge, the gridlines the grid level, and there is no chart border; throughput is
// drawn in signal and the demand it is measured against in coolant, the only coolant mark. The measuring line, brackets, node and
// readout exist only while a sample is inspected. The legend names its bands in the label voice with Machine ranges
// and square swatches that keep the renderer's ramp (held). The tables put column names in the label voice and values in
// the Machine voice under single rules; the throughput table's disclosure is a latched control.
test("P5 traffic: the throughput chart, legend and tables are Darkfield diagrams", async () => {
  const chart = await read("components/TrafficSimulator/ThroughputChart.tsx");
  const page = await read("pages/TrafficSimulator/TrafficSimulator.tsx");
  const readout = await read("components/TrafficSimulator/TrafficReadout.tsx");
  // Sample-and-hold: the path is a move, then for every later sample a level run to its time and a step to its value.
  assert.match(chart, /const path = points\.map\(\(p, i\) => \(i \? `H\$\{x\(p\.time\)\}V\$\{y\(p\.flow\)\}` : `M\$\{x\(p\.time\)\},\$\{y\(p\.flow\)\}`\)\)\.join\(""\);/,
    "the line holds each sample, then steps");
  assert.doesNotMatch(chart, /`\$\{i \? "L"|[`"]L\$\{|"L"/, "no straight segment joins two samples");
  // Whole pixels: positions round to the pixel grid, hairlines sit half a pixel off it.
  assert.match(chart, /const hair = \(v: number\) => Math\.round\(v\) \+ 0\.5;/);
  assert.match(chart, /const x = \(t: number\) => Math\.round\(/); assert.match(chart, /const y = \(flow: number\) => Math\.round\(/);
  // Tick and bracket lengths come from the grid token, never a number in the component.
  assert.match(chart, /getPropertyValue\("--grid-unit"\)/);
  for (const name of ["traffic-chart-grid", "traffic-chart-axis", "traffic-chart-line", "traffic-chart-demand"]) assert.match(chart, new RegExp(`className="${name}"`));
  assert.equal((chart.match(/className="traffic-chart-tick df-annotation"/g) ?? []).length, 3, "tick values are annotations");
  assert.match(chart, /<tspan className="df-label-sm">demand<\/tspan> <tspan className="traffic-chart-label-value df-data">\{demand\}<\/tspan>/, "the demand label keeps its words");
  // Inspect: only while a sample is active.
  const inspect = chart.slice(chart.indexOf("{active && ("), chart.indexOf("Hit area"));
  for (const name of ["traffic-chart-cross", "traffic-chart-brackets", "traffic-chart-node"]) assert.ok(inspect.includes(`className="${name}"`), `${name} shows only while inspecting`);
  assert.match(chart, /\{active && \(\s*<div ref=\{readout\} className="traffic-chart-tooltip df-body-sm" style=\{\{ left: readoutLeft \}\} role="status">/, "the readout shows only while inspecting");
  assert.match(chart, /<span className="df-data">\{Math\.round\(active\.flow\)\}<\/span> <span className="df-label-sm">veh\/h<\/span>/, "readout value and unit");
  // The readout is placed by its left edge alone, on a whole pixel, and clamped inside the chart's box when neither side
  // of the measuring line holds it.
  assert.match(chart, /style=\{\{ left: readoutLeft \}\}/); assert.doesNotMatch(chart, /right: width - ax/);
  assert.match(chart, /const readoutLeft = Math\.round\(/); assert.match(chart, /Math\.max\(0, Math\.min\(box - readoutWidth, /);
  // Each bracket leg is its own run from the box's outer edge, so both legs cover the corner pixel.
  assert.match(chart, /return `M\$\{ox - sx \* 0\.5\},\$\{oy\}V\$\{oy - sy \* unit\}M\$\{ox\},\$\{oy - sy \* 0\.5\}H\$\{ox - sx \* unit\}`;/);
  assert.doesNotMatch(chart, /tabIndex|onKeyDown|onFocus/, "no keyboard inspection was added");
  // Tables.
  assert.match(chart, /<summary className="df-control df-control--latch df-label">Data table<\/summary>/);
  assert.equal((chart.match(/<th scope="col" className="df-label-sm">/g) ?? []).length, 3);
  assert.equal((chart.match(/<td className="df-data">/g) ?? []).length, 3);
  // Legend and readout qualifiers.
  assert.match(page, /<ul className="traffic-legend" aria-label=/, "the list itself sets no voice, so the ranges keep theirs");
  assert.match(page, /<span className="traffic-legend-name df-label-sm">\{bin\.label\}<\/span>/);
  assert.match(page, /<span className="traffic-legend-range df-data">/);
  assert.match(readout, /<span className="df-label-sm">\(free flow<\/span> \{seconds\(m\.freeFlowTripTime, true\)\}<span className="df-label-sm">\)<\/span>/, "the free-flow qualifier is a label");
  assert.match(readout, /\{value\(m\.queued\)\} <span className="df-data">of<\/span> \{value\(m\.onRoad, undefined, true\)\}/, "\"of\" belongs to the value phrase");
  // The time-space disclosure is acknowledged like a control; the other press targets are as before.
  assert.match(await read("utils/pressAcknowledge.ts"), /const TARGET = "\.df-control, \.df-prose a, \.site-header__brand, \.traffic-table > summary";/);

  const css = declarations(await read("pages/TrafficSimulator/TrafficSimulator.css"));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  want(".traffic-chart-grid", { stroke: "var(--rule)", "stroke-width": "var(--stroke-hair)", "stroke-opacity": "var(--opacity-ghost)" });
  want(".traffic-chart-axis", { stroke: "var(--edge)", "stroke-width": "var(--stroke-hair)", fill: "none" });
  want(".traffic-chart-tick", { fill: "var(--fg-faint)" });
  want(".traffic-chart-line", { stroke: "var(--traffic-chart-line)", "stroke-width": "var(--stroke-bold)", fill: "none" });
  want(".traffic-chart-demand", { stroke: "var(--coolant)", "stroke-width": "var(--stroke-hair)", "stroke-dasharray": "var(--dash-provisional)" });
  want(".traffic-chart-cross", { stroke: "var(--edge)", "stroke-width": "var(--stroke-hair)", "stroke-dasharray": "var(--dash-measure)" });
  want(".traffic-chart-brackets", { stroke: "var(--edge)", "stroke-width": "var(--stroke-hair)", fill: "none" });
  want(".traffic-chart-node", { fill: "var(--traffic-chart-line)", r: "var(--grid-half)" });
  want(".traffic-chart-tooltip", { "background-color": "var(--surface-2)", border: "var(--stroke-hair) solid var(--edge)", "border-radius": "var(--radius-0)" });
  assert.equal(rule(".traffic-chart-tooltip").transform, undefined, "the readout is laid on whole pixels, not translated");
  // §05 rationing: coolant marks the comparison series and nothing else.
  assert.deepEqual(css.filter((d) => /--coolant/.test(d.value)).map((d) => d.selector), [".traffic-chart-demand"]);
  // No chart border.
  assert.deepEqual(css.filter((d) => /traffic-chart(\s|$|,| svg)/.test(d.selector) && /^(border|outline)/.test(d.prop)).map(where), []);
  want(".traffic-swatch", { width: "var(--cell-w)", height: "var(--cell-w)", "border-radius": "var(--radius-0)" });
  for (let i = 0; i < 5; i++) {
    want(`.traffic-swatch-${i}`, { background: `var(--traffic-speed-${i})` });
    assert.ok(HOLDS5["pages/TrafficSimulator/TrafficSimulator.css"].some(([s, p]) => s === `.traffic-swatch-${i}` && p === "background"), `swatch ${i} is held`);
  }
  assert.equal(HOLDS5["pages/TrafficSimulator/TrafficSimulator.css"].length, 15, "ten ramp definitions and five swatches");
  want(".traffic-table :is(th, td)", { "border-bottom": "var(--stroke-hair) solid var(--rule)" });
  // The time-space table's creative-owned markup takes its voices from here.
  want(".traffic-slow-table td", { "font-family": "var(--font-mono)" });
  want(".traffic-slow-table th", { "font-family": "var(--font-narrow)", "text-transform": "uppercase" });
  want(".traffic-table > summary:not(.df-control)", { border: "var(--stroke-hair) solid var(--edge)", "border-radius": "var(--radius-0)", "font-family": "var(--font-narrow)" });
  want(".traffic-table[open] > summary:not(.df-control)::after", { "background-color": "var(--signal)" });
  want(".traffic-table > summary:not(.df-control):is(:active, [data-df-pressed])", { "background-color": "var(--signal)", color: "var(--on-signal)" });
});

// Terminal shell and window chrome (Phase 5 Task 12; §07 The cell; §06 voices; §05 Roles; §13 control model; §16
// Terminal cosplay; P5-7). The transcript, the prompt and the input are text graphics on the cell grid: the glyph style
// alone sets their metrics, so no rule here adds a size, a line height or letter-spacing, and no run inside a line takes
// horizontal padding that would push the characters after it off their cells. The window is a field-deep region under a
// surface-2 header band; its three controls are no longer coloured dots but labelled controls whose words are the
// accessible names they already had. The route intro is Narrator. The three stylesheets read tokens, not the terminal
// colour aliases (which Terminal.css still defines for the overlays until Task 14). The grep match band survives.
test("P5 terminal: shell, cell grid and window chrome", async () => {
  const ALIAS = /var\(--terminal-(text-primary|text-muted|text-error|text-success|text-info|window-bg|header-bg|border|selection-bg|selection-text)\)/;
  for (const file of ["components/Terminal/Terminal.css", "components/Terminal/TerminalView.css", "components/Terminal/TerminalWindow.css"]) {
    const dead = DEAD_RULES5[file] ?? [];
    assert.deepEqual(declarations(await read(file)).filter((d) => !dead.includes(innermost(d.selector)) && ALIAS.test(d.value)).map((d) => where({ file, ...d })), [],
      `${file} reads a terminal colour alias`);
  }
  assert.ok(DONE5.includes("components/Terminal/TerminalView.css") && DONE5.includes("components/Terminal/TerminalWindow.css"), "the two finished stylesheets are in DONE5");

  const lists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, " ").trim().split(/\s+/));
  const has = (code, first, cls, file) => { const f = lists(code).filter((c) => c[0] === first);
    assert.ok(f.length > 0 && f.every((c) => cls.every((k) => c.includes(k))), `${file}: .${first} ${cls.join(" ")}`); };
  const view = await read("components/Terminal/TerminalView.tsx");
  for (const name of ["terminal-message", "history-line", "prompt-symbol", "command-input", "reverse-search-indicator", "reverse-search-command", "reverse-search-info"]) {
    has(view, name, ["df-glyph"], "TerminalView.tsx");
  }
  has(view, "autocomplete-suggestions", ["df-data"], "TerminalView.tsx");
  // Grep's escape sequences still become the match band (the Phase 3 fix).
  assert.ok(view.includes(String.raw`/\x1b\[1;31m(.*?)\x1b\[0m/g`) && view.includes(`'<span class="grep-highlight">$1</span>'`), "grep highlight conversion");

  const shell = await read("components/Terminal/Terminal.tsx");
  assert.match(shell, /<h1 className="terminal-route-title df-heading-1">Terminal<\/h1>/);
  has(shell, "terminal-route-description", ["df-body"], "Terminal.tsx");

  const win = await read("components/Terminal/TerminalWindow.tsx");
  // The title shows the working directory, a case-sensitive machine value: Machine voice, never the uppercase label voice.
  has(win, "terminal-title", ["df-data"], "TerminalWindow.tsx");
  assert.ok(lists(win).filter((c) => c[0] === "terminal-title").every((c) => !c.some((k) => /^df-label/.test(k))), "the title is not a label");
  const buttons = [...win.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.deepEqual(buttons.map((b) => b[1].match(/className="([^"]*)"/)?.[1]),
    ["terminal-button close df-control df-label", "terminal-button minimize df-control df-label", "terminal-button maximize df-control df-label"], "close, minimise, maximise, in that order");
  for (const [, attrs, body] of buttons) {
    assert.doesNotMatch(attrs, /\btitle=/, "no tooltip repeats the label");
    // The visible words are the accessible name, unchanged.
    const name = attrs.match(/aria-label=(\{[^}]*\}|"[^"]*")/)?.[1], text = body.trim();
    assert.ok(name && (name === `"${text}"` || name === text), `visible text ${text} is the accessible name ${name}`);
  }
  assert.match(win, /"Close terminal"/); assert.match(win, /"Minimize terminal"/); assert.match(win, /isMaximized \? "Restore terminal" : "Maximize terminal"/);

  // The inert typewriter field is gone (Phase 2 hand-off).
  for (const file of ["types/terminal.ts", "hooks/useTerminal.ts", "hooks/useTerminalCore.ts", "components/Terminal/TerminalView.tsx"]) {
    assert.doesNotMatch(await read(file), /useTypewriter/, `${file}: useTypewriter`);
  }

  const rules = async (file) => { const dead = DEAD_RULES5[file] ?? []; return declarations(await read(file)).filter((d) => !dead.includes(innermost(d.selector))); };
  const rule = (decls, sel) => Object.fromEntries(decls.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (decls, sel, values) => { const r = rule(decls, sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  const viewCss = await rules("components/Terminal/TerminalView.css");
  assert.deepEqual(viewCss.filter((d) => /^(font|font-size|line-height|letter-spacing|font-weight)$/.test(d.prop)).map((d) => where({ file: "TerminalView.css", ...d })), [],
    "the cell metrics come from the glyph style alone");
  assert.deepEqual(viewCss.filter((d) => /(grep-highlight|reverse-search-command)/.test(d.selector) && /^padding/.test(d.prop)).map((d) => d.selector), [],
    "no run inside a line is padded off the grid");
  want(viewCss, ".terminal-body", { "background-color": "var(--field-deep)", color: "var(--fg)" });
  want(viewCss, ".history-line.error", { color: "var(--fault)" });
  want(viewCss, ".grep-highlight", { "background-color": "var(--signal-deep)" });
  want(viewCss, ".command-input", { padding: "0", "font-family": "var(--font-mono)" });
  const winCss = await rules("components/Terminal/TerminalWindow.css");
  want(winCss, ".terminal-container", { "background-color": "var(--field-deep)", border: "var(--stroke-hair) solid var(--edge)" });
  want(winCss, ".terminal-header", { "background-color": "var(--surface-2)", "--df-ground-up": "var(--surface-3)" });
  want(winCss, ".terminal-title", { color: "var(--fg-muted)" });
  assert.ok(!winCss.some((d) => /terminal-title/.test(d.selector) && d.prop === "text-transform"), "the title keeps its case");
  // The window is clipped, never scrollable, so focus cannot push its header out; its controls keep one row.
  want(winCss, ".terminal-container", { overflow: "clip" });
  want(winCss, ".terminal-buttons", { "flex-wrap": "nowrap" });
  // The dots are gone: the buttons take their look from the control model. Only their phone target is set here, a
  // minimum height for a label that wraps.
  assert.deepEqual(winCss.filter((d) => /\.terminal-button(?![\w-])/.test(d.selector)).map((d) => `${d.selector} ${d.prop}: ${d.value}`),
    ["@media (max-width: 768px), (pointer: coarse) >> .terminal-buttons .terminal-button min-block-size: calc(3 * var(--cell-h))",
      "@media (max-width: 768px), (pointer: coarse) >> .terminal-buttons .terminal-button padding-block: var(--space-1)"]);
  const shellCss = await rules("components/Terminal/Terminal.css");
  assert.deepEqual(shellCss.filter((d) => /terminal-route-(title|description)/.test(d.selector) && /^(font|font-size|line-height|letter-spacing|font-weight|text-transform)$/.test(d.prop))
    .map((d) => where({ file: "Terminal.css", ...d })), [], "the route intro takes the Narrator styles");
  want(shellCss, ".terminal-route-title", { color: "var(--fg)" });
  want(shellCss, ".terminal-route-description", { color: "var(--fg-muted)" });
  // The window keeps a floor of transcript rows (a site constant read by Terminal.tsx); below the floor it rises over the
  // intro, which is clipped away whole.
  assert.ok(Number(rule(shellCss, ".terminal-container")["--terminal-floor-rows"]) > 0, "a transcript floor is declared");
  want(shellCss, ".terminal-container", { overflow: "clip" });
  want(shellCss, ".terminal-route-intro--behind", { "clip-path": "inset(50%)" });
  assert.match(shell, /--terminal-floor-rows/);
});

// Terminal block cursor (Phase 5 Task 13; P5-8; §17 Composite recipes, Cursor; §12 What may repeat, Reduced motion by
// class; §16 Terminal cosplay; §11 Rules). The prompt hides the browser's caret and draws a flare block on the caret's
// cell, with the character under it knocked out in on-flare; it exists while the prompt is shown and its input is
// focused, and at no other time. The Vim cursor is the same block, present while the editor holds focus. Its blink is
// the one repeating liveness motion, token-timed, and stops under reduced motion. The unrendered .cursor rule and the
// two `blink` keyframes are gone.
test("P5 terminal: one block cursor, present only while the prompt or editor holds focus", async () => {
  const all = async (file) => declarations(await read(file));
  const rule = (decls, sel) => Object.fromEntries(decls.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (decls, sel, values, file) => { const r = rule(decls, sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${file} ${sel} { ${p} }`); };
  const block = { "background-color": "var(--flare)", width: "var(--cell-w)", height: "var(--cell-h)", "pointer-events": "none", "z-index": "var(--layer-focus)" };
  for (const [file, sel, frames] of [["components/Terminal/TerminalView.css", ".terminal-cursor", "terminal-cursor-blink"],
    ["components/Terminal/VimUI.css", ".vim-cursor", "vim-cursor-blink"]]) {
    const css = await read(file), decls = await all(file);
    assert.doesNotMatch(css, /@keyframes\s+blink\b/, `${file}: the old blink keyframes`);
    assert.ok(!decls.some((d) => innermost(d.selector) === ".cursor"), `${file}: the unrendered .cursor rule`);
    want(decls, sel, { ...block, color: "var(--on-flare)", animation: `${frames} calc(var(--dur-blink) * 2) var(--ease-snap) infinite` }, file);
    // The block blinks on and off in halves of the period; the step easing switches it, never fades it.
    assert.deepEqual(decls.filter((d) => d.selector.startsWith(`@keyframes ${frames} >> `)).map((d) => `${innermost(d.selector)} ${d.prop}: ${d.value}`),
      ["50% opacity: 0"], `${file}: ${frames}`);
    assert.match(css, new RegExp(`/\\* §12: liveness \\(cursor\\)[^*]*\\*/\\s*@keyframes ${frames}\\b`), `${file}: ${frames} is annotated`);
    assert.ok(decls.some((d) => /prefers-reduced-motion: reduce/.test(d.selector) && innermost(d.selector) === sel && d.prop === "animation" && d.value === "none"),
      `${file}: ${sel} is steady under reduced motion`);
    // The glow is a modifier the component adds for the Dark theme; the element itself exists only while focused.
    want(decls, `${sel}--glow`, { "box-shadow": "var(--glow-flare)" }, file);
  }
  // The prompt: no native caret; the block sits on the input's cell row. The end cell is padding inside each input's
  // own box, so a block there stays inside the input's focus ring.
  const view = await all("components/Terminal/TerminalView.css");
  want(view, ".command-input", { "caret-color": "transparent", "padding-inline-end": "var(--cell-w)" }, "TerminalView.css");
  want(view, ".reverse-search-input", { "padding-inline-end": "var(--cell-w)" }, "TerminalView.css");
  want(view, ".command-input-field", { position: "relative" }, "TerminalView.css");
  assert.equal(rule(view, ".command-input-field")["padding-inline-end"], undefined, "no end cell outside the input");
  want(view, ".terminal-cursor", { position: "absolute", top: "0", overflow: "hidden" }, "TerminalView.css");
  const tsx = await read("components/Terminal/TerminalView.tsx");
  // One block, hidden from assistive technology, rendered only while focused; both inputs (command and reverse search)
  // go through the same field.
  assert.equal((tsx.match(/className=\{`terminal-cursor df-glyph/g) ?? []).length, 1, "one cursor element");
  assert.match(tsx, /<span[^>]*className=\{`terminal-cursor df-glyph[^`]*`\}[^>]*aria-hidden="true"/);
  assert.match(tsx, /const cursor = focused && !composing && caret &&/);
  assert.equal((tsx.match(/\{\.\.\.cursorEvents\}/g) ?? []).length, 2, "the command and reverse-search inputs report to the one cursor");
  assert.equal((tsx.match(/^\s*\{cursor\}$/gm) ?? []).length, 2, "each input's field holds the cursor");
  // Offset: the caret's index times the cell width, less the input's horizontal scroll.
  assert.match(tsx, /const at = start \* cellW;/);
  assert.match(tsx, /const left = at - input\.scrollLeft;/);
  assert.match(tsx, /getPropertyValue\("--cell-w"\)/);
  for (const ev of ["onFocus", "onBlur", "onSelect", "onKeyUp", "onScroll", "onCompositionStart", "onCompositionEnd"]) assert.match(tsx, new RegExp(`\\b${ev}: `), ev);
  // Caret moves before keyup (a held key) and size changes re-place the block too.
  assert.match(tsx, /document\.addEventListener\("selectionchange", placeCursor\)/);
  assert.match(tsx, /new ResizeObserver\(\(\) => place\(true\)\)/);
  // Only a resize scrolls the input to reveal the caret; the user's own scrolling is never undone.
  assert.match(tsx, /onScroll: placeCursor,/);
  assert.match(tsx, /const placeCursor = useCallback\(\(\) => place\(false\), \[place\]\);/);
  assert.equal((tsx.match(/input\.scrollLeft = /g) ?? []).length, 2, "two reveal assignments");
  assert.equal((tsx.match(/if \(reveal && [^)]*\) input\.scrollLeft = /g) ?? []).length, 2, "both gated on reveal");
  // Vim: the same block on the current line, only while the editor has focus; no pixel literals for its position.
  const vim = await read("components/Terminal/VimUI.tsx");
  assert.doesNotMatch(vim, /\*\s*(8|20)\b|\+\s*40\b/, "numeric pixel literals for the cursor or the line scroll");
  assert.match(vim, /getComputedStyle\(document\.documentElement\)/);
  assert.match(vim, /getPropertyValue\("--cell-w"\)/);
  assert.match(vim, /getPropertyValue\("--cell-h"\)/);
  assert.match(vim, /editorFocused && isCurrentLine &&/);
  assert.match(vim, /className=\{`vim-cursor df-glyph[^`]*`\}[^>]*aria-hidden="true"/);
  assert.match(vim, /left: cursorPosition\.column \* cell\.w/);
  assert.match(vim, /translateY\(-\$\{scrollPosition \* cell\.h\}px\)/);
  assert.match(vim, /className=\{`vim-line df-glyph /);
  const vimCss = await all("components/Terminal/VimUI.css");
  want(vimCss, ".vim-line", { height: "var(--cell-h)" }, "VimUI.css");
  want(vimCss, ".vim-line-input", { "caret-color": "transparent" }, "VimUI.css");
});

// Terminal overlays: top, vim and man pages (Phase 5 Task 14; §07 The cell; §06 voices; §05 Roles; §08 Layers and
// overlays; §12 Traces, Reduced motion by class; §17 Composite recipes, Selected row). Each overlay dims the page with
// the shared scrim and is a field-deep terminal region under a surface-2 header band; its words are Machine text, the
// top table's column headers and the man page's section headings are Instrument labels. Nothing here is rounded or
// names a literal colour (the DONE5 rules above), and no Terminal stylesheet defines or reads a colour alias any more.
// The top rows' update flash becomes an afterglow timed by tokens, with no animation under reduced motion. A vim
// read-only line drops the syntax theme's inline-code ground and rounded corners.
test("P5 terminal overlays: top, vim and man pages", async () => {
  const OVERLAYS = ["Terminal", "TopUI", "VimUI", "ManPageUI"].map((n) => `components/Terminal/${n}.css`);
  for (const file of OVERLAYS) assert.ok(DONE5.includes(file), `${file} is in DONE5`);
  const ALIAS = /--terminal-(text-|window-bg|header-bg|border|selection-)/;
  const terminalCss = (await governed(".css")).filter((f) => /^components\/Terminal\/[^/]+\.css$/.test(f));
  assert.ok(terminalCss.length >= 7, "the Terminal stylesheets are found");
  for (const file of terminalCss) {
    assert.deepEqual(declarations(await read(file)).filter((d) => ALIAS.test(d.prop) || ALIAS.test(d.value)).map((d) => where({ file, ...d })), [],
      `${file} defines or reads a terminal colour alias`);
  }

  const lists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, " ").trim().split(/\s+/));
  const has = (code, first, cls, file) => { const f = lists(code).filter((c) => c[0] === first);
    assert.ok(f.length > 0 && f.every((c) => cls.every((k) => c.includes(k))), `${file}: .${first} ${cls.join(" ")}`); };
  const top = await read("components/Terminal/TopUI.tsx");
  for (const name of ["top-title", "top-controls", "top-system-info", "top-summary", "top-footer"]) has(top, name, ["df-data"], "TopUI.tsx");
  has(top, "top-table-header", ["df-label-sm"], "TopUI.tsx");
  assert.match(top, /className=\{`top-process-row df-glyph\$\{\s*selectedPid === process\.pid \? " selected" : ""\s*\}`\}/, "TopUI.tsx: rows are df-glyph");
  const man = await read("components/Terminal/ManPageUI.tsx");
  for (const name of ["man-page-title", "man-page-controls", "man-page-info"]) has(man, name, ["df-data"], "ManPageUI.tsx");
  has(man, "man-page-content", ["df-glyph"], "ManPageUI.tsx");
  has(man, "man-section-title", ["df-label"], "ManPageUI.tsx");
  const vim = await read("components/Terminal/VimUI.tsx");
  for (const name of ["vim-title", "vim-status-bar"]) has(vim, name, ["df-data"], "VimUI.tsx");
  has(vim, "vim-command-line", ["df-glyph"], "VimUI.tsx");

  const all = async (file) => declarations(await read(file));
  const rule = (decls, sel) => Object.fromEntries(decls.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (decls, sel, values, file) => { const r = rule(decls, sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${file} ${sel} { ${p} }`); };
  const frame = { "background-color": "var(--field-deep)", border: "var(--stroke-hair) solid var(--edge)" };
  const band = { "background-color": "var(--surface-2)" };
  const topCss = await all("components/Terminal/TopUI.css"), vimCss = await all("components/Terminal/VimUI.css"), manCss = await all("components/Terminal/ManPageUI.css");
  want(topCss, ".top-overlay", { background: "var(--df-scrim)" }, "TopUI.css");
  want(topCss, ".top-container", frame, "TopUI.css");
  for (const sel of [".top-header", ".top-footer"]) want(topCss, sel, band, "TopUI.css");
  want(vimCss, ".vim-overlay", { "background-color": "var(--df-scrim)" }, "VimUI.css");
  want(vimCss, ".vim-container", frame, "VimUI.css");
  want(vimCss, ".vim-editor", { "background-color": "var(--field-deep)", color: "var(--fg)" }, "VimUI.css");
  for (const sel of [".vim-header", ".vim-command-line", ".vim-status-bar"]) want(vimCss, sel, band, "VimUI.css");
  want(manCss, ".man-page-overlay", { background: "var(--df-scrim)" }, "ManPageUI.css");
  want(manCss, ".man-page-container", frame, "ManPageUI.css");
  for (const sel of [".man-page-header", ".man-page-footer"]) want(manCss, sel, band, "ManPageUI.css");

  // Selected process row: the signal-deep band, fg text, the key column in signal and a square signal node.
  want(topCss, ".top-process-row.selected", { "background-color": "var(--signal-deep)", color: "var(--fg)" }, "TopUI.css");
  want(topCss, ".top-process-row.selected .top-col-pid", { color: "var(--signal)" }, "TopUI.css");
  // Every other cell of the selected row reads fg: a muted cell colour elsewhere must be overridden on that row.
  const muted = topCss.filter((d) => d.prop === "color" && d.value === "var(--fg-muted)" && /^\.top-process-row \.top-col-/.test(d.selector))
    .flatMap((d) => d.selector.split(/\s*,\s*/).map((s) => s.replace(".top-process-row ", "")));
  assert.ok(muted.length > 0, "muted row cells found");
  for (const cell of muted.filter((c) => c !== ".top-col-pid")) {
    assert.ok(topCss.some((d) => d.prop === "color" && d.value === "var(--fg)" && d.selector.startsWith(".top-process-row.selected ") && d.selector.includes(cell)),
      `TopUI.css: ${cell} reads fg on the selected row`);
  }
  want(topCss, ".top-process-row.selected::before", { width: "var(--grid-half)", height: "var(--grid-half)", "border-radius": "var(--radius-0)",
    "background-color": "var(--signal)" }, "TopUI.css");
  // The rows' columns are whole cells; the header uses the same columns.
  for (const sel of [".top-table-header", ".top-process-row"]) want(topCss, sel, { "grid-template-columns": "var(--top-columns)", gap: "var(--cell-w)" }, "TopUI.css");
  for (const d of topCss.filter((x) => x.prop === "--top-columns")) {
    const tracks = d.value.match(/calc\(\d+ \* var\(--cell-w\)\)|\S+/g);
    assert.equal(tracks.length, 8, `${d.selector}: eight columns`);
    assert.deepEqual(tracks.filter((t) => !/^\d+fr$/.test(t) && !/^calc\(\d+ \* var\(--cell-w\)\)$/.test(t)), [], `${d.selector}: whole-cell columns`);
  }

  // Afterglow (§12 Traces) on a changed row: from signal through signal-dim, timed by tokens; none under reduced motion.
  const topText = await read("components/Terminal/TopUI.css");
  assert.doesNotMatch(topText, /processUpdate/, "the old update flash");
  assert.deepEqual(topCss.filter((d) => d.selector.startsWith("@keyframes top-afterglow >> ")).map((d) => `${innermost(d.selector)} ${d.prop}: ${d.value}`),
    ["from color: var(--signal)", "50% color: var(--signal-dim)"]);
  assert.match(topText, /\/\* §12: accumulation \(afterglow\) · a row's values changed \*\/\s*@keyframes top-afterglow\b/);
  want(topCss, ".top-process-row.updating > *", { animation: "top-afterglow var(--dur-decay) var(--ease-standard)" }, "TopUI.css");
  want(topCss, "@media (prefers-reduced-motion: reduce) >> .top-process-row.updating > *", { animation: "none" }, "TopUI.css");

  // Vim: a read-only line is part of the editor's square field (no inline-code ground or rounding); syntax runs keep the
  // line's voice; the current line is a band the flare cursor stands out on in every theme.
  want(vimCss, '.vim-line-content code[class*="language-"]', { font: "inherit", padding: "0", background: "none", "border-radius": "var(--radius-0)",
    color: "var(--fg)" }, "VimUI.css");
  want(vimCss, ".vim-editor code .token", { font: "inherit", color: "inherit" }, "VimUI.css");
  want(vimCss, ".vim-current-line", { "background-color": "var(--surface-1)" }, "VimUI.css");

  // Man: section headings take the label style (no own case or weight); commands keep the body's cells; no justified
  // lines, which would stretch the spaces off the cell grid.
  assert.deepEqual(manCss.filter((d) => /man-section-title/.test(d.selector) && /^(text-transform|font-weight|font-size)$/.test(d.prop)).map((d) => where({ file: "ManPageUI.css", ...d })), []);
  want(manCss, ".man-section-content code", { font: "inherit" }, "ManPageUI.css");
  for (const [file, decls] of [["TopUI.css", topCss], ["VimUI.css", vimCss], ["ManPageUI.css", manCss]]) {
    assert.deepEqual(decls.filter((d) => (d.prop === "text-align" && d.value === "justify") || (d.prop === "font-style" && d.value !== "normal")).map((d) => where({ file, ...d })), [],
      `${file}: no justified or italic runs`);
  }
});

// Snake chrome (Phase 5 Task 15; §08 Layers and overlays, Not a dashboard; §13 control model; §06 voices; D6 and C2
// rulings; P5-5). The board and its pieces are native: the board carries the native region marker and holds nothing
// else, so the overlays sit beside it in the game container. The container is a field-deep well; the scores are a
// surface-1 band in the well's corner that meets the board on rule seams, set in the site's family with the Machine
// voice (the score in fg, the high score in fg-muted). The paused and game-over overlays dim what lies behind with the
// shared scrim and hold a square panel on surface-2, outlined in edge; its heading keeps the words as written, with no
// case or tracking of its own. Play again and the touch buttons are controls: their colours, fills and press response
// come from the control model, and the touch controls are never made translucent.
test("P5 snake: the HUD band, the overlays and the controls", async () => {
  for (const file of ["components/SnakeGame/SnakeGame.css", "pages/SnakeGame/SnakeGame.css"]) assert.ok(DONE5.includes(file), `${file} is in DONE5`);
  const tsx = await read("components/SnakeGame/SnakeGame.tsx");
  const lists = (code) => [...code.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, " ").trim().split(/\s+/));
  const has = (first, cls) => { const f = lists(tsx).filter((c) => c[0] === first);
    assert.ok(f.length > 0 && f.every((c) => cls.every((k) => c.includes(k))), `SnakeGame.tsx: .${first} ${cls.join(" ")}`); };
  has("game-score", ["df-data"]);
  has("game-high-score", ["df-data"]);
  has("play-again-button", ["df-control", "df-label"]);
  has("touch-btn", ["df-control"]);
  // The shared paused and game-over panel is the view's one blocking overlay and holds its one action: a primary panel.
  has("game-over-content", ["df-cut-md"]);
  // Each touch button acts on the click a key press (or a mouse) sends, not only on touch contact.
  assert.equal((tsx.match(/onClick=\{\(e\) => handleTouchClick\(e, '(up|down|left|right)'\)\}/g) ?? []).length, 4, "SnakeGame.tsx: touch buttons act on click");
  // A mouse contact clears the touched flag, so a touch that ended without its click never swallows a mouse click.
  assert.equal((tsx.match(/onPointerDown=\{\(e\) => \{ if \(e\.pointerType === "mouse"\) touchedRef\.current = false; \}\}/g) ?? []).length, 4,
    "SnakeGame.tsx: a mouse contact clears the touch flag");
  assert.equal((tsx.match(/<h2 className="df-heading-2">/g) ?? []).length, 2, "SnakeGame.tsx: each overlay heading is df-heading-2");
  assert.equal((tsx.match(/<p className="df-body">/g) ?? []).length, 2, "SnakeGame.tsx: each overlay line is df-body");
  // The board is marked native and closes before the overlays open: no site control or text inside it.
  const board = /<div className="game-board"[^>]*>([\s\S]*?)\n {6}<\/div>/.exec(tsx);
  assert.ok(board && /data-df-region="native"/.test(board[0].split(">")[0]), "SnakeGame.tsx: .game-board carries data-df-region=\"native\"");
  assert.doesNotMatch(board[1], /<(button|h2|p)\b|game-over|game-overlay/, "SnakeGame.tsx: the board holds only the snake and the food");
  assert.match(tsx, /className="game-over-overlay"/);
  assert.match(tsx, /className="game-overlay"/);

  const comp = declarations(await read("components/SnakeGame/SnakeGame.css")), page = declarations(await read("pages/SnakeGame/SnakeGame.css"));
  const both = [...comp, ...page];
  const rule = (sel) => Object.fromEntries(both.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  want(".snake-game-container", { "background-color": "var(--field-deep)" });
  assert.deepEqual(both.filter((d) => d.selector === ".snake-game-container" && /^(background|backdrop-filter|filter|opacity)$/.test(d.prop)).map(where), [],
    "the container's translucent dim");
  want(".game-scores", { "background-color": "var(--surface-1)", "border-block-end": "var(--stroke-hair) solid var(--rule)",
    "border-inline-start": "var(--stroke-hair) solid var(--rule)", "font-family": "inherit" });
  want(".game-score", { color: "var(--fg)" });
  want(".game-high-score", { color: "var(--fg-muted)" });
  for (const sel of [".game-over-overlay", ".game-overlay"]) {
    assert.ok(both.some((d) => d.selector.split(/\s*,\s*/).includes(sel) && d.prop === "background-color" && d.value === "var(--df-scrim)"), `${sel} dims with the scrim`);
  }
  want(".game-over-content", { "background-color": "var(--surface-2)", border: "var(--stroke-hair) solid var(--edge)", "font-family": "inherit",
    "--df-ground-up": "var(--surface-3)" });
  assert.deepEqual(both.filter((d) => /game-over-content h2/.test(d.selector) && /^(text-transform|letter-spacing|font-size|font-weight)$/.test(d.prop)).map(where), [],
    "the overlay heading's own case, tracking and size");
  // Controls take their colours, fills and press from the model.
  assert.deepEqual(both.filter((d) => /play-again-button|touch-btn/.test(d.selector) &&
    /^(color|background|background-color|border|border-color|border-radius|transition)$/.test(d.prop)).map(where), []);
  assert.deepEqual(both.filter((d) => /:active/.test(d.selector)).map(where), [], "no :active rule of their own");
  assert.deepEqual(both.filter((d) => /touch-(controls|btn)/.test(d.selector) && d.prop === "opacity").map(where), [], "translucent touch controls");
  want(".touch-btn", { "--df-ground": "var(--field-deep)" });
  // The board and the pieces keep their own rules (NATIVE5).
  for (const sel of [".game-board", ".snake-segment", ".snake-segment.snake-head", ".food"]) {
    assert.ok(NATIVE5["components/SnakeGame/SnakeGame.css"].includes(sel), `${sel} is native`);
  }
});

// Snake HUD pairs (Phase 5 Task 16, P5-12; §06 Rules). Each score line splits into two voices: its label words in
// df-label and its number in df-data. The line's text and spacing stay those of the single string it was ("Score: N",
// "High: N"), so its text content and accessible text do not change. The game-over line stays one string (owner item).
test("P5 snake: HUD label and value in their own voices", async () => {
  const tsx = await read("components/SnakeGame/SnakeGame.tsx");
  const line = (first) => new RegExp(`<p className="${first}[ "][^>]*>([^\\n]*?)</p>`).exec(tsx)?.[1];
  for (const [first, label, value] of [["game-score", "Score:", "{score}"], ["game-high-score", "High:", "{highScore}"]]) {
    const inner = line(first);
    assert.ok(inner !== undefined, `SnakeGame.tsx: .${first} is one line`);
    assert.equal(inner, `<span className="df-label">${label}</span> <span className="df-data">${value}</span>`,
      `SnakeGame.tsx: .${first} sets its label in df-label and its number in df-data`);
    assert.equal(inner.replace(/<[^>]*>/g, ""), `${label} ${value}`, `SnakeGame.tsx: .${first} keeps its text and spacing`);
  }
  assert.match(tsx, /<p className="df-body">Final Score: \{score\}<\/p>/, "SnakeGame.tsx: the game-over line stays one string");
  // Colours: the labels are at the muted tier at rest; the score value stays fg and the high score value fg-muted.
  const css = declarations(await read("components/SnakeGame/SnakeGame.css"));
  const color = (sel) => css.filter((d) => d.selector === sel && d.prop === "color").map((d) => d.value);
  assert.deepEqual(color(".game-score .df-label"), ["var(--fg-muted)"], "SnakeGame.css: the score label reads fg-muted");
  assert.deepEqual(color(".game-score"), ["var(--fg)"], "SnakeGame.css: the score value reads fg");
  assert.deepEqual(color(".game-high-score"), ["var(--fg-muted)"], "SnakeGame.css: the high score reads fg-muted");
});

// Spider chrome (Phase 5 Task 17; §06 Rules; §13 Confirmed; D6 ruling; P5-5). The container takes the site's family; the
// board is the native playfield: it carries the native region marker, holds no site control, and keeps the type its
// cards inherited before the lift. Each stat pairs its label words (df-label-sm, fg-muted at rest) with its number
// (df-data, fg); the text and spacing stay those of the single string each stat was. The win banner reports a result
// with the Confirmed signature and no fills of its own.
test("P5 spider: the container, the stats, the win banner and the native board", async () => {
  for (const file of ["components/SpiderSolitaire/SpiderSolitaire.css", "pages/SpiderSolitaire/SpiderSolitaire.css"]) assert.ok(DONE5.includes(file), `${file} is in DONE5`);
  const tsx = await read("components/SpiderSolitaire/SpiderSolitaire.tsx");
  const stats = /<div className="spider-stats">([\s\S]*?)\n {8}<\/div>/.exec(tsx)?.[1];
  assert.ok(stats, "SpiderSolitaire.tsx: .spider-stats");
  const lines = stats.split("\n").map((l) => l.trim()).filter(Boolean);
  const want = [["Moves:", "{moveCount}"], ["Completed:", "{completedSuits}/8"], ["Stock:", "{Math.floor(stock.length / 10)}"]];
  assert.equal(lines.length, want.length, "SpiderSolitaire.tsx: three stats");
  for (const [i, [label, value]] of want.entries()) {
    assert.equal(lines[i], `<span className="df-data"><span className="df-label-sm">${label}</span> <span className="df-data">${value}</span></span>`,
      `SpiderSolitaire.tsx: the ${label} stat sets its label in df-label-sm and its number in df-data`);
    assert.equal(lines[i].replace(/<[^>]*>/g, ""), `${label} ${value}`, `SpiderSolitaire.tsx: the ${label} stat keeps its text and spacing`);
  }
  assert.match(tsx, /<div className="spider-win-banner df-confirmed df-body">You cleared the tableau!<\/div>/, "SpiderSolitaire.tsx: the win banner is Confirmed");
  // The board is marked native and holds only columns and cards.
  const board = /<div className="spider-board"[^>]*>([\s\S]*?)\n {6}<\/div>/.exec(tsx);
  assert.ok(board && /data-df-region="native"/.test(board[0].split(">")[0]), "SpiderSolitaire.tsx: .spider-board carries data-df-region=\"native\"");
  assert.doesNotMatch(board[1], /<(button|a|input|h[1-6]|p)\b|role=|tabIndex/, "SpiderSolitaire.tsx: the board holds no site control or text block");

  const comp = declarations(await read("components/SpiderSolitaire/SpiderSolitaire.css"));
  const rule = (sel) => Object.fromEntries(comp.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  assert.equal(rule(".spider-solitaire")["font-family"], "inherit", ".spider-solitaire { font-family }");
  assert.equal(rule(".spider-solitaire").color, "var(--fg)", ".spider-solitaire { color }");
  assert.equal(rule(".spider-board")["font-family"], '"Courier New", Monaco, monospace', ".spider-board keeps the stack its cards inherited");
  assert.deepEqual(comp.filter((d) => d.selector === ".spider-stats .df-label-sm").map((d) => `${d.prop}: ${d.value}`), ["color: var(--fg-muted)"],
    "the stat labels read fg-muted at rest");
  assert.deepEqual(comp.filter((d) => /spider-stats/.test(d.selector) && /^(font|font-size|font-family|color)$/.test(d.prop) && d.selector !== ".spider-stats .df-label-sm")
    .map((d) => where({ file: "SpiderSolitaire.css", ...d })), [], "the stats take their type and colours from the voices");
  assert.deepEqual(comp.filter((d) => /spider-win-banner/.test(d.selector) && /^(background|background-color|border|border-color|border-radius|font-weight|color)$/.test(d.prop))
    .map((d) => where({ file: "SpiderSolitaire.css", ...d })), [], "the win banner has no fills, frame or weight of its own");
  // The native rules stay native, and the empty-column hold keeps its value.
  for (const sel of [".spider-board", ".spider-column", ".spider-column:empty", ".spider-card", ".spider-card-rank"]) {
    assert.ok(NATIVE5["components/SpiderSolitaire/SpiderSolitaire.css"].includes(sel), `${sel} is native`);
  }
  assert.equal(rule(".spider-column:empty").border, "1px dashed var(--spider-empty-column-border)");
});

// Rhythm Lab ground, root and native gameplay (Phase 5 Task 18; P5-1, P5-5; §05 Roles; §10 Atmosphere by context; D6
// ruling; P2-3). The held rain is always dark, so the page renders the Dark token set when the site theme is Light and
// follows the site otherwise; its ground is a token under the rain, whose host rules stay as they were. The root takes
// the site's family and fg; the highway, its hit zones and its status keep the type and colours they had (pinned), its
// notes and target windows carry the native region marker, and the governed readers of the retired page variables read
// role tokens. No Rhythm Lab overlay or dialog leaves the page through a portal, so all of them render in its token set.
test("P5 rhythm lab: the scoped ground, the lifted root and the pinned native highway", async () => {
  assert.ok(DONE5.includes("pages/RhythmLab/RhythmLab.css"), "pages/RhythmLab/RhythmLab.css is in DONE5");
  const page = await read("pages/RhythmLab/RhythmLab.tsx");
  assert.match(page, /<div className="rhythm-lab-page" data-theme=\{theme === "light" \? "dark" : undefined\}>/,
    "RhythmLab.tsx: .rhythm-lab-page carries data-theme=\"dark\" only in Light");
  assert.match(page, /<MatrixRain3DBackground\n\s+theme="dark"\n\s+paused=\{isAnimationPaused\}\n\s+motionSpeed=\{backgroundMotionSpeed\}\n\s+reducedMotion=\{reducedMotion\}\n\s+\/>/,
    "RhythmLab.tsx: the rain keeps its props");
  const pageCss = declarations(await read("pages/RhythmLab/RhythmLab.css"));
  const pageRule = (sel) => Object.fromEntries(pageCss.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  assert.equal(pageRule(".rhythm-lab-page").background, "var(--field-deep)", ".rhythm-lab-page { background }");
  assert.equal(pageRule(".rhythm-lab-page")["color-scheme"], "dark", ".rhythm-lab-page { color-scheme }");
  assert.deepEqual(pageCss.filter((d) => d.prop.startsWith("--")).map((d) => `${d.selector} ${d.prop}`), [], "the page declares no variables");
  assert.deepEqual(pageRule(".rhythm-lab-background"), { position: "fixed", inset: "0", "z-index": "0", "pointer-events": "none" }, "the rain host is unchanged");
  assert.deepEqual(pageRule(".rhythm-lab-page .matrix-rain-3d-background"), { "z-index": "0" }, "the rain layer is unchanged");

  const comp = await read("components/RhythmLab/RhythmLab.css");
  const decls = declarations(comp);
  const rule = (sel) => Object.fromEntries(decls.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  assert.equal(rule(".rhythm-lab").color, "var(--fg)", ".rhythm-lab { color }");
  assert.equal(rule(".rhythm-lab")["font-family"], "inherit", ".rhythm-lab { font-family }");
  assert.doesNotMatch(comp, /var\(--(terminal-primary|text-color)\b/, "RhythmLab.css reads a retired page variable");
  // Native pins: the values the highway, its hit zones and its status had before the lift.
  const stack = '"Courier New", Monaco, monospace';
  assert.deepEqual([rule(".rhythm-lab-highway").color, rule(".rhythm-lab-highway")["font-family"]], ["#ffffff", stack], ".rhythm-lab-highway pins");
  assert.deepEqual([rule(".rhythm-lab-hit-zone").color, rule(".rhythm-lab-hit-zone")["font-family"]], ["#4caf50", stack], ".rhythm-lab-hit-zone pins");
  assert.equal(rule(".rhythm-lab-status")["font-family"], stack, ".rhythm-lab-status pin");
  for (const sel of [".rhythm-lab-highway", ".rhythm-lab-hit-zone", ".rhythm-lab-status", ".rhythm-lab-note", ".rhythm-lab-target-windows"]) {
    assert.ok(NATIVE5["components/RhythmLab/RhythmLab.css"].includes(sel), `${sel} is native`);
  }
  // The lane labels are governed: the small label voice at the muted tier.
  assert.equal(rule(".rhythm-lab-lane-label").color, "var(--fg-muted)", ".rhythm-lab-lane-label { color }");
  assert.deepEqual(decls.filter((d) => innermost(d.selector) === ".rhythm-lab-lane-label" && /^(font|font-size|font-weight|font-family|text-transform|letter-spacing)$/.test(d.prop))
    .map((d) => where({ file: "RhythmLab.css", ...d })), [], "the lane labels take their type from the voice");

  const highway = await read("components/RhythmLab/RhythmHighway.tsx");
  assert.match(highway, /<span className="rhythm-lab-lane-label df-label-sm">\{lane\.label\}<\/span>/, "RhythmHighway.tsx: lane labels in df-label-sm");
  assert.match(highway, /<span className="rhythm-lab-note" data-df-region="native" \/>/, "RhythmHighway.tsx: each note carries the native region marker");
  assert.match(highway, /<div className="rhythm-lab-target-windows" aria-hidden="true" data-df-region="native">/,
    "RhythmHighway.tsx: the target windows carry the native region marker");
  // P5-1: every Rhythm Lab overlay and dialog renders inside the scoped page; none is portalled out of it.
  for (const file of (await governed(".tsx")).filter((f) => /^(components|pages)\/RhythmLab\//.test(f))) {
    assert.doesNotMatch(await read(file), /createPortal|ViewportPortal/, `${file} portals out of the scoped page`);
  }
});

// Rhythm Lab chrome (Phase 5 Task 19; §13 control model, Selected, Latched, Disabled; §06 voices; §08 Not a dashboard;
// §05 When bright signal appears; P3-5). The families below (the header, audio panel, song selector, chart controls,
// panel tabs, run history, analytics, HUD and active session bar, with their @media forms) obey the P5 rules before the
// whole stylesheet joins DONE5 (Task 20). A rule belongs to them when the subject of each of its selectors does; no rule
// mixes them with the native gameplay or the in-highway overlays. Two rules there are already dead (never rendered) and
// are excluded by name.
export const RHYTHM_GOVERNED = [".rhythm-lab-header", ".rhythm-lab-eyebrow", ".rhythm-lab-title-row", ".rhythm-lab-back-link",
  ".rhythm-lab-audio-", ".rhythm-lab-preview-button", ".rhythm-lab-song-", ".rhythm-lab-recording-controls", ".rhythm-lab-chart-",
  ".rhythm-lab-record-button", ".rhythm-lab-import-status", ".rhythm-lab-panel-tabs", ".rhythm-lab-run-history", ".rhythm-lab-analytics",
  ".rhythm-lab-hud", ".rhythm-lab-active-", ".rhythm-lab-compact-action"];
// The class that owns a selector: its last compound that names a class (`.rhythm-lab-analytics-card dt` is the card's).
const owner = (item) => flat(item).trim().split(/\s*[\s>+~]\s*/).reverse().find((c) => c.includes(".")) ?? "";
const inRhythm = (item) => item === ".rhythm-lab h1" || RHYTHM_GOVERNED.some((p) => owner(item).startsWith(p));
const rhythmDecls = async () => declarations(await read(RHYTHM_CSS)).map((d) => ({ file: RHYTHM_CSS, ...d }))
  .filter((d) => topLevel(innermost(d.selector)).every(inRhythm) && !RHYTHM_DEAD.includes(innermost(d.selector)));
test("P5 rhythm lab chrome: the governed families obey the P5 rules", async () => {
  const all = declarations(await read(RHYTHM_CSS));
  assert.deepEqual(all.filter((d) => { const items = topLevel(innermost(d.selector)); return items.some(inRhythm) && !items.every(inRhythm); })
    .map((d) => where({ file: RHYTHM_CSS, ...d })), [], "a rule mixes the chrome families with other selectors");
  const decls = await rhythmDecls();
  assert.ok(decls.length > 150, `the families were not found (${decls.length} declarations)`);
  for (const [name, broken] of Object.entries(P5_RULE)) assert.deepEqual(decls.filter(broken).map(where), [], `P5 ${name}`);
  assert.deepEqual(derivedOnAncestors(decls, await colourTokens()).map(where), [], "P5 derived variables");
  // P3-5: no danger action keeps the fault hue; the chrome names no fault colour of its own.
  assert.deepEqual(decls.filter((d) => /var\(--fault/.test(d.value)).map(where), []);
  for (const dead of RHYTHM_DEAD) assert.ok(all.some((d) => innermost(d.selector) === dead), `${dead} is listed as dead but not found`);
});
test("P5 rhythm lab chrome: one face, control model, voices and Live", async () => {
  const files = ["RhythmLab", "SongControls", "ChartControls", "RunHistoryPanel", "RunAnalyticsPanel", "ActiveSessionHeader"];
  const code = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await read(`components/RhythmLab/${f}.tsx`)])));
  // Every button is a control in the label voice, except the saved-song trigger and options, which carry song titles
  // (below); none uses the native disabled attribute (§13 Disabled keeps focus).
  for (const [file, src] of Object.entries(code)) {
    for (const b of [...src.matchAll(/<button\b[^>]*?>/g)].map((m) => m[0])) {
      const voice = /rhythm-lab-song-(selector-trigger|option)\b/.test(b) ? "df-body-sm" : "df-label";
      assert.match(b, new RegExp(`className="[^"]*\\bdf-control\\b[^"]*\\b${voice}\\b[^"]*"`), `${file}: ${b.slice(0, 70)}`);
    }
    assert.doesNotMatch(src, /(?<![\w-])disabled=\{/, `${file}: native disabled`);
    for (const el of [...src.matchAll(/<(select|input)\b[^>]*?>/g)].map((m) => m[0]).filter((e) => !/type="file"/.test(e))) {
      assert.match(el, /className="[^"]*\bdf-field\b[^"]*\bdf-data\b[^"]*"/, `${file}: ${el.slice(0, 70)}`);
    }
  }
  const { RhythmLab: lab, SongControls: song, ChartControls: chart, ActiveSessionHeader: bar, RunHistoryPanel: hist, RunAnalyticsPanel: ana } = code;
  // Selected: the open panel's tab and the current saved song, by aria-selected. Latched: the starter mode, by aria-pressed.
  // Preview says what it will do in its own words (Preview or Stop), so it carries no pressed state as well.
  assert.equal((lab.match(/role="tab"\s+aria-selected=\{setupTab === "\w+"\}\s+className="df-control df-label"/g) ?? []).length, 3, "tabs");
  // Song titles are the person's own content: supporting text in their own case, the date an annotation (§06).
  assert.match(song, /className="rhythm-lab-song-option df-control df-body-sm"\s+role="option"\s+aria-selected=\{song\.id === activeSongId\}/, "song options");
  assert.match(song, /className="rhythm-lab-song-selector-trigger df-control df-body-sm"/, "the saved-song trigger");
  assert.match(song, /<span className="rhythm-lab-song-option-meta df-annotation">/, "the import date");
  assert.match(song, /className="rhythm-lab-preview-button df-control df-label"\s+type="button"\s+onClick=/, "preview");
  assert.doesNotMatch(song, /aria-pressed=\{isPreviewing\}|rhythm-lab-preview-button[^"]*df-control--latch/, "preview encodes its state twice");
  assert.match(chart, /className="rhythm-lab-chart-mode-button df-control df-control--latch df-label"\s+type="button"\s+aria-pressed=\{activeChartMode === "starter"\}\s+aria-disabled=\{isRecording \|\| undefined\}\s+onClick=\{unless\(isRecording, onSelectStarterMode\)\}/, "starter latch");
  assert.match(chart, /const unless = \(blocked: boolean, action: \(\) => void\) => \(\) => \{\s*if \(!blocked\) action\(\);\s*\};/, "a blocked press does nothing");
  assert.equal((chart.match(/aria-disabled=\{isPending \|\| undefined\}/g) ?? []).length, 6, "the rename field and the five management buttons");
  assert.match(chart, /if \(!isRecording\) onSelectRecordedChart\(/, "the chart select ignores a change while blocked");
  assert.match(song, /<span className="rhythm-lab-audio-picker-button df-control df-label" aria-hidden="true">/, "the picker's proxy control");
  assert.equal((song.match(/className="rhythm-lab-audio-error df-error df-body-sm"/g) ?? []).length, 3, "errors take the error signature");
  // Voices: values Machine, names Instrument, outcomes context labels (D7).
  assert.equal((ana.match(/<dt className="df-label-sm">/g) ?? []).length, 7, "analytics names");
  assert.equal((ana.match(/<dd className="df-data">/g) ?? []).length, 7, "analytics values");
  assert.equal((hist.match(/className="rhythm-lab-run-history-entry-badge df-label-sm df-context"/g) ?? []).length, 2, "history outcomes");
  assert.doesNotMatch(ana, /analytics-(positive|negative)/, "a change is not told by hue");
  // HUD: an Instrument name beside a Machine value; Live only while the run plays, with the • on the status label.
  for (const name of ["Score", "Combo", "Best"]) {
    assert.match(lab, new RegExp(`<span className="rhythm-lab-hud-label df-label-sm">${name}</span>\\{" "\\}\\s*<span className=\\{\`rhythm-lab-hud-value df-data\\$\\{hudLive\\}\`\\}>`), `HUD ${name}`);
  }
  assert.match(lab, /const hudLive =\s*phase === "playing" && !isPausedAfterVisibilityChange && !isRecording\s*\?\s*" df-data--live"\s*:\s*"";/, "HUD Live");
  assert.match(bar, /const isLive = phase === "playing" && !isPausedAfterVisibilityChange && !isRecording;/, "the bar's Live state");
  assert.match(bar, /rhythm-lab-active-status df-label-sm df-context\$\{\s*isLive \? " df-context--live" : ""\s*\}/, "the status label carries the Live marker");
  assert.match(bar, /className="rhythm-lab-active-filename df-data"/, "the file is a value");
  assert.equal((bar.match(/className="rhythm-lab-active-chip [^"]*df-label-sm df-context/g) ?? []).length + (bar.match(/rhythm-lab-active-chip rhythm-lab-active-status df-label-sm df-context/g) ?? []).length, 2, "two context labels");

  const css = declarations(await read(RHYTHM_CSS));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  // One surface-1 face with an L1 seam; regions inside share single rules; the menu is an overlay over the scrim.
  want(".rhythm-lab-header", { "background-color": "var(--surface-1)", border: "var(--stroke-hair) solid var(--rule)", "--df-ground-up": "var(--surface-2)" });
  want('.rhythm-lab-header:has(.rhythm-lab-song-selector-trigger[aria-expanded="true"])::before', { position: "fixed", "background-color": "var(--df-scrim)" });
  want(".rhythm-lab-song-list", { "background-color": "var(--surface-2)", border: "var(--stroke-hair) solid var(--edge)", "--df-ground-up": "var(--surface-3)",
    "grid-template-columns": "minmax(0, 1fr)" });
  want(".rhythm-lab-panel-tabs button", { "white-space": "nowrap" });
  // Phones, before a run: the setup face scrolls inside a bounded height so the ready check keeps its floor (not while
  // the saved-songs menu is open, so the menu is never cut by the face).
  want('@media (max-width: 600px) >> .rhythm-lab:not(.rhythm-lab-active-session) .rhythm-lab-header:not(:has([aria-expanded="true"]))',
    { "max-height": "max(var(--rhythm-lab-setup-floor), calc(100dvh - var(--rhythm-lab-stage-floor)))", "overflow-y": "auto" });
  // Small or coarse-pointer screens: the native file input gives way to its proxy control, which takes the target size.
  want("@media (max-width: 768px), (pointer: coarse) >> .rhythm-lab-audio-picker-button", { display: "inline-flex" });
  want("@media (max-width: 768px), (pointer: coarse) >> .rhythm-lab-audio-input", { position: "absolute", "clip-path": "inset(50%)" });
  want(".rhythm-lab-hud", { "border-top": "var(--stroke-hair) solid var(--rule)" });
  const closed = (await rhythmDecls()).filter((d) => /^border(-(style|width))?$/.test(d.prop));
  assert.deepEqual(closed.map((d) => d.selector), [".rhythm-lab-header", ".rhythm-lab-audio-input::file-selector-button", ".rhythm-lab-song-list"],
    "a closed box other than the face, the native picker's button and the menu");
  // The active session bar never lets its context labels slide under the actions: the context keeps its own minimum
  // width (no clipping), and on phones the bar takes two rows.
  assert.ok(!(await rhythmDecls()).some((d) => innermost(d.selector) === ".rhythm-lab-active-context" && /^(overflow|min-width)$/.test(d.prop)), "the context clips or shrinks below its labels");
  want("@media (max-width: 600px) >> .rhythm-lab-active-bar", { "grid-template-areas": '"back . actions" "context context context"' });
  want("@media (max-width: 600px) >> .rhythm-lab-active-context", { "grid-area": "context" });
  want(".rhythm-lab-active-chip", { flex: "0 0 auto", "white-space": "nowrap" });
});

// Rhythm Lab overlays, tutorial, results and dialogs (Phase 5 Task 20; §08 Layers and overlays; §13 control model,
// Errors, Focus, Avoid; §06 voices; C2 ruling; D8; P3-5). The whole stylesheet is finished (DONE5 above). The in-highway
// overlays and the tutorial prompt set the site's family and colour themselves, so none inherits the native highway's
// pins; overlay panels and dialogs are opaque surface-2 faces in an edge boundary over the scrim, and only the dialogs
// take the chamfer (the overlay and panel class lists are identities other records name, so they never change). Every
// action is a control in the label voice with no fill and no fault hue. Results are name and value pairs, the score a
// settled readout (never Live: it does not count). The bounded setup face keeps focus rings clear of its edge, and
// focus returns to the saved-songs trigger after a song is chosen and to a dialog's opener when the dialog closes.
test("P5 rhythm lab overlays and dialogs: re-grounded faces, governed type and the control model", async () => {
  const names = ["RhythmLab", "ReadyCheckPanel", "PauseMenu", "RunSummaryPanel", "RhythmLabTutorial", "RhythmLabDialogShell",
    "DeleteChartDialog", "ClearRunHistoryDialog", "ImportChartMismatchDialog", "SongControls"];
  const code = Object.fromEntries(await Promise.all(names.map(async (f) => [f, await read(`components/RhythmLab/${f}.tsx`)])));
  const classLists = (src) => [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
  // The overlay and its panel keep their exact class lists.
  const overlayLists = new Set(Object.values(code).flatMap(classLists).filter((c) => /\brhythm-lab-overlay/.test(c)));
  assert.deepEqual([...overlayLists].sort(), ["rhythm-lab-overlay", "rhythm-lab-overlay-panel", "rhythm-lab-overlay-panel rhythm-lab-pause-panel",
    "rhythm-lab-overlay-panel rhythm-lab-summary-panel"], "overlay class lists");
  // Actions: controls in the label voice (D8: no filled primary).
  let actions = 0;
  for (const [file, src] of Object.entries(code)) {
    for (const list of classLists(src).filter((c) => /\brhythm-lab-(primary-action|secondary-action|danger-button)\b/.test(c))) {
      actions += 1;
      assert.match(list, /\bdf-control df-label\b/, `${file}: ${list}`);
    }
  }
  assert.equal(actions, 17, "overlay, tutorial and dialog actions");
  for (const f of ["DeleteChartDialog", "ClearRunHistoryDialog", "ImportChartMismatchDialog"]) {
    assert.match(code[f], /<span className="rhythm-lab-modal-kicker df-label">/, `${f}: kicker`);
    assert.match(code[f], /<h2 id=\{?[^ ]+ className="df-heading-3">/, `${f}: heading`);
  }
  // Voices: overlay headings and the tutorial headline in the heading voice; supporting lines Narrator.
  for (const f of ["ReadyCheckPanel", "PauseMenu", "RunSummaryPanel", "RhythmLabTutorial"]) {
    assert.ok((code[f].match(/<h2[^>]*>/g) ?? []).every((h) => h === '<h2 className="df-heading-2">'), `${f}: overlay heading`);
    assert.ok((code[f].match(/<span>|<p>/g) ?? []).length === 0, `${f}: an unvoiced line`);
  }
  assert.match(code.RhythmLabTutorial, /className="rhythm-lab-tutorial-headline df-heading-2"/);
  assert.match(code.RhythmLabTutorial, /className="rhythm-lab-tutorial-detail df-body"/);
  assert.match(code.RhythmLabTutorial, /className="rhythm-lab-tutorial-step df-label"/);
  // Results: names Instrument, values Machine; the score a readout that is never Live; a failed save is an Error.
  const summary = code.RunSummaryPanel;
  assert.equal((summary.match(/<dt className="df-label-sm">/g) ?? []).length, 13, "result names");
  assert.equal((summary.match(/<dd className="df-data">/g) ?? []).length, 13, "result values");
  assert.match(summary, /<span className="df-label">\{isEarlyExit \? "Score" : "Final score"\}<\/span>\s*<strong className="df-readout-xl">\{runSummary\.score\}<\/strong>/);
  assert.doesNotMatch(summary, /df-data--live|df-context--live/, "the settled score is not Live");
  assert.match(summary, /className="rhythm-lab-summary-warning df-error df-body-sm"/);
  // Dialogs: the chamfer on the dialog; focus moves in on open and back to the opener on close; Escape unchanged.
  const shell = code.RhythmLabDialogShell;
  assert.match(shell, /`rhythm-lab-delete-dialog \$\{className\} df-cut-md`\s*:\s*"rhythm-lab-delete-dialog df-cut-md"/);
  assert.match(shell, /role="dialog"\s+aria-modal="true"\s+aria-labelledby=\{titleId\}\s+aria-describedby=\{descriptionId\}/);
  assert.match(shell, /const opener =[\s\S]*?initialFocusRef\.current\?\.focus\(\);\s*return \(\) => \{\s*if \(opener\?\.isConnected\) opener\.focus\(\);/);
  assert.match(shell, /if \(event\.key === "Escape"\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*onCancel\(\);/);
  // Saved songs: choosing a song returns focus to the trigger; the page does not take it to the game root instead.
  assert.match(code.SongControls, /onSongSelect\(song\.id\);\s*closePicker\(true\);/);
  assert.match(code.SongControls, /if \(returnFocus\) triggerRef\.current\?\.focus\(\);/);
  assert.doesNotMatch(code.RhythmLab.match(/const handleSongSelect = useCallback\([\s\S]*?\n {2}\);/)[0], /focusGame\(\)/, "handleSongSelect moves focus");

  const css = declarations(await read(RHYTHM_CSS));
  const rule = (sel) => Object.fromEntries(css.filter((d) => d.selector === sel).map((d) => [d.prop, d.value]));
  const want = (sel, values) => { const r = rule(sel); for (const [p, v] of Object.entries(values)) assert.equal(r[p], v, `${sel} { ${p} }`); };
  const face = { "background-color": "var(--surface-2)", border: "var(--stroke-hair) solid var(--edge)", "border-radius": "var(--radius-0)", "--df-ground-up": "var(--surface-3)" };
  // The overlays set their own family and colour (the highway pins its own); the faces are opaque surface-2.
  want(".rhythm-lab-overlay", { "background-color": "var(--df-scrim)", color: "var(--fg)", "font-family": "var(--font-sans)" });
  want(".rhythm-lab-tutorial-prompt", { color: "var(--fg)", "font-family": "var(--font-sans)" });
  want(".rhythm-lab-overlay-panel", face);
  want(".rhythm-lab-delete-dialog", face);
  want(".rhythm-lab-modal-backdrop", { "background-color": "var(--df-scrim)" });
  want(".rhythm-lab-overlay-panel h2", { color: "var(--fg)", "text-transform": "lowercase" });
  want(".rhythm-lab-overlay-panel h2::first-letter", { "text-transform": "uppercase" });
  // The actions set layout only: the control model owns boundary, ground and label in every state.
  const own = css.filter((d) => topLevel(innermost(d.selector)).some((i) => /rhythm-lab-(primary-action|secondary-action|danger-button)/.test(owner(i))));
  assert.deepEqual(own.filter((d) => /^(background|background-color|color|border|border-color|outline|box-shadow)$/.test(d.prop)).map((d) => where({ file: RHYTHM_CSS, ...d })), []);
  assert.ok(!css.some((d) => /var\(--(fault|caution)/.test(d.value) && !NATIVE5[RHYTHM_CSS].includes(innermost(d.selector))), "a state hue on the chrome");
  assert.ok(!css.some((d) => /rhythm-lab-tutorial-step:focus-visible/.test(d.selector)), "the tutorial step draws its own focus");
  // The bounded setup face scrolls a focused control clear of its edge by more than the ring.
  want('@media (max-width: 600px) >> .rhythm-lab:not(.rhythm-lab-active-session) .rhythm-lab-header:not(:has([aria-expanded="true"]))',
    { "overflow-y": "auto", "scroll-padding-block": "var(--space-2)" });
  want(".rhythm-lab-summary-panel", { overflow: "auto", "scroll-padding-block": "var(--space-2)" });
  // The dialog actions wrap rather than cross the chamfered face's edge on a narrow screen, and no action is wider than
  // its container.
  want(".rhythm-lab-delete-dialog-actions", { display: "flex", "flex-wrap": "wrap" });
  want(".rhythm-lab-primary-action, .rhythm-lab-secondary-action, .rhythm-lab-danger-button", { "min-width": "min(9rem, 100%)" });
});

// Annals I (Phase 5 Task 21; P5-3 option B, ruled; P5-2; §06 voices; §05 State encoding, Rationing the secondary hues;
// §15 legends; D6 ruling). The page root takes the site's family and fg. The parchment sheet is native and keeps the ink,
// stack and colour scheme it inherited from the page before the lift (the computed-style comparison reads it), and the six
// narrative markers keep theirs by their own pins. The sheet carries data-theme="light", so the chrome on it renders the
// Light token set in every theme. Governed rules live after the utilities and obey the P5 rules before the whole file
// joins DONE5 (Task 22).
const ANNALS_CSS = "pages/Annals/Annals.css";
const ANNALS_GOVERNED = "/* Governed Annals chrome (D6 ruling) */";
const SERIF = 'Georgia, Cambria, "Times New Roman", Times, serif';
const annalsClassLists = (src) => [...src.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
const annalsGoverned = async () => {
  const css = await read(ANNALS_CSS);
  const at = css.indexOf(ANNALS_GOVERNED);
  assert.ok(at > 0, `${ANNALS_CSS}: the governed section comment is missing`);
  const line = css.slice(0, at).split("\n").length;
  return { css, line, decls: declarations(css).map((d) => ({ file: ANNALS_CSS, ...d })) };
};
test("P5 annals: the lifted root, the pinned parchment and markers, and the scoped sheet", async () => {
  const tsx = await read("pages/Annals/Annals.tsx");
  assert.match(tsx, /<div className="annals-page page-content">/, "the root drops its type and ink utilities");
  assert.match(tsx, /<div className="annals-sheet max-w-5xl mx-auto px-5 py-8" data-theme="light">/, "the sheet renders the Light set");
  assert.equal((tsx.match(/data-df-region="native"/g) ?? []).length, 6, "six narrative markers");
  assert.equal((tsx.match(/data-theme=/g) ?? []).length, 1, "one scoped wrapper");
  const { decls } = await annalsGoverned();
  const rule = (sel) => decls.filter((d) => d.selector === sel).map((d) => `${d.prop}: ${d.value}`);
  assert.deepEqual(rule(".annals-page"), ["background: transparent", "color: var(--fg)", "font-family: inherit", "--annals-sheet-shadow: rgba(0, 0, 0, 0.3)"],
    ".annals-page: the root is lifted (no literal ink, stack or colour scheme)");
  // The parchment's own pins: what it inherited from the page before the lift.
  for (const want of ["color: #1c1917", `font-family: ${SERIF}`, "color-scheme: light"]) assert.ok(rule(".annals-sheet").includes(want), `.annals-sheet { ${want} }`);
  // The markers' pins: the serif stack where no mono ancestor sets one, the page's ink where a marker has no colour class, the
  // colour scheme for all six.
  const [family, ink, scheme] = ANNALS_MARKER_PINS;
  assert.deepEqual(rule(family), [`font-family: ${SERIF}`]);
  assert.deepEqual(rule(ink), ["color: #1c1917"]);
  assert.deepEqual(rule(scheme), ["color-scheme: light"]);
  for (const sel of [".annals-sheet", ...ANNALS_MARKER_PINS]) assert.ok(NATIVE5[ANNALS_CSS].includes(sel), `${sel} is native`);
  // No theme-keyed rule in the file but the parchment shadow's hold, so nothing keyed on the page's theme reaches the sheet.
  assert.deepEqual(decls.filter((d) => /\[data-theme/.test(d.selector)).map((d) => d.selector), ['[data-theme="light"] .annals-page']);
});
test("P5 annals chrome: governed rules follow the utilities and obey the P5 rules", async () => {
  const { line, decls } = await annalsGoverned();
  const governedDecls = decls.filter((d) => d.line > line);
  assert.ok(governedDecls.length >= 15, `governed rules not found (${governedDecls.length})`);
  assert.ok(decls.every((d) => d.line < line || !NATIVE5[ANNALS_CSS].includes(innermost(d.selector))), "a native rule below the governed comment");
  assert.ok(decls.filter((d) => d.line < line).every((d) => !/\.annals-(heading|readout|data|label|phrase|available|hint|footer|hand|legend|key|log|banner)\b/.test(d.selector)),
    "a governed class styled above the governed comment");
  assert.deepEqual(governedDecls.filter((d) => !topLevel(innermost(d.selector)).every((i) => /^\.annals-sheet \.annals-[\w-]+( > (span|div))?(::before)?$/.test(i))).map(where), [],
    "governed rules are scoped to the sheet's chrome classes");
  for (const [name, broken] of Object.entries(P5_RULE)) assert.deepEqual(governedDecls.filter(broken).map(where), [], `P5 ${name}`);
  assert.deepEqual(derivedOnAncestors(governedDecls, await colourTokens()).map(where), [], "P5 derived variables");
  const value = (sel, prop) => governedDecls.find((d) => d.selector === sel && d.prop === prop)?.value;
  // Labels and phrases are fg-muted at rest; the available hand is signal; held is fg-muted (§05 State encoding).
  assert.equal(value(".annals-sheet .annals-available", "color"), "var(--signal)");
  for (const c of ["annals-label", "annals-phrase", "annals-hint"]) assert.ok(governedDecls.some((d) => topLevel(d.selector).includes(`.annals-sheet .${c}`) && d.prop === "color" && d.value === "var(--fg-muted)"), `.${c} is fg-muted`);
  // Legends: the words are fg; the keys keep the narrative's inks (P5-2 holds, HOLDS5).
  assert.equal(value(".annals-sheet .annals-hand", "color"), "var(--fg)");
  assert.equal(value(".annals-sheet .annals-legend > span", "color"), "var(--fg)");
  for (const [s, p] of [[".annals-sheet .annals-hand::before", "background"], [".annals-sheet .annals-key--hand", "color"], [".annals-sheet .annals-key--baseline", "color"]]) {
    assert.ok(HOLDS5[ANNALS_CSS].some(([hs, hp]) => hs === s && hp === p), `${s} ${p} is a hold`);
  }
  // The log: Machine rows on the deep field between structure seams; the watched soul's banner: an ion-deep band, an ion
  // boundary, fg words (§05: a person's mark).
  assert.equal(value(".annals-sheet .annals-log", "background-color"), "var(--field-deep)");
  assert.equal(value(".annals-sheet .annals-log", "border-block"), "var(--stroke-hair) solid var(--rule)");
  assert.equal(value(".annals-sheet .annals-log > div", "color"), "var(--fg)");
  assert.equal(value(".annals-sheet .annals-banner", "background-color"), "var(--ion-deep)");
  assert.equal(value(".annals-sheet .annals-banner", "border"), "var(--stroke-hair) solid var(--ion)");
  assert.equal(value(".annals-sheet .annals-banner", "color"), "var(--fg)");
  assert.equal(value(".annals-sheet .annals-footer", "border-top"), "var(--stroke-hair) solid var(--rule)");
  assert.equal(value(".annals-sheet .annals-legend", "border-top"), "var(--stroke-hair) solid var(--rule)");
});
test("P5 annals chrome: voices, kept first classes, phrases never labels, the year never Live", async () => {
  const tsx = await read("pages/Annals/Annals.tsx");
  const has = (re, what) => assert.match(tsx, re, what);
  has(/<h1 className="text-4xl annals-heading"><span className="df-heading-1">The Annals<\/span><\/h1>/, "the title is a heading (its first class is a type utility, so the voice is an inner span)");
  // The year is a Machine readout with its label beside it; the words are unchanged ("Yr N").
  has(/<div className="text-5xl df-readout-xl annals-readout"><span className="df-label annals-label">Yr<\/span> \{world\.year\}<\/div>/, "the year readout");
  has(/<div className="text-xs mt-1 df-data annals-data">\s*\{living\(world\)\.length\} living/, "the census is Machine text");
  // Section names: Instrument labels; their first utility class stays (ids pair on first classes).
  for (const name of ["The Chronicle", "The Living", "Standing Feuds"]) has(new RegExp(`<h2 className="text-xs mb-2 df-label annals-label">${name}</h2>`), name);
  has(/<h2 className="text-xs mb-2 mt-4 df-label annals-label">Intervention Log<\/h2>/, "Intervention Log");
  for (const name of ["Fates That Diverged", "Houses"]) has(new RegExp(`<h3 className="text-xs mb-1\\.5 df-label annals-label">${name}</h3>`), name);
  // A phrase inside a heading stays Narrator text; only the name is a label.
  has(/<h2 className="text-sm mb-3">\s*<span className="df-label annals-label">The Fork<\/span>\s*<span className="text-xs ml-2 annals-phrase"><span className="df-body-sm">what your hand changed by year \{world\.year\}<\/span><\/span>/, "The Fork");
  has(/<h2 className="text-xs mb-2">\s*<span className="df-label annals-label">Your Hand<\/span> \{world\.token \? <span className="text-yellow-700 df-body-sm annals-available">· available<\/span> : <span className="text-stone-400 df-body-sm annals-phrase">· spent \(every 3rd year\)<\/span>\}/, "Your Hand");
  assert.ok(annalsClassLists(tsx).filter((c) => /\bannals-(phrase|available|hint)\b/.test(c)).every((c) => !/\bdf-label/.test(c)), "a phrase or hint in the label voice");
  // Hints and the footer: Narrator text at fg-muted; the legend's words in fg with a key cell.
  has(/<p className="text-xs mb-4 h-8 annals-hint">\s*<span className="df-body-sm">\{pending/, "the verb hint");
  has(/<p className="text-xs mt-2 annals-hint">\s*<span className="df-body-sm">Gold lines are <span className="text-yellow-700 annals-hand">your hand<\/span>\. Everything else, the world authored alone\.<\/span>/, "the chronicle legend");
  has(/<footer className="mt-6 pt-3 df-body-sm annals-hint annals-footer">/, "the footer");
  // The fork legend and the log are Machine text; the banner is Narrator text in the person's band.
  has(/<div className="text-xs pt-2 mt-2 flex gap-6 df-data annals-legend">\s*<span><span className="annals-key annals-key--baseline">○<\/span> Baseline: /, "the fork legend baseline");
  has(/<span className="text-yellow-700"><span className="annals-key annals-key--hand">●<\/span> Your hand: /, "the fork legend hand");
  has(/<div className="text-xs p-2 max-h-\[120px\] overflow-y-auto df-data annals-log">/, "the intervention log");
  has(/<div className="mb-4 px-4 py-2 df-body annals-banner">/, "the watched soul's banner");
  // The year advances only when a person lets a year pass: it is never Live.
  assert.doesNotMatch(tsx, /df-data--live|df-context--live|setInterval|requestAnimationFrame/, "the year readout is never Live");
  // Governed text drops the utilities that would fight its voice (after the first class).
  for (const c of annalsClassLists(tsx).filter((l) => /\bannals-(heading|readout|data|label|phrase|available|hint|legend|log|banner)\b/.test(l))) {
    assert.doesNotMatch(c.split(/\s+/).slice(1).join(" "), /\b(uppercase|tracking-[\w-]+|font-(serif|mono|bold|medium|semibold|normal)|text-(stone|yellow|red|amber)-\d+|text-(xs|sm|4xl|5xl)|leading-[\w-]+|tabular-nums|rounded|border(-[\w-]+)?|bg-[\w/-]+)\b/, c);
  }
});
