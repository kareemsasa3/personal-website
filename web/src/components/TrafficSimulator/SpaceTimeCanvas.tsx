import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/useTheme";
import {
  SPACE_TIME_HEIGHT,
  SPACE_TIME_WINDOW,
  SpaceTimeDots,
  drawSpaceTime,
  spaceTimeFrame,
} from "./renderer";
import { slowStretches, type SlowStretch } from "./model/congestion";
import { DT } from "./model/idm";
import { SAMPLE_INTERVAL, type TrafficEngine } from "./model/engine";

const TABLE_AGES = [0, 30, 60, 90]; // s before the newest sample

const describe = (stretch: SlowStretch, length: number) => {
  const m = Math.round;
  const span =
    stretch.from <= stretch.to
      ? `${m(stretch.from)}–${m(stretch.to)} m`
      : `${m(stretch.from)}–${m(length)} m and 0–${m(stretch.to)} m`;
  return `${span} (${stretch.vehicles} vehicles)`;
};

interface SpaceTimeCanvasProps {
  engine: { current: TrafficEngine };
  playing: boolean;
  /** Changes whenever the simulation state does; redraws a paused diagram. */
  revision: unknown;
}

export default function SpaceTimeCanvas({ engine, playing, revision }: SpaceTimeCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<() => void>(() => {});
  const [dots] = useState(() => new SpaceTimeDots());
  const { theme } = useTheme();
  const [pointer, setPointer] = useState<{ ago: number; position: number } | null>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let width = 0,
      frame = 0,
      drawn: unknown = null,
      drawnWidth = 0;
    // Redraw only when a new sample lands or the size changes; dots are costly.
    draw.current = () => {
      const latest = engine.current.samples[engine.current.samples.length - 1] ?? engine.current;
      if (width <= 0 || (latest === drawn && width === drawnWidth)) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(width * dpr),
        h = Math.round(SPACE_TIME_HEIGHT * dpr);
      if (element.width !== w || element.height !== h) {
        element.width = w;
        element.height = h;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSpaceTime(context, engine.current, width, theme, dots);
      drawn = latest;
      drawnWidth = width;
    };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      if (!playing) draw.current();
    });
    resize.observe(element);
    if (playing) {
      const render = () => {
        draw.current();
        frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
    }
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [engine, theme, playing, dots]);
  useEffect(() => {
    if (!playing) draw.current();
  }, [playing, revision]);
  const readout = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const f = spaceTimeFrame(engine.current, bounds.width);
    const x = event.clientX - bounds.left,
      y = event.clientY - bounds.top;
    if (x < f.left || x > f.right || y < f.top || y > f.bottom) return setPointer(null);
    setPointer({
      ago: ((f.right - x) / (f.right - f.left)) * SPACE_TIME_WINDOW,
      position: ((f.bottom - y) / (f.bottom - f.top)) * engine.current.scenario.length,
    });
  };
  return (
    <>
      <canvas
        ref={canvas}
        className="traffic-spacetime"
        style={{ height: SPACE_TIME_HEIGHT }}
        role="img"
        aria-label="Time-space diagram of the last two minutes: each dot is one vehicle's position at one moment, shaded by speed. Bands along stop lines show signal states. Backward-sloping dark streaks are queues and stop-and-go waves."
        onPointerMove={readout}
        onPointerLeave={() => setPointer(null)}
      />
      <p className="traffic-note traffic-readout" aria-live="off">
        {pointer
          ? `${pointer.ago < 0.5 ? "now" : `${pointer.ago.toFixed(0)} s ago`} · ${Math.round(pointer.position)} m from the ${engine.current.scenario.topology === "ring" ? "detector" : "entrance"}`
          : "Point at the diagram to read time and position."}
      </p>
      <SlowTrafficTable engine={engine.current} />
    </>
  );
}

/** The diagram's dark bands as text: where traffic was slow at a few moments in the window. */
function SlowTrafficTable({ engine }: { engine: TrafficEngine }) {
  const { samples, scenario } = engine;
  const ring = scenario.topology === "ring";
  const rows = TABLE_AGES.flatMap((age) => {
    const sample = samples[samples.length - 1 - Math.round(age / (SAMPLE_INTERVAL * DT))];
    return sample ? [{ age, stretches: slowStretches(sample, scenario.length, ring) }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <details className="traffic-table">
      <summary>Data table</summary>
      <table className="traffic-slow-table">
        <caption>
          Slow traffic (below 30% of the speed limit), in metres from the {ring ? "detector" : "entrance"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Slow stretches</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ age, stretches }) => (
            <tr key={age}>
              <td>{age === 0 ? "now" : `${age} s ago`}</td>
              <td>{stretches.length ? stretches.map((s) => describe(s, scenario.length)).join("; ") : "none"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
