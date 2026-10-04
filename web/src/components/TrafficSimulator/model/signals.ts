export type SignalState = "green" | "yellow" | "red";
export type Coordination = "green-wave" | "simultaneous" | "reverse";
/** Fixed yellow interval (s); red is whatever remains of the cycle. */
export const YELLOW = 3;
export interface SignalTiming {
  cycle: number;
  green: number;
  offsets: number[];
}
const mod = (value: number, base: number) => ((value % base) + base) % base;
/**
 * Start of green at each stop line, relative to t = 0.
 * A green wave delays each downstream signal by the free travel time from the
 * first one, so a platoon released at the first line meets green at the rest.
 */
export function signalTiming(
  positions: readonly number[],
  coordination: Coordination,
  progressionSpeed: number,
  cycle: number,
  greenShare: number,
): SignalTiming {
  const origin = positions[0] ?? 0;
  const direction =
    coordination === "green-wave" ? 1 : coordination === "reverse" ? -1 : 0;
  return {
    cycle,
    green: Math.round(cycle * greenShare),
    offsets: positions.map((x) =>
      mod((direction * (x - origin)) / progressionSpeed, cycle),
    ),
  };
}
/** Signal state at `time` and seconds remaining in that state. */
export function signalPhase(time: number, offset: number, timing: SignalTiming) {
  const t = mod(time - offset, timing.cycle);
  if (t < timing.green)
    return { state: "green" as SignalState, remaining: timing.green - t };
  if (t < timing.green + YELLOW)
    return { state: "yellow" as SignalState, remaining: timing.green + YELLOW - t };
  return { state: "red" as SignalState, remaining: timing.cycle - t };
}
