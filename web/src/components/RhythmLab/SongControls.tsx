import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase } from "./types";
import type { RhythmLabSong } from "./library/types";
import { formatSongOptionLabel, formatSongTimestamp } from "./helpers";

interface SongControlsProps {
  fileName: string | null;
  importedSongs: RhythmLabSong[];
  activeSongId: string | null;
  audioError: string | null;
  chartStorageError: string | null;
  runStorageError: string | null;
  phase: GamePhase;
  isRecording: boolean;
  hasSelectedFile: boolean;
  isPreviewing: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSongSelect: (songId: string) => void;
  onStartPreview: () => void;
  onStopPreview: () => void;
}

const SONG_LIST_ID = "rhythm-lab-song-list";

const SongControls = ({
  fileName,
  importedSongs,
  activeSongId,
  audioError,
  chartStorageError,
  runStorageError,
  phase,
  hasSelectedFile,
  isPreviewing,
  onFileChange,
  onSongSelect,
  onStartPreview,
  onStopPreview,
}: SongControlsProps) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const closePicker = useCallback(() => setIsPickerOpen(false), []);

  useEffect(() => {
    if (!isPickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsPickerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPickerOpen]);

  const activeSong = activeSongId
    ? importedSongs.find((song) => song.id === activeSongId)
    : null;
  const triggerLabel = activeSong
    ? formatSongOptionLabel(activeSong)
    : "Select song";

  return (
    <>
      <label className="rhythm-lab-audio-picker">
        <span>Local audio</span>
        <input
          className="rhythm-lab-audio-input"
          type="file"
          accept="audio/*"
          aria-label="Choose local audio file"
          onChange={onFileChange}
        />
        <span className="rhythm-lab-audio-picker-button" aria-hidden="true">
          Choose file
        </span>
      </label>
      {importedSongs.length > 0 && (
        <div className="rhythm-lab-song-selector" ref={pickerRef}>
          <span className="rhythm-lab-song-selector-label">Saved songs</span>
          <button
            className="rhythm-lab-song-selector-trigger"
            type="button"
            aria-expanded={isPickerOpen}
            aria-haspopup="listbox"
            aria-controls={isPickerOpen ? SONG_LIST_ID : undefined}
            onClick={() => setIsPickerOpen((open) => !open)}
          >
            {triggerLabel}
          </button>
          {isPickerOpen && (
            <div
              id={SONG_LIST_ID}
              className="rhythm-lab-song-list"
              role="listbox"
              aria-label="Saved songs"
            >
              {importedSongs.map((song) => (
                <button
                  key={song.id}
                  className={`rhythm-lab-song-option${song.id === activeSongId ? " rhythm-lab-song-option-active" : ""}`}
                  role="option"
                  aria-selected={song.id === activeSongId}
                  type="button"
                  onClick={() => {
                    onSongSelect(song.id);
                    closePicker();
                  }}
                >
                  <span className="rhythm-lab-song-option-title">
                    {song.title || song.filename}
                  </span>
                  <span className="rhythm-lab-song-option-meta">
                    {formatSongTimestamp(song.importedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="rhythm-lab-audio-details" aria-live="polite">
        <span className="rhythm-lab-audio-details-row">
          <span
            className="rhythm-lab-audio-filename"
            title={fileName ?? "No audio selected"}
            aria-label={fileName ?? "No audio selected"}
          >
            {fileName ? fileName : "No audio selected"}
          </span>
          {hasSelectedFile && (
            <button
              className={`rhythm-lab-preview-button${isPreviewing ? " rhythm-lab-preview-button-active" : ""}`}
              type="button"
              onClick={isPreviewing ? onStopPreview : onStartPreview}
            >
              {isPreviewing ? "\u25A0 Stop" : "\u25B6 Preview"}
            </button>
          )}
        </span>
        <small>Stored locally in this browser. Not uploaded.</small>
        {audioError && (
          <small className="rhythm-lab-audio-error">{audioError}</small>
        )}
        {chartStorageError && (
          <small className="rhythm-lab-audio-error">{chartStorageError}</small>
        )}
        {runStorageError && phase !== "complete" && (
          <small className="rhythm-lab-audio-error">{runStorageError}</small>
        )}
      </div>
    </>
  );
};

export default SongControls;
