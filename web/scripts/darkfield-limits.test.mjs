// web/scripts/darkfield-limits.test.mjs
// Public regression tests for the run-time limits reader. Every canonical repository here is
// synthetic and holds placeholder text only, so the private canonical repository is never needed.
// Placeholder numbers are arbitrary and stand for no real limit. Requires the git command.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CROSS_CHECK, EXTRACTORS, LIMIT_NAMES, extractFrom, readLimits } from "./darkfield-limits.mjs";

const MODULE = resolve(import.meta.dirname, "darkfield-limits.mjs");
const SENTINEL = "SENTINEL-CANONICAL-TEXT-7Q";
const root = await mkdtemp(join(tmpdir(), "darkfield-limits-test-"));
test.after(() => rm(root, { recursive: true, force: true }));

// The test's own git calls ignore the operator's configuration.
const gitEnv = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: "1" };
const git = (dir, ...args) =>
  execFileSync("git", ["-C", dir, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgSign=false", ...args], {
    env: gitEnv,
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();

// A synthetic canonical checkout: files committed once, HEAD returned.
const canonicalRepo = async (name, files) => {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  git(dir, "init", "--quiet");
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  if (Object.keys(files).length) git(dir, "add", "--all");
  git(dir, "commit", "--quiet", "--allow-empty", "-m", "synthetic");
  return { dir, head: git(dir, "rev-parse", "HEAD") };
};

// Removes comments and string and template literal text (keeping template expressions and regex
// literal bodies as code), so only executable source is scanned.
const stripCommentsAndStrings = (src) => {
  let i = 0;
  let out = "";
  const regexAllowed = (before) => before === "" || /[(,=:[!&|?{};+\-*%<>~^]$/.test(before) || /\breturn$/.test(before);
  const code = (inTemplate) => {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      const n = src[i + 1];
      const before = out.trimEnd();
      if (c === "/" && n === "/") {
        while (i < src.length && src[i] !== "\n") i++;
      } else if (c === "/" && n === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end === -1 ? src.length : end + 2;
        out += " ";
      } else if (c === "'" || c === '"') {
        i++;
        while (i < src.length && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
        i++;
        out += '""';
      } else if (c === "`") {
        i++;
        out += "``";
        while (i < src.length && src[i] !== "`") {
          if (src[i] === "\\") i += 2;
          else if (src[i] === "$" && src[i + 1] === "{") {
            i += 2;
            out += " (";
            code(true);
            out += ") ";
          } else i++;
        }
        i++;
      } else if (c === "/" && regexAllowed(before)) {
        let inClass = false;
        out += src[i++];
        while (i < src.length && (inClass || src[i] !== "/")) {
          if (src[i] === "\\") out += src[i++];
          else if (src[i] === "[") inClass = true;
          else if (src[i] === "]") inClass = false;
          out += src[i++];
        }
        out += src[i++];
      } else {
        if (inTemplate && c === "{") depth++;
        if (inTemplate && c === "}") {
          if (depth === 0) {
            i++;
            return;
          }
          depth--;
        }
        out += c;
        i++;
      }
    }
  };
  code(false);
  return out;
};
const NUMERIC = /(?<![\w.])\d+(\.\d+)?(?![\w.])/g;
// Literal forms NUMERIC cannot see: radix prefixes, exponents, BigInt, separators, leading-dot and trailing-dot
// decimals (an escaped dot inside a regex body is excluded).
const OTHER_NUMERIC_FORMS = [
  /(?<![\w.])0[xXoObB]/g,
  /(?<![\w.])\d[\d_.]*[eE]/g,
  /(?<![\w.])\d[\d_]*n(?!\w)/g,
  /(?<![\w.])\d[\d_.]*_\d/g,
  /(?<![\w.\\])\.\d/g,
  /(?<![\w.])\d[\d_]*\.(?!\d)/g,
];
const otherForms = (code) => OTHER_NUMERIC_FORMS.flatMap((form) => code.match(form) ?? []);

test("(a) the stripper keeps code and regex bodies and drops comments and strings", () => {
  const sample = "const a = '23'; // 29\nconst b = /x{56}/; /* 78 */ const c = `97${90}`; const d = \"31\" + 89;";
  const kept = stripCommentsAndStrings(sample).match(NUMERIC);
  assert.deepEqual(kept, ["56", "90", "89"]);
  const forms = "const e = [0x1f, 0o7, 0b1, 97e0, 23E7, 89n, 1_009, .97, /\\.\\d/, '0x9', utf8e, a.b0, 7., 7..valueOf()];";
  assert.deepEqual(otherForms(stripCommentsAndStrings(forms)), ["0x", "0o", "0b", "97e", "23E", "89n", "1_0", ".9", "7.", "7."]);
});

test("(a) the module has no numeric literal other than 0 and 1, and anchors are short", async () => {
  const code = stripCommentsAndStrings(await readFile(MODULE, "utf8"));
  assert.match(code, /export async function readLimits/);
  const literals = (code.match(NUMERIC) ?? []).filter((literal) => literal !== "0" && literal !== "1");
  assert.deepEqual(literals, []);
  assert.deepEqual(otherForms(code), []);
  const anchors = [...EXTRACTORS.flatMap((extractor) => extractor.anchors), ...CROSS_CHECK.entries.map((entry) => entry.anchor)];
  assert.ok(anchors.length > EXTRACTORS.length);
  for (const anchor of anchors) {
    const backticked = /^`[^`\s]+`$/.test(anchor);
    const words = anchor.split(/\s+/).filter(Boolean);
    assert.ok(backticked || (!anchor.includes("`") && words.length >= 1 && words.length <= 2), anchor);
  }
  assert.deepEqual([...new Set(EXTRACTORS.map((extractor) => extractor.name))].sort(), [...LIMIT_NAMES].sort());
  for (const entry of CROSS_CHECK.entries) assert.ok(LIMIT_NAMES.includes(entry.name), entry.name);
});

test("(b) an empty canonical at the pin yields every name missing and no value", async () => {
  const { dir, head } = await canonicalRepo("empty", {});
  const limits = await readLimits({ canonical: dir, pin: head });
  assert.deepEqual(Object.keys(limits), LIMIT_NAMES);
  for (const name of LIMIT_NAMES) {
    assert.equal(limits[name].status, "missing", name);
    assert.equal("value" in limits[name], false, name);
    assert.equal("unit" in limits[name], false, name);
  }
});

test("(b) a canonical whose HEAD differs from the pin is refused", async () => {
  const { dir, head } = await canonicalRepo("other-pin", {});
  const other = head.replace(/^./, (c) => (c === "a" ? "b" : "a"));
  await assert.rejects(readLimits({ canonical: dir, pin: other }), /pin-mismatch/);
  await assert.rejects(readLimits({ canonical: join(dir, "missing-subdir"), pin: head }), /not-a-checkout/);
});

test("(b) the default pin is the SOURCE.json canonical commit", async () => {
  const source = JSON.parse(await readFile(resolve(import.meta.dirname, "../src/styles/darkfield/SOURCE.json"), "utf8"));
  const { dir, head } = await canonicalRepo("default-pin", {});
  assert.notEqual(head, source.canonical.commit);
  await assert.rejects(readLimits({ canonical: dir }), /pin-mismatch/);
});

const insideCheckout = (() => {
  try {
    execFileSync("git", ["-C", import.meta.dirname, "rev-parse", "--show-toplevel"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const REFUSED = insideCheckout ? /override-in-repository/ : /override-unverifiable/;

test("(c) an override inside the repository is refused, also through a symlink", async () => {
  const { dir, head } = await canonicalRepo("override", {});
  const inRepository = resolve(import.meta.dirname, "../package.json");
  await assert.rejects(readLimits({ canonical: dir, pin: head, override: inRepository }), REFUSED);
  const link = join(root, "override-link.json");
  await symlink(inRepository, link);
  await assert.rejects(readLimits({ canonical: dir, pin: head, override: link }), REFUSED);
});

// Each refusal branch alone: the module copied into a synthetic repository, which holds a nested
// independent repository and has a sibling worktree outside it.
test("(c) each override refusal branch holds alone", async () => {
  const { dir, head } = await canonicalRepo("override-branches", {});
  const repo = join(root, "branches-repo");
  await mkdir(join(repo, "scripts"), { recursive: true });
  await writeFile(join(repo, "scripts/darkfield-limits.mjs"), await readFile(MODULE));
  git(repo, "init", "--quiet");
  git(repo, "add", "--all");
  git(repo, "commit", "--quiet", "-m", "synthetic");
  const { readLimits: readCopy } = await import(pathToFileURL(join(repo, "scripts/darkfield-limits.mjs")).href);
  const refused = (override) => assert.rejects(readCopy({ canonical: dir, pin: head, override }), /override-in-repository/);
  const outside = join(root, "branches-outside");
  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, "override.json"), "{}");
  await readCopy({ canonical: dir, pin: head, override: join(outside, "override.json") });
  // Lexical only: a symlink inside the repository to a file outside it.
  await symlink(join(outside, "override.json"), join(repo, "override-link.json"));
  await refused(join(repo, "override-link.json"));
  // Realpath only: a symlink outside to a file in an independent repository nested inside it.
  const nested = join(repo, "nested");
  await mkdir(nested, { recursive: true });
  git(nested, "init", "--quiet");
  await writeFile(join(nested, "override.json"), "{}");
  await symlink(join(nested, "override.json"), join(outside, "nested-link.json"));
  await refused(join(outside, "nested-link.json"));
  // Shared git directory only: a sibling worktree outside the repository.
  const sibling = join(root, "branches-sibling");
  git(repo, "worktree", "add", "--quiet", "--detach", sibling);
  await writeFile(join(sibling, "override.json"), "{}");
  await refused(join(sibling, "override.json"));
});

test("(c) an override outside the repository fills missing names only", { skip: !insideCheckout && "module is not inside a git checkout" }, async () => {
  const { dir, head } = await canonicalRepo("override-ok", {});
  const [first, second] = LIMIT_NAMES;
  const file = join(root, "override.json");
  await writeFile(file, JSON.stringify({ [first]: { value: 41, unit: "%" } }));
  const limits = await readLimits({ canonical: dir, pin: head, override: file });
  assert.deepEqual(
    { status: limits[first].status, value: limits[first].value, unit: limits[first].unit, source: limits[first].source },
    { status: "ok", value: 41, unit: "%", source: "override" },
  );
  assert.equal(limits[second].status, "missing");
  await writeFile(file, JSON.stringify({ "not.a.limit": { value: 41, unit: "%" } }));
  await assert.rejects(readLimits({ canonical: dir, pin: head, override: file }), /override-unknown/);
  await writeFile(file, `{ "${first}": ${SENTINEL} }`);
  await assert.rejects(readLimits({ canonical: dir, pin: head, override: file }), (error) => /override-invalid/.test(error.message) && !error.message.includes(SENTINEL));
});

// Extraction mechanics on placeholder text.
const byName = (name) => EXTRACTORS.find((extractor) => extractor.name === name);
const fakeSection = (extractor, body) => `# Title\n\n## Other\n\n${body}\n\n## ${extractor.section}\n\n${body}\n`;

test("extraction: a backticked anchor matches only its exact token, and words count as quantities", () => {
  const extractor = byName("count.flare.max");
  const text = fakeSection(extractor, "| `glow-flare` | 41 things |\n| `flare` | **nine** of them, 43 |");
  const result = extractFrom(text, extractor);
  assert.equal(result.status, "ok");
  assert.equal(result.value, 9);
  assert.equal(result.line, text.split("\n").lastIndexOf("| `flare` | **nine** of them, 43 |") + 1);
  assert.equal(result.heading, text.split("\n").indexOf(`## ${extractor.section}`) + 1);
});

test("extraction: zero or several matching lines in the section are missing", () => {
  const extractor = byName("share.field.min");
  assert.equal(extractFrom(fakeSection(extractor, "nothing here"), extractor).status, "missing");
  const twice = fakeSection(extractor, "| `field-deep` | 41% |\n| `field-deep` | 43% |");
  assert.deepEqual([extractFrom(twice, extractor).status, extractFrom(twice, extractor).reason], ["missing", "ambiguous"]);
  assert.equal(extractFrom(`## ${extractor.section}\n## ${extractor.section}\n| \`field-deep\` | 41% |`, extractor).reason, "section");
});

test("extraction: ordinal and nearest-before rules, units and token digits", () => {
  const pair = byName("share.signalDimDeep.max");
  const pairText = fakeSection(pair, "| x | `signal-2` 37 41% then `signal-dim` 43 % |");
  assert.deepEqual([extractFrom(pairText, byName("share.signal.max")).value, extractFrom(pairText, pair).value], [41, 43]);
  const node = byName("size.node.maxPx");
  const nodeText = fakeSection(node, "| `radius-node` | `37%` | up to (≤41px) |");
  const nodeLines = nodeText.split("\n");
  assert.deepEqual(extractFrom(nodeText, node), {
    status: "ok",
    value: 41,
    unit: "px",
    heading: nodeLines.indexOf(`## ${node.section}`) + 1,
    line: nodeLines.lastIndexOf("| `radius-node` | `37%` | up to (≤41px) |") + 1,
  });
  const glow = byName("count.glowFlare.max");
  const glowText = fakeSection(glow, "seven `glow-signal`, then nine `glow-flare` and more\nlater `glow-flare` alone");
  assert.deepEqual([extractFrom(glowText, byName("count.glowSignal.max")).value, extractFrom(glowText, glow).value], [7, 9]);
  assert.equal(extractFrom(fakeSection(glow, "41% `glow-signal`, 43 `glow-flare`"), byName("count.glowSignal.max")).reason, "unit");
});

test("extraction: a section ends at the next heading at an equal or higher level", () => {
  const extractor = byName("share.field.min");
  const row = "| `field-deep` | 41% |";
  const sibling = `## ${extractor.section}\n\nplaceholder\n\n## Placeholder sibling\n\n${row}\n`;
  assert.deepEqual([extractFrom(sibling, extractor).status, extractFrom(sibling, extractor).reason], ["missing", "anchor"]);
  const parent = `## ${extractor.section}\n\nplaceholder\n\n# Placeholder parent\n\n${row}\n`;
  assert.equal(extractFrom(parent, extractor).status, "missing");
  const child = `## ${extractor.section}\n\nplaceholder\n\n### Placeholder child\n\n${row}\n`;
  assert.equal(extractFrom(child, extractor).value, 41);
});

test("extraction: headings match through numbering and a trailing parenthetical", () => {
  const principles = byName("count.heartbeat.max");
  assert.equal(extractFrom(`## ${principles.section}\n\nnine heartbeat`, principles).value, 9);
  const cross = { name: "x", path: CROSS_CHECK.path, section: CROSS_CHECK.section, anchors: ["glows"], rule: "before", unit: null };
  assert.equal(extractFrom(`## ${CROSS_CHECK.section} (placeholder words)\n\n- 41 glows`, cross).value, 41);
});

// A canonical made of sentinel text, with placeholder values that must never be printed.
const sentinelFiles = {
  "README.md": SENTINEL,
  "spec/05-color.md": [
    `# ${SENTINEL}`,
    "## How much of each",
    `| ${SENTINEL} | \`field-deep\` | ${SENTINEL} 41% |`,
    `| ${SENTINEL} | \`surface-1…3\` | 37% ${SENTINEL} |`,
    `| \`signal-dim\` | 43% ${SENTINEL} 47% |`,
  ].join("\n"),
  "spec/11-light-and-glow.md": `## Rules\n${SENTINEL} \`glow-signal\` \`glow-flare\` 53\n${SENTINEL} \`glow-signal\` \`glow-flare\` 59\n`,
  "spec/17-design-tokens.md": `## Not tokenised (${SENTINEL})\n- ${SENTINEL} 61 % field, 43 % \`signal\` ${SENTINEL}\n`,
  "r1/SPEC.md": `## ${SENTINEL}\n${SENTINEL} Minimum size 67 px\n`,
};
const PLACEHOLDER_VALUES = /\b(41|37|43|47|53|59|61|67)\b/;
const LINE = /^(ok|missing|conflict) [a-z][\w.]*$/;

test("(d) CLI output names limits and reason words only, never canonical text or values", async () => {
  const { dir, head } = await canonicalRepo("sentinel", sentinelFiles);
  const script = `import { main } from ${JSON.stringify(pathToFileURL(MODULE).href)}; process.exitCode = await main(process.argv.slice(1), { pin: ${JSON.stringify(head)} });`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", script, dir], { encoding: "utf8" });
  assert.equal(run.status, 1);
  const lines = run.stdout.split("\n").filter(Boolean);
  assert.equal(lines.length, LIMIT_NAMES.length);
  for (const line of lines) assert.match(line, LINE);
  const status = Object.fromEntries(lines.map((line) => line.split(" ").reverse()));
  assert.equal(status["share.surface.max"], "ok");
  assert.equal(status["share.signalDimDeep.max"], "ok");
  assert.equal(status["share.field.min"], "conflict");
  assert.equal(status["count.glowSignal.max"], "missing");
  for (const output of [run.stdout, run.stderr]) {
    assert.equal(output.includes(SENTINEL), false);
    assert.doesNotMatch(output, PLACEHOLDER_VALUES);
  }
  for (const line of run.stderr.split("\n").filter(Boolean)) assert.match(line, /^(missing|conflict) [a-z][\w.]* [\w./-]+ [a-z-]+$/);
});

test("(d) the CLI against an unpinned canonical prints a reason word only", async () => {
  const { dir } = await canonicalRepo("sentinel-unpinned", sentinelFiles);
  const run = spawnSync(process.execPath, [MODULE, dir], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr.trim(), "error pin-mismatch");
  const usage = spawnSync(process.execPath, [MODULE], { encoding: "utf8" });
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /^usage: /);
});
