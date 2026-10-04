import { DT, type Axis } from "./network.ts";

export type Light = "green" | "yellow" | "red";
export type Stage = "green" | "yellow" | "allRed";
export type ControlMode = "fixed" | "actuated";
export interface SignalPlan {
  mode: ControlMode;
  /** Fixed-time cycle length, s. */
  cycle: number;
  /** East–west share of the cycle's green time. */
  split: number;
  /** Delay of each signal's cycle relative to its western neighbour, s. */
  offset: number;
}
/** `axis` holds (or last held) right of way; the other axis is always red. */
export interface SignalState {
  axis: Axis;
  stage: Stage;
  elapsed: number;
}

export const YELLOW = 3;
export const ALL_RED = 2;
export const MIN_GREEN = 5;
export const MAX_GREEN = 40; // actuated only
const INTERGREEN = YELLOW + ALL_RED;
const EPSILON = 1e-6;
export const PLAN_LIMITS = {
  cycle: [40, 120],
  split: [0.2, 0.8],
  offset: [0, 120],
} as const;

export function validatePlan(plan: SignalPlan) {
  if (plan.mode !== "fixed" && plan.mode !== "actuated")
    throw new Error("Signal mode must be fixed or actuated.");
  for (const key of ["cycle", "split", "offset"] as const) {
    const [min, max] = PLAN_LIMITS[key];
    if (!Number.isFinite(plan[key]) || plan[key] < min || plan[key] > max)
      throw new Error(`Signal ${key} must be between ${min} and ${max}.`);
  }
}

export const other = (axis: Axis): Axis => (axis === "EW" ? "NS" : "EW");

export function greenTimes(plan: SignalPlan): Record<Axis, number> {
  const effective = plan.cycle - 2 * INTERGREEN;
  return { EW: effective * plan.split, NS: effective * (1 - plan.split) };
}

/** Position within this signal's fixed-time cycle at `time`. */
function cyclePosition(plan: SignalPlan, time: number, index: number) {
  const t = time - index * plan.offset + EPSILON;
  return ((t % plan.cycle) + plan.cycle) % plan.cycle;
}

/** The state a fixed-time controller holds at `time` when perfectly on schedule. */
export function scheduledState(
  plan: SignalPlan,
  time: number,
  index: number,
): SignalState {
  const green = greenTimes(plan);
  let tau = cyclePosition(plan, time, index);
  for (const axis of ["EW", "NS"] as const) {
    if (tau < green[axis]) return { axis, stage: "green", elapsed: tau };
    tau -= green[axis];
    if (tau < YELLOW) return { axis, stage: "yellow", elapsed: tau };
    tau -= YELLOW;
    if (tau < ALL_RED) return { axis, stage: "allRed", elapsed: tau };
    tau -= ALL_RED;
  }
  return { axis: "EW", stage: "green", elapsed: 0 };
}

export const lightFor = (state: SignalState, axis: Axis): Light =>
  state.axis !== axis || state.stage === "allRed"
    ? "red"
    : state.stage === "green"
      ? "green"
      : "yellow";

/**
 * Advances one controller by DT. Every change of right of way passes through
 * yellow and all-red, and every green lasts at least MIN_GREEN, whatever the
 * plan says or however it is edited mid-cycle.
 *
 * Fixed-time ends a green when the schedule hands the other axis right of
 * way. Actuated ends it when the other axis is waiting and this axis has no
 * vehicle on its detectors (gap-out) or the green reaches MAX_GREEN (max-out);
 * with no competing demand it rests in green.
 */
export function advanceSignal(
  state: SignalState,
  context: {
    plan: SignalPlan;
    time: number;
    index: number;
    demand: Record<Axis, boolean>;
  },
): SignalState {
  const elapsed = state.elapsed + DT;
  const reached = (duration: number) => elapsed + EPSILON >= duration;
  if (state.stage === "yellow")
    return reached(YELLOW)
      ? { axis: state.axis, stage: "allRed", elapsed: 0 }
      : { ...state, elapsed };
  if (state.stage === "allRed")
    return reached(ALL_RED)
      ? { axis: other(state.axis), stage: "green", elapsed: 0 }
      : { ...state, elapsed };
  if (!reached(MIN_GREEN)) return { ...state, elapsed };
  const { plan, time, index, demand } = context;
  const end =
    plan.mode === "fixed"
      ? scheduledAxis(plan, time, index) !== state.axis
      : demand[other(state.axis)] &&
        (!demand[state.axis] || reached(MAX_GREEN));
  return end
    ? { axis: state.axis, stage: "yellow", elapsed: 0 }
    : { ...state, elapsed };
}

/** Axis the fixed-time schedule gives right of way (including its clearance). */
function scheduledAxis(plan: SignalPlan, time: number, index: number): Axis {
  const { axis, stage } = scheduledState(plan, time, index);
  return stage === "green" ? axis : other(axis);
}
