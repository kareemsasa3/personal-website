import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSnakeGame } from "./useSnakeGame";
import "./SnakeGame.css";

const CELL_SIZE = 20; // Fixed cell size, grid dimensions become dynamic

const SnakeGame: React.FC = () => {
  const [dimensions, setDimensions] = useState(() => ({
    width: Math.ceil(window.innerWidth / CELL_SIZE),
    height: Math.ceil(window.innerHeight / CELL_SIZE),
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const { snake, food, score, highScore, gameState, resetGame, changeDirection } = useSnakeGame({
    gridWidth: dimensions.width,
    gridHeight: dimensions.height,
  });

  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const foodElementRef = useRef<HTMLDivElement>(null);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('touchstart', () => setIsTouchDevice(true), { once: true });
  }, []);

  // Recalculate grid dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDimensions({ width: Math.max(1, Math.floor(rect.width / CELL_SIZE)), height: Math.max(1, Math.floor(rect.height / CELL_SIZE)) });
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Touch control handlers
  const handleDirection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const directionMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    changeDirection(directionMap[direction]);
  }, [changeDirection]);

  // A touch button acts on contact (touchstart). The click a browser still sends after a tap is skipped, since React's
  // touch listeners are passive and preventDefault there cannot cancel it; a click from the keyboard (Enter, with no
  // pointer behind it) or from a mouse acts, so a press the control acknowledges always moves the snake, once. A mouse
  // contact clears the flag, so a touch that ended without a click (cancelled, slid off) never swallows a mouse click.
  const touchedRef = useRef(false);
  const handleTouchClick = useCallback((event: React.MouseEvent, direction: 'up' | 'down' | 'left' | 'right') => {
    if (event.detail !== 0 && touchedRef.current) {
      touchedRef.current = false;
      return;
    }
    handleDirection(direction);
  }, [handleDirection]);

  // High-performance animation loop for snake segments
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      snake.forEach((segment, index) => {
        const element = segmentRefs.current.get(index);
        if (element) {
          element.style.transform = `translate(${segment.x * CELL_SIZE}px, ${segment.y * CELL_SIZE}px)`;
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [snake, gameState]);

  // Update food position
  useEffect(() => {
    if (foodElementRef.current) {
      foodElementRef.current.style.left = `${food.x * CELL_SIZE}px`;
      foodElementRef.current.style.top = `${food.y * CELL_SIZE}px`;
    }
  }, [food]);

  // Memoize board dimensions
  const boardStyle = useMemo(() => ({
    width: dimensions.width * CELL_SIZE,
    height: dimensions.height * CELL_SIZE,
  }), [dimensions]);

  return (
    <div className="snake-game-container" ref={containerRef}>
      <div className="game-scores">
        <p className="game-score df-data">Score: {score}</p>
        <p className="game-high-score df-data">High: {highScore}</p>
      </div>

      {/* Native playfield (D6; P5-5): only the snake and the food are drawn in it. */}
      <div className="game-board" data-df-region="native" style={boardStyle}>
        {snake.map((_segment, index) => (
          <div
            key={index}
            className={`snake-segment ${index === 0 ? "snake-head" : ""}`}
            ref={(el) => {
              if (el) segmentRefs.current.set(index, el);
            }}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          />
        ))}

        <div
          className="food"
          ref={foodElementRef}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
          }}
        />
      </div>

      {gameState === "gameOver" && (
        <div className="game-over-overlay">
          <div className="game-over-content df-cut-md">
            <h2 className="df-heading-2">Game Over</h2>
            <p className="df-body">Final Score: {score}</p>
            <button onClick={resetGame} className="play-again-button df-control df-label">
              Play Again
            </button>
          </div>
        </div>
      )}

      {gameState === "paused" && (
        <div className="game-overlay">
          <div className="game-over-content df-cut-md">
            <h2 className="df-heading-2">Paused</h2>
            <p className="df-body">Press Space to resume</p>
          </div>
        </div>
      )}

      {/* Mobile touch controls */}
      {isTouchDevice && (
        <div className="touch-controls">
          <button
            className="touch-btn touch-up df-control df-glyph-2x"
            onTouchStart={(e) => { e.preventDefault(); touchedRef.current = true; handleDirection('up'); }}
            onClick={(e) => handleTouchClick(e, 'up')}
            onPointerDown={(e) => { if (e.pointerType === "mouse") touchedRef.current = false; }}
            aria-label="Move up"
          >
            ▲
          </button>
          <div className="touch-middle-row">
            <button
              className="touch-btn touch-left df-control df-glyph-2x"
              onTouchStart={(e) => { e.preventDefault(); touchedRef.current = true; handleDirection('left'); }}
              onClick={(e) => handleTouchClick(e, 'left')}
              onPointerDown={(e) => { if (e.pointerType === "mouse") touchedRef.current = false; }}
              aria-label="Move left"
            >
              ◀
            </button>
            <button
              className="touch-btn touch-right df-control df-glyph-2x"
              onTouchStart={(e) => { e.preventDefault(); touchedRef.current = true; handleDirection('right'); }}
              onClick={(e) => handleTouchClick(e, 'right')}
              onPointerDown={(e) => { if (e.pointerType === "mouse") touchedRef.current = false; }}
              aria-label="Move right"
            >
              ▶
            </button>
          </div>
          <button
            className="touch-btn touch-down df-control df-glyph-2x"
            onTouchStart={(e) => { e.preventDefault(); touchedRef.current = true; handleDirection('down'); }}
            onClick={(e) => handleTouchClick(e, 'down')}
            onPointerDown={(e) => { if (e.pointerType === "mouse") touchedRef.current = false; }}
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
};

export default SnakeGame;