import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import "./Dock.css";

interface DockIconProps {
  path: string;
  icon: IconDefinition;
  label: string;
  isActive: boolean;
  baseSize: number;
}

const DockIcon: React.FC<DockIconProps> = ({
  path,
  icon,
  label,
  isActive,
  baseSize,
}) => {
  // Tooltip visibility state
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  return (
    <div className="dock-icon-container">
      <Link
        to={path}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={`dock-nav-link ${isActive ? "active" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={(event) => setIsFocusVisible(event.currentTarget.matches(":focus-visible"))}
        onBlur={() => setIsFocusVisible(false)}
      >
        <div
          className="dock-icon"
          style={{
            width: baseSize,
            height: baseSize,
            fontSize: baseSize * 0.6,
          }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
      </Link>

      {/* Tooltip */}
      <AnimatePresence>
        {(isHovered || isFocusVisible) && (
          <motion.div
            className="dock-tooltip"
            aria-hidden="true"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DockIcon;
