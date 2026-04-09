import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import Dock from "../Dock/Dock";
import SettingsPanel from "../SettingsPanel";
import { useDock } from "../Dock";
import { useLayoutContext } from "../../contexts/LayoutContext";
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
  const transition = shouldReduceMotion
    ? { duration: 0.01 }
    : { duration: 0.24, ease: "easeOut" };

  return (
    <div className="site-navigation-shell">
      <AnimatePresence initial={false} mode="popLayout">
        {navMode === "dock" ? (
          <Dock
            key="dock-navigation"
            dockControls={dockControls}
            reduceNavModeTransition={shouldReduceMotion}
          />
        ) : (
          <motion.div
            key="header-navigation"
            className="site-nav-presentation site-nav-presentation--header"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={
              shouldReduceMotion ? reducedMotionNavVariants : headerNavVariants
            }
            transition={transition}
          >
            <HeaderNavigation />
          </motion.div>
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
