import { useEffect, useState } from "react";

import { uiEvents, UI_EVENTS } from "../utils/uiEvents";

interface Prompt {
  key: string;
  text: string;
  enabled: boolean;
}

/**
 * The "Press E" prompt shown when the player is standing at a door.
 *
 * Travel is a deliberate act now rather than something that happens by walking
 * into geometry, so the player has to be told the door is there and what it
 * costs. DOM rather than in-scene text: it must be legible from any angle and
 * it must never suspend the room the way drei's Text can.
 */
export function DoorPrompt() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    const off = uiEvents.on(UI_EVENTS.DOOR_PROMPT, (next: Prompt | null) => {
      setPrompt(next);
    });
    return off;
  }, []);

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
        background: "rgba(10, 12, 18, 0.82)",
        border: `1px solid ${prompt.enabled ? "#7fe3ff" : "#c9455c"}`,
        color: "#f2f4f8",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 11,
        letterSpacing: "0.04em",
        pointerEvents: "none",
        zIndex: 1500,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 26,
          height: 26,
          borderRadius: 4,
          background: prompt.enabled ? "#7fe3ff" : "#5a5f6e",
          color: "#0a0c12",
          fontSize: 12,
        }}
      >
        {prompt.key}
      </span>
      <span style={{ color: prompt.enabled ? "#f2f4f8" : "#f08196" }}>
        {prompt.text}
      </span>
    </div>
  );
}

export default DoorPrompt;
