# Blinded evaluation report

This is the evaluator's report from the end of Phase 1, reproduced from the evaluation session's transcript. It is verbatim except where a `[redacted: …]` marker replaces local detail with no evidentiary value: local directory paths and a note about local worktree lock state. Recommendations, findings, numbers, and the record of which branches and `main` were left untouched are unchanged.

- **Report written:** 2026-10-05T16:42:51Z.
- **Prompt mapping revealed:** 2026-10-05T16:47:33Z. Until then the evaluator knew only "Candidate 1" (`worktree-traffic-sim-flow-model`) and "Candidate 2" (`worktree-traffic-simulator-b`).
- **The mapping:** Candidate 1 was the Simple-prompt run and Candidate 2 the Detailed-prompt run.

**Correction, found after the reveal.** The report says Candidate 1's suite missed 23 of 51 single-rule breakages. That figure came from the reviewer's written summary. The reviewer's own harness output (`evaluation/candidate-1-probes/mut.txt`) records 25 not caught. A re-run of the same harness against `7420cc7` gives the identical per-mutant result (`evaluation/mutation/mutation-original-7420cc7.txt`). The case study uses 25.

---

I recommend publishing **Candidate 1** (`worktree-traffic-sim-flow-model`), after two small fixes. Candidate 2 is the better-engineered and better-tested artifact, but Candidate 1 is far better at showing emergence, which is what the Simulations page is for. The call is closer than the size difference suggests.

Labels are neutral: Candidate 1 is `worktree-traffic-sim-flow-model` @ `7420cc7`, Candidate 2 is `worktree-traffic-simulator-b` @ `0e62d2c`. Both branch from `main` at `ac5fe45`.

## 1. Evaluation of each candidate

**Candidate 1 is a three-scenario lab for emergent congestion.**
- **Scenarios:** a one-way signal corridor with three coordination modes; a three-lane highway losing a lane (drivers merge using a standard lane-change rule, MOBIL); a ring road with a "Brake one car" button.
- **Model:** drivers follow the Intelligent Driver Model (IDM), a standard car-following rule, with a fixed 0.1 s step and seeded arrivals.
- **Instruments:** a road view, a throughput-vs-demand chart with a data table, and a **time-space diagram**.
- **Main strength:** the time-space diagram makes emergence visible. Coordination bands, the jam upstream of the lane drop, and the backward-travelling ring wave all show up as shapes you can see, not just numbers. The roads start pre-filled.
- **Weaker on:** live timing edits, test strength, and some page copy (details in §4).

**Candidate 2 goes deep on one system: a two-way, three-signal arterial with cross streets.**
- **Signals:** each change goes through yellow, then all-red, then a minimum green, including when the plan is edited mid-run. Fixed-time and detector-actuated control are both available.
- **Other rules:** a "don't block the intersection" rule, and a capped waiting backlog that counts dropped arrivals.
- **Interface:** four presets, a per-signal zoom, a vertical corridor on phones, and a Step 1 s button. Per-direction tables reveal a real trade-off: an offset that helps eastbound hurts westbound.
- **Quality:** neither I nor its reviewer found a correctness bug, and it has the stronger test suite.
- **Main weakness:** it is narrower (all phenomena are signal timing) and visually less revealing. On desktop the cars are tiny in mostly empty space, the road starts empty, and trends are unlabeled sparklines.

## 2. Important differences observed in use

| | Candidate 1 | Candidate 2 |
|---|---|---|
| Phenomena | Signal coordination, bottleneck merge, phantom jam | Signal coordination (both directions), oversaturation, fixed vs actuated |
| Change of fewer stops (headline effect) | Green wave 0.84 stops / 111 s trip vs reverse wave 1.98 / 132 s | 15 s offset: eastbound 18 s delay / 0.6 stops; 0 s offset: 49 s / 1.4 (westbound moves the other way) |
| Other effect | One brake tap → 15 of 34 cars stopped, wave moves backward | Actuated 17 s vs fixed 27 s delay (quiet-night preset) |
| Seeing emergence | Time-space diagram (excellent) | Numbers and tables; zoom view helps |
| Mid-run timing edits | Signal state jumps (see §4) | Proper transitions; 400 fuzzed edit runs, 0 violations |
| Reduced motion | Starts paused on a populated road | Starts paused on an empty road, plus Step 1 s |
| Animation loop | Runs and re-renders at 10 Hz even while paused | Runs only while playing |
| Size | 27 files, +2,622 lines; 14 model tests | 30 files, +3,235 lines; 26 model tests plus a browser script |

Site integration is nearly identical: route, metadata, sitemap, route shell, card SVG, and smoke-test additions. Candidate 2 also adds breadcrumb structured data, the way Snake and Spider have it; Candidate 1 follows Orbital, which has none.

## 3. Test and validation results

All of this was run on detached copies of each commit; neither branch was modified.
- **Both candidates:** `npm run typecheck` and `npm run lint` are clean. `npm test` (production build, orbital and traffic suites, smoke test) passes.
- **Model suites:** Candidate 1 passes 14/14. Candidate 2 passes 26/26.
- **Candidate 2's browser script** passes against its production build. Its only console warning comes from the script's own pixel readback.
- **Hands-on checks (both):** no console errors; no horizontal overflow at 320, 375 and 430 px; both themes render correctly; reduced motion starts paused and an explicit Play works.
- **Long-run invariant checks** (each reviewer, independently of the shipped tests): 51 configurations × 30 simulated minutes for Candidate 1, and 60 × 30 minutes for Candidate 2. Both showed zero overlaps, reversals and NaN values; vehicle counts were conserved.
- **Every numeric claim in Candidate 1's docs reproduces exactly** at its default seed.
- **Test strength:** we broke individual rules on purpose to see whether the suite notices.
  - Candidate 1's suite missed 23 of 51 deliberate breakages (about 5 of those were no-ops). Examples: removing the yellow phase, removing the lane-change safety check, flipping the politeness sign.
  - Candidate 2's suite caught the core rule breakages: red light, yellow decision, box occupancy, all-red, minimum green, and the actuated logic. It missed changes to metric definitions: delay, throughput window and queue metric.

## 4. Bugs and shortcomings

**Candidate 1**
- **Mid-run timing edits make cars run red lights.** I confirmed this: 49 abrupt edits produced 12 red-light crossings, 11 of them more than 2 s into red. The signal phase is computed from time zero, so an edit jumps it with no yellow. The docs disclose only a related braking limit, not this.
- **The default ring jams on its own.** I confirmed this: no tap, speed spread 0.01 at 300 s, 1.25 at 900 s, 5.16 with cars stopped at 1200 s. This is real driver-model behaviour and matches real ring-road experiments. But the page copy and a test name ("uniform flow persists") imply only the tap causes a jam.
- **Other issues:**
  - The entrance queue is unbounded: it reached 1,243 vehicles in 30 minutes at extreme settings.
  - The "lower discharge at 5000 than 3600 veh/h" claim holds in only 6 of 10 seeds.
  - The throughput chart includes the warm-up period, so the first minute looks like the road is "not keeping up".
  - Signal S2 sits exactly at the point where the road view folds onto a second row, which reads oddly.
  - The time-space readout works with a mouse only.

**Candidate 2**
- **The "don't block the intersection" and spillback rules never trigger in the shipped presets** (52M checks, zero fires). The route description promises users can "watch queues, spillback…", which overstates this; the docs' limits section is honest about it.
- **Capacity is 1,440 veh/h**, against the stated "~1,500". Its other claims held across 10 seeds.
- **Presentation:** demand is shown in veh/h but throughput in veh/min; the road starts empty; vehicles are tiny on desktop.
- **Motion:** vehicles move in 10 Hz jumps at 1× because there's no interpolation. This was inferred from the code; it wasn't visible in the 4× clip.

## 5. Media captured

Everything is on a new local branch, `case-study/traffic-sim-experiment` ([redacted: local worktree path], one commit, not pushed). It lives under `docs/evidence/traffic-simulator-experiment/`:
- **16 WebP stills** with stated dimensions:
  - desktop overviews at 1297 px wide;
  - 775 px detail crops of the time-space diagram, readable on a phone;
  - phone-width captures at 2×.
- **2 clips**, H.264, 30 fps, no audio, 24 s each, matching the existing site videos:
  - `candidate-1-ring-brake.mp4` (1.26 MB): one brake tap becomes a backward wave.
  - `candidate-2-rush-signal1.mp4` (0.63 MB): queues build at signal 1 during rush hour.
- **Paired comparisons:** Candidate 1 green wave vs reverse wave, and Candidate 2 offset 15 s vs 0 s, each on identical arrivals.
- **`README.md`, `capture-log.json` and `capture.mjs`** record provenance: settings, simulated time and error counts for each asset, all errors zero.

Raw PNGs from hands-on testing are in a gitignored [redacted: local directory].

## 6. Recommendation: publish Candidate 1, with scoped fixes

The page exists to make rules → feedback → emergence visible. Candidate 1 shows three distinct emergent phenomena, and its time-space diagram teaches them better than anything in Candidate 2. Its real flaws are local:
- **Signal edits:** make timing edits pass through yellow, or apply them at the next cycle boundary.
- **Ring copy:** correct the wording so it doesn't imply only the tap causes a jam.
- **Optional:** stop the animation loop while paused.

These would be separate small commits, leaving `7420cc7` inspectable as the experimental artifact. Candidate 2's gap is a design-level one (narrow scope, no space-time view), and fixing it means substantial new work.

I don't recommend a hybrid. Candidate 1's signals are computed from elapsed time, while Candidate 2's are a stateful controller. Porting that controller across would rewrite the core of Candidate 1 and produce the third project you warned against.

## 7. Evidence that would change this

- If you weight engineering rigour and test discipline above teaching breadth for a public artifact, Candidate 2 wins on those axes.
- If the signal-edit fix in Candidate 1 turns out not to be small (for example, it breaks the green-wave behaviour), that changes the calculation.
- **Not measured: phone performance.** The time-space diagram redraws about 51k rectangles per sample, up to 30 times a second at 16×. If it stutters on a mid-range phone, I'd want to reconsider or cap the playback speed.
- **Not checked: screen readers, Firefox and Safari.** I only inspected the accessibility tree in Chromium.

## Housekeeping

- **Untouched:** `main` (still `ac5fe45`, clean), both candidate branches (clean), and the abandoned shared worktree with its untracked files.
- [redacted: a note about the local lock state of one candidate's worktree directory. It concerned local tooling, not the branch or its commits, which were confirmed unchanged.]
- **Left in place:** two detached evaluation worktrees [redacted: local paths], in case we need them in the next phase. The preview servers are stopped.
- **Suggested commit message** for the staging branch (already used): `docs(evidence): stage blinded traffic simulator comparison media`.

Please tell me which prompt produced which branch, and we'll continue with the case study.