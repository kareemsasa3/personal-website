import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { lightFor, other } from "../src/components/TrafficSimulator/model/signals.ts";
import { presets } from "../src/components/TrafficSimulator/model/presets.ts";
import { DEMAND_LIMITS } from "../src/components/TrafficSimulator/model/engine.ts";
const orig = TrafficEngine.prototype.mustStop;
let counters;
TrafficEngine.prototype.mustStop = function (vehicles, n, stop, axis) {
  const res = orig.call(this, vehicles, n, stop, axis);
  const light = lightFor(this.signals[stop.intersection], axis);
  if (res && light === "green") {
    const v = vehicles[n];
    const near = stop.position - v.position < 30; // driver close enough that it matters
    if (this.occupied[stop.intersection][other(axis)]) counters.occ += near ? 1 : 0;
    else { counters.storage += near ? 1 : 0; if (near) counters.storageAt[stop.intersection] = (counters.storageAt[stop.intersection] ?? 0) + 1; }
  }
  return res;
};
const configs = [];
for (const p of presets) {
  configs.push([p.id, "default", p.demand, p.plan]);
  configs.push([p.id, "eb2400", { ...p.demand, eastbound: 2400 }, p.plan]);
  configs.push([p.id, "allmax", { eastbound: 2400, westbound: 2400, cross: 1000 }, p.plan]);
  for (const offset of [30, 45]) configs.push([p.id, `eb2400 off${offset}`, { ...p.demand, eastbound: 2400 }, { ...p.plan, offset }]);
  configs.push([p.id, "eb2400 split.2", { ...p.demand, eastbound: 2400 }, { ...p.plan, split: 0.2 }]);
  configs.push([p.id, "eb2400 split.8 cyc40", { ...p.demand, eastbound: 2400 }, { ...p.plan, split: 0.8, cycle: 40 }]);
}
for (const [id, label, demand, plan] of configs) {
  counters = { occ: 0, storage: 0, storageAt: {} };
  const e = new TrafficEngine({ demand, plan, seed: 1 });
  // also track whether a stopped queue ever reaches back to an upstream box exit (EB)
  let spillSteps = 0;
  for (let i = 0; i < 18000; i++) {
    e.step();
    for (const lane of e.lanes) {
      if (lane.spec.axis !== "EW") continue;
      const st = lane.spec.stops;
      for (let k = 0; k < st.length - 1; k++) {
        const exit = st[k].position + st[k].boxLength;
        if (lane.vehicles.some((v) => v.position > exit && v.position - v.length - exit < 6.5 && v.speed < 2)) { spillSteps++; break; }
      }
    }
  }
  console.log(id.padEnd(15), label.padEnd(22), `occupancy-holds(green,<30m) ${counters.occ} storage-holds ${counters.storage} ${JSON.stringify(counters.storageAt)} queue-at-upstream-exit steps ${spillSteps}`);
}
