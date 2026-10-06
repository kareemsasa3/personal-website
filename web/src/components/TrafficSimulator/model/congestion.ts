import type { SpaceTimeSample } from "./engine.ts";

/** Below this share of the speed limit a vehicle counts as slow: the diagram's two slowest shades. */
export const SLOW_SHARE = 0.3;
const JOIN_GAP = 40; // m; slow vehicles closer than this belong to one stretch
const MIN_VEHICLES = 3;

export interface SlowStretch {
  /** Upstream end, m. On a ring, `from > to` means the stretch wraps past the detector. */
  from: number;
  to: number;
  vehicles: number;
}

/**
 * Stretches of road where traffic moves below 30% of the speed limit in one
 * sample, upstream first. This is the text form of the dark bands in the
 * time-space diagram.
 */
export function slowStretches(sample: SpaceTimeSample, length: number, ring: boolean): SlowStretch[] {
  const positions: number[] = [];
  for (let i = 0; i < sample.x.length; i++) if (sample.speed[i] < SLOW_SHARE) positions.push(sample.x[i]);
  positions.sort((a, b) => a - b);
  const stretches: SlowStretch[] = [];
  for (const x of positions) {
    const last = stretches[stretches.length - 1];
    if (last && x - last.to <= JOIN_GAP) {
      last.to = x;
      last.vehicles++;
    } else stretches.push({ from: x, to: x, vehicles: 1 });
  }
  if (ring && stretches.length > 1) {
    const first = stretches[0],
      last = stretches[stretches.length - 1];
    if (first.from + length - last.to <= JOIN_GAP) {
      stretches.shift();
      last.to = first.to;
      last.vehicles += first.vehicles;
    }
  }
  return stretches.filter((stretch) => stretch.vehicles >= MIN_VEHICLES);
}
