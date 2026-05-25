export type SimulationPreviewType = "snake" | "spider" | "rhythm-lab" | "placeholder";

export interface SimulationData {
  id: string;
  title: string;
  description: string;
  path: string;
  previewType: SimulationPreviewType;
  isAvailable: boolean;
  modeLabel?: string;
  statusLabel?: string;
  githubUrl?: string;
  externalUrl?: string;
}

export const simulationsData: SimulationData[] = [
  {
    id: "traffic-simulator",
    title: "Traffic Simulator",
    description:
      "Multi-lane traffic flow model with signal timing, vehicle queuing, and throughput visualization. Explores how local rules produce system-wide congestion and coordination.",
    path: "/simulations/traffic-simulator",
    previewType: "placeholder",
    isAvailable: false,
    statusLabel: "In development",
    // TODO: add githubUrl/externalUrl once the traffic-simulator repo is published, then set isAvailable: true
  },
  {
    id: "orbital-simulator",
    title: "Orbital Simulator",
    description:
      "Gravitational dynamics engine for exploring planetary orbits, stellar masses, scale, and multi-body interaction.",
    path: "/simulations/orbital-simulator",
    previewType: "placeholder",
    isAvailable: false,
    statusLabel: "Planned",
  },
  {
    id: "rhythm-lab",
    title: "Rhythm Lab",
    description:
      "Three-lane input timing system with chart authoring, recording sessions, real-time feedback scoring, and run analytics. Models rhythm as structured state with precision windows.",
    path: "/simulations/rhythm-lab",
    previewType: "rhythm-lab",
    isAvailable: true,
    modeLabel: "Fullscreen prototype",
  },
  {
    id: "snake",
    title: "Snake",
    description:
      "Discrete grid simulation with wrap-around topology, state-driven growth mechanics, and collision detection. A minimal system with clear rules and emergent difficulty.",
    path: "/simulations/snake",
    previewType: "snake",
    isAvailable: true,
  },
  {
    id: "spider-solitaire",
    title: "Spider Solitaire",
    description:
      "Constraint-based card sequencing system with tableau state management, multi-column drag validation, and completion detection.",
    path: "/simulations/spider",
    previewType: "spider",
    isAvailable: true,
  },
];
