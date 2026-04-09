import type { CSSProperties } from "react";
import "./StaticBackground.css";

interface StaticBackgroundProps {
  paused: boolean;
  motionSpeed: number;
  reducedMotion: boolean;
}

const StaticBackground = ({
  paused,
  motionSpeed,
  reducedMotion,
}: StaticBackgroundProps) => {
  const style = {
    "--background-motion-speed": String(motionSpeed),
  } as CSSProperties;

  return (
    <div
      className={`static-background ${
        paused || reducedMotion ? "static-background--motion-disabled" : ""
      }`}
      style={style}
      aria-hidden="true"
    >
      <div className="static-background__base" />
      <div className="static-background__grid" />
      <div className="static-background__topology" />
      <div className="static-background__signals" />
    </div>
  );
};

export default StaticBackground;
