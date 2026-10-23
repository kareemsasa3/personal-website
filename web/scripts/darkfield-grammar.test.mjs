// web/scripts/darkfield-grammar.test.mjs: Phase 3 (Grammar) static invariants.
import test from "node:test";
import assert from "node:assert/strict";
import { read, reachable, governed, declarations, NATIVE, NATIVE_FILES, PHASE3, PHASE5, innermost, where } from "./darkfield-css-scope.mjs";

const OUTSIDE = ["styles/darkfield/bridge.css", ...NATIVE_FILES];
// Rules no component renders (dead-code ruling, P3-8): excluded by exact innermost selector, never deleted.
// A selector joins only after `rg` over web/src TSX shows nothing renders it; the commit body lists it.
const DEAD_RULES = {
  "pages/Projects/Projects.css": [".projects-cta", ".projects-cta-primary", ".projects-hero-actions"],
  "components/TimelineItem/TimelineItem.css": [".timeline-flip-hint", ".timeline-flip-container:hover .timeline-flip-hint"],
};
// P3-9: the Traffic speed ramp mirrors native renderer artwork. Phase 5 owns its retirement.
const HOLDS = { "pages/TrafficSimulator/TrafficSimulator.css": Array.from({ length: 5 }, (_, i) => `--traffic-speed-${i}`) };
// Phase 3 declarations: PHASE3 files, governed and rendered selectors only.
export const phase3Decls = async () => {
  const out = [];
  for (const file of (await governed(".css")).filter((f) => PHASE3.includes(f))) {
    const skip = [...(NATIVE[file] ?? []), ...(DEAD_RULES[file] ?? [])];
    for (const d of declarations(await read(file))) if (!skip.includes(innermost(d.selector))) out.push({ file, ...d });
  }
  return out;
};

test("ownership: every reachable governed stylesheet belongs to exactly one phase", async () => {
  const css = (await governed(".css")).filter((f) => !OUTSIDE.includes(f));
  const missing = css.filter((f) => PHASE3.includes(f) === PHASE5.includes(f));
  assert.deepEqual(missing, [], "files in neither or both lists");
  assert.deepEqual(PHASE3.filter((f) => !css.includes(f)), [], "PHASE3 names a file the walk does not reach");
  assert.deepEqual(PHASE5.filter((f) => !css.includes(f)), [], "PHASE5 names a file the walk does not reach");
});

test("T2 bridge: only the --accent-color hold remains", async () => {
  const defined = declarations(await read("styles/darkfield/bridge.css")).filter((d) => d.prop.startsWith("--")).map((d) => d.prop.slice(2));
  assert.deepEqual([...new Set(defined)].sort(), ["accent-color"]);
});

test("scrim: grammar.css derives --df-scrim from --field and --opacity-dim only", async () => {
  const [d] = declarations(await read("styles/darkfield/grammar.css")).filter((x) => x.prop === "--df-scrim");
  assert.ok(d, "--df-scrim is not defined");
  assert.deepEqual([...new Set([...d.value.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]))].sort(), ["field", "opacity-dim"]);
  assert.doesNotMatch(d.value, /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i);
});

const LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(|\b(white|black|red|green|blue|gray|grey|silver|gold|yellow)\b/i;
test("T3 grammar.css: tokens only; imported after the bridge and before component CSS", async () => {
  const css = await read("styles/darkfield/grammar.css");
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), LITERAL);
  for (const d of declarations(css)) if (/^(transition|animation)/.test(d.prop)) assert.match(d.value, /^(none|.*var\(--dur-[a-z]+\).*var\(--ease-[a-z]+\).*)$/, where({ file: "grammar.css", ...d }));
  const index = await read("index.tsx");
  const order = ["tokens.css", "index.css", "bridge.css", "grammar.css", "components.css"].map((f) => index.indexOf(`/${f}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order); assert.ok(!order.includes(-1));
  for (const sel of [".df-control", ".df-control--latch", ".df-control--card", ".df-control--light", ".df-control--unavailable"]) assert.ok(css.includes(sel), sel);
  for (const f of ["pages/NotFound/NotFound.tsx", "components/common/ErrorBoundary.tsx", "components/common/AppErrorBoundary.tsx"]) {
    for (const m of (await read(f)).matchAll(/className="([^"]*(home-link|error-button)[^"]*)"/g)) assert.match(m[1], /\bdf-control\b/, `${f}: ${m[1]}`);
  }
  for (const f of ["pages/NotFound/NotFound.css", "components/common/ErrorBoundary.css"]) {
    for (const d of declarations(await read(f)).filter((x) => /home-link|error-button/.test(x.selector))) {
      assert.ok(!/^(background|color|border|border-color|border-radius|transform|transition)$/.test(d.prop), where({ file: f, ...d }));
    }
  }
});

test("T5 D7: statuses and tags are context labels without hue; • only on Live", async () => {
  const decls = await phase3Decls();
  const bad = decls.filter((d) => /status|tech-tag|highlight-tag|artifact-meta/.test(d.selector) &&
    (/^(background|background-color|border-radius|box-shadow)$/.test(d.prop) && !/^(none|transparent|var\(--radius-0\))$/.test(d.value)
     || d.prop === "color" && d.value !== "var(--fg-muted)" || /^--roster-status/.test(d.prop)));
  assert.deepEqual(bad.map(where), []);
  const live = decls.filter((d) => d.prop === "content" && /•/.test(d.value));
  assert.ok(live.length > 0 && live.every((d) => /\.df-context--live::before/.test(d.selector)), live.map(where).join("\n"));
  for (const f of ["components/ProjectRoster/ProjectRosterItem.tsx", "pages/CaseStudies/CaseStudies.tsx", "pages/Home/sections/FeaturedProjectsSection.tsx"]) {
    const code = await read(f);
    assert.doesNotMatch(code, /status-dot/, f);
    assert.match(code, /df-label-sm[^"`]*df-context|df-context[^"`]*df-label-sm/, f);
  }
});

// A phrase longer than a label is Narrator supporting text, not an Instrument label (§06; Phase 5 controller ruling):
// the Orbital and Traffic eyebrows, in sans and fg-muted, as authored.
const NARRATOR_EYEBROWS = ["orbital-eyebrow", "traffic-eyebrow"];
test("T6 eyebrows speak in the Instrument voice (§06 Interface label); Rhythm Lab is the named Phase 5 exclusion", async () => {
  for (const f of (await governed(".tsx")).filter((x) => !/RhythmLab/.test(x))) {
    for (const [, cls] of (await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g).map((m) => [m[0], m[1] ?? m[2]])) {
      if (NARRATOR_EYEBROWS.includes(cls.split(/\s+/)[0])) {
        assert.match(cls, /(^|\s)df-body-sm(\s|$)/, `${f}: ${cls}`);
        assert.doesNotMatch(cls, /(^|\s)df-label/, `${f}: ${cls}`);
      } else if (/eyebrow/.test(cls) && !/rhythm-lab-eyebrow/.test(cls)) assert.match(cls, /(^|\s)df-label(\s|$)/, `${f}: ${cls}`);
    }
  }
  const bad = [];
  for (const file of (await governed(".css")).filter((f) => !/RhythmLab/.test(f))) {
    for (const d of declarations(await read(file))) {
      if (!/eyebrow/.test(innermost(d.selector).replace(/:not\([^)]*\)/g, ""))) continue;
      if (/^(font-family|font-size|font-weight|letter-spacing|text-transform|line-height|text-shadow)$/.test(d.prop) ||
          d.prop === "color" && d.value !== "var(--fg-muted)") bad.push(where({ file, ...d }));
    }
  }
  assert.deepEqual(bad, []);
});

// Machine voice (§06): the only Phase 3 selectors that may set the mono family. Exact innermost selectors.
const MACHINE = [".work-dates", ".setting-static-value, .setting-value", ".settings-about .settings-build",
  ".article-body code, .article-prose code", "pre", "code, kbd, samp", "code", ".df-control::before",
  ".df-control--card :is(h1, h2, h3, h4, h5, h6)::before", ".df-context--live::before", ".site-header__brand-name::before",
  ".df-error::before", ".df-warning::before", ".df-confirmed::before", ".df-field"];
// Instrument voice in generated content, which cannot carry the label class: the alarm tile's state word (§05 Alarm).
const INSTRUMENT_GENERATED = [".df-error--alarm::before"];
test("T7 voices: Phase 3 sets mono only on Machine text; Narrator inherits; uppercase is the Instrument classes' alone", async () => {
  const decls = await phase3Decls();
  const family = decls.filter((d) => d.prop === "font-family" && !/^(inherit)$/.test(d.value) && !(d.value === "var(--font-sans)" && innermost(d.selector) === "body") && !(d.value === "var(--font-mono)" && MACHINE.includes(innermost(d.selector))) &&
    !(d.value === "var(--font-narrow)" && d.file === "styles/darkfield/grammar.css" && INSTRUMENT_GENERATED.includes(innermost(d.selector))));
  assert.deepEqual(family.map(where), []);
  assert.deepEqual(decls.filter((d) => /--terminal-font/.test(d.value) || d.prop === "--terminal-font").map(where), []);
  assert.deepEqual(decls.filter((d) => d.prop === "text-transform" && d.value !== "none").map(where), []);
  // Text is never dimmed with opacity (§09 Opacity and colour): the supporting line reads fg-muted.
  const sub = decls.filter((d) => /^\.journey-subtitle$/.test(innermost(d.selector)));
  assert.ok(sub.length > 0 && sub.every((d) => d.prop !== "opacity" && (d.prop !== "color" || d.value === "var(--fg-muted)")), sub.map(where).join("\n"));
  // Instrument names carry the type class in markup (the class sets family, case and tracking).
  const LABELLED = [["components/WorkDetails/WorkDetails.tsx", /section-title|highlights-title|tech-stack-title/],
    ["components/SettingsPanel/SettingsControls.tsx", /settings-section-title|settings-segmented__button|(^|\s)setting-switch(\s|$)/],
    ["components/SettingsPanel/SettingsPanel.tsx", /(^|\s)settings-action(\s|$)/], ["components/Navigation/HeaderNavigation.tsx", /site-header__explore-label|site-header__panel-heading/],
    ["components/ProjectRoster/ProjectRosterItem.tsx", /project-roster__detail-heading/], ["components/ArticlePage/ArticlePage.tsx", /article-series-link-label/],
    ["pages/Home/sections/HeroSection.tsx", /hero-proof-label/],
    ["components/Dock/DockIcon.tsx", /dock-tooltip/], ["components/Dock/DockExploreStack.tsx", /dock-explore__link/],
    ["components/TerminalDropdown/TerminalDropdown.tsx", /(^|\s)terminal-dropdown-(label|trigger|option)(\s|$)/]];
  for (const [f, names] of LABELLED) {
    const code = await read(f);
    const found = [...code.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]).filter((c) => names.test(c));
    assert.ok(found.length > 0, f);
    for (const c of found) assert.match(c, /(^|\s)df-label(\s|$)/, `${f}: ${c}`);
  }
  // Every header link carries the label class (T11), the wide Explore links among them.
  assert.match(await read("components/Navigation/HeaderNavigation.tsx"), /className=\{`site-header__link [^`]*\bdf-label\b/, "header links");
  // §06 colour by role: display and headings fg, supporting text and region names fg-muted, annotation fg-faint.
  const colour = (sel) => decls.filter((d) => d.prop === "color" && innermost(d.selector) === sel && !(sel === ".section-title" && d.file === "pages/Home/Home.css")).map((d) => d.value);
  for (const [sel, want] of [[".journey-title", "var(--fg)"], [".work-role", "var(--fg-muted)"], [".work-dates", "var(--fg-faint)"],
    [".section-title", "var(--fg-muted)"], [".tech-stack-title, .highlights-title", "var(--fg-muted)"], [".dock-tooltip", "var(--fg-muted)"]]) {
    assert.deepEqual([...new Set(colour(sel))], [want], sel);
  }
  assert.deepEqual(decls.filter((d) => d.prop === "opacity" && innermost(d.selector) === ".timeline-back-content p").map(where), []);
  for (const [f, cls] of [["components/WorkDetails/WorkDetails.tsx", "work-dates"], ["components/SettingsPanel/BuildIdentifier.tsx", "settings-build"]]) {
    assert.match(await read(f), new RegExp(`className="${cls}[^"]*df-annotation`), f);
  }
});

test("T7 cascade guard: a header paragraph rule excludes its eyebrow so the label keeps its line height and colour", async () => {
  for (const [file, eyebrow] of [["components/CaseStudyPage/CaseStudyPage.css", "case-study-eyebrow"], ["pages/Writing/Writing.css", "writing-eyebrow"],
    ["pages/ProceduralAnimations/ProceduralAnimations.css", "procedural-animations-eyebrow"]]) {
    const rules = declarations(await read(file)).filter((d) => /-header p(?![\w-])/.test(innermost(d.selector)) && /^(color|line-height|font-size|font-family|font-weight)$/.test(d.prop));
    assert.ok(rules.length > 0, `${file}: no header paragraph rule found; the guard no longer tests anything`);
    for (const d of rules) assert.ok(innermost(d.selector).includes(`:not(.${eyebrow})`), where({ file, ...d }));
  }
});

// Fix wave (R1, §06): long control and table text (a heading used as a link, a sentence, a long link text) uses the reading
// voice and keeps its control class; the label classes stay on short names. This names the reclassified elements in markup;
// the browser test checks they render in the reading voice.
test("T7 long control text is Narrator: reclassified elements carry a body class, never the label class", async () => {
  const classes = async (f) => [...(await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
  const has = (c, cls) => c.split(/\s+/).includes(cls);
  const narrator = (c) => /(^|\s)df-body(-sm|-lg)?(\s|$)/.test(c) && !/(^|\s)df-label(-sm|-lg)?(\s|$)/.test(c);
  const article = await read("components/ArticlePage/ArticlePage.tsx");
  // The table of contents links (heading text) and the editorial note's summary keep their control model.
  assert.match(article, /<a className="df-control df-control--light df-body-sm" href=\{`#\$\{entry\.id\}`\}/);
  assert.match(article, /<summary className="df-control df-control--latch df-body-sm">Editorial note: original synthesis<\/summary>/);
  // The footer pairs a kind label with its reading time as a Machine value.
  assert.match(article, /<span className="article-footer-kind">\s*<span className="df-label-sm">\{KIND_LABELS\[entry\.kind\]\}<\/span>\s*<span className="df-data"> · \{entry\.readingMinutes\} min<\/span>/);
  for (const [file, cls, model] of [["components/CaseStudyPage/CaseStudyPage.tsx", "case-study-link", "df-control"],
    ["components/Layout/GlobalSectionNavigation.tsx", "dot-tooltip", null]]) {
    const found = (await classes(file)).filter((c) => has(c, cls));
    assert.ok(found.length > 0, `${file}: ${cls} not rendered`);
    for (const c of found) { assert.ok(narrator(c), `${file}: ${c}`); if (model) assert.ok(has(c, model), `${file}: ${c}`); }
  }
  // A case-study link's action word (View, Open) stays a label beside the Narrator link text.
  assert.equal((await read("components/CaseStudyPage/CaseStudyPage.tsx")).match(/<span className="df-label">(View|Open)<\/span>/g)?.length, 2);
  const blocks = await read("components/CaseStudyPage/CaseStudyBlocks.tsx");
  assert.match(blocks, /<caption className="df-body-sm">\{block\.caption\}<\/caption>/);
  assert.match(blocks, /<th scope="row" className="df-body-sm">\{row\.label\}<\/th>/);
});

test("T8 measure: no Phase 3 max-width or grid track holds a literal ch value; prose containers carry df-prose", async () => {
  const decls = await phase3Decls();
  const bad = decls.filter((d) => /^(max-width|grid-template-columns)$/.test(d.prop) && /\d\s*ch\b/.test(d.value));
  assert.deepEqual(bad.map(where), []);
  assert.ok(decls.some((d) => d.prop === "max-width" && /--measure-body/.test(d.value)), "measure-body is read nowhere");
  assert.match(await read("components/ArticlePage/ArticlePage.tsx"), /className="article-body df-prose /);
  const art = await read("components/ArticlePage/ArticlePage.tsx");
  const containers = [...art.matchAll(/className="article-prose (df-prose(?:-links)?) df-body-sm"\s+dangerouslySetInnerHTML=\{\{\s+__html: article\.provenance\.(\w+)/g)].map((m) => `${m[2]}:${m[1]}`);
  // Tables live in Sources and Fact-check: those stay full width (links only); Abstract and Editorial note take the measure.
  assert.deepEqual(containers, ["abstractHtml:df-prose", "sourcesHtml:df-prose-links", "factCheckHtml:df-prose-links", "editorialNoteHtml:df-prose"]);
  const marker = declarations(await read("styles/darkfield/grammar.css")).filter((d) => /a:hover::before/.test(d.selector) && /df-prose/.test(d.selector));
  assert.deepEqual(marker.map(where), [], "inline prose links take no › marker (DEV-3)");
  assert.match(await read("components/CaseStudyPage/CaseStudyPage.tsx"), /case-study-summary df-prose/);
  assert.match(await read("components/CaseStudyPage/CaseStudyBlocks.tsx"), /<p key=\{paragraph\} className="df-prose">/);
  const rules = declarations(await read("styles/darkfield/grammar.css")).filter((d) => /^\.df-prose/.test(innermost(d.selector)));
  assert.ok(rules.some((d) => d.prop === "max-width" && d.value.trim() === "var(--measure-body)"));
});

test("T9 Home: every action is a df-control with the model's modifier; component rules hold no state look; pills show their label", async () => {
  const dir = "pages/Home/sections/";
  const want = [
    [dir + "HeroSection.tsx", "btn", /\bdf-control\b(?!--)/], [dir + "HeroSection.tsx", "hero-text-link", /\bdf-control--light\b/],
    [dir + "FeaturedProjectsSection.tsx", "btn", /\bdf-control\b(?!--)/], [dir + "FeaturedProjectsSection.tsx", "featured-project-link", /\bdf-control--card\b/],
    [dir + "ContactStripSection.tsx", "contact-strip-link", /\bdf-control\b(?!--)/], [dir + "ExplorationChoiceSection.tsx", "exploration-pill", /\bdf-control\b(?!--)/],
  ];
  for (const [f, cls, modifier] of want) {
    const found = [...(await read(f)).matchAll(/className="([^"]*)"/g)].map((m) => m[1]).filter((c) => c.split(/\s+/).includes(cls));
    assert.ok(found.length > 0, `${f}: ${cls} not rendered`);
    for (const c of found) { assert.match(c, /\bdf-control\b/, `${f}: ${c}`); assert.match(c, modifier, `${f}: ${c}`); }
  }
  const pills = await read(dir + "ExplorationChoiceSection.tsx");
  assert.doesNotMatch(pills, /aria-label="(Read|Explore)|title=|capsule|--(red|blue)/, "pills show their text; no duplicate name, no capsule");
  assert.match(pills, />\s*Read the writing\s*</); assert.match(pills, />\s*Explore simulations\s*</);
  const listed = /(^|[\s>.])(btn|btn-primary|btn-secondary|btn-outline|hero-text-link|featured-project-link|contact-strip-link|exploration-pill)([\s:.[>+~]|$)/;
  const bad = (await phase3Decls()).filter((d) => d.file.startsWith("pages/Home/") && listed.test(innermost(d.selector)) &&
    /^(color|background|background-color|background-image|border|border-color|border-radius|box-shadow|transition|transform|text-decoration|will-change|--pill-.*)$/.test(d.prop));
  assert.deepEqual(bad.map(where), []);
  assert.doesNotMatch(await read(dir + "ExplorationChoiceSection.css"), /--pill-|capsule|#[0-9a-f]{3,8}\b|rgba?\(/i);
});

test("T10 Projects: filters, dropdown, roster actions and the dialog follow the control model; one chamfered dialog", async () => {
  const classes = async (f) => [...(await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
  const has = (c, cls) => c.split(/\s+/).includes(cls);
  const want = [
    ["pages/Projects/Projects.tsx", "stat-card", /\bdf-control\b/], ["pages/Projects/Projects.tsx", "close-tech-stack", /\bdf-control\b(?!--)/],
    ["components/TerminalDropdown/TerminalDropdown.tsx", "terminal-dropdown-trigger", /\bdf-control\b(?!--)/],
    ["components/TerminalDropdown/TerminalDropdown.tsx", "terminal-dropdown-option", /\bdf-control\b(?!--)/],
    ["components/ProjectRoster/ProjectRosterItem.tsx", "project-roster__toggle", /\bdf-control--latch\b/],
    ["components/ProjectRoster/ProjectRosterItem.tsx", "project-roster__action", /\bdf-control\b(?!--)/],
  ];
  for (const [f, cls, modifier] of want) {
    const found = (await classes(f)).filter((c) => has(c, cls));
    assert.ok(found.length > 0, `${f}: ${cls} not rendered`);
    for (const c of found) {
      assert.match(c, /\bdf-control\b/, `${f}: ${c}`); assert.match(c, modifier, `${f}: ${c}`);
      // A stat card holds a value and a label; the label span carries the label voice, the count is the value.
      if (cls !== "stat-card") assert.match(c, /(^|\s)df-label(\s|$)/, `${f}: ${c}`);
    }
  }
  const projectClasses = await classes("pages/Projects/Projects.tsx");
  assert.deepEqual(projectClasses.filter((c) => has(c, "stat-label")), Array(3).fill("stat-label df-label"));
  assert.deepEqual(projectClasses.filter((c) => has(c, "stat-number")), Array(3).fill("stat-number df-control__value df-readout"));
  // The two filters are Selected by aria-pressed; the coverage card is the one latch.
  const cards = (await classes("pages/Projects/Projects.tsx")).filter((c) => has(c, "stat-card"));
  assert.deepEqual(cards.map((c) => has(c, "df-control--latch")), [false, false, true]);
  // P3-2: exactly one element carries the chamfer, and it is the dialog panel.
  const projects = await read("pages/Projects/Projects.tsx");
  assert.deepEqual([...projects.matchAll(/className="([^"]*\bdf-cut-md\b[^"]*)"/g)].map((m) => m[1]), ["tech-stack-content df-cut-md"]);
  assert.equal((projects.match(/df-cut-md/g) ?? []).length, 1);
  // §13 Disabled keeps focus: the dropdown never sets the disabled attribute.
  const dropdown = await read("components/TerminalDropdown/TerminalDropdown.tsx");
  assert.doesNotMatch(dropdown, /(?<![\w-])disabled=\{/); assert.match(dropdown, /aria-disabled=\{disabled \|\| undefined\}/);
  assert.match(dropdown, /data-df-active=\{index === highlightedIndex \|\| undefined\}/);
  // Component rules hold no state look for the listed controls.
  const listed = /\.(stat-card|terminal-dropdown-trigger|terminal-dropdown-option|project-roster__toggle|project-roster__action(--primary)?|close-tech-stack)(?![\w-])/;
  const decls = await phase3Decls();
  const bad = decls.filter((d) => listed.test(innermost(d.selector)) &&
    /^(color|background|background-color|background-image|border(-[a-z-]+)?|outline(-[a-z-]+)?|box-shadow|transition|transform|padding(-[a-z-]+)?|min-height|font-(size|weight|family)|letter-spacing|opacity)$/.test(d.prop));
  assert.deepEqual(bad.map(where), []);
  assert.deepEqual(decls.filter((d) => listed.test(innermost(d.selector)) && /:(hover|active|focus|focus-visible)|\.(open|disabled|highlighted|selected)\b|\[aria-/.test(innermost(d.selector))).map(where), []);
  // The dialog: scrim from tokens, surface-2 bounded in edge, controls hover to surface-3.
  const value = (sel, prop) => decls.filter((d) => d.file === "pages/Projects/Projects.css" && innermost(d.selector) === sel && d.prop === prop).map((d) => d.value);
  assert.deepEqual(value(".tech-stack-modal", "background"), ["var(--df-scrim)"]);
  assert.deepEqual(value(".tech-stack-content", "background"), ["var(--surface-2)"]);
  assert.deepEqual(value(".tech-stack-content", "border"), ["var(--stroke-hair) solid var(--edge)"]);
  assert.deepEqual(value(".tech-stack-content", "--df-ground-up"), ["var(--surface-3)"]);
  assert.deepEqual(value(".tech-stack-content", "border-radius"), []);
  // Roster: tags are context labels; no green accent, status modifiers or second reveal remain.
  const item = await read("components/ProjectRoster/ProjectRosterItem.tsx");
  assert.match(item, /className="project-roster__tag df-label-sm df-context"/);
  assert.doesNotMatch(item, /statusModifier|project-roster__status--/);
  const roster = await read("components/ProjectRoster/ProjectRoster.css");
  assert.doesNotMatch(roster, /--roster-accent|@keyframes|animation\s*:/);
  assert.deepEqual(decls.filter((d) => /\.project-roster__tag(?![\w-])/.test(innermost(d.selector)) &&
    /^(color|background|background-color|border(-[a-z-]+)?|border-radius|padding|font-(size|weight)|line-height)$/.test(d.prop)).map(where), []);
  assert.ok(item.indexOf("project-roster__action--primary") < item.indexOf("project-roster__toggle"), "D8: Case study first in its row");
  // The chamfer rule exists in the grammar with token values only.
  const chamfer = declarations(await read("styles/darkfield/grammar.css")).filter((d) => /^\.df-cut-md/.test(innermost(d.selector)));
  assert.ok(chamfer.some((d) => d.prop === "clip-path" && /var\(--cut-md\)/.test(d.value)));
  assert.ok(chamfer.some((d) => d.prop === "background-color" && d.value === "var(--edge)"));
});

test("T11 header and dock: navigation follows the control model; the dock's dots and colour variables are gone", async () => {
  const classes = async (f) => [...(await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
  const has = (c, cls) => c.split(/\s+/).includes(cls);
  const header = "components/Navigation/HeaderNavigation.tsx";
  // [file, class, modifier, carries df-label]: icon-only controls have no visible label.
  const want = [
    [header, "site-header__link", /\bdf-control--light\b/, true], [header, "site-header__disclosure-toggle", /\bdf-control--latch\b/, true],
    [header, "site-header__settings-button", /\bdf-control--latch\b/, false],
    ["components/Dock/DockIcon.tsx", "dock-nav-link", /\bdf-control\b(?!--)/, false],
    ["components/Dock/DockExploreStack.tsx", "dock-explore__toggle", /\bdf-control--latch\b/, false],
    ["components/Dock/DockExploreStack.tsx", "dock-explore__link", /\bdf-control\b(?!--)/, true],
    ["components/Dock/DockSettingsButton.tsx", "dock-settings-button", /\bdf-control--latch\b/, false],
  ];
  for (const [f, cls, modifier, label] of want) {
    const found = (await classes(f)).filter((c) => has(c, cls));
    assert.ok(found.length > 0, `${f}: ${cls} not rendered`);
    for (const c of found) {
      assert.match(c, /\bdf-control\b/, `${f}: ${c}`); assert.match(c, modifier, `${f}: ${c}`);
      assert.equal(/(?<![\w-])df-label(?![\w-])/.test(c), label, `${f}: ${c}`);
    }
  }
  // State is ARIA: links are Selected by aria-current, latches by aria-expanded or aria-pressed. Only the header link keeps
  // its .active class (the foundation test's contrast pair names it).
  const code = Object.fromEntries(await Promise.all(want.map(([f]) => f).map(async (f) => [f, await read(f)])));
  assert.match(code["components/Dock/DockSettingsButton.tsx"], /aria-pressed=\{isOpen\}/);
  assert.match(code[header], /aria-pressed=\{isSettingsOpen\}/);
  for (const f of ["components/Dock/DockIcon.tsx", "components/Dock/DockExploreStack.tsx"]) assert.match(code[f], /aria-current=\{isActive \? "page" : undefined\}/, f);
  for (const [f, c] of Object.entries(code)) {
    assert.doesNotMatch(c, /dock-active-indicator/, f);
    assert.deepEqual((await classes(f)).filter((x) => /\bactive\b/.test(x) && !has(x, "site-header__link")), [], f);
  }
  // Component rules hold no state look for the listed controls or the dock's icon box.
  const listed = /\.(site-header__link|site-header__disclosure-toggle|site-header__settings-button|dock-nav-link|dock-explore__toggle|dock-explore__link|dock-settings-button|dock-icon)(?![\w-])/;
  const decls = (await phase3Decls()).filter((d) => /^components\/(Navigation|Dock)\//.test(d.file));
  const bad = decls.filter((d) => listed.test(innermost(d.selector)) &&
    /^(color|background|background-color|background-image|border(-[a-z-]+)?|outline(-[a-z-]+)?|box-shadow|transition|transform|will-change|font-(size|weight|family)|font|line-height|letter-spacing|opacity|min-height)$/.test(d.prop));
  assert.deepEqual(bad.map(where), []);
  // Padding is the model's, except the dock's icon controls (one cell inline, so the marker still fills the leading cell)
  // and the header's phone row (delegated ruling: space-1 inline, no marker cell, small label in markup).
  const DOCK_ICONS = ".dock-nav-link, .dock-explore__toggle, .dock-settings-button";
  const PHONE_ROW = '.site-header[data-layout="phone"] .site-header__core .site-header__link';
  assert.deepEqual(decls.filter((d) => listed.test(innermost(d.selector)) && /^padding/.test(d.prop) &&
    !(innermost(d.selector) === DOCK_ICONS && d.prop === "padding-inline" && d.value === "var(--space-2)") &&
    !(innermost(d.selector) === PHONE_ROW && d.prop === "padding-inline" && d.value === "var(--space-1)")).map(where), []);
  assert.deepEqual(decls.filter((d) => /::before/.test(innermost(d.selector)) && /site-header__link/.test(innermost(d.selector))).map((d) => [innermost(d.selector), d.prop, d.value]),
    [[`${PHONE_ROW}::before`, "content", "none"]], "only the phone row drops the marker");
  assert.match(code[header], /compact \? "df-label-sm" : "df-label"/);
  assert.match(code[header], /<HeaderLinkList items=\{coreNavItems\} pathname=\{pathname\} compact=\{layout === "phone"\} \/>/);
  assert.deepEqual(decls.filter((d) => listed.test(innermost(d.selector)) && /:(hover|active|focus|focus-visible)|\.(active|hovered)\b|\[aria-|::after/.test(innermost(d.selector))).map(where), []);
  // Overlays (§08): the Explore and Menu panels and the dock tooltip are surface-2 in an edge boundary; panels hover to surface-3.
  const value = (file, sel, prop) => decls.filter((d) => d.file === file && innermost(d.selector) === sel && d.prop === prop).map((d) => d.value);
  for (const [file, sel] of [["components/Navigation/SiteNavigation.css", ".site-header__panel"], ["components/Dock/Dock.css", ".dock-explore__panel"], ["components/Dock/Dock.css", ".dock-tooltip"]]) {
    assert.deepEqual(value(file, sel, "background"), ["var(--surface-2)"], sel);
    assert.deepEqual(value(file, sel, "border"), ["var(--stroke-hair) solid var(--edge)"], sel);
    assert.deepEqual(value(file, sel, "border-radius"), [], sel);
    if (sel !== ".dock-tooltip") assert.deepEqual(value(file, sel, "--df-ground-up"), ["var(--surface-3)"], sel);
  }
  // Made dead here: the dock's colour variables, its dots and the magnification leftovers.
  const dock = await read("components/Dock/Dock.css");
  assert.doesNotMatch(dock, /--dock-(?!icon-size)[a-z-]+|dock-active-indicator|magnif|will-change:\s*width/i);
  // Phase 4 Task 2: the identity mark keeps its token size at every width; no narrow-width rule groups it with the settings latch.
  const nav = await read("components/Navigation/SiteNavigation.css");
  assert.doesNotMatch(nav, /\.site-header__brand-mark\s*,|,\s*\.site-header__brand-mark\b/);
});

test("T12 settings and section rail: controls follow the model; the switch has no track; the slider is direct manipulation; the rail is an L1 rule", async () => {
  const classes = async (f) => [...(await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
  const has = (c, cls) => c.split(/\s+/).includes(cls);
  const S = "components/SettingsPanel/";
  const RAIL = "components/Layout/GlobalSectionNavigation";
  // [file, class, modifier, carries df-label]: icon-only and unlabelled cells have no visible label of their own.
  const want = [
    [S + "SettingsPanel.tsx", "settings-close", /\bdf-control\b(?!--)/, false],
    [S + "SettingsPanel.tsx", "settings-action", /\bdf-control\b(?!--)/, true],
    [S + "SettingsPanel.tsx", "settings-disclosure__toggle", /\bdf-control--latch\b/, true],
    [S + "SettingsControls.tsx", "settings-segmented__button", /\bdf-control\b(?!--)/, true],
    [S + "SettingsControls.tsx", "setting-switch", /\bdf-control--latch\b/, true],
    [S + "BuildIdentifier.tsx", "settings-build__link", /\bdf-control--light\b/, false],
    [RAIL + ".tsx", "nav-dot", /\bdf-control\b(?!--)/, false],
  ];
  for (const [f, cls, modifier, label] of want) {
    const found = (await classes(f)).filter((c) => has(c, cls));
    assert.ok(found.length > 0, `${f}: ${cls} not rendered`);
    for (const c of found) {
      assert.match(c, /\bdf-control\b/, `${f}: ${c}`); assert.match(c, modifier, `${f}: ${c}`);
      assert.equal(/(?<![\w-])df-label(?![\w-])/.test(c), label, `${f}: ${c}`);
    }
  }
  // State is ARIA: Selected by aria-pressed (segmented) and aria-current (rail), latches by aria-checked and aria-expanded.
  const controls = await read(S + "SettingsControls.tsx");
  const rail = await read(RAIL + ".tsx");
  assert.match(controls, /aria-pressed=\{option\.value === value\}/);
  assert.match(rail, /aria-current=\{activeSection === section\.id \? "location" : undefined\}/);
  assert.deepEqual((await classes(RAIL + ".tsx")).filter((c) => /\bactive\b/.test(c)), []);
  assert.match(rail, /className="dot-tooltip df-body-sm"/);
  // §13 Disabled keeps focus: the switch and sliders set aria-disabled, never the disabled attribute, and their handlers
  // ignore activation while disabled.
  assert.doesNotMatch(controls, /(?<![\w-])disabled=\{/);
  assert.equal((controls.match(/aria-disabled=\{disabled \|\| undefined\}/g) ?? []).length, 2);
  assert.equal((controls.match(/if \(!disabled\) onChange\(/g) ?? []).length, 2);
  // Made dead here: the switch track and thumb, the slider's progress fill, the Reset fault hue, the disclosure caret.
  assert.doesNotMatch(controls, /setting-switch__(track|thumb)|--range-fill|CSSProperties/);
  assert.doesNotMatch(await read(S + "SettingsPanel.tsx"), /faChevronRight|settings-disclosure__icon/);
  const css = await read(S + "SettingsPanel.css");
  assert.doesNotMatch(css, /--range-|setting-switch__(track|thumb)|--settings-danger|settings-disclosure__icon|rgba?\(|#[0-9a-f]{3,8}\b/i);
  // The heading takes no bracket glyph prefix: generated decoration, not a state (§16, fix wave).
  assert.deepEqual(declarations(css).filter((d) => /::(before|after)/.test(d.selector) && /settings-header/.test(d.selector)).map((d) => d.selector), []);
  // Component rules hold no state look for the listed controls (the rule's subject compound names the class).
  const listed = /\.(settings-close|settings-action(--danger)?|settings-segmented__button|setting-switch|settings-disclosure__toggle|settings-build__link|nav-dot)(?![\w-])[^\s>+~]*$/;
  const decls = (await phase3Decls()).filter((d) => d.file.startsWith(S) || d.file.startsWith(RAIL));
  // The rail cell's marker sits outside the cell, on the field, so it keeps fg rather than inherit the pressed label colour.
  const MARKER = (d) => innermost(d.selector) === ".nav-dot::before" && d.prop === "color" && d.value === "var(--fg)";
  const bad = decls.filter((d) => listed.test(innermost(d.selector)) && !MARKER(d) &&
    /^(color|background|background-color|background-image|border(-[a-z-]+)?|outline(-[a-z-]+)?|box-shadow|transition|transform|padding(-[a-z-]+)?|min-height|font|font-(size|weight|family)|line-height|letter-spacing|opacity|cursor)$/.test(d.prop));
  assert.deepEqual(bad.map(where), []);
  assert.deepEqual(decls.filter((d) => listed.test(innermost(d.selector)) && /:(hover|active|focus|focus-visible|disabled)|\.(active)\b|\[aria-/.test(innermost(d.selector))).map(where), []);
  // The panel's controls hover one step up from surface-2.
  const value = (sel, prop) => decls.filter((d) => innermost(d.selector) === sel && d.prop === prop).map((d) => d.value);
  assert.deepEqual(value(".settings-panel", "--df-ground-up"), ["var(--surface-3)"]);
  // The segmented group holds no frame of its own.
  assert.deepEqual(decls.filter((d) => innermost(d.selector) === ".settings-segmented" && /^(border|background|border-radius|padding)/.test(d.prop)).map(where), []);
  // §13 Direct manipulation: the current value is a solid square in signal riding an edge hairline; the track carries no fill.
  const range = decls.filter((d) => /^\.setting-range/.test(innermost(d.selector)));
  assert.deepEqual(range.filter((d) => /gradient|--range-/.test(d.value) || d.prop.startsWith("--range-")).map(where), []);
  for (const thumb of [".setting-range::-webkit-slider-thumb", ".setting-range::-moz-range-thumb"]) {
    assert.deepEqual(value(thumb, "background-color"), ["var(--signal)"], thumb);
    assert.deepEqual(value(thumb, "border-radius"), ["var(--radius-0)"], thumb);
    assert.deepEqual(value(thumb, "width"), value(thumb, "height"), thumb);
  }
  for (const track of [".setting-range::-webkit-slider-runnable-track", ".setting-range::-moz-range-track"]) {
    assert.deepEqual(value(track, "border-block-start"), ["var(--stroke-hair) solid var(--edge)"], track);
    assert.deepEqual(value(`.setting-range[aria-disabled="true"]${track.slice(".setting-range".length)}`, "border-block-start-style"), ["dashed"], track);
  }
  assert.deepEqual(value(".setting-range::-moz-range-progress", "background-color"), ["transparent"]);
  // Scrollbar: tokens only.
  assert.ok(decls.filter((d) => /scrollbar/.test(d.selector) && /^background/.test(d.prop)).every((d) => /^var\(--(rule|edge|fg-muted)\)$/.test(d.value)));
  // Icon-only close: three cells tall on small or coarse-pointer screens.
  assert.ok(decls.some((d) => innermost(d.selector) === ".settings-close" && /max-width: 768px\), \(pointer: coarse\)/.test(d.selector) &&
    d.prop === "min-block-size" && d.value === "calc(3 * var(--cell-h))"));
  // The rail (§09 L1): a rule at full opacity; cells square, three cells on a coarse pointer; no radius or opacity anywhere.
  const railCss = declarations(await read(RAIL + ".css"));
  const at = (sel, prop) => railCss.filter((d) => innermost(d.selector) === sel && d.prop === prop).map((d) => d.value);
  assert.deepEqual(at(".nav-dots::before", "background-color"), ["var(--rule)"]);
  assert.deepEqual(at(".nav-dots::before", "width"), ["var(--stroke-hair)"]);
  assert.deepEqual(railCss.filter((d) => d.prop === "opacity" && !/dot-tooltip/.test(innermost(d.selector))).map((d) => d.selector), []);
  assert.deepEqual(railCss.filter((d) => d.prop === "border-radius").map((d) => d.selector), []);
  assert.deepEqual(at(".nav-dot", "width"), at(".nav-dot", "height"));
  assert.ok(railCss.some((d) => /pointer: coarse/.test(d.selector) && innermost(d.selector) === ".layout-foreground" && d.prop === "--nav-cell" && d.value === "calc(3 * var(--cell-h))"));
  // Wherever the rail shows (the complement of the phone breakpoint that hides it), a page that renders it reserves the
  // rail's inline-start band, set once on the layout, from the rail's own offset and cell and a space token.
  assert.ok(railCss.some((d) => /not all and \(max-width: 768px\)/.test(d.selector) && innermost(d.selector) === ".layout-foreground.has-section-rail .app-content" &&
    d.prop === "padding-inline-start" && d.value === "calc(var(--global-section-nav-offset) + var(--nav-cell) + var(--space-4))"));
  assert.ok(railCss.some((d) => /max-width: 768px/.test(d.selector) && !/not all/.test(d.selector) && innermost(d.selector) === ".global-section-navigation" && d.prop === "display" && d.value === "none"));
  assert.match(await read("components/Layout/Layout.tsx"), /sections\.length > 0 \? " has-section-rail" : ""/);
  // Page Up and Page Down move the sliders by a larger step (WAI-ARIA Authoring Practices slider pattern); arrows, Home and
  // End are the input's own.
  assert.match(controls, /onKeyDown=\{pageStep\}/);
  // The tooltip is a label overlay (§08): surface-2 in an edge boundary.
  assert.deepEqual(at(".dot-tooltip", "background"), ["var(--surface-2)"]);
  assert.deepEqual(at(".dot-tooltip", "border"), ["var(--stroke-hair) solid var(--edge)"]);
});

test("T13 reading controls use the shared model and Journey turns only on activation", async () => {
  const controls = [
    ["pages/CaseStudies/CaseStudies.tsx", "case-study-card", "df-control--card"],
    ["pages/Writing/Writing.tsx", "writing-card", "df-control--card"],
    ["pages/ProceduralAnimations/ProceduralAnimations.tsx", "procedural-animations-card", "df-control--card"],
    ["components/CaseStudyPage/CaseStudyPage.tsx", "case-study-link", "df-control"],
    ["components/CaseStudyPage/CaseStudyPage.tsx", "case-study-artifact-link", "df-control"],
    ["pages/Work/Work.tsx", "work-contact-link", "df-control"],
    ["components/TimelineItem/TimelineItem.tsx", "timeline-flip-toggle", "df-control--latch"],
    ["components/ArticlePage/ArticlePage.tsx", "article-series-link", "df-control"],
  ];
  for (const [file, cls, model] of controls) {
    const code = await read(file);
    const found = [...code.matchAll(/className="([^"]*)"/g)].map((m) => m[1]).filter((c) => c.split(/\s+/).includes(cls));
    assert.ok(found.length > 0, `${file}: ${cls} absent`);
    for (const c of found) assert.ok(c.split(/\s+/).includes(model), `${file}: ${c} lacks ${model}`);
  }
  const interactiveLinks = (await reachable(".tsx")).filter((file) => !/RhythmLab/.test(file));
  for (const file of interactiveLinks) {
    const code = await read(file);
    for (const m of code.matchAll(/<(?:Link|a|motion\.a)\b[^>]*className="([^"]*\binteractive-card\b[^"]*)"/g)) {
      assert.match(m[1], /\bdf-control--card\b/, `${file}: ${m[1]}`);
    }
  }
  const journey = await read("components/TimelineItem/TimelineItem.tsx");
  assert.doesNotMatch(journey, /onPointerEnter|onPointerLeave|handleMouseEnter|handleMouseLeave/);
  assert.match(journey, /<button className="timeline-flip-toggle[^\"]*" aria-pressed=\{isFlipped\}/);
  assert.match(await read("components/CaseStudyPage/CaseStudyPage.tsx"), /className="case-study-link disabled df-control df-control--unavailable/);
  // A prompt's summary pairs its label with a Narrator meta line; the meta sits outside the label class, so it keeps the
  // case it was written in (§06: uppercase is the Instrument voice's).
  assert.match(await read("components/CaseStudyPage/CaseStudyBlocks.tsx"),
    /<summary className="df-control df-control--latch df-body-sm">\s*<span className="df-label">\{prompt\.label\}<\/span>\s*<span className="case-study-prompt__meta">\{prompt\.summary\}<\/span>/);
  for (const [file, names] of [
    ["components/CaseStudyPage/CaseStudyPage.css", /\.(case-study-link|case-study-artifact-link|case-study-breadcrumbs a)(?![\w-])/],
    ["components/ArticlePage/ArticlePage.css", /\.(article-series-link|article-toc a|article-toc summary)(?![\w-])/],
    ["pages/Work/Work.css", /\.work-contact-link(?![\w-])/],
    ["components/TimelineItem/TimelineItem.css", /\.timeline-flip-toggle(?![\w-])/],
  ]) {
    const bad = declarations(await read(file)).filter((d) => names.test(innermost(d.selector)) &&
      /^(background|background-color|color|border|border-color|border-radius|box-shadow|transition|transform|outline|opacity)$/.test(d.prop));
    assert.deepEqual(bad.map(where), [], file);
  }
});

test("T15 Spider and terminal side controls use the shared model on the Layout field", async () => {
  for (const [file, cls] of [
    ["components/SpiderSolitaire/SpiderSolitaire.tsx", "spider-button"],
    ["components/Terminal/Terminal.tsx", "terminal-sidecar"],
  ]) {
    const classes = [...(await read(file)).matchAll(/className="([^"]*)"/g)]
      .map((m) => m[1]).filter((c) => c.split(/\s+/).includes(cls));
    assert.ok(classes.length > 0, `${file}: ${cls} absent`);
    for (const c of classes) {
      assert.match(c, /(^|\s)df-control(\s|$)/, `${file}: ${c}`);
      assert.match(c, /(^|\s)df-label(\s|$)/, `${file}: ${c}`);
    }
  }
  const files = ["components/SpiderSolitaire/SpiderSolitaire.css", "components/Terminal/Terminal.css"];
  for (const file of files) {
    const rules = declarations(await read(file)).filter((d) => /\.(spider-button|terminal-sidecar)(?![\w-])/.test(innermost(d.selector)));
    const bad = rules.filter((d) => /^(background(?:-[\w-]+)?|color|border(?:-[\w-]+)?|border-radius|opacity|transition(?:-[\w-]+)?)$/.test(d.prop) ||
      /:(hover|active|disabled)(?![\w-])/.test(innermost(d.selector)));
    assert.deepEqual(bad.map(where), [], file);
  }
  const spider = await read("components/SpiderSolitaire/SpiderSolitaire.tsx");
  assert.match(spider, /aria-disabled=\{!canDeal \|\| undefined\}/);
  assert.doesNotMatch(spider, /disabled=\{!canDeal\}/);
  assert.match(spider, /onClick=\{\(\) => \{ if \(canDeal\) dealCards\(\); \}\}/);
  assert.match(spider, /aria-describedby=\{!canDeal \? "spider-deal-reason" : undefined\}/);
  assert.match(spider, /!canDeal && <span id="spider-deal-reason" className="spider-button__reason df-annotation">\{dealUnavailableReason\}<\/span>/);
  assert.match(await read("components/Terminal/Terminal.tsx"), /aria-label="Terminal minimized — reopen"/);
});

// Generated article HTML cannot carry type classes. Icon-only selectors size glyphs, not text.
const GENERATED_TYPE = new Set([
  "components/ArticlePage/ArticlePage.css|.article-body h2",
  "components/ArticlePage/ArticlePage.css|.article-body h3",
  "components/ArticlePage/ArticlePage.css|.article-body pre, .article-prose pre",
  "components/ArticlePage/ArticlePage.css|.article-body code, .article-prose code",
  "components/ArticlePage/ArticlePage.css|.article-table table",
]);
const ICON_SIZES = new Set([
  "components/Navigation/SiteNavigation.css|.site-header__caret",
  "components/ProjectRoster/ProjectRoster.css|.project-roster__toggle-icon",
  "components/SettingsPanel/SettingsPanel.css|.settings-action svg",
  "components/TerminalDropdown/TerminalDropdown.css|.terminal-dropdown-arrow",
  "components/TerminalDropdown/TerminalDropdown.css|.terminal-option-prefix",
  "components/TimelineItem/TimelineItem.css|.timeline-icon-wrapper",
]);
// The existing normalize reset still governs native Phase 5 text and controls. Retire it after those surfaces lift their type.
const RESET_HOLD = new Map([
  ["index.css|html|line-height", "1.15"],
  ["index.css|h1|font-size", "2em"],
  ["index.css|pre|font-size", "1em"],
  ["index.css|b, strong|font-weight", "bolder"],
  ["index.css|code, kbd, samp|font-size", "1em"],
  ["index.css|small|font-size", "80%"],
  ["index.css|sub, sup|font-size", "75%"],
  ["index.css|sub, sup|line-height", "0"],
  ["index.css|button, input, optgroup, select, textarea|font-size", "100%"],
  ["index.css|button, input, optgroup, select, textarea|line-height", "1.15"],
]);
test("T14 type: Phase 3 text gets size, line, weight and tracking from generated classes", async () => {
  const bad = (await phase3Decls()).filter((d) => {
    if (!/^(font|font-size|line-height|letter-spacing|font-weight)$/.test(d.prop)) return false;
    if (d.value === "inherit" || /^var\(--[^)]+\)$/.test(d.value)) return false;
    const key = `${d.file}|${innermost(d.selector)}`;
    if (GENERATED_TYPE.has(key)) return false;
    if (RESET_HOLD.get(`${key}|${d.prop}`) === d.value) return false;
    // §06 Rules (weights): a Live data value is one weight step above its data style; no generated class carries it.
    if (key === "styles/darkfield/grammar.css|.df-data.df-data--live" && d.prop === "font-weight" && d.value === "500") return false;
    // The alarm tile's word takes the label class's weight; generated content cannot carry the class.
    if (key === "styles/darkfield/grammar.css|.df-error--alarm::before" && d.prop === "font-weight" && d.value === "600") return false;
    return !(d.prop === "font-size" && ICON_SIZES.has(key));
  });
  assert.deepEqual(bad.map(where), []);
  const held = (await phase3Decls()).filter((d) => RESET_HOLD.has(`${d.file}|${innermost(d.selector)}|${d.prop}`));
  assert.deepEqual(held.map((d) => [`${d.file}|${innermost(d.selector)}|${d.prop}`, d.value]), [...RESET_HOLD]);
});

test("T16 every governed Phase 3 corner is square with no legacy radius alias", async () => {
  const decls = await phase3Decls();
  const corners = decls.filter((d) => /^border-radius$|^border-(?:top|bottom)-(?:left|right)-radius$/.test(d.prop));
  assert.deepEqual(corners.filter((d) => d.value !== "0" && d.value !== "var(--radius-0)").map(where), []);
  assert.deepEqual(decls.filter((d) => /var\(--(?:border-radius-|dock-border-radius)/.test(d.value)).map(where), []);
  const timelineTransforms = decls.filter((d) => d.file === "pages/Work/Work.css" && /\.timeline-node\b/.test(d.selector) && d.prop === "transform");
  assert.deepEqual(timelineTransforms.map(where), [], "Work timeline state points must remain axis-aligned squares");
});

// §05 ranks and §13 states: the shared state signatures alone draw the fault frame (Error, invalid field), the caution
// frame (Warning) and the Confirmed decay's signal-dim frame. Full selector -> the one extra colour it may use.
const STATE_FRAMES = new Map([[".df-error", "var(--fault)"], [".df-warning", "var(--caution)"],
  ['.df-field[aria-invalid="true"]', "var(--fault)"], ["@keyframes df-confirmed-decay >> 50%", "var(--signal-dim)"]]);
const stateFrame = (d) => (d.file === "styles/darkfield/grammar.css" ? STATE_FRAMES.get(d.selector) : undefined);
test("T17 lines: governed boundaries use line tokens and headings have no decorative bars", async () => {
  const decls = await phase3Decls();
  const allowedColours = new Set(["var(--rule)", "var(--edge)", "var(--signal)", "var(--fg-muted)", "var(--fg-faint)", "transparent", "currentColor"]);
  const allowedWidths = new Set(["var(--stroke-hair)", "var(--stroke-bold)", "0"]);
  const bad = [];
  for (const d of decls) {
    if (!/^(?:border(?:-(?:top|right|bottom|left|block-start|block-end|inline-start|inline-end))?|outline)(?:-(?:width|color))?$/.test(d.prop)) continue;
    // The normalize reset remains until the native Phase 5 controls receive their own focus treatment.
    if (d.file === "index.css" && d.prop === "outline" && d.value === "1px dotted ButtonText" &&
        innermost(d.selector) === 'button:-moz-focusring, [type="button"]:-moz-focusring, [type="reset"]:-moz-focusring, [type="submit"]:-moz-focusring') continue;
    // Phase 1's transparent outline reserves space for the two-part keyboard focus ring.
    if (d.prop === "outline" && d.value === "2px solid transparent !important" && /:focus-visible/.test(d.selector)) continue;
    const parts = d.value.split(/\s+/);
    if (parts.some((p) => {
      if (/^(?:\d+(?:\.\d+)?(?:px|rem|em)?|var\(--stroke-[^)]+\))$/.test(p)) return !allowedWidths.has(p);
      if (/^(?:var\(--[^)]+\)|transparent|currentColor|#[0-9a-f]+|rgba?\(|color-mix\()/.test(p)) return !allowedColours.has(p) && p !== stateFrame(d);
      return false;
    })) bad.push(where(d));
  }
  assert.deepEqual(bad, []);
  // §09 Line hierarchy: a width and a colour declared together name one level. The bold width belongs to a signal path
  // (and focus, drawn by the shared focus rule); the hair width is a structure seam in rule or a boundary in edge.
  const LEVEL = { "var(--stroke-bold)": ["var(--signal)"], "var(--stroke-hair)": ["var(--rule)", "var(--edge)"] };
  const pairs = decls.filter((d) => /^(?:border(?:-(?:top|right|bottom|left|block-start|block-end|inline-start|inline-end))?|outline)$/.test(d.prop))
    .map((d) => ({ d, width: d.value.match(/var\(--stroke-[a-z]+\)/)?.[0], colour: d.value.match(/var\(--(?!stroke-)[a-z0-9-]+\)/)?.[0] }))
    .filter(({ width, colour }) => width && colour);
  assert.ok(pairs.length > 0, "no width and colour pair found; the check no longer tests anything");
  assert.deepEqual(pairs.filter(({ d, width, colour }) => !(LEVEL[width] ?? []).includes(colour) && colour !== stateFrame(d)).map(({ d }) => where(d)), []);
  assert.deepEqual(decls.filter((d) => /(?:title::after|title::before)$/.test(innermost(d.selector)) && /^background(?:-|$)/.test(d.prop)).map(where), []);
});

test("T18 aliases: governed Phase 3 styles read tokens directly", async () => {
  const indexDock = new Set(["--dock-icon-size", "--dock-height", "--dock-height-mobile", "--dock-spacing", "--dock-padding", "--dock-border-radius"]);
  const layoutReads = new Set(["--dock-height", "--dock-height-mobile"]);
  const bad = (await phase3Decls()).filter((d) => {
    const aliases = [d.prop, ...Array.from(d.value.matchAll(/var\((--[a-z0-9-]+)/g), (m) => m[1])];
    return aliases.some((name) => {
      if (!/^(?:--terminal-|--roster-|--pill-|--dock-|--settings-danger$|--range-)/.test(name)) return false;
      if (d.file === "index.css" && innermost(d.selector) === ":root" && d.prop === name && indexDock.has(name)) return false;
      if (d.file === "components/Layout/Layout.css" && innermost(d.selector) === ".app-content" &&
          d.prop === "padding-bottom" && layoutReads.has(name)) return false;
      return true;
    });
  });
  assert.deepEqual(bad.map(where), []);
});

test("T19 literals: Phase 3 surfaces name colours only through tokens", async () => {
  const bad = (await phase3Decls()).filter((d) => LITERAL.test(d.value) && !/^(font-family|content|grid-template-areas)$/.test(d.prop));
  assert.deepEqual(bad.map(where), []);
});

test("T20 Simulations chrome is page scoped; Traffic chart uses signal while native speed ramp stays mirrored", async () => {
  const sim = declarations(await read("pages/Simulations/Simulations.css"));
  // Phase 5 Task 8 replaced the page-scoped aliases with token reads: none remains.
  assert.deepEqual(sim.filter((d) => d.prop.startsWith("--")).map((d) => [innermost(d.selector), d.prop]), []);
  assert.deepEqual(sim.filter((d) => /:root\b|\[data-theme/.test(d.selector)).map(where), [], "no root or theme block");
  assert.doesNotMatch(await read("pages/Simulations/Simulations.css"), /\[data-theme/, "no empty theme block");
  assert.deepEqual(sim.filter((d) => d.prop === "font-family" && innermost(d.selector) === ".simulations-container").map((d) => d.value), ["inherit"]);

  const trafficFile = "pages/TrafficSimulator/TrafficSimulator.css";
  const css = await read(trafficFile);
  const traffic = declarations(css);
  assert.deepEqual(traffic.filter((d) => d.prop === "--traffic-chart-line").map((d) => [innermost(d.selector), d.value]),
    [[".traffic-container", "var(--signal)"]]);
  assert.match(css.slice(0, css.indexOf("--traffic-speed-0")), /P3-9.*native.*Phase 5/i, "speed-ramp hold comment");
  const renderer = await read("components/TrafficSimulator/renderer.ts");
  const speedInRenderer = [...renderer.matchAll(/speed:\s*\[([^\]]+)\]/g)].map((m) =>
    [...m[1].matchAll(/"(#[0-9a-f]{6})"/gi)].map((x) => x[1]));
  assert.equal(speedInRenderer.length, 2, "native dark and light palettes");
  // The shared declaration walker only parses lettered property names; inspect the numbered ramp in its two blocks.
  const blocks = [css.match(/^\.traffic-container\s*\{([^}]+)\}/m), css.match(/^html\[data-theme="light"\] \.traffic-container\s*\{([^}]+)\}/m)];
  for (const [index, block] of blocks.entries()) {
    assert.ok(block, `speed block ${index} exists`);
    const speed = [...block[1].matchAll(/(--traffic-speed-[0-4]):\s*(#[0-9a-f]{6})\s*;/gi)];
    assert.deepEqual(speed.map((m) => m[1]), HOLDS[trafficFile], `speed block ${index}: held properties`);
    assert.deepEqual(speed.map((m) => m[2]), speedInRenderer[index], `speed block ${index}: native mirror`);
  }
  assert.equal([...css.matchAll(/--traffic-speed-[0-9]+\s*:/g)].length, 10);
});

// Phase 5 Task 14 retired the Terminal colour aliases this test once pinned to one root mapping: every Terminal
// stylesheet now reads the tokens directly, so no alias is defined or read anywhere, and none is keyed on a theme.
test("T21 Terminal colour aliases are retired; grep matches take the selection band", async () => {
  const ALIAS = /--terminal-(text-|window-bg|header-bg|border|selection-)/;
  for (const file of PHASE5.filter((name) => /^components\/Terminal\/.*\.css$/.test(name))) {
    const css = await read(file);
    assert.deepEqual(declarations(css).filter((d) => ALIAS.test(d.prop) || ALIAS.test(d.value)).map((d) => where({ file, ...d })), [],
      `${file}: a Terminal colour alias is defined or read`);
    assert.deepEqual(declarations(css).filter((d) => /\[data-theme/.test(d.selector) && d.prop.startsWith("--terminal-")).map((d) => where({ file, ...d })), [],
      `${file}: theme blocks must not define Terminal variables`);
  }
  const matches = declarations(await read("components/Terminal/TerminalView.css"))
    .filter((d) => innermost(d.selector) === ".grep-highlight" && d.prop === "background-color");
  // Phase 5 Task 12: TerminalView.css reads the selection band's token directly.
  assert.deepEqual(matches.map((d) => d.value), ["var(--signal-deep)"]);
});

test("T22 timing: Phase 3 transitions and animations use duration and easing tokens", async () => {
  // These two global reduced-motion overrides truncate authored motion.
  const reducedOverride = (d) => d.file === "index.css" &&
    d.selector === "@media (prefers-reduced-motion: reduce) >> *, *::before, *::after" &&
    ["animation-duration", "transition-duration"].includes(d.prop) && d.value === "0.001ms !important";
  const bad = (await phase3Decls()).filter((d) => !reducedOverride(d) &&
    /^(transition|animation)(-duration|-timing-function|-delay)?$/.test(d.prop) && d.value !== "none" &&
    (/(?<![\w-])\d*\.?\d+m?s\b|\b(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier|steps)\b(?![\w-])/.test(d.value.replace(/var\([^)]*\)/g, "")) || /\ball\b/.test(d.value)));
  assert.deepEqual(bad.map(where), []);
  const root = declarations(await read("index.css"));
  assert.deepEqual(root.filter((d) => d.prop === "--interaction-transition").map((d) => d.value),
    ["background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)"]);
  assert.deepEqual(root.filter((d) => innermost(d.selector) === "body" && d.prop === "transition").map(where), []);
});
