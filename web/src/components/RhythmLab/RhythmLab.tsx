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
import { type LaneIndex, type NoteJudgment } from "./types";
import { openRhythmLabDb } from "./library/rhythmLabDb";
import { useLocalAudioFile } from "./useLocalAudioFile";
import { useRhythmLab } from "./useRhythmLab";
import ActiveSessionHeader from "./ActiveSessionHeader";
import ReadyCheckPanel from "./ReadyCheckPanel";
import RhythmHighway from "./RhythmHighway";
import RunSummaryPanel from "./RunSummaryPanel";
import {
  CHART_NAME_MAX_LENGTH,
  createRunSummary,
  formatChartOptionLabel,
  formatPercent,
  formatScore,
  formatSongOptionLabel,
  JUDGMENT_READOUT_MS,
  keyToLane,
} from "./helpers";
import { useChartRuns } from "./useChartRuns";
import { useLaneFeedback } from "./useLaneFeedback";
import { useRecordingSession } from "./useRecordingSession";
import { useRecordedCharts } from "./useRecordedCharts";
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
  const gameRef = useRef<HTMLDivElement>(null);
  const judgmentReadoutTimeoutRef = useRef<number | null>(null);

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
    () => createRunSummary(summaryChartLabel, score, maxCombo, judgments),
    [judgments, maxCombo, score, summaryChartLabel]
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

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
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
    ]
  );

  const handleSongSelect = useCallback(
    (songId: string) => {
      if (!songId || songId === activeSongId) return;

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
    </div>
  );
};

export default RhythmLab;
