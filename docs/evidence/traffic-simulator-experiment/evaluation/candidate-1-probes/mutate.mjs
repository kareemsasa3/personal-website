// Mutation runner: node scripts/mutate.mjs  (restores each file after each mutant)
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
const M = "src/components/TrafficSimulator/model/";
const mutants = [
  ["red ignored (only yellow obeyed)", "engine.ts", `if (state === "green") continue;`, `if (state !== "yellow") continue;`],
  ["red/yellow both ignored", "engine.ts", `if (state === "green") continue;`, `continue;`],
  ["yellow: always commit (never stop on yellow)", "engine.ts", `(state === "yellow" ? COMFORT_STOP : HARD_STOP)`, `(state === "yellow" ? -1 : HARD_STOP)`],
  ["yellow: never commit (always try to stop)", "engine.ts", `(state === "yellow" ? COMFORT_STOP : HARD_STOP)`, `(state === "yellow" ? Infinity : HARD_STOP)`],
  ["red: HARD_STOP=0 (always run red)", "engine.ts", `const HARD_STOP = 7;`, `const HARD_STOP = 0;`],
  ["red: HARD_STOP=3.5", "engine.ts", `const HARD_STOP = 7;`, `const HARD_STOP = 3.5;`],
  ["committed never cleared (ignores later signals too)", "engine.ts", `if (index < 0 || vehicle.committed === index) continue;`, `if (index < 0 || vehicle.committed >= 0) continue;`],
  ["stop line ignored in accel (decision kept)", "engine.ts", `if (vehicle.stopLine !== null) gap = vehicle.stopLine - vehicle.x;`, ``],
  ["IDM interaction term (dv) removed", "idm.ts", `+ (v * (v - leaderSpeed)) / (2 * Math.sqrt(d.a * d.b))`, ``],
  ["IDM: gap term squared -> linear", "idm.ts", `(desired / s) ** 2`, `(desired / s)`],
  ["IDM: free term exponent 4 -> 1", "idm.ts", `(v / d.v0) ** 4`, `(v / d.v0) ** 1`],
  ["MOBIL safety (B_SAFE) check removed", "engine.ts", `if (after < -B_SAFE || newFollowerAfter < -B_SAFE) continue;`, ``],
  ["MOBIL B_SAFE=50", "engine.ts", `const B_SAFE = 4;`, `const B_SAFE = 50;`],
  ["lane-change physical gap checks removed", "engine.ts", `if (newLeader && newLeader.x - newLeader.length - vehicle.x < vehicle.s0 / 2) continue;\n        if (newFollower && vehicle.x - vehicle.length - newFollower.x < newFollower.s0 / 2) continue;`, ``],
  ["lane-change follower gap check removed", "engine.ts", `if (newFollower && vehicle.x - vehicle.length - newFollower.x < newFollower.s0 / 2) continue;`, ``],
  ["MOBIL politeness sign flipped", "engine.ts", `+ politeness * (newFollowerLoss + oldFollowerGain)`, `- politeness * (newFollowerLoss + oldFollowerGain)`],
  ["lane changes disabled", "engine.ts", `if (this.scenario.lanes > 1) this.changeLanes();`, ``],
  ["lane-drop bias removed", "engine.ts", `const LANE_DROP_BIAS = 3;`, `const LANE_DROP_BIAS = 0;`],
  ["lane-drop approach closure removed", "engine.ts", `return !(drop && lane === drop.lane && x > drop.x - LANE_DROP_APPROACH);`, `return true;`],
  ["lane end not an obstacle", "engine.ts", `if (drop && lane === drop.lane) gap = Math.min(gap, drop.x - vehicle.x);`, ``],
  ["insert at wrong index after lane change", "engine.ts", `bestIndex = at;`, `bestIndex = 0;`],
  ["entry headway check removed", "engine.ts", `if (entry.gap < driver.s0 + speed * driver.T) continue;`, `if (entry.gap < 0) continue;`],
  ["entry: always enter at v0", "engine.ts", `const speed = entry.last && entry.gap < ENTRY_LOOKAHEAD ? Math.min(driver.v0, entry.last.v) : driver.v0;`, `const speed = driver.v0;`],
  ["overlap guard removed", "engine.ts", `if (vehicle.x > limit) {`, `if (false) {`],
  ["overlap guard silent (no count)", "engine.ts", `this.guardEvents++;`, ``],
  ["decel clamp 9 -> 3", "idm.ts", `export const MAX_DECELERATION = 9;`, `export const MAX_DECELERATION = 3;`],
  ["no reversal clamp", "engine.ts", `if (next < 0) {`, `if (false) {`],
  ["signal offsets all zero", "signals.ts", `coordination === "green-wave" ? 1 : coordination === "reverse" ? -1 : 0;`, `0;`],
  ["green-wave direction flipped", "signals.ts", `coordination === "green-wave" ? 1 : coordination === "reverse" ? -1 : 0;`, `coordination === "green-wave" ? -1 : coordination === "reverse" ? 1 : 0;`],
  ["green-wave progression speed x0.6", "signals.ts", `mod((direction * (x - origin)) / progressionSpeed, cycle)`, `mod((direction * (x - origin)) / (progressionSpeed * 0.6), cycle)`],
  ["yellow 3 -> 0", "signals.ts", `export const YELLOW = 3;`, `export const YELLOW = 0;`],
  ["signal phase off-by-one (green <=)", "signals.ts", `if (t < timing.green)`, `if (t <= timing.green + 1)`],
  ["ring wrap: lead car sees free road", "engine.ts", `if (!leader && ring && lane.length > 1) {\n          leader = lane[lane.length - 1];\n          wrap = length;\n        }`, ``],
  ["ring wrap: wrap distance off by 50 m", "engine.ts", `          wrap = length;\n        }\n        let acc`, `          wrap = length + 50;\n        }\n        let acc`],
  ["ring: start at v=0", "engine.ts", `vehicle.v = speed;`, `vehicle.v = 0;`],
  ["ring jitter removed", "engine.ts", `vehicle.x = i * spacing + (this.random() - 0.5) * 0.4;`, `vehicle.x = i * spacing;`],
  ["perturb no-op", "engine.ts", `target.brakeUntil = this.time + PERTURBATION.duration;`, ``],
  ["clock substep cap 200 -> 1e6", "clock.ts", `export const MAX_SUBSTEPS = 200;`, `export const MAX_SUBSTEPS = 1e6;`],
  ["clock frame cap 0.1 s removed", "clock.ts", `Math.min(seconds, 0.1) * speed`, `seconds * speed`],
  ["clock remainder dropped", "clock.ts", `this.remainder = limited ? 0 : Math.max(0, requested - count * DT);`, `this.remainder = 0;`],
  ["exits buffer unbounded", "engine.ts", `if (this.exits.length > EXIT_CAPACITY) this.exits.splice(0, this.exits.length - EXIT_CAPACITY);`, ``],
  ["crossings never trimmed", "engine.ts", `while (this.crossings.length && this.crossings[0] < cutoff) this.crossings.shift();`, ``],
  ["samples unbounded", "engine.ts", `if (this.samples.length > SAMPLE_CAPACITY) this.samples.shift();`, ``],
  ["stops: no hysteresis", "engine.ts", `} else if (vehicle.v > MOVING_SPEED) vehicle.stopped = false;`, `} else if (vehicle.v >= STOP_SPEED) vehicle.stopped = false;`],
  ["stops never counted", "engine.ts", `vehicle.stops++;`, ``],
  ["trip time excludes entrance wait", "engine.ts", `arrivedAt: pending.arrivedAt,`, `arrivedAt: this.time,`],
  ["exit on front bumper", "engine.ts", `lane[0].x - lane[0].length > this.scenario.length`, `lane[0].x > this.scenario.length`],
  ["unseeded randomness", "random.ts", `let state = seed >>> 0;`, `let state = (Math.random() * 2 ** 32) >>> 0;`],
  ["no warm-up", "engine.ts", `const warmup = Math.round(scenario.warmup / DT);`, `const warmup = 0;`],
  ["demand edit ignored", "engine.ts", `const rate = this.params.demand / 3600;`, `const rate = this.scenario.defaults.demand / 3600;`],
  ["validation: range check removed", "engine.ts", `if (!Number.isFinite(value) || value < control.min - 1e-9 || value > control.max + 1e-9)`, `if (!Number.isFinite(value))`],
];
const results = [];
for (const [name, file, find, replace] of mutants) {
  const path = M + file;
  const src = readFileSync(path, "utf8");
  const n = src.split(find).length - 1;
  if (n !== 1) { results.push([name, `SKIP (pattern found ${n}x)`]); continue; }
  writeFileSync(path, src.replace(find, replace));
  const r = spawnSync(process.execPath, ["--import", "./scripts/traffic-test-loader.mjs", "scripts/traffic.test.mjs"], { encoding: "utf8", timeout: 300000 });
  execFileSync("git", ["checkout", "--", path]);
  const failed = [...r.stdout.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1]);
  results.push([name, r.status === 0 ? "NOT CAUGHT" : `caught (${failed.length}): ${failed.join(" | ")}${r.signal ? " [" + r.signal + "]" : ""}`]);
  console.log(results.at(-1).join(" => "));
}
