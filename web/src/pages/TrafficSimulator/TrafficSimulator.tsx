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

// §06: each key names its band in the label voice beside its range as Machine text. The swatches mirror the renderer's
// speed ramp (P5-2 hold).
function SpeedLegend() {
  return (
    <ul className="traffic-legend" aria-label="Vehicle shading by speed, as a share of the speed limit">
      {SPEED_BINS.map((bin, index) => (
        <li key={bin.label}>
          <span className={`traffic-swatch traffic-swatch-${index}`} aria-hidden="true" />
          <span className="traffic-legend-name df-label-sm">{bin.label}</span>
          <span className="traffic-legend-range df-data">
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
  // §05: a value that is changing now is Live (the shared grammar's signal and weight step).
  const live = simulation.playing ? " df-data--live" : "";
  return (
    <div className="page-content traffic-page">
      <div className="traffic-container">
        <header className="traffic-header prose-surface">
          <Link className="traffic-back df-control df-control--light df-label" to="/simulations">← Simulations</Link>
          <p className="traffic-eyebrow df-body-sm">Local rules / queues / emergent congestion</p>
          <h1 className="df-heading-1">Traffic Simulator</h1>
          <p className="traffic-lead df-prose df-body-lg">
            Every driver follows the same few rules about gaps and speed. Retime
            a signal, narrow the road, or add a car, and watch the whole road answer.
          </p>
        </header>
        <TrafficControls simulation={simulation} />
        <div className="traffic-workspace">
          <section className="traffic-panel traffic-field" aria-label="Road">
            {/* §06: Instrument labels beside Machine values (the elapsed pair sits on one data line); §05: the elapsed time
                is Live while running. */}
            <div className="traffic-status">
              <span className={`df-label-sm df-context${simulation.playing ? " df-context--live" : ""}`}>
                {simulation.playing ? "Running" : "Paused"}
              </span>
              <span className="df-label-sm">{scenario.name}</span>
              <span className="df-data">
                <span className="df-label-sm">Elapsed</span>{" "}
                <output className={`traffic-value df-data${live}`} aria-label="Elapsed simulated time" aria-live="off">
                  {elapsed(state.metrics.time)}
                </output>
              </span>
            </div>
            <RoadCanvas engine={simulation.engine} playing={simulation.playing} revision={state} />
            <div className="traffic-field-footer">
              <SpeedLegend />
              <p className="traffic-note df-body-sm">
                {scenario.topology === "ring"
                  ? "Cars circle clockwise; the detector at the top counts throughput."
                  : `The road folds into rows that read left to right. Traffic enters at the top left and exits at the bottom right.${scenario.signals.length ? " Signal bars show each stop line's state." : ""}`}
              </p>
            </div>
          </section>
          <TrafficReadout simulation={simulation} />
        </div>
        {(simulation.error || simulation.limited) && (
          <div className="traffic-messages">
            {simulation.error && (
              <p id="traffic-error" className="traffic-panel traffic-warning df-error df-body-sm" role="alert">
                {simulation.error}
              </p>
            )}
            {simulation.limited && (
              <p role="status" className="traffic-note df-warning df-body-sm">
                Step budget reached: simulated time is advancing slower than
                requested. Lower the playback speed for smoother motion.
              </p>
            )}
          </div>
        )}
        <div className="traffic-charts">
          <section className="traffic-panel df-body-sm" aria-labelledby="traffic-spacetime-title">
            <h2 id="traffic-spacetime-title" className="df-heading-3">
              Time-space diagram
            </h2>
            <p className="traffic-note df-body-sm">
              Each dot is one vehicle at one moment: time runs left to right,
              position bottom to top. Rising streaks are moving traffic; dark
              bands that slide backward are queues and stop-and-go waves.
            </p>
            <SpaceTimeCanvas engine={simulation.engine} playing={simulation.playing} revision={state} />
          </section>
          <section className="traffic-panel df-body-sm" aria-labelledby="traffic-throughput-title">
            <h2 id="traffic-throughput-title" className="df-heading-3">
              Throughput, veh/h
            </h2>
            <p className="traffic-note df-body-sm">
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
        <section className="traffic-panel traffic-context df-body df-prose-links" aria-labelledby="traffic-experiment-title">
          <div>
            <h2 id="traffic-experiment-title" className="df-heading-3">
              Try an experiment
            </h2>
            <p>{scenario.description}</p>
            <p>{scenario.experiment}</p>
          </div>
          <div>
            <h2 className="df-heading-3">About the model</h2>
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
