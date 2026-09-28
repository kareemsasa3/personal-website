import { useCallback, useEffect, useRef } from "react";
import { clampTutorialElapsedMs } from "./rhythmTutorial";

// Wall-clock source for tutorial steps. Time stops while the tab is hidden and
// never advances past freezeAtMs, so a frozen note stays on the hit line.
export const useTutorialClock = (freezeAtMs: number | null) => {
  const startedAtRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);

  const start = useCallback(() => {
    const now = performance.now();
    startedAtRef.current = now;
    hiddenAtRef.current = document.hidden ? now : null;
  }, []);

  const getElapsedMs = useCallback(() => {
    if (startedAtRef.current === null) return 0;

    const now = hiddenAtRef.current ?? performance.now();
    return clampTutorialElapsedMs(now - startedAtRef.current, freezeAtMs);
  }, [freezeAtMs]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = performance.now();

      if (document.hidden) {
        if (hiddenAtRef.current === null) hiddenAtRef.current = now;
        return;
      }

      if (hiddenAtRef.current !== null && startedAtRef.current !== null) {
        startedAtRef.current += now - hiddenAtRef.current;
      }
      hiddenAtRef.current = null;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return { getElapsedMs, start };
};
