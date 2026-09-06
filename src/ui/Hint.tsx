import { useEffect, useRef, useState } from "react";

import { bus } from "../game/events";
import { device, useTouchControls } from "../game/input/device";
import { readTouch } from "../game/input/touch";
import { canControl, runClock, useRun } from "../game/state/run";
import { useSettings } from "../game/state/settings";
import { NOTICE_HOLD_S } from "../game/world";
import { colors, FONT, text as textSize } from "./overlay";

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
  /** When the notice is due to go, on the run's clock. */
  const until = useRef(0);
  useEffect(() => bus.on("hint", setText), []);
  useEffect(
    () =>
      bus.on("notice", (line) => {
        setNotice(line);
        until.current = line === null ? 0 : runClock(useRun.getState()) + NOTICE_HOLD_S;
      }),
    []
  );
  // On the run's clock, so a notice read in the pause menu is still there
  // when the game comes back.
  useEffect(() => {
    if (notice === null) return;
    const t = window.setInterval(() => {
      if (runClock(useRun.getState()) >= until.current) setNotice(null);
    }, 200);
    return () => window.clearInterval(t);
  }, [notice]);
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
      style={{
        position: "fixed",
        left: "50%",
        top: 24,
        transform: "translateX(-50%)",
        maxWidth: 640,
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
        pointerEvents: "none",
        zIndex: 900,
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
