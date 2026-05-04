import { type CSSProperties, type PointerEvent } from "react";
import type { GamePhase, LaneIndex, NoteJudgment, VisibleNote } from "./types";
import {
  lanes,
  type LaneFeedbackExpiries,
  NOTE_OVERSHOOT_MULTIPLIER,
  RHYTHM_LINE_PERCENT,
} from "./helpers";

interface RhythmHighwayProps {
  visibleNotes: VisibleNote[];
  inputFeedbackExpiries: LaneFeedbackExpiries;
  hitFeedbackExpiries: LaneFeedbackExpiries;
  visibleJudgment: NoteJudgment | null;
  phase: GamePhase;
  isRecording: boolean;
  recordingCount: number;
  onLanePointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    lane: LaneIndex
  ) => void;
  children?: React.ReactNode;
}

const rhythmLineStyle = {
  "--rhythm-line-y": `${RHYTHM_LINE_PERCENT}%`,
} as CSSProperties;

const RhythmHighway = ({
  visibleNotes,
  inputFeedbackExpiries,
  hitFeedbackExpiries,
  visibleJudgment,
  phase,
  isRecording,
  recordingCount,
  onLanePointerDown,
  children,
}: RhythmHighwayProps) => {
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

  return (
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
                  style={
                    {
                      "--rhythm-note-y": `${
                        Math.min(note.progress, NOTE_OVERSHOOT_MULTIPLIER) *
                        RHYTHM_LINE_PERCENT
                      }%`,
                    } as CSSProperties
                  }
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

      {children}

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
            onPointerDown={(event) => onLanePointerDown(event, lane.index)}
            aria-label={`${lane.label} lane`}
          >
            <span>{lane.keys}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default RhythmHighway;
