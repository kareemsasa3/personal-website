import { useId, useRef } from "react";
import RhythmLabDialogShell from "./RhythmLabDialogShell";

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

  const runLabel = runCount === 1 ? "1 saved run" : `${runCount} saved runs`;

  return (
    <RhythmLabDialogShell
      titleId={titleId}
      descriptionId={descriptionId}
      className="rhythm-lab-clear-history-dialog"
      onCancel={onCancel}
      initialFocusRef={cancelRef}
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
          className="rhythm-lab-danger-button"
          type="button"
          onClick={onConfirm}
        >
          Clear history
        </button>
      </div>
    </RhythmLabDialogShell>
  );
};

export default ClearRunHistoryDialog;
