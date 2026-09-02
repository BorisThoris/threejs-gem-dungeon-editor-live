import React from "react";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import useMapStore from "../store/mapStore";
import { GEMS_REQUIRED_FOR_END } from "../configs/runRules";

/**
 * The heads-up display for a run.
 *
 * It reads the real store - the same one the gems, the hazards and the end
 * door write to - so every number on screen is a number the game actually
 * uses. The HUD it replaces was drawn straight into the DOM from a third
 * parallel state object and showed "Health 100/100" and "Mana 100/100": two
 * stats that exist in no store, are spent by nothing and never moved.
 *
 * Every value is pulled through its own selector so a change to (say) the gem
 * count re-renders this panel and nothing else. It lives outside the R3F
 * Canvas, like RunSummary, so it never participates in the render loop.
 */

const PANEL_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 20,
  left: 20,
  minWidth: 210,
  padding: "14px 16px",
  background: "rgba(18, 21, 31, 0.82)",
  border: "1px solid #2b3345",
  borderRadius: 6,
  color: "#f2f4f8",
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 10,
  lineHeight: 1.6,
  letterSpacing: 0.5,
  pointerEvents: "none",
  userSelect: "none",
  zIndex: 1000,
};

const LABEL_STYLE: React.CSSProperties = {
  color: "#8b93a7",
  marginRight: 8,
};

function formatRoomLabel(roomType: string | undefined, roomId: string | null) {
  if (roomType) {
    return roomType.replace(/[-_]/g, " ").toUpperCase();
  }
  if (roomId) return roomId.toUpperCase();
  return "—";
}

export function GameHUD() {
  const lives = useConsolidatedGameStore((state) => state.playerStats.lives);
  const maxLives = useConsolidatedGameStore(
    (state) => state.playerStats.maxLives
  );
  const gems = useConsolidatedGameStore((state) => state.playerStats.gems);
  const currentRoomId = useConsolidatedGameStore(
    (state) => state.currentRoomId
  );

  // Selectors return primitives only: a derived object would be a new
  // reference every store update and would re-render the HUD constantly.
  const roomType = useMapStore(
    (state) =>
      state.currentMap?.rooms.find((room) => room.id === currentRoomId)?.type
  );
  const isEndRoom = useMapStore(
    (state) =>
      !!currentRoomId && state.currentMap?.endRoomId === currentRoomId
  );

  const gemsNeeded = Math.max(0, GEMS_REQUIRED_FOR_END - gems);
  const hearts =
    "♥".repeat(Math.max(0, lives)) +
    "♡".repeat(Math.max(0, maxLives - Math.max(0, lives)));

  return (
    <div style={PANEL_STYLE} data-testid="game-hud">
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={LABEL_STYLE}>LIVES</span>
        <span
          data-testid="hud-lives"
          style={{ color: lives > 1 ? "#f2f4f8" : "#f08196" }}
        >
          {hearts || "—"} {lives}/{maxLives}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={LABEL_STYLE}>GEMS</span>
        <span data-testid="hud-gems" style={{ color: "#7fe3ff" }}>
          {gems}/{GEMS_REQUIRED_FOR_END}
        </span>
      </div>

      <div
        data-testid="hud-gem-hint"
        style={{ fontSize: 8, color: "#8b93a7", margin: "2px 0 8px" }}
      >
        {gemsNeeded > 0
          ? `${gemsNeeded} more to open the end door`
          : "End door unlocked"}
      </div>

      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={LABEL_STYLE}>ROOM</span>
        <span
          data-testid="hud-room"
          style={{ color: isEndRoom ? "#7fe3ff" : "#f2f4f8" }}
        >
          {formatRoomLabel(roomType, currentRoomId)}
        </span>
      </div>
    </div>
  );
}

export default GameHUD;
