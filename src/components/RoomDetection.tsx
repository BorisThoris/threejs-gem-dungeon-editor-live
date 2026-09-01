import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import useMapStore from "../store/mapStore";
import { playerRoomDetection } from "../utils/playerRoomDetection";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { uiEvents, UI_EVENTS } from "../utils/uiEvents";

/**
 * Owns "which room is the player standing in".
 *
 * This deliberately renders nothing and loads nothing. It used to live inside
 * UnifiedRoomManager, which mounts the room's meshes and textures - and the
 * moment any of those suspended, React detached the whole subtree's effects and
 * the detection frame loop stopped for good. Room detection ran exactly once
 * per session, so the game never knew where the player was: the HUD sat on
 * "Room: Unknown", rooms were never marked visited, and no room-enter event
 * ever fired.
 *
 * Keeping it in its own component, mounted as a sibling of the player and
 * outside every Suspense boundary, means detection keeps running no matter what
 * the room is doing.
 */
// Reused each frame rather than allocated - this runs at 60Hz forever.
const probePosition = { x: 0, y: 0, z: 0 };

export function RoomDetection() {
  const { camera } = useThree();

  // Re-register origin-local bounds whenever the active room changes. Rooms are
  // always rendered at the origin (see RoomInstanceRenderer), so bounds derived
  // from map-grid positions never matched the player.
  useEffect(() => {
    const applyActiveRoomBounds = () => {
      const state = useConsolidatedGameStore.getState();
      const instance = state.currentRoomId
        ? state.roomInstances.get(state.currentRoomId)
        : null;
      playerRoomDetection.setActiveRoomAtOrigin(instance?.room ?? null);
    };

    applyActiveRoomBounds();

    return useConsolidatedGameStore.subscribe(
      (state) => state.currentRoomId,
      applyActiveRoomBounds
    );
  }, []);

  useFrame(() => {
    const { isTransitioning } = useConsolidatedGameStore.getState();


    // Skip while a room is swapping in, so a mid-flight teleport is not read as
    // the player leaving the world.
    if (isTransitioning || !playerRoomDetection.isDetectionEnabled()) return;

    probePosition.x = camera.position.x;
    probePosition.y = camera.position.y;
    probePosition.z = camera.position.z;
    const detectedRoomId = playerRoomDetection.detectCurrentRoom(probePosition);

    const previousRoomId = playerRoomDetection.getLastReportedRoomId();
    if (detectedRoomId === previousRoomId) return;
    playerRoomDetection.setLastReportedRoomId(detectedRoomId);

    const mapStore = useMapStore.getState();
    const currentMap = mapStore.currentMap;

    if (detectedRoomId) {
      mapStore.setCurrentRoom(detectedRoomId);
      mapStore.markRoomVisited(detectedRoomId);
      useConsolidatedGameStore.getState().markRoomVisited(detectedRoomId);

      const room = currentMap?.rooms.find((r) => r.id === detectedRoomId);
      if (room) {
        useConsolidatedGameStore
          .getState()
          .setGamePhase(
            room.type === "boss"
              ? "boss"
              : room.type === "puzzle"
              ? "puzzle"
              : "exploration"
          );

        gameEvents.emit(GAME_EVENTS.ROOM_ENTER, room);
        // Nothing ever emitted ROOM_CHANGE, so the HUD's room readout could
        // never leave its "Unknown" placeholder.
        uiEvents.emit(UI_EVENTS.ROOM_CHANGE, room.type || detectedRoomId);
      }
    } else if (previousRoomId) {
      const previousRoom = currentMap?.rooms.find(
        (r) => r.id === previousRoomId
      );
      if (previousRoom) {
        gameEvents.emit(GAME_EVENTS.ROOM_EXIT, previousRoom);
      }
      useConsolidatedGameStore.getState().setGamePhase("exploration");
    }
  });

  return null;
}

export default RoomDetection;
