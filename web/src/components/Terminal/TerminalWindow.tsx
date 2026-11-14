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

// The window controls' signs (§14 Iconography, 16 px): whole-pixel 2 px strokes, square terminals, one colour taken
// from the control. Shown in place of the words where the toolbar is compact (TerminalWindow.css); the control's
// accessible name is its aria-label either way.
const sign = (path: string) => (
  <svg className="terminal-button-sign" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d={path} fill="currentColor" fillRule="evenodd" />
  </svg>
);
const SIGNS = {
  // Two 2 px diagonals.
  close: "M2.6 1.2 8 6.6 13.4 1.2 14.8 2.6 9.4 8 14.8 13.4 13.4 14.8 8 9.4 2.6 14.8 1.2 13.4 6.6 8 1.2 2.6Z",
  // A bar on the baseline.
  minimize: "M2 12H14V14H2Z",
  // A frame with one 45° cut, so its silhouette is not a plain square.
  maximize: "M2 2H11L14 5V14H2ZM4 4V12H12V5.8L10.2 4Z",
  // A smaller frame in front of the corner of the one behind it.
  restore: "M2 6H10V14H2ZM4 8V12H8V8ZM6 2H14V10H12V4H6Z",
};

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
            same words, so it keeps its case where the label voice renders the visible text in capitals. On the compact
            toolbar (small or coarse-pointer screens) each shows its sign instead of the words. */}
        <div className="terminal-buttons">
          <button
            className="terminal-button close df-control df-label"
            onClick={onClose}
            aria-label="Close terminal"
          >
            <span className="terminal-button-label">Close terminal</span>
            {sign(SIGNS.close)}
          </button>
          <button
            className="terminal-button minimize df-control df-label"
            onClick={onMinimize}
            aria-label="Minimize terminal"
          >
            <span className="terminal-button-label">Minimize terminal</span>
            {sign(SIGNS.minimize)}
          </button>
          <button
            className="terminal-button maximize df-control df-label"
            onClick={onMaximize}
            aria-label={maximizeLabel}
          >
            <span className="terminal-button-label">{maximizeLabel}</span>
            {sign(isMaximized ? SIGNS.restore : SIGNS.maximize)}
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
