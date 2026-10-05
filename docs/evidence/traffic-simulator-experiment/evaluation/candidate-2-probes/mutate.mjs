import { readFileSync, writeFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
const root = process.cwd();
const M = "src/components/TrafficSimulator/model/";
const muts = [
  ["red-light obedience off", "engine.ts", `if (light === "red") return true;`, `if (false) return true;`],
  ["yellow: always run (no stop decision)", "engine.ts", `if (light === "yellow") {`, `if (false) {`],
  ["yellow: always stop", "engine.ts", `if (distance >= (v.speed * v.speed) / (2 * YELLOW_STOP_DECEL)) {`, `if (true) {`],
  ["yellow: decision not sticky", "engine.ts", `if (v.yieldingAt === stop.intersection) return true;`, ``],
  ["yellow threshold 3.5->9 m/s2", "engine.ts", `const YELLOW_STOP_DECEL = 3.5;`, `const YELLOW_STOP_DECEL = 9;`],
  ["box occupancy check off", "engine.ts", `if (this.occupied[stop.intersection][other(axis)]) return true;`, ``],
  ["box occupancy checks own axis", "engine.ts", `if (this.occupied[stop.intersection][other(axis)]) return true;`, `if (this.occupied[stop.intersection][axis]) return true;`],
  ["don't-block-box storage off", "engine.ts", `    const exit = stop.position + stop.boxLength;\n    let ahead = 0;`, `    return false;\n    const exit = stop.position + stop.boxLength;\n    let ahead = 0;`],
  ["storage needs one car less ((ahead+1)->ahead)", "engine.ts", `return room < (ahead + 1) * (v.length + IDM.minGap);`, `return room < ahead * (v.length + IDM.minGap);`],
  ["IDM interaction term removed", "idm.ts", `const interaction = (desiredGap / Math.max(gap, 0.01)) ** 2;`, `const interaction = 0;`],
  ["IDM dynamic (closing) term removed", "idm.ts", `(speed * closing) / (2 * Math.sqrt(IDM.maxAccel * IDM.comfortDecel)),`, `0,`],
  ["IDM interaction exponent 2->1", "idm.ts", `const interaction = (desiredGap / Math.max(gap, 0.01)) ** 2;`, `const interaction = (desiredGap / Math.max(gap, 0.01));`],
  ["entry admission room check off", "engine.ts", `if (bestGap < IDM.minGap + 1) break;`, `if (bestGap < -1e9) break;`],
  ["entry admission at desired speed", "engine.ts", `const speed = Math.min(\n          arrival.desiredSpeed,`, `const speed = Math.max(\n          arrival.desiredSpeed,`],
  ["overlap hold-back removed", "engine.ts", `        if (position > limit) {`, `        if (false) {`],
  ["stop-line clamp removed", "engine.ts", `if (stop && closed && position > stop.position) {`, `if (false) {`],
  ["all-red skipped", "signals.ts", `return reached(ALL_RED)`, `return reached(0)`],
  ["yellow 3s->1s in controller", "signals.ts", `return reached(YELLOW)`, `return reached(1)`],
  ["min green removed", "signals.ts", `if (!reached(MIN_GREEN)) return { ...state, elapsed };`, ``],
  ["actuated gap-out removed", "signals.ts", `(!demand[state.axis] || reached(MAX_GREEN));`, `reached(MAX_GREEN);`],
  ["actuated max-out removed", "signals.ts", `(!demand[state.axis] || reached(MAX_GREEN));`, `!demand[state.axis];`],
  ["actuated rest-in-green removed", "signals.ts", `: demand[other(state.axis)] &&`, `: true &&`],
  ["offsets ignored", "signals.ts", `const t = time - index * plan.offset + EPSILON;`, `const t = time + EPSILON;`],
  ["offset sign flipped", "signals.ts", `const t = time - index * plan.offset + EPSILON;`, `const t = time + index * plan.offset + EPSILON;`],
  ["split inverted", "signals.ts", `return { EW: effective * plan.split, NS: effective * (1 - plan.split) };`, `return { NS: effective * plan.split, EW: effective * (1 - plan.split) };`],
  ["detector zone 35->5 m", "engine.ts", `export const DETECTOR_LENGTH = 35;`, `export const DETECTOR_LENGTH = 5;`],
  ["clock substep cap removed", "clock.ts", `const count = Math.min(MAX_SUBSTEPS, Math.floor((requested + 1e-9) / DT));`, `const count = Math.floor((requested + 1e-9) / DT);`],
  ["clock frame clamp removed", "clock.ts", `this.remainder + Math.min(seconds, MAX_FRAME_SECONDS) * speed;`, `this.remainder + seconds * speed;`],
  ["clock remainder dropped", "clock.ts", `this.remainder = limited ? 0 : Math.max(0, requested - count * DT);`, `this.remainder = 0;`],
  ["delay: no free-flow subtraction", "engine.ts", `time - v.arrivedAt - spec.length / v.desiredSpeed`, `time - v.arrivedAt`],
  ["delay excludes entry wait", "engine.ts", `arrivedAt: arrival.time,`, `arrivedAt: this.time,`],
  ["stops counted every slow step", "engine.ts", `if (!v.stopped && speed < STOPPED_BELOW) {`, `if (speed < STOPPED_BELOW) {`],
  ["history not bounded", "engine.ts", `if (this.history.length > HISTORY_CAPACITY) this.history.shift();`, ``],
  ["backlog not bounded", "engine.ts", `if (entry.backlog.length < MAX_BACKLOG_PER_ENTRY) entry.backlog.push(arrival);`, `if (true) entry.backlog.push(arrival);`],
  ["recent trips never pruned", "engine.ts", `if (drop) this.recent.splice(0, drop);`, ``],
  ["throughput window x2", "engine.ts", `throughputPerMinute: (trips.length * 60) / window,`, `throughputPerMinute: (trips.length * 30) / window,`],
  ["arrival rate doubled", "engine.ts", `const rate = demand[spec.demand] / 3600;`, `const rate = demand[spec.demand] / 1800;`],
  ["admission always lane 0", "engine.ts", `if (gap > bestGap) {`, `if (k === 0) {`],
  ["queue metric counts all vehicles", "engine.ts", `const stop = v.speed < QUEUED_BELOW ? this.nextStop(spec, v.position) : null;`, `const stop = this.nextStop(spec, v.position);`],
  ["setDemand ignored", "engine.ts", `      if (rate === entry.rate) continue;`, `      continue;`],
];
const results = [];
for (const [name, file, from, to] of muts) {
  const path = `${root}/${M}${file}`;
  const src = readFileSync(path, "utf8");
  if (!src.includes(from)) { results.push([name, "PATTERN NOT FOUND"]); continue; }
  writeFileSync(path, src.replace(from, to));
  const res = spawnSync("node", ["--import", "./scripts/traffic-test-loader.mjs", "scripts/traffic.test.mjs"], { cwd: root, encoding: "utf8", timeout: 300000 });
  const out = res.stdout + res.stderr;
  const fails = [...out.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1]);
  results.push([name, fails.length ? `CAUGHT (${fails.length}): ${fails.join(" | ")}` : (res.status === 0 ? "NOT CAUGHT" : `exit ${res.status} ${res.signal ?? ""}`)]);
  writeFileSync(path, src);
  console.log(results.at(-1).join(" -> "));
}
execSync("git checkout -- .", { cwd: root });
