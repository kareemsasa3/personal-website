import { Suspense, useEffect, type ReactElement } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AppProviders } from "./providers";
import Layout from "./components/Layout/Layout";
import { ErrorBoundary, PageLoader } from "./components/common";
import {
  mainRoutes,
  immersiveRoutes,
  defaultRoute,
  notFoundRoute,
} from "./routes";
import {
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_URL,
  SITE_URL,
  defaultRouteMetadata,
  routeMetadataByPath,
} from "./data/routeMetadata";
import { getStructuredDataJson } from "./data/structuredData";

const RouteMetadataUpdater = () => {
  const location = useLocation();

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
    const structuredDataJson = getStructuredDataJson(location.pathname);
    if (
      structuredDataElement &&
      structuredDataElement.textContent !== structuredDataJson
    ) {
      structuredDataElement.textContent = structuredDataJson;
    }
  }, [location.pathname]);

  return null;
};

const immersiveRouteElement = (element: ReactElement) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{element}</Suspense>
  </ErrorBoundary>
);

const AppRoutes = () => {
  useEffect(() => {
    document.documentElement.classList.add("app-ready");
  }, []);

  return (
    <>
      <RouteMetadataUpdater />
      <Routes>
        {/* The Layout route wraps standard site pages */}
        <Route path="/" element={<Layout />}>
          {/* The 'index' route is the default page for the parent's path ("/") */}
          <Route index={defaultRoute.index} element={defaultRoute.element} />

          {/* All other pages - Suspense boundaries are now handled in Layout */}
          {mainRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}

          {/* Catch-all route for 404 pages */}
          <Route path={notFoundRoute.path} element={notFoundRoute.element} />
        </Route>

        {/* Render immersive routes that bypass the standard site Layout shell. */}
        {immersiveRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={immersiveRouteElement(route.element)}
          />
        ))}
      </Routes>
    </>
  );
};

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
