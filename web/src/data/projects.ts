// Configuration constants for better type safety and maintainability
export const COMPLEXITY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;
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

// Complexity order for sorting
export const complexityOrder: Record<
  (typeof COMPLEXITY_LEVELS)[number],
  number
> = {
  Expert: 4,
  Advanced: 3,
  Intermediate: 2,
  Beginner: 1,
};

export interface Project {
  id: string;
  category: (typeof CATEGORIES)[number];
  date: string;
  title: string;
  description: string;
  techStack: string[];
  features: string[];
  complexity: (typeof COMPLEXITY_LEVELS)[number];
  status: (typeof STATUSES)[number];
  url: string;
  githubUrl?: string;
  liveUrl?: string;
  image?: string;
  highlights: string[];
}

export const projectsData: Project[] = [
  {
    id: "erebus",
    category: "Systems Infrastructure",
    date: "2025",
    title: "Erebus OS",
    description:
      "Event-driven coordination layer for Linux that captures system context, tracks inferred state, and turns reactive troubleshooting into auditable operational understanding.",
    techStack: ["Python", "SQLite", "systemd", "FTS5", "Wayland", "D-Bus"],
    features: [
      "Real-time system emitters (GPU, network, window focus, screen lock)",
      "Belief engine with confidence-based inference",
      "Session tracking across substrate boundaries",
      "Full-text search over system event history",
      "Append-only audit log with replay determinism",
    ],
    complexity: "Expert",
    status: "Active development",
    url: "#",
    highlights: [
      "Belief-driven system state modeling",
      "Replayable operational history",
      "Active development",
    ],
  },
  {
    id: "aether",
    category: "Systems Infrastructure",
    date: "2024",
    title: "Aether",
    description:
      "Real-time audio infrastructure for Linux that publishes live acoustic state through lock-free shared memory for low-latency cross-process consumers.",
    techStack: ["Python", "PipeWire", "Shared Memory", "OpenRGB", "systemd"],
    features: [
      "Lock-free IPC via memory-mapped files",
      "7-band FFT analysis at ~23Hz",
      "~92ms end-to-end latency",
      "300+ LED hardware sync via OpenRGB",
      "15+ visualization styles",
    ],
    complexity: "Expert",
    status: "Completed",
    url: "https://github.com/kareemsasa3/aether",
    githubUrl: "https://github.com/kareemsasa3/aether",
    highlights: [
      "Lock-free concurrent design",
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
    techStack: ["Go", "Next.js", "SQLite FTS5", "Redis", "Docker", "Chromedp"],
    features: [
      "Search → scrape → index → AI synthesis pipeline",
      "Change detection and version history",
      "Full-text search powered by SQLite FTS5",
      "Microservices architecture with submodules",
      "Prometheus metrics and health monitoring",
    ],
    complexity: "Expert",
    status: "Completed",
    url: "https://github.com/kareemsasa3/arachne",
    githubUrl: "https://github.com/kareemsasa3/arachne",
    highlights: [
      "Autonomous research workflows",
      "Change tracking with searchable history",
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
    techStack: ["React 18", "TypeScript", "Vite", "Framer Motion"],
    features: [
      "Terminal emulator with virtual filesystem",
      "Parallax scrolling and animations",
      "Lazy loading with minimum display time",
      "Responsive design with theme support",
    ],
    complexity: "Advanced",
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
    techStack: ["Python", "JSON Schema", "React", "Traceability", "Data Modeling"],
    features: [
      "Source-first event and claim modeling",
      "JSON Schema and semantic validation layers",
      "Read-only React projection viewer",
      "Anti-bleed boundaries between context and evidence",
    ],
    complexity: "Advanced",
    status: "Active development",
    url: "#",
    highlights: [
      "Source-first traceability",
      "Deterministic documentation model",
      "Active development",
    ],
  },
  {
    id: "kctl",
    category: "Developer Tooling",
    date: "2026",
    title: "kctl",
    description:
      "Local control plane for running staged, verifiable AI-assisted development workflows across repositories.",
    techStack: ["Python", "Developer Tooling", "Automation", "CI", "Agent Workflows"],
    features: [
      "YAML execution plans for staged development runs",
      "Verification gates and review passes",
      "Durable run logs and structured artifacts",
      "Multi-repository workflow coordination",
    ],
    complexity: "Advanced",
    status: "Active development",
    url: "https://github.com/kareemsasa/kctl",
    githubUrl: "https://github.com/kareemsasa/kctl",
    highlights: [
      "Planned agent-assisted development runs",
      "Verifiable local workflow control",
      "Active development",
    ],
  },
  {
    id: "operating-system-audit",
    category: "Systems Infrastructure",
    date: "2026",
    title: "Operating System Audit",
    description:
      "Read-only OS snapshot and diff tool for detecting configuration, network, identity, persistence, and execution drift.",
    techStack: ["Go", "Bash", "Security", "Systems", "CLI"],
    features: [
      "Read-only operating system snapshots",
      "Snapshot diffs for visible drift over time",
      "Configuration, network, identity, and persistence checks",
      "Cross-platform CLI with embedded collectors",
    ],
    complexity: "Advanced",
    status: "Demo-ready",
    url: "https://github.com/kareemsasa/operating-system-audit",
    githubUrl: "https://github.com/kareemsasa/operating-system-audit",
    highlights: [
      "Read-only OS drift detection",
      "Deterministic snapshot comparisons",
      "Demo-ready CLI",
    ],
  },
];
