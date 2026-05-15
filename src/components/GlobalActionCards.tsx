import React, { useEffect, useState, useMemo, useCallback } from "react";
import useMapStore from "../store/mapStore";
import useGameStore from "../store/gameStore";
import RoomActionCards from "./RoomActionCards";
import { useRoomActions } from "../hooks/useRoomActions";
import { mapToRoomType } from "../utils/roomTypeMapper";

const GlobalActionCards: React.FC = () => {
  const { currentMap, currentRoomId } = useMapStore();
  const { gamePhase } = useGameStore();
  const [showCards, setShowCards] = useState(false);
  const lastRoomId = React.useRef<string | null>(null);

  // Memoize current room to prevent unnecessary re-calculations
  const currentRoom = useMemo(() => {
    return currentMap?.rooms.find((room) => room.id === currentRoomId);
  }, [currentMap, currentRoomId]);

  // Memoize action room type to prevent unnecessary recalculations
  const actionRoomType = useMemo(() => {
    return currentRoom ? mapToRoomType(currentRoom.type) : null;
  }, [currentRoom]);

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

  const {
    cards,
    isVisible,
    showCards: showActionCards,
    hideCards,
  } = useRoomActions({
    roomType: (actionRoomType || "meditation") as any, // fallback to meditation
    ...callbacks,
  });

  // Optimized effect with proper dependency management
  useEffect(() => {
    // Only update if room actually changed
    if (currentRoomId !== lastRoomId.current) {
      lastRoomId.current = currentRoomId;

      if (currentRoom && actionRoomType && gamePhase === "exploration") {
        // Simple timeout for showing action cards
        const timer = setTimeout(() => {
          showActionCards();
        }, 300); // Reduced delay for better responsiveness

        return () => clearTimeout(timer);
      } else {
        hideCards();
      }
    }
  }, [
    currentRoomId,
    currentRoom,
    actionRoomType,
    gamePhase,
    showActionCards,
    hideCards,
  ]);

  // Don't show cards if no room or no action room type
  if (!currentRoom || !actionRoomType) {
    return null;
  }

  // CARDS DISABLED - Keep logic but don't render cards
  return null;

  // Original card rendering logic (commented out but preserved):
  /*
  return (
    <RoomActionCards
      cards={cards}
      isVisible={isVisible}
      onCardClick={(card) => {
        // Card clicked
        // Handle card actions here
        hideCards();
      }}
    />
  );
  */
};

export default GlobalActionCards;
