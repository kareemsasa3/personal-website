import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { starterChart } from "./rhythmCharts";
import type { RhythmChart } from "./types";
import {
  deleteChart,
  getChartsForSong,
  getPreferences,
  saveChart,
  savePreferences,
  updateChartName,
} from "./library/rhythmLabDb";
import type { RhythmLabChart } from "./library/types";
import {
  type ActiveChartMode,
  createChartPreference,
  createStoredChartId,
  DEFAULT_SCROLL_SPEED,
  formatRecordedChartName,
  normalizeChartName,
  sortRecordedChartsNewestFirst,
  toRuntimeChart,
} from "./helpers";

interface UseRecordedChartsParams {
  getDb: () => Promise<IDBDatabase>;
  activeSongId: string | null;
  activeSongRevision: number;
  resetGame: () => void;
  pausePlayback: () => void;
  focusGame: () => void;
  cancelRecording: () => void;
  resetRuns: () => void;
  isRecording: boolean;
  onClearJudgment: () => void;
}

export const useRecordedCharts = ({
  getDb,
  activeSongId,
  activeSongRevision,
  resetGame,
  pausePlayback,
  focusGame,
  cancelRecording,
  resetRuns,
  isRecording,
  onClearJudgment,
}: UseRecordedChartsParams) => {
  const [activeChartMode, setActiveChartMode] =
    useState<ActiveChartMode>("starter");
  const [recordedChart, setRecordedChart] = useState<RhythmChart | null>(null);
  const [recordedCharts, setRecordedCharts] = useState<RhythmLabChart[]>([]);
  const [chartStorageError, setChartStorageError] = useState<string | null>(
    null
  );
  const [chartNameDraft, setChartNameDraft] = useState("");
  const [isRenamingChart, setIsRenamingChart] = useState(false);
  const [pendingChartAction, setPendingChartAction] = useState<
    "rename" | "delete" | null
  >(null);
  const chartLoadRequestIdRef = useRef(0);
  const activeSongIdRef = useRef(activeSongId);

  const activeChart =
    activeChartMode === "recorded" && recordedChart
      ? recordedChart
      : starterChart;

  const currentRunContextKey = [
    activeChartMode,
    activeSongId ?? "songless",
    activeChart.id,
  ].join(":");

  const selectedRecordedChart = useMemo(() => {
    if (activeChartMode !== "recorded" || !recordedChart || !activeSongId) {
      return null;
    }

    return (
      recordedCharts.find(
        (chart) =>
          chart.id === recordedChart.id &&
          chart.songId === activeSongId &&
          chart.source === "recorded"
      ) ?? null
    );
  }, [activeChartMode, activeSongId, recordedChart, recordedCharts]);

  useEffect(() => {
    activeSongIdRef.current = activeSongId;
  }, [activeSongId]);

  useEffect(() => {
    if (!selectedRecordedChart) {
      setChartNameDraft("");
      setIsRenamingChart(false);
      return;
    }

    if (!isRenamingChart) {
      setChartNameDraft(selectedRecordedChart.name);
    }
  }, [isRenamingChart, selectedRecordedChart]);

  const saveActiveChartPreference = useCallback(
    async (nextActiveChartId: string | null) => {
      if (!activeSongId) return;

      const db = await getDb();
      const preferences = await getPreferences(db);
      await savePreferences(
        db,
        createChartPreference(activeSongId, nextActiveChartId, preferences)
      );
    },
    [activeSongId, getDb]
  );

  const resetChartManagement = useCallback(() => {
    setChartNameDraft("");
    setIsRenamingChart(false);
    setPendingChartAction(null);
  }, []);

  const resetChartRuntimeForSongChange = useCallback(() => {
    cancelRecording();
    resetChartManagement();
    setRecordedChart(null);
    setActiveChartMode("starter");
    onClearJudgment();
    setChartStorageError(null);
    setRecordedCharts([]);
    resetRuns();
    resetGame();
  }, [cancelRecording, onClearJudgment, resetChartManagement, resetGame, resetRuns]);

  const selectRecordedChart = useCallback(
    (chartId: string) => {
      const selectedChart =
        recordedCharts.find((chart) => chart.id === chartId) ??
        recordedCharts[0] ??
        null;

      pausePlayback();
      resetChartManagement();
      cancelRecording();
      onClearJudgment();
      resetGame();
      focusGame();

      if (!selectedChart) {
        setRecordedChart(null);
        setActiveChartMode("starter");
        void saveActiveChartPreference(null).catch(() => {
          setChartStorageError("Chart selection could not be saved.");
        });
        return;
      }

      setRecordedChart(toRuntimeChart(selectedChart));
      setActiveChartMode("recorded");
      void saveActiveChartPreference(selectedChart.id)
        .then(() => setChartStorageError(null))
        .catch(() => {
          setChartStorageError("Chart selection could not be saved.");
        });
    },
    [
      cancelRecording,
      focusGame,
      onClearJudgment,
      pausePlayback,
      recordedCharts,
      resetChartManagement,
      resetGame,
      saveActiveChartPreference,
    ]
  );

  const selectActiveChartMode = useCallback(
    (mode: ActiveChartMode) => {
      if (mode === "recorded") {
        const chartId = recordedChart?.id ?? recordedCharts[0]?.id;
        if (chartId) selectRecordedChart(chartId);
        return;
      }

      pausePlayback();
      resetChartManagement();
      cancelRecording();
      setActiveChartMode(mode);
      onClearJudgment();
      resetGame();
      focusGame();
      void saveActiveChartPreference(null)
        .then(() => setChartStorageError(null))
        .catch(() => {
          setChartStorageError("Chart selection could not be saved.");
        });
    },
    [
      cancelRecording,
      focusGame,
      onClearJudgment,
      pausePlayback,
      recordedChart,
      recordedCharts,
      resetChartManagement,
      resetGame,
      saveActiveChartPreference,
      selectRecordedChart,
    ]
  );

  const beginChartRename = useCallback(() => {
    if (!selectedRecordedChart || isRecording || pendingChartAction) return;

    setChartNameDraft(selectedRecordedChart.name);
    setIsRenamingChart(true);
    setChartStorageError(null);
  }, [isRecording, pendingChartAction, selectedRecordedChart]);

  const cancelChartRename = useCallback(() => {
    setChartNameDraft(selectedRecordedChart?.name ?? "");
    setIsRenamingChart(false);
  }, [selectedRecordedChart]);

  const saveChartRename = useCallback(async () => {
    if (
      !activeSongId ||
      !selectedRecordedChart ||
      selectedRecordedChart.songId !== activeSongId ||
      selectedRecordedChart.source !== "recorded" ||
      pendingChartAction
    ) {
      return;
    }

    const nextName = normalizeChartName(chartNameDraft);
    if (!nextName || nextName === selectedRecordedChart.name) {
      setChartNameDraft(selectedRecordedChart.name);
      setIsRenamingChart(false);
      return;
    }

    setPendingChartAction("rename");

    try {
      const db = await getDb();
      const updatedChart = await updateChartName(
        db,
        selectedRecordedChart.id,
        nextName
      );

      if (
        !updatedChart ||
        updatedChart.songId !== activeSongId ||
        updatedChart.source !== "recorded" ||
        activeSongIdRef.current !== activeSongId
      ) {
        throw new Error("Recorded chart was not available.");
      }

      setRecordedCharts((currentCharts) =>
        sortRecordedChartsNewestFirst(
          currentCharts.map((chart) =>
            chart.id === updatedChart.id ? updatedChart : chart
          )
        )
      );
      setRecordedChart(toRuntimeChart(updatedChart));
      setChartNameDraft(updatedChart.name);
      setIsRenamingChart(false);
      setChartStorageError(null);
    } catch {
      setChartStorageError("Chart name could not be saved.");
    } finally {
      setPendingChartAction(null);
    }
  }, [
    activeSongId,
    chartNameDraft,
    getDb,
    pendingChartAction,
    selectedRecordedChart,
  ]);

  const deleteSelectedChart = useCallback(async () => {
    if (
      !activeSongId ||
      !selectedRecordedChart ||
      selectedRecordedChart.songId !== activeSongId ||
      selectedRecordedChart.source !== "recorded" ||
      pendingChartAction
    ) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${selectedRecordedChart.name}"? Saved runs for this chart will also be deleted.`
    );
    if (!shouldDelete) return;

    setPendingChartAction("delete");
    pausePlayback();
    cancelRecording();
    onClearJudgment();
    resetRuns();
    resetGame();

    try {
      const db = await getDb();
      const deletedChart = await deleteChart(db, selectedRecordedChart.id);

      if (
        !deletedChart ||
        deletedChart.songId !== activeSongId ||
        deletedChart.source !== "recorded" ||
        activeSongIdRef.current !== activeSongId
      ) {
        throw new Error("Recorded chart was not available.");
      }

      const nextCharts = recordedCharts.filter(
        (chart) =>
          chart.id !== selectedRecordedChart.id && chart.songId === activeSongId
      );
      const nextSelectedChart = nextCharts[0] ?? null;

      setRecordedCharts(nextCharts);
      resetChartManagement();

      if (nextSelectedChart) {
        setRecordedChart(toRuntimeChart(nextSelectedChart));
        setActiveChartMode("recorded");
      } else {
        setRecordedChart(null);
        setActiveChartMode("starter");
      }

      try {
        const preferences = await getPreferences(db);
        await savePreferences(
          db,
          createChartPreference(
            activeSongId,
            nextSelectedChart?.id ?? null,
            preferences
          )
        );
        setChartStorageError(null);
      } catch {
        setChartStorageError(
          "Chart was deleted, but chart selection could not be saved."
        );
      }

      focusGame();
    } catch {
      setChartStorageError(
        "Chart could not be deleted. Local selection remains usable."
      );
    } finally {
      setPendingChartAction(null);
    }
  }, [
    activeSongId,
    cancelRecording,
    focusGame,
    getDb,
    onClearJudgment,
    pausePlayback,
    pendingChartAction,
    recordedCharts,
    resetChartManagement,
    resetGame,
    resetRuns,
    selectedRecordedChart,
  ]);

  const saveRecordedChart = useCallback(
    (nextChart: RhythmChart) => {
      setRecordedChart(nextChart);
      setActiveChartMode("recorded");

      if (!activeSongId) {
        setChartStorageError(
          "Recorded chart is available for this session only."
        );
        return;
      }

      const persistChart = async () => {
        const db = await getDb();
        const preferences = await getPreferences(db);
        const now = new Date().toISOString();
        const storedChart: RhythmLabChart = {
          id: createStoredChartId(activeSongId),
          songId: activeSongId,
          name: formatRecordedChartName(recordedCharts.length),
          difficulty: "custom",
          scrollSpeed:
            preferences?.defaultScrollSpeed ?? DEFAULT_SCROLL_SPEED,
          durationMs: nextChart.durationMs,
          notes: nextChart.notes,
          source: "recorded",
          createdAt: now,
          updatedAt: now,
        };
        const savedChart = await saveChart(db, storedChart);

        await savePreferences(
          db,
          createChartPreference(activeSongId, savedChart.id, preferences)
        );

        setRecordedCharts((currentCharts) => [
          savedChart,
          ...currentCharts.filter((chart) => chart.id !== savedChart.id),
        ]);
        setRecordedChart(toRuntimeChart(savedChart));
        setChartStorageError(null);
      };

      void persistChart().catch(() => {
        setChartStorageError(
          "Recorded chart could not be saved. It is available for this session only."
        );
      });
    },
    [activeSongId, getDb, recordedCharts.length]
  );

  // Chart-loading effect
  useEffect(() => {
    const requestId = chartLoadRequestIdRef.current + 1;
    chartLoadRequestIdRef.current = requestId;

    if (!activeSongId) {
      setRecordedCharts([]);
      setRecordedChart(null);
      setActiveChartMode("starter");
      setChartStorageError(null);
      return;
    }

    setRecordedCharts([]);
    setRecordedChart(null);
    setActiveChartMode("starter");

    const loadRecordedCharts = async () => {
      const db = await getDb();
      const preferences = await getPreferences(db);
      const charts = await getChartsForSong(db, activeSongId);

      if (requestId !== chartLoadRequestIdRef.current) return;

      setRecordedCharts(charts);

      const selectedChart =
        charts.find((chart) => chart.id === preferences?.activeChartId) ??
        charts[0] ??
        null;

      if (!selectedChart) {
        setActiveChartMode("starter");
        setChartStorageError(null);
        return;
      }

      setRecordedChart(toRuntimeChart(selectedChart));
      setActiveChartMode("recorded");
      resetGame();
      setChartStorageError(null);

      if (preferences?.activeChartId !== selectedChart.id) {
        await savePreferences(
          db,
          createChartPreference(activeSongId, selectedChart.id, preferences)
        );
      }
    };

    void loadRecordedCharts().catch(() => {
      if (requestId !== chartLoadRequestIdRef.current) return;

      setRecordedCharts([]);
      setRecordedChart(null);
      setActiveChartMode("starter");
      setChartStorageError(
        "Saved charts could not be loaded. Recording still works for this session."
      );
    });
  }, [activeSongId, activeSongRevision, getDb, resetGame]);

  return {
    activeChart,
    activeChartMode,
    recordedChart,
    recordedCharts,
    chartStorageError,
    selectedRecordedChart,
    currentRunContextKey,
    chartNameDraft,
    isRenamingChart,
    pendingChartAction,
    selectRecordedChart,
    selectActiveChartMode,
    resetChartRuntimeForSongChange,
    beginChartRename,
    cancelChartRename,
    saveChartRename,
    deleteSelectedChart,
    saveRecordedChart,
    setRecordedChart,
    setRecordedCharts,
    setActiveChartMode,
    setChartNameDraft,
    setChartStorageError,
    resetChartManagement,
  };
};
