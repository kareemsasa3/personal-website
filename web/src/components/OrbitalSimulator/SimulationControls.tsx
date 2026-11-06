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
  // §13 Disabled: Play stays focusable while it cannot act, and names the note or alert that says why.
  const blocked = editing || Boolean(simulation.error);
  const reasons = [
    simulation.error && "orbital-error",
    editing && "orbital-editing-note",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section
      className="orbital-panel orbital-controls"
      aria-label="Simulation controls"
    >
      <label className="orbital-label df-label-sm">
        <span id="orbital-scenario-label">Scenario</span>
        <select
          className="df-field df-data"
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
          className="orbital-primary df-control df-label"
          onClick={() => {
            if (!blocked) simulation.toggle();
          }}
          aria-disabled={blocked || undefined}
          aria-describedby={reasons || undefined}
        >
          {simulation.playing ? "Pause" : "Play"}
        </button>
        <button className="df-control df-label" onClick={() => onReset()}>
          Reset scenario
        </button>
      </div>
      <label className="orbital-label df-label-sm">
        <span id="orbital-speed-label">Simulation speed</span>
        <select
          className="df-field df-data"
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
      <label className="orbital-checkbox df-control df-control--latch df-label">
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
