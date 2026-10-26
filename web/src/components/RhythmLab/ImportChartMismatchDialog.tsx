import { useRef } from "react";
import RhythmLabDialogShell from "./RhythmLabDialogShell";

interface ImportChartMismatchDialogProps {
  exportedSongTitle: string;
  currentSongTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ImportChartMismatchDialog = ({
  exportedSongTitle,
  currentSongTitle,
  onCancel,
  onConfirm,
}: ImportChartMismatchDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <RhythmLabDialogShell
      titleId="import-mismatch-title"
      descriptionId="import-mismatch-body"
      onCancel={onCancel}
      initialFocusRef={cancelRef}
    >
      <span className="rhythm-lab-modal-kicker df-label">Song mismatch</span>
      <h2 id="import-mismatch-title" className="df-heading-3">Import chart into current song?</h2>
      <p className="rhythm-lab-delete-dialog-copy df-body" id="import-mismatch-body">
        This chart was exported for &ldquo;{exportedSongTitle}&rdquo;, but the
        current song is &ldquo;{currentSongTitle}&rdquo;. Because chart
        exports do not include audio, the chart will be attached to the current
        song.
      </p>
      <div className="rhythm-lab-delete-dialog-actions">
        <button
          ref={cancelRef}
          className="rhythm-lab-secondary-action df-control df-label"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="rhythm-lab-primary-action df-control df-label"
          type="button"
          onClick={onConfirm}
        >
          Import anyway
        </button>
      </div>
    </RhythmLabDialogShell>
  );
};

export default ImportChartMismatchDialog;
