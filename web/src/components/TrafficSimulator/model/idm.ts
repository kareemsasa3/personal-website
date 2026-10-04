/**
 * Intelligent Driver Model (Treiber, Hennecke & Helbing, 2000). Each driver
 * reacts only to the gap and closing speed to whatever is directly ahead:
 * a leading vehicle, or a stop line treated as a stationary obstacle.
 */
export const IDM = {
  maxAccel: 1.5, // m/s²
  comfortDecel: 2, // m/s²
  headway: 1.4, // s, desired time gap
  minGap: 2, // m, bumper-to-bumper gap when stopped
  exponent: 4,
  emergencyDecel: 9, // m/s², physical braking limit
} as const;

/**
 * @param speed current speed
 * @param desired desired (free-road) speed
 * @param gap bumper-to-bumper distance to the obstacle ahead; Infinity for none
 * @param closing own speed minus the obstacle's speed
 */
export function idmAcceleration(
  speed: number,
  desired: number,
  gap: number,
  closing: number,
) {
  const free = 1 - (speed / desired) ** IDM.exponent;
  if (gap === Infinity) return IDM.maxAccel * free;
  const desiredGap =
    IDM.minGap +
    Math.max(
      0,
      speed * IDM.headway +
        (speed * closing) / (2 * Math.sqrt(IDM.maxAccel * IDM.comfortDecel)),
    );
  const interaction = (desiredGap / Math.max(gap, 0.01)) ** 2;
  return Math.max(-IDM.emergencyDecel, IDM.maxAccel * (free - interaction));
}
