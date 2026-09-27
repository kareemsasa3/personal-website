import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useWindowSize } from "../../hooks/useWindowSize";

export type HeaderLayout = "wide" | "mid" | "phone" | "menu";

const WIDE_QUERY = "(min-width: 1181px)";
const PHONE_QUERY = "(max-width: 640px)";

// When a layout's labels do not fit (enlarged text, a long "Explore: …" label),
// the header steps down to the next layout instead of clipping.
const FALLBACK: Record<Exclude<HeaderLayout, "menu">, HeaderLayout> = {
  wide: "mid",
  mid: "phone",
  phone: "menu",
};

const overflows = (element: Element) => element.scrollWidth > element.clientWidth + 1;

const headerFits = (header: HTMLElement) =>
  !overflows(header) &&
  Array.from(header.querySelectorAll(".site-header__nav, .site-header__list")).every(
    (element) => !overflows(element)
  );

export const useHeaderLayout = (
  headerRef: RefObject<HTMLElement | null>,
  contentKey: string
): HeaderLayout => {
  const isWide = useMediaQuery(WIDE_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { width } = useWindowSize();
  const [measureEpoch, setMeasureEpoch] = useState(0);
  const widthLayout: HeaderLayout = isWide ? "wide" : isPhone ? "phone" : "mid";
  const measureKey = `${widthLayout}|${width}|${contentKey}|${measureEpoch}`;
  const [state, setState] = useState<{ key: string; layout: HeaderLayout }>({
    key: measureKey,
    layout: widthLayout,
  });

  // Start again from the width band whenever width, labels or fonts change.
  let layout = state.layout;
  if (state.key !== measureKey) {
    layout = widthLayout;
    setState({ key: measureKey, layout });
  }

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) setMeasureEpoch((epoch) => epoch + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A text-size change with no viewport resize (e.g. a browser zoom/font-size
  // setting) never touches useWindowSize, so it would otherwise go
  // unmeasured. The probe's width is 1rem, so a root font-size change alone
  // resizes it; observing it (never the header or its lists, whose own size
  // changes with each step-down and would loop) re-triggers measurement.
  useEffect(() => {
    const probe = headerRef.current?.querySelector(".site-header__rem-probe");
    if (!probe) return;
    const observer = new ResizeObserver(() => {
      setMeasureEpoch((epoch) => epoch + 1);
    });
    observer.observe(probe);
    return () => observer.disconnect();
  }, [headerRef]);

  // Runs after every render, before paint; steps down at most three times.
  // No deps array is intentional: this must re-check fit after every render
  // (including one triggered by its own setState below), not just when
  // headerRef or layout change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header || layout === "menu" || headerFits(header)) return;
    const next = FALLBACK[layout];
    setState((current) => ({ ...current, layout: next }));
  });

  return layout;
};
