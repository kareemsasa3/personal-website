import { useCallback, useRef, useState } from "react";
import type { ChartNote, LaneIndex, RhythmChart } from "./types";
import {
  RECORDED_CHART_BPM,
  RECORDED_CHART_TAIL_MS,
  RECORDING_DEDUPE_MS,
} from "./helpers";

interface UseRecordingSessionParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  fileName: string | null;
  getElapsedMs: () => number;
}

export const useRecordingSession = ({
  audioRef,
  fileName,
  getElapsedMs,
}: UseRecordingSessionParams) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingCount, setRecordingCount] = useState(0);
  const recordingNotesRef = useRef<ChartNote[]>([]);
  const recordingSequenceRef = useRef(0);
  const lastRecordedByLaneRef = useRef<Partial<Record<LaneIndex, number>>>({});

  const resetRecordingDraft = useCallback(() => {
    recordingNotesRef.current = [];
    recordingSequenceRef.current = 0;
    lastRecordedByLaneRef.current = {};
    setRecordingCount(0);
  }, []);

  const beginRecording = useCallback(() => {
    resetRecordingDraft();
    setIsRecording(true);
  }, [resetRecordingDraft]);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    resetRecordingDraft();
  }, [resetRecordingDraft]);

  const recordLaneTap = useCallback(
    (lane: LaneIndex): boolean => {
      const audio = audioRef.current;
      const timeMs = audio ? Math.round(audio.currentTime * 1000) : 0;
      const lastSameLaneNoteMs = lastRecordedByLaneRef.current[lane];

      if (
        lastSameLaneNoteMs !== undefined &&
        Math.abs(timeMs - lastSameLaneNoteMs) <= RECORDING_DEDUPE_MS
      ) {
        return false;
      }

      recordingSequenceRef.current += 1;
      const note: ChartNote = {
        id: `recorded-${String(recordingSequenceRef.current).padStart(
          4,
          "0"
        )}-l${lane}`,
        lane,
        timeMs,
      };

      recordingNotesRef.current.push(note);
      lastRecordedByLaneRef.current[lane] = timeMs;
      setRecordingCount(recordingNotesRef.current.length);
      return true;
    },
    [audioRef]
  );

  const stopRecording = useCallback((): RhythmChart => {
    const notes = recordingNotesRef.current;
    const sortedNotes = [...notes].sort(
      (first, second) => first.timeMs - second.timeMs
    );
    const audio = audioRef.current;
    const audioDurationMs =
      audio && Number.isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : 0;
    const lastNoteMs = sortedNotes.length
      ? sortedNotes[sortedNotes.length - 1].timeMs
      : 0;
    const durationMs = Math.max(
      audioDurationMs,
      Math.round(getElapsedMs()),
      lastNoteMs + RECORDED_CHART_TAIL_MS,
      1000
    );

    const chart: RhythmChart = {
      id: `recorded-${fileName ?? "local-audio"}`,
      title: "Recorded Chart",
      bpm: RECORDED_CHART_BPM,
      durationMs,
      notes: sortedNotes,
    };

    setRecordingCount(notes.length);
    setIsRecording(false);
    return chart;
  }, [audioRef, fileName, getElapsedMs]);

  return {
    isRecording,
    recordingCount,
    beginRecording,
    stopRecording,
    cancelRecording,
    recordLaneTap,
  };
};
