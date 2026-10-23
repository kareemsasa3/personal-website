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
      <span className="rhythm-lab-analytics-song-title df-body-sm">
        {group.songTitle} — {group.chartLabel}
      </span>
      <span className="rhythm-lab-analytics-song-attempts df-data">
        {group.completedAttempts}/{group.attempts} completed
      </span>
    </div>
    <div className="rhythm-lab-analytics-song-stats">
      {group.bestCompletedScore !== null && (
        <span>
          <span className="rhythm-lab-analytics-label df-label-sm">Best</span>{" "}
          <span className="df-data">{formatScore(group.bestCompletedScore)}</span>
        </span>
      )}
      {group.bestCompletedAccuracy !== null && (
        <span className="df-data">{formatPercent(group.bestCompletedAccuracy)}</span>
      )}
      <span>
        <span className="rhythm-lab-analytics-label df-label-sm">Avg</span>{" "}
        <span className="df-data">{formatPercent(group.averageAccuracy)}</span>
      </span>
      {/* The change carries its sign in its text (§05): a plus added here, a minus from the formatted number. */}
      {group.improvement !== null && (
        <span className="df-data">
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
        <p className="rhythm-lab-analytics-empty df-body-sm">No runs yet</p>
      </div>
    );
  }

  return (
    <div className="rhythm-lab-analytics">
      <div className="rhythm-lab-analytics-cards">
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Total runs</dt>
          <dd className="df-data">{analytics.totalRuns}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Completed</dt>
          <dd className="df-data">{analytics.completedRuns}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Ended early</dt>
          <dd className="df-data">{analytics.earlyEndedRuns}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Avg accuracy</dt>
          <dd className="df-data">{formatPercent(analytics.averageAccuracyPercent)}</dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Best score</dt>
          <dd className="df-data">
            {analytics.bestCompletedScore
              ? formatScore(analytics.bestCompletedScore.score)
              : "N/A"}
          </dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Best accuracy</dt>
          <dd className="df-data">
            {analytics.bestCompletedAccuracy
              ? formatPercent(
                  analytics.bestCompletedAccuracy.accuracyPercent
                )
              : "N/A"}
          </dd>
        </div>
        <div className="rhythm-lab-analytics-card">
          <dt className="df-label-sm">Play time</dt>
          <dd className="df-data">{formatPlayTime(analytics.totalPlayTimeMs)}</dd>
        </div>
      </div>

      {chartGroups.length > 0 && (
        <div className="rhythm-lab-analytics-songs">
          <h3 className="rhythm-lab-analytics-section-title df-label-sm">
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
