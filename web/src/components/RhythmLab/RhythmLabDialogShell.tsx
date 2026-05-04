import { type ReactNode, type RefObject, useEffect, useRef } from "react";

interface RhythmLabDialogShellProps {
  titleId: string;
  descriptionId: string;
  className?: string;
  onCancel: () => void;
  initialFocusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const RhythmLabDialogShell = ({
  titleId,
  descriptionId,
  className,
  onCancel,
  initialFocusRef,
  children,
}: RhythmLabDialogShellProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialFocusRef.current?.focus();
  }, [initialFocusRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
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
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onCancel]);

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
      <div
        ref={panelRef}
        className={
          className
            ? `rhythm-lab-delete-dialog ${className}`
            : "rhythm-lab-delete-dialog"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default RhythmLabDialogShell;
