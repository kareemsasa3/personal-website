import { useContext } from "react";
import { NavigationModeContext } from "./NavigationModeContextTypes";

export const useNavigationMode = () => {
  const context = useContext(NavigationModeContext);
  if (context === undefined) {
    throw new Error(
      "useNavigationMode must be used within a NavigationModeProvider"
    );
  }
  return context;
};
