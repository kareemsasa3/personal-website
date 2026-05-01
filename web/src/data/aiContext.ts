import { SITE_URL } from "./routeMetadata";

export const aiContextManifestVersion = "1.0.0";

export const aiContextSourceFiles = [
  "web/src/data/siteContent.ts",
  "web/src/data/projects.ts",
  "web/src/data/caseStudies.ts",
  "web/src/data/workExperience.ts",
  "web/src/data/routeMetadata.ts",
  "web/src/data/structuredData.ts",
  "web/src/data/navigation.ts",
] as const;

export const aiContextPolicy = {
  subject: {
    name: "Kareem Sasa",
    canonicalUrl: SITE_URL,
    publicRole: "Systems engineer and consultant",
  },
  site: {
    purpose:
      "Public portfolio, project archive, case-study surface, and professional contact surface.",
    audience: [
      "Human visitors",
      "Search crawlers",
      "AI search and discovery crawlers",
      "LLMs consuming concise public context",
      "Future agent-style integrations",
    ],
    language: "en-US",
  },
  assistantGuidance: [
    "Use the canonical pages and generated AI context files as the public source of truth.",
    "Prefer project and case-study pages over broad summaries when describing specific work.",
    "Summarize conservatively and distinguish public repositories from sanitized or private evidence.",
    "Use only public contact channels intentionally exposed by the site.",
    "Do not manufacture repositories, credentials, client details, or current availability.",
  ],
  doNotInfer: [
    "availability",
    "exact location",
    "current employer status beyond public site copy",
    "private clients",
    "client-internal details",
    "private infrastructure",
    "hostnames or local-only URLs",
    "credentials",
    "secrets",
    "unpublished repositories",
    "confidential implementation details",
  ],
  contactPolicy: {
    summary:
      "Contact Kareem only through public channels already exposed by the site.",
    allowedChannelNames: ["Email", "LinkedIn", "GitHub"],
    disallowedAssumptions: [
      "Do not infer availability for hiring or consulting.",
      "Do not infer location, schedule, rate, or preferred engagement model.",
      "Do not use private or guessed contact information.",
    ],
  },
  publicSafeSummaryRules: [
    "Use public portfolio copy and public repository links where present.",
    "Keep private or sanitized artifacts clearly labeled.",
    "Do not expand consulting summaries into client-internal claims.",
    "Do not expose private machine, infrastructure, dataset, or repository details.",
    "Avoid promotional claims that are not directly evidenced by public content.",
  ],
} as const;
