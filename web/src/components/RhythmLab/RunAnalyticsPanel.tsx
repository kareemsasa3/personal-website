import { useMemo } from "react";
import {
  formatPercent,
  formatScore,
  type RunHistoryEntry,
} from "./helpers";
import type { RhythmLabChart } from "./library/types";
import {
  getRunAnalytics,
  getChartGroupAnalytics,
  type ChartGroupAnalytics,
} from "./runAnalytics";

interface RunAnalyticsPanelProps {
  history: RunHistoryEntry[];
  recordedCharts: RhythmLabChart[];
}

const formatPlayTime = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const ChartGroupRow = ({ group }: { group: ChartGroupAnalytics }) => (
  <div className="rhythm-lab-analytics-song">
    <div className="rhythm-lab-analytics-song-header">
      <span className="rhythm-lab-analytics-song-title">
        {group.songTitle} — {group.chartLabel}
      </span>
      <span className="rhythm-lab-analytics-song-attempts">
        {group.completedAttempts}/{group.attempts} completed
      </span>
    </div>
    <div className="rhythm-lab-analytics-song-stats">
      {group.bestCompletedScore !== null && (
        <span>Best {formatScore(group.bestCompletedScore)}</span>
      )}
      {group.bestCompletedAccuracy !== null && (
        <span>{formatPercent(group.bestCompletedAccuracy)}</span>
      )}
      <span>Avg {formatPercent(group.averageAccuracy)}</span>
      {group.improvement !== null && (
        <span
          className={
            group.improvement > 0
              ? "rhythm-lab-analytics-positive"
              : group.improvement < 0
                ? "rhythm-lab-analytics-negative"
                : ""
          }
        >
          {group.improvement > 0 ? "+" : ""}
          {formatScore(group.improvement)}
        </span>
      )}
    </div>
  </div>
);

const RunAnalyticsPanel = ({
  history,
  recordedCharts,
}: RunAnalyticsPanelProps) => {
  const chartsById = useMemo(() => {
    const map = new Map<string, RhythmLabChart>();
    for (const chart of recordedCharts) {
      map.set(chart.id, chart);
    }
    return map;
  }, [recordedCharts]);

  const analytics = useMemo(() => getRunAnalytics(history), [history]);
  const chartGroups = useMemo(
    () => getChartGroupAnalytics(history, chartsById),
    [history, chartsById]
  );

  if (history.length === 0) {
    return (
      <div className="rhythm-lab-analytics">
        <p className="rhythm-lab-analytics-empty">No runs yet</p>
      </div>
    );
  }

  return (
    <div className="rhythm-lab-analytics">
      <div className="rhythm-lab-analytics-cards">
        <div className="rhythm-lab-analytics-card">
          <dt>Total runs</dt>
          <dd>{analytics.totalRuns}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt>Completed</dt>
          <dd>{analytics.completedRuns}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt>Ended early</dt>
          <dd>{analytics.earlyEndedRuns}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt>Avg accuracy</dt>
          <dd>{formatPercent(analytics.averageAccuracyPercent)}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt>Best score</dt>
          <dd>
            {analytics.bestCompletedScore
              ? formatScore(analytics.bestCompletedScore.score)
              : "N/A"}
          </dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt>Best accuracy</dt>
          <dd>
            {analytics.bestCompletedAccuracy
              ? formatPercent(
                  analytics.bestCompletedAccuracy.accuracyPercent
                )
              : "N/A"}
          </dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt>Play time</dt>
          <dd>{formatPlayTime(analytics.totalPlayTimeMs)}</dd>
        </div>
      </div>

      {chartGroups.length > 0 && (
        <div className="rhythm-lab-analytics-songs">
          <h3 className="rhythm-lab-analytics-section-title">
            Per-chart stats
          </h3>
          {chartGroups.map((group) => (
            <ChartGroupRow key={group.groupKey} group={group} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RunAnalyticsPanel;
