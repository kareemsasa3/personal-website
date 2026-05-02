export type LaneIndex = 0 | 1 | 2;

export type GamePhase = "ready" | "playing" | "complete";

export type JudgmentRating = "Perfect" | "Good" | "Miss";

export interface ChartNote {
  id: string;
  lane: LaneIndex;
  timeMs: number;
}

export interface RhythmChart {
  id: string;
  title: string;
  bpm: number;
  durationMs: number;
  notes: ChartNote[];
}

export interface NoteJudgment {
  rating: JudgmentRating;
  lane: LaneIndex;
  judgedAtMs: number;
  deltaMs: number | null;
  reason: "note" | "empty-input";
}

export interface VisibleNote {
  id: string;
  lane: LaneIndex;
  progress: number;
}
