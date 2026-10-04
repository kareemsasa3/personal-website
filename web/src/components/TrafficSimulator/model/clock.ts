import { DT } from "./network.ts";

export const SPEEDS = [0.5, 1, 2, 4, 8] as const; // simulated seconds / wall second
export const MAX_FRAME_SECONDS = 0.1;
export const MAX_SUBSTEPS = 20;

/** Carries fractional steps across frames. Discards stalled-frame debt rather than catching up. */
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
    const requested =
      this.remainder + Math.min(seconds, MAX_FRAME_SECONDS) * speed;
    const count = Math.min(MAX_SUBSTEPS, Math.floor((requested + 1e-9) / DT));
    const limited = seconds > MAX_FRAME_SECONDS || count === MAX_SUBSTEPS;
    this.remainder = limited ? 0 : Math.max(0, requested - count * DT);
    for (let i = 0; i < count; i++) step();
    return limited;
  }
}
