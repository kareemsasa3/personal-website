import { Link } from "react-router-dom";
import type { GamePhase } from "./types";

interface ActiveSessionHeaderProps {
  fileName: string | null;
  activeChartModeLabel: string;
  isRecording: boolean;
  recordingCount: number;
  isPausedAfterVisibilityChange: boolean;
  phase: GamePhase;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onStopRecording: () => void;
}

const ActiveSessionHeader = ({
  fileName,
  activeChartModeLabel,
  isRecording,
  recordingCount,
  isPausedAfterVisibilityChange,
  phase,
  onPause,
  onResume,
  onRestart,
  onStopRecording,
}: ActiveSessionHeaderProps) => {
  const activeAudioLabel = fileName ?? "Local audio";

  return (
    <div
      className="rhythm-lab-active-bar"
      aria-label="Active session controls"
    >
      <Link className="rhythm-lab-back-link" to="/games">
        Games
      </Link>
      <div className="rhythm-lab-active-context" aria-live="polite">
        <span
          className="rhythm-lab-active-filename"
          title={activeAudioLabel}
          aria-label={activeAudioLabel}
        >
          {activeAudioLabel}
        </span>
        <span className="rhythm-lab-active-chip rhythm-lab-active-chart">
          {activeChartModeLabel}
        </span>
        <span
          className={`rhythm-lab-active-chip rhythm-lab-active-status ${
            isRecording ? "rhythm-lab-active-chip-recording" : ""
          }`}
        >
          {isRecording ? `${recordingCount} taps` : "Playing"}
        </span>
      </div>
      <div className="rhythm-lab-active-actions">
        {isPausedAfterVisibilityChange && phase === "playing" && (
          <button
            className="rhythm-lab-compact-action"
            type="button"
            onClick={onResume}
          >
            Resume
          </button>
        )}
        {isRecording ? (
          <button
            className="rhythm-lab-compact-action rhythm-lab-compact-action-danger"
            type="button"
            onClick={onStopRecording}
          >
            Stop
          </button>
        ) : (
          <>
            {phase === "playing" && !isPausedAfterVisibilityChange && (
              <button
                className="rhythm-lab-compact-action"
                type="button"
                onClick={onPause}
              >
                Pause
              </button>
            )}
            <button
              className="rhythm-lab-compact-action"
              type="button"
              onClick={onRestart}
            >
              Restart
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ActiveSessionHeader;
