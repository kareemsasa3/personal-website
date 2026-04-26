import { caseStudiesData } from "./caseStudies";

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
      "Flagship systems and backend projects spanning Linux infrastructure, autonomous research workflows, and interactive product engineering.",
    canonicalPath: "/projects",
    sitemap: { changefreq: "weekly", priority: "0.9" },
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
    path: "/games",
    title: "Games & Experiments - Kareem Sasa",
    description:
      "Interactive experiments, gameplay ideas, and frontend exploration outside the main portfolio proof path.",
    canonicalPath: "/games",
    sitemap: { changefreq: "monthly", priority: "0.4" },
  },
  {
    path: "/games/snake",
    title: "Snake Game - Kareem Sasa",
    description:
      "A browser-based Snake implementation from the games and experiments section of Kareem Sasa's portfolio.",
    canonicalPath: "/games/snake",
    sitemap: { changefreq: "monthly", priority: "0.3" },
  },
  {
    path: "/games/spider",
    title: "Spider Solitaire - Kareem Sasa",
    description:
      "A browser-based Spider Solitaire implementation from the games and experiments section of Kareem Sasa's portfolio.",
    canonicalPath: "/games/spider",
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

export const routeMetadata = [
  ...staticRouteMetadata,
  ...caseStudyRouteMetadata,
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
