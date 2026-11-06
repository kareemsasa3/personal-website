import React from "react";
import "./TerminalWindow.css";

interface TerminalWindowProps {
  children: React.ReactNode;
  containerStyles: React.CSSProperties;
  isMaximized: boolean;
  isDragging: boolean;
  currentDirectory: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  className?: string;
}

const TerminalWindow: React.FC<TerminalWindowProps> = ({
  children,
  containerStyles,
  isMaximized,
  isDragging,
  currentDirectory,
  onMouseDown,
  onClose,
  onMinimize,
  onMaximize,
  className = "",
}) => {
  const maximizeLabel = isMaximized ? "Restore terminal" : "Maximize terminal";
  return (
    <div
      className={`terminal-container ${isMaximized ? "maximized" : ""} ${
        isDragging ? "dragging" : ""
      } ${className}`}
      style={containerStyles}
      onMouseDown={onMouseDown}
    >
      <div className="terminal-header">
        {/* The controls show their accessible names as their labels (P5-7). The name stays an aria-label with the
            same words, so it keeps its case where the label voice renders the visible text in capitals. */}
        <div className="terminal-buttons">
          <button
            className="terminal-button close df-control df-label"
            onClick={onClose}
            aria-label="Close terminal"
          >
            Close terminal
          </button>
          <button
            className="terminal-button minimize df-control df-label"
            onClick={onMinimize}
            aria-label="Minimize terminal"
          >
            Minimize terminal
          </button>
          <button
            className="terminal-button maximize df-control df-label"
            onClick={onMaximize}
            aria-label={maximizeLabel}
          >
            {maximizeLabel}
          </button>
        </div>
        <div className="terminal-title df-data">
          portfolio@kareem-sasa:
          {currentDirectory === "/" ? "~" : currentDirectory}
          {isDragging && " (dragging)"}
        </div>
      </div>
      {children}
    </div>
  );
};

export default TerminalWindow;
