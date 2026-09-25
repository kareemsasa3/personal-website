// Settings utility for managing all user preferences with local storage

export interface UserSettings {
  // Dock settings
  dockSize: number;
  dockStiffness: number;
  magnification: number;

  // Animation settings
  isAnimationPaused: boolean;
  backgroundMotionSpeed?: number;

  // UI settings
  isSettingsOpen: boolean;
  navMode: "dock" | "header";

  // Theme can be included in exported settings, but runtime ownership
  // lives in ThemeContext rather than this persistence utility.
  theme?: "light" | "dark";
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  dockSize: 40,
  dockStiffness: 400,
  magnification: 40,
  isAnimationPaused: false,
  isSettingsOpen: false,
  navMode: "header",
  backgroundMotionSpeed: 1,
};

// Local storage keys
const STORAGE_KEYS = {
  DOCK_SETTINGS: "dockSettings",
  ANIMATION_PAUSED: "web-animation-paused",
  SETTINGS_OPEN: "web-settings-open",
  BACKGROUND_MOTION_SPEED: "web-background-motion-speed",
  LEGACY_MATRIX_SPEED: "web-matrix-speed",
  NAV_MODE: "web-nav-mode",
} as const;

const clampBackgroundMotionSpeed = (value: number) =>
  Math.min(2, Math.max(0.5, value));

const getBackgroundMotionSpeed = (): number => {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEYS.BACKGROUND_MOTION_SPEED) ??
      localStorage.getItem(STORAGE_KEYS.LEGACY_MATRIX_SPEED);

    if (saved != null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return clampBackgroundMotionSpeed(parsed);
    }
  } catch {
    // ignore localStorage read failures
  }

  return DEFAULT_SETTINGS.backgroundMotionSpeed ?? 1;
};

// Settings validation schema
const validateDockSettings = (settings: unknown) => {
  if (!settings || typeof settings !== "object") return false;

  const settingsObj = settings as Record<string, unknown>;
  const { dockSize, dockStiffness, magnification } = settingsObj;

  return (
    typeof dockSize === "number" &&
    dockSize >= 40 &&
    dockSize <= 60 &&
    typeof dockStiffness === "number" &&
    dockStiffness >= 200 &&
    dockStiffness <= 600 &&
    typeof magnification === "number" &&
    magnification >= 20 &&
    magnification <= 100
  );
};

const validateBoolean = (value: unknown): boolean => {
  return typeof value === "boolean";
};

// Settings getters
export const getDockSettings = (): Partial<UserSettings> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DOCK_SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (validateDockSettings(parsed)) {
        return {
          dockSize: parsed.dockSize,
          dockStiffness: parsed.dockStiffness,
          magnification: parsed.magnification,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to load dock settings:", error);
  }
  return {};
};

export const getAnimationPaused = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ANIMATION_PAUSED);
    if (saved && validateBoolean(JSON.parse(saved))) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn("Failed to load animation paused setting:", error);
  }
  return false;
};

export const getSettingsOpen = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS_OPEN);
    if (saved && validateBoolean(JSON.parse(saved))) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn("Failed to load settings open state:", error);
  }
  return false;
};

// Settings setters
export const setDockSettings = (
  settings: Partial<
    Pick<UserSettings, "dockSize" | "dockStiffness" | "magnification">
  >
) => {
  try {
    const current = getDockSettings();
    const updated = { ...current, ...settings };

    if (validateDockSettings(updated)) {
      localStorage.setItem(STORAGE_KEYS.DOCK_SETTINGS, JSON.stringify(updated));
    }
  } catch (error) {
    console.warn("Failed to save dock settings:", error);
  }
};

export const setAnimationPaused = (paused: boolean) => {
  try {
    if (validateBoolean(paused)) {
      localStorage.setItem(
        STORAGE_KEYS.ANIMATION_PAUSED,
        JSON.stringify(paused)
      );
    }
  } catch (error) {
    console.warn("Failed to save animation paused setting:", error);
  }
};

export const setSettingsOpen = (open: boolean) => {
  try {
    if (validateBoolean(open)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS_OPEN, JSON.stringify(open));
    }
  } catch (error) {
    console.warn("Failed to save settings open state:", error);
  }
};

// Get all non-theme settings. Theme can be passed in by the caller when exporting.
export const getAllSettings = (
  theme?: "light" | "dark"
): UserSettings => {
  return {
    ...DEFAULT_SETTINGS,
    ...getDockSettings(),
    isAnimationPaused: getAnimationPaused(),
    isSettingsOpen: getSettingsOpen(),
    navMode: (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.NAV_MODE);
        if (saved === "dock" || saved === "header") return saved;
      } catch {
        // ignore localStorage read failures
      }
      return DEFAULT_SETTINGS.navMode;
    })(),
    ...(theme ? { theme } : {}),
    backgroundMotionSpeed: getBackgroundMotionSpeed(),
  };
};

// Reset all settings to defaults
export const resetAllSettings = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn("Failed to reset settings:", error);
  }
};

// Export storage keys for external use
export { STORAGE_KEYS };


export const SETTINGS_EXPORT_VERSION = 1;
export function parseSettingsImport(value: unknown): Partial<UserSettings> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a settings object");
  const data = value as Record<string, unknown>;
  if (data.version !== undefined && data.version !== SETTINGS_EXPORT_VERSION) throw new Error("Unsupported settings version");
  const result: Partial<UserSettings> = {};
  const ranges = { dockSize: [40, 60], dockStiffness: [200, 600], magnification: [20, 100], backgroundMotionSpeed: [.5, 2] } as const;
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const supplied = data[key] !== undefined ? data[key] : (key === "backgroundMotionSpeed" ? data.matrixSpeed : undefined);
    if (supplied === undefined) continue;
    const [min, max] = ranges[key];
    if (typeof supplied !== "number" || !Number.isFinite(supplied) || supplied < min || supplied > max) throw new Error(`Invalid ${key}`);
    result[key] = supplied;
  }
  if (data.theme !== undefined) {
    if (data.theme !== "dark" && data.theme !== "light") throw new Error("Invalid theme");
    result.theme = data.theme;
  }
  if (data.navMode !== undefined) {
    if (data.navMode !== "dock" && data.navMode !== "header") throw new Error("Invalid navigation mode");
    result.navMode = data.navMode;
  }
  if (data.isAnimationPaused !== undefined) {
    if (typeof data.isAnimationPaused !== "boolean") throw new Error("Invalid animation state");
    result.isAnimationPaused = data.isAnimationPaused;
  }
  if (data.isSettingsOpen !== undefined && typeof data.isSettingsOpen !== "boolean") throw new Error("Invalid panel state");
  if (!Object.keys(result).length) throw new Error("No supported preferences found");
  return result;
}
