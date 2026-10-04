/** Seeded mulberry32 generator: a reset with the same seed replays identical traffic. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Exponential inter-arrival time for a Poisson process of `rate` events per second. */
export const exponential = (random: () => number, rate: number) =>
  -Math.log(1 - random()) / rate;
