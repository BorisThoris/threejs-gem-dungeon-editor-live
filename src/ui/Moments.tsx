import { useEffect, useState } from "react";

import { bus } from "../game/events";
import { MOMENTS, type Moment, type MomentRow } from "./momentBeats";
import { FONT, colors, text } from "./overlay";

/**
 * The four moments the arc is built around, given a beat.
 *
 * Everything in this game that matters happens, and until now most of it
 * happened at the same size as everything else. Walking down to the next
 * floor was the same 220ms cut as walking through any door on it. The
 * cracked wall coming down - the thing a whole system of tells, drafts and
 * bombs exists to lead you to - was a burst like any other burst. The
 * Keeper kneeling, which is the one instant on the last floor when the
 * exit is passable, was a HUD line changing. And the Harrier's strike was
 * the same red flash as walking into spikes, though it comes from above.
 *
 * They are the punctuation of a run, so they get their own marks. One
 * table, one player: a moment is an event, a hold, and what is drawn, and
 * a new one is a row rather than another effect somewhere in the tree.
 *
 * Nothing here blocks: the game is already back underneath, and a beat
 * that takes the controls away from a player who has just been hit is
 * worse than no beat at all.
 */

export function Moments() {
  const [moment, setMoment] = useState<{ m: Moment; at: number } | null>(null);

  useEffect(() => {
    /**
     * Subscribed from the table rather than one listener per moment, so a
     * new beat is a row and cannot be added without also being drawn.
     */
    const subscribe = bus.on as unknown as (
      event: MomentRow["event"],
      handler: (payload: never) => void
    ) => () => void;
    const offs = MOMENTS.map((row) =>
      subscribe(row.event, (payload) =>
        setMoment({
          m: {
            id: row.id,
            hold: row.hold,
            wash: row.wash,
            // The floor's number belongs on its own card, and nothing
            // else has one to show.
            title:
              row.id === "descent"
                ? `${row.title} ${(payload as unknown as { floor: number }).floor}`
                : row.title,
            line: row.line ? row.line(payload) : undefined,
          },
          at: Date.now(),
        })
      )
    );
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    if (!moment) return;
    const t = window.setTimeout(() => setMoment(null), moment.m.hold);
    return () => window.clearTimeout(t);
  }, [moment]);

  if (!moment) return null;
  const { m, at } = moment;
  return (
    <>
      <style>{`
        @keyframes gd-moment { from { opacity: 1 } to { opacity: 0 } }
        @keyframes gd-moment-in { 0% { opacity: 0 } 12% { opacity: 1 } 70% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
      <div
        key={at}
        data-testid={`moment-${m.id}`}
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: m.wash,
          animation: `${m.title ? "gd-moment-in" : "gd-moment"} ${m.hold}ms ease-out forwards`,
          fontFamily: FONT,
          textAlign: "center",
          padding: "0 8vw",
          // Never in the way: the room is already back underneath, and a
          // beat that eats a keypress is worse than no beat.
          pointerEvents: "none",
          zIndex: 945,
        }}
      >
        {m.title && (
          <div style={{ fontSize: text.title, letterSpacing: 4, color: colors.ink }}>{m.title}</div>
        )}
        {m.line && (
          <div style={{ fontSize: text.body, color: colors.dim, maxWidth: 640, lineHeight: 1.7 }}>
            {m.line}
          </div>
        )}
      </div>
    </>
  );
}
