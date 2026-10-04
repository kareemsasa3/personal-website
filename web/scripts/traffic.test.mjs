import test from "node:test";
import assert from "node:assert/strict";
import {
  DT,
  equilibriumSpeed,
  idm,
} from "../src/components/TrafficSimulator/model/idm.ts";
import {
  YELLOW,
  signalPhase,
  signalTiming,
} from "../src/components/TrafficSimulator/model/signals.ts";
import {
  HISTORY_CAPACITY,
  SAMPLE_CAPACITY,
  TrafficEngine,
} from "../src/components/TrafficSimulator/model/engine.ts";
import {
  MAX_SUBSTEPS,
  SPEEDS,
  SimulationClock,
} from "../src/components/TrafficSimulator/model/clock.ts";
import {
  findScenario,
  scenarios,
} from "../src/components/TrafficSimulator/model/scenarios.ts";
import { simulationsData } from "../src/data/simulationsData.ts";

const near = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} ≈ ${b} (±${tolerance})`);
const run = (engine, seconds, each) => {
  for (let i = 0, n = Math.round(seconds / DT); i < n; i++) {
    engine.step();
    each?.(engine);
  }
  return engine;
};
const build = (id, params = {}) => {
  const scenario = findScenario(id);
  return new TrafficEngine(scenario, { ...scenario.defaults, ...params });
};
const speeds = (engine) => engine.vehicles.map((v) => v.v);
const deviation = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
};
/** Every invariant that must hold after any step, for any scenario. */
const assertConsistent = (engine) => {
  const { scenario } = engine;
  for (const lane of engine.lanes)
    for (let i = 0; i < lane.length; i++) {
      const v = lane[i];
      assert.ok(Number.isFinite(v.x) && Number.isFinite(v.v) && Number.isFinite(v.acc));
      assert.ok(v.v >= 0, "vehicles never reverse");
      if (i > 0) {
        assert.ok(lane[i - 1].x > v.x, "lanes stay sorted downstream-first");
        assert.ok(lane[i - 1].x - lane[i - 1].length >= v.x - 1e-6, "no overlap");
      }
      if (scenario.laneDrop && v.lane === scenario.laneDrop.lane)
        assert.ok(v.x <= scenario.laneDrop.x + 1e-6, "no vehicle passes the end of its lane");
    }
  assert.equal(engine.guardEvents, 0, "the overlap guard never had to intervene");
};

test("IDM: free-road acceleration, desired speed, and equilibrium gap", () => {
  const d = { v0: 20, T: 1.2, a: 1, b: 1.5, s0: 2 };
  near(idm(0, Infinity, 0, d), d.a);
  near(idm(d.v0, Infinity, 0, d), 0);
  assert.ok(idm(25, Infinity, 0, d) < 0, "above desired speed decelerates");
  for (const gap of [5, 15, 40]) {
    const v = equilibriumSpeed(gap, d);
    assert.ok(v > 0 && v < d.v0);
    near(idm(v, gap, v, d), 0, 1e-6);
  }
  assert.equal(equilibriumSpeed(d.s0, d), 0);
  assert.ok(idm(15, 20, 0, d) < -d.b, "closing on a stopped obstacle brakes hard");
  assert.ok(idm(10, 30, 15, d) > idm(10, 30, 5, d), "a faster leader permits more acceleration");
});

test("signal timing: green wave offsets and a complete green/yellow/red cycle", () => {
  const positions = [250, 550, 850];
  const wave = signalTiming(positions, "green-wave", 10, 60, 0.5);
  assert.deepEqual(wave.offsets, [0, 30, 0]);
  assert.equal(wave.green, 30);
  assert.deepEqual(signalTiming(positions, "simultaneous", 10, 60, 0.5).offsets, [0, 0, 0]);
  assert.deepEqual(signalTiming(positions, "reverse", 10, 60, 0.5).offsets, [0, 30, 0]);
  const reverse = signalTiming([0, 100], "reverse", 10, 60, 0.5);
  near(reverse.offsets[1], 50);
  const timing = signalTiming([0], "simultaneous", 10, 60, 0.5);
  const durations = { green: 0, yellow: 0, red: 0 };
  for (let t = 0; t < 60; t += 0.1) durations[signalPhase(t, 0, timing).state] += 0.1;
  near(durations.green, 30, 0.11);
  near(durations.yellow, YELLOW, 0.11);
  near(durations.red, 60 - 30 - YELLOW, 0.11);
  assert.equal(signalPhase(0, 0, timing).state, "green");
  assert.equal(signalPhase(-1, 0, timing).state, "red", "negative time wraps into the previous cycle");
});

test("same scenario and parameters replay identically", () => {
  for (const scenario of scenarios) {
    const a = run(new TrafficEngine(scenario), 120);
    const b = run(new TrafficEngine(scenario), 120);
    assert.deepEqual(
      a.vehicles.map((v) => [v.id, v.lane, v.x, v.v]),
      b.vehicles.map((v) => [v.id, v.lane, v.x, v.v]),
    );
    assert.deepEqual(a.metrics(), b.metrics());
  }
});

test("no overlap, reversal, or lane overrun at every control extreme", () => {
  for (const scenario of scenarios)
    for (const control of scenario.controls)
      for (const value of [control.min, control.max]) {
        const engine = build(scenario.id, { [control.key]: value });
        run(engine, 300, (e) => {
          if (e.steps % 10 === 0) assertConsistent(e);
        });
        assertConsistent(engine);
      }
  for (const coordination of ["green-wave", "simultaneous", "reverse"])
    assertConsistent(run(build("corridor", { coordination, demand: 3000 }), 300));
});

test("vehicles are conserved", () => {
  for (const id of ["corridor", "bottleneck"]) {
    const engine = run(build(id, { demand: findScenario(id).controls[0].max }), 400);
    assert.equal(engine.entered, engine.exited + engine.vehicles.length);
    assert.equal(engine.exits.length > 0, true);
  }
  const ring = build("ring");
  run(ring, 300);
  assert.equal(ring.vehicles.length, ring.params.vehicles);
});

test("drivers stop for red; only drivers committed on yellow cross after it turns", () => {
  const engine = build("corridor", { demand: 1800 });
  const { signals } = engine.scenario;
  let crossings = 0,
    latestIntoRed = 0;
  const previous = new Map();
  run(engine, 900, (e) => {
    const timing = e.signalTiming;
    const redLength = timing.cycle - timing.green - YELLOW;
    for (const v of e.vehicles) {
      const before = previous.get(v.id);
      if (before !== undefined)
        signals.forEach((x, index) => {
          if (before < x && v.x >= x) {
            crossings++;
            const phase = signalPhase(e.time, timing.offsets[index], timing);
            if (phase.state === "red")
              latestIntoRed = Math.max(latestIntoRed, redLength - phase.remaining);
          }
        });
      previous.set(v.id, v.x);
    }
  });
  assert.ok(crossings > 600, `${crossings} stop-line crossings observed`);
  assert.ok(latestIntoRed <= 2, `latest crossing ${latestIntoRed.toFixed(2)} s into red`);
  assert.ok(engine.exits.some((x) => x.stops > 0), "some drivers did stop");
});

test("coordination: a green wave beats simultaneous and reverse offsets on the same traffic", () => {
  const outcome = (coordination) => {
    const engine = run(build("corridor", { coordination }), 900);
    const exits = engine.exits.filter((x) => x.time > 300);
    const mean = (key) => exits.reduce((sum, x) => sum + x[key], 0) / exits.length;
    return { stops: mean("stops"), trip: mean("tripTime"), count: exits.length };
  };
  const wave = outcome("green-wave"),
    simultaneous = outcome("simultaneous"),
    reverse = outcome("reverse");
  assert.ok(wave.count > 100);
  assert.ok(wave.stops < simultaneous.stops * 0.6, JSON.stringify({ wave, simultaneous }));
  assert.ok(wave.stops < reverse.stops * 0.6, JSON.stringify({ wave, reverse }));
  assert.ok(wave.trip < simultaneous.trip && wave.trip < reverse.trip);
});

test("demand above signal capacity builds an entrance queue; demand below it does not", () => {
  const light = run(build("corridor", { demand: 600 }), 600);
  assert.equal(light.waiting.length, 0);
  const heavy = build("corridor", { demand: 3000 });
  run(heavy, 300);
  const early = heavy.waiting.length;
  run(heavy, 300);
  assert.ok(heavy.waiting.length > early && early > 20, `${early} → ${heavy.waiting.length}`);
  assert.ok(heavy.metrics().flow < 3000 * 0.75, "discharge is capped by green time");
});

test("lane drop: a queue forms upstream of the merge only when demand exceeds it", () => {
  const queuedNearMerge = (engine) =>
    engine.vehicles.filter((v) => v.x > 500 && v.x < 900 && v.v < 5).length;
  const light = run(build("bottleneck", { demand: 1500 }), 600);
  assert.ok(queuedNearMerge(light) < 5, `${queuedNearMerge(light)} slow vehicles at low demand`);
  assert.equal(light.waiting.length, 0);
  const heavy = run(build("bottleneck", { demand: 4500 }), 600);
  assert.ok(queuedNearMerge(heavy) > 20, `${queuedNearMerge(heavy)} slow vehicles at high demand`);
  assert.ok(heavy.laneChanges > 200);
  const downstream = heavy.vehicles.filter((v) => v.x > 900);
  assert.ok(downstream.every((v) => v.lane < 2), "only two lanes continue past the drop");
});

test("ring road: uniform flow persists; a brief brake grows into a jam only at high density", () => {
  const steady = run(build("ring"), 300);
  assert.ok(deviation(speeds(steady)) < 0.1, "unperturbed equilibrium stays uniform");
  const perturbed = (params) => {
    const engine = build("ring", params);
    run(engine, 20);
    const before = engine.metrics().meanSpeed;
    engine.perturb();
    run(engine, 280);
    return { engine, before };
  };
  const dense = perturbed({});
  assert.ok(dense.engine.metrics().minSpeed < 0.5, "stop-and-go: some drivers come to a halt");
  assert.ok(deviation(speeds(dense.engine)) > 3);
  const sparse = perturbed({ vehicles: 20 });
  assert.ok(sparse.engine.metrics().minSpeed > sparse.before * 0.8, "the tap fades at low density");
  const responsive = perturbed({ acceleration: 1.5 });
  assert.ok(responsive.engine.metrics().minSpeed > responsive.before * 0.8, "and with quicker drivers");
});

test("parameter edits are validated and atomic", () => {
  const engine = build("corridor");
  const before = { ...engine.params };
  assert.throws(() => engine.setParams({ cycle: 10 }), /Cycle length/);
  assert.throws(() => engine.setParams({ demand: Number.NaN }), /Arrival demand/);
  assert.throws(() => engine.setParams({ coordination: "chaos" }), /coordination/);
  assert.deepEqual(engine.params, before);
  engine.setParams({ cycle: 90, greenShare: 0.6, coordination: "reverse" });
  assert.equal(engine.signalTiming.cycle, 90);
  assert.equal(engine.signalTiming.green, 54);
  assert.throws(() => build("ring").setParams({ vehicles: 20 }), /rebuilds/);
  assert.throws(() => new TrafficEngine(findScenario("ring"), { ...findScenario("ring").defaults, vehicles: 500 }));
});

test("space-time samples and flow history stay bounded", () => {
  const engine = run(build("corridor"), 900);
  assert.equal(engine.samples.length, SAMPLE_CAPACITY);
  assert.equal(engine.history.length, HISTORY_CAPACITY);
  const last = engine.samples.at(-1);
  assert.equal(last.x.length, last.speed.length);
  assert.equal(last.signals.length, 3);
  assert.ok(engine.samples.every((s, i, all) => i === 0 || s.time > all[i - 1].time));
});

test("the clock is frame-rate independent and bounds stalls", () => {
  for (const speed of SPEEDS) {
    const results = [60, 120, 144].map((hz) => {
      const clock = new SimulationClock();
      let steps = 0;
      for (let frame = 0; frame < hz * 5; frame++) clock.advance(1 / hz, speed, () => steps++);
      return steps;
    });
    const expected = Math.round((5 * speed) / DT);
    for (const steps of results) assert.ok(Math.abs(steps - expected) <= 1, `${speed}×: ${results}`);
  }
  const clock = new SimulationClock();
  let steps = 0;
  assert.equal(clock.advance(5, 16, () => steps++), true, "a stalled frame reports limiting");
  assert.ok(steps <= MAX_SUBSTEPS);
  assert.throws(() => clock.advance(0.016, 3, () => {}), /Invalid/);
  assert.throws(() => clock.advance(-1, 1, () => {}), /Invalid/);
});

test("the Traffic Simulator card is launchable at its existing slug", () => {
  const traffic = simulationsData.find((s) => s.id === "traffic-simulator");
  assert.equal(traffic.path, "/simulations/traffic-simulator");
  assert.equal(traffic.isAvailable, true);
  assert.equal(traffic.statusLabel, undefined);
  assert.equal(traffic.previewType, "traffic");
});
