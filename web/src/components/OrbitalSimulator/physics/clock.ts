import { DT } from "./model.ts";
export const MAX_SUBSTEPS = 2048;
export const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4] as const; // simulated years / wall second
/** Carries fractional steps across frames. Discards stalled-frame debt rather than catching up forever. */
export class SimulationClock {
  private remainder = 0;
  reset() {
    this.remainder = 0;
  }
  advance(seconds: number, speed: number, step: () => void) {
    if (
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      !SPEEDS.some((s) => s === speed)
    )
      throw new Error("Invalid simulation clock input.");
    const requested = this.remainder + Math.min(seconds, 0.1) * speed;
    const count = Math.min(MAX_SUBSTEPS, Math.floor((requested + 1e-12) / DT));
    const limited = seconds > 0.1 || requested >= (MAX_SUBSTEPS + 1) * DT;
    this.remainder = limited ? 0 : Math.max(0, requested - count * DT);
    for (let i = 0; i < count; i++) step();
    return limited;
  }
}
