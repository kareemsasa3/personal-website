import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { lightFor, other } from "../src/components/TrafficSimulator/model/signals.ts";
import { createRandom } from "../src/components/TrafficSimulator/model/random.ts";
const orig = TrafficEngine.prototype.mustStop;
const c = { occ: 0, storage: 0 }; let hits = [];
let cur;
TrafficEngine.prototype.mustStop = function (vehicles, n, stop, axis) {
  const res = orig.call(this, vehicles, n, stop, axis);
  if (res && lightFor(this.signals[stop.intersection], axis) === "green") { if (this.occupied[stop.intersection][other(axis)]) c.occ++; else c.storage++; hits.push(cur); }
  return res;
};
const r = createRandom(42);
const pick = (a, b, step) => a + Math.round((r() * (b - a)) / step) * step;
let maxQ = 0;
for (let k = 0; k < 150; k++) {
  const demand = { eastbound: pick(0, 2400, 100), westbound: pick(0, 2400, 100), cross: pick(0, 1000, 50) };
  const plan = { mode: r() < 0.3 ? "actuated" : "fixed", cycle: pick(40, 120, 5), split: pick(0.2, 0.8, 0.05), offset: pick(0, 120, 1) };
  cur = JSON.stringify({ demand, plan });
  const e = new TrafficEngine({ demand, plan, seed: k + 1 });
  // mid-run plan edits to stress
  e.run(600);
  e.setPlan({ ...plan, offset: pick(0, 120, 1), split: pick(0.2, 0.8, 0.05) });
  e.run(600);
}
console.log(JSON.stringify(c), [...new Set(hits)].slice(0, 5));
