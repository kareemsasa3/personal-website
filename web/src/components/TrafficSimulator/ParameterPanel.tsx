import type { ReactNode } from "react";
import { DEMAND_LIMITS } from "./model/engine";
import { PLAN_LIMITS, greenTimes, type ControlMode } from "./model/signals";
import type { TrafficSimulation } from "./useTrafficSimulation";

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="traffic-slider">
      <div className="traffic-slider-label">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} aria-live="off">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="traffic-group">
    <legend>{title}</legend>
    {children}
  </fieldset>
);

export default function ParameterPanel({ simulation }: { simulation: TrafficSimulation }) {
  const { demand, plan, setDemand, setPlan } = simulation;
  const fixed = plan.mode === "fixed";
  const green = greenTimes(plan);
  const perHour = (n: number) => `${n.toLocaleString("en-US")} veh/h`;
  return (
    <section className="traffic-panel traffic-parameters" aria-label="Traffic and signal settings">
      <Group title="Demand">
        <Slider
          id="traffic-eastbound"
          label="Eastbound"
          value={demand.eastbound}
          display={perHour(demand.eastbound)}
          min={DEMAND_LIMITS.eastbound[0]}
          max={DEMAND_LIMITS.eastbound[1]}
          step={50}
          onChange={(eastbound) => setDemand({ eastbound })}
        />
        <Slider
          id="traffic-westbound"
          label="Westbound"
          value={demand.westbound}
          display={perHour(demand.westbound)}
          min={DEMAND_LIMITS.westbound[0]}
          max={DEMAND_LIMITS.westbound[1]}
          step={50}
          onChange={(westbound) => setDemand({ westbound })}
        />
        <Slider
          id="traffic-cross"
          label="Each side-street approach"
          value={demand.cross}
          display={perHour(demand.cross)}
          min={DEMAND_LIMITS.cross[0]}
          max={DEMAND_LIMITS.cross[1]}
          step={25}
          onChange={(cross) => setDemand({ cross })}
        />
      </Group>
      <Group title="Signals">
        <label className="traffic-select">
          <span id="traffic-mode-label">Control</span>
          <select aria-labelledby="traffic-mode-label" value={plan.mode} onChange={(e) => setPlan({ mode: e.target.value as ControlMode })}>
            <option value="fixed">Fixed time</option>
            <option value="actuated">Vehicle actuated</option>
          </select>
        </label>
        <Slider
          id="traffic-cycle"
          label="Cycle length"
          value={plan.cycle}
          display={`${plan.cycle} s`}
          min={PLAN_LIMITS.cycle[0]}
          max={PLAN_LIMITS.cycle[1]}
          step={5}
          disabled={!fixed}
          onChange={(cycle) => setPlan({ cycle, offset: Math.min(plan.offset, cycle) })}
        />
        <Slider
          id="traffic-split"
          label="East–west green share"
          value={plan.split}
          display={`${Math.round(plan.split * 100)}% (${green.EW.toFixed(0)} s / ${green.NS.toFixed(0)} s)`}
          min={PLAN_LIMITS.split[0]}
          max={PLAN_LIMITS.split[1]}
          step={0.05}
          disabled={!fixed}
          onChange={(split) => setPlan({ split })}
        />
        <Slider
          id="traffic-offset"
          label="Offset between signals"
          value={plan.offset}
          display={`${plan.offset} s`}
          min={PLAN_LIMITS.offset[0]}
          max={plan.cycle}
          step={1}
          disabled={!fixed}
          onChange={(offset) => setPlan({ offset })}
        />
        <p className="traffic-note">
          {fixed
            ? "Each green and red follows the clock. Signal 2 starts its cycle one offset after signal 1, and signal 3 one offset after that."
            : "Detectors 35 m before each stop line hold a green while cars keep arriving, for at most 40 s, and switch once the other street is waiting."}{" "}
          Every change passes through 3 s of yellow and 2 s of all-red.
        </p>
      </Group>
    </section>
  );
}
