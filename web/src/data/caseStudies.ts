import { projectsData, type Project, type ProjectMedia, type ProjectMediaAsset } from "./projects";

export interface CaseStudyDecision {
  title: string;
  rationale: string;
}

export interface CaseStudyHighlight {
  title: string;
  detail: string;
}

export type CaseStudyArtifactKind =
  | "Private operator artifact"
  | "Sanitized architecture summary"
  | "Repository provenance"
  | "Local system evidence"
  | "Evaluation record";

export type CaseStudyArtifactStatus =
  | "Public"
  | "Private"
  | "Sanitized"
  | "Unavailable";

export interface CaseStudyArtifact {
  title: string;
  kind: CaseStudyArtifactKind;
  status: CaseStudyArtifactStatus;
  description: string;
  href?: string;
  note?: string;
}

export interface CaseStudyLink {
  label: string;
  href: string;
  external?: boolean;
  unavailable?: boolean;
  unavailableLabel?: string;
}

/** The page sections every case study renders, in order. */
export type CaseStudySectionId =
  | "problem"
  | "constraints"
  | "architecture"
  | "decisions"
  | "implementation"
  | "outcome"
  | "evidence"
  | "links";

/** A still shown at its own CSS size (half its pixel size when `density` is 2), so text stays legible. */
export type CaseStudyImage = ProjectMediaAsset & { alt: string; label: string; density?: 1 | 2 };

/** Extra content for a section, for studies whose argument needs more than the standard fields. */
export type CaseStudyBlock =
  | { kind: "prose"; heading?: string; paragraphs: string[] }
  | { kind: "list"; heading?: string; items: string[] }
  | { kind: "prompts"; heading?: string; prompts: { label: string; summary: string; text: string }[] }
  | { kind: "images"; caption: string; images: CaseStudyImage[] }
  | { kind: "recording"; label: string; media: ProjectMedia & { video: NonNullable<ProjectMedia["video"]> } }
  | {
      kind: "comparison";
      caption: string;
      columns: [string, string];
      rows: { label: string; values: [string, string] }[];
      note?: string;
    };

export interface CaseStudy {
  slug: string;
  /** The project this study documents; experiments about method have none. */
  projectId?: string;
  /** "experiment" studies a way of working rather than a shipped system. */
  kind?: "system" | "experiment";
  /** Index badge and card still for a study without a project. */
  status?: string;
  media?: ProjectMedia;
  /** Overrides for section headings, e.g. "Experimental Setup" for "Constraints". */
  sectionTitles?: Partial<Record<CaseStudySectionId, string>>;
  /** Card headings for the three constraint fields, in order. */
  constraintTitles?: [string, string, string];
  /** Blocks rendered before or after a section's standard content. */
  blocks?: Partial<Record<CaseStudySectionId, { before?: CaseStudyBlock[]; after?: CaseStudyBlock[] }>>;
  title: string;
  shortDescription: string;
  problem: string;
  constraints: {
    technicalLimitations: string;
    environment: string;
    tradeoffs: string;
  };
  architecture: string[];
  keyTechnicalDecisions: CaseStudyDecision[];
  implementationHighlights: CaseStudyHighlight[];
  outcome: string[];
  artifacts: CaseStudyArtifact[];
  links: CaseStudyLink[];
  focusAreas: string[];
}

export interface CaseStudyCard extends CaseStudy {
  project?: Project;
  /** The project's status, or the study's own when it has no project. */
  status: string;
  /** The project's media, or the study's own when it has no project. */
  media?: ProjectMedia;
}

export const sectionTitle = (caseStudy: CaseStudy, id: CaseStudySectionId, fallback: string) =>
  caseStudy.sectionTitles?.[id] ?? fallback;

export const caseStudiesData: CaseStudy[] = [
  {
    slug: "aether",
    projectId: "aether",
    title: "Aether",
    shortDescription:
      "Low-latency Linux audio infrastructure that publishes live acoustic state through shared memory for cross-process consumers.",
    problem:
      "Desktop audio tooling is usually built as isolated effects or visualizers. Aether treats live audio analysis as shared system state so multiple processes can react to the same stream without each opening their own capture path.",
    constraints: {
      technicalLimitations:
        "The capture path had to stay responsive under Python, avoid lock contention, and keep serialization overhead low enough for real-time consumers.",
      environment:
        "The system runs on Linux with PipeWire, systemd user services, and OpenRGB-controlled hardware on the same workstation.",
      tradeoffs:
        "The design favors bounded latency and a stable memory layout over richer RPC semantics. Consumers read snapshots instead of requesting custom views.",
    },
    architecture: [
      "A PipeWire capture service samples audio frames and normalizes them into a fixed analysis window.",
      "An FFT stage derives band energy and publishes the current acoustic snapshot into memory-mapped shared state.",
      "Consumer processes subscribe by reading the shared snapshot directly, including the LED renderer that translates frequency bands into hardware updates.",
      "systemd manages lifecycle so the publisher and consumers can restart independently without manual orchestration.",
    ],
    keyTechnicalDecisions: [
      {
        title: "Shared memory instead of sockets",
        rationale:
          "The system needed frequent state publication with minimal copying. Memory-mapped snapshots removed repeated serialization and reduced end-to-end latency.",
      },
      {
        title: "Single publisher, many passive readers",
        rationale:
          "Aether keeps the timing-sensitive write path centralized and makes consumers stateless readers. That isolates jitter and simplifies recovery.",
      },
      {
        title: "Fixed snapshot schema",
        rationale:
          "A stable binary layout makes cross-process reads predictable and keeps integration code small for downstream consumers.",
      },
      {
        title: "systemd user services for orchestration",
        rationale:
          "Audio infrastructure should start with the session, restart on failure, and stay decoupled from the terminal used to launch it.",
      },
    ],
    implementationHighlights: [
      {
        title: "FFT pipeline tuned for interactive feedback",
        detail:
          "The analyzer reduces raw audio into seven usable bands at roughly 23 updates per second, which was enough for visual response without saturating consumers.",
      },
      {
        title: "Lock-free reader model",
        detail:
          "Readers consume the latest published snapshot without negotiating with the producer, which keeps hardware effects and future clients simple.",
      },
      {
        title: "Hardware integration boundary",
        detail:
          "OpenRGB is treated as a downstream consumer rather than a core dependency, so the audio pipeline remains reusable beyond lighting control.",
      },
    ],
    outcome: [
      "Aether turned audio analysis into a reusable local systems primitive rather than a single-purpose effect.",
      "The architecture supports low-latency hardware synchronization and additional consumers without reworking the capture path.",
    ],
    artifacts: [
      {
        title: "Repository provenance",
        kind: "Repository provenance",
        status: "Public",
        description:
          "Public source history for the Linux audio daemon remains on the legacy repository account where the project was developed.",
        href: "https://github.com/kareemsasa3/aether",
        note: "Canonical contact identity remains github.com/kareemsasa; this repository has not migrated.",
      },
      {
        title: "Local system evidence",
        kind: "Local system evidence",
        status: "Private",
        description:
          "The project is deployed locally as a systemd user service with PipeWire capture, shared-memory publication, and detachable consumers.",
        note: "Private workstation paths and service configuration are intentionally not published.",
      },
    ],
    links: [
      {
        label: "GitHub Repository",
        href: "https://github.com/kareemsasa3/aether",
        external: true,
      },
      { label: "Related: Erebus", href: "/case-studies/erebus" },
      { label: "Related: Arachne", href: "/case-studies/arachne" },
    ],
    focusAreas: ["Real-time systems", "IPC design", "Linux integration"],
  },
  {
    slug: "erebus",
    projectId: "erebus",
    title: "Erebus",
    shortDescription:
      "Event-driven Linux coordination layer that records system context, infers higher-level state, and makes troubleshooting replayable.",
    problem:
      "Operational debugging on a personal workstation is usually reactive and ephemeral. Erebus captures low-level events and inferred state so system behavior can be searched, replayed, and explained after the fact.",
    constraints: {
      technicalLimitations:
        "The platform had to ingest heterogeneous local signals, preserve ordering, and stay auditable without introducing opaque automation or high operational overhead.",
      environment:
        "The system targets a Linux desktop with systemd, D-Bus, Wayland session signals, and local SQLite storage.",
      tradeoffs:
        "Erebus favors append-only event history and explicit confidence scores over brittle single-state assumptions. That increases storage and modeling work, but keeps inference inspectable.",
    },
    architecture: [
      "Emitter processes collect focused slices of system activity such as GPU state, network changes, focus transitions, and session events.",
      "Events are written to an append-only store that acts as the canonical timeline for replay and debugging.",
      "A belief engine derives higher-level state from those events, assigning confidence rather than collapsing everything into binary conclusions.",
      "Search and inspection layers expose both raw history and inferred state so operational questions can be answered from evidence.",
    ],
    keyTechnicalDecisions: [
      {
        title: "Append-only event log",
        rationale:
          "Reconstructing system behavior requires a durable timeline. Immutable history makes replay and audit possible even when inference logic changes.",
      },
      {
        title: "Confidence-based belief engine",
        rationale:
          "Desktop state is often ambiguous. Confidence scores let the system reason under uncertainty without hiding that uncertainty from the operator.",
      },
      {
        title: "SQLite with local full-text search",
        rationale:
          "The workload is local-first and read-heavy. SQLite keeps deployment small while still supporting indexed investigation of historical context.",
      },
      {
        title: "Emitter isolation by domain",
        rationale:
          "Separate collectors make failures easier to contain and allow each integration point to evolve without destabilizing the full pipeline.",
      },
    ],
    implementationHighlights: [
      {
        title: "Cross-substrate session tracking",
        detail:
          "The system correlates activity that spans focus changes, locks, network transitions, and other state boundaries into a usable operational story.",
      },
      {
        title: "Replayable inference",
        detail:
          "Because the event history is preserved, newer inference logic can be tested against older timelines without losing the original evidence.",
      },
      {
        title: "Searchable operational context",
        detail:
          "FTS-backed queries make it possible to inspect incidents as sequences instead of isolated log lines.",
      },
    ],
    outcome: [
      "Erebus replaces ad hoc workstation debugging with a durable model of what happened and why the system believed it was happening.",
      "The project is still in active development, but the architecture already establishes a path for auditable local automation.",
    ],
    artifacts: [
      {
        title: "Private operator artifact",
        kind: "Private operator artifact",
        status: "Private",
        description:
          "Local project evidence includes append-only event history, emitter output, and inference traces from a personal Linux environment.",
        note: "Public repository is not currently available; private machine identifiers, socket paths, policies, and actuator details are not published.",
      },
      {
        title: "Sanitized architecture summary",
        kind: "Sanitized architecture summary",
        status: "Sanitized",
        description:
          "The public case study summarizes the event log, belief engine, and inspection workflow without exposing host-specific automation details.",
      },
    ],
    links: [
      {
        label: "Public Repository",
        href: "",
        unavailable: true,
        unavailableLabel: "Public repository not available.",
      },
      { label: "Related: Aether", href: "/case-studies/aether" },
      { label: "Related: Arachne", href: "/case-studies/arachne" },
    ],
    focusAreas: ["Event modeling", "Inference systems", "Operational tooling"],
  },
  {
    slug: "arachne",
    projectId: "arachne",
    title: "Arachne",
    shortDescription:
      "Autonomous research platform that searches, scrapes, versions, indexes, and synthesizes web content through a Go and Next.js pipeline.",
    problem:
      "Manual web research does not scale when the source set is large, frequently changing, and spread across inconsistent page structures. Arachne turns collection and change tracking into a repeatable pipeline instead of a one-off browsing session.",
    constraints: {
      technicalLimitations:
        "The system had to deal with dynamic pages, unreliable source structure, bounded compute, and enough persistence to compare revisions over time.",
      environment:
        "The stack runs as containerized Go services with a Next.js frontend, Redis for coordination, SQLite FTS5 for search, and Chromedp for browser automation.",
      tradeoffs:
        "SQLite and local services were chosen over heavier distributed infrastructure. That keeps deployment simple, but constrains horizontal scaling and pushes more care into pipeline scheduling.",
    },
    architecture: [
      "Discovery starts with search and queue generation, which produces candidate URLs for the scrape layer.",
      "Scrape workers extract page content and persist versioned records so historical changes remain queryable.",
      "An indexing layer writes normalized content into SQLite FTS5 for retrieval across both current and historical documents.",
      "A Next.js interface exposes search, inspection, and synthesis workflows on top of the backend pipeline.",
    ],
    keyTechnicalDecisions: [
      {
        title: "Go for the pipeline core",
        rationale:
          "The collection pipeline is IO-heavy, concurrent, and long-running. Go provides a straightforward fit for workers, orchestration, and service boundaries.",
      },
      {
        title: "Separate frontend from ingestion services",
        rationale:
          "Collection and operator workflows move at different rates. Decoupling them keeps the UI responsive without constraining backend execution.",
      },
      {
        title: "SQLite FTS5 for retrieval",
        rationale:
          "The project needed strong local search with versioned content but not the operational cost of a larger search cluster.",
      },
      {
        title: "Redis for queueing and coordination",
        rationale:
          "Transient pipeline state belongs in a fast coordination layer rather than in the persistent content store.",
      },
      {
        title: "Containerized service boundaries",
        rationale:
          "Docker made it easier to run scraping, indexing, and frontend layers consistently while keeping each process role explicit.",
      },
    ],
    implementationHighlights: [
      {
        title: "Version-aware content store",
        detail:
          "Arachne keeps historical revisions so research outputs can cite not only what a page says now, but how it changed.",
      },
      {
        title: "Search-to-synthesis pipeline",
        detail:
          "The system connects discovery, extraction, indexing, and AI-assisted synthesis into one flow instead of making the user hand off data between tools.",
      },
      {
        title: "Operational visibility",
        detail:
          "Health checks and Prometheus metrics provide enough observability to treat the pipeline as a service rather than a script.",
      },
    ],
    outcome: [
      "Arachne makes research repeatable, searchable, and inspectable across time instead of tied to transient browser sessions.",
      "The architecture supports both direct retrieval and higher-level synthesis workflows on top of the same indexed corpus.",
    ],
    artifacts: [
      {
        title: "Repository provenance",
        kind: "Repository provenance",
        status: "Public",
        description:
          "Public source history for the research platform remains on the legacy repository account where the project was developed.",
        href: "https://github.com/kareemsasa3/arachne",
        note: "Canonical contact identity remains github.com/kareemsasa; this repository has not migrated.",
      },
      {
        title: "Sanitized architecture summary",
        kind: "Sanitized architecture summary",
        status: "Sanitized",
        description:
          "The case study documents the search, scrape, versioning, indexing, and synthesis pipeline without publishing target lists or private datasets.",
      },
    ],
    links: [
      {
        label: "GitHub Repository",
        href: "https://github.com/kareemsasa3/arachne",
        external: true,
      },
      { label: "Related: Erebus", href: "/case-studies/erebus" },
      { label: "Related: Aether", href: "/case-studies/aether" },
    ],
    focusAreas: ["Research automation", "Service design", "Search systems"],
  },
  {
    slug: "where-the-specification-lived",
    kind: "experiment",
    status: "Completed",
    title: "Where the Specification Lived",
    shortDescription:
      "Two agents built the same Traffic Simulator in the same repository, one from a 38-word prompt and one from a 615-word specification. A blinded review of both artifacts shows what each prompt bought, and why prompt length and specification load are different variables.",
    media: {
      poster: {
        src: "/media/spec-experiment-card.webp",
        width: 672,
        height: 494,
        alt: "Left: the Simple-prompt simulator's time-space diagram, with queues as bright bands at each signal. Right: the Detailed-prompt simulator zoomed to one intersection, with queued cars on both streets.",
      },
    },
    sectionTitles: {
      problem: "Question",
      constraints: "Experimental Setup",
      architecture: "What Each Agent Built",
      decisions: "How the Artifacts Were Judged",
      implementation: "What the Evaluation Found",
      outcome: "Outcome",
    },
    constraintTitles: ["Held constant", "Varied", "Not controlled"],
    problem:
      "How much of an agent's specification has to arrive in the prompt when the agent works inside a mature repository? Two agents were given the same task in the same repository: finish the Traffic Simulator that the site listed as in development. One prompt was 38 words. The other was 615. The working thesis was that prompt length and specification load are different variables, because much of the effective specification may already live in the repository.",
    constraints: {
      technicalLimitations:
        "Same repository and base commit (ac5fe45), same task, and the same standing instructions: work in an isolated worktree, commit in coherent chunks, do not push. Both sessions ran Claude Opus 5.5 in Claude Code 2.1.289, and the prompts were submitted five seconds apart.",
      environment:
        "Only the invocation prompt. The Simple prompt asked the agent to inspect the repository and existing simulations, implement the simulator completely, and verify it. The Detailed prompt restated the placeholder's concept, required specific behaviours, named conventions to follow, and set testing, validation, and reporting requirements.",
      tradeoffs:
        "One pair of runs, not a crossover. Agent variance and tool-use luck are uncontrolled. The two agents first collided in the same worktree, each overwrote one of the other's files, told the other, and moved to separate worktrees. The experiment is quasi-controlled, not lab-clean.",
    },
    architecture: [
      "The Simple run built a three-scenario lab for emergent congestion: a signal corridor with three coordination modes, a three-lane highway that loses a lane (drivers merge using the MOBIL lane-change rule), and a ring road with a brake-tap button. Drivers follow the Intelligent Driver Model. A time-space diagram plots every vehicle's position over the last two minutes.",
      "The Detailed run built one deeper system: a two-way arterial with three signals and cross streets. Its signal controller always passes through yellow and all-red and holds a minimum green, including when the plan is edited mid-run. It offers fixed-time and detector-actuated control, a rule against entering an intersection you cannot clear, per-signal zoom, and per-direction measurements.",
      "Both wired the simulator into the same places: route, simulation card, page metadata, sitemap, static route shell, and smoke test. The Simple prompt named none of them; the Detailed prompt listed the kinds of mechanism but not where they lived. The Detailed run also added breadcrumb structured data and a browser regression script.",
    ],
    keyTechnicalDecisions: [
      {
        title: "Evaluate blind",
        rationale:
          "The evaluator compared the two branches without knowing which prompt produced which. Branch names, commit counts, elapsed time, and verbosity were excluded as quality signals.",
      },
      {
        title: "Use both simulators",
        rationale:
          "Every scenario and control was exercised in production builds at desktop and phone widths, in both themes and with reduced motion, while watching for console errors.",
      },
      {
        title: "Probe past the shipped tests",
        rationale:
          "Independent runs held every control at its extremes for 30 simulated minutes and checked invariants at every step. Claims in each project's documentation were re-measured, across ten random seeds where seeds applied.",
      },
      {
        title: "Break rules on purpose",
        rationale:
          "Each important model rule was disabled or altered one at a time, and the shipped test suite was run against each change. A suite that still passes with a rule removed is not constraining that rule.",
      },
      {
        title: "No composite score",
        rationale:
          "The artifacts were compared dimension by dimension. Breadth, rigour, and fit pull in different directions, and a single number would hide exactly that.",
      },
    ],
    implementationHighlights: [
      {
        title: "Both passed every repository gate",
        detail:
          "Typecheck, lint, production build, and the smoke suite passed for both. Neither broke an invariant in the 30-minute probe runs: no overlapping vehicles, no reversing, and no invalid numbers.",
      },
      {
        title: "Breadth on one side, depth on the other",
        detail:
          "The Simple artifact shows three structurally different phenomena. The Detailed artifact goes further into one of them, signal control: both travel directions, cross traffic, safe transitions, and actuation.",
      },
      {
        title: "The time-space diagram made emergence visible",
        detail:
          "In the Simple artifact, signal coordination, the merge queue, and the ring road's backward-travelling wave all appear as shapes. The Detailed artifact reports comparable effects as numbers in tiles and tables.",
      },
      {
        title: "Test strength diverged",
        detail:
          "Against the Simple suite, 25 of 51 single-rule breakages went unnoticed; about five of those change nothing the model can show. The Detailed suite caught breakages of its red-light, yellow, intersection, signal-sequence, and actuation rules, and missed changes to how metrics were defined and to a few parameters.",
      },
      {
        title: "A correctness bug its author did not report",
        detail:
          "Editing signal timing mid-run in the Simple artifact switched lights straight from green to red. In 49 abrupt edits there were 12 crossings on red, 11 of them more than 2 s after the light turned. Its red-light test allowed crossings up to 2 s into red, and its own review had reported no engine bugs.",
      },
      {
        title: "Rules the presets never exercise",
        detail:
          "The Detailed artifact's rules against blocking an intersection never fired in its shipped presets: zero times in 52.2 million checks over 30-minute runs. Its report disclosed that its spillback test forces the situation, but its page description still promised spillback.",
      },
    ],
    outcome: [
      "Before learning which prompt produced which branch, the evaluator recommended publishing the Simple artifact. Its breadth and its time-space diagram fit what this site's Simulations page is for: interactive explorations of rules, state, feedback, and emergence.",
      "The same evaluation judged the Detailed artifact the better-engineered one: safer signal transitions, stronger tests, and deeper treatment of the problem it chose.",
      "The Detailed run took 56 min 34 s to the Simple run's 26 min 55 s, about 2.1 times as long. That is a cost, not a quality score.",
    ],
    artifacts: [
      {
        title: "Simple-prompt artifact",
        kind: "Repository provenance",
        status: "Public",
        description:
          "The Simple run's final commit, preserved unchanged by the tag traffic-sim-experiment-simple. The post-evaluation fixes were made on top of it.",
        href: "https://github.com/kareemsasa3/personal-website/commit/7420cc7a83abe51d25aa3073c66ae642afe548ae",
      },
      {
        title: "Detailed-prompt artifact",
        kind: "Repository provenance",
        status: "Public",
        description:
          "The Detailed run's final commit, preserved unchanged by the tag traffic-sim-experiment-detailed as the comparison artifact.",
        href: "https://github.com/kareemsasa3/personal-website/commit/0e62d2ce376b0586e648c6f34250ed5704e28e22",
      },
      {
        title: "Blinded evaluation record",
        kind: "Evaluation record",
        status: "Public",
        description:
          "The evaluation written before the prompt mapping was revealed, the exact prompts and closing reports, probe and mutation results, captured media, and the scripts that produced them.",
        href: "https://github.com/kareemsasa3/personal-website/tree/main/docs/evidence/traffic-simulator-experiment",
      },
      {
        title: "Session transcripts",
        kind: "Local system evidence",
        status: "Private",
        description:
          "The two authoring sessions' transcripts are the source of the prompts, timings, models, and closing reports quoted here.",
        note: "The transcripts stay local; the evaluation record reproduces the prompts and closing reports verbatim.",
      },
    ],
    links: [
      { label: "Open the Traffic Simulator", href: "/simulations/traffic-simulator" },
      {
        label: "Evaluation evidence on GitHub",
        href: "https://github.com/kareemsasa3/personal-website/tree/main/docs/evidence/traffic-simulator-experiment",
        external: true,
      },
      { label: "Related: What Should the Agent Have to Figure Out?", href: "/writing/what-should-the-agent-have-to-figure-out" },
      { label: "Related: What the Second Agent Is For", href: "/writing/what-the-second-agent-is-for" },
    ],
    focusAreas: ["Agent-assisted development", "Specification", "Blinded review"],
  },
];

export const caseStudyBySlug = caseStudiesData.reduce<
  Record<string, CaseStudy>
>((accumulator, caseStudy) => {
  accumulator[caseStudy.slug] = caseStudy;
  return accumulator;
}, {});

export const caseStudyByProjectId = caseStudiesData.reduce<
  Record<string, CaseStudy>
>((accumulator, caseStudy) => {
  if (caseStudy.projectId) accumulator[caseStudy.projectId] = caseStudy;
  return accumulator;
}, {});

export const caseStudyCards: CaseStudyCard[] = [
  "erebus",
  "aether",
  "arachne",
  "where-the-specification-lived",
].map((slug) => caseStudyBySlug[slug]).flatMap(
  (caseStudy) => {
  const project = projectsData.find(
    (entry) => entry.id === caseStudy.projectId
  );
    const status = project?.status ?? caseStudy.status;

    if (!status) {
      return [];
    }

    return [
      {
        ...caseStudy,
        project,
        status,
        media: project?.media ?? caseStudy.media,
      },
    ];
  }
);
