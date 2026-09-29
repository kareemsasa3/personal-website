import { DT, G, SOFTENING, type Body } from "./model.ts";

/** Pairwise equal/opposite forces; optional caller-owned buffer avoids timestep allocations. */
export function accelerations(
  bodies: readonly Body[],
  out: Float64Array = new Float64Array(bodies.length * 2),
) {
  out.fill(0);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].position.x - bodies[i].position.x;
      const dy = bodies[j].position.y - bodies[i].position.y;
      const r2 = dx * dx + dy * dy + SOFTENING ** 2;
      const factor = G / (r2 * Math.sqrt(r2));
      out[2 * i] += factor * bodies[j].mass * dx;
      out[2 * i + 1] += factor * bodies[j].mass * dy;
      out[2 * j] -= factor * bodies[i].mass * dx;
      out[2 * j + 1] -= factor * bodies[i].mass * dy;
    }
  }
  return out;
}

/** Reject encounters that need finer time resolution; never clamp a force or teleport a body. */
export function checkResolution(bodies: readonly Body[]) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (
      !Number.isFinite(b.position.x) ||
      !Number.isFinite(b.position.y) ||
      !Number.isFinite(b.velocity.x) ||
      !Number.isFinite(b.velocity.y) ||
      Math.max(
        Math.abs(b.position.x),
        Math.abs(b.position.y),
        Math.abs(b.velocity.x),
        Math.abs(b.velocity.y),
      ) > 1e6
    ) {
      throw new Error(
        "Numerical range exceeded. Reset the scenario or edit the selected body.",
      );
    }
    for (let j = i + 1; j < bodies.length; j++) {
      const c = bodies[j];
      const r = Math.sqrt(
        (b.position.x - c.position.x) ** 2 +
          (b.position.y - c.position.y) ** 2 +
          SOFTENING ** 2,
      );
      const dynamicalTime = Math.sqrt(r ** 3 / (G * (b.mass + c.mass)));
      const crossingTime =
        r /
        Math.max(
          1e-12,
          Math.hypot(b.velocity.x - c.velocity.x, b.velocity.y - c.velocity.y),
        );
      if (DT > 0.08 * Math.min(dynamicalTime, crossingTime)) {
        throw new Error(
          `Close approach: ${b.name} and ${c.name} need a smaller physics timestep. Paused to preserve accuracy; reset or move a body farther away.`,
        );
      }
    }
  }
}

/** Kick–drift–kick leapfrog. Uses only DT; speed never changes the integration step. */
export function leapfrog(
  bodies: Body[],
  buffer: Float64Array = new Float64Array(bodies.length * 2),
) {
  accelerations(bodies, buffer);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.velocity.x += (buffer[2 * i] * DT) / 2;
    b.velocity.y += (buffer[2 * i + 1] * DT) / 2;
    b.position.x += b.velocity.x * DT;
    b.position.y += b.velocity.y * DT;
  }
  accelerations(bodies, buffer);
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].velocity.x += (buffer[2 * i] * DT) / 2;
    bodies[i].velocity.y += (buffer[2 * i + 1] * DT) / 2;
  }
}
