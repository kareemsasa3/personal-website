import type { Demand } from "./engine.ts";
import type { SignalPlan } from "./signals.ts";

export interface TrafficPreset {
  id: string;
  name: string;
  description: string;
  experiment: string;
  demand: Demand;
  plan: SignalPlan;
  seed: number;
}

export const presets: TrafficPreset[] = [
  {
    id: "balanced",
    name: "Steady corridor",
    description:
      "Moderate traffic in every direction. Queues form on each red and clear on the following green.",
    experiment:
      "Raise eastbound demand step by step. Around 1,500 vehicles/hour the queues stop clearing each cycle: watch the eastbound delay and the waiting-to-enter count.",
    demand: { eastbound: 800, westbound: 800, cross: 250 },
    plan: { mode: "fixed", cycle: 60, split: 0.6, offset: 0 },
    seed: 1,
  },
  {
    id: "green-wave",
    name: "Green wave",
    description:
      "Each signal turns green 15 seconds after its western neighbour, about the time a car takes to cover one 200 m block.",
    experiment:
      "Compare eastbound stops per trip at an offset of 15 s, 0 s, and 45 s. The offset that suits one direction rarely suits the other.",
    demand: { eastbound: 1000, westbound: 400, cross: 200 },
    plan: { mode: "fixed", cycle: 60, split: 0.6, offset: 15 },
    seed: 2,
  },
  {
    id: "rush-hour",
    name: "Rush hour",
    description:
      "Eastbound demand exceeds what each green can serve. The first signal's queue never clears, and arriving cars back up off the map.",
    experiment:
      "Shift green toward the arterial with the east–west split, or lengthen the cycle. See whether the queues recover, and what the side streets pay.",
    demand: { eastbound: 2000, westbound: 1200, cross: 400 },
    plan: { mode: "fixed", cycle: 60, split: 0.6, offset: 0 },
    seed: 3,
  },
  {
    id: "night-actuated",
    name: "Quiet night, actuated",
    description:
      "Light, uneven traffic under detector-actuated signals. A green holds while cars keep arriving and switches once the other street is waiting.",
    experiment:
      "Switch the control mode to fixed time and compare average delay. Fixed timing keeps serving empty approaches.",
    demand: { eastbound: 300, westbound: 300, cross: 100 },
    plan: { mode: "actuated", cycle: 60, split: 0.6, offset: 0 },
    seed: 4,
  },
];
