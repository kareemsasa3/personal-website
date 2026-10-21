import "./FeaturedProjectsSection.css";
import { forwardRef, ForwardedRef, CSSProperties } from "react";
import { Link } from "react-router-dom";
import { caseStudyCards } from "../../../data/caseStudies";
import { featuredProjectIds } from "../../../data/siteContent";

const featuredProjects = featuredProjectIds
  .map((id) => caseStudyCards.find((caseStudy) => caseStudy.projectId === id))
  .filter((caseStudy): caseStudy is NonNullable<typeof caseStudy> => caseStudy !== undefined);

interface FeaturedProjectsSectionProps {
  onNavigateToCaseStudies: () => void;
  onNavigateToProjects: () => void;
  isNavigatingToCaseStudies: boolean;
  isNavigatingToProjects: boolean;
  style?: CSSProperties;
}

export const FeaturedProjectsSection = forwardRef(
  (
    {
      onNavigateToCaseStudies,
      onNavigateToProjects,
      isNavigatingToCaseStudies,
      isNavigatingToProjects,
      style,
    }: FeaturedProjectsSectionProps,
    ref: ForwardedRef<HTMLElement>
  ) => {
    return (
      <section
        ref={ref}
        className="featured-projects-section"
        role="region"
        aria-labelledby="featured-projects-title"
        style={style}
      >
        <h2
          id="featured-projects-title"
          className="section-title df-heading-2"
        >
          Featured Systems
        </h2>
        <div
          className="featured-projects-grid"
        >
          {featuredProjects.map((caseStudy) => (
            <article key={caseStudy.slug}>
              <Link
                to={`/case-studies/${caseStudy.slug}`}
                className="featured-project-card featured-project-link df-control df-control--card"
                aria-label={`Read the ${caseStudy.title} case study`}
              >
                <div className="project-header">
                  <h3 className="project-title df-heading-3">{caseStudy.title}</h3>
                  <div className="project-badges">
                    <span
                      className={`status-badge df-label-sm df-context${
            caseStudy.status.toLowerCase() === "live" ? " df-context--live" : ""
          }`}
                    >
                      {caseStudy.status}
                    </span>
                  </div>
                </div>
                <p className="project-description df-body-sm">
                  {caseStudy.shortDescription}
                </p>
                <div className="project-tech">
                  {caseStudy.focusAreas.map((focusArea) => (
                    <span key={focusArea} className="tech-tag df-label-sm df-context">
                      {focusArea}
                    </span>
                  ))}
                </div>
                <div className="featured-project-footer">
                  <span className="featured-project-link-text df-label">
                    Read case study →
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        <div
          className="featured-projects-cta"
        >
          <button
            className="btn btn-outline df-control df-label"
            onClick={onNavigateToCaseStudies}
            disabled={isNavigatingToCaseStudies}
            aria-busy={isNavigatingToCaseStudies}
            aria-label="Read flagship system case studies"
          >
            Read Case Studies →
          </button>
          <button
            className="btn btn-secondary df-control df-label"
            onClick={onNavigateToProjects}
            disabled={isNavigatingToProjects}
            aria-busy={isNavigatingToProjects}
            aria-label="Browse the full project archive"
          >
            Browse All Projects →
          </button>
        </div>
      </section>
    );
  }
);

FeaturedProjectsSection.displayName = "FeaturedProjectsSection";
