import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { readGamepad } from "../utils/gamepad";
import { uiEvents, UI_EVENTS } from "../utils/uiEvents";
import { DOOR_INTERACT_RADIUS } from "../utils/doorUtils";

export interface InteractTriggerProps {
  /** Where the interaction lives, in the parent's coordinate space. */
  position: [number, number, number];
  /** What the prompt offers to do, e.g. "Open the shop". */
  label: string;
  /** Called when the player presses the interact key in range. */
  onInteract: () => void;
  /** When false the prompt shows `blockedReason` and the key does nothing. */
  enabled?: boolean;
  /** Shown instead of the label when the interaction is unavailable. */
  blockedReason?: string;
  /** Override the reach, for something larger than a doorway. */
  radius?: number;
}

interface PromptPayload {
  key: string;
  text: string;
  enabled: boolean;
}

/**
 * Everything currently offering itself to the player, and how far away it is.
 *
 * Two interactions can easily be in range at once - a shop counter beside a
 * door, two exits on one wall. Without arbitration each would publish and
 * retract its own prompt independently, so stepping out of one's radius would
 * blank the prompt for the thing you were still standing at, and the key would
 * go to whichever component happened to run last. The nearest one wins, and it
 * is the only one that draws a prompt or answers the key.
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
 * One verb for the whole game: walk up to a thing, press E.
 *
 * Doors got this treatment first, because travelling by walking into geometry
 * or by clicking a mesh took the choice away from the player. The rest of the
 * world had the opposite problem - the shop, the library's study puzzle and
 * the stairs were reachable only through an action-card overlay that renders
 * nothing, so they could not be used at all. Both are the same missing idea:
 * there was no way to say "I want to use this".
 *
 * Pure logic and geometry, no loaders, so it can never suspend the room.
 */
export function InteractTrigger({
  position,
  label,
  onInteract,
  enabled = true,
  blockedReason,
  radius = DOOR_INTERACT_RADIUS,
}: InteractTriggerProps) {
  const pressed = useRef(false);
  // An anchor in the scene graph rather than a bare position prop: callers nest
  // props inside room groups, and comparing a group-local offset against the
  // camera's world position would put the trigger somewhere else entirely.
  const anchor = useRef<THREE.Group>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const id = useMemo(() => ({}), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "KeyE") pressed.current = true;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // Unmounting while in range would otherwise leave this trigger
      // contending forever, and strand its prompt on screen.
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

    // Something only offers itself when the player is actually in control: not
    // mid-transition, not paused, not after the run has been decided.
    const offering =
      distSq <= radius * radius && !isTransitioning && isMovementEnabled;

    // Dev-only: lets a test harness find interactables without guessing at
    // room geometry. Never shipped - Vite strips the branch from a production
    // build.
    if (import.meta.env.DEV) {
      const probe = ((window as unknown as Record<string, unknown>).__doorDebug ??=
        {}) as Record<string, unknown>;
      probe[label] = {
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

    // Consume the press whether or not this trigger ends up answering it, so
    // it never carries over to a later frame.
    const wants = pressed.current || readGamepad().interactPressed;
    pressed.current = false;

    if (!offering) return;

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
      text: enabled ? label : blockedReason ?? "Locked",
      enabled,
    });

    if (!wants || !enabled) return;

    contenders.delete(id);
    publish(null);
    onInteract();
  });

  return <group ref={anchor} position={position} />;
}

export default InteractTrigger;
