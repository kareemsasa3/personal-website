import { useCallback, useEffect, useState } from "react";
import { SimulationClock } from "./model/clock";
import { TrafficEngine, type Demand } from "./model/engine";
import { presets, type TrafficPreset } from "./model/presets";
import type { SignalPlan } from "./model/signals";

const READOUT_INTERVAL = 250; // ms; the canvas draws every frame, React does not.
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const createEngine = (preset: TrafficPreset, demand = preset.demand, plan = preset.plan) =>
  new TrafficEngine({ demand, plan, seed: preset.seed });

export function useTrafficSimulation() {
  const [engine] = useState(() => ({ current: createEngine(presets[0]) }));
  const [clock] = useState(() => new SimulationClock());
  const [scenario, setScenario] = useState(presets[0].id);
  const [demand, setDemandState] = useState<Demand>(presets[0].demand);
  const [plan, setPlanState] = useState<SignalPlan>(presets[0].plan);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [speed, setSpeed] = useState(1);
  const [limited, setLimited] = useState(false);
  const snapshot = useCallback(
    () => ({
      stats: engine.current.stats(),
      history: engine.current.history.slice(),
      waiting: engine.current.waitingByEntry(),
    }),
    [engine],
  );
  const [state, setState] = useState(snapshot);
  const update = useCallback(() => setState(snapshot()), [snapshot]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pause = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener("change", pause);
    return () => preference.removeEventListener("change", pause);
  }, []);

  // The loop exists only while playing, so a paused simulator costs nothing.
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      previous: number | null = null,
      lastReadout = 0,
      lastSteps = -1,
      limitedUntil = 0;
    clock.reset();
    const visibility = () => {
      previous = null;
      clock.reset();
    };
    document.addEventListener("visibilitychange", visibility);
    const animate = (now: number) => {
      const elapsed = previous === null ? 0 : (now - previous) / 1000;
      previous = now;
      if (!document.hidden && clock.advance(elapsed, speed, () => engine.current.step()))
        limitedUntil = now + 1000;
      if (now - lastReadout >= READOUT_INTERVAL && engine.current.steps !== lastSteps) {
        lastSteps = engine.current.steps;
        lastReadout = now;
        update();
        setLimited(now < limitedUntil);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      setLimited(false);
    };
  }, [playing, speed, clock, engine, update]);

  const load = (preset: TrafficPreset, nextDemand: Demand, nextPlan: SignalPlan) => {
    engine.current = createEngine(preset, nextDemand, nextPlan);
    clock.reset();
    setScenario(preset.id);
    setDemandState(nextDemand);
    setPlanState(nextPlan);
    update();
  };
  const current = () => presets.find((p) => p.id === scenario) ?? presets[0];

  return {
    engine,
    scenario,
    demand,
    plan,
    playing,
    speed,
    limited,
    ...state,
    setSpeed,
    toggle: () => {
      if (playing) update(); // show the exact state playback stopped on
      setPlaying(!playing);
    },
    /** Advance one simulated second while paused. */
    stepOnce: () => {
      engine.current.run(1);
      update();
    },
    /** Preset defaults. */
    reset: (id = scenario) => {
      const preset = presets.find((p) => p.id === id) ?? presets[0];
      load(preset, preset.demand, preset.plan);
    },
    /** Empty roads, same arrivals, current settings: for side-by-side comparisons. */
    restart: () => load(current(), demand, plan),
    setDemand: (changes: Partial<Demand>) => {
      const next = { ...demand, ...changes };
      engine.current.setDemand(next);
      setDemandState(next);
    },
    setPlan: (changes: Partial<SignalPlan>) => {
      const next = { ...plan, ...changes };
      engine.current.setPlan(next);
      setPlanState(next);
    },
  };
}
export type TrafficSimulation = ReturnType<typeof useTrafficSimulation>;
