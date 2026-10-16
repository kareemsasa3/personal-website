import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import "./Dock.css";

interface DockSettingsButtonProps {
  isOpen: boolean;
  onClick: () => void;
  baseSize: number; // Add baseSize prop
}

const DockSettingsButton = ({
  isOpen,
  onClick,
  baseSize, // Use the prop
}: DockSettingsButtonProps) => {
  return (
    <button
      className={`dock-settings-button ${isOpen ? "active" : ""}`}
      onClick={onClick}
      aria-label="Open settings"
    >
      {/* Apply size directly */}
      <div
        className="dock-icon"
        style={{
          width: baseSize,
          height: baseSize,
          fontSize: baseSize * 0.6,
        }}
      >
        <FontAwesomeIcon icon={faCog} />
      </div>
      {/* Selected snaps in: the active marker is a plain element, shown while open. */}
      {isOpen && <div className="dock-active-indicator" />}
    </button>
  );
};

export default DockSettingsButton;
