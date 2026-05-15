import React from "react";
import RoomActionCards from "./RoomActionCards";
import { useRoomActions } from "../hooks/useRoomActions";
import { mapToRoomType } from "../utils/roomTypeMapper";
import type { Room } from "../types/map";

interface RoomInteractionProps {
  room: Room;
  playerPosition: [number, number, number];
  onInteraction: (type: string, roomId: string) => void;
}

const RoomInteraction: React.FC<RoomInteractionProps> = ({
  room,
  playerPosition: _playerPosition,
  onInteraction,
}) => {
  // Game store functions handled through card system

  const actionRoomType = mapToRoomType(room.type);
  const { cards, isVisible, hideCards } = useRoomActions({
    roomType: (actionRoomType || "meditation") as any, // fallback to meditation
    onPuzzleStart: () => onInteraction("puzzle", room.id),
    onShopOpen: () => onInteraction("shop", room.id),
    onChallengeStart: () => onInteraction("challenge", room.id),
    onTreasureOpen: () => onInteraction("treasure", room.id),
    onArenaFight: () => onInteraction("arena", room.id),
    onBossFight: () => onInteraction("boss", room.id),
  });

  // Cards are now shown based on room loading, not proximity
  if (!actionRoomType) return null;

  // CARDS DISABLED - Keep logic but don't render cards
  return null;

  // Original card rendering logic (commented out but preserved):
  /*
  return (
    <>
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          onInteraction(card.id, room.id);
          hideCards();
        }}
      />
    </>
  );
  */
};

export default RoomInteraction;
