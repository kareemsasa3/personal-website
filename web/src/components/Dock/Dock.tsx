import { motion, type Variants } from "framer-motion";
import { forwardRef, type ForwardedRef } from "react";
import { useLocation } from "react-router-dom";
import {
  exploreNavItems,
  isNavItemActive,
  navItems,
  type SiteNavItem,
} from "../../data/navigation";
import DockIcon from "./DockIcon";
import DockExploreStack from "./DockExploreStack";
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

// Home and the core pages lead; exploration routes follow a separator.
const primaryDockItems = navItems.filter((item) => item.group !== "explore");
// Simulation child routes collapse the dock to a single return-to-index link.
const simulationsDockItem = navItems.find((item) => item.path === "/simulations");

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
  const isGameRoute = location.pathname.includes("/simulations/");

  // Mobile-specific presentation adjustments
  const effectiveMagnification = isMobile || reduceNavModeTransition ? 0 : magnification;
  const effectiveDockSize = isMobile ? Math.min(dockSize, 36) : dockSize;

  const renderIcon = (item: SiteNavItem) => (
    <DockIcon
      key={item.path}
      path={item.path}
      label={item.label}
      icon={item.icon}
      isActive={isNavItemActive(item, location.pathname)}
      mouseX={mouseX}
      stiffness={dockStiffness}
      magnification={effectiveMagnification}
      baseSize={effectiveDockSize} // Pass down the base size
    />
  );

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
      {isGameRoute ? (
        simulationsDockItem && renderIcon(simulationsDockItem)
      ) : (
        <>
          {primaryDockItems.map((item) => renderIcon(item))}
          <div className="dock-separator" aria-hidden="true" />
          {isMobile ? (
            <DockExploreStack
              items={exploreNavItems}
              pathname={location.pathname}
              baseSize={effectiveDockSize}
            />
          ) : (
            exploreNavItems.map((item) => renderIcon(item))
          )}
        </>
      )}
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
