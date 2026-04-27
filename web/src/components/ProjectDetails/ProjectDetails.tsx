import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./ProjectDetails.css";
import { Project } from "../../data/projects";
import { caseStudyByProjectId } from "../../data/caseStudies";

interface ProjectDetailsProps {
  project: Project;
}

const MAX_PREVIEW_WORDS = 14;
const MAX_KEY_POINTS = 4;

const normalizePreviewText = (description: string) => {
  const firstSentence = description.split(".")[0]?.trim() || description.trim();
  const normalized = firstSentence.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");

  if (words.length <= MAX_PREVIEW_WORDS) {
    return normalized;
  }

  return `${words.slice(0, MAX_PREVIEW_WORDS).join(" ")}...`;
};

const normalizeKeyPoint = (value: string) =>
  value.replace(/\s+/g, " ").replace(/[.]+$/, "").trim();

const getStatusClasses = (status: string) => {
  const legacyClass = status.toLowerCase();
  const statusClass = legacyClass.replace(/\s+/g, "-");

  return legacyClass === statusClass
    ? statusClass
    : `${legacyClass} ${statusClass}`;
};

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = `project-details-${project.id}`;
  const caseStudy = caseStudyByProjectId[project.id];
  const previewText = normalizePreviewText(project.description);
  const keyPoints = [...project.highlights, ...project.features]
    .map(normalizeKeyPoint)
    .slice(0, MAX_KEY_POINTS);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "Expert":
        return "#ff6b6b";
      case "Advanced":
        return "#4ecdc4";
      case "Intermediate":
        return "#45b7d1";
      case "Beginner":
        return "#96ceb4";
      default:
        return "#ddd";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "#51cf66";
      case "Development":
        return "#ffd43b";
      case "Completed":
        return "#74c0fc";
      default:
        return "#ddd";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Live":
        return "Live";
      case "Development":
        return "In Progress";
      case "Completed":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <div className={`project-card ${isExpanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="project-header"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="project-main-info">
          <div className="project-category">{project.category}</div>
          <h3 className="project-title">{project.title}</h3>
          <div className="project-meta">{project.date}</div>
          <p className="project-summary">{previewText}</p>
        </div>

        <div className="project-status">
          <span
            className={`status-badge ${getStatusClasses(project.status)}`}
            style={{ backgroundColor: getStatusColor(project.status) }}
          >
            <span className="status-dot" aria-hidden="true" />
            {getStatusLabel(project.status)}
          </span>
          <span
            className="complexity-badge"
            style={{ backgroundColor: getComplexityColor(project.complexity) }}
          >
            {project.complexity}
          </span>
          <span className="expand-btn" aria-hidden="true">
            <span className="expand-btn-label">
              {isExpanded ? "Hide details" : "Details"}
            </span>
            <span className="expand-btn-icon">{isExpanded ? "−" : "+"}</span>
          </span>
        </div>
      </button>

      <div className="project-preview-links">
        {caseStudy && (
          <Link to={`/case-studies/${caseStudy.slug}`} className="project-link">
            Read Case Study
          </Link>
        )}
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="project-link github-link"
          >
            View Code
          </a>
        )}
      </div>

      {isExpanded && (
        <div id={detailsId} className="project-details">
          <div className="project-tech-stack">
            <h4>Tech Stack</h4>
            <div className="tech-tags">
              {project.techStack.map((tech, index) => (
                <span key={index} className="tech-tag">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="project-key-points">
            <h4>Key Points</h4>
            <ul className="key-points-list">
              {keyPoints.map((point, index) => (
                <li key={`${project.id}-point-${index}`} className="key-point-item">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="project-links">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link live-link"
              >
                Live Demo
              </a>
            )}
            {project.url &&
              project.url !== "#" &&
              project.url !== project.githubUrl && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-link primary-link"
                >
                  View Project
                </a>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
