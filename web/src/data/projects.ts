// Configuration constants for better type safety and maintainability
export const STATUSES = [
  "Live",
  "Development",
  "Active development",
  "Demo-ready",
  "Completed",
] as const;
export const CATEGORIES = [
  "Systems Infrastructure",
  "Backend Systems",
  "Developer Tooling",
  "Full-Stack Web App",
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
    techStack: ["Python", "SQLite", "systemd", "FTS5", "Wayland", "D-Bus"],
    features: [
      "Real-time system emitters (GPU, network, window focus, screen lock)",
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
    date: "2024",
    title: "Personal Website",
    description:
      "Interactive developer portfolio built in React and TypeScript to present projects, work history, and systems thinking through a distinctive UI.",
    shortDescription:
      "This site: a React and TypeScript portfolio with a terminal interface.",
    techStack: ["React 18", "TypeScript", "Vite", "Framer Motion"],
    features: [
      "Terminal emulator with virtual filesystem",
      "Parallax scrolling and animations",
      "Lazy loading with minimum display time",
      "Responsive design with theme support",
    ],
    status: "Live",
    url: "https://github.com/kareemsasa3/personal-website",
    githubUrl: "https://github.com/kareemsasa3/personal-website",
    highlights: [
      "Portfolio-first interactive UX",
      "Modern React architecture",
      "Custom terminal-inspired navigation",
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
    status: "Active development",
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
      "Local control plane for running staged, verifiable AI-assisted development workflows across repositories.",
    shortDescription:
      "Plans, runs, and verifies AI-assisted development work as logged stages.",
    techStack: ["Python", "Developer Tooling", "Automation", "CI", "Agent Workflows"],
    features: [
      "YAML execution plans for staged development runs",
      "Verification gates and review passes",
      "Durable run logs and structured artifacts",
      "Multi-repository workflow coordination",
    ],
    status: "Active development",
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
];
