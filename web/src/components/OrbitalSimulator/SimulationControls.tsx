import { presets } from "./physics/presets";
import { SPEEDS } from "./physics/clock";
import type { OrbitalSimulation } from "./useOrbitalSimulation";
export default function SimulationControls({
  simulation,
  onReset,
  trails,
  setTrails,
  editing,
}: {
  simulation: OrbitalSimulation;
  onReset: (id?: string) => void;
  trails: boolean;
  setTrails: (value: boolean) => void;
  editing: boolean;
}) {
  return (
    <section
      className="orbital-panel orbital-controls"
      aria-label="Simulation controls"
    >
      <label>
        <span id="orbital-scenario-label">Scenario</span>
        <select
          aria-labelledby="orbital-scenario-label"
          value={simulation.scenario}
          onChange={(e) => onReset(e.target.value)}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="orbital-actions">
        <button
          className="orbital-primary"
          onClick={simulation.toggle}
          disabled={editing || Boolean(simulation.error)}
        >
          {simulation.playing ? "Pause" : "Play"}
        </button>
        <button onClick={() => onReset()}>Reset scenario</button>
      </div>
      <label>
        <span id="orbital-speed-label">Simulation speed</span>
        <select
          aria-labelledby="orbital-speed-label"
          value={simulation.speed}
          onChange={(e) => simulation.setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed} yr / second
            </option>
          ))}
        </select>
      </label>
      <label className="orbital-checkbox">
        <input
          type="checkbox"
          checked={trails}
          onChange={(e) => setTrails(e.target.checked)}
        />
        Show trails
      </label>
    </section>
  );
}
