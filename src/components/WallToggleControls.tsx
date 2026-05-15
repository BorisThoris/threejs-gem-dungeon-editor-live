import React from "react";
import {
  useWallsEnabled,
  useConsolidatedGameStore,
} from "../store/consolidatedGameStore";

interface WallToggleControlsProps {
  style?: React.CSSProperties;
  showLabel?: boolean;
}

const WallToggleControls: React.FC<WallToggleControlsProps> = ({
  style,
  showLabel = true,
}) => {
  const wallsEnabled = useWallsEnabled();
  const { toggleWalls } = useConsolidatedGameStore();

  const defaultStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 1000,
    background: "rgba(0, 0, 0, 0.8)",
    padding: "10px 15px",
    borderRadius: "8px",
    backdropFilter: "blur(10px)",
    color: "white",
    fontSize: "14px",
    fontFamily: "monospace",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.3s ease",
    ...style,
  };

  return (
    <div
      style={defaultStyle}
      onClick={toggleWalls}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: showLabel ? "5px" : "0",
        }}
      >
        <span style={{ fontSize: "16px" }}>{wallsEnabled ? "🧱" : "🚫"}</span>
        <span style={{ fontWeight: "bold" }}>
          Walls: {wallsEnabled ? "ON" : "OFF"}
        </span>
      </div>
      {showLabel && (
        <div
          style={{
            fontSize: "12px",
            opacity: 0.7,
            textAlign: "center",
          }}
        >
          Click to toggle
        </div>
      )}
    </div>
  );
};

export default WallToggleControls;
