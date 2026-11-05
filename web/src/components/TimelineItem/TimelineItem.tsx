import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TimelineEvent } from "../../data/timelineData";
import { useTheme } from "../../contexts/ThemeContext";
import { INSTANT, motionToken } from "../../utils/motionTokens";
import "./TimelineItem.css";

interface TimelineItemProps {
  data: TimelineEvent;
  isLeft: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ data, isLeft }) => {
  const { date, title, description, icon, category, image } = data;
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();

  // The image face lies over the text face at the card's size; only a vertical clip moves, from the face's middle out
  // to its edges and back, so the card never changes size.
  const imageFaceVariants = {
    // §12: state transition (reveal) · card shows its image
    shown: { clipPath: "inset(0% 0% 0% 0%)", transition: reduceMotion ? INSTANT : motionToken("--dur-base", "--ease-settle") },
    // §12: state transition (conceal) · card shows its text again
    hidden: { clipPath: "inset(50% 0% 50% 0%)", transition: reduceMotion ? INSTANT : motionToken("--dur-fast", "--ease-depart") },
  };

  // Resolve the preferred and fallback image URLs based on theme
  const preferredAndFallbackUrls = useMemo(() => {
    if (!image)
      return {
        preferred: null as string | null,
        fallback: null as string | null,
      };
    if (typeof image === "string") {
      return { preferred: image, fallback: null as string | null };
    }
    const preferred = theme === "light" ? image.light : image.dark;
    const fallback = theme === "light" ? image.dark : image.light;
    return { preferred, fallback };
  }, [image, theme]);

  // Preload image to ensure it is reachable in production; if it fails, try fallback
  useEffect(() => {
    setLoadedImageUrl(null);
    const { preferred, fallback } = preferredAndFallbackUrls;
    if (!preferred) return;

    let disposed = false;
    const tryLoad = (url: string, next?: string | null) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        if (!disposed) setLoadedImageUrl(url);
      };
      img.onerror = () => {
        if (next) {
          tryLoad(next, null);
        } else if (!disposed) {
          setLoadedImageUrl(null);
        }
      };
      img.src = url;
    };

    tryLoad(preferred, fallback);
    return () => {
      disposed = true;
    };
  }, [preferredAndFallbackUrls]);

  return (
    <div className={`timeline-item ${isLeft ? "left" : "right"}`}>
      <div className={`timeline-icon-wrapper ${category}`}>
        <FontAwesomeIcon icon={icon} />
      </div>

      <div
        className={`timeline-flip-container ${
          loadedImageUrl ? "has-image" : ""
        }`}
      >
        <div className="timeline-flip-card">
          {/* Front of card */}
          <div className="timeline-content timeline-front">
            <span className="timeline-date df-annotation">{date}</span>
            <h3 className="timeline-item-title df-heading-3">{title}</h3>
            <p className="timeline-item-description df-body">{description}</p>
          </div>

          {/* Back of card: the image face, laid over the front */}
          {loadedImageUrl && (
            <motion.div
              className="timeline-content timeline-back"
              variants={imageFaceVariants}
              initial={false}
              animate={isFlipped ? "shown" : "hidden"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={loadedImageUrl}
                referrerPolicy="no-referrer"
                alt={`${title} — timeline image`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          )}
        </div>
        {loadedImageUrl && <button className="timeline-flip-toggle df-control df-control--latch df-label" aria-pressed={isFlipped} aria-label={`${isFlipped ? "Show story" : "View image"}: ${title}`} onClick={() => setIsFlipped(v => !v)}>{isFlipped ? "Show story" : "View image"} ↻</button>}
      </div>
    </div>
  );
};

export default TimelineItem;
