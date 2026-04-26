import { caseStudiesData } from "./caseStudies";
import { projectsData } from "./projects";
import { socialContent } from "./siteContent";
import { SITE_URL, DEFAULT_IMAGE_URL } from "./routeMetadata";

const publicProfileLinks = socialContent.links
  .filter((link) => !link.url.startsWith("mailto:"))
  .map((link) => link.url);

const publicProjectEntries = projectsData
  .filter((project) => project.githubUrl || project.liveUrl)
  .map((project) => ({
    "@type": "SoftwareSourceCode",
    "@id": `${SITE_URL}/projects#${project.id}`,
    name: project.title,
    description: project.description,
    codeRepository: project.githubUrl,
    url: project.liveUrl ?? project.githubUrl ?? `${SITE_URL}/projects`,
    programmingLanguage: project.techStack,
    author: { "@id": `${SITE_URL}/#person` },
  }));

const caseStudyEntries = caseStudiesData.map((caseStudy) => ({
  "@type": "CreativeWork",
  "@id": `${SITE_URL}/case-studies/${caseStudy.slug}#case-study`,
  name: `${caseStudy.title} Case Study`,
  headline: `${caseStudy.title} Case Study`,
  description: caseStudy.shortDescription,
  url: `${SITE_URL}/case-studies/${caseStudy.slug}`,
  author: { "@id": `${SITE_URL}/#person` },
  about: caseStudy.focusAreas,
}));

export const structuredDataGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Kareem Sasa",
      url: SITE_URL,
      image: DEFAULT_IMAGE_URL,
      jobTitle: "Systems Engineer",
      description:
        "Systems engineer and consultant building production software across backend, Linux infrastructure, and operational tooling.",
      sameAs: publicProfileLinks,
      knowsAbout: [
        "Backend systems",
        "Linux infrastructure",
        "Systems engineering",
        "Event-driven architecture",
        "Observability",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Kareem Sasa",
      url: SITE_URL,
      description:
        "Portfolio and case studies for Kareem Sasa, a systems engineer focused on backend, Linux infrastructure, and operational tooling.",
      author: { "@id": `${SITE_URL}/#person` },
      inLanguage: "en-US",
    },
    ...publicProjectEntries,
    ...caseStudyEntries,
  ],
} as const;

export const structuredDataJson = JSON.stringify(structuredDataGraph);
