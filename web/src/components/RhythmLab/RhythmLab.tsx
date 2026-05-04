import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { starterChart } from "./rhythmCharts";
import {
  type ChartNote,
  type LaneIndex,
  type NoteJudgment,
  type RhythmChart,
} from "./types";
import {
  deleteChart,
  getChartsForSong,
  getPreferences,
  getRunsForChart,
  openRhythmLabDb,
  saveChart,
  savePreferences,
  saveRun,
  updateChartName,
} from "./library/rhythmLabDb";
import type { RhythmLabChart, RhythmLabRun } from "./library/types";
import { useLocalAudioFile } from "./useLocalAudioFile";
import { useRhythmLab } from "./useRhythmLab";
import ReadyCheckPanel from "./ReadyCheckPanel";
import RunSummaryPanel from "./RunSummaryPanel";
import {
  type ActiveChartMode,
  CHART_NAME_MAX_LENGTH,
  createChartPreference,
  createRunRecord,
  createRunSummary,
  createStoredChartId,
  DEFAULT_SCROLL_SPEED,
  formatChartOptionLabel,
  formatPercent,
  formatRecordedChartName,
  formatScore,
  formatSongOptionLabel,
  getBestRun,
  JUDGMENT_READOUT_MS,
  keyToLane,
  lanes,
  normalizeChartName,
  NOTE_OVERSHOOT_MULTIPLIER,
  RECORDED_CHART_BPM,
  RECORDED_CHART_TAIL_MS,
  RECORDING_DEDUPE_MS,
  RHYTHM_LINE_PERCENT,
  sortRecordedChartsNewestFirst,
  toRuntimeChart,
} from "./helpers";
import { useLaneFeedback } from "./useLaneFeedback";
import "./RhythmLab.css";

const RhythmLab = () => {
  const {
    audioRef,
    activeSongId,
    activeSongRevision,
    importedSongs,
    fileName,
    error: audioError,
    hasSelectedFile,
    isPausedAfterVisibilityChange,
    handleFileChange,
    selectSong,
    playFromStart,
    resumePlayback,
    pausePlayback,
    getElapsedMs,
    isPlaybackComplete,
  } = useLocalAudioFile();
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
  const [chartRuns, setChartRuns] = useState<RhythmLabRun[]>([]);
  const [runStorageError, setRunStorageError] = useState<string | null>(null);
  const [recordingCount, setRecordingCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingNotesRef = useRef<ChartNote[]>([]);
  const recordingSequenceRef = useRef(0);
  const lastRecordedByLaneRef = useRef<Partial<Record<LaneIndex, number>>>({});
  const dbRef = useRef<IDBDatabase | null>(null);
  const activeSongIdRef = useRef(activeSongId);
  const chartLoadRequestIdRef = useRef(0);
  const runLoadRequestIdRef = useRef(0);
  const completedRunSaveKeyRef = useRef<string | null>(null);
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
  const [loadedRunContextKey, setLoadedRunContextKey] = useState<string | null>(
    null
  );
  const isBestRunLoaded = loadedRunContextKey === currentRunContextKey;
  const bestRun = useMemo(
    () => (isBestRunLoaded ? getBestRun(chartRuns) : null),
    [chartRuns, isBestRunLoaded]
  );
  const rhythmClock = useMemo(
    () =>
      hasSelectedFile
        ? {
            getElapsedMs,
            isClockComplete: isPlaybackComplete,
          }
        : undefined,
    [getElapsedMs, hasSelectedFile, isPlaybackComplete]
  );
  const game = useRhythmLab(activeChart, rhythmClock);
  const {
    phase,
    score,
    combo,
    maxCombo,
    lastJudgment,
    judgments,
    chart,
    visibleNotes,
    startGame: beginGame,
    resetGame,
    restartGame: beginRestart,
    hitLane,
  } = game;
  const {
    inputFeedbackExpiries,
    hitFeedbackExpiries,
    showInputFeedback,
    showHitFeedback,
  } = useLaneFeedback();
  const [visibleJudgment, setVisibleJudgment] =
    useState<NoteJudgment | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const judgmentReadoutTimeoutRef = useRef<number | null>(null);

  const getDb = useCallback(async () => {
    if (dbRef.current) return dbRef.current;

    const db = await openRhythmLabDb();
    dbRef.current = db;
    return db;
  }, []);

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

  const createRecordedChart = useCallback(
    (notes: ChartNote[]): RhythmChart => {
      const sortedNotes = [...notes].sort(
        (first, second) => first.timeMs - second.timeMs
      );
      const audio = audioRef.current;
      const audioDurationMs =
        audio && Number.isFinite(audio.duration)
          ? Math.round(audio.duration * 1000)
          : 0;
      const lastNoteMs = sortedNotes.length
        ? sortedNotes[sortedNotes.length - 1].timeMs
        : 0;
      const durationMs = Math.max(
        audioDurationMs,
        Math.round(getElapsedMs()),
        lastNoteMs + RECORDED_CHART_TAIL_MS,
        1000
      );

      return {
        id: `recorded-${fileName ?? "local-audio"}`,
        title: "Recorded Chart",
        bpm: RECORDED_CHART_BPM,
        durationMs,
        notes: sortedNotes,
      };
    },
    [audioRef, fileName, getElapsedMs]
  );

  const focusGame = useCallback(() => {
    requestAnimationFrame(() => gameRef.current?.focus());
  }, []);

  const resetRecordingDraft = useCallback(() => {
    recordingNotesRef.current = [];
    recordingSequenceRef.current = 0;
    lastRecordedByLaneRef.current = {};
    setRecordingCount(0);
  }, []);

  const resetChartManagement = useCallback(() => {
    setChartNameDraft("");
    setIsRenamingChart(false);
    setPendingChartAction(null);
  }, []);

  const startGame = useCallback(async () => {
    const canPlay = await playFromStart();
    if (!canPlay) return;

    beginGame();
    focusGame();
  }, [beginGame, focusGame, playFromStart]);

  const restartGame = useCallback(async () => {
    const canPlay = await playFromStart();
    if (!canPlay) return;

    beginRestart();
    focusGame();
  }, [beginRestart, focusGame, playFromStart]);

  const resumeAudio = useCallback(async () => {
    const canPlay = await resumePlayback();
    if (canPlay) {
      focusGame();
    }
  }, [focusGame, resumePlayback]);

  const returnToSetup = useCallback(() => {
    pausePlayback();
    setVisibleJudgment(null);
    resetGame();
    focusGame();
  }, [focusGame, pausePlayback, resetGame]);

  const resetChartRuntimeForSongChange = useCallback(() => {
    resetRecordingDraft();
    resetChartManagement();
    setRecordedChart(null);
    setActiveChartMode("starter");
    setIsRecording(false);
    setVisibleJudgment(null);
    setChartStorageError(null);
    setChartRuns([]);
    setLoadedRunContextKey(null);
    setRunStorageError(null);
    runLoadRequestIdRef.current += 1;
    resetGame();
  }, [resetChartManagement, resetGame, resetRecordingDraft]);

  const selectRecordedChart = useCallback(
    (chartId: string) => {
      const selectedChart =
        recordedCharts.find((chart) => chart.id === chartId) ??
        recordedCharts[0] ??
        null;

      pausePlayback();
      resetChartManagement();
      setIsRecording(false);
      setVisibleJudgment(null);
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
      focusGame,
      pausePlayback,
      recordedCharts,
      resetChartManagement,
      resetGame,
      saveActiveChartPreference,
    ]
  );

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      pausePlayback();
      resetGame();
      resetChartRuntimeForSongChange();
      setRecordedCharts([]);
      setChartStorageError(null);
      handleFileChange(event);
      focusGame();
    },
    [
      focusGame,
      handleFileChange,
      pausePlayback,
      resetChartRuntimeForSongChange,
      resetGame,
    ]
  );

  const handleSongSelect = useCallback(
    (songId: string) => {
      if (!songId || songId === activeSongId) return;

      pausePlayback();
      resetChartRuntimeForSongChange();
      setRecordedCharts([]);
      void selectSong(songId);
      focusGame();
    },
    [
      activeSongId,
      focusGame,
      pausePlayback,
      resetChartRuntimeForSongChange,
      selectSong,
    ]
  );

  const startRecording = useCallback(async () => {
    if (!hasSelectedFile) return;

    const canPlay = await playFromStart();
    if (!canPlay) return;

    resetRecordingDraft();
    resetChartManagement();
    setRecordedChart(null);
    setActiveChartMode("starter");
    setIsRecording(true);
    setVisibleJudgment(null);
    resetGame();
    focusGame();
  }, [
    focusGame,
    hasSelectedFile,
    playFromStart,
    resetChartManagement,
    resetGame,
    resetRecordingDraft,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    pausePlayback();
    const nextChart = createRecordedChart(recordingNotesRef.current);
    setRecordingCount(recordingNotesRef.current.length);
    setRecordedChart(nextChart);
    setActiveChartMode("recorded");
    setIsRecording(false);
    setVisibleJudgment(null);
    resetGame();
    focusGame();

    if (!activeSongId) {
      setChartStorageError(
        "Recorded chart is available for this session only."
      );
      return;
    }

    const saveRecordedChart = async () => {
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

    void saveRecordedChart().catch(() => {
      setChartStorageError(
        "Recorded chart could not be saved. It is available for this session only."
      );
    });
  }, [
    activeSongId,
    createRecordedChart,
    focusGame,
    getDb,
    isRecording,
    pausePlayback,
    recordedCharts.length,
    resetGame,
  ]);

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
    setIsRecording(false);
    setVisibleJudgment(null);
    setChartRuns([]);
    setLoadedRunContextKey(null);
    setRunStorageError(null);
    completedRunSaveKeyRef.current = null;
    runLoadRequestIdRef.current += 1;
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
    focusGame,
    getDb,
    pausePlayback,
    pendingChartAction,
    recordedCharts,
    resetChartManagement,
    resetGame,
    selectedRecordedChart,
  ]);

  const selectActiveChartMode = useCallback(
    (mode: ActiveChartMode) => {
      if (mode === "recorded") {
        const chartId = recordedChart?.id ?? recordedCharts[0]?.id;
        if (chartId) selectRecordedChart(chartId);
        return;
      }

      pausePlayback();
      resetChartManagement();
      setIsRecording(false);
      setActiveChartMode(mode);
      setVisibleJudgment(null);
      resetGame();
      focusGame();
      void saveActiveChartPreference(null)
        .then(() => setChartStorageError(null))
        .catch(() => {
          setChartStorageError("Chart selection could not be saved.");
        });
    },
    [
      focusGame,
      pausePlayback,
      recordedChart,
      recordedCharts,
      resetChartManagement,
      resetGame,
      saveActiveChartPreference,
      selectRecordedChart,
    ]
  );

  const handleLaneInput = useCallback(
    (lane: LaneIndex) => {
      showInputFeedback(lane);

      if (isRecording) {
        const audio = audioRef.current;
        const timeMs = audio ? Math.round(audio.currentTime * 1000) : 0;
        const lastSameLaneNoteMs = lastRecordedByLaneRef.current[lane];

        if (
          lastSameLaneNoteMs !== undefined &&
          Math.abs(timeMs - lastSameLaneNoteMs) <= RECORDING_DEDUPE_MS
        ) {
          return;
        }

        recordingSequenceRef.current += 1;
        const note: ChartNote = {
          id: `recorded-${String(recordingSequenceRef.current).padStart(
            4,
            "0"
          )}-l${lane}`,
          lane,
          timeMs,
        };

        recordingNotesRef.current.push(note);
        lastRecordedByLaneRef.current[lane] = timeMs;
        setRecordingCount(recordingNotesRef.current.length);
        showHitFeedback(lane);
        return;
      }

      const judgment: NoteJudgment | null = hitLane(lane);

      if (judgment?.kind === "note-hit") {
        showHitFeedback(judgment.lane);
      }
    },
    [audioRef, hitLane, isRecording, showHitFeedback, showInputFeedback]
  );

  useEffect(
    () => () => {
      if (judgmentReadoutTimeoutRef.current) {
        window.clearTimeout(judgmentReadoutTimeoutRef.current);
      }

      dbRef.current?.close();
      dbRef.current = null;
    },
    []
  );

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

  const summaryChartLabel =
    activeChartMode === "recorded" && recordedChart
      ? "Recorded Chart"
      : "Starter Chart";
  const runSummary = useMemo(
    () => createRunSummary(summaryChartLabel, score, maxCombo, judgments),
    [judgments, maxCombo, score, summaryChartLabel]
  );

  useEffect(() => {
    const requestId = runLoadRequestIdRef.current + 1;
    runLoadRequestIdRef.current = requestId;
    setChartRuns([]);
    setLoadedRunContextKey(null);
    setRunStorageError(null);

    const loadChartRuns = async () => {
      const db = await getDb();
      const runs = await getRunsForChart(db, activeChart.id);

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
  }, [activeChart.id, currentRunContextKey, getDb]);

  useEffect(() => {
    if (phase !== "complete" || isRecording) {
      completedRunSaveKeyRef.current = null;
      return;
    }

    const completionKey = [
      activeChart.id,
      activeSongId ?? "songless",
      score,
      maxCombo,
      judgments.length,
      lastJudgment?.judgedAtMs ?? "no-judgment",
    ].join(":");

    if (completedRunSaveKeyRef.current === completionKey) return;
    completedRunSaveKeyRef.current = completionKey;

    const saveCompletedRun = async () => {
      const db = await getDb();
      const songId =
        activeChartMode === "recorded" ? activeSongId : null;
      const run = await saveRun(
        db,
        createRunRecord(activeChart.id, songId, runSummary)
      );
      const runs = await getRunsForChart(db, activeChart.id);

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
    activeChart.id,
    activeChartMode,
    activeSongId,
    currentRunContextKey,
    getDb,
    isRecording,
    judgments.length,
    lastJudgment?.judgedAtMs,
    maxCombo,
    phase,
    runSummary,
    score,
  ]);

  useEffect(() => {
    if (judgmentReadoutTimeoutRef.current) {
      window.clearTimeout(judgmentReadoutTimeoutRef.current);
      judgmentReadoutTimeoutRef.current = null;
    }

    setVisibleJudgment(lastJudgment);

    if (!lastJudgment) return;

    judgmentReadoutTimeoutRef.current = window.setTimeout(() => {
      setVisibleJudgment((currentJudgment) =>
        currentJudgment?.judgedAtMs === lastJudgment.judgedAtMs &&
        currentJudgment.lane === lastJudgment.lane
          ? null
          : currentJudgment
      );
      judgmentReadoutTimeoutRef.current = null;
    }, JUDGMENT_READOUT_MS);
  }, [lastJudgment]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const lane = keyToLane[event.key.toLowerCase()];

      if (lane !== undefined) {
        if (phase === "playing" || isRecording) {
          event.preventDefault();
          handleLaneInput(lane);
        }
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        phase !== "playing" &&
        !isRecording
      ) {
        event.preventDefault();
        void restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleLaneInput, isRecording, phase, restartGame]);

  const handleLanePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    lane: LaneIndex
  ) => {
    event.preventDefault();
    focusGame();

    if (phase === "playing" || isRecording) {
      handleLaneInput(lane);
    }
  };

  const visibleJudgmentClass = visibleJudgment
    ? `rhythm-lab-judgment-${visibleJudgment.rating.toLowerCase()}`
    : "";
  const visibleJudgmentKey = visibleJudgment
    ? `${visibleJudgment.rating}-${visibleJudgment.lane}-${visibleJudgment.judgedAtMs}`
    : "ready";
  const visibleDeltaMs =
    visibleJudgment?.kind === "note-hit" ||
    visibleJudgment?.kind === "note-miss"
      ? visibleJudgment.deltaMs
      : null;
  const rhythmLineStyle = {
    "--rhythm-line-y": `${RHYTHM_LINE_PERCENT}%`,
  } as CSSProperties;
  const chartModeLabel = isRecording
    ? `Recording mode - ${recordingCount} taps`
    : activeChartMode === "recorded" && recordedChart
      ? `Recorded chart - ${recordedChart.notes.length} notes`
      : hasSelectedFile
        ? "Starter chart - local audio clock"
        : "Starter chart - silent static clock";
  const isActiveSession = phase === "playing" || isRecording;
  const isHotStreak = phase === "playing" && combo >= 10;
  const activeChartModeLabel =
    activeChartMode === "recorded" && recordedChart ? "Recorded" : "Starter";
  const activeAudioLabel = fileName ?? "Local audio";
  const chartBestLabel = bestRun
    ? `${
        activeChartMode === "starter" ? "Starter best (global)" : "Best"
      }: ${formatScore(bestRun.score)} · ${formatPercent(
        bestRun.accuracy
      )} · Combo ${bestRun.maxCombo}`
    : isBestRunLoaded
      ? "No runs yet"
      : "Loading best...";

  useEffect(() => {
    if (phase === "complete") {
      pausePlayback();
    }
  }, [pausePlayback, phase]);

  useEffect(() => {
    if (!isRecording) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      stopRecording();
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [audioRef, isRecording, stopRecording]);

  useEffect(() => {
    resetGame();
  }, [activeChart.id, resetGame]);

  return (
    <div
      ref={gameRef}
      className={`rhythm-lab ${isRecording ? "rhythm-lab-recording" : ""} ${
        isActiveSession ? "rhythm-lab-active-session" : ""
      } ${
        isHotStreak ? "rhythm-lab-hot-streak" : ""
      }`}
      tabIndex={0}
      aria-label="Rhythm Lab three lane timing prototype"
    >
      <header className="rhythm-lab-header">
        <div className="rhythm-lab-header-copy">
          {isActiveSession ? (
            <div
              className="rhythm-lab-active-bar"
              aria-label="Active session controls"
            >
              <Link className="rhythm-lab-back-link" to="/games">
                Games
              </Link>
              <div className="rhythm-lab-active-context" aria-live="polite">
                <span
                  className="rhythm-lab-active-filename"
                  title={activeAudioLabel}
                  aria-label={activeAudioLabel}
                >
                  {activeAudioLabel}
                </span>
                <span className="rhythm-lab-active-chip rhythm-lab-active-chart">
                  {activeChartModeLabel}
                </span>
                <span
                  className={`rhythm-lab-active-chip rhythm-lab-active-status ${
                    isRecording ? "rhythm-lab-active-chip-recording" : ""
                  }`}
                >
                  {isRecording ? `${recordingCount} taps` : "Playing"}
                </span>
              </div>
              <div className="rhythm-lab-active-actions">
                {isPausedAfterVisibilityChange && phase === "playing" && (
                  <button
                    className="rhythm-lab-compact-action"
                    type="button"
                    onClick={resumeAudio}
                  >
                    Resume
                  </button>
                )}
                {isRecording ? (
                  <button
                    className="rhythm-lab-compact-action rhythm-lab-compact-action-danger"
                    type="button"
                    onClick={stopRecording}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    className="rhythm-lab-compact-action"
                    type="button"
                    onClick={() => {
                      void restartGame();
                    }}
                  >
                    Restart
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="rhythm-lab-eyebrow">
                Interaction Systems Experiment
              </p>
              <div className="rhythm-lab-title-row">
                <Link className="rhythm-lab-back-link" to="/games">
                  Games
                </Link>
                <h1>Rhythm Lab</h1>
              </div>
              <div className="rhythm-lab-audio-panel">
                <label className="rhythm-lab-audio-picker">
                  <span>Local audio</span>
                  <input
                    className="rhythm-lab-audio-input"
                    type="file"
                    accept="audio/*"
                    aria-label="Choose local audio file"
                    onChange={handleAudioFileChange}
                  />
                  <span
                    className="rhythm-lab-audio-picker-button"
                    aria-hidden="true"
                  >
                    Choose file
                  </span>
                </label>
                {importedSongs.length > 0 && (
                  <label
                    className="rhythm-lab-song-selector"
                    aria-label="Imported song selector"
                  >
                    <span>Saved songs</span>
                    <select
                      value={activeSongId ?? ""}
                      disabled={isRecording}
                      onChange={(event) =>
                        handleSongSelect(event.currentTarget.value)
                      }
                    >
                      <option value="" disabled>
                        Select song
                      </option>
                      {importedSongs.map((song) => (
                        <option key={song.id} value={song.id}>
                          {formatSongOptionLabel(song)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="rhythm-lab-audio-details" aria-live="polite">
                  <span
                    className="rhythm-lab-audio-filename"
                    title={fileName ?? "No audio selected"}
                    aria-label={fileName ?? "No audio selected"}
                  >
                    {fileName ? fileName : "No audio selected"}
                  </span>
                  <small>Stored locally in this browser. Not uploaded.</small>
                  {audioError && (
                    <small className="rhythm-lab-audio-error">
                      {audioError}
                    </small>
                  )}
                  {chartStorageError && (
                    <small className="rhythm-lab-audio-error">
                      {chartStorageError}
                    </small>
                  )}
                  {runStorageError && phase !== "complete" && (
                    <small className="rhythm-lab-audio-error">
                      {runStorageError}
                    </small>
                  )}
                </div>
                {hasSelectedFile && (
                  <div
                    className="rhythm-lab-recording-controls"
                    aria-label="Chart recording controls"
                  >
                    <button
                      className="rhythm-lab-chart-mode-button"
                      type="button"
                      aria-pressed={activeChartMode === "starter"}
                      disabled={isRecording}
                      onClick={() => selectActiveChartMode("starter")}
                    >
                      Starter chart
                    </button>
                    {recordedCharts.length > 0 ? (
                      <label
                        className="rhythm-lab-chart-selector"
                        aria-label="Recorded chart selector"
                      >
                        <span>Recorded chart</span>
                        <select
                          value={
                            activeChartMode === "recorded"
                              ? recordedChart?.id ?? ""
                              : ""
                          }
                          disabled={isRecording}
                          onChange={(event) =>
                            selectRecordedChart(event.currentTarget.value)
                          }
                        >
                          <option value="" disabled>
                            Select chart
                          </option>
                          {recordedCharts.map((chart) => (
                            <option key={chart.id} value={chart.id}>
                              {formatChartOptionLabel(chart)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      activeSongId && (
                        <span className="rhythm-lab-chart-empty">
                          No recorded charts
                        </span>
                      )
                    )}
                    <span
                      className="rhythm-lab-chart-best"
                      aria-label={`Selected chart best stats: ${chartBestLabel}`}
                    >
                      {chartBestLabel}
                    </span>
                    <button
                      className="rhythm-lab-record-button"
                      type="button"
                      onClick={() => {
                        void startRecording();
                      }}
                    >
                      Record chart
                    </button>
                    {selectedRecordedChart && (
                      <div
                        className="rhythm-lab-chart-management"
                        aria-label="Recorded chart management"
                      >
                        {isRenamingChart ? (
                          <>
                            <input
                              className="rhythm-lab-chart-name-input"
                              type="text"
                              aria-label="Recorded chart name"
                              value={chartNameDraft}
                              maxLength={CHART_NAME_MAX_LENGTH}
                              disabled={pendingChartAction !== null}
                              onChange={(event) =>
                                setChartNameDraft(event.currentTarget.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void saveChartRename();
                                }

                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelChartRename();
                                }
                              }}
                            />
                            <button
                              className="rhythm-lab-chart-management-button"
                              type="button"
                              disabled={pendingChartAction !== null}
                              onClick={() => {
                                void saveChartRename();
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="rhythm-lab-chart-management-button"
                              type="button"
                              disabled={pendingChartAction !== null}
                              onClick={cancelChartRename}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="rhythm-lab-chart-management-button"
                              type="button"
                              disabled={pendingChartAction !== null}
                              onClick={beginChartRename}
                            >
                              Rename
                            </button>
                            <button
                              className="rhythm-lab-chart-management-button rhythm-lab-chart-management-danger"
                              type="button"
                              disabled={pendingChartAction !== null}
                              onClick={() => {
                                void deleteSelectedChart();
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="rhythm-lab-hud" aria-live="polite">
          <span>Score {score}</span>
          <span>Combo {combo}</span>
          <span>Best {maxCombo}</span>
        </div>
      </header>
      <audio ref={audioRef} preload="metadata" />

      <main className="rhythm-lab-stage">
        <section
          className="rhythm-lab-highway"
          style={rhythmLineStyle}
          aria-label="Three lane note highway"
        >
          <div className="rhythm-lab-track">
            {lanes.map((lane) => (
              <div
                key={lane.index}
                className={`rhythm-lab-lane rhythm-lab-lane-${lane.index} ${
                  inputFeedbackExpiries[lane.index]
                    ? "rhythm-lab-lane-input"
                    : ""
                }`}
              >
                <span className="rhythm-lab-lane-label">{lane.label}</span>
                {visibleNotes
                  .filter((note) => note.lane === lane.index)
                  .map((note) => (
                    <span
                      key={note.id}
                      className="rhythm-lab-note-motion"
                      style={{
                        "--rhythm-note-y": `${
                          Math.min(
                            note.progress,
                            NOTE_OVERSHOOT_MULTIPLIER
                          ) * RHYTHM_LINE_PERCENT
                        }%`,
                      } as CSSProperties}
                    >
                      <span className="rhythm-lab-note" />
                    </span>
                  ))}
              </div>
            ))}
          </div>

          <div className="rhythm-lab-target-windows" aria-hidden="true">
            {lanes.map((lane) => (
              <span
                key={lane.index}
                className={`rhythm-lab-target-window ${
                  inputFeedbackExpiries[lane.index]
                    ? "rhythm-lab-target-input"
                    : ""
                } ${
                  hitFeedbackExpiries[lane.index]
                    ? "rhythm-lab-target-hit"
                    : ""
                }`}
              >
                <span className="rhythm-lab-target-window-line rhythm-lab-target-window-line-top" />
                <span className="rhythm-lab-target-window-line rhythm-lab-target-window-line-bottom" />
              </span>
            ))}
          </div>

          <div className="rhythm-lab-status">
            {visibleJudgment ? (
              <div
                key={visibleJudgmentKey}
                className="rhythm-lab-status-readout"
              >
                <span className={visibleJudgmentClass}>
                  {visibleJudgment.rating}
                </span>
                {typeof visibleDeltaMs === "number" && (
                  <small>
                    {visibleDeltaMs > 0 ? "+" : ""}
                    {visibleDeltaMs}ms
                  </small>
                )}
              </div>
            ) : isRecording ? (
              <div
                key="recording"
                className="rhythm-lab-status-readout rhythm-lab-status-recording"
              >
                <span>Recording</span>
                <small>{recordingCount} taps</small>
              </div>
            ) : (
              phase === "ready" && (
                <div
                  key={visibleJudgmentKey}
                  className="rhythm-lab-status-readout rhythm-lab-status-ready"
                >
                  <span>Ready</span>
                </div>
              )
            )}
          </div>

          {phase === "ready" && !isRecording && (
            <ReadyCheckPanel
              chartTitle={chart.title}
              chartModeLabel={chartModeLabel}
              onStart={() => {
                void startGame();
              }}
            />
          )}

          {phase === "complete" && !isRecording && (
            <RunSummaryPanel
              runSummary={runSummary}
              bestRun={bestRun}
              runStorageError={runStorageError}
              onRestart={() => {
                void restartGame();
              }}
              onReturnToSetup={returnToSetup}
            />
          )}

          <div className="rhythm-lab-hit-zones" aria-label="Lane tap zones">
            {lanes.map((lane) => (
              <button
                key={lane.index}
                className={`rhythm-lab-hit-zone ${
                  inputFeedbackExpiries[lane.index]
                    ? "rhythm-lab-hit-zone-input"
                    : ""
                }`}
                type="button"
                tabIndex={-1}
                onPointerDown={(event) =>
                  handleLanePointerDown(event, lane.index)
                }
                aria-label={`${lane.label} lane`}
              >
                <span>{lane.keys}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default RhythmLab;
