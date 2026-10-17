import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import "./Dock.css";

interface DockSettingsButtonProps {
  isOpen: boolean;
  onClick: () => void;
  baseSize: number;
}

const DockSettingsButton = ({
  isOpen,
  onClick,
  baseSize,
}: DockSettingsButtonProps) => {
  return (
    <button
      className="dock-settings-button df-control df-control--latch"
      onClick={onClick}
      aria-label="Open settings"
      aria-pressed={isOpen}
    >
      <div
        className="dock-icon"
        style={{
          width: `calc(${baseSize}px - 2 * var(--space-2))`,
          height: `calc(${baseSize}px - 2 * var(--space-2))`,
          fontSize: `calc((${baseSize}px - 2 * var(--space-2)) * 0.75)`,
        }}
      >
        <FontAwesomeIcon icon={faCog} />
      </div>
    </button>
  );
};

export default DockSettingsButton;
