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

  const flipVariants = {
    front: { rotateY: 0 },
    back: { rotateY: 180 },
  };

  const handleMouseEnter = () => {
    if (loadedImageUrl) {
      setIsFlipped(true);
    }
  };

  const handleMouseLeave = () => {
    if (loadedImageUrl) {
      setIsFlipped(false);
    }
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
        onPointerEnter={(event) => { if (event.pointerType === "mouse") handleMouseEnter(); }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") handleMouseLeave(); }}

      >
        <motion.div
          className="timeline-flip-card"
          variants={flipVariants}
          animate={isFlipped ? "back" : "front"}
          // §12: state transition (reveal) · card turned to its image
          transition={reduceMotion ? INSTANT : motionToken("--dur-base", "--ease-standard")}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front of card */}
          <motion.div
            className="timeline-content timeline-front"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="timeline-date">{date}</span>
            <h3 className="timeline-item-title">{title}</h3>
            <p className="timeline-item-description">{description}</p>
          </motion.div>

          {/* Back of card */}
          {loadedImageUrl && (
            <motion.div
              className="timeline-content timeline-back"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
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
        </motion.div>
        {loadedImageUrl && <button className="timeline-flip-toggle" aria-pressed={isFlipped} aria-label={`${isFlipped ? "Show story" : "View image"}: ${title}`} onClick={() => setIsFlipped(v => !v)}>{isFlipped ? "Show story" : "View image"} ↻</button>}
      </div>
    </div>
  );
};

export default TimelineItem;
