import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  LaneIndex,
  NoteJudgment,
  RhythmChart,
  VisibleNote,
} from "./types";

const NOTE_TRAVEL_MS = 1800;
const PERFECT_WINDOW_MS = 45;
const GOOD_WINDOW_MS = 90;
const MISS_WINDOW_MS = 140;

type CompletedNotes = Record<string, NoteJudgment>;

interface RhythmLabState {
  phase: "ready" | "playing" | "complete";
  elapsedMs: number;
  score: number;
  combo: number;
  maxCombo: number;
  lastJudgment: NoteJudgment | null;
  completedNotes: CompletedNotes;
}

type RhythmLabAction =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "TICK"; elapsedMs: number }
  | { type: "HIT_LANE"; lane: LaneIndex; elapsedMs: number };

const initialState: RhythmLabState = {
  phase: "ready",
  elapsedMs: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  lastJudgment: null,
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
) => {
  const candidates = chart.notes
    .filter((note) => {
      if (note.lane !== lane) return false;
      if (isNoteCompleted(note.id)) return false;
      return Math.abs(elapsedMs - note.timeMs) <= GOOD_WINDOW_MS;
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
  const judgment: NoteJudgment = {
    rating: absDeltaMs <= PERFECT_WINDOW_MS ? "Perfect" : "Good",
    lane,
    judgedAtMs: elapsedMs,
    deltaMs,
  };

  return { noteId: note.id, judgment };
};

const createRhythmReducer =
  (chart: RhythmChart) =>
  (state: RhythmLabState, action: RhythmLabAction): RhythmLabState => {
    switch (action.type) {
      case "START":
        return {
          ...initialState,
          phase: "playing",
        };

      case "RESET":
        return initialState;

      case "TICK": {
        if (state.phase !== "playing") return state;

        let completedNotes = state.completedNotes;
        let combo = state.combo;
        let lastJudgment = state.lastJudgment;

        chart.notes.forEach((note) => {
          if (completedNotes[note.id]) return;
          if (action.elapsedMs - note.timeMs <= MISS_WINDOW_MS) return;

          if (completedNotes === state.completedNotes) {
            completedNotes = { ...state.completedNotes };
          }

          lastJudgment = {
            rating: "Miss",
            lane: note.lane,
            judgedAtMs: action.elapsedMs,
            deltaMs: null,
          };
          completedNotes[note.id] = lastJudgment;
          combo = 0;
        });

        const isComplete =
          action.elapsedMs >= chart.durationMs + MISS_WINDOW_MS ||
          Object.keys(completedNotes).length === chart.notes.length;

        return {
          ...state,
          phase: isComplete ? "complete" : "playing",
          elapsedMs: action.elapsedMs,
          combo,
          lastJudgment,
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

        if (!hitCandidate) return state;

        const { judgment, noteId } = hitCandidate;
        const nextCombo = state.combo + 1;

        return {
          ...state,
          score: state.score + getJudgmentScore(judgment, nextCombo),
          combo: nextCombo,
          maxCombo: Math.max(state.maxCombo, nextCombo),
          lastJudgment: judgment,
          completedNotes: {
            ...state.completedNotes,
            [noteId]: judgment,
          },
        };
      }

      default:
        return state;
    }
  };

export const useRhythmLab = (chart: RhythmChart) => {
  const reducer = useMemo(() => createRhythmReducer(chart), [chart]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const animationFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const stateRef = useRef(state);
  const pendingHitNoteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    stateRef.current = state;
    pendingHitNoteIdsRef.current = new Set();
  }, [state]);

  const startGame = useCallback(() => {
    startedAtRef.current = performance.now();
    dispatch({ type: "START" });
  }, []);

  const resetGame = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startedAtRef.current = 0;
    dispatch({ type: "RESET" });
  }, []);

  const restartGame = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startedAtRef.current = performance.now();
    dispatch({ type: "START" });
  }, []);

  const hitLane = useCallback((lane: LaneIndex): NoteJudgment | null => {
    if (stateRef.current.phase !== "playing") return null;

    const elapsedMs = performance.now() - startedAtRef.current;
    const hitCandidate = getHitCandidate(chart, lane, elapsedMs, (noteId) =>
      Boolean(stateRef.current.completedNotes[noteId]) ||
      pendingHitNoteIdsRef.current.has(noteId)
    );

    if (!hitCandidate) return null;

    pendingHitNoteIdsRef.current.add(hitCandidate.noteId);
    dispatch({ type: "HIT_LANE", lane, elapsedMs });
    return hitCandidate.judgment;
  }, [chart]);

  useEffect(() => {
    if (state.phase !== "playing") return;

    const loop = (timestamp: number) => {
      const elapsedMs = timestamp - startedAtRef.current;
      dispatch({ type: "TICK", elapsedMs });

      if (stateRef.current.phase === "playing") {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [state.phase]);

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
          progress:
            1 - Math.max(0, note.timeMs - state.elapsedMs) / NOTE_TRAVEL_MS,
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
    hitLane,
  };
};
