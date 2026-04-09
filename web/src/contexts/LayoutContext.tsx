import React, {
  createContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";

// Define the shape of a section
export interface PageSection {
  id: string;
  label: string;
}

// Define the shape of the context data
interface LayoutContextType {
  mainContentAreaRef: React.RefObject<HTMLElement>;
  sections: PageSection[];
  activeSection: string;
  isAnimationPaused: boolean;
  backgroundMotionSpeed: number;
  setSections: (sections: PageSection[]) => void;
  setActiveSection: (id: string) => void;
  setIsAnimationPaused: (paused: boolean) => void;
  setBackgroundMotionSpeed: (speed: number) => void;
}

// Create the context with a default value
const LayoutContext = createContext<LayoutContextType>({
  mainContentAreaRef: { current: null },
  sections: [],
  activeSection: "",
  isAnimationPaused: false,
  backgroundMotionSpeed: 1,
  setSections: () => {},
  setActiveSection: () => {},
  setIsAnimationPaused: () => {},
  setBackgroundMotionSpeed: () => {},
});

const BACKGROUND_MOTION_SPEED_STORAGE_KEY = "workfolio-background-motion-speed";
const LEGACY_MATRIX_SPEED_STORAGE_KEY = "workfolio-matrix-speed";

const clampBackgroundMotionSpeed = (value: number) =>
  Math.min(2, Math.max(0.5, value));

const readStoredBackgroundMotionSpeed = () => {
  if (typeof window === "undefined") return 1;

  const saved =
    localStorage.getItem(BACKGROUND_MOTION_SPEED_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_MATRIX_SPEED_STORAGE_KEY);
  const parsed = saved ? parseFloat(saved) : 1;

  if (!isNaN(parsed)) {
    return clampBackgroundMotionSpeed(parsed);
  }

  return 1;
};

// Create the provider component
export const LayoutContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");

  // Initialize animation pause state from localStorage
  const [isAnimationPaused, setIsAnimationPaused] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("workfolio-animation-paused");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [backgroundMotionSpeed, setBackgroundMotionSpeed] = useState<number>(
    readStoredBackgroundMotionSpeed
  );

  const mainContentAreaRef = useRef<HTMLElement>(null);

  // Save animation pause state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "workfolio-animation-paused",
        JSON.stringify(isAnimationPaused)
      );
    }
  }, [isAnimationPaused]);

  // Persist normalized background motion speed to the new storage key.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        BACKGROUND_MOTION_SPEED_STORAGE_KEY,
        String(backgroundMotionSpeed)
      );
    }
  }, [backgroundMotionSpeed]);

  const value = {
    mainContentAreaRef,
    sections,
    activeSection,
    isAnimationPaused,
    backgroundMotionSpeed,
    setSections,
    setActiveSection,
    setIsAnimationPaused,
    setBackgroundMotionSpeed,
  };

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
};

export default LayoutContext;

// Re-export the useLayoutContext hook
// eslint-disable-next-line react-refresh/only-export-components
export { useLayoutContext } from "./useLayoutContext";
