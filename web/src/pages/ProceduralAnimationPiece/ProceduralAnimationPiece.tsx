import { useRef } from "react";
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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const canFullscreen = document.fullscreenEnabled;

  // Esc leaves fullscreen natively. Entering moves focus into the piece so its
  // keyboard controls work instead of re-pressing this hidden button.
  const enterFullscreen = () => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.requestFullscreen().then(() => frame.focus(), () => undefined);
  };

  return (
    <main className="animation-piece">
      <div className="animation-piece__bar">
        <Link to="/procedural-animations" className="animation-piece__control">
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Back to Animations
        </Link>
        <h1 className="animation-piece__title">{piece.title}</h1>
        {canFullscreen && (
          <button type="button" className="animation-piece__control" onClick={enterFullscreen}>
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
