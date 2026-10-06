import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { lightFor, other } from "../src/components/TrafficSimulator/model/signals.ts";
import { presets } from "../src/components/TrafficSimulator/model/presets.ts";
const orig = TrafficEngine.prototype.mustStop;
const c = { calls: 0, trueRed: 0, trueYellow: 0, trueGreenOcc: 0, trueGreenStorage: 0, trueGreenStorageAny: 0 };
TrafficEngine.prototype.mustStop = function (vehicles, n, stop, axis) {
  c.calls++;
  const res = orig.call(this, vehicles, n, stop, axis);
  const light = lightFor(this.signals[stop.intersection], axis);
  if (res) { if (light === "red") c.trueRed++; else if (light === "yellow") c.trueYellow++; else if (this.occupied[stop.intersection][other(axis)]) c.trueGreenOcc++; else c.trueGreenStorageAny++; }
  return res;
};
for (const p of presets) for (const d of [p.demand, { eastbound: 2400, westbound: 2400, cross: 1000 }]) for (const seed of [1,2,3]) {
  const e = new TrafficEngine({ demand: d, plan: p.plan, seed }); e.run(1800);
}
console.log(JSON.stringify(c));
