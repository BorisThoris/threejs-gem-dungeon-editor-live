import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";

const RoomTextureTest: React.FC = () => {
  const { currentRoomId, roomInstances } = useRoomManagerStore();

  const currentRoomInstance = currentRoomId
    ? roomInstances.get(currentRoomId)
    : null;
  const currentRoom = currentRoomInstance?.room;

  const getTextureInfo = (roomType: string) => {
    switch (roomType) {
      case "treasure":
        return { wall: "brick", floor: "wood", roof: "wood" };
      case "shop":
        return { wall: "brick", floor: "cobblestone", roof: "brick" };
      case "puzzle":
        return { wall: "cobblestone", floor: "wood", roof: "cobblestone" };
      case "library":
        return { wall: "wood", floor: "wood", roof: "wood" };
      case "boss":
        return {
          wall: "cobblestone",
          floor: "cobblestone",
          roof: "cobblestone",
        };
      case "enemy":
        return { wall: "brick", floor: "cobblestone", roof: "brick" };
      default:
        return { wall: "brick", floor: "wood", roof: "wood" };
    }
  };

  const textureInfo = currentRoom ? getTextureInfo(currentRoom.type) : null;

  return (
    <div
      style={{
        position: "fixed",
        top: "360px",
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
        <strong>Room Texture Test</strong>
      </div>
      <div>Current Room: {currentRoomId || "None"}</div>
      {currentRoom && textureInfo && (
        <>
          <div>Room Type: {currentRoom.type}</div>
          <div>Wall Texture: {textureInfo.wall}</div>
          <div>Floor Texture: {textureInfo.floor}</div>
          <div>Roof Texture: {textureInfo.roof}</div>
          <div style={{ color: "#4CAF50" }}>Status: ✅ Textured</div>
        </>
      )}
    </div>
  );
};

export default RoomTextureTest;
