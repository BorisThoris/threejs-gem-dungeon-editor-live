import { useState } from "react";

import { colors } from "../ui/overlay";
import { Inspector } from "./Inspector";
import { Mosaic } from "./Mosaic";
import { Painter } from "./Painter";
import { RoomBuilder } from "./RoomBuilder";
import { shell, tab, topbar } from "./styles";

type Tab = "rooms" | "props" | "surfaces" | "mosaic";

const TABS: { id: Tab; title: string }[] = [
  { id: "rooms", title: "ROOMS" },
  { id: "props", title: "PROPS" },
  { id: "surfaces", title: "SURFACES" },
  { id: "mosaic", title: "MOSAIC" },
];

/**
 * The authoring tools, on top of the game's own modules.
 *
 * Reached with `?editor` in development only; the production bundle never
 * contains this tree. Every tool here writes into something the game reads:
 * rooms into the template registry, surfaces into the texture registry.
 * Nothing authored here can fail to reach a run.
 */
export default function Editor() {
  const [current, setCurrent] = useState<Tab>("rooms");
  return (
    <div style={shell}>
      <div style={topbar}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", marginRight: 12 }}>GEM DUNGEON · EDITOR</span>
        {TABS.map((t) => (
          <button key={t.id} style={tab(current === t.id)} onClick={() => setCurrent(t.id)}>
            {t.title}
          </button>
        ))}
        <a href={window.location.pathname} style={{ marginLeft: "auto", color: colors.accent, fontSize: 10, textDecoration: "none" }}>
          Back to game →
        </a>
      </div>
      <div style={{ padding: 16, minHeight: 0, overflow: "auto" }}>
        {current === "rooms" && <RoomBuilder />}
        {current === "props" && <Inspector />}
        {current === "surfaces" && <Painter />}
        {current === "mosaic" && <Mosaic />}
      </div>
    </div>
  );
}
