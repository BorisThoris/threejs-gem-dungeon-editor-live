import React, { memo, useEffect, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

// Store imports - consolidated
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { useDoorProgressionStore } from "../store/doorProgressionStore";
import useMapStore from "../store/mapStore";
import { useGameState } from "../hooks/useGameState";

// Component imports
import Door from "./Door";
import DoorDebugger from "./DoorDebugger";
import DebugSign from "./DebugSign";
import RoomInstanceRenderer from "./RoomInstanceRenderer";
import Gem from "./Gem";
import RoomTransitionEffect from "./RoomTransitionEffect";

// Data and utils
import { playerRoomDetection } from "../utils/playerRoomDetection";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";

// Types
interface RoomData {
  id: string;
  name?: string;
  type?: string;
  size?: number;
  actualSize?: number;
  connections?: string[];
  position?: { x: number; z: number };
}

interface DoorPosition {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface UnifiedRoomManagerProps {
  playerPosition?: [number, number, number];
  onRoomChange?: (roomId: string) => void;
  onRoomEnter?: (roomId: string) => void;
  onRoomExit?: (roomId: string) => void;
  onInteraction?: (interactionType: string, roomId: string) => void;
  showDebugInfo?: boolean;
}

// Constants
const DEFAULT_ROOM_SIZE = 10;
const WALL_THICKNESS = 0.2;
const GROUND_LEVEL = -0.5;
const DOOR_HEIGHT_OFFSET = 1.25;

// Catch floor rendered while a room is swapping in. Generously sized because
// the player is teleported to an edge spawn of the incoming room, which can be
// well outside the previous room's footprint.
const TRANSITION_FLOOR_SIZE = 200;
const TRANSITION_FLOOR_THICKNESS = 2;
// Centre it so the slab's top surface sits at the normal standing height.
const TRANSITION_FLOOR_Y = GROUND_LEVEL - TRANSITION_FLOOR_THICKNESS / 2;

// Memoized door position calculator
const calculateDoorPosition = (
  roomSize: number,
  index: number,
  totalDoors: number,
  currentRoom?: RoomData,
  targetRoom?: RoomData
): DoorPosition => {
  // Use actual room size if available
  const actualRoomSize = currentRoom?.actualSize || roomSize;

  // Use proper door positioning based on room positions
  if (currentRoom && targetRoom) {
    const dx = (targetRoom.position?.x || 0) - (currentRoom.position?.x || 0);
    const dz = (targetRoom.position?.z || 0) - (currentRoom.position?.z || 0);

    const roomHalfSize = actualRoomSize / 2;

    if (Math.abs(dx) > Math.abs(dz)) {
      // East or West
      if (dx > 0) {
        return {
          position: [roomHalfSize, 0.5, 0],
          rotation: [0, -Math.PI / 2, 0],
        };
      } else {
        return {
          position: [-roomHalfSize, 0.5, 0],
          rotation: [0, Math.PI / 2, 0],
        };
      }
    } else {
      // North or South
      if (dz > 0) {
        return {
          position: [0, 0.5, roomHalfSize],
          rotation: [0, 0, 0],
        };
      } else {
        return {
          position: [0, 0.5, -roomHalfSize],
          rotation: [0, Math.PI, 0],
        };
      }
    }
  } else {
    // Fallback: distribute doors around perimeter
    const angleStep = (2 * Math.PI) / totalDoors;
    const radius = actualRoomSize / 2;
    const angle = index * angleStep;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const rotationY = angle + Math.PI;

    return {
      position: [x, 0.5, z],
      rotation: [0, rotationY, 0],
    };
  }
};

// Memoized room data getter
const useRoomData = (
  activeRoomId: string | null,
  currentMap: any,
  roomInstances: Map<string, any>
) => {
  return useMemo(() => {
    const currentRoomInstance = activeRoomId
      ? roomInstances.get(activeRoomId)
      : null;
    const room = currentRoomInstance?.room;
    const connectedRooms =
      room?.connections
        ?.map((connectionId: string) =>
          currentMap?.rooms.find((r: RoomData) => r.id === connectionId)
        )
        .filter(Boolean) || [];
    return { room, connectedRooms };
  }, [activeRoomId, currentMap, roomInstances]);
};

const UnifiedRoomManager: React.FC<UnifiedRoomManagerProps> = memo(
  ({
    playerPosition = [0, 0, 0],
    onRoomChange,
    onRoomEnter,
    onRoomExit,
    onInteraction,
    showDebugInfo = false,
  }) => {
    // Store hooks - consolidated
    const consolidatedStore = useConsolidatedGameStore();
    const doorStore = useDoorProgressionStore();
    const mapStore = useMapStore();
    const gameState = useGameState();
    const { camera } = useThree();

    // Extract only the values we need
    const {
      currentRoomId,
      isTransitioning,
      transitionProgress,
      roomInstances,
      startTransition,
      loadRoom,
      setActiveRoom,
      fromRoomId,
      toRoomId,
    } = consolidatedStore;
    const { isDoorUnlocked, getDoorState, getDoorType, unlockDoor } = doorStore;
    const { currentMap } = mapStore;
    const { updateRoom, updateGamePhase } = gameState;

    // Refs for room detection
    const lastDetectedRoomId = React.useRef<string | null>(null);
    const lastUpdateTime = React.useRef(0);

    // Computed values
    const activeRoomId = currentRoomId;
    const activeTransitioning = isTransitioning;
    const activeProgress = transitionProgress;

    // Get room data using memoized hook
    const { room: currentRoom, connectedRooms } = useRoomData(
      activeRoomId,
      currentMap,
      roomInstances
    );

    // Note: Room management now handled by consolidated store
    // Room definitions are handled by map generation

    // Initialize map and load start room
    useEffect(() => {
      const initializeGame = async () => {
        // The map is generated once by GameInitializer during the loading
        // screen; just wait for it rather than racing it with a second one.
        if (!currentMap) return;

        if (!activeRoomId) {
          await loadRoom(currentMap.startRoomId);
          setActiveRoom(currentMap.startRoomId);

          // Initial spawn now handled by consolidatedGameStore.startTransition
        }
      };

      initializeGame();
    }, [currentMap, activeRoomId, loadRoom, setActiveRoom]);

    // Handle room changes
    useEffect(() => {
      if (onRoomChange && activeRoomId) {
        onRoomChange(activeRoomId);
      }
    }, [activeRoomId, onRoomChange]);

    // Room detection now lives in <RoomDetection />, mounted outside every
    // Suspense boundary - see that component for why.

    // Cleanup
    useEffect(() => {
      return () => {
        playerRoomDetection.clearCurrentRoom();
      };
    }, []);

    // Memoized door click handler
    const handleDoorClickCallback = useCallback(
      (room: RoomData, doorId: string) => {
        console.log(`🚪 UnifiedRoomManager: Door clicked -> ${room.id}`);
        if (!activeRoomId || !currentRoom) return;

        // Determine direction from current room to target room
        const dx = (room.position?.x || 0) - (currentRoom.position?.x || 0);
        const dz = (room.position?.z || 0) - (currentRoom.position?.z || 0);

        let direction: "north" | "south" | "east" | "west";
        if (Math.abs(dx) > Math.abs(dz)) {
          direction = dx > 0 ? "east" : "west";
        } else {
          direction = dz > 0 ? "north" : "south";
        }

        startTransition(activeRoomId, room.id, direction);
      },
      [activeRoomId, startTransition, currentRoom]
    );

    // Where this room's gem sits. Derived from the room id so it lands in the
    // same spot every time the player comes back, without storing anything.
    // The start room keeps its gem - walking into one within the first few
    // seconds is how the player learns what gems are for. The end room does
    // not, since arriving there is the reward.
    const gemPlacement = useMemo(() => {
      if (!currentRoom?.id) return null;
      if (currentRoom.type === "end") return null;

      let hash = 0;
      for (let i = 0; i < currentRoom.id.length; i++) {
        hash = (hash * 31 + currentRoom.id.charCodeAt(i)) | 0;
      }

      const roomSize =
        currentRoom.actualSize || currentRoom.size || DEFAULT_ROOM_SIZE;
      // Keep it well inside the walls and off the exact centre.
      const radius = Math.max(1.5, roomSize / 2 - 2);
      const angle = ((hash >>> 0) % 360) * (Math.PI / 180);

      return {
        roomId: currentRoom.id,
        position: [
          Math.cos(angle) * radius,
          0.9,
          Math.sin(angle) * radius,
        ] as [number, number, number],
      };
    }, [currentRoom]);

    // Memoized door state change handler
    const handleDoorStateChange = useCallback(
      (doorId: string, newState: string) => {
        useDoorProgressionStore
          .getState()
          .setDoorState(doorId, newState as any);
      },
      []
    );

    // Memoized room transition handler
    const handleRoomTransition = useCallback(
      (fromRoomId: string, toRoomId: string, direction: string) => {
        startTransition(
          fromRoomId,
          toRoomId,
          direction as "north" | "south" | "east" | "west"
        );
      },
      [startTransition]
    );

    // Show loading/transition state.
    // The room subtree (and every collider in it) is unmounted here, so this
    // branch MUST provide its own floor - otherwise the player spends the whole
    // transition falling through an empty world, which is exactly what used to
    // happen.
    if (activeTransitioning) {
      return (
        <group>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[0, -TRANSITION_FLOOR_Y, 0]} visible={false}>
              <boxGeometry
                args={[
                  TRANSITION_FLOOR_SIZE,
                  TRANSITION_FLOOR_THICKNESS,
                  TRANSITION_FLOOR_SIZE,
                ]}
              />
              <meshBasicMaterial color="#000000" />
            </mesh>
          </RigidBody>

          <mesh position={[0, 2, 0]}>
            <planeGeometry args={[8, 4]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 2, 0.1]}>
            <planeGeometry args={[6, 2]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      );
    }

    if (!currentRoom) {
      return null;
    }

    // Get room component for rendering

    return (
      <group>
        {/* Render current room content */}
        <RoomInstanceRenderer
          playerPosition={playerPosition as [number, number, number]}
          onInteraction={onInteraction}
          onRoomTransition={handleRoomTransition}
        />

        {/* One gem per room - the reason to walk into a room at all. Rendered
            as a sibling of the room rather than inside it so that a room whose
            textures are still loading cannot delay the collectible. */}
        {gemPlacement && (
          <Gem roomId={gemPlacement.roomId} position={gemPlacement.position} />
        )}

        {/* Render doors */}
        {connectedRooms.map((room: RoomData, index: number) => {
          if (!room) return null;

          const doorPosition = calculateDoorPosition(
            currentRoom?.actualSize || currentRoom?.size || DEFAULT_ROOM_SIZE,
            index,
            connectedRooms.length,
            currentRoom,
            room
          );
          const doorId = `door-${activeRoomId}-${room.id}`;
          const roomName = room.name || room.id;

          // Render door with simplified logic
          const isUnlocked = isDoorUnlocked(doorId);
          const doorState = getDoorState(doorId);
          const doorType = getDoorType(doorId);

          return (
            <Door
              key={doorId}
              position={doorPosition.position}
              rotation={doorPosition.rotation}
              targetRoomId={room.id}
              showLabel={true}
              state={doorState}
              type={doorType}
              isLocked={!isUnlocked}
              glowEffect={doorType === "secret"}
              onDoorClick={() => handleDoorClickCallback(room, doorId)}
              onStateChange={(newState) =>
                handleDoorStateChange(doorId, newState)
              }
            />
          );
        })}

        {/* Room Transition Effect */}
        <RoomTransitionEffect
          isTransitioning={activeTransitioning}
          fromRoomId={fromRoomId || undefined}
          toRoomId={toRoomId || undefined}
          progress={activeProgress}
        />

        {/* Door Debugger - Disabled */}
        {false && <DoorDebugger showDebugger={false} />}
      </group>
    );
  }
);

UnifiedRoomManager.displayName = "UnifiedRoomManager";

export default UnifiedRoomManager;
