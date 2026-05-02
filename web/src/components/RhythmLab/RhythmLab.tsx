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
  const [recordingNotes, setRecordingNotes] = useState<ChartNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingNotesRef = useRef<ChartNote[]>([]);
  const recordingSequenceRef = useRef(0);
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

  const clearRecordedChart = useCallback(() => {
    recordingNotesRef.current = [];
    recordingSequenceRef.current = 0;
    setRecordingNotes([]);
    setRecordedChart(null);
    setActiveChartMode("starter");
    setIsRecording(false);
    setVisibleJudgment(null);
    resetGame();
  }, [resetGame]);

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

    recordingNotesRef.current = [];
    recordingSequenceRef.current = 0;
    setRecordingNotes([]);
    setRecordedChart(null);
    setActiveChartMode("starter");
    setIsRecording(true);
    setVisibleJudgment(null);
    resetGame();
    focusGame();
  }, [focusGame, hasSelectedFile, playFromStart, resetGame]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    pausePlayback();
    const nextChart = createRecordedChart(recordingNotesRef.current);
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
        const lastSameLaneNote = [...recordingNotesRef.current]
          .reverse()
          .find((note) => note.lane === lane);

        if (
          lastSameLaneNote &&
          Math.abs(timeMs - lastSameLaneNote.timeMs) <= RECORDING_DEDUPE_MS
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

        recordingNotesRef.current = [...recordingNotesRef.current, note];
        setRecordingNotes(recordingNotesRef.current);
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
    ? `Recording mode - ${recordingNotes.length} taps`
    : activeChartMode === "recorded" && recordedChart
      ? `Recorded chart - ${recordedChart.notes.length} notes`
      : hasSelectedFile
        ? "Starter chart - local audio clock"
        : "Starter chart - silent static clock";

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
      className={`rhythm-lab ${isRecording ? "rhythm-lab-recording" : ""}`}
      tabIndex={0}
      aria-label="Rhythm Lab three lane timing prototype"
    >
      <header className="rhythm-lab-header">
        <div className="rhythm-lab-header-copy">
          <p className="rhythm-lab-eyebrow">Interaction Systems Experiment</p>
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
              <span className="rhythm-lab-audio-picker-button" aria-hidden="true">
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
                <small className="rhythm-lab-audio-error">{audioError}</small>
              )}
            </div>
            {isPausedAfterVisibilityChange && phase === "playing" && (
              <button
                className="rhythm-lab-audio-resume"
                type="button"
                onClick={resumeAudio}
              >
                Resume audio
              </button>
            )}
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
                {isRecording ? (
                  <button
                    className="rhythm-lab-record-button rhythm-lab-record-button-active"
                    type="button"
                    onClick={stopRecording}
                  >
                    Stop recording
                  </button>
                ) : (
                  <button
                    className="rhythm-lab-record-button"
                    type="button"
                    onClick={() => {
                      void startRecording();
                    }}
                  >
                    Record chart
                  </button>
                )}
                {recordedChart && !isRecording && (
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
                      className="rhythm-lab-note"
                      style={{
                        top: `${
                          Math.min(
                            note.progress,
                            NOTE_OVERSHOOT_MULTIPLIER
                          ) * RHYTHM_LINE_PERCENT
                        }%`,
                      }}
                    />
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
                <small>{recordingNotes.length} taps</small>
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

          {phase !== "playing" && !isRecording && (
            <div className="rhythm-lab-overlay">
              <div className="rhythm-lab-overlay-panel">
                <p>
                  {chart.title} - {chartModeLabel}
                </p>
                <h2>
                  {phase === "complete" ? "Run Complete" : "Ready Check"}
                </h2>
                <button
                  className="rhythm-lab-primary-action"
                  type="button"
                  onClick={() => {
                    void (phase === "complete" ? restartGame() : startGame());
                  }}
                >
                  {phase === "complete" ? "Restart" : "Start"}
                </button>
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
