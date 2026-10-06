import test from "node:test";
import assert from "node:assert/strict";
import {
  DT,
  MAX_DECELERATION,
  equilibriumSpeed,
  idm,
} from "../src/components/TrafficSimulator/model/idm.ts";
import {
  YELLOW,
  signalPhase,
  signalTiming,
} from "../src/components/TrafficSimulator/model/signals.ts";
import {
  EXIT_CAPACITY,
  FLOW_WINDOW,
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
import { slowStretches } from "../src/components/TrafficSimulator/model/congestion.ts";
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

/**
 * Watches every signal's shown state and every stop-line crossing.
 * Returns the illegal transitions, the shortest yellow, and crossings made on red.
 */
const watchSignals = (engine, seconds, each) => {
  const { signals } = engine.scenario;
  const shown = engine.signalStates().map((s) => s.state);
  const yellowSince = shown.map((state) => (state === "yellow" ? engine.time : null));
  const legal = { green: ["green", "yellow"], yellow: ["yellow", "red"], red: ["red", "green"] };
  const previous = new Map(engine.vehicles.map((v) => [v.id, v.x]));
  const result = { engine, illegal: [], shortestYellow: Infinity, redCrossings: 0, crossings: 0 };
  run(engine, seconds, (e) => {
    each?.(e);
    e.signalStates().forEach(({ state }, index) => {
      const before = shown[index];
      if (!legal[before].includes(state)) result.illegal.push(`${before}→${state} at S${index + 1}, t=${e.time.toFixed(1)}`);
      if (before !== "yellow" && state === "yellow") yellowSince[index] = e.time;
      if (before === "yellow" && state !== "yellow" && yellowSince[index] !== null)
        result.shortestYellow = Math.min(result.shortestYellow, e.time - yellowSince[index]);
      shown[index] = state;
    });
    for (const v of e.vehicles) {
      const before = previous.get(v.id);
      if (before !== undefined)
        signals.forEach((x, index) => {
          if (before < x && v.x >= x) {
            result.crossings++;
            if (shown[index] === "red") result.redCrossings++;
          }
        });
      previous.set(v.id, v.x);
    }
  });
  return result;
};

test("signals only step green → yellow → red → green, and nobody crosses on red", () => {
  const watched = watchSignals(build("corridor", { demand: 1800 }), 900);
  assert.deepEqual(watched.illegal, []);
  near(watched.shortestYellow, YELLOW, DT / 2);
  assert.ok(watched.crossings > 600, `${watched.crossings} stop-line crossings observed`);
  assert.equal(watched.redCrossings, 0);
  assert.ok(watched.engine.exits.some((x) => x.stops > 0), "some drivers did stop");
});

test("abrupt timing edits mid-run still show a full yellow before red; nobody crosses on red", () => {
  // Regression: edits used to jump a signal straight from green to red (or cut a
  // yellow short) under approaching traffic, and drivers too close to stop crossed on red.
  const cycles = [40, 120, 65, 90],
    coordinations = ["green-wave", "reverse", "simultaneous"],
    shares = [0.3, 0.7];
  let edits = 0;
  const watched = watchSignals(build("corridor", { demand: 1800 }), 1800, (e) => {
    if (e.steps % 370 !== 0) return;
    e.setParams({
      cycle: cycles[edits % cycles.length],
      coordination: coordinations[edits % coordinations.length],
      greenShare: shares[edits % shares.length],
    });
    edits++;
  });
  assert.ok(edits >= 45, `${edits} edits`);
  assert.deepEqual(watched.illegal, []);
  assert.ok(watched.shortestYellow >= YELLOW - DT / 2, `shortest yellow ${watched.shortestYellow}`);
  assert.equal(watched.redCrossings, 0, `${watched.redCrossings} of ${watched.crossings} crossings on red`);
});

test("without edits, every signal shows exactly its fixed-time schedule", () => {
  for (const coordination of ["green-wave", "simultaneous", "reverse"]) {
    const engine = build("corridor", { coordination, cycle: 75, greenShare: 0.4 });
    run(engine, 600, (e) =>
      e.signalStates().forEach((signal, index) =>
        assert.equal(signal.state, signalPhase(e.time, e.signalTiming.offsets[index], e.signalTiming).state),
      ),
    );
  }
});

test("drivers who can stop for yellow do so without emergency braking", () => {
  // A driver stops for yellow only when 3 m/s² is enough, so nobody should need the 9 m/s² limit.
  for (const params of [{}, { demand: 1800 }, { demand: 1800, acceleration: 2 }]) {
    const engine = build("corridor", params);
    let emergencies = 0;
    run(engine, 900, (e) => {
      for (const v of e.vehicles) if (v.acc <= -MAX_DECELERATION + 1e-9) emergencies++;
    });
    assert.ok(emergencies < 10, `${emergencies} emergency-braking steps with ${JSON.stringify(params)}`);
  }
});

/** Lane changes observed step by step, with the braking each imposed on its new follower. */
const laneChangeEffects = (engine, seconds) => {
  const out = { changes: 0, worstImposed: 0, imposed: 0, tightGaps: 0, closureEntries: 0 };
  const drop = engine.scenario.laneDrop;
  let lanes = new Map(engine.vehicles.map((v) => [v.id, v.lane]));
  run(engine, seconds, (e) => {
    for (const lane of e.lanes)
      lane.forEach((v, i) => {
        const before = lanes.get(v.id);
        if (before === undefined || before === v.lane) return;
        out.changes++;
        if (drop && v.lane === drop.lane && v.x > drop.x - 400) out.closureEntries++;
        const follower = lane[i + 1];
        if (!follower) return;
        const gap = v.x - v.length - follower.x;
        if (gap < follower.s0 / 2) out.tightGaps++;
        const driver = { v0: follower.v0, T: follower.T, a: e.params.acceleration * follower.accelerationScale, b: follower.b, s0: follower.s0 };
        const imposed = Math.min(0, idm(follower.v, gap, v.v, driver));
        out.worstImposed = Math.min(out.worstImposed, imposed);
        out.imposed += imposed;
      });
    lanes = new Map(e.vehicles.map((v) => [v.id, v.lane]));
  });
  return { ...out, meanImposed: out.imposed / Math.max(1, out.changes) };
};

test("lane changes are safe for the new follower, polite, and stay out of the closing lane", () => {
  for (const params of [{}, { demand: 5400, politeness: 0 }]) {
    const effects = laneChangeEffects(build("bottleneck", params), 900);
    assert.ok(effects.changes > 300, `${effects.changes} lane changes`);
    assert.ok(effects.worstImposed >= -4, `worst braking imposed ${effects.worstImposed.toFixed(2)} m/s²`);
    assert.equal(effects.tightGaps, 0, "no change cuts in closer than half the jam gap");
    assert.equal(effects.closureEntries, 0, "nobody moves into the ending lane in its last 400 m");
  }
  const polite = laneChangeEffects(build("bottleneck", { politeness: 1 }), 900);
  const selfish = laneChangeEffects(build("bottleneck", { politeness: 0 }), 900);
  assert.ok(
    polite.meanImposed > selfish.meanImposed + 0.2,
    `politeness spares followers: ${polite.meanImposed.toFixed(2)} vs ${selfish.meanImposed.toFixed(2)} m/s²`,
  );
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

test("ring road: dense even flow is unstable; a brake tap sets off the jam early and fades at low density", () => {
  // Left alone, the default ring stays even for minutes, then jams by itself:
  // the tap is an intervention that triggers the instability, not its only cause.
  const unperturbed = build("ring");
  run(unperturbed, 300);
  assert.ok(deviation(speeds(unperturbed)) < 0.1, "even flow holds for the first minutes");
  run(unperturbed, 1200);
  assert.ok(deviation(speeds(unperturbed)) > 3, "and then breaks down without any tap");
  const belowThreshold = run(build("ring", { vehicles: 25 }), 1500);
  assert.ok(deviation(speeds(belowThreshold)) < 0.1, "at lower density even flow is stable");
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

test("slow stretches: the diagram's dark bands as text", () => {
  const sample = (pairs) => ({
    time: 0,
    x: Float32Array.from(pairs.map(([x]) => x)),
    speed: Float32Array.from(pairs.map(([, speed]) => speed)),
    signals: [],
  });
  const open = slowStretches(sample([[100, 0], [110, 0.1], [125, 0.2], [300, 0.05], [500, 0], [520, 0], [545, 0.25], [560, 0.9]]), 1000, false);
  assert.deepEqual(open, [
    { from: 100, to: 125, vehicles: 3 },
    { from: 500, to: 545, vehicles: 3 },
  ], "joins nearby slow vehicles, drops isolated ones, ignores fast ones");
  const ring = slowStretches(sample([[5, 0], [15, 0], [580, 0], [590, 0]]), 600, true);
  assert.deepEqual(ring, [{ from: 580, to: 15, vehicles: 4 }], "a ring stretch can wrap past the detector");
  // On the dense ring, the jam's downstream end moves backward while cars move forward.
  const engine = build("ring");
  run(engine, 20);
  engine.perturb();
  run(engine, 40);
  const front = () => slowStretches(engine.samples.at(-1), 600, true).sort((a, b) => b.vehicles - a.vehicles)[0].to;
  const before = front();
  run(engine, 10);
  const moved = ((front() - before + 900) % 600) - 300; // signed, around the loop
  assert.ok(moved < -10, `jam front moved ${moved.toFixed(1)} m in 10 s`);
  // At a saturated lane drop, slow traffic sits upstream of the drop.
  const merge = run(build("bottleneck", { demand: 4500 }), 600);
  const stretches = slowStretches(merge.samples.at(-1), merge.scenario.length, false);
  assert.ok(stretches.length > 0 && stretches.every((s) => s.to < merge.scenario.laneDrop.x + 50), JSON.stringify(stretches));
});

test("admission: arrivals enter no faster than the vehicle they join, and the ring starts in equilibrium", () => {
  const engine = build("bottleneck", { demand: 5400 });
  const seen = new Set(engine.vehicles.map((v) => v.id));
  let admitted = 0;
  run(engine, 600, (e) => {
    for (const lane of e.lanes)
      lane.forEach((v, i) => {
        if (seen.has(v.id)) return;
        seen.add(v.id);
        admitted++;
        const leader = lane[i - 1];
        if (leader && leader.x - leader.length < 150)
          assert.ok(v.v <= leader.v + 1e-6, `entered at ${v.v.toFixed(2)} behind a leader at ${leader.v.toFixed(2)} m/s`);
      });
  });
  assert.ok(admitted > 300, `${admitted} vehicles admitted`);
  assert.equal(engine.guardEvents, 0);
  const ring = build("ring");
  const ringSpeeds = speeds(ring);
  assert.ok(Math.min(...ringSpeeds) > 5, "ring vehicles start moving at the speed their spacing allows");
  assert.ok(deviation(ringSpeeds) < 1e-9);
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

test("trip accounting: open roads start warmed up, trips include the entrance wait, and vehicles leave by the rear bumper", () => {
  for (const id of ["corridor", "bottleneck"]) {
    const engine = build(id);
    near(engine.time, engine.scenario.warmup, DT / 2);
    assert.ok(engine.vehicles.length > 10, `${id} starts with traffic on the road`);
  }
  const engine = build("corridor", { demand: 3000 });
  const enteredAt = new Map(engine.vehicles.map((v) => [v.id, engine.time]));
  const onRoad = [];
  let frontPastExit = 0;
  run(engine, 600, (e) => {
    const present = new Set();
    for (const v of e.vehicles) {
      present.add(v.id);
      if (!enteredAt.has(v.id)) enteredAt.set(v.id, e.time);
      if (v.x > e.scenario.length) frontPastExit++;
    }
    for (const [id, t] of enteredAt)
      if (!present.has(id)) {
        onRoad.push(e.time - t);
        enteredAt.delete(id);
      }
  });
  const recentOnRoad = onRoad.slice(-50).reduce((a, b) => a + b, 0) / 50;
  assert.ok(engine.waiting.length > 100, "the entrance queue is long");
  assert.ok(
    engine.metrics().tripTime > recentOnRoad + 60,
    `trip ${engine.metrics().tripTime.toFixed(0)} s vs ${recentOnRoad.toFixed(0)} s on the road`,
  );
  assert.ok(frontPastExit > 0, "a vehicle stays until its rear clears the end");
});

test("space-time samples, exits, detector passages, and flow history stay bounded", () => {
  const engine = run(build("corridor"), 900);
  assert.equal(engine.samples.length, SAMPLE_CAPACITY);
  assert.equal(engine.history.length, HISTORY_CAPACITY);
  const heavy = run(build("bottleneck", { demand: 5400 }), 600);
  assert.ok(heavy.exited > EXIT_CAPACITY && heavy.exits.length <= EXIT_CAPACITY, `${heavy.exits.length} exit records`);
  const ring = run(build("ring"), 600);
  assert.ok(ring.crossings.length > 0 && ring.crossings.every((t) => t >= ring.time - FLOW_WINDOW));
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
  // A long frame advances at most 0.1 s of wall time; the rest is dropped, not caught up.
  for (const speed of [1, 16]) {
    const capped = new SimulationClock();
    let n = 0;
    assert.equal(capped.advance(0.5, speed, () => n++), true);
    assert.equal(n, Math.round((0.1 * speed) / DT), `${speed}× after a 0.5 s frame`);
  }
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
