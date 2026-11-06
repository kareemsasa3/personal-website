import React from "react";
import "./WorkDetails.css";
import { WorkExperience } from "../../data/workExperience";

type WorkDetailsProps = WorkExperience;

const WorkDetails: React.FC<WorkDetailsProps> = ({
  company,
  role,
  dates,
  description,
  techStack,
  location,
  highlights,
  projects,
}) => {
  return (
    <div className="work-details-container">
      <div className="work-header">
        <div className="work-dates df-annotation">{dates}</div>
        <div className="work-company-info">
          <h3 className="work-company df-heading-3">{company}</h3>
          <div className="work-role df-heading-3">{role}</div>
          {location && <div className="work-location df-body-sm">{location}</div>}
        </div>
      </div>
      <div className="work-content">
        <div className="work-description">
          <h4 className="section-title df-label">Key Responsibilities</h4>
          <ul className="work-achievements">
            {description.map((desc, index) => (
              <li key={index} className="achievement-item df-body">
                {desc}
              </li>
            ))}
          </ul>
        </div>
        {projects && projects.length > 0 && (
          <div className="work-projects-section">
            <h4 className="section-title df-label">Notable Projects</h4>
            <ul className="work-projects">
              {projects.map((project, index) => (
                <li key={index} className="project-item df-body">
                  {project}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="work-tech-stack">
          <h4 className="tech-stack-title df-label">Tools & Skills</h4>
          <div className="tech-tags">
            {techStack.map((tech, index) => (
              <span key={index} className="tech-tag df-label-sm df-context">
                {tech}
              </span>
            ))}
          </div>
        </div>
        {highlights && highlights.length > 0 && (
          <div className="work-highlights">
            <h4 className="highlights-title df-label">Focus Areas</h4>
            <div className="highlights-tags">
              {highlights.map((highlight, index) => (
                <span key={index} className="highlight-tag df-label-sm df-context">
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkDetails;