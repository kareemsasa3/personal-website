import { useEffect, useRef } from "react";
import { useTheme } from "../../contexts/useTheme";
import { drawTraffic, getView, type Focus } from "./renderer";
import type { TrafficEngine } from "./model/engine";

interface Props {
  engine: { current: TrafficEngine };
  playing: boolean;
  focus: Focus;
  /** Changes with every state snapshot (step, reset, restart, scenario change). */
  frameKey: number;
  waiting: readonly { lane: number; waiting: number }[];
  label: string;
}

/**
 * Draws every animation frame while playing; while paused it redraws only
 * when the state, view, theme, or size changes.
 */
export default function TrafficCanvas({ engine, playing, focus, frameKey, waiting, label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  // While playing the loop draws every frame anyway; don't restart it on each readout.
  const pausedFrame = playing ? -1 : frameKey;
  const latestWaiting = useRef(waiting);
  useEffect(() => {
    latestWaiting.current = waiting;
  }, [waiting]);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let width = element.clientWidth,
      height = element.clientHeight,
      frame = 0;
    const draw = () => {
      if (width <= 0 || height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(width * dpr),
        h = Math.round(height * dpr);
      if (element.width !== w || element.height !== h) {
        element.width = w;
        element.height = h;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTraffic(context, engine.current, getView(width, height, focus), theme, latestWaiting.current);
    };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      if (!playing) draw();
    });
    resize.observe(element);
    if (playing) {
      const loop = () => {
        draw();
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } else draw();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [engine, playing, focus, theme, pausedFrame]);
  return (
    <canvas ref={canvas} className="traffic-canvas" role="img" aria-label={label}>
      {label}
    </canvas>
  );
}
