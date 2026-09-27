# Navigation hierarchy prototype (R02)

Date: 2026-09-26. Repository HEAD: `fe4421d`. Source: R02 in `docs/design/personal-website-modernization-discovery.md`.

Status: **prototype evaluation only.** This is not an approved product decision. No production code, CSS, tests, navigation data, dependencies, or the discovery report were changed.

> **Decision note, 2026-09-27 (added after the evaluation; supersedes the status line above).**
>
> The evaluation below was conducted on 2026-09-26 and committed in `480a54c`. It was written before any approval, and its wording is preserved as it stood at that checkpoint.
>
> - **Approval.** On 2026-09-27 the owner approved this prototype's Variant C responsive strategy (section 12) as the direction for R02.
> - **Superseded wording.** "Not an approved product decision" above, and "None of this is a product decision until validated" in section 12, describe the evaluation as it stood when written. The 2026-09-27 approval supersedes both.
> - **Phone head-to-head.** The real-device A-phone vs C-menu comparison proposed in section 12 is no longer a decision gate for choosing the navigation strategy.
> - **Phones at normal text size.** The approved direction is labeled core navigation (A's phone layout), not icon-only navigation.
> - **Enlarged or constrained text.** A clearly labeled `Menu` fallback remains acceptable when the labeled core set cannot fit safely.
> - **Remaining checks are implementation verification.** Section 13 lists them: real devices, other browsers, screen readers, text sizing (including the unverified `em` trigger), reduced motion, header integration, light theme, and dock behavior. These checks may reveal implementation defects or require responsive adjustments. They do not by themselves reopen the approved Variant C direction.
> - **Dock below 430 px.** The current Dock remains unapproved below 430 px until it is phone-safe. This settles the owner decision left open in section 8 for narrow phones.

Prototype: `docs/design/prototypes/navigation/index.html` is a self-contained static page. It lives outside the Vite root (`web/`) and nothing imports it. To run it:

```sh
python3 -m http.server -b 127.0.0.1 -d docs/design/prototypes/navigation 8790
# http://127.0.0.1:8790/?v=a&route=/terminal&dock=stack
#   v=current|a|b|c   route=<any site path>   dock=none|flat|sep|stack   desc=0|1
```

## Evidence labels

- **[prod]**: measured in Chromium through Playwright against the local Vite dev server (`npm run dev`-equivalent, port 5199) at HEAD. These are dev-server results, not the deployed site.
- **[proto]**: measured in the same browser against the prototype file. The prototype copies the production tokens and header geometry but is still a mock. Its "current" control is a reimplementation: its header heights differ from production by up to 12 px. Current-state claims therefore use [prod] numbers.
- **[code]**: read directly from source.
- **[arith]**: computed from CSS values rather than rendered.
- **[inference]**: design judgment, not measurement.

Browser availability: the discovery report said Playwright was unavailable during discovery. In this session Playwright/Chromium worked. Only Chromium was exercised. Firefox, Safari/WebKit, real touch devices, and screen readers were **not** tested.

Screenshots were written to the session scratchpad and are not committed. The measurement scripts can regenerate them against the prototype.

---

## 1. Current navigation behavior

### Header (default mode)

- **Default mode.** `NavigationModeContext.tsx` sets `DEFAULT_NAV_MODE = "header"`. Dock is an opt-in setting persisted in `localStorage` under `web-nav-mode`. [code]
- **Destinations.** `HeaderNavigation.tsx` renders the brand (`NavLink` to `/`, `aria-label="Kareem Sasa home"`), then eight `NavLink`s from `navItems` in this order: Home, Projects, Case Studies, Writing, Experience, Terminal, Journey, Simulations. A Settings button follows. [code]
- **Responsive rules** (`SiteNavigation.css`) [code]:
  - At 1180 px and below, inactive labels are hidden. Only the active link keeps its label, and the rest show a tooltip on hover or focus.
  - At 960 px and below, the nav wraps to its own row.
  - At 768 px and below, the header becomes `position: fixed` and the links share the row as `flex: 1 1 0`.
  - At 640 px and below, the brand name is hidden.
  - A trailing rule, `.site-header__nav { overflow: visible; }`, overrides the earlier `overflow-x: auto`, so all eight items must fit in one row.
- **Measured states** [prod], on `/writing`:

| Viewport | Header height | Visible text labels | Narrowest link |
|---|---|---|---|
| 1440 | 64 px | 8 of 8 | 90 px |
| 1024 | 64 px | 1 of 8 (active only) | 42 px |
| 768 | 112 px | 1 of 8 | 69 px |
| 430 | 103 px | 1 of 8 | 39 px |
| 375 | 94 px | 1 of 8 | 32 px |
| 320 | 94 px | 1 of 8 | **24 px** |

- **200% text** [prod]. Simulated by injecting `html { font-size: 200% }`, which approximates a larger default font size but not page zoom.
  - At 1440 px, the header stays one 128 px row and Home, Journey, and Simulations are pushed off-screen, because nothing wraps above 960 px.
  - At 320 px, the header is 186 px tall (36% of a 568 px viewport) with nothing off-screen.
- **Current-state semantics** [prod]:
  - `/case-studies/erebus` gives Case Studies `aria-current="page"`, and `/simulations/snake` does the same for Simulations. NavLink uses prefix matching.
  - `/` gives **two** elements `aria-current="page"`: the brand and Home.
  - `/work`, a supported alias of `/experience`, marks **no** navigation item as current.

### Dock (opt-in mode)

- **Structure.** `Dock.tsx` renders `role="toolbar"` with `aria-label="Application Dock"`. It holds one `DockIcon` per `navItems` entry plus Settings. Magnification is disabled at 768 px and below and under reduced motion. Icons are capped at 36 px on mobile. [code]
- **No accessible names.** The dock's navigation links have no accessible name. The Chromium accessibility snapshot shows eight unnamed `link` nodes; only `button "Open settings"` is named. [prod] `DockIcon.tsx` gives the `NavLink` no `aria-label`, `title`, or text. Font Awesome marks unlabeled SVGs `aria-hidden` (`fontawesome-svg-core/index.mjs:2180`). The visual tooltip appears only on mouse hover and is `display: none` at 768 px and below. [code] **This defect exists independently of R02.**
- **Narrow widths** [prod]:
  - At 375 px, the Home link starts at x = −6, so it is partly off-screen.
  - At 320 px, Home spans x = −33…3 and Settings spans x = 303…339 in a 320 px viewport. Both are effectively unreachable.
  - The container is capped at `max-width: 90vw`, but its fixed-size icons overflow it. [code]
- **Simulation child routes.** On `/simulations/*` the dock collapses to Simulations plus Settings. [prod] The header does not collapse. Rhythm Lab bypasses `Layout` entirely. [code]

### Homepage exploration pills

`ExplorationChoiceSection.tsx` renders `<nav aria-label="Keep exploring">` with two wordless `Link`s. The red pill goes to `/writing` ("Read the writing") and the blue pill goes to `/simulations` ("Explore simulations"). The names come from `aria-label` and `title`. [code]

### Existing hint of a four-item core

The static homepage route shell in `web/vite.config.ts` (`homeDestinationPaths`) already lists exactly Projects, Case Studies, Writing, and Experience as the homepage's primary destinations. [code] The proposed core set therefore matches a grouping the codebase already uses.

## 2. Problem being tested

Question: does splitting eight equal destinations into a core layer and an exploration layer improve comprehension, professional hierarchy, and small-screen behavior, without making Terminal, Journey, and Simulations feel deprecated?

- **Core:** Case Studies, Projects, Writing, Experience. Home moves to the brand.
- **Exploration:** Terminal, Journey, Simulations.

The measured current problem is concentrated **between 320 and 1180 px**. There, seven of eight destinations are icon-only, and targets shrink to 24 px wide at 320 px. At 1440 px the current header is fully labeled and one row. Its problem there is flatness (no priority), not legibility. [prod]

Prototype choices, not decisions:

- **Core order.** The core order follows the task brief (Case Studies first). The current data order starts with Projects, and so does the shell's `homeDestinationPaths`.
- **Labels.** Labels in the prototype are text-only (no icons).
- **Descriptors.** The Explore panels show one-line descriptors, such as "Browse the site from a command line". These are **placeholder copy**, not approved site copy. Toggle them with `desc=0`.

## 3. Variant A: secondary Explore disclosure

**Structure.** The brand links to Home. Four core links follow, then an `Explore ▾` button that discloses a list of three links. Settings stays at the end.

- **Semantics.** `<button aria-expanded aria-controls>` plus a plain `<ul>` of links (the APG disclosure-navigation pattern). It is **not** `role="menu"`.
- **Current route.** When the route is exploratory, the button takes the active style and, above 640 px, reads `Explore: Terminal`. The matching panel link carries `aria-current="page"`.

Measured [proto], default text:

| Viewport | Header | Labeled controls | Icon-only | Notes |
|---|---|---|---|---|
| 1440 | 64 px | 5 of 5 | 0 | Single row |
| 1024 | 64 px | 5 of 5 | 0 | Single row |
| 768 | 108 px | 5 of 5 | 0 | Wraps because of a 900 px prototype breakpoint; C shows one row fits down to 641 px |
| 430 / 375 | 106 px | 5 of 5 | 0 | Explore sits in the brand row; core row below |
| 320 | 106 px | 5 of 5 | 0 | Core fits in one row only at 0.74 rem with 0.2 rem side padding |

- **200% text** [proto]:
  - 1440 px: one row, 128 px, nothing off-screen.
  - 375 px: 479 px tall (74% of the viewport).
  - 320 px: 467 px tall (85% of the viewport).
  - The fixed header becomes unusable once the core row wraps under enlarged text.
- **Keyboard** [proto, Chromium]:
  - Tab order: brand → Case Studies → Projects → Writing → Experience → Explore.
  - Enter or Space toggles the panel.
  - Tab moves into the three links.
  - Escape closes the panel and returns focus to the button.
  - Tabbing past the last link closes the panel and moves on to Settings.
  - Shift+Tab returns to the button.
- **Pointer** [proto]: a click toggles the panel and a pointer-down outside closes it. On `/simulations/snake` the button shows the active style and Simulations is `aria-current` in the panel.
- **Back/forward** [proto]: after navigating from the panel, Back returns to the prior URL with the panel closed. The prototype uses full page loads; production would need to close the panel on location change.
- **Known issue** [inference]: in the phone layout, Explore visually sits in the top row but comes after the core links in DOM and focus order. Moving it to the end of the core row would restore visual/focus parity but costs width at 320 px.

## 4. Variant B: explicit two-group navigation

**Structure.** All seven destinations stay visible. Core links use the existing type style. A vertical rule and a small mono `EXPLORE` label introduce the exploration group, whose links are in mono at 0.82 rem in the secondary color. Semantics: two `<ul>` inside one `<nav>`, with the second list labelled by the visible heading via `aria-labelledby`.

Measured [proto], default text:

| Viewport | Header | Share of viewport height | Notes |
|---|---|---|---|
| 1440 | 64 px | 8% | One row; clearly two tiers (screenshot reviewed) |
| 1024 | 106 px | 15% | Groups wrap to a second row |
| 768 | 154 px | 16% | Three rows (brand, core, explore) |
| 430 / 375 | 153 px | 17% / 24% | Three rows |
| 320 | 218 px | **40%** of 568 px | Core wraps to 2 rows plus the explore row |

- **200% text** [proto]:
  - 1440 px: Terminal, Journey, and Simulations are off-screen.
  - 375 px: 599 px tall (92% of the viewport).
  - 320 px: 676 px tall, which is taller than the viewport.
- **Page zoom** [proto]: 1440 px at 200% zoom (720 CSS px) gives 154 px (37%). 1280 px at 400% zoom (320 × 256 CSS px) gives 218 px (88%).
- **Discovery.** B gives the best discoverability; nothing is hidden. Hierarchy comes from typography and grouping. [inference]
- **Cost.** B is the most expensive variant in vertical space everywhere below 1181 px.

## 5. Variant C: width-adaptive grouping (derived from the existing breakpoints)

**Rationale.** The current CSS already has distinct regimes at 1180, 960, 768, and 640 px, and the codebase already treats the four core pages as a set (section 1). C gives each width band the presentation the measurements favor instead of forcing one mechanic everywhere:

- **1181 px and wider:** B, with all seven labeled and grouped. There is room, so nothing is hidden.
- **641–1180 px:** A, with core links plus the `Explore` disclosure in one row.
- **640 px and narrower:** a single row with the brand, a mono location readout (`~/writing`, `aria-hidden`), a `Menu ▾` disclosure, and Settings. The menu lists **Work**: Case Studies, Projects, Writing, Experience, then **Explore**: Terminal, Journey, Simulations. Every item is labeled, and targets are 44–58 px tall.

Measured [proto], default text:

| Viewport | Header | Labeled controls visible without opening anything |
|---|---|---|
| 1440 | 64 px | 7 destinations |
| 1024 / 768 / 641 | 64 px | 4 core + Explore |
| 430 / 375 / 320 | 58 px (7–12% of viewport) | Menu only |

- **200% text** [proto]:
  - 320 and 375 px: 165 px (27–32% of the viewport), with the row wrapping and nothing off-screen. This required a fix: the first build pushed Menu and Settings off-screen until the phone row was allowed to wrap.
  - 1440 px: shares B's overflow of the exploration group.
- **Page zoom** [proto]: 720 CSS px gives 64 px (17%). 320 × 256 gives 58 px (26%).
- **Open menu** [proto]: at 320 px the menu bottom is at 499 px in a 568 px viewport. It is capped at `100dvh − 5rem` and scrolls internally.

**Phone sub-option.** At phone widths C could instead use A's phone layout (core row visible). That sub-option is identical to `?v=a` below 641 px. The phone decision is therefore a direct A-vs-Menu comparison (section 7).

**Ideas considered and rejected**:

- Path-style exploration labels (`~/terminal`). They rewrite labels for flavor.
- A command palette. The discovery report already rejects it as primary navigation.
- Horizontal scrolling of the nav row. It hides destinations without signalling them.

## 6. Desktop comparison (1440 and 1024)

| | Current | A | B | C |
|---|---|---|---|---|
| 1440: destinations readable without interaction | 8 (flat) | 4 + Explore | 7 (two tiers) | 7 (two tiers) |
| 1440: hierarchy legible | No | Yes | Yes | Yes |
| 1024: icon-only destinations | 7 | 0 | 0 | 0 |
| 1024: header height | 64 | 64 | 106 | 64 |
| Header tab stops, closed state | 10 | 7 | 9 | 9 at 1440, 7 at 1024 |
| 200% text at 1440: off-screen items | 3 (prod) | 0 | 3 | 3 |

[prod]/[proto] as labeled in sections 1–5. The one clear desktop failure of A is that exploration pages cost one extra click at widths where they would fit visibly. B and C at 1440 need a content-based overflow fallback, meaning wrap or collapse when labels don't fit rather than a viewport breakpoint. Without it, enlarged text breaks them.

## 7. Mobile comparison (430, 375, 320)

| | Current [prod] | A [proto] | B [proto] | C-menu [proto] |
|---|---|---|---|---|
| Header height at 375 / 320 | 94 / 94 | 106 / 106 | 153 / 218 | 58 / 58 |
| Core destinations visible without a tap | Icons only (plus active label) | Yes, labeled | Yes, labeled | No (one tap) |
| Exploration visible without a tap | Icons only | No (one tap) | Yes, labeled | No (one tap) |
| Narrowest target | 24 px | 38 px | 38 px | 38 px |
| 200% text, 320 px, header share of viewport height | 36% | 85% | >100% | 32% |

Reading [inference]:

- **A** is the best default-text phone layout if core destinations must be visible immediately. It replaces seven unexplained icons with four words and a labeled button at the same height as today. It is fragile under enlarged text.
- **B** is not viable below about 430 px. At 320 px it takes 40% of the viewport height at default text.
- **C-menu** is the most robust layout: it is the shortest, degrades well under text zoom, and labels everything in the open state. It gives up immediate visibility of the core pages, which is the professional hierarchy R02 is trying to strengthen.
- **Touch.** All variants lift the minimum target from 24 px to 38 px, which exceeds the WCAG 2.2 AA target-size minimum of 24 × 24 CSS px. None reach the 44 px comfort aim in the header rows, except C's open menu.

## 8. Dock implications

**Should the dock expose all seven destinations?** On desktop it can. The flat dock is 480 px wide at 1440 px. [prod] On phones it cannot at today's 36 px size:

- 8 links + Settings = 9 × 36 + 8 × 6 gap + 12 padding = 384 px. [arith] That just fits within 90vw at 430 px (387 px) but exceeds it at 375 px (337 px) and 320 px (288 px), consistent with the production clipping above. [prod]

Options [proto dock mocks; widths arith-checked]:

| Dock option | Items | Natural width at 36 px | Fits 90vw at 375? | At 320? |
|---|---|---|---|---|
| `flat` (today) | 9 | 384 px | No | No |
| `sep`: Home + core, a separator, then exploration | 9 + separator | 391 px | No | No |
| `stack`: Home + core, separator, `Explore` disclosure, Settings | 7 + separator | 307 px | Yes (337 px limit) | No (288 px limit); needs about 32 px icons, about 279 px [arith] |

Assessment [inference]:

- **Separator.** A separator is the natural dock expression of the hierarchy. The component already imitates the macOS dock (magnification, active dot), and that dock separates groups with a rule. It keeps one-click access on desktop.
- **Stack.** An `Explore` stack is the only option that fits phones. It shares A's disclosure mechanics. It needs a labeled panel that opens upward, and should not rely on hover tooltips. Magnification must not move the button while the panel is open. This interaction was not tested.
- **Does the dock become less useful?** With a readable header, the dock is a personalization/identity mode rather than a wayfinding fix. It will always be icon-first. Whether dock mode should stay available below 430 px, or fall back to the header there, is an owner decision.
- **Simulation child routes.** Keep today's collapse to a single Simulations link (plus Settings) on `/simulations/*`. That behavior is a return-to-index affordance and is independent of grouping. The older evidence spec's warning about the hidden coupling in `Dock.tsx` still applies if the data model changes.
- **Active state.**
  - Keep the dot under the current item.
  - With `stack`, put the dot and active color on `Explore` when the route is exploratory, and mark the panel link `aria-current`.
  - Any dock work must add accessible names and a non-hover label mechanism first. That is a prerequisite, not part of R02.

## 9. Keyboard and accessibility behavior

**Chosen primitive: disclosure** — `<button type="button" aria-expanded aria-controls>` controlling a list of ordinary links. A custom `role="menu"` would impose arrow-key and roving-focus expectations that a list of three navigation links does not need.

| Interaction | Defined behavior | Verified in prototype |
|---|---|---|
| Pointer | Click toggles; no hover-to-open | Yes |
| Touch | Tap toggles; same handler as pointer | Simulated click only; no real touch device |
| Keyboard open | Enter or Space on the button (native button behavior) | Yes |
| Arrows | None; Tab and Shift+Tab move through links in DOM order | Yes |
| Escape | Closes, returns focus to the button, stops propagation | Yes |
| Focus leaving | Tabbing out of the disclosure closes it | Yes |
| Outside dismissal | Pointer-down outside closes it; focus is not moved | Yes |
| Current route | Button shows the active style (plus `: Page` above 640 px); panel link has `aria-current="page"` | Yes |
| Direct navigation | Links are real anchors, so middle-click and open-in-new-tab work | Links are real anchors in the prototype; new-tab not exercised |
| Back/forward | Panel state is not in history, so it returns closed; the SPA must close the panel on location change | Full-load version only |
| Reduced motion | Only an opacity fade on panel open, gated to `prefers-reduced-motion: no-preference`; no nav animation otherwise | Not emulated |

Related findings to carry into any implementation:

- **`aria-current` fixes.** The page should have one `aria-current="page"` on `/` (it has two today). [prod] `/work` should mark Experience. [prod] Prefix matches on child routes, such as Case Studies on `/case-studies/erebus`, could use `aria-current="true"` rather than `"page"`. [inference]
- **Native popover.** The HTML `popover` attribute with `popovertarget` is a candidate native alternative that provides light dismissal and Escape. Its focus-restoration and `aria-expanded` exposure, plus anchor positioning support, must be verified in target browsers before relying on it. It was not tested here.
- **`<details>`/`<summary>`.** It gives open/close without script but no Escape or outside dismissal. It is less suitable.
- **Coordinate with R01.** R01's skip link and route-focus policy should sit ahead of the header in tab order. With the change, the header costs 7 closed-state stops (A) instead of 10.

## 10. Relationship to homepage Writing/Simulations pills

[inference]

- **Blue pill.** Under A, and under C at 1180 px and below, Simulations moves one level down in the header. The blue pill then becomes the homepage's only one-tap route to Simulations. That argues for **keeping** it, consistent with the constraint not to remove it by default.
- **Red pill.** It duplicates a core link (Writing), which is harmless.
- **Reading the pair.** The core/exploration split gives the pair a coherent reading: one pill per layer (Writing = core, Simulations = exploration). That is an interpretation, not a stated design intent.
- **No proposed change.** No variant requires changing the pills. The open question from the discovery report remains: can the pills stay wordless if explicit links elsewhere do the navigation work? A clearly labeled `Explore` layer strengthens the case that they can.
- **Watch point.** Under B and C at 1181 px and wider, Simulations is visible in both the header and the pill. That redundancy is acceptable.

## 11. Tradeoffs

- **A**
  - For: the clearest professional hierarchy; the same header height as today on phones; no icon-only destinations; the simplest single mechanic.
  - Against: exploration always costs a click, even at 1440 px; very tall under enlarged text on phones; a visual/focus order mismatch in the phone layout.
- **B**
  - For: maximum discovery; hierarchy through typography alone; no interactive widget.
  - Against: tall at every width below 1181 px; unusable at 320 px with enlarged text; still needs an overflow fallback at 1440 px under enlarged text.
- **C**
  - For: shows the right presentation per width band, with the shortest phone header and the most robust text-zoom behavior.
  - Against: three presentations to build, test, and keep in sync; core pages hidden behind Menu on phones (C-menu); more CSS regimes in a file that already has an override appended at the end.
- **All variants**
  - The measured header offset (`--site-header-measured-offset`) will change, and `GlobalSectionNavigation.tsx` and `ArticlePage.tsx` read it. [code] The existing ResizeObserver should absorb this; not verified.

## 12. Recommended direction for prototyping (not implementation)

Prototype **C with A's phone layout as the default, and the labeled Menu as the enlarged-text fallback**:

1. **1181 px and wider:** two visible tiers (B). Nothing exploratory is hidden where it fits.
2. **641–1180 px:** core plus a labeled `Explore` disclosure in one row (A). This is where the measured problem is worst today: seven icon-only destinations at 1024 px.
3. **Phones at default text:** A's layout, with four labeled core links visible and `Explore` in the brand row.
4. **Phones with enlarged text:** fall back to the labeled `Menu`. Candidate trigger: `em`-based media queries, which track the user's default font size. This is **unverified**, because the prototype's font-size injection does not exercise `em` breakpoints.

Then run a head-to-head of A-phone vs C-menu on real devices before committing to either.

**Dock.** Treat the separator on desktop and the `stack` on phones as the dock candidates. Fix dock accessible names first as a separate change.

**Strongest conclusion.** The core/exploration hierarchy is materially better than the eight-equal model **between 641 and 1180 px**: zero instead of seven icon-only destinations, at the same 64 px height. It is also better **on phones at default text**: labeled 38 px targets instead of 24 px icons, at a similar height. At 1440 px the gain is hierarchy, not legibility, so keeping exploration visible as a quieter second tier beats hiding it. None of this is a product decision until validated as listed below.

## 13. Questions that need rendered/browser validation

1. **Real devices.** iOS Safari and Android Chrome: fixed-header behavior, safe-area insets, the dynamic toolbar, and whether `100dvh` caps the Menu correctly.
2. **Enlarged text.** Browser text-size settings (Chrome Android text scaling, Firefox default font size, iOS Safari's text-size control): do `em` breakpoints trigger the Menu fallback as intended?
3. **Screen readers.** VoiceOver and NVDA: announcement of the disclosure's expanded state, of the `aria-labelledby` group label in B, and of `aria-current` inside a collapsed panel.
4. **Integration.** The disclosure inside the real `AnimatePresence` header, with the Framer Motion mode switch and the measured-offset ResizeObserver. Does the panel survive or close correctly on route change and during the loader interstitial?
5. **Dock stack.** Interaction with magnification, spring sizing, and the Settings panel shift on desktop.
6. **Visitor comprehension.** Does "Explore" read as intentional to first-time visitors, or as "misc"? Do the placeholder descriptors help, and would the owner approve any descriptor copy?
7. **Light theme.** The prototype implements only the dark tokens.
8. **Other browsers.** Firefox and WebKit rendering of the mono group labels and the header's `backdrop-filter`.
9. **Reduced motion.** An emulated reduced-motion pass on the real header and dock mode switch.

## 14. Production files that would eventually be affected

| File | Why |
|---|---|
| `web/src/data/navigation.ts` | Add a group field or separate core/exploration lists while keeping one canonical definition |
| `web/src/components/Navigation/HeaderNavigation.tsx` | Grouped markup, Explore/Menu disclosure, close on location change, `aria-current` fixes (`/`, `/work`) |
| `web/src/components/Navigation/SiteNavigation.css` | New responsive regimes; remove reliance on the appended override block |
| `web/src/components/Navigation/SiteNavigation.tsx` | Header height changes; confirm the measured-offset logic still applies |
| `web/src/components/Dock/Dock.tsx` | Separator/stack grouping; keep the `/simulations/*` collapse without filtering hidden coupling |
| `web/src/components/Dock/DockIcon.tsx` | Accessible names and a non-hover label (prerequisite fix) |
| `web/src/components/Dock/Dock.css` | Separator, stack panel, narrow-width sizing |
| `web/scripts/generate-ai-context.mjs` | Reads `navigation.navItems` for `navigationRoutes`; needs updating if the data shape changes |
| `web/vite.config.ts` | Review only: `homeDestinationPaths` already lists the four core pages. Keep the shell consistent if the order changes |
| `web/src/components/Layout/GlobalSectionNavigation.tsx`, `web/src/components/ArticlePage/ArticlePage.tsx` | Review only: consume `--site-header-measured-offset` |
| `web/src/pages/Home/sections/ExplorationChoiceSection.tsx` | Review only: no change proposed |
| `web/src/data/routeMetadata.ts`, `web/public/sitemap.xml` | Review only: no URL changes; confirm no drift per AGENTS.md |

`web/src/components/Navigation/NavItem.tsx` and `SettingsNavButton.tsx` are not imported by any module under `web/src`, based on a search for their import statements. They should not be extended for this work.
