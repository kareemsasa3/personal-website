import { useEffect, useId, useRef } from "react";

interface ClearRunHistoryDialogProps {
  runCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const ClearRunHistoryDialog = ({
  runCount,
  onCancel,
  onConfirm,
}: ClearRunHistoryDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

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

      if (event.key !== "Tab") return;

      const cancelButton = cancelRef.current;
      const confirmButton = confirmRef.current;
      if (!cancelButton || !confirmButton) return;

      if (event.shiftKey && document.activeElement === cancelButton) {
        event.preventDefault();
        confirmButton.focus();
      } else if (!event.shiftKey && document.activeElement === confirmButton) {
        event.preventDefault();
        cancelButton.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onCancel]);

  const runLabel = runCount === 1 ? "1 saved run" : `${runCount} saved runs`;

  return (
    <div
      className="rhythm-lab-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="rhythm-lab-delete-dialog rhythm-lab-clear-history-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="rhythm-lab-modal-kicker">Clear history</span>
        <h2 id={titleId}>Clear run history?</h2>
        <div id={descriptionId} className="rhythm-lab-delete-dialog-copy">
          <p>
            This will permanently remove {runLabel} from this browser and reset
            history-based analytics.
          </p>
          <p>
            Your charts, imported audio, and chart best stats will not be
            deleted.
          </p>
        </div>
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
            ref={confirmRef}
            className="rhythm-lab-danger-button"
            type="button"
            onClick={onConfirm}
          >
            Clear history
          </button>
        </div>
      </section>
    </div>
  );
};

export default ClearRunHistoryDialog;
