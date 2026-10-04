import { useState } from "react";
import { Link } from "react-router-dom";
import TrafficCanvas from "../../components/TrafficSimulator/TrafficCanvas";
import TrafficControls from "../../components/TrafficSimulator/TrafficControls";
import ParameterPanel from "../../components/TrafficSimulator/ParameterPanel";
import MetricsPanel from "../../components/TrafficSimulator/MetricsPanel";
import { useTrafficSimulation } from "../../components/TrafficSimulator/useTrafficSimulation";
import { presets } from "../../components/TrafficSimulator/model/presets";
import type { Focus } from "../../components/TrafficSimulator/renderer";
import "./TrafficSimulator.css";

const clockTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function TrafficSimulator() {
  const simulation = useTrafficSimulation();
  const [focus, setFocus] = useState<Focus>("corridor");
  const { stats } = simulation;
  const preset = presets.find((p) => p.id === simulation.scenario) ?? presets[0];
  const signalSummary = stats.intersections
    .map((i) => `signal ${i.index + 1} ${i.ew === "red" ? "north–south" : "east–west"} ${i.ew === "red" ? i.ns : i.ew}`)
    .join(", ");
  return (
    <div className="page-content traffic-page">
      <div className="traffic-container">
        <header className="traffic-header prose-surface">
          <Link to="/simulations">← Simulations</Link>
          <p className="traffic-eyebrow">Signals / queues / emergence</p>
          <h1>Traffic Simulator</h1>
          <p>
            Three signals on a two-lane arterial. Every driver follows the same few rules. Change
            the demand or the timing, and congestion or coordination follows.
          </p>
        </header>
        <TrafficControls simulation={simulation} focus={focus} setFocus={setFocus} />
        <div className="traffic-workspace">
          <section className="traffic-panel traffic-field" aria-label="Traffic corridor">
            <div className="traffic-status">
              <span>{simulation.playing ? "Running" : "Paused"}</span>
              <span>
                Elapsed <output aria-label="Elapsed simulated time">{clockTime(stats.time)}</output>
              </span>
              <span>{simulation.plan.mode === "fixed" ? "Fixed-time signals" : "Actuated signals"}</span>
            </div>
            <TrafficCanvas
              engine={simulation.engine}
              playing={simulation.playing}
              focus={focus}
              frameKey={stats.time}
              waiting={simulation.waiting}
              label={`Traffic corridor at ${clockTime(stats.time)}: ${stats.onRoad} vehicles on the road, ${stats.stopped} stopped; ${signalSummary}. Exact figures are in the measurements below.`}
            />
            <ul className="traffic-legend" aria-label="Legend">
              <li>
                <span className="traffic-swatch traffic-swatch-moving" aria-hidden="true" />
                Moving
              </li>
              <li>
                <span className="traffic-swatch traffic-swatch-slow" aria-hidden="true" />
                Under 18 km/h
              </li>
              <li>
                <span className="traffic-swatch traffic-swatch-stopped" aria-hidden="true" />
                Stopped
              </li>
              <li>Dots: signal heads (barred when not green)</li>
              <li>+N: cars waiting to enter</li>
            </ul>
          </section>
          <ParameterPanel simulation={simulation} />
        </div>
        {simulation.limited && (
          <p role="status" className="traffic-note">
            This device can’t keep up with the chosen speed, so simulated time is running slower
            than requested. Lower the speed for smoother playback.
          </p>
        )}
        <MetricsPanel simulation={simulation} />
        <section className="traffic-panel traffic-context" aria-labelledby="traffic-experiment-title">
          <div>
            <h2 id="traffic-experiment-title">Try an experiment</h2>
            <p>{preset.description}</p>
            <p>{preset.experiment}</p>
            <p>
              Restart run clears the road but keeps your settings and the same arrival sequence,
              so two runs that differ only in timing see identical traffic.
            </p>
          </div>
          <div>
            <h2>About the model</h2>
            <p>
              Each driver accelerates toward their own preferred speed and brakes for whatever is
              directly ahead: the car in front, or a stop line they must not cross (Intelligent
              Driver Model). Cars arrive at random but reproducibly, enter the lane with more room,
              and travel straight through. There are no turns and no lane changes.
            </p>
            <p>
              Drivers stop on red, and on yellow when they can do so comfortably. They don’t enter
              an intersection still held by crossing traffic, or one they can’t clear because the
              queue beyond it reaches back. No queue or jam is scripted; they come from these rules
              and the signal timing.
            </p>
            <p>
              Blocks are 200 m apart and the limit is 50 km/h. Vehicle sizes and lane widths are
              drawn to scale. When reduced motion is preferred, the simulation starts paused; Step 1 s
              advances it without animation.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
