import { useMemo } from "react";
import { formatPercent, formatScore, type RunHistoryEntry } from "./helpers";
import type { RhythmLabChart } from "./library/types";

interface RunHistoryPanelProps {
  history: RunHistoryEntry[];
  recordedCharts: RhythmLabChart[];
  onClearHistory: () => void;
}

const formatTimestamp = (ms: number): string => {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const RunHistoryPanel = ({
  history,
  recordedCharts,
  onClearHistory,
}: RunHistoryPanelProps) => {
  const chartsById = useMemo(() => {
    const map = new Map<string, RhythmLabChart>();
    for (const chart of recordedCharts) {
      map.set(chart.id, chart);
    }
    return map;
  }, [recordedCharts]);

  if (history.length === 0) {
    return (
      <div className="rhythm-lab-run-history">
        <p className="rhythm-lab-run-history-empty">No runs yet</p>
      </div>
    );
  }

  return (
    <div className="rhythm-lab-run-history">
      <div className="rhythm-lab-run-history-list" role="list">
        {history.map((entry) => {
          const isPartial = entry.endReason === "ended_early";
          const songTitle =
            entry.songSnapshot?.title ?? "Unknown song";

          const currentChart = entry.chartSnapshot?.id
            ? chartsById.get(entry.chartSnapshot.id)
            : undefined;
          const currentLabel = currentChart?.name;
          const snapshotLabel = entry.chartSnapshot?.label;
          const chartLabel =
            currentLabel ?? snapshotLabel ?? "Unknown chart";
          const noteCount =
            entry.chartSnapshot?.noteCount ?? entry.totalChartNotes;

          return (
            <div
              key={entry.runId}
              className={`rhythm-lab-run-history-entry${
                isPartial
                  ? " rhythm-lab-run-history-entry-partial"
                  : ""
              }`}
              role="listitem"
            >
              <div className="rhythm-lab-run-history-entry-header">
                <span className="rhythm-lab-run-history-entry-song">
                  {songTitle}
                </span>
                <span className="rhythm-lab-run-history-entry-time">
                  {formatTimestamp(entry.playedAtMs)}
                </span>
              </div>
              <div className="rhythm-lab-run-history-entry-chart">
                <span>{chartLabel}</span>
                <span className="rhythm-lab-run-history-entry-notes">
                  {noteCount} notes
                </span>
              </div>
              <div className="rhythm-lab-run-history-entry-stats">
                <span>{formatScore(entry.score)}</span>
                <span>{formatPercent(entry.accuracyPercent)}</span>
                <span>Combo {entry.maxCombo}</span>
                {isPartial ? (
                  <span className="rhythm-lab-run-history-entry-badge">
                    Ended Early &middot; {entry.completionPercent}%
                  </span>
                ) : (
                  <span className="rhythm-lab-run-history-entry-badge rhythm-lab-run-history-entry-badge-complete">
                    Full
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="rhythm-lab-run-history-clear"
        type="button"
        onClick={onClearHistory}
      >
        Clear history
      </button>
    </div>
  );
};

export default RunHistoryPanel;
