import { houseKey, addGrudge, log, nm } from "./world.js";

/* ---- player interventions: the second argument to f() ------------------ */
export function intervene(prev, verb, targetId, secondId) {
  const w = structuredClone({ ...prev, rng: null });
  const a = w.agents[targetId];
  if (!a || !a.alive || w.token < 1) return prev;
  w.token = 0;
  const b = secondId ? w.agents[secondId] : null;
  w.interventions.push({
    year: w.year, verb,
    targetId, targetName: a.name,
    secondId: secondId || undefined, secondName: b?.name,
  });

  switch (verb) {
    case "grain":
      a.grain += 3;
      log(w, "hand", `— You sent grain to ${nm(a)}. The want eases.`);
      break;
    case "warn":
      a._protected = 2;
      log(w, "hand", `— You warned ${nm(a)}. For a season, no blade finds them.`);
      break;
    case "protect":
      a._protected = 2;
      log(w, "hand", `— You set a guard over ${nm(a)}.`);
      break;
    case "alliance": {
      const b = w.agents[secondId];
      if (b && b.alive && !a.partner && !b.partner) {
        a.partner = b.id; b.partner = a.id;
        const k = houseKey(a.house, b.house);
        if (w.grudges[k]) w.grudges[k] = Math.max(0, w.grudges[k] - 2);
        log(w, "hand", `— You pressed a union: ${nm(a)} and ${nm(b)}. Old feuds soften.`);
      } else {
        log(w, "hand", `— You urged a match for ${nm(a)}, but it did not take.`);
      }
      break;
    }
    case "accuse": {
      const b = w.agents[secondId];
      if (b && b.alive) {
        addGrudge(w, a.house, b.house, 2);
        log(w, "hand", `— You set ${a.name}'s word against ${nm(b)}. A grudge is born of your tongue.`);
      }
      break;
    }
    case "exile":
      a.alive = false;
      a.deathYear = w.year;
      a.deathCause = "exile";
      if (a.partner && w.agents[a.partner]) w.agents[a.partner].partner = null;
      log(w, "hand", `— You exiled ${nm(a)}. Alive, somewhere, but gone from the annals.`);
      break;
    default: break;
  }
  return w;
}
