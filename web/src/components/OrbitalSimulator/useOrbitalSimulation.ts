import { useCallback, useEffect, useRef, useState } from "react";
import { OrbitalEngine } from "./physics/engine";
import { SimulationClock } from "./physics/clock";
import { diagnostics, cloneBodies, type Body } from "./physics/model";
import { presets } from "./physics/presets";
export function useOrbitalSimulation() {
  const [engine] = useState(() => ({
    current: new OrbitalEngine(presets[0].bodies),
  }));
  const [clock] = useState(() => new SimulationClock());
  const [scenario, setScenario] = useState(presets[0].id);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(0.25);
  const [error, setError] = useState("");
  const [limited, setLimited] = useState(false);
  const snapshot = useCallback(
    () => ({
      bodies: cloneBodies(engine.current.bodies),
      time: engine.current.time,
      ...diagnostics(engine.current.bodies),
      referenceEnergy: engine.current.referenceEnergy,
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
          if (
            clock.advance(elapsed, run.current.speed, () =>
              engine.current.step(),
            )
          )
            limitedUntil = now + 1000;
        } catch (cause) {
          run.current.playing = false;
          setPlaying(false);
          clock.reset();
          setError(
            cause instanceof Error
              ? cause.message
              : "Simulation stopped. Reset to recover.",
          );
          update();
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
  const reset = (id = scenario) => {
    const preset = presets.find((p) => p.id === id) ?? presets[0];
    engine.current = new OrbitalEngine(preset.bodies);
    clock.reset();
    setScenario(preset.id);
    setError("");
    setLimited(false);
    update();
  };
  const pause = () => {
    run.current.playing = false;
    setPlaying(false);
    clock.reset();
    update();
  };
  const edit = (
    id: string,
    values: Pick<Body, "mass" | "position" | "velocity">,
  ) => {
    engine.current.edit(id, values);
    setError("");
    clock.reset();
    update();
  };
  return {
    engine,
    scenario,
    playing,
    speed,
    error,
    limited,
    state,
    reset,
    pause,
    edit,
    setSpeed,
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
export type OrbitalSimulation = ReturnType<typeof useOrbitalSimulation>;
