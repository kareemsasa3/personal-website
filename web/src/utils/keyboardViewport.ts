// The on-screen keyboard and the visible viewport.
//
// Mobile Safari, and Chrome on Android by default, draw the on-screen keyboard over the page: the layout viewport, and
// so `100dvh` and every `position: fixed` box, keeps its size, and only `window.visualViewport` shrinks (and, in
// Safari, pans to the focused field). Anything sized from viewport units alone therefore ends up behind the keyboard.
// This module reads the span that is still visible, in layout-viewport coordinates, which are the coordinates a
// `position: fixed` box is placed in.

/** The visible span while a keyboard covers part of the layout viewport: CSS px from the layout viewport's top. */
export interface KeyboardViewport {
  top: number;
  bottom: number;
}

/** The least the visual viewport must lose before it is treated as a keyboard (CSS px). A site choice: collapsing
    browser chrome and accessory bars cover less than this, and the shortest on-screen keyboards cover more. */
export const KEYBOARD_MIN_INSET = 100;

type ViewportLike = Pick<VisualViewport, "offsetTop" | "height" | "scale">;

/** The visible span, or null when no keyboard is covering the layout viewport (or it cannot be known). */
export function readKeyboardViewport(viewport: ViewportLike | null | undefined, layoutHeight: number): KeyboardViewport | null {
  if (!viewport) return null;
  // Pinch zoom also shrinks the visual viewport. It is the reader's own framing, not an obstruction: leave it alone.
  if (Math.abs(viewport.scale - 1) > 0.01) return null;
  if (layoutHeight - viewport.height < KEYBOARD_MIN_INSET) return null;
  // Rounded inwards, so the span never reaches under the keyboard; an overscrolled offset can be negative.
  const top = Math.max(0, Math.ceil(viewport.offsetTop));
  const bottom = Math.floor(viewport.offsetTop + viewport.height);
  return bottom > top ? { top, bottom } : null;
}

interface WindowLike {
  visualViewport?: (ViewportLike & Pick<VisualViewport, "addEventListener" | "removeEventListener">) | null;
  addEventListener: (type: "resize", listener: () => void) => void;
  removeEventListener: (type: "resize", listener: () => void) => void;
}

/** Reports the visible span now and each time it changes: as the keyboard opens, changes size or closes (the visual
    viewport's `resize`), as the visual viewport pans (`scroll`), and as the layout viewport itself changes (the
    window's `resize`). Without the API it reports null once and listens to nothing. Returns the cleanup. */
export function watchKeyboardViewport(
  win: WindowLike,
  getLayoutHeight: () => number,
  onChange: (fit: KeyboardViewport | null) => void,
): () => void {
  const viewport = win.visualViewport;
  let last: KeyboardViewport | null | undefined;
  const update = () => {
    const next = readKeyboardViewport(viewport, getLayoutHeight());
    if (last !== undefined && next?.top === last?.top && next?.bottom === last?.bottom) return;
    last = next;
    onChange(next);
  };
  update();
  if (!viewport) return () => {};
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  win.addEventListener("resize", update);
  return () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
    win.removeEventListener("resize", update);
  };
}
