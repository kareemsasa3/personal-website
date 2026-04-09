import { useNavigationMode } from "../../contexts/NavigationModeContext";
import { NavigationMode } from "../../contexts/NavigationModeContextTypes";
import "./NavigationModeToggle.css";

const options: NavigationMode[] = ["dock", "header"];

interface NavigationModeToggleProps {
  className?: string;
}

const formatNavigationMode = (mode: NavigationMode) =>
  mode === "dock" ? "Dock" : "Header";

const NavigationModeToggle = ({ className = "" }: NavigationModeToggleProps) => {
  const { navMode, setNavMode } = useNavigationMode();

  return (
    <div
      className={`nav-mode-toggle ${className}`.trim()}
      role="group"
      aria-label="Navigation mode"
    >
      {options.map((mode) => {
        const isActive = mode === navMode;

        return (
          <button
            key={mode}
            type="button"
            className={`nav-mode-toggle__button ${isActive ? "active" : ""}`}
            onClick={() => setNavMode(mode)}
            aria-pressed={isActive}
          >
            {formatNavigationMode(mode)}
          </button>
        );
      })}
    </div>
  );
};

export default NavigationModeToggle;
