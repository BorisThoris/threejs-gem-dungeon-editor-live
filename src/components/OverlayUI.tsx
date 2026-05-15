import React, { useState, useEffect } from "react";

interface OverlayUIProps {
  isMouseLookActive: boolean;
  playerStats: any;
  inventory: any[];
  currentRoom: string;
  onItemUse: (item: any) => void;
}

export function OverlayUI({
  isMouseLookActive,
  playerStats,
  inventory,
  currentRoom,
  onItemUse,
}: OverlayUIProps) {
  const [showMouseLookIndicator, setShowMouseLookIndicator] = useState(false);

  // Use refs to avoid React re-renders for UI state
  const mouseLookIndicatorRef = React.useRef<HTMLDivElement>(null);
  const gameUIRef = React.useRef<HTMLDivElement>(null);

  // Update UI without causing re-renders
  useEffect(() => {
    if (mouseLookIndicatorRef.current) {
      mouseLookIndicatorRef.current.style.display = isMouseLookActive
        ? "block"
        : "none";
    }
  }, [isMouseLookActive]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none", // Allow clicks to pass through to canvas
        zIndex: 1000, // Keep at 1000 since it's game UI, not debugging
        fontFamily: "'Press Start 2P', cursive",
      }}
    >
      {/* Mouse Look Indicator - Separate layer */}
      <div
        ref={mouseLookIndicatorRef}
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0, 0, 0, 0.8)",
          color: "#00ff00",
          padding: "8px 16px",
          borderRadius: "4px",
          fontSize: "14px",
          fontFamily: "monospace",
          pointerEvents: "none",
          border: "1px solid #00ff00",
          display: "none", // Hidden by default
        }}
      >
        🖱️ Mouse Look Active - Release Right Mouse Button to Exit
      </div>

      {/* Game UI - Separate layer */}
      <div
        ref={gameUIRef}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0, 0, 0, 0.7)",
          color: "#ffffff",
          padding: "15px",
          borderRadius: "8px",
          fontSize: "12px",
          pointerEvents: "auto", // Allow interaction with UI elements
          minWidth: "200px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", color: "#00ff00" }}>Player Stats</h3>
        <div>Health: {playerStats.health}</div>
        <div>Mana: {playerStats.mana}</div>
        <div>Points: {playerStats.points}</div>
        <div>Experience: {playerStats.experience}</div>
        <div>Strength: {playerStats.strength}</div>
        <div>Defense: {playerStats.defense}</div>
        <div>Intelligence: {playerStats.intelligence}</div>

        <h4 style={{ margin: "15px 0 5px 0", color: "#00ff00" }}>Inventory</h4>
        <div style={{ maxHeight: "100px", overflowY: "auto" }}>
          {inventory.map((item, index) => (
            <div
              key={index}
              style={{
                padding: "5px",
                margin: "2px 0",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
              }}
              onClick={() => onItemUse(item)}
            >
              {item.name} x{item.quantity || 1}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "10px", fontSize: "10px", color: "#888" }}>
          Room: {currentRoom}
        </div>
      </div>

      {/* Instructions - Separate layer */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0, 0, 0, 0.8)",
          color: "#ffffff",
          padding: "10px 20px",
          borderRadius: "4px",
          fontSize: "12px",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        WASD to move • Right-click and hold to look around • X to pause
      </div>
    </div>
  );
}
