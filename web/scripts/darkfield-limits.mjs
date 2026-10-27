// web/scripts/darkfield-limits.mjs
// Local-only reader of conformance limits. Limits are never committed: each run reads them out of
// the private canonical clone, at the commit pinned in SOURCE.json, through the named extractors below.
// node scripts/darkfield-limits.mjs <canonical-dir> [--limits <override.json>]
// The CLI prints one "ok|missing|conflict <name>" line per limit and never prints a value. Errors and
// diagnostics name only a limit name, a source path and a reason word, never canonical text.
import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_JSON = resolve(import.meta.dirname, "../src/styles/darkfield/SOURCE.json");

// Section names as cited by the Phase 6 plan, and their source paths.
const COLOUR = { path: "spec/05-color.md", section: "How much of each" };
const GRID = { path: "spec/08-grid-and-composition.md", section: "Balancing density and emptiness" };
const ATMOSPHERE = { path: "spec/10-texture-and-atmosphere.md", section: "Global limits" };
const GLOW = { path: "spec/11-light-and-glow.md", section: "Rules" };
const PRINCIPLES = { path: "README.md", section: "02 · Design principles" };
const USING = { path: "README.md", section: "Using the system" };
const RADII = { path: "spec/17-design-tokens.md", section: "Corner radii" };
const MARK = { path: "r1/SPEC.md", section: "1. Canonical symbol" };

// rule "first": the nth quantity on the anchor line with the extractor's unit (any unit when none is
// named, and the result must then be unitless). rule "before": the nearest quantity preceding the
// anchor named by `at`, which must carry the extractor's unit. nth 0 is the first, 1 the second.
export const EXTRACTORS = [
  { name: "share.field.min", ...COLOUR, anchors: ["`field-deep`"], rule: "first", unit: "%", nth: 0 },
  { name: "share.surface.max", ...COLOUR, anchors: ["`surface-1…3`"], rule: "first", unit: "%", nth: 0 },
  { name: "share.structure.max", ...COLOUR, anchors: ["`signal-trace`"], rule: "first", unit: "%", nth: 0 },
  { name: "share.signal.max", ...COLOUR, anchors: ["`signal-dim`"], rule: "first", unit: "%", nth: 0 },
  { name: "share.signalDimDeep.max", ...COLOUR, anchors: ["`signal-dim`"], rule: "first", unit: "%", nth: 1 },
  { name: "share.secondary.max", ...COLOUR, anchors: ["`coolant`"], rule: "first", unit: "%", nth: 0 },
  { name: "count.flare.max", ...COLOUR, anchors: ["`flare`"], rule: "first", unit: null, nth: 0 },
  { name: "share.void.min", ...GRID, anchors: ["contiguous void"], rule: "first", unit: "%", nth: 0 },
  { name: "count.glowSignal.max", ...GLOW, anchors: ["`glow-signal`", "`glow-flare`"], at: "`glow-signal`", rule: "before", unit: null },
  { name: "count.glowFlare.max", ...GLOW, anchors: ["`glow-signal`", "`glow-flare`"], at: "`glow-flare`", rule: "before", unit: null },
  { name: "count.effects.max", ...ATMOSPHERE, anchors: ["atmospheric effects"], rule: "before", unit: null },
  { name: "count.heartbeat.max", ...PRINCIPLES, anchors: ["heartbeat"], rule: "before", unit: null },
  { name: "size.node.maxPx", ...RADII, anchors: ["`radius-node`"], rule: "first", unit: "px", nth: 0 },
  { name: "count.chamfer.perContainer", ...USING, anchors: ["`cut-*`"], rule: "before", unit: null },
  { name: "size.mark.minPx", ...MARK, anchors: ["Minimum size"], rule: "first", unit: "px", nth: 0 },
  // In the mark's grid units (the symbol's viewBox units); the measurement converts them to px.
  { name: "size.mark.clearUnits", ...MARK, anchors: ["Clear space"], rule: "first", unit: null, nth: 0 },
];

export const LIMIT_NAMES = [...new Set(EXTRACTORS.map((extractor) => extractor.name))];

// Restatements in one section, each read by nearest quantity before its anchor; a disagreement with
// the primary extraction, or a restatement that cannot be read, makes the name a conflict.
export const CROSS_CHECK = {
  path: "spec/17-design-tokens.md",
  section: "Not tokenised",
  entries: [
    { anchor: "atmospheric effects", name: "count.effects.max" },
    { anchor: "contiguous void", name: "share.void.min" },
    { anchor: "field", name: "share.field.min" },
    { anchor: "flare", name: "count.flare.max" },
    { anchor: "glows", name: "count.glowSignal.max" },
    { anchor: "secondary hues", name: "share.secondary.max" },
    { anchor: "`signal`", name: "share.signal.max" },
  ],
};

// Cardinal words, valued by their index in this list.
const CARDINALS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const NUMBER = /(?<![\w§.-])(\d+(?:\.\d+)?)(?:\s*(%|px)(?![A-Za-z])|(?!\w))/g;
const CARDINAL = new RegExp("\\b(" + CARDINALS.join("|") + ")\\b", "gi");

export class LimitsError extends Error {
  constructor(reason) {
    super("darkfield-limits: " + reason);
    this.reason = reason;
  }
}

// git, confined to one directory: GIT_* variables that could redirect it are dropped, and
// --no-replace-objects stops refs/replace/* from substituting the objects it reads. Output is
// returned as a string, or null on failure; git's stderr is discarded.
const gitIn = (dir) => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
  return (...args) => {
    try {
      return execFileSync("git", ["--no-replace-objects", "-C", dir, ...args], { env, stdio: ["ignore", "pipe", "ignore"] }).toString("utf8");
    } catch {
      return null;
    }
  };
};
const trimmed = (text) => (text === null ? null : text.trim());
const real = (path) => realpath(path).catch(() => null);
const inside = (path, top) => path === top || path.startsWith(top.endsWith(sep) ? top : top + sep);

// Heading text without leading numbering ("NN · ", "N. ") or a trailing parenthetical.
const normalise = (heading) =>
  heading
    .replace(/^\d+(?:\s*·\s*|\.\s+)/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

// Bounds of the single section whose heading matches: it ends at the next heading at an equal or
// higher level, ignoring fenced code. Line numbers are 1-based.
const findSection = (lines, name) => {
  const target = normalise(name);
  const headings = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const match = fenced ? null : /^(#+)\s+(.*?)\s*#*\s*$/.exec(line);
    if (match) {
      const [, hashes, text] = match;
      headings.push({ index, level: hashes.length, text });
    }
  });
  const hits = headings.filter((heading) => normalise(heading.text) === target);
  if (hits.length !== 1) return null;
  const [start] = hits;
  const next = headings.find((heading) => heading.index > start.index && heading.level <= start.level);
  return { heading: start.index + 1, first: start.index + 1, end: next ? next.index : lines.length };
};

// Backticked spans blanked to spaces, so positions are kept and token digits are never quantities.
const mask = (line) => line.replace(/`[^`]*`/g, (span) => " ".repeat(span.length));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Position of an anchor in a line, or -1. A backticked anchor matches only that exact backticked
// token; a word anchor matches whole words outside backticked spans.
const anchorAt = (line, anchor) => {
  if (anchor.startsWith("`")) return line.indexOf(anchor);
  const words = anchor.split(/\s+/).map(escape).join("\\s+");
  const match = new RegExp("(?<![\\w-])" + words + "(?![\\w-])").exec(mask(line));
  return match ? match.index : -1;
};

// Quantities on a line, in order: decimals, optionally followed by % or px, and cardinal words.
const quantities = (line) => {
  const masked = mask(line);
  const found = [];
  for (const match of masked.matchAll(NUMBER)) {
    const [, digits, unit] = match;
    found.push({ index: match.index, value: Number(digits), unit: unit ?? null });
  }
  for (const match of masked.matchAll(CARDINAL)) {
    const [word] = match;
    found.push({ index: match.index, value: CARDINALS.indexOf(word.toLowerCase()), unit: null });
  }
  return found.sort((a, b) => a.index - b.index);
};

const missing = (reason, at = {}) => ({ status: "missing", ...at, reason });

// One extractor against one source text. Returns { status, value, unit, heading, line } or
// { status: "missing", reason }. Never includes canonical text.
export const extractFrom = (text, extractor) => {
  const lines = text.split(/\r?\n/);
  const section = findSection(lines, extractor.section);
  if (!section) return missing("section");
  const at = { heading: section.heading };
  const hits = [];
  for (let index = section.first; index < section.end; index++) {
    const line = lines[index];
    if (line.trim() && extractor.anchors.every((anchor) => anchorAt(line, anchor) !== -1)) hits.push(index);
  }
  if (hits.length !== 1) return missing(hits.length ? "ambiguous" : "anchor", at);
  const [index] = hits;
  const line = lines[index];
  const all = quantities(line);
  let quantity;
  if (extractor.rule === "first") {
    const pool = extractor.unit ? all.filter((candidate) => candidate.unit === extractor.unit) : all;
    quantity = pool[extractor.nth];
  } else if (extractor.rule === "before") {
    const limit = anchorAt(line, extractor.at ?? extractor.anchors[0]);
    quantity = all.filter((candidate) => candidate.index < limit).at(-1);
  } else {
    return missing("rule", at);
  }
  if (!quantity) return missing("quantity", at);
  if (quantity.unit !== (extractor.unit ?? null)) return missing("unit", at);
  return { status: "ok", value: quantity.value, unit: quantity.unit, heading: section.heading, line: index + 1 };
};

const readPin = async () => {
  try {
    return JSON.parse(await readFile(SOURCE_JSON, "utf8")).canonical.commit;
  } catch {
    throw new LimitsError("pin-unreadable");
  }
};

// An override is accepted only from outside this repository: not under the module's checkout
// (lexically or after resolving symlinks), and not in any checkout sharing its git directory.
const readOverride = async (file) => {
  const moduleGit = gitIn(import.meta.dirname);
  const top = trimmed(moduleGit("rev-parse", "--show-toplevel"));
  const common = trimmed(moduleGit("rev-parse", "--path-format=absolute", "--git-common-dir"));
  if (!top || !common) throw new LimitsError("override-unverifiable");
  const tops = [top, await real(top)].filter(Boolean);
  const lexical = resolve(file);
  const resolved = await real(lexical);
  if (tops.some((dir) => inside(lexical, dir) || (resolved && inside(resolved, dir)))) throw new LimitsError("override-in-repository");
  if (!resolved) throw new LimitsError("override-unreadable");
  const otherCommon = trimmed(gitIn(dirname(resolved))("rev-parse", "--path-format=absolute", "--git-common-dir"));
  if (otherCommon && (await real(otherCommon)) === (await real(common))) throw new LimitsError("override-in-repository");
  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolved, "utf8"));
  } catch {
    throw new LimitsError("override-invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new LimitsError("override-invalid");
  for (const [name, entry] of Object.entries(parsed)) {
    if (!LIMIT_NAMES.includes(name)) throw new LimitsError("override-unknown");
    const unitOk = entry?.unit === null || entry?.unit === undefined || entry?.unit === "%" || entry?.unit === "px";
    if (!Number.isFinite(entry?.value) || !unitOk) throw new LimitsError("override-invalid");
  }
  return parsed;
};

// Reads every limit. Returns { [name]: { status, source?, unit?, value?, path, heading?, line?, reason? } }
// in LIMIT_NAMES order. `pin` defaults to the SOURCE.json canonical commit.
export async function readLimits({ canonical, pin, override } = {}) {
  if (!canonical) throw new LimitsError("canonical-required");
  const dir = resolve(canonical);
  const git = gitIn(dir);
  const top = trimmed(git("rev-parse", "--show-toplevel"));
  if (!top || top !== (await real(dir))) throw new LimitsError("not-a-checkout");
  const commit = pin ?? (await readPin());
  if (typeof commit !== "string" || !/^[\da-f]+$/.test(commit)) throw new LimitsError("pin-malformed");
  if (trimmed(git("rev-parse", "--verify", "--quiet", "HEAD")) !== commit) throw new LimitsError("pin-mismatch");
  const overrides = override ? await readOverride(override) : {};

  // Canonical bytes come from the pinned commit's blobs, never the working tree.
  const blobs = new Map();
  const blob = (path) => {
    if (!blobs.has(path)) blobs.set(path, git("show", "--no-textconv", commit + ":" + path));
    return blobs.get(path);
  };

  const limits = {};
  for (const extractor of EXTRACTORS) {
    const text = blob(extractor.path);
    const result = text === null ? missing("source") : extractFrom(text, extractor);
    limits[extractor.name] = { ...result, path: extractor.path, source: "canonical" };
  }

  const restated = blob(CROSS_CHECK.path);
  for (const { anchor, name } of CROSS_CHECK.entries) {
    const primary = limits[name];
    if (primary.status !== "ok") continue;
    const check = { name, path: CROSS_CHECK.path, section: CROSS_CHECK.section, anchors: [anchor], rule: "before", unit: primary.unit };
    const result = restated === null ? missing("source") : extractFrom(restated, check);
    if (result.status !== "ok") limits[name] = { status: "conflict", path: CROSS_CHECK.path, reason: "unconfirmed" };
    else if (result.value !== primary.value) limits[name] = { status: "conflict", path: CROSS_CHECK.path, reason: "disagrees" };
  }

  for (const name of LIMIT_NAMES) {
    const entry = overrides[name];
    if (entry && limits[name].status === "missing") {
      limits[name] = { status: "ok", value: entry.value, unit: entry.unit ?? null, source: "override", path: resolve(override) };
    }
  }
  return limits;
}

// CLI body; returns the exit code. `pin` is injectable for tests.
export async function main(argv, { pin } = {}) {
  const usage = () => {
    console.error("usage: node scripts/darkfield-limits.mjs <canonical-dir> [--limits <file>]");
    return 1;
  };
  const args = [...argv];
  let override;
  const flag = args.indexOf("--limits");
  if (flag !== -1) {
    override = args[flag + 1];
    if (!override) return usage();
  }
  const positional = args.filter((_, index) => flag === -1 || (index !== flag && index !== flag + 1));
  if (positional.length !== 1) return usage();
  let limits;
  try {
    limits = await readLimits({ canonical: positional[0], pin, override });
  } catch (error) {
    console.error("error " + (error instanceof LimitsError ? error.reason : "internal"));
    return 1;
  }
  let failed = false;
  for (const name of LIMIT_NAMES) {
    const { status, path, reason } = limits[name];
    console.log(status + " " + name);
    if (status !== "ok") {
      failed = true;
      console.error(status + " " + name + " " + path + " " + reason);
    }
  }
  return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , ...argv] = process.argv;
  process.exitCode = await main(argv);
}
