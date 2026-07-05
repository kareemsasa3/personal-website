import { replay } from "./replay.js";
import { living } from "./world.js";
import { HOUSES } from "./names.js";

/* ---- the fork: compare baseline against the player's hand --------------- */
export function diverge(seed, interventions, toYear) {
  const base = replay(seed, [], toYear);
  const hand = replay(seed, interventions, toYear);

  // Collect every agent ID across both timelines
  const allIds = new Set([
    ...Object.keys(base.agents),
    ...Object.keys(hand.agents),
  ]);

  // Find agents whose fates diverged
  const fates = [];
  for (const id of allIds) {
    const b = base.agents[id];
    const h = hand.agents[id];
    if (!b && h) {
      fates.push({ name: h.name, house: h.house, baseline: null, hand: snap(h) });
    } else if (b && !h) {
      fates.push({ name: b.name, house: b.house, baseline: snap(b), hand: null });
    } else if (b && h && b.alive !== h.alive) {
      fates.push({ name: h.name, house: h.house, baseline: snap(b), hand: snap(h) });
    }
  }
  fates.sort((a, b) => rank(a) - rank(b));

  // Compare house outcomes
  const houses = [];
  for (const h of HOUSES) {
    const bLive = Object.values(base.agents).filter(a => a.house === h && a.alive).length;
    const hLive = Object.values(hand.agents).filter(a => a.house === h && a.alive).length;
    if (bLive !== hLive) houses.push({ name: h, baseline: bLive, hand: hLive });
  }

  return {
    fates,
    houses,
    baseline: { living: living(base).length, born: base.born, dead: base.dead },
    hand:     { living: living(hand).length, born: hand.born, dead: hand.dead },
  };
}

function snap(a) {
  return { alive: a.alive, age: a.age, deathYear: a.deathYear, deathCause: a.deathCause, killedBy: a.killedBy };
}

function rank(f) {
  if (f.baseline && !f.baseline.alive && f.hand?.alive) return 0;   // saved
  if (f.baseline?.alive && f.hand && !f.hand.alive) return 1;       // lost
  if (!f.baseline) return 2;                                         // born only in hand
  if (!f.hand) return 3;                                             // born only in baseline
  return 4;
}
