import { createRequire } from "node:module";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const tempRoot = resolve(projectRoot, "node_modules/.cache/ai-context-generator");
const publicRoot = resolve(projectRoot, "public");
const publicAiRoot = resolve(publicRoot, "ai");

const sourceFiles = [
  "src/data/siteContent.ts",
  "src/data/projects.ts",
  "src/data/caseStudies.ts",
  "src/data/workExperience.ts",
  "src/data/routeMetadata.ts",
  "src/data/structuredData.ts",
  "src/data/navigation.ts",
  "src/data/aiContext.ts",
];

const markdownList = (items) => items.map((item) => `- ${cleanText(item)}`).join("\n");

const cleanText = (value) =>
  String(value)
    .replaceAll("→", "->")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("—", "-")
    .replace(/\s+/g, " ")
    .trim();

const stripMailto = (url) => url.replace(/^mailto:/, "");

const absoluteUrl = (siteUrl, path) =>
  path.startsWith("http") ? path : `${siteUrl}${path}`;

const compileSourceFiles = async () => {
  await rm(tempRoot, { recursive: true, force: true });

  await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const sourcePath = resolve(projectRoot, sourceFile);
      const source = await readFile(sourcePath, "utf8");
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
          importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
        },
        fileName: sourcePath,
      });

      const output = transpiled.outputText.replace(
        /(from\s+["'])(\.[^"']+?)(["'])/g,
        "$1$2.mjs$3"
      );
      const outputPath = resolve(
        tempRoot,
        relative(projectRoot, sourceFile).replace(/\.ts$/, ".mjs")
      );

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output, "utf8");
    })
  );
};

const loadData = async () => {
  await compileSourceFiles();

  const importCompiled = (sourceFile) =>
    import(pathToFileURL(resolve(tempRoot, sourceFile.replace(/\.ts$/, ".mjs"))));

  const [
    siteContent,
    projects,
    caseStudies,
    workExperience,
    routeMetadata,
    structuredData,
    navigation,
    aiContext,
  ] = await Promise.all(sourceFiles.map(importCompiled));

  return {
    siteContent,
    projects,
    caseStudies,
    workExperience,
    routeMetadata,
    structuredData,
    navigation,
    aiContext,
  };
};

const projectRepositoryStatus = (project) => {
  if (!project.githubUrl) return "not-public";
  if (project.githubUrl.includes("github.com/kareemsasa3")) {
    return "public-legacy-account";
  }
  return "public";
};

const buildContext = ({
  siteContent,
  projects,
  caseStudies,
  workExperience,
  routeMetadata,
  structuredData,
  navigation,
  aiContext,
}) => {
  const { SITE_URL, sitemapRouteMetadata } = routeMetadata;
  const caseStudyByProjectId = new Map(
    caseStudies.caseStudiesData.map((caseStudy) => [caseStudy.projectId, caseStudy])
  );
  const canonicalRoutes = sitemapRouteMetadata.map((route) => ({
    path: route.canonicalPath,
    url: absoluteUrl(SITE_URL, route.canonicalPath),
    title: route.title,
    description: route.description,
  }));
  const navigationRoutes = navigation.navItems.map((item) => ({
    path: item.path,
    label: item.label,
  }));
  const publicContactChannels = siteContent.socialContent.links.map((link) => ({
    name: link.name,
    url: link.url,
    value: link.url.startsWith("mailto:") ? stripMailto(link.url) : link.url,
  }));

  const projectSummaries = projects.projectsData.map((project) => {
    const caseStudy = caseStudyByProjectId.get(project.id);
    const repositoryStatus = projectRepositoryStatus(project);

    return {
      id: project.id,
      title: project.title,
      category: project.category,
      status: project.status,
      date: project.date,
      summary: cleanText(project.description),
      technologies: project.techStack,
      highlights: project.highlights.map(cleanText),
      features: project.features.map(cleanText),
      canonicalUrl: caseStudy
        ? absoluteUrl(SITE_URL, `/case-studies/${caseStudy.slug}`)
        : absoluteUrl(SITE_URL, "/projects"),
      caseStudyUrl: caseStudy
        ? absoluteUrl(SITE_URL, `/case-studies/${caseStudy.slug}`)
        : null,
      repositoryUrl: project.githubUrl ?? null,
      repositoryStatus,
      publicEvidence:
        repositoryStatus === "not-public"
          ? "No public repository is listed. Treat public site copy as a sanitized summary."
          : "Public repository link is listed by the site.",
    };
  });

  const caseStudySummaries = caseStudies.caseStudiesData.map((caseStudy) => ({
    slug: caseStudy.slug,
    projectId: caseStudy.projectId,
    title: caseStudy.title,
    url: absoluteUrl(SITE_URL, `/case-studies/${caseStudy.slug}`),
    summary: cleanText(caseStudy.shortDescription),
    focusAreas: caseStudy.focusAreas,
    publicEvidence: caseStudy.artifacts.map((artifact) => ({
      title: artifact.title,
      kind: artifact.kind,
      status: artifact.status,
      description: cleanText(artifact.description),
      href: artifact.href ?? null,
      note: artifact.note ? cleanText(artifact.note) : null,
    })),
  }));

  const capabilitySummaries = siteContent.capabilitiesContent.items.map((item) => ({
    title: item.title,
    description: cleanText(item.description),
  }));

  const skillsByCategory = siteContent.skillCategories.map((category) => ({
    category,
    skills: siteContent.skills
      .filter((skill) => skill.category === category)
      .map((skill) => skill.name),
  }));

  const workSummaries = workExperience.workExperienceData.map((entry) => ({
    id: entry.id,
    type: entry.type,
    company: entry.company,
    role: entry.role,
    dates: entry.dates,
    summary: entry.description.map(cleanText),
    technologies: entry.techStack,
    highlights: entry.highlights?.map(cleanText) ?? [],
  }));

  return {
    schemaVersion: "1.0",
    manifestVersion: aiContext.aiContextManifestVersion,
    identity: {
      name: aiContext.aiContextPolicy.subject.name,
      canonicalUrl: aiContext.aiContextPolicy.subject.canonicalUrl,
      publicRole: aiContext.aiContextPolicy.subject.publicRole,
      sameAs: structuredData.structuredDataGraph["@graph"].find(
        (entry) => entry["@id"] === `${SITE_URL}/#person`
      )?.sameAs ?? [],
    },
    site: {
      url: SITE_URL,
      purpose: aiContext.aiContextPolicy.site.purpose,
      language: aiContext.aiContextPolicy.site.language,
      audience: [...aiContext.aiContextPolicy.site.audience],
    },
    canonicalRoutes,
    navigationRoutes,
    summary: {
      headline: cleanText(siteContent.heroContent.subtitle),
      description: cleanText(siteContent.heroContent.description),
      proof: siteContent.heroProofContent.map((item) => ({
        label: item.label,
        value: item.value,
        detail: cleanText(item.detail),
      })),
    },
    capabilities: capabilitySummaries,
    skillsByCategory,
    projects: projectSummaries,
    caseStudies: caseStudySummaries,
    work: workSummaries,
    contactPolicy: {
      summary: aiContext.aiContextPolicy.contactPolicy.summary,
      publicChannels: publicContactChannels,
      disallowedAssumptions: [
        ...aiContext.aiContextPolicy.contactPolicy.disallowedAssumptions,
      ],
    },
    assistantPolicy: {
      guidance: [...aiContext.aiContextPolicy.assistantGuidance],
      doNotInfer: [...aiContext.aiContextPolicy.doNotInfer],
      publicSafeSummaryRules: [
        ...aiContext.aiContextPolicy.publicSafeSummaryRules,
      ],
    },
    sourceFiles: [...aiContext.aiContextSourceFiles],
  };
};

const renderLlmsTxt = (context) => {
  const primaryRoutes = context.canonicalRoutes.filter((route) =>
    ["/", "/projects", "/case-studies", "/experience"].includes(route.path)
  );

  return `# Kareem Sasa

Kareem Sasa is a systems engineer and consultant. This site is a public portfolio, project archive, case-study surface, and professional contact surface.

Canonical site: ${context.site.url}

## Primary Pages

${primaryRoutes
  .map((route) => `- [${route.title}](${route.url}): ${cleanText(route.description)}`)
  .join("\n")}

## AI Context Files

- [Public context](${context.site.url}/ai/context.md)
- [Projects](${context.site.url}/ai/projects.md)
- [Capabilities](${context.site.url}/ai/capabilities.md)
- [Contact policy](${context.site.url}/ai/contact-policy.md)
- [Site manifest JSON](${context.site.url}/ai/site-manifest.json)

## Assistant Guidance

${markdownList(context.assistantPolicy.guidance)}

## Do Not Infer

${markdownList(context.assistantPolicy.doNotInfer)}

## Contact

Use only public channels listed by the site:

${context.contactPolicy.publicChannels
  .map((channel) => `- ${channel.name}: ${channel.value}`)
  .join("\n")}
`;
};

const renderContextMd = (context) => `# Public AI Context

## Identity

${context.identity.name} is a ${context.identity.publicRole}. ${context.summary.headline}

${context.summary.description}

Canonical site: ${context.identity.canonicalUrl}

## Site Purpose

${context.site.purpose}

## Public Proof Surface

${context.summary.proof
  .map((item) => `- ${item.label}: ${item.value} - ${item.detail}`)
  .join("\n")}

## Canonical Pages

${context.canonicalRoutes
  .map((route) => `- [${route.title}](${route.url}): ${cleanText(route.description)}`)
  .join("\n")}

## Assistant Guidance

${markdownList(context.assistantPolicy.guidance)}

## Do Not Infer

${markdownList(context.assistantPolicy.doNotInfer)}
`;

const renderProjectsMd = (context) => `# Public Projects Context

Prefer canonical project and case-study pages when describing specific work. Do not manufacture repository links or imply private work is public.

${context.projects
  .map(
    (project) => `## ${project.title}

- Category: ${project.category}
- Status: ${project.status}
- Date: ${project.date}
- Canonical URL: ${project.canonicalUrl}
- Repository status: ${project.repositoryStatus}
${project.repositoryUrl ? `- Repository: ${project.repositoryUrl}\n` : ""}- Summary: ${project.summary}
- Public evidence: ${project.publicEvidence}
- Technologies: ${project.technologies.join(", ")}
- Highlights: ${project.highlights.join("; ")}
`
  )
  .join("\n")}
## Case Studies

${context.caseStudies
  .map(
    (caseStudy) => `- [${caseStudy.title}](${caseStudy.url}): ${caseStudy.summary} Focus areas: ${caseStudy.focusAreas.join(", ")}.`
  )
  .join("\n")}
`;

const renderCapabilitiesMd = (context) => `# Public Capabilities Context

These capabilities are derived from the public portfolio copy and project evidence. Keep summaries conservative.

## Capabilities

${context.capabilities
  .map((capability) => `- ${capability.title}: ${capability.description}`)
  .join("\n")}

## Skills

${context.skillsByCategory
  .map((group) => `- ${group.category}: ${group.skills.join(", ")}`)
  .join("\n")}

## Public Work Themes

${context.work
  .map((entry) => `- ${entry.role}, ${entry.company} (${entry.dates}): ${entry.highlights.join(", ")}`)
  .join("\n")}
`;

const renderContactPolicyMd = (context) => `# Contact Policy For AI Assistants

${context.contactPolicy.summary}

## Public Contact Channels

${context.contactPolicy.publicChannels
  .map((channel) => `- ${channel.name}: ${channel.value}`)
  .join("\n")}

## Do Not Assume

${markdownList(context.contactPolicy.disallowedAssumptions)}

## Public-Safe Summary Rules

${markdownList(context.assistantPolicy.publicSafeSummaryRules)}
`;

const writeGeneratedFiles = async (context) => {
  await mkdir(publicAiRoot, { recursive: true });

  const files = [
    ["llms.txt", renderLlmsTxt(context)],
    ["ai/context.md", renderContextMd(context)],
    ["ai/projects.md", renderProjectsMd(context)],
    ["ai/capabilities.md", renderCapabilitiesMd(context)],
    ["ai/contact-policy.md", renderContactPolicyMd(context)],
    ["ai/site-manifest.json", `${JSON.stringify(context, null, 2)}\n`],
  ];

  await Promise.all(
    files.map(([relativePath, content]) =>
      writeFile(resolve(publicRoot, relativePath), `${content.trim()}\n`, "utf8")
    )
  );
};

const main = async () => {
  const data = await loadData();
  const context = buildContext(data);
  await writeGeneratedFiles(context);
  console.log("Generated AI context artifacts.");
};

await main();
