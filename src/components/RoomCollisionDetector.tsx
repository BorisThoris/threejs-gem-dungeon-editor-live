import React, { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useGameState } from "../hooks/useGameState";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { roomDetectionManager } from "../utils/roomDetectionManager";
import type { Room } from "../types/map";

interface RoomCollisionDetectorProps {
  room: Room;
  onRoomEnter?: (room: Room) => void;
  onRoomExit?: (room: Room) => void;
}

const RoomCollisionDetector: React.FC<RoomCollisionDetectorProps> = ({
  room,
  onRoomEnter,
  onRoomExit,
}) => {
  const { updateRoom, updateGamePhase } = useGameState();
  const isPlayerInRoom = useRef(false);
  const lastUpdateTime = useRef(0);
  const { camera } = useThree();

  // Cleanup effect to reset room state when component unmounts
  useEffect(() => {
    return () => {
      // If this room was the current room, clear it
      if (roomDetectionManager.getCurrentRoomId() === room.id) {
        roomDetectionManager.setCurrentRoom(null);
        updateRoom(null);
        updateGamePhase("exploration");
        console.log(`Room ${room.id} component unmounted, clearing room state`);
      }
    };
  }, [room.id, updateRoom, updateGamePhase]);

  // Throttle collision detection to prevent excessive calculations
  const checkCollision = useCallback(
    (isInRoom: boolean) => {
      const now = Date.now();
      if (now - lastUpdateTime.current < 100) return; // Throttle to 10fps max
      lastUpdateTime.current = now;

      if (
        isInRoom &&
        !isPlayerInRoom.current &&
        roomDetectionManager.getCurrentRoomId() !== room.id
      ) {
        // Player entered the room - prevent race conditions
        const currentRoom = roomDetectionManager.getCurrentRoomId();
        if (currentRoom) {
          console.log(
            `Room collision: Player leaving ${currentRoom} for ${room.id}`
          );
        }

        roomDetectionManager.setCurrentRoom(room.id);
        isPlayerInRoom.current = true;

        // Update game state without triggering React re-renders
        updateRoom(room.id);

        // Set game phase based on room type
        if (room.type === "boss") {
          updateGamePhase("boss");
        } else if (room.type === "puzzle") {
          updateGamePhase("puzzle");
        } else {
          updateGamePhase("exploration");
        }

        // Emit events for UI components
        gameEvents.emit(GAME_EVENTS.ROOM_ENTER, room);
        onRoomEnter?.(room);

        console.log(`Room entered: ${room.id} (${room.type})`);
      } else if (
        !isInRoom &&
        isPlayerInRoom.current &&
        roomDetectionManager.getCurrentRoomId() === room.id
      ) {
        // Player exited the room
        isPlayerInRoom.current = false;
        roomDetectionManager.setCurrentRoom(null);

        // Update game state
        updateRoom(null);
        updateGamePhase("exploration");

        // Emit events for UI components
        gameEvents.emit(GAME_EVENTS.ROOM_EXIT, room);
        onRoomExit?.(room);

        console.log(`Room exited: ${room.id}`);
      } else if (
        isInRoom &&
        isPlayerInRoom.current &&
        roomDetectionManager.getCurrentRoomId() !== room.id
      ) {
        // Player is in this room but global state says they're in a different room
        // This happens when going back to a previous room - reset the state
        console.log(
          `Room state mismatch: Player in ${
            room.id
          } but global says ${roomDetectionManager.getCurrentRoomId()}, resetting...`
        );
        isPlayerInRoom.current = false;
      }
    },
    [room, updateRoom, updateGamePhase, onRoomEnter, onRoomExit]
  );

  // Optimized collision detection with proper 3D bounds checking
  useFrame(() => {
    if (!roomDetectionManager.isDetectionEnabled()) return;

    // Get player position from camera
    const playerPosition = camera.position;
    const roomPosition = {
      x: room.position.x,
      y: 0, // Rooms are at ground level
      z: room.position.z,
    };
    const roomSize = room.size || 8; // Default to 8 if not set

    // Debug: Log room info if size is missing
    if (!room.size) {
      console.warn(`Room ${room.id} missing size property, using default 8`);
    }

    // Calculate room bounds with some tolerance
    const halfSize = roomSize / 2;
    const tolerance = 0.5; // Small tolerance to prevent edge cases
    const roomMinX = roomPosition.x - halfSize - tolerance;
    const roomMaxX = roomPosition.x + halfSize + tolerance;
    const roomMinZ = roomPosition.z - halfSize - tolerance;
    const roomMaxZ = roomPosition.z + halfSize + tolerance;
    const roomMinY = roomPosition.y - 2; // Allow some vertical tolerance
    const roomMaxY = roomPosition.y + 4;

    // Check if player is within room bounds (3D collision)
    const isInRoom =
      playerPosition.x >= roomMinX &&
      playerPosition.x <= roomMaxX &&
      playerPosition.z >= roomMinZ &&
      playerPosition.z <= roomMaxZ &&
      playerPosition.y >= roomMinY &&
      playerPosition.y <= roomMaxY;

    // Debug logging for first few frames
    if (Math.random() < 0.01) {
      // 1% chance to log
      console.log(`Room ${room.id} detection:`, {
        playerPos: `${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(
          1
        )}, ${playerPosition.z.toFixed(1)}`,
        roomPos: `${roomPosition.x}, ${roomPosition.y}, ${roomPosition.z}`,
        bounds: `X: ${roomMinX.toFixed(1)}-${roomMaxX.toFixed(
          1
        )}, Z: ${roomMinZ.toFixed(1)}-${roomMaxZ.toFixed(1)}`,
        isInRoom,
      });
    }

    checkCollision(isInRoom);
  });

  return (
    <RigidBody type="fixed" sensor>
      <mesh
        position={[room.position.x, 0, room.position.z]}
        visible={false} // Invisible collision box
      >
        <boxGeometry args={[room.size || 8, 4, room.size || 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </RigidBody>
  );
};

export default RoomCollisionDetector;
