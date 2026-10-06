import { normalizeRoutePath } from "./routeMetadata";

/** Routes that show the global scroll progress bar. */
const scrollProgressPaths = new Set(["/", "/projects", "/experience", "/work", "/journey"]);

/** Production serves these as `/path/`, so match through the shared route normalization. */
export const showsScrollProgress = (pathname: string) =>
  scrollProgressPaths.has(normalizeRoutePath(pathname));
