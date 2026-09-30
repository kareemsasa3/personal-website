// Source revision resolved at build time by vite.config.ts and injected as
// __BUILD_INFO__. Type-only so the Vite config can import it safely.
export type BuildInfo =
  | { source: "ci"; sha: string }
  | { source: "local"; sha: string; dirty: boolean }
  | { source: "none" };
