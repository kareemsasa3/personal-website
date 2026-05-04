import type { RhythmLabRun } from "./library/types";
import { formatDelta, formatPercent, type RhythmRunSummary } from "./helpers";

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
}: RunSummaryPanelProps) => (
  <div className="rhythm-lab-overlay">
    <div className="rhythm-lab-overlay-panel rhythm-lab-summary-panel">
      <p>{runSummary.chartLabel}</p>
      <h2>Run Summary</h2>
      <div className="rhythm-lab-summary-score">
        <span>Final score</span>
        <strong>{runSummary.score}</strong>
      </div>
      <dl className="rhythm-lab-summary-best">
        <div>
          <dt>Best score</dt>
          <dd>{bestRun ? bestRun.score : "N/A"}</dd>
        </div>
        <div>
          <dt>Best accuracy</dt>
          <dd>{bestRun ? formatPercent(bestRun.accuracy) : "N/A"}</dd>
        </div>
        <div>
          <dt>Best combo</dt>
          <dd>{bestRun ? bestRun.maxCombo : "N/A"}</dd>
        </div>
      </dl>
      {runStorageError && (
        <p className="rhythm-lab-summary-warning">{runStorageError}</p>
      )}
      <dl className="rhythm-lab-summary-metrics">
        <div>
          <dt>Max combo</dt>
          <dd>{runSummary.maxCombo}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{formatPercent(runSummary.accuracyPercent)}</dd>
        </div>
        <div>
          <dt>Perfect</dt>
          <dd>{runSummary.perfectCount}</dd>
        </div>
        <div>
          <dt>Good</dt>
          <dd>{runSummary.goodCount}</dd>
        </div>
        <div>
          <dt>Miss</dt>
          <dd>{runSummary.missCount}</dd>
        </div>
        <div>
          <dt>Empty miss</dt>
          <dd>{runSummary.emptyInputMissCount}</dd>
        </div>
        <div>
          <dt>Mean |delta|</dt>
          <dd>{formatDelta(runSummary.meanAbsoluteDeltaMs)}</dd>
        </div>
        <div>
          <dt>Early / Late</dt>
          <dd>
            {runSummary.earlyCount} / {runSummary.lateCount}
          </dd>
        </div>
      </dl>
      <div className="rhythm-lab-summary-actions">
        <button
          className="rhythm-lab-primary-action"
          type="button"
          onClick={onRestart}
        >
          Play again
        </button>
        <button
          className="rhythm-lab-secondary-action"
          type="button"
          onClick={onReturnToSetup}
        >
          Back to setup
        </button>
      </div>
      <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
    </div>
  </div>
);

export default RunSummaryPanel;
