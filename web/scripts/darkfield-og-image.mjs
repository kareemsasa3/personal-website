// web/scripts/darkfield-og-image.mjs: the social image (public/og-image.svg, public/og-image.png), generated from
// tokens.runtime.json (Dark values), the vendored registered R1 symbol and the image's own existing words (P4-10).
//
//   node scripts/darkfield-og-image.mjs --write <playwright module path>   writes og-image.svg, renders og-image.png
//   node scripts/darkfield-og-image.mjs --check <playwright module path>   renders the committed SVG and compares its
//                                                                          decoded pixels with the committed PNG
//
// Run manually; CI does not run it. No dependency: Playwright is passed by path, as in the browser tests.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(import.meta.dirname, "..");
const PUBLIC = resolve(web, "public");
export const RUNTIME_PATH = resolve(web, "src/styles/darkfield/tokens.runtime.json");
export const SYMBOL_PATH = resolve(web, "src/assets/darkfield/darkfield-r1-symbol-currentcolor.svg");
const SVG_OUT = resolve(PUBLIC, "og-image.svg");
const PNG_OUT = resolve(PUBLIC, "og-image.png");

// The image's own words, kept from the previous og-image.svg in their casing (P4-10 ruling); no other text.
export const OG_NAME = "Kareem Sasa";
export const OG_ROLE = "Systems Engineer";
export const OG_TAGLINE = "Production software for Linux, backend, and infrastructure-heavy products.";
export const OG_TITLE = "Kareem Sasa - Systems Engineer";
export const OG_DESCRIPTION = "Social preview image for Kareem Sasa's systems engineering portfolio.";

// Pixel size of the image (unchanged: index.html, route shells and the smoke test name it). The layout is drawn in a
// half-size viewBox, so every token length is shown at twice its size.
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const SCALE = 2;

const THEME = "dark";
const MARGIN = "grid-margin";
const MARK_SIZE = "space-12";
// The mark's clear space as a token; nothing is drawn inside it (§18 Adopted mark, reviewer-judged).
export const MARK_CLEAR = "space-3";
const NAME_STYLE = "display-2";
const ROLE_STYLE = "heading-3";
const TAGLINE_STYLE = "body-lg";
const ROLE_GAP = "space-2";
const TAGLINE_GAP = "space-4";

const px = (value) => {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(value);
  if (!m) throw new Error(`not a px length: ${value}`);
  return Number(m[1]);
};

export const ogLayout = (runtime) => {
  const length = (group, name) => {
    const token = runtime[group].tokens.find((t) => t.name === name);
    if (!token) throw new Error(`no ${group} token ${name}`);
    return px(token.value);
  };
  const w = OG_WIDTH / SCALE;
  const h = OG_HEIGHT / SCALE;
  const margin = length("grid", MARGIN);
  const mark = { x: margin, y: margin, size: length("spacing", MARK_SIZE) };
  const clear = length("spacing", MARK_CLEAR);
  const textTop = mark.y + mark.size + clear;
  const text = { x: margin, y: textTop, width: w - 2 * margin, height: h - margin - textTop };
  return { w, h, mark, clear, text, roleGap: length("spacing", ROLE_GAP), taglineGap: length("spacing", TAGLINE_GAP) };
};

const colour = (runtime, name) => {
  const value = runtime.color.tokens.find((t) => t.name === name)?.value?.[THEME];
  if (!/^#[0-9a-f]{6}$/.test(value ?? "")) throw new Error(`no ${THEME} colour for ${name}`);
  return value;
};

const typeStyle = (runtime, name) => {
  for (const group of runtime.type.groups) {
    const style = group.styles.find((s) => s.name === name);
    if (style) return { ...style, family: group.family };
  }
  throw new Error(`no type style ${name}`);
};

// The first family named in a stack, unquoted.
const primaryFamily = (stack) => stack.split(",")[0].trim().replace(/^"(.*)"$/, "$1");

const xmlText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The fonts the image uses: one entry per (family, weight) for the render check.
export const ogFonts = (runtime) => [NAME_STYLE, ROLE_STYLE, TAGLINE_STYLE].map((name) => {
  const style = typeStyle(runtime, name);
  return { family: primaryFamily(runtime.type.families[style.family]), weight: style.fontWeight, size: px(style.fontSize) };
});

export const buildOgSvg = ({ runtime, symbol, title, description }) => {
  const L = ogLayout(runtime);
  const rule = (name, colourName, extra = []) => {
    const s = typeStyle(runtime, name);
    return [
      `font-family: ${runtime.type.families[s.family]};`,
      `font-size: ${s.fontSize};`,
      `line-height: ${s.lineHeight};`,
      `font-weight: ${s.fontWeight};`,
      ...(s.letterSpacing ? [`letter-spacing: ${s.letterSpacing};`] : []),
      `color: ${colour(runtime, colourName)};`,
      ...extra,
    ].join(" ");
  };
  const usedFamilies = new Set(ogFonts(runtime).map((f) => f.family));
  const faces = runtime.type.fonts.filter((f) => usedFamilies.has(f.family)).map((f) =>
    `@font-face { font-family: "${f.family}"; src: url("/fonts/darkfield/${f.file.replace(/^fonts\//, "")}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; }`);

  // The registered symbol's root element, nested verbatim; only its position and size are added.
  const root = symbol.trim();
  const open = /^<svg\b[^>]*>/.exec(root)?.[0];
  if (!open || !root.endsWith("</svg>") || /\s(x|y|width|height)=/.test(open)) throw new Error("unexpected symbol file");
  const placed = `${open.slice(0, -1)} x="${L.mark.x}" y="${L.mark.y}" width="${L.mark.size}" height="${L.mark.size}">${root.slice(open.length)}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${L.w} ${L.h}" role="img" aria-labelledby="title desc">`,
    `  <title id="title">${xmlText(title)}</title>`,
    `  <desc id="desc">${xmlText(description)}</desc>`,
    "  <style>",
    ...faces.map((f) => `    ${f}`),
    "    .og { box-sizing: border-box; width: 100%; height: 100%; margin: 0; display: flex; flex-direction: column; justify-content: flex-end; }",
    `    .og-name { margin: 0; ${rule(NAME_STYLE, "fg")} }`,
    `    .og-role { margin: ${L.roleGap}px 0 0; ${rule(ROLE_STYLE, "fg")} }`,
    `    .og-tagline { margin: ${L.taglineGap}px 0 0; ${rule(TAGLINE_STYLE, "fg-muted", ["text-wrap: balance;"])} }`,
    "  </style>",
    `  <rect width="${L.w}" height="${L.h}" fill="${colour(runtime, "field")}"/>`,
    `  <g color="${colour(runtime, "signal")}">${placed}</g>`,
    `  <foreignObject x="${L.text.x}" y="${L.text.y}" width="${L.text.width}" height="${L.text.height}">`,
    '    <div xmlns="http://www.w3.org/1999/xhtml" class="og">',
    `      <div class="og-name">${xmlText(OG_NAME)}</div>`,
    `      <div class="og-role">${xmlText(OG_ROLE)}</div>`,
    `      <div class="og-tagline">${xmlText(OG_TAGLINE)}</div>`,
    "    </div>",
    "  </foreignObject>",
    "</svg>",
    "",
  ].join("\n");
};

const inputs = async () => ({
  runtime: JSON.parse(await readFile(RUNTIME_PATH, "utf8")),
  symbol: await readFile(SYMBOL_PATH, "utf8"),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
});

const TYPES = { ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const ORIGIN = "http://og.invalid";

// Serves web/public under http://og.invalid/, plus named in-memory files under /__check/.
const serve = (context, extra = {}) => context.route(`${ORIGIN}/**`, async (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  if (extra[path]) return route.fulfill({ status: 200, contentType: extra[path].type, body: extra[path].body });
  const file = resolve(PUBLIC, `.${path}`);
  if (!file.startsWith(PUBLIC + sep) || !TYPES[extname(file)]) return route.fulfill({ status: 404, body: "" });
  try {
    return route.fulfill({ status: 200, contentType: TYPES[extname(file)], body: await readFile(file) });
  } catch {
    return route.fulfill({ status: 404, body: "" });
  }
});

const render = async (browser, runtime) => {
  const context = await browser.newContext({ viewport: { width: OG_WIDTH, height: OG_HEIGHT }, deviceScaleFactor: 1 });
  try {
    await serve(context);
    const page = await context.newPage();
    const failed = [];
    page.on("requestfailed", (r) => failed.push(r.url()));
    page.on("response", (r) => { if (r.status() !== 200) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${ORIGIN}/og-image.svg`, { waitUntil: "load" });
    const L = ogLayout(runtime);
    const report = await page.evaluate(async ({ fonts, clear, scale }) => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const loaded = [...document.fonts].filter((f) => f.status === "loaded");
      const missing = fonts.filter(({ family, weight, size }) =>
        !document.fonts.check(`${weight} ${size}px "${family}"`) || !loaded.some((f) => f.family.replace(/"/g, "") === family));
      const box = document.querySelector("foreignObject > div");
      const mark = document.querySelector("g > svg").getBoundingClientRect();
      const first = box.firstElementChild.getBoundingClientRect();
      const last = box.lastElementChild.getBoundingClientRect();
      const fo = document.querySelector("foreignObject").getBoundingClientRect();
      return {
        missing,
        overflow: box.scrollHeight > box.clientHeight || box.scrollWidth > box.clientWidth || first.top < fo.top || last.bottom > fo.bottom,
        textTop: first.top,
        clearEdge: mark.bottom + clear * scale,
      };
    }, { fonts: ogFonts(runtime), clear: L.clear, scale: SCALE });
    const problems = [];
    if (failed.length) problems.push(`requests failed: ${failed.join(", ")}`);
    if (report.missing.length) problems.push(`fonts not loaded: ${JSON.stringify(report.missing)}`);
    if (report.overflow) problems.push("the text overflows its foreignObject");
    if (!(report.textTop >= report.clearEdge)) problems.push(`text top ${report.textTop} is inside the mark's clear space (edge ${report.clearEdge})`);
    if (problems.length) throw new Error(problems.join("; "));
    return await page.screenshot({ type: "png", animations: "disabled", caret: "hide" });
  } finally {
    await context.close();
  }
};

// Decodes both PNGs in the page and compares RGBA values; any difference fails.
const compare = async (browser, rendered, committed) => {
  const context = await browser.newContext();
  try {
    await serve(context, {
      "/__check/index.html": { type: "text/html", body: "<!doctype html><title>check</title>" },
      "/__check/rendered.png": { type: "image/png", body: rendered },
      "/__check/committed.png": { type: "image/png", body: committed },
    });
    const page = await context.newPage();
    await page.goto(`${ORIGIN}/__check/index.html`);
    return await page.evaluate(async () => {
      const decode = async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
        ctx.drawImage(img, 0, 0);
        return { w: img.naturalWidth, h: img.naturalHeight, data: ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data };
      };
      const a = await decode("/__check/rendered.png");
      const b = await decode("/__check/committed.png");
      if (a.w !== b.w || a.h !== b.h) return { size: [`${a.w}x${a.h}`, `${b.w}x${b.h}`], pixels: null, max: null };
      let pixels = 0;
      let max = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        let diff = 0;
        for (let c = 0; c < 4; c++) diff = Math.max(diff, Math.abs(a.data[i + c] - b.data[i + c]));
        if (diff) pixels++;
        max = Math.max(max, diff);
      }
      return { size: null, pixels, max };
    });
  } finally {
    await context.close();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, pw] = process.argv.slice(2);
  if (!["--write", "--check"].includes(mode) || !pw) {
    console.error("usage: node scripts/darkfield-og-image.mjs --write|--check <playwright module path>");
    process.exit(2);
  }
  const input = await inputs();
  const svg = buildOgSvg(input);
  const { chromium } = await import(pw);
  const browser = await chromium.launch({ headless: true });
  let failed = false;
  try {
    if (mode === "--write") {
      await writeFile(SVG_OUT, svg);
      await writeFile(PNG_OUT, await render(browser, input.runtime));
      console.log(`wrote ${SVG_OUT} and ${PNG_OUT}`);
    } else {
      if ((await readFile(SVG_OUT, "utf8")) !== svg) {
        console.error("og-image.svg differs from the generator's output; run --write");
        failed = true;
      }
      const out = join(await mkdtemp(join(process.env.DF_TMP || tmpdir(), "og-check-")), "og-image.png");
      const rendered = await render(browser, input.runtime);
      await writeFile(out, rendered);
      const result = await compare(browser, rendered, await readFile(PNG_OUT));
      if (result.size) {
        console.error(`size differs: rendered ${result.size[0]}, committed ${result.size[1]}`);
        failed = true;
      } else if (result.pixels) {
        console.error(`${result.pixels} pixels differ (max channel difference ${result.max}); render at ${out}`);
        failed = true;
      } else {
        console.log(`pixels identical (${OG_WIDTH}x${OG_HEIGHT}); render at ${out}`);
      }
    }
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}
