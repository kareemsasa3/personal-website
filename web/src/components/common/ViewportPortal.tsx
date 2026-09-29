import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./ViewportPortal.css";

// Escape route transforms and keep viewport UI in one local stacking context.
export default function ViewportPortal({
  children,
  layer,
  className = "",
}: {
  children: ReactNode;
  layer: "terminal" | "panel" | "modal" | "notification";
  className?: string;
}) {
  return createPortal(
    <div className={`viewport-layer viewport-layer--${layer} ${className}`}>
      {children}
    </div>,
    document.getElementById("portal-root")!
  );
}
