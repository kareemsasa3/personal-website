import { motion, type Variants } from "framer-motion";
import { forwardRef, type ForwardedRef } from "react";
import { useLocation } from "react-router-dom";
import {
  exploreNavItems,
  isNavItemActive,
  isSimulationDetailRoute,
  navItems,
  type SiteNavItem,
} from "../../data/navigation";
import DockIcon from "./DockIcon";
import DockExploreStack from "./DockExploreStack";
import DockSettingsButton from "./DockSettingsButton";
import { DockControls } from "./useDock";
import { useSettings } from "../../contexts/SettingsContext";
import { useWindowSize } from "../../hooks";
import { INSTANT, motionToken } from "../../utils/motionTokens";
import "./Dock.css";

interface DockProps {
  dockControls: DockControls;
  reduceNavModeTransition?: boolean;
}

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
  const { dockSize } = dockControls;

  const { isSettingsOpen, toggleSettings } = useSettings();
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth <= 768;
  const isGameRoute = isSimulationDetailRoute(location.pathname);

  // Mobile-specific presentation adjustments
  const effectiveDockSize = isMobile ? Math.min(dockSize, 36) : dockSize;

  const renderIcon = (item: SiteNavItem) => (
    <DockIcon
      key={item.path}
      path={item.path}
      label={item.label}
      icon={item.icon}
      isActive={isNavItemActive(item, location.pathname)}
      baseSize={effectiveDockSize} // Pass down the base size
    />
  );

  // The dock fades in and out when the navigation mode changes (opacity only).
  const dockNavVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      // §12: state transition (create) · navigation mode changed to dock
      transition: reduceNavModeTransition ? INSTANT : motionToken("--dur-base", "--ease-settle"),
    },
    exit: {
      opacity: 0,
      // §12: state transition (remove) · navigation mode changed away from dock
      transition: reduceNavModeTransition ? INSTANT : motionToken("--dur-fast", "--ease-depart"),
    },
  };

  return (
    <motion.div
      ref={ref}
      id="dock-container"
      className="dock-container"
      role="toolbar"
      aria-label="Application Dock"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={dockNavVariants}
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
