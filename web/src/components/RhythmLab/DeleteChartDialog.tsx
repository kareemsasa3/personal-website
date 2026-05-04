import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }

      // Focus trap: cycle between the two buttons
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled])"
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onCancel]);

  const hasMeta = songTitle || noteCount !== undefined;

  return (
    <div className="rhythm-lab-modal-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="rhythm-lab-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-chart-title"
        aria-describedby="delete-chart-body"
        onClick={(event) => event.stopPropagation()}
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
      </div>
    </div>
  );
};

export default DeleteChartDialog;
