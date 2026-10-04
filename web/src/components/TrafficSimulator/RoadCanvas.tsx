import { useEffect, useRef } from "react";
import { useTheme } from "../../contexts/useTheme";
import { drawRoad, layoutRoad } from "./renderer";
import type { TrafficEngine } from "./model/engine";

export default function RoadCanvas({ engine }: { engine: { current: TrafficEngine } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let width = 0,
      frame = 0;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
    });
    resize.observe(element);
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width > 0) {
        // Height follows the folded layout, so the canvas grows on narrow screens.
        const layout = layoutRoad(engine.current, width);
        if (element.style.height !== `${layout.height}px`) element.style.height = `${layout.height}px`;
        const w = Math.round(width * dpr),
          h = Math.round(layout.height * dpr);
        if (element.width !== w || element.height !== h) {
          element.width = w;
          element.height = h;
        }
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRoad(context, engine.current, layout, width, theme);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [engine, theme]);
  return (
    <canvas
      ref={canvas}
      className="traffic-canvas"
      role="img"
      aria-label="Live road view. Vehicles are shaded by speed; signal bars show their current state. Readouts beside the road give the same information as text."
    >
      Vehicles moving along the road. The metrics and signal list give the
      current state as text.
    </canvas>
  );
}
