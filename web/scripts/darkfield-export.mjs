// web/scripts/darkfield-export.mjs
// Exports the public runtime subset of the private canonical Darkfield tokens.json (D2b, D11(b)).
// Run only in an authorized environment that holds the canonical checkout:
//   node scripts/darkfield-export.mjs <canonical-dir>   rewrite src/styles/darkfield/tokens.runtime.json
// Allowlist projection: only the fields named below are emitted. Every canonical field must be
// classified as RUNTIME or PRIVATE; an unclassified field fails the export instead of being dropped
// or copied. The script never prints canonical text: only a hash.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RUNTIME_PATH = resolve(import.meta.dirname, "../src/styles/darkfield/tokens.runtime.json");
export const RUNTIME_SCHEMA = "darkfield-runtime/1";
export const THEMES = ["dark", "light", "mono"];
export const THEMED_GROUPS = ["color", "shadow"];
export const UNTHEMED_GROUPS = ["spacing", "radius", "cut", "stroke", "dash", "opacity", "duration", "easing", "grid", "layer"];
export const FAMILIES = ["sans", "narrow", "mono"];

// Field classification of the canonical schema (tokens.json v1). Keys are canonical paths with [] for arrays.
const PRIVATE = new Set([
  "name", "color.note", "color.themes[].name", "color.tokens[].usage", "shadow.note", "shadow.tokens[].usage",
  "type.groups[].name", "type.groups[].note", "type.groups[].styles[].sample", "type.groups[].styles[].usage",
  ...UNTHEMED_GROUPS.flatMap((g) => [`${g}.note`, `${g}.tokens[].usage`]),
]);
const RUNTIME = new Set([
  "version", "color.themes[].id",
  ...THEMED_GROUPS.flatMap((g) => [`${g}.tokens[].name`, ...THEMES.map((id) => `${g}.tokens[].value.${id}`)]),
  ...UNTHEMED_GROUPS.flatMap((g) => [`${g}.tokens[].name`, `${g}.tokens[].value`]),
  "type.fonts[].family", "type.fonts[].file", "type.fonts[].weight", "type.fonts[].style",
  ...FAMILIES.map((f) => `type.families.${f}`),
  "type.groups[].family", "type.groups[].styles[].name", "type.groups[].styles[].fontSize",
  "type.groups[].styles[].lineHeight", "type.groups[].styles[].fontWeight", "type.groups[].styles[].letterSpacing",
]);

const leafPaths = (node, path = "", out = new Set()) => {
  if (Array.isArray(node)) node.forEach((item) => leafPaths(item, `${path}[]`, out));
  else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) leafPaths(value, path ? `${path}.${key}` : key, out);
  else out.add(path);
  return out;
};

const text = (value, where) => {
  if (typeof value !== "string") throw new Error(`${where}: expected a string`);
  return value;
};

export const exportRuntime = (canonical) => {
  const unclassified = [...leafPaths(canonical)].filter((p) => !PRIVATE.has(p) && !RUNTIME.has(p));
  if (unclassified.length) throw new Error(`unclassified canonical fields (classify before exporting): ${unclassified.join(", ")}`);
  const ids = canonical.color.themes.map((theme) => theme.id);
  if (JSON.stringify(ids) !== JSON.stringify(THEMES)) throw new Error(`unexpected theme ids: ${ids.join(",")}`);
  if (!Number.isInteger(canonical.version)) throw new Error("version: expected an integer");
  const token = (t, where, themed) => ({
    name: text(t.name, `${where}.name`),
    value: themed
      ? Object.fromEntries(THEMES.map((id) => [id, text(t.value?.[id], `${where}.value.${id}`)]))
      : text(t.value, `${where}.value`),
  });
  const runtime = { schema: RUNTIME_SCHEMA, version: canonical.version };
  runtime.color = {
    themes: THEMES.map((id) => ({ id })),
    tokens: canonical.color.tokens.map((t, i) => token(t, `color.tokens[${i}]`, true)),
  };
  runtime.shadow = { tokens: canonical.shadow.tokens.map((t, i) => token(t, `shadow.tokens[${i}]`, true)) };
  for (const group of UNTHEMED_GROUPS) {
    runtime[group] = { tokens: canonical[group].tokens.map((t, i) => token(t, `${group}.tokens[${i}]`, false)) };
  }
  runtime.type = {
    fonts: canonical.type.fonts.map((f, i) => ({
      family: text(f.family, `type.fonts[${i}].family`),
      file: text(f.file, `type.fonts[${i}].file`),
      weight: text(f.weight, `type.fonts[${i}].weight`),
      style: text(f.style, `type.fonts[${i}].style`),
    })),
    families: Object.fromEntries(FAMILIES.map((key) => [key, text(canonical.type.families[key], `type.families.${key}`)])),
    groups: canonical.type.groups.map((g, i) => ({
      family: text(g.family, `type.groups[${i}].family`),
      styles: g.styles.map((s, j) => {
        const where = `type.groups[${i}].styles[${j}]`;
        if (!Number.isInteger(s.fontWeight)) throw new Error(`${where}.fontWeight: expected an integer`);
        const style = {
          name: text(s.name, `${where}.name`),
          fontSize: text(s.fontSize, `${where}.fontSize`),
          lineHeight: text(s.lineHeight, `${where}.lineHeight`),
          fontWeight: s.fontWeight,
        };
        if (s.letterSpacing !== undefined) style.letterSpacing = text(s.letterSpacing, `${where}.letterSpacing`);
        return style;
      }),
    })),
  };
  return `${JSON.stringify(runtime, null, 2)}\n`;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node scripts/darkfield-export.mjs <canonical-dir>");
    process.exit(2);
  }
  const json = exportRuntime(JSON.parse(await readFile(resolve(dir, "tokens.json"), "utf8")));
  await writeFile(RUNTIME_PATH, json);
  console.log(`wrote tokens.runtime.json · sha256 ${createHash("sha256").update(json).digest("hex")}`);
}
