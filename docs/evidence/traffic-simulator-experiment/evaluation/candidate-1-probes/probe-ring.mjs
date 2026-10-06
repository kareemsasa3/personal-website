import { DT } from "../src/components/TrafficSimulator/model/idm.ts";
import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { findScenario } from "../src/components/TrafficSimulator/model/scenarios.ts";
const run = (e, s) => { for (let i = 0, n = Math.round(s / DT); i < n; i++) e.step(); return e; };
const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
const b = findScenario("bottleneck");
const e2 = run(new TrafficEngine(b, { ...b.defaults, demand: 2000 }), 600);
console.log("bottleneck 2000 last-50 stopsPerTrip", e2.metrics().stopsPerTrip, "exits with stops (all buffered)", e2.exits.filter(x=>x.stops>0).map(x=>x.time.toFixed(0)));
const r = findScenario("ring");
for (const n of [34, 40, 60]) for (const seed of [77, 1, 2]) {
  const e = new TrafficEngine({ ...r, seed }, { ...r.defaults, vehicles: n });
  const out = [];
  for (const t of [300, 600, 1200, 1800, 3600]) { run(e, t - e.time); out.push(`${t}:${sd(e.vehicles.map(v=>v.v)).toFixed(2)}/${(Math.min(...e.vehicles.map(v=>v.v))*3.6).toFixed(0)}`); }
  console.log(`ring n${n} seed${seed} unperturbed sd/minkmh`, out.join(" "));
}
