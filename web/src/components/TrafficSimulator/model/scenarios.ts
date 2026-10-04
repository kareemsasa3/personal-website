import type { Coordination } from "./signals.ts";

export interface TrafficParams {
  demand: number; // vehicles per hour arriving at the entrance (open roads)
  cycle: number; // signal cycle length, s
  greenShare: number; // fraction of the cycle shown green
  coordination: Coordination;
  politeness: number; // MOBIL politeness factor, 0–1
  vehicles: number; // vehicles on the ring
  acceleration: number; // car maximum acceleration, m/s²
}

export type NumericParam = Exclude<keyof TrafficParams, "coordination">;

export interface ControlSpec {
  key: NumericParam;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Changing this value rebuilds the scenario instead of editing it live. */
  resets?: boolean;
}

export interface VehicleClass {
  length: number; // m
  speedFactor: number; // desired speed as a share of the speed limit
  speedSpread: number; // ± uniform spread on that share
  T: number;
  accelerationScale: number; // multiple of the acceleration control
  b: number;
  s0: number;
}

export interface Scenario {
  id: "corridor" | "bottleneck" | "ring";
  name: string;
  description: string;
  experiment: string;
  topology: "open" | "ring";
  length: number; // m
  lanes: number;
  /** The highest-numbered lane ends at `x`. */
  laneDrop?: { lane: number; x: number };
  signals: number[]; // stop-line positions, m, ascending
  speedLimit: number; // m/s
  truckShare: number;
  car: VehicleClass;
  truck: VehicleClass;
  seed: number;
  /** Simulated seconds run before the first frame so the road starts populated. */
  warmup: number;
  hasCoordination: boolean;
  controls: ControlSpec[];
  defaults: TrafficParams;
}

const base: TrafficParams = {
  demand: 1200,
  cycle: 60,
  greenShare: 0.5,
  coordination: "green-wave",
  politeness: 0.3,
  vehicles: 34,
  acceleration: 1,
};

const kmh = (value: number) => value / 3.6;

export const scenarios: Scenario[] = [
  {
    id: "corridor",
    name: "Signal corridor",
    description:
      "A two-lane arterial with three signals 300 m apart. Every signal shares the same cycle; only the offset between them changes.",
    experiment:
      "Switch coordination from Green wave to Reverse wave, reset, and compare stops per trip and trip time with the same arriving traffic. Then raise demand past what the green time can discharge and watch queues spill back to the entrance.",
    topology: "open",
    length: 1100,
    lanes: 2,
    signals: [250, 550, 850],
    speedLimit: kmh(50),
    truckShare: 0.08,
    car: { length: 4.5, speedFactor: 1, speedSpread: 0.06, T: 1.2, accelerationScale: 1, b: 2, s0: 2 },
    truck: { length: 10, speedFactor: 0.9, speedSpread: 0.03, T: 1.6, accelerationScale: 0.6, b: 2, s0: 2 },
    seed: 1879,
    warmup: 120,
    hasCoordination: true,
    controls: [
      { key: "demand", label: "Arrival demand", min: 300, max: 3000, step: 100, unit: "veh/h" },
      { key: "cycle", label: "Cycle length", min: 40, max: 120, step: 5, unit: "s" },
      { key: "greenShare", label: "Green share", min: 0.3, max: 0.7, step: 0.05, unit: "%" },
      { key: "acceleration", label: "Driver acceleration", min: 0.6, max: 2, step: 0.1, unit: "m/s²" },
    ],
    defaults: { ...base, demand: 1000, acceleration: 1.2 },
  },
  {
    id: "bottleneck",
    name: "Lane drop",
    description:
      "A three-lane highway where the right lane ends at 900 m. Drivers merge only into gaps they judge safe, weighing their gain against the braking they impose on others.",
    experiment:
      "Raise demand until the merge saturates: a queue forms at the lane drop and grows upstream even though two lanes remain open. Then vary politeness and compare discharge flow.",
    topology: "open",
    length: 1600,
    lanes: 3,
    laneDrop: { lane: 2, x: 900 },
    signals: [],
    speedLimit: kmh(100),
    truckShare: 0.1,
    car: { length: 4.5, speedFactor: 1, speedSpread: 0.1, T: 1.4, accelerationScale: 1, b: 2, s0: 2 },
    truck: { length: 12, speedFactor: 0.8, speedSpread: 0.03, T: 1.8, accelerationScale: 0.5, b: 2, s0: 2 },
    seed: 4211,
    warmup: 90,
    hasCoordination: false,
    controls: [
      { key: "demand", label: "Arrival demand", min: 600, max: 5400, step: 100, unit: "veh/h" },
      { key: "politeness", label: "Politeness", min: 0, max: 1, step: 0.1, unit: "" },
      { key: "acceleration", label: "Driver acceleration", min: 0.6, max: 2, step: 0.1, unit: "m/s²" },
    ],
    defaults: { ...base, demand: 3600 },
  },
  {
    id: "ring",
    name: "Ring road",
    description:
      "One lane, no signals, no merges: identical drivers on a 600 m loop, started evenly spaced at the speed that spacing allows.",
    experiment:
      "Press Brake one car. At high density the disturbance grows into a stop-and-go wave that travels backward while cars move forward. Reduce the number of vehicles or raise driver acceleration and the same tap fades out.",
    topology: "ring",
    length: 600,
    lanes: 1,
    signals: [],
    speedLimit: kmh(54),
    truckShare: 0,
    car: { length: 4.5, speedFactor: 1, speedSpread: 0, T: 1.2, accelerationScale: 1, b: 1.5, s0: 2 },
    truck: { length: 4.5, speedFactor: 1, speedSpread: 0, T: 1.2, accelerationScale: 1, b: 1.5, s0: 2 },
    seed: 77,
    warmup: 0,
    hasCoordination: false,
    controls: [
      { key: "vehicles", label: "Vehicles on ring", min: 10, max: 60, step: 1, unit: "", resets: true },
      { key: "acceleration", label: "Driver acceleration", min: 0.3, max: 2, step: 0.1, unit: "m/s²" },
    ],
    defaults: { ...base, acceleration: 0.6 },
  },
];

export const findScenario = (id: string) =>
  scenarios.find((s) => s.id === id) ?? scenarios[0];
