import type { TrafficEngine } from "./model/engine";
import type { SignalState } from "./model/signals";

type Theme = "dark" | "light";

/**
 * Speed bins as a share of the speed limit, slowest first. One-hue ordinal ramp
 * (validated for both themes against the road fill); stopped traffic carries
 * the most contrast so jams read first.
 */
export const SPEED_BINS = [
  { label: "Stopped", max: 0.1 },
  { label: "Crawling", max: 0.3 },
  { label: "Slow", max: 0.55 },
  { label: "Moderate", max: 0.8 },
  { label: "Free flow", max: Infinity },
] as const;

const palette = {
  dark: {
    surface: "#101a16",
    road: "#18261f",
    marking: "#3c5447",
    ink: "#bec9c3",
    muted: "#83958b",
    grid: "#1f3028",
    speed: ["#eef5fe", "#b7d3f6", "#6da7ec", "#3987e5", "#256abf"],
  },
  light: {
    surface: "#f5faf6",
    road: "#e4ebe6",
    marking: "#a9b8ad",
    ink: "#34483c",
    muted: "#5d6f63",
    grid: "#dde6df",
    speed: ["#0d366b", "#184f95", "#256abf", "#3987e5", "#6da7ec"],
  },
};

/** Fixed status colors; every signal state is also named in text beside the canvas. */
export const SIGNAL_COLORS: Record<SignalState, string> = {
  green: "#0ca30c",
  yellow: "#fab219",
  red: "#d03b3b",
};

export const speedBin = (share: number) => SPEED_BINS.findIndex((bin) => share < bin.max);
export const speedColor = (share: number, theme: Theme) => palette[theme].speed[speedBin(share)];

const LANE_HEIGHT = 13;
const ROW_GAP = 30;
const PAD_X = 14;
const PAD_TOP = 22;
const MIN_PIXELS_PER_METRE = 1.4;

export interface RoadLayout {
  kind: "strip";
  rows: number;
  rowLength: number;
  scale: number;
  height: number;
}
export interface RingLayout {
  kind: "ring";
  radius: number;
  height: number;
}

/** Long roads fold into rows that read left to right, like lines of text. */
export function layoutRoad(engine: TrafficEngine, width: number): RoadLayout | RingLayout {
  const { scenario } = engine;
  if (scenario.topology === "ring") {
    const size = Math.min(width, 420);
    return { kind: "ring", radius: Math.max(8, size / 2 - 36), height: size };
  }
  const usable = Math.max(120, width - 2 * PAD_X);
  const rows = Math.max(1, Math.ceil(scenario.length / (usable / MIN_PIXELS_PER_METRE)));
  const rowLength = scenario.length / rows;
  const rowHeight = scenario.lanes * LANE_HEIGHT + ROW_GAP;
  return {
    kind: "strip",
    rows,
    rowLength,
    scale: usable / rowLength,
    height: PAD_TOP + rows * rowHeight - ROW_GAP + 22,
  };
}

const metres = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)} km` : `${Math.round(value)} m`;

export function drawRoad(
  ctx: CanvasRenderingContext2D,
  engine: TrafficEngine,
  layout: RoadLayout | RingLayout,
  width: number,
  theme: Theme,
) {
  const colors = palette[theme];
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, width, layout.height);
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "alphabetic";
  if (layout.kind === "ring") drawRing(ctx, engine, layout, width, theme);
  else drawStrip(ctx, engine, layout, theme);
}

function drawStrip(ctx: CanvasRenderingContext2D, engine: TrafficEngine, layout: RoadLayout, theme: Theme) {
  const colors = palette[theme];
  const { scenario } = engine;
  const { lanes, laneDrop: drop } = scenario;
  const roadHeight = lanes * LANE_HEIGHT;
  const rowTop = (row: number) => PAD_TOP + row * (roadHeight + ROW_GAP);
  const locate = (x: number) => {
    const row = Math.min(layout.rows - 1, Math.max(0, Math.floor(x / layout.rowLength)));
    return { row, px: PAD_X + (x - row * layout.rowLength) * layout.scale };
  };
  for (let row = 0; row < layout.rows; row++) {
    const top = rowTop(row);
    const start = row * layout.rowLength;
    const end = start + layout.rowLength;
    // Asphalt; the dropped lane is cut off where it ends.
    ctx.fillStyle = colors.road;
    for (let lane = 0; lane < lanes; lane++) {
      let laneEnd = end;
      if (drop && lane === drop.lane) laneEnd = Math.min(end, drop.x);
      if (laneEnd <= start) continue;
      ctx.fillRect(PAD_X, top + lane * LANE_HEIGHT, (laneEnd - start) * layout.scale, LANE_HEIGHT);
    }
    ctx.strokeStyle = colors.marking;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (let lane = 1; lane < lanes; lane++) {
      let laneEnd = end;
      if (drop && lane === drop.lane) laneEnd = Math.min(end, drop.x);
      if (laneEnd <= start) continue;
      const y = top + lane * LANE_HEIGHT + 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD_X, y);
      ctx.lineTo(PAD_X + (laneEnd - start) * layout.scale, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "left";
    ctx.fillText(row === 0 ? `${metres(start)} · entrance →` : `${metres(start)} →`, PAD_X, top - 6);
    ctx.textAlign = "right";
    ctx.fillText(row === layout.rows - 1 ? `exit · ${metres(end)}` : metres(end), PAD_X + layout.rowLength * layout.scale, top - 6);
  }
  if (drop) {
    const { row, px } = locate(drop.x);
    const top = rowTop(row) + drop.lane * LANE_HEIGHT;
    ctx.fillStyle = colors.marking;
    ctx.fillRect(px - 2, top, 3, LANE_HEIGHT);
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    ctx.fillText("lane ends", Math.min(Math.max(px, 40), PAD_X + layout.rowLength * layout.scale - 30), top + LANE_HEIGHT + 13);
  }
  engine.signalStates().forEach((signal, index) => {
    const { row, px } = locate(signal.x);
    const top = rowTop(row);
    ctx.fillStyle = SIGNAL_COLORS[signal.state];
    ctx.fillRect(px - 1.5, top - 3, 3, roadHeight + 6);
    ctx.fillStyle = colors.ink;
    ctx.textAlign = "center";
    ctx.fillText(`S${index + 1}`, px, top + roadHeight + 14);
  });
  for (const vehicle of engine.vehicles) {
    const rear = Math.max(0, vehicle.x - vehicle.length);
    const front = Math.min(scenario.length, vehicle.x);
    if (front <= rear) continue;
    // A vehicle straddling a row break is drawn at its front's row.
    const { row, px } = locate(front);
    const length = Math.max(3, (front - rear) * layout.scale);
    const y = rowTop(row) + vehicle.lateral * LANE_HEIGHT + 2;
    ctx.fillStyle = speedColor(vehicle.v / scenario.speedLimit, theme);
    ctx.fillRect(px - length, y, length, LANE_HEIGHT - 4);
  }
}

function drawRing(ctx: CanvasRenderingContext2D, engine: TrafficEngine, layout: RingLayout, width: number, theme: Theme) {
  const colors = palette[theme];
  const { scenario } = engine;
  const cx = width / 2,
    cy = layout.height / 2,
    r = layout.radius;
  const angle = (x: number) => -Math.PI / 2 + (x / scenario.length) * Math.PI * 2;
  ctx.strokeStyle = colors.road;
  ctx.lineWidth = LANE_HEIGHT + 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Detector line where throughput is counted.
  ctx.strokeStyle = colors.marking;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 11);
  ctx.lineTo(cx, cy - r + 11);
  ctx.stroke();
  ctx.fillStyle = colors.muted;
  ctx.textAlign = "center";
  ctx.fillText("detector · clockwise →", cx, cy - r - 17);
  ctx.lineWidth = LANE_HEIGHT - 3;
  ctx.lineCap = "butt";
  for (const vehicle of engine.vehicles) {
    ctx.strokeStyle = speedColor(vehicle.v / scenario.speedLimit, theme);
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle(vehicle.x - vehicle.length), angle(vehicle.x));
    ctx.stroke();
  }
  ctx.fillStyle = colors.ink;
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`${engine.vehicles.length} vehicles`, cx, cy - 4);
  ctx.fillStyle = colors.muted;
  ctx.fillText(`${metres(scenario.length)} loop`, cx, cy + 14);
}

export const SPACE_TIME_HEIGHT = 260;
export const SPACE_TIME_WINDOW = 120; // s
const ST_PAD = { left: 52, right: 12, top: 12, bottom: 28 };

export interface SpaceTimeFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  now: number;
}

export function spaceTimeFrame(engine: TrafficEngine, width: number): SpaceTimeFrame {
  return {
    left: ST_PAD.left,
    right: width - ST_PAD.right,
    top: ST_PAD.top,
    bottom: SPACE_TIME_HEIGHT - ST_PAD.bottom,
    now: engine.samples[engine.samples.length - 1]?.time ?? engine.time,
  };
}

/** Time runs left to right (now at the right edge); position runs bottom to top. */
export function drawSpaceTime(
  ctx: CanvasRenderingContext2D,
  engine: TrafficEngine,
  width: number,
  theme: Theme,
) {
  const colors = palette[theme];
  const { scenario, samples } = engine;
  const frame = spaceTimeFrame(engine, width);
  const plotWidth = frame.right - frame.left;
  const plotHeight = frame.bottom - frame.top;
  const tx = (t: number) => frame.right - ((frame.now - t) / SPACE_TIME_WINDOW) * plotWidth;
  const py = (x: number) => frame.bottom - (x / scenario.length) * plotHeight;
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, width, SPACE_TIME_HEIGHT);
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  // Recessive grid: every 30 s and every 200 m.
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = colors.muted;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const positionStep = scenario.length > 1200 ? 400 : 200;
  for (let x = 0; x <= scenario.length; x += positionStep) {
    const y = Math.round(py(x)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(frame.left, y);
    ctx.lineTo(frame.right, y);
    ctx.stroke();
    ctx.fillText(metres(x), frame.left - 6, y);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (let ago = 0; ago <= SPACE_TIME_WINDOW; ago += 30) {
    const x = Math.round(frame.right - (ago / SPACE_TIME_WINDOW) * plotWidth) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, frame.top);
    ctx.lineTo(x, frame.bottom);
    ctx.stroke();
    ctx.fillText(ago === 0 ? "now" : `−${ago} s`, x, SPACE_TIME_HEIGHT - 9);
  }
  // Signal states as bands along each stop line.
  const interval = samples.length > 1 ? samples[1].time - samples[0].time : 0.5;
  scenario.signals.forEach((position, index) => {
    const y = py(position);
    for (const sample of samples) {
      const state = sample.signals[index];
      ctx.fillStyle = SIGNAL_COLORS[state];
      const height = state === "green" ? 1 : 3;
      ctx.fillRect(tx(sample.time - interval), y - height / 2, Math.max(1, (interval / SPACE_TIME_WINDOW) * plotWidth + 0.5), height);
    }
  });
  if (scenario.laneDrop) {
    ctx.strokeStyle = colors.marking;
    ctx.setLineDash([4, 4]);
    const y = Math.round(py(scenario.laneDrop.x)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(frame.left, y);
    ctx.lineTo(frame.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Trajectories: one dot per vehicle per sample. Fast bins first so slow traffic sits on top.
  const dot = 2;
  for (let bin = SPEED_BINS.length - 1; bin >= 0; bin--) {
    ctx.fillStyle = colors.speed[bin];
    for (const sample of samples) {
      const x = tx(sample.time);
      if (x < frame.left) continue;
      for (let i = 0; i < sample.x.length; i++) {
        if (speedBin(sample.speed[i]) !== bin) continue;
        ctx.fillRect(x - dot / 2, py(sample.x[i]) - dot / 2, dot, dot);
      }
    }
  }
  ctx.strokeStyle = colors.marking;
  ctx.strokeRect(frame.left + 0.5, frame.top + 0.5, plotWidth - 1, plotHeight - 1);
}
