import type { KeyboardEvent } from "react";

// WAI-ARIA Authoring Practices slider pattern: Page Up and Page Down move by a larger step (here ten steps), clamped at the
// limits; arrows, Home and End are the input's own. Returns the next value for a Page key, or null for any other key.
export const pageStepValue = (key: string, value: number, min: number, max: number, step: number): number | null => {
  if (key !== "PageUp" && key !== "PageDown") return null;
  const steps = Math.round((value - min) / step) + (key === "PageUp" ? 10 : -10);
  const next = Math.min(max, Math.max(min, min + steps * step));
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number(next.toFixed(decimals));
};

// A range input's keydown handler: a Page key is taken from the browser and its value passed on (unless disabled).
export const pageStepHandler =
  (value: number, min: number, max: number, step: number, onChange: (next: number) => void, disabled = false) =>
  (event: KeyboardEvent<HTMLInputElement>) => {
    const next = pageStepValue(event.key, value, min, max, step);
    if (next === null) return;
    event.preventDefault();
    if (!disabled) onChange(next);
  };
