import { useState } from "react";

import { colors } from "../ui/overlay";
import { WORLD_STYLE } from "../game/rooms/style";
import { Inspector } from "./Inspector";
import { Mosaic } from "./Mosaic";
import { Painter } from "./Painter";
import { RoomBuilder } from "./RoomBuilder";
import { ScenarioShelf } from "./ScenarioShelf";
import { SignalGraph } from "./SignalGraph";
import { TestHall } from "./TestHall";
import { WorldAtlas } from "./WorldAtlas";
import { shell, tab, topbar } from "./styles";

type Tab = "rooms" | "props" | "hall" | "cases" | "signals" | "surfaces" | "mosaic" | "world";

const TABS: { id: Tab; title: string }[] = [
  { id: "world", title: "WORLD" },
  { id: "rooms", title: "ROOMS" },
  { id: "props", title: "PROPS" },
  { id: "hall", title: "TEST HALL" },
  { id: "cases", title: "SCENARIOS" },
  { id: "signals", title: "SIGNALS" },
  { id: "surfaces", title: "SURFACES" },
  { id: "mosaic", title: "MOSAIC" },
];

/**
 * The authoring tools, on top of the game's own modules.
 *
 * Reached with `?editor` in development only; the production bundle never
 * contains this tree. Authoring tools write into the game's template and
 * texture registries. Inspection tools read the same geometry and rules as
 * play, so a diagnostic describes the shipped simulation.
 */
export default function Editor() {
  const [current, setCurrent] = useState<Tab>(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return TABS.some(tab => tab.id === requested) ? requested as Tab : "rooms";
  });
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
        <details style={{ marginBottom: 16, maxWidth: 900, lineHeight: 1.7 }}>
          <summary style={{ cursor: "pointer", color: colors.accent }}>WORLD STYLE · old-school, blocky, handmade</summary>
          <p>{WORLD_STYLE}</p>
          <p>Build connected districts. Water and roots collect in beds; worked stone follows courses. Keep door lanes clear, reserve puzzle anchors, and give hidden rooms a readable wall clue.</p>
        </details>
        {current === "rooms" && <RoomBuilder />}
        {current === "world" && <WorldAtlas />}
        {current === "props" && <Inspector />}
        {current === "hall" && <TestHall />}
        {current === "cases" && <ScenarioShelf />}
        {current === "signals" && <SignalGraph />}
        {current === "surfaces" && <Painter />}
        {current === "mosaic" && <Mosaic />}
      </div>
    </div>
  );
}
