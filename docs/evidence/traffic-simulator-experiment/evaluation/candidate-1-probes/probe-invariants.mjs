// Long-run invariant probe. node --import ./scripts/traffic-test-loader.mjs scripts/probe-invariants.mjs [seconds]
import { DT, MAX_DECELERATION } from "../src/components/TrafficSimulator/model/idm.ts";
import { signalPhase, YELLOW } from "../src/components/TrafficSimulator/model/signals.ts";
import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { scenarios } from "../src/components/TrafficSimulator/model/scenarios.ts";

const SECONDS = Number(process.argv[2] ?? 1800);

// Instrument stop-line decisions: who committed while the light was red.
const origUSL = TrafficEngine.prototype.updateStopLines;
TrafficEngine.prototype.updateStopLines = function () {
  const before = new Map();
  for (const v of this.vehicles) before.set(v, v.committed);
  origUSL.call(this);
  for (const v of this.vehicles) {
    if (v.committed >= 0 && before.get(v) !== v.committed) {
      const st = signalPhase(this.time, this.signalTiming.offsets[v.committed], this.signalTiming).state;
      this._commits = this._commits ?? { yellow: 0, red: 0, green: 0, flipFromObey: 0 };
      this._commits[st]++;
      if (v._wasObeying === v.committed) this._commits.flipFromObey++;
    }
    v._wasObeying = v.stopLine !== null ? this.scenario.signals.indexOf(v.stopLine) : -1;
  }
};

function runCase(scenario, params, label) {
  const e = new TrafficEngine(scenario, params);
  const c = { nan: 0, reverse: 0, overlap: 0, unsorted: 0, overrun: 0, redUncommitted: 0, redCommitted: 0, maxIntoRed: 0,
    clampHits: 0, minAcc: 0, maxWaiting: 0, laneChangesPerExit: 0, maxSamples: 0, maxHistory: 0, maxExits: 0, maxCrossings: 0, pastDropLane2: 0 };
  const steps = Math.round(SECONDS / DT);
  for (let s = 0; s < steps; s++) {
    const pre = new Map();
    const t0 = e.time;
    for (const v of e.vehicles) pre.set(v.id, { x: v.x, committed: v.committed });
    e.step();
    const timing = e.signalTiming;
    for (let l = 0; l < e.lanes.length; l++) {
      const lane = e.lanes[l];
      for (let i = 0; i < lane.length; i++) {
        const v = lane[i];
        if (!Number.isFinite(v.x) || !Number.isFinite(v.v) || !Number.isFinite(v.acc)) c.nan++;
        if (v.v < 0) c.reverse++;
        if (v.acc <= -MAX_DECELERATION + 1e-9) c.clampHits++;
        c.minAcc = Math.min(c.minAcc, v.acc);
        if (i > 0) {
          if (!(lane[i - 1].x > v.x)) c.unsorted++;
          if (lane[i - 1].x - lane[i - 1].length < v.x - 1e-6) c.overlap++;
        }
        if (scenario.laneDrop && l === scenario.laneDrop.lane && v.x > scenario.laneDrop.x + 1e-6) c.overrun++;
        if (scenario.laneDrop && v.x > scenario.laneDrop.x && l === scenario.laneDrop.lane) c.pastDropLane2++;
        const p = pre.get(v.id);
        if (p) scenario.signals.forEach((sx, idx) => {
          if (p.x < sx && v.x >= sx) {
            const ph = signalPhase(t0, timing.offsets[idx], timing);
            if (ph.state === "red") {
              const into = timing.cycle - timing.green - YELLOW - ph.remaining;
              c.maxIntoRed = Math.max(c.maxIntoRed, into);
              if (p.committed === idx) c.redCommitted++;
              else c.redUncommitted++;
            }
          }
        });
      }
    }
    c.maxWaiting = Math.max(c.maxWaiting, e.waiting.length);
    c.maxSamples = Math.max(c.maxSamples, e.samples.length);
    c.maxHistory = Math.max(c.maxHistory, e.history.length);
    c.maxExits = Math.max(c.maxExits, e.exits.length);
    c.maxCrossings = Math.max(c.maxCrossings, e.crossings.length);
  }
  const m = e.metrics();
  const conserved = scenario.topology === "ring" ? e.vehicles.length === params.vehicles : e.entered === e.exited + e.vehicles.length;
  console.log(label.padEnd(42), JSON.stringify({ guard: e.guardEvents, ...c, minAcc: +c.minAcc.toFixed(2), maxIntoRed: +c.maxIntoRed.toFixed(2),
    conserved, finalWaiting: e.waiting.length, onRoad: m.onRoad, flow: Math.round(m.flow), trip: m.tripTime && Math.round(m.tripTime), lc: e.laneChanges, exited: e.exited, commits: e._commits }));
}

for (const scenario of scenarios) {
  const cases = [];
  for (const control of scenario.controls)
    for (const value of [control.min, control.max]) cases.push([`${control.key}=${value}`, { [control.key]: value }]);
  if (scenario.hasCoordination)
    for (const coordination of ["green-wave", "simultaneous", "reverse"])
      for (const demand of [300, 3000]) for (const cycle of [40, 120]) for (const greenShare of [0.3, 0.7])
        cases.push([`${coordination} d${demand} c${cycle} g${greenShare}`, { coordination, demand, cycle, greenShare, acceleration: 0.6 }]);
  if (scenario.id === "bottleneck")
    for (const politeness of [0, 1]) for (const acceleration of [0.6, 2]) cases.push([`d5400 p${politeness} a${acceleration}`, { demand: 5400, politeness, acceleration }]);
  if (scenario.id === "ring")
    for (const vehicles of [10, 60]) for (const acceleration of [0.3, 2]) cases.push([`n${vehicles} a${acceleration}`, { vehicles, acceleration }]);
  for (const [label, p] of cases) if (!process.env.FILTER || new RegExp(process.env.FILTER).test(`${scenario.id} ${label}`)) runCase(scenario, { ...scenario.defaults, ...p }, `${scenario.id} ${label}`);
}
