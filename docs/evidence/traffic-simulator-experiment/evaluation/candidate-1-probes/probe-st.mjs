import { TrafficEngine } from "../src/components/TrafficSimulator/model/engine.ts";
import { findScenario } from "../src/components/TrafficSimulator/model/scenarios.ts";
const BINS=[0.1,0.3,0.55,0.8,Infinity]; const speedBin=(s)=>BINS.findIndex(m=>s<m);
const sc=findScenario("bottleneck"); const e=new TrafficEngine(sc,{...sc.defaults,demand:5400});
for(let i=0;i<3000;i++)e.step();
let rects=0; const t=performance.now();
for(let r=0;r<20;r++) for(let bin=4;bin>=0;bin--) for(const s of e.samples) for(let i=0;i<s.x.length;i++){ if(speedBin(s.speed[i])!==bin) continue; rects++; }
console.log("samples",e.samples.length,"dots/redraw",rects/20,"bin-loop ms/redraw",((performance.now()-t)/20).toFixed(2));
