import { useCallback, useEffect, useRef, useState } from "react";
import { TrafficEngine } from "./model/engine";
import { SimulationClock } from "./model/clock";
import { findScenario, scenarios, type TrafficParams } from "./model/scenarios";

export function useTrafficSimulation() {
  const [engine] = useState(() => ({ current: new TrafficEngine(scenarios[0]) }));
  const [clock] = useState(() => new SimulationClock());
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [params, setParamsState] = useState<TrafficParams>(scenarios[0].defaults);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(2);
  const [error, setError] = useState("");
  const [limited, setLimited] = useState(false);
  const snapshot = useCallback(
    () => ({
      metrics: engine.current.metrics(),
      signals: engine.current.signalStates(),
      history: engine.current.history.slice(),
    }),
    [engine],
  );
  const [state, setState] = useState(snapshot);
  const update = useCallback(() => setState(snapshot()), [snapshot]);
  const run = useRef({ playing, speed });
  useEffect(() => {
    run.current = { playing, speed };
    clock.reset();
  }, [playing, speed, clock]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pause = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener("change", pause);
    return () => preference.removeEventListener("change", pause);
  }, []);
  useEffect(() => {
    let frame = 0,
      previous: number | null = null,
      lastReadout = 0,
      limitedUntil = 0;
    const visibility = () => {
      previous = null;
      clock.reset();
    };
    document.addEventListener("visibilitychange", visibility);
    const animate = (now: number) => {
      const elapsed = previous === null ? 0 : (now - previous) / 1000;
      previous = now;
      if (run.current.playing && !document.hidden) {
        try {
          if (clock.advance(elapsed, run.current.speed, () => engine.current.step()))
            limitedUntil = now + 1000;
        } catch (cause) {
          run.current.playing = false;
          setPlaying(false);
          clock.reset();
          setError(cause instanceof Error ? cause.message : "Simulation stopped. Restart to recover.");
        }
      }
      if (now - lastReadout >= 100) {
        update();
        setLimited(now < limitedUntil);
        lastReadout = now;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [clock, engine, update]);

  /** Rebuilds the run. The same scenario and parameters replay the same arrivals. */
  const restart = (id: string = scenarioId, next?: TrafficParams) => {
    const scenario = findScenario(id);
    const values = next ?? (id === scenarioId ? params : scenario.defaults);
    try {
      engine.current = new TrafficEngine(scenario, values);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid parameters.");
      return;
    }
    clock.reset();
    setScenarioId(scenario.id);
    setParamsState({ ...values });
    setError("");
    setLimited(false);
    update();
  };

  const setParam = <K extends keyof TrafficParams>(key: K, value: TrafficParams[K]) => {
    const next = { ...params, [key]: value };
    const control = engine.current.scenario.controls.find((c) => c.key === key);
    if (control?.resets) {
      restart(scenarioId, next);
      return;
    }
    try {
      engine.current.setParams({ [key]: value });
      setParamsState(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid parameter.");
    }
    update();
  };

  return {
    engine,
    scenario: findScenario(scenarioId),
    params,
    playing,
    speed,
    error,
    limited,
    state,
    restart,
    setParam,
    setSpeed,
    restoreDefaults: () => restart(scenarioId, findScenario(scenarioId).defaults),
    perturb: () => {
      engine.current.perturb();
      update();
    },
    toggle: () => {
      if (!error) {
        run.current.playing = !playing;
        setPlaying(!playing);
        clock.reset();
        update();
      }
    },
  };
}

export type TrafficSimulation = ReturnType<typeof useTrafficSimulation>;
