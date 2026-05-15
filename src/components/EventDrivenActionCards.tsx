import React, { useState, useEffect, useMemo, useCallback } from "react";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { useGameState } from "../hooks/useGameState";
import RoomActionCards from "./RoomActionCards";
import { useRoomActions } from "../hooks/useRoomActions";

// Room type mapping
const getRoomTypeForActions = (roomType: string) => {
  switch (roomType) {
    case "boss":
      return "boss";
    case "meditation":
      return "meditation";
    case "bench-press":
      return "benchpress";
    case "library":
      return "library";
    case "shop":
      return "shop";
    case "treasure":
      return "treasure";
    case "challenge":
      return "challenge";
    case "puzzle":
      return "puzzle";
    case "arena":
      return "arena";
    case "start":
      return "start";
    case "end":
      return "end";
    case "normal":
      return "normal";
    case "secret":
      return "secret";
    case "trap":
      return "trap";
    case "devil-room":
      return "devil";
    case "angel-room":
      return "angel";
    case "coffee":
      return "coffee";
    case "portal":
      return "portal";
    case "gym":
      return "gym";
    case "workshop":
      return "workshop";
    case "kitchen":
      return "kitchen";
    case "bedroom":
      return "bedroom";
    case "garden":
      return "garden";
    case "laboratory":
      return "laboratory";
    case "observatory":
      return "observatory";
    case "stairs":
      return "stairs";
    case "middle-stairs":
      return "middle-stairs";
    case "memory-game-puzzle":
      return "memory-game-puzzle";
    default:
      return null;
  }
};

const EventDrivenActionCards: React.FC = () => {
  const { getState } = useGameState();
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Memoize callbacks to prevent unnecessary re-renders
  const callbacks = useMemo(
    () => ({
      onPuzzleStart: () => {
        /* Puzzle started! */
      },
      onShopOpen: () => {
        /* Shop opened! */
      },
      onChallengeStart: () => {
        /* Challenge started! */
      },
      onTreasureOpen: () => {
        /* Treasure opened! */
      },
      onArenaFight: () => {
        /* Arena fight started! */
      },
      onBossFight: () => {
        /* Boss fight started! */
      },
    }),
    []
  );

  // Get room type for actions
  const roomType = useMemo(() => {
    return currentRoom ? getRoomTypeForActions(currentRoom.type) : null;
  }, [currentRoom]);

  const {
    cards,
    isVisible: cardsVisible,
    showCards,
    hideCards,
  } = useRoomActions({
    roomType: roomType || "meditation",
    ...callbacks,
  });

  // Handle room changes
  useEffect(() => {
    const state = getState();
    if (state.currentRoom && state.currentRoom !== currentRoom) {
      setCurrentRoom(state.currentRoom);
      // Show cards after a short delay
      setTimeout(() => {
        showCards();
        setIsVisible(true);
      }, 500);
    }
  }, [getState, currentRoom, showCards]);

  // Handle game events
  useEffect(() => {
    const handleGameEvent = (event: any) => {
      switch (event.type) {
        case GAME_EVENTS.ROOM_ENTERED:
          if (event.room) {
            setCurrentRoom(event.room);
            setTimeout(() => {
              showCards();
              setIsVisible(true);
            }, 500);
          }
          break;
        case GAME_EVENTS.ROOM_EXITED:
          hideCards();
          setIsVisible(false);
          setCurrentRoom(null);
          break;
        case GAME_EVENTS.CARDS_HIDE:
          hideCards();
          setIsVisible(false);
          break;
        case GAME_EVENTS.CARDS_SHOW:
          showCards();
          setIsVisible(true);
          break;
        default:
          break;
      }
    };

    // Subscribe to game events
    gameEvents.on("*", handleGameEvent);

    return () => {
      gameEvents.off("*", handleGameEvent);
    };
  }, [showCards, hideCards]);

  // Don't render if no room or no room type
  if (!currentRoom || !roomType) {
    return null;
  }

  // CARDS DISABLED - Keep all logic but don't render cards
  return null;

  // Original card rendering logic (commented out but preserved):
  /*
  return (
    <RoomActionCards
      cards={cards}
      isVisible={isVisible && cardsVisible}
      onCardClick={(card) => {
        // Handle card click
        hideCards();
        setIsVisible(false);
      }}
    />
  );
  */
};

export default EventDrivenActionCards;
