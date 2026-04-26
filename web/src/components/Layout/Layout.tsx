import { Outlet, useLocation } from "react-router-dom";
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
import {
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_URL,
  SITE_URL,
  defaultRouteMetadata,
  routeMetadataByPath,
} from "../../data/routeMetadata";
import { structuredDataJson } from "../../data/structuredData";
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
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4, // Slightly longer duration to allow sections to settle
};

const Layout = () => {
  const location = useLocation();
  const { mainContentAreaRef } = useLayoutContext();
  const { navMode } = useNavigationMode();
  const [isLoading, setIsLoading] = useState(true);
  const hasMarkedAppReady = useRef(false);
  const isInitialLoad = useRef(true);

  // Memoize the key to prevent unnecessary re-renders
  const pageKey = useMemo(() => location.pathname, [location.pathname]);

  // Show loading state on route change
  useEffect(() => {
    setIsLoading(true);
    const minimumLoadDuration = isInitialLoad.current ? 300 : 500;

    // Use a shorter minimum on first load while preserving the existing route transition timing.
    const timer = setTimeout(() => {
      setIsLoading(false);
      isInitialLoad.current = false;
    }, minimumLoadDuration);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoading && !hasMarkedAppReady.current) {
      document.documentElement.classList.add("app-ready");
      hasMarkedAppReady.current = true;
    }
  }, [isLoading]);

  useEffect(() => {
    const meta = routeMetadataByPath[location.pathname] || defaultRouteMetadata;
    const canonicalUrl = `${SITE_URL}${meta.canonicalPath}`;

    if (document.title !== meta.title) document.title = meta.title;

    const setMetaContent = (selector: string, content: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element && element.content !== content) {
        element.content = content;
      }
    };

    const canonicalElement = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    if (canonicalElement && canonicalElement.href !== canonicalUrl) {
      canonicalElement.href = canonicalUrl;
    }

    setMetaContent('meta[name="description"]', meta.description);
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', meta.description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[property="og:image"]', DEFAULT_IMAGE_URL);
    setMetaContent('meta[property="og:image:alt"]', DEFAULT_IMAGE_ALT);
    setMetaContent('meta[name="twitter:title"]', meta.title);
    setMetaContent('meta[name="twitter:description"]', meta.description);
    setMetaContent('meta[name="twitter:image"]', DEFAULT_IMAGE_URL);
    setMetaContent('meta[name="twitter:image:alt"]', DEFAULT_IMAGE_ALT);

    const structuredDataElement = document.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"][data-site-structured-data="true"]'
    );
    if (
      structuredDataElement &&
      structuredDataElement.textContent !== structuredDataJson
    ) {
      structuredDataElement.textContent = structuredDataJson;
    }
  }, [location.pathname]);

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
            {isLoading ? (
              <PageLoader />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pageKey}
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                  style={{ width: "100%", minHeight: "100%" }}
                >
                  <Suspense fallback={<PageLoader />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
};

export default Layout;
