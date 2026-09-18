import { useState } from "react";
import { Link } from "react-router-dom";
import { Project } from "../../data/projects";
import { caseStudyByProjectId } from "../../data/caseStudies";

const STATUS_LABELS: Partial<Record<Project["status"], string>> = {
  Development: "In progress",
};

const statusModifier = (status: string) =>
  status.toLowerCase().replace(/\s+/g, "-");

interface ProjectRosterDetailProps {
  project: Project;
  detailId: string;
  isExpanded: boolean;
}

const ProjectRosterDetail = ({
  project,
  detailId,
  isExpanded,
}: ProjectRosterDetailProps) => {
  const stackId = `${detailId}-stack`;
  const highlightsId = `${detailId}-highlights`;
  const featuresId = `${detailId}-features`;

  return (
    <div id={detailId} className="project-roster__detail" hidden={!isExpanded}>
      <p className="project-roster__description">{project.description}</p>

      <div className="project-roster__detail-grid">
        <section
          className="project-roster__detail-section"
          aria-labelledby={stackId}
        >
          <h4 id={stackId} className="project-roster__detail-heading">
            Tech stack
          </h4>
          <ul className="project-roster__tags" role="list">
            {project.techStack.map((tech) => (
              <li key={tech} className="project-roster__tag">
                {tech}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="project-roster__detail-section"
          aria-labelledby={highlightsId}
        >
          <h4 id={highlightsId} className="project-roster__detail-heading">
            Highlights
          </h4>
          <ul className="project-roster__points" role="list">
            {project.highlights.map((point, index) => (
              <li key={`${detailId}-highlight-${index}`} className="project-roster__point">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="project-roster__detail-section"
          aria-labelledby={featuresId}
        >
          <h4 id={featuresId} className="project-roster__detail-heading">
            Features
          </h4>
          <ul className="project-roster__points" role="list">
            {project.features.map((point, index) => (
              <li key={`${detailId}-feature-${index}`} className="project-roster__point">
                {point}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {project.liveUrl && (
        <div className="project-roster__detail-actions">
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="project-roster__action"
          >
            Live demo
            <span className="project-roster__sr-only">
              {` for ${project.title} (opens in a new tab)`}
            </span>
          </a>
        </div>
      )}
    </div>
  );
};

interface ProjectRosterItemProps {
  project: Project;
}

const ProjectRosterItem = ({ project }: ProjectRosterItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const caseStudy = caseStudyByProjectId[project.id];
  const titleId = `project-${project.id}-title`;
  const detailId = `project-${project.id}-detail`;
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  return (
    <li className="project-roster__item" data-expanded={isExpanded}>
      <article className="project-roster__article" aria-labelledby={titleId}>
        <div className="project-roster__summary">
          <p className="project-roster__meta">
            <span className="project-roster__meta-item">{project.category}</span>
            <span className="project-roster__meta-item">{project.date}</span>
            <span
              className={`project-roster__meta-item project-roster__status project-roster__status--${statusModifier(
                project.status
              )}`}
            >
              <span className="project-roster__status-dot" aria-hidden="true" />
              {statusLabel}
            </span>
          </p>
          <h3 id={titleId} className="project-roster__title">
            {project.title}
          </h3>
          <p className="project-roster__deck">{project.shortDescription}</p>

          <div className="project-roster__actions">
            <button
              type="button"
              className="project-roster__toggle"
              aria-expanded={isExpanded}
              aria-controls={detailId}
              onClick={() => setIsExpanded((value) => !value)}
            >
              {isExpanded ? "Hide details" : "Details"}
              <span className="project-roster__sr-only">{` for ${project.title}`}</span>
              <span className="project-roster__toggle-icon" aria-hidden="true">
                {isExpanded ? "−" : "+"}
              </span>
            </button>
            {caseStudy && (
              <Link
                to={`/case-studies/${caseStudy.slug}`}
                className="project-roster__action project-roster__action--primary"
              >
                Case study
                <span className="project-roster__sr-only">{` for ${project.title}`}</span>
              </Link>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-roster__action"
              >
                Code
                <span className="project-roster__sr-only">
                  {` for ${project.title} (opens in a new tab)`}
                </span>
              </a>
            )}
          </div>
        </div>

        <ProjectRosterDetail
          project={project}
          detailId={detailId}
          isExpanded={isExpanded}
        />
      </article>
    </li>
  );
};

export default ProjectRosterItem;
