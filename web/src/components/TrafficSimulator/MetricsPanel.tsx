import { HISTORY_CAPACITY, HISTORY_INTERVAL, METRIC_WINDOW } from "./model/engine";
import type { Light } from "./model/signals";
import Sparkline from "./Sparkline";
import type { TrafficSimulation } from "./useTrafficSimulation";

const lightLabel: Record<Light, string> = { green: "Green", yellow: "Yellow", red: "Red" };
const LightCell = ({ light }: { light: Light }) => (
  <td>
    <span className={`traffic-light traffic-light-${light}`} aria-hidden="true" />
    {lightLabel[light]}
  </td>
);
const groups = [
  { key: "EB", label: "Eastbound" },
  { key: "WB", label: "Westbound" },
  { key: "CROSS", label: "Side streets" },
] as const;

export default function MetricsPanel({ simulation }: { simulation: TrafficSimulation }) {
  const { stats, history } = simulation;
  const span = HISTORY_CAPACITY * HISTORY_INTERVAL;
  const tiles = [
    { label: "Throughput", value: stats.throughputPerMinute.toFixed(0), unit: "veh/min" },
    { label: "Average delay", value: stats.avgDelay.toFixed(0), unit: "s / trip" },
    { label: "Stops", value: stats.stopsPerTrip.toFixed(1), unit: "per trip" },
    { label: "On the road", value: String(stats.onRoad), unit: "vehicles" },
    { label: "Stopped", value: String(stats.stopped), unit: "vehicles" },
    { label: "Waiting to enter", value: String(stats.waiting), unit: "vehicles" },
  ];
  return (
    <section className="traffic-panel traffic-metrics" aria-labelledby="traffic-metrics-title">
      <h2 id="traffic-metrics-title">Live measurements</h2>
      <p className="traffic-note">
        Trip figures cover vehicles that finished in the last {METRIC_WINDOW} s. Delay is time lost
        against driving the route at the driver’s own free speed, including any wait to enter.
      </p>
      <dl className="traffic-tiles">
        {tiles.map((t) => (
          <div key={t.label}>
            <dt>{t.label}</dt>
            <dd>
              <span className="traffic-tile-value">{t.value}</span> {t.unit}
            </dd>
          </div>
        ))}
      </dl>
      <div className="traffic-sparks">
        <Sparkline
          title="Throughput"
          unit="veh/min"
          span={span}
          points={history.map((h) => ({ time: h.time, value: h.throughputPerMinute }))}
        />
        <Sparkline
          title="Stopped or waiting"
          unit="vehicles"
          span={span}
          points={history.map((h) => ({ time: h.time, value: h.queued }))}
        />
      </div>
      <p className="traffic-note">Trends cover the last {span / 60} minutes, sampled every {HISTORY_INTERVAL} s.</p>
      <div className="traffic-tables">
        <table>
          <caption>By direction</caption>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">veh/min</th>
              <th scope="col">Delay</th>
              <th scope="col">Stops</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ key, label }) => {
              const g = stats.groups[key];
              return (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{g.throughputPerMinute.toFixed(1)}</td>
                  <td>{g.completed ? `${g.avgDelay.toFixed(0)} s` : "—"}</td>
                  <td>{g.completed ? g.stopsPerTrip.toFixed(1) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <table>
          <caption>Signals and queues</caption>
          <thead>
            <tr>
              <th scope="col">Signal</th>
              <th scope="col">East–west</th>
              <th scope="col">Queue</th>
              <th scope="col">North–south</th>
              <th scope="col">Queue</th>
            </tr>
          </thead>
          <tbody>
            {stats.intersections.map((i) => (
              <tr key={i.index}>
                <th scope="row">{i.index + 1}</th>
                <LightCell light={i.ew} />
                <td>{i.ewQueue}</td>
                <LightCell light={i.ns} />
                <td>{i.nsQueue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
