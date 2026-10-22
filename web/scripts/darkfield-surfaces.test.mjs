// web/scripts/darkfield-surfaces.test.mjs: Phase 5 static invariants (governed interface around creative content).
import test from "node:test";
import assert from "node:assert/strict";
import { read, governed, declarations, innermost, where, NATIVE, NATIVE_KEYFRAMES, PHASE5, NATIVE5, HOLDS5, DEAD_RULES5 } from "./darkfield-css-scope.mjs";

// Stylesheets a Phase 5 task has finished; the rules below hold for these. Task 24 requires DONE5 to equal PHASE5.
export const DONE5 = ["pages/NotFound/NotFound.css", "components/common/ErrorBoundary.css", "components/Terminal/TerminalErrorBoundary.css",
  "components/common/Toast.css", "components/common/ToastContainer.css", "components/common/Modal.css", "components/common/PageLoader.css",
  "pages/ProceduralAnimations/ProceduralAnimations.css", "pages/ProceduralAnimationPiece/ProceduralAnimationPiece.css",
  "components/ProjectMedia/ProjectMedia.css", "pages/Simulations/Simulations.css", "components/SimulationCard/SimulationCard.css",
  "pages/OrbitalSimulator/OrbitalSimulator.css"];
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
