import React from "react";

interface MouseLookIndicatorProps {
  isActive: boolean;
}

export function MouseLookIndicator({ isActive }: MouseLookIndicatorProps) {
  if (!isActive) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.8)",
        color: "#00ff00",
        padding: "8px 16px",
        borderRadius: "4px",
        fontSize: "14px",
        fontFamily: "monospace",
        zIndex: 1000,
        pointerEvents: "none",
        border: "1px solid #00ff00",
      }}
    >
      🖱️ Mouse Look Active - Release Right Mouse Button to Exit
    </div>
  );
}
