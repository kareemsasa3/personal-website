import type { ChartNote } from "./types";
import type { RhythmLabChart, RhythmLabSong } from "./library/types";

export interface RhythmLabChartExportV1 {
  kind: "rhythm-lab-chart";
  schemaVersion: 1;
  exportedAtMs: number;

  song: {
    id: string | null;
    title: string;
    durationMs: number | null;
    audioFileName: string;
  } | null;

  chart: {
    id: string;
    label: string;
    difficulty: string;
    scrollSpeed: number;
    source: string;
    durationMs: number;
    createdAt: string;
    updatedAt: string;
    noteCount: number;
    notes: ChartNote[];
  };
}

export function createChartExportPayload(
  chart: RhythmLabChart,
  song: RhythmLabSong | null
): RhythmLabChartExportV1 {
  return {
    kind: "rhythm-lab-chart",
    schemaVersion: 1,
    exportedAtMs: Date.now(),

    song: song
      ? {
          id: song.id,
          title: song.title,
          durationMs: song.durationMs,
          audioFileName: song.filename,
        }
      : null,

    chart: {
      id: chart.id,
      label: chart.name,
      difficulty: chart.difficulty,
      scrollSpeed: chart.scrollSpeed,
      source: chart.source,
      durationMs: chart.durationMs,
      createdAt: chart.createdAt,
      updatedAt: chart.updatedAt,
      noteCount: chart.notes.length,
      notes: chart.notes,
    },
  };
}

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "", ) || "untitled"
  );
}

export function createChartExportFilename(
  songTitle: string | undefined,
  chartLabel: string
): string {
  const parts = [
    songTitle ? sanitizeFilenamePart(songTitle) : null,
    sanitizeFilenamePart(chartLabel),
  ].filter(Boolean);

  return `${parts.join("-")}.rhythm-chart.json`;
}

export function downloadJsonFile(
  filename: string,
  payload: unknown
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
