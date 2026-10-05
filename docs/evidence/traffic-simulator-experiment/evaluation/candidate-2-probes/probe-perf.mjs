import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { presets } from "../src/components/TrafficSimulator/model/presets.ts";
const heavy = { eastbound: 2400, westbound: 2400, cross: 1000 };
for (const p of presets) for (const [label, demand] of [["default", p.demand], ["max demand", heavy]]) {
  const e = new TrafficEngine({ demand, plan: p.plan, seed: p.seed });
  e.run(600); // warm into steady state
  const t0 = performance.now(); e.run(600); const ms = performance.now() - t0;
  const t1 = performance.now(); for (let i = 0; i < 2400; i++) e.stats(); const st = (performance.now() - t1) / 2400;
  console.log(`${p.id.padEnd(15)} ${label.padEnd(11)} vehicles ${e.vehicleCount()} step ${(ms / 600).toFixed(3)} ms/sim-s (${(ms/6000*1000).toFixed(1)} us/step); stats() ${(st*1000).toFixed(1)} us`);
}
