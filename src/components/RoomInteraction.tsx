import React from "react";
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

  // Cards are now shown based on room loading, not proximity
  if (!actionRoomType) return null;

  // CARDS DISABLED - Keep logic but don't render cards
  return null;

  // Original card rendering logic (commented out but preserved):
  /*
  return (
    <>
    </>
  );
  */
};

export default RoomInteraction;
