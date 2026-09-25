import { MotionConfig } from "framer-motion";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LayoutContextProvider } from "../contexts/LayoutContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { NavigationModeProvider } from "../contexts/NavigationModeContext";
import { ToastContainer } from "../components/common";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <LayoutContextProvider>
        <SettingsProvider>
          <NavigationModeProvider>
            <ToastContainer>
              <MotionConfig reducedMotion="user"><BrowserRouter>{children}</BrowserRouter></MotionConfig>
            </ToastContainer>
          </NavigationModeProvider>
        </SettingsProvider>
      </LayoutContextProvider>
    </ThemeProvider>
  );
};
