# Orbital Simulator

Local implementation at `/simulations/orbital-simulator`. The existing registry card stays in its original position and now launches the page. No dependencies, package scripts, navigation, or infrastructure were changed.

## Structure

- `src/components/OrbitalSimulator/physics/model.ts`: body types, astronomical units, validation, barycenter, and energy/momentum diagnostics.
- `physics/integrator.ts`: pairwise accelerations and kick–drift–kick leapfrog.
- `physics/engine.ts`: mutable numerical state, atomic edits, rollback on rejected steps, and bounded trail rings.
- `physics/clock.ts`: wall-time accumulator, fixed substeps, stall/work limits.
- `physics/presets.ts`: deterministic initial conditions, shifted once into a zero-momentum barycentric frame. Stars remain free thereafter.
- `useOrbitalSimulation.ts`: browser lifecycle, visibility/reduced-motion handling, controls, and UI snapshots at 10 Hz. Physics does not depend on React.
- `renderer.ts` / `OrbitalCanvas.tsx`: canvas drawing, resize/DPR management, picking, and camera interaction. Canvas owns its animation loop; trail points never become DOM nodes.
- `BodyInspector.tsx` / `SimulationControls.tsx`: labeled controls and paused, atomic parameter edits.
- `src/pages/OrbitalSimulator/`: page composition and theme-token-based responsive styling.

## Numerical model

Distance is AU, mass is solar masses, and time is years: `G = 4π²`. Every pair interacts; the two accelerations come from equal and opposite forces. No body is fixed or moved along a prescribed path.

The model uses the Plummer potential `Uij = −G mi mj / sqrt(r² + ε²)`, with `ε = 0.025 AU`. Acceleration is `G mj Δr / (r² + ε²)^(3/2)`. Energy diagnostics use that same potential. This approximates Newtonian point gravity away from close encounters and regularizes zero separation. Bodies do not bounce, collide, or merge. Rendered radii are pixels, unrelated to gravity or physical size.

Leapfrog always advances `1/16384` year per step. Speed is simulated years per wall second; fractional step debt carries between frames. Each frame accepts at most 0.1 wall second and 2048 substeps. Excess debt is discarded and the UI reports slower playback; no oversized integration step is substituted. Hidden tabs suspend advancement and resume without catch-up.

A step is rejected if it exceeds 8% of either a pair's softened dynamical timescale or relative crossing timescale, or if state becomes nonfinite/out of numerical range. The last valid state is restored and the UI pauses with a recovery message. Mass/initial-position/velocity bounds and a maximum of eight bodies protect configuration and edits. Current presets contain two to four bodies; arbitrary creation is intentionally omitted.

Trails sample every 128 steps into 800-point typed-array rings: roughly 6.25 years of history per body. Positions are stored in the inertial frame. Camera following moves the view without modifying physics. Parameter edits clear trails and establish a new energy baseline while retaining elapsed time. Reset restores initial conditions and the camera while preserving the user's playback state, speed, and trail preference.

## Verification

From `web/`:

```sh
npm run typecheck
npm run lint
npm test
node --import ./scripts/orbital-test-loader.mjs scripts/orbital.test.mjs
```

`npm test` builds production assets, runs the physics suite, and checks generated route shells, canonical metadata, sitemap inclusion, and the Simulations link. The test loader uses the existing TypeScript compiler and Node's module registration API (Node 20.6+); it does not require Node 22 type stripping or a new test library.

The 14 numerical/registry tests cover acceleration, force symmetry, isolated motion, deterministic evolution, conservation, 20-year stable orbits, three-body evolution, 60/120/165 Hz clock equivalence at every speed, bounded stalls/trails, edit atomicity, invalid configuration, and close-encounter rollback. Stable-orbit limits are 0.01% relative energy change, 0.1% radial change for circular pairs, and 3% radial change for the interacting multi-planet system.

The separate browser regression script uses an existing Playwright installation:

```sh
node scripts/orbital-browser-test.mjs http://localhost:5173 /absolute/path/to/playwright/index.mjs /absolute/path/to/chromium
```

With Playwright already resolvable and its browser installed, the last two arguments can be omitted. Screenshots go to `/tmp/orbital-browser` (override with `ORBITAL_ARTIFACTS`). The suite checks playback/reset/speed, all scenarios, body selection/editing/validation, trails, pointer picking/pan, camera controls, keyboard focus/activation, card routing, both themes, 320/375/430px layout, and reduced-motion startup with explicit Play. It records browser runtime and console errors.

Browser validation used installed Chromium because the in-app browser had no connection and the Playwright connector's configured Firefox executable was missing. The existing mobile site settings close button can be overlapped by the site header; the suite uses the existing Escape behavior to close that panel. This feature does not change that shared UI.

## Limits

This is a planar numerical experiment, not an astronomical ephemeris. Close encounters may deliberately stop for accuracy. The model has no physical collisions, arbitrary body creation, or persistence. High playback speeds may run slower on low-frame-rate devices; physics resolution remains fixed. Browser automation emulates narrow screens, not the performance of a physical phone.
