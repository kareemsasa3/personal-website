import { useLocation, useNavigationType, useOutlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import AppBackground from "../AppBackground/AppBackground";
import SiteNavigation from "../Navigation/SiteNavigation";
import GlobalSectionNavigation from "./GlobalSectionNavigation";
import GlobalScrollProgress from "./GlobalScrollProgress";
import { PageLoader } from "../common";
import ErrorBoundary from "../common/ErrorBoundary";
import { useLayoutContext } from "../../contexts/LayoutContext";
import { useNavigationMode } from "../../contexts/NavigationModeContext";
import "./Layout.css";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4, // Slightly longer duration to allow sections to settle
};

// AnimatePresence keeps the exiting wrapper mounted while it animates out, but
// a live <Outlet /> inside it would already render the incoming route. Capture
// the outlet at mount so each wrapper stays pinned to the page it was created
// for.
const FrozenOutlet = () => {
  const outlet = useOutlet();
  const [frozenOutlet] = useState(outlet);
  return frozenOutlet;
};

const Layout = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { mainContentAreaRef } = useLayoutContext();
  const { navMode } = useNavigationMode();
  const pendingScrollReset = useRef(false);

  // Memoize the key to prevent unnecessary re-renders
  const pageKey = useMemo(() => location.pathname, [location.pathname]);

  // Start each newly navigated page at the top. Back/forward (POP) keeps the
  // browser's restoration, and #anchor links scroll themselves.
  useEffect(() => {
    if (navigationType === "POP" || location.hash) {
      pendingScrollReset.current = false;
      return;
    }

    pendingScrollReset.current = true;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash, navigationType]);

  // Reset again once the incoming page mounts: a touch fling still in
  // progress (e.g. iOS momentum scrolling) can override the first reset.
  const handleExitComplete = () => {
    if (pendingScrollReset.current) {
      pendingScrollReset.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };

  return (
    // Use a simple fragment, or a div with NO positioning/transform styles
    <>
      <AppBackground />

      {/* This is now the top-level container for all INTERACTIVE content */}
      <div className={`layout-foreground nav-mode-${navMode}`}>
        <GlobalScrollProgress />
        <SiteNavigation />
        <GlobalSectionNavigation />

        <main
          ref={mainContentAreaRef}
          id="main-content-area"
          className="app-content"
        >
          <ErrorBoundary>
            <AnimatePresence
              mode="wait"
              initial={false}
              onExitComplete={handleExitComplete}
            >
              <motion.div
                key={pageKey}
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
                style={{ width: "100%", minHeight: "100%" }}
              >
                <Suspense fallback={<PageLoader />}>
                  <FrozenOutlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
};

export default Layout;
