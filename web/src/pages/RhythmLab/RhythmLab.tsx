import MatrixRain3DBackground from "../../components/MatrixRain3DBackground/MatrixRain3DBackground";
import { useLayoutContext } from "../../contexts/LayoutContext";
import { useTheme } from "../../contexts/useTheme";
import { useReducedMotion } from "framer-motion";
import RhythmLabGame from "../../components/RhythmLab";
import "./RhythmLab.css";

const RhythmLab = () => {
  const { isAnimationPaused, backgroundMotionSpeed } = useLayoutContext();
  const reducedMotion = useReducedMotion() ?? false;
  const { theme } = useTheme();

  // The held rain is always dark, so in Light the page renders the Dark token set (P5-1); Dark and Mono follow the site.
  return (
    <div className="rhythm-lab-page" data-theme={theme === "light" ? "dark" : undefined}>
      <div className="rhythm-lab-background" aria-hidden="true">
        <MatrixRain3DBackground
          theme="dark"
          paused={isAnimationPaused}
          motionSpeed={backgroundMotionSpeed}
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="rhythm-lab-content">
        <RhythmLabGame />
      </div>
    </div>
  );
};

export default RhythmLab;
