/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BUILD_INFO__: import("./types/buildInfo").BuildInfo
