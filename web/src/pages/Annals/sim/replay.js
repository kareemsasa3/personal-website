import { genesis } from "./world.js";
import { tick } from "./tick.js";
import { intervene } from "./interventions.js";

/* ---- replay: the full equation history = f(seed, interventions) -------- */
export function replay(seed, interventions, toYear) {
  let w = genesis(seed);
  for (let y = 1; y <= toYear; y++) {
    w = tick(w);
    for (const iv of interventions.filter((i) => i.year === w.year)) {
      w = intervene(w, iv.verb, iv.targetId, iv.secondId);
    }
  }
  return w;
}
