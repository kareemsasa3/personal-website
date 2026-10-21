import React from "react";
import ReactDOM from "react-dom";
import "./PageLoader.css";

// What the loader says. Nothing more specific about the load can be observed, so the line is generic; a long wait
// replaces it once at each owner-set threshold (owner decision, 2026-10-21). Neither message implies a failure.
const LOADING_MESSAGE = "Loading the page.";
const SLOW_MESSAGE = "Still loading. This is taking longer than expected.";
const VERY_SLOW_MESSAGE = "Still waiting for the page to load.";
const SLOW_AFTER_SECONDS = 10;
const VERY_SLOW_AFTER_SECONDS = 30;
const messageFor = (seconds: number) =>
  seconds >= VERY_SLOW_AFTER_SECONDS ? VERY_SLOW_MESSAGE : seconds >= SLOW_AFTER_SECONDS ? SLOW_MESSAGE : LOADING_MESSAGE;

// The counter shows whole seconds since the loader appeared, as mm:ss (owner decision). It is time spent, not progress.
const SECOND_MS = 1000;
const elapsedText = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

// §12 Create / remove: the overlay leaves with a fade (PageLoader.css). Suspense removes the fallback at once, so a
// silent, inert copy of its last frame plays the leave and removes itself when that animation ends.
const leave = (overlay: HTMLElement) => {
  const copy = overlay.cloneNode(true) as HTMLElement;
  for (const el of [copy, ...copy.querySelectorAll<HTMLElement>("[role], [aria-live]")]) {
    el.removeAttribute("role");
    el.removeAttribute("aria-live");
  }
  copy.setAttribute("aria-hidden", "true");
  copy.setAttribute("inert", "");
  copy.classList.add("page-loader-overlay--leaving");
  // The scan cell holds where it was.
  const scan = overlay.querySelector<HTMLElement>(".page-loader__scan");
  const scanCopy = copy.querySelector<HTMLElement>(".page-loader__scan");
  if (scan && scanCopy) scanCopy.style.left = getComputedStyle(scan).left;
  queueMicrotask(() => {
    // Still in the document: not a removal (React's development checks re-run effects on a mounted loader).
    if (overlay.isConnected) return;
    const root = document.getElementById("portal-root");
    if (!root) return;
    root.prepend(copy);
    if (getComputedStyle(copy).animationName === "none") {
      copy.remove();
      return;
    }
    const done = (event: AnimationEvent) => {
      if (event.target !== copy) return;
      copy.removeEventListener("animationend", done);
      copy.removeEventListener("animationcancel", done);
      copy.remove();
    };
    copy.addEventListener("animationend", done);
    copy.addEventListener("animationcancel", done);
  });
};

const PageLoader: React.FC = () => {
  const [elapsed, setElapsed] = React.useState(0);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // The counter is a value, not motion: it counts under reduced motion too. The long-wait messages derive from it.
  React.useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(Math.floor((performance.now() - start) / SECOND_MS)), SECOND_MS);
    return () => window.clearInterval(id);
  }, []);

  React.useLayoutEffect(() => {
    const overlay = overlayRef.current;
    return () => {
      if (overlay) leave(overlay);
    };
  }, []);

  // The polite status holds only the state word and the message, so a message change is announced once; the
  // counter sits outside it.
  const loaderElement = (
    <div ref={overlayRef} className="page-loader-overlay">
      <div className="loader-content">
        <div className="page-loader__row">
          <div className="page-loader__status" role="status" aria-live="polite">
            <span className="page-loader__state df-label">LOADING</span>
            <p className="loading-text df-body-sm">{messageFor(elapsed)}</p>
          </div>
          <span className="page-loader__elapsed df-annotation" role="timer" aria-live="off">
            {elapsedText(elapsed)}
          </span>
          <span className="page-loader__scan" aria-hidden="true" />
        </div>
      </div>
    </div>
  );

  // Render into the portal root to ensure it's on top of everything
  return ReactDOM.createPortal(
    loaderElement,
    document.getElementById("portal-root")!
  );
};

export default PageLoader;
