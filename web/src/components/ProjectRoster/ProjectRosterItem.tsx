import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Project } from "../../data/projects";
import { caseStudyByProjectId } from "../../data/caseStudies";
import ProjectMedia from "../ProjectMedia";
import { INSTANT, motionToken } from "../../utils/motionTokens";

const STATUS_LABELS: Partial<Record<Project["status"], string>> = {
  Development: "In progress",
};

interface ProjectRosterDetailProps {
  project: Project;
  detailId: string;
}

const ProjectRosterDetail = ({
  project,
  detailId,
}: ProjectRosterDetailProps) => {
  const stackId = `${detailId}-stack`;
  const highlightsId = `${detailId}-highlights`;
  const featuresId = `${detailId}-features`;

  return (
    <div id={detailId} className="project-roster__detail">
      <p className="project-roster__description df-body">{project.description}</p>

      <div className="project-roster__detail-grid">
        <section
          className="project-roster__detail-section"
          aria-labelledby={stackId}
        >
          <h4 id={stackId} className="project-roster__detail-heading df-label">
            Tech stack
          </h4>
          <ul className="project-roster__tags" role="list">
            {project.techStack.map((tech) => (
              <li key={tech} className="project-roster__tag df-label-sm df-context">
                {tech}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="project-roster__detail-section"
          aria-labelledby={highlightsId}
        >
          <h4 id={highlightsId} className="project-roster__detail-heading df-label">
            Highlights
          </h4>
          <ul className="project-roster__points" role="list">
            {project.highlights.map((point, index) => (
              <li key={`${detailId}-highlight-${index}`} className="project-roster__point df-body-sm">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="project-roster__detail-section"
          aria-labelledby={featuresId}
        >
          <h4 id={featuresId} className="project-roster__detail-heading df-label">
            Features
          </h4>
          <ul className="project-roster__points" role="list">
            {project.features.map((point, index) => (
              <li key={`${detailId}-feature-${index}`} className="project-roster__point df-body-sm">
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
            className="project-roster__action df-control df-label"
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
  const reduceMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);
  const caseStudy = caseStudyByProjectId[project.id];
  const titleId = `project-${project.id}-title`;
  const detailId = `project-${project.id}-detail`;
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  return (
    <li className="project-roster__item" data-expanded={isExpanded}>
      <article className="project-roster__article" aria-labelledby={titleId}>
        <div
          className={`project-roster__summary${
            project.media ? " project-roster__summary--with-media" : ""
          }`}
        >
          {project.media && (
            <ProjectMedia
              media={project.media}
              label={project.id}
              className="project-roster__media"
            />
          )}
          <p className="project-roster__meta">
            <span className="project-roster__meta-item df-label-sm">{project.category}</span>
            <span className="project-roster__meta-item df-data">{project.date}</span>
            <span
              className={`project-roster__meta-item project-roster__status df-label-sm df-context${
                statusLabel.toLowerCase() === "live" ? " df-context--live" : ""
              }`}
            >
              {statusLabel}
            </span>
          </p>
          <h3 id={titleId} className="project-roster__title df-heading-3">
            {project.title}
          </h3>
          <p className="project-roster__deck df-body">{project.shortDescription}</p>

          <div className="project-roster__actions">
            {/* D8: the primary action is an idle control placed first in the row. */}
            {caseStudy && (
              <Link
                to={`/case-studies/${caseStudy.slug}`}
                className="project-roster__action project-roster__action--primary df-control df-label"
              >
                Case study
                <span className="project-roster__sr-only">{` for ${project.title}`}</span>
              </Link>
            )}
            <button
              type="button"
              className="project-roster__toggle df-control df-control--latch df-label"
              aria-expanded={isExpanded}
              aria-controls={detailId}
              onClick={() => setIsExpanded((value) => !value)}
            >
              {/* The label and its screen-reader suffix share one inline box, so the suffix never sits at the row's start. */}
              <span className="project-roster__toggle-label">
                {isExpanded ? "Hide details" : "Details"}
                <span className="project-roster__sr-only">{` for ${project.title}`}</span>
              </span>
              <span className="project-roster__toggle-icon" aria-hidden="true">
                {isExpanded ? "−" : "+"}
              </span>
            </button>
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-roster__action df-control df-label"
              >
                Code
                <span className="project-roster__sr-only">
                  {` for ${project.title} (opens in a new tab)`}
                </span>
              </a>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              // §12: state transition (reveal) · detail panel opened
              animate={{ height: "auto", opacity: 1, transition: reduceMotion ? INSTANT : motionToken("--dur-base", "--ease-settle") }}
              // §12: state transition (conceal) · detail panel closed
              exit={{ height: 0, opacity: 0, transition: reduceMotion ? INSTANT : motionToken("--dur-fast", "--ease-depart") }}
              style={{ overflow: "hidden" }}
            >
              <ProjectRosterDetail project={project} detailId={detailId} />
            </motion.div>
          )}
        </AnimatePresence>
      </article>
    </li>
  );
};

export default ProjectRosterItem;
