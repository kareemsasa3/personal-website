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
