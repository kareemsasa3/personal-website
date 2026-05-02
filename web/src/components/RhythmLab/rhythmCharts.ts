import { type ChartNote, type LaneIndex, type RhythmChart } from "./types";

type BeatChartEvent =
  | { beat: number; lane: LaneIndex }
  | { beat: number; lanes: [LaneIndex, LaneIndex] };

const STARTER_BPM = 120;
const STARTER_DURATION_MS = 20000;

const beatToMs = (beat: number, bpm: number, offsetMs = 0) =>
  Math.round((beat / bpm) * 60_000 + offsetMs);

const formatBeatId = (beat: number) => {
  const scaledBeat = Math.round(beat * 100);
  const wholeBeat = Math.floor(scaledBeat / 100);
  const beatFraction = scaledBeat % 100;

  return `b${String(wholeBeat).padStart(3, "0")}-${String(
    beatFraction
  ).padStart(2, "0")}`;
};

const getEventLanes = (event: BeatChartEvent): LaneIndex[] =>
  "lanes" in event ? event.lanes : [event.lane];

const compileBeatChart = (
  events: BeatChartEvent[],
  bpm: number,
  offsetMs = 0
): ChartNote[] =>
  events.flatMap((event) =>
    getEventLanes(event).map((lane) => ({
      id: `${formatBeatId(event.beat)}-l${lane}`,
      lane,
      timeMs: beatToMs(event.beat, bpm, offsetMs),
    }))
  );

const starterPhraseEvents: BeatChartEvent[] = [
  // Intro: quarter notes after a two-beat count-in.
  { beat: 2, lane: 0 },
  { beat: 3, lane: 1 },
  { beat: 4, lane: 2 },
  { beat: 5, lane: 1 },
  { beat: 6, lane: 0 },
  { beat: 7, lane: 2 },

  // Motif: center pivot with a left-right answer.
  { beat: 8, lane: 0 },
  { beat: 9, lane: 1 },
  { beat: 10, lane: 2 },
  { beat: 11, lane: 1 },
  { beat: 12, lane: 0 },
  { beat: 13, lane: 2 },
  { beat: 14, lane: 1 },

  // Variation: chord accent into the same contour, mirrored for thumbs.
  { beat: 16, lanes: [0, 2] },
  { beat: 17, lane: 1 },
  { beat: 18, lane: 0 },
  { beat: 19, lane: 1 },
  { beat: 20, lane: 2 },
  { beat: 21, lane: 0 },
  { beat: 22, lane: 1 },

  // Escalation: chord pickup, then an eight-note 250ms run.
  { beat: 24, lanes: [0, 1] },
  { beat: 25, lane: 2 },
  { beat: 25.5, lane: 1 },
  { beat: 26, lane: 0 },
  { beat: 26.5, lane: 1 },
  { beat: 27, lane: 2 },
  { beat: 27.5, lane: 0 },
  { beat: 28, lane: 1 },
  { beat: 28.5, lane: 2 },
  { beat: 30, lane: 0 },
  { beat: 31, lane: 2 },

  // Ending: motif fragments with two accents and a clean final chord.
  { beat: 32, lane: 1 },
  { beat: 33, lane: 0 },
  { beat: 34, lanes: [1, 2] },
  { beat: 35, lane: 0 },
  { beat: 36, lane: 1 },
  { beat: 37, lane: 2 },
  { beat: 38, lane: 1 },
  { beat: 39, lanes: [0, 2] },
];

export const starterChart: RhythmChart = {
  id: "starter-phrase",
  title: "Starter Phrase",
  bpm: STARTER_BPM,
  durationMs: STARTER_DURATION_MS,
  notes: compileBeatChart(starterPhraseEvents, STARTER_BPM),
};
