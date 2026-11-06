import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HistoryPoint } from "./model/engine";

// The plot's height splits evenly between the three value ticks, so each tick lands on a whole pixel and the ticks
// fall on the grid (§09 Ticks).
const HEIGHT = 192;
const PAD = { left: 48, right: 16, top: 16, bottom: 32 };
const niceMax = (value: number) => {
  const step = value > 3000 ? 1000 : 500;
  return Math.max(step, Math.ceil(value / step) * step);
};
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
// §09 whole pixels: a hairline is centred half a pixel off the grid, so it covers exactly one pixel column or row.
const hair = (v: number) => Math.round(v) + 0.5;

/**
 * Throughput over time, with arrival demand as a dashed reference on the same veh/h axis. §15 Data visualisation: axes
 * are tick rails, gridlines sit at the lowest line level and the chart has no border; throughput, the quantity this
 * chart is about, is drawn in signal and demand, the reference it is measured against, in coolant. The flow is sampled, so the line steps: each sample holds until the next
 * (§12 Stepped or smooth). Pointing at the plot inspects a sample (§13 Inspect): a measuring line, brackets around the
 * sample's node and a readout beside it, with no change to the ground.
 */
export default function ThroughputChart({
  history,
  demand,
}: {
  history: HistoryPoint[];
  demand: number | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [unit, setUnit] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const readout = useRef<HTMLDivElement>(null);
  const [readoutWidth, setReadoutWidth] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    // Tick and bracket lengths are the grid unit token, read from the page.
    setUnit(parseFloat(getComputedStyle(element).getPropertyValue("--grid-unit")) || 0);
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  const points = history.filter((p) => p.time > 0);
  const right = Math.max(PAD.left + 10, Math.floor(width) - PAD.right);
  const bottom = HEIGHT - PAD.bottom;
  const maxY = niceMax(Math.max(demand ?? 0, ...points.map((p) => p.flow)));
  const first = points[0]?.time ?? 0,
    last = points[points.length - 1]?.time ?? 1;
  const span = Math.max(last - first, 10);
  const x = (t: number) => Math.round(PAD.left + ((t - first) / span) * (right - PAD.left));
  const y = (flow: number) => Math.round(bottom - (flow / maxY) * (bottom - PAD.top));
  // Sample-and-hold: from each sample the line runs level to the next sample's time, then steps to its value.
  const path = points.map((p, i) => (i ? `H${x(p.time)}V${y(p.flow)}` : `M${x(p.time)},${y(p.flow)}`)).join("");
  const ticks = [0, maxY / 2, maxY];
  // Tick rails: the value rail on the left with a tick at each value, the time rail along the bottom with a tick at
  // each end of the window.
  const axis =
    `M${hair(PAD.left)},${PAD.top}V${bottom + 1}M${PAD.left},${hair(bottom)}H${right}` +
    ticks.map((tick) => `M${PAD.left - unit},${hair(y(tick))}H${PAD.left}`).join("") +
    [PAD.left, right - 1].map((at) => `M${hair(at)},${bottom}V${bottom + unit}`).join("");
  const active = hover !== null ? points[hover] : null;
  const ax = active ? x(active.time) : 0,
    ay = active ? y(active.flow) : 0;
  const reach = Math.round(unit * 1.5);
  // Four corner brackets around the active sample (§13 Inspect), each two legs one grid unit long. Each leg is its own
  // run from the box's outer edge, so both legs cover the corner pixel whole (a joined corner would only part-cover it).
  const brackets = active
    ? [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]
        .map(([sx, sy]) => {
          const ox = ax + sx * reach,
            oy = ay + sy * reach;
          return `M${ox - sx * 0.5},${oy}V${oy - sy * unit}M${ox},${oy - sy * 0.5}H${ox - sx * unit}`;
        })
        .join("")
    : "";
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
  // The readout sits beside the measuring line, on the side with more room, and always inside the chart's box: when
  // neither side holds it, it is clamped to the box. Its left edge is a whole pixel (its measured width is rounded up).
  useLayoutEffect(() => {
    const w = readout.current ? Math.ceil(readout.current.getBoundingClientRect().width) : 0;
    if (w !== readoutWidth) setReadoutWidth(w);
  }, [active, readoutWidth]);
  const box = Math.floor(width);
  const gap = 2 * unit;
  const after = ax + gap,
    before = ax - gap - readoutWidth;
  const preferAfter = ax <= (PAD.left + right) / 2;
  const fitsAfter = after + readoutWidth <= box,
    fitsBefore = before >= 0;
  const readoutLeft = Math.round(
    (preferAfter ? fitsAfter : !fitsBefore && fitsAfter)
      ? after
      : fitsBefore
        ? before
        : Math.max(0, Math.min(box - readoutWidth, ax - readoutWidth / 2)),
  );
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
          {ticks.slice(1).map((tick) => (
            <line key={tick} className="traffic-chart-grid" x1={PAD.left + 1} x2={right} y1={hair(y(tick))} y2={hair(y(tick))} />
          ))}
          <path className="traffic-chart-axis" d={axis} />
          {ticks.map((tick) => (
            <text
              key={tick}
              className="traffic-chart-tick df-annotation"
              x={PAD.left - unit * 1.5}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {Math.round(tick)}
            </text>
          ))}
          <text className="traffic-chart-tick df-annotation" x={PAD.left} y={bottom + unit * 1.5} dominantBaseline="hanging">
            {clock(first)}
          </text>
          <text className="traffic-chart-tick df-annotation" x={right} y={bottom + unit * 1.5} textAnchor="end" dominantBaseline="hanging">
            {clock(last)}
          </text>
          {demand !== null && (
            <>
              <line className="traffic-chart-demand" x1={PAD.left + 1} x2={right} y1={hair(y(demand))} y2={hair(y(demand))} />
              <text className="traffic-chart-label" x={right} y={y(demand) - unit / 2} textAnchor="end">
                <tspan className="df-label-sm">demand</tspan> <tspan className="traffic-chart-label-value df-data">{demand}</tspan>
              </text>
            </>
          )}
          <path className="traffic-chart-line" d={path} />
          {active && (
            <>
              <path
                className="traffic-chart-cross"
                d={
                  (ay - reach > PAD.top ? `M${hair(ax)},${PAD.top}V${ay - reach}` : "") +
                  (ay + reach < bottom ? `M${hair(ax)},${ay + reach}V${bottom}` : "")
                }
              />
              <path className="traffic-chart-brackets" d={brackets} />
              <circle className="traffic-chart-node" cx={ax} cy={ay} />
            </>
          )}
          {/* Hit area larger than the line so hovering anywhere in the plot works. */}
          <rect x={PAD.left} y={PAD.top} width={right - PAD.left} height={bottom - PAD.top} fill="transparent" />
        </svg>
      )}
      {active && (
        <div ref={readout} className="traffic-chart-tooltip df-body-sm" style={{ left: readoutLeft }} role="status">
          <span>
            <span className="df-data">{Math.round(active.flow)}</span> <span className="df-label-sm">veh/h</span>
          </span>
          <span>
            <span className="df-label-sm">at</span> <span className="df-data">{clock(active.time)}</span> ·{" "}
            <span className="df-label-sm">mean</span> <span className="df-data">{Math.round(active.speed * 3.6)}</span>{" "}
            <span className="df-label-sm">km/h</span>
          </span>
        </div>
      )}
      {points.length > 0 && (
        <details className="traffic-table">
          <summary className="df-control df-control--latch df-label">Data table</summary>
          <table>
            <thead>
              <tr>
                <th scope="col" className="df-label-sm">Time</th>
                <th scope="col" className="df-label-sm">Throughput (veh/h)</th>
                <th scope="col" className="df-label-sm">Mean speed (km/h)</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(-12).reverse().map((p) => (
                <tr key={p.time}>
                  <td className="df-data">{clock(p.time)}</td>
                  <td className="df-data">{Math.round(p.flow)}</td>
                  <td className="df-data">{Math.round(p.speed * 3.6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
