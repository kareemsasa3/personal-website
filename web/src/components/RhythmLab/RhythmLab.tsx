import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { starterChart } from "./rhythmCharts";
import { LaneIndex } from "./types";
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

const RhythmLab = () => {
  const game = useRhythmLab(starterChart);
  const {
    phase,
    score,
    combo,
    maxCombo,
    lastJudgment,
    chart,
    visibleNotes,
    startGame: beginGame,
    restartGame: beginRestart,
    hitLane,
  } = game;
  const gameRef = useRef<HTMLDivElement>(null);

  const focusGame = useCallback(() => {
    requestAnimationFrame(() => gameRef.current?.focus());
  }, []);

  const startGame = useCallback(() => {
    beginGame();
    focusGame();
  }, [beginGame, focusGame]);

  const restartGame = useCallback(() => {
    beginRestart();
    focusGame();
  }, [beginRestart, focusGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const lane = keyToLane[event.key.toLowerCase()];

      if (lane !== undefined) {
        if (phase === "playing") {
          event.preventDefault();
          hitLane(lane);
        }
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        phase !== "playing"
      ) {
        event.preventDefault();
        restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hitLane, phase, restartGame]);

  const handleLanePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    lane: LaneIndex
  ) => {
    if (phase === "playing") {
      event.preventDefault();
      hitLane(lane);
    }
  };

  const lastJudgmentClass = lastJudgment
    ? `rhythm-lab-judgment-${lastJudgment.rating.toLowerCase()}`
    : "";

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
          <h1>Rhythm Lab</h1>
        </div>
        <div className="rhythm-lab-hud" aria-live="polite">
          <span>Score {score}</span>
          <span>Combo {combo}</span>
          <span>Best {maxCombo}</span>
        </div>
      </header>

      <main className="rhythm-lab-stage">
        <section className="rhythm-lab-highway" aria-label="Three lane note highway">
          <div className="rhythm-lab-track">
            {lanes.map((lane) => (
              <div
                key={lane.index}
                className={`rhythm-lab-lane rhythm-lab-lane-${lane.index}`}
              >
                <span className="rhythm-lab-lane-label">{lane.label}</span>
                {visibleNotes
                  .filter((note) => note.lane === lane.index)
                  .map((note) => (
                    <span
                      key={note.id}
                      className="rhythm-lab-note"
                      style={{
                        top: `${Math.min(note.progress, 1.09) * 78}%`,
                      }}
                    />
                  ))}
              </div>
            ))}
          </div>

          <div className="rhythm-lab-judgment-line" aria-hidden="true">
            {lanes.map((lane) => (
              <span key={lane.index} />
            ))}
          </div>

          <div className="rhythm-lab-status">
            <span className={lastJudgmentClass}>
              {lastJudgment
                ? lastJudgment.rating
                : "Ready"}
            </span>
            {lastJudgment?.deltaMs !== null &&
              lastJudgment?.deltaMs !== undefined && (
                <small>
                  {lastJudgment.deltaMs > 0 ? "+" : ""}
                  {lastJudgment.deltaMs}ms
                </small>
              )}
          </div>

          {phase !== "playing" && (
            <div className="rhythm-lab-overlay">
              <div className="rhythm-lab-overlay-panel">
                <p>{chart.title} - Silent static chart</p>
                <h2>
                  {phase === "complete" ? "Run Complete" : "Ready Check"}
                </h2>
                <button
                  className="rhythm-lab-primary-action"
                  type="button"
                  onClick={phase === "complete" ? restartGame : startGame}
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
                className="rhythm-lab-hit-zone"
                type="button"
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
