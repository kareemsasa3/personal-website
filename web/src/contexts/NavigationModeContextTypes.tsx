import { createContext } from "react";

export type NavigationMode = "dock" | "header";

interface NavigationModeContextType {
  navMode: NavigationMode;
  setNavMode: (mode: NavigationMode) => void;
  toggleNavMode: () => void;
}

export const NavigationModeContext = createContext<
  NavigationModeContextType | undefined
>(undefined);
