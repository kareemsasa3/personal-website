import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ProjectMedia as ProjectMediaData } from "../../data/projects";
import MediaCaption from "./MediaCaption";
import MediaInspector, { type InspectorResult, type InspectorView } from "./MediaInspector";
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
  const inspectingRef = useRef(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inspection, setInspection] = useState<{
    view: InspectorView;
    startTime: number;
    wasPlaying: boolean;
  } | null>(null);
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
        if (entry.isIntersecting && !userPausedRef.current && !inspectingRef.current) {
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

  // Hand playback to the larger viewer so only one copy runs at a time.
  const openInspector = (view: InspectorView, opener: HTMLButtonElement) => {
    const element = videoRef.current;
    const wasPlaying = Boolean(element && !element.paused);
    openerRef.current = opener;
    inspectingRef.current = true;
    element?.pause();
    setInspection({ view, startTime: element?.currentTime ?? 0, wasPlaying });
  };

  // Carry the viewer's position and play/pause choice back to the inline loop.
  const closeInspector = ({ currentTime, playing, userPaused }: InspectorResult) => {
    const element = videoRef.current;
    inspectingRef.current = false;
    if (element) {
      element.currentTime = currentTime;
      if (userPaused) {
        userPausedRef.current = true;
      } else if (playing || inspection?.wasPlaying) {
        userPausedRef.current = false;
        element.play().catch(() => undefined);
      }
    }
    setInspection(null);
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
      {video && (
        <div className="project-media__actions">
          <button
            type="button"
            className="project-media__control"
            aria-haspopup="dialog"
            aria-label={`Inspect ${label} recording with playback controls`}
            onClick={(event) => openInspector("recording", event.currentTarget)}
          >
            ⤢ inspect recording
          </button>
          {video.textualEvidence && (
            <button
              type="button"
              className="project-media__control"
              aria-haspopup="dialog"
              aria-label={`Read ${label} still frame`}
              onClick={(event) => openInspector("still", event.currentTarget)}
            >
              ▤ read still frame
            </button>
          )}
        </div>
      )}
      {video && inspection && (
        <MediaInspector
          media={{ ...media, video }}
          label={label}
          initialView={inspection.view}
          startTime={inspection.startTime}
          autoplay={inspection.wasPlaying}
          returnFocus={() => openerRef.current}
          onClose={closeInspector}
        />
      )}
      {video && <MediaCaption as="figcaption" video={video} />}
    </figure>
  );
};

export default ProjectMedia;
