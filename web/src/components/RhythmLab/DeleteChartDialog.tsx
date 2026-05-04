import { useRef } from "react";
import RhythmLabDialogShell from "./RhythmLabDialogShell";

interface DeleteChartDialogProps {
  chartName: string;
  songTitle?: string;
  noteCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteChartDialog = ({
  chartName,
  songTitle,
  noteCount,
  onCancel,
  onConfirm,
}: DeleteChartDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const hasMeta = songTitle || noteCount !== undefined;

  return (
    <RhythmLabDialogShell
      titleId="delete-chart-title"
      descriptionId="delete-chart-body"
      onCancel={onCancel}
      initialFocusRef={cancelRef}
    >
      <span className="rhythm-lab-modal-kicker">Destructive action</span>
      <h2 id="delete-chart-title">Delete &ldquo;{chartName}&rdquo;?</h2>
      {hasMeta && (
        <p className="rhythm-lab-delete-dialog-meta">
          {[songTitle, noteCount !== undefined && `${noteCount} notes`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <p className="rhythm-lab-delete-dialog-copy" id="delete-chart-body">
        This cannot be undone. Your run history will remain, but this chart
        will no longer be available for playback or editing.
      </p>
      <div className="rhythm-lab-delete-dialog-actions">
        <button
          ref={cancelRef}
          className="rhythm-lab-secondary-action"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="rhythm-lab-danger-button"
          type="button"
          onClick={onConfirm}
        >
          Delete chart
        </button>
      </div>
    </RhythmLabDialogShell>
  );
};

export default DeleteChartDialog;
