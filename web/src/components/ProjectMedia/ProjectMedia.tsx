import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ProjectMedia as ProjectMediaData } from "../../data/projects";
import "./ProjectMedia.css";

interface ProjectMediaProps {
  media: ProjectMediaData;
  /** Shown in the frame's title bar, e.g. the project name. */
  label: string;
  /** "video" plays the loop when one exists; "poster" always shows the still. */
  mode?: "poster" | "video";
  /** Inside a link whose text already names the project, the still adds no information. */
  decorative?: boolean;
  /** Above-the-fold stills should load eagerly. */
  eager?: boolean;
  className?: string;
}

const ProjectMedia = ({
  media,
  label,
  mode = "poster",
  decorative = false,
  eager = false,
  className,
}: ProjectMediaProps) => {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const video = mode === "video" ? media.video : undefined;
  const still = (mode === "poster" && media.thumbnail) || media.poster;
  const shouldAutoplay = Boolean(video) && !reduceMotion;

  // Play only while on screen so the loop doesn't download or run out of view.
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !shouldAutoplay) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPausedRef.current) {
          // Muted autoplay is normally allowed; if a browser still blocks it, the poster stays up and the play button works.
          element.play().catch(() => undefined);
        } else if (!entry.isIntersecting) {
          element.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldAutoplay]);

  const togglePlayback = () => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (element.paused) {
      userPausedRef.current = false;
      element.play().catch(() => undefined);
    } else {
      userPausedRef.current = true;
      element.pause();
    }
  };

  const classes = ["project-media", className].filter(Boolean).join(" ");

  return (
    <figure className={classes}>
      <div className="project-media__bar">
        <span className="project-media__label" aria-hidden="true">
          {label}
        </span>
        {video && (
          <button
            type="button"
            className="project-media__control"
            onClick={togglePlayback}
            aria-label={isPlaying ? `Pause ${label} demo` : `Play ${label} demo`}
          >
            {isPlaying ? "pause" : "play"}
          </button>
        )}
      </div>
      {video ? (
        <video
          ref={videoRef}
          className="project-media__asset"
          width={video.width}
          height={video.height}
          poster={media.poster.src}
          aria-label={video.label}
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src={video.src} type="video/mp4" />
        </video>
      ) : (
        <img
          className="project-media__asset"
          src={still.src}
          alt={decorative ? "" : still.alt}
          width={still.width}
          height={still.height}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </figure>
  );
};

export default ProjectMedia;
