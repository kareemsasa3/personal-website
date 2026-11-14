// The on-screen keyboard and the visible viewport.
//
// Mobile Safari, and Chrome on Android by default, draw the on-screen keyboard over the page: the layout viewport, and
// so `100dvh` and every `position: fixed` box, keeps its size, and only `window.visualViewport` shrinks (and, in
// Safari, pans to the focused field). Anything sized from viewport units alone therefore ends up behind the keyboard.
// This module reads the span that is still visible, in layout-viewport coordinates, which are the coordinates a
// `position: fixed` box is placed in.
//
// Measured on Chrome 157 for Android drawing edge to edge (`viewport-fit=cover`, a 37 px gesture-bar inset): with the
// keyboard open, `visualViewport.height` was 37 px more than what was visible, and `env(safe-area-inset-bottom)` had
// gone from 37 px to 0. The layout viewport reaches under the gesture bar; the keyboard takes the bar's place, the
// inset is withdrawn, and the visual viewport is still reported as if it were there. So the bottom inset that
// disappears while a keyboard is open is taken off the span's end.

/** The visible span while a keyboard covers part of the layout viewport: CSS px from the layout viewport's top. */
export interface KeyboardViewport {
  top: number;
  bottom: number;
}

/** The least the visual viewport must lose before it is treated as a keyboard (CSS px). A site choice: collapsing
    browser chrome and accessory bars cover less than this, and the shortest on-screen keyboards cover more. */
export const KEYBOARD_MIN_INSET = 100;

type ViewportLike = Pick<VisualViewport, "offsetTop" | "height" | "scale">;

/** The visible span, or null when no keyboard is covering the layout viewport (or it cannot be known).
    `lostBottomInset` is the bottom safe-area inset that was there before the keyboard opened and is gone now. */
export function readKeyboardViewport(
  viewport: ViewportLike | null | undefined,
  layoutHeight: number,
  lostBottomInset = 0,
): KeyboardViewport | null {
  if (!viewport) return null;
  // Pinch zoom also shrinks the visual viewport, by its scale, and is the reader's own framing, not an obstruction:
  // only what is missing at the current scale counts. A zoomed page with a keyboard open (a browser may zoom to the
  // focused field) is still fitted.
  if (layoutHeight - viewport.height * viewport.scale < KEYBOARD_MIN_INSET) return null;
  // Rounded inwards, so the span never reaches under the keyboard; an overscrolled offset can be negative.
  const top = Math.max(0, Math.ceil(viewport.offsetTop));
  const bottom = Math.floor(viewport.offsetTop + viewport.height - Math.max(0, lostBottomInset) / viewport.scale);
  return bottom > top ? { top, bottom } : null;
}

interface WindowLike {
  visualViewport?: (ViewportLike & Pick<VisualViewport, "addEventListener" | "removeEventListener">) | null;
  addEventListener: (type: "resize", listener: () => void) => void;
  removeEventListener: (type: "resize", listener: () => void) => void;
}

/** Reports the visible span now and each time it changes: as the keyboard opens, changes size or closes (the visual
    viewport's `resize`), as the visual viewport pans (`scroll`), and as the layout viewport itself changes (the
    window's `resize`). `getBottomInset` reads the current bottom safe-area inset; the value it had while no keyboard
    was open is remembered, and what has gone of it since is taken off the span. The inset can change with no viewport
    event, so the caller runs `update` when it does. Without the API it reports null once and listens to nothing. */
export function watchKeyboardViewport(
  win: WindowLike,
  getLayoutHeight: () => number,
  onChange: (fit: KeyboardViewport | null) => void,
  getBottomInset: () => number = () => 0,
): { update: () => void; stop: () => void } {
  const viewport = win.visualViewport;
  let last: KeyboardViewport | null | undefined;
  let restingInset = 0;
  let restingLayout: number | undefined;
  let stopped = false;
  const update = () => {
    if (stopped) return;
    const layoutHeight = getLayoutHeight();
    const inset = getBottomInset();
    // No keyboard: the inset at rest is the largest seen at this layout viewport height, so an inset withdrawn a
    // moment before the viewport reports the keyboard is not taken for the resting value. A new height (a rotation,
    // browser chrome) starts again. With a keyboard open, the resting value stands.
    if (!readKeyboardViewport(viewport, layoutHeight)) {
      restingInset = layoutHeight === restingLayout ? Math.max(restingInset, inset) : inset;
      restingLayout = layoutHeight;
    }
    const next = readKeyboardViewport(viewport, layoutHeight, restingInset - inset);
    if (last !== undefined && next?.top === last?.top && next?.bottom === last?.bottom) return;
    last = next;
    onChange(next);
  };
  update();
  if (!viewport) return { update, stop: () => { stopped = true; } };
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  win.addEventListener("resize", update);
  return {
    update,
    stop: () => {
      stopped = true;
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      win.removeEventListener("resize", update);
    },
  };
}
