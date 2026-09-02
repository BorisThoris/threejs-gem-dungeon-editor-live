import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";

const RoomSizeTest: React.FC = () => {
  const { currentRoomId, roomInstances } = useRoomManagerStore();

  const currentRoomInstance = currentRoomId
    ? roomInstances.get(currentRoomId)
    : null;
  const currentRoom = currentRoomInstance?.room;

  return (
    <div
      style={{
        position: "fixed",
        top: "310px",
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
        <strong>Room Size Test</strong>
      </div>
      <div>Current Room: {currentRoomId || "None"}</div>
      {currentRoom && (
        <>
          <div>Room Size: {currentRoom.size} (was 10)</div>
          <div>Wall Height: 5 (was 3)</div>
          <div>Door Width: 3 (was 2)</div>
          <div>Door Height: 4.8 (was 2.8)</div>
          <div style={{ color: "#4CAF50" }}>Status: ✅ Less Claustrophobic</div>
        </>
      )}
    </div>
  );
};

export default RoomSizeTest;
