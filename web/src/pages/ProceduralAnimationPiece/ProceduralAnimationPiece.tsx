import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faExpand } from "@fortawesome/free-solid-svg-icons";
import type { ProceduralAnimation } from "../../data/proceduralAnimations";
import "./ProceduralAnimationPiece.css";

interface ProceduralAnimationPieceProps {
  piece: ProceduralAnimation;
}

// The artifact runs in its own same-origin document, so its scripts, styles,
// timing, controls, and reduced-motion handling stay exactly as authored.
const ProceduralAnimationPiece = ({ piece }: ProceduralAnimationPieceProps) => {
  const pieceRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const canFullscreen = document.fullscreenEnabled;

  // Keyboard focus on the artwork (§13 Focus). The frame's document takes the
  // focus, so the frame element never matches :focus-visible here; instead the
  // frame window's focus and blur mark the page while the focus arrived by Tab,
  // and the stylesheet draws the ring. A pointer press clears the mark, so a
  // click into the artwork shows no ring; in fullscreen none is drawn.
  useEffect(() => {
    const page = pieceRef.current;
    const frame = frameRef.current;
    if (!page || !frame) return;
    let keyboard = false;
    let inner: Window | null = null;
    const show = () => {
      if (keyboard && !document.fullscreenElement) page.setAttribute("data-frame-focus", "");
    };
    const hide = () => page.removeAttribute("data-frame-focus");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") keyboard = true;
    };
    const onPointerDown = () => {
      keyboard = false;
      hide();
    };
    // Entering fullscreen hides the ring; on leaving, it returns if the artwork still holds keyboard focus.
    const onFullscreen = () => {
      if (document.fullscreenElement) hide();
      else if (document.activeElement === frame) show();
    };
    const detach = () => {
      inner?.removeEventListener("focus", show);
      inner?.removeEventListener("blur", hide);
      inner?.removeEventListener("pointerdown", onPointerDown, true);
      inner = null;
    };
    // The frame's window gets a new inner window on each load, so listen again then.
    const attach = () => {
      detach();
      inner = frame.contentWindow;
      inner?.addEventListener("focus", show);
      inner?.addEventListener("blur", hide);
      inner?.addEventListener("pointerdown", onPointerDown, true);
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("fullscreenchange", onFullscreen);
    frame.addEventListener("load", attach);
    if (frame.contentDocument?.readyState === "complete" && frame.contentWindow?.location.href !== "about:blank") attach();
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("fullscreenchange", onFullscreen);
      frame.removeEventListener("load", attach);
      detach();
      hide();
    };
  }, []);

  // Esc leaves fullscreen natively. Entering moves focus into the piece so its
  // keyboard controls work instead of re-pressing this hidden button.
  const enterFullscreen = () => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.requestFullscreen().then(() => frame.focus(), () => undefined);
  };

  return (
    <main ref={pieceRef} className="animation-piece">
      <div className="animation-piece__bar">
        <Link to="/procedural-animations" className="animation-piece__control df-control df-control--light df-label">
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Back to Animations
        </Link>
        <h1 className="animation-piece__title df-heading-3">{piece.title}</h1>
        {canFullscreen && (
          <button type="button" className="animation-piece__control df-control df-control--light df-label" aria-label="Fullscreen" onClick={enterFullscreen}>
            <FontAwesomeIcon icon={faExpand} aria-hidden="true" />
            <span className="animation-piece__label">Fullscreen</span>
          </button>
        )}
      </div>
      <iframe
        ref={frameRef}
        className="animation-piece__frame"
        src={piece.artifactPath}
        title={`${piece.title}, procedural animation`}
      />
    </main>
  );
};

export default ProceduralAnimationPiece;
