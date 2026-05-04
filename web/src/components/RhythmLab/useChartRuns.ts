import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GamePhase } from "./types";
import {
  type ActiveChartMode,
  createRunRecord,
  getBestRun,
  type RhythmRunSummary,
} from "./helpers";
import { getRunsForChart, saveRun } from "./library/rhythmLabDb";
import type { RhythmLabRun } from "./library/types";

interface UseChartRunsParams {
  getDb: () => Promise<IDBDatabase>;
  activeChartId: string;
  currentRunContextKey: string;
  activeChartMode: ActiveChartMode;
  activeSongId: string | null;
  phase: GamePhase;
  isRecording: boolean;
  runSummary: RhythmRunSummary;
  score: number;
  maxCombo: number;
  judgmentsLength: number;
  lastJudgedAtMs: number | undefined;
}

export const useChartRuns = ({
  getDb,
  activeChartId,
  currentRunContextKey,
  activeChartMode,
  activeSongId,
  phase,
  isRecording,
  runSummary,
  score,
  maxCombo,
  judgmentsLength,
  lastJudgedAtMs,
}: UseChartRunsParams) => {
  const [chartRuns, setChartRuns] = useState<RhythmLabRun[]>([]);
  const [runStorageError, setRunStorageError] = useState<string | null>(null);
  const [loadedRunContextKey, setLoadedRunContextKey] = useState<string | null>(
    null
  );
  const runLoadRequestIdRef = useRef(0);
  const completedRunSaveKeyRef = useRef<string | null>(null);

  const isBestRunLoaded = loadedRunContextKey === currentRunContextKey;
  const bestRun = useMemo(
    () => (isBestRunLoaded ? getBestRun(chartRuns) : null),
    [chartRuns, isBestRunLoaded]
  );

  useEffect(() => {
    const requestId = runLoadRequestIdRef.current + 1;
    runLoadRequestIdRef.current = requestId;
    setChartRuns([]);
    setLoadedRunContextKey(null);
    setRunStorageError(null);

    const loadChartRuns = async () => {
      const db = await getDb();
      const runs = await getRunsForChart(db, activeChartId);

      if (requestId !== runLoadRequestIdRef.current) return;

      setChartRuns(runs);
      setLoadedRunContextKey(currentRunContextKey);
      setRunStorageError(null);
    };

    void loadChartRuns().catch(() => {
      if (requestId !== runLoadRequestIdRef.current) return;

      setChartRuns([]);
      setLoadedRunContextKey(currentRunContextKey);
      setRunStorageError("Best stats could not be loaded.");
    });
  }, [activeChartId, currentRunContextKey, getDb]);

  useEffect(() => {
    if (phase !== "complete" || isRecording) {
      completedRunSaveKeyRef.current = null;
      return;
    }

    const completionKey = [
      activeChartId,
      activeSongId ?? "songless",
      score,
      maxCombo,
      judgmentsLength,
      lastJudgedAtMs ?? "no-judgment",
    ].join(":");

    if (completedRunSaveKeyRef.current === completionKey) return;
    completedRunSaveKeyRef.current = completionKey;

    const saveCompletedRun = async () => {
      const db = await getDb();
      const songId = activeChartMode === "recorded" ? activeSongId : null;
      const run = await saveRun(
        db,
        createRunRecord(activeChartId, songId, runSummary)
      );
      const runs = await getRunsForChart(db, activeChartId);

      if (completedRunSaveKeyRef.current !== completionKey) return;

      setChartRuns(
        runs.some((currentRun) => currentRun.id === run.id)
          ? runs
          : [run, ...runs]
      );
      setLoadedRunContextKey(currentRunContextKey);
      setRunStorageError(null);
    };

    void saveCompletedRun().catch(() => {
      if (completedRunSaveKeyRef.current !== completionKey) return;

      setRunStorageError(
        "Run result could not be saved. Your summary is still available."
      );
    });
  }, [
    activeChartId,
    activeChartMode,
    activeSongId,
    currentRunContextKey,
    getDb,
    isRecording,
    judgmentsLength,
    lastJudgedAtMs,
    maxCombo,
    phase,
    runSummary,
    score,
  ]);

  const resetRuns = useCallback(() => {
    setChartRuns([]);
    setLoadedRunContextKey(null);
    setRunStorageError(null);
    completedRunSaveKeyRef.current = null;
    runLoadRequestIdRef.current += 1;
  }, []);

  return {
    bestRun,
    isBestRunLoaded,
    runStorageError,
    resetRuns,
  };
};
