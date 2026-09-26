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
  video?: ProjectMediaAsset & { label: string };
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
    highlights: [
      "Belief-driven system state modeling",
      "Replayable operational history",
    ],
  },
  {
    id: "aether",
    category: "Systems Infrastructure",
    date: "2024",
    title: "Aether",
    description:
      "Real-time audio infrastructure for Linux that publishes live acoustic state through lock-free shared memory for low-latency cross-process consumers.",
    shortDescription:
      "PipeWire audio analysis exposed to cross-process consumers through shared memory.",
    techStack: ["Python", "PipeWire", "Shared Memory", "OpenRGB", "systemd"],
    features: [
      "7-band FFT analysis at ~23Hz",
      "~92ms end-to-end latency",
      "300+ LED hardware sync via OpenRGB",
      "15+ visualization styles",
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
      },
    },
    githubUrl: "https://github.com/kareemsasa3/aether",
    highlights: [
      "Lock-free IPC via memory-mapped files",
      "Low-latency shared-memory pipeline",
      "Architecture recognized publicly",
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
