# Rhythm Lab Tutorial MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Execution model (owner decision, 2026-09-28): native — superpowers:executing-plans, one task per owner-approved gate. Owner decisions are recorded in "Owner decisions (resolved)" near the end.**

**Goal:** Teach a first-time visitor the hit-line invariant in three short steps: a frozen note, a second frozen note, and one unassisted pass. Use the real Rhythm Lab engine, persist only a completion marker, and hand off to the existing Starter Phrase.

**Architecture:** A thin orchestration component (`RhythmLabTutorial`) mounts a fresh `useRhythmLab` instance for each tutorial step. It injects a tutorial wall clock that is clamped at the step's note time, which is how the freeze works. The existing engine, `RhythmHighway`, judgment windows, and scoring are used unchanged. The tutorial instance is never connected to `useChartRuns` or `useRunHistory`, so it cannot write results.

**Tech Stack:** React 18, TypeScript, Vite. No new dependencies.

**Spec:** [`docs/design/rhythm-lab-onboarding-reconciliation.md`](./design/rhythm-lab-onboarding-reconciliation.md) §4 and "Smallest coherent first slice". The owner's scope message of 2026-09-28 narrows it further: no audio synthesis, no tab changes, and no F19 or idle-run fixes.

**Base:** `main` at `2bfefc4` (one commit ahead of `origin/main`). Plan written 2026-09-28.

---

## Global Constraints

- No new dependencies, and no `package.json` script changes (AGENTS.md "Do Not Do Without Explicit Approval").
- No changes to `useRhythmLab.ts`, `useLocalAudioFile.ts`, `library/rhythmLabDb.ts`, `library/types.ts`, `useChartRuns.ts`, `useRunHistory.ts`, `useRecordedCharts.ts`, or `RhythmHighway.tsx`.
- No IndexedDB version bump and no new stores or records. The only new persisted state is one localStorage key, `rhythmLab.tutorial.v1`.
- No routes, navigation, route metadata, sitemap, or `vite.config.ts` changes.
- Preserve the dark terminal/Matrix visual language. Reuse existing classes (`.rhythm-lab-overlay`, `.rhythm-lab-overlay-panel`, `.rhythm-lab-primary-action`, `.rhythm-lab-secondary-action`, `.rhythm-lab-summary-actions`, `.rhythm-lab-active-bar`, `.rhythm-lab-compact-action`, `.rhythm-lab-back-link`). Add new CSS only for the tutorial prompt band.
- Silent tutorial: no Web Audio, no bundled audio.
- Out of scope: Featured Charts, bindings, hashing, offsets, BPM/onset analysis, starter generation, Play/Create tabs, the idle-run bug, F19, and general cleanup.
- `npm run lint` uses `--max-warnings 0`, and `react-hooks/exhaustive-deps` is set to `warn`, so **any missing hook dependency fails lint** (`web/eslint.config.js:74`).
- Commands run from `web/`. Copy in this plan is a proposal; the owner may revise the wording.

## Review Focus

These are the failure modes most likely to affect a real visitor that the task steps do not exercise automatically. Each has a check assigned to the owning task.

1. **Pressing Space/Enter or a lane key during the tutorial also drives the main game.** The main window `keydown` handler restarts the main game on Enter/Space whenever phase ≠ playing (`RhythmLab.tsx:501–509`). Expected: tutorial keys affect only the tutorial. **Check: Task 3, Step 4, rows K1–K3.**
2. **A loaded song stops working after the tutorial.** `useLocalAudioFile` sets `audio.src` on the one mounted `<audio ref={audioRef}>` (`useLocalAudioFile.ts:77–95`). If the tutorial branch unmounted that element, the restored song would be lost until reselected. Expected: the song still previews and plays after exiting. **Check: Task 3, Step 4, row R3.**
3. **Switching tabs mid-step makes step 3 auto-miss, or makes a note jump.** With an injected clock, `useRhythmLab` only cancels and reschedules frames on visibility change (`useRhythmLab.ts:467–484`). The tutorial clock must pause itself. Expected: the note resumes from where it was. **Check: Task 3, Step 4, row V1.**
4. **The tutorial prompt covers the hit line, the judgment readout, or the tap zones on a 320–375 px phone.** Expected: the prompt's bottom edge is above both the readout (`top: calc(var(--rhythm-line-y) - 4.75rem)`, `RhythmLab.css:1178`) and the line. **Check: Task 3, Step 4, rows M1–M2.**
5. **Tapping the frozen tile itself does not register.** Tap zones start at the hit line (`RhythmLab.css:1261–1267`), and the tile's top edge sits exactly on it. Expected: a tap on the tile's visible centre hits the lane button. **Check: Task 3, Step 4, row M3.**

---

## 1. Verified current execution path

Everything in this section was read at `2bfefc4` in `web/src/components/RhythmLab/`.

### Normal gameplay clock

- **Where the clock comes from:**
  - `RhythmLab.tsx:115–124` builds `rhythmClock`. When a file is selected, it is `{ getElapsedMs, isClockComplete: isPlaybackComplete }` from `useLocalAudioFile` (the audio clock: `audio.currentTime * 1000`, `useLocalAudioFile.ts:319–322`). Otherwise it is `undefined`.
  - `RhythmLab.tsx:177` calls `useRhythmLab(activeChart, rhythmClock)`.
- **How the engine reads it:**
  - `useRhythmLab.ts:318` sets `usesExternalClock = Boolean(getElapsedMs)`.
  - `useRhythmLab.ts:320–329`: `readElapsedMs` returns `Math.max(0, getElapsedMs())` if a clock was injected. Otherwise it returns `performance.now() - startedAtRef.current`.
  - So the first-load "silent static clock" is the engine's internal `performance.now()` clock. [verified in browser at the reconciliation]
- **With an injected clock, the engine does no time bookkeeping of its own:**
  - `startGame` and `restartGame` set `startedAtRef = 0` (`:336–345`, `:358–372`).
  - `pauseGame` and `resumeGame` skip pause-offset maths (`:379–395`).
  - The visibility handler only cancels or reschedules animation frames (`:467–484`).

### Rendering

- The rAF loop (`:453–465`) dispatches `TICK { elapsedMs: readElapsedMs(timestamp) }` every frame while `phase === "playing"`, regardless of whether the time value changes.
- `visibleNotes` (`:495–511`) is memoised on `state.elapsedMs`. It keeps notes with `timeMs ∈ [elapsed − 140, elapsed + 1800]`, excluding completed notes, and sets `progress = 1 − (timeMs − elapsed) / 1800`.
- `RhythmHighway.tsx:77–80` places a note at `min(progress, 1.09) × 76%`. Progress 1 is exactly the hit line (`RHYTHM_LINE_PERCENT = 76`, `helpers.ts:36`).

### Automatic misses and completion

- In the `TICK` reducer (`:153–199`), a note auto-misses only when `elapsedMs − note.timeMs > MISS_WINDOW_MS (140)`.
- The phase becomes `complete` when any of these holds:
  - `isClockComplete` is true;
  - `elapsedMs ≥ durationMs + 140`;
  - every note is completed.

### Judgment

- `hitLane` (`:416–434`) is a no-op unless phase is `playing`. It reads `readElapsedMs()` and calls `getHitCandidate` (`:75–127`).
- `getHitCandidate` picks the nearest uncompleted same-lane note within 140 ms, with `deltaMs = round(elapsed − timeMs)`. Perfect is `|delta| ≤ 45`, Good is `≤ 90`, otherwise Miss. With no candidate, it records an `empty-input` Miss.
- Scoring for a Perfect is `1000 + combo × 10`.

### Why a clamped clock freezes the note and prevents auto-miss

Let `getElapsedMs = min(realElapsed, T)`, where `T` is the note's `timeMs`. Once `realElapsed ≥ T`:

- every `TICK` carries `elapsedMs = T`;
- `progress = 1 − (T − T)/1800 = 1`, so the note is drawn exactly on the line;
- `T − T = 0 ≤ 140`, so it never auto-misses;
- `T < durationMs + 140` (a data invariant, checked in Task 1), so the step never completes by time;
- a tap reads `readElapsedMs() = T`, so `deltaMs = 0`, which the real reducer rates **Perfect**, adding a real score of 1010.

The reconciliation's claim holds, and it needs no engine change.

### What keeps running independently of the clock

| Mechanism | Behaviour while frozen | Handling |
| --- | --- | --- |
| rAF loop | Keeps dispatching `TICK` every frame with the same `elapsedMs`; the reducer returns a new state object each time, so the component re-renders at frame rate. | Same cost as normal play. `visibleNotes` memo and `lastJudgment` are unchanged, so effects keyed on them do not re-fire. No action needed. |
| Engine visibility handler | With an injected clock it only stops and restarts frames. | **The tutorial clock must stop time while the tab is hidden** (Review Focus 3). |
| Completion check | Only time-based or all-notes-completed. | For a single-note assisted step, the frame after the Perfect hit completes the step. That is the "advance" signal, so **no unfreeze is needed.** |
| `isClockComplete` | Not supplied, so it is `false`. | Nothing to do. |

### How the tutorial resumes after the frozen hit

It doesn't resume. Each assisted step is a one-note chart, so a successful hit completes that chart. The next step is a fresh mount with a fresh clock. This avoids any mid-chart "resume from freeze" arithmetic.

### Persistence (why the tutorial is isolated by construction)

- `useChartRuns` (`RhythmLab.tsx:238–252`) and `useRunHistory` (`:271–278`) receive the **main** game's `phase`, `currentRunId`, and summary. They write only when the **main** phase becomes `complete` (`useChartRuns.ts:~87`, `useRunHistory.ts:~39`).
- The tutorial's own `useRhythmLab` instance is never passed to either hook.
- While the tutorial is active, the main game stays in `ready`:
  - the main Ready Check is not rendered;
  - the main highway's pointer handler is not mounted;
  - the main key handler returns early (Task 3).
- So the tutorial can produce no run and no history entry.

### Existing browser persistence

- IndexedDB `rhythm-lab-library`: songs, blobs, charts, runs, and preferences.
- localStorage `rhythmLab.runHistory.v1`: history. Its accessors are in `helpers.ts:286–366` and wrap every access in try/catch.
- A boolean-ish UI marker belongs with the localStorage pattern, not in IndexedDB. The IndexedDB preferences record is rebuilt from a fixed field list by two builders, which would drop a new field (reconciliation §1, Q5).

### Existing test infrastructure

- `web/package.json` has no unit-test runner.
- `npm test` runs `test:smoke` (`vite build` + `scripts/smoke-test.mjs`), which checks built HTML shells and does not cover `/simulations/rhythm-lab`.
- Node on this machine is **v22.23.3**. `node --experimental-strip-types` ran a scratch `.ts` assertion file with type-only imports successfully (checked 2026-09-28). That lets the pure tutorial logic be checked **without any dependency or package-script change**.

---

## 2. Chosen tutorial architecture

### Representation: several tiny ordinary charts (chosen)

| Option | For | Against |
| --- | --- | --- |
| **Three tiny `RhythmChart`s, one per step (chosen)** | Each assisted step has exactly one note, so "frozen hit ⇒ chart complete ⇒ advance" uses the engine's own completion rule. Retry and step change are a remount, with no state to reset. Charts are plain data. | Three engine mounts (trivial cost). |
| One chart with orchestrated checkpoints | One continuous timeline. | Needs mid-chart unfreeze and resume offsets, per-checkpoint "which note is next" tracking, and a partial-retry story. |
| Reuse part of the Starter Phrase | No new note data. | Its first note is at 1000 ms, before the notes have fallen the full highway (1800 ms travel), and its notes are 500 ms apart: too dense to teach. It is better used as the handoff, as planned. |

### Components and state location

- **`rhythmTutorial.ts` (new, pure):** step data plus progression rules, with **type-only imports** so it can be checked with Node.
- **`useTutorialClock.ts` (new):** the clamped, visibility-aware `performance.now()` clock.
- **`RhythmLabTutorial.tsx` (new):**
  - it owns tutorial progress (`step index`, `attempt`, or `complete`);
  - it renders an internal `TutorialStepRunner` keyed by `${step.id}-${attempt}`, which owns one `useRhythmLab`, one clock, input gating, hints, and the judgment readout;
  - it renders a completion panel.
- **`RhythmLab.tsx` (modified):** holds `isTutorialActive`, `isTutorialCompleted`, the entry, exit, and handoff callbacks, and the key-handler gate. It branches the header copy, the HUD, and the stage contents. It **keeps `<audio>` mounted.**
- **`ReadyCheckPanel.tsx` (modified):** gains an optional tutorial button.
- **`helpers.ts` (modified):** tutorial-marker localStorage accessors, placed next to the run-history accessors.
- **`RhythmLab.css` (modified):** a prompt-band block.

## 3. State and progression model

```
RhythmLab: isTutorialActive: boolean, isTutorialCompleted: boolean (from localStorage)

RhythmLabTutorial.progress:
  { kind: "step", index: 0|1|2, attempt: n }  ──passed + Continue──▶ next index
                                              ──last step passed + Continue──▶ { kind: "complete" }
  { kind: "step", ... }                       ──retry + Try again──▶ same index, attempt + 1
  { kind: "complete" }  ── on enter: onComplete() → save marker
                        ──Replay──▶ { kind: "step", index: 0, attempt: 0 }

TutorialStepRunner (per mount):
  mount → clock.start(), game.startGame()           (phase: playing)
  outcome = phase === "complete" ? evaluateTutorialStep(step, judgments) : null
  headline = getTutorialHeadline(step, { elapsedMs, outcome })
```

| Step | Chart (lane, ms) | Assisted | Waiting copy → frozen copy | Success copy |
| --- | --- | --- | --- | --- |
| 1 `freeze-first` | Center @ 2400; duration 4000 | yes | "Tap the tile" (falling and frozen) + "Center lane · S / K / Down" | "Perfect — hit tiles when they reach the line." |
| 2 `freeze-again` | Left @ 2400; duration 4000 | yes | "Again — tap the tile on the line." (falling and frozen) + "Left lane · A / J / Left" | "Perfect — hit tiles when they reach the line." |
| 3 `unassisted` | Center @ 2400, Right @ 3900, Left @ 5400; duration 6600 | no | "Try it without the pause." | "Nice timing." |
| (step 3 retry) | — | — | "Almost — hit at least 2 of the 3 tiles. Try again." | — |

- **Why 2400 ms:** every first note is later than the engine's 1800 ms travel time, so it enters from the top of the highway after the step starts rather than already mid-lane.
- **"Easy" timing:** the notes in step 3 are 1.5 s apart. **Fall speed is not changeable** without an engine change (`NOTE_TRAVEL_MS` is a module constant, and `scrollSpeed` is stored but unused), so that is out of scope.

### Input rules

- **Assisted steps:**
  - A tap before the freeze gives the hint "Wait until the tile reaches the line."
  - A wrong lane during the freeze gives the hint "Tap the tile on the line."
  - Neither reaches `hitLane`, so there is no Miss, no combo change, and no advance.
  - Only the target lane during the freeze calls `hitLane`, which necessarily returns a real Perfect with Δ = 0.
- **Unassisted step (the smallest consistent behaviour):**
  - Every tap goes through `hitLane`, so real judgments are shown (Perfect/Good/Miss and ±ms), including empty-input Misses.
  - Forgiveness is at the step level: when the chart completes, `passed` needs at least `requiredHits` note hits (**2 of 3**, owner decision; any non-Miss judgment — Perfect or Good — counts), otherwise the step shows "Try again", which remounts it.
  - No combo or score is shown or kept.

### Completion

- Enter `complete` → call `onComplete()`, which saves the marker and sets `isTutorialCompleted = true`.
- The panel shows "You're ready." with these buttons:
  - **Play Practice Chart** (only when `activeChartMode === "starter"` and no audio file is selected, so it is the same silent chart a first-time visitor saw);
  - **Replay tutorial**;
  - **Back to Rhythm Lab**.
- **Exit tutorial** in the header is available at every step. Exiting before completion saves nothing.

## 4. Clock freeze and resume behaviour (exact)

- `start()` sets `startedAt = performance.now()`. If the tab is already hidden, it also sets `hiddenAt = startedAt`.
- `getElapsedMs()` returns `0` before `start`. Otherwise it returns `clamp((hiddenAt ?? now) − startedAt, freezeAtMs)`, where `clamp(x, null) = x` and `clamp(x, T) = min(x, T)`.
- On `visibilitychange`:
  - hidden: record `hiddenAt` once;
  - visible: `startedAt += now − hiddenAt`, then clear `hiddenAt`.
  - This stops time while hidden, for both frozen and unfrozen steps.
- `freezeAtMs` is fixed for a runner's lifetime: it is `notes[0].timeMs` for assisted steps and `null` otherwise. So `getElapsedMs` has stable identity, and the engine's rAF effect is not torn down on each render.
- **Order of calls on mount:** call `start()` before `startGame()`. The first rAF tick then reads a started clock.
- **Resume after the frozen hit:** none. The hit completes the one-note chart on the next `TICK`, and the parent mounts the next step with a new clock.

## 5. Reusing real scoring without persisting it

- **Real judgments:** the tutorial runner calls the engine's `hitLane`. The reducer computes the judgment, `score`, `combo`, and `judgments[]`. The runner shows `lastJudgment` through `RhythmHighway`'s existing `visibleJudgment` readout (rating plus signed ms), mirroring `RhythmLab.tsx:444–463`.
- **Nothing persisted:** nothing reads the tutorial instance's state except the runner. No persistence hook receives it. The main key and pointer paths are gated while the tutorial is active. The "no writes" guarantee is **verified empirically** in Task 3 by snapshotting the localStorage history, the IndexedDB `runs` count, and the prefs record before and after.

## 6. Persistence strategy for tutorial completion

- **Key:** localStorage `rhythmLab.tutorial.v1`.
- **Value:** `{"schemaVersion":1,"completedAtMs":<epoch ms>}`.
- **Accessors:** `loadTutorialCompleted(): boolean` and `saveTutorialCompleted(): void` in `helpers.ts`. Both wrap storage access in try/catch like the run-history accessors. When storage is unavailable, the tutorial still runs and the Ready Check simply keeps the first-run label.
- **Effect:** the marker changes only the Ready Check tutorial button label and emphasis. It never hides the tutorial.

## 7. Files to modify (actual paths)

- `web/src/components/RhythmLab/RhythmLab.tsx`
- `web/src/components/RhythmLab/ReadyCheckPanel.tsx`
- `web/src/components/RhythmLab/helpers.ts`
- `web/src/components/RhythmLab/RhythmLab.css`

## 8. New files

- `web/src/components/RhythmLab/rhythmTutorial.ts`
- `web/src/components/RhythmLab/useTutorialClock.ts`
- `web/src/components/RhythmLab/RhythmLabTutorial.tsx`
- `web/scripts/check-rhythm-tutorial.ts` — committed deterministic check for the pure tutorial logic, run with `node --experimental-strip-types`; no `package.json` script (owner decision). Not covered by `npm run lint` (which targets `src`) or `npm run typecheck` (which includes `src`).

## 11. Backward compatibility and regression surface

| Surface | Why it is safe | Where it is checked |
| --- | --- | --- |
| Saved songs, blobs, charts, and preferences in IndexedDB | Not read or written by tutorial code; no schema change. | Task 3 row P3 (prefs unchanged). |
| Import/export | Untouched code paths; only reachable from the Setup tab, which is hidden while the tutorial is active. | Task 4 row C1. |
| History, Analytics, and personal bests | Tutorial instance not connected to `useChartRuns` or `useRunHistory`. | Task 3 rows P1–P2. |
| Starter chart | Engine, data, and Ready Check Start unchanged; Ready Check only gains a button. | Task 3 row S1, Task 4 row S2. |
| Creator workflow and a loaded song | `<audio>` stays mounted; no song, chart, or prefs mutations; exiting returns to the same main state. | Task 3 row R3. |
| Enter/Space on the Ready Check | Unchanged when the tutorial is inactive. The new button is a `<button>`, and the existing handler already ignores Enter/Space when focus is on a button (`RhythmLab.tsx:482–488`). | Task 3 row K3. |
| Existing localStorage keys | New key only; no existing key read differently. | — |

No migration is required.

---

## 12. Implementation tasks

### Task 1: Tutorial step data and pure progression rules

**Files:**
- Create: `web/src/components/RhythmLab/rhythmTutorial.ts`
- Test (committed, no package script): `web/scripts/check-rhythm-tutorial.ts`

**Interfaces:**
- Consumes: types `LaneIndex`, `NoteJudgment`, `RhythmChart` from `./types` (type-only).
- Produces:
  - `type TutorialStepId = "freeze-first" | "freeze-again" | "unassisted"`
  - `type TutorialHint = "early" | "wrong-lane"`
  - `type TutorialInputDecision = "judge" | TutorialHint`
  - `type TutorialStepOutcome = "passed" | "retry"`
  - `interface TutorialStep { id; chart: RhythmChart; assisted: boolean; targetLane: LaneIndex; requiredHits: number; copy: { approach: string; action: string; success: string; retry: string | null } }`
  - `const tutorialSteps: readonly TutorialStep[]`
  - `const tutorialHintCopy: Record<TutorialHint, string>`
  - `getFreezeAtMs(step): number | null`
  - `clampTutorialElapsedMs(realElapsedMs: number, freezeAtMs: number | null): number`
  - `isTutorialClockFrozen(elapsedMs: number, freezeAtMs: number | null): boolean`
  - `decideTutorialInput(step, lane: LaneIndex, elapsedMs: number): TutorialInputDecision`
  - `evaluateTutorialStep(step, judgments: NoteJudgment[]): TutorialStepOutcome`
  - `getTutorialHeadline(step, state: { elapsedMs: number; outcome: TutorialStepOutcome | null }): string`

- [ ] **Step 1: Write the failing check script.** Save it as `web/scripts/check-rhythm-tutorial.ts`:

```ts
// Deterministic checks for the Rhythm Lab tutorial logic.
// Run from web/: node --experimental-strip-types scripts/check-rhythm-tutorial.ts
import assert from "node:assert/strict";
import type { NoteJudgment } from "../src/components/RhythmLab/types.ts";
import {
  clampTutorialElapsedMs,
  decideTutorialInput,
  evaluateTutorialStep,
  getFreezeAtMs,
  getTutorialHeadline,
  isTutorialClockFrozen,
  tutorialSteps,
} from "../src/components/RhythmLab/rhythmTutorial.ts";

// Engine constants duplicated from useRhythmLab.ts:13-16 (module-private there).
const NOTE_TRAVEL_MS = 1800;
const PERFECT_WINDOW_MS = 45;
const MISS_WINDOW_MS = 140;

// Clock clamp.
assert.equal(clampTutorialElapsedMs(1000, 2400), 1000);
assert.equal(clampTutorialElapsedMs(9000, 2400), 2400);
assert.equal(clampTutorialElapsedMs(9000, null), 9000);
assert.equal(isTutorialClockFrozen(2399, 2400), false);
assert.equal(isTutorialClockFrozen(2400, 2400), true);
assert.equal(isTutorialClockFrozen(9000, null), false);

// Data invariants the engine contract depends on.
assert.deepEqual(tutorialSteps.map((s) => s.id), ["freeze-first", "freeze-again", "unassisted"]);
const allNoteIds = tutorialSteps.flatMap((s) => s.chart.notes.map((n) => n.id));
assert.equal(new Set(allNoteIds).size, allNoteIds.length, "note ids unique across steps");
assert.equal(new Set(tutorialSteps.map((s) => s.chart.id)).size, tutorialSteps.length, "chart ids unique");
for (const step of tutorialSteps) {
  const notes = step.chart.notes;
  assert.ok(notes.length > 0, `${step.id} has notes`);
  assert.ok(notes[0].timeMs >= NOTE_TRAVEL_MS, `${step.id} first note enters from the top`);
  assert.ok(step.chart.durationMs > notes[notes.length - 1].timeMs + MISS_WINDOW_MS, `${step.id} duration covers the last miss window`);
  assert.ok(step.requiredHits >= 1 && step.requiredHits <= notes.length, `${step.id} requiredHits in range`);
  if (step.assisted) {
    assert.equal(notes.length, 1, `${step.id} assisted steps have exactly one note`);
    assert.equal(notes[0].lane, step.targetLane, `${step.id} target lane matches its note`);
    const freezeAt = getFreezeAtMs(step);
    assert.equal(freezeAt, notes[0].timeMs);
    // Frozen tap delta is exactly zero, which the engine rates Perfect.
    assert.ok(Math.abs(clampTutorialElapsedMs(freezeAt! + 5000, freezeAt) - notes[0].timeMs) <= PERFECT_WINDOW_MS);
    // Frozen note never passes the auto-miss threshold.
    assert.ok(clampTutorialElapsedMs(freezeAt! + 60_000, freezeAt) - notes[0].timeMs <= MISS_WINDOW_MS);
    // Frozen step never completes by time.
    assert.ok(freezeAt! < step.chart.durationMs + MISS_WINDOW_MS);
  } else {
    assert.equal(getFreezeAtMs(step), null);
    assert.equal(typeof step.copy.retry, "string", `${step.id} unassisted step has retry copy`);
  }
}

// Input gating.
const [first, , unassisted] = tutorialSteps;
const otherLane = first.targetLane === 0 ? 1 : 0;
assert.equal(decideTutorialInput(first, first.targetLane, 1000), "early");
assert.equal(decideTutorialInput(first, otherLane, 1000), "early");
assert.equal(decideTutorialInput(first, otherLane, 2400), "wrong-lane");
assert.equal(decideTutorialInput(first, first.targetLane, 2400), "judge");
assert.equal(decideTutorialInput(unassisted, 0, 0), "judge");
assert.equal(decideTutorialInput(unassisted, 2, 9999), "judge");

// Outcome.
const hit: NoteJudgment = { kind: "note-hit", rating: "Perfect", lane: 1, noteId: "x", judgedAtMs: 2400, deltaMs: 0 };
const autoMiss: NoteJudgment = { kind: "note-miss", rating: "Miss", lane: 1, noteId: "x", judgedAtMs: 2600, deltaMs: null };
const emptyTap: NoteJudgment = { kind: "empty-input", rating: "Miss", lane: 0, judgedAtMs: 500 };
assert.equal(evaluateTutorialStep(first, [hit]), "passed");
assert.equal(evaluateTutorialStep(unassisted, []), "retry");
assert.equal(evaluateTutorialStep(unassisted, [emptyTap, autoMiss]), "retry");
const good: NoteJudgment = { kind: "note-hit", rating: "Good", lane: 2, noteId: "y", judgedAtMs: 3960, deltaMs: 60 };
assert.equal(unassisted.requiredHits, 2, "unassisted step requires 2 of 3 hits");
assert.equal(evaluateTutorialStep(unassisted, [emptyTap, hit, autoMiss]), "retry");
assert.equal(evaluateTutorialStep(unassisted, [hit, good, autoMiss]), "passed");
assert.equal(evaluateTutorialStep(unassisted, [good, emptyTap, good]), "passed");

// Headline selection.
assert.equal(getTutorialHeadline(first, { elapsedMs: 1000, outcome: null }), first.copy.approach);
assert.equal(getTutorialHeadline(first, { elapsedMs: 2400, outcome: null }), first.copy.action);
assert.equal(getTutorialHeadline(first, { elapsedMs: 2400, outcome: "passed" }), first.copy.success);
assert.equal(getTutorialHeadline(unassisted, { elapsedMs: 3000, outcome: null }), unassisted.copy.approach);
assert.equal(getTutorialHeadline(unassisted, { elapsedMs: 7000, outcome: "retry" }), unassisted.copy.retry);

console.log("rhythm tutorial checks passed");
```

- [ ] **Step 2: Run it and confirm it fails.**

Run: `cd web && node --experimental-strip-types scripts/check-rhythm-tutorial.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `rhythmTutorial.ts`.

- [ ] **Step 3: Implement `web/src/components/RhythmLab/rhythmTutorial.ts`.**

```ts
import type { LaneIndex, NoteJudgment, RhythmChart } from "./types";

// Tutorial step data and progression rules. Keep imports type-only so this
// module stays free of runtime dependencies.

export type TutorialStepId = "freeze-first" | "freeze-again" | "unassisted";

export type TutorialHint = "early" | "wrong-lane";

export type TutorialInputDecision = "judge" | TutorialHint;

export type TutorialStepOutcome = "passed" | "retry";

export interface TutorialStepCopy {
  approach: string;
  action: string;
  success: string;
  retry: string | null;
}

export interface TutorialStep {
  id: TutorialStepId;
  chart: RhythmChart;
  // Assisted steps freeze the clock at their single note and gate input.
  assisted: boolean;
  targetLane: LaneIndex;
  requiredHits: number;
  copy: TutorialStepCopy;
}

// Every first note is later than the engine's 1800ms note travel time, so
// each tile enters from the top of the highway after its step starts.
export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: "freeze-first",
    assisted: true,
    targetLane: 1,
    requiredHits: 1,
    chart: {
      id: "tutorial-freeze-first",
      title: "Tutorial",
      bpm: 120,
      durationMs: 4000,
      notes: [{ id: "tutorial-freeze-first-l1", lane: 1, timeMs: 2400 }],
    },
    copy: {
      approach: "Tap the tile",
      action: "Tap the tile",
      success: "Perfect — hit tiles when they reach the line.",
      retry: null,
    },
  },
  {
    id: "freeze-again",
    assisted: true,
    targetLane: 0,
    requiredHits: 1,
    chart: {
      id: "tutorial-freeze-again",
      title: "Tutorial",
      bpm: 120,
      durationMs: 4000,
      notes: [{ id: "tutorial-freeze-again-l0", lane: 0, timeMs: 2400 }],
    },
    copy: {
      approach: "Again — tap the tile on the line.",
      action: "Again — tap the tile on the line.",
      success: "Perfect — hit tiles when they reach the line.",
      retry: null,
    },
  },
  {
    id: "unassisted",
    assisted: false,
    targetLane: 1,
    requiredHits: 2,
    chart: {
      id: "tutorial-unassisted",
      title: "Tutorial",
      bpm: 120,
      durationMs: 6600,
      notes: [
        { id: "tutorial-unassisted-1-l1", lane: 1, timeMs: 2400 },
        { id: "tutorial-unassisted-2-l2", lane: 2, timeMs: 3900 },
        { id: "tutorial-unassisted-3-l0", lane: 0, timeMs: 5400 },
      ],
    },
    copy: {
      approach: "Try it without the pause.",
      action: "Try it without the pause.",
      success: "Nice timing.",
      retry: "Almost — hit at least 2 of the 3 tiles. Try again.",
    },
  },
];

export const tutorialHintCopy: Record<TutorialHint, string> = {
  early: "Wait until the tile reaches the line.",
  "wrong-lane": "Tap the tile on the line.",
};

export const getFreezeAtMs = (step: TutorialStep): number | null =>
  step.assisted ? step.chart.notes[0]?.timeMs ?? null : null;

export const clampTutorialElapsedMs = (
  realElapsedMs: number,
  freezeAtMs: number | null
): number =>
  freezeAtMs === null ? realElapsedMs : Math.min(realElapsedMs, freezeAtMs);

export const isTutorialClockFrozen = (
  elapsedMs: number,
  freezeAtMs: number | null
): boolean => freezeAtMs !== null && elapsedMs >= freezeAtMs;

export const decideTutorialInput = (
  step: TutorialStep,
  lane: LaneIndex,
  elapsedMs: number
): TutorialInputDecision => {
  if (!step.assisted) return "judge";
  if (!isTutorialClockFrozen(elapsedMs, getFreezeAtMs(step))) return "early";
  return lane === step.targetLane ? "judge" : "wrong-lane";
};

export const evaluateTutorialStep = (
  step: TutorialStep,
  judgments: NoteJudgment[]
): TutorialStepOutcome =>
  judgments.filter((judgment) => judgment.kind === "note-hit").length >=
  step.requiredHits
    ? "passed"
    : "retry";

export const getTutorialHeadline = (
  step: TutorialStep,
  {
    elapsedMs,
    outcome,
  }: { elapsedMs: number; outcome: TutorialStepOutcome | null }
): string => {
  if (outcome === "passed") return step.copy.success;
  if (outcome === "retry") return step.copy.retry ?? step.copy.action;
  if (isTutorialClockFrozen(elapsedMs, getFreezeAtMs(step))) {
    return step.copy.action;
  }
  return step.copy.approach;
};
```

- [ ] **Step 4: Run the check and the static gates.**

Run: `cd web && node --experimental-strip-types scripts/check-rhythm-tutorial.ts`
Expected: `rhythm tutorial checks passed`. Node may also print an `ExperimentalWarning` for type stripping.

Run: `cd web && npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Commit** (only after owner approval to begin implementation).

```bash
git add web/src/components/RhythmLab/rhythmTutorial.ts web/scripts/check-rhythm-tutorial.ts
git commit -m "feat(rhythm-lab): add tutorial step data and progression rules"
```

---

### Task 2: Tutorial clock and tutorial component (not yet reachable)

**Files:**
- Create: `web/src/components/RhythmLab/useTutorialClock.ts`
- Create: `web/src/components/RhythmLab/RhythmLabTutorial.tsx`
- Modify: `web/src/components/RhythmLab/RhythmLab.css` (append a tutorial block after the `.rhythm-lab-overlay-panel h2` rule, around line 1356)

**Interfaces:**
- Consumes: everything Task 1 produces; `useRhythmLab(chart, { getElapsedMs })` (`useRhythmLab.ts:300`); `useLaneFeedback()` (`useLaneFeedback.ts:12`); `RhythmHighway` props (`RhythmHighway.tsx:10–23`); `JUDGMENT_READOUT_MS`, `keyToLane`, `lanes` from `helpers.ts`.
- Produces:
  - `useTutorialClock(freezeAtMs: number | null): { getElapsedMs: () => number; start: () => void }`
  - `default RhythmLabTutorial(props: { canPlayStarter: boolean; onComplete: () => void; onPlayStarter: () => void; onExit: () => void })`

Runtime verification of this task happens in Task 3, because nothing mounts the component until then. This task's gate is static checks plus review of the clock against §4.

- [ ] **Step 1: Create `useTutorialClock.ts`.**

```ts
import { useCallback, useEffect, useRef } from "react";
import { clampTutorialElapsedMs } from "./rhythmTutorial";

// Wall-clock source for tutorial steps. Time stops while the tab is hidden and
// never advances past freezeAtMs, so a frozen note stays on the hit line.
export const useTutorialClock = (freezeAtMs: number | null) => {
  const startedAtRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);

  const start = useCallback(() => {
    const now = performance.now();
    startedAtRef.current = now;
    hiddenAtRef.current = document.hidden ? now : null;
  }, []);

  const getElapsedMs = useCallback(() => {
    if (startedAtRef.current === null) return 0;

    const now = hiddenAtRef.current ?? performance.now();
    return clampTutorialElapsedMs(now - startedAtRef.current, freezeAtMs);
  }, [freezeAtMs]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = performance.now();

      if (document.hidden) {
        if (hiddenAtRef.current === null) hiddenAtRef.current = now;
        return;
      }

      if (hiddenAtRef.current !== null && startedAtRef.current !== null) {
        startedAtRef.current += now - hiddenAtRef.current;
      }
      hiddenAtRef.current = null;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return { getElapsedMs, start };
};
```

- [ ] **Step 2: Create `RhythmLabTutorial.tsx`.**

```tsx
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { LaneIndex, NoteJudgment } from "./types";
import RhythmHighway from "./RhythmHighway";
import { JUDGMENT_READOUT_MS, keyToLane, lanes } from "./helpers";
import {
  decideTutorialInput,
  evaluateTutorialStep,
  getFreezeAtMs,
  getTutorialHeadline,
  type TutorialHint,
  tutorialHintCopy,
  type TutorialStep,
  tutorialSteps,
} from "./rhythmTutorial";
import { useLaneFeedback } from "./useLaneFeedback";
import { useRhythmLab } from "./useRhythmLab";
import { useTutorialClock } from "./useTutorialClock";

const TUTORIAL_HINT_MS = 1400;

type TutorialProgress =
  | { kind: "step"; index: number; attempt: number }
  | { kind: "complete" };

interface TutorialStepRunnerProps {
  step: TutorialStep;
  stepNumber: number;
  stepCount: number;
  onPassed: () => void;
  onRetry: () => void;
}

// Mounted fresh for every step attempt, so mount is the step start.
const TutorialStepRunner = ({
  step,
  stepNumber,
  stepCount,
  onPassed,
  onRetry,
}: TutorialStepRunnerProps) => {
  const { getElapsedMs, start: startClock } = useTutorialClock(
    getFreezeAtMs(step)
  );
  const {
    phase,
    elapsedMs,
    judgments,
    lastJudgment,
    visibleNotes,
    startGame,
    hitLane,
  } = useRhythmLab(step.chart, { getElapsedMs });
  const {
    inputFeedbackExpiries,
    hitFeedbackExpiries,
    showInputFeedback,
    showHitFeedback,
  } = useLaneFeedback();
  const [hint, setHint] = useState<TutorialHint | null>(null);
  const [visibleJudgment, setVisibleJudgment] =
    useState<NoteJudgment | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  const outcome =
    phase === "complete" ? evaluateTutorialStep(step, judgments) : null;

  useEffect(() => {
    startClock();
    startGame();
  }, [startClock, startGame]);

  useEffect(() => {
    setVisibleJudgment(lastJudgment);
    if (!lastJudgment) return;

    const timeoutId = window.setTimeout(
      () => setVisibleJudgment(null),
      JUDGMENT_READOUT_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, [lastJudgment]);

  useEffect(
    () => () => {
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (outcome) actionRef.current?.focus();
  }, [outcome]);

  const showHint = useCallback((nextHint: TutorialHint) => {
    if (hintTimeoutRef.current !== null) {
      window.clearTimeout(hintTimeoutRef.current);
    }
    setHint(nextHint);
    hintTimeoutRef.current = window.setTimeout(() => {
      setHint(null);
      hintTimeoutRef.current = null;
    }, TUTORIAL_HINT_MS);
  }, []);

  const handleLaneInput = useCallback(
    (lane: LaneIndex) => {
      showInputFeedback(lane);

      const decision = decideTutorialInput(step, lane, getElapsedMs());
      if (decision !== "judge") {
        showHint(decision);
        return;
      }

      const judgment = hitLane(lane);
      if (judgment?.kind === "note-hit") {
        showHitFeedback(judgment.lane);
      }
    },
    [getElapsedMs, hitLane, showHint, showHitFeedback, showInputFeedback, step]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (phase !== "playing") return;

      const lane = keyToLane[event.key.toLowerCase()];
      if (lane === undefined) return;

      event.preventDefault();
      handleLaneInput(lane);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleLaneInput, phase]);

  const handleLanePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    lane: LaneIndex
  ) => {
    event.preventDefault();
    if (phase === "playing") handleLaneInput(lane);
  };

  const targetLane = lanes[step.targetLane];
  const detail = hint
    ? tutorialHintCopy[hint]
    : outcome === null && step.assisted
      ? `${targetLane.label} lane · ${targetLane.keys}`
      : null;

  return (
    <RhythmHighway
      visibleNotes={visibleNotes}
      inputFeedbackExpiries={inputFeedbackExpiries}
      hitFeedbackExpiries={hitFeedbackExpiries}
      visibleJudgment={visibleJudgment}
      phase={phase}
      isRecording={false}
      recordingCount={0}
      onLanePointerDown={handleLanePointerDown}
    >
      <div className="rhythm-lab-tutorial-prompt">
        <p className="rhythm-lab-tutorial-step">
          Tutorial {stepNumber} / {stepCount}
        </p>
        <div role="status" aria-live="polite">
          <p className="rhythm-lab-tutorial-headline">
            {getTutorialHeadline(step, { elapsedMs, outcome })}
          </p>
          {detail && <p className="rhythm-lab-tutorial-detail">{detail}</p>}
        </div>
        {outcome && (
          <button
            ref={actionRef}
            className="rhythm-lab-secondary-action rhythm-lab-tutorial-action"
            type="button"
            onClick={outcome === "passed" ? onPassed : onRetry}
          >
            {outcome === "passed" ? "Continue" : "Try again"}
          </button>
        )}
      </div>
    </RhythmHighway>
  );
};

interface RhythmLabTutorialProps {
  canPlayStarter: boolean;
  onComplete: () => void;
  onPlayStarter: () => void;
  onExit: () => void;
}

const RhythmLabTutorial = ({
  canPlayStarter,
  onComplete,
  onPlayStarter,
  onExit,
}: RhythmLabTutorialProps) => {
  const [progress, setProgress] = useState<TutorialProgress>({
    kind: "step",
    index: 0,
    attempt: 0,
  });
  const completeActionRef = useRef<HTMLButtonElement>(null);

  const advance = useCallback(() => {
    setProgress((current) => {
      if (current.kind !== "step") return current;

      const nextIndex = current.index + 1;
      return nextIndex < tutorialSteps.length
        ? { kind: "step", index: nextIndex, attempt: 0 }
        : { kind: "complete" };
    });
  }, []);

  const retry = useCallback(() => {
    setProgress((current) =>
      current.kind === "step"
        ? { ...current, attempt: current.attempt + 1 }
        : current
    );
  }, []);

  const replay = useCallback(() => {
    setProgress({ kind: "step", index: 0, attempt: 0 });
  }, []);

  useEffect(() => {
    if (progress.kind !== "complete") return;

    onComplete();
    completeActionRef.current?.focus();
  }, [onComplete, progress.kind]);

  if (progress.kind === "step") {
    const step = tutorialSteps[progress.index];

    return (
      <TutorialStepRunner
        key={`${step.id}-${progress.attempt}`}
        step={step}
        stepNumber={progress.index + 1}
        stepCount={tutorialSteps.length}
        onPassed={advance}
        onRetry={retry}
      />
    );
  }

  return (
    <RhythmHighway
      visibleNotes={[]}
      inputFeedbackExpiries={{}}
      hitFeedbackExpiries={{}}
      visibleJudgment={null}
      phase="complete"
      isRecording={false}
      recordingCount={0}
      onLanePointerDown={(event) => event.preventDefault()}
    >
      <div className="rhythm-lab-overlay">
        <div className="rhythm-lab-overlay-panel">
          <p>Tutorial complete</p>
          <h2>You&rsquo;re ready.</h2>
          <div className="rhythm-lab-summary-actions">
            {canPlayStarter && (
              <button
                ref={completeActionRef}
                className="rhythm-lab-primary-action"
                type="button"
                onClick={onPlayStarter}
              >
                Play Practice Chart
              </button>
            )}
            <button
              ref={canPlayStarter ? undefined : completeActionRef}
              className="rhythm-lab-secondary-action"
              type="button"
              onClick={replay}
            >
              Replay tutorial
            </button>
            <button
              className="rhythm-lab-secondary-action"
              type="button"
              onClick={onExit}
            >
              Back to Rhythm Lab
            </button>
          </div>
          <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
        </div>
      </div>
    </RhythmHighway>
  );
};

export default RhythmLabTutorial;
```

- [ ] **Step 3: Append the tutorial CSS to `RhythmLab.css`** after the `.rhythm-lab-overlay-panel h2` block (around line 1356).

```css
/* ── Tutorial prompt ── */

.rhythm-lab-tutorial-prompt {
  position: absolute;
  top: 2.4rem;
  left: 0.75rem;
  right: 0.75rem;
  /* Below notes (4) so falling tiles stay visible; tap zones (6) start at the hit line. */
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  pointer-events: none;
}

.rhythm-lab-tutorial-step {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rhythm-lab-tutorial-headline {
  margin: 0;
  color: var(--terminal-primary, #4caf50);
  font-size: clamp(1.1rem, 3.6vw, 1.6rem);
  font-weight: 700;
  line-height: 1.25;
  text-shadow: 0 0 12px rgba(0, 0, 0, 0.9);
  overflow-wrap: anywhere;
}

.rhythm-lab-tutorial-detail {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.85rem;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.9);
  overflow-wrap: anywhere;
}

.rhythm-lab-tutorial-action {
  margin-top: 0.35rem;
  pointer-events: auto;
}
```

The prompt has no animation, so no reduced-motion rule is needed. The existing reduced-motion block already disables the judgment-readout animation (`RhythmLab.css:1905–1923`).

- [ ] **Step 4: Run the static gates.**

Run: `cd web && npm run typecheck && npm run lint && npm run build`
Expected: all exit 0. The build succeeding proves the new modules compile under Vite. The component is unused until Task 3, so there is nothing to see in the browser yet.

- [ ] **Step 5: Check the clock by review.** Confirm in the diff that:
  - (a) `start` is called before `startGame` in the runner's mount effect;
  - (b) `getElapsedMs` depends only on `freezeAtMs`, which is constant per mount;
  - (c) the hidden time is added back to `startedAtRef`.

- [ ] **Step 6: Commit.**

```bash
git add web/src/components/RhythmLab/useTutorialClock.ts web/src/components/RhythmLab/RhythmLabTutorial.tsx web/src/components/RhythmLab/RhythmLab.css
git commit -m "feat(rhythm-lab): add freezable tutorial clock and tutorial runner"
```

---

### Task 3: Wire the tutorial into Rhythm Lab (entry, exit, handoff, isolation)

**Files:**
- Modify: `web/src/components/RhythmLab/RhythmLab.tsx`
- Modify: `web/src/components/RhythmLab/ReadyCheckPanel.tsx`

**Interfaces:**
- Consumes: `RhythmLabTutorial` default export (Task 2).
- Produces: `ReadyCheckPanel` optional props `tutorialActionLabel?: string` and `onStartTutorial?: () => void`. Task 4 changes only the label value.

- [ ] **Step 1: `ReadyCheckPanel.tsx` — add the optional tutorial action.**

```tsx
interface ReadyCheckPanelProps {
  chartTitle: string;
  chartModeLabel: string;
  onStart: () => void;
  tutorialActionLabel?: string;
  onStartTutorial?: () => void;
}

const ReadyCheckPanel = ({
  chartTitle,
  chartModeLabel,
  onStart,
  tutorialActionLabel,
  onStartTutorial,
}: ReadyCheckPanelProps) => (
  <div className="rhythm-lab-overlay">
    <div className="rhythm-lab-overlay-panel">
      <p>
        {chartTitle} - {chartModeLabel}
      </p>
      <h2>Ready Check</h2>
      <div className="rhythm-lab-summary-actions">
        <button
          className="rhythm-lab-primary-action"
          type="button"
          onClick={onStart}
        >
          Start
        </button>
        {onStartTutorial && tutorialActionLabel && (
          <button
            className="rhythm-lab-secondary-action"
            type="button"
            onClick={onStartTutorial}
          >
            {tutorialActionLabel}
          </button>
        )}
      </div>
      <span>A/S/D | J/K/L | Arrow keys | tap zones</span>
    </div>
  </div>
);
```

**Note:** wrapping Start in `.rhythm-lab-summary-actions` moves the key hint from beside the Start button to its own line. At ≤768 px (`RhythmLab.css:1864–1875`) the buttons stack full-width. That is a small visual change to the Ready Check; see the approval decisions.

- [ ] **Step 2: `RhythmLab.tsx` — state, callbacks, and the key-handler gate.**

Add the import after the `ReadyCheckPanel` import:

```tsx
import RhythmLabTutorial from "./RhythmLabTutorial";
```

After `const [setupTab, setSetupTab] = useState<SetupTab>("setup");` (line 198), add:

```tsx
  const [isTutorialActive, setIsTutorialActive] = useState(false);
```

After `returnToSetup` (line 329), add:

```tsx
  const startTutorial = useCallback(() => {
    stopPreview();
    pausePlayback();
    setVisibleJudgment(null);
    setIsTutorialActive(true);
  }, [pausePlayback, stopPreview]);

  const exitTutorial = useCallback(() => {
    setIsTutorialActive(false);
    focusGame();
  }, [focusGame]);

  const completeTutorial = useCallback(() => {}, []);

  const playStarterAfterTutorial = useCallback(() => {
    setIsTutorialActive(false);
    void startGame();
  }, [startGame]);
```

`completeTutorial` is a stable no-op here; Task 4 fills it in. Keeping the callback in this task lets Task 3 verify the whole flow without persistence.

In the keydown effect (line 466), make the first statement of `handleKeyDown`:

```tsx
      if (isTutorialActive) return;
```

Then add `isTutorialActive` to that effect's dependency array.

- [ ] **Step 3: `RhythmLab.tsx` — render branches.** Keep `<audio ref={audioRef} preload="metadata" />` unconditionally mounted.

Root `className` (line 676): add the compact active-session layout while the tutorial runs, without changing `isActiveSession`:

```tsx
      className={`rhythm-lab ${isRecording ? "rhythm-lab-recording" : ""} ${
        isActiveSession || isTutorialActive ? "rhythm-lab-active-session" : ""
      } ${
        isHotStreak ? "rhythm-lab-hot-streak" : ""
      }`}
```

Header copy (line 686): put a tutorial branch in front of the existing ternary:

```tsx
          {isTutorialActive ? (
            <div
              className="rhythm-lab-active-bar"
              aria-label="Tutorial controls"
            >
              <Link className="rhythm-lab-back-link" to="/simulations">
                Simulations
              </Link>
              <div className="rhythm-lab-active-context">
                <span className="rhythm-lab-active-chip rhythm-lab-active-chart">
                  Tutorial
                </span>
              </div>
              <div className="rhythm-lab-active-actions">
                <button
                  className="rhythm-lab-compact-action"
                  type="button"
                  onClick={exitTutorial}
                >
                  Exit tutorial
                </button>
              </div>
            </div>
          ) : isActiveSession ? (
```

Leave the rest of the existing ternary unchanged.

HUD (line 838): hide it while the tutorial is active, because the main score would read 0 beside a real tutorial Perfect:

```tsx
        {!isTutorialActive && (
          <div className="rhythm-lab-hud" aria-live="polite">
            <span>Score {score}</span>
            <span>Combo {combo}</span>
            <span>Best {maxCombo}</span>
          </div>
        )}
```

Stage (line 846): branch its contents:

```tsx
      <main className="rhythm-lab-stage">
        {isTutorialActive ? (
          <RhythmLabTutorial
            canPlayStarter={activeChartMode === "starter" && !hasSelectedFile}
            onComplete={completeTutorial}
            onPlayStarter={playStarterAfterTutorial}
            onExit={exitTutorial}
          />
        ) : (
          <RhythmHighway
            {/* existing props and children unchanged */}
          >
            {phase === "ready" && !isRecording && (
              <ReadyCheckPanel
                chartTitle={chart.title}
                chartModeLabel={chartModeLabel}
                onStart={() => {
                  void startGame();
                }}
                tutorialActionLabel="Start tutorial"
                onStartTutorial={startTutorial}
              />
            )}
            {/* existing PauseMenu and RunSummaryPanel children unchanged */}
          </RhythmHighway>
        )}
      </main>
```

The comment placeholders above are for reading only. In the file, keep the existing `RhythmHighway` props and the `PauseMenu`/`RunSummaryPanel` children verbatim.

- [ ] **Step 4: Static gates, then the browser verification matrix.**

Run: `cd web && npm run typecheck && npm run lint && npm run build`
Expected: all exit 0.

Start the dev server (`npm run dev`) and use Playwright in a **fresh browser profile**.

Before starting the tutorial, run this snapshot and save the result (it is used by rows P1–P3):

```js
async () => {
  const history = localStorage.getItem("rhythmLab.runHistory.v1");
  const idb = await new Promise((resolve) => {
    const req = indexedDB.open("rhythm-lab-library");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(["runs", "preferences"], "readonly");
      const runs = tx.objectStore("runs").count();
      const prefs = tx.objectStore("preferences").getAll();
      tx.oncomplete = () => { resolve({ runs: runs.result, prefs: JSON.stringify(prefs.result) }); db.close(); };
    };
    req.onerror = () => resolve({ error: String(req.error) });
  });
  return { history, ...idb };
}
```

To press a lane key on time in step 3 (automation only), run this about 2.4 s after the step starts:

```js
() => new Promise((resolve) => setTimeout(() => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
  resolve(document.querySelector(".rhythm-lab-status")?.innerText);
}, 2400))
```

For a touch-equivalent tap, dispatch a pointer event with `pointerType: "touch"` at the tile's centre:

```js
() => {
  const note = document.querySelector(".rhythm-lab-note").getBoundingClientRect();
  const x = note.left + note.width / 2, y = note.top + note.height / 2;
  const target = document.elementFromPoint(x, y);
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", clientX: x, clientY: y }));
  return target.getAttribute("aria-label");
}
```

This is synthetic, not a real touch device. Do not report it as iOS/Android validation.

| Row | Viewport | Action | Expected |
| --- | --- | --- | --- |
| F1 | 1280×800 | Load `/simulations/rhythm-lab` | Ready Check shows Start and "Start tutorial"; no console errors |
| F2 | 1280×800 | Click "Start tutorial" | Header shows "Simulations · Tutorial · Exit tutorial"; HUD hidden; prompt "Tutorial 1 / 3", "Tap the tile"; Center tile falls |
| F3 | 1280×800 | Wait ≥ 3 s, do nothing | Tile rests on the hit line; prompt "Tap the tile" + "Center lane · S / K / Down"; no Miss readout; still frozen after 10 s |
| F4 | 1280×800 | Press `a` while frozen | Hint "Tap the tile on the line."; no Miss; tile still frozen |
| F5 | 1280×800 | Restart step via Exit then Start tutorial; press `s` at ~1 s (before freeze) | Hint "Wait until the tile reaches the line."; no Miss; tile keeps falling and freezes |
| F6 | 1280×800 | Press `s` while frozen | Readout "Perfect" with "0ms"; tile disappears; prompt "Perfect — hit tiles when they reach the line." + focused Continue |
| F7 | 1280×800 | Continue; step 2 with mouse click on the Left tap zone when frozen | Same as F3/F6 for the Left lane; success copy for step 2 |
| F8 | 1280×800 | Continue; step 3; press no keys | Three notes pass without stopping; three "Miss" readouts; "Almost — hit at least 2 of the 3 tiles. Try again." + "Try again" button |
| F9 | 1280×800 | Try again; hit the first two notes (timed-key snippet at 2400 ms with `s`, then 3900 ms with `d`) | Real Perfect/Good readouts; after the chart ends: "Nice timing." + Continue |
| F10 | 1280×800 | Continue | Completion panel: "You're ready.", Play Practice Chart (focused), Replay tutorial, Back to Rhythm Lab |
| S1 | 1280×800 | Play Practice Chart | Main HUD returns; the Starter Phrase plays on the silent clock exactly as before; End Song via Pause works |
| P1 | 1280×800 | Re-run snapshot after F10 (before S1) | `history` identical to the pre-tutorial value |
| P2 | 1280×800 | Same snapshot | IndexedDB `runs` count identical |
| P3 | 1280×800 | Same snapshot | `prefs` identical |
| P4 | 1280×800 | After S1 completes or ends, check History tab | Exactly one new entry (the Starter run), none for the tutorial |
| K1 | 1280×800 | During step 1 (falling), press Space and Enter | Main starter does **not** start; tutorial unaffected |
| K2 | 1280×800 | During step 1, press Escape | Nothing happens (no pause menu, no exit) |
| K3 | 1280×800 | On the Ready Check with focus on "Start tutorial", press Enter | Tutorial starts (the button activates); main game does not start |
| V1 | 1280×800 | In step 3, at ~1.5 s, open and select a second tab (Playwright `browser_tabs`) for ~3 s, then return | Notes resume from their prior position; no burst of auto-misses. If automation does not fire `visibilitychange` (check `document.visibilityState` from the first tab afterwards), record V1 as **not verified** and test it by hand in a normal browser |
| R1 | 1280×800 | Exit tutorial mid-step 2 | Returns to the main Ready Check; no marker saved (Task 4 checks the marker); no History change |
| R2 | 1280×800 | Replay tutorial from completion panel | Step 1 restarts cleanly with the prompt "Tutorial 1 / 3" |
| R3 | 1280×800 | Import any small local audio file first (Setup → Choose file), then run and exit the tutorial | Song still listed and selected; Preview plays; Play Practice Chart is hidden on completion (`canPlayStarter` false) |
| M1 | 375×740 | Steps 1–3 | Measure: `.rhythm-lab-tutorial-prompt` bottom < `.rhythm-lab-status` top and < `.rhythm-lab-target-window` top; no horizontal scroll (`scrollWidth ≤ innerWidth`) |
| M2 | 320×640 | Same as M1 | Same assertions; headline wraps rather than overflowing |
| M3 | 375×740 | At freeze, run the touch-equivalent snippet on the tile's centre | Returned label is the target lane (`"Center lane"`); Perfect registers |
| M4 | 375×740 | Completion panel | Buttons stack full-width; all visible without covering controls |
| A1 | 1280×800 | Keyboard only: Tab to Start tutorial, Enter, complete all steps with keys, Enter on Continue each time | Completes without a pointer; Continue/Try again receive visible focus |
| A2 | any | Emulate `prefers-reduced-motion: reduce` | Freeze and prompts behave the same; the judgment readout is static (existing rule) |

Measurement snippet for M1/M2:

```js
() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const prompt = r(".rhythm-lab-tutorial-prompt"), status = r(".rhythm-lab-status"), target = r(".rhythm-lab-target-window");
  return { promptBottom: prompt?.bottom, statusTop: status?.top, targetTop: target?.top, scrollWidth: document.documentElement.scrollWidth, innerWidth };
}
```

- [ ] **Step 5: Commit.**

```bash
git add web/src/components/RhythmLab/RhythmLab.tsx web/src/components/RhythmLab/ReadyCheckPanel.tsx
git commit -m "feat(rhythm-lab): launch the tutorial from the ready check"
```

---

### Task 4: Persist the tutorial-completed marker

**Files:**
- Modify: `web/src/components/RhythmLab/helpers.ts` (new section after `clearRunHistory`, line 366)
- Modify: `web/src/components/RhythmLab/RhythmLab.tsx`

**Interfaces:**
- Produces: `loadTutorialCompleted(): boolean` and `saveTutorialCompleted(): void` from `helpers.ts`.

- [ ] **Step 1: `helpers.ts` — add the accessors.**

```ts
// ---------------------------------------------------------------------------
// Tutorial progress — localStorage persistence
// ---------------------------------------------------------------------------

const TUTORIAL_PROGRESS_STORAGE_KEY = "rhythmLab.tutorial.v1";

export const loadTutorialCompleted = (): boolean => {
  try {
    const raw = localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    if (!raw) return false;

    const parsed: unknown = JSON.parse(raw);
    return (
      Boolean(parsed) &&
      typeof parsed === "object" &&
      (parsed as Record<string, unknown>).schemaVersion === 1 &&
      typeof (parsed as Record<string, unknown>).completedAtMs === "number"
    );
  } catch {
    return false;
  }
};

export const saveTutorialCompleted = (): void => {
  try {
    localStorage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, completedAtMs: Date.now() })
    );
  } catch {
    // Silently fail — the tutorial stays replayable without the marker.
  }
};
```

- [ ] **Step 2: `RhythmLab.tsx` — load, save, and label.**

Extend the existing `./helpers` import with `loadTutorialCompleted` and `saveTutorialCompleted`. Next to `isTutorialActive`, add:

```tsx
  const [isTutorialCompleted, setIsTutorialCompleted] = useState(
    loadTutorialCompleted
  );
```

Replace the Task 3 no-op:

```tsx
  const completeTutorial = useCallback(() => {
    saveTutorialCompleted();
    setIsTutorialCompleted(true);
  }, []);
```

In the `ReadyCheckPanel` usage, replace `tutorialActionLabel="Start tutorial"` with:

```tsx
                tutorialActionLabel={
                  isTutorialCompleted ? "Replay tutorial" : "New here? Start tutorial"
                }
```

- [ ] **Step 3: Static gates and browser checks.**

Run: `cd web && npm run typecheck && npm run lint && npm run build`
Expected: all exit 0.

| Row | Action | Expected |
| --- | --- | --- |
| T1 | Fresh profile, load page | Button reads "New here? Start tutorial"; `localStorage.getItem("rhythmLab.tutorial.v1")` is `null` |
| T2 | Exit the tutorial during step 2 | Key still `null`; label unchanged |
| T3 | Complete the tutorial | Key is `{"schemaVersion":1,"completedAtMs":<number>}` |
| T4 | Reload the page | Button reads "Replay tutorial"; clicking it runs step 1 |
| T5 | Complete again via Replay | `completedAtMs` updates; nothing else in localStorage changes (compare key list before and after) |
| T6 | Set the key to `"garbage"`, reload | Label falls back to "New here? Start tutorial"; no console error |
| P5 | Repeat P1–P3 from Task 3 around a full completion | History, `runs` count, and prefs unchanged |
| S2 | Start the Starter Phrase from the Ready Check (not the handoff) | Plays normally; Enter/Space still starts it from the Ready Check when focus is not on a button |
| C1 | With a song loaded: Record chart → Stop → Export → Import that file | Unchanged behaviour (spot check of the creator flow) |

- [ ] **Step 4: Commit.**

```bash
git add web/src/components/RhythmLab/helpers.ts web/src/components/RhythmLab/RhythmLab.tsx
git commit -m "feat(rhythm-lab): remember tutorial completion locally"
```

---

### Task 5: Final verification (no commit)

- [ ] Run `cd web && npm run typecheck && npm run lint && npm run build && npm test`. All must exit 0. `npm test` is the smoke test; it does not cover this route, and the report should say so.
- [ ] Re-run `cd web && node --experimental-strip-types scripts/check-rhythm-tutorial.ts`.
- [ ] Re-run rows F1–F10, P1–P4, M1–M4, and A1 on the final tree.
- [ ] `git status` shows no stray files. `.playwright-mcp/` is gitignored (`.gitignore:67`). Stop the dev server.
- [ ] The report states which rows passed, which were synthetic (touch), and that no real iOS/Android device was tested.

## 13. Commit boundaries

| # | Commit | Gate |
| --- | --- | --- |
| 1 | `feat(rhythm-lab): add tutorial step data and progression rules` | `scripts/check-rhythm-tutorial.ts`, typecheck, lint |
| 2 | `feat(rhythm-lab): add freezable tutorial clock and tutorial runner` | typecheck, lint, build, clock review |
| 3 | `feat(rhythm-lab): launch the tutorial from the ready check` | typecheck, lint, build, browser matrix F/S/P/K/V/R/M/A |
| 4 | `feat(rhythm-lab): remember tutorial completion locally` | typecheck, lint, build, rows T1–T6, P5, S2, C1 |

## 9–10. Test strategy summary, mobile and accessibility

- **Test runner: not justified for this slice.**
  - The only logic worth unit-testing is pure (clamp, gating, outcome, headline, data invariants), and the no-dependency Node type-stripping check covers it.
  - Everything else is timing and integration behaviour that a unit runner would not exercise without a DOM and fake-timer setup.
  - Adding Vitest would be a dependency and package-script change, so it stays a separate, owner-approved decision.
- **Mobile:** rows M1–M4. Measured prompt geometry, no horizontal scroll at 320 and 375 px, stacked completion buttons, and a touch-equivalent tap on the frozen tile.
- **Accessibility:**
  - Keyboard: the lane keys are named in the prompt; Continue and Try again receive focus.
  - The live region announces prompt and hint changes.
  - The instructions are text, so colour is not the only cue.
  - The existing reduced-motion rules apply.
  - Tap zones remain `tabIndex={-1}` as today, since keyboard play uses the window key map.
  - No broader accessibility work is included.

## Owner decisions (resolved 2026-09-28)

1. **Ready Check layout:** approved. Start and the tutorial button share `.rhythm-lab-summary-actions`: one row on desktop, stacked on narrow phones; the key hint moves to its own line.
2. **Emphasis:** approved. Start stays primary; the tutorial is secondary and never starts automatically. Labels: `New here? Start tutorial`, then `Replay tutorial` after completion.
3. **Step 3 pass rule:** 2 of 3 notes hit, where any non-Miss judgment (Perfect or Good) counts (`requiredHits: 2`).
4. **Copy:** owner-supplied strings are used verbatim: `Tap the tile`; `Wait until the tile reaches the line.`; `Tap the tile on the line.`; `Perfect — hit tiles when they reach the line.`; `Again — tap the tile on the line.`; `Try it without the pause.`; `Almost — hit at least 2 of the 3 tiles. Try again.`; `You're ready.`; handoff button `Play Practice Chart`.
5. **Handoff condition:** approved. Offered only when the built-in starter chart is active and no user audio is loaded.
6. **Check script:** committed as `web/scripts/check-rhythm-tutorial.ts`, with no `package.json` script.
7. **Execution:** native, with the per-task verification gates and a final read-only review before any push.
8. **Separate defects:** the no-input completed-run bug and the F19 discrepancy stay out of these four commits.

Owner gate: implement Task 1 only, then report before Task 2.

## Self-review notes

- **Spec coverage:**
  - step 1 → Tasks 1–3 (F2–F6);
  - step 2 → F7, with gated hints F4/F5;
  - step 3 → F8/F9;
  - completion marker → Task 4;
  - no results written → P1–P5;
  - starter handoff → S1;
  - replay → R2/T4.
- **Excluded items:** none of the non-goals from the scope message appear in any task.
- **Names:** consistent across tasks — `tutorialSteps`, `getFreezeAtMs`, `decideTutorialInput`, `evaluateTutorialStep`, `getTutorialHeadline`, `tutorialHintCopy`, `useTutorialClock`, `loadTutorialCompleted`, `saveTutorialCompleted`.
