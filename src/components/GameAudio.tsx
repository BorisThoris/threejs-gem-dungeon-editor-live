import { useEffect, useRef } from "react";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { sfx } from "../utils/audio";

/**
 * Turns the game's existing events into sound.
 *
 * The game shipped silent: assets/sounds/ holds only an index file and
 * useSoundEffects was never called. Every cue below hangs off a signal the
 * core loop already emits, so nothing in the gameplay code had to learn about
 * audio.
 *
 * DOM-only, mounted outside the Canvas - it neither renders nor loads
 * anything.
 */
export function GameAudio() {
  const lastLives = useRef<number | null>(null);
  const lastRoom = useRef<string | null>(null);

  useEffect(() => {
    const offGem = gameEvents.on(GAME_EVENTS.GEM_COLLECTED, () => sfx.gem());
    const offWon = gameEvents.on(GAME_EVENTS.RUN_WON, () => sfx.win());
    const offLost = gameEvents.on(GAME_EVENTS.RUN_LOST, () => sfx.lose());

    // Losing a life is a store change rather than an event, so watch it.
    const offLives = useConsolidatedGameStore.subscribe(
      (state) => state.playerStats.lives,
      (lives) => {
        if (lastLives.current !== null && lives < lastLives.current && lives > 0) {
          sfx.hurt();
        }
        lastLives.current = lives;
      }
    );

    // Changing room means the player just walked through a door.
    const offRoom = useConsolidatedGameStore.subscribe(
      (state) => state.currentRoomId,
      (roomId) => {
        if (lastRoom.current && roomId && roomId !== lastRoom.current) {
          sfx.door();
        }
        lastRoom.current = roomId;
      }
    );

    return () => {
      offGem();
      offWon();
      offLost();
      offLives();
      offRoom();
    };
  }, []);

  // M mutes, which players expect and reviewers check for.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "m" || event.key === "M") {
        sfx.setMuted(!sfx.isMuted());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}

export default GameAudio;
