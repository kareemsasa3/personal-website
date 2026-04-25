import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLayoutContext, PageSection } from "../../contexts/LayoutContext";
import "./GlobalSectionNavigation.css";

const getMeasuredHeaderOffset = () => {
  const rootStyles = getComputedStyle(document.documentElement);
  const measuredHeaderOffset = parseFloat(
    rootStyles.getPropertyValue("--site-header-measured-offset") || "0"
  );

  if (!Number.isFinite(measuredHeaderOffset) || measuredHeaderOffset <= 0) {
    return 96;
  }

  return measuredHeaderOffset;
};

const GlobalSectionNavigation = () => {
  const { sections, activeSection, setActiveSection } = useLayoutContext();

  // Use a ref to track the active section without causing re-renders
  const activeSectionRef = useRef(activeSection);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Keep the ref synchronized with the state on every render
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    if (sections.length === 0) {
      return;
    }

    const updateActiveSection = () => {
      const headerOffset = getMeasuredHeaderOffset();
      const activationLine = window.scrollY + headerOffset + 24;
      let nextActiveSection = sections[0]?.id ?? "";

      sections.forEach((section: PageSection) => {
        const element = document.getElementById(section.id);
        if (!element) {
          return;
        }

        const sectionTop = element.getBoundingClientRect().top + window.scrollY;
        if (sectionTop <= activationLine) {
          nextActiveSection = section.id;
        }
      });

      if (window.scrollY <= 0 && sections.length > 0) {
        nextActiveSection = sections[0].id;
      }

      if (
        nextActiveSection &&
        nextActiveSection !== activeSectionRef.current
      ) {
        setActiveSection(nextActiveSection);
      }
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
    };
  }, [sections, setActiveSection]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const topOffset = getMeasuredHeaderOffset();
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const maxScrollTop = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const targetTop = Math.min(
        Math.max(0, elementTop - topOffset - 16),
        maxScrollTop
      );

      setActiveSection(sectionId);
      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    }
  };

  // No longer need to check isHomePage here, it's implicit
  if (sections.length === 0) {
    return null;
  }

  return (
    <motion.nav
      className="global-section-navigation"
      initial={{ opacity: 0, x: 50 }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <ul className="nav-dots">
        {sections.map((section: PageSection) => (
          <li key={section.id}>
            <motion.button
              className={`nav-dot ${
                activeSection === section.id ? "active" : ""
              }`}
              onClick={() => scrollToSection(section.id)}
              aria-label={`Go to ${section.label} section`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              animate={
                activeSection === section.id ? { scale: 1.1 } : { scale: 1 }
              }
              transition={{ duration: 0.2 }}
            >
              <span className="dot-tooltip">{section.label}</span>
            </motion.button>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
};

export default GlobalSectionNavigation;
