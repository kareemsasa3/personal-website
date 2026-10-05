import { DT } from "../src/components/TrafficSimulator/model/idm.ts";
import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { findScenario } from "../src/components/TrafficSimulator/model/scenarios.ts";
const cases = [
  ["corridor default", "corridor", {}],
  ["corridor d3000 a0.6 g0.3", "corridor", { demand: 3000, acceleration: 0.6, greenShare: 0.3 }],
  ["bottleneck default", "bottleneck", {}],
  ["bottleneck d5400 p0 a0.6", "bottleneck", { demand: 5400, politeness: 0, acceleration: 0.6 }],
  ["ring 60 a0.3", "ring", { vehicles: 60, acceleration: 0.3 }],
];
for (const [label, id, p] of cases) {
  const sc = findScenario(id);
  let t = performance.now();
  const e = new TrafficEngine(sc, { ...sc.defaults, ...p });
  const ctor = performance.now() - t;
  for (let i = 0; i < 6000; i++) e.step();
  t = performance.now();
  const N = 3000; for (let i = 0; i < N; i++) e.step();
  const per = (performance.now() - t) / (N * DT);
  t = performance.now(); for (let i = 0; i < 100; i++) e.metrics(); const met = (performance.now() - t) / 100;
  console.log(label.padEnd(28), `ctor+warmup ${ctor.toFixed(0)} ms | ${per.toFixed(2)} ms per sim-second (${(per/10).toFixed(3)} ms/step) | onRoad ${e.vehicles.length} waiting ${e.waiting.length} | at 16x: ${(per*16).toFixed(1)} ms per wall-second | metrics() ${met.toFixed(3)} ms`);
}
