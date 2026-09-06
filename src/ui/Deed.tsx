import { useEffect, useState } from "react";

import { DEEDS, type DeedId } from "../game/deeds/catalog";
import { bus } from "../game/events";
import { colors, FONT, MINIMAP_SCALE, MINIMAP_SIZE, text } from "./overlay";
import { useTouchControls } from "../game/input/device";

/**
 * The card that says a deed was done.
 *
 * Bottom right, above the satchel and clear of the HUD, for five seconds.
 * It is the one piece of UI in the game that appears without the player
 * doing anything to summon it, so it is small, it never takes the pointer,
 * and it never covers the middle of the screen - a player who earns "It
 * Bleeds" is at that moment standing next to a wounded Warden, and a
 * banner across the view would be the worst possible reward for it.
 *
 * One at a time, newest wins. Two deeds inside five seconds is rare and
 * queueing them would mean the second arriving after the moment it
 * belonged to.
 */
const HOLD_MS = 5000;

export function DeedToast() {
  const [shown, setShown] = useState<DeedId | null>(null);

  useEffect(() => {
    let timer = 0;
    const off = bus.on("deedEarned", ({ id }) => {
      setShown(id as DeedId);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(null), HOLD_MS);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  // The bottom corner is where the thumb's buttons are on a touchscreen,
  // so the toast goes under the minimap instead.
  const touch = useTouchControls();
  if (!shown || !DEEDS[shown]) return null;
  const deed = DEEDS[shown];

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        ...(touch ? { top: 20 + MINIMAP_SIZE * MINIMAP_SCALE + 14 } : { bottom: 20 }),
        maxWidth: 300,
        padding: "12px 16px",
        background: colors.panel,
        border: `1px solid ${colors.gold}`,
        borderRadius: 6,
        fontFamily: FONT,
        pointerEvents: "none",
        zIndex: 950,
      }}
    >
      <div style={{ fontSize: text.small, color: colors.dim, letterSpacing: "0.08em" }}>DEED</div>
      <div style={{ fontSize: text.body, color: colors.gold, margin: "2px 0 4px" }}>{deed.name}</div>
      <div style={{ fontSize: text.small, color: colors.ink, lineHeight: 1.5 }}>{deed.blurb}</div>
    </div>
  );
}
