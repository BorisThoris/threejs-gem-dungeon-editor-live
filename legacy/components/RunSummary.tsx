import React, { useCallback, useEffect, useState } from "react";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import useMapStore from "../store/mapStore";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { ENABLED_BIOME_CATEGORIES } from "../configs/mapGeneration";

type Outcome = "won" | "lost";

interface Summary {
  outcome: Outcome;
  gems: number;
  roomsVisited: number;
  seconds: number;
}

/**
 * The screen that tells the player how the run went and lets them start
 * another one. Without it a run had no ending: reaching the end room did
 * nothing and running out of lives did nothing.
 *
 * Plain DOM rather than in-scene text - it has to be readable and clickable
 * even if the 3D scene is mid-transition.
 */
export function RunSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    const finish = (outcome: Outcome) => () => {
      const state = useConsolidatedGameStore.getState();
      setSummary({
        outcome,
        gems: state.playerStats.gems,
        roomsVisited: state.visitedRooms.size,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      });
    };

    const offWon = gameEvents.on(GAME_EVENTS.RUN_WON, finish("won"));
    const offLost = gameEvents.on(GAME_EVENTS.RUN_LOST, finish("lost"));
    return () => {
      offWon();
      offLost();
    };
  }, [startedAt]);

  const startNewRun = useCallback(() => {
    // Build a genuinely new dungeon: the map store refuses to regenerate while
    // one exists, so clear it first.
    useConsolidatedGameStore.getState().resetGame();
    useMapStore.getState().clearMap();
    useMapStore.getState().generateMap({}, ENABLED_BIOME_CATEGORIES);
    gameEvents.emit(GAME_EVENTS.RUN_STARTED);
    setSummary(null);
  }, []);

  if (!summary) return null;

  const won = summary.outcome === "won";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6, 8, 14, 0.82)",
        zIndex: 3000,
        fontFamily: "'Press Start 2P', monospace",
        color: "#f2f4f8",
      }}
    >
      <div
        style={{
          background: "#12151f",
          border: `2px solid ${won ? "#7fe3ff" : "#c9455c"}`,
          borderRadius: 6,
          padding: "34px 40px",
          textAlign: "center",
          maxWidth: 460,
        }}
      >
        <h2
          style={{
            margin: "0 0 22px",
            fontSize: 20,
            color: won ? "#7fe3ff" : "#f08196",
            lineHeight: 1.4,
          }}
        >
          {won ? "You made it out" : "You died down here"}
        </h2>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "12px 20px",
            fontSize: 11,
            margin: "0 0 28px",
            textAlign: "left",
          }}
        >
          <dt style={{ color: "#8b93a7" }}>Gems collected</dt>
          <dd style={{ margin: 0 }}>{summary.gems}</dd>
          <dt style={{ color: "#8b93a7" }}>Rooms explored</dt>
          <dd style={{ margin: 0 }}>{summary.roomsVisited}</dd>
          <dt style={{ color: "#8b93a7" }}>Time</dt>
          <dd style={{ margin: 0 }}>{summary.seconds}s</dd>
        </dl>

        <button
          type="button"
          onClick={startNewRun}
          style={{
            fontFamily: "inherit",
            fontSize: 11,
            padding: "14px 26px",
            cursor: "pointer",
            color: "#0a0c12",
            background: won ? "#7fe3ff" : "#f08196",
            border: "none",
            borderRadius: 4,
          }}
        >
          Run again
        </button>
      </div>
    </div>
  );
}

export default RunSummary;
