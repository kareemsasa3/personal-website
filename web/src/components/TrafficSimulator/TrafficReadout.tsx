import type { ReactNode } from "react";
import { SIGNAL_COLORS } from "./renderer";
import type { TrafficSimulation } from "./useTrafficSimulation";

const kmh = (speed: number) => Math.round(speed * 3.6);

export default function TrafficReadout({ simulation }: { simulation: TrafficSimulation }) {
  const { scenario, state } = simulation;
  const m = state.metrics;
  const ring = scenario.topology === "ring";
  // §06: each value is Machine text with its unit beside it as a label. §05: while the simulation runs, a value that
  // changes takes the shared Live value class; a value that cannot change while it runs (fixed) never does.
  const live = simulation.playing ? " df-data--live" : "";
  const value = (text: string | number, unit?: string, fixed = false) => (
    <>
      <span className={fixed ? "traffic-value traffic-value--fixed df-data" : `traffic-value df-data${live}`}>{text}</span>
      {unit && (
        <>
          {" "}
          <span className="df-label-sm">{unit}</span>
        </>
      )}
    </>
  );
  // An empty measurement reads "—", which is not a changing value.
  const seconds = (time: number | null, fixed = false) =>
    time === null ? value("—", undefined, true) : value(Math.round(time), "s", fixed);
  const rows: Array<[string, ReactNode, string?]> = ring
    ? [
        ["Throughput at detector", value(Math.round(m.flow), "veh/h"), "Passages of the detector line over the last minute, scaled to an hour."],
        // The ring holds a fixed number of vehicles, so its density changes only when the run is rebuilt.
        ["Density", value(Math.round((m.onRoad / scenario.length) * 1000), "veh/km", true)],
        ["Mean speed", value(kmh(m.meanSpeed), "km/h")],
        ["Slowest vehicle", value(kmh(m.minSpeed), "km/h")],
        ["Stopped or crawling", <>{value(m.queued)} of {value(m.onRoad, undefined, true)}</>, "Vehicles below 7 km/h."],
      ]
    : [
        ["Throughput", value(Math.round(m.flow), "veh/h"), "Vehicles leaving the road over the last minute, scaled to an hour."],
        ["Mean speed", value(kmh(m.meanSpeed), "km/h")],
        ["On road", value(m.onRoad)],
        ["Queued", value(m.queued), "Vehicles below 7 km/h."],
        ["Waiting to enter", value(m.waiting), "Arrivals that could not yet fit onto the road."],
        // The free-flow time follows from the road's length and speed limit, so it is fixed.
        ["Trip time", <>{seconds(m.tripTime)} (free flow {seconds(m.freeFlowTripTime, true)})</>, "Mean of the last 50 trips, including any wait at the entrance."],
        ["Stops per trip", m.stopsPerTrip === null ? value("—", undefined, true) : value(m.stopsPerTrip.toFixed(2)), "Mean of the last 50 trips."],
        ...(scenario.lanes > 1 ? [["Lane changes", value(m.laneChanges)] as [string, ReactNode]] : []),
      ];
  // §05: the groups whose values change carry the Live marker on their heading while the simulation runs.
  const heading = `df-heading-3${simulation.playing ? " df-context--live" : ""}`;
  return (
    <aside className="traffic-panel traffic-readout-panel df-body-sm" aria-label="Live measurements">
      <h2 className={heading}>Measurements</h2>
      <dl className="traffic-metrics">
        {rows.map(([label, readout, hint]) => (
          <div key={label} title={hint}>
            <dt className="df-label-sm">{label}</dt>
            <dd>{readout}</dd>
          </div>
        ))}
      </dl>
      {state.signals.length > 0 && (
        <>
          <h2 className={heading}>Signals</h2>
          <ul className="traffic-signals">
            {state.signals.map((signal, index) => (
              <li key={signal.x}>
                {/* P5-2: the lamp mirrors the renderer's signal colours (a native hold); the state word carries the meaning. */}
                <span className="traffic-signal-lamp" style={{ background: SIGNAL_COLORS[signal.state] }} aria-hidden="true" />
                <span>
                  <span className="traffic-value traffic-value--fixed df-data">
                    S{index + 1} · {signal.x}
                  </span>{" "}
                  <span className="df-label-sm">m</span>
                </span>
                <span>
                  <span className="df-label-sm">{signal.state}</span> ·{" "}
                  <span className={`traffic-value df-data${live}`}>{Math.ceil(signal.remaining)}</span>{" "}
                  <span className="df-label-sm">s</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
