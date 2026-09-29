import {
  cloneBodies,
  diagnostics,
  DT,
  validateBodies,
  type Body,
} from "./model.ts";
import { checkResolution, leapfrog } from "./integrator.ts";
export const TRAIL_CAPACITY = 800;
export const TRAIL_INTERVAL = 128; // 1/128 yr: 6.25 years of history per body.
export interface Trail {
  points: Float64Array;
  head: number;
  length: number;
}
export class OrbitalEngine {
  bodies: Body[];
  steps = 0;
  trails: Trail[];
  referenceEnergy: number;
  private buffer: Float64Array;
  private backup: Float64Array;
  constructor(bodies: readonly Body[]) {
    validateBodies(bodies);
    checkResolution(bodies);
    this.bodies = cloneBodies(bodies);
    this.buffer = new Float64Array(bodies.length * 2);
    this.backup = new Float64Array(bodies.length * 4);
    this.trails = bodies.map(() => ({
      points: new Float64Array(TRAIL_CAPACITY * 2),
      head: 0,
      length: 0,
    }));
    this.referenceEnergy = diagnostics(bodies).energy;
    this.sampleTrails();
  }
  get time() {
    return this.steps * DT;
  }
  step() {
    // Roll back a rejected step so the inspector always shows the last valid state.
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      this.backup[i * 4] = b.position.x;
      this.backup[i * 4 + 1] = b.position.y;
      this.backup[i * 4 + 2] = b.velocity.x;
      this.backup[i * 4 + 3] = b.velocity.y;
    }
    try {
      leapfrog(this.bodies, this.buffer);
      checkResolution(this.bodies);
    } catch (error) {
      this.bodies.forEach((b, i) => {
        b.position.x = this.backup[i * 4];
        b.position.y = this.backup[i * 4 + 1];
        b.velocity.x = this.backup[i * 4 + 2];
        b.velocity.y = this.backup[i * 4 + 3];
      });
      throw error;
    }
    this.steps++;
    if (this.steps % TRAIL_INTERVAL === 0) this.sampleTrails();
  }
  private sampleTrails() {
    this.bodies.forEach((b, i) => {
      const trail = this.trails[i];
      trail.points[trail.head * 2] = b.position.x;
      trail.points[trail.head * 2 + 1] = b.position.y;
      trail.head = (trail.head + 1) % TRAIL_CAPACITY;
      trail.length = Math.min(TRAIL_CAPACITY, trail.length + 1);
    });
  }
  edit(id: string, values: Pick<Body, "mass" | "position" | "velocity">) {
    const candidate = cloneBodies(this.bodies);
    const selected = candidate.find((b) => b.id === id);
    if (!selected) throw new Error("Choose an existing body.");
    Object.assign(selected, values);
    validateBodies(candidate);
    checkResolution(candidate);
    this.bodies = cloneBodies(candidate);
    this.referenceEnergy = diagnostics(this.bodies).energy;
    this.trails.forEach((t) => {
      t.length = 0;
      t.head = 0;
    });
    this.sampleTrails();
  }
}
