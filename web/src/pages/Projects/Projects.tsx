import FocusTrap from "focus-trap-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Projects.css";
import ProjectsList from "../../components/ProjectsList";
import TerminalDropdown from "../../components/TerminalDropdown";
import { useProjects } from "./useProjects";
import { caseStudyCards } from "../../data/caseStudies";

type SortByType = "date" | "complexity" | "name" | "category";

const flagshipProjectIds = ["erebus", "arachne", "aether"] as const;

const getStatusClasses = (status: string) => {
  const legacyClass = status.toLowerCase();
  const statusClass = legacyClass.replace(/\s+/g, "-");

  return legacyClass === statusClass
    ? statusClass
    : `${legacyClass} ${statusClass}`;
};

const flagshipProjects = flagshipProjectIds
  .map((id) => caseStudyCards.find((caseStudy) => caseStudy.projectId === id))
  .filter(
    (caseStudy): caseStudy is NonNullable<typeof caseStudy> =>
      caseStudy !== undefined
  );

const flagshipProjectIdSet = new Set<string>(flagshipProjectIds);

const Projects = () => {
  const { state, data, stats, handlers, projectsFoundMessage, SORT_OPTIONS } =
    useProjects();
  const [isTechStackVisible, setIsTechStackVisible] = useState(false);
  const archiveProjects = data.filteredAndSortedProjects.filter(
    (project) => !flagshipProjectIdSet.has(project.id)
  );
  const archiveProjectsFoundMessage =
    archiveProjects.length > 0
      ? `${archiveProjects.length} archive item${
          archiveProjects.length === 1 ? "" : "s"
        } found.`
      : "No archive projects found matching your criteria.";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTechStackVisible(false);
      }
    };

    if (isTechStackVisible) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTechStackVisible]);

  return (
    <div className="page-content">
      <div className="projects-container">
        <header className="projects-hero">
          <p className="projects-eyebrow">Systems Archive</p>
          <h1 className="projects-title">Flagship systems and project archive</h1>
          <p className="projects-subtitle">
            This page is the full catalog: flagship systems route to case
            studies, and the rest of the work stays organized as supporting
            archive material.
          </p>
          <div className="projects-hero-actions">
            <Link
              to="/case-studies"
              className="projects-cta projects-cta-primary"
            >
              View Flagship Case Studies
            </Link>
            <a
              href="#browse-projects"
              className="projects-cta projects-cta-secondary"
            >
              Browse All Projects
            </a>
          </div>
        </header>

        <section className="flagship-section" aria-labelledby="flagship-work">
          <div className="projects-section-heading">
            <h2 id="flagship-work" className="projects-section-title">
              Flagship Systems
            </h2>
            <p className="projects-section-subtitle">
              Erebus, Arachne, and Aether are the core systems. They carry the
              strongest evidence of my architecture, systems design, and
              implementation approach.
            </p>
          </div>

          <div className="flagship-grid">
            {flagshipProjects.map((caseStudy) => (
              <article key={caseStudy.slug} className="flagship-card">
                <div className="flagship-card-header">
                  <div>
                    <p className="flagship-kicker">{caseStudy.project.category}</p>
                    <h3 className="flagship-title">{caseStudy.title}</h3>
                  </div>
                  <div className="flagship-badges">
                    <span
                      className={`complexity-badge ${caseStudy.project.complexity.toLowerCase()}`}
                    >
                      {caseStudy.project.complexity}
                    </span>
                    <span
                      className={`status-badge ${getStatusClasses(caseStudy.project.status)}`}
                    >
                      {caseStudy.project.status}
                    </span>
                  </div>
                </div>

                <p className="flagship-summary">{caseStudy.shortDescription}</p>

                <div className="flagship-tags">
                  {caseStudy.focusAreas.slice(0, 3).map((focusArea) => (
                    <span key={focusArea} className="tech-tag">
                      {focusArea}
                    </span>
                  ))}
                </div>

                <div className="flagship-actions">
                  <Link
                    to={`/case-studies/${caseStudy.slug}`}
                    className="flagship-link flagship-link-primary"
                  >
                    Read Case Study
                  </Link>
                  {caseStudy.project.githubUrl && (
                    <a
                      href={caseStudy.project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flagship-link"
                    >
                      View Code
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="browse-projects"
          className="browse-section"
          aria-labelledby="browse-projects-title"
        >
          <div className="projects-section-heading">
            <h2 id="browse-projects-title" className="projects-section-title">
              Project Archive
            </h2>
            <p className="projects-section-subtitle">
              The archive is a catalog of supporting work. Use filters to narrow
              by domain, complexity, or project status.
            </p>
          </div>

          <div className="projects-controls">
            <div className="filters-section">
              <div className="filter-group">
                <TerminalDropdown
                  options={data.categories}
                  value={state.category}
                  onChange={(value) =>
                    handlers.handleFilterChange("category", value)
                  }
                  label="Category"
                  placeholder="Select category"
                  showPrompt={false}
                  showMenuChrome={false}
                />
              </div>

              <div className="filter-group">
                <TerminalDropdown
                  options={data.complexities}
                  value={state.complexity}
                  onChange={(value) =>
                    handlers.handleFilterChange("complexity", value)
                  }
                  label="Complexity"
                  placeholder="Select complexity"
                  showPrompt={false}
                  showMenuChrome={false}
                />
              </div>

              <div className="filter-group">
                <TerminalDropdown
                  options={data.statuses}
                  value={state.status}
                  onChange={(value) =>
                    handlers.handleFilterChange("status", value)
                  }
                  label="Status"
                  placeholder="Select status"
                  showPrompt={false}
                  showMenuChrome={false}
                />
              </div>
            </div>

            <div className="sort-section">
              <TerminalDropdown
                options={SORT_OPTIONS}
                value={state.sortBy}
                onChange={(value) =>
                  handlers.handleSortChange(value as SortByType)
                }
                label="Sort by"
                placeholder="Select sort option"
                showPrompt={false}
                showMenuChrome={false}
              />
            </div>
          </div>

          <div className="projects-stats">
            <button
              className="stat-card"
              onClick={handlers.handleShowAllProjects}
              aria-pressed={
                state.category === "All" &&
                state.complexity === "All" &&
                state.status === "All"
              }
              title="Show all projects"
            >
              <span className="stat-number">
                {archiveProjects.length}
              </span>
              <span className="stat-label">Archive items</span>
            </button>
            <button
              className="stat-card"
              onClick={handlers.handleShowExpertProjects}
              aria-pressed={state.complexity === "Expert"}
              title="Show expert-level projects"
            >
              <span className="stat-number">{stats.expertProjectCount}</span>
              <span className="stat-label">Expert-level projects</span>
            </button>
            <button
              className="stat-card"
              onClick={handlers.handleShowLiveProjects}
              aria-pressed={state.status === "Live"}
              title="Show live projects"
            >
              <span className="stat-number">{stats.liveProjectCount}</span>
              <span className="stat-label">Live projects</span>
            </button>
            <button
              className="stat-card"
              onClick={() => setIsTechStackVisible(true)}
              aria-pressed={isTechStackVisible}
              title="View all technologies"
            >
              <span className="stat-number">{data.allTechnologies.length}</span>
              <span className="stat-label">Technologies used</span>
            </button>
          </div>

          {isTechStackVisible && (
            <FocusTrap>
              <div
                className="tech-stack-modal"
                onClick={() => setIsTechStackVisible(false)}
              >
                <div
                  className="tech-stack-content"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tech-stack-title"
                >
                  <div className="tech-stack-header">
                    <h3 id="tech-stack-title">Technology Coverage</h3>
                    <button
                      className="close-tech-stack"
                      onClick={() => setIsTechStackVisible(false)}
                      aria-label="Close technology list"
                    >
                      Close
                    </button>
                  </div>
                  <div className="tech-stack-grid">
                    {data.allTechnologies.map((tech) => (
                      <div key={tech} className="tech-item">
                        <span className="tech-name">{tech}</span>
                        <span className="tech-count">
                          ({stats.techProjectCounts.get(tech) || 0} projects)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FocusTrap>
          )}

          <div className="projects-content">
            <div
              className="visually-hidden"
              aria-live="polite"
              aria-atomic="true"
            >
              {archiveProjectsFoundMessage || projectsFoundMessage}
            </div>

            {archiveProjects.length > 0 ? (
              <ProjectsList projects={archiveProjects} />
            ) : (
              <div className="no-projects">
                <h3>No matching projects</h3>
                <p>Try clearing one or more filters to expand the results.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Projects;
