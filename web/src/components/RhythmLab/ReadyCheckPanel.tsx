interface ReadyCheckPanelProps {
  chartTitle: string;
  chartModeLabel: string;
  onStart: () => void;
}

const ReadyCheckPanel = ({
  chartTitle,
  chartModeLabel,
  onStart,
}: ReadyCheckPanelProps) => (
  <div className="rhythm-lab-overlay">
    <div className="rhythm-lab-overlay-panel">
      <p>
        {chartTitle} - {chartModeLabel}
      </p>
      <h2>Ready Check</h2>
      <button
        className="rhythm-lab-primary-action"
        type="button"
        onClick={onStart}
      >
        Start
      </button>
      <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
    </div>
  </div>
);

export default ReadyCheckPanel;
