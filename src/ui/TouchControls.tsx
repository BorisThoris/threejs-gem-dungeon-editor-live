import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

import { bus, type Prompt } from "../game/events";
import { device, useTouchControls } from "../game/input/device";
import { keyboard } from "../game/input/keyboard";
import {
  addTouchLook,
  readTouch,
  releaseTouchStick,
  resetTouch,
  setTouchSprint,
  setTouchStick,
  subscribeTouchSprint,
} from "../game/input/touch";
import { canControl, useRun } from "../game/state/run";
import { useSettings } from "../game/state/settings";
import { colors, FONT, MINIMAP_SCALE, MINIMAP_SIZE, text } from "./overlay";

/**
 * The game, played with two thumbs.
 *
 * A first-person game on a phone has one shape that every player already
 * knows: one thumb on a stick that appears wherever it lands on its half
 * of the screen, the other thumb dragging the view on the other half, and
 * the buttons under it. This is that shape and nothing cleverer, because
 * the value of a control scheme a player has used before is that they do
 * not have to be told it.
 *
 * Nothing here re-renders while a thumb moves. The layer's pointer
 * handlers write straight into `input/touch.ts`, which the player and the
 * look read from the frame loop, and the stick's ring and knob are moved
 * by writing their style - the same rule the mouse look and the pad
 * follow, for the same reason: a stick moves every frame.
 *
 * A button is a key. Pressing USE lands in the keyboard module under the
 * code "interact", so the trigger that consumes E consumes this without
 * knowing the difference, and the same for BAR. The lantern and the pause
 * are calls on the store, like the pad's buttons in Scene. The run is the
 * one thing a thumb cannot hold - it is already holding the stick - so it
 * is pushed on, by the button or by the stick shoved past its rim, and it
 * ends when the stick is let go.
 *
 * Sized by the device (`input/device.ts`): a phone gets a stick and
 * buttons a thumb can find without looking on a screen four hundred
 * pixels tall, a tablet gets the same at a size that suits a screen
 * held in two hands with the thumbs a long way apart.
 */

interface Sizes {
  /** How far the knob travels from the centre, in px. Past this is the rim. */
  throw: number;
  knob: number;
  ring: number;
  button: number;
  /** The one that is pressed most. */
  big: number;
  margin: number;
}

const SIZES: Record<typeof device, Sizes> = {
  phone: { throw: 46, knob: 46, ring: 118, button: 54, big: 72, margin: 14 },
  tablet: { throw: 62, knob: 58, ring: 158, button: 66, big: 90, margin: 30 },
  // A desktop with a touchscreen is a monitor being poked: a tablet, in size.
  desktop: { throw: 62, knob: 58, ring: 158, button: 66, big: 90, margin: 30 },
};

/** Shoving the knob this far past its throw starts the run. */
const RIM_RUN = 1.35;

/** Whether the on-screen controls are drawn, and everything under them. */
export function TouchControls() {
  const active = useTouchControls();
  if (!active) return null;
  return <Layer />;
}

function Layer() {
  const size = SIZES[device];
  const stickSide = useSettings((s) => s.stickSide);
  const inControl = useRun(canControl);
  const layer = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  // A menu, a puzzle, or the black frame between rooms: whatever was
  // pushed is let go of, so the player does not walk into the wall behind
  // a modal or come out of it already running.
  useEffect(() => {
    if (!inControl) resetTouch();
  }, [inControl]);

  useEffect(() => {
    const el = layer.current;
    const base = ring.current;
    const cap = knob.current;
    if (!el || !base || !cap) return;

    /** Which pointer is the stick and which is the look, or -1 for none. */
    const held = { stick: -1, look: -1, ox: 0, oy: 0, lx: 0, ly: 0 };

    // Where the ring waits when no thumb is on it, as CSS so the safe
    // area of a notched phone is part of the sum.
    const restInset = `calc(${size.margin}px + env(safe-area-inset-${stickSide}, 0px))`;
    const restBottom = `calc(${size.margin}px + env(safe-area-inset-bottom, 0px))`;
    const rest = () => {
      base.style.left = stickSide === "left" ? restInset : "auto";
      base.style.right = stickSide === "right" ? restInset : "auto";
      base.style.top = "auto";
      base.style.bottom = restBottom;
      base.style.opacity = "0.45";
      cap.style.transform = "translate(0px, 0px)";
    };
    rest();

    const isThumb = (e: PointerEvent) => e.pointerType !== "mouse";

    const onDown = (e: PointerEvent) => {
      if (!isThumb(e)) return;
      // No compatibility mouse events, no text selection, no scroll.
      e.preventDefault();
      if (!canControl(useRun.getState())) return;
      const box = el.getBoundingClientRect();
      const onStickHalf =
        stickSide === "left" ? e.clientX < box.left + box.width / 2 : e.clientX > box.left + box.width / 2;
      if (onStickHalf && held.stick === -1) {
        held.stick = e.pointerId;
        held.ox = e.clientX;
        held.oy = e.clientY;
        el.setPointerCapture(e.pointerId);
        // The ring comes to the thumb, not the thumb to the ring: a
        // player looking at the room is not looking at the corner.
        base.style.left = `${e.clientX - box.left - size.ring / 2}px`;
        base.style.top = `${e.clientY - box.top - size.ring / 2}px`;
        base.style.right = "auto";
        base.style.bottom = "auto";
        base.style.opacity = "0.9";
        cap.style.transform = "translate(0px, 0px)";
        setTouchStick(0, 0);
      } else if (held.look === -1) {
        held.look = e.pointerId;
        held.lx = e.clientX;
        held.ly = e.clientY;
        el.setPointerCapture(e.pointerId);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId === held.stick) {
        const dx = e.clientX - held.ox;
        const dy = e.clientY - held.oy;
        const d = Math.hypot(dx, dy);
        const clamp = d > size.throw ? size.throw / d : 1;
        cap.style.transform = `translate(${dx * clamp}px, ${dy * clamp}px)`;
        setTouchStick(dx / size.throw, dy / size.throw);
        if (d > size.throw * RIM_RUN) setTouchSprint(true);
      } else if (e.pointerId === held.look) {
        addTouchLook(e.clientX - held.lx, e.clientY - held.ly);
        held.lx = e.clientX;
        held.ly = e.clientY;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId === held.stick) {
        held.stick = -1;
        releaseTouchStick();
        rest();
      } else if (e.pointerId === held.look) {
        held.look = -1;
      }
    };

    // The tab went behind something: a thumb lifted while it was there
    // never sends its up, the same as a key released off a blurred window.
    const letGo = () => {
      held.stick = held.look = -1;
      resetTouch();
      rest();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") letGo();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", letGo);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", letGo);
      document.removeEventListener("visibilitychange", onHidden);
      resetTouch();
    };
  }, [size, stickSide]);

  return (
    <>
      <div
        ref={layer}
        data-testid="touch-controls"
        data-device={device}
        data-stick={stickSide}
        style={{
          position: "fixed",
          inset: 0,
          // Over the canvas, under every overlay: the HUD and the prompt
          // let touches through, and a menu takes them.
          zIndex: 500,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        <div
          ref={ring}
          data-testid="touch-stick"
          style={{
            position: "absolute",
            width: size.ring,
            height: size.ring,
            borderRadius: "50%",
            border: `2px solid ${colors.line}`,
            background: "rgba(10, 12, 18, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            transition: "opacity 120ms",
          }}
        >
          <div
            ref={knob}
            style={{
              width: size.knob,
              height: size.knob,
              borderRadius: "50%",
              background: "rgba(242, 244, 248, 0.55)",
              border: `2px solid ${colors.ink}`,
            }}
          />
        </div>
      </div>
      <Buttons size={size} side={stickSide === "left" ? "right" : "left"} inControl={inControl} />
      <PauseButton size={size} />
      {device === "phone" && <Sideways />}
    </>
  );
}

/**
 * The four things a hand does, under the thumb that is not walking.
 *
 * USE is the big one and sits where the thumb rests, because it is the
 * game's one verb and the thing pressed most. It lights when something
 * is in reach, which is the prompt's job on a keyboard and is the same
 * bus message here.
 */
function Buttons({ size, side, inControl }: { size: Sizes; side: "left" | "right"; inControl: boolean }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  useEffect(() => bus.on("prompt", setPrompt), []);
  const sprint = useSyncExternalStore(subscribeTouchSprint, () => readTouch().sprint, () => false);
  const lanternUp = useRun((s) => s.lanternRaised);

  const use = (
    <TouchButton
      key="use"
      testId="touch-use"
      label="USE"
      size={size.big}
      lit={prompt !== null && prompt.enabled}
      onPress={() => keyboard.pressAction("interact")}
    />
  );
  const run = (
    <TouchButton
      key="run"
      testId="touch-run"
      label="RUN"
      size={size.button}
      on={sprint}
      onPress={() => setTouchSprint(!readTouch().sprint)}
    />
  );
  const lantern = (
    <TouchButton
      key="lantern"
      testId="touch-lantern"
      label="LAMP"
      size={size.button}
      on={lanternUp}
      onPress={() => {
        const s = useRun.getState();
        if (canControl(s)) s.toggleLantern();
      }}
    />
  );
  const bar = (
    <TouchButton
      key="bar"
      testId="touch-bar"
      label="BAR"
      size={size.button}
      onPress={() => keyboard.pressAction("bar")}
    />
  );

  const inset = `calc(${size.margin}px + env(safe-area-inset-${side}, 0px))`;
  const gap = Math.round(size.margin * 0.7);
  return (
    <div
      data-testid="touch-buttons"
      style={{
        position: "fixed",
        bottom: `calc(${size.margin}px + env(safe-area-inset-bottom, 0px))`,
        [side]: inset,
        display: "grid",
        gridTemplateColumns:
          side === "right" ? `${size.button}px ${size.big}px` : `${size.big}px ${size.button}px`,
        gridTemplateRows: `${size.button}px ${size.big}px`,
        gap,
        alignItems: "end",
        justifyItems: side === "right" ? "end" : "start",
        zIndex: 600,
        opacity: inControl ? 1 : 0.35,
        transition: "opacity 200ms",
        touchAction: "none",
      }}
    >
      {side === "right" ? [bar, lantern, run, use] : [lantern, bar, use, run]}
    </div>
  );
}

/**
 * Pause, at the top by the minimap, well away from anything a thumb does
 * in play. It answers whenever a run is on, dark frame included, the way
 * Esc and Start do.
 */
function PauseButton({ size }: { size: Sizes }) {
  return (
    <div
      style={{
        position: "fixed",
        top: `calc(${size.margin}px + env(safe-area-inset-top, 0px))`,
        right: `calc(${MINIMAP_SIZE * MINIMAP_SCALE + 20 + 14}px + env(safe-area-inset-right, 0px))`,
        zIndex: 600,
      }}
    >
      <TouchButton
        testId="touch-pause"
        label="II"
        size={Math.round(size.button * 0.8)}
        onPress={() => {
          const run = useRun.getState();
          if (run.phase !== "playing" || run.inputLocks > 0) return;
          if (run.paused) run.resume();
          else run.pause();
        }}
      />
    </div>
  );
}

function TouchButton({
  label,
  size,
  onPress,
  testId,
  on = false,
  lit = false,
}: {
  label: string;
  size: number;
  onPress: () => void;
  testId: string;
  /** Something toggled is on: the run, the lantern. */
  on?: boolean;
  /** Pressing it now would do something: USE with a thing in reach. */
  lit?: boolean;
}) {
  const border = on ? colors.gold : lit ? colors.accent : colors.line;
  const style: CSSProperties = {
    width: size,
    height: size,
    padding: 0,
    borderRadius: "50%",
    border: `2px solid ${border}`,
    background: on ? "rgba(255, 212, 121, 0.24)" : lit ? "rgba(127, 227, 255, 0.22)" : "rgba(10, 12, 18, 0.55)",
    color: on ? colors.gold : lit ? colors.accent : colors.ink,
    fontFamily: FONT,
    fontSize: text.small,
    letterSpacing: "0.04em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    cursor: "pointer",
    transition: "border-color 120ms, background 120ms",
  };
  return (
    <button
      type="button"
      className="gd-touch-button"
      data-testid={testId}
      data-on={on ? "yes" : "no"}
      data-lit={lit ? "yes" : "no"}
      aria-label={label}
      style={style}
      // The press, not the release: a thumb on USE at a door wants the
      // door now, and a press that waits for the lift feels like lag.
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/**
 * A phone held upright cannot show a first-person game and two thumbs'
 * worth of controls at once. The orientation is asked for when a run
 * starts (`enterImmersive`), and where that is refused this says so, and
 * goes away the moment the phone is turned.
 */
function Sideways() {
  const portrait = useSyncExternalStore(
    (fn) => {
      const q = window.matchMedia("(orientation: portrait)");
      q.addEventListener("change", fn);
      return () => q.removeEventListener("change", fn);
    },
    () => window.matchMedia("(orientation: portrait)").matches,
    () => false
  );
  if (!portrait) return null;
  return (
    <div
      data-testid="touch-sideways"
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        padding: "14px 18px",
        borderRadius: 6,
        background: colors.panel,
        border: `1px solid ${colors.gold}`,
        fontFamily: FONT,
        fontSize: text.body,
        lineHeight: 1.7,
        color: colors.gold,
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 960,
      }}
    >
      Turn your phone sideways
    </div>
  );
}
