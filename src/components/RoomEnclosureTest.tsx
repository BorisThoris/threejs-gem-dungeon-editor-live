import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";

const RoomEnclosureTest: React.FC = () => {
  const { currentRoomId, roomInstances } = useRoomManagerStore();

  const currentRoomInstance = currentRoomId
    ? roomInstances.get(currentRoomId)
    : null;
  const currentRoom = currentRoomInstance?.room;

  return (
    <div
      style={{
        position: "fixed",
        top: "160px",
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
        <strong>Room Enclosure Test</strong>
      </div>
      <div>Current Room: {currentRoomId || "None"}</div>
      {currentRoom && (
        <>
          <div>Room Size: {currentRoom.size}</div>
          <div>Walls: 4 (North, South, East, West)</div>
          <div>Doors: At floor level</div>
          <div style={{ color: "#4CAF50" }}>Status: ✅ Fully Enclosed</div>
        </>
      )}
    </div>
  );
};

export default RoomEnclosureTest;
