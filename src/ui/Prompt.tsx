import { useEffect, useState } from "react";

import { bus, type Prompt as PromptData } from "../game/events";
import { device, useTouchControls } from "../game/input/device";
import { keysLabel } from "../game/input/bindings";
import { useSettings } from "../game/state/settings";
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
  const interact = useSettings((s) => s.bindings.interact);
  if (!prompt) return null;

  return (
    <div
      data-testid="prompt"
      style={{
        position: "fixed",
        left: "50%",
        bottom: device === "phone" ? "36%" : "18%",
        transform: "translateX(-50%)",
        width: "max-content",
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        display: "flex",
        flexWrap: "wrap",
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
      <span data-testid="prompt-key" style={{ ...chip, height: "auto", minHeight: "2.2em",
        maxWidth: "45%", padding: "0.25em 0.4em", boxSizing: "border-box", flexShrink: 0,
        overflowWrap: "anywhere", textAlign: "center", lineHeight: 1.5,
        background: prompt.enabled ? colors.accent : "#5a5f6e" }}>
        {touch ? "USE" : keysLabel(interact)}
      </span>
      <span data-testid="prompt-text" style={{ minWidth: 0, flex: "1 1 14em", overflowWrap: "anywhere", lineHeight: 1.5,
        color: prompt.enabled ? colors.ink : colors.danger }}>
        {prompt.text}
      </span>
    </div>
  );
}
