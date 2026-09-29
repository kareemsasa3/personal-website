import { useReducer, useCallback, useEffect, useRef } from "react";
import { debounce } from "../utils";

interface Position {
  x: number;
  y: number;
}

interface WindowState {
  position: Position | null;
  isMaximized: boolean;
  isMinimized: boolean;
  isDragging: boolean;
  dragOffset: Position;
}

type WindowAction =
  | { type: "INITIALIZE"; payload: { width: number; height: number } }
  | { type: "DRAG_START"; payload: { clientX: number; clientY: number; position: Position } }
  | { type: "DRAG_MOVE"; payload: { clientX: number; clientY: number } }
  | { type: "DRAG_END" }
  | { type: "MAXIMIZE" }
  | { type: "MINIMIZE" }
  | { type: "RESTORE" }
  | { type: "RESIZE"; payload: { width: number; height: number } };

interface UseWindowManagementOptions {
  initialWidth: number;
  initialHeight: number;
  isIntro?: boolean;
  onClose?: () => void;
}

const windowReducer = (
  state: WindowState,
  action: WindowAction
): WindowState => {
  switch (action.type) {
    case "INITIALIZE": {
      const { width, height } = action.payload;
      const position = {
        x: (window.innerWidth - width) / 2,
        y: (window.innerHeight - height) / 2,
      };
      return { ...state, position };
    }

    case "DRAG_START": {
      if (!state.position || state.isMaximized) return state;
      const { clientX, clientY, position } = action.payload;
      return {
        ...state,
        position,
        isDragging: true,
        dragOffset: {
          x: clientX - position.x,
          y: clientY - position.y,
        },
      };
    }

    case "DRAG_MOVE": {
      if (!state.isDragging || !state.position) return state;
      const { clientX, clientY } = action.payload;
      const newX = clientX - state.dragOffset.x;
      const newY = clientY - state.dragOffset.y;

      // The CSS viewport constraints clamp the rendered position.
      return {
        ...state,
        position: {
          x: newX,
          y: newY,
        },
      };
    }

    case "DRAG_END":
      return { ...state, isDragging: false };

    case "MAXIMIZE":
      return { ...state, isMaximized: true, isMinimized: false };

    case "MINIMIZE":
      return { ...state, isMinimized: true, isMaximized: false };

    case "RESTORE":
      return { ...state, isMaximized: false, isMinimized: false };

    case "RESIZE": {
      const { width, height } = action.payload;
      if (!state.position || state.isMaximized || state.isMinimized)
        return state;

      // Keep position within bounds
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - height;
      return {
        ...state,
        position: {
          x: Math.max(0, Math.min(state.position.x, maxX)),
          y: Math.max(0, Math.min(state.position.y, maxY)),
        },
      };
    }

    default:
      return state;
  }
};

const initialState: WindowState = {
  position: null,
  isMaximized: false,
  isMinimized: false,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
};

export const useWindowManagement = (options: UseWindowManagementOptions) => {
  const { initialWidth, initialHeight, isIntro = false, onClose } = options;
  const [state, dispatch] = useReducer(windowReducer, initialState);
  const maximizeOpenerRef = useRef<HTMLElement | null>(null);
  const dimensionsRef = useRef({ width: initialWidth, height: initialHeight });

  // Initialize position
  useEffect(() => {
    if (typeof window !== "undefined") {
      dispatch({
        type: "INITIALIZE",
        payload: { width: initialWidth, height: initialHeight },
      });
    }
  }, [initialWidth, initialHeight]);

  // Debounced resize handler
  const debouncedResize = useCallback(() => {
    const { width, height } = dimensionsRef.current;
    dispatch({ type: "RESIZE", payload: { width, height } });
  }, [dispatch]);

  // Handle window resize
  useEffect(() => {
    const handleResize = debounce(() => {
      debouncedResize();
    }, 100);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [debouncedResize]);

  // Drag handlers
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (state.isDragging) {
        dispatch({
          type: "DRAG_MOVE",
          payload: { clientX: e.clientX, clientY: e.clientY },
        });
      }
    },
    [state.isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (state.isDragging) {
      dispatch({ type: "DRAG_END" });
    }
  }, [state.isDragging]);

  // Attach drag listeners
  useEffect(() => {
    if (state.isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [state.isDragging, handleMouseMove, handleMouseUp]);

  // Window control handlers
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    if (state.isMinimized) {
      dispatch({ type: "RESTORE" });
    } else {
      dispatch({ type: "MINIMIZE" });
    }
  }, [state.isMinimized]);

  const handleMaximize = useCallback(() => {
    if (state.isMaximized) {
      dispatch({ type: "RESTORE" });
      // The window remains mounted; restore synchronously so a queued frame
      // cannot steal focus from the user's next Tab keystroke.
      maximizeOpenerRef.current?.focus({ preventScroll: true });
    } else {
      maximizeOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dispatch({ type: "MAXIMIZE" });
    }
  }, [state.isMaximized]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (state.isMaximized || !state.position) return;

      const target = e.target as HTMLElement;
      if (
        !target.closest(".terminal-header") ||
        target.closest(".terminal-button")
      ) {
        return;
      }

      const bounds = e.currentTarget.getBoundingClientRect();
      dispatch({
        type: "DRAG_START",
        payload: {
          clientX: e.clientX,
          clientY: e.clientY,
          position: { x: bounds.left, y: bounds.top },
        },
      });
    },
    [state.isMaximized, state.position]
  );

  // Calculate container styles
  const getContainerStyles = useCallback(() => {
    if (state.isMaximized) {
      return {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100%",
        height: "100dvh",
        transform: "none",
        opacity: 1,
        pointerEvents: "auto" as const,
        cursor: "default" as const,
        zIndex: isIntro ? 9999 : 1000,
      };
    }

    if (!state.position) {
      return {
        position: "fixed" as const,
        left: 0,
        top: 0,
        transform: "none",
        opacity: 0,
        pointerEvents: "none" as const,
        cursor: "default" as const,
        zIndex: isIntro ? 9999 : 1000,
      };
    }

    if (state.isMinimized) {
      return {
        position: "fixed" as const,
        left: state.position.x,
        top: state.position.y,
        transform: "translateX(-100vw)",
        opacity: 0,
        pointerEvents: "none" as const,
        cursor: "default" as const,
        zIndex: 999,
      };
    }

    return {
      position: "fixed" as const,
      // CSS owns the usable viewport, including the measured header/dock.
      // Clamp on every layout (also after zoom/resize), not only drag events.
      left: `clamp(0px, ${state.position.x}px, calc(100% - var(--terminal-window-width)))`,
      top: `clamp(var(--terminal-safe-top), ${state.position.y}px, calc(100dvh - var(--terminal-safe-bottom) - var(--terminal-window-height)))`,
      transform: "none",
      opacity: 1,
      pointerEvents: "auto" as const,
      cursor: state.isDragging ? ("grabbing" as const) : ("default" as const),
      zIndex: isIntro ? 9999 : 1000,
    };
  }, [state, isIntro]);

  return {
    // State
    position: state.position,
    isMaximized: state.isMaximized,
    isMinimized: state.isMinimized,
    isDragging: state.isDragging,

    // Handlers
    handleClose,
    handleMinimize,
    handleMaximize,
    handleMouseDown,

    // Computed values
    containerStyles: getContainerStyles(),

    // For sidecar (minimized state indicator)
    showSidecar: state.isMinimized,
  };
};
