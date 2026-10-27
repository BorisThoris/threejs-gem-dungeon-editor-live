import { useState } from "react";
import { ITEMS, nameOf } from "../game/items/catalog";
import { describe } from "../game/items/charge";
import { itemUseBlurb } from "../game/items/feedback";
import { satchelSlots, useRun } from "../game/state/run";
import { QUICK_SLOTS } from "../game/items/inventory";
import { colors, secondaryButton, text } from "./overlay";

/** The grid and quick belt share the run's ordered inventory. */
export function SatchelInspection() {
  const satchel = useRun(s => s.satchel);
  const identified = useRun(s => s.identified);
  const appearances = useRun(s => s.appearances);
  const charges = useRun(s => s.charges);
  const capacity = useRun(satchelSlots);
  const [selected, setSelected] = useState<number | null>(null);
  const id = selected === null ? undefined : satchel[selected];
  const known = id ? id === "bomb" || identified.includes(id) : false;
  const swap = (from: number, to: number) => {
    if (useRun.getState().swapItems(from, to)) setSelected(to);
  };
  return <section aria-label="Backpack" data-testid="inventory-backpack">
    <h2 style={{ color: colors.ink, fontSize: text.body }}>Backpack <span style={{ color: colors.dim }}>{satchel.length}/{capacity}</span></h2>
    <p style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.7 }}>The first four slots are your quick belt. Select an item for details and belt assignment, or drag it onto another item to swap.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
      {Array.from({ length: capacity }, (_, slot) => {
        const item = satchel[slot], discovered = item ? item === "bomb" || identified.includes(item) : false;
        const label = item ? describe(charges[item], nameOf(item, appearances, discovered)) : "Empty";
        return <button key={slot} data-testid={`inspect-slot-${slot}`} aria-pressed={selected === slot}
          aria-label={`Slot ${slot + 1}${slot < QUICK_SLOTS ? ", quick belt" : ""}: ${label}`}
          draggable={!!item} onDragStart={event => event.dataTransfer.setData("text/plain", String(slot))}
          onDragOver={event => { if (item) event.preventDefault(); }}
          onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData("text/plain"); if (/^\d+$/.test(from)) swap(Number(from), slot); }}
          onClick={() => setSelected(slot)}
          style={{ minWidth: 0, minHeight: 106, padding: 8, borderRadius: 5, cursor: "pointer", font: "inherit",
            color: item ? colors.ink : colors.dim, background: selected === slot ? "#3d2c18" : "#17130f",
            border: `1px solid ${selected === slot ? colors.gold : slot < QUICK_SLOTS ? "#78603b" : colors.line}` }}>
          <span style={{ display: "block", textAlign: "left", fontSize: "0.65em", color: colors.dim }}>{slot + 1}{slot < QUICK_SLOTS ? " · BELT" : ""}</span>
          {item && <svg width="32" height="36" viewBox="0 0 32 36" aria-hidden="true" style={{ margin: "5px auto", display: "block", color: appearances[item].colour }}>
            {ITEMS[item].family === "potion" ? <path d="M12 2h8v8l7 10v12H5V20l7-10z" fill="currentColor" stroke="#e4cfaa" />
              : ITEMS[item].family === "scroll" ? <path d="M7 3h20l-3 30H4z M10 10h11 M9 17h11 M8 24h11" fill="currentColor" stroke="#6b5136" />
              : <><circle cx="16" cy="22" r="11" fill="currentColor" stroke="#e4cfaa" /><path d="M16 10V5l7-3" fill="none" stroke="#e4cfaa" strokeWidth="3" /></>}
          </svg>}
          <span style={{ display: "block", fontSize: text.small, lineHeight: 1.5, overflowWrap: "anywhere" }}>{item ? nameOf(item, appearances, discovered) : "—"}</span>
        </button>;
      })}
    </div>
    <div data-testid="inventory-item-details" style={{ marginTop: 14, padding: 14, border: `1px solid ${colors.line}`, borderRadius: 5, minHeight: 110 }}>
      {id && selected !== null ? <>
        <h3 style={{ color: colors.ink, fontSize: text.small }}>{describe(charges[id], nameOf(id, appearances, known))}</h3>
        <p style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.7 }}>{known ? itemUseBlurb(id, charges[id]) : "Its effect is unknown. Naming or using it reveals what it does."}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Array.from({ length: Math.min(QUICK_SLOTS, satchel.length) }, (_, target) => <button key={target}
            disabled={target === selected} data-testid={`inventory-to-${target}`} onClick={() => swap(selected, target)}
            style={{ ...secondaryButton, width: "auto", margin: 0, fontSize: text.small }}>Belt {target + 1}{target === selected ? " · here" : ""}</button>)}
          <button style={{ ...secondaryButton, width: "auto", margin: 0, fontSize: text.small }} data-testid="inventory-use"
            onClick={() => { useRun.getState().resume(); useRun.getState().useItem(selected); }}>Use & return</button>
        </div>
      </> : <p style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.7 }}>{satchel.length ? "Select an item to inspect it." : "Your backpack is empty. Gather supplies in the dungeon or buy them at a shop."}</p>}
    </div>
  </section>;
}
