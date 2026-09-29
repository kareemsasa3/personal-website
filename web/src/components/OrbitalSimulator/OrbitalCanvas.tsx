import { useEffect, useRef } from "react";
import { useTheme } from "../../contexts/useTheme";
import {
  drawField,
  getView,
  project,
  type Camera,
  type View,
} from "./renderer";
import type { OrbitalEngine } from "./physics/engine";
interface Props {
  engine: { current: OrbitalEngine };
  camera: Camera;
  selected: string;
  trails: boolean;
  onSelect: (id: string) => void;
  onPan: (x: number, y: number) => void;
}
export default function OrbitalCanvas({
  engine,
  camera,
  selected,
  trails,
  onSelect,
  onPan,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<View | null>(null);
  const { theme } = useTheme();
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let width = 0,
      height = 0,
      frame = 0;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    });
    resize.observe(element);
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width > 0 && height > 0) {
        const w = Math.round(width * dpr),
          h = Math.round(height * dpr);
        if (element.width !== w || element.height !== h) {
          element.width = w;
          element.height = h;
        }
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        view.current = getView(engine.current, camera, selected, width, height);
        drawField(
          context,
          engine.current,
          view.current,
          selected,
          trails,
          theme,
        );
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [engine, camera, selected, trails, theme]);
  return (
    <canvas
      ref={canvas}
      className="orbital-canvas"
      role="img"
      aria-label="Live gravitational field. Use the body selector for accessible state and the camera controls to navigate."
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = { x: e.clientX, y: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const start = drag.current,
          current = view.current;
        if (!start || !current) return;
        const dx = e.clientX - start.x,
          dy = e.clientY - start.y;
        if (start.moved || Math.hypot(dx, dy) > 5) {
          onPan(-dx / current.scale, dy / current.scale);
          drag.current = { x: e.clientX, y: e.clientY, moved: true };
        }
      }}
      onPointerUp={(e) => {
        if (drag.current && !drag.current.moved && view.current) {
          const bounds = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - bounds.left,
            y = e.clientY - bounds.top;
          const hits = engine.current.bodies
            .map((b) => ({ b, p: project(b.position, view.current!) }))
            .map(({ b, p }) => ({ b, distance: Math.hypot(p.x - x, p.y - y) }))
            .filter(({ b, distance }) => distance <= Math.max(22, b.radius + 6))
            .sort((a, b) => a.distance - b.distance);
          if (hits[0]) onSelect(hits[0].b.id);
        }
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      Orbital positions are drawn here. Select a body below to read its mass,
      position, and velocity.
    </canvas>
  );
}
