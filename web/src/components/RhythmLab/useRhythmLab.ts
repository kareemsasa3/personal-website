import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  EmptyInputJudgment,
  GamePhase,
  LaneIndex,
  NoteHitJudgment,
  NoteJudgment,
  NoteMissJudgment,
  RhythmChart,
  VisibleNote,
} from "./types";

const NOTE_TRAVEL_MS = 1800;
const PERFECT_WINDOW_MS = 45;
const GOOD_WINDOW_MS = 90;
const MISS_WINDOW_MS = 140;

type CompletedNotes = Record<string, NoteHitJudgment | NoteMissJudgment>;
type HitCandidate = {
  noteId: string;
  judgment: NoteHitJudgment | NoteMissJudgment;
};

interface RhythmLabState {
  phase: GamePhase;
  currentRunId: string | null;
  elapsedMs: number;
  score: number;
  combo: number;
  maxCombo: number;
  lastJudgment: NoteJudgment | null;
  judgments: NoteJudgment[];
  completedNotes: CompletedNotes;
}

type RhythmLabAction =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "TICK"; elapsedMs: number; isClockComplete: boolean }
  | { type: "HIT_LANE"; lane: LaneIndex; elapsedMs: number }
  | { type: "PAUSE"; elapsedMs: number }
  | { type: "RESUME" }
  | { type: "END_EARLY"; elapsedMs: number };

interface RhythmLabClockOptions {
  getElapsedMs?: () => number;
  isClockComplete?: () => boolean;
}

const createRunId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const initialState: RhythmLabState = {
  phase: "ready",
  currentRunId: null,
  elapsedMs: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  lastJudgment: null,
  judgments: [],
  completedNotes: {},
};

const getJudgmentScore = (judgment: NoteJudgment, combo: number) => {
  if (judgment.rating === "Perfect") return 1000 + combo * 10;
  if (judgment.rating === "Good") return 500 + combo * 5;
  return 0;
};

const getHitCandidate = (
  chart: RhythmChart,
  lane: LaneIndex,
  elapsedMs: number,
  isNoteCompleted: (noteId: string) => boolean
): HitCandidate | null => {
  const candidates = chart.notes
    .filter((note) => {
      if (note.lane !== lane) return false;
      if (isNoteCompleted(note.id)) return false;
      return Math.abs(elapsedMs - note.timeMs) <= MISS_WINDOW_MS;
    })
    .sort(
      (first, second) =>
        Math.abs(elapsedMs - first.timeMs) -
        Math.abs(elapsedMs - second.timeMs)
    );

  const note = candidates[0];
  if (!note) return null;

  const deltaMs = Math.round(elapsedMs - note.timeMs);
  const absDeltaMs = Math.abs(deltaMs);
  const rating =
    absDeltaMs <= PERFECT_WINDOW_MS
      ? "Perfect"
      : absDeltaMs <= GOOD_WINDOW_MS
        ? "Good"
        : "Miss";
  if (rating === "Miss") {
    const judgment: NoteMissJudgment = {
      kind: "note-miss",
      rating,
      lane,
      noteId: note.id,
      judgedAtMs: elapsedMs,
      deltaMs,
    };

    return { noteId: note.id, judgment };
  }

  const judgment: NoteHitJudgment = {
    kind: "note-hit",
    rating,
    lane,
    noteId: note.id,
    judgedAtMs: elapsedMs,
    deltaMs,
  };

  return { noteId: note.id, judgment };
};

const createEmptyInputMiss = (
  lane: LaneIndex,
  elapsedMs: number
): EmptyInputJudgment => ({
  kind: "empty-input",
  rating: "Miss",
  lane,
  judgedAtMs: elapsedMs,
});

const createRhythmReducer =
  (chart: RhythmChart) =>
  (state: RhythmLabState, action: RhythmLabAction): RhythmLabState => {
    switch (action.type) {
      case "START":
        return {
          ...initialState,
          phase: "playing",
          currentRunId: createRunId(),
        };

      case "RESET":
        return initialState;

      case "TICK": {
        if (state.phase !== "playing") return state;

        let completedNotes = state.completedNotes;
        let combo = state.combo;
        let lastJudgment = state.lastJudgment;
        const missedJudgments: NoteMissJudgment[] = [];

        chart.notes.forEach((note) => {
          if (completedNotes[note.id]) return;
          if (action.elapsedMs - note.timeMs <= MISS_WINDOW_MS) return;

          if (completedNotes === state.completedNotes) {
            completedNotes = { ...state.completedNotes };
          }

          const judgment: NoteMissJudgment = {
            kind: "note-miss",
            rating: "Miss",
            lane: note.lane,
            noteId: note.id,
            judgedAtMs: action.elapsedMs,
            deltaMs: null,
          };
          lastJudgment = judgment;
          missedJudgments.push(judgment);
          completedNotes[note.id] = judgment;
          combo = 0;
        });

        const isComplete =
          action.isClockComplete ||
          action.elapsedMs >= chart.durationMs + MISS_WINDOW_MS ||
          Object.keys(completedNotes).length === chart.notes.length;

        return {
          ...state,
          phase: isComplete ? "complete" : "playing",
          elapsedMs: action.elapsedMs,
          combo,
          lastJudgment,
          judgments: missedJudgments.length
            ? [...state.judgments, ...missedJudgments]
            : state.judgments,
          completedNotes,
        };
      }

      case "HIT_LANE": {
        if (state.phase !== "playing") return state;

        const hitCandidate = getHitCandidate(
          chart,
          action.lane,
          action.elapsedMs,
          (noteId) => Boolean(state.completedNotes[noteId])
        );

        const judgment =
          hitCandidate?.judgment ??
          createEmptyInputMiss(action.lane, action.elapsedMs);
        const nextCombo =
          judgment.kind === "note-hit" ? state.combo + 1 : 0;
        const completedNotes = hitCandidate
          ? {
              ...state.completedNotes,
              [hitCandidate.noteId]: hitCandidate.judgment,
            }
          : state.completedNotes;

        return {
          ...state,
          score: state.score + getJudgmentScore(judgment, nextCombo),
          combo: nextCombo,
          maxCombo: Math.max(state.maxCombo, nextCombo),
          lastJudgment: judgment,
          judgments: [...state.judgments, judgment],
          completedNotes,
        };
      }

      case "PAUSE": {
        if (state.phase !== "playing") return state;

        return {
          ...state,
          phase: "paused",
          elapsedMs: action.elapsedMs,
        };
      }

      case "RESUME": {
        if (state.phase !== "paused") return state;

        return {
          ...state,
          phase: "playing",
        };
      }

      case "END_EARLY": {
        if (state.phase !== "playing" && state.phase !== "paused") return state;

        // Final auto-miss pass: only count notes whose judgment window
        // has fully passed before the exit timestamp.
        let completedNotes = state.completedNotes;
        let combo = state.combo;
        const missedJudgments: NoteMissJudgment[] = [];

        chart.notes.forEach((note) => {
          if (completedNotes[note.id]) return;
          if (action.elapsedMs - note.timeMs <= MISS_WINDOW_MS) return;

          if (completedNotes === state.completedNotes) {
            completedNotes = { ...state.completedNotes };
          }

          const judgment: NoteMissJudgment = {
            kind: "note-miss",
            rating: "Miss",
            lane: note.lane,
            noteId: note.id,
            judgedAtMs: action.elapsedMs,
            deltaMs: null,
          };
          missedJudgments.push(judgment);
          completedNotes[note.id] = judgment;
          combo = 0;
        });

        return {
          ...state,
          phase: "complete",
          elapsedMs: action.elapsedMs,
          combo,
          judgments: missedJudgments.length
            ? [...state.judgments, ...missedJudgments]
            : state.judgments,
          completedNotes,
        };
      }

      default:
        return state;
    }
  };

export const useRhythmLab = (
  chart: RhythmChart,
  { getElapsedMs, isClockComplete }: RhythmLabClockOptions = {}
) => {
  const reducer = useMemo(() => createRhythmReducer(chart), [chart]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const animationFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const hiddenAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const pendingHitNoteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    stateRef.current = state;
    pendingHitNoteIdsRef.current = new Set();
  }, [state]);

  const usesExternalClock = Boolean(getElapsedMs);

  const readElapsedMs = useCallback(
    (timestamp = performance.now()) => {
      const elapsedMs = getElapsedMs
        ? getElapsedMs()
        : timestamp - startedAtRef.current;

      return Math.max(0, elapsedMs);
    },
    [getElapsedMs]
  );

  const readClockComplete = useCallback(
    () => Boolean(isClockComplete?.()),
    [isClockComplete]
  );

  const startGame = useCallback(() => {
    if (!usesExternalClock) {
      startedAtRef.current = performance.now();
      hiddenAtRef.current = document.hidden ? performance.now() : null;
    } else {
      startedAtRef.current = 0;
      hiddenAtRef.current = null;
    }
    dispatch({ type: "START" });
  }, [usesExternalClock]);

  const resetGame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startedAtRef.current = 0;
    hiddenAtRef.current = null;
    pausedAtRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  const restartGame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    pausedAtRef.current = null;
    if (!usesExternalClock) {
      startedAtRef.current = performance.now();
      hiddenAtRef.current = document.hidden ? performance.now() : null;
    } else {
      startedAtRef.current = 0;
      hiddenAtRef.current = null;
    }
    dispatch({ type: "START" });
  }, [usesExternalClock]);

  const pauseGame = useCallback(() => {
    if (stateRef.current.phase !== "playing") return;

    const elapsedMs = readElapsedMs();

    if (!usesExternalClock) {
      pausedAtRef.current = performance.now();
    }

    dispatch({ type: "PAUSE", elapsedMs });
  }, [readElapsedMs, usesExternalClock]);

  const resumeGame = useCallback(() => {
    if (stateRef.current.phase !== "paused") return;

    if (!usesExternalClock && pausedAtRef.current !== null) {
      startedAtRef.current += performance.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }

    dispatch({ type: "RESUME" });
  }, [usesExternalClock]);

  const endGameEarly = useCallback(() => {
    const currentPhase = stateRef.current.phase;
    if (currentPhase !== "playing" && currentPhase !== "paused") return;

    const elapsedMs =
      currentPhase === "paused"
        ? stateRef.current.elapsedMs
        : readElapsedMs();

    pausedAtRef.current = null;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    dispatch({ type: "END_EARLY", elapsedMs });
  }, [readElapsedMs]);

  const hitLane = useCallback((lane: LaneIndex): NoteJudgment | null => {
    if (stateRef.current.phase !== "playing") return null;

    const elapsedMs = readElapsedMs();
    const hitCandidate = getHitCandidate(chart, lane, elapsedMs, (noteId) =>
      Boolean(stateRef.current.completedNotes[noteId]) ||
      pendingHitNoteIdsRef.current.has(noteId)
    );

    if (!hitCandidate) {
      const judgment = createEmptyInputMiss(lane, elapsedMs);
      dispatch({ type: "HIT_LANE", lane, elapsedMs });
      return judgment;
    }

    pendingHitNoteIdsRef.current.add(hitCandidate.noteId);
    dispatch({ type: "HIT_LANE", lane, elapsedMs });
    return hitCandidate.judgment;
  }, [chart, readElapsedMs]);

  useEffect(() => {
    if (state.phase !== "playing") return;

    const cancelCurrentFrame = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const scheduleFrame = (loop: FrameRequestCallback) => {
      if (animationFrameRef.current !== null || document.hidden) {
        return;
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const loop = (timestamp: number) => {
      animationFrameRef.current = null;
      const elapsedMs = readElapsedMs(timestamp);
      dispatch({
        type: "TICK",
        elapsedMs,
        isClockComplete: readClockComplete(),
      });

      if (stateRef.current.phase === "playing") {
        scheduleFrame(loop);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!usesExternalClock && hiddenAtRef.current === null) {
          hiddenAtRef.current = performance.now();
        }
        cancelCurrentFrame();
        return;
      }

      if (!usesExternalClock && hiddenAtRef.current !== null) {
        startedAtRef.current += performance.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
      }

      if (stateRef.current.phase === "playing") {
        scheduleFrame(loop);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelCurrentFrame();
    };
  }, [readClockComplete, readElapsedMs, state.phase, usesExternalClock]);

  const visibleNotes: VisibleNote[] = useMemo(
    () =>
      chart.notes
        .filter((note) => {
          if (state.completedNotes[note.id]) return false;
          return (
            note.timeMs >= state.elapsedMs - MISS_WINDOW_MS &&
            note.timeMs <= state.elapsedMs + NOTE_TRAVEL_MS
          );
        })
        .map((note) => ({
          id: note.id,
          lane: note.lane,
          progress: 1 - (note.timeMs - state.elapsedMs) / NOTE_TRAVEL_MS,
        })),
    [chart.notes, state.completedNotes, state.elapsedMs]
  );

  return {
    ...state,
    chart,
    visibleNotes,
    perfectWindowMs: PERFECT_WINDOW_MS,
    goodWindowMs: GOOD_WINDOW_MS,
    startGame,
    resetGame,
    restartGame,
    pauseGame,
    resumeGame,
    endGameEarly,
    hitLane,
  };
};
