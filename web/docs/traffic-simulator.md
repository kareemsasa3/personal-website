# Traffic Simulator

Local implementation at `/simulations/traffic-simulator`. The existing registry card stays in its original position and now launches the page. No dependencies, package scripts, navigation, or infrastructure were changed.

## Structure

- `src/components/TrafficSimulator/model/idm.ts`: Intelligent Driver Model acceleration, the fixed step (`DT = 0.1 s`), and the equilibrium speed for a given gap.
- `model/signals.ts`: fixed-cycle signal timing (green, 3 s yellow, red), offsets for green-wave, simultaneous, and reverse-wave coordination, and the shown-light sequence that keeps timing edits safe.
- `model/engine.ts`: vehicle state, per-lane ordering, stop-line decisions, MOBIL lane changes, ballistic integration, entrance queue, exits, ring wrap-around, space-time samples, and metrics.
- `model/scenarios.ts`: the three scenarios, their vehicle classes, seeds, warm-up, and control ranges.
- `model/clock.ts`: wall-time accumulator, fixed substeps, stall/work limits (same approach as the Orbital Simulator).
- `model/random.ts`: seeded mulberry32 generator and exponential inter-arrival times.
- `useTrafficSimulation.ts`: browser lifecycle, visibility/reduced-motion handling, controls, and UI snapshots at 10 Hz. The model does not depend on React.
- `renderer.ts`, `RoadCanvas.tsx`, `SpaceTimeCanvas.tsx`: canvas drawing. The road folds into rows on narrow screens; the ring scenario draws a loop. The time-space diagram redraws only when a new sample lands.
- `ThroughputChart.tsx`, `TrafficReadout.tsx`, `TrafficControls.tsx`: SVG throughput chart with hover readout and data table, text measurements and signal states, and labeled controls.
- `src/pages/TrafficSimulator/`: page composition and theme-token-based responsive styling.

## Model

Units are metres, seconds, and metres per second. Each vehicle's front bumper position `x` advances along one direction of travel; lanes are kept sorted downstream-first.

**Car following.** IDM: `a·[1 − (v/v0)⁴ − (s*/s)²]` with `s* = s0 + max(0, vT + vΔv / 2√(ab))`. A driver takes the minimum of the response to the vehicle ahead and to any stationary obstacle (a stop line it has chosen to obey, or the end of its lane). Deceleration is clamped at 9 m/s². Integration is ballistic; vehicles never reverse. A guard pass would clamp any overlap and count it; tests require that count to stay zero.

**Signals.** All signals share one cycle and green share; coordination changes only the offsets. A green wave delays each downstream signal by its distance from the first divided by the speed limit. When a signal is not green, a driver obeys it only if stopping needs no more than 3 m/s² (yellow) or 7 m/s² (red); otherwise the driver commits to clearing that signal and ignores it until past the line.

Each signal shows its fixed-time schedule exactly until the timing is edited. An edit can jump the schedule mid-cycle, so the light a driver sees only ever steps green → yellow → red → green: a light that is green when its new schedule says red shows a full 3 s yellow first, a yellow is never cut short, and a red holds until the schedule next turns green. (The experimental artifact at `7420cc7` applied edits to the lights instantly; under abrupt edits drivers too close to stop crossed on red. The tests now cover that case.)

**Lane changes.** MOBIL with symmetric rules: a change happens when the driver's gain plus politeness × the net gain of the old and new followers exceeds 0.15 m/s², the new follower would brake by no more than 4 m/s², and the physical gaps fit. Each vehicle re-evaluates every 0.5 s with a 3 s cooldown. In the lane-drop scenario, the ending lane is closed to entry within 400 m of its end and leaving it carries a 3 m/s² bias. Drawn lateral movement eases over 1.5 s; it has no physical effect.

**Demand.** Open roads receive Poisson arrivals from a seeded generator. Arrivals join an entrance queue and enter one per lane per step, at the speed of the vehicle ahead and only with the headway that speed calls for. Trip time is measured from arrival, so entrance waits count. Open roads run a warm-up (120 s corridor, 90 s lane drop) before the first frame.

**Ring road.** Vehicles start evenly spaced at the IDM equilibrium speed for that spacing, with ±0.2 m deterministic jitter. "Brake one car" makes the fastest vehicle brake at 4 m/s² for 3 s. Throughput is counted at a detector at `x = 0`.

**Determinism.** A scenario plus its parameters fully determines a run: Restart run replays the same arrivals and driver traits. Live edits take effect from the current state; changing the ring's vehicle count rebuilds the ring.

## Observed behaviour

These are single-seed model outputs at default settings unless noted, read at the end of 600 s runs (ring: 300 s, tap at 20 s). The tests assert weaker versions of them. They are not calibrated predictions.

- Signal corridor, 1000 veh/h, last 50 trips: 0.70 stops per trip with a green wave, 2.30 with simultaneous offsets, 1.86 with a reverse wave; mean trip time 106 s, 156 s, and 131 s respectively. At 2600 veh/h, 198 arrivals were still waiting to enter at 600 s.
- Lane drop: at 2000 veh/h, 4 vehicles were below 7 km/h at 600 s and no trips stopped; at the default 3600 veh/h, 57 were below 7 km/h, and a per-100 m probe placed the slow traffic upstream of the drop, extending several hundred metres back; at 5000 veh/h, 166 arrivals were waiting at the entrance and the trailing-minute discharge read 2340 veh/h, against 3120 veh/h at default demand.
- Ring road, 34 vehicles, 0.6 m/s²: without a perturbation the speed standard deviation is 0.01 m/s at 300 s; after one brake tap some vehicles come to a stop and the wave travels backward (standard deviation 5.2 m/s). Left alone, the same ring breaks down by itself: 0.10 m/s at 600 s, 1.25 m/s at 900 s, and a full stop-and-go jam (5.16 m/s, vehicles stopped) by 1200 s. The tap triggers an instability that is already there. With 25 or 30 vehicles the unperturbed ring stayed even for the full 1200 s (single runs; other counts not checked). With 25 vehicles the same tap leaves a 0.46 m/s spread and no vehicle below 38 km/h; with driver acceleration of 1.5 m/s² it leaves 0.10 m/s.

## Verification

From `web/`:

```sh
npm run typecheck
npm run lint
npm test
node --import ./scripts/traffic-test-loader.mjs scripts/traffic.test.mjs
```

`npm test` builds production assets, runs the orbital and traffic suites, and checks generated route shells, canonical metadata, sitemap inclusion, and the Simulations links.

The 14 traffic tests cover IDM free-road and equilibrium behaviour, signal timing and offsets, determinism, collision/reversal/lane-overrun invariants at every control's minimum and maximum, vehicle conservation, red-light compliance (no crossing more than 2 s into red), green-wave advantage over both other offsets on identical traffic, oversaturation building an entrance queue, merge queues forming only under heavy demand, ring-road jam formation and decay, atomic and validated parameter edits, bounded sample buffers, frame-rate independence at 60/120/144 Hz for every playback speed, and the registry entry.

Browser checks used the Playwright connector against the dev server: all three scenarios, live control edits, Restart run, ring rebuild, card routing from `/simulations`, dark and light themes, 375 px and 320 px widths without horizontal overflow, and reduced-motion startup paused with explicit Play. No browser regression script was added.

## Colour

Vehicle shading is a one-hue ordinal ramp in five speed bins (share of the speed limit), with stopped traffic carrying the most contrast. Light and dark steps were checked with the dataviz palette validator against both the canvas surface and the road fill. Signal states use fixed status colours and are always named in the text list beside the road.

## Limits

The yellow/red decision uses the constant deceleration needed to stop at the line; IDM's actual braking toward the line can briefly exceed that, and review probing observed rare peaks at the 9 m/s² clamp. One direction of travel, no cross-street traffic, turning movements, pedestrians, or actuated signals. Signals are drawn across all lanes at once. Drivers are deterministic apart from their seeded desired-speed spread; there is no reaction delay. Flow readouts are trailing one-minute counts and are noisy at low volume. The model is a teaching tool, not a calibrated traffic study.
