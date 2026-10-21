import "./HeroSection.css";
import { heroContent, heroProofContent } from "../../../data/siteContent";

interface HeroSectionProps {
  onNavigateToCaseStudies: () => void;
  onNavigateToWork: () => void;
  onNavigateToContact: () => void;
  isNavigatingToCaseStudies: boolean;
  isNavigatingToWork: boolean;
}

export const HeroSection = ({
  onNavigateToCaseStudies,
  onNavigateToWork,
  onNavigateToContact,
  isNavigatingToCaseStudies,
  isNavigatingToWork,
}: HeroSectionProps) => {
  return (
    <section
      className="hero-section"
      aria-labelledby="home-hero-title"
    >
      <div className="hero-content prose-surface">
        <h1
          id="home-hero-title"
          className="hero-title df-display-2"
        >
          {heroContent.title}
        </h1>
        <p
          className="hero-subtitle df-body-lg"
        >
          {heroContent.subtitle}
        </p>
        <p
          className="hero-description df-body-lg"
        >
          {heroContent.description}
        </p>
        <div
          className="hero-buttons"
          role="group"
          aria-label="Primary actions"
        >
          <button
            className="btn btn-primary df-control df-label"
            onClick={onNavigateToCaseStudies}
            disabled={isNavigatingToCaseStudies}
            aria-busy={isNavigatingToCaseStudies}
            aria-label="Read flagship system case studies"
          >
            {heroContent.cta}
          </button>
          <button
            className="btn btn-secondary df-control df-label"
            onClick={onNavigateToWork}
            disabled={isNavigatingToWork}
            aria-busy={isNavigatingToWork}
            aria-label="View my professional work experience"
          >
            View Experience
          </button>
          <button
            className="hero-text-link df-control df-control--light df-label"
            onClick={onNavigateToContact}
            aria-label="Jump to contact links"
          >
            Contact
          </button>
        </div>
        <div
          className="hero-proof-strip"
          aria-label="Professional credibility highlights"
        >
          {heroProofContent.map((item) => (
            <div className="hero-proof-item" key={item.label}>
              <span className="hero-proof-label df-label">{item.label}</span>
              <strong className="hero-proof-value df-body">{item.value}</strong>
              <span className="hero-proof-detail df-body-sm">{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
