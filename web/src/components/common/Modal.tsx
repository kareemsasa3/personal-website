import React, { useRef } from "react";
import FocusTrap from "focus-trap-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import "./Modal.css";
import ViewportPortal from "./ViewportPortal";
import { INSTANT, motionToken } from "../../utils/motionTokens";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "warning" | "danger";
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
  showCloseButton = true,
}) => {
  const reduce = useReducedMotion();
  const enter = reduce ? INSTANT : motionToken("--dur-base", "--ease-settle");
  const leave = reduce ? INSTANT : motionToken("--dur-fast", "--ease-depart");

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  // A click closes the dialog only when the press both began and ended on the backdrop: a press dragged off where it
  // started, either way between the backdrop and the dialog, does nothing (§13 Activation).
  const pressOnBackdrop = useRef(false);
  const releaseOnBackdrop = useRef(false);
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && pressOnBackdrop.current && releaseOnBackdrop.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ViewportPortal layer="modal">
          <FocusTrap focusTrapOptions={{ escapeDeactivates: false }}>
          <motion.div
            onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}
            className="modal-overlay"
            initial={{ opacity: 0 }}
            // §12: state transition (create) · the dialog opened
            animate={{ opacity: 1, transition: enter }}
            // §12: state transition (remove) · the dialog closed
            exit={{ opacity: 0, transition: leave }}
            onPointerDown={(event) => { pressOnBackdrop.current = event.target === event.currentTarget; }}
            onPointerUp={(event) => { releaseOnBackdrop.current = event.target === event.currentTarget; }}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <motion.div
              className={`modal-content modal-${type} df-cut-md`}
              initial={{ opacity: 0 }}
              // §12: state transition (create) · the dialog opened
              animate={{ opacity: 1, transition: enter }}
              // §12: state transition (remove) · the dialog closed
              exit={{ opacity: 0, transition: leave }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 id="modal-title" className="modal-title df-heading-3">
                  {title}
                </h2>
                {showCloseButton && (
                  <button
                    className="modal-close df-control df-label"
                    onClick={onClose}
                    aria-label="Close modal"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>

              <div className="modal-body df-body">{children}</div>

              {(onConfirm || onCancel) && (
                <div className="modal-footer">
                  {onCancel && (
                    <button
                      className="modal-button modal-button-secondary df-control df-label"
                      onClick={handleCancel}
                    >
                      {cancelText}
                    </button>
                  )}
                  {onConfirm && (
                    <button
                      className={`modal-button modal-button-${type} df-control df-label`}
                      onClick={handleConfirm}
                    >
                      {confirmText}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
          </FocusTrap>
        </ViewportPortal>
      )}
    </AnimatePresence>
  );
};

export default Modal;
