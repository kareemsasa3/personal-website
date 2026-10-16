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
          className="section-title"
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
                className="featured-project-card interactive-card featured-project-link"
                aria-label={`Read the ${caseStudy.title} case study`}
              >
                <div className="project-header">
                  <h3 className="project-title">{caseStudy.title}</h3>
                  <div className="project-badges">
                    <span
                      className={`status-badge ${caseStudy.status.toLowerCase()}`}
                    >
                      {caseStudy.status}
                    </span>
                  </div>
                </div>
                <p className="project-description">
                  {caseStudy.shortDescription}
                </p>
                <div className="project-tech">
                  {caseStudy.focusAreas.map((focusArea) => (
                    <span key={focusArea} className="tech-tag">
                      {focusArea}
                    </span>
                  ))}
                </div>
                <div className="featured-project-footer">
                  <span className="featured-project-link-text">
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
            className="btn btn-outline"
            onClick={onNavigateToCaseStudies}
            disabled={isNavigatingToCaseStudies}
            aria-label="Read flagship system case studies"
          >
            {isNavigatingToCaseStudies ? "Loading..." : "Read Case Studies →"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onNavigateToProjects}
            disabled={isNavigatingToProjects}
            aria-label="Browse the full project archive"
          >
            {isNavigatingToProjects ? "Loading..." : "Browse All Projects →"}
          </button>
        </div>
      </section>
    );
  }
);

FeaturedProjectsSection.displayName = "FeaturedProjectsSection";
