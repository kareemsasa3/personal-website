import { projectsData, type Project } from "./projects";
import { workExperienceData, type WorkExperience } from "./workExperience";

// File content data for grep functionality
export interface FileContent {
  path: string;
  content: string[];
  description: string;
}

const bulletList = (items: string[]) => items.map((item) => `- ${item}`);

/** Terminal file name for an experience entry, e.g. "resolute consulting group". */
export const experienceFileName = (job: WorkExperience) => job.company.toLowerCase();

/** Terminal README for a project, derived from the canonical Projects data. */
export const projectReadmeLines = (project: Project): string[] => [
  `# ${project.title}`,
  "",
  project.shortDescription,
  "",
  `**Status:** ${project.status}`,
  `**Category:** ${project.category}`,
  `**Started:** ${project.date}`,
  `**Repository:** ${project.githubUrl ?? "Private repository"}`,
  "",
  "## Overview",
  project.description,
  "",
  "## Features",
  ...bulletList(project.features),
  "",
  "## Technologies",
  `- ${project.techStack.join(", ")}`,
  "",
  "## Highlights",
  ...bulletList(project.highlights),
];

/** Terminal file for an experience entry, derived from the canonical Experience data. */
export const experienceLines = (job: WorkExperience): string[] => [
  `# ${job.role} - ${job.company}`,
  "",
  `**Duration:** ${job.dates}`,
  ...(job.location ? [`**Location:** ${job.location}`] : []),
  "",
  "## Key Responsibilities",
  ...bulletList(job.description),
  "",
  "## Technologies Used",
  `- ${job.techStack.join(", ")}`,
  ...(job.projects?.length ? ["", "## Notable Engagements", ...bulletList(job.projects)] : []),
  ...(job.highlights?.length ? ["", "## Focus Areas", ...bulletList(job.highlights)] : []),
];

/** Approximate `ls -l` size for generated terminal files. */
export const terminalFileSize = (lines: string[]) =>
  `${(new TextEncoder().encode(lines.join("\n")).length / 1024).toFixed(1)}K`;

const webProject = projectsData.find((project) => project.id === "web");

const projectReadmeFiles: FileContent[] = projectsData
  .filter((project) => project.id !== "web")
  .map((project) => ({
    path: `projects/${project.id}/README.md`,
    content: projectReadmeLines(project),
    description: `${project.title}: ${project.shortDescription}`,
  }));

const experienceFiles: FileContent[] = workExperienceData.map((job) => ({
  path: `experience/${experienceFileName(job)}`,
  content: experienceLines(job),
  description: `${job.role} at ${job.company}, ${job.dates}`,
}));

export const fileContents: FileContent[] = [
  {
    path: "projects/web/README.md",
    content: [
      ...(webProject ? projectReadmeLines(webProject) : ["# Personal Website"]),
      "",
      "## Architecture",
      "Portfolio content is driven from centralized data sources for homepage, projects, work experience, and terminal content.",
      "The terminal uses a virtual file system plus file-content lookup so visitors can inspect portfolio material through command interactions.",
      "",
      "## Development",
      "Built with modern React patterns including hooks, context, portals, and route-based lazy loading.",
      "The terminal window and overlays are managed separately from page routes to preserve the interactive shell experience.",
    ],
    description:
      "Main project documentation for the web portfolio website",
  },
  {
    path: "projects/web/BUILD-OVERVIEW.md",
    content: [
      "# Build Overview",
      "",
      "This is an intentionally simplified project artifact, not a literal package manifest snapshot.",
      "",
      "## Runtime Stack",
      "- React 18",
      "- TypeScript",
      "- Vite",
      "- React Router",
      "- Framer Motion",
      "",
      "## Build & Validation",
      "- Development server for local iteration",
      "- Production build for static deployment",
      "- TypeScript no-emit validation",
      "",
      "## What This Artifact Is For",
      "- Summarizes the portfolio's frontend stack",
      "- Describes the delivery shape without pretending to be an exact lockstep repo file",
      "- Keeps terminal exploration useful without turning it into a stale source mirror",
      "",
      "For exact implementation details, use the live repository linked from the portfolio.",
    ],
    description: "Intentional artifact summarizing the portfolio build stack and delivery shape",
  },
  {
    path: "projects/web/src/components/Terminal/TERMINAL-ARCHITECTURE.md",
    content: [
      "# Terminal Architecture",
      "",
      "This is an architecture note for the portfolio terminal, not a verbatim source file.",
      "",
      "## Purpose",
      "The terminal is a secondary exploration layer that lets visitors inspect portfolio material through commands instead of standard page navigation.",
      "",
      "## Core Responsibilities",
      "- Render the terminal window and overlays",
      "- Execute command-driven navigation and content lookup",
      "- Bridge the virtual file system to route-aware portfolio sections",
      "- Preserve the terminal as a differentiator without making it the main proof surface",
      "",
      "## Supporting Pieces",
      "- `useTerminal` owns command execution and terminal state",
      "- `fileSystem` defines the inspectable terminal structure",
      "- `fileContents` provides curated artifact content for terminal files",
      "- Route navigation is delegated back into the app router when a directory represents a real page",
      "",
      "## Design Constraint",
      "Terminal artifacts are curated summaries. They should stay truthful to the portfolio narrative without pretending to be exact mirrored source files.",
      "",
      "## Current Position In The Portfolio",
      "Case Studies are the primary evidence surface; Projects is the complete roster.",
      "The terminal exists to add personality and technical texture after credibility is already established.",
    ],
    description:
      "Intentional architecture note describing how the portfolio terminal fits into the app",
  },
  ...projectReadmeFiles,
  ...experienceFiles,
  {
    path: "experience/freelance",
    content: [
      "# Freelance",
      "",
      "Independent and contract work is represented in the named consulting and tutoring roles elsewhere in this terminal profile.",
      "",
      "For the strongest current proof of work, review:",
      "- experience/resolute consulting group",
      "- projects/arachne",
      "- projects/web/README.md",
    ],
    description: "Pointer entry for contract and independent work represented elsewhere in the portfolio",
  },
  {
    path: "education/bachelor-degree",
    content: [
      "# Bachelor of Science in Computer Science",
      "",
      "Formal computer science training with emphasis on systems thinking, software engineering, and foundational problem solving.",
      "",
      "## Core Areas",
      "- Data structures and algorithms",
      "- Operating systems and computer architecture",
      "- Databases, networking, and software engineering",
      "- Applied programming and systems fundamentals",
      "",
      "The most relevant proof of current capability in this portfolio comes from shipped project work and consulting engagements rather than academic credentials alone.",
    ],
    description:
      "Computer science background supporting current systems and product engineering work",
  },
  {
    path: "about/skills",
    content: [
      "# Technical Skills",
      "",
      "## Programming Languages",
      "- **Python:** Systems tooling, automation, and infrastructure work",
      "- **Go:** Backend services and production-oriented pipelines",
      "- **TypeScript/JavaScript:** Frontend application architecture and interactive UI work",
      "- **Java/C#:** Enterprise application experience",
      "",
      "## Frontend & Product Experience",
      "- **React / Next.js:** Product interfaces, application flows, and interactive experiences",
      "- **TypeScript:** Maintainable UI architecture and safer cross-stack development",
      "- **Framer Motion / Vite:** Motion design and modern frontend tooling",
      "",
      "## Backend & Systems",
      "- **systemd / D-Bus / PipeWire:** Linux-native systems integration",
      "- **ASP.NET Core / Spring Boot / Node.js:** Business applications and service development",
      "- **SQLite FTS5 / PostgreSQL / MongoDB / Redis:** Storage, search, and operational data",
      "",
      "## Infrastructure & Delivery",
      "- **Docker / Kubernetes / Nginx:** Packaging, deployment, and runtime operations",
      "- **Azure / AWS / Pulumi:** Cloud and infrastructure delivery",
      "- **Observability and operational tooling:** Building for maintainability, traceability, and reliability",
    ],
    description: "Comprehensive list of technical skills and technologies",
  },
  {
    path: "about/personal-info",
    content: [
      "# Personal Information",
      "",
      "## About Me",
      "I'm a systems-focused software engineer working across backend, infrastructure, and product experience.",
      "My recent work spans consulting on business-critical platforms and building systems-oriented products like Erebus, Arachne, and Aether.",
      "",
      "## Professional Philosophy",
      "I care about software that behaves clearly under pressure.",
      "That means making state visible, decisions traceable, and operational complexity easier to reason about.",
      "",
      "## Work Style",
      "- **Systems-oriented:** I look for architecture, not just patches",
      "- **Cross-stack:** I move between backend, infrastructure, and frontend when the problem demands it",
      "- **Pragmatic:** I optimize for maintainability, clarity, and useful delivery",
      "- **Evidence-driven:** I prefer instrumentation and explicit models over guesswork",
      "",
      "## Current Focus",
      "- Event-driven system design",
      "- Linux-native tooling and coordination layers",
      "- Platform modernization and operational clarity",
      "- Interfaces that make complex workflows easier to trust",
      "",
      "For direct contact and external proof, use the GitHub and LinkedIn links from the main site.",
    ],
    description: "Personal background and professional philosophy",
  },
  {
    path: "about/interests",
    content: [
      "# Personal Interests & Hobbies",
      "",
      "## Technology & Innovation",
      "- **Systems software:** Event-driven tooling, observability, and Linux internals",
      "- **AI and research tooling:** Automation, reasoning quality, and searchable knowledge systems",
      "- **Side projects:** Building software that clarifies complex behavior instead of hiding it",
      "",
      "## Creative Work",
      "- **Interface design:** Presenting technical depth through clear product experience",
      "- **Documentation:** Explaining systems and workflows so others can reason about them quickly",
      "- **Simulations:** Interactive systems that model rules, state, and emergent behavior",
      "",
      "## Learning",
      "- **Reading:** Systems design, software architecture, and philosophy",
      "- **Iteration:** Improving projects through repeated real-world use and refinement",
      "- **Breadth with intent:** Exploring new tools when they solve concrete problems",
      "",
      "## Personal",
      "- Strategy games",
      "- Long-form technical thinking",
      "- Building things that are useful, inspectable, and durable",
    ],
    description: "Personal interests, hobbies, and community involvement",
  },
];

// Helper function to find file content by path
export const getFileContentByPath = (path: string): FileContent | null => {
  return (
    fileContents.find(
      (file) => file.path.toLowerCase() === path.toLowerCase()
    ) || null
  );
};

// Helper function to search file contents
export const searchFileContents = (
  searchTerm: string,
  caseSensitive: boolean = false
): FileContent[] => {
  const regex = new RegExp(searchTerm, caseSensitive ? "g" : "gi");

  return fileContents.filter((file) => {
    return file.content.some((line) => regex.test(line));
  });
};
