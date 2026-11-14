import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Compile the actual TypeScript helper so Node 20 in CI can test it directly.
const source = await readFile(new URL("../src/components/Terminal/grepHighlight.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { grepHighlightHtml } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const match = (text) => `\x1b[1;31m${text}\x1b[0m`;

test("each grep match becomes a highlight span", () => {
  assert.equal(
    grepHighlightHtml([match("3:alpha"), match("7:beta")].join("\n")),
    '<span class="grep-highlight">3:alpha</span>\n<span class="grep-highlight">7:beta</span>'
  );
});

test("markup in a matched line is shown as text, never parsed", () => {
  const html = grepHighlightHtml(match(`1:<img src=x onerror="alert('x')"> & </span><script>`));
  assert.equal(
    html,
    '<span class="grep-highlight">1:&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; &lt;/span&gt;&lt;script&gt;</span>'
  );
  assert.doesNotMatch(html, /<(img|script)|<\/span><script/);
});

test("text outside the ANSI codes is escaped too", () => {
  assert.equal(grepHighlightHtml("<b>"), "&lt;b&gt;");
});

test("hostile HTML is inert inside and outside grep matches", () => {
  const sample = '<svg onload="alert(1)"></svg><a href="javascript:alert(1)">click</a>';
  const html = grepHighlightHtml(sample + " " + match(sample));
  assert.doesNotMatch(html, /<(?:svg|a)\b/);
  assert.equal(
    html,
    '&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;/svg&gt;&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt; ' +
      '<span class="grep-highlight">&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;/svg&gt;&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;</span>'
  );
});

test("literal markup cannot escape the highlight span", () => {
  const html = grepHighlightHtml(match('</span><img src=x onerror=alert(1)>') + '<script>alert(1)</script>');
  assert.equal((html.match(/<span\b/g) ?? []).length, 1);
  assert.equal((html.match(/<\/span>/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<(?:img|script)\b/i);
  assert.match(html, /&lt;\/span&gt;&lt;img/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("escape characters and quoted attributes before adding safe markup", () => {
  const input = `& < > " '`;
  assert.equal(grepHighlightHtml(input), "&amp; &lt; &gt; &quot; &#39;");
});
