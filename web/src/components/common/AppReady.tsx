import { useLayoutEffect } from "react";
import PageLoader from "./PageLoader";
import { isAppReady, markAppReady } from "../../utils/appReady";

/**
 * Render beside the route inside its Suspense boundary: it commits only once the
 * route has resolved, and the layout effect swaps shell for app before paint.
 */
export const MarkAppReady = () => {
  useLayoutEffect(markAppReady, []);
  return null;
};

/** During startup the static shell already covers loading, so only later navigations show the loader. */
export const RouteLoadingFallback = () => (isAppReady() ? <PageLoader /> : null);
