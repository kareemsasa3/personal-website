import type { ChangeEvent } from "react";
import type { GamePhase } from "./types";
import type { RhythmLabSong } from "./library/types";
import { formatSongOptionLabel } from "./helpers";

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

const SongControls = ({
  fileName,
  importedSongs,
  activeSongId,
  audioError,
  chartStorageError,
  runStorageError,
  phase,
  isRecording,
  hasSelectedFile,
  isPreviewing,
  onFileChange,
  onSongSelect,
  onStartPreview,
  onStopPreview,
}: SongControlsProps) => (
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
      <label
        className="rhythm-lab-song-selector"
        aria-label="Imported song selector"
      >
        <span>Saved songs</span>
        <select
          value={activeSongId ?? ""}
          disabled={isRecording}
          onChange={(event) => onSongSelect(event.currentTarget.value)}
        >
          <option value="" disabled>
            Select song
          </option>
          {importedSongs.map((song) => (
            <option key={song.id} value={song.id}>
              {formatSongOptionLabel(song)}
            </option>
          ))}
        </select>
      </label>
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

export default SongControls;
