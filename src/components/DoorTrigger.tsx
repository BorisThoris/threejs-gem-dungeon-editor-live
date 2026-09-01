import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { DOOR_INTERACT_RADIUS } from "../utils/doorUtils";
import { readGamepad } from "../utils/gamepad";
import { uiEvents, UI_EVENTS } from "../utils/uiEvents";

interface DoorTriggerProps {
  position: [number, number, number];
  /** Where this door leads, for the prompt. */
  label?: string;
  /** Called when the player confirms they want to go through. */
  onEnter: () => void;
  /** When false the doorway refuses entry (e.g. an unaffordable end door). */
  enabled?: boolean;
  /** Shown instead of the usual prompt when the door will not open. */
  blockedReason?: string;
}

interface PromptPayload {
  key: string;
  text: string;
  enabled: boolean;
}

/**
 * Every door currently offering itself, and how far away it is.
 *
 * Doors can sit close enough together to both be in range - two exits on one
 * wall, or a corner. Without arbitration each would publish and retract its own
 * prompt independently, so stepping out of one door's radius would blank the
 * prompt for the door you are still standing in front of, and the E press would
 * go to whichever component happened to run last. The nearest door wins, and it
 * is the only one that both draws the prompt and answers the key.
 */
const contenders = new Map<object, number>();
/** The last payload published, so a steady prompt costs one event, not one per frame. */
let lastPublished: string | null = null;

const publish = (payload: PromptPayload | null) => {
  const key = payload ? JSON.stringify(payload) : null;
  if (key === lastPublished) return;
  lastPublished = key;
  uiEvents.emit(UI_EVENTS.DOOR_PROMPT, payload);
};

/**
 * Travel happens when the player asks for it.
 *
 * Doors used to work two ways at once, and both were wrong. Walking into a
 * doorway teleported you immediately, which meant brushing past a door on the
 * way to a gem threw you into the next room; and the door mesh was clickable,
 * which is undiscoverable in a first-person game and fired whenever a stray
 * click landed on scenery.
 *
 * Now standing near a door offers it, and only pressing E - or the interact
 * button on a pad - takes it. Nothing moves the player without them asking.
 *
 * Pure logic and geometry, no loaders, so it can never suspend the room.
 */
export function DoorTrigger({
  position,
  label,
  onEnter,
  enabled = true,
  blockedReason,
}: DoorTriggerProps) {
  const pressed = useRef(false);
  // An anchor in the scene graph rather than a bare position prop: callers nest
  // doors inside room groups, and comparing a group-local offset against the
  // camera's world position would put the trigger somewhere else entirely.
  const anchor = useRef<THREE.Group>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  // Identity in the contenders map. An object literal is enough and never
  // collides with another door's.
  const id = useMemo(() => ({}), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "KeyE") pressed.current = true;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // Unmounting while in range would otherwise leave this door contending
      // for a prompt forever, and strand that prompt on screen.
      contenders.delete(id);
      if (contenders.size === 0) publish(null);
    };
  }, [id]);

  useFrame((state) => {
    const { isTransitioning, isMovementEnabled } =
      useConsolidatedGameStore.getState();

    if (!anchor.current) return;
    anchor.current.getWorldPosition(worldPos);

    const player = state.camera.position;
    const dx = player.x - worldPos.x;
    const dz = player.z - worldPos.z;
    const distSq = dx * dx + dz * dz;

    // A door only offers itself when the player is actually in control: not
    // mid-transition, not paused, not after the run has been decided.
    const offering =
      distSq <= DOOR_INTERACT_RADIUS * DOOR_INTERACT_RADIUS &&
      !isTransitioning &&
      isMovementEnabled;

    // Dev-only: lets a test harness find the doors without guessing at room
    // geometry. Never shipped - Vite strips the branch from a production build.
    if (import.meta.env.DEV) {
      const probe = ((window as unknown as Record<string, unknown>).__doorDebug ??=
        {}) as Record<string, unknown>;
      probe[label ?? "door"] = {
        x: +worldPos.x.toFixed(2),
        z: +worldPos.z.toFixed(2),
        dist: +Math.sqrt(distSq).toFixed(2),
        enabled,
      };
    }

    if (offering) {
      contenders.set(id, distSq);
    } else if (contenders.delete(id) && contenders.size === 0) {
      publish(null);
    }

    // Consume the key press whether or not this door ends up being the one
    // that answers it, so a press never carries over to a later frame.
    const wantsToOpen = pressed.current || readGamepad().interactPressed;
    pressed.current = false;

    if (!offering) return;

    // Only the nearest door speaks.
    let nearest: object | null = null;
    let nearestDist = Infinity;
    for (const [other, otherDist] of contenders) {
      if (otherDist < nearestDist) {
        nearestDist = otherDist;
        nearest = other;
      }
    }
    if (nearest !== id) return;

    publish({
      key: "E",
      text: enabled ? `Open ${label ?? "door"}` : blockedReason ?? "Locked",
      enabled,
    });

    if (!wantsToOpen || !enabled) return;

    contenders.delete(id);
    publish(null);
    onEnter();
  });

  return <group ref={anchor} position={position} />;
}

export default DoorTrigger;
