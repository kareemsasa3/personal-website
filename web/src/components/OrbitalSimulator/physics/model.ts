/** Units: AU, solar masses, years. Display radii are pixels, never collision radii. */
export interface Vector {
  x: number;
  y: number;
}
export interface Body {
  id: string;
  name: string;
  mass: number;
  position: Vector;
  velocity: Vector;
  radius: number;
  color: number;
}
export const G = 4 * Math.PI ** 2;
export const SOFTENING = 0.025; // AU; Plummer potential, no physical collisions/merging.
export const DT = 1 / 16384; // years; identical at every rendering rate and speed.
export const MAX_BODIES = 8;
export const LIMITS = {
  mass: [0.000001, 5],
  position: [-100, 100],
  velocity: [-100, 100],
} as const;

export function validateBodies(bodies: readonly Body[]) {
  if (!bodies.length || bodies.length > MAX_BODIES)
    throw new Error("A system needs 1–8 bodies.");
  const ids = new Set<string>();
  for (const b of bodies) {
    if (!b.id || ids.has(b.id) || !b.name.trim())
      throw new Error("Bodies need unique identifiers and names.");
    ids.add(b.id);
    const values = [
      b.mass,
      b.position.x,
      b.position.y,
      b.velocity.x,
      b.velocity.y,
      b.radius,
      b.color,
    ];
    if (!values.every(Number.isFinite))
      throw new Error("Every body value must be finite.");
    if (b.mass < LIMITS.mass[0] || b.mass > LIMITS.mass[1])
      throw new Error("Mass must be between 0.000001 and 5 solar masses.");
    if (Math.max(Math.abs(b.position.x), Math.abs(b.position.y)) > 100)
      throw new Error("Initial positions must be within ±100 AU.");
    if (Math.max(Math.abs(b.velocity.x), Math.abs(b.velocity.y)) > 100)
      throw new Error("Velocity components must be within ±100 AU/yr.");
    if (
      b.radius < 3 ||
      b.radius > 20 ||
      !Number.isInteger(b.color) ||
      b.color < 0 ||
      b.color > 4
    )
      throw new Error("Invalid body display properties.");
  }
}
export const cloneBodies = (bodies: readonly Body[]): Body[] =>
  bodies.map((b) => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
  }));
export function barycenter(bodies: readonly Body[]): Vector {
  let mass = 0,
    x = 0,
    y = 0;
  for (const b of bodies) {
    mass += b.mass;
    x += b.mass * b.position.x;
    y += b.mass * b.position.y;
  }
  return { x: x / mass, y: y / mass };
}
export function diagnostics(bodies: readonly Body[]) {
  let energy = 0,
    px = 0,
    py = 0,
    angularMomentum = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    energy += 0.5 * b.mass * (b.velocity.x ** 2 + b.velocity.y ** 2);
    px += b.mass * b.velocity.x;
    py += b.mass * b.velocity.y;
    angularMomentum +=
      b.mass * (b.position.x * b.velocity.y - b.position.y * b.velocity.x);
    for (let j = i + 1; j < bodies.length; j++) {
      const c = bodies[j];
      energy -=
        (G * b.mass * c.mass) /
        Math.sqrt(
          (b.position.x - c.position.x) ** 2 +
            (b.position.y - c.position.y) ** 2 +
            SOFTENING ** 2,
        );
    }
  }
  return { energy, momentum: { x: px, y: py }, angularMomentum };
}
