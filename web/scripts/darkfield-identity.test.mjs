// web/scripts/darkfield-identity.test.mjs: Phase 4 (Identity, R1) static invariants.
// Task 2 (D5 ruling): the header shows the registered R1 symbol, uncontained, one colour per theme, beside the wordmark.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { read, src, web, declarations, innermost } from "./darkfield-css-scope.mjs";
import { pngChunks } from "./darkfield-r1.mjs";

const SYMBOL = "assets/darkfield/darkfield-r1-symbol-currentcolor.svg";
const HEADER = "components/Navigation/HeaderNavigation.tsx";
const NAV_CSS = "components/Navigation/SiteNavigation.css";

test("T2 symbol: the vendored registered file is one currentColor path and nothing else", async () => {
  const svg = await read(SYMBOL);
  const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(paths.length, 1, "exactly one <path");
  assert.match(paths[0], /\sfill="currentColor"/);
  // The geometry is the registered file's own (its bytes are pinned in SOURCE.json); the test does not restate it.
  assert.match(paths[0], /\sd="[MHVLZ0-9 .]+"/);
  for (const banned of [/stroke/i, /transform/i, /filter/i, /<rect\b/i, /<metadata/i, /c2pa/i]) assert.doesNotMatch(svg, banned, String(banned));
  // No size attributes: the header sizes the symbol from tokens.
  assert.doesNotMatch(svg.match(/<svg\b[^>]*>/)[0], /\s(width|height)=/);
});

test("T2 header: the brand renders the registered symbol beside the Narrator wordmark; nothing translates the mark", async () => {
  const code = await read(HEADER);
  const imported = code.match(/^import (\w+) from "\.\.\/\.\.\/assets\/darkfield\/darkfield-r1-symbol-currentcolor\.svg\?raw";$/m);
  assert.ok(imported, "the header imports the registered file as text");
  const mark = code.match(/<span\b[^>]*className="site-header__brand-mark"[^>]*\/>/s)?.[0];
  assert.ok(mark, "the mark span renders nothing but the registered file");
  assert.match(mark, /aria-hidden="true"/);
  assert.match(mark, new RegExp(`dangerouslySetInnerHTML=\\{\\{ __html: ${imported[1]} \\}\\}`));
  assert.doesNotMatch(code, />\s*KS\s*</, "the KS monogram is gone");
  assert.match(code, /<span className="site-header__brand-name df-heading-3">Kareem Sasa<\/span>/);
  const brandRules = declarations(await read(NAV_CSS)).filter((d) => /site-header__brand/.test(d.selector));
  assert.deepEqual(brandRules.filter((d) => d.prop === "text-transform").map((d) => d.selector), []);

  // Pixel crispness (r1/SPEC.md §1): no transform positions the header or the mark, so no fractional translation reaches the
  // mark's paint; the engine places the mark on device pixels from layout. The browser test compares the painted mark with a
  // reference render.
  const nav = declarations(await read(NAV_CSS));
  assert.deepEqual(nav.filter((d) => /^(transform|translate)$/.test(d.prop) && /site-header(?![\w-])|site-header__brand/.test(innermost(d.selector)))
    .map((d) => `${d.line}: ${d.selector} { ${d.prop}: ${d.value} }`), []);
  assert.ok(nav.some((d) => /@media \(max-width: 768px\)/.test(d.selector) && innermost(d.selector) === ".site-header" && d.prop === "margin" && d.value === "0 auto"),
    "the narrow header is centred by layout");
});

test("T2 uncontained: the mark's rules hold size, clear space and one colour only; nothing contains it", async () => {
  const decls = declarations(await read(NAV_CSS));
  const ALLOWED = ["display", "flex", "width", "height", "margin", "color"];
  const markRules = decls.filter((d) => /site-header__brand-mark/.test(d.selector));
  assert.ok(markRules.length > 0, "no mark rule found; the check no longer tests anything");
  for (const d of markRules) {
    const sel = innermost(d.selector);
    const allowed = /site-header__brand-mark svg$/.test(sel) ? [...ALLOWED, "pointer-events"] : ALLOWED;
    assert.ok(allowed.includes(d.prop), `${d.selector} { ${d.prop}: ${d.value} }`);
    // A selector list naming the mark names nothing else.
    for (const part of sel.split(",")) assert.match(part, /site-header__brand-mark/, `${d.selector} mixes the mark with another selector`);
  }
  const colour = (sel) => markRules.filter((d) => d.prop === "color" && d.selector === sel).map((d) => d.value);
  assert.deepEqual(colour(".site-header__brand-mark"), ["var(--signal)"]);
  assert.deepEqual(colour('[data-theme="light"] .site-header__brand-mark'), ["var(--fg)"]);
  assert.deepEqual(markRules.filter((d) => d.prop === "color").map((d) => d.selector).sort(),
    ['.site-header__brand-mark', '[data-theme="light"] .site-header__brand-mark'].sort(), "no other mark colour");
  // No brand rule paints a ground, boundary or clip, except the I2 rule beneath the link and the wordmark's own states.
  const PAINT = /^(background(-[a-z-]+)?|border(-[a-z-]+)?|box-shadow|outline(-[a-z-]+)?|border-radius|clip-path|filter)$/;
  const bad = decls.filter((d) => {
    const sel = innermost(d.selector);
    return /site-header__brand/.test(sel) && !/:focus-visible/.test(sel) && PAINT.test(d.prop) &&
      !/\.site-header__brand(:[a-z]+|:is\([^)]*\))*::after$/.test(sel) && !/\.site-header__brand-name/.test(sel);
  });
  assert.deepEqual(bad.map((d) => `${d.line}: ${d.selector} { ${d.prop} }`), []);
  // The I2 rule draws only beneath the link, where the wordmark is hidden.
  assert.ok(decls.some((d) => /@media \(max-width: 900px\)/.test(d.selector) && innermost(d.selector) === ".site-header__brand::after" && d.prop === "top" && d.value === "100%"));
});

// Already-dead legacy logo code (dead-code ruling): excluded by name, listed for the owner's cleanup.
const LEGACY_DEAD = ["assets/logo.svg", "components/Logo/Logo.tsx", "components/Logo/Logo.css", "components/Logo/index.ts",
  "components/MainContent/MainContent.tsx", "components/MainContent/MainContent.css"];
test("T2 legacy: nothing outside the dead legacy logo files imports them", async () => {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(tsx?|css|mjs|js)$/.test(entry.name)) files.push(relative(src, path));
    }
  };
  await walk(src);
  const names = LEGACY_DEAD.map((f) => f.replace(/\.(tsx?|css|svg)$/, "").replace(/\/index$/, ""));
  const bad = [];
  for (const file of files.filter((f) => !LEGACY_DEAD.includes(f))) {
    const code = await read(file);
    for (const [, spec] of code.matchAll(/(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)) {
      if (!spec.startsWith(".")) continue;
      const target = relative(src, resolve(src, file, "..", spec)).replace(/\?.*$/, "").replace(/\.(tsx?|css|svg)$/, "").replace(/\/index$/, "");
      if (names.includes(target)) bad.push(`${file}: ${spec}`);
    }
  }
  assert.deepEqual(bad, []);
});

// Task 3 (§18 favicon containment; r1/SPEC.md §3, §4, §6): the web manifest names the registered app icons at their own
// sizes, and theme-color follows the active theme's field token.
const runtime = JSON.parse(await read("styles/darkfield/tokens.runtime.json"));
const darkField = runtime.color.tokens.find((t) => t.name === "field").value.dark;
const SOURCE_JSON = JSON.parse(await read("styles/darkfield/SOURCE.json"));
const ICONS = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

test("T3 manifest: exact members, the registered icons at their own sizes, Dark field colours", async () => {
  const manifest = JSON.parse(await readFile(resolve(web, "public/manifest.webmanifest"), "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), ["background_color", "icons", "name", "short_name", "start_url", "theme_color"]);
  assert.equal(manifest.name, "Kareem Sasa");
  assert.equal(manifest.short_name, "Kareem Sasa");
  assert.equal(manifest.start_url, "/");
  assert.deepEqual(manifest.icons, ICONS);
  for (const icon of manifest.icons) {
    const path = `public${icon.src}`;
    const entry = SOURCE_JSON.files[path];
    assert.equal(entry?.transform, "c2pa-strip", `${path} is a registered file shipped through the strip`);
    const ihdr = pngChunks(await readFile(resolve(web, path)))[0];
    assert.equal(ihdr.type, "IHDR", path);
    assert.equal(`${ihdr.raw.readUInt32BE(8)}x${ihdr.raw.readUInt32BE(12)}`, icon.sizes, `${path} pixel size`);
  }
  assert.equal(manifest.background_color, darkField);
  assert.equal(manifest.theme_color, darkField);
});

test("T3 head: the manifest link and one theme-color holding Dark field; the favicon links are unchanged", async () => {
  const html = await readFile(resolve(web, "index.html"), "utf8");
  assert.equal(html.split('<link rel="manifest" href="/manifest.webmanifest" />').length, 2, "one manifest link");
  const colours = [...html.matchAll(/<meta name="theme-color"[^>]*>/g)].map((m) => m[0]);
  assert.deepEqual(colours, [`<meta name="theme-color" content="${darkField}" />`]);
  assert.ok(html.includes([
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />',
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  ].join("\n    ")), "the five favicon links");
  assert.equal([...html.matchAll(/<link rel="(icon|apple-touch-icon)"/g)].length, 5, "no other icon link");
  // P4-8: the boot script does not set theme-color; React does, from the token.
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotMatch(script, /theme-color/);
});

test("T3 theme: applyThemeToDocument writes the computed --field to theme-color after selecting the theme", async () => {
  const code = await read("contexts/ThemeContext.tsx");
  const body = code.match(/const applyThemeToDocument = \(theme: Theme\) => \{([\s\S]*?)\n\};/)?.[1];
  assert.ok(body, "applyThemeToDocument not found");
  const select = body.indexOf('root.setAttribute("data-theme", theme)');
  const field = body.search(/const (\w+) = getComputedStyle\(root\)\.getPropertyValue\("--field"\)\.trim\(\);/);
  const write = body.search(/document\.querySelector\('meta\[name="theme-color"\]'\)\?\.setAttribute\("content", \w+\)/);
  assert.ok(select >= 0 && field > select && write > field, "select the theme, then read --field, then write theme-color");
  assert.equal(code.match(/meta\[name="theme-color"\]/g).length, 1, "theme-color is written in one place");
});
