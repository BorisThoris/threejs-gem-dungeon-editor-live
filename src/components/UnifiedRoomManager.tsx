import React, { memo, useEffect, useCallback, useMemo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
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
import Hazard from "./Hazard";
import DoorTrigger from "./DoorTrigger";
import RoomTransitionEffect from "./RoomTransitionEffect";

// Data and utils
import { playerRoomDetection } from "../utils/playerRoomDetection";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { GEMS_REQUIRED_FOR_END } from "../configs/runRules";
import { GROUND_Y } from "../configs/worldGeometry";

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

const DOOR_HEIGHT_OFFSET = 1.25;
// Keeps doors that share a wall clear of the corners.
const DOOR_WALL_MARGIN = 3;

// Catch floor rendered while a room is swapping in. Generously sized because
// the player is teleported to an edge spawn of the incoming room, which can be
// well outside the previous room's footprint.
const TRANSITION_FLOOR_SIZE = 200;
const TRANSITION_FLOOR_THICKNESS = 2;
// Centred so the slab's TOP sits exactly on the shared ground plane, which is
// what every room floor does. This was computed from a local GROUND_LEVEL of
// -0.5 that disagreed with the rest of the game, and then used negated - so the
// slab's top sat at +2.5 and the player rode a ledge two and a half metres up
// through every transition, then dropped when it unmounted.
const TRANSITION_FLOOR_Y = GROUND_Y - TRANSITION_FLOOR_THICKNESS / 2;

/**
 * A wide, invisible floor at the ground plane.
 *
 * Used whenever no room's colliders are mounted: during a transition, when the
 * room subtree is unmounted, and on the first frames of a run before the start
 * room has loaded. Without it the player is standing over nothing.
 */
const CatchFloor = () => (
  <RigidBody type="fixed" colliders={false}>
    {/* An explicit collider, not an invisible mesh: `colliders="cuboid"`
        derives shapes by walking child meshes, and it does not walk one with
        visible={false} - so this floor had no collider and caught nothing. */}
    <CuboidCollider
      args={[
        TRANSITION_FLOOR_SIZE / 2,
        TRANSITION_FLOOR_THICKNESS / 2,
        TRANSITION_FLOOR_SIZE / 2,
      ]}
      position={[0, TRANSITION_FLOOR_Y, 0]}
    />
  </RigidBody>
);

// Where each door sits on the room's walls.
//
// This used to map every neighbour to one of exactly four cardinal points from
// the sign of dx/dz, and ignored the index/total arguments entirely. Rooms here
// routinely have three or four connections, so two neighbours lying in the same
// general direction were handed *identical* coordinates: one door was buried
// inside the other, and two walk-through triggers overlapped on one spot.
//
// Doors are now assigned a wall the same way, then any wall with more than one
// door has them spread evenly along it.
const DOOR_WALLS = {
  east: { axis: "x" as const, sign: 1, rotation: [0, -Math.PI / 2, 0] as const },
  west: { axis: "x" as const, sign: -1, rotation: [0, Math.PI / 2, 0] as const },
  north: { axis: "z" as const, sign: 1, rotation: [0, 0, 0] as const },
  south: { axis: "z" as const, sign: -1, rotation: [0, Math.PI, 0] as const },
};

type WallName = keyof typeof DOOR_WALLS;

const wallFor = (currentRoom?: RoomData, targetRoom?: RoomData): WallName => {
  const dx = (targetRoom?.position?.x || 0) - (currentRoom?.position?.x || 0);
  const dz = (targetRoom?.position?.z || 0) - (currentRoom?.position?.z || 0);
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? "east" : "west";
  return dz > 0 ? "north" : "south";
};

/**
 * Lay out every door for a room at once, so collisions on a wall can be seen
 * and spread out.
 */
const calculateDoorPositions = (
  currentRoom: RoomData | undefined,
  connectedRooms: RoomData[]
): DoorPosition[] => {
  const roomSize =
    currentRoom?.actualSize || currentRoom?.size || DEFAULT_ROOM_SIZE;
  const half = roomSize / 2;

  const walls = connectedRooms.map((target) => wallFor(currentRoom, target));

  const perWall = new Map<WallName, number>();
  walls.forEach((w) => perWall.set(w, (perWall.get(w) || 0) + 1));

  const placedOnWall = new Map<WallName, number>();

  return walls.map((wall) => {
    const spec = DOOR_WALLS[wall];
    const total = perWall.get(wall) || 1;
    const index = placedOnWall.get(wall) || 0;
    placedOnWall.set(wall, index + 1);

    // Single door sits centred; several are spaced across the usable width of
    // the wall, leaving a margin so none ends up inside a corner.
    let offset = 0;
    if (total > 1) {
      const usable = Math.max(0, roomSize - DOOR_WALL_MARGIN * 2);
      const step = usable / (total - 1);
      offset = -usable / 2 + step * index;
    }

    const position: [number, number, number] =
      spec.axis === "x"
        ? [half * spec.sign, 0.5, offset]
        : [offset, 0.5, half * spec.sign];

    return {
      position,
      rotation: [...spec.rotation] as [number, number, number],
    };
  });
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
    // One selector per value, deliberately.
    //
    // This component used to call useConsolidatedGameStore(), useMapStore() and
    // useDoorProgressionStore() with no selector at all, subscribing to every
    // one of those stores in full. It renders the room - hundreds of meshes -
    // so picking up a gem, losing a life or marking a room visited re-rendered
    // and reconciled the entire dungeon room, none of which depends on any of
    // those values.
    const currentRoomId = useConsolidatedGameStore((s) => s.currentRoomId);
    const isTransitioning = useConsolidatedGameStore((s) => s.isTransitioning);
    const transitionProgress = useConsolidatedGameStore(
      (s) => s.transitionProgress
    );
    const roomInstances = useConsolidatedGameStore((s) => s.roomInstances);
    const fromRoomId = useConsolidatedGameStore((s) => s.fromRoomId);
    const toRoomId = useConsolidatedGameStore((s) => s.toRoomId);
    const gemCount = useConsolidatedGameStore((s) => s.playerStats.gems);

    // Actions are stable for the life of the store, so they never need to be
    // part of a subscription.
    const { startTransition, loadRoom, setActiveRoom, spendGems } =
      useConsolidatedGameStore.getState();
    const { isDoorUnlocked, getDoorState, getDoorType } =
      useDoorProgressionStore.getState();

    const currentMap = useMapStore((s) => s.currentMap);
    const { updateGamePhase } = useGameState();

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

    // Starts a transition to a connected room.
    const travelTo = useCallback(
      (room: RoomData, doorId: string) => {
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

    // Lay all the doors out together so two neighbours on the same wall get
    // spread along it instead of landing on identical coordinates.
    const doorPositions = useMemo(
      () => calculateDoorPositions(currentRoom, connectedRooms as RoomData[]),
      [currentRoom, connectedRooms]
    );

    // Trap rooms get a ring of spikes between the door and the gem, so the
    // risk sits on the path to the reward rather than off in a corner.
    const hazardPlacements = useMemo(() => {
      if (!currentRoom?.id || currentRoom.type !== "trap") return [];

      const roomSize =
        currentRoom.actualSize || currentRoom.size || DEFAULT_ROOM_SIZE;
      const radius = Math.max(1.2, roomSize / 2 - 3.5);
      const count = 5;

      return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ] as [number, number, number];
      });
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
          <CatchFloor />

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

    // No room yet - the very first frames of a run, before the start room's
    // colliders have mounted. This returned null, so for those frames there was
    // nothing at all under the player and they began the run falling. It went
    // unnoticed because SafeSpawnArea happened to be mounted at the origin in
    // every room and caught them; removing that scaffolding is what exposed it.
    if (!currentRoom) {
      return <CatchFloor />;
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

        {/* Trap rooms actually trap now. */}
        {hazardPlacements.map((hazard, i) => (
          <Hazard key={`hazard-${i}`} position={hazard} />
        ))}

        {/* Render doors */}
        {connectedRooms.map((room: RoomData, index: number) => {
          if (!room) return null;

          const doorPosition = doorPositions[index];
          const doorId = `door-${activeRoomId}-${room.id}`;
          const roomName = room.name || room.id;

          // The door to the end room is the one thing gems are for: it stays
          // shut until the player has found enough of them, and opening it
          // spends them.
          const isEndDoor = room.id === currentMap?.endRoomId;
          const canAffordEnd = gemCount >= GEMS_REQUIRED_FOR_END;
          const isUnlocked = isEndDoor
            ? canAffordEnd
            : isDoorUnlocked(doorId);
          const doorState = getDoorState(doorId);
          const doorType = getDoorType(doorId);

          return (
            <group key={doorId}>
              <Door
                position={doorPosition.position}
                rotation={doorPosition.rotation}
                targetRoomId={room.id}
                showLabel={true}
                state={doorState}
                type={doorType}
                isLocked={!isUnlocked}
                glowEffect={doorType === "secret"}
                onStateChange={(newState) =>
                  handleDoorStateChange(doorId, newState)
                }
              />

              {/* Travel is an explicit E press. Walking into a doorway used to
                  teleport you on contact - so brushing past a door on the way
                  to a gem threw you into the next room - and the door mesh was
                  also clickable, which no first-person player would guess and
                  which fired on stray clicks. Both are gone. */}
              <DoorTrigger
                position={doorPosition.position}
                label={roomName}
                enabled={isUnlocked}
                blockedReason={
                  isEndDoor
                    ? `Needs ${GEMS_REQUIRED_FOR_END} gems (${gemCount}/${GEMS_REQUIRED_FOR_END})`
                    : "Locked"
                }
                onEnter={() => {
                  if (isEndDoor && !spendGems(GEMS_REQUIRED_FOR_END)) return;
                  travelTo(room, doorId);
                }}
              />
            </group>
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
