import { Link } from "react-router-dom";
import RoadCanvas from "../../components/TrafficSimulator/RoadCanvas";
import SpaceTimeCanvas from "../../components/TrafficSimulator/SpaceTimeCanvas";
import ThroughputChart from "../../components/TrafficSimulator/ThroughputChart";
import TrafficControls from "../../components/TrafficSimulator/TrafficControls";
import TrafficReadout from "../../components/TrafficSimulator/TrafficReadout";
import { useTrafficSimulation } from "../../components/TrafficSimulator/useTrafficSimulation";
import { SPEED_BINS } from "../../components/TrafficSimulator/renderer";
import "./TrafficSimulator.css";

const elapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function SpeedLegend() {
  return (
    <ul className="traffic-legend" aria-label="Vehicle shading by speed, as a share of the speed limit">
      {SPEED_BINS.map((bin, index) => (
        <li key={bin.label}>
          <span className={`traffic-swatch traffic-swatch-${index}`} aria-hidden="true" />
          {bin.label}
          <span className="traffic-legend-range">
            {index === 0 ? "<10%" : bin.max === Infinity ? "≥80%" : `<${Math.round(bin.max * 100)}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TrafficSimulator() {
  const simulation = useTrafficSimulation();
  const { scenario, state, params } = simulation;
  return (
    <div className="page-content traffic-page">
      <div className="traffic-container">
        <header className="traffic-header prose-surface">
          <Link to="/simulations">← Simulations</Link>
          <p className="traffic-eyebrow">Local rules / queues / emergent congestion</p>
          <h1>Traffic Simulator</h1>
          <p>
            Every driver follows the same few rules about gaps and speed. Retime
            a signal, narrow the road, or add a car, and watch the whole road answer.
          </p>
        </header>
        <TrafficControls simulation={simulation} />
        <div className="traffic-workspace">
          <section className="traffic-panel traffic-field" aria-label="Road">
            <div className="traffic-status">
              <span>{simulation.playing ? "Running" : "Paused"}</span>
              <span>{scenario.name}</span>
              <span>
                Elapsed <output aria-label="Elapsed simulated time" aria-live="off">{elapsed(state.metrics.time)}</output>
              </span>
            </div>
            <RoadCanvas engine={simulation.engine} playing={simulation.playing} revision={state} />
            <div className="traffic-field-footer">
              <SpeedLegend />
              <p className="traffic-note">
                {scenario.topology === "ring"
                  ? "Cars circle clockwise; the detector at the top counts throughput."
                  : `The road folds into rows that read left to right. Traffic enters at the top left and exits at the bottom right.${scenario.signals.length ? " Signal bars show each stop line's state." : ""}`}
              </p>
            </div>
          </section>
          <TrafficReadout simulation={simulation} />
        </div>
        {simulation.error && (
          <p className="traffic-panel traffic-warning" role="alert">
            {simulation.error}
          </p>
        )}
        {simulation.limited && (
          <p role="status" className="traffic-note">
            Step budget reached: simulated time is advancing slower than
            requested. Lower the playback speed for smoother motion.
          </p>
        )}
        <div className="traffic-charts">
          <section className="traffic-panel" aria-labelledby="traffic-spacetime-title">
            <h2 id="traffic-spacetime-title">Time-space diagram</h2>
            <p className="traffic-note">
              Each dot is one vehicle at one moment: time runs left to right,
              position bottom to top. Rising streaks are moving traffic; dark
              bands that slide backward are queues and stop-and-go waves.
            </p>
            <SpaceTimeCanvas engine={simulation.engine} playing={simulation.playing} revision={state} />
          </section>
          <section className="traffic-panel" aria-labelledby="traffic-throughput-title">
            <h2 id="traffic-throughput-title">Throughput, veh/h</h2>
            <p className="traffic-note">
              {scenario.topology === "ring"
                ? "Detector passages over the trailing minute, sampled every 10 s."
                : "Exits over the trailing minute, sampled every 10 s. When throughput sits below the dashed demand line, the road is not keeping up."}
            </p>
            <ThroughputChart
              history={state.history}
              demand={scenario.topology === "open" ? params.demand : null}
            />
          </section>
        </div>
        <section className="traffic-panel traffic-context" aria-labelledby="traffic-experiment-title">
          <div>
            <h2 id="traffic-experiment-title">Try an experiment</h2>
            <p>{scenario.description}</p>
            <p>{scenario.experiment}</p>
          </div>
          <div>
            <h2>About the model</h2>
            <p>
              Each driver accelerates toward a desired speed while keeping a
              safe time gap to whatever is ahead: another vehicle, a red or
              yellow stop line, or the end of a lane (the Intelligent Driver
              Model). Drivers change lanes when the move helps them more than
              it costs the drivers behind, weighted by politeness (MOBIL).
            </p>
            <p>
              On yellow, a driver who would need more than gentle braking to
              stop at the line continues through instead. Arrivals are random but seeded:
              Restart run replays the same traffic so settings can be compared
              fairly. Open roads start after a short warm-up so the road is not empty.
            </p>
            <p>
              This is a one-direction teaching model, not a calibrated traffic
              study. Motion starts paused when reduced motion is preferred.
            </p>
            <p>
              An agent built this simulator in an experiment comparing two
              prompts; it was reviewed and corrected before publication. Read{" "}
              <Link to="/case-studies/where-the-specification-lived">Where the Specification Lived</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
