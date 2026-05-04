import { useMemo } from "react";
import {
  formatPercent,
  formatScore,
  type RunHistoryEntry,
} from "./helpers";
import {
  getRunAnalytics,
  getSongAnalytics,
  type SongAnalytics,
} from "./runAnalytics";

interface RunAnalyticsPanelProps {
  history: RunHistoryEntry[];
}

const formatPlayTime = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const SongRow = ({ song }: { song: SongAnalytics }) => (
  <div className="rhythm-lab-analytics-song">
    <div className="rhythm-lab-analytics-song-header">
      <span className="rhythm-lab-analytics-song-title">{song.songTitle}</span>
      <span className="rhythm-lab-analytics-song-attempts">
        {song.completedAttempts}/{song.attempts} completed
      </span>
    </div>
    <div className="rhythm-lab-analytics-song-stats">
      {song.bestCompletedScore !== null && (
        <span>Best {formatScore(song.bestCompletedScore)}</span>
      )}
      {song.bestCompletedAccuracy !== null && (
        <span>{formatPercent(song.bestCompletedAccuracy)}</span>
      )}
      <span>Avg {formatPercent(song.averageAccuracy)}</span>
      {song.improvement !== null && (
        <span
          className={
            song.improvement > 0
              ? "rhythm-lab-analytics-positive"
              : song.improvement < 0
                ? "rhythm-lab-analytics-negative"
                : ""
          }
        >
          {song.improvement > 0 ? "+" : ""}
          {formatScore(song.improvement)}
        </span>
      )}
    </div>
  </div>
);

const RunAnalyticsPanel = ({ history }: RunAnalyticsPanelProps) => {
  const analytics = useMemo(() => getRunAnalytics(history), [history]);
  const songAnalytics = useMemo(() => getSongAnalytics(history), [history]);

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

      {songAnalytics.length > 0 && (
        <div className="rhythm-lab-analytics-songs">
          <h3 className="rhythm-lab-analytics-section-title">
            Per-song stats
          </h3>
          {songAnalytics.map((song) => (
            <SongRow key={song.songId} song={song} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RunAnalyticsPanel;
