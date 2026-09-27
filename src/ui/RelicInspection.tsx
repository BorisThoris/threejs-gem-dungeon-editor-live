import { useEffect, useRef, useState } from "react";

import { RELICS, relicDescription, type RelicId } from "../game/relics/catalog";
import { PAIRS } from "../game/relics/offer";
import { useRun } from "../game/state/run";
import { colors, secondaryButton, text } from "./overlay";

/** Remember the kit and its next possible pair without spending run time. */
export function RelicInspection() {
  const relics = useRun(s => s.relics);
  const floor = useRun(s => s.floor);
  const roomBias = useRun(s => s.dungeon?.roomBias === true);
  const fullCountFloor = useRun(s => s.fullCountFloor);
  const booksSpent = useRun(s => s.booksSpent);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RelicId | null>(null);
  const expanded = useRef<HTMLButtonElement>(null);
  useEffect(() => { expanded.current?.scrollIntoView({ block: "nearest" }); }, [selected]);

  if (!relics.length) return null;
  return <>
    <button style={secondaryButton} data-testid="pause-relics" aria-expanded={open}
      aria-controls="relic-inspection" onClick={() => setOpen(value => !value)}>
      {open ? "Hide relics" : "Inspect relics"}
    </button>
    {open && <div id="relic-inspection" style={{ marginBottom: 16 }}>
      {relics.map(id => {
        const shown = selected === id;
        const pair = PAIRS.find(pair => pair.of.includes(id));
        const missing = pair?.of.find(other => !relics.includes(other));
        const status = missing ? `Find ${RELICS[missing].name} to complete ${pair!.name}.`
          : pair?.of.includes("tally") && fullCountFloor !== null
            ? `${pair.name}: hoard on floor ${fullCountFloor}.${floor > fullCountFloor ? " You have passed that floor." : " Seek its vault before descending past it."}`
            : pair?.of.includes("cant") ? `${pair.name}: key trade ${booksSpent ? "used this run" : "available once this run"}.`
              : pair ? `${pair.name}: active.` : null;
        return <button key={id} ref={shown ? expanded : undefined} data-testid={`inspect-relic-${id}`}
          aria-expanded={shown} onClick={() => setSelected(shown ? null : id)}
          style={{ ...secondaryButton, textAlign: "left", fontSize: text.small, overflowWrap: "anywhere" }}>
          <span style={{ display: "flex", gap: 12, justifyContent: "space-between", color: colors.ink }}>
            <span>{RELICS[id].name}</span><span aria-hidden="true">{shown ? "−" : "+"}</span>
          </span>
          {shown && <span style={{ display: "block", marginTop: 8, lineHeight: 1.6, color: colors.dim }}>
            {relicDescription(id, floor)}
            {id === "tally" && roomBias && <span style={{ display: "block", marginTop: 8 }}>
              This floor was generated with the Tally's room effect.
            </span>}
            {pair && <span style={{ display: "block", marginTop: 8 }}>
              <span style={{ color: colors.gold }}>{status}</span><br />{pair.does}
            </span>}
          </span>}
        </button>;
      })}
    </div>}
  </>;
}
