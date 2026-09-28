# Rhythm Lab onboarding reconciliation: tutorial, featured charts, creator mode

Date: 2026-09-28. Repository HEAD: `ab1808a`. Scope: `/simulations/rhythm-lab`.

Status: **discovery and design reconciliation only.** No production code, CSS, data, tests, dependencies, or routes were changed. The recommendations below are not approved product decisions.

## Evidence labels

- **[code]**: read directly in the repository at HEAD. File references are to `web/src/components/RhythmLab/` unless the path says otherwise.
- **[browser]**: observed in Chromium through Playwright against the local Vite dev server at HEAD. Used a fresh browser profile (no saved songs) at 1280×800 and 375×740. These are dev-server results, not the deployed site.
- **[inference]**: my reasoning from the evidence above. Not verified by running code.
- **[unverified]**: a claim about external behavior (browsers, devices, licenses) that I did not test or look up in this session.

What I did **not** exercise in the browser: loading a local audio file, recording, import/export, rename/delete, or a real phone. Everything about those flows comes from source.

---

## 1. Current-state architecture

### Subsystems

| Subsystem | Files | What it owns |
| --- | --- | --- |
| Gameplay engine | `useRhythmLab.ts` | Reducer with phases `ready/playing/paused/complete`, judgment windows (Perfect ≤45 ms, Good ≤90 ms, Miss ≤140 ms, lines 13–16), score/combo, rAF tick loop, visible-note projection (`NOTE_TRAVEL_MS = 1800`). **Accepts an injected clock**: `getElapsedMs` / `isClockComplete` (lines 45–48, 300–329). With no clock it uses `performance.now()`. [code] |
| Rendering | `RhythmHighway.tsx`, `helpers.ts` | Presentational only. It takes `visibleNotes` (a `progress` value per note) and feedback expiries. Hit line at `RHYTHM_LINE_PERCENT = 76`. [code] |
| Audio | `useLocalAudioFile.ts` | One `<audio>` element, object URLs, file import, song persistence, restore on mount, preview. It exposes `getElapsedMs = audio.currentTime * 1000` as the game clock (line 319). There is no latency or offset compensation. [code] |
| Recording | `useRecordingSession.ts` | Stamps taps at `audio.currentTime`, dedupes at 40 ms per lane, and produces a `RhythmChart`. [code] |
| Chart library + active-chart orchestration | `useRecordedCharts.ts` (~600 lines) | Loads charts for the active song, chooses between the starter and recorded charts, handles rename/delete/import/save, and syncs preferences. The refactor plan already names this as the complexity centre (`docs/rhythm-lab-refactor-plan.md` §8). [code] |
| Built-in chart | `rhythmCharts.ts` | `starterChart`: 43 notes, 120 BPM, 20 s, compiled from beat events. It needs no audio. [code] |
| Import/export | `chartExport.ts`, `chartImport.ts` | `RhythmLabChartExportV1` JSON (`kind: "rhythm-lab-chart"`, `schemaVersion: 1`) with a validator and normalizer. [code] |
| Best-run stats | `useChartRuns.ts` → IndexedDB `runs` | Saves one `RhythmLabRun` per completed run, keyed by `chartId`. The starter's runs use `songId: null` (line ~102), so its best is "global". [code] |
| Run history / analytics | `useRunHistory.ts`, `helpers.ts` (localStorage `rhythmLab.runHistory.v1`, capped at 100), `runAnalytics.ts`, `RunHistoryPanel.tsx`, `RunAnalyticsPanel.tsx` | A second, independent record of each run, holding song/chart snapshots. [code] |
| Persistence | `library/rhythmLabDb.ts`, `library/types.ts` | IndexedDB `rhythm-lab-library` v1 with stores `songs`, `audioBlobs`, `charts`, `runs`, and `preferences` (a single record). [code] |

### Coupling

- **Engine ↔ audio: loosely coupled.** The engine sees only a clock function, and `RhythmLab.tsx:115` passes the audio clock only when a file is selected. That seam is the most useful fact in this report. [code]
- **Engine ↔ persistence: not coupled.** The engine never touches storage. Persistence happens in `useChartRuns` and `useRunHistory`, which watch `phase === "complete"` from outside. [code]
- **Charts ↔ songs: tightly coupled.** A stored chart has `songId`, and the charts are loaded by the `chartsBySongId` index. Chart controls render only when a file is selected (`RhythmLab.tsx:767`), and import refuses to run without an active song (`RhythmLab.tsx:564`). [code]
- **Orchestration: tangled but working.** `RhythmLab.tsx` connects the hooks through ref bridges to break a circular dependency (lines 126–138). [code]

### Direct answers to Q1–Q5

1. **Major subsystems:** the eight rows in the table above.
2. **Coupling:** audio, engine, and scoring are cleanly separated by the clock seam. Chart storage and song storage are tightly bound through `songId`. Run persistence is duplicated across IndexedDB and localStorage.
3. **Can a chart exist without an audio blob?** In the engine, yes: `starterChart` does, and any `RhythmChart` plays on the silent clock. In storage, the type allows `songId: null` and `getChartsForSong(db, null)` handles it. However, no UI path creates or lists a songless stored chart. A chart recorded while storage is unavailable is kept for the session only. [code]
4. **Identity today:**
   - Song id = `"song-" + encodeURIComponent(name:size:lastModified:type)` (`useLocalAudioFile.ts:22–26`).
   - Stored chart id = `recorded-<songId>-<Date.now()>` / `imported-…` (`helpers.ts:130–134`).
   - Runs use the chart id.
   - Import matching (`chartImport.ts:164`) accepts an exported song whose id, filename-derived title, or filename matches, all case-insensitive. Otherwise it asks for confirmation and then imports anyway.
5. **What prevents pairing a curated chart with user audio:**
   - Song identity includes `lastModified`. Re-downloading or copying the same file gives a new song id, so charts saved against the old id are no longer found. [code, with the effect inferred]
   - `RhythmLabSong.durationMs` is always written as `null` and never updated. Exports therefore always carry `durationMs: null`, and duration cannot currently be used for matching. [code]
   - Charts have no offset field. Notes are compared directly with `audio.currentTime`. [code]
   - `ActiveChartMode` is only `"starter" | "recorded"`, and the active chart is resolved in one ternary (`useRecordedCharts.ts:~72`). [code]
   - Both preference builders (`helpers.ts:117` `createChartPreference` and `useLocalAudioFile.ts:31` `createPreferences`) rebuild the record from a fixed field list. **Any new preference field would be silently erased by the next save.** [code]

---

## 2. Current first-use UX

Fresh profile, desktop and 375 px [browser]:

1. The header shows "Interaction Systems Experiment · Rhythm Lab", the tabs **Setup / History / Analytics**, a "Local audio — Choose file" control, and "No audio selected. Stored locally in this browser. Not uploaded."
2. The stage shows a Ready Check overlay: "Starter Phrase - Starter chart - silent static clock", a **Start** button, and "A/S/D | J/K/L | Arrow keys | tap zones". The first notes are already rendered behind the overlay.
3. Start plays the 20 s starter chart **in complete silence**. I did not press any keys, and the run ended with **Miss 43, Score 0**.
4. History then listed the idle run as "**Unknown song** · Starter Phrase · 43 notes · 0 · 0.0% · **FULL**". Analytics counted it as 1 completed run.
5. Record/Import/chart selection do not exist until a file is chosen.

At 375×740 the setup header takes about 245 px and the highway about 470 px. There is no horizontal overflow (`scrollWidth` 360 against a 375 viewport, the difference being the scrollbar). [browser]

Two items from the 2026-09-27 visitor audit (F19) are explained by source:

- **Completion differs between summary and History.** `RunSummaryPanel.tsx:25` computes completion as notes judged ÷ total notes. `helpers.ts:376` computes it as elapsed ÷ chart duration. These are two different definitions. [code]
- **"Unknown song"** is the fallback when `songSnapshot` is null, which is always the case for starter runs. [code]

---

## 3. Where the blank-canvas problem comes from

The product framing needs one correction. **A new visitor is not handed a blank canvas.** They are handed a playable but silent, unexplained demo, labelled in implementation terms ("silent static clock"). **The blank canvas appears when they bring their own music.**

- **Experientially:**
  - The silent starter feels like a test fixture, not a game: no audio, no instruction, no feedback about what a good hit is.
  - Once a song is loaded, the only ways to get a chart are Record (which requires knowing the song) or Import (which requires already having a file).
  - With a song loaded and no charts, the default is to play the 120 BPM Starter Phrase over the unrelated user audio ("Starter chart - local audio clock", `RhythmLab.tsx:632`), which will not line up with the music. [code; the experience of the mismatch is inferred]
- **Technically:** the only content source other than self-authoring is `starterChart`. Every other chart must be tied to a `songId` that the user created. Nothing distributes charts except file import.

**An easier path than the product discussion assumes:** the engine already plays file-free charts on a silent clock. The existing import flow already does "apply someone else's chart to my local audio" with soft matching and a mismatch override. The tutorial and featured charts are mostly **new content plus orchestration**, not new engine machinery.

---

## 4. Tutorial architecture recommendation

### Q6. Can tutorial notes run through the existing engine?

Yes, unchanged. A tutorial step is an ordinary `RhythmChart` passed to `useRhythmLab`, rendered by `RhythmHighway`, and judged by the real reducer. [code]

### Q7. What is needed for scripted freezes?

**A freezable clock, not reducer changes.** Pass `useRhythmLab` a `getElapsedMs` that returns `min(realElapsed, freezeAtMs)` while a freeze is armed:

- **Freezing puts the note exactly on the hit line.** Visible notes are computed from `state.elapsedMs` (`useRhythmLab.ts:495–511`). At `elapsed = note.timeMs`, progress is exactly 1, which places the note on the 76 % line. [code]
- **A frozen note never auto-misses.** Auto-miss needs `elapsed − timeMs > 140` (`useRhythmLab.ts:163`), which cannot happen while the clock is clamped. [code]
- **A tap during the freeze is a real Perfect.** It gives `deltaMs = 0`, so the tutorial can show a genuine judgment rather than a faked one. [code]
- **Unfreezing must not jump.** Add the frozen duration to the clock's start offset, the same technique `resumeGame` already uses for pause (`useRhythmLab.ts:386–395`). [code for the technique; applying it here is inference]

**Input gating belongs in the tutorial layer.** During a freeze it should forward only the target lane to `hitLane`. Wrong-lane or early taps should show a hint instead of reaching the reducer. That keeps the "don't punish while teaching" rule without teaching the reducer about assistance. [inference]

### Q8. How should tutorial state be modelled?

As an **orchestration layer over small ordinary charts**. It should not be a new `GamePhase` or a reducer mode.

- **Data:** a tutorial script (for example `tutorialScript.ts`, next to `rhythmCharts.ts`). This is an ordered list of steps, each with:
  - a chart segment
  - optional `freezeAt` note ids
  - prompt copy for the step's state (waiting, success, retry)
  - an `assist` flag
  - an optional click-track tempo
- **Runtime:** a `RhythmLabTutorial` component with its own `useRhythmLab` instance, a tutorial clock hook, and `RhythmHighway` with a prompt overlay. It advances to the next step when that step's instance reaches `complete`.
- **Why a separate component:** a separate instance never touches `useChartRuns` or `useRunHistory`, so persistence isolation comes from the structure, not from flags (see Q10).
- **Reuse for step 5:** it can simply be the existing Starter Phrase (20 s, already written) with a synthesized click track and assistance removed. [code for the chart; the choice is a recommendation]
- **Keyboard listener conflict:** `RhythmLab.tsx:466–514` puts a global `keydown` listener on `window`. The tutorial must replace the main game render rather than sit beside it, or that listener must be gated. Otherwise one key press would reach both engines. [code]

### Q9. Can generated audio use built-in browser primitives?

Yes: `AudioContext` and `OscillatorNode`/`GainNode` for clicks and pulses, with no dependency. No existing Web Audio code is present in Rhythm Lab (the only `AudioContext` reference in `web/src` is a label in `data/processData.ts`). [code]

For beat steps, schedule clicks ahead of time on `audioContext.currentTime`. Use that same context time as the step's `getElapsedMs`, so the audio and the judgment share one clock. For freeze steps, use a `performance.now()` clock: there is nothing audible to keep in sync, and freezing an audio clock is awkward. [inference]

[unverified] Two browser behaviours need checking on real devices:

- The `AudioContext` must be created or resumed inside the Start gesture.
- iOS may mute Web Audio when the hardware silent switch is on, while `<audio>` elements may still play.

### Q10. How do tutorial runs stay out of normal statistics?

- **Tutorial:** do not mount the tutorial inside the hooks that persist runs, and write no runs. Persist only a completion marker, for example localStorage `rhythmLab.tutorial.v1 = { completedAt }`, which drives the first-run default in §7. That is one small key, and it matches the existing localStorage use for run history.
- **Existing contamination (separate small fix):** idle or zero-input starter runs are already recorded as completed "FULL" runs [browser]. That is independent of the tutorial, and the fix can land separately: do not save a run with zero input judgments, or label it.

### Timing windows in the tutorial

Teach one idea per step. The frozen note already teaches "on the line = Perfect". After step 3, the readout the game already shows (rating and a signed `+/−ms`, `RhythmHighway.tsx:112–126`) teaches early/late without extra UI.

I recommend **not** drawing the 45/90/140 ms windows as bands. They are small at 1800 ms travel time: the Perfect band is about 2.5 % of lane height either side of the line [inference from the constants]. A band that small would add clutter without being readable on a phone.

---

## 5. Featured-chart architecture recommendation

### Q11. Smallest clean representation

A static, read-only record that is a superset of the existing export's chart fields, so the existing normalizer and validator can be reused:

```ts
interface FeaturedChart {
  id: string;            // "featured:tropic-love:normal", stable forever
  revision: number;      // bump when notes change
  title: string;
  artist: string;
  chartAuthor: string;
  difficulty: "easy" | "normal" | "hard";
  durationMs: number;
  notes: ChartNote[];    // noteCount is derived, not stored
  offsetMs?: number;     // author's recommended default audio offset
  audio: {
    expectedDurationMs: number;
    durationToleranceMs: number;   // e.g. 1500
    sha256?: string[];             // known exact files, optional
    source?: { label: string; url: string };
    bundled?: { path: string; license: string }; // only when rights are confirmed
  };
}
```

- **Run ids:** runs should use `chartId = "<id>@<revision>"`. Changing a chart then starts fresh bests rather than comparing scores across different note sets. Existing `getRunsForChart` works unchanged. [code for the query; the id scheme is a recommendation]
- **Bundle cost:** at roughly 40 bytes per note, a 419-note chart is about 17 KB of JSON before gzip [inference]. Keep the featured charts in a module that the Rhythm Lab route imports lazily (the route is already lazy: `routes/index.tsx:32`), or behind a dynamic import inside it.
- **Location:** alongside `rhythmCharts.ts`, where the existing built-in chart lives. `web/src/data/` is the site convention for portfolio content. Either location is defensible, and the owner should choose.

### Q12–Q16. Matching a user's file

The real risk is **alignment, not identity.** The Perfect window is ±45 ms. Two encodings of the same master can differ in leading silence and encoder padding by tens of milliseconds [unverified magnitude]. That is enough to turn Perfects into Goods even when the file "is the right song". Recommended signals, from strongest to weakest:

| Signal | Use |
| --- | --- |
| SHA-256 of the file bytes (`crypto.subtle.digest`, native) | "Verified file". Exact match only; any re-encode fails it. It is useful as a positive signal and **too strict as a gate** (Q14). |
| Decoded duration (`audio.duration` after `loadedmetadata`) within tolerance | Main compatibility check. It catches radio edits, extended mixes, and wrong songs. It requires populating `song.durationMs`, which is currently always null. |
| Title/filename similarity | Advisory only. The existing import matcher already does this. |
| Offset nudge (user-adjustable, per featured chart + song) | Fixes residual misalignment. It is applied in the clock wrapper (`elapsed = currentTime·1000 − offset`) with no reducer change. |

Answers to Q13–Q16:

- **Q13, tolerance:**
  - filename: ignore
  - encoding: accept, and rely on offset
  - duration: accept within ±~1.5 s, warn beyond that
  - alternate releases: treat as a mismatch warning, not a block
- **Q15:** yes. Duration + metadata + an optional hash is the right level. Acoustic fingerprinting (Chromaprint-style) is out of proportion for three charts.
- **Q16, when audio does not match:** say so plainly (for example "This file is 3:12; the chart expects 3:41"). Let the user play anyway, and mark the result "unverified audio" in the summary and history. Do not block: the stakes are a local score.

### Q17. Static assets with no backend?

Yes. Charts are data compiled into the bundle, audio stays in the user's IndexedDB, and matching runs client-side. Nothing needs a server. [inference, consistent with the static nginx deployment in `docs/design/personal-website-modernization-discovery.md` §"Application and delivery"]

### How to bind a featured chart to a local song

**Option A:** copy the featured chart into the `charts` store as an imported chart when the user loads audio.

- Advantage: all existing UI works (selector, best stats, export).
- Problems: the user can rename or delete the chart, later revisions never propagate, and "featured" is no longer distinguishable. **Not recommended.**

**Option B (recommended):** keep featured charts read-only and resolved at runtime.

- Add `"featured"` to `ActiveChartMode` and a third branch to active-chart resolution.
- Persist only the user's binding, `featuredChartId → songId`, plus their offset.
- Bindings can go in the preferences record **only after** the two preference builders are fixed to carry unknown fields forward (§1, Q5).
- Alternatively, a new `bindings` store needs `RHYTHM_LAB_DB_VERSION` 2. This is low risk because `upgradeDatabase` is already idempotent: `createStore` and `createIndex` skip existing entries (`rhythmLabDb.ts:55–76`). [code]

---

## 6. Audio ownership and licensing boundary

- **Charts and metadata ship with the site. Third-party recordings do not.** The user supplies audio, it stays in IndexedDB, and the existing "Stored locally in this browser. Not uploaded." copy stays true. [code for the current behaviour]
- **A source link is a pointer, not a grant.** Link only to where the user can legitimately obtain the track. Store the link in `audio.source`, separate from any `license` field.
- **`audio.bundled` is empty until rights are confirmed per track.** I did not review NCS's or any other licence terms in this session. Whether a specific track may be bundled in an interactive web app is a question for that track's actual licence text, not for its "free to use" reputation. This report makes no legal judgement, including about distributing chart timing data for a commercial recording.
- **One-click "Play Now" with no third-party rights question:** a short original piece synthesized in Web Audio from the same click/tone primitives as the tutorial, charted by the owner. It is authored content, so no licensing question arises. It also demonstrates the audio system rather than hiding it. [recommendation]

---

## 7. Proposed first-use information hierarchy

Evolve the existing header tabs rather than adding a dashboard. They already use the site's terminal vocabulary (uppercase mono labels, bordered panels, `.rhythm-lab-panel-tabs`). [code, browser]

```
Rhythm Lab
[ PLAY ]  [ CREATE ]  [ HISTORY ]  [ ANALYTICS ]

PLAY   (default when no tutorial marker and no saved songs)
  New here?        > START TUTORIAL            ~1 min, no file needed
  Featured charts  Tropic Love · Normal · 419 notes · chart by Kareem
                   [ LOAD AUDIO TO PLAY ]   source ↗
                   <original synth piece>   [ PLAY NOW ]
  Quick run        Starter Phrase (silent / with click)

CREATE (today's Setup tab, unchanged in content)
  Local audio · Saved songs · Record · Import · Rename/Export/Delete

How this works ▸   (disclosure: clock seam, timing windows, local-first storage,
                    why audio is never bundled)
```

- **Q18, first run:** Play tab with the tutorial as the primary action. The tutorial ends with "You're ready", followed by Featured chart / Load your own song / Create a chart.
- **Q19, placement:** Learn and Play live under **Play**. Load song and chart creation live under **Create**. History and Analytics stay where they are.
- **Q20, what stays visible:**
  - HUD, Ready Check, and the highway stay as they are.
  - File picker, saved songs, Record, Import, and chart management move from the first view to **Create**. They do not become harder to reach: one tab.
- **Q21, no regression:**
  - Default tab rule: if `activeSongId` exists in preferences, or saved songs exist, open **Create**, so returning creators land exactly where they do today. Otherwise open **Play**.
  - No existing data is migrated or rewritten.
- **Engineering-curiosity path:** the "How this works" disclosure is where the portfolio story lives. Put it in the Play tab where a curious visitor will see it.
- **Tab rename:** "Setup" → "Create" is a copy change. It needs owner approval under the AGENTS.md copy rule.
- **Starter over user audio:** stop offering the 120 BPM starter as the default when a song is loaded with no charts. Show "No charts for this song yet — Record one or Import", with the starter still one click away.

---

## 8. Data model changes

| Change | Needed for | Storage impact |
| --- | --- | --- |
| Populate `RhythmLabSong.durationMs` on `loadedmetadata`; backfill when an existing song is selected | Featured matching; also fixes `durationMs: null` in exports | None (field exists) |
| Preference builders spread the previous record | Any new preference | None |
| `ActiveChartMode` gains `"featured"`; `RunHistoryChartSnapshot.source` gains `"featured"` | Featured play, history labels | None (localStorage entries are parsed leniently) |
| `FeaturedChart` type + static data | Featured | Bundle only |
| Binding `{ featuredChartId, songId, offsetMs, verified }` | Featured replay without re-picking | Preferences field, or new store with DB v2 |
| Optional `sha256` on `RhythmLabSong` | "Verified" badge | New optional field; compute lazily from the stored blob |
| Tutorial marker | First-run default | One localStorage key |
| **Not needed:** tutorial types in the engine, a new `GamePhase`, chart `bpm` usage | — | — |

Stored fields that nothing reads: `scrollSpeed`, `defaultScrollSpeed`, `difficulty`, and chart `bpm` are persisted but never consumed by the engine or UI, and `source: "edited"` is never written. [code; grep for all five] Do not build featured difficulty or speed on the assumption that these already work.

## 9. Persistence and migration implications

- **Nothing existing needs migrating.** Existing songs, charts, runs, and history keep their ids and meaning. [inference from the additive changes above]
- **If DB v2 is used:** the upgrade must stay additive. The `onblocked` path already rejects with a clear error when another tab holds v1 open (`rhythmLabDb.ts:251–287`). It then surfaces as "storage unavailable", so check the copy for that case.
- **Song-identity fragility (`lastModified`) remains for the creator flow.** Do not change the song id formula: that would orphan every existing chart. For featured charts, matching by duration or hash sidesteps it. A later, optional "relink song" feature could address it for creators.

## 10. Testing implications

- **Current state:** there is no unit-test runner in `web/` (no Vitest or Jest in `package.json`, no `*.test.*` files). `scripts/smoke-test.mjs` checks built HTML for `/simulations`, snake, and spider, but **not** `/simulations/rhythm-lab`. [code]
- **Pure logic worth testing:**
  - tutorial clock (freeze/unfreeze with no jump)
  - step advancement
  - featured-chart validation
  - match classification (verified / likely / mismatch)
  - offset application
  - preference-builder field preservation
- **Adding a test runner is a dependency change** and needs owner approval (AGENTS.md). Without one, keep this logic in pure modules so a runner can be added later. Add an import-time validation of the featured-chart data, for example by running it through `validateRhythmLabChartExport`-style checks that throw during `vite build`.
- **Browser verification per stage:**
  - Playwright on desktop plus 320–430 px widths
  - tutorial on touch and keyboard
  - Web Audio start inside the gesture
  - reduced-motion
- **Smoke test:** adding a `/simulations/rhythm-lab` route-shell assertion to `smoke-test.mjs` is cheap.

## 11. Mobile and accessibility implications

- **Prompt placement:** the tutorial prompt must sit in the upper part of the highway, never over the 76 % hit line or the tap zones. The 470 px stage at 375×740 leaves room. [browser measurement; placement is a recommendation]
- **Tap zones:** they are `pointerdown` buttons with `tabIndex={-1}` (`RhythmHighway.tsx:149–165`), so keyboard users rely on the window key map. The freeze step's prompt should name both "tap" and the lane's key ("TAP — or press S").
- **Screen readers:** prompts go in an `aria-live="polite"` region (the HUD already uses one).
- **Colour:** the freeze step must not depend on colour alone. Use text plus the existing target-window highlight.
- **Reduced motion:** the freeze teaches the same thing with or without animation. Keep click audio and the text judgment as the primary feedback.
- [unverified] Audio-output latency varies by device, and Bluetooth is the worst case. Neither the existing audio clock nor the proposed Web Audio clock compensates. A user-set global latency offset is a sensible later addition that shares the offset mechanism from §5.

## 12. Starter-chart generation feasibility (Q22–Q24)

- **Capabilities (Q22):** all native, no dependency:
  - `decodeAudioData`
  - `OfflineAudioContext` to downmix and resample to roughly 11 kHz mono
  - band-pass `BiquadFilterNode` energy envelopes, or a small hand-written FFT for spectral flux
  - autocorrelation of the onset envelope for tempo
  - a Web Worker to keep analysis off the main thread
- **Cost (Q23):**
  - Bundle: small, a few hundred lines. [inference]
  - Memory: a 4-minute stereo track decoded at 44.1 kHz is about 85 MB of Float32 (44 100 × 240 × 2 × 4 B). Downsampling first brings it to about 10 MB, which is acceptable but needs care on phones. [arithmetic]
  - **Quality:** lane assignment from onsets is arbitrary, and dense electronic music produces too many onsets. A raw generated chart would likely be playable but musically mediocre. [inference]
- **Recommendation (Q24): defer.** If audio analysis is built first, build it for **automatic offset alignment** of featured charts (cross-correlating a stored onset envelope against the user's file). That solves a real featured-chart problem with a better-defined output, and it produces the onset machinery a later "Generate starter chart" would reuse. No server-side processing is required for either.

## 13. Risks and unresolved decisions

1. **Rights:** which, if any, featured tracks have confirmed rights to bundle. The default is none.
2. **Real devices:** Web Audio start and silent-switch behaviour on iOS and Android. [unverified]
3. **Encoding offsets:** whether the ±45 ms Perfect window makes encoding differences painful enough to need auto-offset in the MVP, or whether a manual nudge is enough. Measure with two encodings of one track.
4. **Bindings storage:** preferences field (needs the builder fix) or DB v2 store.
5. **Featured data location:** co-located with `rhythmCharts.ts` or under `web/src/data/`.
6. **Test runner:** whether to add one (dependency approval).
7. **Tab copy:** approval to rename "Setup" to "Create" and to add the Play tab.
8. **F19 fixes:** whether to fix the completion-metric mismatch, "Unknown song", and idle-run saving before or alongside the tutorial. They are independent, small, and affect first impressions.
9. **Orchestration scope:** adding a third chart mode to `useRecordedCharts` grows an already large hook. Doing the §8 split from the refactor plan first is cleaner but larger. My lean is a narrow extraction of active-chart resolution only.

## 14. Staged implementation sequence

### Stage 0: prerequisites and refactors (each its own commit)

| Item | Likely files |
| --- | --- |
| Preference builders preserve unknown fields; dedupe the two builders | `helpers.ts`, `useLocalAudioFile.ts` |
| Populate and backfill `song.durationMs` | `useLocalAudioFile.ts`, `library/rhythmLabDb.ts` (song update helper) |
| Composable clock wrapper (offset, freeze) as a pure module | new module beside `useRhythmLab.ts`; `RhythmLab.tsx:115` consumer |
| *(Optional, separate)* F19: one completion definition, a song label for songless runs, skip or label zero-input runs | `RunSummaryPanel.tsx`, `helpers.ts`, `useRunHistory.ts`, `useChartRuns.ts`, `RunHistoryPanel.tsx`, `runAnalytics.ts` |

### Stage 1: Tutorial MVP

| Item | Likely files |
| --- | --- |
| Tutorial script: step charts, freeze points, copy | new `tutorialScript.ts` beside `rhythmCharts.ts` |
| Freezable clock plus input gating | new hook beside `useRhythmLab.ts`, consuming the Stage 0 clock module |
| Click/pulse synth | new small Web Audio hook; no dependency |
| Tutorial component (own `useRhythmLab`, reuses `RhythmHighway`, prompt overlay, finish screen with three next actions) | new component; `RhythmLab.css` |
| Entry point and completion marker; tutorial replaces the main stage while active | `RhythmLab.tsx`, `ReadyCheckPanel.tsx` (link) |

### Stage 2: Featured Charts MVP

| Item | Likely files |
| --- | --- |
| `FeaturedChart` type, data, and build-time validation | `types.ts` or `library/types.ts`; new data module; reuse `chartImport.ts` normalizer |
| `"featured"` chart mode and active-chart resolution | `helpers.ts` (`ActiveChartMode`), `useRecordedCharts.ts` (or the extracted resolver) |
| Match classification (duration, optional SHA-256, title) and mismatch UI | new pure module; dialog built on `RhythmLabDialogShell.tsx` |
| Binding and offset persistence | `library/types.ts`, `library/rhythmLabDb.ts`, preference builders |
| Play tab / featured list; Setup → Create | `RhythmLab.tsx`, new panel component, `RhythmLab.css` |
| Run and history source `"featured"`, "unverified audio" label | `helpers.ts`, `useChartRuns.ts`, `useRunHistory.ts`, `RunSummaryPanel.tsx`, `RunHistoryPanel.tsx`, `runAnalytics.ts` |
| One original synthesized "Play Now" chart | featured data plus the Stage 1 synth |
| Copy review: `simulationsData.ts` description, `routeMetadata.ts`, the rhythm-lab shell in `vite.config.ts` | only if the owner wants the new modes described |

### Stage 3: later enhancements

- Automatic offset alignment (onset cross-correlation, Worker).
- Global audio-latency calibration.
- "Relink song" for the creator flow when `lastModified` changes.
- Making `scrollSpeed` real.
- Starter-chart generation, reusing the alignment onset machinery.
- A chart editor (the `source: "edited"` slot already exists).

---

## Parts of the proposed model that the implementation makes unnecessary or undesirable

- **"A new visitor gets a blank canvas"** is only partly true. The silent starter already exists. The problem is that it is silent, unexplained, and labelled with engine jargon.
- **A separate tutorial engine or game mode** is unnecessary. The injected clock gives freezes, and the real reducer gives honest judgments.
- **Cryptographic hashing as the matching mechanism** would be undesirable as a gate. Use it as a bonus signal.
- **Copying featured charts into the user's chart store** is undesirable, because of the rename/delete/revision problems.
- **Showing Perfect/Good/Miss windows visually** is low value at the current geometry. The signed ms readout already teaches early/late.

## What already gives an easier path

- The clock seam in `useRhythmLab` (freeze and offset come without engine changes).
- `starterChart` as a ready-made, file-free tutorial finale.
- The beat-based chart compiler (`rhythmCharts.ts`) for writing tutorial segments quickly.
- The import flow's soft matching and mismatch confirmation, a working prototype of "curated chart + your audio".
- The export JSON as a ready starting point for the featured-chart format.
- Engine/persistence separation, which lets the tutorial be isolated by construction.
- `upgradeDatabase` idempotence for a safe additive DB bump.

---

## Recommended target architecture (concise)

- **Engine:** unchanged. Every mode supplies a `RhythmChart` plus a clock.
- **Clock layer:** audio clock, synth clock, or `performance.now()`, composed with an optional freeze and offset.
- **Content sources:**
  1. tutorial script (static)
  2. featured charts (static, read-only, revisioned)
  3. user charts (IndexedDB, unchanged)
- **Audio sources:** synthesized (tutorial, original piece) or user-local (IndexedDB, unchanged). Never bundled third-party audio without per-track confirmed rights.
- **Persistence:** existing stores unchanged, plus a small binding/offset record per featured chart, plus a tutorial-complete marker. The tutorial writes no runs.
- **UX:** Play / Create / History / Analytics. Play is the first-run default and Create is the returning-creator default. A "How this works" disclosure keeps the system visible.

## Smallest coherent first slice

**Tutorial steps 1–3 with a freezable `performance.now()` clock**:

1. A frozen note waits on the line for the correct tap.
2. A Perfect confirmation, then a second frozen note.
3. Two or three slow notes with no freeze.

The slice ends by handing off to the existing Starter Phrase Ready Check. It also includes:

- input gating (wrong-lane or early taps give hints, not misses)
- no run persistence
- one localStorage completion marker
- an entry point from the current Ready Check

It needs no audio synthesis, no schema change, no tab restructure, and no featured-chart work. It tests the core hypothesis (can a stranger learn the invariant in under a minute?) on phone and desktop before anything else is built.

Suggested files: new tutorial script, new tutorial-clock hook, new tutorial component, plus small edits to `RhythmLab.tsx`, `ReadyCheckPanel.tsx`, and `RhythmLab.css`.
