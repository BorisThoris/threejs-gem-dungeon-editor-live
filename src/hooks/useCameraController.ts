import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";

// Centralized camera rotation controller.
// Listens for CAMERA_SET_ROTATION events and applies rotation immediately,
// while keeping an internal reference that other hooks (like mouse look)
// can read from if needed.
export const useCameraController = () => {
  const { camera } = useThree();
  const lastProgrammaticRotation = useRef<THREE.Euler | null>(null);

  useEffect(() => {
    camera.rotation.order = "YXZ";

    const handleSetRotation = (
      rotation: { x: number; y: number; z?: number } | THREE.Euler
    ) => {
      let targetEuler: THREE.Euler;
      if (rotation instanceof THREE.Euler) {
        targetEuler = new THREE.Euler(rotation.x, rotation.y, rotation.z ?? 0, "YXZ");
      } else {
        targetEuler = new THREE.Euler(rotation.x, rotation.y, rotation.z ?? 0, "YXZ");
      }

      camera.rotation.order = "YXZ";
      camera.rotation.x = targetEuler.x;
      camera.rotation.y = targetEuler.y;
      camera.rotation.z = targetEuler.z;
      camera.updateMatrixWorld(true);

      lastProgrammaticRotation.current = targetEuler;
    };

    const off = gameEvents.on(GAME_EVENTS.CAMERA_SET_ROTATION, handleSetRotation);

    return () => {
      off?.();
    };
  }, [camera]);

  return {
    getLastProgrammaticRotation: () => lastProgrammaticRotation.current,
  };
};


