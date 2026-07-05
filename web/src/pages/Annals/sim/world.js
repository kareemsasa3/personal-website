import { mulberry32 } from "./rng.js";
import { TRAITS, HOUSES, NAME_POOL } from "./names.js";

/* ---- helpers ----------------------------------------------------------- */
export const houseKey = (a, b) => [a, b].sort().join("|");
export const living = (w) => Object.values(w.agents).filter((a) => a.alive);
export function feud(w, h1, h2) {
  if (h1 === h2) return 0;
  return w.grudges[houseKey(h1, h2)] || 0;
}
export function addGrudge(w, h1, h2, amt) {
  if (h1 === h2) return;
  const k = houseKey(h1, h2);
  w.grudges[k] = (w.grudges[k] || 0) + amt;
}
export function log(w, kind, text) { w.chronicle.push({ year: w.year, kind, text }); }
export function nm(a) {
  return a.epithet
    ? `${a.name} ${a.epithet} of ${a.house}`
    : `${a.name} of ${a.house}`;
}

/* ---- contextual apposition for raid lines ------------------------------- */
export function salientRelation(attacker, victim, w) {
  // bound to the attacker — betrayal of a bond
  if (victim.partner === attacker.id) return `, their bound partner`;

  // parent of a living child
  const child = living(w).find(a => a.parents && a.parents.includes(victim.name));
  if (child) return `, parent of ${child.name}`;

  // one of the last of their house — only if the house has actually lost members
  const houseMembers = Object.values(w.agents).filter(a => a.house === victim.house);
  const houseAlive = houseMembers.filter(a => a.alive).length;
  if (houseAlive <= 2 && houseMembers.length > houseAlive) return `, one of ${victim.house}'s last`;

  return "";
}

/* ---- epithets: identity earned from deeds -------------------------------- */
const EPITHET_RULES = [
  [(d) => d.kills >= 4, "the Dread"],
  [(d) => d.kills >= 2, "the Blooded"],
  [(d) => d.survived >= 5, "the Unkillable"],
  [(d) => d.shared >= 3, "the Open-Handed"],
  [(d) => d.fled >= 3, "the Ghost"],
  [(d) => d.raids >= 4, "the Ravenous"],
  [(d) => d.children >= 3, "the Fruitful"],
];

export function checkEpithet(a) {
  if (!a.deeds) return;
  for (const [check, title] of EPITHET_RULES) {
    if (check(a.deeds)) {
      // first epithet sticks — unless you become a killer, which changes everything
      if (!a.epithet
        || title === "the Dread"
        || (title === "the Blooded" && a.epithet !== "the Dread")) {
        a.epithet = title;
      }
      return;
    }
  }
}

/* ---- brief life note for notable souls ----------------------------------- */
const NTH = { 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh" };
function epitaph(a, partnerName) {
  if (!a.deeds) return "";
  const d = a.deeds;
  // named victims — the strongest mark a life can leave
  const v = d.victims;
  if (v.length >= 3) return ` ${v[0]}, ${v[1]}, and ${v.length === 3 ? v[2] : "others"} had fallen to their hand.`;
  if (v.length === 2) return ` ${v[0]} and ${v[1]} had fallen to their hand.`;
  if (v.length === 1) return ` ${v[0]} had fallen to their hand.`;
  // surviving partner — grief
  if (partnerName) return ` ${partnerName}, bound to them, remains.`;
  // generic deeds
  if (d.shared >= 3) return ` They gave more than they kept.`;
  if (d.children >= 3) return ` Their blood runs wide.`;
  if (d.survived + d.fled >= 3) return ` Death had come for them before.`;
  return "";
}

/* ---- world construction (deterministic from seed) ---------------------- */
export function genesis(seed) {
  const rng = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const used = new Set();
  const name = () => {
    let n;
    do { n = pick(NAME_POOL); } while (used.has(n) && used.size < NAME_POOL.length);
    used.add(n);
    return n;
  };

  const agents = {};
  let nextId = 0;
  const make = (house, age, trait, grain) => {
    const id = "a" + nextId++;
    agents[id] = {
      id, name: name(), house, trait,
      age, grain, alive: true,
      partner: null, fertile: age >= 16 && age <= 45,
      deeds: { kills: 0, raids: 0, fled: 0, shared: 0, survived: 0, children: 0, victims: [] },
    };
    return id;
  };

  // 10 founders across 5 houses
  for (const h of HOUSES) {
    make(h, 18 + Math.floor(rng() * 24), pick(TRAITS), 3 + Math.floor(rng() * 4));
    make(h, 18 + Math.floor(rng() * 24), pick(TRAITS), 3 + Math.floor(rng() * 4));
  }

  return {
    seed, year: 0, rng, nextId,
    agents,
    grudges: {},            // "HouseA|HouseB" -> intensity
    chronicle: [{ year: 0, kind: "dawn", text: "The first frost. Ten souls, five houses, and not enough grain." }],
    interventions: [],      // player input log — the other half of f()
    token: 0,               // intervention tokens available
    usedNames: used,
    dead: 0, born: 0,
  };
}

/* ---- child creation ---------------------------------------------------- */
export function childOf(w, a, b, rng) {
  const house = rng() < 0.5 ? a.house : b.house;
  const trait = rng() < 0.7
    ? (rng() < 0.5 ? a.trait : b.trait)
    : TRAITS[Math.floor(rng() * TRAITS.length)];
  // pick an unused name, else a numeral
  let name = null;
  for (const cand of NAME_POOL) {
    if (!w.usedNames.has(cand)) { name = cand; break; }
  }
  if (!name) {
    const base = (rng() < 0.5 ? a.name : b.name);
    name = base + " II";
  }
  w.usedNames.add(name);
  return {
    id: "a" + (w.nextId - 1), name, house, trait,
    age: 0, grain: 1, alive: true, partner: null, fertile: false,
    parents: [a.name, b.name],
    deeds: { kills: 0, raids: 0, fled: 0, shared: 0, survived: 0, children: 0, victims: [] },
  };
}

/* ---- death + inheritance: grain AND grudges outlive the individual ----- */
export function kill(w, victim, killer, cause, rng, verb = "died") {
  if (!victim.alive) return;

  // capture partner before death severs the bond
  const boundTo = victim.partner ? w.agents[victim.partner] : null;
  const partnerSurvives = boundTo && boundTo.alive;

  victim.alive = false;
  victim.deathYear = w.year;
  victim.deathCause = cause;
  victim.killedBy = killer ? nm(killer) : null;
  w.dead += 1;
  if (victim.partner && w.agents[victim.partner]) w.agents[victim.partner].partner = null;

  // heir = youngest living member of the same house
  const heirs = living(w).filter((a) => a.house === victim.house && a.id !== victim.id);
  heirs.sort((x, y) => x.age - y.age);
  const heir = heirs[0] || null;
  const lastOfHouse = heir && heirs.length === 1;
  const isChild = heir && heir.parents && heir.parents.includes(victim.name);

  // heir description: relationship + isolation
  const heirDesc = !heir ? null
    : isChild && lastOfHouse ? `Their child ${heir.name}, now alone,`
    : isChild ? `${heir.name}, their child,`
    : lastOfHouse ? `${heir.name}, now alone,`
    : heir.name;

  if (killer) {
    killer.deeds.kills++;
    killer.deeds.victims.push(victim.name);
    checkEpithet(killer);

    addGrudge(w, killer.house, victim.house, 3); // blood is heavier than theft
    const nth = killer.deeds.kills >= 3
      ? ` — the ${NTH[killer.deeds.kills] || killer.deeds.kills + "th"} to fall to that hand`
      : "";
    if (heirDesc) {
      heir.grain += victim.grain;
      log(w, "death",
        `${nm(victim)} was ${verb} by ${nm(killer)}${nth}. ` +
        `${heirDesc} inherits the grain — and the grudge against House ${killer.house}.`);
    } else {
      log(w, "death",
        `${nm(victim)} was ${verb} by ${nm(killer)}${nth}. ` +
        `No heir remains — the line thins.`);
    }
  } else {
    if (heir) heir.grain += victim.grain;
    // skip partner note when partner IS the heir — the heir line speaks for them
    const partnerIsHeir = partnerSurvives && heir && boundTo.id === heir.id;
    const epi = epitaph(victim, partnerSurvives && !partnerIsHeir ? boundTo.name : null);
    const heirLine = heirDesc
      ? ` ${heirDesc} carries the house on.`
      : " The house falls silent.";
    log(w, "death",
      `${nm(victim)} ${cause === "hunger" ? "starved" : "died of age"}.${epi}${heirLine}`);
  }
}
