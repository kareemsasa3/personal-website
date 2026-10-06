import { SIGNAL_COLORS } from "./renderer";
import type { TrafficSimulation } from "./useTrafficSimulation";

const kmh = (speed: number) => Math.round(speed * 3.6);
const seconds = (value: number | null) => (value === null ? "—" : `${Math.round(value)} s`);

export default function TrafficReadout({ simulation }: { simulation: TrafficSimulation }) {
  const { scenario, state } = simulation;
  const m = state.metrics;
  const ring = scenario.topology === "ring";
  const rows: Array<[string, string, string?]> = ring
    ? [
        ["Throughput at detector", `${Math.round(m.flow)} veh/h`, "Passages of the detector line over the last minute, scaled to an hour."],
        ["Density", `${Math.round((m.onRoad / scenario.length) * 1000)} veh/km`],
        ["Mean speed", `${kmh(m.meanSpeed)} km/h`],
        ["Slowest vehicle", `${kmh(m.minSpeed)} km/h`],
        ["Stopped or crawling", `${m.queued} of ${m.onRoad}`, "Vehicles below 7 km/h."],
      ]
    : [
        ["Throughput", `${Math.round(m.flow)} veh/h`, "Vehicles leaving the road over the last minute, scaled to an hour."],
        ["Mean speed", `${kmh(m.meanSpeed)} km/h`],
        ["On road", `${m.onRoad}`],
        ["Queued", `${m.queued}`, "Vehicles below 7 km/h."],
        ["Waiting to enter", `${m.waiting}`, "Arrivals that could not yet fit onto the road."],
        ["Trip time", `${seconds(m.tripTime)} (free flow ${seconds(m.freeFlowTripTime)})`, "Mean of the last 50 trips, including any wait at the entrance."],
        ["Stops per trip", m.stopsPerTrip === null ? "—" : m.stopsPerTrip.toFixed(2), "Mean of the last 50 trips."],
        ...(scenario.lanes > 1 ? [["Lane changes", `${m.laneChanges}`] as [string, string]] : []),
      ];
  return (
    <aside className="traffic-panel traffic-readout-panel" aria-label="Live measurements">
      <h2>Measurements</h2>
      <dl className="traffic-metrics">
        {rows.map(([label, value, hint]) => (
          <div key={label} title={hint}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {state.signals.length > 0 && (
        <>
          <h2>Signals</h2>
          <ul className="traffic-signals">
            {state.signals.map((signal, index) => (
              <li key={signal.x}>
                <span className="traffic-signal-lamp" style={{ background: SIGNAL_COLORS[signal.state] }} aria-hidden="true" />
                <span>
                  S{index + 1} · {signal.x} m
                </span>
                <span>
                  {signal.state} · {Math.ceil(signal.remaining)} s
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
