/**
 * Static corridor geometry. Units: metres, seconds, metres per second.
 *
 * World coordinates put the arterial along +x and the cross streets along y,
 * with y increasing downward (screen convention). Traffic keeps right, so
 * eastbound lanes sit below the centreline and northbound lanes east of it.
 */
export type Axis = "EW" | "NS";
export type Route = "EB" | "WB" | "NB" | "SB";
export type RouteGroup = "EB" | "WB" | "CROSS";
export interface Vector {
  x: number;
  y: number;
}
export interface Stop {
  intersection: number;
  /** Lane coordinate of the stop line (the near edge of the intersection box). */
  position: number;
  /** Distance travelled inside the intersection box. */
  boxLength: number;
}
export interface LaneSpec {
  id: string;
  route: Route;
  group: RouteGroup;
  axis: Axis;
  length: number;
  /** World position of lane coordinate 0 and the unit travel direction. */
  origin: Vector;
  direction: Vector;
  stops: Stop[];
}
export interface EntrySpec {
  id: string;
  demand: "eastbound" | "westbound" | "cross";
  lanes: number[];
}

export const DT = 0.1; // s; fixed at every playback speed and frame rate.
export const LANE_WIDTH = 3.5;
export const VEHICLE_LENGTH = 4.5;
export const SPEED_LIMIT = 13.9; // 50 km/h
export const ARTERIAL_LANES = 2; // per direction
export const CROSS_LANES = 1; // per direction
export const ARTERIAL_LENGTH = 680;
export const CROSS_LENGTH = 220;
export const INTERSECTION_X = [140, 340, 540] as const;

const ARTERIAL_HALF_WIDTH = ARTERIAL_LANES * LANE_WIDTH;
const CROSS_HALF_WIDTH = CROSS_LANES * LANE_WIDTH;

function buildNetwork() {
  const lanes: LaneSpec[] = [];
  const entries: EntrySpec[] = [];
  const add = (spec: LaneSpec) => lanes.push(spec) - 1;
  const eastbound: number[] = [],
    westbound: number[] = [];
  for (let i = 0; i < ARTERIAL_LANES; i++) {
    const offset = LANE_WIDTH * (i + 0.5);
    eastbound.push(
      add({
        id: `eb-${i + 1}`,
        route: "EB",
        group: "EB",
        axis: "EW",
        length: ARTERIAL_LENGTH,
        origin: { x: 0, y: offset },
        direction: { x: 1, y: 0 },
        stops: INTERSECTION_X.map((x, intersection) => ({
          intersection,
          position: x - CROSS_HALF_WIDTH,
          boxLength: 2 * CROSS_HALF_WIDTH,
        })),
      }),
    );
    westbound.push(
      add({
        id: `wb-${i + 1}`,
        route: "WB",
        group: "WB",
        axis: "EW",
        length: ARTERIAL_LENGTH,
        origin: { x: ARTERIAL_LENGTH, y: -offset },
        direction: { x: -1, y: 0 },
        stops: INTERSECTION_X.map((x, intersection) => ({
          intersection,
          position: ARTERIAL_LENGTH - x - CROSS_HALF_WIDTH,
          boxLength: 2 * CROSS_HALF_WIDTH,
        })).reverse(),
      }),
    );
  }
  entries.push(
    { id: "eb", demand: "eastbound", lanes: eastbound },
    { id: "wb", demand: "westbound", lanes: westbound },
  );
  const half = CROSS_LENGTH / 2;
  INTERSECTION_X.forEach((x, intersection) => {
    const stop = {
      intersection,
      position: half - ARTERIAL_HALF_WIDTH,
      boxLength: 2 * ARTERIAL_HALF_WIDTH,
    };
    const nb = add({
      id: `nb-${intersection + 1}`,
      route: "NB",
      group: "CROSS",
      axis: "NS",
      length: CROSS_LENGTH,
      origin: { x: x + LANE_WIDTH / 2, y: half },
      direction: { x: 0, y: -1 },
      stops: [stop],
    });
    const sb = add({
      id: `sb-${intersection + 1}`,
      route: "SB",
      group: "CROSS",
      axis: "NS",
      length: CROSS_LENGTH,
      origin: { x: x - LANE_WIDTH / 2, y: -half },
      direction: { x: 0, y: 1 },
      stops: [{ ...stop }],
    });
    entries.push(
      { id: `nb-${intersection + 1}`, demand: "cross", lanes: [nb] },
      { id: `sb-${intersection + 1}`, demand: "cross", lanes: [sb] },
    );
  });
  return {
    length: ARTERIAL_LENGTH,
    crossLength: CROSS_LENGTH,
    arterialHalfWidth: ARTERIAL_HALF_WIDTH,
    crossHalfWidth: CROSS_HALF_WIDTH,
    intersections: INTERSECTION_X.map((x, index) => ({ index, x })),
    lanes,
    entries,
  };
}

export const NETWORK = buildNetwork();

export const toWorld = (lane: LaneSpec, s: number): Vector => ({
  x: lane.origin.x + lane.direction.x * s,
  y: lane.origin.y + lane.direction.y * s,
});
