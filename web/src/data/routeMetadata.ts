import { caseStudiesData } from "./caseStudies";
import { articlesData } from "./generated/articles";

export const SITE_URL = "https://kareemsasa.dev";
export const DEFAULT_IMAGE_URL = `${SITE_URL}/og-image.png`;
export const DEFAULT_IMAGE_ALT = "Kareem Sasa logo";

export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  canonicalPath: string;
  sitemap?: {
    changefreq: "weekly" | "monthly";
    priority: string;
  };
}

const experienceDescription =
  "Professional experience across consulting, platform modernization, frontend stabilization, and backend architecture for business-critical software.";

const staticRouteMetadata: RouteMetadata[] = [
  {
    path: "/",
    title: "Kareem Sasa - Systems Engineer",
    description:
      "Systems engineer and consultant building production software across backend, Linux infrastructure, and operational tooling.",
    canonicalPath: "/",
    sitemap: { changefreq: "weekly", priority: "1.0" },
  },
  {
    path: "/projects",
    title: "Projects - Kareem Sasa",
    description:
      "Complete roster of Kareem Sasa's systems and tools, with links to case studies documenting problems, constraints, and engineering decisions.",
    canonicalPath: "/projects",
    sitemap: { changefreq: "weekly", priority: "0.6" },
  },
  {
    path: "/case-studies",
    title: "Case Studies - Kareem Sasa",
    description:
      "Engineering case studies documenting system architecture, constraints, and implementation decisions across flagship projects.",
    canonicalPath: "/case-studies",
    sitemap: { changefreq: "weekly", priority: "0.8" },
  },
  {
    path: "/writing",
    title: "Writing - Kareem Sasa",
    description:
      "Long-form essays and field notes on constraints, coordination, and systems that can explain themselves — each published with its sources and verification record.",
    canonicalPath: "/writing",
    sitemap: { changefreq: "monthly", priority: "0.8" },
  },
  {
    path: "/experience",
    title: "Experience - Kareem Sasa",
    description: experienceDescription,
    canonicalPath: "/experience",
    sitemap: { changefreq: "weekly", priority: "0.8" },
  },
  {
    path: "/work",
    title: "Experience - Kareem Sasa",
    description: experienceDescription,
    canonicalPath: "/experience",
  },
  {
    path: "/journey",
    title: "Engineering Journey - Kareem Sasa",
    description:
      "Background behind the work: the experiences and turning points that shaped how Kareem Sasa approaches software engineering.",
    canonicalPath: "/journey",
    sitemap: { changefreq: "monthly", priority: "0.4" },
  },
  {
    path: "/simulations",
    title: "Simulations - Kareem Sasa",
    description:
      "Interactive systems exploring state, rules, feedback loops, and emergent behavior — built to model, visualize, and stress real dynamics.",
    canonicalPath: "/simulations",
    sitemap: { changefreq: "monthly", priority: "0.4" },
  },
  {
    path: "/simulations/snake",
    title: "Snake - Kareem Sasa",
    description:
      "Discrete grid simulation with wrap-around topology, state-driven growth mechanics, and collision detection.",
    canonicalPath: "/simulations/snake",
    sitemap: { changefreq: "monthly", priority: "0.3" },
  },
  {
    path: "/simulations/spider",
    title: "Spider Solitaire - Kareem Sasa",
    description:
      "Constraint-based card sequencing system with tableau state management, multi-column drag validation, and completion detection.",
    canonicalPath: "/simulations/spider",
    sitemap: { changefreq: "monthly", priority: "0.3" },
  },
  {
    path: "/simulations/rhythm-lab",
    title: "Rhythm Lab - Kareem Sasa",
    description:
      "Three-lane input timing system with chart authoring, recording sessions, real-time feedback scoring, and run analytics.",
    canonicalPath: "/simulations/rhythm-lab",
    sitemap: { changefreq: "monthly", priority: "0.3" },
  },
  {
    path: "/terminal",
    title: "Terminal - Kareem Sasa",
    description:
      "An interactive terminal layer for exploring portfolio content, projects, and work history through a command-driven interface.",
    canonicalPath: "/terminal",
    sitemap: { changefreq: "monthly", priority: "0.2" },
  },
] as const;

const caseStudyRouteMetadata: RouteMetadata[] = caseStudiesData.map((caseStudy) => ({
  path: `/case-studies/${caseStudy.slug}`,
  title: `${caseStudy.title} Case Study - Kareem Sasa`,
  description: caseStudy.shortDescription,
  canonicalPath: `/case-studies/${caseStudy.slug}`,
  sitemap: { changefreq: "monthly", priority: "0.8" },
}));

const articleRouteMetadata: RouteMetadata[] = articlesData.map((article) => ({
  path: `/writing/${article.slug}`,
  title: `${article.title} - Kareem Sasa`,
  description: article.description,
  canonicalPath: `/writing/${article.slug}`,
  sitemap: { changefreq: "monthly", priority: "0.7" },
}));

export const routeMetadata = [
  ...staticRouteMetadata,
  ...caseStudyRouteMetadata,
  ...articleRouteMetadata,
] as const;

export const defaultRouteMetadata = routeMetadata[0];

export const routeMetadataByPath = routeMetadata.reduce<Record<string, RouteMetadata>>(
  (metadataByPath, metadata) => {
    metadataByPath[metadata.path] = metadata;
    return metadataByPath;
  },
  {}
);

export const sitemapRouteMetadata = routeMetadata.filter(
  (metadata) => metadata.sitemap && metadata.path === metadata.canonicalPath
);
