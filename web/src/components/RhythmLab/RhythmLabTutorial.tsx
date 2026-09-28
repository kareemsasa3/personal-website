import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { LaneIndex, NoteJudgment } from "./types";
import RhythmHighway from "./RhythmHighway";
import { JUDGMENT_READOUT_MS, keyToLane, lanes } from "./helpers";
import {
  decideTutorialInput,
  evaluateTutorialStep,
  getFreezeAtMs,
  getTutorialHeadline,
  type TutorialHint,
  tutorialHintCopy,
  type TutorialStep,
  tutorialSteps,
} from "./rhythmTutorial";
import { useLaneFeedback } from "./useLaneFeedback";
import { useRhythmLab } from "./useRhythmLab";
import { useTutorialClock } from "./useTutorialClock";

const TUTORIAL_HINT_MS = 1400;

type TutorialProgress =
  | { kind: "step"; index: number; attempt: number }
  | { kind: "complete" };

interface TutorialStepRunnerProps {
  step: TutorialStep;
  stepNumber: number;
  stepCount: number;
  onPassed: () => void;
  onRetry: () => void;
}

// Mounted fresh for every step attempt, so mount is the step start.
const TutorialStepRunner = ({
  step,
  stepNumber,
  stepCount,
  onPassed,
  onRetry,
}: TutorialStepRunnerProps) => {
  const { getElapsedMs, start: startClock } = useTutorialClock(
    getFreezeAtMs(step)
  );
  const {
    phase,
    elapsedMs,
    judgments,
    lastJudgment,
    visibleNotes,
    startGame,
    hitLane,
  } = useRhythmLab(step.chart, { getElapsedMs });
  const {
    inputFeedbackExpiries,
    hitFeedbackExpiries,
    showInputFeedback,
    showHitFeedback,
  } = useLaneFeedback();
  const [hint, setHint] = useState<TutorialHint | null>(null);
  const [visibleJudgment, setVisibleJudgment] =
    useState<NoteJudgment | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  const outcome =
    phase === "complete" ? evaluateTutorialStep(step, judgments) : null;

  useEffect(() => {
    startClock();
    startGame();
  }, [startClock, startGame]);

  useEffect(() => {
    setVisibleJudgment(lastJudgment);
    if (!lastJudgment) return;

    const timeoutId = window.setTimeout(
      () => setVisibleJudgment(null),
      JUDGMENT_READOUT_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, [lastJudgment]);

  useEffect(
    () => () => {
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (outcome) actionRef.current?.focus();
  }, [outcome]);

  const showHint = useCallback((nextHint: TutorialHint) => {
    if (hintTimeoutRef.current !== null) {
      window.clearTimeout(hintTimeoutRef.current);
    }
    setHint(nextHint);
    hintTimeoutRef.current = window.setTimeout(() => {
      setHint(null);
      hintTimeoutRef.current = null;
    }, TUTORIAL_HINT_MS);
  }, []);

  const handleLaneInput = useCallback(
    (lane: LaneIndex) => {
      showInputFeedback(lane);

      const decision = decideTutorialInput(step, lane, getElapsedMs());
      if (decision !== "judge") {
        showHint(decision);
        return;
      }

      const judgment = hitLane(lane);
      if (judgment?.kind === "note-hit") {
        showHitFeedback(judgment.lane);
      }
    },
    [getElapsedMs, hitLane, showHint, showHitFeedback, showInputFeedback, step]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (phase !== "playing") return;

      const lane = keyToLane[event.key.toLowerCase()];
      if (lane === undefined) return;

      event.preventDefault();
      handleLaneInput(lane);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleLaneInput, phase]);

  const handleLanePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    lane: LaneIndex
  ) => {
    event.preventDefault();
    if (phase === "playing") handleLaneInput(lane);
  };

  const targetLane = lanes[step.targetLane];
  const detail = hint
    ? tutorialHintCopy[hint]
    : outcome === null && step.assisted
      ? `${targetLane.label} lane · ${targetLane.keys}`
      : null;

  return (
    <RhythmHighway
      visibleNotes={visibleNotes}
      inputFeedbackExpiries={inputFeedbackExpiries}
      hitFeedbackExpiries={hitFeedbackExpiries}
      visibleJudgment={visibleJudgment}
      phase={phase}
      isRecording={false}
      recordingCount={0}
      onLanePointerDown={handleLanePointerDown}
    >
      <div className="rhythm-lab-tutorial-prompt">
        <p className="rhythm-lab-tutorial-step">
          Tutorial {stepNumber} / {stepCount}
        </p>
        <div role="status" aria-live="polite">
          <p className="rhythm-lab-tutorial-headline">
            {getTutorialHeadline(step, { elapsedMs, outcome })}
          </p>
          {detail && <p className="rhythm-lab-tutorial-detail">{detail}</p>}
        </div>
        {outcome && (
          <button
            ref={actionRef}
            className="rhythm-lab-secondary-action rhythm-lab-tutorial-action"
            type="button"
            onClick={outcome === "passed" ? onPassed : onRetry}
          >
            {outcome === "passed" ? "Continue" : "Try again"}
          </button>
        )}
      </div>
    </RhythmHighway>
  );
};

interface RhythmLabTutorialProps {
  canPlayStarter: boolean;
  onComplete: () => void;
  onPlayStarter: () => void;
  onExit: () => void;
}

const RhythmLabTutorial = ({
  canPlayStarter,
  onComplete,
  onPlayStarter,
  onExit,
}: RhythmLabTutorialProps) => {
  const [progress, setProgress] = useState<TutorialProgress>({
    kind: "step",
    index: 0,
    attempt: 0,
  });
  const completeActionRef = useRef<HTMLButtonElement>(null);
  // Read through a ref so completion fires once per transition, even if the
  // parent passes a new callback on every render.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const advance = useCallback(() => {
    setProgress((current) => {
      if (current.kind !== "step") return current;

      const nextIndex = current.index + 1;
      return nextIndex < tutorialSteps.length
        ? { kind: "step", index: nextIndex, attempt: 0 }
        : { kind: "complete" };
    });
  }, []);

  const retry = useCallback(() => {
    setProgress((current) =>
      current.kind === "step"
        ? { ...current, attempt: current.attempt + 1 }
        : current
    );
  }, []);

  const replay = useCallback(() => {
    setProgress({ kind: "step", index: 0, attempt: 0 });
  }, []);

  useEffect(() => {
    if (progress.kind !== "complete") return;

    onCompleteRef.current();
    completeActionRef.current?.focus();
  }, [progress.kind]);

  if (progress.kind === "step") {
    const step = tutorialSteps[progress.index];

    return (
      <TutorialStepRunner
        key={`${step.id}-${progress.attempt}`}
        step={step}
        stepNumber={progress.index + 1}
        stepCount={tutorialSteps.length}
        onPassed={advance}
        onRetry={retry}
      />
    );
  }

  return (
    <RhythmHighway
      visibleNotes={[]}
      inputFeedbackExpiries={{}}
      hitFeedbackExpiries={{}}
      visibleJudgment={null}
      phase="complete"
      isRecording={false}
      recordingCount={0}
      onLanePointerDown={(event) => event.preventDefault()}
    >
      <div className="rhythm-lab-overlay">
        <div className="rhythm-lab-overlay-panel">
          <p>Tutorial complete</p>
          <h2>You&rsquo;re ready.</h2>
          <div className="rhythm-lab-summary-actions">
            {canPlayStarter && (
              <button
                ref={completeActionRef}
                className="rhythm-lab-primary-action"
                type="button"
                onClick={onPlayStarter}
              >
                Play Practice Chart
              </button>
            )}
            <button
              ref={canPlayStarter ? undefined : completeActionRef}
              className="rhythm-lab-secondary-action"
              type="button"
              onClick={replay}
            >
              Replay tutorial
            </button>
            <button
              className="rhythm-lab-secondary-action"
              type="button"
              onClick={onExit}
            >
              Back to Rhythm Lab
            </button>
          </div>
          <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
        </div>
      </div>
    </RhythmHighway>
  );
};

export default RhythmLabTutorial;
