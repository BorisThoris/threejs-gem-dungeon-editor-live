import { useFrame } from "@react-three/fiber";

import { readGamepad } from "../utils/gamepad";
import { cameraRotationRefs } from "../utils/cameraRotationRef";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";

/** Radians per second at full stick deflection. */
const LOOK_SPEED = 2.6;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

/**
 * Right-stick camera look.
 *
 * Rather than reach into the mouse-look hook's private state, this goes
 * through the rotation plumbing that already exists: read the shared rotation
 * refs, apply the stick, and emit CAMERA_SET_ROTATION - the same event the
 * room-transition code uses to face the player into a new room. Mouse look
 * listens for it and updates its own accumulator, so the two input methods
 * stay in agreement instead of fighting over the camera.
 */
export function GamepadLook() {
  useFrame((_, delta) => {
    const pad = readGamepad();
    if (!pad.connected) return;
    if (!pad.lookX && !pad.lookY) return;

    const { isMovementEnabled, isTransitioning } =
      useConsolidatedGameStore.getState();
    if (!isMovementEnabled || isTransitioning) return;

    const current = cameraRotationRefs.getRotation();
    const yaw = current.y - pad.lookX * LOOK_SPEED * delta;
    const pitch = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, current.x - pad.lookY * LOOK_SPEED * delta)
    );

    gameEvents.emit(GAME_EVENTS.CAMERA_SET_ROTATION, { x: pitch, y: yaw });
  });

  return null;
}

export default GamepadLook;
