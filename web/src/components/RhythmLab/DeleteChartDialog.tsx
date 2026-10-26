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
      <span className="rhythm-lab-modal-kicker df-label">Destructive action</span>
      <h2 id="delete-chart-title" className="df-heading-3">Delete &ldquo;{chartName}&rdquo;?</h2>
      {hasMeta && (
        <p className="rhythm-lab-delete-dialog-meta df-body-sm">
          {[songTitle, noteCount !== undefined && `${noteCount} notes`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <p className="rhythm-lab-delete-dialog-copy df-body" id="delete-chart-body">
        This cannot be undone. Your run history will remain, but this chart
        will no longer be available for playback or editing.
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
          className="rhythm-lab-danger-button df-control df-label"
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
