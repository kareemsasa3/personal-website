import { createContext } from "react";

export type NavigationMode = "dock" | "header";

interface NavigationModeContextType {
  /** Mode actually rendered. Dock falls back to the header where it is unavailable. */
  navMode: NavigationMode;
  /** Mode the visitor chose; persisted even while it cannot be rendered. */
  preferredNavMode: NavigationMode;
  isDockAvailable: boolean;
  setNavMode: (mode: NavigationMode) => void;
  toggleNavMode: () => void;
}

export const NavigationModeContext = createContext<
  NavigationModeContextType | undefined
>(undefined);
