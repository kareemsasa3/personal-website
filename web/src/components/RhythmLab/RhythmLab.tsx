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
import { useLocalAudioFile } from "./useLocalAudioFile";
import { useRhythmLab } from "./useRhythmLab";
import "./RhythmLab.css";

const lanes: Array<{ index: LaneIndex; label: string; keys: string }> = [
  { index: 0, label: "Left", keys: "A / J / Left" },
  { index: 1, label: "Center", keys: "S / K / Down" },
  { index: 2, label: "Right", keys: "D / L / Right" },
];

const keyToLane: Record<string, LaneIndex> = {
  a: 0,
  j: 0,
  arrowleft: 0,
  s: 1,
  k: 1,
  arrowdown: 1,
  d: 2,
  l: 2,
  arrowright: 2,
};

type LaneFeedbackExpiries = Partial<Record<LaneIndex, number>>;
type LaneFeedbackTimers = Record<LaneIndex, number | null>;

const laneIndexes: LaneIndex[] = [0, 1, 2];
const INPUT_FEEDBACK_MS = 80;
const HIT_FEEDBACK_MS = 120;
const JUDGMENT_READOUT_MS = 700;
const RHYTHM_LINE_PERCENT = 76;
const NOTE_OVERSHOOT_MULTIPLIER = 1.09;
const RECORDING_DEDUPE_MS = 40;
const RECORDED_CHART_BPM = 120;
const RECORDED_CHART_TAIL_MS = 1800;

const createLaneFeedbackTimers = (): LaneFeedbackTimers => ({
  0: null,
  1: null,
  2: null,
});

type ActiveChartMode = "starter" | "recorded";

interface RhythmRunSummary {
  chartLabel: string;
  score: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  emptyInputMissCount: number;
  accuracyPercent: number;
  meanAbsoluteDeltaMs: number | null;
  earlyCount: number;
  lateCount: number;
}

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatDelta = (value: number | null) =>
  value === null ? "N/A" : `${Math.round(value)}ms`;

const createRunSummary = (
  chartLabel: string,
  score: number,
  maxCombo: number,
  judgments: NoteJudgment[]
): RhythmRunSummary => {
  const noteBackedJudgments = judgments.filter(
    (judgment) =>
      judgment.kind === "note-hit" || judgment.kind === "note-miss"
  );
  const perfectCount = noteBackedJudgments.filter(
    (judgment) => judgment.rating === "Perfect"
  ).length;
  const goodCount = noteBackedJudgments.filter(
    (judgment) => judgment.rating === "Good"
  ).length;
  const missCount = noteBackedJudgments.filter(
    (judgment) => judgment.kind === "note-miss"
  ).length;
  const emptyInputMissCount = judgments.filter(
    (judgment) => judgment.kind === "empty-input"
  ).length;
  const numericDeltas = noteBackedJudgments
    .map((judgment) => judgment.deltaMs)
    .filter((deltaMs): deltaMs is number => typeof deltaMs === "number");
  const accuracyPercent =
    ((perfectCount + goodCount * 0.5) /
      Math.max(noteBackedJudgments.length, 1)) *
    100;
  const meanAbsoluteDeltaMs = numericDeltas.length
    ? numericDeltas.reduce((total, deltaMs) => total + Math.abs(deltaMs), 0) /
      numericDeltas.length
    : null;

  return {
    chartLabel,
    score,
    maxCombo,
    perfectCount,
    goodCount,
    missCount,
    emptyInputMissCount,
    accuracyPercent,
    meanAbsoluteDeltaMs,
    earlyCount: numericDeltas.filter((deltaMs) => deltaMs < 0).length,
    lateCount: numericDeltas.filter((deltaMs) => deltaMs > 0).length,
  };
};

const RhythmLab = () => {
  const {
    audioRef,
    fileName,
    error: audioError,
    hasSelectedFile,
    isPausedAfterVisibilityChange,
    handleFileChange,
    playFromStart,
    resumePlayback,
    pausePlayback,
    getElapsedMs,
    isPlaybackComplete,
  } = useLocalAudioFile();
  const [activeChartMode, setActiveChartMode] =
    useState<ActiveChartMode>("starter");
  const [recordedChart, setRecordedChart] = useState<RhythmChart | null>(null);
  const [recordingCount, setRecordingCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingNotesRef = useRef<ChartNote[]>([]);
  const recordingSequenceRef = useRef(0);
  const lastRecordedByLaneRef = useRef<Partial<Record<LaneIndex, number>>>({});
  const activeChart =
    activeChartMode === "recorded" && recordedChart
      ? recordedChart
      : starterChart;
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
  const [inputFeedbackExpiries, setInputFeedbackExpiries] =
    useState<LaneFeedbackExpiries>({});
  const [hitFeedbackExpiries, setHitFeedbackExpiries] =
    useState<LaneFeedbackExpiries>({});
  const [visibleJudgment, setVisibleJudgment] =
    useState<NoteJudgment | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const inputFeedbackTimeoutRefs = useRef<LaneFeedbackTimers>(
    createLaneFeedbackTimers()
  );
  const hitFeedbackTimeoutRefs = useRef<LaneFeedbackTimers>(
    createLaneFeedbackTimers()
  );
  const judgmentReadoutTimeoutRef = useRef<number | null>(null);

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

  const clearRecordedChart = useCallback(() => {
    resetRecordingDraft();
    setRecordedChart(null);
    setActiveChartMode("starter");
    setIsRecording(false);
    setVisibleJudgment(null);
    resetGame();
  }, [resetGame, resetRecordingDraft]);

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      pausePlayback();
      resetGame();
      clearRecordedChart();
      handleFileChange(event);
      focusGame();
    },
    [clearRecordedChart, focusGame, handleFileChange, pausePlayback, resetGame]
  );

  const startRecording = useCallback(async () => {
    if (!hasSelectedFile) return;

    const canPlay = await playFromStart();
    if (!canPlay) return;

    resetRecordingDraft();
    setRecordedChart(null);
    setActiveChartMode("starter");
    setIsRecording(true);
    setVisibleJudgment(null);
    resetGame();
    focusGame();
  }, [focusGame, hasSelectedFile, playFromStart, resetGame, resetRecordingDraft]);

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
  }, [
    createRecordedChart,
    focusGame,
    isRecording,
    pausePlayback,
    resetGame,
  ]);

  const selectActiveChartMode = useCallback(
    (mode: ActiveChartMode) => {
      if (mode === "recorded" && !recordedChart) return;

      pausePlayback();
      setIsRecording(false);
      setActiveChartMode(mode);
      setVisibleJudgment(null);
      resetGame();
      focusGame();
    },
    [focusGame, pausePlayback, recordedChart, resetGame]
  );

  const showInputFeedback = useCallback((lane: LaneIndex) => {
    const expiresAt = performance.now() + INPUT_FEEDBACK_MS;

    setInputFeedbackExpiries((currentExpiries) => ({
      ...currentExpiries,
      [lane]: expiresAt,
    }));

    const currentTimeout = inputFeedbackTimeoutRefs.current[lane];
    if (currentTimeout) {
      window.clearTimeout(currentTimeout);
    }

    inputFeedbackTimeoutRefs.current[lane] = window.setTimeout(() => {
      setInputFeedbackExpiries((currentExpiries) => {
        if ((currentExpiries[lane] ?? 0) > expiresAt) {
          return currentExpiries;
        }

        const nextExpiries = { ...currentExpiries };
        delete nextExpiries[lane];
        return nextExpiries;
      });
      inputFeedbackTimeoutRefs.current[lane] = null;
    }, INPUT_FEEDBACK_MS);
  }, []);

  const showHitFeedback = useCallback((lane: LaneIndex) => {
    const expiresAt = performance.now() + HIT_FEEDBACK_MS;

    setHitFeedbackExpiries((currentExpiries) => ({
      ...currentExpiries,
      [lane]: expiresAt,
    }));

    const currentTimeout = hitFeedbackTimeoutRefs.current[lane];
    if (currentTimeout) {
      window.clearTimeout(currentTimeout);
    }

    hitFeedbackTimeoutRefs.current[lane] = window.setTimeout(() => {
      setHitFeedbackExpiries((currentExpiries) => {
        if ((currentExpiries[lane] ?? 0) > expiresAt) {
          return currentExpiries;
        }

        const nextExpiries = { ...currentExpiries };
        delete nextExpiries[lane];
        return nextExpiries;
      });
      hitFeedbackTimeoutRefs.current[lane] = null;
    }, HIT_FEEDBACK_MS);
  }, []);

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
      laneIndexes.forEach((lane) => {
        const inputTimeout = inputFeedbackTimeoutRefs.current[lane];
        if (inputTimeout) {
          window.clearTimeout(inputTimeout);
        }

        const hitTimeout = hitFeedbackTimeoutRefs.current[lane];
        if (hitTimeout) {
          window.clearTimeout(hitTimeout);
        }
      });

      if (judgmentReadoutTimeoutRef.current) {
        window.clearTimeout(judgmentReadoutTimeoutRef.current);
      }
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
  const activeChartModeLabel =
    activeChartMode === "recorded" && recordedChart ? "Recorded" : "Starter";
  const activeAudioLabel = fileName ?? "Local audio";
  const summaryChartLabel =
    activeChartMode === "recorded" && recordedChart
      ? "Recorded Chart"
      : "Starter Chart";
  const runSummary = useMemo(
    () => createRunSummary(summaryChartLabel, score, maxCombo, judgments),
    [judgments, maxCombo, score, summaryChartLabel]
  );

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
                <div className="rhythm-lab-audio-details" aria-live="polite">
                  <span
                    className="rhythm-lab-audio-filename"
                    title={fileName ?? "No audio selected"}
                    aria-label={fileName ?? "No audio selected"}
                  >
                    {fileName ? fileName : "No audio selected"}
                  </span>
                  <small>Local only. Not uploaded or stored.</small>
                  {audioError && (
                    <small className="rhythm-lab-audio-error">
                      {audioError}
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
                    {recordedChart && (
                      <button
                        className="rhythm-lab-chart-mode-button"
                        type="button"
                        aria-pressed={activeChartMode === "recorded"}
                        disabled={isRecording}
                        onClick={() => selectActiveChartMode("recorded")}
                      >
                        Recorded chart
                      </button>
                    )}
                    <button
                      className="rhythm-lab-record-button"
                      type="button"
                      onClick={() => {
                        void startRecording();
                      }}
                    >
                      Record chart
                    </button>
                    {recordedChart && (
                      <button
                        className="rhythm-lab-clear-recording"
                        type="button"
                        onClick={clearRecordedChart}
                      >
                        Clear
                      </button>
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

          <div className="rhythm-lab-judgment-line" aria-hidden="true">
            {lanes.map((lane) => (
              <span
                key={lane.index}
                className={`${
                  inputFeedbackExpiries[lane.index]
                    ? "rhythm-lab-target-input"
                    : ""
                } ${
                  hitFeedbackExpiries[lane.index]
                    ? "rhythm-lab-target-hit"
                    : ""
                }`}
              />
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
            <div className="rhythm-lab-overlay">
              <div className="rhythm-lab-overlay-panel">
                <p>
                  {chart.title} - {chartModeLabel}
                </p>
                <h2>Ready Check</h2>
                <button
                  className="rhythm-lab-primary-action"
                  type="button"
                  onClick={() => {
                    void startGame();
                  }}
                >
                  Start
                </button>
                <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
              </div>
            </div>
          )}

          {phase === "complete" && !isRecording && (
            <div className="rhythm-lab-overlay">
              <div className="rhythm-lab-overlay-panel rhythm-lab-summary-panel">
                <p>{runSummary.chartLabel}</p>
                <h2>Run Summary</h2>
                <div className="rhythm-lab-summary-score">
                  <span>Final score</span>
                  <strong>{runSummary.score}</strong>
                </div>
                <dl className="rhythm-lab-summary-metrics">
                  <div>
                    <dt>Max combo</dt>
                    <dd>{runSummary.maxCombo}</dd>
                  </div>
                  <div>
                    <dt>Accuracy</dt>
                    <dd>{formatPercent(runSummary.accuracyPercent)}</dd>
                  </div>
                  <div>
                    <dt>Perfect</dt>
                    <dd>{runSummary.perfectCount}</dd>
                  </div>
                  <div>
                    <dt>Good</dt>
                    <dd>{runSummary.goodCount}</dd>
                  </div>
                  <div>
                    <dt>Miss</dt>
                    <dd>{runSummary.missCount}</dd>
                  </div>
                  <div>
                    <dt>Empty miss</dt>
                    <dd>{runSummary.emptyInputMissCount}</dd>
                  </div>
                  <div>
                    <dt>Mean |delta|</dt>
                    <dd>{formatDelta(runSummary.meanAbsoluteDeltaMs)}</dd>
                  </div>
                  <div>
                    <dt>Early / Late</dt>
                    <dd>
                      {runSummary.earlyCount} / {runSummary.lateCount}
                    </dd>
                  </div>
                </dl>
                <div className="rhythm-lab-summary-actions">
                  <button
                    className="rhythm-lab-primary-action"
                    type="button"
                    onClick={() => {
                      void restartGame();
                    }}
                  >
                    Play again
                  </button>
                  <button
                    className="rhythm-lab-secondary-action"
                    type="button"
                    onClick={returnToSetup}
                  >
                    Back to setup
                  </button>
                </div>
                <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
              </div>
            </div>
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
