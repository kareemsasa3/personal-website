import { useState, useMemo, useCallback } from "react";
import "./Annals.css";

/* =========================================================================
   ANNALS — the smallest irreversible social simulation
   History = f(seed, interventions). Nothing here is scripted.

   Ingredients (and nothing else):
     named identity · one trait each · relationships · lineage ·
     one scarce resource (grain) · conflict · death · inheritance ·
     inherited grudges (house-level) · a readable chronicle ·
     optional player intervention.

   No map. No combat system. No economy beyond grain. No avatar.
   ========================================================================= */

import { living, genesis } from "./sim/world.js";
import { tick } from "./sim/tick.js";
import { intervene } from "./sim/interventions.js";
import { replay } from "./sim/replay.js";
import { diverge } from "./sim/divergence.js";

const KIND_STYLE: Record<string, string> = {
  dawn: "text-stone-500 italic",
  bond: "text-emerald-800",
  birth: "text-sky-800",
  aid: "text-emerald-700",
  raid: "text-amber-800",
  death: "text-red-900 font-medium",
  flee: "text-stone-500",
  spare: "text-stone-500",
  hand: "text-yellow-700 font-medium",
};

type ChronicleKind =
  | "dawn"
  | "bond"
  | "birth"
  | "aid"
  | "raid"
  | "death"
  | "flee"
  | "spare"
  | "hand";

interface ChronicleEvent {
  year: number;
  kind: ChronicleKind;
  text: string;
}

interface InterventionLog {
  year: number;
  verb: string;
  targetName?: string;
  secondName?: string;
}

interface Agent {
  id: string;
  name: string;
  house: string;
  age: number;
  alive: boolean;
  epithet?: string;
  trait: string;
  grain: number;
  partner?: string;
}

interface Fate {
  alive?: boolean;
  age?: number;
  killedBy?: string;
  deathYear?: number;
  deathCause?: string;
}

interface ForkFate {
  name: string;
  house: string;
  baseline: Fate;
  hand: Fate;
}

interface ForkHouse {
  name: string;
  baseline: number;
  hand: number;
}

interface ForkSummary {
  living: number;
  dead: number;
}

interface ForkReport {
  fates: ForkFate[];
  houses: ForkHouse[];
  baseline: ForkSummary;
  hand: ForkSummary;
}

interface World {
  seed: number;
  year: number;
  born: number;
  dead: number;
  token: boolean;
  agents: Record<string, Agent>;
  grudges: Record<string, number>;
  chronicle: ChronicleEvent[];
  interventions: InterventionLog[];
}

type SavedReplay = { log: InterventionLog[]; year: number } | null;

function fateText(fate: Fate | null | undefined) {
  if (!fate) return "never born";
  if (fate.alive) return `lives, age ${fate.age}`;
  if (fate.killedBy) return `slain by ${fate.killedBy}, year ${fate.deathYear}`;
  if (fate.deathCause === "hunger") return `starved, year ${fate.deathYear}`;
  if (fate.deathCause === "age") return `old age, year ${fate.deathYear}`;
  if (fate.deathCause === "exile") return `exiled, year ${fate.deathYear}`;
  return `fell, year ${fate.deathYear || "?"}`;
}

export default function Annals() {
  const [seedInput, setSeedInput] = useState("1815");
  const [world, setWorld] = useState<World>(() => genesis(1815));
  const [favorite, setFavorite] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null); // {verb} awaiting target(s)
  const [pickTwo, setPickTwo] = useState<string | null>(null);  // first target for 2-arg verbs
  const [savedReplay, setSavedReplay] = useState<SavedReplay>(null); // { log, year } when viewing baseline
  const [fork, setFork] = useState<ForkReport | null>(null); // divergence report

  const reset = useCallback((s: string) => {
    const seed = (parseInt(s, 10) || 0) >>> 0;
    setWorld(genesis(seed));
    setFavorite(null); setPending(null); setPickTwo(null); setSavedReplay(null); setFork(null);
  }, []);

  const advance = useCallback(() => {
    setWorld((w: World) => tick(w));
    setPending(null); setPickTwo(null); setFork(null);
  }, []);

  const replayBaseline = useCallback(() => {
    setSavedReplay({ log: world.interventions, year: world.year });
    setWorld(replay(world.seed, [], world.year));
    setPending(null); setPickTwo(null); setFork(null);
  }, [world]);

  const replayHand = useCallback(() => {
    if (!savedReplay) return;
    setWorld(replay(world.seed, savedReplay.log, savedReplay.year));
    setSavedReplay(null);
    setPending(null); setPickTwo(null); setFork(null);
  }, [savedReplay, world.seed]);

  const showFork = useCallback(() => {
    if (fork) { setFork(null); return; }
    const ivs = savedReplay ? savedReplay.log : world.interventions;
    setFork(diverge(world.seed, ivs, world.year));
  }, [world, fork, savedReplay]);

  const roster = useMemo(
    () => living(world).sort((a: Agent, b: Agent) => a.house.localeCompare(b.house) || a.age - b.age),
    [world]
  );

  const feuds = useMemo(
    () => Object.entries(world.grudges as Record<string, number>).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]),
    [world]
  );

  const favAgent = favorite ? world.agents[favorite] : null;
  const favFell = favAgent && !favAgent.alive;

  const VERBS: Array<[string, string, number]> = [
    ["grain", "give grain", 1],
    ["warn", "warn", 1],
    ["protect", "protect", 1],
    ["alliance", "urge alliance", 2],
    ["accuse", "accuse (of…)", 2],
    ["exile", "exile", 1],
  ];

  const onAgentClick = (a: Agent) => {
    if (!pending) { // no verb chosen: toggle favorite
      setFavorite((f) => (f === a.id ? null : a.id));
      return;
    }
    const arity = VERBS.find((v) => v[0] === pending)?.[2];
    if (arity === 1) {
      setWorld((w: World) => intervene(w, pending, a.id));
      setPending(null);
    } else {
      if (!pickTwo) setPickTwo(a.id);
      else {
        setWorld((w: World) => intervene(w, pending, pickTwo, a.id));
        setPending(null); setPickTwo(null);
      }
    }
  };

  return (
    <div className="annals-page min-h-screen bg-stone-100 text-stone-900 font-serif"
         style={{ backgroundImage: "radial-gradient(circle at 20% 10%, #f5f1e8, #e7e0d2)" }}>
      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* masthead */}
        <header className="border-b-2 border-stone-800 pb-3 mb-4">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-4xl tracking-tight font-bold">The Annals</h1>
              <p className="text-stone-600 text-sm mt-1">
                a world that writes its own history · <span className="font-mono">history = f(seed, your hand)</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold tabular-nums leading-none">Yr {world.year}</div>
              <div className="text-xs text-stone-500 mt-1">
                {living(world).length} living · {world.born} born · {world.dead} lost
              </div>
            </div>
          </div>
        </header>

        {/* seed + tick controls */}
        <div className="flex items-center gap-2 flex-wrap mb-5 text-sm">
          <span className="text-stone-500">seed</span>
          <input
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value.replace(/\D/g, ""))}
            className="w-24 px-2 py-1 bg-stone-50 border border-stone-400 rounded font-mono"
          />
          <button onClick={() => reset(seedInput)}
            className="px-3 py-1 border border-stone-700 rounded hover:bg-stone-800 hover:text-stone-50 transition">
            cast world
          </button>
          <button onClick={() => reset(world.seed.toString())}
            className="px-3 py-1 border border-stone-400 rounded text-stone-600 hover:bg-stone-200 transition"
            title="replay this exact seed from year 0 — the counterfactual">
            replay seed
          </button>
          {world.interventions.length > 0 && !savedReplay && (
            <button onClick={replayBaseline}
              className="px-3 py-1 border border-stone-400 rounded text-stone-600 hover:bg-stone-200 transition"
              title="replay to this year with no interventions — the road not taken">
              baseline
            </button>
          )}
          {savedReplay && (
            <button onClick={replayHand}
              className="px-3 py-1 border border-yellow-600 rounded text-yellow-700 hover:bg-yellow-50 transition"
              title="replay with your interventions — the road you chose">
              your hand
            </button>
          )}
          {(world.interventions.length > 0 || savedReplay) && (
            <button onClick={showFork}
              className={`px-3 py-1 border rounded transition ${
                fork ? "border-stone-700 bg-stone-800 text-stone-50"
                     : "border-stone-400 text-stone-600 hover:bg-stone-200"}`}
              title="compare your hand against the baseline — what changed?">
              {fork ? "close fork" : "the fork"}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={advance}
            className="px-5 py-1.5 bg-stone-900 text-stone-50 rounded font-medium hover:bg-stone-700 transition">
            let a year pass →
          </button>
        </div>

        {/* the fork — divergence comparison */}
        {fork && (
          <section className="mb-5 bg-stone-50/80 border border-stone-400 rounded p-4 font-mono text-[13px] leading-relaxed">
            <h2 className="text-sm font-bold tracking-widest text-stone-700 mb-3 font-serif">
              The Fork
              <span className="text-xs font-normal text-stone-500 ml-2">what your hand changed by year {world.year}</span>
            </h2>

            {fork.fates.length === 0 && fork.houses.length === 0 ? (
              <p className="text-stone-500 italic font-serif">Your hand bent the same arcs. No fates diverged — yet.</p>
            ) : (
              <>
                {fork.fates.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-xs uppercase tracking-widest text-stone-500 mb-1.5">Fates That Diverged</h3>
                    <div className="space-y-1.5">
                      {fork.fates.map((f: ForkFate, i: number) => (
                        <div key={i}>
                          <span className="font-semibold">{f.name}</span>
                          <span className="text-stone-500"> of {f.house}</span>
                          <div className="ml-4">
                            <div className="text-stone-500">○ {fateText(f.baseline)}</div>
                            <div className="text-yellow-700">● {fateText(f.hand)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fork.houses.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-xs uppercase tracking-widest text-stone-500 mb-1.5">Houses</h3>
                    <div className="space-y-0.5">
                      {fork.houses.map((h: ForkHouse) => (
                        <div key={h.name}>
                          <span className="font-semibold">{h.name}</span>
                          <span className="text-stone-500 ml-2">○ {h.baseline === 0 ? "extinct" : `${h.baseline} living`}</span>
                          <span className="text-yellow-700 ml-2">● {h.hand === 0 ? "extinct" : `${h.hand} living`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="text-xs text-stone-500 border-t border-stone-300 pt-2 mt-2 flex gap-6">
              <span>○ Baseline: {fork.baseline.living} living, {fork.baseline.dead} lost</span>
              <span className="text-yellow-700">● Your hand: {fork.hand.living} living, {fork.hand.dead} lost</span>
            </div>
          </section>
        )}

        {/* favorite banner — the operationalized "do you care?" signal */}
        {favAgent && (
          <div className={`mb-4 px-4 py-2 rounded border ${favFell
            ? "bg-red-50 border-red-300 text-red-900"
            : "bg-yellow-50 border-yellow-300 text-yellow-900"}`}>
            {favFell
              ? <>★ <b>{favAgent.name}{favAgent.epithet ? ` ${favAgent.epithet}` : ""} of {favAgent.house}</b> — the one you watched — is gone. The world did not spare them for being loved.</>
              : <>★ You are watching <b>{favAgent.name}{favAgent.epithet ? ` ${favAgent.epithet}` : ""} of {favAgent.house}</b>, age {favAgent.age}, {favAgent.trait.toLowerCase()}{favAgent.grain < 1 ? " — and hungry." : "."}</>}
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_320px] gap-6">

          {/* the chronicle */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-2">The Chronicle</h2>
            <div className="bg-stone-50/70 border border-stone-300 rounded p-4 h-[460px] overflow-y-auto font-mono text-[13px] leading-relaxed flex flex-col-reverse">
              <div>
                {world.chronicle.map((e: ChronicleEvent, i: number) => (
                  <div key={i} className="mb-1.5">
                    <span className="text-stone-400 select-none mr-2">{String(e.year).padStart(3, "·")}</span>
                    <span className={KIND_STYLE[e.kind] || ""}>{e.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Gold lines are <span className="text-yellow-700 font-medium">your hand</span>. Everything else, the world authored alone.
            </p>
          </section>

          {/* roster + feuds + intervention */}
          <aside>
            {/* intervention */}
            <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-2">
              Your Hand {world.token ? <span className="text-yellow-700">· available</span> : <span className="text-stone-400">· spent (every 3rd year)</span>}
            </h2>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VERBS.map(([v, label]) => (
                <button key={v} disabled={!world.token}
                  onClick={() => { setPending(pending === v ? null : v); setPickTwo(null); }}
                  className={`px-2 py-1 text-xs rounded border transition ${
                    pending === v ? "bg-yellow-600 text-white border-yellow-700"
                    : world.token ? "border-stone-400 hover:bg-stone-200"
                    : "border-stone-200 text-stone-300 cursor-not-allowed"}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500 mb-4 h-8">
              {pending
                ? pickTwo
                  ? `…now choose the second soul (${world.agents[pickTwo]?.name}) acts upon`
                  : "…choose a soul below"
                : "Pick an act, then a soul. Or click a soul to ★ watch them."}
            </p>

            {/* roster */}
            <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-2">The Living</h2>
            <div className="space-y-1 mb-4 max-h-[230px] overflow-y-auto pr-1">
              {roster.map((a: Agent) => (
                <button key={a.id} onClick={() => onAgentClick(a)}
                  className={`w-full text-left px-2 py-1 rounded text-sm flex items-center justify-between transition
                    ${favorite === a.id ? "bg-yellow-100 ring-1 ring-yellow-400" : "hover:bg-stone-200"}
                    ${pickTwo === a.id ? "ring-1 ring-yellow-500" : ""}`}>
                  <span>
                    <span className="text-stone-400 mr-1">{favorite === a.id ? "★" : "·"}</span>
                    <b>{a.name}</b>{a.epithet && <span className="text-amber-800"> {a.epithet}</span>} <span className="text-stone-500">of {a.house}</span>
                  </span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {a.trait[0]}·{a.age}{a.grain < 1 ? " ·hungry" : ""}{a.partner ? " ·♥" : ""}
                  </span>
                </button>
              ))}
            </div>

            {/* feuds */}
            <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-2">Standing Feuds</h2>
            {feuds.length ? (
              <div className="space-y-1">
                {feuds.map(([k, v]) => {
                  const [h1, h2] = k.split("|");
                  return (
                    <div key={k} className="text-sm flex items-center justify-between">
                      <span>{h1} <span className="text-red-700">⚔</span> {h2}</span>
                      <span className="text-xs text-red-800">{"●".repeat(Math.min(v, 6))}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-stone-400">None yet. Give it time.</p>}

            {/* intervention log */}
            {world.interventions.length > 0 && (
              <>
                <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-2 mt-4">Intervention Log</h2>
                <div className="text-xs font-mono bg-stone-50 border border-stone-300 rounded p-2 max-h-[120px] overflow-y-auto">
                  {world.interventions.map((iv: InterventionLog, i: number) => (
                    <div key={i} className="text-yellow-800">
                      Yr {iv.year}: {iv.verb} → {iv.targetName}{iv.secondName ? ` & ${iv.secondName}` : ""}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const data = JSON.stringify({ seed: world.seed, interventions: world.interventions }, null, 2);
                    navigator.clipboard.writeText(data);
                  }}
                  className="mt-1.5 px-2 py-1 text-xs border border-stone-400 rounded hover:bg-stone-200 transition w-full">
                  copy log JSON
                </button>
              </>
            )}
          </aside>
        </div>

        <footer className="mt-6 pt-3 border-t border-stone-300 text-xs text-stone-500">
          The test: do you find yourself <i>not wanting</i> someone to die? Star them, then let years pass.
          Then <b>replay seed</b> with a different hand and watch the history fork. That fork is your agency, made legible.
        </footer>
      </div>
    </div>
  );
}
