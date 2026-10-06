import { DT, MAX_DECELERATION, equilibriumSpeed, idm, type DriverModel } from "./idm.ts";
import { createRandom, exponential } from "./random.ts";
import {
  lightRemaining,
  nextLight,
  scheduledLight,
  signalPhase,
  signalTiming,
  type SignalLight,
  type SignalState,
  type SignalTiming,
} from "./signals.ts";
import type { Scenario, TrafficParams, VehicleClass } from "./scenarios.ts";

export interface Vehicle {
  id: number;
  kind: "car" | "truck";
  lane: number;
  x: number; // front bumper, m along the road
  v: number; // m/s
  acc: number; // m/s², last applied
  length: number;
  v0: number;
  T: number;
  accelerationScale: number;
  b: number;
  s0: number;
  lateral: number; // drawn lane position; eases toward `lane` after a change
  cooldown: number; // s until another lane change is considered
  arrivedAt: number; // s, when the vehicle joined the entrance queue
  stops: number;
  stopped: boolean;
  committed: number; // index of a signal the driver chose to clear on yellow, or -1
  stopLine: number | null; // stop line the driver is currently obeying
  brakeUntil: number;
}

interface PendingVehicle {
  arrivedAt: number;
  vehicle: Omit<Vehicle, "lane" | "x" | "v" | "lateral" | "arrivedAt">;
}

export interface ExitRecord {
  time: number;
  tripTime: number;
  stops: number;
}

export interface SpaceTimeSample {
  time: number;
  x: Float32Array;
  speed: Float32Array; // share of the speed limit
  signals: SignalState[];
}

export interface HistoryPoint {
  time: number;
  flow: number; // veh/h
  speed: number; // m/s
}

const COMFORT_STOP = 3; // m/s² a driver accepts to stop for yellow
const HARD_STOP = 7; // beyond this a red cannot be obeyed (a fallback; lights always show a full yellow first)
const B_SAFE = 4; // MOBIL: most braking a lane change may impose
const LANE_CHANGE_THRESHOLD = 0.15; // m/s² minimum net advantage
const LANE_DROP_BIAS = 3; // m/s² extra incentive to leave a lane that ends
const LANE_DROP_APPROACH = 400; // m before the drop where entering the lane is barred
const LANE_CHANGE_COOLDOWN = 3; // s
const LANE_CHANGE_DURATION = 1.5; // s, visual only
const DECISION_PERIOD = 5; // steps between lane-change evaluations per vehicle
const STOP_SPEED = 1; // m/s
const MOVING_SPEED = 3; // m/s; a vehicle must exceed this before a new stop counts
export const QUEUE_SPEED = 2; // m/s; slower vehicles count as queued
export const SAMPLE_INTERVAL = 5; // steps (0.5 s)
export const SAMPLE_CAPACITY = 240; // 120 s of space-time history
export const FLOW_WINDOW = 60; // s
export const HISTORY_INTERVAL = 100; // steps (10 s)
export const HISTORY_CAPACITY = 60; // 10 minutes
export const EXIT_CAPACITY = 400;
const TRIP_AVERAGE = 50; // most recent exits used for trip averages
const PERTURBATION = { duration: 3, deceleration: 4 };
const ENTRY_LOOKAHEAD = 150; // m; a farther leader does not limit entry speed

/** Rejects non-finite or out-of-range parameters before they reach the model. */
export function validateParams(scenario: Scenario, params: TrafficParams) {
  for (const control of scenario.controls) {
    const value = params[control.key];
    if (!Number.isFinite(value) || value < control.min - 1e-9 || value > control.max + 1e-9)
      throw new Error(`${control.label} must be between ${control.min} and ${control.max}.`);
  }
  if (!["green-wave", "simultaneous", "reverse"].includes(params.coordination))
    throw new Error("Unknown signal coordination.");
}

export class TrafficEngine {
  readonly scenario: Scenario;
  params: TrafficParams;
  lanes: Vehicle[][]; // per lane, sorted by x descending (downstream first)
  steps = 0;
  waiting: PendingVehicle[] = [];
  exits: ExitRecord[] = [];
  crossings: number[] = []; // ring detector passage times
  samples: SpaceTimeSample[] = [];
  history: HistoryPoint[] = [];
  entered = 0;
  exited = 0;
  laneChanges = 0;
  /** Times a position had to be clamped to prevent overlap. Should stay zero. */
  guardEvents = 0;
  private timing: SignalTiming;
  /** What each signal is showing; follows `timing` but never skips or shortens yellow. */
  private lights: SignalLight[];
  private random: () => number;
  private nextArrival = 0;
  private nextId = 0;

  constructor(scenario: Scenario, params: TrafficParams = scenario.defaults) {
    validateParams(scenario, params);
    this.scenario = scenario;
    this.params = { ...params };
    this.random = createRandom(scenario.seed);
    this.lanes = Array.from({ length: scenario.lanes }, () => []);
    this.timing = this.computeTiming();
    this.lights = scenario.signals.map((_, index) => scheduledLight(0, this.timing.offsets[index], this.timing));
    if (scenario.topology === "ring") this.placeRing();
    else this.nextArrival = exponential(this.random, this.params.demand / 3600);
    const warmup = Math.round(scenario.warmup / DT);
    for (let i = 0; i < warmup; i++) this.step();
  }

  get time() {
    return this.steps * DT;
  }

  get vehicles() {
    return this.lanes.flat();
  }

  /**
   * Live parameter edit. Vehicle count on the ring requires a new engine instead.
   * New signal timing takes effect through the lights' normal sequence: a light
   * that is green when its schedule jumps to red shows a full yellow first.
   */
  setParams(next: Partial<TrafficParams>) {
    const params = { ...this.params, ...next };
    validateParams(this.scenario, params);
    if (params.vehicles !== this.params.vehicles && this.scenario.topology === "ring")
      throw new Error("Changing the vehicle count rebuilds the ring.");
    const demandChanged = params.demand !== this.params.demand;
    this.params = params;
    this.timing = this.computeTiming();
    if (demandChanged && this.scenario.topology === "open")
      this.nextArrival = this.time + exponential(this.random, params.demand / 3600);
  }

  /** Makes one driver brake briefly — the "tap" that seeds a ring-road jam. */
  perturb() {
    const vehicles = this.vehicles;
    if (!vehicles.length) return;
    const target = vehicles.reduce((a, b) => (b.v > a.v ? b : a));
    target.brakeUntil = this.time + PERTURBATION.duration;
  }

  signalStates() {
    return this.scenario.signals.map((x, index) => ({
      x,
      state: this.lights[index].state,
      remaining: lightRemaining(this.lights[index], this.time, this.timing.offsets[index], this.timing),
    }));
  }

  get signalTiming() {
    return this.timing;
  }

  step() {
    this.updateStopLines();
    if (this.scenario.lanes > 1) this.changeLanes();
    this.accelerate();
    this.integrate();
    this.steps++;
    this.updateLights();
    if (this.scenario.topology === "ring") this.wrapRing();
    else {
      this.removeExits();
      this.admitArrivals();
    }
    this.record();
  }

  private computeTiming() {
    return signalTiming(
      this.scenario.signals,
      this.params.coordination,
      this.scenario.speedLimit,
      this.params.cycle,
      this.params.greenShare,
    );
  }

  private driver(vehicle: Vehicle): DriverModel {
    return {
      v0: vehicle.v0,
      T: vehicle.T,
      a: this.params.acceleration * vehicle.accelerationScale,
      b: vehicle.b,
      s0: vehicle.s0,
    };
  }

  private template(arrivedAt: number): PendingVehicle {
    const truck = this.random() < this.scenario.truckShare;
    const spec: VehicleClass = truck ? this.scenario.truck : this.scenario.car;
    const spread = (this.random() * 2 - 1) * spec.speedSpread;
    return {
      arrivedAt,
      vehicle: {
        id: this.nextId++,
        kind: truck ? "truck" : "car",
        acc: 0,
        length: spec.length,
        v0: this.scenario.speedLimit * spec.speedFactor * (1 + spread),
        T: spec.T,
        accelerationScale: spec.accelerationScale,
        b: spec.b,
        s0: spec.s0,
        cooldown: LANE_CHANGE_COOLDOWN,
        stops: 0,
        stopped: false,
        committed: -1,
        stopLine: null,
        brakeUntil: -Infinity,
      },
    };
  }

  /** Evenly spaced ring at the matching equilibrium speed, plus sub-metre jitter. */
  private placeRing() {
    const { length } = this.scenario;
    const count = this.params.vehicles;
    const spacing = length / count;
    const lane: Vehicle[] = [];
    for (let i = 0; i < count; i++) {
      const pending = this.template(0);
      const vehicle = { ...pending.vehicle, lane: 0, x: 0, v: 0, lateral: 0, arrivedAt: 0 };
      const speed = equilibriumSpeed(spacing - vehicle.length, this.driver(vehicle));
      vehicle.x = i * spacing + (this.random() - 0.5) * 0.4;
      vehicle.v = speed;
      lane.push(vehicle);
    }
    this.lanes[0] = lane.sort((a, b) => b.x - a.x);
    this.entered = count;
  }

  private updateLights() {
    this.lights = this.lights.map((light, index) =>
      nextLight(light, signalPhase(this.time, this.timing.offsets[index], this.timing).state, this.time),
    );
  }

  /** Each driver decides whether the next signal is one to stop for. */
  private updateStopLines() {
    const { signals } = this.scenario;
    for (const lane of this.lanes)
      for (const vehicle of lane) {
        vehicle.stopLine = null;
        if (vehicle.committed >= 0 && vehicle.x > signals[vehicle.committed])
          vehicle.committed = -1;
        const index = signals.findIndex((x) => x > vehicle.x);
        if (index < 0 || vehicle.committed === index) continue;
        const { state } = this.lights[index];
        if (state === "green") continue;
        const distance = Math.max(signals[index] - vehicle.x, 0.1);
        const required = (vehicle.v * vehicle.v) / (2 * distance);
        if (required > (state === "yellow" ? COMFORT_STOP : HARD_STOP))
          vehicle.committed = index;
        else vehicle.stopLine = signals[index];
      }
  }

  /** Distance to the nearest stationary virtual obstacle (stop line or lane end). */
  private obstacleGap(vehicle: Vehicle, lane: number) {
    let gap = Infinity;
    if (vehicle.stopLine !== null) gap = vehicle.stopLine - vehicle.x;
    const drop = this.scenario.laneDrop;
    if (drop && lane === drop.lane) gap = Math.min(gap, drop.x - vehicle.x);
    return gap;
  }

  private accelerationFor(vehicle: Vehicle, lane: number, leader: Vehicle | null, wrap = 0) {
    const driver = this.driver(vehicle);
    let acc = leader
      ? idm(vehicle.v, leader.x + wrap - leader.length - vehicle.x, leader.v, driver)
      : idm(vehicle.v, Infinity, 0, driver);
    const obstacle = this.obstacleGap(vehicle, lane);
    if (Number.isFinite(obstacle)) acc = Math.min(acc, idm(vehicle.v, obstacle, 0, driver));
    return acc;
  }

  private laneOpen(lane: number, x: number) {
    const drop = this.scenario.laneDrop;
    return !(drop && lane === drop.lane && x > drop.x - LANE_DROP_APPROACH);
  }

  /** Index of the first vehicle at or behind `x` in a lane sorted by x descending. */
  private static firstBehind(lane: Vehicle[], x: number) {
    let low = 0,
      high = lane.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (lane[mid].x > x) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  /** MOBIL lane changing (Kesting, Treiber & Helbing 2007), symmetric rules. */
  private changeLanes() {
    const { politeness } = this.params;
    const drop = this.scenario.laneDrop;
    for (const vehicle of this.vehicles) {
      if (vehicle.cooldown > 0 || (this.steps + vehicle.id) % DECISION_PERIOD !== 0) continue;
      const from = vehicle.lane;
      const own = this.lanes[from];
      const index = own.indexOf(vehicle);
      const leader = index > 0 ? own[index - 1] : null;
      const follower = index < own.length - 1 ? own[index + 1] : null;
      const current = this.accelerationFor(vehicle, from, leader);
      const oldFollowerGain = follower
        ? this.accelerationFor(follower, from, leader) - this.accelerationFor(follower, from, vehicle)
        : 0;
      let best = -1,
        bestScore = 0,
        bestIndex = 0;
      for (const target of [from - 1, from + 1]) {
        if (target < 0 || target >= this.scenario.lanes || !this.laneOpen(target, vehicle.x))
          continue;
        const lane = this.lanes[target];
        const at = TrafficEngine.firstBehind(lane, vehicle.x);
        const newLeader = at > 0 ? lane[at - 1] : null;
        const newFollower = at < lane.length ? lane[at] : null;
        if (newLeader && newLeader.x - newLeader.length - vehicle.x < vehicle.s0 / 2) continue;
        if (newFollower && vehicle.x - vehicle.length - newFollower.x < newFollower.s0 / 2) continue;
        const after = this.accelerationFor(vehicle, target, newLeader);
        const newFollowerAfter = newFollower
          ? this.accelerationFor(newFollower, target, vehicle)
          : 0;
        if (after < -B_SAFE || newFollowerAfter < -B_SAFE) continue;
        const newFollowerLoss = newFollower
          ? newFollowerAfter - this.accelerationFor(newFollower, target, newLeader)
          : 0;
        let bias = 0;
        if (drop && from === drop.lane && vehicle.x > drop.x - LANE_DROP_APPROACH) bias += LANE_DROP_BIAS;
        const score =
          after - current + politeness * (newFollowerLoss + oldFollowerGain) + bias - LANE_CHANGE_THRESHOLD;
        if (score > bestScore) {
          best = target;
          bestScore = score;
          bestIndex = at;
        }
      }
      if (best < 0) continue;
      own.splice(index, 1);
      this.lanes[best].splice(bestIndex, 0, vehicle);
      vehicle.lane = best;
      vehicle.cooldown = LANE_CHANGE_COOLDOWN;
      this.laneChanges++;
    }
  }

  private accelerate() {
    const ring = this.scenario.topology === "ring";
    const { length } = this.scenario;
    for (let l = 0; l < this.lanes.length; l++) {
      const lane = this.lanes[l];
      for (let i = 0; i < lane.length; i++) {
        const vehicle = lane[i];
        let leader: Vehicle | null = i > 0 ? lane[i - 1] : null,
          wrap = 0;
        if (!leader && ring && lane.length > 1) {
          leader = lane[lane.length - 1];
          wrap = length;
        }
        let acc = this.accelerationFor(vehicle, l, leader, wrap);
        if (this.time < vehicle.brakeUntil) acc = Math.min(acc, -PERTURBATION.deceleration);
        vehicle.acc = Math.max(-MAX_DECELERATION, acc);
      }
    }
  }

  /** Ballistic update; vehicles never reverse. A guard pass flags any overlap. */
  private integrate() {
    const ring = this.scenario.topology === "ring";
    const lateralStep = DT / LANE_CHANGE_DURATION;
    for (const lane of this.lanes)
      for (const vehicle of lane) {
        const { v, acc } = vehicle;
        const next = v + acc * DT;
        if (next < 0) {
          vehicle.x += acc < 0 ? (-v * v) / (2 * acc) : 0;
          vehicle.v = 0;
        } else {
          vehicle.x += v * DT + 0.5 * acc * DT * DT;
          vehicle.v = next;
        }
        if (vehicle.v < STOP_SPEED && !vehicle.stopped) {
          vehicle.stopped = true;
          vehicle.stops++;
        } else if (vehicle.v > MOVING_SPEED) vehicle.stopped = false;
        vehicle.cooldown = Math.max(0, vehicle.cooldown - DT);
        const offset = vehicle.lane - vehicle.lateral;
        vehicle.lateral += Math.sign(offset) * Math.min(Math.abs(offset), lateralStep);
      }
    for (const lane of this.lanes)
      for (let i = 0; i < lane.length; i++) {
        const vehicle = lane[i];
        let leader = i > 0 ? lane[i - 1] : null,
          wrap = 0;
        if (!leader && ring && lane.length > 1) {
          leader = lane[lane.length - 1];
          wrap = this.scenario.length;
        }
        if (!leader) continue;
        const limit = leader.x + wrap - leader.length;
        if (vehicle.x > limit) {
          vehicle.x = limit;
          vehicle.v = Math.min(vehicle.v, leader.v);
          this.guardEvents++;
        }
      }
  }

  private wrapRing() {
    const lane = this.lanes[0];
    const { length } = this.scenario;
    while (lane.length && lane[0].x >= length) {
      const vehicle = lane.shift()!;
      vehicle.x -= length;
      lane.push(vehicle);
      this.crossings.push(this.time);
    }
    const cutoff = this.time - FLOW_WINDOW;
    while (this.crossings.length && this.crossings[0] < cutoff) this.crossings.shift();
  }

  private removeExits() {
    for (const lane of this.lanes)
      while (lane.length && lane[0].x - lane[0].length > this.scenario.length) {
        const vehicle = lane.shift()!;
        this.exited++;
        this.exits.push({
          time: this.time,
          tripTime: this.time - vehicle.arrivedAt,
          stops: vehicle.stops,
        });
      }
    if (this.exits.length > EXIT_CAPACITY) this.exits.splice(0, this.exits.length - EXIT_CAPACITY);
  }

  /** Poisson arrivals join an entrance queue; each lane admits one vehicle per step when there is room. */
  private admitArrivals() {
    const rate = this.params.demand / 3600;
    while (this.nextArrival <= this.time) {
      this.waiting.push(this.template(this.nextArrival));
      this.nextArrival += exponential(this.random, rate);
    }
    if (!this.waiting.length) return;
    const entries = this.lanes
      .map((lane, index) => {
        const last = lane[lane.length - 1];
        return { index, last, gap: last ? last.x - last.length : Infinity };
      })
      .sort((a, b) => b.gap - a.gap || a.index - b.index);
    for (const entry of entries) {
      const pending = this.waiting[0];
      if (!pending) break;
      const driver = this.driver({ ...pending.vehicle, lane: 0, x: 0, v: 0, lateral: 0, arrivedAt: 0 });
      // Enter at the leader's speed and only with the headway that speed calls for,
      // so admission never manufactures a slow platoon of its own.
      const speed = entry.last && entry.gap < ENTRY_LOOKAHEAD ? Math.min(driver.v0, entry.last.v) : driver.v0;
      if (entry.gap < driver.s0 + speed * driver.T) continue;
      this.waiting.shift();
      const vehicle: Vehicle = {
        ...pending.vehicle,
        lane: entry.index,
        x: 0,
        v: speed,
        lateral: entry.index,
        arrivedAt: pending.arrivedAt,
      };
      this.lanes[entry.index].push(vehicle);
      this.entered++;
    }
  }

  private record() {
    if (this.steps % SAMPLE_INTERVAL === 0) {
      const vehicles = this.vehicles;
      const x = new Float32Array(vehicles.length),
        speed = new Float32Array(vehicles.length);
      vehicles.forEach((vehicle, i) => {
        x[i] = vehicle.x;
        speed[i] = vehicle.v / this.scenario.speedLimit;
      });
      this.samples.push({ time: this.time, x, speed, signals: this.signalStates().map((s) => s.state) });
      if (this.samples.length > SAMPLE_CAPACITY) this.samples.shift();
    }
    if (this.steps % HISTORY_INTERVAL === 0) {
      const { flow, meanSpeed } = this.metrics();
      this.history.push({ time: this.time, flow, speed: meanSpeed });
      if (this.history.length > HISTORY_CAPACITY) this.history.shift();
    }
  }

  /** Flow over the trailing window: exits on open roads, detector passages at x = 0 on the ring. */
  flow() {
    const window = Math.min(FLOW_WINDOW, this.time);
    if (window < 5) return 0;
    const cutoff = this.time - window;
    const events =
      this.scenario.topology === "ring"
        ? this.crossings.filter((t) => t > cutoff).length
        : this.exits.filter((e) => e.time > cutoff).length;
    return (events / window) * 3600;
  }

  metrics() {
    const vehicles = this.vehicles;
    const recent = this.exits.slice(-TRIP_AVERAGE);
    const average = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return {
      time: this.time,
      onRoad: vehicles.length,
      waiting: this.waiting.length,
      queued: vehicles.filter((v) => v.v < QUEUE_SPEED).length,
      meanSpeed: average(vehicles.map((v) => v.v)) ?? 0,
      minSpeed: vehicles.length ? Math.min(...vehicles.map((v) => v.v)) : 0,
      flow: this.flow(),
      tripTime: average(recent.map((e) => e.tripTime)),
      stopsPerTrip: average(recent.map((e) => e.stops)),
      exited: this.exited,
      laneChanges: this.laneChanges,
      freeFlowTripTime: this.scenario.length / this.scenario.speedLimit,
    };
  }
}

export type TrafficMetrics = ReturnType<TrafficEngine["metrics"]>;
