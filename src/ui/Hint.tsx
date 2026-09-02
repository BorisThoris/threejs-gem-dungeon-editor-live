import { useEffect, useState } from "react";

import { bus } from "../game/events";
import { colors, FONT } from "./overlay";

/** One line of guidance for the room the player is in, when it has any. */
export function Hint() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => bus.on("hint", setText), []);
  if (!text) return null;
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
      {text}
    </div>
  );
}
