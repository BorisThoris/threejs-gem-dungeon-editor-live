import { useEffect, useRef, useState } from "react";

import { nameOf } from "../game/items/catalog";
import { describe } from "../game/items/charge";
import { itemUseBlurb } from "../game/items/feedback";
import { useRun } from "../game/state/run";
import { colors, secondaryButton, text } from "./overlay";

/** A safe place to remember a learned effect before committing a slot. */
export function SatchelInspection() {
  const satchel = useRun(s => s.satchel);
  const identified = useRun(s => s.identified);
  const appearances = useRun(s => s.appearances);
  const charges = useRun(s => s.charges);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const expanded = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    expanded.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!satchel.length) return null;
  return <>
    <button style={secondaryButton} data-testid="pause-satchel" aria-expanded={open}
      aria-controls="satchel-inspection" onClick={() => setOpen(value => !value)}>
      {open ? "Hide satchel" : "Inspect satchel"}
    </button>
    {open && <div id="satchel-inspection" style={{ marginBottom: 16 }}>
      {satchel.map((id, slot) => {
        // Bombs have a fixed, visible identity; all shuffled kinds require discovery.
        const known = id === "bomb" || identified.includes(id);
        const shown = selected === slot;
        return <button key={slot} ref={shown ? expanded : undefined}
          data-testid={`inspect-slot-${slot}`} aria-expanded={shown}
          style={{ ...secondaryButton, textAlign: "left", fontSize: text.small, overflowWrap: "anywhere" }}
          onClick={() => setSelected(shown ? null : slot)}>
          <span style={{ display: "flex", gap: 12, justifyContent: "space-between", color: colors.ink }}>
            <span>{slot + 1} · {describe(charges[id], nameOf(id, appearances, known))}</span>
            <span aria-hidden="true">{shown ? "−" : "+"}</span>
          </span>
          {shown && <span style={{ display: "block", marginTop: 8, color: colors.dim, lineHeight: 1.6 }}>
            {known ? itemUseBlurb(id, charges[id]) : "Its effect is still unknown. Naming or using it reveals what it does."}
          </span>}
        </button>;
      })}
    </div>}
  </>;
}
