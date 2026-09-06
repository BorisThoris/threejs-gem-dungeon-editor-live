/**
 * What the game is being played on, and whether it wants on-screen controls.
 *
 * Three answers, decided once at load: a desktop, a phone, or a tablet.
 * Not the user agent - an iPad reports itself as a Mac and every browser
 * lies about something - but what the platform actually says about its
 * pointer: a device whose primary pointer is coarse, or that cannot hover,
 * and that has touch points, is held in the hands. Phone against tablet is
 * the short side of the screen, because that is the difference that
 * matters: a phone in landscape is under four hundred CSS pixels tall, and
 * a HUD, a minimap and a satchel sized for a monitor do not fit beside
 * two thumbs on that.
 *
 * Whether the on-screen controls are drawn is a separate question, and it
 * is the player's: `auto` draws them on anything held in the hands and on
 * a desktop the moment the screen is touched, `on` and `off` say so. A
 * touchscreen laptop is the case `auto` exists for - nothing about it
 * says "phone", and the first touch is the only honest signal.
 */
import { useSyncExternalStore } from "react";

import { useSettings } from "../state/settings";

export type DeviceKind = "desktop" | "phone" | "tablet";

/** The widest short side a phone has, in CSS pixels. Tablets start past it. */
const PHONE_SHORT_SIDE = 620;

function detect(): DeviceKind {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "desktop";
  const points = navigator.maxTouchPoints ?? 0;
  if (points === 0) return "desktop";
  const query = (q: string): boolean =>
    typeof window.matchMedia === "function" ? window.matchMedia(q).matches : false;
  if (!query("(pointer: coarse)") && !query("(hover: none)")) return "desktop";
  const short = Math.min(
    window.screen?.width || window.innerWidth,
    window.screen?.height || window.innerHeight
  );
  return short <= PHONE_SHORT_SIDE ? "phone" : "tablet";
}

/** What this is being played on. Decided once; a screen does not change kind. */
export const device: DeviceKind = detect();

/** Whether the screen has been touched since the page loaded. */
let touchSeen = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || touchSeen) return;
    touchSeen = true;
    notify();
  };
  window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
}

/**
 * Whether the on-screen controls are in use right now.
 *
 * A plain read, for the frame loop and the input modules; `useTouchControls`
 * below is the same answer for anything that renders.
 */
export function touchControlsActive(): boolean {
  const mode = useSettings.getState().touchControls;
  if (mode === "on") return true;
  if (mode === "off") return false;
  return device !== "desktop" || touchSeen;
}

/**
 * Whether the mouse should be captured for looking.
 *
 * Never on a phone or a tablet: the API is missing or refused there, and a
 * request that is refused is a click that did nothing. On a desktop the
 * mouse keeps looking even while the touch controls are drawn - the
 * touchscreen laptop again - unless the player has said the on-screen
 * scheme is the one they want.
 */
export const pointerLockWanted = (): boolean =>
  device === "desktop" && useSettings.getState().touchControls !== "on";

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  const off = useSettings.subscribe(fn);
  return () => {
    listeners.delete(fn);
    off();
  };
};

/** `touchControlsActive`, for something that renders. */
export const useTouchControls = (): boolean =>
  useSyncExternalStore(subscribe, touchControlsActive, () => false);

/**
 * A phone playing a first-person game wants the whole screen and wants it
 * sideways. Asked for on the tap that starts a run, which is the user
 * gesture the browser requires, and never insisted on: an engine that
 * cannot do either just plays in the page.
 */
export function enterImmersive(): void {
  if (device !== "phone" || typeof document === "undefined") return;
  const root = document.documentElement;
  try {
    const request = root.requestFullscreen?.({ navigationUI: "hide" });
    // Not in every engine's typings, and not in every engine: asked for by
    // name and let go of if it is not there.
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (kind: string) => Promise<void>;
    };
    request
      ?.then(() => orientation?.lock?.("landscape").catch(() => {}))
      .catch(() => {
        // Refused, or not a real gesture: the page is fine as it is.
      });
  } catch {
    // Same, thrown synchronously by an engine without it.
  }
}
