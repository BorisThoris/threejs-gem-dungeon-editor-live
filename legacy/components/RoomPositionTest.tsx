import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";

const RoomPositionTest: React.FC = () => {
  const { currentRoomId, roomInstances } = useRoomManagerStore();

  const currentRoomInstance = currentRoomId
    ? roomInstances.get(currentRoomId)
    : null;
  const currentRoom = currentRoomInstance?.room;

  return (
    <div
      style={{
        position: "fixed",
        top: "60px",
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
        <strong>Room Position Test</strong>
      </div>
      <div>Current Room: {currentRoomId || "None"}</div>
      {currentRoom && (
        <>
          <div>
            Room Position: [{currentRoom.position.x}, {currentRoom.position.y},{" "}
            {currentRoom.position.z}]
          </div>
          <div>Room Size: {currentRoom.size}</div>
          <div>Rendered At: [0, 0, 0] (origin)</div>
        </>
      )}
    </div>
  );
};

export default RoomPositionTest;
