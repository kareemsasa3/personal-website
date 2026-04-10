import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "../../contexts/ThemeContext";
import "./MatrixRain3DBackground.css";

const MATRIX_GLYPHS = "0123456789ABCDEF";
const FAR_PLANE = 1200;
const NEAR_PLANE = 140;
const DARK_BACKGROUND_FILL = "#050506";
const DARK_TRAIL_FADE_ALPHA = 0.28;
const LIGHT_TRAIL_FADE_ALPHA = 0.18;
const DARK_HEAD_GLOW_ALPHA_CAP = 0.28;
const COMPACT_VIEWPORT_WIDTH = 768;
const MOBILE_HEIGHT_IGNORE_THRESHOLD = 24;
const MOBILE_HEIGHT_LIGHT_RESIZE_THRESHOLD = 160;

type ResizeMode = "ignore" | "light" | "full";

interface MatrixRain3DBackgroundProps {
  theme: Theme;
  paused: boolean;
  motionSpeed: number;
  reducedMotion: boolean;
}

interface Stream {
  x: number;
  y: number;
  z: number;
  speed: number;
  length: number;
  opacity: number;
  glyphs: string[];
}

interface ViewportConfig {
  width: number;
  height: number;
  dpr: number;
  isCompactViewport: boolean;
  focalLength: number;
  streamCount: number;
  maxLength: number;
  glyphStep: number;
  minFontSize: number;
  maxFontSize: number;
  headGlowBlurBase: number;
  headGlowBlurRange: number;
}

const randomGlyph = () =>
  MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];

const clampDpr = (isCompactViewport: boolean) =>
  Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1.35 : 1.5);

const readWindowViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const createViewportConfig = (
  width: number,
  height: number,
  dpr: number
): ViewportConfig => {
  const isCompactViewport = width <= COMPACT_VIEWPORT_WIDTH;

  return {
    width,
    height,
    dpr,
    isCompactViewport,
    focalLength: Math.max(260, width * (isCompactViewport ? 0.42 : 0.5)),
    streamCount: Math.max(24, Math.floor(width / (isCompactViewport ? 34 : 28))),
    maxLength: isCompactViewport ? 16 : 20,
    glyphStep: isCompactViewport ? 16 : 18,
    minFontSize: isCompactViewport ? 9 : 8,
    maxFontSize: isCompactViewport ? 24 : 22,
    headGlowBlurBase: isCompactViewport ? 4.5 : 6,
    headGlowBlurRange: isCompactViewport ? 7 : 10,
  };
};

const getResizeMode = (
  previousViewport: ViewportConfig | null,
  nextWidth: number,
  nextHeight: number
) : ResizeMode => {
  if (!previousViewport || nextWidth > COMPACT_VIEWPORT_WIDTH) {
    return "full";
  }

  if (previousViewport.width !== nextWidth) {
    return "full";
  }

  const heightDelta = Math.abs(previousViewport.height - nextHeight);
  if (heightDelta <= MOBILE_HEIGHT_IGNORE_THRESHOLD) {
    return "ignore";
  }

  if (heightDelta <= MOBILE_HEIGHT_LIGHT_RESIZE_THRESHOLD) {
    return "light";
  }

  return "full";
};

const createStream = (config: ViewportConfig, initial = false): Stream => {
  const length = Math.floor(Math.random() * (config.maxLength - 8)) + 8;
  const glyphs = Array.from({ length }, randomGlyph);

  return {
    x: (Math.random() - 0.5) * config.width * 1.2,
    y: initial
      ? (Math.random() - 0.5) * config.height * 1.4
      : -config.height * (0.65 + Math.random() * 0.55),
    z: NEAR_PLANE + Math.random() * (FAR_PLANE - NEAR_PLANE),
    speed: 0.45 + Math.random() * 0.95,
    length,
    opacity: 0.35 + Math.random() * 0.4,
    glyphs,
  };
};

const resizeStreamToViewport = (
  stream: Stream,
  previousViewport: ViewportConfig,
  nextViewport: ViewportConfig
): Stream => {
  const widthRatio =
    previousViewport.width > 0 ? nextViewport.width / previousViewport.width : 1;
  const heightRatio =
    previousViewport.height > 0
      ? nextViewport.height / previousViewport.height
      : 1;

  return {
    ...stream,
    x: stream.x * widthRatio,
    y: stream.y * heightRatio,
  };
};

const resizeStreamHeightOnly = (
  stream: Stream,
  previousViewport: ViewportConfig,
  nextViewport: ViewportConfig
): Stream => {
  const heightRatio =
    previousViewport.height > 0
      ? nextViewport.height / previousViewport.height
      : 1;

  return {
    ...stream,
    y: stream.y * heightRatio,
  };
};

const MatrixRain3DBackground = ({
  theme,
  paused,
  motionSpeed,
  reducedMotion,
}: MatrixRain3DBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const viewportRef = useRef<ViewportConfig | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const streamsRef = useRef<Stream[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const drawFrameRef = useRef<() => void>(() => {});
  const [isVisible, setIsVisible] = useState(true);

  const syncCanvasStyleToViewport = useCallback(
    (canvas: HTMLCanvasElement, viewport: ViewportConfig) => {
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
    },
    []
  );

  const renderScene = useCallback(
    (animate: boolean, deltaMultiplier = 1) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      const viewport = viewportRef.current;
      if (!canvas || !context || !viewport) return;

      const backgroundFill = theme === "dark" ? DARK_BACKGROUND_FILL : "#f5f5f5";
      const glyphRgb = theme === "dark" ? [102, 255, 136] : [44, 44, 44];
      const leadRgb = theme === "dark" ? "232, 255, 238" : "255, 255, 255";
      const trailAlpha = animate
        ? theme === "dark"
          ? DARK_TRAIL_FADE_ALPHA
          : LIGHT_TRAIL_FADE_ALPHA
        : 1;
      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;

      context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      context.fillStyle =
        theme === "dark"
          ? `rgba(5, 5, 6, ${trailAlpha})`
          : `rgba(245, 245, 245, ${trailAlpha})`;
      context.fillRect(0, 0, viewport.width, viewport.height);

      if (!animate) {
        context.fillStyle = backgroundFill;
        context.fillRect(0, 0, viewport.width, viewport.height);
      }

      context.textAlign = "center";
      context.textBaseline = "middle";

      for (const stream of streamsRef.current) {
        if (animate) {
          stream.y += stream.speed * motionSpeed * deltaMultiplier * 2.2;

          if (stream.y > viewport.height * 1.1) {
            Object.assign(stream, createStream(viewport, false));
          }
        }

        const depth = FAR_PLANE - stream.z;
        const perspective = viewport.focalLength / (depth + viewport.focalLength);
        const screenX = centerX + stream.x * perspective;
        const headY = centerY + stream.y * perspective;
        const fontSize = Math.max(
          viewport.minFontSize,
          Math.min(viewport.maxFontSize, 12 + perspective * 10)
        );
        const proximityBoost = Math.min(1, Math.max(0, (perspective - 0.16) / 0.72));

        context.font = `${fontSize}px 'Courier New', monospace`;

        for (let index = 0; index < stream.length; index += 1) {
          const glyphY = headY - index * viewport.glyphStep * perspective;
          if (glyphY < -30 || glyphY > viewport.height + 30) continue;

          const fade = Math.max(0, 1 - index / stream.length);
          const alpha = fade * stream.opacity * Math.max(0.28, perspective);
          if (index === 0) {
            const headAlpha = Math.min(0.98, alpha + 0.24 + proximityBoost * 0.08);
            context.shadowBlur =
              viewport.headGlowBlurBase +
              proximityBoost * viewport.headGlowBlurRange;
            context.shadowColor =
              theme === "dark"
                ? `rgba(142, 255, 172, ${Math.min(DARK_HEAD_GLOW_ALPHA_CAP, headAlpha * 0.32)})`
                : `rgba(255, 255, 255, ${Math.min(0.3, headAlpha * 0.35)})`;
            context.fillStyle = `rgba(${leadRgb}, ${headAlpha})`;
          } else {
            const depthTint = 0.7 + proximityBoost * 0.3;
            const greenAlpha = alpha * (0.78 + fade * 0.18);
            const [red, green, blue] = glyphRgb;
            context.shadowBlur = 0;
            context.shadowColor = "transparent";
            context.fillStyle = `rgba(${Math.round(red * depthTint)}, ${Math.round(
              green * depthTint
            )}, ${Math.round(blue * (0.76 + proximityBoost * 0.24))}, ${greenAlpha})`;
          }
          context.fillText(stream.glyphs[index], screenX, glyphY);
        }

        context.shadowBlur = 0;
        context.shadowColor = "transparent";
      }
    },
    [motionSpeed, theme]
  );

  const drawStaticFrame = useCallback(() => {
    renderScene(false);
  }, [renderScene]);

  drawFrameRef.current = drawStaticFrame;

  const animateFrame = useCallback(
    (timestamp: number) => {
      const previousTime = lastTimeRef.current ?? timestamp;
      const deltaMs = Math.min(40, timestamp - previousTime);
      lastTimeRef.current = timestamp;

      renderScene(true, deltaMs / 16.67);
      frameRef.current = requestAnimationFrame(animateFrame);
    },
    [renderScene]
  );

  const stopAnimation = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const syncCanvasToViewport = useCallback(
    (canvas: HTMLCanvasElement, viewport: ViewportConfig) => {
      canvas.width = Math.floor(viewport.width * viewport.dpr);
      canvas.height = Math.floor(viewport.height * viewport.dpr);
      syncCanvasStyleToViewport(canvas, viewport);

      const context = canvas.getContext("2d");
      if (context) {
        context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      }
    },
    [syncCanvasStyleToViewport]
  );

  const setupViewport = useCallback((force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = readWindowViewport();
    const previousViewport = viewportRef.current;
    const resizeMode = force ? "full" : getResizeMode(previousViewport, width, height);

    if (resizeMode === "ignore") {
      return;
    }

    const isCompactViewport = width <= COMPACT_VIEWPORT_WIDTH;
    const dpr = clampDpr(isCompactViewport);
    const viewport = createViewportConfig(width, height, dpr);

    viewportRef.current = viewport;

    if (!previousViewport) {
      syncCanvasToViewport(canvas, viewport);
      streamsRef.current = Array.from({ length: viewport.streamCount }, () =>
        createStream(viewport, true)
      );
    } else if (resizeMode === "light") {
      syncCanvasStyleToViewport(canvas, viewport);
      streamsRef.current = streamsRef.current.map((stream) =>
        resizeStreamHeightOnly(stream, previousViewport, viewport)
      );
    } else {
      syncCanvasToViewport(canvas, viewport);
      const resizedStreams = streamsRef.current.map((stream) =>
        resizeStreamToViewport(stream, previousViewport, viewport)
      );
      const streamDelta = viewport.streamCount - resizedStreams.length;

      if (streamDelta > 0) {
        resizedStreams.push(
          ...Array.from({ length: streamDelta }, () => createStream(viewport, true))
        );
      } else if (streamDelta < 0) {
        resizedStreams.length = viewport.streamCount;
      }

      streamsRef.current = resizedStreams;
    }

    drawFrameRef.current();
  }, [syncCanvasStyleToViewport, syncCanvasToViewport]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    setupViewport(true);

    const handleResize = () => {
      if (resizeFrameRef.current != null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        setupViewport();
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrameRef.current != null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      stopAnimation();
    };
  }, [setupViewport, stopAnimation]);

  useEffect(() => {
    drawStaticFrame();
  }, [drawStaticFrame]);

  useEffect(() => {
    // Reduced motion and explicit pause both intentionally collapse to a frozen frame.
    if (reducedMotion || paused || !isVisible) {
      stopAnimation();
      drawStaticFrame();
      return;
    }

    if (frameRef.current == null) {
      frameRef.current = requestAnimationFrame(animateFrame);
    }

    return () => {
      stopAnimation();
    };
  }, [animateFrame, drawStaticFrame, isVisible, paused, reducedMotion, stopAnimation]);

  return (
    <canvas
      ref={canvasRef}
      className={`matrix-rain-3d-background ${paused ? "animation-paused" : ""}`}
      aria-hidden="true"
    />
  );
};

export default MatrixRain3DBackground;
