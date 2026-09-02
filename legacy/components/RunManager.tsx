import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import useMapStore from "../store/mapStore";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { DAMAGE_COOLDOWN_SECONDS } from "../configs/runRules";

/**
 * Decides when a run is over.
 *
 * The pieces for this all existed and none of them were connected: the map had
 * a start room and an end room, the store had lives, and EndBiome took an
 * onVictory prop that was never passed and never called. Reaching the end of
 * the dungeon did nothing at all, and losing every life did nothing either -
 * there was no game-over path anywhere in the codebase.
 *
 * Like RoomDetection, this renders nothing and loads nothing so it cannot be
 * suspended by room content.
 */
export function RunManager() {
  const resolved = useRef(false);
  const lastDamageAt = useRef(-Infinity);

  // A new run re-arms this.
  useEffect(() => {
    const unsubscribe = useConsolidatedGameStore.subscribe(
      (state) => state.playerStats.lives,
      (lives, previousLives) => {
        if (lives > previousLives) resolved.current = false;
      }
    );
    return unsubscribe;
  }, []);

  // Losing the last life ends the run.
  useEffect(() => {
    return useConsolidatedGameStore.subscribe(
      (state) => state.playerStats.lives,
      (lives) => {
        if (lives > 0 || resolved.current) return;
        resolved.current = true;
        useConsolidatedGameStore.getState().disableMovement();
        gameEvents.emit(GAME_EVENTS.RUN_LOST, {
          ...useConsolidatedGameStore.getState().playerStats,
        });
      }
    );
  }, []);

  // Reaching the end room wins it.
  useEffect(() => {
    return useConsolidatedGameStore.subscribe(
      (state) => state.currentRoomId,
      (roomId) => {
        if (!roomId || resolved.current) return;
        const endRoomId = useMapStore.getState().currentMap?.endRoomId;
        if (roomId !== endRoomId) return;

        resolved.current = true;
        const state = useConsolidatedGameStore.getState();
        state.disableMovement();
        gameEvents.emit(GAME_EVENTS.RUN_WON, { ...state.playerStats });
      }
    );
  }, []);

  // Hazards report damage through one event rather than each trap reaching
  // into the store itself, so the invulnerability window is enforced in a
  // single place and one spike cannot drain three lives in three frames.
  const elapsed = useRef(0);
  useFrame((state) => {
    elapsed.current = state.clock.getElapsedTime();
  });

  useEffect(() => {
    const handleHazard = () => {
      const now = elapsed.current;
      if (now - lastDamageAt.current < DAMAGE_COOLDOWN_SECONDS) return;
      if (useConsolidatedGameStore.getState().playerStats.lives <= 0) return;

      lastDamageAt.current = now;
      useConsolidatedGameStore.getState().loseLife();
    };

    window.addEventListener("playerHazard", handleHazard);
    return () => window.removeEventListener("playerHazard", handleHazard);
  }, []);

  return null;
}

export default RunManager;
