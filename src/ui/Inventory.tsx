import { useRef, useState } from "react";
import { canControl, useRun } from "../game/state/run";
import { useSettings } from "../game/state/settings";
import { keysLabel } from "../game/input/bindings";
import { colors, FONT, fullscreen, MINIMAP_SIZE, MINIMAP_SCALE, secondaryButton, text } from "./overlay";
import { useCompactViewport, useTouchControls } from "../game/input/device";
import { usePadMenu } from "./padMenu";
import { SatchelInspection } from "./SatchelInspection";
import { Equipment } from "./Equipment";
import { RelicInspection } from "./RelicInspection";
import { Naming } from "./PauseMenu";

export function InventoryButton() {
  const enabled = useRun(canControl);
  const binding = useSettings(s => s.bindings.inventory);
  const compact = useCompactViewport();
  const touch = useTouchControls();
  if (!enabled || touch) return null;
  return <button data-testid="inventory-open" onClick={() => useRun.getState().pause("inventory")}
    style={{ ...secondaryButton, position: "fixed", top: MINIMAP_SIZE * (compact ? .6 : MINIMAP_SCALE) + 32, right: compact ? 12 : 20, width: "auto",
      padding: "8px 12px", fontFamily: FONT, fontSize: text.small, zIndex: 980 }}>
    Inventory · {keysLabel(binding)}
  </button>;
}

export function Inventory() {
  const panel = useRef<HTMLDivElement>(null);
  const [identifying, setIdentifying] = useState(false);
  const resume = useRun(s => s.resume);
  const gems = useRun(s => s.gems);
  const lives = useRun(s => s.lives);
  const binding = useSettings(s => s.bindings.inventory);
  usePadMenu({ container: panel, onBack: resume });
  return <div data-testid="inventory-panel" role="dialog" aria-modal="true" aria-label="Inventory and equipment"
    style={{ ...fullscreen, background: "rgba(5,6,8,.88)", zIndex: 1250 }}>
    <style>{`.gd-inventory-columns{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(240px,1fr);gap:24px}@media(max-width:700px){.gd-inventory-columns{grid-template-columns:minmax(0,1fr);gap:18px}}`}</style>
    <div ref={panel} style={{ width: "min(1000px, calc(100vw - 24px))", maxHeight: "calc(100dvh - 24px)", display: "flex", flexDirection: "column", boxSizing: "border-box",
      background: "#110e0b", border: `1px solid ${colors.line}`, borderRadius: 9, padding: 0, fontFamily: FONT, fontSize: text.body, color: colors.ink }}>
      <header style={{ flexShrink: 0, background: "#110e0b", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderBottom: `1px solid ${colors.line}`, padding: "16px clamp(12px, 3vw, 28px)" }}>
        <div><h1 style={{ fontSize: text.body, margin: "0 0 10px" }}>INVENTORY</h1>
          <span style={{ color: colors.gold, fontSize: text.small }}>{gems} gems · {lives} lives</span></div>
        <button data-testid="inventory-close" style={{ ...secondaryButton, width: "auto", margin: 0 }} onClick={resume}>Return · {keysLabel(binding)} / Esc</button>
      </header>
      <div style={{ overflowY: "auto", padding: "0 clamp(12px, 3vw, 28px) 24px" }}>
      <p style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.7 }}>The dungeon waits while you prepare. Use an item to return to play.</p>
      <div className="gd-inventory-columns">
        <SatchelInspection />
        <aside aria-label="Equipment and discoveries"><Equipment /><RelicInspection />
          <button data-testid="inventory-identify" style={secondaryButton} aria-expanded={identifying}
            onClick={() => setIdentifying(value => !value)}>{identifying ? "Hide identification" : "Identify unknown items"}</button>
          {identifying && <Naming />}
        </aside>
      </div>
      </div>
    </div>
  </div>;
}
