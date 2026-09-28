interface ReadyCheckPanelProps {
  chartTitle: string;
  chartModeLabel: string;
  onStart: () => void;
  tutorialActionLabel?: string;
  onStartTutorial?: () => void;
}

const ReadyCheckPanel = ({
  chartTitle,
  chartModeLabel,
  onStart,
  tutorialActionLabel,
  onStartTutorial,
}: ReadyCheckPanelProps) => (
  <div className="rhythm-lab-overlay">
    <div className="rhythm-lab-overlay-panel">
      <p>
        {chartTitle} - {chartModeLabel}
      </p>
      <h2>Ready Check</h2>
      <div className="rhythm-lab-summary-actions">
        <button
          className="rhythm-lab-primary-action"
          type="button"
          onClick={onStart}
        >
          Start
        </button>
        {onStartTutorial && tutorialActionLabel && (
          <button
            className="rhythm-lab-secondary-action"
            type="button"
            onClick={onStartTutorial}
          >
            {tutorialActionLabel}
          </button>
        )}
      </div>
      <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
    </div>
  </div>
);

export default ReadyCheckPanel;
