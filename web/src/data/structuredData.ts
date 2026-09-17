import {
  caseStudiesData,
  caseStudyBySlug,
  type CaseStudy,
} from "./caseStudies";
import { projectsData, type Project } from "./projects";
import { articlesData, articleBySlug, type Article } from "./generated/articles";
import { socialContent } from "./siteContent";
import {
  SITE_URL,
  DEFAULT_IMAGE_URL,
  defaultRouteMetadata,
  routeMetadataByPath,
} from "./routeMetadata";

type StructuredDataNode = Record<string, unknown>;

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const HOMEPAGE_WEBPAGE_ID = `${SITE_URL}/#webpage`;

const publicProfileLinks = socialContent.links
  .filter((link) => !link.url.startsWith("mailto:"))
  .map((link) => link.url);

const normalizePathname = (pathname: string) => {
  const pathWithoutQuery = pathname.split(/[?#]/)[0] || "/";

  if (pathWithoutQuery === "/") {
    return pathWithoutQuery;
  }

  return pathWithoutQuery.replace(/\/+$/, "");
};

const getCanonicalPath = (pathname: string) => {
  const normalizedPath = normalizePathname(pathname);
  return (
    routeMetadataByPath[normalizedPath] ?? defaultRouteMetadata
  ).canonicalPath;
};

const getCanonicalUrl = (canonicalPath: string) => `${SITE_URL}${canonicalPath}`;

const graph = (nodes: StructuredDataNode[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});

const createPersonEntry = (): StructuredDataNode => ({
  "@type": "Person",
  "@id": PERSON_ID,
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
  mainEntityOfPage: { "@id": HOMEPAGE_WEBPAGE_ID },
});

const createWebSiteEntry = (): StructuredDataNode => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "Kareem Sasa",
  url: SITE_URL,
  description:
    "Portfolio and case studies for Kareem Sasa, a systems engineer focused on backend, Linux infrastructure, and operational tooling.",
  author: { "@id": PERSON_ID },
  inLanguage: "en-US",
});

const createWebPageEntry = (
  canonicalPath: string,
  options: {
    type?: string | string[];
    mainEntity?: StructuredDataNode;
    hasPart?: StructuredDataNode[];
  } = {}
): StructuredDataNode => {
  const metadata = routeMetadataByPath[canonicalPath] ?? defaultRouteMetadata;
  const canonicalUrl = getCanonicalUrl(metadata.canonicalPath);

  return {
    "@type": options.type ?? "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: metadata.title,
    description: metadata.description,
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": PERSON_ID },
    inLanguage: "en-US",
    ...(options.mainEntity ? { mainEntity: options.mainEntity } : {}),
    ...(options.hasPart ? { hasPart: options.hasPart } : {}),
  };
};

const createBreadcrumbList = (
  canonicalPath: string,
  items: Array<{ name: string; path: string }>
): StructuredDataNode => ({
  "@type": "BreadcrumbList",
  "@id": `${getCanonicalUrl(canonicalPath)}#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: getCanonicalUrl(item.path),
  })),
});

const createSoftwareSourceCodeEntry = (project: Project): StructuredDataNode => ({
  "@type": "SoftwareSourceCode",
  "@id": `${SITE_URL}/projects#${project.id}`,
  name: project.title,
  description: project.description,
  codeRepository: project.githubUrl,
  url: project.githubUrl,
  programmingLanguage: project.techStack,
  author: { "@id": PERSON_ID },
});

const createCaseStudyEntry = (caseStudy: CaseStudy): StructuredDataNode => ({
  "@type": "CreativeWork",
  "@id": `${SITE_URL}/case-studies/${caseStudy.slug}#case-study`,
  name: `${caseStudy.title} Case Study`,
  headline: `${caseStudy.title} Case Study`,
  description: caseStudy.shortDescription,
  url: `${SITE_URL}/case-studies/${caseStudy.slug}`,
  author: { "@id": PERSON_ID },
  about: caseStudy.focusAreas,
});

const createArticleEntry = (article: Article): StructuredDataNode => ({
  "@type": "Article",
  "@id": `${SITE_URL}/writing/${article.slug}#article`,
  headline: article.title,
  ...(article.subtitle ? { alternativeHeadline: article.subtitle } : {}),
  description: article.description,
  datePublished: article.published,
  wordCount: article.wordCount,
  url: `${SITE_URL}/writing/${article.slug}`,
  author: { "@id": PERSON_ID },
  inLanguage: "en-US",
  ...(article.series
    ? {
        isPartOf: {
          "@type": "CreativeWorkSeries",
          name: article.series.name,
          url: `${SITE_URL}/writing`,
        },
        position: article.series.part,
      }
    : {}),
});

const baseEntries = () => [createPersonEntry(), createWebSiteEntry()];

const publicProjectEntries = () =>
  projectsData
    .filter((project) => Boolean(project.githubUrl))
    .map(createSoftwareSourceCodeEntry);

const projectForCaseStudy = (caseStudy: CaseStudy) =>
  projectsData.find((project) => project.id === caseStudy.projectId);

const createHomepageGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/", {
      type: ["ProfilePage", "WebPage"],
      mainEntity: { "@id": PERSON_ID },
    }),
  ]);

const createProjectsGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/projects"),
    createBreadcrumbList("/projects", [
      { name: "Home", path: "/" },
      { name: "Projects", path: "/projects" },
    ]),
    ...publicProjectEntries(),
  ]);

const createCaseStudiesIndexGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/case-studies", {
      hasPart: caseStudiesData.map((caseStudy) => ({
        "@id": `${SITE_URL}/case-studies/${caseStudy.slug}#webpage`,
      })),
    }),
    createBreadcrumbList("/case-studies", [
      { name: "Home", path: "/" },
      { name: "Case Studies", path: "/case-studies" },
    ]),
  ]);

const createCaseStudyGraph = (caseStudy: CaseStudy) => {
  const project = projectForCaseStudy(caseStudy);
  const sourceCodeEntry = project?.githubUrl
    ? [createSoftwareSourceCodeEntry(project)]
    : [];
  const caseStudyPath = `/case-studies/${caseStudy.slug}`;
  const caseStudyEntry = createCaseStudyEntry(caseStudy);

  return graph([
    ...baseEntries(),
    createWebPageEntry(caseStudyPath, {
      mainEntity: { "@id": `${SITE_URL}${caseStudyPath}#case-study` },
    }),
    createBreadcrumbList(caseStudyPath, [
      { name: "Home", path: "/" },
      { name: "Case Studies", path: "/case-studies" },
      { name: caseStudy.title, path: caseStudyPath },
    ]),
    caseStudyEntry,
    ...sourceCodeEntry,
  ]);
};

const createWritingIndexGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/writing", {
      type: ["CollectionPage", "WebPage"],
      hasPart: articlesData.map((article) => ({
        "@id": `${SITE_URL}/writing/${article.slug}#webpage`,
      })),
    }),
    createBreadcrumbList("/writing", [
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing" },
    ]),
  ]);

const createArticleGraph = (article: Article) => {
  const articlePath = `/writing/${article.slug}`;

  return graph([
    ...baseEntries(),
    createWebPageEntry(articlePath, {
      mainEntity: { "@id": `${SITE_URL}${articlePath}#article` },
    }),
    createBreadcrumbList(articlePath, [
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing" },
      { name: article.title, path: articlePath },
    ]),
    createArticleEntry(article),
  ]);
};

const createExperienceGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/experience"),
    createBreadcrumbList("/experience", [
      { name: "Home", path: "/" },
      { name: "Experience", path: "/experience" },
    ]),
  ]);

const createSimulationsGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/simulations"),
    createBreadcrumbList("/simulations", [
      { name: "Home", path: "/" },
      { name: "Simulations", path: "/simulations" },
    ]),
  ]);

const createSimulationDetailGraph = (
  canonicalPath: "/simulations/snake" | "/simulations/spider" | "/simulations/rhythm-lab",
  simulationName: string
) =>
  graph([
    ...baseEntries(),
    createWebPageEntry(canonicalPath),
    createBreadcrumbList(canonicalPath, [
      { name: "Home", path: "/" },
      { name: "Simulations", path: "/simulations" },
      { name: simulationName, path: canonicalPath },
    ]),
  ]);

const createTerminalGraph = () =>
  graph([
    ...baseEntries(),
    createWebPageEntry("/terminal"),
    createBreadcrumbList("/terminal", [
      { name: "Home", path: "/" },
      { name: "Terminal", path: "/terminal" },
    ]),
  ]);

const createDefaultRouteGraph = (pathname: string) => {
  const canonicalPath = getCanonicalPath(pathname);

  if (canonicalPath === "/") return createHomepageGraph();
  if (canonicalPath === "/projects") return createProjectsGraph();
  if (canonicalPath === "/case-studies") return createCaseStudiesIndexGraph();
  if (canonicalPath === "/writing") return createWritingIndexGraph();
  if (canonicalPath === "/experience") return createExperienceGraph();
  if (canonicalPath === "/simulations") return createSimulationsGraph();
  if (canonicalPath === "/simulations/snake") {
    return createSimulationDetailGraph("/simulations/snake", "Snake");
  }
  if (canonicalPath === "/simulations/spider") {
    return createSimulationDetailGraph("/simulations/spider", "Spider Solitaire");
  }
  if (canonicalPath === "/simulations/rhythm-lab") {
    return createSimulationDetailGraph("/simulations/rhythm-lab", "Rhythm Lab");
  }
  if (canonicalPath === "/terminal") return createTerminalGraph();

  return graph([...baseEntries(), createWebPageEntry(canonicalPath)]);
};

export const getStructuredDataGraph = (pathname: string) => {
  const canonicalPath = getCanonicalPath(pathname);
  const caseStudyMatch = canonicalPath.match(/^\/case-studies\/([^/]+)$/);

  if (caseStudyMatch) {
    const caseStudy = caseStudyBySlug[caseStudyMatch[1]];

    if (caseStudy) {
      return createCaseStudyGraph(caseStudy);
    }
  }

  const articleMatch = canonicalPath.match(/^\/writing\/([^/]+)$/);

  if (articleMatch) {
    const article = articleBySlug[articleMatch[1]];

    if (article) {
      return createArticleGraph(article);
    }
  }

  return createDefaultRouteGraph(canonicalPath);
};

export const getStructuredDataJson = (pathname: string) =>
  JSON.stringify(getStructuredDataGraph(pathname));

export const structuredDataGraph = getStructuredDataGraph("/");

export const structuredDataJson = getStructuredDataJson("/");
