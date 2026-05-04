# Rhythm Lab Decomposition Plan

Pure refactor of `RhythmLab.tsx` into smaller hooks and components.
No behavior changes, no new features, no schema changes.

---

## 1. Current Architecture

### File inventory

| File | Lines | Role |
|------|-------|------|
| `RhythmLab.tsx` | ~1795 | Monolith component: state, DB calls, recording logic, chart management, input handling, all UI sections |
| `useRhythmLab.ts` | ~405 | Game engine hook: reducer-based scoring, timing loop, hit detection, visible note computation |
| `useLocalAudioFile.ts` | ~427 | Audio hook: file import, IndexedDB song persistence, playback control, audio clock |
| `library/rhythmLabDb.ts` | ~472 | IndexedDB operations: open, CRUD for songs, charts, runs, preferences |
| `library/types.ts` | ~77 | DB record types: `RhythmLabSong`, `RhythmLabChart`, `RhythmLabRun`, `RhythmLabPreferences` |
| `types.ts` | ~60 | Core game types: `ChartNote`, `RhythmChart`, `NoteJudgment`, `VisibleNote`, `LaneIndex` |
| `rhythmCharts.ts` | ~97 | Starter chart definition and beat-to-ms compiler |
| `RhythmLab.css` | ~1445 | All styles for the component |
| `index.ts` | 3 | Re-exports |

### What useRhythmLab already owns (leave alone)

- Game phase state machine (`ready` / `playing` / `complete`)
- Reducer-based score, combo, judgment tracking
- Animation frame loop with visibility-change handling
- Hit candidate matching (Perfect/Good/Miss windows)
- Visible note computation from elapsed time
- Internal clock and external clock support

### What useLocalAudioFile already owns (leave alone)

- `<audio>` element ref management
- File input and object URL lifecycle
- IndexedDB song import and persistence
- Song restore on mount
- Song selector state
- Playback control (play, pause, resume, elapsed, complete)
- Visibility-change pause

### What RhythmLab.tsx currently handles (too much)

1. **DB access** - opens its own `dbRef`, duplicating the pattern from `useLocalAudioFile`
2. **Recorded chart CRUD** - save, rename, delete, select, preference persistence
3. **Chart run persistence** - save completed runs, load best run, deduplication
4. **Recording mode** - start/stop, note capture with dedupe, sequence numbering
5. **Input dispatch** - keyboard listener, pointer handler, lane-to-action routing
6. **Visual feedback** - input flash, hit flash, judgment readout with timers
7. **Run summary computation** - `createRunSummary` and `RhythmRunSummary` type
8. **UI: setup header** - title, audio picker, song selector, chart mode toggle, chart selector, best stats, record button, rename/delete controls
9. **UI: active session header** - compact bar with filename, chart mode chip, recording status, resume/restart/stop buttons
10. **UI: HUD** - score, combo, best combo
11. **UI: highway** - lanes, notes, target windows, hit zones
12. **UI: overlays** - ready check panel, run summary panel
13. **Constants and helpers** - ~30 constants, ~15 pure helper functions

---

## 2. Target Decomposition

### New hooks

#### `useRecordedCharts` (new file)
Owns recorded chart lifecycle: load, save, select, rename, delete, preference sync.

#### `useChartRuns` (new file)
Owns run persistence: load runs for active chart, save completed run, compute best run.

#### `useRecordingSession` (new file)
Owns recording mode: start/stop, note capture, dedupe, sequence numbering.

#### `useLaneFeedback` (new file)
Owns input/hit flash state and timeout cleanup.

### New components

#### `RunSummaryPanel` (new file)
The `phase === "complete"` overlay. Receives summary data, best run, and action callbacks as props.

#### `ReadyCheckPanel` (new file)
The `phase === "ready"` overlay. Receives chart info and start callback.

#### `RhythmHighway` (new file)
The `<section className="rhythm-lab-highway">` and everything inside it: lanes, notes, target windows, hit zones, status readout. Receives visible notes, feedback state, judgment, phase, and input callback as props.

#### `SetupHeader` (new file)
The non-active-session header content: title, audio panel, song selector, chart controls, recording controls, best stats.

#### `ActiveSessionHeader` (new file)
The active-session header bar: compact filename, chart chip, status chip, resume/restart/stop buttons.

#### `ChartControls` (new file)
Chart mode toggle, chart selector dropdown, chart management (rename/delete). Currently inlined in the setup header.

#### `SongControls` (new file)
Audio file picker + song selector dropdown. Currently inlined in the setup header.

### Stays in RhythmLab.tsx

- Top-level state composition and hook wiring
- Keyboard event listener (needs access to phase, recording, lane input)
- Pointer-to-lane routing (thin adapter)
- `rhythmClock` memo wiring `useLocalAudioFile` to `useRhythmLab`
- Root `<div>` with className logic, `tabIndex`, `ref`
- `<audio>` element
- `<header>` shell that switches between `SetupHeader` and `ActiveSessionHeader`
- `<main>` shell containing `RhythmHighway`

---

## 3. Refactor Steps (safest to riskiest)

The guiding rule: one extraction per commit, no behavior changes, manual playtest after each stateful extraction. Pure presentational components come before stateful hooks because they have zero runtime risk.

### Step 1: Extract pure helpers and constants

**Risk: minimal** - no state changes, no new files consumed by others yet.

- **Files to add**: `RhythmLab/helpers.ts`
- **Files to change**: `RhythmLab.tsx`
- **What moves**: All pure functions and constants from the top of `RhythmLab.tsx`:
  - `lanes`, `keyToLane`, `laneIndexes`
  - `INPUT_FEEDBACK_MS`, `HIT_FEEDBACK_MS`, `JUDGMENT_READOUT_MS`, `RHYTHM_LINE_PERCENT`, `NOTE_OVERSHOOT_MULTIPLIER`, `RECORDING_DEDUPE_MS`, `RECORDED_CHART_BPM`, `RECORDED_CHART_TAIL_MS`, `DEFAULT_SCROLL_SPEED`, `CHART_NAME_MAX_LENGTH`
  - `createLaneFeedbackTimers`
  - `formatPercent`, `formatDelta`, `formatScore`, `formatChartTimestamp`, `formatChartOptionLabel`, `formatSongTimestamp`, `formatSongOptionLabel`
  - `createChartPreference`, `createStoredChartId`, `createRunId`, `formatRecordedChartName`, `normalizeChartName`, `toRuntimeChart`, `sortRecordedChartsNewestFirst`
  - `compareBestRuns`, `getBestRun`
  - `createRunSummary`, `createRunRecord`
  - `ActiveChartMode`, `RhythmRunSummary`, `LaneFeedbackExpiries`, `LaneFeedbackTimers` types
- **Props/state needed**: None (pure functions)
- **Acceptance checks**:
  - `npm run typecheck` passes
  - `npm run lint` passes
  - `npm run build` succeeds
  - Gameplay unchanged in browser
- **Risks**: Typo in import path; forgetting to export a symbol. Both caught by typecheck.

### Step 2: Extract `RunSummaryPanel`

**Risk: minimal** - pure presentational extraction; all data passed via props. No state, no effects.

- **Files to add**: `RhythmLab/RunSummaryPanel.tsx`
- **Files to change**: `RhythmLab.tsx`
- **What moves**: The `phase === "complete"` overlay block (lines ~1679-1766). Summary metrics, best run display, play again / back to setup buttons.
- **Props needed**: `runSummary`, `bestRun`, `runStorageError`, `onRestart`, `onReturnToSetup`
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Summary overlay shows all metrics, best stats, action buttons work
  - Mobile layout unchanged
- **Risks**: CSS class names must stay the same. No style file changes needed.

### Step 3: Extract `ReadyCheckPanel`

**Risk: minimal** - pure presentational extraction; even simpler than `RunSummaryPanel`.

- **Files to add**: `RhythmLab/ReadyCheckPanel.tsx`
- **Files to change**: `RhythmLab.tsx`
- **What moves**: The `phase === "ready"` overlay block (lines ~1658-1677). Chart title, mode label, start button, key hints.
- **Props needed**: `chartTitle`, `chartModeLabel`, `onStart`
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Ready overlay shows with correct chart info
  - Start button triggers game
- **Risks**: Negligible. Purely structural.

### Step 4: Extract `useLaneFeedback`

**Risk: low** - isolated timer state, no DB or game state coupling.

- **Files to add**: `RhythmLab/useLaneFeedback.ts`
- **Files to change**: `RhythmLab.tsx`
- **What moves**:
  - `inputFeedbackExpiries` / `hitFeedbackExpiries` state
  - `inputFeedbackTimeoutRefs` / `hitFeedbackTimeoutRefs` refs
  - `showInputFeedback` / `showHitFeedback` callbacks
  - Cleanup effect for feedback timers (the `laneIndexes.forEach` cleanup in the unmount effect)
- **Hook returns**: `{ inputFeedbackExpiries, hitFeedbackExpiries, showInputFeedback, showHitFeedback }`
- **Props/state needed**: None (self-contained)
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Input flash and hit flash still appear in browser
  - Timer cleanup on unmount (no console errors on navigate away)
- **Risks**: Feedback timing regression if timeout refs are mismanaged. Verify visually.

### Step 5: Extract `useRecordingSession`

**Risk: low-medium** - recording state is mostly refs and a boolean, but interacts with audio and chart creation.

- **Files to add**: `RhythmLab/useRecordingSession.ts`
- **Files to change**: `RhythmLab.tsx`
- **What moves**:
  - `isRecording` state
  - `recordingCount` state
  - `recordingNotesRef`, `recordingSequenceRef`, `lastRecordedByLaneRef` refs
  - `resetRecordingDraft` callback
  - Recording-specific logic from `handleLaneInput` (the `if (isRecording)` branch)
  - `startRecording` callback (partially - the recording-specific setup)
  - `stopRecording` callback (partially - the recording note finalization)
- **Hook params**: `{ audioRef, getElapsedMs }` from `useLocalAudioFile`
- **Hook returns**: `{ isRecording, recordingCount, recordLaneInput, startRecording, stopRecording, resetRecordingDraft, getRecordedNotes }`
- **Props/state needed**: Audio ref for `currentTime`, `getElapsedMs` for chart creation
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Record a chart: taps register, count increments, stop produces chart
  - Recording dedupe still works (rapid same-lane taps within 40ms)
  - Audio-ended auto-stop still works
- **Risks**: Recording note capture depends on `audioRef.current.currentTime` - must pass ref correctly. Chart creation (`createRecordedChart`) may need to stay in the component or be passed as a callback since it reads `audio.duration` and `getElapsedMs`.

### Step 6: Extract `useChartRuns`

**Risk: low-medium** - DB reads/writes, but well-isolated by chart ID.

- **Files to add**: `RhythmLab/useChartRuns.ts`
- **Files to change**: `RhythmLab.tsx`
- **What moves**:
  - `chartRuns` state
  - `runStorageError` state
  - `loadedRunContextKey` state
  - `runLoadRequestIdRef`, `completedRunSaveKeyRef` refs
  - `isBestRunLoaded` derived value
  - `bestRun` memo
  - Run-loading effect (the `useEffect` with `runLoadRequestIdRef`)
  - Run-saving effect (the `useEffect` with `completedRunSaveKeyRef`)
- **Hook params**: `{ getDb, activeChartId, currentRunContextKey, activeChartMode, activeSongId, phase, isRecording, runSummary, score, maxCombo, judgments, lastJudgment }`
- **Hook returns**: `{ bestRun, isBestRunLoaded, runStorageError, chartRuns, resetRuns }`
- **Props/state needed**: Game state for save trigger, DB handle, chart identity for scoping
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Complete a run: best stats appear in summary panel
  - Switch charts: best run reloads for correct chart
  - Best stats scoped to active chart (not leaking across charts)
- **Risks**: The run-save deduplication key is complex (`completionKey`). Ensure all dependency values are passed correctly. Race condition guards (`requestId` pattern) must be preserved.

### Step 7: Extract `useRecordedCharts`

**Risk: medium** - most complex state machine in the component; interacts with DB, preferences, chart selection, and recording.

- **Files to add**: `RhythmLab/useRecordedCharts.ts`
- **Files to change**: `RhythmLab.tsx`
- **What moves**:
  - `activeChartMode` state
  - `recordedChart` state
  - `recordedCharts` state
  - `chartStorageError` state
  - `chartNameDraft`, `isRenamingChart`, `pendingChartAction` state
  - `chartLoadRequestIdRef` ref
  - `selectedRecordedChart` memo
  - `activeChart` derived value
  - `saveActiveChartPreference` callback
  - `selectRecordedChart` callback
  - `selectActiveChartMode` callback
  - `resetChartRuntimeForSongChange` callback
  - `beginChartRename`, `cancelChartRename`, `saveChartRename` callbacks
  - `deleteSelectedChart` callback
  - Chart-loading effect (the `useEffect` with `chartLoadRequestIdRef`)
  - `resetChartManagement` callback
- **Hook params**: `{ getDb, activeSongId, activeSongRevision, resetGame, pausePlayback, focusGame }`
- **Hook returns**: `{ activeChart, activeChartMode, recordedChart, recordedCharts, chartStorageError, selectedRecordedChart, chartNameDraft, isRenamingChart, pendingChartAction, selectRecordedChart, selectActiveChartMode, resetChartRuntimeForSongChange, beginChartRename, cancelChartRename, saveChartRename, deleteSelectedChart, setRecordedChart, setRecordedCharts, setActiveChartMode, setChartNameDraft, setChartStorageError, resetChartManagement }`
- **Props/state needed**: DB handle, active song identity, game reset, playback pause
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Chart selector shows saved charts for active song
  - Switching songs reloads correct charts
  - Rename persists and updates selector label
  - Delete removes chart and selects next
  - Chart preference restored on reload
  - Recording produces a new chart in the selector
- **Risks**: This hook has the most callbacks and the most interaction with other hooks (`resetGame`, `pausePlayback`, `focusGame` must be stable references). The `stopRecording` flow creates a chart and saves it - the boundary between `useRecordingSession` and `useRecordedCharts` needs careful design. Consider having `stopRecording` return the notes, and `useRecordedCharts` handle the save.

### Step 8: Extract `RhythmHighway` component

**Risk: medium** - large JSX block with note rendering, target windows, hit zones, status readout. Performance-sensitive (renders every frame during gameplay).

- **Files to add**: `RhythmLab/RhythmHighway.tsx`
- **Files to change**: `RhythmLab.tsx`
- **What moves**: The entire `<section className="rhythm-lab-highway">` block including:
  - Lane track with note rendering
  - Target windows with feedback state
  - Status readout (judgment / recording / ready)
  - Ready check overlay (or slot for it)
  - Summary overlay (or slot for it)
  - Hit zones
- **Props needed**: `visibleNotes`, `inputFeedbackExpiries`, `hitFeedbackExpiries`, `visibleJudgment`, `visibleJudgmentClass`, `visibleJudgmentKey`, `visibleDeltaMs`, `phase`, `isRecording`, `recordingCount`, `isHotStreak`, `onLanePointerDown`, `children` or explicit overlay slots
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - Notes scroll smoothly during gameplay
  - Input and hit feedback flash on correct lanes
  - Judgment readout displays and fades
  - Mobile tap zones work
  - `prefers-reduced-motion` still respected
- **Risks**: Re-render performance. `RhythmHighway` receives `visibleNotes` which changes every frame. Ensure the component doesn't cause unnecessary child re-renders. May need `React.memo` on lane sub-components.

### Step 9: Extract `SetupHeader`, `ActiveSessionHeader`, `SongControls`, `ChartControls`

**Risk: low-medium** - UI-only extraction, but many props to thread.

- **Files to add**: `RhythmLab/SetupHeader.tsx`, `RhythmLab/ActiveSessionHeader.tsx`, `RhythmLab/SongControls.tsx`, `RhythmLab/ChartControls.tsx`
- **Files to change**: `RhythmLab.tsx`
- **What moves**:
  - `SongControls`: Audio file picker, song selector dropdown
  - `ChartControls`: Chart mode toggle, chart selector, best stats, record button, rename/delete management
  - `SetupHeader`: Title row, eyebrow, wraps `SongControls` + `ChartControls` + audio details/errors
  - `ActiveSessionHeader`: Active bar with filename, chart chip, status, resume/restart/stop
- **Props needed**:
  - `SongControls`: `fileName`, `importedSongs`, `activeSongId`, `audioError`, `isRecording`, `onFileChange`, `onSongSelect`
  - `ChartControls`: `hasSelectedFile`, `activeSongId`, `activeChartMode`, `recordedCharts`, `recordedChart`, `selectedRecordedChart`, `chartBestLabel`, `isRecording`, `chartStorageError`, `chartNameDraft`, `isRenamingChart`, `pendingChartAction`, `onSelectChartMode`, `onSelectRecordedChart`, `onStartRecording`, `onBeginRename`, `onCancelRename`, `onSaveRename`, `onDelete`, `onChartNameChange`
  - `SetupHeader`: Composes `SongControls` + `ChartControls` props, plus `runStorageError`, `phase`
  - `ActiveSessionHeader`: `fileName`, `activeChartModeLabel`, `isRecording`, `recordingCount`, `isPausedAfterVisibilityChange`, `phase`, `onResume`, `onRestart`, `onStopRecording`
- **Acceptance checks**:
  - Typecheck, lint, build pass
  - All setup controls render and function
  - Active session bar renders correctly
  - Mobile layout for all header states
  - Chart rename/delete flows work end-to-end
- **Risks**: Prop count for `ChartControls` is high. This is acceptable for a first pass - further consolidation (e.g., passing a chart management object) can come later if needed, but is out of scope for this refactor.

---

## 4. What Must Not Change

- **Timing/scoring**: Perfect (45ms), Good (90ms), Miss (140ms) windows. Score formula. Combo rules. All in `useRhythmLab.ts` - not touched.
- **Audio clock behavior**: `useLocalAudioFile` drives `getElapsedMs` and `isPlaybackComplete`. External clock wiring stays the same.
- **IndexedDB schema**: DB version 1, store names, index names, key paths. No migration. `library/rhythmLabDb.ts` and `library/types.ts` are not modified.
- **Chart data**: `ChartNote`, `RhythmChart`, `RhythmLabChart` shapes. Starter chart definition. Recorded chart creation logic (duration calc, BPM, tail).
- **Gameplay input behavior**: Key mappings (`a/j/left` -> lane 0, etc.), pointer handling, recording dedupe (40ms), focus management.
- **Route behavior**: `/games` back link, no new routes, no changes to `index.ts` exports.
- **CSS class names**: All existing class names preserved. No style file changes in this refactor.

---

## 5. Commit Boundaries

Each step from section 3 should be one commit. Suggested commit messages:

1. `refactor: extract Rhythm Lab helpers and constants`
2. `refactor: extract RunSummaryPanel component`
3. `refactor: extract ReadyCheckPanel component`
4. `refactor: extract useLaneFeedback hook`
5. `refactor: extract useRecordingSession hook`
6. `refactor: extract useChartRuns hook`
7. `refactor: extract useRecordedCharts hook`
8. `refactor: extract RhythmHighway component`
9. `refactor: extract SetupHeader, ActiveSessionHeader, SongControls, ChartControls`

Each commit must independently pass typecheck, lint, build, and test. Each commit should leave the app fully functional.

---

## 6. Rollback Strategy

- Each commit is independently revertable with `git revert <sha>`.
- If a mid-sequence commit causes issues, revert commits in reverse order back to last known good state.
- No database migrations means no rollback complexity on the persistence side.
- No file renames of existing files means git history stays clean.
- If the entire refactor needs to be abandoned, `git revert --no-commit HEAD~N..HEAD && git commit` collapses back to the pre-refactor state.

---

## 7. Testing Checklist

Run after every commit:

### Automated
- [ ] `npm run typecheck` - no type errors
- [ ] `npm run lint` - no lint errors, no warnings
- [ ] `npm run build` - production build succeeds
- [ ] `npm test` - smoke test passes

### Manual browser checks
- [ ] **Silent starter chart**: Load page without audio. Start game. Notes scroll, input feedback works, scoring works, summary appears on complete.
- [ ] **Audio import**: Choose a local audio file. File name appears. Audio plays on Start.
- [ ] **Song selector**: Import multiple songs. Switch between them. Correct song plays.
- [ ] **Chart recording**: Start recording. Tap lanes. Stop recording. Chart appears in selector with correct note count.
- [ ] **Chart selector**: Switch between starter and recorded charts. Correct chart loads. Game resets on switch.
- [ ] **Chart rename**: Rename a recorded chart. Name persists after page reload.
- [ ] **Chart delete**: Delete a recorded chart. Confirm dialog appears. Chart removed from selector. Next chart selected.
- [ ] **Run summary**: Complete a run. Summary shows score, accuracy, combo, timing stats. Best stats section shows previous best.
- [ ] **Best stats**: Best stats update after setting a new high score. Stats are scoped to the active chart.
- [ ] **Combo glow**: Reach 10+ combo. Highway border glow and target window glow appear.
- [ ] **Mobile layout**: Test on a narrow viewport (375px). All controls stack properly. Tap zones fill the lower highway. Active session header is compact.
- [ ] **Visibility change**: Tab away and back during gameplay. Audio pauses. Resume button appears. Resume works.
- [ ] **Keyboard input**: A/S/D, J/K/L, arrow keys all map to correct lanes.
- [ ] **Pointer input**: Tap zones register hits on touch and mouse.
- [ ] **Reduced motion**: Enable `prefers-reduced-motion`. Animations are suppressed.
- [ ] **Page reload**: Active song and chart selection restored from IndexedDB.

---

## 8. Future Refinement: useRecordedCharts Decomposition

`useRecordedCharts` (Step 7) is the new complexity center at ~520 lines with 10 params, 24 return values, and a ref-backed callback bridge to break a circular dependency with `useRhythmLab`/`useChartRuns`. This is an acceptable intermediate state, but it mixes two concerns:

1. **Chart persistence** — load, save, rename, delete, preference sync
2. **App flow orchestration** — activeChartMode, fallback to Starter, resetGame/resetRuns/cancelRecording coordination

A future refinement could split it into two layers:

### `useRecordedChartLibrary` (persistence)
- Load charts for song
- Save recorded chart
- Rename chart
- Delete chart
- Persist activeChartId preference
- Storage error state

### `useActiveChartController` (orchestration)
- `activeChartMode` state
- Selected chart / fallback to Starter
- Mode switching with game/recording/run reset coordination
- Chart name draft / rename UI state

This separation would eliminate the circular dependency: `useRecordedChartLibrary` would have no game/run dependencies, and `useActiveChartController` would sit above both the library and the game hooks.

Not in scope for this refactor. Capture here for future consideration.

---

## 9. Anti-Goals

- **No redesign**: UI layout, colors, and class names stay exactly as-is.
- **No new features**: No new gameplay mechanics, no new UI elements, no new settings.
- **No persistence schema changes**: IndexedDB version stays at 1. No new stores, indexes, or record shapes.
- **No gameplay behavior changes**: Timing windows, scoring, combo logic, recording behavior all unchanged.
- **No dependency additions**: No new npm packages. No new React contexts or providers.
- **No CSS changes**: `RhythmLab.css` is not modified. All new components use existing class names.
- **No changes to existing hooks**: `useRhythmLab.ts` and `useLocalAudioFile.ts` are not modified.
- **No routing changes**: No new routes. No changes to the `/games` link or component exports.
