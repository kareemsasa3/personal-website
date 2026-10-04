# Traffic Simulator

Playable simulation at `/simulations/traffic-simulator`. The registry card keeps its original position and copy. It now launches the page instead of showing "In development". No dependencies, package scripts, navigation items, or infrastructure were changed.

## Structure

- `src/components/TrafficSimulator/model/network.ts`: corridor geometry, lanes, stop lines, entries, units.
- `model/idm.ts`: Intelligent Driver Model car following.
- `model/signals.ts`: signal plans, the fixed-time schedule, and the controller state machine (fixed-time and actuated).
- `model/engine.ts`: vehicles, arrivals, admission, stop-line rules, integration, trip accounting, live statistics, bounded history.
- `model/random.ts`: seeded PRNG and exponential inter-arrival times.
- `model/clock.ts`: wall-time accumulator with fixed substeps and a stall limit.
- `model/presets.ts`: the four scenarios, each with demand, plan, seed, and experiment text.
- `useTrafficSimulation.ts`: browser lifecycle, playback, reduced motion, visibility, and React snapshots at 4 Hz. The model never imports React.
- `renderer.ts` / `TrafficCanvas.tsx`: canvas drawing, resize/DPR handling, theme palette, and the vertical layout for tall canvases.
- `TrafficControls.tsx`, `ParameterPanel.tsx`, `MetricsPanel.tsx`, `Sparkline.tsx`: labelled controls, live tiles, trends, and tables.
- `src/pages/TrafficSimulator/`: page composition and responsive, theme-token styling.

## Model

Units are metres, seconds, and m/s, with a fixed step of 0.1 s at every playback speed.

**Network.** One arterial runs 680 m east–west, with two lanes in each direction. Three signals stand 200 m apart. Each crosses a 220 m street with one lane each way. Vehicles travel straight through: there are no turns and no lane changes.

**Arrivals.** Each entry generates a Poisson stream at its demand rate (vehicles/hour), from its own seeded stream. Each driver's preferred speed is 90–102% of the 50 km/h limit. A vehicle enters the lane with more room, at a speed that room allows. If neither lane has room, it waits off-map: that is the "waiting to enter" figure. Each entry holds at most 150 waiting vehicles, and arrivals beyond that are counted as dropped. Arrivals never depend on signal timing, so runs that differ only in timing see identical traffic.

**Driving.** The Intelligent Driver Model sets each acceleration from the gap and closing speed to whatever is directly ahead: the vehicle in front, or a stop line the driver must not cross. Parameters: 1.5 m/s² acceleration, 2 m/s² comfortable braking, 1.4 s time gap, 2 m jam gap, 9 m/s² braking limit. Accelerations are computed from the step's starting state and then applied front to back. A follower is held behind its leader's new rear, so vehicles never overlap.

**Stop lines.** A stop line acts as an obstacle when:

- the light is red;
- the light is yellow and the driver can stop at 3.5 m/s² or less (the decision then sticks for that yellow);
- crossing traffic still occupies the intersection box; or
- the tail of a stopped queue beyond the box leaves too little room for this driver and everyone ahead of it to clear ("don't block the box").

A vehicle never crosses a stop line that is closed to it.

**Signals.** Both controllers share one state machine. Every change of right of way goes green → 3 s yellow → 2 s all-red → green on the other street, and every green lasts at least 5 s, including when the plan is edited mid-cycle.

- *Fixed time:* cycle = east–west green + north–south green + 10 s. The split divides the green time. Signal *k* runs its cycle *k* × offset seconds behind signal 1.
- *Actuated:* a detector covers 35 m before each stop line. A green holds while vehicles are on its detectors. It ends when the other street is waiting and its own detectors empty (gap-out), or at 40 s (max-out). With no competing demand it rests in green.

**Measurements.** Delay is a trip's actual time, including any wait to enter, minus the route length divided by the driver's preferred speed. A stop is a drop below 0.3 m/s; the vehicle must exceed 3 m/s before another counts. Tiles and tables cover trips finished in the last 60 s. The trend charts sample every 5 s and keep 6 minutes. Queues count vehicles under 2 m/s approaching each signal.

**Emergent behaviour.** Measured by the model suite and by probing the presets:

- Eastbound capacity under the default 60 s / 60% plan is roughly 1,500 vehicles/hour.
- Above that, the first signal's queue fills its approach and the off-map backlog grows.
- An offset near the 15 s block travel time cuts eastbound stops per trip by more than half, compared with offsets of 0 s or 45 s.
- Actuation roughly halves delay in light traffic.

## Verification

From `web/`:

```sh
npm run typecheck
npm run lint
npm test
node --import ./scripts/traffic-test-loader.mjs scripts/traffic.test.mjs
```

`npm test` builds production assets and runs the orbital and traffic suites. It then checks generated route shells, canonical metadata, breadcrumbs, sitemap entries, and the Simulations launch links. The traffic loader mirrors the orbital one: it uses the existing TypeScript compiler and Node's module registration API.

The 25 traffic tests cover:

- car following, and fixed-time timing, offsets, mid-cycle plan changes, and actuated rest/gap-out/max-out;
- plan and demand validation;
- determinism;
- per-step invariants for 15 simulated minutes of every preset: no overlap, no entry on red, no shared intersection box, and vehicle conservation;
- multi-lane use, and queue formation and discharge;
- oversaturation, the split trade-off, green-wave progression, and actuated vs fixed delay;
- forced spillback, with box blocking and crossing traffic held;
- live metrics, bounded history and backlogs, the frame clock, and the registry entry.

The red-light, box-occupancy, and storage rules were each disabled once to confirm a test fails without them.

The browser regression script uses an existing Playwright installation:

```sh
node scripts/traffic-browser-test.mjs http://localhost:5173 /absolute/path/to/playwright/index.mjs /absolute/path/to/chromium
```

Screenshots go to `/tmp/traffic-browser` (override with `TRAFFIC_ARTIFACTS`). The suite exercises:

- play/pause/step and speed;
- live metrics and trend lines;
- keyboard slider changes, Restart run vs Reset scenario, and switching control mode;
- every scenario, and per-signal zoom;
- both themes, and 320/375/430 px layouts with the vertical corridor;
- keyboard focus and activation, and card routing from `/simulations`;
- reduced-motion startup with Step 1 s and an explicit Play.

Console errors and page errors fail the run; warnings are printed. Two warnings are expected: Chrome's `willReadFrequently` hint, triggered by the test's own pixel readback, and Framer Motion's site-wide reduced-motion notice.

## Limits

This is a teaching model, not a calibrated traffic engineering tool. It has no turning movements, lane changes, pedestrians, heterogeneous vehicle types, or emergency braking behaviour beyond the IDM limit. Signals serve two phases with no protected turns. Spillback across whole blocks needs a downstream bottleneck. The shared signal plan and straight-only flow rarely create one, so the test forces it with a parked queue. Browser automation emulates narrow screens, not the performance of a physical phone.
