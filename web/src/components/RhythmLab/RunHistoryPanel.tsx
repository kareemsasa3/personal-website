import { useMemo, useState } from "react";
import { formatPercent, formatScore, type RunHistoryEntry } from "./helpers";
import type { RhythmLabChart } from "./library/types";
import ClearRunHistoryDialog from "./ClearRunHistoryDialog";

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
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

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
        <p className="rhythm-lab-run-history-empty df-body-sm">No runs yet</p>
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
              className="rhythm-lab-run-history-entry"
              role="listitem"
            >
              <div className="rhythm-lab-run-history-entry-header">
                <span className="rhythm-lab-run-history-entry-song df-body-sm">
                  {songTitle}
                </span>
                <span className="rhythm-lab-run-history-entry-time df-annotation">
                  {formatTimestamp(entry.playedAtMs)}
                </span>
              </div>
              <div className="rhythm-lab-run-history-entry-chart">
                <span className="df-body-sm">{chartLabel}</span>
                <span className="rhythm-lab-run-history-entry-notes df-data">
                  {noteCount} notes
                </span>
              </div>
              <div className="rhythm-lab-run-history-entry-stats">
                <span className="df-data">{formatScore(entry.score)}</span>
                <span className="df-data">{formatPercent(entry.accuracyPercent)}</span>
                <span>
                  <span className="rhythm-lab-run-history-label df-label-sm">Combo</span>{" "}
                  <span className="df-data">{entry.maxCombo}</span>
                </span>
                {isPartial ? (
                  <span className="rhythm-lab-run-history-entry-badge df-label-sm df-context">
                    Ended Early &middot; {entry.completionPercent}%
                  </span>
                ) : (
                  <span className="rhythm-lab-run-history-entry-badge df-label-sm df-context">
                    Full
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="rhythm-lab-run-history-clear df-control df-label"
        type="button"
        onClick={() => setIsClearDialogOpen(true)}
      >
        Clear history
      </button>
      {isClearDialogOpen && (
        <ClearRunHistoryDialog
          runCount={history.length}
          onCancel={() => setIsClearDialogOpen(false)}
          onConfirm={() => {
            onClearHistory();
            setIsClearDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default RunHistoryPanel;
