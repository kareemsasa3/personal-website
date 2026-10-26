import type { RhythmLabRun } from "./library/types";
import {
  formatDelta,
  formatDurationMs,
  formatPercent,
  type RhythmRunSummary,
} from "./helpers";

interface RunSummaryPanelProps {
  runSummary: RhythmRunSummary;
  bestRun: RhythmLabRun | null;
  runStorageError: string | null;
  onRestart: () => void;
  onReturnToSetup: () => void;
}

const RunSummaryPanel = ({
  runSummary,
  bestRun,
  runStorageError,
  onRestart,
  onReturnToSetup,
}: RunSummaryPanelProps) => {
  const isEarlyExit = runSummary.endReason === "ended_early";
  const completionPercent =
    runSummary.totalChartNotes > 0
      ? Math.round(
          (runSummary.notesPlayed / runSummary.totalChartNotes) * 100
        )
      : 100;

  return (
    <div className="rhythm-lab-overlay">
      <div className="rhythm-lab-overlay-panel rhythm-lab-summary-panel">
        <p className="df-body-sm">{runSummary.chartLabel}</p>
        <h2 className="df-heading-2">{isEarlyExit ? "Ended Early" : "Run Summary"}</h2>
        {isEarlyExit && (
          <dl className="rhythm-lab-summary-progress">
            <div>
              <dt className="df-label-sm">Played</dt>
              <dd className="df-data">
                {formatDurationMs(runSummary.endedAtMs)} /{" "}
                {formatDurationMs(runSummary.chartDurationMs)}
              </dd>
            </div>
            <div>
              <dt className="df-label-sm">Completion</dt>
              <dd className="df-data">{completionPercent}%</dd>
            </div>
          </dl>
        )}
        <div className="rhythm-lab-summary-score">
          <span className="df-label">{isEarlyExit ? "Score" : "Final score"}</span>
          <strong className="df-readout-xl">{runSummary.score}</strong>
        </div>
      <dl className="rhythm-lab-summary-best">
        <div>
          <dt className="df-label-sm">Best score</dt>
          <dd className="df-data">{bestRun ? bestRun.score : "N/A"}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Best accuracy</dt>
          <dd className="df-data">{bestRun ? formatPercent(bestRun.accuracy) : "N/A"}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Best combo</dt>
          <dd className="df-data">{bestRun ? bestRun.maxCombo : "N/A"}</dd>
        </div>
      </dl>
      {runStorageError && (
        <p className="rhythm-lab-summary-warning df-error df-body-sm">{runStorageError}</p>
      )}
      <dl className="rhythm-lab-summary-metrics">
        <div>
          <dt className="df-label-sm">Max combo</dt>
          <dd className="df-data">{runSummary.maxCombo}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Accuracy</dt>
          <dd className="df-data">{formatPercent(runSummary.accuracyPercent)}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Perfect</dt>
          <dd className="df-data">{runSummary.perfectCount}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Good</dt>
          <dd className="df-data">{runSummary.goodCount}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Miss</dt>
          <dd className="df-data">{runSummary.missCount}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Empty miss</dt>
          <dd className="df-data">{runSummary.emptyInputMissCount}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Mean |delta|</dt>
          <dd className="df-data">{formatDelta(runSummary.meanAbsoluteDeltaMs)}</dd>
        </div>
        <div>
          <dt className="df-label-sm">Early / Late</dt>
          <dd className="df-data">
            {runSummary.earlyCount} / {runSummary.lateCount}
          </dd>
        </div>
      </dl>
      <div className="rhythm-lab-summary-actions">
        <button
          className="rhythm-lab-primary-action df-control df-label"
          type="button"
          onClick={onRestart}
        >
          Play again
        </button>
        <button
          className="rhythm-lab-secondary-action df-control df-label"
          type="button"
          onClick={onReturnToSetup}
        >
          Back to setup
        </button>
      </div>
      <span className="df-body-sm">A/S/D | J/K/L | Arrow keys | tap zones</span>
    </div>
  </div>
  );
};

export default RunSummaryPanel;
