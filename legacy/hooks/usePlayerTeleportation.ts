import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface UsePlayerTeleportationProps {
  rigidBodyRef: React.RefObject<any>;
}

export const usePlayerTeleportation = ({ rigidBodyRef }: UsePlayerTeleportationProps) => {
  const { camera } = useThree();

  useEffect(() => {
    const handleTeleport = (event: CustomEvent) => {
      if (!rigidBodyRef.current) return;

      const { position, rotation } = event.detail;
      const newPosition = new THREE.Vector3(...position);
      const newRotation = new THREE.Euler(...rotation);
      newRotation.order = "YXZ"; // Set rotation order
      const newQuaternion = new THREE.Quaternion().setFromEuler(newRotation);

      // Teleport the rigid body
      rigidBodyRef.current.setTranslation(newPosition, true);
      rigidBodyRef.current.setRotation(newQuaternion, true);

      // Stop any existing velocity
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      // Update camera position only; rotation is owned by camera controller/mouse look
      camera.position.copy(newPosition);
      camera.position.y += 1.0; // Eye level offset (reduced from 1.6)
      camera.updateMatrixWorld(true);
    };

    window.addEventListener("playerTeleport", handleTeleport as EventListener);

    return () => {
      window.removeEventListener(
        "playerTeleport",
        handleTeleport as EventListener
      );
    };
  }, [camera, rigidBodyRef]);
};
