import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";
import useMapStore from "../store/mapStore";

const RoomTransitionTest: React.FC = () => {
  const { currentRoomId, roomInstances, startTransition } =
    useRoomManagerStore();

  const { currentMap } = useMapStore();

  const handleTestTransition = async () => {
    if (!currentMap || !currentRoomId) return;

    // Find a connected room to transition to
    const currentRoom = currentMap.rooms.find((r) => r.id === currentRoomId);
    if (!currentRoom || currentRoom.connections.length === 0) return;

    const targetRoomId = currentRoom.connections[0];
    const targetRoom = currentMap.rooms.find((r) => r.id === targetRoomId);
    if (!targetRoom) return;

    // Determine direction based on position
    const dx = targetRoom.position.x - currentRoom.position.x;
    const dz = targetRoom.position.z - currentRoom.position.z;

    let direction: "north" | "south" | "east" | "west" = "south";
    if (Math.abs(dx) > Math.abs(dz)) {
      direction = dx > 0 ? "east" : "west";
    } else {
      direction = dz > 0 ? "south" : "north";
    }

    await startTransition(currentRoomId, targetRoomId, direction);
  };

  if (!currentMap) {
    return <div>No map loaded</div>;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        zIndex: 1000,
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      <div>
        <strong>Room Transition Test</strong>
      </div>
      <div>Current Room: {currentRoomId || "None"}</div>
      <div>Loaded Rooms: {roomInstances.size}</div>
      <div>Transition: Instant</div>

      {currentRoomId && (
        <button
          onClick={handleTestTransition}
          style={{
            marginTop: "10px",
            padding: "5px 10px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Test Transition
        </button>
      )}
    </div>
  );
};

export default RoomTransitionTest;
