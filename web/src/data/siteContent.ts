// Site-wide copy and content strings
// Centralized for easy updates without touching components

export const heroContent = {
    title: "Kareem Sasa",
    subtitle: "Systems engineer building production software for Linux, backend, and infrastructure-heavy products.",
    description: "I design event-driven systems, platform tooling, and interfaces that make complex behavior observable and easier to operate. Recent work includes a replayable Linux coordination layer and a production-oriented autonomous research platform.",
    cta: "Read Case Studies",
} as const;

export const featuredProjectIds = ["erebus", "arachne"] as const;

export const heroProofContent = [
  {
    label: "Current Work",
    value: "Lead Software Consultant",
    detail: "systems modernization and production reliability",
  },
  {
    label: "Core Focus",
    value: "Backend, Linux, Infrastructure",
    detail: "event-driven systems, observability, operational tooling",
  },
  {
    label: "Flagship Systems",
    value: "Erebus, Arachne, Aether",
    detail: "case studies with architecture and implementation decisions",
  },
] as const;

export const capabilitiesContent = {
    title: "How I Work",
    items: [
      {
        icon: "🧠",
        title: "Systems Architecture",
        description:
          "I design software around real operating conditions, failure boundaries, and long-term maintainability.",
      },
      {
        icon: "⚙️",
        title: "Event-Driven Design",
        description:
          "I model state from streams of system activity so behavior can be traced, replayed, and reasoned about later.",
      },
      {
        icon: "🔧",
        title: "Infrastructure Automation",
        description:
          "I build platform tooling and deployment workflows that reduce manual coordination and keep environments predictable.",
      },
      {
        icon: "📈",
        title: "Observability and Reliability",
        description:
          "I prioritize visibility, auditability, and operational clarity so production behavior is easier to understand under load.",
      },
    ],
} as const;

export const githubProfileUrl = "https://github.com/kareemsasa";

export const socialContent = {
    title: "Contact",
    links: [
      {
        name: "GitHub",
        url: githubProfileUrl,
        icon: "🐙",
      },
      {
        name: "LinkedIn",
        url: "https://linkedin.com/in/kareem-sasa",
        icon: "💼",
      },
      {
        name: "Email",
        url: "mailto:kareemsasa3@gmail.com",
        icon: "✉️",
      },
    ],
} as const;

export const professionalContactContent = {
  title: "Professional Inquiries",
  description:
    "For systems/platform engineering, backend modernization, Linux infrastructure, or production reliability work, reach out by email or LinkedIn.",
  primaryActionLabel: "Email Kareem",
  secondaryActionLabel: "Connect on LinkedIn",
} as const;

export const aboutContent = {
    title: capabilitiesContent.title,
    items: capabilitiesContent.items,
} as const;

export type SkillCategory =
  | "Languages"
  | "Backend"
  | "Infrastructure"
  | "Frontend"
  | "Tooling";

export interface SkillContentItem {
  name: string;
  icon: string;
  category: SkillCategory;
}

export const skills: readonly SkillContentItem[] = [
  { name: "TypeScript", icon: "TS", category: "Languages" },
  { name: "Go", icon: "Go", category: "Languages" },
  { name: "Python", icon: "Py", category: "Languages" },
  { name: "Node.js", icon: "JS", category: "Backend" },
  { name: "PostgreSQL", icon: "DB", category: "Backend" },
  { name: "Redis", icon: "RD", category: "Backend" },
  { name: "Docker", icon: "DK", category: "Infrastructure" },
  { name: "Linux", icon: "LX", category: "Infrastructure" },
  { name: "Nginx", icon: "NG", category: "Infrastructure" },
  { name: "React", icon: "Re", category: "Frontend" },
  { name: "CSS", icon: "CS", category: "Frontend" },
  { name: "GitHub Actions", icon: "CI", category: "Tooling" },
  { name: "Git", icon: "GT", category: "Tooling" },
] as const;

export const skillCategories: readonly SkillCategory[] = [
  "Languages",
  "Backend",
  "Infrastructure",
  "Frontend",
  "Tooling",
] as const;
