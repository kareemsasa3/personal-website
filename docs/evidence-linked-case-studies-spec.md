# Evidence-Linked Case Studies Implementation Specification

Status: Approved design, implementation pending

Scope: Personal website frontend and its generated public artifacts

Implementation phase covered: Phase 1 only

Last repository/evidence inspection: 2026-08-27

## 1. Purpose

This redesign makes public engineering claims structurally traceable to the evidence that supports them. Evidence must be linked to the individual claim-bearing object it supports; a standalone “Evidence” section adjacent to unlinked prose is not sufficient.

Phase 1 makes Aether the current anchor and only configured flagship because it has the strongest publicly inspectable evidence package available in this handoff. Erebus and Arachne remain published case studies, but neither is a configured flagship in Phase 1. Erebus requires a deliberate publishable evidence package in Phase 2. Arachne may be considered separately after its claims and public repository are audited against this model. Themis is deferred to Phase 3. Client case studies use this same schema and renderer, but cannot be published without explicit stakeholder/client approval.

The redesign also establishes the information hierarchy:

1. `/case-studies` is the primary surface for demonstrated engineering judgment and evidence.
2. `/projects` is the secondary, broader project roster.
3. Simulation routes remain implemented, routable, indexed, and linked contextually, but Simulations is removed from primary navigation and homepage prominence.

No application code is implemented by this document.

### Authority and proposition provenance

- **User-directed:** the approved redesign direction, core-claim definition, categorical flagship rule, Aether promotion, Erebus demotion, phased rollout, client approval gate, Simulations demotion, Projects/Case Studies hierarchy, complexity removal, and testing boundaries in the implementation handoff.
- **Verified technical:** current repository consumers/couplings, current smoke assertions, absence of a unit-test runner, current public copy, and the Aether repository/CI findings recorded in section 8.
- **Internal implementation decisions:** the exact TypeScript discriminants, pure-function/module split, Arachne remaining nonflagship pending its own evidence audit, precise primary navigation order, sitemap priorities, and Vitest as the minimal TypeScript test runner. These decisions implement the approved policy without attributing them to an external stakeholder.

No task, publication, deployment, or stakeholder-validation state is advanced by this specification. It records implementation-ready direction only.

## 2. Goals and non-goals

### Goals

- Give every material architecture claim, technical decision, implementation highlight, measured characteristic, and outcome an explicit list of evidence references.
- Represent public complete, public sanitized/redacted, private, approval-pending, and absent evidence without conflating accessibility with disclosure completeness.
- Derive claim presentation and flagship eligibility from pure, tested logic.
- Make flagship eligibility categorical: all core claims require at least one direct, publicly inspectable reference.
- Keep ranking among eligible case studies human-curated through explicit ordered configuration.
- Replace the existing `artifacts` backing model with one evidence registry per case study.
- Preserve the publication safeguards that prevent private repositories or evidence links from leaking into HTML, JSON-LD, or generated AI context.
- Remove the self-assigned project complexity subsystem completely.
- Keep React-rendered pages, static route fallback shells, structured data, sitemap data, and generated AI-facing artifacts consistent.

### Non-goals

- No numerical evidence score or weighted ranking.
- No quantity-based path to flagship eligibility.
- No general test-suite expansion beyond the new pure evidence logic and the atomic smoke-policy migration.
- No Themis page or case-study data in Phase 1.
- No Erebus public evidence package in Phase 1.
- No client case-study activation before approval.
- No deletion or renaming of existing routes, including simulation routes and the `/work` canonical alias.
- No redesign of the site’s dark terminal/Matrix visual language.
- No infrastructure or deployment change.

## 3. Current-state findings and affected consumers

The current `CaseStudy` model in `web/src/data/caseStudies.ts` stores architecture and outcomes as strings, decision/highlight objects without stable IDs, and a page-level `artifacts` array. Nothing connects an artifact to the claim it supports. `CaseStudyArtifactStatus` also incorrectly treats `Sanitized` as mutually exclusive with `Public`.

The affected schema has these meaningful consumers:

- `web/src/components/CaseStudyPage/CaseStudyPage.tsx`: React detail renderer and section navigation.
- `web/src/pages/CaseStudies/CaseStudies.tsx`: case-study index cards.
- `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`: homepage featured/flagship cards.
- `web/src/pages/Projects/Projects.tsx`: current duplicated flagship section and project roster.
- `web/src/components/ProjectDetails/ProjectDetails.tsx`: project cards and case-study links.
- `web/src/data/routeMetadata.ts`: generated case-study metadata and sitemap settings.
- `web/src/data/structuredData.ts`: `CreativeWork`, breadcrumb, and `SoftwareSourceCode` graphs.
- `web/vite.config.ts`: static fallback HTML for the index and every case-study route, plus generated sitemap output.
- `web/scripts/generate-ai-context.mjs`: generated `llms.txt`, Markdown context files, and JSON manifest.
- `web/scripts/smoke-test.mjs`: route-shell, metadata, sitemap, structured-data, repository-publication, and privacy policy assertions.
- `web/src/data/siteContent.ts`: homepage feature ordering and “Flagship Systems” proof copy.
- `web/src/data/navigation.ts`: the shared source for header navigation, dock navigation, and generated AI navigation data.
- `web/src/components/Dock/Dock.tsx`: simulation-child routes currently filter `navItems` to the `/simulations` item, which is a hidden coupling when Simulations is removed from primary navigation.
- Tracked generated public artifacts under `web/public/ai/` and `web/public/llms.txt`.
- `web/public/sitemap.xml`, which should remain synchronized with route metadata even though the Vite build also generates `build/sitemap.xml`.

The route components under `web/src/pages/CaseStudyAether`, `CaseStudyErebus`, and `CaseStudyArachne` are thin slug lookups and do not require architectural changes. Route definitions remain explicit in `web/src/routes/index.tsx`.

## 4. Normative terminology

### Material claim

A material claim is a statement about architecture, behavior, implementation, measurement, or outcome whose truth affects a reader’s understanding of the engineering work. Editorial framing such as the problem statement may remain prose, but any empirical or implementation assertion embedded in prose must be moved into, or duplicated as, a claim-bearing object so it receives evidence semantics.

### Core claim

**A core claim is one whose falsity would materially undermine the case study’s central engineering argument.**

`core` is not an author-controlled escape hatch for making flagship eligibility pass. During content review, core designation must be decided from the case study’s stated central argument before evidence coverage is considered. Removing `core`, splitting a claim unnaturally, or restating a central claim as decorative prose solely to obtain eligibility is a policy failure.

### Publicly inspectable

Evidence is publicly inspectable only when the published reader can follow an `https://` URL and inspect the artifact without private credentials or stakeholder approval. A public sanitized/redacted artifact is publicly inspectable. Sanitization describes disclosure completeness, not accessibility.

### Direct, supporting, and contextual validation

- `direct`: the artifact itself establishes the linked claim at the claim’s actual level of specificity.
- `supporting`: the artifact increases confidence in the claim but does not establish the entire claim.
- `contextual`: the artifact provides relevant background or provenance but does not validate the claim.

Validation strength belongs on the claim-to-evidence relationship, not on the evidence record globally. The same artifact may directly validate one claim and only support another.

## 5. Target TypeScript model

Create `web/src/data/caseStudyEvidence.ts` for evidence types and pure derivation logic. Keep case-study content and explicit publication/ordering configuration in `web/src/data/caseStudies.ts`.

The implementation may refine property names for TypeScript ergonomics, but it must preserve the following separation and invariants.

```ts
export type EvidenceClass =
  | "executable-test"
  | "measurement"
  | "source-reference"
  | "operational-record"
  | "third-party-attestation"
  | "design-record";

export type ValidationStrength = "direct" | "supporting" | "contextual";

export type EvidenceDisclosure = "complete" | "sanitized";

export type EvidenceFormat =
  | "source"
  | "test-run"
  | "document"
  | "measurement-record"
  | "log"
  | "image"
  | "video"
  | "other";

export interface EvidenceLink {
  label: string;
  href: `https://${string}`;
  role: "artifact" | "provenance";
}

interface EvidenceBase {
  id: string;
  title: string;
  evidenceClass: EvidenceClass;
  format: EvidenceFormat;
  disclosure: EvidenceDisclosure;
  artifact: string;
  establishes: string;
  provenance?: string;
  repository?: {
    url: `https://github.com/${string}/${string}`;
    commitSha: string;
  };
  asOf?: string; // ISO 8601 date or timestamp; freshness only
  media?: {
    kind: "image" | "video";
    alt: string;
    caption?: string;
  };
}

export interface PublicEvidence extends EvidenceBase {
  access: "public";
  links: readonly [EvidenceLink, ...EvidenceLink[]];
  restrictionReason?: never;
}

export interface RestrictedEvidence extends EvidenceBase {
  access: "private" | "approval-pending";
  links?: never;
  restrictionReason: string;
}

export type NonMeasurementEvidence =
  | (PublicEvidence & {
      evidenceClass: Exclude<EvidenceClass, "measurement">;
      measurement?: never;
    })
  | (RestrictedEvidence & {
      evidenceClass: Exclude<EvidenceClass, "measurement">;
      measurement?: never;
    });

export type MeasurementEvidence =
  | (PublicEvidence & {
      evidenceClass: "measurement";
      measurement: {
        method: string;
        conditions: string;
        result: string;
      };
    })
  | (RestrictedEvidence & {
      evidenceClass: "measurement";
      measurement: {
        method: string;
        conditions: string;
        result: string;
      };
    });

export type CaseStudyEvidence = NonMeasurementEvidence | MeasurementEvidence;

export interface ClaimEvidenceReference {
  evidenceId: string;
  validation: ValidationStrength;
  note?: string;
}

export interface ClaimBase {
  id: string;
  core?: boolean;
  evidence: ClaimEvidenceReference[];
}

export interface CaseStudyClaim extends ClaimBase {
  text: string;
}

export interface CaseStudyDecision extends ClaimBase {
  title: string;
  rationale: string;
}

export interface CaseStudyHighlight extends ClaimBase {
  title: string;
  detail: string;
}

export interface CaseStudyMeasuredCharacteristic extends ClaimBase {
  label: string;
  value: string;
  qualification?: string;
}
```

`CaseStudy` then contains:

```ts
export interface CaseStudy {
  slug: string;
  projectId: string;
  title: string;
  shortDescription: string;
  centralArgument: string;
  publication: CaseStudyPublication;
  problem: string;
  constraints: {
    technicalLimitations: string;
    environment: string;
    tradeoffs: string;
  };
  architecture: CaseStudyClaim[];
  keyTechnicalDecisions: CaseStudyDecision[];
  implementationHighlights: CaseStudyHighlight[];
  measuredCharacteristics: CaseStudyMeasuredCharacteristic[];
  outcomes: CaseStudyClaim[];
  evidence: CaseStudyEvidence[];
  links: CaseStudyLink[];
  focusAreas: string[];
}
```

The exact claim text field can remain specialized (`rationale`, `detail`, and so on), but every material object must carry a stable `id`, `core`, and `evidence` references. Do not make evidence structurally exclusive to `keyTechnicalDecisions`.

### 5.1 Evidence-state invariants

- Public complete evidence: `access: "public"`, `disclosure: "complete"`, and at least one `https://` link.
- Public sanitized/redacted evidence: `access: "public"`, `disclosure: "sanitized"`, and at least one `https://` link.
- Existing but non-public evidence: `access: "private" | "approval-pending"`, a safe `restrictionReason`, and no `links` property.
- No evidence: no evidence reference on the claim. Do not create placeholder “Unavailable” registry records.
- `asOf` indicates freshness only. It cannot replace a commit SHA, immutable run URL, measurement record, or other provenance.
- Evidence IDs and claim IDs are unique within a case study. Evidence IDs are local to the case study registry.
- Every evidence reference resolves. Unknown IDs are an implementation/data error, never silently rendered as asserted.
- A measurement entry requires method, conditions, and result. A number in project copy is not sufficient.
- `repository` is allowed only where the artifact identifies source provenance. `commitSha` must be a full immutable SHA; `url` remains the repository root for `SoftwareSourceCode` projection.
- Public evidence links must be absolute `https://` URLs. Local visual assets must use their canonical public site URL in the registry, not a relative asset path.
- Restricted evidence must never carry or produce an external href.

### 5.2 Visual evidence

`format` and optional `media` make images/video representable without creating a screenshot-specific evidence class. The evidence class describes why the artifact is probative; the format describes what it is.

The approved Aether visualizer images will be added later during evidence-package assembly. Do not pre-classify representative screenshots as direct evidence for a visualization-style count. If a published artifact visibly enumerates every claimed style, it may directly validate that count. Representative screenshots may support the existence or breadth of the visualization system, but not a numeric count they do not visibly establish.

### 5.3 Publication gate for personal and client case studies

Use one publication predicate for every case study; do not create a client-only renderer or schema branch.

```ts
export type CaseStudyPublication =
  | { kind: "personal"; state: "published" | "draft" }
  | {
      kind: "client";
      state: "draft" | "approval-pending" | "published";
      approval?: {
        approvedAt: string;
        approvalReference: string;
      };
    };
```

A client case study may enter the public case-study list, route metadata, sitemap, static shells, structured data, or AI context only when `state === "published"` and an approval record exists. `approvalReference` is an internal/public-safe reference, not client correspondence and not a URL exposed to readers. Publication filtering must occur before every public projection, not only in the React renderer.

All current personal case studies are `published`. This gate is included in Phase 1 so Phase 4 activates approved client studies through data rather than a new architectural path.

## 6. Pure evidence logic

Implement and export pure functions from `caseStudyEvidence.ts`. They must not depend on React, browser globals, filesystem state, or network access.

### 6.1 Claim enumeration

`getMaterialClaims(caseStudy)` returns a normalized list across architecture, decisions, implementation highlights, measured characteristics, and outcomes. It is the only source used for coverage and eligibility. This prevents a new claim-bearing section from being accidentally omitted from policy logic.

### 6.2 Evidence resolution

`resolveClaimEvidence(caseStudy, claim)` resolves references against the case-study registry and returns each artifact plus the relationship strength. Duplicate evidence IDs on one claim should be rejected or de-duplicated deterministically; rejecting them during validation is preferred.

### 6.3 Claim display-state derivation

`deriveClaimDisplayState(caseStudy, claim)` returns one conceptual state:

1. `publicly-inspectable`: at least one resolved reference points to public evidence. Return the strongest public relationship and all public artifacts. A direct public reference may be labeled “Verified.” Supporting/contextual public evidence must remain in this same conceptual state to preserve the required three-state partition, but the visible label must say “Public support” or “Public context,” not imply direct verification.
2. `restricted-evidence`: evidence references resolve, but none is public. Return safe access/restriction explanations. Render “Evidence exists but is not publicly inspectable” and identify `Private` or `Approval pending` without exposing a link.
3. `asserted`: the claim has no evidence references. Render a quiet “Asserted” treatment.

If a claim has public contextual evidence and private direct evidence, its display state is `publicly-inspectable`, but the renderer must show both the limited public strength and the unavailable direct evidence. It is not flagship-covered.

Public sanitized evidence belongs in state 1 whenever the published artifact genuinely supports the linked claim. Its relationship strength must reflect what the sanitized artifact establishes, not what the complete private artifact might establish.

### 6.4 Flagship eligibility

`isFlagshipEligible(caseStudy)` is true only when:

- the case study has at least one core claim;
- every core claim has at least one resolved reference with `validation: "direct"`;
- that referenced evidence has `access: "public"`; and
- the case study passes evidence-reference validation.

Disclosure may be `complete` or `sanitized`; public sanitized evidence qualifies only when the actual published artifact directly establishes the claim.

Supporting, contextual, private, and approval-pending references never accumulate into eligibility, regardless of quantity. There is no score, percentage threshold, or tie-breaker based on evidence count.

### 6.5 Explicit flagship configuration

Declare an ordered configuration in `caseStudies.ts`:

```ts
export const flagshipCaseStudySlugs = ["aether"] as const;
```

This array is the human-curated ranking among eligible published case studies. Phase 1 contains only `aether`. Derive homepage/index flagship collections from this configuration; do not duplicate flagship ID arrays in `Projects.tsx` or `siteContent.ts`.

Publication-policy tests must fail if a configured slug is missing, unpublished, or ineligible. Eligibility does not automatically promote a case study; explicit configuration remains required.

## 7. Renderer behavior

### 7.1 Case-study detail page

Keep the existing section sequence and Matrix/terminal styling, but make evidence visible at the claim rather than only at the bottom of the page.

For architecture list items, decisions, highlights, measured characteristics, and outcomes:

- Render a quiet status line or disclosure below the claim.
- For public evidence, state what the artifact establishes and offer an inspect link. Show `Direct`, `Supporting`, or `Contextual` precisely. Show `Sanitized` separately from `Public` when applicable.
- For restricted evidence, state that evidence exists but is not publicly inspectable and show the safe reason. Never render an anchor.
- For asserted claims, show “Asserted — no linked public or private evidence” in subdued copy.
- Do not use warning/red error styling for asserted or restricted states. The treatment is informational, not punitive.
- Multiple references may be disclosed progressively to keep the page readable, but the strongest state and at least one inspection action must be available without ambiguity.

Replace the existing bottom `Evidence` artifact grid with an `Evidence Registry` section. It is an index of the same records used inline, not a parallel backing system. Each entry shows class, access, disclosure, artifact description, what it establishes, measurement method when applicable, provenance/freshness, and public links when allowed.

Add `Measured Characteristics` to the section navigation only when the array is non-empty. Rename the current section label from `Evidence` to `Evidence Registry`.

### 7.2 Case-study standing summary

Add a compact standing summary near the hero with two clearly separated concepts:

- Core coverage: `covered core claims / total core claims`, plus names of uncovered core claims when any exist.
- Evidence availability: counts of public, restricted, and asserted material claims.

Core coverage controls flagship eligibility. Raw evidence or claim counts do not. Do not combine these into a score or percentage badge.

The index card for Aether may say “Current anchor” and show complete core coverage. Nonflagship cards should not receive a negative “failed” badge; they may show precise coverage/availability copy.

### 7.3 Static fallback parity

`web/vite.config.ts` must use the same evidence derivation functions when generating route fallback HTML. Replace `renderArtifactGrid` with evidence-registry and claim-disclosure rendering. Static HTML must not leak restricted links and must state the same claim states as the React page.

This parity matters because the smoke test and non-JavaScript readers consume the fallback output.

## 8. Aether Phase 1 evidence package

### 8.1 Public evidence inspected for this specification

The public repository was inspected at commit `71e0201913669f702c60a1320c1a956c7fd21903` dated 2026-08-27. A successful immutable CI run for that commit is available at:

- `https://github.com/kareemsasa3/aether/actions/runs/33042746287`

Candidate stable source artifacts include:

- Repository tree: `https://github.com/kareemsasa3/aether/tree/71e0201913669f702c60a1320c1a956c7fd21903`
- Seqlock behavioral tests: `https://github.com/kareemsasa3/aether/blob/71e0201913669f702c60a1320c1a956c7fd21903/test_aether_shm_seqlock.py`
- Shared-memory implementation: `https://github.com/kareemsasa3/aether/blob/71e0201913669f702c60a1320c1a956c7fd21903/aether_shm.py`
- Daemon/PipeWire and FFT implementation: `https://github.com/kareemsasa3/aether/blob/71e0201913669f702c60a1320c1a956c7fd21903/aether_daemon.py`
- Style-catalog tests: `https://github.com/kareemsasa3/aether/blob/71e0201913669f702c60a1320c1a956c7fd21903/test_style_catalog.py`
- Style catalog: `https://github.com/kareemsasa3/aether/blob/71e0201913669f702c60a1320c1a956c7fd21903/style_catalog.py`
- CI workflow: `https://github.com/kareemsasa3/aether/blob/71e0201913669f702c60a1320c1a956c7fd21903/.github/workflows/ci.yml`
- systemd integration source: `https://github.com/kareemsasa3/aether/tree/71e0201913669f702c60a1320c1a956c7fd21903/integrations/systemd`

The implementation must intentionally select and pin a commit and matching successful CI run. The inspected commit above is an acceptable candidate snapshot, but re-check it during evidence assembly rather than replacing it with a mutable `main` URL. Repository-root links may remain in general “View code” navigation, while evidence provenance links must be pinned where practical.

### 8.2 Aether central argument and core claims

Use this central argument: Aether separates Linux audio analysis from consumers by publishing a sequence-validated shared-memory contract, allowing multiple consumers to read current acoustic state without coordinating with or controlling the producer.

Mark these claims core after final copy editing:

1. The daemon captures PipeWire audio and derives a seven-band FFT state.
2. The daemon publishes that state through a sequence-versioned memory-mapped protocol consumed independently of the producer.
3. Readers reject uninitialized, in-progress, repeated, and torn frames; behavioral tests exercise those cases and pass in the pinned CI run.
4. The repository contains multiple independent consumers/integrations built against the published state contract.

Each core claim must link to at least one direct public source/test artifact. The seqlock behavior claim should link to both the pinned behavioral test source and its successful CI run. Source presence alone does not prove that a test passed; the immutable run supplies execution evidence.

The systemd user-service claim is non-core. A pinned integration file directly establishes that deployable service integration exists; the local running-state claim remains backed only by a private operational record unless a safe public operational artifact is later published.

### 8.3 Numeric and performance claims

The current website contains:

- `~92ms end-to-end latency`
- `~23Hz` processing/update language
- `300+ LED hardware sync`
- `15+ visualization styles`

The private resume also contains an approximately `0.05ms IPC latency` claim, and the public Aether README repeats a latency breakdown. Neither repository contains an inspected reproducible benchmark method/result artifact for `~92ms` or `0.05ms`. README prose and private resume copy are not measurement provenance.

Therefore Phase 1 must:

- Remove `~92ms end-to-end latency` from `projects.ts`, the case study, generated AI context, and any duplicated public copy. Do not create a `Measurement` evidence record for it.
- Omit `0.05ms IPC latency` from public content and evidence until a measurement method, conditions, result record, and stable provenance exist.
- Replace empirical “low-latency” result wording with factual design wording such as “latency-sensitive shared-memory publication” where the claim is about intent/architecture, not a measured result.
- If retaining the cadence, describe `2048 samples at 48 kHz` and the resulting nominal chunk cadence as configured characteristics established by source, not a measured update rate. Do not label it a Measurement.
- Remove `300+` unless a public configuration or inspection artifact establishes the actual controlled LED count. “OpenRGB consumer” is supportable; the count is not currently established by this handoff.
- Replace `15+ visualization styles` with the precise claim supported by the selected snapshot. At the inspected commit, source and passing tests enumerate 18 registered/loadable styles. Phrase the claim as “18 registered visualizer styles load under the pinned test suite,” not as a claim about visual quality. If a different commit is selected, derive the count from that pinned source and test.

Do not make a latency number core. Do not preserve an unsupported number merely to strengthen the flagship presentation.

### 8.4 Later visualizer images

The approved images are not available in this phase. Add their registry entries only after the user supplies them and approves publication. Representative images should be supporting design records for the visualization-system claim unless a single published artifact visibly enumerates all claimed styles.

## 9. Erebus, Arachne, Themis, and client handling

### Erebus

- Remains published and routable.
- Is removed from flagship configuration, homepage featured ordering, “Flagship Systems” copy, and Projects flagship presentation.
- Migrate the current private operator artifact into restricted evidence records linked to the claims they actually support.
- Remove the current “Sanitized architecture summary” as evidence if it is only the case study describing itself. A claim cannot use its own unverified prose as independent evidence.
- Claims without a separate artifact render as asserted.
- Do not expose private repository URLs, host details, sockets, policies, actuator details, or other sensitive implementation data.

### Arachne

- Remains published and routable but is not configured as a Phase 1 flagship.
- Migrate repository provenance into a public source-reference record only after selecting a stable commit.
- Link only claims verified against that pinned source. The current page-level sanitized summary must not survive as self-referential evidence.
- A future flagship decision requires the same core/direct/public policy; a public repository by itself is not automatic eligibility.

### Themis

- No route, data, navigation, metadata, or placeholder card is added in Phase 1.
- Phase 3 uses the same content and evidence model.

### Client case studies

- Store evidence and claim references in the same model.
- Use `approval-pending` evidence when an artifact exists but publication is awaiting permission; it has no href.
- Do not project a client case study publicly until the publication predicate confirms explicit approval.
- Phase 4 activates approved records through data/configuration and existing projections, without a client-specific renderer.

## 10. Project complexity subsystem removal

Remove the subsystem completely, not just its visible badge.

### Data and types

In `web/src/data/projects.ts` remove:

- `COMPLEXITY_LEVELS`
- `complexityOrder`
- `Project.complexity`
- every `complexity` value in `projectsData`

### Filter/reducer/sort logic

In `web/src/pages/Projects/useProjects.ts` remove:

- `"complexity"` from `SortByType` and `FilterableKeys`
- `complexity` from `ProjectsState`, initial state, destructuring, dependency arrays, and returned state
- the complexity sort option and comparison branch
- complexity options derived from `COMPLEXITY_LEVELS`
- complexity filter matching
- `expertProjectCount`
- `handleShowExpertProjects`
- the Expert quick-filter action and returned handler/data

Keep category and status filtering, date/name/category sorting, live quick filtering, technology counts, and accessibility announcements unless separately affected by the roster simplification.

### Renderers

Remove complexity badges and related copy from:

- `web/src/pages/Projects/Projects.tsx`
- `web/src/components/ProjectDetails/ProjectDetails.tsx`
- `web/src/pages/CaseStudies/CaseStudies.tsx`
- `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`

In `ProjectDetails.tsx`, remove `getComplexityColor` completely. Preserve status behavior.

Remove the Expert statistic/quick-filter card and change “by domain, complexity, or project status” to “by domain or project status.” “Show all” pressed-state logic must no longer reference complexity.

### Styles

Delete complexity-only selectors/rules from:

- `web/src/styles/components.css`
- `web/src/components/ProjectDetails/ProjectDetails.css`
- `web/src/pages/Projects/Projects.css`

Where a selector is shared with `.status-badge`, retain the status rule and remove only `.complexity-badge`. Remove flagship-only CSS when the Projects flagship section is removed, but preserve reusable project-roster styling.

After implementation, `rg -n "complexity|Complexity|Expert|complexity-badge|expertProjectCount|handleShowExpertProjects" web/src` must return no references to this self-assessment subsystem. Ordinary prose about real technical complexity in work-experience content is not part of the subsystem and should remain.

## 11. Credibility copy changes

Remove or rewrite public-facing self-praise and claims that are broader than their evidence.

| Current copy | Required treatment |
| --- | --- |
| Aether: `Architecture recognized publicly` | Remove. Stars or public availability do not establish architectural recognition. Replace with a factual evidence statement such as `Public source and CI-backed protocol tests`. |
| Aether: `~92ms end-to-end latency` | Remove until reproducible measurement provenance exists. |
| Aether: `300+ LED hardware sync` | Rewrite as `OpenRGB consumer for configured LED zones` unless the count is evidenced. |
| Aether: `15+ visualization styles` | Replace with a pinned, test-supported count/qualification as described in section 8.3. |
| Aether timeline: `zero-copy shared memory` | Rewrite as `sequence-versioned shared-memory publication`; the implementation serializes JSON and writes it to mmap, so “zero-copy” overstates the inspected code. |
| Aether timeline: `gained recognition online` | Remove unless a third-party attestation is deliberately added and linked. |
| Arachne: `Production-grade Go + Next.js architecture` | Rewrite as factual stack/topology copy, for example `Go services with a Next.js operator interface`, after source verification. |
| Personal Website: `Modern React architecture` | Rewrite as a concrete description such as `React 18 route, context, and terminal component architecture`. |
| Projects: `Erebus, Arachne, and Aether are the core systems. They carry the strongest evidence...` | Remove with the duplicated Projects flagship section. Projects becomes a roster and links to the evidence-led case-study surface. |
| Case Studies fallback/index: `portfolio’s strongest systems` | Rewrite to describe evidence-linked engineering claims without comparative praise. |

Also update `web/src/data/timelineData.ts` where its Aether and Erebus narratives make claims such as systems “understand themselves,” “adapt,” or received recognition. Preserve the personal narrative voice, but express implemented mechanisms and current status rather than autonomous capability or acclaim not backed by evidence.

Update the curated terminal artifact in `web/src/data/fileContents.ts` from “Projects and Work are the primary proof surfaces” to identify Case Studies as the primary evidence surface and Projects as the roster. This file is a public-facing virtual artifact even though it is not a route data source.

Historical audit/refactor documents under `docs/` and `web/docs/` are not part of this public-copy cleanup and should not be rewritten in Phase 1.

## 12. Information architecture and navigation

### Primary navigation

Change `web/src/data/navigation.ts` so the primary order is:

1. Home
2. Case Studies
3. Experience
4. Projects
5. Journey
6. Terminal

Remove Simulations from the primary `navItems` array. Keep a separately exported `simulationNavItem` for contextual use. This preserves one canonical definition without placing it in the global primary navigation.

`HeaderNavigation` and the default Dock continue to render `navItems`. On `/simulations/*`, `Dock.tsx` must use `simulationNavItem` directly rather than filtering it out of `navItems`; otherwise removing Simulations from primary navigation leaves only the settings button and no route escape. The `/simulations` index may include its own route links as it does today.

Generated AI `navigationRoutes` must reflect only primary navigation. Simulation routes remain in canonical route lists and sitemap output.

### Homepage

- Keep the hero’s primary CTA pointed to `/case-studies`.
- Change generic “Featured Systems” presentation into evidence-led featured case studies.
- Derive featured cards from `flagshipCaseStudySlugs`; Phase 1 displays Aether as the current anchor.
- Keep “Browse project roster” as a secondary CTA to `/projects`.
- Remove complexity badges.
- Update `heroProofContent` from a three-system flagship claim to Aether-specific, evidence-grounded copy. Do not put an evidence count in the hero as a proxy score.
- Do not add Simulations to the homepage hierarchy.

### Case Studies index

- Present the explicitly ordered flagship/anchor area first.
- Present other published case studies afterward without calling them failed flagships.
- Explain that claims disclose public, restricted, or absent evidence.
- Use standing summaries based on core coverage and claim state, not raw artifact count.

### Projects roster

- Remove the duplicated `flagshipProjectIds`, flagship set, flagship section, and associated exclusion that currently removes those projects from the archive.
- Render all `projectsData` entries in the single broader roster.
- Lead with a secondary-positioning header and a clear CTA to `/case-studies` for evidence-linked analysis.
- Retain project status, category/status filters, sort modes other than complexity, code links, and case-study links.

### Routes, breadcrumbs, sitemap, and metadata

- Keep all current route paths and lazy imports in `web/src/routes/index.tsx`.
- Keep React and JSON-LD breadcrumbs unchanged: `Home > Case Studies > <title>` and `Home > Simulations > <simulation>` remain correct.
- Keep all current canonical simulation entries in `routeMetadata` and sitemap output.
- Change `/case-studies` sitemap priority to `0.9` and description to evidence-linked engineering judgment.
- Change Aether’s case-study priority to `0.9`; nonflagship case studies use `0.7`.
- Change `/projects` priority to `0.6` and description to a broader project roster that points readers to case studies for evidence.
- Leave simulation priorities (`0.4` index, `0.3` details), canonical paths, and route shells intact.
- Regenerate/update `web/public/sitemap.xml` so the tracked file agrees with metadata-generated output. Do not remove simulation URLs.

## 13. Artifacts migration

Delete `CaseStudyArtifactKind`, `CaseStudyArtifactStatus`, `CaseStudyArtifact`, and `CaseStudy.artifacts` after all consumers migrate in the same change.

Migration rules:

- Public repository provenance becomes one or more `source-reference` evidence records with stable commit links.
- A successful immutable CI run becomes `executable-test`, with method/coverage stated accurately.
- Private local runtime proof becomes `operational-record` with restricted access and no href.
- A real, separately published sanitized diagram/document becomes public evidence with `disclosure: "sanitized"` and an `https://` link.
- The case-study prose itself does not become evidence for its own claims.
- “Unavailable” becomes absence of a claim reference or a publication-pending/private evidence record if an artifact actually exists.
- General navigation links remain in `CaseStudy.links`, but those links do not back claims unless the same artifact also appears in the evidence registry and is explicitly referenced.

There must be one answer to “what backs this claim”: the evidence registry plus the claim’s references.

## 14. Structured data and public projections

### Structured data

Keep the existing `CreativeWork`, `WebPage`, `Person`, `WebSite`, and breadcrumb shapes.

For a case-study page, emit `SoftwareSourceCode` only when a public `source-reference` evidence record identifies a public GitHub repository. Derive this from evidence rather than assuming that a project-level `githubUrl` proves every case-study claim. The `SoftwareSourceCode.codeRepository` remains the repository root URL; the evidence record retains the commit-pinned inspection URL.

For the Projects index, project-level public `githubUrl` values may continue to produce roster `SoftwareSourceCode` entries. Preserve the explicit exclusions for Erebus and Mnemosyne and the general rule that missing/private repositories never produce `SoftwareSourceCode`.

Do not serialize restricted evidence details into JSON-LD beyond safe public case-study copy. Never serialize restricted hrefs because none may exist in the model.

### Generated AI context

Update `web/scripts/generate-ai-context.mjs` to:

- compile/import `caseStudyEvidence.ts` if required by the new module graph;
- replace `caseStudy.artifacts` mapping with evidence-registry and derived claim-state summaries;
- include configured flagship status, central argument, core coverage, and public/restricted/asserted claim counts;
- include public evidence links and disclosure state;
- include safe restriction reasons but never an href for restricted evidence;
- stop describing every public repository as sufficient “public evidence” for all project claims;
- reflect the new navigation order and Case Studies-first hierarchy; and
- bump generated schema/manifest versions because the JSON shape changes.

Regenerate and review:

- `web/public/llms.txt`
- `web/public/ai/context.md`
- `web/public/ai/projects.md`
- `web/public/ai/capabilities.md`
- `web/public/ai/contact-policy.md`
- `web/public/ai/site-manifest.json`

Files whose content is unchanged after deterministic regeneration need not be edited manually, but the implementation diff must be reviewed for accidental private data and unsupported numeric claims.

## 15. Publication-policy smoke-test migration

Migrate `web/scripts/smoke-test.mjs` in the same implementation unit as the schema/structured-data/static-shell change. Never temporarily delete or relax privacy assertions to make an intermediate build pass.

### A. Still-valid policy assertions

These remain policy and must be preserved:

- Projects JSON-LD emits only public GitHub `SoftwareSourceCode` entries.
- Every emitted `SoftwareSourceCode.codeRepository` is a public `https://github.com/` URL and `url === codeRepository`.
- Erebus and Mnemosyne are excluded from Projects `SoftwareSourceCode` output.
- A case-study route emits exactly one `CreativeWork`.
- Aether and Arachne emit `SoftwareSourceCode` only while their evidence registry contains a qualifying public source reference; Erebus emits none.
- Private or non-canonical routes do not enter the sitemap.
- Production output contains no source maps.

### B. Deliberately changed assertions

Only these expectations change for the redesign:

- Projects title/description/fallback copy changes from flagship/archive framing to project-roster framing.
- Case Studies fallback content becomes evidence-linked and shows Aether first/current anchor.
- Homepage proof/featured content changes from Erebus/Arachne ordering to configured Aether flagship ordering.
- Any assertion that treats Erebus, Arachne, and Aether collectively as flagships is replaced.
- Artifact-grid HTML assertions migrate to inline claim states and the Evidence Registry.
- Metadata/sitemap priorities and generated descriptions change as specified.

Add policy assertions, preferably against imported/transpiled data or generated static output as appropriate:

- Every configured flagship exists, is published, and `isFlagshipEligible` returns true.
- Every public evidence record has at least one link and every link parses as an `https:` URL.
- Every private or approval-pending evidence record has no links/href.
- Public sanitized evidence is allowed and required to have public `https://` links.
- Every claim evidence ID resolves within its case-study registry.
- Static fallback HTML contains public evidence links but contains no restricted external href.
- Aether’s unsupported `~92ms` text is absent from Projects, case-study, fallback, and generated public artifacts.
- Aether is the only configured Phase 1 flagship; Erebus is not rendered or described as flagship.

### C. Regression detectors unchanged

Keep unchanged:

- Homepage root shell and OG/Twitter image metadata assertions.
- Homepage JSON-LD types and absence of homepage `CreativeWork`/`SoftwareSourceCode` dumps.
- `WebPage` checks for Projects, Case Studies, all current case-study routes, Experience, Simulations, simulation details, and Terminal.
- Existing breadcrumb names and order.
- Canonical title/URL/content checks, updated only where approved copy changes require a new literal.
- Canonical sitemap route presence, including all current case studies and Experience.
- Sitemap exclusions for `/work`, monitoring, Grafana, admin, API, and sourcemap paths.
- No-build-sourcemap scan.

## 16. Focused unit testing

The repository currently has no unit-test runner; `npm test` only builds and runs the smoke script. Add Vitest as the single focused dev dependency because the logic is TypeScript in the existing Vite project. This dependency and the associated package-script/lockfile changes are directly required by the approved focused-test scope; add no component testing library, DOM harness, coverage service, or broad test migration.

Add `web/src/data/caseStudyEvidence.test.ts` covering table-driven fixtures for:

- evidence ID resolution, including unknown and duplicate references;
- public complete and public sanitized evidence;
- private and approval-pending evidence with no href;
- asserted claims with no references;
- strongest public display relationship without hiding restricted evidence;
- a public supporting/contextual reference not being mistaken for direct flagship coverage;
- a private direct reference not conferring eligibility;
- multiple weak/private references never accumulating into eligibility;
- every core claim needing at least one direct public reference;
- non-core uncovered claims not blocking eligibility;
- an empty core-claim set not being eligible;
- claim enumeration across architecture, decisions, highlights, measured characteristics, and outcomes; and
- ordered configured flagships all being published and eligible using production data.

Add scripts:

```json
"test:unit": "vitest run",
"test": "npm run test:unit && npm run test:smoke"
```

Keep `test:smoke` unchanged in behavior. Add `npm run test:unit` to both current Node 20 CI validation workflows (`.github/workflows/ci.yml` and `.github/workflows/web-ci.yml`) after typecheck. Do not introduce snapshot tests or React renderer tests in this phase.

## 17. Implementation sequence and atomicity

Implement Phase 1 in this order within one integration branch/change set:

1. Add evidence types, pure logic, fixtures/tests, and publication/flagship configuration.
2. Migrate all current case-study content from strings/artifacts to claim objects and evidence registries.
3. Assemble Aether’s pinned evidence package and remove unsupported metrics.
4. Update the React detail renderer and case-study index.
5. Update the homepage and Projects roster; remove all complexity behavior and styling.
6. Update navigation, including the simulation-child Dock escape.
7. Update structured data, route metadata, static fallback generation, sitemap, and AI-context generation.
8. Atomically migrate the publication-policy smoke assertions.
9. Regenerate public AI artifacts and sitemap.
10. Run the full validation matrix and inspect responsive pages.

Do not merge a state where the new schema exists but static/AI projections still read `artifacts`, where restricted evidence can produce hrefs, or where the smoke policy has been weakened to accommodate partial migration.

## 18. Validation and acceptance criteria

Run from `web/` unless noted:

```text
npm run test:unit
npm run typecheck
npm run lint
npm run build
npm run test:smoke
npm test
```

From the repository root:

```text
git diff --check
rg -n "complexity|Complexity|Expert|complexity-badge|expertProjectCount|handleShowExpertProjects" web/src
rg -n "~92ms|0\.05ms|Architecture recognized publicly|gained recognition online|zero-copy shared memory" web/src web/public web/vite.config.ts
```

Acceptance criteria:

- Every material claim resolves to exactly one conceptual display state.
- Every configured flagship is published and eligible; Phase 1 configured order is exactly Aether.
- Every Aether core claim has direct public evidence.
- No unsupported latency measurement is published.
- Public sanitized evidence is inspectable and modeled independently from disclosure completeness.
- Private/approval-pending evidence emits no external href in React HTML, fallback HTML, JSON-LD, or AI artifacts.
- Existing private repository exclusions remain intact.
- `artifacts` types/data/consumers are gone.
- Complexity data, logic, UI, stats, helpers, and CSS are gone.
- `/case-studies` leads the home/nav/content hierarchy; `/projects` is a roster.
- Simulation routes, metadata, sitemap entries, breadcrumbs, and contextual route escape still work.
- React and static fallback case-study pages convey equivalent evidence state.
- Generated AI context reflects the evidence model and contains no private data.
- At 320–430 CSS px, claim disclosures, evidence links, cards, badges, and standing summaries do not overflow.

Manual review should include `/`, `/case-studies`, all three current case-study routes, `/projects`, `/simulations`, and at least one `/simulations/*` route in both header and dock navigation modes.

## 19. Phasing after Phase 1

### Phase 2: Erebus evidence package

Select publishable source, design, test, or sanitized operational artifacts; obtain any required approvals; pin provenance; link claims; and reconsider flagship eligibility only after every core claim has direct public support.

### Phase 3: Themis case study

Add Themis through the same `CaseStudy` schema, publication filter, route/metadata/static projection, and evidence policy. Do not add a new evidence model.

### Phase 4: approved client case studies

Activate only records with explicit approval. Use the same renderer and projections. Sanitized public artifacts may be direct where the published artifact truly establishes the claim; approval-pending/private artifacts remain non-inspectable and linkless.

## 20. Expected implementation file inventory

### New files

- `web/src/data/caseStudyEvidence.ts`
- `web/src/data/caseStudyEvidence.test.ts`

### Data, rendering, and logic

- `web/src/data/caseStudies.ts`
- `web/src/data/projects.ts`
- `web/src/data/siteContent.ts`
- `web/src/data/aiContext.ts`
- `web/src/data/timelineData.ts`
- `web/src/data/fileContents.ts`
- `web/src/pages/CaseStudies/CaseStudies.tsx`
- `web/src/components/CaseStudyPage/CaseStudyPage.tsx`
- `web/src/components/CaseStudyPage/CaseStudyPage.css`
- `web/src/pages/Home/sections/FeaturedProjectsSection.tsx`
- `web/src/pages/Home/sections/FeaturedProjectsSection.css`
- `web/src/pages/Home/sections/HeroSection.tsx`
- `web/src/pages/Projects/Projects.tsx`
- `web/src/pages/Projects/useProjects.ts`
- `web/src/pages/Projects/Projects.css`
- `web/src/components/ProjectDetails/ProjectDetails.tsx`
- `web/src/components/ProjectDetails/ProjectDetails.css`
- `web/src/styles/components.css`

### Navigation, metadata, public projections, and policy

- `web/src/data/navigation.ts`
- `web/src/components/Dock/Dock.tsx`
- `web/src/data/routeMetadata.ts`
- `web/src/data/structuredData.ts`
- `web/vite.config.ts`
- `web/scripts/generate-ai-context.mjs`
- `web/scripts/smoke-test.mjs`
- `web/public/sitemap.xml`
- `web/public/llms.txt`
- `web/public/ai/context.md`
- `web/public/ai/projects.md`
- `web/public/ai/capabilities.md`
- `web/public/ai/contact-policy.md`
- `web/public/ai/site-manifest.json`

### Focused test plumbing

- `web/package.json`
- `web/package-lock.json`
- `.github/workflows/ci.yml`
- `.github/workflows/web-ci.yml`

`web/src/routes/index.tsx`, the individual `CaseStudy*` route wrappers, and simulation components are inspection/checkpoints, not expected edits unless type integration reveals a direct compile requirement. Deployment, Docker, nginx, and infrastructure files are explicitly out of scope.

## 21. Known migration risks

- Removing Simulations from `navItems` breaks the simulation-child Dock unless `simulationNavItem` is supplied separately.
- The AI context generator transpiles an explicit source-file list. A new imported evidence module must be included or the generator will fail at runtime.
- Static fallback HTML has its own renderer; updating React alone leaves crawlers and smoke tests on the old artifact model.
- `structuredData.ts` currently infers case-study source publication from `Project.githubUrl`. It must not bypass evidence/publication policy after migration.
- The tracked public sitemap and Vite-generated build sitemap can drift if only one is updated.
- Existing `artifacts` sanitized summaries are partly self-referential. Mechanical conversion would create false evidence.
- A public repository proves source availability, not that every narrative claim is true. Claim references must target stable files/tests/runs.
- A passing CI run proves only the commands in that workflow. It does not prove live PipeWire, OpenRGB hardware, systemd deployment, visual quality, or latency.
- The current Aether repository evolves quickly; mutable README counts already differ from site copy. Pinning source and test artifacts is mandatory, and `asOf` alone is insufficient.

## 22. Reconciliation decisions and unresolved evidence questions

### Deliberate refinements from the handoff

- Arachne is not a configured Phase 1 flagship. The handoff explicitly promotes Aether and demotes Erebus but does not provide an Arachne evidence package. Applying the same categorical eligibility rule means Arachne must remain nonflagship until its core claims are audited and directly linked.
- The old `Sanitized` artifact status is replaced by orthogonal `access` and `disclosure` fields. Public sanitized evidence is expressly linkable and may directly validate a claim at the level the redacted artifact establishes.
- Validation strength is stored on the claim-to-evidence reference, not the evidence object, because one artifact can have different probative strength for different claims.
- Public supporting/contextual evidence shares the publicly-inspectable conceptual state but receives a non-verified visible label. This preserves the required three-state renderer partition without allowing weak evidence to appear direct or confer flagship eligibility.
- The current `15+` Aether styles claim is not preserved verbatim. The inspected commit and CI suite establish 18 registered/loadable styles; the final number must match whichever commit is deliberately pinned during implementation.
- A minimal Vitest dependency is specified because Node 20 cannot directly execute the project’s TypeScript modules with the built-in test runner, and no unit-test runner exists today. No DOM/component testing stack is introduced.

### Unresolved evidence/provenance questions

- What exact measurement procedure, environment, sampling window, and raw result produced `~92ms end-to-end latency`?
- What exact procedure and result record produced `0.05ms IPC latency`?
- Is there a public-safe artifact that establishes the actual OpenRGB LED count rather than merely the consumer implementation?
- Which approved Aether visualizer images will be published, at what canonical URLs, and do any enumerate every claimed style?
- Should implementation pin the inspected Aether commit/CI run from section 8 or a later intentionally reviewed snapshot?
- Which Arachne claims are directly established by a stable public source/test package?
- Which Erebus artifacts can be sanitized and published in Phase 2 without disclosing workstation or policy details?
- For future client studies, what public-safe approval metadata may be stored in this public repository while the actual approval record remains outside it?

Until these questions are answered, the corresponding measurements/counts/artifacts cannot be presented as direct public evidence. They do not block the rest of Phase 1.
