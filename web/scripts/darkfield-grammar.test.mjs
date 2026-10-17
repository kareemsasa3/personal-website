// web/scripts/darkfield-grammar.test.mjs: Phase 3 (Grammar) static invariants.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { src, read, reachable, governed, declarations, NATIVE, NATIVE_FILES, innermost, where } from "./darkfield-css-scope.mjs";

// Phase ownership (plan: Phase 3 / Phase 5 boundary). Every reachable governed stylesheet is in exactly one list.
export const PHASE3 = ["index.css", "styles/components.css", "styles/darkfield/grammar.css",
  "components/StaticBackground/StaticBackground.css", "components/common/ViewportPortal.css",
  "components/Layout/Layout.css", "components/Layout/GlobalSectionNavigation.css", "components/Layout/GlobalScrollProgress.css",
  "components/Navigation/SiteNavigation.css", "components/Dock/Dock.css", "components/SettingsPanel/SettingsPanel.css",
  "pages/Home/Home.css", "pages/Home/sections/HeroSection.css", "pages/Home/sections/CapabilitiesSection.css",
  "pages/Home/sections/FeaturedProjectsSection.css", "pages/Home/sections/ContactStripSection.css",
  "pages/Home/sections/ExplorationChoiceSection.css", "pages/Projects/Projects.css", "components/ProjectRoster/ProjectRoster.css",
  "components/TerminalDropdown/TerminalDropdown.css", "pages/Work/Work.css", "components/WorkDetails/WorkDetails.css",
  "pages/Journey/Journey.css", "components/TimelineItem/TimelineItem.css", "pages/Writing/Writing.css",
  "components/ArticlePage/ArticlePage.css", "components/CaseStudyPage/CaseStudyPage.css"];
export const PHASE5 = ["components/ProjectMedia/ProjectMedia.css", "pages/ProceduralAnimations/ProceduralAnimations.css",
  "pages/ProceduralAnimationPiece/ProceduralAnimationPiece.css", "pages/Simulations/Simulations.css",
  "components/SimulationCard/SimulationCard.css", "pages/OrbitalSimulator/OrbitalSimulator.css",
  "pages/TrafficSimulator/TrafficSimulator.css", ...["Terminal", "TerminalView", "TerminalWindow", "TopUI", "VimUI", "ManPageUI",
  "TerminalErrorBoundary"].map((n) => `components/Terminal/${n}.css`), "components/SnakeGame/SnakeGame.css",
  "pages/SnakeGame/SnakeGame.css", "components/SpiderSolitaire/SpiderSolitaire.css", "pages/SpiderSolitaire/SpiderSolitaire.css",
  "components/RhythmLab/RhythmLab.css", "pages/RhythmLab/RhythmLab.css", "pages/Annals/Annals.css", "pages/NotFound/NotFound.css",
  ...["ErrorBoundary", "PageLoader", "Toast", "ToastContainer", "Modal"].map((n) => `components/common/${n}.css`)];
const OUTSIDE = ["styles/darkfield/bridge.css", ...NATIVE_FILES];
// Rules no component renders (dead-code ruling, P3-8): excluded by exact innermost selector, never deleted.
// A selector joins only after `rg` over web/src TSX shows nothing renders it; the commit body lists it.
const DEAD_RULES = {
  "pages/Projects/Projects.css": [".projects-cta", ".projects-cta-primary", ".projects-hero-actions"],
  "components/TimelineItem/TimelineItem.css": [".timeline-flip-hint", ".timeline-flip-container:hover .timeline-flip-hint"],
};
// Header brand, held unchanged for Phase 4 (D5: R1 symbol and wordmark replace the KS mark). Exact innermost selectors.
const BRAND_HOLD = { "components/Navigation/SiteNavigation.css": [".site-header__brand", ".site-header__brand-mark",
  '[data-theme="light"] .site-header__brand-mark', ".site-header__brand-name"] };
// Phase 3 declarations: PHASE3 files, governed and rendered selectors only.
export const phase3Decls = async () => {
  const out = [];
  for (const file of (await governed(".css")).filter((f) => PHASE3.includes(f))) {
    const skip = [...(NATIVE[file] ?? []), ...(DEAD_RULES[file] ?? []), ...(BRAND_HOLD[file] ?? [])];
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

test("T6 eyebrows speak in the Instrument voice (§06 Interface label); Rhythm Lab is the named Phase 5 exclusion", async () => {
  for (const f of (await governed(".tsx")).filter((x) => !/RhythmLab/.test(x))) {
    for (const [, cls] of (await read(f)).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g).map((m) => [m[0], m[1] ?? m[2]])) {
      if (/eyebrow/.test(cls) && !/rhythm-lab-eyebrow/.test(cls)) assert.match(cls, /(^|\s)df-label(\s|$)/, `${f}: ${cls}`);
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
  ".article-body code, .article-prose code", "pre", "code, kbd, samp", "code", ".df-control::before", ".df-context--live::before"];
test("T7 voices: Phase 3 sets mono only on Machine text; Narrator inherits; uppercase is the Instrument classes' alone", async () => {
  const decls = await phase3Decls();
  const family = decls.filter((d) => d.prop === "font-family" && !/^(inherit)$/.test(d.value) && !(d.value === "var(--font-sans)" && innermost(d.selector) === "body") && !(d.value === "var(--font-mono)" && MACHINE.includes(innermost(d.selector))));
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

test("T8 measure: no Phase 3 max-width or grid track holds a literal ch value; prose containers carry df-prose", async () => {
  const decls = await phase3Decls();
  const bad = decls.filter((d) => /^(max-width|grid-template-columns)$/.test(d.prop) && /\d\s*ch\b/.test(d.value));
  assert.deepEqual(bad.map(where), []);
  assert.ok(decls.some((d) => d.prop === "max-width" && /--measure-body/.test(d.value)), "measure-body is read nowhere");
  assert.match(await read("components/ArticlePage/ArticlePage.tsx"), /className="article-body df-prose /);
  const art = await read("components/ArticlePage/ArticlePage.tsx");
  const containers = [...art.matchAll(/className="article-prose (df-prose(?:-links)?)"\s+dangerouslySetInnerHTML=\{\{\s+__html: article\.provenance\.(\w+)/g)].map((m) => `${m[2]}:${m[1]}`);
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
  assert.deepEqual(projectClasses.filter((c) => has(c, "stat-number")), Array(3).fill("stat-number df-control__value"));
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
  // The 375px brand-mark rule is held unchanged (Phase 4); the settings latch overrides only its own width after it.
  const nav = await read("components/Navigation/SiteNavigation.css");
  assert.match(nav, /\.site-header__brand-mark,\s*\.site-header__settings-button\s*\{\s*width:\s*2\.15rem;\s*\}/);
});
