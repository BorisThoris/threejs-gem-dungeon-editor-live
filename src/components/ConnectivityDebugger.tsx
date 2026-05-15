import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import useMapStore from "../store/mapStore";
import { analyzeConnectivity } from "../utils/roomConnectivityValidator";
import type { Room } from "../types/map";

interface ConnectionVisualizerProps {
  room: Room;
  targetRoom: Room;
  connectionType: "door" | "breakable_wall" | "portal" | "corridor";
  index: number;
}

const ConnectionVisualizer: React.FC<ConnectionVisualizerProps> = ({
  room,
  targetRoom,
  connectionType,
  index,
}) => {
  const getConnectionColor = (type: string) => {
    switch (type) {
      case "door":
        return "#8B4513"; // Brown
      case "breakable_wall":
        return "#FF6B6B"; // Red
      case "portal":
        return "#9370DB"; // Purple
      case "corridor":
        return "#4ECDC4"; // Teal
      default:
        return "#666666"; // Gray
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "door":
        return "🚪";
      case "breakable_wall":
        return "🧱";
      case "portal":
        return "🌀";
      case "corridor":
        return "🚶";
      default:
        return "❓";
    }
  };

  const midPoint = {
    x: (room.position.x + targetRoom.position.x) / 2,
    y: 2,
    z: (room.position.z + targetRoom.position.z) / 2,
  };

  return (
    <group>
      {/* Connection line */}
      <mesh position={[midPoint.x, midPoint.y, midPoint.z]}>
        <cylinderGeometry
          args={[
            0.1,
            0.1,
            Math.abs(room.position.x - targetRoom.position.x) +
              Math.abs(room.position.z - targetRoom.position.z),
            8,
          ]}
        />
        <meshBasicMaterial color={getConnectionColor(connectionType)} />
      </mesh>

      {/* Connection type indicator */}
      <Text
        position={[midPoint.x, midPoint.y + 1, midPoint.z]}
        fontSize={0.5}
        color={getConnectionColor(connectionType)}
        anchorX="center"
        anchorY="middle"
      >
        {getConnectionIcon(connectionType)} {connectionType}
      </Text>
    </group>
  );
};

const RoomVisualizer: React.FC<{ room: Room; isIsolated: boolean }> = ({
  room,
  isIsolated,
}) => {
  const getRoomColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "start":
        return "#00FF00"; // Green
      case "end":
        return "#FF0000"; // Red
      case "treasure":
        return "#FFD700"; // Gold
      case "shop":
        return "#00BFFF"; // Blue
      case "library":
        return "#8B4513"; // Brown
      case "portal":
        return "#9370DB"; // Purple
      case "corridor":
        return "#808080"; // Gray
      default:
        return "#4A4A4A"; // Dark gray
    }
  };

  return (
    <group position={[room.position.x, 0, room.position.z]}>
      {/* Room base */}
      <mesh>
        <boxGeometry args={[room.size || 8, 0.2, room.size || 8]} />
        <meshBasicMaterial
          color={isIsolated ? "#FF6B6B" : getRoomColor(room.type)}
          transparent
          opacity={isIsolated ? 0.7 : 0.8}
        />
      </mesh>

      {/* Room label */}
      <Text
        position={[0, 1, 0]}
        fontSize={0.4}
        color={isIsolated ? "#FF0000" : "#FFFFFF"}
        anchorX="center"
        anchorY="middle"
      >
        {room.type}
      </Text>

      {/* Connection count */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.3}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        {room.connections.length} connections
      </Text>

      {/* Isolated indicator */}
      {isIsolated && (
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.4}
          color="#FF0000"
          anchorX="center"
          anchorY="middle"
        >
          ISOLATED!
        </Text>
      )}
    </group>
  );
};

const ConnectivityDebugger: React.FC = () => {
  const { currentMap } = useMapStore();
  const [connectivityReport, setConnectivityReport] = useState<any>(null);
  const [showIsolatedOnly, setShowIsolatedOnly] = useState(false);

  useEffect(() => {
    if (currentMap) {
      const report = analyzeConnectivity(currentMap);
      setConnectivityReport(report);
    }
  }, [currentMap]);

  if (!currentMap || !connectivityReport) {
    return (
      <div
        style={{ padding: "20px", color: "white", backgroundColor: "#2a2a2a" }}
      >
        <h2>Connectivity Debugger</h2>
        <p>No map data available</p>
      </div>
    );
  }

  const roomsToShow = showIsolatedOnly
    ? connectivityReport.isolatedRooms
    : currentMap.rooms;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      {/* Control Panel */}
      <div
        style={{
          width: "300px",
          padding: "20px",
          backgroundColor: "#2a2a2a",
          color: "white",
          overflowY: "auto",
        }}
      >
        <h2>Connectivity Debugger</h2>

        <div style={{ marginBottom: "20px" }}>
          <h3>Statistics</h3>
          <p>
            <strong>Total Rooms:</strong> {connectivityReport.totalRooms}
          </p>
          <p>
            <strong>Connected Rooms:</strong>{" "}
            {connectivityReport.connectedRooms}
          </p>
          <p>
            <strong>Isolated Rooms:</strong>{" "}
            {connectivityReport.isolatedRooms.length}
          </p>
          <p>
            <strong>Components:</strong>{" "}
            {connectivityReport.connectedComponents.length}
          </p>
          <p>
            <strong>Fully Connected:</strong>{" "}
            {connectivityReport.isFullyConnected ? "✅" : "❌"}
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>
            <input
              type="checkbox"
              checked={showIsolatedOnly}
              onChange={(e) => setShowIsolatedOnly(e.target.checked)}
            />
            Show Isolated Rooms Only
          </label>
        </div>

        {connectivityReport.isolatedRooms.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h3>Isolated Rooms</h3>
            {connectivityReport.isolatedRooms.map((room: Room) => (
              <div
                key={room.id}
                style={{
                  padding: "5px",
                  margin: "2px 0",
                  backgroundColor: "#444",
                  borderRadius: "3px",
                }}
              >
                <strong>{room.type}</strong> ({room.id})
                <br />
                <small>Connections: {room.connections.length}</small>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <h3>Connection Types Legend</h3>
          <div style={{ fontSize: "12px" }}>
            <div>🚪 Door - Standard connection</div>
            <div>🧱 Breakable Wall - Requires action</div>
            <div>🌀 Portal - Mystical connection</div>
            <div>🚶 Corridor - Transitional space</div>
          </div>
        </div>
      </div>

      {/* 3D Visualization */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 20, 20], fov: 60 }}>
          <Environment preset="sunset" />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />

          {/* Render rooms */}
          {roomsToShow.map((room: Room) => (
            <RoomVisualizer
              key={room.id}
              room={room}
              isIsolated={connectivityReport.isolatedRooms.some(
                (r: Room) => r.id === room.id
              )}
            />
          ))}

          {/* Render connections */}
          {!showIsolatedOnly &&
            currentMap.rooms.map((room: Room) =>
              room.connections.map((connectionId: string, index: number) => {
                const targetRoom = currentMap.rooms.find(
                  (r) => r.id === connectionId
                );
                if (!targetRoom) return null;

                // Determine connection type (simplified)
                const connectionType =
                  room.type.includes("portal") ||
                  targetRoom.type.includes("portal")
                    ? "portal"
                    : room.type.includes("dungeon") ||
                      targetRoom.type.includes("dungeon")
                    ? "breakable_wall"
                    : room.type.includes("corridor") ||
                      targetRoom.type.includes("corridor")
                    ? "corridor"
                    : "door";

                return (
                  <ConnectionVisualizer
                    key={`${room.id}-${connectionId}-${index}`}
                    room={room}
                    targetRoom={targetRoom}
                    connectionType={connectionType}
                    index={index}
                  />
                );
              })
            )}

          {/* Grid helper */}
          <gridHelper args={[50, 50, "#444444", "#222222"]} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default ConnectivityDebugger;
