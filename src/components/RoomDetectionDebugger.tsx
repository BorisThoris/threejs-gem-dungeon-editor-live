import React, { useRef, useEffect } from "react";
import { playerRoomDetection } from "../utils/playerRoomDetection";

interface RoomDetectionDebuggerProps {
  enabled?: boolean;
}

const RoomDetectionDebugger: React.FC<RoomDetectionDebuggerProps> = ({
  enabled = false,
}) => {
  const debugRef = useRef<HTMLDivElement>(null);
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    if (!enabled || !debugRef.current) return;

    const updateDebugInfo = () => {
      const now = Date.now();
      if (now - lastUpdateTime.current < 500) return; // Update every 500ms
      lastUpdateTime.current = now;

      const debugInfo = playerRoomDetection.getDebugInfo();
      const currentRoomId = playerRoomDetection.getCurrentRoomId();
      const roomBounds = playerRoomDetection.getRoomBounds(currentRoomId || "");

      if (debugRef.current) {
        debugRef.current.innerHTML = `
          <div style="color: white; font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px;">
            <div style="color: #00ff00; font-weight: bold;">Room Detection Debug</div>
            <div>Current Room: ${currentRoomId || "None"}</div>
            <div>Detection Enabled: ${debugInfo.isDetectionEnabled}</div>
            <div>Threshold: ${debugInfo.detectionThreshold}</div>
            <div>Total Rooms: ${debugInfo.roomCount}</div>
            ${
              roomBounds
                ? `
              <div style="margin-top: 5px; color: #ffff00;">Room Bounds:</div>
              <div>X: ${roomBounds.minX.toFixed(
                1
              )} to ${roomBounds.maxX.toFixed(1)}</div>
              <div>Z: ${roomBounds.minZ.toFixed(
                1
              )} to ${roomBounds.maxZ.toFixed(1)}</div>
              <div>Y: ${roomBounds.minY.toFixed(
                1
              )} to ${roomBounds.maxY.toFixed(1)}</div>
            `
                : ""
            }
            <div style="margin-top: 5px; color: #00ffff;">Last Update: ${new Date().toLocaleTimeString()}</div>
          </div>
        `;
      }
    };

    // Initial update
    updateDebugInfo();

    // Set up interval for updates
    const interval = setInterval(updateDebugInfo, 500);

    return () => {
      clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={debugRef}
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        zIndex: 20000, // High z-index to appear above all game UI
      }}
    />
  );
};

export default RoomDetectionDebugger;
