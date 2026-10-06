import { scenarios, type ControlSpec } from "./model/scenarios";
import { SPEEDS } from "./model/clock";
import type { Coordination } from "./model/signals";
import type { TrafficSimulation } from "./useTrafficSimulation";

const formatValue = (control: ControlSpec, value: number) =>
  control.unit === "%" ? `${Math.round(value * 100)}%` : `${value}${control.unit ? ` ${control.unit}` : ""}`;

export default function TrafficControls({ simulation }: { simulation: TrafficSimulation }) {
  const { scenario, params } = simulation;
  return (
    <section className="traffic-panel traffic-controls" aria-label="Simulation controls">
      <div className="traffic-control-row">
        <label>
          <span id="traffic-scenario-label">Scenario</span>
          <select
            aria-labelledby="traffic-scenario-label"
            value={scenario.id}
            onChange={(e) => simulation.restart(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="traffic-actions">
          <button
            className="traffic-primary"
            onClick={simulation.toggle}
            disabled={Boolean(simulation.error)}
          >
            {simulation.playing ? "Pause" : "Play"}
          </button>
          <button onClick={() => simulation.restart()} title="Same settings, same arriving traffic">
            Restart run
          </button>
          <button onClick={simulation.restoreDefaults}>Restore defaults</button>
          {scenario.topology === "ring" && (
            <button onClick={simulation.perturb}>Brake one car</button>
          )}
        </div>
        <label>
          <span id="traffic-speed-label">Playback</span>
          <select
            aria-labelledby="traffic-speed-label"
            value={simulation.speed}
            onChange={(e) => simulation.setSpeed(Number(e.target.value))}
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}× real time
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="traffic-control-row traffic-sliders">
        {scenario.hasCoordination && (
          <label>
            <span id="traffic-coordination-label">Signal coordination</span>
            <select
              aria-labelledby="traffic-coordination-label"
              value={params.coordination}
              onChange={(e) => simulation.setParam("coordination", e.target.value as Coordination)}
            >
              <option value="green-wave">Green wave</option>
              <option value="simultaneous">Simultaneous</option>
              <option value="reverse">Reverse wave</option>
            </select>
          </label>
        )}
        {scenario.controls.map((control) => (
          <label key={control.key} className="traffic-slider">
            <span>
              <span id={`traffic-${control.key}-label`}>{control.label}</span>
              <output htmlFor={`traffic-${control.key}`}>{formatValue(control, params[control.key])}</output>
            </span>
            <input
              id={`traffic-${control.key}`}
              type="range"
              aria-labelledby={`traffic-${control.key}-label`}
              aria-valuetext={formatValue(control, params[control.key])}
              min={control.min}
              max={control.max}
              step={control.step}
              value={params[control.key]}
              onChange={(e) => simulation.setParam(control.key, Number(e.target.value))}
            />
            {control.resets && <small>Changing this restarts the run.</small>}
          </label>
        ))}
      </div>
    </section>
  );
}
