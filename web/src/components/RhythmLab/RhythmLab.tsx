import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  type LaneIndex,
  type NoteJudgment,
  type RunEndReason,
} from "./types";

type SetupTab = "setup" | "history" | "analytics";
import { openRhythmLabDb } from "./library/rhythmLabDb";
import type { RhythmLabChart } from "./library/types";
import { useLocalAudioFile } from "./useLocalAudioFile";
import { useRhythmLab } from "./useRhythmLab";
import ActiveSessionHeader from "./ActiveSessionHeader";
import ChartControls from "./ChartControls";
import PauseMenu from "./PauseMenu";
import ReadyCheckPanel from "./ReadyCheckPanel";
import RhythmHighway from "./RhythmHighway";
import RunAnalyticsPanel from "./RunAnalyticsPanel";
import RunHistoryPanel from "./RunHistoryPanel";
import {
  type RhythmLabChartExportV1,
  createChartExportPayload,
  createChartExportFilename,
  downloadJsonFile,
} from "./chartExport";
import {
  parseRhythmLabChartExportFile,
  doesExportedSongMatchActiveSong,
} from "./chartImport";
import DeleteChartDialog from "./DeleteChartDialog";
import ImportChartMismatchDialog from "./ImportChartMismatchDialog";
import RunSummaryPanel from "./RunSummaryPanel";
import SongControls from "./SongControls";
import {
  createRunSummary,
  formatPercent,
  formatScore,
  JUDGMENT_READOUT_MS,
  keyToLane,
  type RunHistoryChartSnapshot,
} from "./helpers";
import { useChartRuns } from "./useChartRuns";
import { useLaneFeedback } from "./useLaneFeedback";
import { useRecordingSession } from "./useRecordingSession";
import { useRecordedCharts } from "./useRecordedCharts";
import { useRunHistory } from "./useRunHistory";
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
    isPreviewing,
    isPausedAfterVisibilityChange,
    handleFileChange,
    selectSong,
    playFromStart,
    resumePlayback,
    pausePlayback,
    getElapsedMs,
    isPlaybackComplete,
    startPreview,
    stopPreview,
  } = useLocalAudioFile();
  const {
    isRecording,
    recordingCount,
    beginRecording,
    stopRecording: finalizeRecording,
    cancelRecording,
    recordLaneTap,
  } = useRecordingSession({ audioRef, fileName, getElapsedMs });
  const dbRef = useRef<IDBDatabase | null>(null);
  const [visibleJudgment, setVisibleJudgment] =
    useState<NoteJudgment | null>(null);
  const [chartPendingDelete, setChartPendingDelete] =
    useState<RhythmLabChart | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const judgmentReadoutTimeoutRef = useRef<number | null>(null);
  const [pendingImportPayload, setPendingImportPayload] =
    useState<RhythmLabChartExportV1 | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const getDb = useCallback(async () => {
    if (dbRef.current) return dbRef.current;

    const db = await openRhythmLabDb();
    dbRef.current = db;
    return db;
  }, []);

  const focusGame = useCallback(() => {
    requestAnimationFrame(() => gameRef.current?.focus());
  }, []);

  const onClearJudgment = useCallback(() => {
    setVisibleJudgment(null);
  }, []);

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

  // Stable callback refs for breaking circular dependencies between hooks.
  // useRecordedCharts needs resetGame (from useRhythmLab) and resetRuns (from
  // useChartRuns), but both of those hooks depend on values from useRecordedCharts.
  // These refs are updated after each hook call and are only invoked in callbacks
  // and effects, never during render.
  const resetGameRef = useRef<() => void>(() => {});
  const resetRunsRef = useRef<() => void>(() => {});
  const resetGameStable = useCallback(() => {
    resetGameRef.current();
  }, []);
  const resetRunsStable = useCallback(() => {
    resetRunsRef.current();
  }, []);

  const {
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
    importChart,
    saveRecordedChart,
    resetChartManagement,
    setRecordedChart,
    setActiveChartMode,
    setChartNameDraft,
  } = useRecordedCharts({
    getDb,
    activeSongId,
    activeSongRevision,
    resetGame: resetGameStable,
    pausePlayback,
    focusGame,
    cancelRecording,
    resetRuns: resetRunsStable,
    isRecording,
    onClearJudgment,
  });

  const game = useRhythmLab(activeChart, rhythmClock);
  const {
    phase,
    currentRunId,
    elapsedMs,
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
    pauseGame,
    resumeGame,
    endGameEarly,
    hitLane,
  } = game;
  const [endReason, setEndReason] = useState<RunEndReason>("completed");
  const [setupTab, setSetupTab] = useState<SetupTab>("setup");

  // Update the ref so useRecordedCharts callbacks use the real resetGame
  resetGameRef.current = resetGame;

  const {
    inputFeedbackExpiries,
    hitFeedbackExpiries,
    showInputFeedback,
    showHitFeedback,
  } = useLaneFeedback();

  const summaryChartLabel =
    activeChartMode === "recorded" && recordedChart
      ? "Recorded Chart"
      : "Starter Chart";
  const runSummary = useMemo(
    () =>
      createRunSummary(
        summaryChartLabel,
        endReason,
        elapsedMs,
        chart.durationMs,
        chart.notes.length,
        score,
        maxCombo,
        judgments
      ),
    [
      chart.durationMs,
      chart.notes.length,
      elapsedMs,
      endReason,
      judgments,
      maxCombo,
      score,
      summaryChartLabel,
    ]
  );

  const { bestRun, isBestRunLoaded, runStorageError, resetRuns } =
    useChartRuns({
      getDb,
      activeChartId: activeChart.id,
      currentRunContextKey,
      activeChartMode,
      activeSongId,
      phase,
      isRecording,
      runSummary,
      score,
      maxCombo,
      judgmentsLength: judgments.length,
      lastJudgedAtMs: lastJudgment?.judgedAtMs,
    });
  resetRunsRef.current = resetRuns;

  const activeSong =
    activeSongId
      ? importedSongs.find((song) => song.id === activeSongId) ?? null
      : null;

  const activeChartSnapshot = useMemo<RunHistoryChartSnapshot | null>(() => {
    if (!activeChart) return null;

    return {
      id: activeChart.id,
      label: activeChart.title,
      source: selectedRecordedChart?.source ?? activeChartMode,
      noteCount: activeChart.notes.length,
    };
  }, [activeChart, activeChartMode, selectedRecordedChart?.source]);

  const { history, clearHistory } = useRunHistory({
    phase,
    currentRunId,
    isRecording,
    runSummary,
    activeSong,
    activeChartSnapshot,
  });

  const startGame = useCallback(async () => {
    const canPlay = await playFromStart();
    if (!canPlay) return;

    setEndReason("completed");
    beginGame();
    focusGame();
  }, [beginGame, focusGame, playFromStart]);

  const restartGame = useCallback(async () => {
    const canPlay = await playFromStart();
    if (!canPlay) return;

    setEndReason("completed");
    beginRestart();
    focusGame();
  }, [beginRestart, focusGame, playFromStart]);

  const resumeAudio = useCallback(async () => {
    const canPlay = await resumePlayback();
    if (canPlay) {
      focusGame();
    }
  }, [focusGame, resumePlayback]);

  const pauseRun = useCallback(() => {
    pausePlayback();
    pauseGame();
  }, [pausePlayback, pauseGame]);

  const resumeRun = useCallback(async () => {
    const canPlay = await resumePlayback();
    if (!canPlay) return;

    resumeGame();
    focusGame();
  }, [focusGame, resumeGame, resumePlayback]);

  const endRunEarly = useCallback(() => {
    pausePlayback();
    setEndReason("ended_early");
    endGameEarly();
  }, [endGameEarly, pausePlayback]);

  const returnToSetup = useCallback(() => {
    pausePlayback();
    setVisibleJudgment(null);
    resetGame();
    focusGame();
  }, [focusGame, pausePlayback, resetGame]);

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      stopPreview();
      pausePlayback();
      resetGame();
      resetChartRuntimeForSongChange();
      handleFileChange(event);
      focusGame();
    },
    [
      focusGame,
      handleFileChange,
      pausePlayback,
      resetChartRuntimeForSongChange,
      resetGame,
      stopPreview,
    ]
  );

  const handleSongSelect = useCallback(
    (songId: string) => {
      if (!songId || songId === activeSongId) return;

      stopPreview();
      pausePlayback();
      resetChartRuntimeForSongChange();
      void selectSong(songId);
      focusGame();
    },
    [
      activeSongId,
      focusGame,
      pausePlayback,
      resetChartRuntimeForSongChange,
      selectSong,
      stopPreview,
    ]
  );

  const startRecording = useCallback(async () => {
    if (!hasSelectedFile) return;

    const canPlay = await playFromStart();
    if (!canPlay) return;

    beginRecording();
    resetChartManagement();
    setRecordedChart(null);
    setActiveChartMode("starter");
    setVisibleJudgment(null);
    resetGame();
    focusGame();
  }, [
    beginRecording,
    focusGame,
    hasSelectedFile,
    playFromStart,
    resetChartManagement,
    resetGame,
    setActiveChartMode,
    setRecordedChart,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    pausePlayback();
    const nextChart = finalizeRecording();
    setVisibleJudgment(null);
    resetGame();
    focusGame();
    saveRecordedChart(nextChart);
  }, [
    finalizeRecording,
    focusGame,
    isRecording,
    pausePlayback,
    resetGame,
    saveRecordedChart,
  ]);

  const handleLaneInput = useCallback(
    (lane: LaneIndex) => {
      showInputFeedback(lane);

      if (isRecording) {
        if (recordLaneTap(lane)) {
          showHitFeedback(lane);
        }
        return;
      }

      const judgment: NoteJudgment | null = hitLane(lane);

      if (judgment?.kind === "note-hit") {
        showHitFeedback(judgment.lane);
      }
    },
    [hitLane, isRecording, recordLaneTap, showHitFeedback, showInputFeedback]
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
      // Let modal dialogs handle their own keyboard events.
      if (chartPendingDelete || pendingImportPayload) return;

      if (event.key === "Escape") {
        event.preventDefault();
        if (phase === "playing" && !isRecording) {
          pauseRun();
        } else if (phase === "paused") {
          void resumeRun();
        }
        return;
      }

      // Let focused interactive elements handle Enter/Space natively
      // so pause-menu buttons, links, and form controls remain accessible.
      if (
        (event.key === "Enter" || event.key === " ") &&
        (event.target as HTMLElement | null)?.closest(
          "button, a, input, textarea, select"
        )
      ) {
        return;
      }

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
        phase !== "paused" &&
        !isRecording
      ) {
        event.preventDefault();
        void restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chartPendingDelete, handleLaneInput, isRecording, pauseRun, pendingImportPayload, phase, restartGame, resumeRun]);

  const confirmDeleteChart = useCallback(() => {
    if (!chartPendingDelete) return;
    setChartPendingDelete(null);
    void deleteSelectedChart();
  }, [chartPendingDelete, deleteSelectedChart]);

  const cancelDeleteChart = useCallback(() => {
    setChartPendingDelete(null);
  }, []);

  const exportSelectedChart = useCallback(() => {
    if (!selectedRecordedChart) return;

    const payload = createChartExportPayload(
      selectedRecordedChart,
      activeSong
    );
    const filename = createChartExportFilename(
      activeSong?.title,
      selectedRecordedChart.name
    );
    downloadJsonFile(filename, payload);
  }, [activeSong, selectedRecordedChart]);

  const completeImport = useCallback(
    async (payload: RhythmLabChartExportV1) => {
      try {
        const label = await importChart(payload);
        setImportStatus(`Imported \u201c${label}\u201d`);
        focusGame();
      } catch (error) {
        setImportStatus(
          error instanceof Error
            ? error.message
            : "Chart could not be imported."
        );
      }
    },
    [focusGame, importChart]
  );

  const handleImportFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";

      if (!file) return;

      if (!activeSong) {
        setImportStatus("Select a song before importing a chart.");
        return;
      }

      setImportStatus(null);

      const payload = await parseRhythmLabChartExportFile(file);
      if (!payload) {
        setImportStatus("This is not a valid Rhythm Lab chart export.");
        return;
      }

      if (payload.chart.notes.length === 0) {
        setImportStatus("This chart export has no valid notes.");
        return;
      }

      if (
        payload.song &&
        !doesExportedSongMatchActiveSong(payload.song, activeSong)
      ) {
        setPendingImportPayload(payload);
        return;
      }

      void completeImport(payload);
    },
    [activeSong, completeImport]
  );

  const triggerImportFilePicker = useCallback(() => {
    if (!activeSong) {
      setImportStatus("Select a song before importing a chart.");
      return;
    }

    setImportStatus(null);
    importFileInputRef.current?.click();
  }, [activeSong]);

  const confirmMismatchImport = useCallback(() => {
    if (!pendingImportPayload) return;
    const payload = pendingImportPayload;
    setPendingImportPayload(null);
    void completeImport(payload);
  }, [completeImport, pendingImportPayload]);

  const cancelMismatchImport = useCallback(() => {
    setPendingImportPayload(null);
  }, []);

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

  const chartModeLabel = isRecording
    ? `Recording mode - ${recordingCount} taps`
    : activeChartMode === "recorded" && recordedChart
      ? `Recorded chart - ${recordedChart.notes.length} notes`
      : hasSelectedFile
        ? "Starter chart - local audio clock"
        : "Starter chart - silent static clock";
  const isActiveSession = phase === "playing" || phase === "paused" || isRecording;
  const isHotStreak = phase === "playing" && combo >= 10;
  const activeChartModeLabel =
    activeChartMode === "recorded" && recordedChart ? "Recorded" : "Starter";
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
            <ActiveSessionHeader
              fileName={fileName}
              activeChartModeLabel={activeChartModeLabel}
              isRecording={isRecording}
              recordingCount={recordingCount}
              isPausedAfterVisibilityChange={isPausedAfterVisibilityChange}
              phase={phase}
              onPause={pauseRun}
              onResume={resumeAudio}
              onRestart={() => {
                void restartGame();
              }}
              onStopRecording={stopRecording}
            />
          ) : (
            <>
              <p className="rhythm-lab-eyebrow">
                Interaction Systems Experiment
              </p>
              <div className="rhythm-lab-title-row">
                <Link className="rhythm-lab-back-link" to="/simulations">
                  Simulations
                </Link>
                <h1>Rhythm Lab</h1>
              </div>
              <div className="rhythm-lab-audio-panel">
                  <div
                    className="rhythm-lab-panel-tabs"
                    role="tablist"
                    aria-label="Rhythm Lab panels"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={setupTab === "setup"}
                      className={setupTab === "setup" ? "is-active" : ""}
                      onClick={() => setSetupTab("setup")}
                    >
                      Setup
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={setupTab === "history"}
                      className={setupTab === "history" ? "is-active" : ""}
                      onClick={() => setSetupTab("history")}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={setupTab === "analytics"}
                      className={setupTab === "analytics" ? "is-active" : ""}
                      onClick={() => setSetupTab("analytics")}
                    >
                      Analytics
                    </button>
                  </div>

                  {setupTab === "setup" && (
                    <>
                      <SongControls
                        fileName={fileName}
                        importedSongs={importedSongs}
                        activeSongId={activeSongId}
                        audioError={audioError}
                        chartStorageError={chartStorageError}
                        runStorageError={runStorageError}
                        phase={phase}
                        isRecording={isRecording}
                        hasSelectedFile={hasSelectedFile}
                        isPreviewing={isPreviewing}
                        onFileChange={handleAudioFileChange}
                        onSongSelect={handleSongSelect}
                        onStartPreview={() => {
                          void startPreview();
                        }}
                        onStopPreview={stopPreview}
                      />
                      {hasSelectedFile && (
                        <ChartControls
                          activeChartMode={activeChartMode}
                          recordedChartId={recordedChart?.id ?? null}
                          recordedCharts={recordedCharts}
                          activeSongId={activeSongId}
                          chartBestLabel={chartBestLabel}
                          hasSelectedRecordedChart={
                            selectedRecordedChart !== null
                          }
                          isRecording={isRecording}
                          isRenamingChart={isRenamingChart}
                          chartNameDraft={chartNameDraft}
                          pendingChartAction={pendingChartAction}
                          onSelectStarterMode={() =>
                            selectActiveChartMode("starter")
                          }
                          onSelectRecordedChart={selectRecordedChart}
                          onStartRecording={() => {
                            void startRecording();
                          }}
                          onBeginRename={beginChartRename}
                          onCancelRename={cancelChartRename}
                          onSaveRename={saveChartRename}
                          onDeleteChart={() => {
                            if (selectedRecordedChart) {
                              setChartPendingDelete(selectedRecordedChart);
                            }
                          }}
                          onImportChart={triggerImportFilePicker}
                          onExportChart={exportSelectedChart}
                          onChartNameChange={setChartNameDraft}
                        />
                      )}
                      <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".json,.rhythm-chart.json,application/json"
                        className="rhythm-lab-hidden-file-input"
                        tabIndex={-1}
                        aria-hidden="true"
                        onChange={(event) => {
                          void handleImportFileSelected(event);
                        }}
                      />
                      {importStatus && (
                        <p className="rhythm-lab-import-status" role="status">
                          {importStatus}
                        </p>
                      )}
                    </>
                  )}

                  {setupTab === "history" && (
                    <RunHistoryPanel
                      history={history}
                      recordedCharts={recordedCharts}
                      onClearHistory={clearHistory}
                    />
                  )}

                  {setupTab === "analytics" && (
                    <RunAnalyticsPanel
                      history={history}
                      recordedCharts={recordedCharts}
                    />
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
        <RhythmHighway
          visibleNotes={visibleNotes}
          inputFeedbackExpiries={inputFeedbackExpiries}
          hitFeedbackExpiries={hitFeedbackExpiries}
          visibleJudgment={visibleJudgment}
          phase={phase}
          isRecording={isRecording}
          recordingCount={recordingCount}
          onLanePointerDown={handleLanePointerDown}
        >
          {phase === "ready" && !isRecording && (
            <ReadyCheckPanel
              chartTitle={chart.title}
              chartModeLabel={chartModeLabel}
              onStart={() => {
                void startGame();
              }}
            />
          )}

          {phase === "paused" && !isRecording && (
            <PauseMenu
              onResume={() => {
                void resumeRun();
              }}
              onRestart={() => {
                void restartGame();
              }}
              onEndSong={endRunEarly}
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
        </RhythmHighway>
      </main>

      {chartPendingDelete && (
        <DeleteChartDialog
          chartName={chartPendingDelete.name}
          songTitle={activeSong?.title}
          noteCount={chartPendingDelete.notes.length}
          onCancel={cancelDeleteChart}
          onConfirm={confirmDeleteChart}
        />
      )}

      {pendingImportPayload && (
        <ImportChartMismatchDialog
          exportedSongTitle={
            pendingImportPayload.song?.title ?? "Unknown song"
          }
          currentSongTitle={activeSong?.title ?? "Unknown song"}
          onCancel={cancelMismatchImport}
          onConfirm={confirmMismatchImport}
        />
      )}
    </div>
  );
};

export default RhythmLab;
