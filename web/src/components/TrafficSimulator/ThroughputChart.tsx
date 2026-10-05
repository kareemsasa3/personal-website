import { useEffect, useRef, useState } from "react";
import type { HistoryPoint } from "./model/engine";

const HEIGHT = 180;
const PAD = { left: 48, right: 12, top: 14, bottom: 26 };
const niceMax = (value: number) => {
  const step = value > 3000 ? 1000 : 500;
  return Math.max(step, Math.ceil(value / step) * step);
};
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

/** Throughput over time, with arrival demand as a dashed reference on the same veh/h axis. */
export default function ThroughputChart({
  history,
  demand,
}: {
  history: HistoryPoint[];
  demand: number | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  const points = history.filter((p) => p.time > 0);
  const right = Math.max(PAD.left + 10, width - PAD.right);
  const bottom = HEIGHT - PAD.bottom;
  const maxY = niceMax(Math.max(demand ?? 0, ...points.map((p) => p.flow)));
  const first = points[0]?.time ?? 0,
    last = points[points.length - 1]?.time ?? 1;
  const span = Math.max(last - first, 10);
  const x = (t: number) => PAD.left + ((t - first) / span) * (right - PAD.left);
  const y = (flow: number) => bottom - (flow / maxY) * (bottom - PAD.top);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(p.flow).toFixed(1)}`).join("");
  const ticks = [0, maxY / 2, maxY];
  const active = hover !== null ? points[hover] : null;
  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const t = first + ((event.clientX - bounds.left - PAD.left) / (right - PAD.left)) * span;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.time - t) < Math.abs(points[best].time - t)) best = i;
    });
    setHover(best);
  };
  return (
    <div ref={container} className="traffic-chart">
      {points.length < 2 ? (
        <p className="traffic-note">Throughput is sampled every 10 simulated seconds; the chart appears after two samples.</p>
      ) : (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Throughput over the last ${clock(span)} of simulated time. Latest ${Math.round(points[points.length - 1].flow)} vehicles per hour.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="traffic-chart-grid" x1={PAD.left} x2={right} y1={y(tick)} y2={y(tick)} />
              <text className="traffic-chart-tick" x={PAD.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {Math.round(tick)}
              </text>
            </g>
          ))}
          <text className="traffic-chart-tick" x={PAD.left} y={HEIGHT - 6}>
            {clock(first)}
          </text>
          <text className="traffic-chart-tick" x={right} y={HEIGHT - 6} textAnchor="end">
            {clock(last)}
          </text>
          {demand !== null && (
            <>
              <line className="traffic-chart-demand" x1={PAD.left} x2={right} y1={y(demand)} y2={y(demand)} />
              <text className="traffic-chart-label" x={right} y={y(demand) - 5} textAnchor="end">
                demand {demand}
              </text>
            </>
          )}
          <path className="traffic-chart-line" d={path} />
          {active && (
            <>
              <line className="traffic-chart-cross" x1={x(active.time)} x2={x(active.time)} y1={PAD.top} y2={bottom} />
              <circle className="traffic-chart-dot" cx={x(active.time)} cy={y(active.flow)} r={4} />
            </>
          )}
          {/* Hit area larger than the line so hovering anywhere in the plot works. */}
          <rect x={PAD.left} y={PAD.top} width={right - PAD.left} height={bottom - PAD.top} fill="transparent" />
        </svg>
      )}
      {active && (
        <div
          className="traffic-chart-tooltip"
          style={{ left: Math.min(Math.max(x(active.time), 70), width - 70) }}
          role="status"
        >
          <strong>{Math.round(active.flow)} veh/h</strong>
          <span>at {clock(active.time)} · mean {Math.round(active.speed * 3.6)} km/h</span>
        </div>
      )}
      {points.length > 0 && (
        <details className="traffic-table">
          <summary>Data table</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Throughput (veh/h)</th>
                <th scope="col">Mean speed (km/h)</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(-12).reverse().map((p) => (
                <tr key={p.time}>
                  <td>{clock(p.time)}</td>
                  <td>{Math.round(p.flow)}</td>
                  <td>{Math.round(p.speed * 3.6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
