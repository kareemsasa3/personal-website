import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLayoutContext, PageSection } from "../../contexts/LayoutContext";
import { INSTANT, motionToken } from "../../utils/motionTokens";
import "./GlobalSectionNavigation.css";

const getMeasuredHeaderOffset = () => {
  const rootStyles = getComputedStyle(document.documentElement);
  const measuredHeaderOffset = parseFloat(
    rootStyles.getPropertyValue("--site-header-measured-offset") || "0"
  );

  if (!Number.isFinite(measuredHeaderOffset) || measuredHeaderOffset <= 0) {
    return 0;
  }

  return measuredHeaderOffset;
};

const GlobalSectionNavigation = () => {
  const { sections, activeSection, setActiveSection } = useLayoutContext();
  const reduce = useReducedMotion();

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
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
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
      aria-label="Page sections"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // §12: state transition (create) · the page's sections were listed
      transition={reduce ? INSTANT : motionToken("--dur-base", "--ease-settle")}
    >
      <ul className="nav-dots">
        {sections.map((section: PageSection) => (
          <li key={section.id}>
            <button
              type="button"
              className="nav-dot df-control"
              onClick={() => scrollToSection(section.id)}
              aria-label={`Go to ${section.label} section`}
              aria-current={activeSection === section.id ? "location" : undefined}
              title={section.label}
            >
              <span className="dot-tooltip df-label">{section.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
};

export default GlobalSectionNavigation;
