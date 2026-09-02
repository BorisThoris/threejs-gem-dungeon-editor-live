import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";

const StoreTest: React.FC = () => {
  const { currentRoomId, roomInstances, isLoading } = useRoomManagerStore();

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "10px",
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
        <strong>Store Test</strong>
      </div>
      <div>Current Room: {currentRoomId || "None"}</div>
      <div>Room Instances: {roomInstances.size}</div>
      <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
      <div>Store Status: ✅ Working</div>
    </div>
  );
};

export default StoreTest;
