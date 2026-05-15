import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { usePhysicalKeyboard } from "./usePhysicalKeyboard";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";

interface UsePlayerMovementProps {
  isSpawned: boolean;
  editorMode: boolean;
}

export const usePlayerMovement = ({ isSpawned, editorMode }: UsePlayerMovementProps) => {
  const { camera } = useThree();
  const keys = usePhysicalKeyboard();
  const { isMovementEnabled } = useConsolidatedGameStore();

  // Reusable vectors to avoid garbage collection
  const frontVector = useRef(new Vector3());
  const sideVector = useRef(new Vector3());
  const direction = useRef(new Vector3());

  const handleMovement = (rigidBody: any) => {
    if (!isSpawned || !rigidBody || editorMode) return;

    // Check if movement is enabled (frozen during transitions)
    if (!isMovementEnabled) {
      // Stop any existing movement
      const velocity = rigidBody.linvel();
      rigidBody.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      return;
    }

    const { forward, backward, left, right, dash } = {
      forward: keys["KeyW"] || keys["ArrowUp"] || false,
      backward: keys["KeyS"] || keys["ArrowDown"] || false,
      left: keys["KeyA"] || keys["ArrowLeft"] || false,
      right: keys["KeyD"] || keys["ArrowRight"] || false,
      dash: keys["ShiftLeft"] || keys["ShiftRight"] || false,
    };

    const velocity = rigidBody.linvel();

    // Calculate movement (slower speeds) - reuse vectors
    const speed = dash ? 8 : 5;
    frontVector.current.set(0, 0, +backward - +forward);
    sideVector.current.set(+left - +right, 0, 0);
    direction.current
      .subVectors(frontVector.current, sideVector.current)
      .normalize()
      .multiplyScalar(speed)
      .applyQuaternion(camera.quaternion);

    // No jumping - keep current Y velocity
    const yVelocity = velocity.y;

    // Apply movement
    rigidBody.setLinvel(
      { x: direction.current.x, y: yVelocity, z: direction.current.z },
      true
    );
  };

  return {
    handleMovement,
  };
};
