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
import { type LaneIndex, type NoteJudgment } from "./types";
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

const createLaneFeedbackTimers = (): LaneFeedbackTimers => ({
  0: null,
  1: null,
  2: null,
});

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
  const game = useRhythmLab(starterChart, rhythmClock);
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

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      resetGame();
      handleFileChange(event);
      focusGame();
    },
    [focusGame, handleFileChange, resetGame]
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
      const judgment: NoteJudgment | null = hitLane(lane);

      if (judgment?.kind === "note-hit") {
        showHitFeedback(judgment.lane);
      }
    },
    [hitLane, showHitFeedback, showInputFeedback]
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
        if (phase === "playing") {
          event.preventDefault();
          handleLaneInput(lane);
        }
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && phase !== "playing") {
        event.preventDefault();
        void restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleLaneInput, phase, restartGame]);

  const handleLanePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    lane: LaneIndex
  ) => {
    event.preventDefault();
    focusGame();

    if (phase === "playing") {
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
  const chartModeLabel = hasSelectedFile
    ? "Local audio chart clock"
    : "Silent static chart";

  useEffect(() => {
    if (phase === "complete") {
      pausePlayback();
    }
  }, [pausePlayback, phase]);

  return (
    <div
      ref={gameRef}
      className="rhythm-lab"
      tabIndex={0}
      aria-label="Rhythm Lab three lane timing prototype"
    >
      <header className="rhythm-lab-header">
        <div>
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
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
              />
            </label>
            <div className="rhythm-lab-audio-details" aria-live="polite">
              <span>{fileName ? fileName : "No audio selected"}</span>
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

          {phase !== "playing" && (
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
