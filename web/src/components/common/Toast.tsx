import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { INSTANT, motionToken } from "../../utils/motionTokens";
import "./Toast.css";

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

// §13 state model (P5-9): a toast reports an outcome with the shared signature. Success is Confirmed, failure is
// Error, a degraded result is Warning, and information carries no state marker.
const TOAST_STATE: Record<ToastProps["type"], string> = { success: "df-confirmed", error: "df-error", warning: "df-warning", info: "" };

// Milliseconds in a second: under reduced motion the time-left bar is sampled once a second.
const SECOND = 1000;

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const reduce = useReducedMotion();
  // The toast's own lifetime is data, not a design value.
  const progressSeconds = duration / 1000;
  const shownAt = useRef(0);
  const [left, setLeft] = useState(1);

  useEffect(() => {
    shownAt.current = performance.now();
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  // Reduced motion: the bar steps once a sample, without movement, so it still reports the time left.
  useEffect(() => {
    if (!reduce) return;
    const timer = setInterval(() => setLeft(Math.max(0, 1 - (performance.now() - shownAt.current) / duration)), SECOND);
    return () => clearInterval(timer);
  }, [reduce, duration]);

  return (
    // The toast is removed once its exit transition has finished.
    <AnimatePresence onExitComplete={() => onClose(id)}>
      {isVisible && (
        <motion.div
          className={`toast toast-${type} ${TOAST_STATE[type]}`}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            // §12: state transition (create) · a notification was raised
            transition: reduce ? INSTANT : motionToken("--dur-base", "--ease-settle"),
          }}
          exit={{
            opacity: 0,
            // §12: state transition (remove) · the notification was dismissed or timed out
            transition: reduce ? INSTANT : motionToken("--dur-fast", "--ease-depart"),
          }}
          role="alert"
          aria-live="assertive"
        >
          <div className="toast-content">
            <h4 className="toast-title df-label">{title}</h4>
            {message && <p className="toast-message df-body-sm">{message}</p>}
          </div>

          <button
            className="toast-close df-control"
            onClick={() => setIsVisible(false)}
            aria-label="Close notification"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>

          {reduce ? (
            <div className="toast-progress" style={{ transform: `scaleX(${left})` }} />
          ) : (
            <motion.div
              className="toast-progress"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              // §12: state transition (continuous change) · the time left before the notification closes; the bar is that time, so it shrinks at a constant rate
              transition={{ ...motionToken("--dur-base", "--ease-linear"), duration: progressSeconds }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
