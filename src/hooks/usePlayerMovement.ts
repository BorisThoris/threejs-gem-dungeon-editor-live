import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import { usePhysicalKeyboard } from "./usePhysicalKeyboard";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { readGamepad } from "../utils/gamepad";

interface UsePlayerMovementProps {
  isSpawned: boolean;
  editorMode: boolean;
}

// Terminal velocity. Even with a fixed timestep and CCD, an unbounded fall
// speed eventually outruns collision detection; capping it keeps every step
// well inside the thickness of the floor slabs.
const MAX_FALL_SPEED = 25;

/**
 * How fast the player is ever allowed to travel upward.
 *
 * The player cannot jump and the world is flat, so upward motion is never
 * something they asked for - it is the solver pushing the capsule out of a
 * collider it overlaps. Left unbounded, a corner caught at the wrong angle
 * flings the player into the air and drops them somewhere else entirely.
 *
 * The cap is not zero, because de-penetration is exactly how the player gets
 * out of geometry they have ended up inside; pinning y to <= 0 every frame
 * would cancel that correction and sink them through the floor instead. This
 * is fast enough to climb out of anything they can realistically overlap, and
 * far too slow to look like a launch.
 */
const MAX_RISE_SPEED = 2;

/** Clamp vertical motion to "falling, or quietly recovering". */
const clampVertical = (y: number) =>
  Math.min(MAX_RISE_SPEED, Math.max(y, -MAX_FALL_SPEED));

const UP = new Vector3(0, 1, 0);

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

export const usePlayerMovement = ({ isSpawned, editorMode }: UsePlayerMovementProps) => {
  const { camera } = useThree();
  const keysRef = usePhysicalKeyboard();

  // Read with a selector, not the whole store. Subscribing to the entire store
  // re-rendered this hook's component on every unrelated state change - a gem
  // picked up, a room marked visited, a life lost.
  const isMovementEnabled = useConsolidatedGameStore(
    (state) => state.isMovementEnabled
  );

  // Reusable objects to avoid garbage collection
  const frontVector = useRef(new Vector3());
  const sideVector = useRef(new Vector3());
  const direction = useRef(new Vector3());
  const cameraEuler = useRef(new Euler(0, 0, 0, "YXZ"));
  const yawQuaternion = useRef(new Quaternion());

  const handleMovement = (rigidBody: any) => {
    if (!isSpawned || !rigidBody || editorMode) return;

    const velocity = rigidBody.linvel();

    // Clamp vertical speed before anything else, so it applies during
    // transitions and cutscenes too - that is exactly when the player used to
    // accelerate off the bottom of the world.
    const yVelocity = clampVertical(velocity.y);

    // Check if movement is enabled (frozen during transitions)
    if (!isMovementEnabled) {
      rigidBody.setLinvel({ x: 0, y: yVelocity, z: 0 }, true);
      return;
    }

    const keys = keysRef.current;
    const forward = keys["KeyW"] || keys["ArrowUp"] || false;
    const backward = keys["KeyS"] || keys["ArrowDown"] || false;
    const left = keys["KeyA"] || keys["ArrowLeft"] || false;
    const right = keys["KeyD"] || keys["ArrowRight"] || false;
    const dash = keys["ShiftLeft"] || keys["ShiftRight"] || false;

    // The left stick contributes alongside the keys rather than replacing
    // them, so a player can use either at any moment without a mode switch.
    const pad = readGamepad();

    // Movement follows where the camera is facing, but only its yaw. Applying
    // the full camera quaternion folded pitch into the movement vector, so
    // looking at the floor slowed the player down and looking up sped them up.
    cameraEuler.current.setFromQuaternion(camera.quaternion, "YXZ");
    yawQuaternion.current.setFromAxisAngle(UP, cameraEuler.current.y);

    const speed = dash || pad.dash ? 8 : 5;

    // Clamp rather than normalise, so a partly-deflected stick actually walks
    // slower instead of snapping to full speed.
    const inputZ = clampUnit(+backward - +forward + pad.moveY);
    const inputX = clampUnit(+left - +right - pad.moveX);

    frontVector.current.set(0, 0, inputZ);
    sideVector.current.set(inputX, 0, 0);
    direction.current.subVectors(frontVector.current, sideVector.current);

    const magnitude = direction.current.length();
    if (magnitude > 1) direction.current.divideScalar(magnitude);

    direction.current
      .multiplyScalar(speed)
      .applyQuaternion(yawQuaternion.current);

    rigidBody.setLinvel(
      { x: direction.current.x, y: yVelocity, z: direction.current.z },
      true
    );
  };

  return {
    handleMovement,
  };
};
