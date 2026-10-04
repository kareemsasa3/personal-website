import { presets } from "./model/presets";
import { SPEEDS } from "./model/clock";
import type { Focus } from "./renderer";
import type { TrafficSimulation } from "./useTrafficSimulation";

export default function TrafficControls({
  simulation,
  focus,
  setFocus,
}: {
  simulation: TrafficSimulation;
  focus: Focus;
  setFocus: (focus: Focus) => void;
}) {
  return (
    <section className="traffic-panel traffic-controls" aria-label="Simulation controls">
      <label className="traffic-scenario">
        <span id="traffic-scenario-label">Scenario</span>
        <select aria-labelledby="traffic-scenario-label" value={simulation.scenario} onChange={(e) => simulation.reset(e.target.value)}>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="traffic-actions">
        <button type="button" className="traffic-primary" onClick={simulation.toggle}>
          {simulation.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={simulation.stepOnce} disabled={simulation.playing}>
          Step 1 s
        </button>
        <button type="button" onClick={simulation.restart}>
          Restart run
        </button>
        <button type="button" onClick={() => simulation.reset()}>
          Reset scenario
        </button>
      </div>
      <label>
        <span id="traffic-speed-label">Speed</span>
        <select aria-labelledby="traffic-speed-label" value={simulation.speed} onChange={(e) => simulation.setSpeed(Number(e.target.value))}>
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}× real time
            </option>
          ))}
        </select>
      </label>
      <label>
        <span id="traffic-view-label">View</span>
        <select
          aria-labelledby="traffic-view-label"
          value={String(focus)}
          onChange={(e) =>
            setFocus(e.target.value === "corridor" ? "corridor" : (Number(e.target.value) as Focus))
          }
        >
          <option value="corridor">Whole corridor</option>
          <option value="0">Signal 1</option>
          <option value="1">Signal 2</option>
          <option value="2">Signal 3</option>
        </select>
      </label>
    </section>
  );
}
