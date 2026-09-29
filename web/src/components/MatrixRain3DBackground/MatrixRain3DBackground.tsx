// @refresh reset
// Recreate procedural stream state when the renderer changes during development.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "../../contexts/ThemeContext";
import "./MatrixRain3DBackground.css";

const MATRIX_GLYPHS = "0123456789ABCDEF";
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
  depth: number;
  speed: number;
  length: number;
  opacity: number;
  glyphs: string[];
  glyphChangeMs: number[];
}

interface ViewportConfig {
  width: number;
  height: number;
  dpr: number;
  isCompactViewport: boolean;
  streamCount: number;
  maxLength: number;
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
    streamCount: Math.max(isCompactViewport ? 8 : 24, Math.floor(width / (isCompactViewport ? 40 : 30))),
    maxLength: isCompactViewport ? 13 : 20,
    minFontSize: isCompactViewport ? 9 : 8,
    maxFontSize: isCompactViewport ? 18 : 22,
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

const glyphChangeInterval = () => 900 + Math.random() * 3100;

const streamFontSize = (stream: Stream, config: ViewportConfig) =>
  config.minFontSize + stream.depth * (config.maxFontSize - config.minFontSize);

const createStream = (config: ViewportConfig, column: number, initial = false): Stream => {
  const minLength = config.isCompactViewport ? 6 : 8;
  const length = Math.floor(Math.random() * (config.maxLength - minLength + 1)) + minLength;
  const glyphs = Array.from({ length }, randomGlyph);
  // Bias toward distant streams, with a few larger, brighter foreground ones.
  const depth = Math.pow(Math.random(), 1.8);

  return {
    // Distribute in screen space so distant streams also reach the outer edges.
    x: ((column + 0.2 + Math.random() * 0.6) / config.streamCount) * config.width,
    y: initial
      ? Math.random() * config.height
      : -40 - Math.random() * config.height * 0.3,
    depth,
    speed: 0.45 + Math.random() * 0.95,
    length,
    opacity: 0.25 + depth * 0.4 + Math.random() * 0.1,
    glyphs,
    glyphChangeMs: glyphs.map(() => glyphChangeInterval()),
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
    x: stream.x * widthRatio * previousViewport.streamCount / nextViewport.streamCount,
    y: stream.y * heightRatio,
    length: Math.min(stream.length, nextViewport.maxLength),
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
  const motionSpeedRef = useRef(motionSpeed);
  const lastTimeRef = useRef<number | null>(null);
  const drawFrameRef = useRef<() => void>(() => {});
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Speed changes should preserve the active loop and its accumulated trails.
    motionSpeedRef.current = motionSpeed;
  }, [motionSpeed]);

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
      const currentMotionSpeed = motionSpeedRef.current;

      const backgroundFill = theme === "dark" ? DARK_BACKGROUND_FILL : "#f5f5f5";
      const glyphRgb = theme === "dark" ? [102, 255, 136] : [44, 44, 44];
      const leadRgb = theme === "dark" ? "232, 255, 238" : "255, 255, 255";
      const baseTrailAlpha = theme === "dark" ? DARK_TRAIL_FADE_ALPHA : LIGHT_TRAIL_FADE_ALPHA;
      // Normalize both erasing and depositing ink to elapsed time, including on
      // high-refresh displays, so the trails don't become brighter or shorter.
      const frameAlpha = (alpha: number) => animate
        ? 1 - Math.pow(1 - alpha, deltaMultiplier)
        : alpha;
      const trailAlpha = animate ? frameAlpha(baseTrailAlpha) : 1;

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

      for (const [column, stream] of streamsRef.current.entries()) {
        if (animate) {
          stream.y += stream.speed * currentMotionSpeed * deltaMultiplier * 2.2 * (0.35 + stream.depth * 0.65);

          const tailY = stream.y - (stream.length - 1) * streamFontSize(stream, viewport) * 1.3;
          if (tailY > viewport.height + 40) {
            Object.assign(stream, createStream(viewport, column));
          }

          for (let index = 0; index < stream.length; index += 1) {
            stream.glyphChangeMs[index] -= deltaMultiplier * 16.67 * currentMotionSpeed;
            if (stream.glyphChangeMs[index] <= 0) {
              stream.glyphs[index] = randomGlyph();
              stream.glyphChangeMs[index] = glyphChangeInterval();
            }
          }
        }

        const screenX = stream.x;
        const headY = stream.y;
        const fontSize = streamFontSize(stream, viewport);
        const glyphStep = fontSize * 1.3;
        const proximityBoost = stream.depth;
        const centerDistance = (screenX / viewport.width - 0.5) / 0.23;
        const contentDimming = 1 - 0.3 * Math.exp(-centerDistance * centerDistance);

        context.font = `${fontSize}px 'Courier New', monospace`;

        for (let index = 0; index < stream.length; index += 1) {
          const glyphY = headY - index * glyphStep;
          if (glyphY < -30 || glyphY > viewport.height + 30) continue;

          const fade = Math.pow(1 - index / stream.length, 1.6);
          const alpha = fade * stream.opacity * contentDimming;
          if (index === 0) {
            const headAlpha = Math.min(0.95, (stream.opacity + 0.12 + proximityBoost * 0.15) * contentDimming);
            context.shadowBlur =
              viewport.headGlowBlurBase +
              proximityBoost * viewport.headGlowBlurRange;
            context.shadowColor =
              theme === "dark"
                ? `rgba(142, 255, 172, ${Math.min(DARK_HEAD_GLOW_ALPHA_CAP, headAlpha * 0.32)})`
                : `rgba(255, 255, 255, ${Math.min(0.3, headAlpha * 0.35)})`;
            context.fillStyle = `rgba(${leadRgb}, ${frameAlpha(headAlpha)})`;
          } else {
            const depthTint = 0.7 + proximityBoost * 0.3;
            const greenAlpha = alpha * (0.78 + fade * 0.18);
            const [red, green, blue] = glyphRgb;
            context.shadowBlur = 0;
            context.shadowColor = "transparent";
            context.fillStyle = `rgba(${Math.round(red * depthTint)}, ${Math.round(
              green * depthTint
            )}, ${Math.round(blue * (0.76 + proximityBoost * 0.24))}, ${frameAlpha(greenAlpha)})`;
          }
          context.fillText(stream.glyphs[index], screenX, glyphY);
        }

        context.shadowBlur = 0;
        context.shadowColor = "transparent";
      }
    },
    [theme]
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
      streamsRef.current = Array.from({ length: viewport.streamCount }, (_, column) =>
        createStream(viewport, column, true)
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
          ...Array.from({ length: streamDelta }, (_, column) =>
            createStream(viewport, resizedStreams.length + column, true)
          )
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
