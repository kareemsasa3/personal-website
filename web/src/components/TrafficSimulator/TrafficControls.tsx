import type { CSSProperties } from "react";
import { scenarios, type ControlSpec } from "./model/scenarios";
import { SPEEDS } from "./model/clock";
import type { Coordination } from "./model/signals";
import type { TrafficSimulation } from "./useTrafficSimulation";
import { pageStepHandler } from "../../utils/sliderPageStep";

const formatValue = (control: ControlSpec, value: number) =>
  control.unit === "%" ? `${Math.round(value * 100)}%` : `${value}${control.unit ? ` ${control.unit}` : ""}`;

// §06: the readout is Machine text with its unit beside it as a label (the same words as formatValue).
function SliderValue({ control, value }: { control: ControlSpec; value: number }) {
  if (control.unit === "%") {
    return (
      <>
        {Math.round(value * 100)}
        <span className="df-label-sm">%</span>
      </>
    );
  }
  return (
    <>
      {value}
      {control.unit && (
        <>
          {" "}
          <span className="df-label-sm">{control.unit}</span>
        </>
      )}
    </>
  );
}

// §13 Direct manipulation: one mark per step along the range. The count is data from the control, not a design value.
const stepCount = (control: ControlSpec) => Math.round((control.max - control.min) / control.step);

// The marks between the two ends, each its own box, so each lands on whole pixels (a gradient would blur them). The ends
// are drawn by the input itself. Decorative: the input carries the value and its range.
function RangeTicks({ steps }: { steps: number }) {
  return (
    <span className="traffic-range-ticks" aria-hidden="true">
      {Array.from({ length: Math.max(0, steps - 1) }, (_, i) => (
        <span key={i} style={{ "--df-range-tick": i + 1 } as CSSProperties} />
      ))}
    </span>
  );
}

export default function TrafficControls({ simulation }: { simulation: TrafficSimulation }) {
  const { scenario, params } = simulation;
  // §13 Disabled: Play stays focusable while it cannot act, and names the alert that says why.
  const blocked = Boolean(simulation.error);
  return (
    <section className="traffic-panel traffic-controls" aria-label="Simulation controls">
      <div className="traffic-control-row">
        <label className="traffic-label df-label-sm">
          <span id="traffic-scenario-label">Scenario</span>
          <select
            className="df-field df-data"
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
            className="traffic-primary df-control df-label"
            onClick={() => {
              if (!blocked) simulation.toggle();
            }}
            aria-disabled={blocked || undefined}
            aria-describedby={blocked ? "traffic-error" : undefined}
          >
            {simulation.playing ? "Pause" : "Play"}
          </button>
          <button
            className="df-control df-label"
            onClick={() => simulation.restart()}
            title="Same settings, same arriving traffic"
          >
            Restart run
          </button>
          <button className="df-control df-label" onClick={simulation.restoreDefaults}>
            Restore defaults
          </button>
          {scenario.topology === "ring" && (
            <button className="df-control df-label" onClick={simulation.perturb}>
              Brake one car
            </button>
          )}
        </div>
        <label className="traffic-label df-label-sm">
          <span id="traffic-speed-label">Playback</span>
          <select
            className="df-field df-data"
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
          <label className="traffic-label df-label-sm">
            <span id="traffic-coordination-label">Signal coordination</span>
            <select
              className="df-field df-data"
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
              <span id={`traffic-${control.key}-label`} className="df-label-sm">
                {control.label}
              </span>
              <output className="df-data" htmlFor={`traffic-${control.key}`}>
                <SliderValue control={control} value={params[control.key]} />
              </output>
            </span>
            <span className="traffic-range" style={{ "--df-range-steps": stepCount(control) } as CSSProperties}>
              <RangeTicks steps={stepCount(control)} />
              <input
                id={`traffic-${control.key}`}
                className="df-range"
                type="range"
                aria-labelledby={`traffic-${control.key}-label`}
                aria-valuetext={formatValue(control, params[control.key])}
                min={control.min}
                max={control.max}
                step={control.step}
                value={params[control.key]}
                onChange={(e) => simulation.setParam(control.key, Number(e.target.value))}
                onKeyDown={pageStepHandler(params[control.key], control.min, control.max, control.step, (next) =>
                  simulation.setParam(control.key, next),
                )}
              />
            </span>
            {control.resets && <small className="df-body-sm">Changing this restarts the run.</small>}
          </label>
        ))}
      </div>
    </section>
  );
}
