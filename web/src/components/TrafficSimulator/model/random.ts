/** Mulberry32: small, fast, seedable PRNG returning floats in [0, 1). */
export function createRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Random = ReturnType<typeof createRandom>;

/** Exponential inter-arrival time for a Poisson process of `rate` per second. */
export const exponential = (random: Random, rate: number) =>
  rate > 0 ? -Math.log(1 - random()) / rate : Infinity;
