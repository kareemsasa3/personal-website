import "./Home.css";
import { useNavigation } from "../../hooks/useNavigation";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";

import {
  HeroSection,
  FeaturedProjectsSection,
  CapabilitiesSection,
  ContactStripSection,
  ExplorationChoiceSection,
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

  const isMobile = useIsMobile();

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

  return (
    <div className="page-content home-page">
      <div className="home-container">
        {/* Hero Section */}
        <div id="hero">
          <HeroSection
            onNavigateToCaseStudies={handleNavigateToCaseStudies}
            onNavigateToWork={handleNavigateToWork}
            onNavigateToContact={handleNavigateToContact}
            isNavigatingToCaseStudies={loadingStates.caseStudies}
            isNavigatingToWork={loadingStates.work}
          />
        </div>

        {/* Featured Projects Section */}
        <div id="projects">
          <FeaturedProjectsSection
            onNavigateToCaseStudies={handleNavigateToCaseStudies}
            onNavigateToProjects={handleNavigateToProjects}
            isNavigatingToCaseStudies={loadingStates.caseStudies}
            isNavigatingToProjects={loadingStates.projects}
          />
        </div>

        {/* Capabilities Section */}
        <div id="capabilities">
          <CapabilitiesSection />
        </div>

        {/* Contact Section */}
        <div id="contact">
          <ContactStripSection />
        </div>
        <ExplorationChoiceSection />
      </div>
    </div>
  );
};

export default Home;
