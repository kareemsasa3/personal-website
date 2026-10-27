// web/scripts/darkfield-bridge.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const web = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(web, path), "utf8");
const cssFiles = async () => (await readdir(resolve(web, "src"), { recursive: true })).filter((f) => f.endsWith(".css"));
import { reachable, DEAD, isFile } from "./darkfield-css-scope.mjs";
// Colour and font aliases retired into tokens (Phase 3 Task 2).
const RETIRED = [
  "font-family-primary", "font-family-mono",
  "app-bg", "app-bg-secondary", "app-surface", "app-surface-elevated",
  "app-text", "app-text-secondary", "app-text-muted", "app-border",
  "brand-primary", "brand-primary-soft", "brand-primary-medium", "brand-primary-dark",
  "primary-color", "primary-color-light", "primary-color-medium", "primary-color-dark",
  "background-color", "background-color-secondary", "background-color-tertiary",
  "card-background", "panel-bg-color", "text-color", "text-color-secondary", "text-secondary",
  "text-color-muted", "text-muted-color", "border-color", "app-overlay",
];

test("theme switching only selects a theme; it never writes token values", async () => {
  for (const file of ["src/contexts/ThemeContext.tsx", "index.html"]) {
    assert.doesNotMatch(await read(file), /setProperty\(\s*["']--/, file);
  }
});

test("retired aliases are defined nowhere and read nowhere", async () => {
  const files = [...(await reachable()).filter((f) => /\.(css|tsx?)$/.test(f) && !DEAD.includes(f)), "../index.html"];
  for (const file of files) {
    const text = await read(file.startsWith("..") ? file.slice(3) : `src/${file}`);
    for (const name of RETIRED) {
      assert.doesNotMatch(text, new RegExp(`var\\(--${name}[,)]|--${name}\\s*:`), `${file} still uses --${name}`);
    }
  }
});

// The bridge is deleted (Phase 5 Task 23): its last held legacy value is retired. Snake's native food still reads it
// with its own fallback, but a later literal .food rule sets the colours it renders.
test("the bridge is gone: no bridge.css, no import of it, and no file defines --accent-color", async () => {
  assert.equal(await isFile(resolve(web, "src/styles/darkfield/bridge.css")), false, "bridge.css still exists");
  assert.doesNotMatch(await read("src/index.tsx"), /bridge\.css/, "index.tsx still imports bridge.css");
  const files = (await readdir(resolve(web, "src"), { recursive: true })).filter((f) => /\.(css|tsx?)$/.test(f)).map((f) => `src/${f}`);
  for (const file of [...files, "index.html"]) {
    assert.doesNotMatch(await read(file), /--accent-color["']?\s*:/, `${file} defines --accent-color`);
  }
});

// Grounds, seams and deep hues are never text colours. Exceptions: file + innermost selector, each removed by the named task.
const ALLOW = [];
test("no text colour reads a ground token", async () => {
  const ground = /(?<![-\w])color:\s*var\(--(field|field-deep|surface-[123]|rule|signal-deep|signal-trace|[a-z]+-deep)\b/;
  for (const file of (await reachable()).filter((f) => f.endsWith(".css"))) {
    if (DEAD.includes(file) || file === "styles/darkfield/tokens.css") continue;
    for (const rule of (await read(`src/${file}`)).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!ground.test(rule[2])) continue;
      const selector = rule[1].trim().split(/\s*\n\s*/).pop().trim();
      assert.ok(ALLOW.some(([f, s]) => f === file && selector.endsWith(s)), `${file} ${selector}`);
    }
  }
});

test("boot-shell fallbacks equal the Dark token values", async () => {
  const tokens = await read("src/styles/darkfield/tokens.css");
  const dark = /:root,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/.exec(tokens)[1];
  let seen = 0;
  for (const [, name, hex] of (await read("index.html")).matchAll(/var\(--([a-z0-9-]+),\s*(#[0-9a-fA-F]{3,8})\)/g)) {
    const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8});`).exec(dark);
    assert.ok(value, `--${name} is not a Dark token`);
    assert.equal(hex.toLowerCase(), value[1].toLowerCase(), `index.html fallback for --${name}`);
    seen += 1;
  }
  assert.ok(seen >= 6, "index.html boot shell reads no tokens");
});

// Held for D6 (native-visual or preview typography): file → selector. The Annals stylesheet is scanned like any other
// (Task 21): its mono utility styles native regions; the serif stacks fall outside the legacy pattern.
const FONT_HOLDS = [
  ["components/SpiderSolitaire/SpiderSolitaire.css", ".spider-board"],
  ["components/RhythmLab/RhythmLab.css", ".rhythm-lab-highway"],
  ["components/RhythmLab/RhythmLab.css", ".rhythm-lab-hit-zone"],
  ["components/RhythmLab/RhythmLab.css", ".rhythm-lab-status"],
  ["components/SimulationCard/SimulationCard.css", ".spider-preview-card-face"],
  ["pages/Annals/Annals.css", ".annals-page .font-mono"],
];
test("site CSS names fonts only through the Darkfield families, except recorded holds", async () => {
  const legacyStack = /(font-family|--terminal-font):[^;]*(Courier New|Monaco|Menlo|Ubuntu Mono|ui-monospace|-apple-system)[^;]*;/g;
  for (const file of await cssFiles()) {
    if (file === "styles/darkfield/tokens.css") continue;
    const css = await read(`src/${file}`);
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!legacyStack.test(rule[2])) continue;
      legacyStack.lastIndex = 0;
      const selector = rule[1].trim().split(/\s*\n\s*/).pop();
      assert.ok(FONT_HOLDS.some(([f, s]) => f === file && selector.endsWith(s)), `${file} ${selector}`);
    }
    legacyStack.lastIndex = 0;
    assert.doesNotMatch(css, /--font-family-primary\s*:/, `${file} defines --font-family-primary`);
    assert.doesNotMatch(css, /--font-family-mono\s*:/, `${file} defines --font-family-mono`);
  }
  assert.doesNotMatch(await read("index.html"), /font-family:[^;]*-apple-system/, "index.html route shell");
});
