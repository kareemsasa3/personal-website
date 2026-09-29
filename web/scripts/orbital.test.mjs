import test from "node:test";
import assert from "node:assert/strict";
import {
  accelerations,
  leapfrog,
} from "../src/components/OrbitalSimulator/physics/integrator.ts";
import {
  G,
  DT,
  SOFTENING,
  barycenter,
  cloneBodies,
  diagnostics,
  validateBodies,
} from "../src/components/OrbitalSimulator/physics/model.ts";
import {
  OrbitalEngine,
  TRAIL_CAPACITY,
  TRAIL_INTERVAL,
} from "../src/components/OrbitalSimulator/physics/engine.ts";
import {
  SimulationClock,
  MAX_SUBSTEPS,
} from "../src/components/OrbitalSimulator/physics/clock.ts";
import { presets } from "../src/components/OrbitalSimulator/physics/presets.ts";
import { simulationsData } from "../src/data/simulationsData.ts";
const near = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} ≈ ${b} (±${tolerance})`);
const distance = (a, b) =>
  Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);

test("gravity direction, softened inverse-square magnitude, and equal/opposite forces", () => {
  const bodies = cloneBodies(presets[2].bodies),
    a = accelerations(bodies),
    r = distance(...bodies);
  near(a[0], (G * bodies[1].mass * r) / (r * r + SOFTENING ** 2) ** 1.5);
  near(a[1], 0);
  near(a[3], 0);
  near(bodies[0].mass * a[0], -bodies[1].mass * a[2]);
  assert.ok(a[0] > 0 && a[2] < 0);
});
test("isolated stationary body stays stationary; free motion is linear", () => {
  const b = cloneBodies([presets[0].bodies[0]]);
  b[0].velocity = { x: 0, y: 0 };
  const initial = structuredClone(b);
  leapfrog(b);
  assert.deepEqual(b, initial);
  b[0].velocity.x = 2;
  leapfrog(b);
  near(b[0].position.x, initial[0].position.x + 2 * DT);
});
test("determinism and momentum, angular momentum, barycenter conservation", () => {
  const first = new OrbitalEngine(presets[2].bodies),
    second = new OrbitalEngine(presets[2].bodies);
  const before = diagnostics(first.bodies),
    center = barycenter(first.bodies);
  for (let i = 0; i < 20000; i++) {
    first.step();
    second.step();
  }
  first.bodies.forEach((b, i) => {
    near(b.position.x, second.bodies[i].position.x);
    near(b.velocity.y, second.bodies[i].velocity.y);
  });
  const after = diagnostics(first.bodies);
  near(after.momentum.x, before.momentum.x);
  near(after.momentum.y, before.momentum.y);
  near(after.angularMomentum, before.angularMomentum);
  near(barycenter(first.bodies).x, center.x);
  near(barycenter(first.bodies).y, center.y);
  assert.ok(
    distance(first.bodies[0], presets[2].bodies[0]) > 0.1,
    "star must move",
  );
});
for (const index of [0, 1, 2])
  test(`${presets[index].name}: bounded orbit and energy for 20 years`, () => {
    const engine = new OrbitalEngine(presets[index].bodies),
      energy = diagnostics(engine.bodies).energy;
    const radii = engine.bodies
      .slice(1)
      .map((b) => distance(b, engine.bodies[0]));
    let maxEnergyError = 0,
      maxRadiusError = 0;
    for (let i = 0; i < 20 / DT; i++) {
      engine.step();
      if (i % 1000 === 0) {
        maxEnergyError = Math.max(
          maxEnergyError,
          Math.abs((diagnostics(engine.bodies).energy - energy) / energy),
        );
        engine.bodies.slice(1).forEach((b, n) => {
          maxRadiusError = Math.max(
            maxRadiusError,
            Math.abs(distance(b, engine.bodies[0]) / radii[n] - 1),
          );
        });
      }
    }
    assert.ok(maxEnergyError < 0.0001, `energy error ${maxEnergyError}`);
    assert.ok(
      maxRadiusError < (index === 1 ? 0.03 : 0.001),
      `radial error ${maxRadiusError}`,
    );
  });
test("three-body system evolves and conserves momentum until any resolution stop", () => {
  const engine = new OrbitalEngine(presets[3].bodies);
  let stopped = false;
  for (let i = 0; i < 20 / DT; i++) {
    try {
      engine.step();
    } catch (e) {
      assert.match(e.message, /Close approach/);
      stopped = true;
      break;
    }
  }
  assert.ok(engine.time > 0.5, "useful encounter before accuracy stop");
  const d = diagnostics(engine.bodies);
  near(d.momentum.x, 0);
  near(d.momentum.y, 0);
  assert.ok(stopped || Math.abs(d.energy / engine.referenceEnergy - 1) < 0.01);
});
test("equal physical time at 60, 120, 165 Hz for every speed", () => {
  for (const speed of [0.1, 0.25, 0.5, 1, 2, 4]) {
    const counts = [60, 120, 165].map((hz) => {
      const clock = new SimulationClock();
      let count = 0;
      for (let frame = 0; frame < hz * 3; frame++)
        clock.advance(1 / hz, speed, () => count++);
      return count;
    });
    counts.forEach((count) => near(count * DT, 3 * speed, DT));
    assert.equal(Math.max(...counts) - Math.min(...counts), 0);
  }
});
test("stalled frames bounded, debt cleared, malformed clock inputs rejected", () => {
  const clock = new SimulationClock();
  let count = 0;
  assert.equal(
    clock.advance(10000, 4, () => count++),
    true,
  );
  assert.equal(count, MAX_SUBSTEPS);
  clock.reset();
  count = 0;
  clock.advance(0, 4, () => count++);
  assert.equal(count, 0);
  for (const [s, speed] of [
    [NaN, 1],
    [-1, 1],
    [1, Infinity],
    [1, 100],
  ])
    assert.throws(() => clock.advance(s, speed, () => {}));
});
test("trails remain a fixed-size ring with oldest samples overwritten", () => {
  const engine = new OrbitalEngine(presets[0].bodies);
  for (let i = 0; i < TRAIL_INTERVAL * (TRAIL_CAPACITY + 10); i++)
    engine.step();
  engine.trails.forEach((t) => {
    assert.equal(t.length, TRAIL_CAPACITY);
    assert.equal(t.points.length, TRAIL_CAPACITY * 2);
    assert.ok(t.head >= 0 && t.head < TRAIL_CAPACITY);
  });
});
test("atomic edit clears trails and energy baseline, keeps elapsed time and recoverable presets", () => {
  const engine = new OrbitalEngine(presets[0].bodies);
  engine.step();
  const before = cloneBodies(engine.bodies);
  assert.throws(() =>
    engine.edit("planet", {
      mass: NaN,
      position: { x: 1, y: 0 },
      velocity: { x: 0, y: 8 },
    }),
  );
  assert.deepEqual(engine.bodies, before);
  engine.edit("planet", {
    mass: 0.000003,
    position: { x: 1, y: 0 },
    velocity: { x: 0, y: 8 },
  });
  assert.equal(engine.bodies[1].velocity.y, 8);
  assert.equal(engine.time, DT);
  near(engine.referenceEnergy, diagnostics(engine.bodies).energy);
  assert.equal(engine.trails[0].length, 1);
  assert.equal(presets[0].bodies[1].position.y, 0);
});
test("malformed/degenerate protection; softened coincident low masses remain finite", () => {
  for (const mass of [NaN, Infinity, 0, -1, 6]) {
    const b = cloneBodies(presets[0].bodies);
    b[1].mass = mass;
    assert.throws(() => new OrbitalEngine(b));
  }
  assert.throws(() => validateBodies([]));
  assert.throws(() => validateBodies(Array(9).fill(presets[0].bodies[0])));
  const duplicate = cloneBodies(presets[0].bodies);
  duplicate[1].id = duplicate[0].id;
  assert.throws(() => validateBodies(duplicate));
  const close = cloneBodies(presets[2].bodies);
  close[1].position = { ...close[0].position };
  assert.throws(() => new OrbitalEngine(close), /Close approach/);
  close.forEach((b) => {
    b.mass = 0.000003;
    b.velocity = { x: 0, y: 0 };
  });
  const engine = new OrbitalEngine(close);
  engine.step();
  assert.ok(accelerations(engine.bodies).every(Number.isFinite));
  const bad = cloneBodies(presets[0].bodies);
  bad[1].position.x = Infinity;
  assert.throws(() => new OrbitalEngine(bad));
  bad[1].position.x = 101;
  assert.throws(() => new OrbitalEngine(bad));
  bad[1].position.x = 1;
  bad[1].velocity.y = 101;
  assert.throws(() => new OrbitalEngine(bad));
});
test("unresolved step rolls back and never advances time", () => {
  const engine = new OrbitalEngine(presets[2].bodies);
  engine.bodies.forEach((b) => {
    b.velocity = { x: 0, y: 0 };
  });
  for (let i = 0; i < 1 / DT; i++) {
    const before = cloneBodies(engine.bodies),
      time = engine.time;
    try {
      engine.step();
    } catch (e) {
      assert.match(e.message, /Close approach/);
      assert.deepEqual(engine.bodies, before);
      assert.equal(engine.time, time);
      return;
    }
  }
  assert.fail("expected accuracy stop");
});
test("existing Orbital slug is available; Traffic remains unavailable", () => {
  const orbital = simulationsData.find((s) => s.id === "orbital-simulator");
  assert.equal(orbital.path, "/simulations/orbital-simulator");
  assert.equal(orbital.isAvailable, true);
  assert.equal(orbital.statusLabel, undefined);
  assert.equal(orbital.previewType, "orbital");
  assert.equal(
    simulationsData.find((s) => s.id === "traffic-simulator").isAvailable,
    false,
  );
});
