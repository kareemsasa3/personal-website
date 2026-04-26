import "./HeroSection.css";
import { motion } from "framer-motion";
import TypeWriterText from "../../../components/TypeWriterText";
import { heroContent, heroProofContent } from "../../../data/siteContent";

interface HeroSectionProps {
  hasShownHomeIntro: boolean;
  onIntroComplete: () => void;
  onNavigateToCaseStudies: () => void;
  onNavigateToWork: () => void;
  onNavigateToContact: () => void;
  isNavigatingToCaseStudies: boolean;
  isNavigatingToWork: boolean;
}

export const HeroSection = ({
  hasShownHomeIntro,
  onIntroComplete,
  onNavigateToCaseStudies,
  onNavigateToWork,
  onNavigateToContact,
  isNavigatingToCaseStudies,
  isNavigatingToWork,
}: HeroSectionProps) => {
  return (
    <motion.section
      className="hero-section"
      aria-labelledby="home-hero-title"
    >
      <div className="hero-content">
        <motion.h1
          id="home-hero-title"
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {!hasShownHomeIntro ? (
            <TypeWriterText
              text={heroContent.title}
              speed={80}
            />
          ) : (
            heroContent.title
          )}
        </motion.h1>
        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {!hasShownHomeIntro ? (
            <TypeWriterText
              text={heroContent.subtitle}
              delay={2000}
              speed={60}
              onComplete={onIntroComplete}
            />
          ) : (
            heroContent.subtitle
          )}
        </motion.p>
        <motion.p
          className="hero-description"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {heroContent.description}
        </motion.p>
        <motion.div
          className="hero-buttons"
          role="group"
          aria-label="Primary actions"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.6, delay: 0.8 }}
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
            className="btn btn-outline"
            onClick={onNavigateToContact}
            aria-label="Jump to contact links"
          >
            Contact
          </button>
        </motion.div>
        <motion.div
          className="hero-proof-strip"
          aria-label="Professional credibility highlights"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.6, delay: 0.95 }}
        >
          {heroProofContent.map((item) => (
            <div className="hero-proof-item" key={item.label}>
              <span className="hero-proof-label">{item.label}</span>
              <strong className="hero-proof-value">{item.value}</strong>
              <span className="hero-proof-detail">{item.detail}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};
