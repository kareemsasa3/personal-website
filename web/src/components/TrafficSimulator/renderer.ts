import { NETWORK, LANE_WIDTH, toWorld, type Vector } from "./model/network";
import type { TrafficEngine } from "./model/engine";
import { lightFor, type Light } from "./model/signals";

/** "corridor" or the index of one intersection to zoom into. */
export type Focus = "corridor" | 0 | 1 | 2;
export interface View {
  width: number;
  height: number;
  scale: number; // px per metre
  center: Vector; // world point at the canvas centre
  /** Narrow, tall canvases run the arterial top to bottom. */
  vertical: boolean;
}
type Theme = "dark" | "light";

const palette = {
  dark: {
    background: "#101a16",
    road: "#2b3430",
    marking: "#7d8a83",
    ink: "#bec9c3",
    moving: "#d9e4de",
    slow: "#ffc857",
    stopped: "#ff7a66",
    lights: { green: "#4fdb7a", yellow: "#ffcc33", red: "#ff5252" },
  },
  light: {
    background: "#f5faf6",
    road: "#d5dbd6",
    marking: "#87918b",
    ink: "#34483c",
    moving: "#2b3a33",
    slow: "#a86400",
    stopped: "#c62828",
    lights: { green: "#1d8a3c", yellow: "#c28f00", red: "#d32f2f" },
  },
} satisfies Record<Theme, unknown>;
export const vehicleColors = (theme: Theme) => palette[theme];

const MARGIN = 6; // m of world shown beyond the roads
export function getView(width: number, height: number, focus: Focus): View {
  const vertical = height > width * 1.1;
  const half = NETWORK.crossLength / 2;
  const [center, along, across] =
    focus === "corridor"
      ? [{ x: NETWORK.length / 2, y: 0 }, NETWORK.length + MARGIN, 2 * half + MARGIN]
      : [{ x: NETWORK.intersections[focus].x, y: 0 }, 110, 110];
  const [w, h] = vertical ? [height, width] : [width, height];
  return { width, height, vertical, center, scale: Math.min(w / along, h / across) };
}

export const project = (point: Vector, view: View): Vector => {
  const dx = (point.x - view.center.x) * view.scale,
    dy = (point.y - view.center.y) * view.scale;
  // Vertical layout rotates the world 90° clockwise: eastbound runs downward.
  return view.vertical
    ? { x: view.width / 2 - dy, y: view.height / 2 + dx }
    : { x: view.width / 2 + dx, y: view.height / 2 + dy };
};

/** Axis-aligned world rectangle → screen rectangle. */
function rect(ctx: CanvasRenderingContext2D, view: View, x0: number, y0: number, x1: number, y1: number) {
  const a = project({ x: x0, y: y0 }, view),
    b = project({ x: x1, y: y1 }, view);
  ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
function line(ctx: CanvasRenderingContext2D, view: View, from: Vector, to: Vector) {
  const a = project(from, view),
    b = project(to, view);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
}

export function drawTraffic(
  ctx: CanvasRenderingContext2D,
  engine: TrafficEngine,
  view: View,
  theme: Theme,
  waiting: readonly { lane: number; waiting: number }[],
) {
  const colors = palette[theme];
  const { width, height, scale } = view;
  const half = NETWORK.crossLength / 2;
  const aw = NETWORK.arterialHalfWidth,
    cw = NETWORK.crossHalfWidth;
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = colors.road;
  rect(ctx, view, 0, -aw, NETWORK.length, aw);
  for (const { x } of NETWORK.intersections) rect(ctx, view, x - cw, -half, x + cw, half);

  // Lane markings, broken at each intersection box.
  ctx.strokeStyle = colors.marking;
  ctx.lineWidth = 1;
  const gaps = [0, ...NETWORK.intersections.flatMap(({ x }) => [x - cw, x + cw]), NETWORK.length];
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let i = 0; i < gaps.length; i += 2) line(ctx, view, { x: gaps[i], y: 0 }, { x: gaps[i + 1], y: 0 });
  for (const { x } of NETWORK.intersections) {
    line(ctx, view, { x, y: -half }, { x, y: -aw });
    line(ctx, view, { x, y: aw }, { x, y: half });
  }
  ctx.stroke();
  ctx.setLineDash([Math.max(2, 3 * scale), Math.max(3, 5 * scale)]);
  ctx.beginPath();
  for (let i = 0; i < gaps.length; i += 2)
    for (const y of [-LANE_WIDTH, LANE_WIDTH]) line(ctx, view, { x: gaps[i], y }, { x: gaps[i + 1], y });
  ctx.stroke();
  ctx.setLineDash([]);

  // Stop lines and a signal head beside each approach.
  const signalRadius = Math.max(2.5, Math.min(6, 1.6 * scale));
  ctx.lineWidth = Math.max(1.5, 0.5 * scale);
  for (const spec of NETWORK.lanes) {
    for (const stop of spec.stops) {
      const light: Light = lightFor(engine.signals[stop.intersection], spec.axis);
      const at = toWorld(spec, stop.position);
      const across = { x: -spec.direction.y, y: spec.direction.x }; // driver's right
      ctx.strokeStyle = colors.marking;
      ctx.beginPath();
      line(
        ctx,
        view,
        { x: at.x - (across.x * LANE_WIDTH) / 2, y: at.y - (across.y * LANE_WIDTH) / 2 },
        { x: at.x + (across.x * LANE_WIDTH) / 2, y: at.y + (across.y * LANE_WIDTH) / 2 },
      );
      ctx.stroke();
      // One head per approach, just outside the kerb beside its outermost lane.
      const kerb = spec.axis === "EW" ? aw : cw;
      const fromCentre = Math.abs(spec.axis === "EW" ? spec.origin.y : spec.origin.x - NETWORK.intersections[stop.intersection].x);
      if (fromCentre < kerb - LANE_WIDTH) continue;
      const out = LANE_WIDTH / 2 + 1.5;
      const head = project(
        { x: at.x + across.x * out - spec.direction.x * 1.5, y: at.y + across.y * out - spec.direction.y * 1.5 },
        view,
      );
      ctx.fillStyle = colors.lights[light];
      ctx.beginPath();
      ctx.arc(head.x, head.y, signalRadius, 0, 2 * Math.PI);
      ctx.fill();
      if (light !== "green") {
        // Shape as well as colour: red/yellow heads get a bar.
        ctx.fillStyle = colors.background;
        ctx.fillRect(head.x - signalRadius * 0.6, head.y - 0.75, signalRadius * 1.2, 1.5);
      }
    }
  }

  // Vehicles: rectangles along their lane, coloured by state.
  const carWidth = Math.max(2, 1.9 * scale);
  for (const { spec, vehicles } of engine.lanes) {
    const along = view.vertical ? { x: -spec.direction.y, y: spec.direction.x } : spec.direction;
    const horizontal = along.y === 0;
    for (const v of vehicles) {
      const length = Math.max(3, v.length * scale);
      const middle = project(toWorld(spec, v.position - v.length / 2), view);
      ctx.fillStyle =
        v.speed < 0.3 ? colors.stopped : v.speed < 5 ? colors.slow : colors.moving;
      if (horizontal) ctx.fillRect(middle.x - length / 2, middle.y - carWidth / 2, length, carWidth);
      else ctx.fillRect(middle.x - carWidth / 2, middle.y - length / 2, carWidth, length);
    }
  }

  ctx.font = "11px monospace";
  ctx.fillStyle = colors.ink;
  ctx.textBaseline = "middle";
  // Intersection numbers, matching the signal table.
  NETWORK.intersections.forEach(({ x }, i) => {
    const p = project({ x: x + cw + 4, y: -aw - 6 }, view);
    if (p.x > 0 && p.x < width && p.y > 0 && p.y < height) ctx.fillText(String(i + 1), p.x, p.y);
  });
  // Cars generated but with no room to enter yet.
  for (const { lane, waiting: count } of waiting) {
    if (!count) continue;
    const spec = NETWORK.lanes[lane];
    const p = project(toWorld(spec, 0), view);
    const label = `+${count}`;
    const w = ctx.measureText(label).width;
    ctx.fillText(label, Math.max(4, Math.min(width - w - 4, p.x - w / 2)), Math.max(10, Math.min(height - 10, p.y)));
  }
  // Scale bar.
  const metres = [10, 20, 50, 100].find((m) => m * scale >= 50) ?? 100;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, height - 14);
  ctx.lineTo(12 + metres * scale, height - 14);
  ctx.stroke();
  ctx.fillText(`${metres} m`, 12, height - 26);
}
