import { useEffect, useState } from "react";

import { bus } from "../game/events";
import { device, useTouchControls } from "../game/input/device";
import { readTouch } from "../game/input/touch";
import { canControl, runClock, useRun } from "../game/state/run";
import { useSettings } from "../game/state/settings";
import { NOTICE_HOLD_S } from "../game/world";
import { noticeReading } from "../game/teaching/noticeReading";
import { colors, FONT, text as textSize } from "./overlay";
import { readoutKeys, readoutMouse, usePanelOverflow } from "./usePanelOverflow";

/**
 * The lines of guidance on screen: the room's, and whatever the game has
 * just said.
 *
 * Two slots and not one. They were one, and a passing line cleared itself
 * by writing nothing over it - so the floor's opening blurb, six and a half
 * seconds after a run started, erased the standing instruction of whatever
 * room the player had walked into, and nothing ever wrote it again. The
 * room owns the lower line for as long as the player is in it; a notice
 * owns the upper one until it runs out.
 */
export function Hint() {
  const [text, setText] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panel = usePanelOverflow(notice);
  const noticeElement = panel.element;
  useEffect(() => bus.on("hint", setText), []);
  useEffect(
    () => {
      const off = bus.on("notice", (line) => {
        setNotice(line);
        noticeReading.until = line === null ? 0 : runClock(useRun.getState()) + NOTICE_HOLD_S;
      });
      return () => { off(); noticeReading.until = 0; noticeReading.focused = false; };
    },
    []
  );
  // On the run's clock, so a notice read in the pause menu is still there
  // when the game comes back.
  useEffect(() => {
    if (notice === null) return;
    const t = window.setInterval(() => {
      if (runClock(useRun.getState()) >= noticeReading.until && document.activeElement !== noticeElement.current) setNotice(null);
    }, 200);
    return () => window.clearInterval(t);
  }, [notice, noticeElement]);
  const captured = usePointerCaptured();
  const inControl = useRun(canControl);
  // Which of the two first-time lines applies: the mouse can be taken on a
  // desktop unless the player has asked for the on-screen scheme, and the
  // thumbs are taught until both have been used once.
  const touch = useTouchControls();
  const touchMode = useSettings((s) => s.touchControls);
  const lockable = device === "desktop" && touchMode !== "on";
  const tutored = useTouchTutored(touch && inControl);
  const lines = [
    notice,
    text,
    inControl && !captured && lockable ? "Click the game to look around" : null,
    inControl && touch && !tutored ? "One thumb walks, the other looks" : null,
  ].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div
      data-testid="guidance"
      ref={panel.ref}
      role="region"
      aria-label="Guidance"
      tabIndex={panel.overflow ? 0 : undefined}
      onKeyDown={readoutKeys}
      onMouseDown={readoutMouse}
      onPointerDown={event => { if (panel.overflow) event.currentTarget.focus({ preventScroll: true }); }}
      onFocus={() => { noticeReading.focused = true; }}
      onBlur={() => {
        noticeReading.focused = false;
        if (runClock(useRun.getState()) >= noticeReading.until) setNotice(null);
      }}
      style={{
        flex: "0 1 auto",
        minHeight: `calc(${textSize.small} * 1.7 + 22px)`,
        overflowY: "auto",
        boxSizing: "border-box",
        overflowWrap: "anywhere",
        padding: "10px 16px",
        borderRadius: 6,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        fontFamily: FONT,
        fontSize: textSize.small,
        lineHeight: 1.7,
        letterSpacing: "0.03em",
        color: colors.dim,
        textAlign: "center",
        pointerEvents: panel.overflow ? "auto" : "none",
      }}
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

/** Whether the game holds the pointer, so the first-time player is told how to look. */
function usePointerCaptured(): boolean {
  const [captured, setCaptured] = useState(() => document.pointerLockElement !== null);
  useEffect(() => {
    const update = () => setCaptured(document.pointerLockElement !== null);
    document.addEventListener("pointerlockchange", update);
    return () => document.removeEventListener("pointerlockchange", update);
  }, []);
  return captured;
}

/**
 * Whether the stick and the look drag have each been used once, polled:
 * they are module data written from pointer handlers, and the line that
 * teaches them should go the moment they are learned rather than on a
 * timer that outlasts a quick study or cuts a slow one short.
 */
function useTouchTutored(watch: boolean): boolean {
  const done = () => readTouch().everMoved && readTouch().everLooked;
  const [tutored, setTutored] = useState(done);
  useEffect(() => {
    if (!watch || tutored) return;
    const t = window.setInterval(() => {
      if (done()) setTutored(true);
    }, 300);
    return () => window.clearInterval(t);
  }, [watch, tutored]);
  return tutored;
}
