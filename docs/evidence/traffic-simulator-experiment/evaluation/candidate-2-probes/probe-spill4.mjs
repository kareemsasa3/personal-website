import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { lightFor, other } from "../src/components/TrafficSimulator/model/signals.ts";
import { createRandom } from "../src/components/TrafficSimulator/model/random.ts";
const orig = TrafficEngine.prototype.mustStop;
let near = 0;
TrafficEngine.prototype.mustStop = function (vehicles, n, stop, axis) {
  const res = orig.call(this, vehicles, n, stop, axis);
  if (res && lightFor(this.signals[stop.intersection], axis) === "green" && !this.occupied[stop.intersection][other(axis)] && stop.position - vehicles[n].position < 10 && (n === 0 || vehicles[n-1].position > stop.position)) near++;
  return res;
};
const r = createRandom(42);
const pick = (a, b, step) => a + Math.round((r() * (b - a)) / step) * step;
let fired = { fixed: [0, 0], actuated: [0, 0] }; const ex = [];
for (let k = 0; k < 150; k++) {
  const demand = { eastbound: pick(0, 2400, 100), westbound: pick(0, 2400, 100), cross: pick(0, 1000, 50) };
  const plan = { mode: r() < 0.3 ? "actuated" : "fixed", cycle: pick(40, 120, 5), split: pick(0.2, 0.8, 0.05), offset: pick(0, 120, 1) };
  const e = new TrafficEngine({ demand, plan, seed: k + 1 });
  near = 0; e.run(600); const p2 = { ...plan, offset: pick(0, 120, 1), split: pick(0.2, 0.8, 0.05) }; e.setPlan(p2); e.run(600);
  fired[plan.mode][1]++; if (near > 0) { fired[plan.mode][0]++; if (ex.length < 6) ex.push(`${near} ${JSON.stringify(demand)} ${JSON.stringify(plan)} -> ${JSON.stringify(p2)}`); }
}
console.log(JSON.stringify(fired)); console.log(ex.join("\n"));
// Fixed, no mid-run edit:
let fixedOnly = 0, tot = 0;
const r2 = createRandom(7);
const pk = (a, b, s) => a + Math.round((r2() * (b - a)) / s) * s;
for (let k = 0; k < 120; k++) {
  const demand = { eastbound: pk(0, 2400, 100), westbound: pk(0, 2400, 100), cross: pk(0, 1000, 50) };
  const plan = { mode: "fixed", cycle: pk(40, 120, 5), split: pk(0.2, 0.8, 0.05), offset: pk(0, 120, 1) };
  const e = new TrafficEngine({ demand, plan, seed: k + 1 }); near = 0; e.run(1200); tot++; if (near) { fixedOnly++; console.log("fixed-static fired", near, JSON.stringify(demand), JSON.stringify(plan)); }
}
console.log(`fixed static: ${fixedOnly}/${tot}`);
