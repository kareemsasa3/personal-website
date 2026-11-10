// Configuration constants for better type safety and maintainability
export const STATUSES = [
  "Live",
  "Development",
  "Active development",
  "Demo-ready",
  "Maintenance",
  "On Hold",
  "Completed",
] as const;
export const CATEGORIES = [
  "Systems Infrastructure",
  "Backend Systems",
  "Developer Tooling",
  "Full-Stack Web App",
  "Desktop Application",
  "Research",
  "Portfolio",
] as const;

export interface ProjectMediaAsset {
  /** Path under web/public, served from the site root. */
  src: string;
  width: number;
  height: number;
}

/** A still poster is required; a looping video is optional and only plays on detail pages. */
export interface ProjectMedia {
  poster: ProjectMediaAsset & { alt: string };
  /** Card-sized still for when the full poster is unreadable at thumbnail scale; falls back to poster. */
  thumbnail?: ProjectMediaAsset & { alt: string };
  video?: ProjectMediaAsset & {
    /** What the recording shows; its accessible name and visible caption. */
    label: string;
    /** Why the recording matters as evidence, and what it does not show. */
    significance: string;
    /** The evidence is mostly text (logs, UI), so the full-size poster is offered as a readable still. */
    textualEvidence?: boolean;
  };
}

export interface Project {
  id: string;
  category: (typeof CATEGORIES)[number];
  date: string;
  title: string;
  description: string;
  shortDescription: string;
  techStack: string[];
  /** Concrete delivered capabilities. */
  features: string[];
  status: (typeof STATUSES)[number];
  url: string;
  githubUrl?: string;
  liveUrl?: string;
  media?: ProjectMedia;
  /** Architecture, implementation decisions, and engineering distinctions; lifecycle belongs in status. */
  highlights: string[];
}

export const projectsData: Project[] = [
  {
    id: "erebus",
    category: "Systems Infrastructure",
    date: "2025",
    title: "Erebus",
    description:
      "Event-driven coordination layer for Linux that captures system context, tracks inferred state, and turns reactive troubleshooting into auditable operational understanding.",
    shortDescription:
      "Event-driven Linux coordination layer with replayable system state.",
    techStack: ["Python", "SQLite", "systemd", "FTS5", "Wayland"],
    features: [
      "Real-time system emitters (GPU, network, window focus, thermal, UPS)",
      "Screen-lock events currently supplied by an external wrapper, not a native emitter",
      "Belief engine with confidence-based inference",
      "Session tracking across substrate boundaries",
      "Full-text search over system event history",
      "Append-only audit log with replay determinism",
    ],
    status: "Active development",
    url: "#",
    media: {
      poster: {
        src: "/media/erebus.webp",
        width: 1344,
        height: 784,
        alt: "Erebus's live event stream in a terminal: timestamped network, window focus, thermal, UPS, GPU and belief-tick events from its system emitters.",
      },
      thumbnail: {
        src: "/media/erebus-card.webp",
        width: 492,
        height: 362,
        alt: "Close-up of Erebus's event stream: timestamped info and debug lines from the erebus-net, erebus-window, erebus-beliefs, erebus-ups and erebus-gpu emitters.",
      },
      video: {
        src: "/media/erebus.mp4",
        width: 1344,
        height: 784,
        label: "Running erebus events --follow: events from Erebus's network, window focus, thermal, UPS and GPU emitters stream in as they happen, alongside periodic belief re-evaluation ticks.",
        significance: "These emitter events are the raw timeline Erebus records and reasons over. The clip shows collection; inferred beliefs, replay and search are not shown.",
        textualEvidence: true,
      },
    },
    highlights: [
      "Belief-driven system state modeling",
      "Replayable operational history",
    ],
  },
  {
    id: "aether",
    category: "Systems Infrastructure",
    date: "2025",
    title: "Aether",
    description:
      "Linux audio-analysis daemon that publishes live frequency-band state through a sequence-versioned shared-memory region for independent local consumers.",
    shortDescription:
      "PipeWire audio analysis exposed to cross-process consumers through shared memory.",
    techStack: ["Python", "PipeWire", "Shared Memory", "OpenRGB", "systemd"],
    features: [
      "7-band FFT analysis at a nominal ~23 chunks/s (48 kHz, 2,048-sample chunks)",
      "Seqlock readers reject uninitialized, in-progress, already-seen and changed-mid-read frames (8 CI-passed tests)",
      "OpenRGB lighting consumer",
      "18 terminal visualization styles",
    ],
    status: "Completed",
    url: "https://github.com/kareemsasa3/aether",
    media: {
      poster: {
        src: "/media/aether.webp",
        width: 960,
        height: 706,
        alt: "Aether's terminal visualizer in the Phosphor style: green and cyan Lissajous curves drawn from live audio, with the seven-band spectrum readout below.",
      },
      video: {
        src: "/media/aether.mp4",
        width: 960,
        height: 706,
        label: "Aether's terminal visualizer reacting to live audio, cycling through the Phosphor, Neon Wave, Matrix Rain, Aurora and Cyberpunk styles.",
        significance: "Its seven-band spectrum readout matches the seven-band analysis this study describes. The clip shows the visualizer responding to live audio; it is not a latency measurement.",
      },
    },
    githubUrl: "https://github.com/kareemsasa3/aether",
    highlights: [
      "Seqlock-versioned shared memory; readers never block the writer",
      "Latest-value snapshot, not a message stream",
    ],
  },
  {
    id: "arachne",
    category: "Backend Systems",
    date: "2025",
    title: "Arachne",
    description:
      "Autonomous web research platform that searches, scrapes, versions, indexes, and synthesizes web content through a production-oriented Go and Next.js pipeline.",
    shortDescription:
      "Search-to-synthesis web research pipeline in Go and Next.js.",
    techStack: ["Go", "Next.js", "SQLite FTS5", "Redis", "Docker", "Chromedp"],
    features: [
      "Search → scrape → index → AI synthesis pipeline",
      "Change detection and version history",
      "Full-text search powered by SQLite FTS5",
      "Prometheus metrics and health monitoring",
    ],
    status: "Completed",
    url: "https://github.com/kareemsasa3/arachne",
    media: {
      poster: {
        src: "/media/arachne.webp",
        width: 1360,
        height: 1000,
        alt: "Arachne's Job Details page for a completed scrape of Hacker News, with the generated AI summary of the scraped content below the job metadata.",
      },
      thumbnail: {
        src: "/media/arachne-card.webp",
        width: 672,
        height: 494,
        alt: "Close-up of Arachne's Job Details page: the job ID, timestamps and https://news.ycombinator.com/ URL above the start of the generated AI summary.",
      },
      video: {
        src: "/media/arachne.mp4",
        width: 1360,
        height: 1000,
        label: "Arachne walkthrough: submitting a scrape job, watching it complete, generating an AI summary, browsing version history and the analytics dashboard, searching scraped content, and asking the assistant about a job.",
        significance: "It follows one job from submission to AI summary, then shows the version history and full-text search this study describes. It shows a successful run; load and failure handling are not shown.",
        textualEvidence: true,
      },
    },
    githubUrl: "https://github.com/kareemsasa3/arachne",
    highlights: [
      "Microservices architecture with submodules",
      "Production-grade Go + Next.js architecture",
    ],
  },
  {
    id: "web",
    category: "Portfolio",
    date: "2025",
    title: "Personal Website",
    description:
      "Personal site built in React and TypeScript that presents projects, case studies, technical writing, and interactive simulations under Darkfield, the site's own design system.",
    shortDescription:
      "This site: case studies, writing, and simulations under its own design system.",
    techStack: ["React 18", "TypeScript", "Vite", "React Router", "Framer Motion", "nginx", "Docker"],
    features: [
      "Darkfield design system: token-driven type, colour, and motion on every route",
      "Light, dark, and mono themes",
      "Technical writing published from Markdown at build time",
      "Browser simulations, games, and procedural animations",
      "Terminal with a virtual filesystem, history, autocomplete, and search",
    ],
    status: "Live",
    url: "https://github.com/kareemsasa3/personal-website",
    githubUrl: "https://github.com/kareemsasa3/personal-website",
    highlights: [
      "One design system governs the interface on every route",
      "Content driven from centralized, typed data files",
      "Route shells, structured data, and sitemap generated at build time",
    ],
  },
  {
    id: "mnemosyne",
    category: "Backend Systems",
    date: "2026",
    title: "Mnemosyne",
    description:
      "Source-first documentation and traceability system for mapping documented events, rules, oversight, and source-reported claims without asserting conclusions.",
    shortDescription:
      "Source-first traceability model for documented events, rules, and claims.",
    techStack: ["Python", "JSON Schema", "React", "Traceability", "Data Modeling"],
    features: [
      "Source-first event and claim modeling",
      "JSON Schema and semantic validation layers",
      "Read-only React projection viewer",
      "Anti-bleed boundaries between context and evidence",
    ],
    status: "On Hold",
    url: "#",
    highlights: [
      "Source-first traceability",
      "Deterministic documentation model",
    ],
  },
  {
    id: "kctl",
    category: "Developer Tooling",
    date: "2026",
    title: "kctl",
    description:
      "Local control plane for running staged, verifiable AI-assisted development workflows across repositories. Development is on hold with known issues unresolved.",
    shortDescription:
      "Plans, runs, and verifies AI-assisted development work as logged stages.",
    techStack: ["Python", "Developer Tooling", "Automation", "CI", "Agent Workflows"],
    features: [
      "YAML execution plans for staged development runs",
      "Verification gates and review passes",
      "Durable run logs and structured artifacts",
      "Multi-repository workflow coordination",
    ],
    status: "On Hold",
    url: "https://github.com/kareemsasa/kctl",
    githubUrl: "https://github.com/kareemsasa/kctl",
    highlights: [
      "Planned agent-assisted development runs",
      "Verifiable local workflow control",
    ],
  },
  {
    id: "operating-system-audit",
    category: "Systems Infrastructure",
    date: "2026",
    title: "Operating System Audit",
    description:
      "Read-only OS snapshot and diff tool for detecting configuration, network, identity, persistence, and execution drift.",
    shortDescription:
      "Read-only OS snapshot and diff tool for detecting system drift.",
    techStack: ["Go", "Bash", "Security", "Systems", "CLI"],
    features: [
      "Read-only operating system snapshots",
      "Snapshot diffs for visible drift over time",
      "Configuration, network, identity, and persistence checks",
      "Cross-platform CLI with embedded collectors",
    ],
    status: "Demo-ready",
    url: "https://github.com/kareemsasa/operating-system-audit",
    githubUrl: "https://github.com/kareemsasa/operating-system-audit",
    highlights: [
      "Read-only OS drift detection",
      "Deterministic snapshot comparisons",
    ],
  },
  {
    id: "themis",
    category: "Developer Tooling",
    date: "2026",
    title: "Themis",
    description:
      "Governance control plane for a portfolio of projects. It keeps standards, evidence, and derived reports together so status can be inspected without treating assumptions, missing evidence, or agent output as fact.",
    shortDescription:
      "Portfolio governance that keeps agent output separate from human authority.",
    techStack: ["Python", "JSON Schema", "systemd", "Agent Workflows"],
    features: [
      "Observe, derive, and render stages kept separate: repository evidence, governed judgment, deterministic Markdown reports",
      "Activity reports for a bounded day, week, or time range",
      "Governing standards for human deliberation, scheduled reconciliation, and architecture status",
      "Delegated agent work bound to each target repository's own procedures",
      "Scheduled observation through systemd units; standard-library Python only",
    ],
    status: "Active development",
    url: "#",
    highlights: [
      "Agent output is a proposition about governed truth, never governed truth itself",
      "Human authority is never inferred from commit, repository, or agent identity",
    ],
  },
  {
    id: "wardroom",
    category: "Developer Tooling",
    date: "2026",
    title: "Wardroom",
    description:
      "Local-first command-line group chat in which Claude and Codex deliberate over a project folder, with a moderator that summarizes when the room reaches consensus or a useful decision point.",
    shortDescription:
      "CLI where Claude and Codex deliberate over a codebase together.",
    techStack: ["TypeScript", "Node.js", "Agent Workflows"],
    features: [
      "Context packs built from a project folder with file selection, size budgets, and redaction",
      "Persistent, resumable sessions stored as JSONL event logs, with Markdown export",
      "Mock adapters and a dry-run preview for use without CLI authentication",
      "Claude and Codex invoked through their own command-line tools",
    ],
    status: "Demo-ready",
    url: "https://github.com/kareemsasa/wardroom",
    githubUrl: "https://github.com/kareemsasa/wardroom",
    highlights: [
      "Releases tagged through v0.2.0",
      "Bounded transcripts keep long sessions from growing without limit",
    ],
  },
  {
    id: "koine",
    category: "Desktop Application",
    date: "2026",
    title: "Koiné",
    description:
      "Planned open-source Linux game library that gathers games from multiple launchers into one searchable collection while leaving installation, configuration, and launch to those launchers. The application core exists; the GTK interface and live launching are not built yet.",
    shortDescription:
      "Early-stage Rust core for a unified Linux game library.",
    techStack: ["Rust", "SQLite", "Linux"],
    features: [
      "Steam library discovery from explicitly configured roots, validated on synthetic libraries only",
      "Read-only filesystem confinement during discovery",
      "Bounded discovery scheduler with cancellation and durable recovery",
      "Persistent library records in SQLite",
    ],
    status: "Development",
    url: "https://github.com/kareemsasa/koine",
    githubUrl: "https://github.com/kareemsasa/koine",
    highlights: [
      "External launchers stay authoritative for configuration and execution",
      "Unknown state is never recorded as a negative fact",
    ],
  },
  {
    id: "aeolus",
    category: "Research",
    date: "2026",
    title: "Aeolus",
    description:
      "Experimental harness for studying whether autonomous agents can discover and interrupt a causal recurrence. So far it is a deterministic, headless simulator with a mechanical test suite; it does not show that any agent reasons or escapes.",
    shortDescription:
      "Deterministic simulator for autonomous-agent recurrence experiments.",
    techStack: ["Python", "Simulation", "Autonomous Agents"],
    features: [
      "Deterministic headless world implementing a versioned simulator contract",
      "Treatment and control conditions: shared records kept or erased between cycles",
      "Replayable JSON traces and episodes with a privileged audit log",
      "Rule-based explorer baseline; reasoning infrastructure with null and scripted reasoners only, no model calls",
    ],
    status: "Development",
    url: "#",
    highlights: [
      "Passing tests validate the simulator's mechanics, not the research hypothesis",
      "Each policy sees only its own actor's observations",
    ],
  },
];
