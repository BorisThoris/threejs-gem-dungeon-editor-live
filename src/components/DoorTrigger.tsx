import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { DOOR_REARM_RADIUS, DOOR_TRIGGER_RADIUS } from "../utils/doorUtils";

interface DoorTriggerProps {
  position: [number, number, number];
  /** Called once when the player walks into the doorway. */
  onEnter: () => void;
  /** When false the doorway refuses entry (e.g. a locked door). */
  enabled?: boolean;
}

// Shared with the spawn maths in doorUtils, which has to place an arriving
// player outside the radius of the doorway they just came through.
const TRIGGER_RADIUS = DOOR_TRIGGER_RADIUS;
const REARM_RADIUS = DOOR_REARM_RADIUS;

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
  // Starts disarmed, and the frame loop below arms it as soon as the player is
  // clear of the doorway.
  //
  // Arriving in a room puts the player just inside the doorway they came
  // through, and that doorway is a brand-new trigger: mounting it already armed
  // meant it fired on the first frame and walked them straight back out. The
  // rule that fixes it is also the honest one - you travel by walking *into* a
  // doorway, not by being stood in one.
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
