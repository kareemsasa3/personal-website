# Traffic Simulator experiment: captured evidence

Staging area for the blinded comparison of two Traffic Simulator implementations. These files are working evidence, not yet published site media. Final assets are copied into `web/public/media/` and renamed when the case study is written.

Candidate labels are neutral. They do not identify which invocation strategy produced which branch.

| Label | Branch | Commit | Merge base |
| --- | --- | --- | --- |
| Candidate 1 | `worktree-traffic-sim-flow-model` | `7420cc7` | `ac5fe45` |
| Candidate 2 | `worktree-traffic-simulator-b` | `0e62d2c` | `ac5fe45` |

## How it was captured

- Each candidate was checked out as a detached worktree at the commit above. It was built with `npm test` (production build plus smoke test) and served locally with `vite preview`. Neither branch was modified.
- `capture.mjs` drove headless Chromium through Playwright, in the dark theme with no reduced-motion preference. It saved stills as PNG clips of page regions and recordings as CDP screencast frames.
- PNGs were converted to WebP at quality 82. Recordings were encoded as H.264 (High profile, yuv420p, 30 fps), with no audio and `+faststart`. This matches the existing `web/public/media/*.mp4` files.
- `capture-log.json` records each asset's page clip, the simulated time shown, the scenario and settings, and any page or console errors during the run. All error counts were 0.
- Desktop captures used a 1360×1000 CSS px viewport at DPR 1. Files named `mobile` used a 390×844 viewport at DPR 2.

## Assets

### Candidate 1

| File | Size | Shows |
| --- | --- | --- |
| `candidate-1-corridor-greenwave.webp` | 1297×1176 | Signal corridor, Green wave, defaults. Shows controls, folded road view, measurements, time-space diagram and throughput chart. |
| `candidate-1-corridor-reversewave.webp` | 1297×1176 | The same corridor and arrivals with Reverse wave. |
| `candidate-1-corridor-*-timespace.webp` | 775×416 | Time-space diagram detail from each corridor run, readable at phone width. |
| `candidate-1-lanedrop.webp` | 1297×1041 | Lane drop at the default 3600 veh/h. The congested band sits upstream of the drop. |
| `candidate-1-ring-jam.webp`, `candidate-1-ring-jam-timespace.webp` | 1297×1219, 775×416 | Ring road, defaults, about 70 s after one "Brake one car" tap. |
| `candidate-1-ring-brake.mp4` | 1296×972, 24 s | Ring road at 2× playback after a 40 s uniform pre-roll. "Brake one car" is pressed about 2.5 s in. Shows the stop-and-go wave forming and travelling backward on the ring and in the time-space diagram. |
| `candidate-1-mobile-ring.webp`, `candidate-1-mobile-timespace.webp` | 718 px wide | The same ring behaviour at phone width. |

### Candidate 2

| File | Size | Shows |
| --- | --- | --- |
| `candidate-2-greenwave-offset15.webp` | 1297×1359 | Green wave preset (15 s offset) at 4:00 simulated. Shows corridor, settings and live measurements. |
| `candidate-2-greenwave-offset0.webp` | 1297×1359 | The same preset and arrivals with the offset set to 0 s. |
| `candidate-2-greenwave-offset*-measurements.webp` | 1297×507 | Measurement tiles and per-direction table for each run. Eastbound delay is 18 s at 15 s offset and 49 s at 0 s; westbound delay moves the other way. |
| `candidate-2-rush-signal1.webp`, `candidate-2-rush-measurements.webp` | 1297×853, 1297×507 | Rush hour preset with View set to Signal 1. The eastbound queue reaches the entrance and the waiting-to-enter backlog grows. |
| `candidate-2-rush-signal1.mp4` | 1296×732, 24 s | Rush hour at 4× playback, zoomed to Signal 1. Shows queues forming on red, partial discharge on green, and side-street queues. |
| `candidate-2-mobile-corridor.webp` | 718×1462 | Rush hour at phone width, with the corridor drawn vertically. |

## Caveats

- Each capture is a single run at the stated settings and seed. Numbers visible in a frame are one-minute or trailing-window readouts, and they are noisy.
- Evidence of model behaviour beyond these frames, such as invariants, seed robustness and mutation results, comes from the evaluation probes. It is not in these images.
- The site header and Matrix background are part of the live page; the crops exclude the header.
