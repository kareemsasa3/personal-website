import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import FocusTrap from "focus-trap-react";
import type { ProjectMedia as ProjectMediaData } from "../../data/projects";
import ViewportPortal from "../common/ViewportPortal";
import MediaCaption from "./MediaCaption";

export type InspectorView = "recording" | "still";

export interface InspectorResult {
  currentTime: number;
  playing: boolean;
  /** The visitor paused the recording here, as opposed to it never playing or ending. */
  userPaused: boolean;
}

interface MediaInspectorProps {
  media: ProjectMediaData & { video: NonNullable<ProjectMediaData["video"]> };
  label: string;
  initialView: InspectorView;
  startTime: number;
  /** Continue playback only when the inline recording was already playing. */
  autoplay: boolean;
  returnFocus: () => HTMLElement | null;
  onClose: (result: InspectorResult) => void;
}

// Below this scale the still's text is too small to read, so it opens at 1:1 instead.
const READABLE_FIT_SCALE = 0.75;

const MediaInspector = ({
  media,
  label,
  initialView,
  startTime,
  autoplay,
  returnFocus,
  onClose,
}: MediaInspectorProps) => {
  const { video, poster } = media;
  const hasStill = Boolean(video.textualEvidence);
  const [view, setView] = useState<InspectorView>(hasStill ? initialView : "recording");
  const [actualSize, setActualSize] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const playedRef = useRef(autoplay && initialView === "recording");
  const pausedBySwitchRef = useRef(false);
  const titleId = useId();
  const captionId = useId();

  // Read the element's state directly rather than relying on pause/play event timing.
  const close = () => {
    const element = videoRef.current;
    const stopped = Boolean(element && element.paused && !element.ended);
    onClose({
      currentTime: element?.currentTime ?? startTime,
      playing: Boolean(element && !element.paused && !element.ended),
      userPaused: stopped && playedRef.current && !pausedBySwitchRef.current,
    });
  };

  // Keep wheel and touch scrolling from moving the page behind the viewer. The root's
  // stable scrollbar gutter means this causes no layout shift; the cleanup always restores it.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflowY;
    root.style.overflowY = "hidden";
    return () => {
      root.style.overflowY = previous;
    };
  }, []);

  // Resume from the frame the visitor was watching.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    element.currentTime = startTime;
    if (autoplay && initialView === "recording") {
      element.play().catch(() => undefined);
    }
  }, [autoplay, initialView, startTime]);

  // Fit the still when it is legible at that scale; otherwise start at actual size.
  useLayoutEffect(() => {
    if (view !== "still" || !stageRef.current) {
      return;
    }
    const { clientWidth, clientHeight } = stageRef.current;
    const fitScale = Math.min(clientWidth / poster.width, clientHeight / poster.height);
    setActualSize(fitScale < READABLE_FIT_SCALE);
  }, [view, poster.width, poster.height]);

  const showView = (next: InspectorView) => {
    const element = videoRef.current;
    if (next === "still" && element && !element.paused) {
      pausedBySwitchRef.current = true;
      element.pause();
    }
    setView(next);
  };

  return (
    <ViewportPortal layer="modal">
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          delayInitialFocus: false,
          initialFocus: () => closeRef.current ?? false,
          setReturnFocus: (previous: HTMLElement | SVGElement) => returnFocus() ?? previous,
        }}
      >
        <div
          className="media-inspector"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
          onClick={close}
        >
          <div
            className="media-inspector__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={captionId}
            // Clicking non-interactive content keeps focus in the dialog, so Escape still reaches it.
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="media-inspector__header">
              <h2 id={titleId} className="media-inspector__title">
                {label} evidence
              </h2>
              {hasStill && (
                <div className="media-inspector__views">
                  <div role="group" aria-label="View" className="media-inspector__view-group">
                    <button
                      type="button"
                      className="project-media__control"
                      aria-pressed={view === "recording"}
                      onClick={() => showView("recording")}
                    >
                      recording
                    </button>
                    <button
                      type="button"
                      className="project-media__control"
                      aria-pressed={view === "still"}
                      onClick={() => showView("still")}
                    >
                      still frame
                    </button>
                  </div>
                  {view === "still" && (
                    <button
                      type="button"
                      className="project-media__control"
                      aria-pressed={actualSize}
                      onClick={() => setActualSize((value) => !value)}
                    >
                      actual size
                    </button>
                  )}
                </div>
              )}
              <button
                ref={closeRef}
                type="button"
                className="project-media__control"
                onClick={close}
                aria-label={`Close ${label} evidence viewer`}
              >
                close
              </button>
            </div>

            <div ref={stageRef} className="media-inspector__stage">
              <video
                ref={videoRef}
                className="media-inspector__asset"
                hidden={view !== "recording"}
                width={video.width}
                height={video.height}
                poster={poster.src}
                aria-label={video.label}
                controls
                muted
                playsInline
                preload="auto"
                onPlay={() => {
                  playedRef.current = true;
                  pausedBySwitchRef.current = false;
                }}
              >
                <source src={video.src} type="video/mp4" />
              </video>
              {hasStill && view === "still" && (
                <div
                  className={`media-inspector__still${actualSize ? " is-actual-size" : ""}`}
                  role="region"
                  aria-label={actualSize ? "Still frame at actual size; scroll to pan" : "Still frame"}
                  tabIndex={actualSize ? 0 : undefined}
                >
                  <img
                    className="media-inspector__asset"
                    src={poster.src}
                    alt={poster.alt}
                    width={poster.width}
                    height={poster.height}
                    decoding="async"
                  />
                </div>
              )}
            </div>

            <MediaCaption
              id={captionId}
              className="media-inspector__caption"
              video={video}
            />
          </div>
        </div>
      </FocusTrap>
    </ViewportPortal>
  );
};

export default MediaInspector;
