import { useEffect, useRef, useState } from "react";

import { nameOf } from "../game/items/catalog";
import { describe } from "../game/items/charge";
import { itemUseBlurb } from "../game/items/feedback";
import { satchelSlots, useRun } from "../game/state/run";
import { QUICK_SLOTS } from "../game/items/inventory";
import { colors, secondaryButton, text } from "./overlay";

/** A safe place to remember a learned effect before committing a slot. */
export function SatchelInspection() {
  const satchel = useRun(s => s.satchel);
  const identified = useRun(s => s.identified);
  const appearances = useRun(s => s.appearances);
  const charges = useRun(s => s.charges);
  const capacity = useRun(satchelSlots);
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
      {open ? "Hide backpack" : `Backpack · ${satchel.length}/${capacity}`}
    </button>
    {open && <div id="satchel-inspection" style={{ marginBottom: 16 }}>
      <p style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.6 }}>
        Slots 1–4 are your quick belt. Select an item to inspect it or move it onto the belt.
        Using an item slides the remaining contents forward.
      </p>
      {satchel.map((id, slot) => {
        // Bombs have a fixed, visible identity; all shuffled kinds require discovery.
        const known = id === "bomb" || identified.includes(id);
        const shown = selected === slot;
        return <div key={slot}><button ref={shown ? expanded : undefined}
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
        </button>
          {shown && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {Array.from({ length: Math.min(QUICK_SLOTS, satchel.length) }, (_, target) =>
              <button key={target} disabled={target === slot} data-testid={`inventory-to-${target}`}
                style={{ ...secondaryButton, width: "auto", marginBottom: 0 }}
                onClick={() => {
                  if (useRun.getState().swapItems(slot, target)) setSelected(target);
                }}>Belt {target + 1}{target === slot ? " · here" : ""}</button>)}
          </div>}
        </div>;
      })}
    </div>}
  </>;
}
