import { motion } from "framer-motion";
import TypeWriterText from "../../../components/TypeWriterText";
import { heroContent } from "../../../data/siteContent";

interface HeroSectionProps {
  hasShownHomeIntro: boolean;
  onIntroComplete: () => void;
  onNavigateToProjects: () => void;
  onNavigateToWork: () => void;
  isNavigatingToProjects: boolean;
  isNavigatingToWork: boolean;
}

export const HeroSection = ({
  hasShownHomeIntro,
  onIntroComplete,
  onNavigateToProjects,
  onNavigateToWork,
  isNavigatingToProjects,
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
            onClick={onNavigateToProjects}
            disabled={isNavigatingToProjects}
            aria-label="View my projects and work portfolio"
          >
            {isNavigatingToProjects ? "Loading..." : heroContent.cta}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onNavigateToWork}
            disabled={isNavigatingToWork}
            aria-label="View my professional work experience"
          >
            {isNavigatingToWork ? "Loading..." : "View Experience"}
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
};
