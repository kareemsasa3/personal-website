import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/useTheme";
import {
  SPACE_TIME_HEIGHT,
  SPACE_TIME_WINDOW,
  SpaceTimeDots,
  drawSpaceTime,
  spaceTimeFrame,
} from "./renderer";
import type { TrafficEngine } from "./model/engine";

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
    </>
  );
}
