import "./Home.css";
import { useNavigation } from "../../hooks/useNavigation";
import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useIsMobile } from "../../hooks/useIsMobile";

import {
  HeroSection,
  FeaturedProjectsSection,
  CapabilitiesSection,
  ContactStripSection,
} from "./sections";

const Home = () => {
  const { navigateTo, navigateToProjects, navigateToExperience } =
    useNavigation();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if home intro has been shown before
  const [hasShownHomeIntro, setHasShownHomeIntro] = useState(() => {
    try {
      return window.localStorage.getItem("home-intro-shown") === "true";
    } catch {
      return false;
    }
  });

  // Consolidated loading states for navigation buttons
  const [loadingStates, setLoadingStates] = useState({
    projects: false,
    caseStudies: false,
    work: false,
  });

  const resetLoadingState = (
    key: keyof typeof loadingStates,
    frameCount = 2
  ) => {
    let remainingFrames = frameCount;

    const resetOnNextFrame = () => {
      if (!isMountedRef.current) {
        return;
      }

      if (remainingFrames > 0) {
        remainingFrames -= 1;
        requestAnimationFrame(resetOnNextFrame);
        return;
      }

      setLoadingStates((prev) => ({ ...prev, [key]: false }));
    };

    requestAnimationFrame(resetOnNextFrame);
  };

  const { scrollYProgress } = useScroll();

  // Map scroll progress to different parallax effects for each section
  // These ranges are approximate and can be fine-tuned based on actual content
  const isMobile = useIsMobile();
  const heroYMotion = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const projectsYMotion = useTransform(scrollYProgress, [0.2, 0.4], [0, -50]);
  const capabilitiesYMotion = useTransform(scrollYProgress, [0.4, 0.6], [0, -30]);

  // Navigation handlers - simplified and more robust
  const handleNavigateToProjects = () => {
    setLoadingStates((prev) => ({ ...prev, projects: true }));
    try {
      navigateToProjects();
    } finally {
      resetLoadingState("projects");
    }
  };

  const handleNavigateToWork = () => {
    setLoadingStates((prev) => ({ ...prev, work: true }));
    try {
      navigateToExperience();
    } finally {
      resetLoadingState("work");
    }
  };

  const handleNavigateToCaseStudies = () => {
    setLoadingStates((prev) => ({ ...prev, caseStudies: true }));
    try {
      navigateTo("/case-studies");
    } finally {
      resetLoadingState("caseStudies");
    }
  };

  const handleNavigateToContact = () => {
    document.getElementById("contact")?.scrollIntoView({
      behavior: isMobile ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleIntroComplete = () => {
    setHasShownHomeIntro(true);
    try {
      window.localStorage.setItem("home-intro-shown", "true");
    } catch {
      // Non-critical. Intro state can remain in memory.
    }
  };

  return (
    <div className="page-content home-page">
      <div className="home-container">
        {/* Hero Section */}
        <motion.div
          id="hero"
          style={{ y: isMobile ? 0 : heroYMotion }}
        >
          <HeroSection
            hasShownHomeIntro={hasShownHomeIntro}
            onIntroComplete={handleIntroComplete}
            onNavigateToCaseStudies={handleNavigateToCaseStudies}
            onNavigateToWork={handleNavigateToWork}
            onNavigateToContact={handleNavigateToContact}
            isNavigatingToCaseStudies={loadingStates.caseStudies}
            isNavigatingToWork={loadingStates.work}
          />
        </motion.div>

        {/* Featured Projects Section */}
        <motion.div
          id="projects"
          style={{ y: isMobile ? 0 : projectsYMotion }}
        >
          <FeaturedProjectsSection
            onNavigateToCaseStudies={handleNavigateToCaseStudies}
            onNavigateToProjects={handleNavigateToProjects}
            isNavigatingToCaseStudies={loadingStates.caseStudies}
            isNavigatingToProjects={loadingStates.projects}
          />
        </motion.div>

        {/* Capabilities Section */}
        <motion.div
          id="capabilities"
          style={{ y: isMobile ? 0 : capabilitiesYMotion }}
        >
          <CapabilitiesSection />
        </motion.div>

        {/* Contact Section */}
        <div id="contact">
          <ContactStripSection />
        </div>
      </div>
    </div>
  );
};

export default Home;
