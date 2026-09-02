import React, { useState, useEffect } from "react";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { useDoorProgressionStore } from "../store/doorProgressionStore";
import type { DoorState, DoorType } from "./Door";

interface DoorDebuggerProps {
  showDebugger?: boolean;
  playerPosition?: [number, number, number];
}

const DoorDebugger: React.FC<DoorDebuggerProps> = ({
  showDebugger = false,
  playerPosition = [0, 0, 0],
}) => {
  const { currentRoomId, roomInstances } = useConsolidatedGameStore();
  const {
    unlockedDoors,
    doorStates,
    doorTypes,
    unlockHistory,
    getProgressionStats,
  } = useDoorProgressionStore();

  const [selectedDoor, setSelectedDoor] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const currentRoom = rooms[currentRoomId];
  const stats = getProgressionStats();

  if (!showDebugger) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        width: "300px",
        maxHeight: "80vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "12px",
        overflow: "auto",
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#00ff00" }}>
        🚪 Door Debugger
      </h3>

      {/* Current Room Info */}
      <div style={{ marginBottom: "10px" }}>
        <strong>Current Room:</strong> {currentRoom?.name || "Unknown"}
        <br />
        <strong>Room ID:</strong> {currentRoomId}
        <br />
        <strong>Player Position:</strong> {playerPosition.join(", ")}
      </div>

      {/* Progression Stats */}
      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={() => setShowStats(!showStats)}
          style={{
            background: "#333",
            color: "white",
            border: "1px solid #555",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {showStats ? "Hide" : "Show"} Stats
        </button>

        {showStats && (
          <div
            style={{
              marginTop: "5px",
              padding: "5px",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
          >
            <div>
              <strong>Total Unlocked:</strong> {stats.totalUnlocked}
            </div>
            <div>
              <strong>Progression Level:</strong> {stats.progressionLevel}
            </div>
            <div>
              <strong>Recent Unlocks:</strong>
            </div>
            {stats.recentUnlocks.map((unlock, index) => (
              <div key={index} style={{ fontSize: "10px", marginLeft: "10px" }}>
                {unlock.doorId} ({unlock.method})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Door List */}
      <div>
        <strong>Doors in Current Room:</strong>
        {currentRoom?.connections.map((connectionId) => {
          const isUnlocked = unlockedDoors.has(connectionId);
          const doorState = doorStates[connectionId] || "closed";
          const doorType = doorTypes[connectionId] || "standard";

          return (
            <div
              key={connectionId}
              style={{
                margin: "5px 0",
                padding: "5px",
                backgroundColor: isUnlocked
                  ? "rgba(0,255,0,0.2)"
                  : "rgba(255,0,0,0.2)",
                borderRadius: "4px",
                cursor: "pointer",
                border:
                  selectedDoor === connectionId
                    ? "2px solid #00ff00"
                    : "1px solid transparent",
              }}
              onClick={() =>
                setSelectedDoor(
                  selectedDoor === connectionId ? null : connectionId
                )
              }
            >
              <div>
                <strong>Target:</strong> {connectionId}
              </div>
              <div>
                <strong>State:</strong> {doorState}
              </div>
              <div>
                <strong>Type:</strong> {doorType}
              </div>
              <div>
                <strong>Unlocked:</strong> {isUnlocked ? "✅" : "❌"}
              </div>

              {selectedDoor === connectionId && (
                <div style={{ marginTop: "5px", fontSize: "10px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle door state
                      const newState =
                        doorState === "locked" ? "open" : "locked";
                      useDoorProgressionStore
                        .getState()
                        .setDoorState(connectionId, newState);
                    }}
                    style={{
                      background: "#444",
                      color: "white",
                      border: "none",
                      padding: "2px 5px",
                      borderRadius: "2px",
                      cursor: "pointer",
                      marginRight: "5px",
                    }}
                  >
                    Toggle State
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle unlock
                      if (isUnlocked) {
                        useDoorProgressionStore
                          .getState()
                          .lockDoor(connectionId);
                      } else {
                        useDoorProgressionStore
                          .getState()
                          .unlockDoor(connectionId, currentRoomId, "manual");
                      }
                    }}
                    style={{
                      background: "#444",
                      color: "white",
                      border: "none",
                      padding: "2px 5px",
                      borderRadius: "2px",
                      cursor: "pointer",
                    }}
                  >
                    {isUnlocked ? "Lock" : "Unlock"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div
        style={{
          marginTop: "10px",
          borderTop: "1px solid #555",
          paddingTop: "10px",
        }}
      >
        <strong>Quick Actions:</strong>
        <div style={{ marginTop: "5px" }}>
          <button
            onClick={() => {
              // Unlock all doors in current room
              currentRoom?.connections.forEach((connectionId) => {
                useDoorProgressionStore
                  .getState()
                  .unlockDoor(connectionId, currentRoomId, "manual");
              });
            }}
            style={{
              background: "#333",
              color: "white",
              border: "1px solid #555",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "5px",
              marginBottom: "5px",
            }}
          >
            Unlock All
          </button>
          <button
            onClick={() => {
              // Lock all doors in current room
              currentRoom?.connections.forEach((connectionId) => {
                useDoorProgressionStore.getState().lockDoor(connectionId);
              });
            }}
            style={{
              background: "#333",
              color: "white",
              border: "1px solid #555",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "5px",
              marginBottom: "5px",
            }}
          >
            Lock All
          </button>
          <button
            onClick={() => {
              // Reset progression
              useDoorProgressionStore.getState().resetProgression();
            }}
            style={{
              background: "#333",
              color: "white",
              border: "1px solid #555",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              marginBottom: "5px",
            }}
          >
            Reset Progress
          </button>
        </div>
      </div>

      {/* Performance Info */}
      <div
        style={{
          marginTop: "10px",
          borderTop: "1px solid #555",
          paddingTop: "10px",
        }}
      >
        <strong>Performance:</strong>
        <div style={{ fontSize: "10px" }}>
          <div>Doors in room: {currentRoom?.connections.length || 0}</div>
          <div>Total unlocked: {unlockedDoors.size}</div>
          <div>
            Memory usage:{" "}
            {JSON.stringify(doorStates).length +
              JSON.stringify(doorTypes).length}{" "}
            bytes
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoorDebugger;
