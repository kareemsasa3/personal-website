import React, { useState, useLayoutEffect, ReactNode } from "react";
import { ThemeContext } from "./ThemeContextTypes";

// Export the Theme type
export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const THEME_SWITCHING_CLASS = "theme-switching";

const resolveInitialTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // Ignore localStorage failures and continue to the product default.
  }

  return "dark";
};

// Theme values live in src/styles/darkfield/tokens.css (generated from tokens.runtime.json)
// and the legacy aliases in bridge.css; switching a theme only selects one.
const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme === "light" ? "light" : "dark";
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  // Layout effect so the tokens change in the same frame as the rest of the
  // theme commit (e.g. the background swap), before the browser paints.
  useLayoutEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage persistence failures.
    }

    // Many components transition their own colors at different speeds, so a
    // plain token swap paints mixed old/new surfaces for ~400ms. Suppress
    // transitions while the tokens change and flush style for the whole
    // document so every element resolves the new values with transitions off;
    // lifting the suppression next frame then has nothing left to animate.
    const root = document.documentElement;
    root.classList.add(THEME_SWITCHING_CLASS);
    applyThemeToDocument(theme);
    void document.body.offsetHeight;
    const frame = requestAnimationFrame(() => {
      root.classList.remove(THEME_SWITCHING_CLASS);
    });

    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove(THEME_SWITCHING_CLASS);
    };
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState((prevTheme: Theme) =>
      prevTheme === "light" ? "dark" : "light"
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Re-export the useTheme hook
// eslint-disable-next-line react-refresh/only-export-components
export { useTheme } from "./useTheme";
