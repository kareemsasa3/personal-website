import { useEffect, useRef } from "react";

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

  return (
    <div className="rhythm-lab-modal-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="rhythm-lab-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-mismatch-title"
        aria-describedby="import-mismatch-body"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="rhythm-lab-modal-kicker">Song mismatch</span>
        <h2 id="import-mismatch-title">Import chart into current song?</h2>
        <p className="rhythm-lab-delete-dialog-copy" id="import-mismatch-body">
          This chart was exported for &ldquo;{exportedSongTitle}&rdquo;, but the
          current song is &ldquo;{currentSongTitle}&rdquo;. Because chart
          exports do not include audio, the chart will be attached to the current
          song.
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
            className="rhythm-lab-primary-action"
            type="button"
            onClick={onConfirm}
          >
            Import anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportChartMismatchDialog;
