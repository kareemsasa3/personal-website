import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";
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
    renderNavigation: () => <HeaderNavigation />,
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
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition: Transition = shouldReduceMotion
    ? { duration: 0.01 }
    : { duration: 0.24, ease: "easeOut" };
  const activeNavigationMode = siteNavigationModeConfig[navMode];
  const activeNavigation = activeNavigationMode.renderNavigation({
    dockControls,
    shouldReduceMotion,
  });
  const activeVariants = activeNavigationMode.getVariants?.(shouldReduceMotion);

  return (
    <div className="site-navigation-shell">
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
