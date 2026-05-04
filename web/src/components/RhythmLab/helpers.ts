import type { LaneIndex, NoteJudgment, RhythmChart } from "./types";
import type {
  RhythmLabChart,
  RhythmLabPreferences,
  RhythmLabRun,
  RhythmLabSong,
} from "./library/types";
import { RHYTHM_LAB_PREFERENCES_ID } from "./library/rhythmLabDb";

export const lanes: Array<{ index: LaneIndex; label: string; keys: string }> = [
  { index: 0, label: "Left", keys: "A / J / Left" },
  { index: 1, label: "Center", keys: "S / K / Down" },
  { index: 2, label: "Right", keys: "D / L / Right" },
];

export const keyToLane: Record<string, LaneIndex> = {
  a: 0,
  j: 0,
  arrowleft: 0,
  s: 1,
  k: 1,
  arrowdown: 1,
  d: 2,
  l: 2,
  arrowright: 2,
};

export type LaneFeedbackExpiries = Partial<Record<LaneIndex, number>>;
export type LaneFeedbackTimers = Record<LaneIndex, number | null>;

export const laneIndexes: LaneIndex[] = [0, 1, 2];
export const INPUT_FEEDBACK_MS = 80;
export const HIT_FEEDBACK_MS = 120;
export const JUDGMENT_READOUT_MS = 700;
export const RHYTHM_LINE_PERCENT = 76;
export const NOTE_OVERSHOOT_MULTIPLIER = 1.09;
export const RECORDING_DEDUPE_MS = 40;
export const RECORDED_CHART_BPM = 120;
export const RECORDED_CHART_TAIL_MS = 1800;
export const DEFAULT_SCROLL_SPEED = 1;
export const CHART_NAME_MAX_LENGTH = 72;

export const createLaneFeedbackTimers = (): LaneFeedbackTimers => ({
  0: null,
  1: null,
  2: null,
});

export type ActiveChartMode = "starter" | "recorded";

export interface RhythmRunSummary {
  chartLabel: string;
  score: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  emptyInputMissCount: number;
  accuracyPercent: number;
  meanAbsoluteDeltaMs: number | null;
  earlyCount: number;
  lateCount: number;
}

type BestRun = RhythmLabRun | null;

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const formatDelta = (value: number | null) =>
  value === null ? "N/A" : `${Math.round(value)}ms`;

export const formatScore = (value: number) => value.toLocaleString();

const formatChartTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "saved";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const formatChartOptionLabel = (chart: RhythmLabChart) => {
  const noteLabel = chart.notes.length === 1 ? "note" : "notes";
  return `${chart.name} - ${chart.notes.length} ${noteLabel} - ${formatChartTimestamp(
    chart.updatedAt || chart.createdAt
  )}`;
};

export const formatSongTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "imported";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const formatSongOptionLabel = (song: RhythmLabSong) =>
  `${song.title || song.filename} - ${formatSongTimestamp(song.importedAt)}`;

export const createChartPreference = (
  activeSongId: string | null,
  activeChartId: string | null,
  previousPreferences: RhythmLabPreferences | null = null
): RhythmLabPreferences => ({
  id: RHYTHM_LAB_PREFERENCES_ID,
  activeSongId,
  activeChartId,
  defaultScrollSpeed:
    previousPreferences?.defaultScrollSpeed ?? DEFAULT_SCROLL_SPEED,
  updatedAt: new Date().toISOString(),
});

export const createStoredChartId = (songId: string) =>
  `recorded-${encodeURIComponent(songId)}-${Date.now()}`;

const createRunId = (chartId: string) =>
  `run-${encodeURIComponent(chartId)}-${Date.now()}`;

export const formatRecordedChartName = (chartCount: number) =>
  `Recorded Chart ${chartCount + 1}`;

export const normalizeChartName = (name: string) =>
  name.trim().slice(0, CHART_NAME_MAX_LENGTH);

export const toRuntimeChart = (chart: RhythmLabChart): RhythmChart => ({
  id: chart.id,
  title: chart.name,
  bpm: RECORDED_CHART_BPM,
  durationMs: chart.durationMs,
  notes: chart.notes,
});

export const sortRecordedChartsNewestFirst = (charts: RhythmLabChart[]) =>
  [...charts].sort((first, second) =>
    (second.updatedAt || second.createdAt).localeCompare(
      first.updatedAt || first.createdAt
    )
  );

const compareBestRuns = (first: RhythmLabRun, second: RhythmLabRun) => {
  if (first.score !== second.score) return second.score - first.score;
  if (first.accuracy !== second.accuracy)
    return second.accuracy - first.accuracy;
  return second.playedAt.localeCompare(first.playedAt);
};

export const getBestRun = (runs: RhythmLabRun[]): BestRun =>
  runs.length ? [...runs].sort(compareBestRuns)[0] : null;

export const createRunSummary = (
  chartLabel: string,
  score: number,
  maxCombo: number,
  judgments: NoteJudgment[]
): RhythmRunSummary => {
  const noteBackedJudgments = judgments.filter(
    (judgment) =>
      judgment.kind === "note-hit" || judgment.kind === "note-miss"
  );
  const perfectCount = noteBackedJudgments.filter(
    (judgment) => judgment.rating === "Perfect"
  ).length;
  const goodCount = noteBackedJudgments.filter(
    (judgment) => judgment.rating === "Good"
  ).length;
  const missCount = noteBackedJudgments.filter(
    (judgment) => judgment.kind === "note-miss"
  ).length;
  const emptyInputMissCount = judgments.filter(
    (judgment) => judgment.kind === "empty-input"
  ).length;
  const numericDeltas = noteBackedJudgments
    .map((judgment) => judgment.deltaMs)
    .filter((deltaMs): deltaMs is number => typeof deltaMs === "number");
  const accuracyPercent =
    ((perfectCount + goodCount * 0.5) /
      Math.max(noteBackedJudgments.length, 1)) *
    100;
  const meanAbsoluteDeltaMs = numericDeltas.length
    ? numericDeltas.reduce((total, deltaMs) => total + Math.abs(deltaMs), 0) /
      numericDeltas.length
    : null;

  return {
    chartLabel,
    score,
    maxCombo,
    perfectCount,
    goodCount,
    missCount,
    emptyInputMissCount,
    accuracyPercent,
    meanAbsoluteDeltaMs,
    earlyCount: numericDeltas.filter((deltaMs) => deltaMs < 0).length,
    lateCount: numericDeltas.filter((deltaMs) => deltaMs > 0).length,
  };
};

export const createRunRecord = (
  chartId: string,
  songId: string | null,
  summary: RhythmRunSummary
): RhythmLabRun => ({
  id: createRunId(chartId),
  songId,
  chartId,
  score: summary.score,
  maxCombo: summary.maxCombo,
  accuracy: summary.accuracyPercent,
  perfectCount: summary.perfectCount,
  goodCount: summary.goodCount,
  missCount: summary.missCount,
  emptyMissCount: summary.emptyInputMissCount,
  meanAbsDeltaMs: summary.meanAbsoluteDeltaMs,
  earlyCount: summary.earlyCount,
  lateCount: summary.lateCount,
  playedAt: new Date().toISOString(),
});
