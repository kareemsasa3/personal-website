# Post-evaluation measurements

Measurements behind the fixes applied to the Simple-prompt artifact (`7420cc7`) before it was published. The artifact is preserved unchanged by the tag `traffic-sim-experiment-simple`. Each fix was made on top of it and reached `main` in the squash merge of PR #11 (`92b8eb4`).

## Signal timing edits

- **Probe:** `evaluation/candidate-1-probes/probe-edits.mjs`. Corridor at 1800 veh/h; every 37 s it changes cycle, coordination and green share together.
- **Before (`7420cc7`):** 49 edits, 1747 stop-line crossings, 12 of them on red (11 more than 2 s into red).
- **After:** the regression test `abrupt timing edits mid-run still show a full yellow before red` replays the same edit sequence for 1800 s. It requires no illegal light transitions, a shortest yellow of at least 3 s, and zero crossings on a shown red. Run against the artifact before the fix, the test failed on a list of illegal transitions: green→red at every signal, and one red→yellow.
- **Without edits:** shown lights equal the fixed-time schedule at every step. The documented single-seed figures reproduce exactly on the derivative across all 10 seeds of `probe-docs.mjs`: 0.70 / 2.30 / 1.86 stops per trip, 106 / 156 / 131 s trip times, and 198 waiting at 2600 veh/h.

## Ring road

A run of the default ring (34 vehicles, 0.6 m/s²) with no perturbation. Speed standard deviation by elapsed time:

| Time | Std dev | Minimum speed |
| --- | --- | --- |
| 300 s | 0.01 m/s | — |
| 600 s | 0.10 m/s | — |
| 900 s | 1.25 m/s | — |
| 1200 s | 5.16 m/s | 0 km/h |

With 25 or 30 vehicles the ring stayed even (0.00 m/s) for 1200 s. Removing the ±0.2 m seeded starting jitter also removes the spontaneous breakdown; the mutation run shows this.

## Paused work

Measured on the dev build: animation-frame callbacks per second and simulator-canvas `fillRect` calls per second.

| State | Frames/s | Canvas draws/s |
| --- | --- | --- |
| `/simulations` (site background only) | 62 | 0 |
| Traffic Simulator, playing, 2× | ≈230 | ≈19,000 |
| Traffic Simulator, paused, after the fix | ≈57 | 0 |

Restarting a paused run still redraws (4,129 draws for one restart).

## Time-space diagram cost

- **Scripts:** `evaluation/derivative/st-bench.js` and `st-compare.js`. They run in Chromium against the dev server, with CDP CPU throttling.
- **`st-compare.js` dependency:** it imports a temporary copy of the pre-change renderer, `zz-renderer-orig.ts`, taken from `git show f4d6157~1:web/src/components/TrafficSimulator/renderer.ts` and placed in `web/src/components/TrafficSimulator/`.

Full repaint, original renderer, after 600 s of lane drop (240 samples):

| Configuration | Unthrottled | 4× | 6× |
| --- | --- | --- | --- |
| Default demand, 37k dots, 330 px @2× | 23 ms | 100 ms | 149 ms |
| Maximum demand, 61k dots, 330 px @2× | 38 ms | 165 ms | 251 ms |

Retained dot layer, per new sample (maximum demand, 330 px @2×): 4.5 ms unthrottled, 4.4 ms at 4×, 6.8 ms at 6×. A full repaint now happens only on resize, theme change or restart.

Compared pixel by pixel with the original renderer on identical engine state:

- 330 px @2×, lane drop: 1.13% of pixels differ strongly.
- 775 px @1×, ring and corridor: 0.7–0.9%.
- The difference is antialiasing at dot edges.

Whole page, measured with `evaluation/derivative/page-perf.js`. Lane drop at 5400 veh/h, 16× playback, 390×844 @2×, CPU throttled 4×, sampled for 15 s:

| Build | Simulated s per wall s | Frames/s | Main thread busy | Script |
| --- | --- | --- | --- | --- |
| `7420cc7` | 16 | 25 | 100% | 83% |
| Derivative | 16.1 | 165 | 57% | 29% |

Headless Chromium's frame rate is not capped at 60 Hz, so read the frame rates relative to each other.

## Mutation testing

- **Harness:** `evaluation/mutation/mutate.mjs`, the blind reviewer's 51 single-rule breakages plus three aimed at post-evaluation code.
- **`7420cc7`:** 26 caught, 25 not caught (`mutation-original-7420cc7.txt`). The log ends with an `ENOENT` error when the harness reaches the first of the three post-evaluation breakages, whose file (`congestion.ts`) does not exist in the original. All 51 original breakages had completed by then.
- **Derivative at `4917d19`:** 47 of 54 caught (`mutation-derivative-4917d19.txt`). On the original 51 breakages it misses 7; all three new breakages are caught.

The seven not caught:

| Breakage | Why the suite cannot see it |
| --- | --- |
| HARD_STOP=3.5 | The path never runs: lights always show a full yellow first. |
| "Committed never cleared" | Equivalent: the line before it already clears the commitment. |
| Overlap guard removed | The guard never fires. |
| Overlap guard silenced | The guard never fires. |
| Clock substep cap raised | Unreachable: the 0.1 s frame cap bounds steps first. |
| Lane-change follower gap check removed | Covered by the braking-limit check. |
| Stop-count hysteresis removed | No observable effect found in any tested metric. |
