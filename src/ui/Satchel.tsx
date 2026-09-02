import { useEffect, useState } from "react";

import { bus } from "../game/events";
import { ITEMS, SATCHEL_SLOTS, nameOf } from "../game/items/catalog";
import { useRun } from "../game/state/run";
import { FONT, colors, text } from "./overlay";

/**
 * What you are carrying, and what pressing 1 to 4 will do.
 *
 * A slot shows the item's look, not its name, until the run has learned
 * what that look means - so the satchel is a row of guesses, and the
 * decision the game wants is whether now is the moment to find out.
 */
export function Satchel() {
  const satchel = useRun((s) => s.satchel);
  const identified = useRun((s) => s.identified);
  const appearances = useRun((s) => s.appearances);

  if (satchel.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 22,
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        fontFamily: FONT,
        pointerEvents: "none",
        zIndex: 900,
      }}
    >
      {Array.from({ length: SATCHEL_SLOTS }, (_, i) => {
        const id = satchel[i];
        const known = id ? identified.includes(id) : false;
        const look = id ? appearances[id] : null;
        return (
          <div
            key={i}
            style={{
              width: 128,
              padding: "8px 10px",
              borderRadius: 6,
              background: colors.panel,
              border: `1px solid ${id ? colors.line : "rgba(255,255,255,0.05)"}`,
              opacity: id ? 1 : 0.35,
            }}
          >
            <div style={{ fontSize: text.small, color: colors.dim, marginBottom: 6 }}>
              <span style={{ color: id ? colors.accent : colors.dim }}>{i + 1}</span>
              {id && ITEMS[id].family === "scroll" ? " scroll" : id ? " potion" : " —"}
            </div>
            {id && look && (
              <>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: look.colour,
                    marginBottom: 6,
                  }}
                />
                <div style={{ fontSize: text.small, lineHeight: 1.5, color: colors.ink }}>
                  {known ? ITEMS[id].name.replace(/^(Potion|Scroll) of /, "") : shortLook(nameOf(id, appearances, false))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "an inky potion" -> "inky"; "a scroll marked KHOR VELUM" -> "KHOR VELUM". */
const shortLook = (unknown: string): string =>
  unknown.replace(/^an? scroll marked /, "").replace(/^an? /, "").replace(/ potion$/, "");

/**
 * What just happened to the thing you drank.
 *
 * Shown for a few seconds after using an item, because the effects are
 * mostly invisible - a floor waking, a map filling in, legs going heavy -
 * and an unidentified item you cannot see the result of teaches nothing.
 */
export function ItemLog() {
  const [line, setLine] = useState<{ text: string; cruel: boolean; at: number } | null>(null);
  const appearances = useRun((s) => s.appearances);

  useEffect(() => {
    const offs = [
      bus.on("itemUsed", ({ id, cruel }) => {
        const item = ITEMS[id as keyof typeof ITEMS];
        setLine({ text: `${item.name}. ${item.blurb}`, cruel, at: Date.now() });
      }),
      bus.on("itemTaken", ({ id }) => {
        const known = useRun.getState().identified.includes(id as never);
        setLine({
          text: `Taken: ${nameOf(id as never, appearances, known)}.`,
          cruel: false,
          at: Date.now(),
        });
      }),
      bus.on("runStarted", () => setLine(null)),
    ];
    return () => offs.forEach((off) => off());
  }, [appearances]);

  useEffect(() => {
    if (!line) return;
    const t = window.setTimeout(() => setLine(null), 4200);
    return () => window.clearTimeout(t);
  }, [line]);

  if (!line) return null;

  return (
    <div
      key={line.at}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 118,
        transform: "translateX(-50%)",
        maxWidth: 560,
        padding: "9px 15px",
        borderRadius: 6,
        background: colors.panel,
        border: `1px solid ${line.cruel ? colors.danger : colors.line}`,
        fontFamily: FONT,
        fontSize: text.small,
        lineHeight: 1.6,
        color: line.cruel ? colors.danger : colors.ink,
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 900,
      }}
    >
      {line.text}
    </div>
  );
}
