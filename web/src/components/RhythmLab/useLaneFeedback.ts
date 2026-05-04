import { useCallback, useEffect, useRef, useState } from "react";
import type { LaneIndex } from "./types";
import {
  createLaneFeedbackTimers,
  HIT_FEEDBACK_MS,
  INPUT_FEEDBACK_MS,
  laneIndexes,
  type LaneFeedbackExpiries,
  type LaneFeedbackTimers,
} from "./helpers";

export const useLaneFeedback = () => {
  const [inputFeedbackExpiries, setInputFeedbackExpiries] =
    useState<LaneFeedbackExpiries>({});
  const [hitFeedbackExpiries, setHitFeedbackExpiries] =
    useState<LaneFeedbackExpiries>({});
  const inputFeedbackTimeoutRefs = useRef<LaneFeedbackTimers>(
    createLaneFeedbackTimers()
  );
  const hitFeedbackTimeoutRefs = useRef<LaneFeedbackTimers>(
    createLaneFeedbackTimers()
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
    },
    []
  );

  return {
    inputFeedbackExpiries,
    hitFeedbackExpiries,
    showInputFeedback,
    showHitFeedback,
  };
};
