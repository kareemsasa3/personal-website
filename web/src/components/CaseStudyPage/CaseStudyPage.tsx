import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import TypeWriterText from "../TypeWriterText";
import { CaseStudy, CaseStudySectionId, sectionTitle } from "../../data/caseStudies";
import { projectsData } from "../../data/projects";
import ProjectMedia from "../ProjectMedia";
import CaseStudyBlocks from "./CaseStudyBlocks";
import { useLayoutContext, PageSection } from "../../contexts/LayoutContext";
import "./CaseStudyPage.css";

interface CaseStudyPageProps {
  caseStudy: CaseStudy;
}

const sectionDefinitions: PageSection[] = [
  { id: "hero", label: "Hero" },
  { id: "problem", label: "Problem" },
  { id: "constraints", label: "Constraints" },
  { id: "architecture", label: "Architecture" },
  { id: "decisions", label: "Decisions" },
  { id: "implementation", label: "Implementation" },
  { id: "outcome", label: "Outcome" },
  { id: "evidence", label: "Evidence" },
  { id: "links", label: "Links" },
];

const defaultConstraintTitles = ["Technical Constraints", "Environment", "Tradeoffs"] as const;

const CaseStudyPage = ({ caseStudy }: CaseStudyPageProps) => {
  const { setSections } = useLayoutContext();
  const sections = useMemo(
    () =>
      sectionDefinitions.map((section) => ({
        ...section,
        label: caseStudy.sectionTitles?.[section.id as CaseStudySectionId] ?? section.label,
      })),
    [caseStudy]
  );
  const constraintTitles = caseStudy.constraintTitles ?? defaultConstraintTitles;
  const before = (id: CaseStudySectionId) => <CaseStudyBlocks blocks={caseStudy.blocks?.[id]?.before} />;
  const after = (id: CaseStudySectionId) => <CaseStudyBlocks blocks={caseStudy.blocks?.[id]?.after} />;
  const media = projectsData.find(
    (project) => project.id === caseStudy.projectId
  )?.media;

  useEffect(() => {
    setSections(sections);
    return () => setSections([]);
  }, [sections, setSections]);

  return (
    <div className="page-content case-study-page">
      <div className="case-study-container">
        <section id="hero" className="case-study-hero interactive-card">
          <div className="case-study-breadcrumbs">
            <Link to="/case-studies">Case Studies</Link>
            <span>/</span>
            <span>{caseStudy.title}</span>
          </div>
          <header className="case-study-hero-copy">
            <p className="case-study-eyebrow">
              {caseStudy.kind === "experiment" ? "Experiment Case Study" : "Engineering Case Study"}
            </p>
            <h1 className="case-study-title">
              <TypeWriterText text={caseStudy.title} speed={60} />
            </h1>
            <p className="case-study-summary">{caseStudy.shortDescription}</p>
          </header>
          <div className="case-study-focus-list">
            {caseStudy.focusAreas.map((focusArea) => (
              <span key={focusArea} className="tech-tag">
                {focusArea}
              </span>
            ))}
          </div>
          {media && (
            <ProjectMedia
              media={media}
              label={caseStudy.slug}
              mode="video"
              className="case-study-hero-media"
            />
          )}
        </section>

        <section id="problem" className="case-study-section prose-surface">
          <h2>{sectionTitle(caseStudy, "problem", "Problem")}</h2>
          {before("problem")}
          <p>{caseStudy.problem}</p>
          {after("problem")}
        </section>

        <section id="constraints" className="case-study-section">
          <h2>{sectionTitle(caseStudy, "constraints", "Constraints")}</h2>
          {before("constraints")}
          <div className="case-study-grid case-study-constraints-grid">
            <article className="interactive-card">
              <h3>{constraintTitles[0]}</h3>
              <p>{caseStudy.constraints.technicalLimitations}</p>
            </article>
            <article className="interactive-card">
              <h3>{constraintTitles[1]}</h3>
              <p>{caseStudy.constraints.environment}</p>
            </article>
            <article className="interactive-card">
              <h3>{constraintTitles[2]}</h3>
              <p>{caseStudy.constraints.tradeoffs}</p>
            </article>
          </div>
          {after("constraints")}
        </section>

        <section id="architecture" className="case-study-section prose-surface">
          <h2>{sectionTitle(caseStudy, "architecture", "Architecture")}</h2>
          {before("architecture")}
          {caseStudy.slug === "erebus" && (
            <figure className="case-study-flow">
              <figcaption>Event and inference flow</figcaption>
              <ol aria-label="Erebus architecture">
                <li>Emitters</li><li>Append-only event history</li>
                <li>Belief engine</li><li>Search &amp; inspection</li>
              </ol>
              <p>Inspection exposes both raw event history and inferred state.</p>
            </figure>
          )}
          <ul className="case-study-list">
            {caseStudy.architecture.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {after("architecture")}
        </section>

        <section id="decisions" className="case-study-section">
          <h2>{sectionTitle(caseStudy, "decisions", "Key Technical Decisions")}</h2>
          {before("decisions")}
          <div className="case-study-grid">
            {caseStudy.keyTechnicalDecisions.map((decision) => (
              <article key={decision.title} className="interactive-card">
                <h3>{decision.title}</h3>
                <p>{decision.rationale}</p>
              </article>
            ))}
          </div>
          {after("decisions")}
        </section>

        <section id="implementation" className="case-study-section">
          <h2>
            {sectionTitle(
              caseStudy,
              "implementation",
              caseStudy.slug === "erebus" ? "Operational Capabilities" : "Implementation Highlights"
            )}
          </h2>
          {before("implementation")}
          <div className="case-study-grid">
            {caseStudy.implementationHighlights.map((highlight) => (
              <article key={highlight.title} className="interactive-card">
                <h3>{highlight.title}</h3>
                <p>{highlight.detail}</p>
              </article>
            ))}
          </div>
          {after("implementation")}
        </section>

        <section id="outcome" className="case-study-section prose-surface">
          <h2>
            {sectionTitle(caseStudy, "outcome", caseStudy.slug === "erebus" ? "Current Outcome" : "Outcome")}
          </h2>
          {before("outcome")}
          <ul className="case-study-list">
            {caseStudy.outcome.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {after("outcome")}
        </section>

        <section id="evidence" className="case-study-section">
          <h2>Evidence</h2>
          <div className="case-study-grid">
            {caseStudy.artifacts.map((artifact) => (
              <article key={artifact.title} className="interactive-card">
                <div className="case-study-artifact-meta">
                  <span>{artifact.kind}</span>
                  <span>{artifact.status}</span>
                </div>
                <h3>{artifact.title}</h3>
                <p>{artifact.description}</p>
                {artifact.note && (
                  <p className="case-study-artifact-note">{artifact.note}</p>
                )}
                {artifact.href && (
                  <a
                    className="case-study-artifact-link"
                    href={artifact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View artifact: ${artifact.title}`}
                  >
                    View artifact
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="links" className="case-study-section prose-surface">
          <h2>Links</h2>
          <div className="case-study-links">
            {caseStudy.links.map((link) => {
              if (link.unavailable) {
                return (
                  <div key={link.label} className="case-study-link disabled">
                    <span>{link.label}</span>
                    <span>{link.unavailableLabel ?? "Not public yet"}</span>
                  </div>
                );
              }

              if (link.external) {
                return (
                  <a
                    key={link.label}
                    className="case-study-link"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{link.label}</span>
                    <span>Open</span>
                  </a>
                );
              }

              return (
                <Link key={link.label} className="case-study-link" to={link.href}>
                  <span>{link.label}</span>
                  <span>View</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CaseStudyPage;
