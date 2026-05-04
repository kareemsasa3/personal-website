import type { RunHistoryEntry } from "./helpers";
import type { RhythmLabChart } from "./library/types";

export interface RunAnalytics {
  totalRuns: number;
  completedRuns: number;
  earlyEndedRuns: number;
  totalPlayTimeMs: number;
  averageAccuracyPercent: number;
  bestCompletedScore: RunHistoryEntry | null;
  bestCompletedAccuracy: RunHistoryEntry | null;
}

export interface RunTrendPoint {
  runNumber: number;
  playedAtMs: number;
  songTitle: string;
  score: number;
  accuracyPercent: number;
  maxCombo: number;
  completionPercent: number;
  completed: boolean;
}

export interface ChartGroupAnalytics {
  groupKey: string;
  songTitle: string;
  chartLabel: string;
  attempts: number;
  completedAttempts: number;
  bestCompletedScore: number | null;
  bestCompletedAccuracy: number | null;
  averageAccuracy: number;
  latestScore: number;
  improvement: number | null;
}

/** Stable grouping key: song ID + chart ID. */
export const getRunChartKey = (entry: RunHistoryEntry): string => {
  const songId = entry.songSnapshot?.id ?? "unknown-song";
  const chartId = entry.chartSnapshot?.id ?? entry.runId;
  return `${songId}:${chartId}`;
};

/** Resolve the display title for a history entry, preferring current chart name. */
export const resolveChartLabel = (
  entry: RunHistoryEntry,
  chartsById: Map<string, RhythmLabChart>
): string => {
  const currentChart = entry.chartSnapshot?.id
    ? chartsById.get(entry.chartSnapshot.id)
    : undefined;
  return currentChart?.name ?? entry.chartSnapshot?.label ?? "Unknown chart";
};

export const getRunAnalytics = (
  history: RunHistoryEntry[]
): RunAnalytics => {
  const completedRuns = history.filter(
    (entry) => entry.endReason === "completed"
  );

  const runsWithAccuracy = history.filter(
    (entry) => entry.notesJudged > 0
  );

  const totalPlayTimeMs = history.reduce(
    (sum, entry) => sum + entry.endedAtMs,
    0
  );

  const averageAccuracyPercent =
    runsWithAccuracy.length > 0
      ? runsWithAccuracy.reduce(
          (sum, entry) => sum + entry.accuracyPercent,
          0
        ) / runsWithAccuracy.length
      : 0;

  const bestCompletedScore = completedRuns.reduce<RunHistoryEntry | null>(
    (best, entry) => {
      if (!best) return entry;
      return entry.score > best.score ? entry : best;
    },
    null
  );

  const bestCompletedAccuracy = completedRuns.reduce<RunHistoryEntry | null>(
    (best, entry) => {
      if (!best) return entry;
      return entry.accuracyPercent > best.accuracyPercent ? entry : best;
    },
    null
  );

  return {
    totalRuns: history.length,
    completedRuns: completedRuns.length,
    earlyEndedRuns: history.length - completedRuns.length,
    totalPlayTimeMs,
    averageAccuracyPercent,
    bestCompletedScore,
    bestCompletedAccuracy,
  };
};

export const getRunTrendPoints = (
  history: RunHistoryEntry[]
): RunTrendPoint[] =>
  [...history]
    .sort((a, b) => a.playedAtMs - b.playedAtMs)
    .map((entry, index) => ({
      runNumber: index + 1,
      playedAtMs: entry.playedAtMs,
      songTitle:
        entry.songSnapshot?.title ?? entry.chartSnapshot?.label ?? "Untitled",
      score: entry.score,
      accuracyPercent: entry.accuracyPercent,
      maxCombo: entry.maxCombo,
      completionPercent: entry.completionPercent,
      completed: entry.endReason === "completed",
    }));

/** Group runs by song+chart pair, resolving current chart names via chartsById. */
export const getChartGroupAnalytics = (
  history: RunHistoryEntry[],
  chartsById: Map<string, RhythmLabChart>
): ChartGroupAnalytics[] => {
  const groups = new Map<string, RunHistoryEntry[]>();

  for (const entry of history) {
    const key = getRunChartKey(entry);
    const existing = groups.get(key) ?? [];
    existing.push(entry);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .map(([groupKey, entries]) => {
      const sorted = [...entries].sort(
        (a, b) => a.playedAtMs - b.playedAtMs
      );
      const completed = sorted.filter(
        (entry) => entry.endReason === "completed"
      );
      const withAccuracy = sorted.filter(
        (entry) => entry.notesJudged > 0
      );

      const representative = sorted[0];
      const songTitle =
        representative.songSnapshot?.title ?? "Unknown song";
      const chartLabel = resolveChartLabel(representative, chartsById);

      const bestCompletedScore = completed.reduce<number | null>(
        (best, entry) =>
          best === null || entry.score > best ? entry.score : best,
        null
      );

      const bestCompletedAccuracy = completed.reduce<number | null>(
        (best, entry) =>
          best === null || entry.accuracyPercent > best
            ? entry.accuracyPercent
            : best,
        null
      );

      const averageAccuracy =
        withAccuracy.length > 0
          ? withAccuracy.reduce(
              (sum, entry) => sum + entry.accuracyPercent,
              0
            ) / withAccuracy.length
          : 0;

      const firstCompleted = completed[0] ?? null;
      const lastCompleted =
        completed.length > 1
          ? completed[completed.length - 1]
          : null;
      const improvement =
        firstCompleted && lastCompleted
          ? lastCompleted.score - firstCompleted.score
          : null;

      return {
        groupKey,
        songTitle,
        chartLabel,
        attempts: entries.length,
        completedAttempts: completed.length,
        bestCompletedScore,
        bestCompletedAccuracy,
        averageAccuracy,
        latestScore: sorted[sorted.length - 1].score,
        improvement,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);
};
