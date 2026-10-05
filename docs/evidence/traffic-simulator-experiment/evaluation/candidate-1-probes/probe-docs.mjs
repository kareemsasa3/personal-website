// Docs claims across seeds. node --import ./scripts/traffic-test-loader.mjs scripts/probe-docs.mjs
import { DT } from "../src/components/TrafficSimulator/model/idm.ts";
import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { findScenario } from "../src/components/TrafficSimulator/model/scenarios.ts";

const run = (e, s) => { for (let i = 0, n = Math.round(s / DT); i < n; i++) e.step(); return e; };
const build = (id, params = {}, seed) => {
  const sc = findScenario(id);
  return new TrafficEngine(seed === undefined ? sc : { ...sc, seed }, { ...sc.defaults, ...params });
};
const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
const f = (x, d = 2) => (x === null ? "null" : x.toFixed(d));
const SEEDS = [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9];

console.log("== corridor 1000 veh/h, 600 s, last 50 trips: stops / trip  [wave | simul | reverse]");
let waveWins = 0, waveTripWins = 0;
for (const seed of SEEDS) {
  const r = ["green-wave", "simultaneous", "reverse"].map((coordination) => run(build("corridor", { coordination }, seed), 600).metrics());
  if (r[0].stopsPerTrip < r[1].stopsPerTrip && r[0].stopsPerTrip < r[2].stopsPerTrip) waveWins++;
  if (r[0].tripTime < r[1].tripTime && r[0].tripTime < r[2].tripTime) waveTripWins++;
  console.log(`seed ${seed ?? "default"}`.padEnd(14), r.map((m) => `${f(m.stopsPerTrip)}/${f(m.tripTime, 0)}`).join("  "));
}
console.log(`wave best stops in ${waveWins}/${SEEDS.length}, best trip in ${waveTripWins}/${SEEDS.length}`);

console.log("== corridor 2600 veh/h waiting at 600 s");
console.log(SEEDS.map((seed) => run(build("corridor", { demand: 2600 }, seed), 600).waiting.length).join(" "));

console.log("== bottleneck: slow(<2 m/s) count / waiting / flow at 600 s, by demand");
for (const demand of [2000, 3600, 5000]) {
  const rows = SEEDS.map((seed) => {
    const e = run(build("bottleneck", { demand }, seed), 600);
    const m = e.metrics();
    const stoppedTrips = e.exits.filter((x) => x.stops > 0).length;
    return `${m.queued}/${m.waiting}/${Math.round(m.flow)}/st${stoppedTrips}`;
  });
  console.log(`d${demand}`.padEnd(6), rows.join("  "));
}

console.log("== bottleneck 3600: slow vehicles per 100 m bin (x 0..1600), default seed + 3 others");
for (const seed of [undefined, 1, 2, 3]) {
  const e = run(build("bottleneck", {}, seed), 600);
  const bins = Array(16).fill(0);
  for (const v of e.vehicles) if (v.v < 2) bins[Math.min(15, Math.floor(v.x / 100))]++;
  console.log(`seed ${seed ?? "default"}`.padEnd(14), bins.join(" "));
}

console.log("== ring: unperturbed sd at 300 s; tapped at 20 s then 280 s: sd / min km/h");
for (const [label, params] of [["34 a0.6", {}], ["25 a0.6", { vehicles: 25 }], ["34 a1.5", { acceleration: 1.5 }], ["20 a0.6", { vehicles: 20 }]]) {
  const rows = SEEDS.map((seed) => {
    const steady = run(build("ring", params, seed), 300);
    const e = build("ring", params, seed);
    run(e, 20); e.perturb(); run(e, 280);
    const sp = e.vehicles.map((v) => v.v);
    return `${f(sd(steady.vehicles.map((v) => v.v)))}|${f(sd(sp))}/${f(Math.min(...sp) * 3.6, 0)}`;
  });
  console.log(label.padEnd(8), rows.join(" "));
}
