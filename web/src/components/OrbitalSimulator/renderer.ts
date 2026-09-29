import { barycenter, type Vector } from "./physics/model";
import { TRAIL_CAPACITY, type OrbitalEngine } from "./physics/engine";
export interface Camera {
  extent: number;
  target: "barycenter" | "selected";
  offset: Vector;
}
export interface View {
  width: number;
  height: number;
  scale: number;
  center: Vector;
}
const colors = {
  dark: ["#ffd166", "#63d6ff", "#eaa2ff", "#8de5a1", "#ffab91"],
  light: ["#956000", "#006b94", "#8542a0", "#28783c", "#a63e24"],
};
export function getView(
  engine: OrbitalEngine,
  camera: Camera,
  selected: string,
  width: number,
  height: number,
): View {
  const target =
    camera.target === "selected"
      ? engine.bodies.find((b) => b.id === selected)?.position
      : null;
  const center = target ?? barycenter(engine.bodies);
  return {
    width,
    height,
    scale: Math.min(width, height) / (2 * camera.extent),
    center: { x: center.x + camera.offset.x, y: center.y + camera.offset.y },
  };
}
export const project = (point: Vector, view: View) => ({
  x: view.width / 2 + (point.x - view.center.x) * view.scale,
  y: view.height / 2 - (point.y - view.center.y) * view.scale,
});
export function fitExtent(engine: OrbitalEngine) {
  const center = barycenter(engine.bodies);
  return Math.max(
    0.15,
    Math.min(
      10000,
      Math.max(
        ...engine.bodies.map((b) =>
          Math.hypot(b.position.x - center.x, b.position.y - center.y),
        ),
      ) * 1.3,
    ),
  );
}
export function drawField(
  ctx: CanvasRenderingContext2D,
  engine: OrbitalEngine,
  view: View,
  selected: string,
  trails: boolean,
  theme: "dark" | "light",
) {
  const { width, height, scale } = view;
  const ink = theme === "dark" ? "#bec9c3" : "#34483c";
  ctx.fillStyle = theme === "dark" ? "#101a16" : "#f5faf6";
  ctx.fillRect(0, 0, width, height);
  // An AU grid and scale bar make zoom and distance interpretable.
  const raw = 80 / scale;
  const base = 10 ** Math.floor(Math.log10(raw));
  const spacing = [1, 2, 5, 10].find((n) => n * base >= raw)! * base;
  ctx.strokeStyle = theme === "dark" ? "#25392e" : "#d8e4db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const left = view.center.x - width / (2 * scale),
    bottom = view.center.y - height / (2 * scale);
  for (
    let x = Math.ceil(left / spacing) * spacing;
    x < left + width / scale;
    x += spacing
  ) {
    const p = project({ x, y: 0 }, view);
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, height);
  }
  for (
    let y = Math.ceil(bottom / spacing) * spacing;
    y < bottom + height / scale;
    y += spacing
  ) {
    const p = project({ x: 0, y }, view);
    ctx.moveTo(0, p.y);
    ctx.lineTo(width, p.y);
  }
  ctx.stroke();
  if (trails)
    engine.trails.forEach((trail, i) => {
      ctx.strokeStyle = colors[theme][engine.bodies[i].color];
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let n = 0; n < trail.length; n++) {
        const index =
          ((trail.head - trail.length + n + TRAIL_CAPACITY) % TRAIL_CAPACITY) *
          2;
        const p = project(
          { x: trail.points[index], y: trail.points[index + 1] },
          view,
        );
        if (n === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
  ctx.globalAlpha = 1;
  const com = project(barycenter(engine.bodies), view);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(com.x - 5, com.y);
  ctx.lineTo(com.x + 5, com.y);
  ctx.moveTo(com.x, com.y - 5);
  ctx.lineTo(com.x, com.y + 5);
  ctx.stroke();
  let offscreen = 0;
  engine.bodies.forEach((b) => {
    const p = project(b.position, view);
    if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) {
      offscreen++;
      return;
    }
    ctx.fillStyle = colors[theme][b.color];
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.radius, 0, 2 * Math.PI);
    ctx.fill();
    if (b.id === selected) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, b.radius + 5, 0, 2 * Math.PI);
      ctx.stroke();
      // Velocity vector has a fixed 0.04-year scale, with its meaning printed in the viewport.
      const end = project(
        {
          x: b.position.x + b.velocity.x * 0.04,
          y: b.position.y + b.velocity.y * 0.04,
        },
        view,
      );
      const angle = Math.atan2(end.y - p.y, end.x - p.x);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(end.x, end.y);
      ctx.moveTo(
        end.x - 7 * Math.cos(angle - 0.45),
        end.y - 7 * Math.sin(angle - 0.45),
      );
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(
        end.x - 7 * Math.cos(angle + 0.45),
        end.y - 7 * Math.sin(angle + 0.45),
      );
      ctx.stroke();
    }
    ctx.font = "12px monospace";
    ctx.fillStyle = ink;
    const labelWidth = ctx.measureText(b.name).width;
    ctx.fillText(
      b.name,
      Math.max(5, Math.min(width - labelWidth - 5, p.x + b.radius + 8)),
      Math.max(18, p.y - b.radius - 7),
    );
  });
  ctx.font = "11px monospace";
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(16, height - 24);
  ctx.lineTo(16 + spacing * scale, height - 24);
  ctx.stroke();
  ctx.fillText(`${Number(spacing.toPrecision(3))} AU`, 16, height - 33);
  if (width < 400) {
    ctx.fillText("Cross: barycenter", 12, 20);
    ctx.fillText("Arrow: velocity × 0.04 yr", 12, 36);
  } else ctx.fillText("Cross: barycenter · Arrow: velocity × 0.04 yr", 12, 20);
  if (offscreen)
    ctx.fillText(
      `${offscreen} offscreen — use Fit all`,
      12,
      width < 400 ? 54 : 40,
    );
}
