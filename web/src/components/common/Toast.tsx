import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faTimes,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return faCheckCircle;
      case "error":
        return faExclamationCircle;
      case "warning":
        return faExclamationTriangle;
      case "info":
        return faInfoCircle;
      default:
        return faInfoCircle;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`toast toast-${type}`}
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
          <div className="toast-icon">
            <FontAwesomeIcon icon={getIcon()} />
          </div>

          <div className="toast-content">
            <h4 className="toast-title">{title}</h4>
            {message && <p className="toast-message">{message}</p>}
          </div>

          <button
            className="toast-close"
            onClick={handleClose}
            aria-label="Close notification"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>

          {/* Progress bar: under reduced motion it renders without animation. */}
          {reduce ? (
            <div className="toast-progress" />
          ) : (
            <motion.div
              className="toast-progress"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              // §12: state transition (continuous change) · time until the notification is dismissed
              transition={{ ...motionToken("--dur-base", "--ease-linear"), duration: progressSeconds }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
