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
          className="hero-title"
        >
          {heroContent.title}
        </h1>
        <p
          className="hero-subtitle"
        >
          {heroContent.subtitle}
        </p>
        <p
          className="hero-description"
        >
          {heroContent.description}
        </p>
        <div
          className="hero-buttons"
          role="group"
          aria-label="Primary actions"
        >
          <button
            className="btn btn-primary"
            onClick={onNavigateToCaseStudies}
            disabled={isNavigatingToCaseStudies}
            aria-label="Read flagship system case studies"
          >
            {isNavigatingToCaseStudies ? "Loading..." : heroContent.cta}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onNavigateToWork}
            disabled={isNavigatingToWork}
            aria-label="View my professional work experience"
          >
            {isNavigatingToWork ? "Loading..." : "View Experience"}
          </button>
          <button
            className="hero-text-link"
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
              <strong className="hero-proof-value">{item.value}</strong>
              <span className="hero-proof-detail">{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
