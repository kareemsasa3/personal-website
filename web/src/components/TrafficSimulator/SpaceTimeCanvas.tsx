import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/useTheme";
import {
  SPACE_TIME_HEIGHT,
  SPACE_TIME_WINDOW,
  drawSpaceTime,
  spaceTimeFrame,
} from "./renderer";
import type { TrafficEngine } from "./model/engine";

export default function SpaceTimeCanvas({ engine }: { engine: { current: TrafficEngine } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
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
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
    });
    resize.observe(element);
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const latest = engine.current.samples[engine.current.samples.length - 1] ?? engine.current;
      // Redraw only when a new sample lands or the size changes; dots are costly.
      if (width > 0 && (latest !== drawn || width !== drawnWidth)) {
        const w = Math.round(width * dpr),
          h = Math.round(SPACE_TIME_HEIGHT * dpr);
        if (element.width !== w || element.height !== h) {
          element.width = w;
          element.height = h;
        }
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawSpaceTime(context, engine.current, width, theme);
        drawn = latest;
        drawnWidth = width;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [engine, theme]);
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
