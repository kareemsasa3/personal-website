import React, { ReactNode, useEffect, useState } from "react";
import {
  NavigationMode,
  NavigationModeContext,
} from "./NavigationModeContextTypes";

const NAV_MODE_STORAGE_KEY = "workfolio-nav-mode";
const DEFAULT_NAV_MODE: NavigationMode = "header";

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
  const [navMode, setNavModeState] = useState<NavigationMode>(
    resolveInitialNavigationMode
  );

  useEffect(() => {
    try {
      localStorage.setItem(NAV_MODE_STORAGE_KEY, navMode);
    } catch {
      // Ignore localStorage persistence failures.
    }

    applyNavigationModeToDocument(navMode);
  }, [navMode]);

  const setNavMode = (mode: NavigationMode) => {
    setNavModeState(mode);
  };

  const toggleNavMode = () => {
    setNavModeState((currentMode) =>
      currentMode === "dock" ? "header" : "dock"
    );
  };

  return (
    <NavigationModeContext.Provider
      value={{ navMode, setNavMode, toggleNavMode }}
    >
      {children}
    </NavigationModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { useNavigationMode } from "./useNavigationMode";
