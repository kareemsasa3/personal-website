interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onEndSong: () => void;
}

const PauseMenu = ({
  onResume,
  onRestart,
  onEndSong,
}: PauseMenuProps) => (
  <div className="rhythm-lab-overlay">
    <div className="rhythm-lab-overlay-panel rhythm-lab-pause-panel">
      <h2 className="df-heading-2">Paused</h2>
      <div className="rhythm-lab-pause-actions">
        <button
          className="rhythm-lab-primary-action df-control df-label"
          type="button"
          onClick={onResume}
        >
          Resume
        </button>
        <button
          className="rhythm-lab-secondary-action df-control df-label"
          type="button"
          onClick={onRestart}
        >
          Restart
        </button>
        <button
          className="rhythm-lab-secondary-action df-control df-label"
          type="button"
          onClick={onEndSong}
        >
          End Song
        </button>
      </div>
      <span className="df-body-sm">Press Escape to resume</span>
    </div>
  </div>
);

export default PauseMenu;
