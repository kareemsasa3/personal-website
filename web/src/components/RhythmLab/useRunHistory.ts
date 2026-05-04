import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase } from "./types";
import type { RhythmLabSong } from "./library/types";
import {
  createRunHistoryEntry,
  loadRunHistory,
  saveRunHistory,
  clearRunHistory as clearStorage,
  type RunHistoryChartSnapshot,
  type RunHistoryEntry,
  type RhythmRunSummary,
} from "./helpers";

interface UseRunHistoryParams {
  phase: GamePhase;
  currentRunId: string | null;
  isRecording: boolean;
  runSummary: RhythmRunSummary;
  activeSong: RhythmLabSong | null;
  activeChartSnapshot: RunHistoryChartSnapshot | null;
}

const RUN_HISTORY_MAX_ENTRIES = 100;

export const useRunHistory = ({
  phase,
  currentRunId,
  isRecording,
  runSummary,
  activeSong,
  activeChartSnapshot,
}: UseRunHistoryParams) => {
  const [history, setHistory] = useState<RunHistoryEntry[]>(() =>
    loadRunHistory()
  );
  const savedRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase !== "complete" || isRecording || !currentRunId) return;

    if (savedRunIdRef.current === currentRunId) return;
    savedRunIdRef.current = currentRunId;

    const songSnapshot = activeSong
      ? { id: activeSong.id, title: activeSong.title || activeSong.filename }
      : null;

    const entry = createRunHistoryEntry({
      runId: currentRunId,
      summary: runSummary,
      songSnapshot,
      chartSnapshot: activeChartSnapshot,
    });

    setHistory((previous) => {
      const next = [
        entry,
        ...previous.filter((existing) => existing.runId !== entry.runId),
      ].slice(0, RUN_HISTORY_MAX_ENTRIES);
      saveRunHistory(next);
      return next;
    });
  }, [activeChartSnapshot, activeSong, currentRunId, isRecording, phase, runSummary]);

  useEffect(() => {
    if (phase === "playing") {
      savedRunIdRef.current = null;
    }
  }, [phase]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    clearStorage();
  }, []);

  return { history, clearHistory };
};
