import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { presets } from "../src/components/TrafficSimulator/model/presets.ts";
const P = Object.fromEntries(presets.map((p) => [p.id, p]));
const seeds = [1,2,3,4,5,6,7,8,9,10];
const fmt = (a) => a.map((x) => x.toFixed(2)).join(" ");
const stat = (a) => { const m = a.reduce((s,x)=>s+x,0)/a.length; return `mean ${m.toFixed(2)} min ${Math.min(...a).toFixed(2)} max ${Math.max(...a).toFixed(2)}`; };

// 1. Capacity: EB throughput (veh/h) measured over 600..2400 s
console.log("== Capacity sweep (balanced plan 60/0.6/0, wb 800, cross 250) ==");
for (const eb of [1200, 1400, 1500, 1600, 1800, 2000, 2400]) {
  const thr = [], wait = [];
  for (const seed of seeds.slice(0,5)) {
    const e = new TrafficEngine({ demand: { ...P.balanced.demand, eastbound: eb }, plan: P.balanced.plan, seed });
    e.run(600); const c0 = e.totals.groups.EB.completed; const w0 = e.entries[0].backlog.length;
    e.run(1800); thr.push((e.totals.groups.EB.completed - c0) * 2);
    wait.push(e.entries[0].backlog.length - w0);
  }
  console.log(`EB ${eb}: thr/h ${fmt(thr)} | backlog growth ${wait.join(" ")}`);
}
// 2. Green wave offset (preset green-wave demand) and test demand
for (const [label, demand, split] of [["green-wave preset demand", P["green-wave"].demand, 0.6], ["test demand 700/0/0 split .5", { eastbound: 700, westbound: 0, cross: 0 }, 0.5]]) {
  console.log(`== Offset effect: ${label} ==`);
  const res = {};
  for (const off of [0, 10, 15, 20, 30, 45]) {
    res[off] = seeds.map((seed) => { const e = new TrafficEngine({ demand, plan: { mode: "fixed", cycle: 60, split, offset: off }, seed }); e.run(1200); const g = e.totals.groups.EB; return g.stops / g.completed; });
    console.log(`offset ${off}: stops/trip ${stat(res[off])}`);
  }
  const r0 = seeds.map((_, i) => res[15][i] / res[0][i]), r45 = seeds.map((_, i) => res[15][i] / res[45][i]);
  console.log(`ratio 15/0 ${fmt(r0)} ; 15/45 ${fmt(r45)} ; seeds with ratio<0.5 vs both: ${seeds.filter((_, i) => r0[i] < 0.5 && r45[i] < 0.5).length}/10`);
}
// 3. Actuation effect night preset
console.log("== Actuated vs fixed (night preset demand) ==");
const ratios = [];
for (const seed of seeds) {
  const d = (mode) => { const e = new TrafficEngine({ demand: P["night-actuated"].demand, plan: { ...P["night-actuated"].plan, mode }, seed }); e.run(900); const g = e.totals.groups; return (g.EB.delay + g.WB.delay + g.CROSS.delay) / (g.EB.completed + g.WB.completed + g.CROSS.completed); };
  const a = d("actuated"), f = d("fixed"); ratios.push(a / f);
}
console.log(`act/fixed delay ratio ${fmt(ratios)} ${stat(ratios)}`);
