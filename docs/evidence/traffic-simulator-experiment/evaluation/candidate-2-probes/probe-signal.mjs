import { DT } from "../src/components/TrafficSimulator/model/network.ts";
import { advanceSignal, scheduledState, lightFor } from "../src/components/TrafficSimulator/model/signals.ts";
import { createRandom } from "../src/components/TrafficSimulator/model/random.ts";
const r = createRandom(9);
const pick = (a, b, s) => a + Math.round((r() * (b - a)) / s) * s;
const randPlan = (mode) => ({ mode: mode ?? (r() < 0.3 ? "actuated" : "fixed"), cycle: pick(40, 120, 1), split: pick(0.2, 0.8, 0.01), offset: pick(0, 120, 0.1) });
const bad = { seq: 0, yellow: 0, allRed: 0, minGreen: 0, maxGreen: 0, desync: 0, desyncRuns: 0, conflict: 0, greenTooLongFixed: 0 };
let worstResync = 0;
for (let run = 0; run < 400; run++) {
  const index = run % 3;
  let plan = randPlan();
  let state = scheduledState(plan, 0, index);
  const edits = Array.from({ length: 5 }, () => [pick(10, 900, 0.1), randPlan()]).sort((a, b) => a[0] - b[0]);
  let lastEdit = 0, ei = 0;
  let segStart = 0; let prev = { ...state };
  let demandRnd = createRandom(run);
  let dem = { EW: true, NS: true };
  let desyncHere = false, lastDesync = -1;
  for (let i = 1; i <= 15000; i++) {
    const time = Math.round(i) * DT;
    while (ei < edits.length && edits[ei][0] <= time) { plan = edits[ei][1]; lastEdit = time; ei++; }
    if (i % 20 === 0) dem = { EW: demandRnd() < 0.7, NS: demandRnd() < 0.7 };
    const next = advanceSignal(state, { plan, time, index, demand: dem });
    if (lightFor(next, "EW") !== "red" && lightFor(next, "NS") !== "red") bad.conflict++;
    if (next.stage !== state.stage || next.axis !== state.axis) {
      const dur = time - segStart;
      if (state.stage === "green") { if (next.stage !== "yellow" || next.axis !== state.axis) bad.seq++; if (dur < 5 - 1e-6 && segStart > 0) bad.minGreen++; if (plan.mode === "actuated" && dur > 40 + 1e-6 && segStart > 0) bad.maxGreen++; }
      if (state.stage === "yellow") { if (next.stage !== "allRed") bad.seq++; if (Math.abs(dur - 3) > 1e-6 && segStart > 0) bad.yellow++; }
      if (state.stage === "allRed") { if (next.stage !== "green" || next.axis === state.axis) bad.seq++; if (Math.abs(dur - 2) > 1e-6 && segStart > 0) bad.allRed++; }
      segStart = time;
    }
    state = next;
    if (plan.mode === "fixed") {
      const s = scheduledState(plan, time, index);
      if (s.axis !== state.axis || s.stage !== state.stage) { lastDesync = time; if (time - lastEdit > 2 * plan.cycle + 10) { bad.desync++; desyncHere = true; } }
      else if (lastDesync >= lastEdit) worstResync = Math.max(worstResync, lastDesync - lastEdit);
    }
  }
  if (desyncHere) bad.desyncRuns++;
}
console.log(JSON.stringify(bad), "worst resync after edit (s):", worstResync.toFixed(1));
