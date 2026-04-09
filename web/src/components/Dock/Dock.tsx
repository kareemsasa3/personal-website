import { motion, type Variants } from "framer-motion";
import { forwardRef, useMemo, type ForwardedRef } from "react";
import { useLocation } from "react-router-dom";
import { navItems } from "../../data/navigation";
import DockIcon from "./DockIcon";
import DockSettingsButton from "./DockSettingsButton";
import { DockControls } from "./useDock";
import { useSettings } from "../../contexts/SettingsContext";
import { useWindowSize } from "../../hooks";
import "./Dock.css";

interface DockProps {
  dockControls: DockControls;
  reduceNavModeTransition?: boolean;
}

const dockNavVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.99, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: 8, scale: 0.99, filter: "blur(2px)" },
};

const reducedMotionDockVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const Dock = forwardRef<HTMLDivElement, DockProps>(DockContent);

function DockContent(
  { dockControls, reduceNavModeTransition = false }: DockProps,
  ref: ForwardedRef<HTMLDivElement>
) {
  const location = useLocation();
  const {
    // State
    dockSize,
    dockStiffness,
    magnification,
    mouseX,
  } = dockControls;

  const { isSettingsOpen, toggleSettings } = useSettings();
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth <= 768;
  const isGameRoute = location.pathname.includes("/games/");

  // Mobile-specific presentation adjustments
  const effectiveMagnification = isMobile ? 0 : magnification;
  const effectiveDockSize = isMobile ? Math.min(dockSize, 36) : dockSize;
  const dockItems = useMemo(() => {
    if (!isGameRoute) return navItems;
    return navItems.filter((item) => item.path === "/games");
  }, [isGameRoute]);

  return (
    <motion.div
      ref={ref}
      id="dock-container"
      className="dock-container"
      role="toolbar"
      aria-label="Application Dock"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(null)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={
        reduceNavModeTransition ? reducedMotionDockVariants : dockNavVariants
      }
      transition={
        reduceNavModeTransition
          ? { duration: 0.01 }
          : { duration: 0.24, ease: "easeOut" }
      }
    >
      {dockItems.map((item) => (
        <DockIcon
          key={item.path}
          {...item}
          mouseX={mouseX}
          stiffness={dockStiffness}
          magnification={effectiveMagnification}
          baseSize={effectiveDockSize} // Pass down the base size
        />
      ))}
      <div className="dock-icon-container">
        <DockSettingsButton
          isOpen={isSettingsOpen}
          onClick={toggleSettings}
          baseSize={effectiveDockSize} // Pass down the base size
        />
      </div>
    </motion.div>
  );
}

export default Dock;
