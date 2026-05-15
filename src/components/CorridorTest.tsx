import React from "react";
import useMapStore from "../store/mapStore";

const CorridorTest: React.FC = () => {
  const { currentMap } = useMapStore();

  const corridorCount =
    currentMap?.rooms.filter((room) => room.type === "corridor").length || 0;
  const totalRooms = currentMap?.rooms.length || 0;

  return (
    <div
      style={{
        position: "fixed",
        top: "110px",
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
        <strong>Corridor Test</strong>
      </div>
      <div>Total Rooms: {totalRooms}</div>
      <div>Corridor Rooms: {corridorCount}</div>
      <div style={{ color: corridorCount === 0 ? "#4CAF50" : "#F44336" }}>
        Status: {corridorCount === 0 ? "✅ No Corridors" : "❌ Corridors Found"}
      </div>
    </div>
  );
};

export default CorridorTest;
