// web/scripts/darkfield-bridge.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const web = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(web, path), "utf8");
const cssFiles = async () => (await readdir(resolve(web, "src"), { recursive: true })).filter((f) => f.endsWith(".css"));
// Every legacy variable still read in src/ or index.html (rg, 2026-10-11).
const LEGACY = [
  "app-bg", "app-bg-secondary", "app-surface", "app-surface-elevated", "app-overlay",
  "app-text", "app-text-secondary", "app-text-muted", "app-border", "app-shadow",
  "brand-primary", "brand-primary-soft", "brand-primary-medium", "brand-primary-dark",
  "primary-color", "primary-color-light", "primary-color-medium", "primary-color-dark", "accent-color",
  "background-color", "background-color-secondary", "background-color-tertiary",
  "card-background", "panel-bg-color", "text-color", "text-color-secondary", "text-secondary",
  "text-color-muted", "text-muted-color", "border-color", "shadow-color",
  "bg-canvas-fill", "bg-glow-color", "bg-grid-major", "bg-grid-minor", "bg-topology",
  "bg-signal", "bg-center-lift", "bg-vignette",
];
// Variables whose legacy literal values are deliberately held (Phase 1 review): only these may sit in the fence.
const HELD = ["accent-color", "app-shadow", "bg-glow-color", "bg-grid-major", "bg-grid-minor", "bg-topology", "bg-signal", "bg-center-lift", "bg-vignette"];
// Aliases that resolve to grounds (signal-deep), so they must never colour text.
const GROUND_ALIASES = "brand-primary-soft|primary-color-light|brand-primary-dark|primary-color-dark";
const FENCE = /\/\* legacy:start \*\/([\s\S]*?)\/\* legacy:end \*\//g;

test("theme switching only selects a theme; it never writes token values", async () => {
  for (const file of ["src/contexts/ThemeContext.tsx", "index.html"]) {
    assert.doesNotMatch(await read(file), /setProperty\(\s*["']--/, file);
  }
});

test("legacy variables are defined only by the bridge", async () => {
  const indexCss = await read("src/index.css");
  const bridge = await read("src/styles/darkfield/bridge.css");
  for (const name of LEGACY) {
    assert.doesNotMatch(indexCss, new RegExp(`^\\s*--${name}\\s*:`, "m"), `index.css still defines --${name}`);
    assert.match(bridge, new RegExp(`--${name}:`), `bridge.css does not map --${name}`);
  }
});

test("literal colours appear only inside the legacy fence, and only for held variables", async () => {
  const bridge = await read("src/styles/darkfield/bridge.css");
  assert.doesNotMatch(bridge.replace(FENCE, ""), /#[0-9a-f]{3,8}\b|rgba?\(/i, "literal colour outside the fence");
  for (const [, fenced] of bridge.matchAll(FENCE)) {
    for (const [, name] of fenced.matchAll(/--([a-z0-9-]+)\s*:/g)) {
      assert.ok(HELD.includes(name), `--${name} is not an approved held variable`);
    }
  }
});

test("no text colour reads an alias that resolves to a ground", async () => {
  for (const file of await cssFiles()) {
    const css = await read(`src/${file}`);
    assert.doesNotMatch(css, new RegExp(`(?<![-\\w])color:\\s*var\\(--(${GROUND_ALIASES})\\b`), file);
  }
});
