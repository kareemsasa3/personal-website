import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useIsPresent,
  type Transition,
  type Variants,
} from "framer-motion";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  type Ref,
  type ReactNode,
} from "react";
import Dock from "../Dock/Dock";
import SettingsPanel from "../SettingsPanel";
import { useDock, type DockControls } from "../Dock";
import { useLayoutContext } from "../../contexts/LayoutContext";
import type { NavigationMode } from "../../contexts/NavigationModeContextTypes";
import { useNavigationMode } from "../../contexts/NavigationModeContext";
import { useSettings } from "../../contexts/SettingsContext";
import HeaderNavigation from "./HeaderNavigation";
import "./SiteNavigation.css";

const headerNavVariants: Variants = {
  initial: { opacity: 0, y: -12, scale: 0.99, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, scale: 0.99, filter: "blur(2px)" },
};

const reducedMotionNavVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

type SiteNavigationModeConfig = {
  key: string;
  className?: string;
  getVariants?: (shouldReduceMotion: boolean) => Variants;
  renderNavigation: (args: {
    dockControls: DockControls;
    shouldReduceMotion: boolean;
    headerRef: Ref<HTMLElement>;
  }) => ReactNode;
};

const siteNavigationModeConfig: Record<NavigationMode, SiteNavigationModeConfig> = {
  dock: {
    key: "dock-navigation",
    renderNavigation: ({ dockControls, shouldReduceMotion }) => (
      <Dock
        dockControls={dockControls}
        reduceNavModeTransition={shouldReduceMotion}
      />
    ),
  },
  header: {
    key: "header-navigation",
    className: "site-nav-presentation site-nav-presentation--header",
    getVariants: (shouldReduceMotion) =>
      shouldReduceMotion ? reducedMotionNavVariants : headerNavVariants,
    renderNavigation: ({ headerRef }) => <HeaderNavigation ref={headerRef} />,
  },
};

const SiteNavigation = () => {
  const dockControls = useDock();
  const { navMode } = useNavigationMode();
  const { isSettingsOpen, closeSettings } = useSettings();
  const {
    isAnimationPaused,
    setIsAnimationPaused,
    matrixSpeed,
    setMatrixSpeed,
  } = useLayoutContext();
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition: Transition = shouldReduceMotion
    ? { duration: 0.01 }
    : { duration: 0.24, ease: "easeOut" };
  const setMeasuredHeaderOffset = useCallback((value: string) => {
    const layoutShell = shellRef.current?.parentElement;
    if (!layoutShell) return;

    layoutShell.style.setProperty("--site-header-measured-offset", value);
  }, []);

  useLayoutEffect(() => {
    if (navMode !== "header" || !isPresent) return;

    const headerElement = headerRef.current;
    if (!headerElement) return;

    const measureHeaderOffset = () => {
      const rect = headerElement.getBoundingClientRect();
      const { marginBottom } = window.getComputedStyle(headerElement);
      const occupiedOffset = rect.bottom + parseFloat(marginBottom || "0");

      setMeasuredHeaderOffset(`${Math.max(0, occupiedOffset)}px`);
    };

    measureHeaderOffset();

    const resizeObserver = new ResizeObserver(() => {
      measureHeaderOffset();
    });

    resizeObserver.observe(headerElement);
    window.addEventListener("resize", measureHeaderOffset);
    window.visualViewport?.addEventListener("resize", measureHeaderOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureHeaderOffset);
      window.visualViewport?.removeEventListener("resize", measureHeaderOffset);
    };
  }, [isPresent, navMode, setMeasuredHeaderOffset]);

  const activeNavigationMode = siteNavigationModeConfig[navMode];
  const activeNavigation = activeNavigationMode.renderNavigation({
    dockControls,
    shouldReduceMotion,
    headerRef,
  });
  const activeVariants = activeNavigationMode.getVariants?.(shouldReduceMotion);

  return (
    <div ref={shellRef} className="site-navigation-shell">
      <AnimatePresence initial={false} mode="popLayout">
        {activeVariants ? (
          <motion.div
            key={activeNavigationMode.key}
            className={activeNavigationMode.className}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={activeVariants}
            transition={transition}
          >
            {activeNavigation}
          </motion.div>
        ) : (
          activeNavigation
        )}
      </AnimatePresence>

      <SettingsPanel
        onDockSizeChange={dockControls.handleDockSizeChange}
        currentDockSize={dockControls.dockSize}
        onDockStiffnessChange={dockControls.handleDockStiffnessChange}
        currentDockStiffness={dockControls.dockStiffness}
        onMagnificationChange={dockControls.handleMagnificationChange}
        currentMagnification={dockControls.magnification}
        isAnimationPaused={isAnimationPaused}
        onAnimationToggle={setIsAnimationPaused}
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        matrixSpeed={matrixSpeed}
        onMatrixSpeedChange={setMatrixSpeed}
      />
    </div>
  );
};

export default SiteNavigation;
