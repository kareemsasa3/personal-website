import type { ChartNote } from "../types";

export type RhythmLabChartDifficulty =
  | "starter"
  | "easy"
  | "normal"
  | "hard"
  | "custom";

export type RhythmLabChartSource =
  | "starter"
  | "recorded"
  | "imported"
  | "edited";

export interface RhythmLabSong {
  id: string;
  title: string;
  filename: string;
  durationMs: number | null;
  mimeType: string;
  sizeBytes: number;
  lastModified: number | null;
  audioBlobId: string;
  fingerprint: string;
  importedAt: string;
  updatedAt: string;
}

export interface RhythmLabAudioBlobRecord {
  id: string;
  blob: Blob;
}

export interface RhythmLabChart {
  id: string;
  songId: string | null;
  name: string;
  difficulty: RhythmLabChartDifficulty;
  scrollSpeed: number;
  durationMs: number;
  notes: ChartNote[];
  source: RhythmLabChartSource;
  createdAt: string;
  updatedAt: string;
}

export interface RhythmLabRun {
  id: string;
  songId: string | null;
  chartId: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  emptyMissCount: number;
  meanAbsDeltaMs: number | null;
  earlyCount: number;
  lateCount: number;
  playedAt: string;
}

export interface RhythmLabPreferences {
  id: "rhythm-lab";
  activeSongId: string | null;
  activeChartId: string | null;
  defaultScrollSpeed: number;
  updatedAt: string;
}

export interface SaveSongWithBlobInput {
  song: RhythmLabSong;
  blob: Blob;
}
