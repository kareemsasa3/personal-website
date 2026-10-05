import { DT } from "../src/components/TrafficSimulator/model/idm.ts";
import { signalPhase, YELLOW } from "../src/components/TrafficSimulator/model/signals.ts";
import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { findScenario } from "../src/components/TrafficSimulator/model/scenarios.ts";
const sc = findScenario("corridor"); const e = new TrafficEngine(sc, { ...sc.defaults, demand: 1800 });
const cycles = [40, 120, 65, 90]; const coords = ["green-wave", "reverse", "simultaneous"];
let red = 0, redDeep = 0, edits = 0, crossings = 0, minAcc = 0;
for (let s = 0; s < 18000; s++) {
  if (s % 370 === 0) { e.setParams({ cycle: cycles[edits % 4], coordination: coords[edits % 3], greenShare: [0.3, 0.7][edits % 2] }); edits++; }
  const pre = new Map(e.vehicles.map((v) => [v.id, v.x])); const t0 = e.time;
  e.step(); const tm = e.signalTiming;
  for (const v of e.vehicles) { minAcc = Math.min(minAcc, v.acc); const p = pre.get(v.id); if (p === undefined) continue;
    sc.signals.forEach((x, i) => { if (p < x && v.x >= x) { crossings++; const ph = signalPhase(t0, tm.offsets[i], tm);
      if (ph.state === "red") { red++; if (tm.cycle - tm.green - YELLOW - ph.remaining > 2) redDeep++; } } }); }
}
console.log({ edits, crossings, redCrossings: red, moreThan2sIntoRed: redDeep, guard: e.guardEvents, minAcc });
