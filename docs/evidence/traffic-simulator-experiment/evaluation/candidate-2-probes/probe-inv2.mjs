import { DT, NETWORK } from "../src/components/TrafficSimulator/model/network.ts";
import { lightFor, PLAN_LIMITS } from "../src/components/TrafficSimulator/model/signals.ts";
import { TrafficEngine, DEMAND_LIMITS } from "../src/components/TrafficSimulator/model/engine.ts";
import { presets } from "../src/components/TrafficSimulator/model/presets.ts";

const SECONDS = Number(process.env.SECS ?? 1800);
function check(cfg) {
  const e = new TrafficEngine(cfg);
  const r = { overlap:0, touch:0, red:0, conflict:0, reverse:0, nan:0, overspeed:0, hardDecel:0, instantStop:0, maxDecel:0, maxStuck:0, maxVeh:0, maxWait:0, maxRecent:0, conserv:0, minGap:Infinity };
  const stuck = new Map();
  const steps = Math.round(SECONDS / DT);
  for (let i = 0; i < steps; i++) {
    const before = new Map();
    const lights = e.signals.map((s) => ({ EW: lightFor(s, "EW"), NS: lightFor(s, "NS") }));
    for (const l of e.lanes) for (const v of l.vehicles) before.set(v.id, [v.position, v.speed]);
    e.step();
    const occ = NETWORK.intersections.map(() => new Set());
    let count = 0;
    for (const l of e.lanes) {
      const vs = l.vehicles; count += vs.length;
      for (let n = 0; n < vs.length; n++) {
        const v = vs[n];
        if (!Number.isFinite(v.position) || !Number.isFinite(v.speed)) r.nan++;
        if (v.speed > v.desiredSpeed + 1e-6) r.overspeed++;
        if (n > 0) { const g = vs[n-1].position - vs[n-1].length - v.position; if (g < -1e-9) r.overlap++; else if (g < 0.5) r.touch++; r.minGap = Math.min(r.minGap, g); }
        const b = before.get(v.id);
        if (b) {
          if (v.position < b[0] - 1e-12) r.reverse++;
          const dec = (b[1] - v.speed) / DT;
          r.maxDecel = Math.max(r.maxDecel, dec);
          if (dec > 9 + 1e-6) { r.hardDecel++; if (v.speed === 0 && b[1] > 3) r.instantStop++; }
        }
        for (const s of l.spec.stops) {
          if (v.position > s.position && v.position - v.length < s.position + s.boxLength) occ[s.intersection].add(l.spec.axis);
          if (b && b[0] <= s.position && v.position > s.position && lights[s.intersection][l.spec.axis] === "red") r.red++;
        }
        if (v.speed < 0.1) { const t = (stuck.get(v.id) ?? 0) + DT; stuck.set(v.id, t); r.maxStuck = Math.max(r.maxStuck, t); } else stuck.delete(v.id);
      }
    }
    r.conflict += occ.filter((a) => a.size > 1).length;
    r.maxVeh = Math.max(r.maxVeh, count);
    r.maxWait = Math.max(r.maxWait, e.waitingCount());
    r.maxRecent = Math.max(r.maxRecent, e["recent"].length);
  }
  const t = e.totals;
  if (t.arrivals !== t.completed + e.vehicleCount() + e.waitingCount() + t.dropped) r.conserv++;
  const s = e.stats();
  r.hist = e.history.length; r.dropped = t.dropped; r.completed = t.completed;
  r.delayEB = (t.groups.EB.delay / t.groups.EB.completed).toFixed(1);
  r.stopsEB = (t.groups.EB.stops / t.groups.EB.completed).toFixed(2);
  r.maxStuck = r.maxStuck.toFixed(1); r.maxDecel = r.maxDecel.toFixed(1); r.minGap = r.minGap.toFixed(3);
  return r;
}
const configs = [];
for (const p of presets) {
  configs.push([p.id, "default", { demand: p.demand, plan: p.plan, seed: p.seed }]);
  for (const k of Object.keys(DEMAND_LIMITS)) for (const val of DEMAND_LIMITS[k])
    configs.push([p.id, `${k}=${val}`, { demand: { ...p.demand, [k]: val }, plan: p.plan, seed: p.seed }]);
  for (const k of Object.keys(PLAN_LIMITS)) for (const val of PLAN_LIMITS[k])
    configs.push([p.id, `${k}=${val}`, { demand: p.demand, plan: { ...p.plan, [k]: val }, seed: p.seed }]);
  for (const m of ["fixed", "actuated"]) if (m !== p.plan.mode) configs.push([p.id, `mode=${m}`, { demand: p.demand, plan: { ...p.plan, mode: m }, seed: p.seed }]);
  // all max
  configs.push([p.id, "allmax", { demand: { eastbound: 2400, westbound: 2400, cross: 1000 }, plan: p.plan, seed: p.seed }]);
}
const filter = process.env.ONLY;
if (process.env.CFG) { configs.length = 0; for (const seed of [1,2,3,4,5]) configs.push(["custom", "seed"+seed, { ...JSON.parse(process.env.CFG), seed }]); }
const agg = {};
for (const [id, label, cfg] of configs) {
  if (filter && !id.includes(filter)) continue;
  const t0 = performance.now();
  const r = check(cfg);
  const ms = performance.now() - t0;
  console.log(id.padEnd(15), label.padEnd(16), JSON.stringify(r), `${(ms / SECONDS).toFixed(3)}ms/sim-s`);
  for (const k of ["overlap","red","conflict","reverse","nan","overspeed","hardDecel","instantStop","conserv"]) agg[k] = (agg[k] ?? 0) + r[k];
}
console.log("TOTAL configs", configs.length, JSON.stringify(agg));
