# Personal website modernization discovery

Discovery date: 2026-09-26. Repository examined: `personal-website`, HEAD `1a4a117`.

Scope: discovery and documentation reconciliation only. The initial discovery added this document; the subsequent user-directed clarification also adds a scoped supersession note to the older evidence-linked case-study specification. No application, site content, tests, dependencies, build output, infrastructure, branches, commits, or deployments were changed.

## 1. Executive summary

**Modernize toward an inspectable engineering portfolio: make the relationship between systems, engineering decisions, operational evidence, and writing immediately legible.** Keep the Matrix/terminal identity, the project roster, and the increasingly editorial presentation. The evidence does not support a wholesale redesign.

The current site already has the ingredients of a distinctive senior/systems-oriented portfolio: Linux coordination and IPC projects; production modernization experience; a source-first documentation project; verifiable agent workflows; essays about operational knowledge, judgment, and governance; and working simulations. Its central idea is consistent: complex systems should expose their state, constraints, and reasons for acting. The presentation does not yet make that consistency as obvious as the underlying work does.

The main opportunity is therefore **better hierarchy and stronger connections**, followed by a calmer interaction system and tighter frontend boundaries. A visitor should be able to move from a claim to a decision to a public artifact, or from an essay to the system that illustrates it, without independently reconstructing the relationship.

The highest-confidence work is practical: ordinary links for navigation, route focus management, readable mobile destinations, corrected residual contrast problems, restrained hover behavior, and removing unnecessary loading waits. The most valuable structural work is an evidence-linked case-study pattern, a more editorial homepage, a writing index that expresses the existing series, and an experience page that foregrounds ownership. Native browser features can help implement these improvements, but are supporting tools rather than the modernization thesis.

**Resolved product direction — user clarification, 2026-09-26:** Homepage curation and evidence qualification are separate concerns. Erebus and Arachne remain the current featured systems. Aether may serve as the first evidence-linked case-study implementation, but evidence readiness does not confer homepage flagship status. The older `docs/evidence-linked-case-studies-spec.md` is superseded wherever it conflicts with this distinction. Evidence work must not gate homepage curation or automatically promote/demote a featured system.

A separate navigation question remains: the older specification demotes Simulations from primary navigation, while recent intentional homepage work adds a wordless Simulations link. Some other provisions have shipped, notably the roster and removal of complexity ratings. The homepage/evidence clarification does not resolve or reinstate unrelated navigation requirements.

### Evidence and limits

- **Source-confirmed:** component behavior, data relationships, CSS declarations, generator contracts, smoke assertions, and cited git decisions.
- **Artifact-confirmed:** local project thumbnails were viewed; existing build files and local media sizes were inspected without rebuilding. The build directory predates the latest commits and is supporting evidence, not a verified build of HEAD.
- **Design inference:** likely comprehension, density, hierarchy, and discoverability effects. These are hypotheses for prototypes, not results from visitor testing.
- **Not verified:** rendered desktop/mobile layouts, actual computed styles, screen-reader behavior, keyboard journeys, network waterfalls, Core Web Vitals, deployed revision, or production response headers. The configured Playwright browser was missing, and the browser skill found no connected browser. Nothing was installed to work around that limitation.

External sites were inspected through retrieved public page content. Comparisons below concern their information structure, content, and artifact relationships; they are not claims about motion quality or pixel-level visual audits. Research reflects sources retrieved on the discovery date. No private résumé or private project source was needed.

## 2. Current site model

### Application and delivery

The app uses React 18, TypeScript, Vite 8, React Router 7, Framer Motion 11, Font Awesome, and feature CSS. `AppProviders` supplies theme, layout, settings, navigation mode, toasts, motion preferences, and `BrowserRouter`. Standard routes share `Layout`; Rhythm Lab deliberately bypasses that shell for an immersive experience.

Most page components use `lazyWithMinTime`, whose default adds a 500 ms import floor. `Layout` also switches to a loader for 300 ms initially and 500 ms on subsequent pathname changes. These are separate mechanisms; their effects depend on whether a route has already loaded. Terminal is imported eagerly by the route table. Layout captures a frozen outlet to prevent exiting wrappers from displaying incoming route content. These are intentional attempts to solve transition artifacts, not random complexity.

Production is a static frontend served through Docker/nginx. The Vite build generates per-route HTML shells containing real content, metadata, and JSON-LD. React uses `createRoot`, not hydration of those shells; `.app-ready` hides the separate fallback document. Writing is compiled from first-party Markdown into a committed TypeScript module before build. CI checks generator drift, lint, types, and smoke assertions. There is no current need for a CMS, server component architecture, or backend migration.

### Public hierarchy and jobs

| Surface | Current job and content | Assessment |
| --- | --- | --- |
| `/` | Identity; credibility strip; Featured Systems: Erebus and Arachne; four numbered How I Work rows; contact; red/blue pills to Writing/Simulations | Strong positioning sentence; weak connection to newest work and writing |
| `/projects` | Seven-project single-column roster; category/status filters, sorting, inline details, code and case-study links; technical coverage dialog | Correct breadth surface; preserve its deliberate roster model |
| `/case-studies` | Three system summaries with thumbnails and links | Correct depth gateway; lifecycle badges are not evidence-quality labels |
| `/case-studies/aether`, `/case-studies/erebus`, `/case-studies/arachne` | Problem, constraints, architecture, decisions, implementation, outcomes, evidence, links; detail-page video | Good decision-oriented skeleton; evidence remains largely page-level |
| `/writing` | Seven essays/field notes; one four-part Agent Systems sequence; series-aware feed ordering | Substantive, recent body of work deserving more homepage prominence |
| `/writing/:slug` | Reading shell, conditional TOC, metadata, full prose, provenance disclosures, series and other-writing navigation | Already a credible editorial foundation |
| `/experience` and `/work` | Four roles, current consulting first, timeline, responsibilities, notable projects, tools, focus areas, contact | Ownership is present but buried among parallel lists; `/work` canonicalizes to `/experience` |
| `/journey` | Personal history grouped by eras; alternating narrative/image cards | A separate personal lens; should not be flattened into Experience |
| `/terminal` | Optional command-driven exploration of a virtual filesystem and portfolio | Distinctive demonstration; should remain optional |
| `/simulations` | Four available experiences plus two explicitly unavailable concepts | Valid evidence of curiosity, state modeling, and interaction work; needs proportionate prominence |
| Simulation detail routes | Annals, Snake, Spider, Rhythm Lab | Keep distinct interaction requirements; do not force reading-page patterns onto them |
| `/games`, `/games/*` | Legacy redirects preserving subpaths | Preserve aliases |

The roster includes Erebus, Aether, Arachne, Personal Website, Mnemosyne, kctl, and Operating System Audit. The last three are dated 2026, whereas the homepage's two featured systems are dated 2025. Newest-first sorting makes the newer direction available in Projects, but the homepage does not explain its relationship to the curated featured systems. Improving that connection does not require changing the featured pair.

### Intended identity

The strongest identity is an engineer who makes complicated software operable and accountable: explicit state, reliable boundaries, recoverable decisions, and inspectable behavior. This connects consulting modernization to local infrastructure and AI-assisted engineering without requiring a list of unrelated specialties.

| Dimension | What currently communicates it | What is harder to establish |
| --- | --- | --- |
| Systems engineering | Hero, Erebus, Aether, systems-oriented project descriptions | Overall relation among the systems |
| Architecture | Case-study constraints and decisions | Alternatives rejected, precise boundaries, claim-level supporting artifacts |
| Infrastructure/operations | Linux, systemd, shared memory, event history, drift detection | Public demonstration of failure/recovery behavior rather than descriptions alone |
| AI/governance | kctl, Mnemosyne, Agent Systems essays, Centaur essay | A clear first-screen route into this work; no separate governance case study exists |
| Technical ownership | Current consulting role; concrete modernization examples; latest first-person essay | Scope, decision authority, collaboration, and limits at a glance |
| Implementation depth | Code links, recordings, constraints, technical details | How each artifact substantiates the nearby assertion |
| Thought process | Seven pieces with sources and checked-claim records | Earlier discovery and stronger return paths from case studies |
| Breadth | Projects, simulations, terminal, personal journey | A hierarchy that lets breadth enrich the central identity |

Do not infer a formal staff/principal title, team size, enterprise deployment, or independently measured impact from this positioning. The task is to communicate senior engineering judgment using the existing evidence.

### What a sophisticated visitor likely understands

These are content-based journey estimates, not timed user-test findings.

**After 5 seconds:** Kareem is a systems engineer working across Linux, backend, and infrastructure, with a deliberate terminal aesthetic. The current role and case-study CTA support professional intent. On a first visit, the subtitle has a 2-second animation delay followed by character reveals, while loader and entrance animation also participate. Immediate identity is therefore less dependable than the copy itself warrants. There is little early signal of the depth of AI/governance writing.

**After 30 seconds:** The visitor can identify Erebus and Arachne, a preference for observability and failure boundaries, and consulting experience. Depending on navigation choice, the site may still appear primarily to be a Linux personal-project portfolio. Generic system names need their descriptions; the videos establish that something runs, but do not independently establish reliability or correctness.

**After 2 minutes:** A visitor who follows a case study sees reasons behind the architecture. One who follows Writing sees a more distinctive position on agents, durable operational knowledge, authority, and accountability. One who visits Experience finds cross-stack modernization and a public example involving 15+ services across 18 repositories. The site has enough depth, but these visitors may leave with different, only partially connected models of the same engineer.

**Difficult to discover:** the connection from kctl and Mnemosyne to Agent Systems; the strongest consulting scope beneath the responsibilities list; the material behind individual case-study claims; a recommended entry into the four-part series; and contact from the end of a case study or article. The newest essay already links Aether and Erebus: cross-linking is incomplete, not absent.

## 3. Existing strengths worth preserving

1. **The technical/editorial character.** Green accents, terminal framing, mono labels, optional terminal exploration, and an atmospheric background are recognizable. Replacing them with a generic SaaS hero would discard identity.
2. **The division between breadth and depth.** Projects is a complete roster; Case Studies explains judgment. Commit `2c71084` deliberately removed the project grid, flagship split, truncation, and self-assigned complexity subsystem. Do not bring those back under a modernization label.
3. **Recent movement away from enclosing every paragraph.** `151de0c` introduced edgeless scrims; `b0b6b69` removed outer case-study boxes; `67bf37e` made How I Work a numbered list. Extend this direction selectively.
4. **Real technical constraints and honest availability.** Aether describes shared-memory tradeoffs; Erebus exposes confidence and replay; unavailable repositories are not invented; active development and demo readiness are distinguished.
5. **Article provenance.** Abstracts, sources, fact-check tables, and original-synthesis notes distinguish the writing from a routine blog. Preserve the distinction between author observation, verified source claims, and interpretation.
6. **Existing editorial restraint.** Article prose uses a roughly 68ch measure and 1.75 line height. TOCs use H2 only and appear for at least five entries. Native disclosures keep provenance available without making it dominate the essay. The newest essay has no body H2s; the absent TOC is appropriate, not a missing feature.
7. **Media discipline.** WebP stills, explicit intrinsic dimensions, separate readable thumbnails, detail-only video, `preload="none"`, offscreen pause, manual play/pause, and reduced-motion handling already exist. Do not recommend these as though absent.
8. **Progressive content delivery.** Real static route bodies, canonical metadata, structured data, sitemap generation, and article anchor checks are substantial foundations.
9. **Accessibility work already done.** Accessible full text accompanies animated characters; navigation has labels/current states; global focus-visible styling exists; settings restores focus; dialogs use focus traps; reduced-motion CSS and `MotionConfig` are present; video and canvas honor reduced motion.
10. **Personal breadth.** Journey and simulations provide personality and evidence of exploration. They need clear placement, not erasure. Wordless pills were explicitly intentional in `a7c5767`.

## 4. Friction and missed opportunities

### Hierarchy is weaker than the content

Eight equal primary destinations flatten distinct visitor tasks. Below 1180 px, the header hides inactive link labels; at narrow widths the visual experience relies heavily on icon recognition. Accessible names help assistive technology but do not explain unfamiliar icons to a sighted touch user. The homepage's pills have accessible labels and titles, but their destinations are not visibly stated. This makes the metaphor an optional discovery mechanism that currently carries too much responsibility for writing discovery.

The hero repeats identity through the subtitle, description, three proof cells, two major actions, and a contact link. It then repeats case-study discovery in Featured Systems. These elements are individually defensible, but their cumulative height pushes substantive examples down, particularly when the proof strip stacks on mobile. The recently corrected fold sizing should be measured before another sizing change.

### Some surfaces still imply interaction where none exists

`interactive-card` applies lift, scale, a moving sheen, and glow to linked cards, but also to static constraint/decision articles, the case-study hero, and contact container. `.tech-tag:hover` moves noninteractive labels. Work cards and date labels also react to hover. That weakens the distinction between reading, disclosure, and navigation. Meanwhile, real actions such as Details and Case study compete visually in the roster.

### The evidence layer does not yet carry the identity

Case-study architecture and outcomes are strings; decisions/highlights have no claim IDs or evidence references. Artifacts sit in a later section. The small Erebus flow is a good start, but is hardcoded by slug rather than represented as reusable content. A generic repository link cannot show which implementation supports which decision. Qualitative outcomes are acceptable; adding invented percentages would weaken credibility.

### Editorial components are mature but disconnected

Writing has series labels and correct feed ordering, yet the index renders every piece through the same card template. There is no visual series introduction. Article references are mostly a sources region rather than a dedicated footnote/backlink system. The long-form shell already has the essential TOC and navigation; its next improvement should be more deliberate relationships and typographic rhythm, not additional chrome.

### The implementation carries avoidable presentation cost

Source-confirmed concerns include independent minimum-loading mechanisms, eager Terminal routing, full article data imported into shared metadata and structured-data modules, scroll handlers that repeatedly measure headings, and globally scoped CSS with colliding names. An existing build provides supporting evidence of article body text and Prism in the entry bundle. Exact current production cost remains unmeasured.

### Visual qualities to test, rather than declare from source alone

| Quality | Specific source evidence | Interpretation to validate |
| --- | --- | --- |
| Boxed-in | Hero proof strip encloses three bordered cells; inner case-study cards; experience panels | Reduce nested framing where it adds no semantic separation |
| Repetitive/flat | Same card treatment across constraints, decisions, highlights, evidence | Different evidence types need different reading rhythms |
| Timid | Centered home composition and text-only featured cards despite available artifacts | One carefully composed artifact could establish confidence without more decoration |
| Dense | Experience responsibilities/projects/tools/focus lists; small uppercase metadata | Foreground ownership and demote repetitive labels |
| Sparse | Hero viewport reservation; limited early evidence; article side space below TOC breakpoint | Space should guide attention rather than delay useful content |
| Generic | Hover sheen and glow shared across unrelated roles | Distinctiveness should come from real system artifacts |
| Inconsistent | Sans article body; multiple independently hardcoded Courier-first stacks; different widths and radii | Define a deliberate relationship between reading and interface typography |

## 5. Relevant contemporary techniques

This is a fit assessment, not an adoption checklist. Several useful techniques predate 2025; their maturity makes them better choices now. Browser claims below are limited to the cited feature, not every related API.

| Technique | Fit for this site and adoption boundary | Direction |
| --- | --- | --- |
| Typography-led/editorial layout | Strong fit: differentiate identity, engineering statement, metadata, and long-form prose through measure and hierarchy | R04, R09, R11 |
| Asymmetric composition | Worth comparing on Home: copy beside one real system artifact on wide screens; logical one-column order on mobile | Prototype first, R04 |
| Bento/grid systems | Grid is useful; an assortment of equal promotional tiles would repeat the problem the roster recently solved | Reject site-wide bento; R04/R08 use purposeful grid |
| Variable fonts | Can provide optical sizing/weight flexibility, but the current system stack has zero font-download cost. One carefully chosen self-hosted font is an experiment, not a prerequisite. [MDN variable fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts/Variable_fonts) | R11 prototype only |
| Fluid type and spacing | Already used via `clamp`; hero already uses balanced wrapping. Consolidate scale and measures rather than “introduce fluid type.” `text-wrap` values require feature-specific compatibility consideration. [MDN text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap) | R11 |
| Container size queries | Useful for reusable media/summary and decision/evidence components in different parent widths. Home already declares a container. Keep viewport queries for the global header. [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) | R11 |
| Modern layout primitives | `minmax(0, 1fr)`, logical properties, `gap`, intrinsic sizing, `svh`/`dvh`, and sticky positioning fit; many already exist. Subgrid may align evidence labels if ordinary Grid becomes awkward | R08/R11, no blanket conversion |
| CSS color functions | `color-mix` already supports surfaces. CSS theme maps and color-valued `light-dark()` can simplify selection; neither guarantees contrast. MDN dates color support to May 2024. [MDN light-dark](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark) | R12/R16 |
| Scroll-driven animation | A possible decorative progress-bar replacement, not justification for text parallax. MDN still marks `animation-timeline` limited availability in the retrieved reference; retain a usable static fallback. [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) | R03/R18 |
| Same-document View Transitions | Core same-document transitions reached Baseline Newly available in October 2025. This makes a restrained route prototype credible; it does not settle React Router integration or imply support for every newer extension. [web.dev announcement](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available) | R18, after loading fixes |
| Progressive disclosure | Already effective in roster details and provenance. Improve state/shareability and action clarity before adding more hidden content | R06/R09/R14 |
| Sticky contextual navigation | Strong fit for case studies; articles already have it. Use named anchors and one shared offset contract, not multiple competing sticky rails | R08 |
| Interactive diagrams | Strong only when interaction reveals a meaningful state change, such as event → inferred state → replay; a static annotated diagram is the baseline | R08 |
| Command palette | Identity-compatible, but low marginal benefit with seven projects and eight destinations; duplicates navigation and the terminal. Reconsider only if cross-content search becomes demonstrably necessary | Deferred, not on committed roadmap |
| Metadata-driven discovery | Strong fit: lifecycle, evidence availability, relationship, and public artifact type answer visitor questions. Technology counts and complexity scores do not establish seniority | R05/R06/R07 |
| Technical timelines | Useful for ownership evolution or one system's architecture decisions; less useful as decorative milestones with no consequences | R10/R08 |
| Hover/focus microinteractions | Keep feedback tied to actual links, controls, and state changes; align focus and hover visual affordances | R13 |
| Media previews/art direction | Existing thumbnails are already art-directed crops. Responsive source sizes and explanatory captions are more useful than hover video everywhere | R17 |
| Native dialogs/selects | Mature HTML can reduce custom interaction code, but migration must preserve focus return, Escape, labeling, and modal boundaries. [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | R14 |
| `content-visibility` | Potentially useful for very long content, but seven roster rows do not justify it. Test find-in-page, anchor positions, print, and accessibility before using it on essays. [MDN content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) | Defer until profiling |
| React/Vite modernization | The tooling is already recent. Content splitting, route isolation, and coherent shell readiness are more consequential than a version upgrade | R03/R15 |
| Social metadata | Distinct article/project preview images and article-specific metadata can improve shared-link comprehension; existing JSON-LD should be retained | R19 |

## 6. Comparative-site observations

These are inspirations extracted from current public content, not templates to imitate. A site's presence here does not imply that its design was launched in 2025–2026 or that its performance/accessibility was tested.

| Reference | Observed pattern | Transferable idea | What not to copy |
| --- | --- | --- | --- |
| [Julia Evans](https://jvns.ca/) | Recent posts coexist with topic-grouped archives and a distinct collection of things built | Give visitors multiple meaningful entry points into systems knowledge, with projects connected to explanations | A very large archive taxonomy would overwhelm seven essays |
| [Simon Willison](https://simonwillison.net/) | Tools, releases, commentary, timestamps, tags, and linked demonstrations coexist | Relate an idea to a shipped artifact and its development record | High-frequency mixed feed density is not appropriate to this portfolio |
| [Maggie Appleton](https://maggieappleton.com/) | Clear identity; explicit distinctions among essays, notes, and patterns; descriptive decks | Label the kind of thinking and its maturity; allow conceptual breadth under one recognizable perspective | A sprawling digital-garden hierarchy or borrowed illustration style |
| [Paco Coursey](https://paco.me/) | Compact identity followed by selected projects, writing, and contact; each project gets a short purpose statement | Concise selection can communicate confidence without a large component inventory | Making interface craft the primary identity when this site's strongest work is systems engineering |
| [Brittany Chiang](https://brittanychiang.com/) | Experience connects roles to concrete responsibilities and artifacts; projects and writing remain nearby; a skip link is exposed | Make ownership and evidence adjacent; make primary navigation understandable | Copying an established portfolio composition or color palette |
| [Fly.io engineering blog](https://fly.io/blog/) | Named engineers explain concrete systems, implementation, and operations alongside product work | Turn one architecture decision into an inspectable technical story | Product sales navigation, signup CTAs, or corporate brand presentation |
| [Dan Luu](https://danluu.com/) | Descriptive technical titles and a direct chronological archive make depth discoverable | Credibility can come from specificity and readily reachable arguments | Stripping away this site's intentional visual identity |
| [Karl Sims](https://www.karlsims.com/) | Exhibits, web tools, animations, and papers connect different outputs of the same practice | Present simulation as an artifact with a purpose and explanation | Treating an older research archive as a contemporary UI template |

The common useful pattern is **specific work plus an intelligible route to its explanation**. There is no evidence here that a portfolio must acquire a bento grid, cinematic transitions, or a command palette to feel current.

## 7. Recommendations by layer

Recommendation IDs are reused in the roadmap and prototype briefs. Each record includes current state, opportunity, proposed technique, fit, visible effect, effort, risk, prerequisites, prototype decision, and likely implementation locations. File paths are relative to the repository root. These are proposals, not approved implementation tasks.

### 7.1 Information architecture

#### R01 — Restore ordinary navigation semantics and route orientation

- **Current state:** Header links are real `NavLink`s, but home CTAs use imperative buttons. Global section dots scroll through buttons without URL fragments. `Layout` has a main ID, but no shell skip link or general route focus policy was found.
- **Opportunity:** Navigation loses open-in-new-tab/link affordances, shareable section addresses, and predictable keyboard orientation after route replacement.
- **Proposed technique:** Use `Link` for destinations, anchors for in-page navigation, a visible-on-focus skip link, and a route focus/announcement policy after real content is ready. Preserve expected back/forward and fragment behavior.
- **Why it fits / visible effect:** An engineering portfolio should behave like a dependable document. Visitors can open evidence in another tab and keyboard users can reach the new page without traversing navigation again.
- **Classification:** foundational. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Coordinate with R03; explicitly exempt terminal input and immersive simulation focus where appropriate. Preserve `/work` and `/games` behavior.
- **Prototype first:** No visual concept needed; test interaction with keyboard and screen reader.
- **Files:** `web/src/components/Layout/Layout.tsx`, `GlobalSectionNavigation.tsx`, `web/src/pages/Home/Home.tsx`, `sections/HeroSection.tsx`, `sections/FeaturedProjectsSection.tsx`, `web/src/index.css`.

#### R02 — Give primary navigation a readable priority structure

- **Current state:** Home, Projects, Case Studies, Writing, Experience, Terminal, Journey, and Simulations occupy one primary list. Inactive labels disappear below 1180 px. The optional dock uses the same destinations.
- **Opportunity:** Icon familiarity substitutes for information hierarchy, particularly on touch screens.
- **Proposed technique:** Prototype a labeled core set—Case Studies, Projects, Writing, Experience—with Home on the brand and a clearly named secondary menu for Terminal, Journey, and Simulations. Compare against a fully labeled compact menu, rather than assuming four always-visible links fit 320 px.
- **Why it fits / visible effect:** Professional evaluation gets a clear path while exploratory work stays discoverable and keeps its routes. Fewer unexplained icons reduce uncertainty.
- **Classification:** information architecture. **Complexity:** medium. **Overdesign risk:** medium.
- **Prerequisites:** Resolve the evidence specification's Simulations policy; decide whether dock mode intentionally retains all destinations. A menu needs focus, Escape, dismissal, and expanded-state behavior.
- **Prototype first:** Yes, especially 320–430 px, 768–1180 px, and zoomed text.
- **Files:** `web/src/data/navigation.ts`, `web/src/components/Navigation/HeaderNavigation.tsx`, `SiteNavigation.css`, `SiteNavigation.tsx`, `web/src/components/Dock/*`. Route metadata/sitemap review is required if navigation policy changes, even though URLs should remain.

### 7.2 Homepage

#### R03 — Let content readiness control the reading experience

- **Current state:** The layout loader, lazy import delay, route fade/translation, staggered sections, and character animation all participate in arrival. The hero subtitle delays for 2 seconds. Desktop sections use scroll-linked transforms. Historical loading docs explicitly justify a minimum wait to prevent flicker.
- **Opportunity:** The solution to a brief loader flash now imposes delay even on ready content. The fallback shell can be hidden as soon as `AppRoutes` marks the app ready, before the route has finished loading.
- **Proposed technique:** One readiness policy: show already available content immediately, delay the *appearance of a loading indicator* for genuinely pending work, and preserve a stable shell during arrival. Keep the subtitle readable from first meaningful paint; reserve optional typing for a short accent or the terminal. Remove nonessential reading parallax and audit motion values under reduced motion.
- **Why it fits / visible effect:** Responsiveness demonstrates technical confidence and makes the existing identity sentence do its job sooner. The original anti-flicker goal survives.
- **Classification:** foundational. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Cold/warm navigation traces, slow-network behavior, fallback-shell handoff, direct anchors, POP restoration, and Annals/Rhythm Lab exceptions. Do not promise exact time savings without measurement.
- **Prototype first:** A small interaction spike; no visual redesign required.
- **Files:** `web/src/components/Layout/Layout.tsx`, `web/src/utils/lazyWithMinTime.ts`, `web/src/App.tsx`, `web/src/routes/index.tsx`, `web/index.html`, `web/src/pages/Home/Home.tsx`, `sections/HeroSection.tsx`, `web/src/components/TypeWriterText/TypeWriterText.tsx`, `web/docs/UX_LOADING_IMPROVEMENTS.md` for later decision documentation.

#### R04 — Compose the homepage around identity, selected proof, and thinking

- **Current state:** A centered text hero and boxed proof strip lead to two equal text-only featured cards, How I Work, Contact, and wordless exploration pills.
- **Opportunity:** Too much introductory framing precedes proof; writing and current governance/tooling work receive little explanation. Make the broader work easier to discover while preserving Erebus and Arachne as the curated featured pair; a system's appearance in the proof strip need not imply a featured card.
- **Proposed technique:** Compare the current centered arrangement with an editorial wide-screen composition: identity and primary action in one column, one real artifact and a concise engineering question in the other; a quieter proof line; selected systems immediately below; one explicit writing/series entry. Collapse to a logical content order on mobile. Keep the pills as optional identity details, supported by explicit links elsewhere.
- **Why it fits / visible effect:** The page demonstrates what “observable and easier to operate” means. Breadth becomes a set of related examples rather than additional hero claims.
- **Classification:** visual refinement. **Complexity:** medium. **Overdesign risk:** medium.
- **Prerequisites:** Preserve Erebus and Arachne as featured systems; choose an artifact that supports a specific explanation and remains readable at actual sizes. Evidence readiness does not change homepage curation. Do not add another competing hero CTA or autoplay a large background video.
- **Prototype first:** Yes, P1.
- **Files:** `web/src/pages/Home/Home.tsx`, `Home.css`, `sections/HeroSection.*`, `FeaturedProjectsSection.*`, `ExplorationChoiceSection.*`, `web/src/data/siteContent.ts`, `web/src/components/ProjectMedia/*`, `web/vite.config.ts` for semantic shell parity.

### 7.3 Projects

#### R05 — Connect projects, writing, and experience through curated relationships

- **Current state:** Project-to-case-study links exist; the latest essay links Aether and Erebus; case studies mostly link to one another. kctl and Mnemosyne are not connected to the relevant essays through a shared relation model.
- **Opportunity:** Visitors must infer the portfolio's organizing idea. Contact is prominent on Home and Experience but absent as a shared ending on case studies and articles.
- **Proposed technique:** Add a small typed relationship model with authored labels such as “Related engineering argument” or “System illustrating this decision.” Render one or two relevant links at natural stopping points, plus a quiet shared contact footer on standard professional/reading pages. Keep article-specific series navigation primary.
- **Why it fits / visible effect:** Visitors can follow a meaningful thread across artifact, reasoning, and professional scope, then contact the author without returning home.
- **Classification:** content presentation. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Editorial review of each relation; no implication that a philosophical essay proves a project's implementation. Use only existing public content and centralized contact links.
- **Prototype first:** Small content-layout prototype with R04/R09; no standalone relationship graph required.
- **Files:** `web/src/data/projects.ts`, `caseStudies.ts`, `siteContent.ts`, article frontmatter in `web/src/content/articles/`, `web/scripts/build-articles.mjs`, `web/src/components/ArticlePage/ArticlePage.tsx`, `CaseStudyPage/CaseStudyPage.tsx`, `Layout/Layout.tsx`, `web/vite.config.ts`.

#### R06 — Strengthen the roster without making it a dashboard

- **Current state:** Seven rows expose category/year/status and Details/Case study/Code. Filters and sorting already exist. Their state lives in a reducer and expansion lives per row; neither is URL-addressable. Details is visually stronger than the case-study action. Status options include unused values.
- **Opportunity:** Browsing depth is good, but a shared URL cannot restore a selection or specific expanded project. Evidence availability and personal contribution are not first-class metadata.
- **Proposed technique:** Preserve the single column. Add stable row anchors; consider a selected-project fragment and URL query filters with back/forward restoration. Derive meaningful available filter options, expose active filters/reset clearly, and test making Case study the primary action where it exists. Add at most one concise evidence/ownership line using verified data. Keep lifecycle separate from evidence availability.
- **Why it fits / visible effect:** A technical reader can skim, share, and compare scope without opening every row or parsing a badge wall.
- **Classification:** content presentation. **Complexity:** medium. **Overdesign risk:** medium.
- **Prerequisites:** Agree on metadata meanings and empty-filter behavior; do not make all seven projects produce a metric. Maintain live result announcements, full detail content, and existing sort choices.
- **Prototype first:** Yes, P2; compare against the existing roster before adding a new facet.
- **Files:** `web/src/components/ProjectRoster/ProjectRosterItem.tsx`, `ProjectRoster.css`, `web/src/pages/Projects/Projects.tsx`, `useProjects.ts`, `web/src/data/projects.ts`, `web/vite.config.ts`, and later corresponding smoke assertions.

### 7.4 Case studies

#### R07 — Put evidence beside the engineering claim it supports

- **Current state:** Decisions, architecture, and outcomes are narrative fields; artifacts are a separate array. Public, Private, Sanitized, and Unavailable mix disclosure and accessibility concepts.
- **Opportunity:** The reader cannot distinguish “described here,” “demonstrated by this recording,” and “inspectable in this implementation” at the claim itself.
- **Proposed technique:** Use the non-conflicting claim/evidence provisions of the evidence-linked specification: stable claim IDs, an evidence registry, claim references, separate accessibility/disclosure states, and a compact nearby evidence link. Keep evidence qualification separate from homepage curation. Represent decision context, alternative, tradeoff, and observed result without converting every paragraph into a compliance table. Present measurements with method, environment, and limitations; use qualitative outcomes when measurements do not exist.
- **Why it fits / visible effect:** It enacts the site's argument about inspectable systems. A visitor can verify a key assertion instead of accepting a polished description.
- **Classification:** foundational. **Complexity:** high. **Overdesign risk:** medium.
- **Prerequisites:** Verify publishable evidence. Aether may be the first evidence-linked implementation without replacing Erebus or Arachne on the homepage; featured selection is not a dependency. No private project/client artifacts should be activated from this discovery alone. Aether's existing numerical claims need supporting context, not amplification.
- **Prototype first:** Yes, P3, using one supported claim and one honest evidence gap.
- **Files:** `docs/evidence-linked-case-studies-spec.md`, `web/src/data/caseStudies.ts`, `web/src/components/CaseStudyPage/CaseStudyPage.tsx`, `CaseStudyPage.css`, `web/src/pages/CaseStudies/CaseStudies.tsx`, `web/src/data/structuredData.ts`, `aiContext.ts`, `web/scripts/generate-ai-context.mjs`, `web/vite.config.ts`, and future evidence-policy tests.

#### R08 — Explain one system flow and make sections addressable

- **Current state:** Erebus has a small semantic four-stage flow; other architecture sections are bullets. Case-study navigation uses a global dot rail. Recordings sit in the hero without visible explanatory captions.
- **Opportunity:** Videos show activity but do not explain boundaries, state ownership, or recovery. Dot navigation requires exploration before its labels are known.
- **Proposed technique:** A data-driven static architecture figure with explicit boundaries, labeled flows, and a short text equivalent; one contextual decision or failure/recovery sequence where evidence supports it. Use a labeled sticky contents rail on sufficiently wide screens and a compact disclosure of anchor links on mobile. Add optional click/keyboard steps only if they clarify cause and effect.
- **Why it fits / visible effect:** A reader can understand the system model before reading every card, then jump to the decision or evidence that matters.
- **Classification:** content presentation; optional interactive extension is experimental. **Complexity:** medium for static figures/navigation, high for stateful replay. **Overdesign risk:** low for static, high for interactive.
- **Prerequisites:** R07's publishable boundaries; accessible figure description; stable anchors and header/dock offsets. Aether's publisher/readers, Erebus's recorded/inferred state, and Arachne's pipeline must remain distinct models.
- **Prototype first:** Yes, P3. A static version must succeed before adding animation.
- **Files:** `web/src/data/caseStudies.ts`, `web/src/components/CaseStudyPage/CaseStudyPage.tsx`, `CaseStudyPage.css`, `web/src/components/Layout/GlobalSectionNavigation.tsx`, `web/src/components/ProjectMedia/ProjectMedia.tsx`, `web/vite.config.ts`; a small future `ArchitectureFigure` component if reuse is proven.

### 7.5 Writing

#### R09 — Refine the existing editorial shell and expose reading paths

- **Current state:** Seven index cards; series ordering and metadata already exist. Article body is sans at 68ch, while the index is Courier-first. TOC, provenance, series previous/next, and More writing are implemented. More writing lists all non-series alternatives without relevance ranking.
- **Opportunity:** The series is logically grouped but visually undifferentiated. Provenance is unusually strong yet distant from the claims it qualifies. Code/ASCII blocks can become small and horizontally scrolled on mobile.
- **Proposed technique:** Give Agent Systems one restrained series introduction and retain its part order. Compare an editorial list against equal cards. Refine title/deck/meta hierarchy and reading surface padding; add meaningful related-system links via R05. For articles that need them, support durable source anchors and return links; retain sources and fact-check tables. Keep plain ASCII diagrams selectable, optionally pair the most valuable one with an accessible static figure. Include an intentional print treatment.
- **Why it fits / visible effect:** Writing reads as a body of engineering thought with a clear starting point. Readers retain access to evidence without navigating a research dashboard.
- **Classification:** content presentation. **Complexity:** medium. **Overdesign risk:** medium.
- **Prerequisites:** Preserve generator-owned IDs, no-JS content, series order, dates, provenance, and the current prose. Do not add headings to the unsectioned essay merely to populate a TOC. Syntax highlighting remains unnecessary for predominantly text diagrams; add it only for substantive future code samples, at build time.
- **Prototype first:** Yes, P4; include a long article with tables and the unsectioned essay.
- **Files:** `web/src/pages/Writing/Writing.tsx`, `Writing.css`, `web/src/components/ArticlePage/ArticlePage.tsx`, `ArticlePage.css`, `web/scripts/build-articles.mjs`, `web/src/content/articles/`, `web/src/utils/articleFormatting.ts`, `web/vite.config.ts`. Generated article data must later be regenerated, not hand-edited.

### 7.6 Experience

#### R10 — Make ownership and progression the first reading layer

- **Current state:** Four chronological roles, with large responsibility, project, tool, and focus-area groups. The current consultancy contains the most concrete scope examples.
- **Opportunity:** The reader encounters many bullets before seeing what Kareem inherited, decided, changed, and remained responsible for. Equal panel treatment makes the current role and earlier roles feel similarly weighted.
- **Proposed technique:** An ownership-led timeline: role/dates, one concise scope statement derived from existing public copy, two or three substantial interventions, and supporting tools in a quieter layer. Use before → intervention → resulting capability when supported. Keep earlier roles visible and connect selected public artifacts contextually. Retain Journey as the separate personal narrative.
- **Why it fits / visible effect:** Progression becomes increasing scope and judgment rather than a longer skill list. This supports a senior-oriented portfolio without inventing rank or becoming a résumé clone.
- **Classification:** content presentation. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Verify wording about ownership and shared delivery; avoid implying solo authorship or numerical outcomes absent evidence. Client case studies still require separate permission/evidence work.
- **Prototype first:** Yes, P5, with the current consulting role and one earlier role.
- **Files:** `web/src/data/workExperience.ts`, `web/src/pages/Work/Work.tsx`, `Work.css`, `web/src/components/WorkDetails/WorkDetails.tsx`, `WorkDetails.css`, `web/vite.config.ts`.

### 7.7 Visual language

#### R11 — Define a small editorial/interface system and reduce accidental CSS overlap

- **Current state:** Global tokens exist, but 63 CSS files use global selectors; no `.module.css` files were found. Multiple containers independently hardcode mono stacks and widths. `.work-header` is defined for both the page header and the role header. `.section-title` and other generic names are reused. There are append-at-end overrides from recent fixes.
- **Opportunity:** Hierarchy and spacing vary by feature; global styles can couple routes. The recent open-surface direction lacks a small shared vocabulary.
- **Proposed technique:** Define reading, interface, and display type roles; a compact fluid spacing scale; a few content widths; and three surface roles: reading, interactive, and technical artifact. Scope colliding selectors locally, starting with Work, then migrate only touched features. Use container queries for reusable summaries/media, not as a rewrite mandate. Compare the existing fonts with at most one variable-font option after improving measure and hierarchy.
- **Why it fits / visible effect:** The terminal language remains recognizable while dense prose becomes easier to scan. Alignment and rhythm can supply confidence that currently depends on borders and glow.
- **Classification:** visual refinement. **Complexity:** medium. **Overdesign risk:** low for token/scoping work, medium for a font change.
- **Prerequisites:** Render both themes, direct route loads, and route sequences; check text zoom and contrast. A new font would require a separate licensed asset/performance decision. Do not introduce Tailwind or a component library for this task.
- **Prototype first:** Yes for typography/surface choices; no for a narrowly scoped selector collision fix.
- **Files:** `web/src/index.css`, `web/src/styles/components.css`, `web/src/pages/Home/Home.css`, `web/src/components/ArticlePage/ArticlePage.css`, `CaseStudyPage/CaseStudyPage.css`, `WorkDetails/WorkDetails.css`, `web/src/pages/Work/Work.css`, `web/src/components/ProjectRoster/ProjectRoster.css`.

#### R12 — Finish contrast and state consistency across both themes

- **Current state:** Tech tags were recently corrected to a solid dark green with light text. Shared Live and Completed status badges still use white on light green/blue. Project media frames remain dark while their bar text inherits the page's secondary text token.
- **Opportunity:** Remaining local colors undermine the otherwise improved token system. In light mode, the dark media frame can inherit dark bar/control text.
- **Proposed technique:** Use tested semantic foreground/background pairs for lifecycle badges and a dedicated media-frame palette or explicit dark color scope. Normalize multiword status keys instead of building raw class strings from display labels. Preserve status text so meaning never depends on color alone.
- **Why it fits / visible effect:** Small metadata becomes legible and consistent without altering the visual identity.
- **Classification:** foundational. **Complexity:** low. **Overdesign risk:** low.
- **Prerequisites:** Confirm computed foreground/background combinations in a browser; test focus, disabled states, high contrast, and forced colors. See section 9 for calculated source-color ratios.
- **Prototype first:** No; a rendered state sheet is sufficient validation.
- **Files:** `web/src/styles/components.css`, `web/src/components/ProjectMedia/ProjectMedia.css`, `web/src/pages/CaseStudies/CaseStudies.tsx`, `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`, `web/src/contexts/ThemeContext.tsx`.

### 7.8 Interaction and motion

#### R13 — Reserve motion for interaction and orientation

- **Current state:** Linked cards and passive content share lift/scale/sheen. Noninteractive tags and dates move. Section entrances stack delays. Journey flips can replace prose with a decorative image on pointer entry, though a button now also exists.
- **Opportunity:** Movement does not consistently identify an action or explain a state change. Matrix rain plus multiple foreground motions can compete with reading.
- **Proposed technique:** Separate passive and interactive surface styles; keep a small set of short hover/focus/disclosure transitions. Remove hover movement from labels and static narrative panels. Prefer explicit image toggles over automatic prose replacement in Journey. Test a quiet reading mode or static background on long articles, preserving the site's palette and optional atmosphere.
- **Why it fits / visible effect:** Visitors can predict what can be clicked and keep their place while reading. The remaining motion feels intentional.
- **Classification:** interaction. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Coordinate with R03 and R11; audit JS-driven motion separately from CSS. Preserve user pause settings and the existing frozen-frame reduced-motion background.
- **Prototype first:** A motion comparison for one linked card, one passive decision, and an article; no elaborate motion system needed.
- **Files:** `web/src/styles/components.css`, `web/src/pages/Home/sections/*`, `web/src/components/WorkDetails/WorkDetails.css`, `TimelineItem/TimelineItem.tsx`, `AppBackground/AppBackground.tsx`, `web/src/providers/AppProviders.tsx`.

### 7.9 Technical frontend modernization

R15–R19 in section 8 address content boundaries, themes, media, platform transitions, and metadata. Their aim is fewer coupled responsibilities and less unnecessary work, rather than a new stack.

### 7.10 Accessibility

#### R14 — Simplify controls where custom behavior adds no value

- **Current state:** The project filters implement a button combobox/listbox with active-descendant handling. Arrow keys are handled only while open; type-ahead and Home/End behavior are absent. Provenance already uses native `details`; roster details use React state plus Framer height animation and a CSS reveal. Modal implementations are split among shared dialogs, settings, and the technical coverage overlay.
- **Opportunity:** Small selection/disclosure tasks carry custom keyboard and focus obligations. Global focus selectors omit `summary`; native outlines may still appear, but the shared treatment is incomplete.
- **Proposed technique:** Prefer native `select` for simple category/status/sort choices unless a user test establishes a real custom requirement. Otherwise complete the select-only combobox behavior. Standardize focus-visible for summaries and any scrollable prose regions. Evaluate native `details` for independent roster expansion and native `dialog` for genuinely modal overlays, preserving deliberate nonmodal settings behavior. Eliminate duplicate disclosure animations rather than adding another library.
- **Why it fits / visible effect:** Familiar mobile pickers and dependable keyboard behavior improve operation while reducing bespoke code.
- **Classification:** technical modernization. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Follow the [WAI combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) if retaining a custom control. Validate focus return, selected option on open, Escape, close sequencing, body scroll, and nested dialogs. Native elements are a starting point, not an automatic accessibility pass.
- **Prototype first:** Interaction spike for filters and one dialog; roster migration is optional if it complicates R06's URL behavior.
- **Files:** `web/src/components/TerminalDropdown/TerminalDropdown.tsx`, `TerminalDropdown.css`, `web/src/pages/Projects/Projects.tsx`, `web/src/components/ProjectRoster/ProjectRosterItem.tsx`, `web/src/components/common/Modal.tsx`, `web/src/components/SettingsPanel/SettingsPanel.tsx`, `web/src/index.css`, `web/src/components/ArticlePage/ArticlePage.css`.

### 7.11 Performance

Prioritize R03's avoidable wait, R15's content boundaries, and R17's Journey image behavior. The Matrix canvas already stops for hidden documents and respects pause/reduced motion; profile it before replacing it. Do not label a Canvas 2D effect a WebGL problem or claim measured jank without a trace.

### 7.12 Content presentation

R05–R10 form one coherent content direction: purpose and scope in summaries; tradeoffs in case studies; specific support beside claims; deeper reasoning in writing; and accountable ownership in Experience. No general voice rewrite is proposed. New labels and relationships need editorial approval in a later implementation step, and private source material must not be used to fill public evidence gaps automatically.

## 8. Technical modernization opportunities

#### R15 — Separate lightweight metadata from article bodies and optional applications

- **Current state:** `App` imports route metadata and structured-data generation; both import full generated articles. Terminal is an eager route import through a barrel that also exports `VimUI`, whose module imports Prism and multiple language grammars. The inspected existing entry bundle contains article prose and Prism implementation code. The separate `VimCommand` file explicitly says that feature was removed, and the current Terminal overlay renderer does not render VimUI. Lazy page components therefore do not isolate all content or historical module side effects.
- **Opportunity:** A home visitor can pay parsing/transfer cost for essays and terminal capabilities they never open.
- **Proposed technique:** Generate a small article index for metadata, series, summaries, and JSON-LD; load article body/provenance by slug. Lazy-load Terminal and audit its barrel/side-effect imports so unreachable historical features do not enter the shared bundle. Isolate heavier active terminal overlays only where useful. Keep build-time shell generation able to read all bodies. Profile before and after using the same production conditions; preserve the current frontend stack.
- **Why it fits / visible effect:** The portfolio shell becomes lighter while deep writing and the terminal remain fully available.
- **Classification:** technical modernization. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Trace actual module relationships, generator outputs, CI drift checks, static shell imports, errors, and unknown-slug handling. Do not confuse chunk file size with bytes transferred to every visitor.
- **Prototype first:** A technical spike with a before/after bundle report; no visual prototype.
- **Files:** `web/scripts/build-articles.mjs`, `web/src/data/generated/articles.ts`, `web/src/data/routeMetadata.ts`, `structuredData.ts`, `web/src/pages/Article/Article.tsx`, `web/src/pages/Writing/Writing.tsx`, `web/src/routes/index.tsx`, `web/src/components/Terminal/*`, `web/vite.config.ts`, future CI/drift assertions.

#### R16 — Let CSS own theme palettes and consolidate small viewport/scroll responsibilities

- **Current state:** ThemeContext writes many CSS variables imperatively while `index.css` provides defaults and Projects adds global terminal theme tokens. LayoutContext directly reads/parses some stored preferences without the defensive access used by ThemeContext. Article TOC checks every heading on every scroll event; the global section rail already schedules work through animation frames.
- **Opportunity:** Theme values and event policies are duplicated. A denied or malformed stored preference can interfere with startup. Repeated geometry reads are a maintainability/performance concern, not a measured bottleneck yet.
- **Proposed technique:** Move palette maps to CSS keyed by `data-theme`; retain a small JS preference selector and safe storage access. Preserve intentional dark default and explicit light preference. Consolidate header/dock offset use and schedule TOC work once per frame or use a carefully configured observer. Use `light-dark()` only where it simplifies color pairs with appropriate fallback.
- **Why it fits / visible effect:** More consistent first paint and theme switching; fewer route-specific visual surprises. Most benefit is robustness rather than visible novelty.
- **Classification:** technical modernization. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Test pre-React shell, storage denial, invalid settings, direct light-mode loads, zoom, sticky offsets, and dock/header switching. System-theme following is a separate product choice, not an automatic change to the dark default.
- **Prototype first:** No visual prototype; inspect a small theme/state matrix.
- **Files:** `web/src/contexts/ThemeContext.tsx`, `LayoutContext.tsx`, `web/src/index.css`, `web/src/pages/Projects/Projects.css`, `web/index.html`, `web/src/components/ArticlePage/ArticlePage.tsx`, `web/src/components/Navigation/SiteNavigation.tsx`.

#### R17 — Make existing media explain more while loading proportionately

- **Current state:** Three project loops and stills are intentionally implemented. Images have dimensions and lazy decoding/loading; the component has an unused-by-current-callers eager option. Journey preloads each configured remote image with `new Image()` on mount, even though the later rendered image says `loading="lazy"`; several requested widths exceed 2000 px.
- **Opportunity:** Journey's eager preload defeats lazy-fetch intent. Detail recordings need visible explanation or a text alternative, not just a programmatic label. Pausing video stops playback but does not guarantee an already-started transfer stops.
- **Proposed technique:** Defer Journey image creation until near viewport or explicit request; request appropriate sizes and reserve image space. For project stills, add `srcset`/`sizes` only where multiple delivered sizes are useful; keep deliberate thumbnail crops. Give each recording a short visible explanation of what to notice and an equivalent textual sequence for meaningful video-only information. Prioritize a media asset only if measurement identifies it as above-fold/LCP content.
- **Why it fits / visible effect:** Screenshots and recordings become engineering evidence rather than texture, with fewer unnecessary image downloads.
- **Classification:** technical modernization. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Render actual image sizes, inspect low-bandwidth behavior and video duration/audio, and assess current external image rights/source choices before any local asset replacement. Preserve user pause and reduced motion. Guidance: [LCP optimization](https://web.dev/articles/optimize-lcp), [media preload behavior](https://web.dev/articles/fast-playback-with-preload).
- **Prototype first:** Small caption/still layout in P3; loading changes need runtime verification, not a design concept.
- **Files:** `web/src/components/TimelineItem/TimelineItem.tsx`, `TimelineItem.css`, `web/src/data/timelineData.ts`, `web/src/components/ProjectMedia/ProjectMedia.tsx`, `ProjectMedia.css`, `web/src/data/projects.ts`, `web/src/components/CaseStudyPage/CaseStudyPage.tsx`; related public media only with later authorization.

#### R18 — Treat native page transitions as a replaceable experiment

- **Current state:** Framer route wrappers, frozen outlets, loading timers, and section animation overlap. The app uses `BrowserRouter`, while the installed router's view-transition state support expects a data-router provider.
- **Opportunity:** A native transition might eventually reduce route-animation plumbing, but adding `viewTransition` to current links is not a demonstrated drop-in solution.
- **Proposed technique:** After R03, compare immediate navigation, a short fade, and a same-document View Transition between one case-study index item and its detail page. Feature-detect, disable decorative transitions under reduced motion, and preserve ordinary navigation without the API. Test a CSS scroll progress indicator separately; do not depend on it for content or section navigation.
- **Why it fits / visible effect:** A restrained connection between selected artifact and detail could improve orientation. It is acceptable for the experiment to conclude that immediate navigation is better.
- **Classification:** experimental. **Complexity:** high if router integration changes, medium for an isolated spike. **Overdesign risk:** high.
- **Prerequisites:** Current React Router integration review; no router migration solely to gain animation; verify focus, POP restoration, hash navigation, video/canvas snapshots, errors, and slow route loads. Reference: [React Router View Transitions](https://reactrouter.com/how-to/view-transitions).
- **Prototype first:** Yes, as a bounded interaction experiment after core fixes; not a required visual direction.
- **Files:** `web/src/components/Layout/Layout.tsx`, `web/src/providers/AppProviders.tsx`, `web/src/routes/index.tsx`, `web/src/pages/CaseStudies/CaseStudies.tsx`, `web/src/components/Layout/GlobalScrollProgress.tsx`, `GlobalScrollProgress.css`.

#### R19 — Make shared links identify the actual article or system

- **Current state:** Route-specific titles/descriptions, canonicals, sitemap entries, and JSON-LD are generated. All routes use the same logo OG image; `og:type` remains website. Article JSON-LD lacks an article-specific image.
- **Opportunity:** Shared links identify the site more strongly than the particular argument or system.
- **Proposed technique:** Add optional per-route social image/alt metadata; use a simple title, content kind, and one artifact or restrained diagram motif. Emit article-appropriate OG fields and accurate article metadata through both static shells and client updates. Add modified dates only when editorially maintained; do not use build time as article update time.
- **Why it fits / visible effect:** An essay or case-study link becomes recognizable before someone opens it. Existing semantic delivery remains intact.
- **Classification:** content presentation. **Complexity:** medium. **Overdesign risk:** low.
- **Prerequisites:** Approved public assets, static/client parity, image URLs/dimensions, and factual metadata. Structured data does not guarantee a search presentation. See [Open Graph](https://ogp.me/) and [Google Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article).
- **Prototype first:** Yes, one essay preview and one system preview; subordinate to the five larger prototypes below.
- **Files:** `web/src/data/routeMetadata.ts`, `structuredData.ts`, `web/src/App.tsx`, `web/index.html`, `web/vite.config.ts`, future public OG assets and smoke assertions.

## 9. Accessibility and performance findings

### Concrete accessibility findings

| Finding and confidence | Existing protection | Recommended resolution |
| --- | --- | --- |
| No standard-shell skip link or route focus policy found; navigation CTAs use buttons | Main landmark/ID, route titles, real header links | R01; test focus after delayed content, not just URL change |
| Header destinations become visually icon-led at common widths | Accessible names, titles, active label, focus tooltip | R02; readable touch navigation, measured target spacing |
| White Live badge on `#51cf66`: approximately 2.01:1; white Completed badge on `#74c0fc`: approximately 1.96:1 | Tech tags already improved to approximately 4.86:1 | R12; shared badge declarations fail normal-text contrast if those pairs are rendered |
| Light-theme secondary text `#4a4a4a` on media frame `#181818`: approximately 2.00:1 | Media controls have labels and focus outline | R12; inspect the computed light-theme bar/control pair |
| Multiword `Active development` becomes two CSS classes in shared badges; no matching shared multiword status modifier was found | Roster independently normalizes status names correctly | R12; reuse a consistent status-key mapping |
| Global focus selector omits `summary` | Native summary is keyboard-operable; browser default focus may remain | R14; provide deliberate focus styling rather than claiming no focus exists |
| Custom filter lacks parts of select-only keyboard behavior | Arrow/Enter/Escape/Tab support and active descendant exist | R14; native select or complete pattern, verified with assistive technology |
| Home motion values do not explicitly branch on reduced motion; the contact scroll uses JS smooth scrolling on desktop | Global CSS and MotionConfig, background/video/typewriter safeguards | R03/R13; test actual JS behavior, explicitly gate where needed |
| Headings skip levels in Case Studies index and Experience role headers | One page H1 and many semantic sections exist | R01/R11/R10; use logical H2 entries and H3 subgroups when those surfaces are revised |
| Meaningful recordings have an aria-label but no visible equivalent sequence | Manual play/pause, muted loops, reduced-motion handling | R17; provide equivalent information; assess media accessibility based on actual recording content |

The contrast values above were calculated from declared opaque sRGB color pairs, not sampled from rendered screenshots. [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) requires 4.5:1 for ordinary text, with a lower threshold for qualifying large text. Small badges do not qualify merely because they are bold. Blended surfaces, focus indicators, placeholders, and disabled states still need rendered inspection.

Do not label every control below 44 px a WCAG failure. WCAG 2.2's AA target-size criterion is 24 by 24 CSS px with defined exceptions/spacing provisions; larger targets remain a useful touch design aim. Current narrow navigation widths need measurement, while project actions already reach 44 px on small screens. [WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### Performance evidence

| Evidence | Interpretation and boundary |
| --- | --- |
| Existing `web/build/assets/index-BhLC21DV.js`: 708,497 bytes raw; local gzip estimate 220,187 bytes | Supporting snapshot, not verified HEAD output or observed transfer. Entry contains article prose and Prism |
| Existing animation vendor: 127,906 raw / 42,095 gzip-estimated bytes; UI vendor: 90,318 / 28,418; router: 42,911 / 15,167 | Build HTML module-preloads these; naming a chunk does not mean it is deferred |
| Generated article module: 317,623 source bytes | Shared imports pull article data into the application graph; does not mean this exact source size is transferred |
| Local loops occupy roughly 1–2 MiB each; stills/thumbnail files roughly 32–184 KiB by disk usage | Proportionate starting point. Three loops are not automatically fetched on every page; current lists use stills |
| `new Image()` in every mounted Journey item assigns the full remote URL | This starts requests independently of the later image's lazy attribute; a concrete loading opportunity |
| Default Matrix effect is Canvas 2D with DPR caps, hidden-document pause, static reduced-motion frame | Preserve existing optimizations; no measured justification for replacement with WebGL or a worker |
| Article TOC loops through heading geometry on each scroll event | Candidate for scheduled/observer work; not proof of visible jank |
| No font network dependency in the current system/Courier stacks | A custom font adds cost and needs a demonstrated visual gain |

**Potential layout shifts to measure:** fallback-to-React layout differences; asynchronously measured header height; article content arrival; and media aspect-ratio changes between poster and video. Project images already specify dimensions, and typewriter text exists in the DOM, so do not assume those are uncontrolled CLS sources.

### Existing tests and verification gaps

`web/scripts/smoke-test.mjs` reads generated HTML and JS artifacts. It protects meaningful content contracts: homepage positioning and featured links; route identity; canonicals; sitemap inclusion/exclusion; public repository provenance; exclusion of private projects from SoftwareSourceCode; roster framing and absence of old flagship/archive labels; article prose and provenance; TOC target IDs; series membership, contiguous ordering, and previous/next links. CI separately regenerates articles and checks for drift.

These are valuable content/metadata invariants. They are **not screenshot tests**, a screen-reader audit, a runtime focus test, a motion-preference test, or a performance budget. No tracked browser visual-regression suite was found. Do not rewrite these assertions merely to make a proposed design pass; preserve their meaning and intentionally revise only a changed product contract.

For a later approved implementation, use a bounded validation matrix:

- Desktop 1440 px, intermediate 1024/768 px, and 320/375/430 px widths; long titles, expanded project details, and both navigation modes.
- Both themes, reduced motion, forced colors, 200% text zoom, and reflow equivalent to a 320 CSS px viewport.
- Keyboard route changes, skip link, filter open/select/close, disclosures, modal close/focus return, TOC anchors, browser back/forward, and direct deep links.
- JS-disabled route shells, slow/cold arrival, cached navigation, missing article, and error fallback.
- Throttled production measurements for LCP/INP/CLS and main-thread work, with transfer accounting separated from raw/gzip file estimates.

No build/test command was run in this discovery: `npm test` builds and `prebuild` rewrites generated article data. Documentation validation is sufficient for the only change made here.

## 10. Horizon 1 / Horizon 2 / Horizon 3 roadmap

### Horizon 1 — High-confidence refinements

Start with comprehension and correctness that do not require a new visual direction:

1. **R12: residual contrast and status mapping.** Low effort, strong accessibility benefit, very low identity risk.
2. **R01 and R03: links, route orientation, and readiness.** Greater implementation care than their visual footprint suggests. They directly improve the first visit and repeated navigation. Preserve anti-flicker and scroll-restoration intent.
3. **Narrow R13/R11 refinements:** remove false hover affordances; scope the Work header collision; give summaries consistent focus treatment. These support recent design decisions rather than undoing them.
4. **R17's Journey loading fix and R15's measured content-splitting spike.** Good technical return; retain existing public behavior. Confirm the current production baseline before claiming performance improvement.
5. **Small R05 links/contact and R19 preview study.** Useful only when curated; avoid turning every page ending into a large conversion panel.

Exit condition: the existing site is faster to understand and operate, small text is legible in both themes, and no content/navigation invariants regress. A new visual identity is not an exit condition.

### Horizon 2 — Structural modernization

Build a coherent presentation around evidence:

1. Develop **R07** with evidence qualification separate from homepage curation. Aether may be the first implementation; Erebus and Arachne remain featured. Evidence preparation is the largest dependency; UI work cannot substitute for it.
2. Prototype **R04 homepage** with **R02 navigation** and **R05 relationships**. This has high visitor impact but moderate identity risk; retain the current composition as the control.
3. Develop **R08 static architecture and contextual anchors** alongside R07. Static explanation has better initial effort/benefit than interactive replay.
4. Refine **R09 writing** and **R10 ownership timeline** using shared **R11** type/surface roles. Keep authorial voice and existing series/provenance contracts.
5. Adopt **R06 metadata/shareability**, **R14 native control simplification**, **R15 data boundaries**, and **R16 theme/event cleanup** in small independent units. Do not couple every refactor to a homepage redesign.

Exit condition: visitors can connect the site's major themes, find an inspectable artifact behind an important claim, understand ownership, and enter the writing at an appropriate point. The project roster remains a roster.

### Horizon 3 — Experiments

- **Interactive extension of R08:** compare a short state/replay walkthrough with a static figure. Adopt only if visitors understand the behavior better and the mobile/text alternative remains complete.
- **R18 native route transition:** compare against immediate navigation after artificial waits are removed. Reject if it increases complexity without improving orientation.
- **R11 variable-font variant:** compare the system-font baseline after hierarchy is fixed. Adopt only if the improvement survives actual devices and its loading cost is justified.
- **R13 quiet reading/background variant:** compare lower motion/static atmosphere on articles with the existing scrim. Preserve user control; do not silently equate dark mode with perpetual animation.

These are bounded hypotheses, not a backlog that must all ship. Command search, immersive system maps, site-wide content virtualization, and a new framework remain outside the roadmap until an actual visitor or maintenance need emerges.

## 11. Prototype candidates

### P1 — Homepage as a concise engineering introduction

- **Target:** Hero, Featured Systems, writing entry, and responsive primary navigation.
- **Change:** Compare existing centered composition with copy/artifact asymmetry, a quieter proof line, clearly labeled writing access, and a readable compact menu.
- **Question:** Can a first-time visitor identify both systems implementation and operational/AI judgment without additional hero copy?
- **Success:** After a brief look, participants can state the engineering focus, identify one system, and choose the right route for proof, writing, or professional experience. At 320–430 px the reading order and actions remain obvious.
- **Must remain:** Name and positioning voice; Erebus and Arachne as the featured systems; Case Studies as a clear action; access to all current routes; contact; Matrix identity; optional wordless pills; honest evidence availability. Evidence qualification remains independent of homepage curation. No new copy claims or automatic promotion of a project.

### P2 — The roster as a shareable technical index

- **Target:** ProjectRoster and filter/action row.
- **Change:** Keep one column; compare existing actions with stronger case-study affordance, a restrained evidence/ownership line, visible filter/reset state, and a stable selected-project address.
- **Question:** Does richer metadata improve choice, or simply make seven rows noisier?
- **Success:** A visitor distinguishes active development, public code, and available case studies without opening every row; keyboard disclosure works; a shared project address returns to the intended row. No increase in scanning effort for someone who just wants the complete list.
- **Must remain:** All seven projects, short/full description distinction, full tech/highlight/feature content, code destinations on their actual accounts, lifecycle accuracy, current filters/sorts, and no complexity ratings.

### P3 — One claim, one architecture view, one evidence path

- **Target:** One case-study segment with approved supporting artifacts. Aether may serve as the first evidence-linked implementation; this choice does not confer homepage flagship status.
- **Change:** A compact architecture figure, an explicit decision/tradeoff block, nearby supporting artifact, a visibly qualified outcome, and labeled section navigation. Compare a static flow with an optional stepped sequence.
- **Question:** Can a reader explain why the boundary exists and determine what the evidence actually establishes?
- **Success:** Readers can identify producer/state/consumer boundaries, name one tradeoff, locate its support, and distinguish demonstration from measurement. The diagram works as text and at mobile width. Interaction adds understanding or is dropped.
- **Must remain:** Existing problem/constraint/decision/outcome substance, public/private distinctions, unavailable links, current recordings with pause/reduced-motion behavior, and no private operational details.

### P4 — Writing as an intentional publication

- **Target:** Writing index and ArticlePage for a long Agent Systems essay plus the unsectioned latest essay.
- **Change:** A visible series grouping, editorial list option, refined title/deck/meta hierarchy, stable reading surface, accessible diagram/reference treatment, and curated related-system links. Include print and quiet-background variants.
- **Question:** Does the presentation make sustained reading and series entry easier while preserving technical/editorial character?
- **Success:** Readers find Part 1 and the next part, navigate sections, inspect sources/checked claims, and return to the argument. Tables/code remain usable at narrow widths, and the unsectioned essay looks intentional without a TOC.
- **Must remain:** Article voice and complete prose, publication dates, series ordering, generator-owned anchors, provenance disclosures, selectable text, no-JS availability, and author/source qualification boundaries.

### P5 — Experience as a record of systems ownership

- **Target:** Current consulting entry plus one earlier role.
- **Change:** Scope first, interventions next, outcomes/limits nearby, tools quieter; a modest visual line expresses progression without large résumé cards.
- **Question:** Can a visitor understand the responsibility and complexity of the work before reading every bullet?
- **Success:** Readers accurately describe one modernization intervention, the scope Kareem owned, and progression from prior work without inferring unsupported management rank or solo delivery.
- **Must remain:** Companies, dates, roles, public-safe facts, all meaningful current content, contact links, and a distinct Journey route. No unapproved client evidence or invented impact metrics.

## 12. Ideas explicitly rejected and why

- **Wholesale redesign or generic startup landing page:** the site already has a coherent identity and recently improved hierarchy; changing the genre would weaken it.
- **Site-wide bento grid or a return to project cards:** contradicts the deliberate roster decision and makes comparisons less direct.
- **Self-assigned complexity, skill meters, or evidence scores:** these replace inspectable claims with author-assigned authority. Complexity removal is already shipped and tested.
- **Cinematic scroll, pinned storytelling, cursor effects, magnetic controls, and animated text everywhere:** they add effort to accessing ordinary documents and compete with the ambient background.
- **Autoplay previews on every roster/index item:** existing poster-first list behavior is appropriate; videos belong where their behavior can be explained.
- **A navigable 3D portfolio map:** high accessibility, performance, and maintenance cost for relationships better expressed with links and a small static diagram.
- **Command palette as primary navigation:** hidden invocation cannot fix visible information architecture, and the terminal already supplies optional command-driven exploration.
- **Automatic light-mode default:** dark is an explicit product default. Improving light-mode quality is supported; changing first-visit preference policy remains a product decision.
- **A framework migration, React upgrade, or CSS framework as the design project:** no evidence these are prerequisites; current bundle coupling and duplicated presentation policies can be addressed locally.
- **Syntax highlighting every article fence:** the writing design deliberately avoided it for ASCII/text diagrams. The terminal's Prism dependency does not justify expanding its runtime scope.
- **Forced article TOCs, footnotes, or headings everywhere:** apply structure when the writing needs it; preserve the latest unsectioned essay and simple references when sufficient.
- **Invented quantitative outcomes or public client artifacts:** presentation cannot manufacture evidence or publication permission.
- **RSS/CMS/tags/search as an automatic modernization package:** the old writing design said to revisit distribution/taxonomy at five articles, and there are now seven; that warrants an audience decision, not automatic adoption. A small generated feed may later be useful if repeat readership is a goal. A CMS is still unjustified.
- **Stock photography as the main technical credibility signal:** Journey can retain personal atmosphere, but system artifacts explain the professional work more directly.
- **Reviving the old browser “Productivity OS” roadmap:** `web/docs/FUTURE_PLANS.md` reflects an older ambition; current public positioning and recent commits prioritize a portfolio and publication. It is history, not this task's mandate.

## 13. Open questions / unresolved design decisions

1. **Which audience gets the first path?** Hiring engineers, consulting buyers, peers reading systems essays, or some ordered combination? The inferred primary audience is a technical evaluator; validate before choosing the homepage lead artifact.
2. **How explicit should AI/governance positioning become?** Existing projects and writing support stronger discovery. They do not automatically support a new professional title or additional implementation claims.
3. **How much visible navigation should the exploration layer occupy?** Reconcile the older Simulations-demotion instruction with the recent deliberate blue pill and current full navigation.
4. **Should wordless pills remain intentionally cryptic?** They can stay so if explicit Writing/Simulations entry points do the navigation work. Do not erase the deliberate metaphor without testing that alternative.
5. **Which evidence can be made publicly inspectable?** Claim-linking is high value only when the artifacts exist and are publishable. Recordings, repository snapshots, and measured reports answer different questions.
6. **Should reading surfaces automatically quiet the background, or expose a reading preference?** Test sustained reading and retain reduced-motion/user pause behavior either way.
7. **Is a new font worth a network request?** Improve hierarchy with current fonts first. No specific font purchase or dependency is proposed.
8. **Does writing need repeat-reader distribution?** Seven articles exceed the original design's revisit threshold; RSS or a simple series landing page should follow reader demand and publication cadence.
9. **How literal is the current single-column roster contract?** The strong recommendation is to preserve it; metadata density, primary actions, and URL state can evolve within that contract.
10. **What do real visitors struggle with?** No analytics, user interviews, or field performance measurements were used. Timed comprehension and focused usability checks should decide among the prototypes.

## 14. Appendix: inspection and references

### A. Repository files/components inspected

Inspection ranged from full component reads to targeted searches/samples; this list does not imply every line of every large document was read.

| Area | Files/paths inspected |
| --- | --- |
| Instructions and app entry | `AGENTS.md`, `README.md`, `web/package.json`, `web/src/index.tsx`, `App.tsx`, `App.css`, `providers/AppProviders.tsx` |
| Routing/SEO/delivery | `web/src/routes/index.tsx`, `web/src/data/navigation.ts`, `routeMetadata.ts`, `structuredData.ts`, `web/vite.config.ts`, `web/index.html`, `web/public/sitemap.xml`, `.github/workflows/web-ci.yml` |
| Layout/navigation | `web/src/components/Layout/Layout.tsx`, `Layout.css`, `GlobalSectionNavigation.tsx`, `GlobalSectionNavigation.css`, `GlobalScrollProgress.tsx`; `Navigation/SiteNavigation.tsx`, `SiteNavigation.css`, `HeaderNavigation.tsx`, `NavItem.tsx`; `MainContent/MainContent.tsx` |
| Theme/settings/background | `web/src/contexts/ThemeContext.tsx`, `NavigationModeContext.tsx`, `LayoutContext.tsx`; `components/SettingsPanel/SettingsPanel.tsx`, `AppBackground/AppBackground.tsx`, `MatrixRain3DBackground/MatrixRain3DBackground.tsx`; targeted searches of `MatrixBackground` and `BionicBackground` |
| Home | `web/src/pages/Home/Home.tsx`, `Home.css`; `sections/HeroSection.tsx`, `HeroSection.css`, `FeaturedProjectsSection.tsx`, `CapabilitiesSection.tsx`, `ContactStripSection.tsx`, `ExplorationChoiceSection.tsx`; `web/src/data/siteContent.ts` |
| Projects/media | `web/src/pages/Projects/Projects.tsx`, `Projects.css`, `useProjects.ts`; `components/ProjectRoster/ProjectRoster.tsx`, `ProjectRosterItem.tsx`, `ProjectRoster.css`; `components/ProjectMedia/ProjectMedia.tsx`, `ProjectMedia.css`; `web/src/data/projects.ts`; public media file sizes and visual inspection of `erebus-card.webp`, `arachne-card.webp` |
| Case studies | `web/src/pages/CaseStudies/CaseStudies.tsx`, `web/src/components/CaseStudyPage/CaseStudyPage.tsx`, `CaseStudyPage.css`, `web/src/data/caseStudies.ts` |
| Writing | `web/src/pages/Writing/Writing.tsx`, `Writing.css`; `components/ArticlePage/ArticlePage.tsx`, `ArticlePage.css`; generated article module size/content relationships; `web/scripts/build-articles.mjs`; heading/frontmatter inventory across all seven Markdown articles; substantive samples of the latest essay, Centaur essay, and Work essay provenance |
| Experience/Journey | `web/src/pages/Work/Work.tsx`, `Work.css`, `components/WorkDetails/WorkDetails.tsx`, `WorkDetails.css`, `WorkList/WorkList.tsx`, `web/src/data/workExperience.ts`; `pages/Journey/Journey.tsx`, `data/timelineData.ts`, `components/TimelineItem/TimelineItem.tsx` |
| Simulations/terminal | `web/src/pages/Simulations/Simulations.tsx`, `data/simulationsData.ts`; import/interaction searches in `components/Terminal/Terminal.tsx`, `TerminalView.tsx`, `TerminalOverlays.tsx`, `TerminalWindow.tsx`, `VimUI.tsx`, `index.ts`, `commands/VimCommand.ts`, `hooks/useTerminalCore.ts`, `hooks/useTerminal.ts` |
| Shared controls/style | `web/src/index.css`, `styles/components.css`, `components/TerminalDropdown/TerminalDropdown.tsx`, `TerminalDropdown.css`, `components/TypeWriterText/TypeWriterText.tsx`, `components/common/Modal.tsx`, `utils/lazyWithMinTime.ts` |
| Tests/build artifacts | `web/scripts/smoke-test.mjs`; existing `web/build/index.html` and JS file sizes/content checks; installed React Router view-transition implementation search |
| Design history/docs | `docs/evidence-linked-case-studies-spec.md`, `docs/writing-surface-design.md`, `docs/writing-surface-implementation-plan.md`, `docs/dev-topology.md`, `web/docs/UX_LOADING_IMPROVEMENTS.md`, `web/docs/ARCHITECTURAL_IMPROVEMENTS.md`, `web/docs/FUTURE_PLANS.md`; file inventory for tests and audits |

`website-audit-report.md` is mentioned by AGENTS.md but was not present in the inspected tracked-file inventory. No claim in this report relies on reading that absent historical file. Private source files were not inspected or copied. Infrastructure topology was read only to understand a possible existing preview; no infrastructure commands were executed.

### B. Git evidence used

| Commit | Why it matters |
| --- | --- |
| `2c71084` | Intentional seven-project single-column roster; removes flagship split/complexity and updates shell/testing contracts |
| `362a1f2` | Semantic homepage shell is intentional |
| `b75429e` | Document scrolling restored so sticky elements work; avoid reintroducing nested scroll containers |
| `fb3dd3b`, `3d92d01` | Article series navigation and feed-block ordering are deliberate |
| `a7c5767` | Red/blue exploration pills intentionally have no visible words |
| `9b7caef` | Recent UX/accessibility and dock-setting reconciliation; do not mistake all controls for untouched legacy work |
| `8393238`, `d2f72a8`, `5ff63f1` | Hero fold sizing, balanced text, and Contact demotion already addressed specific presentation problems |
| `151de0c`, `279291d`, `bd3bae9`, `b102cee` | Edgeless scrims and clipping fixes are deliberate, ongoing refinement |
| `67bf37e`, `37ece7b` | How I Work moved from cards to an aligned numbered list |
| `23f48fa`, `4e631f7` | Tech-tag contrast and correct high-contrast media query already improved |
| `b0b6b69` | Outer case-study boxes removed intentionally |
| `b06a723`, `df72a2c`, `9290739`, `319e39e`, `9189e81` | Project media, crops, and full-width recordings are recent additions, not missing capabilities |
| `52293ca` | Forward-navigation scroll reset is recent and must survive loading changes |
| `1a4a117` | Writing index spacing was just refined; prototype against current spacing rather than stale assumptions |

Recent history was examined with `git log -25/-65 --oneline` and targeted `git show` metadata/stat reads. Older docs were treated as evidence of intent at the time, not automatic descriptions of current behavior.

### C. External references used

Primary sources were used for platform and accessibility claims. Links are repeated here for convenience; recommendations cite the relevant source where the claim is made.

| Reference | Use |
| --- | --- |
| [web.dev: same-document View Transitions milestone](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available) | October 2025 support boundary for the core feature |
| [Chrome: View Transitions in 2025](https://developer.chrome.com/blog/view-transitions-in-2025) | Research context; newer extensions not assumed necessary |
| [React Router: View Transitions](https://reactrouter.com/how-to/view-transitions), [Link API](https://reactrouter.com/api/components/Link) | Router-facing transition options, checked against installed integration |
| [MDN: container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) | Component-relative layout and fallback principles |
| [MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) | Limited-availability boundary for CSS scroll timelines |
| [MDN: light-dark](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark) | Theme color simplification; color support distinct from newer variations |
| [MDN: dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | Native modal semantics and baseline maturity |
| [MDN: text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap), [variable fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts/Variable_fonts) | Typography options, not a font-change mandate |
| [MDN: content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) | Rendering optimization considered and deferred |
| [WAI: combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | Custom control obligations |
| [WCAG: contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Interpretation of concrete accessibility findings |
| [web.dev: optimize LCP](https://web.dev/articles/optimize-lcp), [media preload](https://web.dev/articles/fast-playback-with-preload) | Asset priority and media loading principles |
| [Open Graph protocol](https://ogp.me/), [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) | Content-specific sharing/metadata opportunities |
| [Julia Evans](https://jvns.ca/), [Simon Willison](https://simonwillison.net/), [Maggie Appleton](https://maggieappleton.com/), [Paco Coursey](https://paco.me/) | Technical writing, artifact connections, concise identity |
| [Brittany Chiang](https://brittanychiang.com/), [Fly.io blog](https://fly.io/blog/), [Dan Luu](https://danluu.com/), [Karl Sims](https://www.karlsims.com/) | Ownership presentation, implementation narratives, direct archives, connected simulations/research |
| [StaffEng stories index](https://staffeng.com/stories/) | Background comparison of professional-story framing; individual stories were not audited |

An attempted retrieval of Daniel Wirtz's site returned an error and supports no conclusions here. Search results, third-party trend lists, and inaccessible sites were not treated as evidence of visual quality or browser support.

### D. Work performed and validation

- Read-only commands: `git status --short`, `git log`, targeted `git show`, `git ls-files`, `rg`/`rg --files`, `cat`, `sed`, `ls`, `du`, `wc`; Python standard-library reads for file-size/gzip estimates, content presence, heading counts, and sRGB contrast calculations.
- One socket-listing attempt was unavailable under sandbox permissions; no service was started, restarted, or changed.
- Browser inspection was attempted but unavailable; the existing in-app browser inventory was empty. Local media thumbnails were inspected with the image viewer. External research used public web retrieval.
- The initial discovery wrote only this requested Markdown document. The subsequent user-directed clarification updated this report and added a scoped supersession note to `docs/evidence-linked-case-studies-spec.md`, preserving its historical text. No implementation, publication, or validation status was advanced. No `npm install`, build, generated-content command, application test, branch creation, commit, push, or deploy was performed.
- Documentation checks: `git diff --check` and a final working-tree status review; document structure and local file references were checked separately because a new untracked file is not included in a normal tracked diff.
- Remaining manual review: rendered prototypes, responsive interaction/accessibility validation, actual production performance, and the explicit product questions in section 13.
- Suggested future documentation commit message: `docs(design): document modernization discovery and separate curation from evidence`.
