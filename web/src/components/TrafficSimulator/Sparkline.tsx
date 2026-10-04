import { useState } from "react";

const WIDTH = 300,
  HEIGHT = 72,
  PAD = 4;

/** Single-series trend line with a hover readout. Values are shown as text alongside. */
export default function Sparkline({
  title,
  unit,
  points,
  span,
}: {
  title: string;
  unit: string;
  points: readonly { time: number; value: number }[];
  /** Seconds of history the x-axis covers. */
  span: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const latest = points[points.length - 1];
  const end = latest?.time ?? 0;
  const max = Math.max(1, ...points.map((p) => p.value)) * 1.1;
  const x = (time: number) => PAD + ((time - (end - span)) / span) * (WIDTH - 2 * PAD);
  const y = (value: number) => HEIGHT - PAD - (value / max) * (HEIGHT - 2 * PAD);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const shown = hover === null ? latest : points[hover];
  const format = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
  return (
    <figure className="traffic-spark">
      <figcaption>
        <span>{title}</span>
        <span className="traffic-spark-value">
          {shown ? `${format(shown.value)} ${unit}` : "—"}
          {hover !== null && shown ? ` at ${Math.floor(shown.time / 60)}:${String(Math.floor(shown.time % 60)).padStart(2, "0")}` : ""}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerMove={(e) => {
          if (!points.length) return;
          const bounds = e.currentTarget.getBoundingClientRect();
          const time = end - span + ((e.clientX - bounds.left) / bounds.width) * span;
          let best = 0;
          points.forEach((p, i) => {
            if (Math.abs(p.time - time) < Math.abs(points[best].time - time)) best = i;
          });
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <line className="traffic-spark-base" x1={PAD} x2={WIDTH - PAD} y1={HEIGHT - PAD} y2={HEIGHT - PAD} />
        {points.length > 1 && <path className="traffic-spark-line" d={path} vectorEffect="non-scaling-stroke" />}
        {shown && hover !== null && (
          <line
            className="traffic-spark-cross"
            x1={x(shown.time)}
            x2={x(shown.time)}
            y1={PAD}
            y2={HEIGHT - PAD}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </figure>
  );
}
