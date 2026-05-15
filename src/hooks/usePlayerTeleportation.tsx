import { useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

interface TeleportationState {
  isTeleporting: boolean;
  targetPosition: THREE.Vector3 | null;
  targetRotation: THREE.Euler | null;
}

export const usePlayerTeleportation = () => {
  const { camera } = useThree();
  const playerRef = useRef<RapierRigidBody | null>(null);
  const teleportationState = useRef<TeleportationState>({
    isTeleporting: false,
    targetPosition: null,
    targetRotation: null,
  });

  // Set the player rigid body reference
  const setPlayerRef = useCallback((ref: RapierRigidBody | null) => {
    playerRef.current = ref;
  }, []);

  // Calculate entrance position based on door direction
  const calculateEntrancePosition = useCallback(
    (
      roomSize: number,
      direction: "north" | "south" | "east" | "west"
    ): { position: THREE.Vector3; rotation: THREE.Euler } => {
      const entranceDistance = 2; // Distance from door to spawn player

      let position: THREE.Vector3;
      let rotation: THREE.Euler;

      switch (direction) {
        case "north":
          position = new THREE.Vector3(0, 1, -roomSize / 2 + entranceDistance);
          rotation = new THREE.Euler(0, 0, 0); // Face south (into room)
          break;
        case "south":
          position = new THREE.Vector3(0, 1, roomSize / 2 - entranceDistance);
          rotation = new THREE.Euler(0, Math.PI, 0); // Face north (into room)
          break;
        case "east":
          position = new THREE.Vector3(roomSize / 2 - entranceDistance, 1, 0);
          rotation = new THREE.Euler(0, -Math.PI / 2, 0); // Face west (into room)
          break;
        case "west":
          position = new THREE.Vector3(-roomSize / 2 + entranceDistance, 1, 0);
          rotation = new THREE.Euler(0, Math.PI / 2, 0); // Face east (into room)
          break;
        default:
          position = new THREE.Vector3(0, 1, roomSize / 2 - entranceDistance);
          rotation = new THREE.Euler(0, Math.PI, 0);
      }

      return { position, rotation };
    },
    []
  );

  // Teleport player to entrance position
  const teleportToEntrance = useCallback(
    (roomSize: number, direction: "north" | "south" | "east" | "west") => {
      if (!playerRef.current) {
        // Player ref not set, cannot teleport
        return;
      }

      const { position, rotation } = calculateEntrancePosition(
        roomSize,
        direction
      );

      // Teleporting player to entrance

      // Set teleportation state
      teleportationState.current = {
        isTeleporting: true,
        targetPosition: position.clone(),
        targetRotation: rotation.clone(),
      };

      // Teleport the rigid body
      playerRef.current.setTranslation(position, true);
      playerRef.current.setRotation(rotation, true);

      // Stop any existing velocity
      playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      // Update camera position and rotation
      camera.position.copy(position);
      camera.position.y += 1.6; // Eye level offset
      camera.rotation.copy(rotation);
      camera.updateMatrixWorld(true);

      // Mark teleportation as complete
      setTimeout(() => {
        teleportationState.current.isTeleporting = false;
        teleportationState.current.targetPosition = null;
        teleportationState.current.targetRotation = null;
      }, 100);
    },
    [camera, calculateEntrancePosition]
  );

  // Get current teleportation state
  const getTeleportationState = useCallback(() => {
    return teleportationState.current;
  }, []);

  return {
    setPlayerRef,
    teleportToEntrance,
    getTeleportationState,
  };
};
