import { mulberry32 } from "./rng.js";
import { living, feud, addGrudge, log, nm, childOf, kill, checkEpithet, salientRelation } from "./world.js";

/* ---- one year of the world (pure-ish: mutates a cloned w) -------------- */
export function tick(prev) {
  const w = structuredClone({ ...prev, rng: null });
  // restore rng deterministically by replaying to current draw count:
  // simpler & still deterministic — carry rng via closure on a fresh stream
  // seeded by (seed, year). This keeps history = f(seed, interventions).
  const rng = mulberry32((w.seed ^ ((w.year + 1) * 2654435761)) >>> 0);
  const chance = (p) => rng() < p;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  w.year += 1;

  // age + consume grain
  for (const a of living(w)) {
    a.age += 1;
    a.fertile = a.age >= 16 && a.age <= 45;
    a.grain -= 1; // everyone eats
  }

  // protection flags last one year only
  for (const a of living(w)) { if (a._protected) a._protected = Math.max(0, a._protected - 1); }

  // death by age / starvation
  for (const a of living(w)) {
    let died = false, cause = "";
    if (a.grain < 0 && !a._protected) {
      if (chance(0.55)) { died = true; cause = "hunger"; }
    }
    if (!died && a.age > 55 && chance((a.age - 55) * 0.06) && !a._protected) {
      died = true; cause = "age";
    }
    if (died) kill(w, a, null, cause, rng);
  }

  // bonding — unpartnered fertile adults, dampened by feud between houses
  const single = living(w).filter((a) => !a.partner && a.fertile);
  for (let i = 0; i < single.length; i++) {
    const a = single[i];
    if (a.partner || !a.alive) continue;
    const cands = single.filter((b) => b.id !== a.id && !b.partner && b.alive);
    if (!cands.length) continue;
    const b = pick(cands);
    const f = feud(w, a.house, b.house);
    const base = a.trait === "Kind" || b.trait === "Kind" ? 0.5 : 0.3;
    if (chance(Math.max(0.04, base - f * 0.12))) {
      a.partner = b.id; b.partner = a.id;
      log(w, "bond", `${nm(a)} and ${nm(b)} were bound. ${f > 0 ? "A union across a feud." : "A quiet match."}`);
    }
  }

  // begetting — partnered, fertile, with a little surplus
  for (const a of living(w)) {
    if (!a.partner) continue;
    const b = w.agents[a.partner];
    if (!b || !b.alive || a.id > b.id) continue; // count each pair once
    if (a.fertile && b.fertile && a.grain >= 1 && chance(0.30)) {
      const id = "a" + w.nextId++;
      const child = childOf(w, a, b, rng);
      w.agents[id] = child;
      w.born += 1;
      a.deeds.children++; b.deeds.children++;
      checkEpithet(a); checkEpithet(b);
      log(w, "birth", `${child.name}, heir of ${a.house}, was born to ${a.name} and ${b.name}.`);
    }
  }

  // conflict over grain — want, greed, or feud each light the fuse
  const actors = living(w);
  for (const a of actors) {
    if (!a.alive) continue;
    const want = a.grain < 1;
    const greedy = a.trait === "Greedy" && chance(0.4);
    // find a feud target or a richer neighbor
    const others = living(w).filter((o) => o.id !== a.id);
    if (!others.length) continue;
    const feudTargets = others.filter((o) => feud(w, a.house, o.house) > 0);
    let target = null, motive = "";
    if (feudTargets.length && (a.trait === "Proud" || chance(0.5))) {
      target = pick(feudTargets); motive = "feud";
    } else if (want) {
      const rich = others.filter((o) => o.grain > a.grain);
      if (rich.length) { target = pick(rich); motive = "hunger"; }
    } else if (greedy) {
      const rich = others.filter((o) => o.grain >= 2);
      if (rich.length) { target = pick(rich); motive = "greed"; }
    }
    if (!target) continue;

    // Kind kin simply share instead of striking
    if (a.trait === "Kind" && a.house === target.house && a.grain > 0) {
      const give = Math.min(1, a.grain);
      a.grain -= give; target.grain += give;
      a.deeds.shared++;
      checkEpithet(a);
      log(w, "aid", `${a.name} shared grain with kinsman ${target.name}.`);
      continue;
    }

    // does the strike turn lethal?
    if (target._protected) {
      log(w, "spare", `${a.name} moved against ${nm(target)} but found them shielded.`);
      continue;
    }
    if (target.trait === "Cautious" && chance(0.5)) {
      target.deeds.fled++;
      checkEpithet(target);
      log(w, "flee", `${nm(target)} slipped away from ${a.name}'s reach.`);
      continue;
    }
    let lethal = 0.18;
    if (a.trait === "Bold") lethal += 0.22;
    if (motive === "feud") lethal += 0.15;
    if (a.trait === "Proud" && motive === "feud") lethal += 0.1;

    if (chance(lethal)) {
      const verb = motive === "feud" ? "cut down" : motive === "greed" ? "murdered" : "killed";
      kill(w, target, a, motive, rng, verb);
    } else {
      const taken = Math.min(target.grain, 1 + (a.trait === "Greedy" ? 1 : 0));
      if (taken > 0) { target.grain -= taken; a.grain += taken; }
      a.deeds.raids++;
      target.deeds.survived++;
      checkEpithet(a); checkEpithet(target);
      addGrudge(w, a.house, target.house, 1);
      log(w, "raid",
        `${a.name} took grain from ${nm(target)}${salientRelation(a, target, w)}${motive === "feud" ? " — the feud deepens" : ""}. House ${target.house} will remember.`);
    }
  }

  // grant an intervention token every third year
  if (w.year % 3 === 0) w.token = 1;

  return w;
}
