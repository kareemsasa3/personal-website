// src/components/TypewriterText/TypewriterText.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./TypeWriterText.css";

interface TypeWriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypeWriterText: React.FC<TypeWriterTextProps> = ({
  text,
  delay = 0,
  speed = 100,
  className = "",
  onComplete,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasCompletedReducedMotion, setHasCompletedReducedMotion] =
    useState(false);

  // Handle reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!prefersReducedMotion || hasCompletedReducedMotion) {
      return;
    }

    onComplete?.();
    setHasCompletedReducedMotion(true);
  }, [hasCompletedReducedMotion, onComplete, prefersReducedMotion]);

  // Validate inputs
  if (!text || typeof text !== "string") {
    return (
      <span className={`typewriter-text error ${className}`}>
        {text}
      </span>
    );
  }

  if (speed < 10 || speed > 1000) {
    console.warn("TypeWriterText: Speed should be between 10 and 1000ms");
  }

  if (delay < 0 || delay > 10000) {
    console.warn("TypeWriterText: Delay should be between 0 and 10000ms");
  }

  const tokens = text.split(/(\s+)/);

  // Variants for the container to orchestrate the animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: () => ({
      opacity: 1,
      transition: {
        staggerChildren: speed / 1000, // Convert speed (ms) to seconds for stagger
        delayChildren: delay / 1000, // Convert delay (ms) to seconds
      },
    }),
  };

  // Variants for each individual character
  const characterVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  const handleAnimationComplete = () => {
    onComplete?.();
  };

  // If user prefers reduced motion, show text immediately
  if (prefersReducedMotion) {
    return (
      <span className={`typewriter-text ${className}`}>
        {text}
      </span>
    );
  }

  return (
    <span className={`typewriter-accessible ${className}`}>
      <span className="typewriter-screen-reader-text">{text}</span>
      <motion.span
        className="typewriter-text"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onAnimationComplete={handleAnimationComplete}
        aria-hidden="true"
      >
        {tokens.map((token, tokenIndex) => {
          if (/^\s+$/.test(token)) {
            return <React.Fragment key={`space-${tokenIndex}`}>{token}</React.Fragment>;
          }

          return (
            <span className="typewriter-word" key={`${token}-${tokenIndex}`}>
              {token.split("").map((char, charIndex) => (
                <motion.span
                  key={`${char}-${charIndex}`}
                  variants={characterVariants}
                >
                  {char}
                </motion.span>
              ))}
            </span>
          );
        })}
      </motion.span>
    </span>
  );
};

export default TypeWriterText;
