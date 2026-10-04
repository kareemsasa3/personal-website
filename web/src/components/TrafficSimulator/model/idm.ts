/** Fixed integration step in seconds. Every scenario and playback speed uses it. */
export const DT = 0.1;
/** Physical braking limit (m/s²). IDM can request more in emergencies; it is clamped here. */
export const MAX_DECELERATION = 9;
export interface DriverModel {
  v0: number; // desired speed, m/s
  T: number; // desired time headway, s
  a: number; // maximum acceleration, m/s²
  b: number; // comfortable deceleration, m/s²
  s0: number; // jam distance, m
}
/**
 * Intelligent Driver Model (Treiber, Hennecke & Helbing 2000).
 * `gap` is bumper-to-bumper distance to the leader (Infinity for a free road);
 * `leaderSpeed` is the leader's speed (0 for a stop line or lane end).
 */
export function idm(v: number, gap: number, leaderSpeed: number, d: DriverModel) {
  const free = 1 - (v / d.v0) ** 4;
  if (!Number.isFinite(gap)) return d.a * free;
  const desired =
    d.s0 + Math.max(0, v * d.T + (v * (v - leaderSpeed)) / (2 * Math.sqrt(d.a * d.b)));
  const s = Math.max(gap, 0.01);
  return d.a * (free - (desired / s) ** 2);
}
/** Steady-state speed at which IDM holds a constant `gap` (bisection; monotone in v). */
export function equilibriumSpeed(gap: number, d: DriverModel) {
  if (gap <= d.s0) return 0;
  let low = 0,
    high = d.v0;
  for (let i = 0; i < 60; i++) {
    const v = (low + high) / 2;
    if (idm(v, gap, v, d) > 0) low = v;
    else high = v;
  }
  return low;
}
