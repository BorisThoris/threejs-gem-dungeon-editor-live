import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

/** Reading keys belong to the focused panel; Escape still reaches pause. */
export function readoutKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Escape") event.stopPropagation();
}

/** A click to focus or scroll a readout must not capture the view or shove. */
export function readoutMouse(event: MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
}

/** Only scrollable readouts capture gestures; ordinary overlays leave play alone. */
export function usePanelOverflow(resetKey?: unknown) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => { element.current = node; setPanel(node); }, []);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => { if (panel) panel.scrollTop = 0; }, [panel, resetKey]);
  useLayoutEffect(() => {
    if (!panel) return;
    const measure = () => setOverflow(panel.scrollHeight > panel.clientHeight + 1);
    const resize = new ResizeObserver(measure);
    const content = new MutationObserver(measure);
    resize.observe(panel);
    content.observe(panel, { childList: true, subtree: true, characterData: true });
    measure();
    return () => { resize.disconnect(); content.disconnect(); };
  }, [panel]);
  return { ref, overflow, element };
}
