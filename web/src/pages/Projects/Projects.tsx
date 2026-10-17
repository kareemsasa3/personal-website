import FocusTrap from "focus-trap-react";
import { useRef, useState } from "react";
import { countLabel, pluralize } from "../../utils/countLabel";
import "./Projects.css";
import ProjectRoster from "../../components/ProjectRoster";
import TerminalDropdown from "../../components/TerminalDropdown";
import { useProjects } from "./useProjects";
import ViewportPortal from "../../components/common/ViewportPortal";

type SortByType = "date" | "name" | "category";

const Projects = () => {
  const { state, data, stats, handlers, projectsFoundMessage, SORT_OPTIONS } =
    useProjects();
  const [isTechStackVisible, setIsTechStackVisible] = useState(false);
  // The backdrop closes the dialog only for a press that began on it: a press on Close released over the
  // backdrop is a drag off the control, which cancels (§13 Activation).
  const pressOnBackdrop = useRef(false);
  const projects = data.filteredAndSortedProjects;

  return (
    <div className="page-content">
      <div className="projects-container">
        <header className="projects-hero prose-surface">
          <p className="projects-eyebrow df-label">Project Roster</p>
          <h1 className="projects-title">Projects</h1>
          <p className="projects-subtitle">
            A complete roster of the systems and tools I build and maintain.
            Projects with case studies link to deeper write-ups of the
            problem, constraints, and decisions.
          </p>

        </header>

        <section
          id="project-roster"
          className="roster-section"
          aria-labelledby="project-roster-title"
        >
          <div className="projects-section-heading">
            <h2 id="project-roster-title" className="projects-section-title">
              All projects
            </h2>
            <p className="projects-section-subtitle">
              Filter by domain or project status.
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
              className="stat-card df-control"
              onClick={handlers.handleShowAllProjects}
              aria-pressed={state.category === "All" && state.status === "All"}
              title="Show all projects"
            >
              <span className="stat-card__body">
                <span className="stat-number df-control__value">{projects.length}</span>
                <span className="stat-label df-label">{pluralize(projects.length, "Project")} listed</span>
              </span>
            </button>
            <button
              className="stat-card df-control"
              onClick={handlers.handleShowLiveProjects}
              aria-pressed={state.status === "Live"}
              title="Show live projects"
            >
              <span className="stat-card__body">
                <span className="stat-number df-control__value">{stats.liveProjectCount}</span>
                <span className="stat-label df-label">Live {pluralize(stats.liveProjectCount, "project")}</span>
              </span>
            </button>
            <button
              className="stat-card df-control df-control--latch"
              onClick={() => setIsTechStackVisible(true)}
              aria-pressed={isTechStackVisible}
              title="View technical coverage"
            >
              <span className="stat-card__body">
                <span className="stat-number df-control__value">{data.allTechnologies.length}</span>
                <span className="stat-label df-label">Technical coverage ↗</span>
              </span>
            </button>
          </div>

          {isTechStackVisible && (
            <ViewportPortal layer="modal">
              <FocusTrap focusTrapOptions={{ escapeDeactivates: false, delayInitialFocus: false }}>
                <div
                  className="tech-stack-modal"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setIsTechStackVisible(false);
                    }
                  }}
                  onPointerDown={(event) => {
                    pressOnBackdrop.current = event.target === event.currentTarget;
                  }}
                  onClick={(event) => {
                    if (event.target === event.currentTarget && pressOnBackdrop.current) setIsTechStackVisible(false);
                  }}
                >
                  <div
                    className="tech-stack-content df-cut-md"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tech-stack-title"
                  >
                    <div className="tech-stack-header">
                      <h3 id="tech-stack-title">Technical Coverage</h3>
                      <button
                        className="close-tech-stack df-control df-label"
                        onClick={() => setIsTechStackVisible(false)}
                        aria-label="Close technology list"
                      >
                        Close
                      </button>
                    </div>
                    <div className="tech-stack-grid" tabIndex={0} role="region" aria-label="Technologies by project">
                      {data.allTechnologies.map((tech) => (
                        <div key={tech} className="tech-item">
                          <span className="tech-name">{tech}</span>
                          <span className="tech-count">
                            ({countLabel(stats.techProjectCounts.get(tech) || 0, "project")})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FocusTrap>
            </ViewportPortal>
          )}

          <div className="projects-content">
            <div
              className="visually-hidden"
              aria-live="polite"
              aria-atomic="true"
            >
              {projectsFoundMessage}
            </div>

            {projects.length > 0 ? (
              <ProjectRoster projects={projects} />
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
