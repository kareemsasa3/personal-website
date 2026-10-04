import test from "node:test";
import assert from "node:assert/strict";
import {
  DT,
  NETWORK,
  SPEED_LIMIT,
  VEHICLE_LENGTH,
} from "../src/components/TrafficSimulator/model/network.ts";
import {
  IDM,
  idmAcceleration,
} from "../src/components/TrafficSimulator/model/idm.ts";
import {
  ALL_RED,
  MAX_GREEN,
  MIN_GREEN,
  YELLOW,
  advanceSignal,
  greenTimes,
  lightFor,
  scheduledState,
} from "../src/components/TrafficSimulator/model/signals.ts";
import {
  HISTORY_CAPACITY,
  MAX_BACKLOG_PER_ENTRY,
  TrafficEngine,
} from "../src/components/TrafficSimulator/model/engine.ts";
import {
  MAX_SUBSTEPS,
  SPEEDS,
  SimulationClock,
} from "../src/components/TrafficSimulator/model/clock.ts";
import { presets } from "../src/components/TrafficSimulator/model/presets.ts";
import { simulationsData } from "../src/data/simulationsData.ts";

const preset = (id) => {
  const found = presets.find((p) => p.id === id);
  assert.ok(found, `preset ${id} exists`);
  return found;
};
const engineFor = (id, overrides = {}) => {
  const p = preset(id);
  return new TrafficEngine({
    demand: { ...p.demand, ...overrides.demand },
    plan: { ...p.plan, ...overrides.plan },
    seed: overrides.seed ?? p.seed,
  });
};
const fixedPlan = (overrides = {}) => ({
  mode: "fixed",
  cycle: 60,
  split: 0.5,
  offset: 0,
  ...overrides,
});
const near = (a, b, tolerance) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} ≈ ${b} (±${tolerance})`);
const laneSnapshot = (engine) =>
  JSON.stringify({
    time: engine.time,
    signals: engine.signals,
    lanes: engine.lanes.map((lane) => lane.vehicles),
  });
const firstStop = (lane) => lane.spec.stops[0];

// ---------------------------------------------------------------------------
// Car following
// ---------------------------------------------------------------------------

test("IDM: free road accelerates toward, never past, the desired speed", () => {
  let v = 0;
  for (let i = 0; i < 600; i++) {
    const a = idmAcceleration(v, SPEED_LIMIT, Infinity, 0);
    assert.ok(a <= IDM.maxAccel + 1e-12);
    v += a * DT;
  }
  assert.ok(v <= SPEED_LIMIT + 1e-9, `v=${v}`);
  near(v, SPEED_LIMIT, 0.3);
  near(idmAcceleration(SPEED_LIMIT, SPEED_LIMIT, Infinity, 0), 0, 1e-12);
});

test("IDM: closing on a stopped obstacle brakes harder the closer it is", () => {
  const far = idmAcceleration(SPEED_LIMIT, SPEED_LIMIT, 120, SPEED_LIMIT);
  const mid = idmAcceleration(SPEED_LIMIT, SPEED_LIMIT, 50, SPEED_LIMIT);
  const close = idmAcceleration(SPEED_LIMIT, SPEED_LIMIT, 20, SPEED_LIMIT);
  assert.ok(far > mid && mid > close, `${far} > ${mid} > ${close}`);
  assert.ok(close < -IDM.comfortDecel);
  // A stopped vehicle at the jam gap neither creeps forward nor reverses.
  near(idmAcceleration(0, SPEED_LIMIT, IDM.minGap, 0), 0, 1e-9);
  assert.ok(idmAcceleration(0, SPEED_LIMIT, 1, 0) < 0);
});

// ---------------------------------------------------------------------------
// Signal controller
// ---------------------------------------------------------------------------

/** Steps a single controller and returns the run-length encoded stage history. */
const runSignal = ({ plan, index = 0, seconds, demand, planAt }) => {
  let state = scheduledState(plan, 0, index);
  let current = plan;
  const runs = [{ axis: state.axis, stage: state.stage, start: 0, end: 0 }];
  const steps = Math.round(seconds / DT);
  for (let i = 1; i <= steps; i++) {
    const time = i * DT;
    if (planAt && planAt.time <= time) current = planAt.plan;
    state = advanceSignal(state, {
      plan: current,
      time,
      index,
      demand: demand ? demand(time) : { EW: true, NS: true },
    });
    const ew = lightFor(state, "EW"),
      ns = lightFor(state, "NS");
    assert.ok(ew === "red" || ns === "red", `conflicting lights at ${time}`);
    const last = runs.at(-1);
    if (last.axis === state.axis && last.stage === state.stage) last.end = time;
    else runs.push({ axis: state.axis, stage: state.stage, start: time, end: time });
  }
  return runs.map((r) => ({ ...r, duration: r.end - r.start + DT }));
};

/** Every change follows green → yellow → all-red → green on the other axis. */
const assertSafeSequence = (runs) => {
  for (let i = 1; i < runs.length; i++) {
    const [a, b] = [runs[i - 1], runs[i]];
    if (a.stage === "green") {
      assert.equal(b.stage, "yellow");
      assert.equal(b.axis, a.axis);
    } else if (a.stage === "yellow") {
      assert.equal(b.stage, "allRed");
      assert.equal(b.axis, a.axis);
      if (i > 1) near(a.duration, YELLOW, DT / 2);
    } else {
      assert.equal(b.stage, "green");
      assert.notEqual(b.axis, a.axis);
      if (i > 1) near(a.duration, ALL_RED, DT / 2);
    }
  }
};

test("fixed-time controller reproduces its plan: greens, yellow, all-red, cycle", () => {
  const plan = fixedPlan({ cycle: 80, split: 0.6 });
  const green = greenTimes(plan);
  near(green.EW + green.NS + 2 * (YELLOW + ALL_RED), plan.cycle, 1e-9);
  near(green.EW / (green.EW + green.NS), 0.6, 1e-9);
  const runs = runSignal({ plan, seconds: 400 });
  assertSafeSequence(runs);
  const greens = runs.slice(1, -1).filter((r) => r.stage === "green");
  assert.ok(greens.length >= 6);
  for (const r of greens) near(r.duration, green[r.axis], DT / 2);
  const ewStarts = runs.filter(
    (r, i) => i > 0 && r.stage === "green" && r.axis === "EW",
  );
  for (let i = 1; i < ewStarts.length; i++)
    near(ewStarts[i].start - ewStarts[i - 1].start, plan.cycle, DT / 2);
});

test("offsets shift each intersection's cycle by index × offset", () => {
  const plan = fixedPlan({ offset: 17 });
  for (const index of [0, 1, 2]) {
    const runs = runSignal({ plan, index, seconds: 200 });
    const start = runs.find(
      (r, i) => i > 0 && r.stage === "green" && r.axis === "EW",
    ).start;
    near((((start - index * 17) % 60) + 60) % 60, 0, DT);
  }
});

test("changing the plan mid-cycle never skips yellow, all-red, or minimum green", () => {
  const runs = runSignal({
    plan: fixedPlan({ cycle: 120, split: 0.8 }),
    seconds: 400,
    planAt: { time: 31.3, plan: fixedPlan({ cycle: 40, split: 0.2, offset: 33 }) },
  });
  assertSafeSequence(runs);
  for (const r of runs.slice(1, -1).filter((r) => r.stage === "green"))
    assert.ok(r.duration >= MIN_GREEN - DT / 2, `green ${r.duration}`);
});

test("actuated control rests in green, gaps out, and caps green at the maximum", () => {
  const plan = { ...fixedPlan(), mode: "actuated" };
  // Only east–west traffic: the arterial keeps its green indefinitely.
  let runs = runSignal({ plan, seconds: 300, demand: () => ({ EW: true, NS: false }) });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].axis, "EW");
  // Continuous demand on both axes: each green is cut off at the maximum.
  runs = runSignal({ plan, seconds: 300, demand: () => ({ EW: true, NS: true }) });
  assertSafeSequence(runs);
  for (const r of runs.slice(0, -1).filter((r) => r.stage === "green"))
    assert.ok(r.duration <= MAX_GREEN + DT / 2, `green ${r.duration}`);
  assert.ok(runs.filter((r) => r.stage === "green").length >= 4);
  // The arterial empties while a side street waits: switch after minimum green.
  runs = runSignal({ plan, seconds: 30, demand: () => ({ EW: false, NS: true }) });
  near(runs.find((r) => r.stage === "yellow").start, MIN_GREEN, DT);
});

test("signal plans and demand are validated", () => {
  const engine = engineFor("balanced");
  for (const bad of [
    { cycle: 10 },
    { cycle: 500 },
    { cycle: NaN },
    { split: 0.95 },
    { split: Infinity },
    { offset: -1 },
    { mode: "random" },
  ])
    assert.throws(() => engine.setPlan({ ...engine.plan, ...bad }), `${JSON.stringify(bad)}`);
  for (const bad of [{ eastbound: -1 }, { westbound: NaN }, { cross: 1e9 }])
    assert.throws(() => engine.setDemand({ ...engine.demand, ...bad }));
  assert.throws(
    () =>
      new TrafficEngine({
        demand: { eastbound: 100, westbound: 100, cross: 100 },
        plan: fixedPlan({ cycle: 5 }),
        seed: 1,
      }),
  );
});

// ---------------------------------------------------------------------------
// Engine: determinism, invariants, conservation
// ---------------------------------------------------------------------------

test("identical seed and settings give identical traffic; a new seed differs", () => {
  const a = engineFor("rush-hour"),
    b = engineFor("rush-hour"),
    c = engineFor("rush-hour", { seed: 99 });
  a.run(300);
  b.run(300);
  c.run(300);
  assert.equal(laneSnapshot(a), laneSnapshot(b));
  assert.notEqual(laneSnapshot(a), laneSnapshot(c));
});

/** Independent checks of the physical and right-of-way rules after every step. */
const checkInvariants = (engine, seconds) => {
  const steps = Math.round(seconds / DT);
  let redEntries = 0,
    conflicts = 0,
    maxVehicles = 0;
  for (let i = 0; i < steps; i++) {
    const before = new Map();
    const lights = engine.signals.map((s) => ({
      EW: lightFor(s, "EW"),
      NS: lightFor(s, "NS"),
    }));
    for (const lane of engine.lanes)
      for (const v of lane.vehicles) before.set(v.id, v.position);
    engine.step();
    const occupied = NETWORK.intersections.map(() => new Set());
    let count = 0;
    for (const lane of engine.lanes) {
      const { vehicles, spec } = lane;
      count += vehicles.length;
      for (let n = 0; n < vehicles.length; n++) {
        const v = vehicles[n];
        assert.ok(v.speed >= 0 && v.speed <= SPEED_LIMIT * 1.2, `speed ${v.speed}`);
        assert.ok(v.position >= 0 && v.position < spec.length);
        if (n > 0) {
          const leader = vehicles[n - 1];
          assert.ok(
            leader.position - leader.length - v.position >= -1e-9,
            `overlap in ${spec.id} at ${engine.time}`,
          );
        }
        for (const stop of spec.stops) {
          if (v.position > stop.position && v.position - v.length < stop.position + stop.boxLength)
            occupied[stop.intersection].add(spec.axis);
          const previous = before.get(v.id);
          if (previous !== undefined && previous <= stop.position && v.position > stop.position)
            if (lights[stop.intersection][spec.axis] === "red") redEntries++;
        }
      }
    }
    maxVehicles = Math.max(maxVehicles, count);
    conflicts += occupied.filter((axes) => axes.size > 1).length;
  }
  assert.equal(redEntries, 0, "vehicles entered on red");
  assert.equal(conflicts, 0, "crossing streams shared an intersection box");
  return maxVehicles;
};

for (const p of presets)
  test(`${p.name}: no overlaps, no red entries, no box conflicts for 15 minutes`, () => {
    const engine = engineFor(p.id);
    const maxVehicles = checkInvariants(engine, 900);
    assert.ok(maxVehicles > 10, `traffic present (${maxVehicles})`);
    const t = engine.totals;
    assert.equal(
      t.arrivals,
      t.completed + engine.vehicleCount() + engine.waitingCount() + t.dropped,
      "every generated vehicle is on the road, waiting, finished, or dropped",
    );
  });

test("every multi-lane approach is used", () => {
  const engine = engineFor("balanced");
  const used = new Set();
  for (let i = 0; i < 3000; i++) {
    engine.step();
    for (const lane of engine.lanes) if (lane.vehicles.length) used.add(lane.spec.id);
  }
  for (const lane of engine.lanes) assert.ok(used.has(lane.spec.id), `${lane.spec.id} used`);
  assert.ok(engine.lanes.filter((l) => l.spec.route === "EB").length >= 2);
});

// ---------------------------------------------------------------------------
// Emergent behavior
// ---------------------------------------------------------------------------

test("a red light builds a stationary queue at the stop line that discharges on green", () => {
  const engine = new TrafficEngine({
    demand: { eastbound: 900, westbound: 0, cross: 0 },
    // East–west green 0–22 s, red until 120 s, green again 120–142 s.
    plan: fixedPlan({ cycle: 120, split: 0.2 }),
    seed: 7,
  });
  engine.run(100);
  const eb = engine.lanes.filter((l) => l.spec.route === "EB");
  const stop = firstStop(eb[0]).position;
  const served = () =>
    engine.totals.completed +
    eb.reduce((n, l) => n + l.vehicles.filter((v) => v.position > stop).length, 0);
  const queued = eb.flatMap((l) =>
    l.vehicles.filter((v) => v.position <= stop && v.speed < 0.1),
  );
  assert.ok(queued.length >= 8, `queue of ${queued.length}`);
  const heads = eb.map((l) => l.vehicles.find((v) => v.position <= stop));
  for (const head of heads) {
    assert.ok(head.position <= stop && head.position > stop - 3, `head at ${head.position}`);
    assert.ok(head.speed < 0.1);
  }
  const queueAtRed = engine.stats().intersections[0].ewQueue;
  assert.ok(queueAtRed >= queued.length);
  const servedAtRed = served();
  engine.run(19); // still red: nobody crosses
  assert.equal(served(), servedAtRed);
  engine.run(21); // 20 s into the next green
  assert.ok(
    engine.stats().intersections[0].ewQueue < 0.7 * queueAtRed,
    `${engine.stats().intersections[0].ewQueue} vs ${queueAtRed}`,
  );
  assert.ok(served() > servedAtRed + 10, `${served()} vs ${servedAtRed}`);
});

test("spillback: drivers keep the box clear, and a blocked box holds crossing traffic", () => {
  // Signal 2 runs 30 s behind signal 1, so it is red while signal 1 shows
  // the arterial green. Fill block 1→2 with a stopped queue, and strand one
  // car inside box 1 that cannot leave until that queue moves.
  const engine = new TrafficEngine({
    demand: { eastbound: 1500, westbound: 0, cross: 600 },
    plan: fixedPlan({ cycle: 60, split: 0.5, offset: 30 }),
    seed: 5,
  });
  const eb = engine.lanes.filter((l) => l.spec.route === "EB");
  const [stop1, stop2] = eb[0].spec.stops;
  const exit1 = stop1.position + stop1.boxLength;
  let id = 1e6;
  const parked = (position) => ({
    id: id++,
    position,
    speed: 0,
    length: VEHICLE_LENGTH,
    desiredSpeed: SPEED_LIMIT,
    arrivedAt: 0,
    stops: 1,
    stopped: true,
    yieldingAt: null,
  });
  for (const lane of eb)
    for (let front = stop2.position - 2; front >= exit1 + 9; front -= 6.5)
      lane.vehicles.push(parked(front));
  const blocker = parked(exit1 + 1);
  eb[0].vehicles.push(blocker);
  const roomBehindQueue = eb[1].vehicles.at(-1).position - VEHICLE_LENGTH - exit1;
  assert.ok(roomBehindQueue < VEHICLE_LENGTH + IDM.minGap, "no room for one more car");

  const nb1 = engine.lanes.find((l) => l.spec.id === "nb-1");
  let enteredBehindQueue = 0,
    nsHeldSeconds = 0,
    peakNsQueue = 0;
  for (let i = 0; i < 1200; i++) {
    const nsGreen = lightFor(engine.signals[0], "NS") === "green";
    const blocked = blocker.position - blocker.length < exit1 && eb[0].vehicles.includes(blocker);
    checkInvariants(engine, DT);
    if (engine.time < 30)
      enteredBehindQueue += eb.reduce(
        (n, l) => n + l.vehicles.filter((v) => v.id < 1e6 && v.position > stop1.position).length,
        0,
      );
    if (nsGreen && blocked) {
      nsHeldSeconds += DT;
      assert.ok(
        nb1.vehicles.every((v) => v.position <= nb1.spec.stops[0].position),
        "side street entered an occupied box",
      );
      peakNsQueue = Math.max(peakNsQueue, engine.stats().intersections[0].nsQueue);
    }
  }
  assert.equal(enteredBehindQueue, 0, "arterial drivers entered a box they could not clear");
  assert.ok(nsHeldSeconds > 5, `side street held for ${nsHeldSeconds.toFixed(1)} s of green`);
  assert.ok(peakNsQueue >= 3, `side-street queue ${peakNsQueue}`);
  assert.ok(nb1.vehicles.length === 0 || engine.totals.groups.CROSS.completed > 0, "side street recovers");
});

const groupDelay = (e, group) => e.totals.groups[group].delay / e.totals.groups[group].completed;

test("demand beyond capacity grows queues and delay; demand within capacity does not", () => {
  const rush = engineFor("rush-hour");
  rush.run(300);
  const waitingEarly = rush.waitingCount() + rush.stats().stopped;
  rush.run(600);
  const waitingLate = rush.waitingCount() + rush.stats().stopped;
  assert.ok(waitingLate > waitingEarly + 20, `${waitingEarly} → ${waitingLate}`);

  const calm = engineFor("balanced");
  calm.run(900);
  assert.ok(calm.waitingCount() < 5, `waiting ${calm.waitingCount()}`);
  assert.ok(
    groupDelay(rush, "EB") > 2 * groupDelay(calm, "EB"),
    `${groupDelay(rush, "EB")} vs ${groupDelay(calm, "EB")}`,
  );
});

test("giving the congested arterial more green relieves it at the side streets' expense", () => {
  const short = engineFor("rush-hour", { plan: { split: 0.45 } });
  const long = engineFor("rush-hour", { plan: { split: 0.75 } });
  short.run(900);
  long.run(900);
  assert.ok(groupDelay(long, "EB") < groupDelay(short, "EB"), "arterial delay falls");
  assert.ok(groupDelay(long, "CROSS") > groupDelay(short, "CROSS"), "side-street delay rises");
});

test("an offset matching travel time between signals forms a green wave", () => {
  const stopsPerTrip = (offset) => {
    const engine = new TrafficEngine({
      demand: { eastbound: 700, westbound: 0, cross: 0 },
      plan: fixedPlan({ cycle: 60, split: 0.5, offset }),
      seed: 3,
    });
    engine.run(1200);
    const group = engine.totals.groups.EB;
    return group.stops / group.completed;
  };
  const wave = stopsPerTrip(15),
    simultaneous = stopsPerTrip(0),
    against = stopsPerTrip(45);
  assert.ok(wave < 0.6 * simultaneous, `wave ${wave} vs simultaneous ${simultaneous}`);
  assert.ok(wave < 0.6 * against, `wave ${wave} vs against ${against}`);
});

test("actuated signals serve light, uneven traffic with less delay than fixed time", () => {
  const delay = (e) => {
    const g = e.totals.groups;
    const count = g.EB.completed + g.WB.completed + g.CROSS.completed;
    return (g.EB.delay + g.WB.delay + g.CROSS.delay) / count;
  };
  const actuated = engineFor("night-actuated");
  const fixed = engineFor("night-actuated", { plan: { mode: "fixed" } });
  actuated.run(900);
  fixed.run(900);
  assert.ok(delay(actuated) < delay(fixed), `${delay(actuated)} vs ${delay(fixed)}`);
});

// ---------------------------------------------------------------------------
// Controls, metrics, and bounded state
// ---------------------------------------------------------------------------

test("demand edits take effect immediately and deterministically", () => {
  const engine = new TrafficEngine({
    demand: { eastbound: 0, westbound: 0, cross: 0 },
    plan: fixedPlan(),
    seed: 11,
  });
  engine.run(120);
  assert.equal(engine.totals.arrivals, 0);
  engine.setDemand({ eastbound: 1800, westbound: 0, cross: 0 });
  engine.run(60);
  near(engine.totals.arrivals, 30, 15);
  const vehicles = engine.lanes.flatMap((l) => l.vehicles);
  assert.ok(vehicles.length > 0);
  assert.ok(vehicles.every((v) => v.length === VEHICLE_LENGTH));
});

test("live metrics report throughput, delay, stops, and per-intersection queues", () => {
  const engine = engineFor("balanced");
  engine.run(600);
  const stats = engine.stats();
  assert.ok(stats.throughputPerMinute > 10, `throughput ${stats.throughputPerMinute}`);
  assert.ok(stats.onRoad > 0 && stats.avgSpeed > 0);
  for (const group of ["EB", "WB", "CROSS"]) {
    const g = stats.groups[group];
    assert.ok(g.throughputPerMinute > 0 && g.avgDelay >= 0 && g.stopsPerTrip >= 0);
  }
  assert.equal(stats.intersections.length, NETWORK.intersections.length);
  for (const i of stats.intersections) {
    assert.ok(i.ew === "red" || i.ns === "red");
    assert.ok(Number.isInteger(i.ewQueue) && Number.isInteger(i.nsQueue));
  }
  assert.ok(engine.history.length > 0);
  const sample = engine.history.at(-1);
  assert.ok(sample.time <= engine.time && Number.isFinite(sample.throughputPerMinute));
});

test("long overloaded runs keep history and off-road backlogs bounded", () => {
  const engine = engineFor("rush-hour", {
    demand: { eastbound: 2400, westbound: 2400, cross: 1000 },
  });
  engine.run(3600);
  assert.ok(engine.history.length <= HISTORY_CAPACITY);
  assert.ok(engine.waitingCount() <= MAX_BACKLOG_PER_ENTRY * NETWORK.entries.length);
  assert.ok(engine.totals.dropped > 0, "excess demand is shed, not stored forever");
});

test("clock: equal simulated time at 60, 120, 165 Hz for every speed", () => {
  for (const speed of SPEEDS) {
    const counts = [60, 120, 165].map((hz) => {
      const clock = new SimulationClock();
      let count = 0;
      for (let frame = 0; frame < hz * 3; frame++) clock.advance(1 / hz, speed, () => count++);
      return count;
    });
    counts.forEach((count) => near(count * DT, 3 * speed, DT));
    assert.equal(Math.max(...counts) - Math.min(...counts), 0);
  }
});

test("clock: stalled frames are bounded and malformed input rejected", () => {
  const clock = new SimulationClock();
  let count = 0;
  assert.equal(clock.advance(10000, 8, () => count++), true);
  assert.ok(count <= MAX_SUBSTEPS);
  for (const [seconds, speed] of [
    [NaN, 1],
    [-1, 1],
    [1, Infinity],
    [1, 3],
  ])
    assert.throws(() => clock.advance(seconds, speed, () => {}));
});

test("registry: Traffic Simulator is a playable simulation, not a placeholder", () => {
  const traffic = simulationsData.find((s) => s.id === "traffic-simulator");
  assert.equal(traffic.path, "/simulations/traffic-simulator");
  assert.equal(traffic.isAvailable, true);
  assert.equal(traffic.statusLabel, undefined);
  assert.equal(traffic.previewType, "traffic");
  assert.equal(traffic.externalUrl, undefined);
});
