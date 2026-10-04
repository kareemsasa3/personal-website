import {
  DT,
  NETWORK,
  SPEED_LIMIT,
  VEHICLE_LENGTH,
  type Axis,
  type EntrySpec,
  type LaneSpec,
  type RouteGroup,
  type Stop,
} from "./network.ts";
import { IDM, idmAcceleration } from "./idm.ts";
import {
  advanceSignal,
  lightFor,
  other,
  scheduledState,
  validatePlan,
  type Light,
  type SignalPlan,
  type SignalState,
} from "./signals.ts";
import { createRandom, exponential, type Random } from "./random.ts";

/** Vehicles per hour generated at each entry of that kind. */
export interface Demand {
  eastbound: number;
  westbound: number;
  cross: number;
}
export interface TrafficConfig {
  demand: Demand;
  plan: SignalPlan;
  seed: number;
}
export interface Vehicle {
  id: number;
  /** Front bumper, metres along the lane. */
  position: number;
  speed: number;
  length: number;
  desiredSpeed: number;
  /** When the vehicle arrived at the network edge, including any wait to enter. */
  arrivedAt: number;
  stops: number;
  stopped: boolean;
  /** Intersection whose yellow this driver chose to stop for. */
  yieldingAt: number | null;
}
export interface Lane {
  spec: LaneSpec;
  vehicles: Vehicle[]; // front first
}
export interface HistorySample {
  time: number;
  throughputPerMinute: number;
  queued: number;
  avgDelay: number;
}
interface Arrival {
  time: number;
  desiredSpeed: number;
}
interface Entry {
  spec: EntrySpec;
  random: Random;
  rate: number; // vehicles per second
  nextArrival: number;
  backlog: Arrival[];
  turn: number;
}
interface Trip {
  time: number;
  group: RouteGroup;
  delay: number;
  stops: number;
}
interface GroupTotals {
  completed: number;
  delay: number;
  stops: number;
}

export const DEMAND_LIMITS = {
  eastbound: [0, 2400],
  westbound: [0, 2400],
  cross: [0, 1000],
} as const;
export const HISTORY_INTERVAL = 5; // s
export const HISTORY_CAPACITY = 72; // 6 minutes
export const METRIC_WINDOW = 60; // s
export const MAX_BACKLOG_PER_ENTRY = 150;
/** Vehicles within this distance of a stop line call an actuated green. */
export const DETECTOR_LENGTH = 35;
/** A yellow is run only if stopping would need more than this deceleration. */
const YELLOW_STOP_DECEL = 3.5;
const STOPPED_BELOW = 0.3;
const MOVING_ABOVE = 3;
const QUEUED_BELOW = 2;
/** How far beyond an intersection drivers look for room to clear it, m. */
const STORAGE_LOOKAHEAD = 80;
const GROUPS: RouteGroup[] = ["EB", "WB", "CROSS"];

export function validateDemand(demand: Demand) {
  for (const key of ["eastbound", "westbound", "cross"] as const) {
    const [min, max] = DEMAND_LIMITS[key];
    if (!Number.isFinite(demand[key]) || demand[key] < min || demand[key] > max)
      throw new Error(`${key} demand must be between ${min} and ${max} vehicles/hour.`);
  }
}

export class TrafficEngine {
  steps = 0;
  demand: Demand;
  plan: SignalPlan;
  readonly lanes: Lane[];
  signals: SignalState[];
  readonly history: HistorySample[] = [];
  readonly totals = {
    arrivals: 0,
    completed: 0,
    dropped: 0,
    groups: Object.fromEntries(
      GROUPS.map((g) => [g, { completed: 0, delay: 0, stops: 0 }]),
    ) as Record<RouteGroup, GroupTotals>,
  };
  private entries: Entry[];
  private recent: Trip[] = [];
  private nextId = 1;
  // Per-step scratch, reused to avoid allocation in the hot loop.
  private occupied = NETWORK.intersections.map(() => ({ EW: false, NS: false }));
  private called = NETWORK.intersections.map(() => ({ EW: false, NS: false }));

  constructor({ demand, plan, seed }: TrafficConfig) {
    validateDemand(demand);
    validatePlan(plan);
    if (!Number.isInteger(seed)) throw new Error("Seed must be an integer.");
    this.demand = { ...demand };
    this.plan = { ...plan };
    this.lanes = NETWORK.lanes.map((spec) => ({ spec, vehicles: [] }));
    this.signals = NETWORK.intersections.map((_, i) => scheduledState(plan, 0, i));
    // One independent stream per entry: arrivals never depend on signal
    // timing, so runs that differ only in plan see identical traffic.
    this.entries = NETWORK.entries.map((spec, i) => {
      const random = createRandom(seed * 7919 + i * 104729);
      const rate = demand[spec.demand] / 3600;
      return { spec, random, rate, nextArrival: exponential(random, rate), backlog: [], turn: 0 };
    });
  }

  get time() {
    return this.steps * DT;
  }

  setDemand(demand: Demand) {
    validateDemand(demand);
    this.demand = { ...demand };
    for (const entry of this.entries) {
      const rate = demand[entry.spec.demand] / 3600;
      if (rate === entry.rate) continue;
      entry.rate = rate;
      entry.nextArrival = this.time + exponential(entry.random, rate);
    }
  }

  /** Takes effect through each controller's normal yellow/all-red transitions. */
  setPlan(plan: SignalPlan) {
    validatePlan(plan);
    this.plan = { ...plan };
  }

  run(seconds: number) {
    for (let i = Math.round(seconds / DT); i > 0; i--) this.step();
  }

  /** Vehicles generated but still waiting off-map for room to enter, per entry. */
  waitingByEntry() {
    return this.entries.map((entry) => ({
      lane: entry.spec.lanes[0],
      waiting: entry.backlog.length,
    }));
  }

  vehicleCount() {
    return this.lanes.reduce((n, lane) => n + lane.vehicles.length, 0);
  }

  waitingCount() {
    return this.entries.reduce((n, entry) => n + entry.backlog.length, 0);
  }

  step() {
    const time = this.time;
    this.generateArrivals(time);
    this.admitVehicles();
    this.scanIntersections();
    for (const lane of this.lanes) this.moveLane(lane, time);
    const now = time + DT;
    this.signals = this.signals.map((state, index) =>
      advanceSignal(state, { plan: this.plan, time: now, index, demand: this.called[index] }),
    );
    this.steps++;
    if (this.steps % Math.round(HISTORY_INTERVAL / DT) === 0) this.sampleHistory();
  }

  private generateArrivals(time: number) {
    for (const entry of this.entries) {
      while (entry.nextArrival < time + DT) {
        this.totals.arrivals++;
        const arrival = {
          time: entry.nextArrival,
          desiredSpeed: SPEED_LIMIT * (0.9 + 0.12 * entry.random()),
        };
        if (entry.backlog.length < MAX_BACKLOG_PER_ENTRY) entry.backlog.push(arrival);
        else this.totals.dropped++;
        entry.nextArrival += exponential(entry.random, entry.rate);
      }
    }
  }

  /** Waiting vehicles join the lane with the most room, at a speed that room allows. */
  private admitVehicles() {
    for (const entry of this.entries) {
      while (entry.backlog.length) {
        let best = -1,
          bestGap = -Infinity;
        const count = entry.spec.lanes.length;
        for (let k = 0; k < count; k++) {
          const index = entry.spec.lanes[(entry.turn + k) % count];
          const queue = this.lanes[index].vehicles;
          const last = queue[queue.length - 1];
          const gap = last ? last.position - last.length : Infinity;
          if (gap > bestGap) {
            best = index;
            bestGap = gap;
          }
        }
        if (bestGap < IDM.minGap + 1) break;
        const vehicles = this.lanes[best].vehicles;
        const leader: Vehicle | undefined = vehicles[vehicles.length - 1];
        const arrival = entry.backlog.shift()!;
        const room = bestGap - IDM.minGap;
        const speed = Math.min(
          arrival.desiredSpeed,
          room / IDM.headway,
          (leader?.speed ?? Infinity) + Math.sqrt(2 * IDM.comfortDecel * room),
        );
        vehicles.push({
          id: this.nextId++,
          position: 0,
          speed,
          length: VEHICLE_LENGTH,
          desiredSpeed: arrival.desiredSpeed,
          arrivedAt: arrival.time,
          stops: 0,
          stopped: false,
          yieldingAt: null,
        });
        entry.turn = (entry.turn + 1) % count;
      }
    }
  }

  /** Box occupancy and detector calls, from positions at the start of the step. */
  private scanIntersections() {
    for (let i = 0; i < this.occupied.length; i++) {
      this.occupied[i].EW = this.occupied[i].NS = false;
      this.called[i].EW = this.called[i].NS = false;
    }
    for (const { spec, vehicles } of this.lanes) {
      for (const v of vehicles) {
        for (const stop of spec.stops) {
          const ahead = stop.position - v.position;
          if (ahead >= 0 && ahead <= DETECTOR_LENGTH) this.called[stop.intersection][spec.axis] = true;
          if (ahead < 0 && v.position - v.length < stop.position + stop.boxLength)
            this.occupied[stop.intersection][spec.axis] = true;
        }
      }
    }
  }

  private nextStop(spec: LaneSpec, position: number) {
    for (const stop of spec.stops) if (position <= stop.position) return stop;
    return null;
  }

  /**
   * A stop line acts as a stationary obstacle when the driver must not enter:
   * red; yellow with room to stop; the box held by crossing traffic; or no
   * room beyond the box to clear it ("don't block the box").
   */
  private mustStop(vehicles: Vehicle[], n: number, stop: Stop, axis: Axis) {
    const v = vehicles[n];
    const light: Light = lightFor(this.signals[stop.intersection], axis);
    if (light === "red") return true;
    if (light === "yellow") {
      if (v.yieldingAt === stop.intersection) return true;
      const distance = stop.position - v.position;
      if (distance >= (v.speed * v.speed) / (2 * YELLOW_STOP_DECEL)) {
        v.yieldingAt = stop.intersection;
        return true;
      }
    } else v.yieldingAt = null;
    if (this.occupied[stop.intersection][other(axis)]) return true;
    // Look past the box for the tail of a stopped queue. Everyone between it
    // and this driver will need room there too.
    const exit = stop.position + stop.boxLength;
    let ahead = 0;
    for (let m = n - 1; m >= 0; m--) {
      const u = vehicles[m];
      const room = u.position - u.length - exit;
      if (room > STORAGE_LOOKAHEAD) break;
      if (u.position > exit && u.speed < QUEUED_BELOW)
        return room < (ahead + 1) * (v.length + IDM.minGap);
      ahead++;
    }
    return false;
  }

  private moveLane(lane: Lane, time: number) {
    const { spec, vehicles } = lane;
    // Accelerations from the state at the start of the step (parallel update)…
    const plans = vehicles.map((v, n) => {
      const leader = n > 0 ? vehicles[n - 1] : undefined;
      let acceleration = leader
        ? idmAcceleration(v.speed, v.desiredSpeed, leader.position - leader.length - v.position, v.speed - leader.speed)
        : idmAcceleration(v.speed, v.desiredSpeed, Infinity, 0);
      const stop = this.nextStop(spec, v.position);
      const closed = stop !== null && this.mustStop(vehicles, n, stop, spec.axis);
      if (closed)
        acceleration = Math.min(
          acceleration,
          idmAcceleration(v.speed, v.desiredSpeed, stop.position - v.position, v.speed),
        );
      return { acceleration, stop, closed };
    });
    // …then positions front to back, so each follower is held behind its leader's new rear.
    let exited = 0;
    for (let n = 0; n < vehicles.length; n++) {
      const v = vehicles[n];
      const { acceleration, stop, closed } = plans[n];
      let speed = v.speed + acceleration * DT;
      let position = v.position;
      if (speed < 0) {
        position += acceleration < 0 ? -(v.speed * v.speed) / (2 * acceleration) : 0;
        speed = 0;
      } else position += v.speed * DT + 0.5 * acceleration * DT * DT;
      if (n > 0) {
        const leader = vehicles[n - 1];
        const limit = leader.position - leader.length;
        if (position > limit) {
          position = Math.max(v.position, limit);
          speed = Math.min(speed, leader.speed);
        }
      }
      if (stop && closed && position > stop.position) {
        position = Math.max(v.position, stop.position);
        speed = 0;
      }
      v.position = position;
      v.speed = speed;
      if (!v.stopped && speed < STOPPED_BELOW) {
        v.stopped = true;
        v.stops++;
      } else if (v.stopped && speed > MOVING_ABOVE) v.stopped = false;
      if (position >= spec.length) exited++;
    }
    for (let k = 0; k < exited; k++) this.finishTrip(vehicles.shift()!, spec, time + DT);
  }

  private finishTrip(v: Vehicle, spec: LaneSpec, time: number) {
    const delay = Math.max(0, time - v.arrivedAt - spec.length / v.desiredSpeed);
    const group = this.totals.groups[spec.group];
    group.completed++;
    group.delay += delay;
    group.stops += v.stops;
    this.totals.completed++;
    this.recent.push({ time, group: spec.group, delay, stops: v.stops });
  }

  private pruneRecent() {
    const cutoff = this.time - METRIC_WINDOW;
    let drop = 0;
    while (drop < this.recent.length && this.recent[drop].time <= cutoff) drop++;
    if (drop) this.recent.splice(0, drop);
  }

  private sampleHistory() {
    const stats = this.stats();
    this.history.push({
      time: stats.time,
      throughputPerMinute: stats.throughputPerMinute,
      queued: stats.stopped + stats.waiting,
      avgDelay: stats.avgDelay,
    });
    if (this.history.length > HISTORY_CAPACITY) this.history.shift();
  }

  /** Live metrics over the last METRIC_WINDOW seconds plus the current state. */
  stats() {
    this.pruneRecent();
    const window = Math.max(DT, Math.min(METRIC_WINDOW, this.time));
    const summarize = (trips: Trip[]) => ({
      completed: trips.length,
      throughputPerMinute: (trips.length * 60) / window,
      avgDelay: trips.length ? trips.reduce((s, t) => s + t.delay, 0) / trips.length : 0,
      stopsPerTrip: trips.length ? trips.reduce((s, t) => s + t.stops, 0) / trips.length : 0,
    });
    const intersections = this.signals.map((state, index) => ({
      index,
      ew: lightFor(state, "EW"),
      ns: lightFor(state, "NS"),
      stage: state.stage,
      ewQueue: 0,
      nsQueue: 0,
    }));
    let onRoad = 0,
      stopped = 0,
      speedSum = 0;
    for (const { spec, vehicles } of this.lanes) {
      for (const v of vehicles) {
        onRoad++;
        speedSum += v.speed;
        if (v.speed < STOPPED_BELOW) stopped++;
        const stop = v.speed < QUEUED_BELOW ? this.nextStop(spec, v.position) : null;
        if (stop) intersections[stop.intersection][spec.axis === "EW" ? "ewQueue" : "nsQueue"]++;
      }
    }
    const overall = summarize(this.recent);
    return {
      time: this.time,
      onRoad,
      stopped,
      waiting: this.waitingCount(),
      avgSpeed: onRoad ? speedSum / onRoad : 0,
      throughputPerMinute: overall.throughputPerMinute,
      avgDelay: overall.avgDelay,
      stopsPerTrip: overall.stopsPerTrip,
      groups: Object.fromEntries(
        GROUPS.map((g) => [g, summarize(this.recent.filter((t) => t.group === g))]),
      ) as Record<RouteGroup, ReturnType<typeof summarize>>,
      intersections,
    };
  }
}
export type TrafficStats = ReturnType<TrafficEngine["stats"]>;
