import test from "node:test";
import assert from "node:assert/strict";
import { grepHighlightHtml } from "../src/components/Terminal/grepHighlight.ts";

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
