import type { LaneIndex, NoteJudgment, RhythmChart } from "./types";

// Tutorial step data and progression rules. Keep imports type-only so this
// module stays free of runtime dependencies.

export type TutorialStepId = "freeze-first" | "freeze-again" | "unassisted";

export type TutorialHint = "early" | "wrong-lane";

export type TutorialInputDecision = "judge" | TutorialHint;

export type TutorialStepOutcome = "passed" | "retry";

export interface TutorialStepCopy {
  approach: string;
  action: string;
  success: string;
  retry: string | null;
}

export interface TutorialStep {
  id: TutorialStepId;
  chart: RhythmChart;
  // Assisted steps freeze the clock at their single note and gate input.
  assisted: boolean;
  targetLane: LaneIndex;
  requiredHits: number;
  copy: TutorialStepCopy;
}

// Every first note is later than the engine's 1800ms note travel time, so
// each tile enters from the top of the highway after its step starts.
export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: "freeze-first",
    assisted: true,
    targetLane: 1,
    requiredHits: 1,
    chart: {
      id: "tutorial-freeze-first",
      title: "Tutorial",
      bpm: 120,
      durationMs: 4000,
      notes: [{ id: "tutorial-freeze-first-l1", lane: 1, timeMs: 2400 }],
    },
    copy: {
      approach: "Tap the tile",
      action: "Tap the tile",
      success: "Perfect — hit tiles when they reach the line.",
      retry: null,
    },
  },
  {
    id: "freeze-again",
    assisted: true,
    targetLane: 0,
    requiredHits: 1,
    chart: {
      id: "tutorial-freeze-again",
      title: "Tutorial",
      bpm: 120,
      durationMs: 4000,
      notes: [{ id: "tutorial-freeze-again-l0", lane: 0, timeMs: 2400 }],
    },
    copy: {
      approach: "Again — tap the tile on the line.",
      action: "Again — tap the tile on the line.",
      success: "Perfect — hit tiles when they reach the line.",
      retry: null,
    },
  },
  {
    id: "unassisted",
    assisted: false,
    targetLane: 1,
    requiredHits: 2,
    chart: {
      id: "tutorial-unassisted",
      title: "Tutorial",
      bpm: 120,
      durationMs: 6600,
      notes: [
        { id: "tutorial-unassisted-1-l1", lane: 1, timeMs: 2400 },
        { id: "tutorial-unassisted-2-l2", lane: 2, timeMs: 3900 },
        { id: "tutorial-unassisted-3-l0", lane: 0, timeMs: 5400 },
      ],
    },
    copy: {
      approach: "Try it without the pause.",
      action: "Try it without the pause.",
      success: "Nice timing.",
      retry: "Almost — hit at least 2 of the 3 tiles. Try again.",
    },
  },
];

export const tutorialHintCopy: Record<TutorialHint, string> = {
  early: "Wait until the tile reaches the line.",
  "wrong-lane": "Tap the tile on the line.",
};

export const getFreezeAtMs = (step: TutorialStep): number | null =>
  step.assisted ? step.chart.notes[0]?.timeMs ?? null : null;

export const clampTutorialElapsedMs = (
  realElapsedMs: number,
  freezeAtMs: number | null
): number =>
  freezeAtMs === null ? realElapsedMs : Math.min(realElapsedMs, freezeAtMs);

export const isTutorialClockFrozen = (
  elapsedMs: number,
  freezeAtMs: number | null
): boolean => freezeAtMs !== null && elapsedMs >= freezeAtMs;

export const decideTutorialInput = (
  step: TutorialStep,
  lane: LaneIndex,
  elapsedMs: number
): TutorialInputDecision => {
  if (!step.assisted) return "judge";
  if (!isTutorialClockFrozen(elapsedMs, getFreezeAtMs(step))) return "early";
  return lane === step.targetLane ? "judge" : "wrong-lane";
};

export const evaluateTutorialStep = (
  step: TutorialStep,
  judgments: NoteJudgment[]
): TutorialStepOutcome =>
  judgments.filter((judgment) => judgment.kind === "note-hit").length >=
  step.requiredHits
    ? "passed"
    : "retry";

export const getTutorialHeadline = (
  step: TutorialStep,
  {
    elapsedMs,
    outcome,
  }: { elapsedMs: number; outcome: TutorialStepOutcome | null }
): string => {
  if (outcome === "passed") return step.copy.success;
  if (outcome === "retry") return step.copy.retry ?? step.copy.action;
  if (isTutorialClockFrozen(elapsedMs, getFreezeAtMs(step))) {
    return step.copy.action;
  }
  return step.copy.approach;
};
