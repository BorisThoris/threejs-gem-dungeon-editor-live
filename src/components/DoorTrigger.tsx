import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";

interface DoorTriggerProps {
  position: [number, number, number];
  /** Called once when the player walks into the doorway. */
  onEnter: () => void;
  /** When false the doorway refuses entry (e.g. a locked door). */
  enabled?: boolean;
}

const TRIGGER_RADIUS = 1.5;
/** Distance the player must back away before the doorway can fire again. */
const REARM_RADIUS = 2.4;

/**
 * Walks the player through a doorway instead of making them click it.
 *
 * Traversal used to be a mouse click on the door mesh, which fights the
 * mouse-look controls and is the least discoverable thing in the build: there
 * is no way to guess that a first-person dungeon wants you to click a door.
 * Standing in the doorway is what players already try.
 *
 * Pure logic and geometry - no loaders - so it can never suspend the room.
 */
export function DoorTrigger({
  position,
  onEnter,
  enabled = true,
}: DoorTriggerProps) {
  // Starts DISARMED. A room transition drops the player a step inside the new
  // room, which puts them within range of the door they just came through - and
  // a freshly mounted trigger that starts armed fires on its first frame,
  // yanking the player straight back out again. Measured: every arrival was
  // followed by an unwanted second transition about a second later.
  //
  // Arming only once the player has been outside the trigger means a door can
  // never fire on someone who was already standing in it when it appeared.
  const armed = useRef(false);

  useFrame((state) => {
    const { isTransitioning, isMovementEnabled } =
      useConsolidatedGameStore.getState();

    const player = state.camera.position;
    const dx = player.x - position[0];
    const dz = player.z - position[2];
    const distanceSquared = dx * dx + dz * dz;

    if (distanceSquared > REARM_RADIUS * REARM_RADIUS) {
      armed.current = true;
      return;
    }

    if (!enabled || !armed.current || isTransitioning || !isMovementEnabled) {
      return;
    }

    if (distanceSquared <= TRIGGER_RADIUS * TRIGGER_RADIUS) {
      armed.current = false;
      onEnter();
    }
  });

  return null;
}

export default DoorTrigger;
