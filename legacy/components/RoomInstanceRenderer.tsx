import React from "react";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import useMapStore from "../store/mapStore";
import Room from "./Room";

interface RoomInstanceRendererProps {
  playerPosition?: [number, number, number];
  onInteraction?: (interactionType: string, roomId: string) => void;
  onRoomTransition?: (
    fromRoomId: string,
    toRoomId: string,
    direction: string
  ) => void;
}

const RoomInstanceRenderer: React.FC<RoomInstanceRendererProps> = ({
  playerPosition = [0, 0, 0],
  onInteraction,
  onRoomTransition,
}) => {
  const { currentRoomId, roomInstances } = useConsolidatedGameStore();

  // Get current room instance
  const currentRoomInstance = currentRoomId
    ? roomInstances.get(currentRoomId)
    : null;
  const currentRoom = currentRoomInstance?.room;

  // No room loaded or room not loaded yet - return null (instant transitions)
  if (!currentRoomInstance || !currentRoom || !currentRoomInstance.isLoaded) {
    return null;
  }

  // Render the current room at origin (room-instance mode)
  const roomAtOrigin = {
    ...currentRoom,
    position: { x: 0, y: 0, z: 0 }, // Always render at origin in room-instance mode
  };

  return (
    <group>
      <Room
        room={roomAtOrigin}
        isCurrent={true}
        isVisited={true}
        connectedRooms={
          currentRoom.connections
            ?.map((connectionId) =>
              // Find connected room from map
              useMapStore
                .getState()
                .currentMap?.rooms.find((r) => r.id === connectionId)
            )
            .filter(Boolean) || []
        }
        playerPosition={playerPosition}
        onInteraction={onInteraction}
        onRoomTransition={onRoomTransition}
        disableDoors={true} // Disable internal door rendering to prevent duplication
      />
    </group>
  );
};

export default RoomInstanceRenderer;
