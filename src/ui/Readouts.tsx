import { useLayoutEffect, useState } from "react";
import { useTouchControls } from "../game/input/device";
import { useSettings } from "../game/state/settings";
import { Captions } from "./Captions";
import { Hint } from "./Hint";

/** One space budget for messages that must remain readable together. */
export function Readouts() {
  const touch = useTouchControls();
  const bounds = useReadoutBounds(touch);
  return <div data-testid="readouts" style={{
    position: "fixed", left: bounds.left, right: bounds.right, top: bounds.top,
    maxHeight: bounds.maxHeight, maxWidth: 640, marginInline: "auto",
    display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none", zIndex: 940,
  }}>
    <Captions />
    <Hint />
  </div>;
}

/** Reserve the live overlay footprints, including either arrangement of touch controls. */
function useReadoutBounds(touch: boolean) {
  const stickSide = useSettings(s => s.stickSide);
  const [bounds, setBounds] = useState({ left: 24, right: 24, top: 24, maxHeight: window.innerHeight - 36 });
  useLayoutEffect(() => {
    const hud = document.querySelector('[data-testid="hud"]');
    const map = document.querySelector('[data-testid="minimap"]');
    const pause = document.querySelector('[data-testid="touch-pause"]');
    const buttons = document.querySelector('[data-testid="touch-buttons"]');
    const stick = document.querySelector('[data-testid="touch-stick"]');
    const measure = () => {
      const h = hud?.getBoundingClientRect();
      const rightEdge = Math.min(map?.getBoundingClientRect().left ?? window.innerWidth - 12,
        pause?.getBoundingClientRect().left ?? window.innerWidth - 12);
      const left = (h?.right ?? 12) + 12;
      const right = window.innerWidth - rightEdge + 12;
      const besideHud = window.innerWidth - left - right >= 180;
      const next = besideHud ? { left, right, top: 24 }
        : { left: 12, right: 12, top: Math.max(h?.bottom ?? 12, map?.getBoundingClientRect().bottom ?? 12,
          pause?.getBoundingClientRect().bottom ?? 12) + 12 };
      let bottom = window.innerHeight - 12;
      for (const element of [buttons, stick]) {
        if (!element) continue;
        const box = element.getBoundingClientRect();
        if (box.bottom <= next.top) continue;
        // Portrait has a useful band above the thumbs. In short landscape,
        // retain the side lane so a caption plus guidance still has height.
        if (box.top > next.top && (besideHud || window.innerHeight > window.innerWidth)) {
          if (box.left < window.innerWidth - next.right && box.right > next.left) bottom = Math.min(bottom, box.top - 12);
        } else if (box.left + box.width / 2 < window.innerWidth / 2) {
          next.left = Math.max(next.left, box.right + 12);
        } else {
          next.right = Math.max(next.right, window.innerWidth - box.left + 12);
        }
      }
      const measured = { ...next, maxHeight: Math.max(0, bottom - next.top) };
      setBounds(old => old.left === measured.left && old.right === measured.right && old.top === measured.top
        && old.maxHeight === measured.maxHeight ? old : measured);
    };
    const observer = new ResizeObserver(measure);
    for (const element of [hud, map, pause, buttons, stick]) if (element) observer.observe(element);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [touch, stickSide]);
  return bounds;
}
