export type LaneIndex = 0 | 1 | 2;

export type GamePhase = "ready" | "playing" | "paused" | "complete";

export type RunEndReason = "completed" | "ended_early";

export type JudgmentRating = "Perfect" | "Good" | "Miss";

export interface ChartNote {
  id: string;
  lane: LaneIndex;
  // Chart-elapsed milliseconds from the start of the chart, not a wall-clock timestamp.
  timeMs: number;
}

export interface RhythmChart {
  id: string;
  title: string;
  // Chart metadata used when authoring notes; the runtime timing engine reads note timeMs directly.
  bpm: number;
  durationMs: number;
  notes: ChartNote[];
}

interface BaseNoteJudgment {
  rating: JudgmentRating;
  lane: LaneIndex;
  // Chart-elapsed milliseconds at judgment time, not performance.now() or wall-clock time.
  judgedAtMs: number;
}

export interface NoteHitJudgment extends BaseNoteJudgment {
  kind: "note-hit";
  rating: "Perfect" | "Good";
  noteId: string;
  deltaMs: number;
}

export interface NoteMissJudgment extends BaseNoteJudgment {
  kind: "note-miss";
  rating: "Miss";
  noteId: string;
  deltaMs: number | null;
}

export interface EmptyInputJudgment extends BaseNoteJudgment {
  kind: "empty-input";
  rating: "Miss";
}

export type NoteJudgment =
  | NoteHitJudgment
  | NoteMissJudgment
  | EmptyInputJudgment;

export interface VisibleNote {
  id: string;
  lane: LaneIndex;
  // Expected range is 0 through NOTE_OVERSHOOT_MULTIPLIER; values may exceed 1 briefly.
  progress: number;
}
