import React, { ReactNode, useEffect, useState } from "react";
import {
  NavigationMode,
  NavigationModeContext,
} from "./NavigationModeContextTypes";
import { useMediaQuery } from "../hooks/useMediaQuery";

const NAV_MODE_STORAGE_KEY = "web-nav-mode";
const DEFAULT_NAV_MODE: NavigationMode = "header";

// The dock is not phone-safe below this width; the header is used there instead.
const DOCK_AVAILABLE_QUERY = "(min-width: 430px)";

const isNavigationMode = (value: string | null): value is NavigationMode => {
  return value === "dock" || value === "header";
};

const applyNavigationModeToDocument = (mode: NavigationMode) => {
  document.documentElement.dataset.navMode = mode;
};

const resolveInitialNavigationMode = (): NavigationMode => {
  try {
    const savedMode = localStorage.getItem(NAV_MODE_STORAGE_KEY);
    if (isNavigationMode(savedMode)) {
      return savedMode;
    }
  } catch {
    // Ignore localStorage failures and keep the visitor-friendly header default.
  }

  return DEFAULT_NAV_MODE;
};

interface NavigationModeProviderProps {
  children: ReactNode;
}

export const NavigationModeProvider: React.FC<NavigationModeProviderProps> = ({
  children,
}) => {
  const [preferredNavMode, setPreferredNavMode] = useState<NavigationMode>(
    resolveInitialNavigationMode
  );
  const isDockAvailable = useMediaQuery(DOCK_AVAILABLE_QUERY);
  const navMode: NavigationMode =
    preferredNavMode === "dock" && !isDockAvailable ? "header" : preferredNavMode;

  useEffect(() => {
    try {
      localStorage.setItem(NAV_MODE_STORAGE_KEY, preferredNavMode);
    } catch {
      // Ignore localStorage persistence failures.
    }
  }, [preferredNavMode]);

  useEffect(() => {
    applyNavigationModeToDocument(navMode);
  }, [navMode]);

  const setNavMode = (mode: NavigationMode) => {
    setPreferredNavMode(mode);
  };

  const toggleNavMode = () => {
    setPreferredNavMode((currentMode) =>
      currentMode === "dock" ? "header" : "dock"
    );
  };

  return (
    <NavigationModeContext.Provider
      value={{ navMode, preferredNavMode, isDockAvailable, setNavMode, toggleNavMode }}
    >
      {children}
    </NavigationModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { useNavigationMode } from "./useNavigationMode";
