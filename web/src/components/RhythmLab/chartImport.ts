import type { ChartNote, LaneIndex } from "./types";
import type { RhythmLabChartExportV1 } from "./chartExport";
import type { RhythmLabSong } from "./library/types";
import { laneIndexes } from "./helpers";

const VALID_LANES: ReadonlySet<number> = new Set<number>(laneIndexes);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidNote(note: unknown): note is { lane: number; timeMs: number; id?: unknown } {
  if (!note || typeof note !== "object") return false;

  const record = note as Record<string, unknown>;
  return (
    isFiniteNumber(record.lane) &&
    Number.isInteger(record.lane) &&
    VALID_LANES.has(record.lane) &&
    isFiniteNumber(record.timeMs) &&
    record.timeMs >= 0
  );
}

export function normalizeImportedChartNotes(
  rawNotes: unknown[]
): ChartNote[] {
  const seenIds = new Set<string>();
  let fallbackCounter = 0;

  const notes: ChartNote[] = [];

  for (const raw of rawNotes) {
    if (!isValidNote(raw)) continue;

    let id =
      typeof raw.id === "string" && raw.id.length > 0 ? raw.id : null;

    if (id === null || seenIds.has(id)) {
      id = `imported-note-${Date.now()}-${fallbackCounter++}`;
    }

    seenIds.add(id);
    notes.push({ id, lane: raw.lane as LaneIndex, timeMs: raw.timeMs });
  }

  notes.sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  return notes;
}

export function validateRhythmLabChartExport(
  value: unknown
): RhythmLabChartExportV1 | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  if (record.kind !== "rhythm-lab-chart") return null;
  if (record.schemaVersion !== 1) return null;

  const chart = record.chart;
  if (!chart || typeof chart !== "object") return null;

  const chartRecord = chart as Record<string, unknown>;

  if (!Array.isArray(chartRecord.notes)) return null;

  const normalizedNotes = normalizeImportedChartNotes(chartRecord.notes);
  if (normalizedNotes.length === 0) return null;

  const label =
    typeof chartRecord.label === "string" && chartRecord.label.trim().length > 0
      ? chartRecord.label.trim()
      : "Imported chart";

  return {
    kind: "rhythm-lab-chart",
    schemaVersion: 1,
    exportedAtMs:
      isFiniteNumber(record.exportedAtMs) ? record.exportedAtMs : 0,
    song:
      record.song && typeof record.song === "object"
        ? {
            id:
              typeof (record.song as Record<string, unknown>).id === "string"
                ? ((record.song as Record<string, unknown>).id as string)
                : null,
            title:
              typeof (record.song as Record<string, unknown>).title === "string"
                ? ((record.song as Record<string, unknown>).title as string)
                : "Unknown song",
            durationMs:
              isFiniteNumber(
                (record.song as Record<string, unknown>).durationMs
              )
                ? ((record.song as Record<string, unknown>).durationMs as number)
                : null,
            audioFileName:
              typeof (record.song as Record<string, unknown>).audioFileName ===
              "string"
                ? ((record.song as Record<string, unknown>)
                    .audioFileName as string)
                : "",
          }
        : null,
    chart: {
      id: typeof chartRecord.id === "string" ? chartRecord.id : "",
      label,
      difficulty:
        typeof chartRecord.difficulty === "string"
          ? chartRecord.difficulty
          : "custom",
      scrollSpeed: isFiniteNumber(chartRecord.scrollSpeed)
        ? chartRecord.scrollSpeed
        : 1,
      source:
        typeof chartRecord.source === "string" ? chartRecord.source : "recorded",
      durationMs: isFiniteNumber(chartRecord.durationMs)
        ? chartRecord.durationMs
        : normalizedNotes[normalizedNotes.length - 1].timeMs + 1800,
      createdAt:
        typeof chartRecord.createdAt === "string"
          ? chartRecord.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof chartRecord.updatedAt === "string"
          ? chartRecord.updatedAt
          : new Date().toISOString(),
      noteCount: normalizedNotes.length,
      notes: normalizedNotes,
    },
  };
}

export async function parseRhythmLabChartExportFile(
  file: File
): Promise<RhythmLabChartExportV1 | null> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    return validateRhythmLabChartExport(parsed);
  } catch {
    return null;
  }
}

export function createImportedChartLabel(
  baseLabel: string,
  existingLabels: string[]
): string {
  const labelSet = new Set(existingLabels);

  if (!labelSet.has(baseLabel)) return baseLabel;

  const importedLabel = `${baseLabel} (Imported)`;
  if (!labelSet.has(importedLabel)) return importedLabel;

  for (let i = 2; ; i++) {
    const candidate = `${baseLabel} (Imported ${i})`;
    if (!labelSet.has(candidate)) return candidate;
  }
}

export function doesExportedSongMatchActiveSong(
  exportedSong: RhythmLabChartExportV1["song"],
  activeSong: RhythmLabSong
): boolean {
  if (!exportedSong) return false;

  if (exportedSong.id === activeSong.id) return true;
  if (
    exportedSong.title.toLowerCase() === activeSong.title.toLowerCase()
  ) {
    return true;
  }
  if (
    exportedSong.audioFileName &&
    exportedSong.audioFileName.toLowerCase() ===
      activeSong.filename.toLowerCase()
  ) {
    return true;
  }

  return false;
}
