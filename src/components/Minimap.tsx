import React, { useState, useMemo, useEffect } from "react";
import useMapStore from "../store/mapStore";
import {
  useConsolidatedGameStore,
  useVisitedRooms,
  useCompletedRooms,
} from "../store/consolidatedGameStore";
import { cameraRotationRefs } from "../utils/cameraRotationRef";
import type { Room } from "../types/map";

interface MinimapProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

const Minimap: React.FC<MinimapProps> = ({ isVisible = true, onToggle }) => {
  const { currentMap } = useMapStore();
  const { currentRoomId } = useConsolidatedGameStore();
  const visitedRooms = useVisitedRooms();
  const completedRooms = useCompletedRooms();
  const { markRoomCompleted } = useConsolidatedGameStore();
  const [isMinimapVisible, setIsMinimapVisible] = useState(isVisible);
  const [isFullscreenMapVisible, setIsFullscreenMapVisible] = useState(false);
  const [cameraRotation, setCameraRotation] = useState({
    y: -Math.PI / 2,
    x: 0,
  });

  // Listen for camera rotation changes using refs
  useEffect(() => {
    const unsubscribe = cameraRotationRefs.subscribe(() => {
      setCameraRotation(cameraRotationRefs.getRotation());
    });

    // Set initial rotation
    setCameraRotation(cameraRotationRefs.getRotation());

    return unsubscribe;
  }, []);

  // Listen for Tab key to toggle fullscreen map, ESC to close, and C to complete current room
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        setIsFullscreenMapVisible(!isFullscreenMapVisible);
      } else if (event.key === "Escape" && isFullscreenMapVisible) {
        event.preventDefault();
        setIsFullscreenMapVisible(false);
      } else if (
        event.key === "c" &&
        currentRoomId &&
        !completedRooms.has(currentRoomId)
      ) {
        // Mark current room as completed (for testing)
        markRoomCompleted(currentRoomId);
        console.log(`Room ${currentRoomId} marked as completed!`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isFullscreenMapVisible,
    currentRoomId,
    completedRooms,
    markRoomCompleted,
  ]);

  // Calculate circular minimap data
  const minimapData = useMemo(() => {
    if (!currentMap) return null;

    const rooms = currentMap.rooms;
    if (rooms.length === 0) return null;

    // Find current room to center the map on
    const currentRoom = rooms.find((room) => room.id === currentRoomId);

    // Use current room position as center, or fallback to geometric center
    const centerX = currentRoom
      ? currentRoom.position.x
      : (Math.min(...rooms.map((r) => r.position.x)) +
          Math.max(...rooms.map((r) => r.position.x))) /
        2;
    const centerZ = currentRoom
      ? currentRoom.position.z
      : (Math.min(...rooms.map((r) => r.position.z)) +
          Math.max(...rooms.map((r) => r.position.z))) /
        2;

    // Calculate bounds relative to the center
    const positions = rooms.map((room) => room.position);
    const distancesFromCenter = positions.map((pos) =>
      Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.z - centerZ, 2))
    );
    const maxDistance = Math.max(...distancesFromCenter);

    // Minimap radius (pixels) - dynamic based on container size
    const containerSize = Math.min(window.innerWidth * 0.25, 400) - 40; // 25vw minus padding
    const minimapRadius = containerSize / 2;
    const worldRadius = Math.max(maxDistance, 5); // Minimum radius to prevent division by zero
    const scale = minimapRadius / worldRadius;

    return {
      centerX,
      centerZ,
      worldRadius,
      minimapRadius,
      scale,
      rooms: rooms.map((room) => ({
        ...room,
        // Convert world coordinates to circular minimap coordinates (centered on current room)
        minimapX: (room.position.x - centerX) * scale,
        minimapZ: (room.position.z - centerZ) * scale,
        // Calculate distance from center for circular clipping
        distanceFromCenter: Math.sqrt(
          Math.pow(room.position.x - centerX, 2) +
            Math.pow(room.position.z - centerZ, 2)
        ),
      })),
    };
  }, [currentMap, currentRoomId]);

  // Calculate fullscreen map data (dynamic sizing)
  const fullscreenMapData = useMemo(() => {
    if (!currentMap) return null;

    const rooms = currentMap.rooms;
    if (rooms.length === 0) return null;

    // Find current room to center the map on
    const currentRoom = rooms.find((room) => room.id === currentRoomId);

    // Use current room position as center, or fallback to geometric center
    const centerX = currentRoom
      ? currentRoom.position.x
      : (Math.min(...rooms.map((r) => r.position.x)) +
          Math.max(...rooms.map((r) => r.position.x))) /
        2;
    const centerZ = currentRoom
      ? currentRoom.position.z
      : (Math.min(...rooms.map((r) => r.position.z)) +
          Math.max(...rooms.map((r) => r.position.z))) /
        2;

    // Calculate bounds relative to the center
    const positions = rooms.map((room) => room.position);
    const distancesFromCenter = positions.map((pos) =>
      Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.z - centerZ, 2))
    );
    const maxDistance = Math.max(...distancesFromCenter);

    // Dynamic fullscreen map radius based on viewport
    const viewportSize = Math.min(window.innerWidth, window.innerHeight);
    const fullscreenRadius = Math.min(viewportSize * 0.35, 500); // 35% of viewport or max 500px
    const worldRadius = Math.max(maxDistance, 5);
    const scale = fullscreenRadius / worldRadius;

    return {
      centerX,
      centerZ,
      worldRadius,
      fullscreenRadius,
      scale,
      rooms: rooms.map((room) => ({
        ...room,
        // Convert world coordinates to fullscreen map coordinates
        minimapX: (room.position.x - centerX) * scale,
        minimapZ: (room.position.z - centerZ) * scale,
        // Calculate distance from center for circular clipping
        distanceFromCenter: Math.sqrt(
          Math.pow(room.position.x - centerX, 2) +
            Math.pow(room.position.z - centerZ, 2)
        ),
      })),
    };
  }, [currentMap, currentRoomId]);

  // Get room color based on state
  const getRoomColor = (room: Room) => {
    const isCurrent = room.id === currentRoomId;
    const isVisited = visitedRooms.has(room.id);
    const isCompleted = completedRooms.has(room.id);

    if (isCurrent) {
      return "#00ff00"; // Bright green for current room
    } else if (isCompleted) {
      return "#2E7D32"; // Darker green for completed rooms
    } else if (isVisited) {
      return "#4CAF50"; // Green for visited rooms
    } else {
      return "#666666"; // Gray for unvisited rooms
    }
  };

  // Get room type icon
  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case "start":
        return "🏠";
      case "end":
        return "🏁";
      case "boss":
        return "👹";
      case "treasure":
        return "💰";
      case "shop":
        return "🛒";
      case "puzzle":
        return "🧩";
      case "arena":
        return "⚔️";
      case "portal":
        return "🌀";
      case "library":
        return "📚";
      case "meditation":
        return "🧘";
      case "gym":
        return "💪";
      case "coffee":
        return "☕";
      case "challenge":
        return "🎯";
      case "secret":
        return "🔒";
      case "trap":
        return "⚠️";
      case "enemy":
        return "👾";
      case "normal":
        return "📦";
      default:
        return "📦";
    }
  };

  // Get current room for highlighting (small minimap)
  const currentRoom = useMemo(() => {
    if (!minimapData) return null;
    return minimapData.rooms.find((room) => room.id === currentRoomId);
  }, [minimapData, currentRoomId]);

  // Get current room for fullscreen map
  const fullscreenCurrentRoom = useMemo(() => {
    if (!fullscreenMapData) return null;
    return fullscreenMapData.rooms.find((room) => room.id === currentRoomId);
  }, [fullscreenMapData, currentRoomId]);

  // Toggle minimap visibility
  const handleToggle = () => {
    setIsMinimapVisible(!isMinimapVisible);
    onToggle?.();
  };

  if (!isMinimapVisible || !minimapData) {
    return (
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleToggle}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "2px solid #fff",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          🗺️
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "25vw",
          height: "25vw",
          maxWidth: "400px",
          maxHeight: "400px",
          minWidth: "200px",
          minHeight: "200px",
          zIndex: 1000,
          fontFamily: "monospace",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            fontSize: "12px",
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontWeight: "bold" }}>MINIMAP</span>
          <button
            onClick={handleToggle}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Circular Minimap Canvas */}
        <div
          style={{
            position: "relative",
            width: "calc(100% - 20px)",
            height: "calc(100% - 20px)",
            margin: "0 auto",
            pointerEvents: "none",
          }}
        >
          {/* Circular Background */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${minimapData.minimapRadius * 2}px`,
              height: `${minimapData.minimapRadius * 2}px`,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              border: "2px solid #fff",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              backdropFilter: "blur(5px)",
              overflow: "hidden",
              pointerEvents: "auto",
            }}
          >
            {/* Map Content Container - Rotates with camera */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "100%",
                height: "100%",
                transform: `translate(-50%, -50%) rotate(${cameraRotation.y}rad)`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            >
              {/* Compass Directions - Fixed relative to map */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {/* North */}
                <div
                  style={{
                    position: "absolute",
                    top: "5px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#ff0000",
                  }}
                >
                  N
                </div>
                {/* East */}
                <div
                  style={{
                    position: "absolute",
                    right: "5px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#ff0000",
                  }}
                >
                  E
                </div>
                {/* South */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "5px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#ff0000",
                  }}
                >
                  S
                </div>
                {/* West */}
                <div
                  style={{
                    position: "absolute",
                    left: "5px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#ff0000",
                  }}
                >
                  W
                </div>
              </div>

              {/* Room Connections */}
              {minimapData.rooms.map((room) => {
                return room.connections?.map((connectionId) => {
                  const connectedRoom = minimapData.rooms.find(
                    (r) => r.id === connectionId
                  );
                  if (!connectedRoom) return null;

                  // Only show connections within the circular bounds
                  if (
                    room.distanceFromCenter > minimapData.worldRadius ||
                    connectedRoom.distanceFromCenter > minimapData.worldRadius
                  ) {
                    return null;
                  }

                  // Connection is lit if both rooms are visited OR if either room is completed
                  const roomVisited = visitedRooms.has(room.id);
                  const connectedRoomVisited = visitedRooms.has(connectionId);
                  const roomCompleted = completedRooms.has(room.id);
                  const connectedRoomCompleted =
                    completedRooms.has(connectionId);

                  const isConnectionLit =
                    (roomVisited && connectedRoomVisited) ||
                    roomCompleted ||
                    connectedRoomCompleted;
                  const connectionColor = isConnectionLit
                    ? "#d4af37"
                    : "#8b4513";
                  const connectionOpacity = isConnectionLit ? 0.8 : 0.4;

                  return (
                    <div
                      key={`connection-${room.id}-${connectionId}`}
                      style={{
                        position: "absolute",
                        left: `${minimapData.minimapRadius + room.minimapX}px`,
                        top: `${minimapData.minimapRadius + room.minimapZ}px`,
                        width: `${Math.sqrt(
                          Math.pow(connectedRoom.minimapX - room.minimapX, 2) +
                            Math.pow(connectedRoom.minimapZ - room.minimapZ, 2)
                        )}px`,
                        height: "2px",
                        backgroundColor: connectionColor,
                        transformOrigin: "0 0",
                        transform: `rotate(${Math.atan2(
                          connectedRoom.minimapZ - room.minimapZ,
                          connectedRoom.minimapX - room.minimapX
                        )}rad)`,
                        opacity: connectionOpacity,
                        boxShadow: isConnectionLit
                          ? `0 0 4px ${connectionColor}`
                          : "none",
                      }}
                    />
                  );
                });
              })}

              {/* Rooms */}
              {minimapData.rooms.map((room) => {
                const isCurrent = room.id === currentRoomId;

                // Skip rooms outside circular bounds
                if (room.distanceFromCenter > minimapData.worldRadius) {
                  return null;
                }

                return (
                  <div
                    key={room.id}
                    style={{
                      position: "absolute",
                      left: `${
                        minimapData.minimapRadius +
                        room.minimapX -
                        (isCurrent ? 6 : 4)
                      }px`,
                      top: `${
                        minimapData.minimapRadius +
                        room.minimapZ -
                        (isCurrent ? 6 : 4)
                      }px`,
                      width: isCurrent ? "12px" : "8px",
                      height: isCurrent ? "12px" : "8px",
                      backgroundColor: getRoomColor(room),
                      border: isCurrent ? "2px solid #fff" : "1px solid #fff",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: isCurrent ? "8px" : "6px",
                      cursor: "pointer",
                      pointerEvents: "auto",
                      transition: "all 0.2s ease",
                      boxShadow: isCurrent
                        ? "0 0 8px rgba(0, 255, 0, 0.5)"
                        : "none",
                      animation: isCurrent ? "pulse 2s infinite" : "none",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "scale(1.3)";
                      e.currentTarget.style.zIndex = "10";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.zIndex = "1";
                    }}
                    title={`${room.type} (${room.id})`}
                  >
                    {getRoomIcon(room.type)}
                  </div>
                );
              })}

              {/* Player Direction Indicator */}
              {currentRoom && (
                <div
                  style={{
                    position: "absolute",
                    left: `${
                      minimapData.minimapRadius + currentRoom.minimapX - 2
                    }px`,
                    top: `${
                      minimapData.minimapRadius + currentRoom.minimapZ - 2
                    }px`,
                    width: "4px",
                    height: "4px",
                    backgroundColor: "#ff0000",
                    borderRadius: "50%",
                  }}
                >
                  {/* Direction arrow - Fixed pointing up */}
                  <div
                    style={{
                      position: "absolute",
                      left: "1px",
                      top: "-8px",
                      width: "0",
                      height: "0",
                      borderLeft: "1px solid transparent",
                      borderRight: "1px solid transparent",
                      borderBottom: "8px solid #ff0000",
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: "8px",
            fontSize: "8px",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          <div style={{ color: "#00ff00" }}>● Current Room</div>
          <div style={{ color: "#2E7D32" }}>● Completed</div>
          <div style={{ color: "#4CAF50" }}>● Visited</div>
          <div style={{ color: "#666666" }}>● Unvisited</div>
          <div style={{ color: "#ff0000" }}>▲ Direction</div>
          <div style={{ color: "#d4af37", marginTop: "4px", fontSize: "7px" }}>
            Press 'C' to complete current room
          </div>
        </div>

        {/* Room Info */}
        {currentRoom && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "10px",
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
              {currentRoom.type.toUpperCase()}
            </div>
            <div style={{ fontSize: "8px", opacity: 0.7 }}>
              {currentRoom.connections?.length || 0} connections
            </div>
          </div>
        )}

        {/* Enhanced CSS animations for Diablo style */}
        <style>
          {`
          @keyframes pulse {
            0% { 
              opacity: 1; 
              transform: scale(1); 
              box-shadow: 0 0 20px rgba(0, 255, 0, 0.6);
            }
            50% { 
              opacity: 0.8; 
              transform: scale(1.05); 
              box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
            }
            100% { 
              opacity: 1; 
              transform: scale(1); 
              box-shadow: 0 0 20px rgba(0, 255, 0, 0.6);
            }
          }
          
          @keyframes glow {
            0% { 
              box-shadow: 0 0 15px rgba(255, 0, 0, 0.8);
            }
            50% { 
              box-shadow: 0 0 25px rgba(255, 0, 0, 1);
            }
            100% { 
              box-shadow: 0 0 15px rgba(255, 0, 0, 0.8);
            }
          }
          
          @keyframes fadeIn {
            from { 
              opacity: 0; 
              transform: scale(0.8); 
            }
            to { 
              opacity: 1; 
              transform: scale(1); 
            }
          }
          
          .diablo-map-container {
            animation: fadeIn 0.5s ease-out;
          }
        `}
        </style>
      </div>

      {/* Fullscreen Map Overlay - Diablo Style */}
      {isFullscreenMapVisible && fullscreenMapData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: `
              radial-gradient(circle at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%),
              linear-gradient(45deg, rgba(139, 69, 19, 0.1) 0%, rgba(160, 82, 45, 0.1) 50%, rgba(139, 69, 19, 0.1) 100%)
            `,
            backdropFilter: "blur(2px)",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            color: "#d4af37",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              maxWidth: "90vw",
              marginBottom: "30px",
              fontSize: "32px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
              zIndex: 10,
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <span style={{ fontSize: "40px" }}>🗺️</span>
              <span
                style={{
                  background: "linear-gradient(45deg, #d4af37, #ffd700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                WORLD ATLAS
              </span>
            </div>
          </div>

          {/* Fullscreen Map Canvas - Square Layout */}
          <div
            style={{
              position: "relative",
              width: "min(80vw, 80vh)",
              height: "min(80vw, 80vh)",
              maxWidth: "1000px",
              maxHeight: "1000px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              pointerEvents: "none",
            }}
          >
            {/* Map Background - Square */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: `
                  radial-gradient(circle at center, rgba(245, 245, 220, 0.1) 0%, rgba(222, 184, 135, 0.05) 50%, rgba(139, 69, 19, 0.1) 100%),
                  repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(139, 69, 19, 0.02) 2px,
                    rgba(139, 69, 19, 0.02) 4px
                  )
                `,
                backdropFilter: "blur(1px)",
                borderRadius: "15px",
                boxShadow: "0 0 30px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Map Content Container - Rotates with camera */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "100%",
                  height: "100%",
                  transform: `translate(-50%, -50%) rotate(${cameraRotation.y}rad)`,
                  transformOrigin: "center center",
                }}
              >
                {/* Compass Directions - Square Layout */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  {/* North */}
                  <div
                    style={{
                      position: "absolute",
                      top: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#d4af37",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                      fontFamily: "'Cinzel', 'Times New Roman', serif",
                    }}
                  >
                    N
                  </div>
                  {/* East */}
                  <div
                    style={{
                      position: "absolute",
                      right: "20px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#d4af37",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                      fontFamily: "'Cinzel', 'Times New Roman', serif",
                    }}
                  >
                    E
                  </div>
                  {/* South */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#d4af37",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                      fontFamily: "'Cinzel', 'Times New Roman', serif",
                    }}
                  >
                    S
                  </div>
                  {/* West */}
                  <div
                    style={{
                      position: "absolute",
                      left: "20px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#d4af37",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                      fontFamily: "'Cinzel', 'Times New Roman', serif",
                    }}
                  >
                    W
                  </div>
                </div>

                {/* Room Connections - Square Layout */}
                {fullscreenMapData.rooms.map((room) => {
                  return room.connections?.map((connectionId) => {
                    const connectedRoom = fullscreenMapData.rooms.find(
                      (r) => r.id === connectionId
                    );
                    if (!connectedRoom) return null;

                    const roomVisited = visitedRooms.has(room.id);
                    const connectedRoomVisited = visitedRooms.has(connectionId);
                    const roomCompleted = completedRooms.has(room.id);
                    const connectedRoomCompleted =
                      completedRooms.has(connectionId);

                    const isConnectionLit =
                      (roomVisited && connectedRoomVisited) ||
                      roomCompleted ||
                      connectedRoomCompleted;
                    const connectionColor = isConnectionLit
                      ? "#d4af37"
                      : "#8b4513";
                    const connectionOpacity = isConnectionLit ? 0.8 : 0.4;

                    return (
                      <div
                        key={`connection-${room.id}-${connectionId}`}
                        style={{
                          position: "absolute",
                          left: `50%`,
                          top: `50%`,
                          width: `${Math.sqrt(
                            Math.pow(
                              connectedRoom.minimapX - room.minimapX,
                              2
                            ) +
                              Math.pow(
                                connectedRoom.minimapZ - room.minimapZ,
                                2
                              )
                          )}px`,
                          height: "3px",
                          backgroundColor: connectionColor,
                          transformOrigin: "0 0",
                          transform: `translate(${room.minimapX}px, ${
                            room.minimapZ
                          }px) rotate(${Math.atan2(
                            connectedRoom.minimapZ - room.minimapZ,
                            connectedRoom.minimapX - room.minimapX
                          )}rad)`,
                          opacity: connectionOpacity,
                          boxShadow: isConnectionLit
                            ? `0 0 8px ${connectionColor}`
                            : "none",
                        }}
                      />
                    );
                  });
                })}

                {/* Rooms - Enhanced Diablo Style */}
                {fullscreenMapData.rooms.map((room) => {
                  const isCurrent = room.id === currentRoomId;
                  const isVisited = visitedRooms.has(room.id);
                  const isCompleted = completedRooms.has(room.id);

                  const roomSize = isCurrent ? 40 : 28;
                  const roomColor = getRoomColor(room);
                  const roomGlow = isCurrent
                    ? "0 0 20px rgba(0, 255, 0, 0.6)"
                    : isCompleted
                    ? "0 0 15px rgba(46, 125, 50, 0.6)"
                    : isVisited
                    ? "0 0 10px rgba(76, 175, 80, 0.4)"
                    : "none";

                  return (
                    <div
                      key={room.id}
                      style={{
                        position: "absolute",
                        left: `50%`,
                        top: `50%`,
                        transform: `translate(${
                          room.minimapX - roomSize / 2
                        }px, ${room.minimapZ - roomSize / 2}px)`,
                        width: `${roomSize}px`,
                        height: `${roomSize}px`,
                        background: `
                          radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2) 0%, ${roomColor} 50%, ${roomColor} 100%),
                          linear-gradient(135deg, ${roomColor} 0%, ${roomColor}dd 100%)
                        `,
                        border: "none",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isCurrent ? "20px" : "16px",
                        cursor: "pointer",
                        pointerEvents: "auto",
                        transition: "all 0.3s ease",
                        boxShadow: roomGlow,
                        animation: isCurrent ? "pulse 2s infinite" : "none",
                        opacity:
                          isVisited || isCurrent || isCompleted ? 1 : 0.6,
                        filter:
                          isVisited || isCurrent || isCompleted
                            ? "none"
                            : "grayscale(50%)",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = `translate(${
                          room.minimapX - roomSize / 2
                        }px, ${room.minimapZ - roomSize / 2}px) scale(1.2)`;
                        e.currentTarget.style.zIndex = "10";
                        e.currentTarget.style.boxShadow =
                          "0 0 25px rgba(212, 175, 55, 0.8)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = `translate(${
                          room.minimapX - roomSize / 2
                        }px, ${room.minimapZ - roomSize / 2}px) scale(1)`;
                        e.currentTarget.style.zIndex = "1";
                        e.currentTarget.style.boxShadow = roomGlow;
                      }}
                      onClick={() => {
                        // Add click-to-focus functionality
                        console.log(
                          `Focusing on room: ${room.type} (${room.id})`
                        );
                        // You could add navigation logic here if needed
                      }}
                      title={`${room.type.toUpperCase()} (${room.id})\n${
                        isCompleted
                          ? "Completed"
                          : isVisited
                          ? "Explored"
                          : "Unexplored"
                      }\n${room.connections?.length || 0} connections`}
                    >
                      {/* Room Icon with enhanced styling */}
                      <div
                        style={{
                          textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
                          filter:
                            isVisited || isCurrent || isCompleted
                              ? "none"
                              : "brightness(0.7)",
                        }}
                      >
                        {getRoomIcon(room.type)}
                      </div>
                    </div>
                  );
                })}

                {/* Player Direction Indicator - Enhanced */}
                {currentRoom && (
                  <div
                    style={{
                      position: "absolute",
                      left: `50%`,
                      top: `50%`,
                      transform: `translate(${currentRoom.minimapX - 8}px, ${
                        currentRoom.minimapZ - 8
                      }px)`,
                      width: "16px",
                      height: "16px",
                      background:
                        "radial-gradient(circle, #ff0000 0%, #cc0000 100%)",
                      borderRadius: "50%",
                      boxShadow: "0 0 15px rgba(255, 0, 0, 0.8)",
                      animation: "pulse 1.5s infinite",
                    }}
                  >
                    {/* Direction arrow - Enhanced */}
                    <div
                      style={{
                        position: "absolute",
                        left: "4px",
                        top: "-20px",
                        width: "0",
                        height: "0",
                        borderLeft: "4px solid transparent",
                        borderRight: "4px solid transparent",
                        borderBottom: "20px solid #ff0000",
                        transform: "translateX(-50%)",
                        filter: "drop-shadow(0 0 5px rgba(255, 0, 0, 0.8))",
                      }}
                    />
                    {/* Inner glow */}
                    <div
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: "2px",
                        width: "12px",
                        height: "12px",
                        background:
                          "radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
                        borderRadius: "50%",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Room Info - Always Shows Current Active Room */}
          {fullscreenCurrentRoom ? (
            <div
              style={{
                marginTop: "30px",
                fontSize: "20px",
                textAlign: "center",
                background: `
                  linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(160, 82, 45, 0.1) 100%)
                `,
                border: "2px solid rgba(212, 175, 55, 0.3)",
                borderRadius: "10px",
                padding: "20px 30px",
                backdropFilter: "blur(5px)",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
                maxWidth: "400px",
                margin: "30px auto 0",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  color: "#d4af37",
                  textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
                  fontSize: "24px",
                }}
              >
                {fullscreenCurrentRoom.type.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  opacity: 0.8,
                  color: "#d4af37",
                  textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
                }}
              >
                {fullscreenCurrentRoom.connections?.length || 0} Connected Areas
              </div>
              <div
                style={{
                  fontSize: "14px",
                  opacity: 0.6,
                  marginTop: "8px",
                  color: "#8b4513",
                  fontStyle: "italic",
                }}
              >
                Room ID: {fullscreenCurrentRoom.id}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.5,
                  marginTop: "5px",
                  color: "#8b4513",
                }}
              >
                Position: ({fullscreenCurrentRoom.position.x},{" "}
                {fullscreenCurrentRoom.position.z})
              </div>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.5,
                  marginTop: "2px",
                  color: completedRooms.has(fullscreenCurrentRoom.id)
                    ? "#2E7D32"
                    : visitedRooms.has(fullscreenCurrentRoom.id)
                    ? "#4CAF50"
                    : "#8b4513",
                }}
              >
                Status:{" "}
                {completedRooms.has(fullscreenCurrentRoom.id)
                  ? "Completed"
                  : visitedRooms.has(fullscreenCurrentRoom.id)
                  ? "Explored"
                  : "Unexplored"}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: "30px",
                fontSize: "20px",
                textAlign: "center",
                background: `
                  linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(160, 82, 45, 0.1) 100%)
                `,
                border: "2px solid rgba(212, 175, 55, 0.3)",
                borderRadius: "10px",
                padding: "20px 30px",
                backdropFilter: "blur(5px)",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
                maxWidth: "400px",
                margin: "30px auto 0",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  color: "#d4af37",
                  textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
                  fontSize: "24px",
                }}
              >
                NO ACTIVE ROOM
              </div>
              <div
                style={{
                  fontSize: "14px",
                  opacity: 0.6,
                  color: "#8b4513",
                  fontStyle: "italic",
                }}
              >
                Consolidated Store ID: {currentRoomId || "None"}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Minimap;
