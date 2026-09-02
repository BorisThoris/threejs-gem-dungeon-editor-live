import { useEffect, useState } from "react";

import { bus } from "../game/events";
import { canControl, useRun } from "../game/state/run";
import { colors, FONT } from "./overlay";

/** One line of guidance for the room the player is in, when it has any. */
export function Hint() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => bus.on("hint", setText), []);
  const captured = usePointerCaptured();
  const inControl = useRun(canControl);
  const lines = [text, inControl && !captured ? "Click the game to look around" : null].filter(Boolean);
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
        fontSize: 10,
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
