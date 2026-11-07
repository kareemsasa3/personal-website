import { useState, useEffect, useReducer } from "react";
import { z } from "zod";

// Zod probes for eval support (Function("")) to compile fast parsers. The site's
// Content-Security-Policy does not allow eval, so skip the probe instead of
// raising a CSP violation on every page that parses dock settings.
z.config({ jitless: true });

// Schema validation for dock settings
const DockSettingsSchema = z.object({
  dockSize: z.number().min(40).max(60),
});

// Unified state interface
interface DockState {
  dockSize: number;
}

type DockAction =
  | { type: "SET_ALL_SETTINGS"; payload: DockState }
  | { type: "SET_DOCK_SIZE"; payload: number };

// Unified reducer for all dock state
function dockReducer(state: DockState, action: DockAction): DockState {
  switch (action.type) {
    case "SET_ALL_SETTINGS":
      return { ...state, ...action.payload };
    case "SET_DOCK_SIZE":
      return { ...state, dockSize: action.payload };
    default:
      return state;
  }
}

export const useDock = () => {
  const [shiftAmount, setShiftAmount] = useState(0);

  // Unified state management
  const [state, dispatch] = useReducer(dockReducer, {
    dockSize: 40,
  });

  // Load saved settings from localStorage with schema validation
  useEffect(() => {
    const savedSettings = localStorage.getItem("dockSettings");
    if (savedSettings) {
      try {
        const parsedJson = JSON.parse(savedSettings);
        // Use the schema to parse and validate. It will throw if it doesn't match.
        const validatedSettings = DockSettingsSchema.parse(parsedJson);
        dispatch({ type: "SET_ALL_SETTINGS", payload: validatedSettings });
      } catch (error) {
        // This now catches both JSON syntax errors and validation errors
        console.warn("Failed to parse or validate saved dock settings:", error);
        // Clear the invalid data from localStorage to prevent future issues
        localStorage.removeItem("dockSettings");
      }
    }
  }, []);

  // Decoupled side effect: Save settings to localStorage when they change
  useEffect(() => {
    try {
      const settingsToSave = { dockSize: state.dockSize };
      localStorage.setItem("dockSettings", JSON.stringify(settingsToSave));
    } catch (error) {
      console.warn("Failed to save dock settings:", error);
    }
  }, [state.dockSize]);

  // Decoupled side effect: Update CSS variable when dock size changes
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--dock-icon-size",
      `${state.dockSize}px`
    );
  }, [state.dockSize]);

  // Streamlined responsive logic with debouncing
  useEffect(() => {
    const calculateShift = () => {
      // This will be handled by the SettingsContext now
      return 0;
    };

    // Debounce function for resize events
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShiftAmount(calculateShift());
      }, 150); // Wait 150ms after the last resize event
    };

    // Set the initial value
    setShiftAmount(calculateShift());

    window.addEventListener("resize", debouncedHandler);

    // Cleanup
    return () => {
      window.removeEventListener("resize", debouncedHandler);
      clearTimeout(timeoutId);
    };
  }, []); // No longer depends on settings state

  // Simplified action handlers
  const handleDockSizeChange = (newSize: number) =>
    dispatch({ type: "SET_DOCK_SIZE", payload: newSize });

  return {
    // State
    dockSize: state.dockSize,
    shiftAmount,

    // Actions
    handleDockSizeChange,
  };
};

export type DockControls = ReturnType<typeof useDock>;
