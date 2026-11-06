// web/scripts/darkfield-conformance.test.mjs: Phase 6 conformance invariants (limit-free, committed).
// Task 4 (P6-9): each governed animation carries a class from the vocabulary below (§12 *The six classes* and
// `liveness`, for the §12 *What may repeat* rows) and a non-placeholder state, for per-annotation review.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { web, read, governed, NATIVE_KEYFRAMES } from "./darkfield-css-scope.mjs";

// The class vocabulary (Phase 6 plan, Task 4): a class, an optional subtype, then the reported state.
const VOCABULARY = /§12:\s*(state transition|signal propagation|propagation|scan \/ inspection|accumulation|synchronisation|failure \/ instability|liveness)(\s*\([^)]+\))?\s*·\s*(\S.{2,}?)\s*(\*\/|$)/m;
const PLACEHOLDER = new Set(["todo", "-", "n/a", "none"]);

// One annotation from the text that starts at its `§12:`; `ok` is false when the class or state fails. Only the
// annotation's own line is read, so a blank state cannot borrow the next line.
const parse = (from) => {
  const text = from.split("\n")[0];
  const m = new RegExp(VOCABULARY.source, "my").exec(text);
  if (!m) return { ok: false, text };
  const state = m[3].trim();
  return { ok: !PLACEHOLDER.has(state.toLowerCase()), cls: m[1], subtype: m[2]?.trim().slice(1, -1) ?? null, state, text: m[0] };
};

// CSS: `/* … */` comments and quoted strings, so a comment opener inside a string does not count.
const cssLex = (css) => {
  const comments = [], strings = [];
  for (let pos = 0; pos < css.length;) {
    const c = css[pos];
    if (c === '"' || c === "'") {
      const start = pos++;
      while (pos < css.length && css[pos] !== c && css[pos] !== "\n") pos += css[pos] === "\\" ? 2 : 1;
      strings.push({ start, end: Math.min(++pos, css.length) });
    } else if (c === "/" && css[pos + 1] === "*") {
      const close = css.indexOf("*/", pos + 2);
      const end = close < 0 ? css.length : close + 2;
      comments.push({ start: pos, end });
      pos = end;
    } else pos += 1;
  }
  return { comments, strings };
};

// Leaf tokens of a parsed file (JSDoc subtrees skipped: their text lies in the trivia of the next real token).
const leaves = (sf) => {
  const out = [];
  const walk = (node) => {
    if (ts.isJSDoc(node)) return;
    const kids = node.getChildren(sf);
    if (!kids.length) out.push(node);
    for (const k of kids) walk(k);
  };
  walk(sf);
  return out;
};

// TSX: comments come solely from the trivia between real tokens (TypeScript's parser), so string, template and
// JSX text that look like comments are never collected. Trivia holds only whitespace and comments.
const tsxComments = (code, file) => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  for (const leaf of leaves(sf)) {
    if (leaf.kind === ts.SyntaxKind.JsxText || leaf.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces) continue;
    const trivia = code.slice(leaf.pos, leaf.getStart(sf));
    for (const m of trivia.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g)) out.push({ start: leaf.pos + m.index, end: leaf.pos + m.index + m[0].length });
  }
  return out;
};

// Every `§12:` inside a real comment of a governed .css or .tsx file. Each must open its comment on the comment's
// first line: `/* §12: … */` (also `{/* §12: … */}` in JSX) or `// §12: …`.
const collect = async () => {
  const out = [];
  for (const file of [...(await governed(".css")), ...(await governed(".tsx"))]) {
    const code = await read(file);
    const comments = file.endsWith(".css") ? cssLex(code).comments : tsxComments(code, file);
    for (const c of comments) {
      const body = code.slice(c.start, c.end);
      for (const m of body.matchAll(/§12:/g)) {
        const opener = /^(?:\/\*|\/\/)[ \t]*$/.test(body.slice(0, m.index));
        const line = code.slice(0, c.start + m.index).split("\n").length;
        out.push({ file, line, comment: c, opener, ...parse(body.slice(m.index)) });
      }
    }
  }
  return out;
};
const at = (a) => `${a.file}:${a.line}`;
const valid = (a) => a.opener && a.ok;

// Phase 5 deleted dead keyframes rather than listing them (P6-0a). Any code use of either name in a script (its
// declaration, an export, an assignment such as `exports.NAME =`, a key or a quoted name) fails; comments may name them.
test("no script under web/scripts defines or names a dead or hand-off keyframe list", async () => {
  const names = new Set(["KEYFRAME_DEAD", "KEYFRAME_HANDOFF"]);
  const scripts = resolve(web, "scripts");
  const self = basename(fileURLToPath(import.meta.url));
  const bad = [];
  for (const f of (await readdir(scripts, { recursive: true })).filter((x) => /\.(?:[cm]?js|ts)$/.test(x) && x !== self)) {
    const code = await readFile(resolve(scripts, f), "utf8");
    if (![...names].some((n) => code.includes(n))) continue;
    const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, f.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    for (const leaf of leaves(sf)) {
      if (typeof leaf.text === "string" && names.has(leaf.text)) bad.push(`${f}:${sf.getLineAndCharacterOfPosition(leaf.getStart(sf)).line + 1} ${leaf.text}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("every §12 annotation opens a comment, names a class from the vocabulary and reports a state", async () => {
  const all = await collect();
  assert.ok(all.length > 0, "no §12 annotations found in governed files");
  const bad = all.filter((a) => !valid(a)).map((a) => `${at(a)} ${a.opener ? "" : "(not a comment opener) "}${a.text}`);
  assert.deepEqual(bad, []);
});

// Native keyframes (D6) are skipped by name; every other governed @keyframes (found outside comments and strings)
// has, directly above it, a comment holding an annotation that passes the rule above (Phase 2 Task 10 rule, on the
// end state).
test("every governed @keyframes has a valid §12 annotation directly above it", async () => {
  const notes = await collect();
  const bad = [];
  let seen = 0;
  for (const f of await governed(".css")) {
    const css = await read(f);
    const { comments, strings } = cssLex(css);
    let code = css;
    for (const r of [...comments, ...strings]) code = code.slice(0, r.start) + " ".repeat(r.end - r.start) + code.slice(r.end);
    const skip = NATIVE_KEYFRAMES[f] ?? [];
    for (const m of code.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) {
      if (skip.includes(m[1])) continue;
      seen += 1;
      const above = comments.findLast((c) => c.end <= m.index && !css.slice(c.end, m.index).trim());
      if (!above || !notes.some((a) => a.file === f && a.comment.start === above.start && valid(a))) bad.push(`${f}: @keyframes ${m[1]}`);
    }
  }
  assert.ok(seen > 0, "no governed @keyframes found");
  assert.deepEqual(bad, []);
});

// Phase 2 Task 9 rule, on the end state: a governed component importing framer-motion carries one valid
// annotation per `transition` prop or key.
test("every governed framer-motion transition is matched by a valid §12 annotation", async () => {
  const notes = {};
  for (const a of (await collect()).filter(valid)) notes[a.file] = (notes[a.file] ?? 0) + 1;
  const bad = [];
  let files = 0;
  for (const f of await governed(".tsx")) {
    const code = await read(f);
    if (!/from\s*["']framer-motion["']/.test(code)) continue;
    files += 1;
    const transitions = (code.match(/\btransition\s*[=:]/g) ?? []).length;
    const count = notes[f] ?? 0;
    if (count < transitions) bad.push(`${f}: ${transitions} transitions, ${count} valid §12 annotations`);
  }
  assert.ok(files > 0, "no governed framer-motion component found");
  assert.deepEqual(bad, []);
});
