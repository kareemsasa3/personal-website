import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
for (const [split, cycle] of [[0.4,60],[0.6,60],[0.8,60],[0.6,120],[0.6,40]]) {
  const out = [];
  for (const seed of [1,2,3]) {
    const e = new TrafficEngine({ demand: { eastbound: 2400, westbound: 800, cross: 250 }, plan: { mode: "fixed", cycle, split, offset: 0 }, seed });
    e.run(600); const c0 = e.totals.groups.EB.completed; e.run(1800); out.push((e.totals.groups.EB.completed - c0) * 2);
  }
  const g = (cycle - 10) * split;
  console.log(`split ${split} cycle ${cycle}: EW green ${g}s, EB sat throughput/h ${out.join(" ")}; per lane per (green+yellow) s/veh ${((g+3)/(out[0]/2*cycle/3600)).toFixed(2)}`);
}
// stops metric: entry-admission stops share
const e = new TrafficEngine({ demand: { eastbound: 2000, westbound: 1200, cross: 400 }, plan: { mode: "fixed", cycle: 60, split: 0.6, offset: 0 }, seed: 3 });
let entryStops = 0, allStops = 0; const prev = new Map();
for (let i = 0; i < 9000; i++) { e.step(); for (const l of e.lanes) for (const v of l.vehicles) { const p = prev.get(v.id) ?? 0; if (v.stops > p) { allStops++; if (v.position < 5) entryStops++; } prev.set(v.id, v.stops); } }
console.log(`rush-hour: stop events ${allStops}, of which at entry (<5 m) ${entryStops}`);
