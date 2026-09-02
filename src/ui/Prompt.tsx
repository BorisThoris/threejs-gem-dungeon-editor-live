import { useEffect, useState } from "react";

import { bus, type Prompt as PromptData } from "../game/events";
import { FONT, chip, colors, text } from "./overlay";

/**
 * "E · Open the shop" while something is in reach.
 *
 * DOM rather than in-scene text: it must be legible from any angle, and it
 * must never suspend the room the way an in-scene font can.
 */
export function Prompt() {
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  useEffect(() => bus.on("prompt", setPrompt), []);
  if (!prompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "18%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        borderRadius: 6,
        background: colors.panel,
        border: `1px solid ${prompt.enabled ? colors.accent : colors.danger}`,
        fontFamily: FONT,
        fontSize: text.body,
        letterSpacing: "0.04em",
        color: colors.ink,
        pointerEvents: "none",
        zIndex: 950,
      }}
    >
      <span style={{ ...chip, background: prompt.enabled ? colors.accent : "#5a5f6e" }}>
        {prompt.key}
      </span>
      <span style={{ color: prompt.enabled ? colors.ink : colors.danger }}>{prompt.text}</span>
    </div>
  );
}
