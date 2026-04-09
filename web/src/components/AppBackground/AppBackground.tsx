import { useReducedMotion } from "framer-motion";
import MatrixBackground from "../MatrixBackground/MatrixBackground";
import MatrixRain3DBackground from "../MatrixRain3DBackground/MatrixRain3DBackground";
import StaticBackground from "../StaticBackground/StaticBackground";
import { useLayoutContext } from "../../contexts/LayoutContext";
import { useTheme } from "../../contexts/ThemeContext";

const DARK_THEME_BACKGROUND_VARIANT = "matrix-rain-3d" as const;

const AppBackground = () => {
  const { theme } = useTheme();
  const { isAnimationPaused, backgroundMotionSpeed } = useLayoutContext();
  const reducedMotion = useReducedMotion() ?? false;

  if (theme === "dark") {
    if (DARK_THEME_BACKGROUND_VARIANT === "matrix-rain-3d") {
      return (
        <MatrixRain3DBackground
          theme={theme}
          paused={isAnimationPaused}
          motionSpeed={backgroundMotionSpeed}
          reducedMotion={reducedMotion}
        />
      );
    }

    return (
      <MatrixBackground
        theme={theme}
        paused={isAnimationPaused}
        motionSpeed={backgroundMotionSpeed}
        reducedMotion={reducedMotion}
      />
    );
  }

  return (
    <StaticBackground
      paused={isAnimationPaused}
      motionSpeed={backgroundMotionSpeed}
      reducedMotion={reducedMotion}
    />
  );
};

export default AppBackground;
