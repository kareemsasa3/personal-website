import MatrixRain3DBackground from "../../components/MatrixRain3DBackground/MatrixRain3DBackground";
import { useLayoutContext } from "../../contexts/LayoutContext";
import { useReducedMotion } from "framer-motion";
import RhythmLabGame from "../../components/RhythmLab";
import "./RhythmLab.css";

const RhythmLab = () => {
  const { isAnimationPaused, backgroundMotionSpeed } = useLayoutContext();
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="rhythm-lab-page">
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
