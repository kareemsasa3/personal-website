import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { useLocation } from "react-router-dom";

/**
 * A button that shows and hides a panel of ordinary links (the APG disclosure
 * pattern, not role="menu"). The panel closes on Escape, when focus or a
 * pointer press leaves the container, on every navigation (including
 * back/forward), and whenever `resetKey` changes.
 */
export const useDisclosure = <T extends HTMLElement = HTMLElement>(resetKey = "") => {
  const location = useLocation();
  const scope = `${location.key}|${resetKey}`;
  const [state, setState] = useState({ scope, isOpen: false });
  const panelId = useId();
  const containerRef = useRef<T>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Reset during render so a revisited history entry never comes back open.
  if (state.scope !== scope) setState({ scope, isOpen: false });
  const isOpen = state.scope === scope && state.isOpen;

  const close = useCallback(() => {
    setState((current) => ({ ...current, isOpen: false }));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, close]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !isOpen) return;
    event.stopPropagation();
    close();
    buttonRef.current?.focus();
  };

  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next)) close();
  };

  return {
    isOpen,
    close,
    panelId,
    containerRef,
    containerProps: { onKeyDown, onBlur },
    buttonProps: {
      ref: buttonRef,
      type: "button" as const,
      "aria-expanded": isOpen,
      "aria-controls": panelId,
      onClick: () =>
        setState((current) => ({
          scope,
          isOpen: !(current.scope === scope && current.isOpen),
        })),
    },
  };
};
