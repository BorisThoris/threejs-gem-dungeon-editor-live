import { useEffect, useState } from "react";

import { bus, type Prompt as PromptData } from "../game/events";
import { device, useTouchControls } from "../game/input/device";
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
  // The chip says what to press, and on a touchscreen that is the USE
  // button, not a key. Higher on a phone, where eighteen percent of the
  // height is inside the satchel.
  const touch = useTouchControls();
  if (!prompt) return null;

  return (
    <div
      data-testid="prompt"
      style={{
        position: "fixed",
        left: "50%",
        bottom: device === "phone" ? "36%" : "18%",
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
      <span data-testid="prompt-key" style={{ ...chip, background: prompt.enabled ? colors.accent : "#5a5f6e" }}>
        {touch ? "USE" : prompt.key}
      </span>
      <span data-testid="prompt-text" style={{ color: prompt.enabled ? colors.ink : colors.danger }}>
        {prompt.text}
      </span>
    </div>
  );
}
