// Darkfield motion tokens for Framer Motion, which cannot read CSS custom properties (§17).
// Values come only from tokens.css; this module parses them and defines none.
export type Easing = [number, number, number, number] | "linear" | ((t: number) => number);

export const parseDuration = (value: string): number => {
  const v = value.trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) throw new Error(`not a duration: ${v}`);
  return v.endsWith("ms") ? n / 1000 : n;
};

export const parseEase = (value: string): Easing => {
  const v = value.trim();
  if (v === "linear") return "linear";
  const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(v);
  if (bezier) {
    const p = bezier[1].split(",").map(Number);
    if (p.length === 4 && p.every(Number.isFinite)) return p as [number, number, number, number];
  }
  const steps = /^steps\((\d+)\s*(?:,\s*(?:end|jump-end))?\)$/.exec(v);
  if (steps) {
    const n = Number(steps[1]);
    return (t: number) => (t >= 1 ? 1 : Math.floor(t * n) / n);
  }
  throw new Error(`not an easing: ${v}`);
};

/** Reduced motion (§12 Reduced motion, by class): the new state appears at once. */
export const INSTANT = { duration: 0 } as const;

const read = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** A tween timed by a duration token and an easing token. Call during render, not at module load. */
export const motionToken = (duration: `--dur-${string}`, ease: `--ease-${string}`) => {
  try {
    const d = read(duration);
    const e = read(ease);
    if (!d || !e) return INSTANT; // tokens.css not applied: show the end state rather than throw in render
    return { type: "tween" as const, duration: parseDuration(d), ease: parseEase(e) };
  } catch {
    return INSTANT; // a malformed token value degrades to no animation instead of throwing in render
  }
};
