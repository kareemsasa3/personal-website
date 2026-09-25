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
    backgroundMotionSpeed,
    setBackgroundMotionSpeed,
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
    document.documentElement.style.setProperty("--site-header-measured-offset", value);
  }, []);

  useLayoutEffect(() => {
    if (navMode !== "header" || !isPresent) {
      setMeasuredHeaderOffset("0px");
      return;
    }

    const headerElement = headerRef.current;
    if (!headerElement) return;

    const measureHeaderOffset = () => {
      const style = window.getComputedStyle(headerElement);
      const occupiedOffset = headerElement.offsetHeight + (parseFloat(style.top) || 0) + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);

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

  useLayoutEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 768;
      const size = mobile ? Math.min(dockControls.dockSize, 36) : dockControls.dockSize;
      const magnification = mobile || shouldReduceMotion ? 0 : dockControls.magnification;
      // Include maximum hover growth, dock padding, bottom margin and breathing room.
      const space = navMode === "dock" ? size * (1 + magnification / 100) + 60 : 0;
      document.documentElement.style.setProperty("--site-dock-safe-space", `${space}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--site-dock-safe-space");
    };
  }, [navMode, dockControls.dockSize, dockControls.magnification, shouldReduceMotion]);

  useLayoutEffect(() => () => {
    document.documentElement.style.removeProperty("--site-header-measured-offset");
    document.documentElement.style.removeProperty("--site-dock-safe-space");
  }, []);

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
        backgroundMotionSpeed={backgroundMotionSpeed}
        onBackgroundMotionSpeedChange={setBackgroundMotionSpeed}
      />
    </div>
  );
};

export default SiteNavigation;
