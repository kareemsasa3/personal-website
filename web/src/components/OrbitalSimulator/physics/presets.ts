import { barycenter, G, SOFTENING, type Body } from "./model.ts";
export interface Preset {
  id: string;
  name: string;
  description: string;
  experiment: string;
  extent: number;
  bodies: Body[];
}
const body = (
  id: string,
  name: string,
  mass: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  color: number,
): Body => ({
  id,
  name,
  mass,
  position: { x, y },
  velocity: { x: vx, y: vy },
  radius,
  color,
});
// Circular relative speed for the softened pair potential, not a scripted orbit.
const circularSpeed = (mass: number, r: number) =>
  Math.sqrt((G * mass * r * r) / (r * r + SOFTENING ** 2) ** 1.5);
function centered(bodies: Body[]) {
  const center = barycenter(bodies);
  const mass = bodies.reduce((sum, b) => sum + b.mass, 0);
  const vx = bodies.reduce((sum, b) => sum + b.mass * b.velocity.x, 0) / mass;
  const vy = bodies.reduce((sum, b) => sum + b.mass * b.velocity.y, 0) / mass;
  return bodies.map((b) => ({
    ...b,
    position: { x: b.position.x - center.x, y: b.position.y - center.y },
    velocity: { x: b.velocity.x - vx, y: b.velocity.y - vy },
  }));
}
export const presets: Preset[] = [
  {
    id: "orbit",
    name: "Star + planet",
    extent: 1.5,
    description:
      "A nearly circular, one-year orbit. Both bodies move around their shared center of mass.",
    experiment:
      "Select the planet, pause to edit, and increase its Y velocity from about 6.28 to 8 AU/yr. Watch the circle become an ellipse.",
    bodies: centered([
      body("star", "Star", 1, 0, 0, 0, 0, 11, 0),
      body(
        "planet",
        "Planet",
        0.000003,
        1,
        0,
        0,
        circularSpeed(1.000003, 1),
        6,
        1,
      ),
    ]),
  },
  {
    id: "planets",
    name: "Multi-planet system",
    extent: 3.5,
    description:
      "Three planets share one star. Inner orbits run faster; every planet also pulls on its neighbors.",
    experiment:
      "Increase the middle planet’s mass to 0.05 solar masses to make its influence on the other orbits visible.",
    bodies: centered([
      body("star", "Star", 1, 0, 0, 0, 0, 11, 0),
      body(
        "inner",
        "Inner planet",
        0.000003,
        0.65,
        0,
        0,
        circularSpeed(1.000003, 0.65),
        5,
        1,
      ),
      body(
        "middle",
        "Middle planet",
        0.00001,
        0,
        1.4,
        -circularSpeed(1.00001, 1.4),
        0,
        6,
        2,
      ),
      body(
        "outer",
        "Outer planet",
        0.00095,
        -2.6,
        0,
        0,
        -circularSpeed(1.00095, 2.6),
        8,
        3,
      ),
    ]),
  },
  {
    id: "binary",
    name: "Binary stars",
    extent: 2,
    description:
      "Two stars orbit a common barycenter. The lighter star travels along the larger orbit.",
    experiment:
      "Follow the heavier star, then switch back to the barycenter to compare reference frames.",
    bodies: centered([
      body("primary", "Primary star", 1, 0, 0, 0, 0, 11, 0),
      body(
        "companion",
        "Companion star",
        0.5,
        1.8,
        0,
        0,
        circularSpeed(1.5, 1.8),
        9,
        2,
      ),
    ]),
  },
  {
    id: "three",
    name: "Three-body encounter",
    extent: 3,
    description:
      "Three stars exchange energy and momentum. Close passes and possible escapes emerge from deterministic initial conditions.",
    experiment:
      "Run, reset, and change one velocity slightly. Compare the encounters and watch for a body leaving the field; Fit all brings it back into view.",
    bodies: centered([
      body("a", "Star A", 0.7, -1, 0, 0, -3, 10, 0),
      body("b", "Star B", 0.5, 1, 0, 0, 3.4, 9, 2),
      body("c", "Star C", 0.2, 0, 1.5, -3, 0, 7, 3),
    ]),
  },
];
