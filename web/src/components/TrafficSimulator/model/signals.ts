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

/** The state a signal is actually showing, and since when. */
export interface SignalLight {
  state: SignalState;
  since: number;
}

/** A light showing its schedule at `time`, with a yellow dated from when the schedule began it. */
export function scheduledLight(time: number, offset: number, timing: SignalTiming): SignalLight {
  const { state, remaining } = signalPhase(time, offset, timing);
  return { state, since: state === "yellow" ? time - (YELLOW - remaining) : time };
}

/**
 * Advances a shown light toward the schedule without ever skipping yellow or
 * cutting it short. Under a fixed plan this is exactly the schedule; it only
 * departs from it after a timing edit jumps the schedule mid-cycle.
 */
export function nextLight(light: SignalLight, scheduled: SignalState, time: number): SignalLight {
  if (light.state === "green")
    return scheduled === "green" ? light : { state: "yellow", since: time };
  if (light.state === "yellow")
    return time - light.since < YELLOW - 1e-6 ? light : { state: "red", since: time };
  return scheduled === "green" ? { state: "green", since: time } : light;
}

/** Seconds until the shown light is due to change. */
export function lightRemaining(light: SignalLight, time: number, offset: number, timing: SignalTiming) {
  if (light.state === "yellow") return Math.max(0, light.since + YELLOW - time);
  const scheduled = signalPhase(time, offset, timing);
  if (light.state === "green") return scheduled.remaining;
  // Red holds until the schedule's next green.
  return scheduled.state === "green" ? 0 : mod(offset - time, timing.cycle);
}
