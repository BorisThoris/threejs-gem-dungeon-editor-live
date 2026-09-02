import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import { bus } from "../events";
import { keyboard } from "../input/keyboard";
import { readGamepad } from "../input/gamepad";
import { canControl, useRun } from "../state/run";
import { INTERACT_RADIUS } from "../world";

export interface InteractTriggerProps {
  /** Where the interaction lives, in the parent's coordinate space. */
  position: [number, number, number];
  /** What the prompt offers to do, e.g. "Open the shop". */
  label: string;
  onInteract: () => void;
  /** When false the prompt shows `blockedReason` and the key does nothing. */
  enabled?: boolean;
  blockedReason?: string;
  radius?: number;
}

/**
 * Everything currently offering itself to the player, and how far away.
 *
 * Two interactions can be in range at once - a shop counter beside a door.
 * Without arbitration each would publish and retract its own prompt, so
 * stepping out of one's radius would blank the prompt for the thing you were
 * still standing at, and the key would go to whichever ran last. The nearest
 * wins, and it alone draws the prompt and answers the key.
 */
const contenders = new Map<object, number>();
let lastText: string | null = null;
let lastEnabled = true;

/** Emits only on change, so the frame loop allocates nothing while a prompt is steady. */
const publish = (text: string | null, enabled = true) => {
  if (text === lastText && (text === null || enabled === lastEnabled)) return;
  lastText = text;
  lastEnabled = enabled;
  bus.emit("prompt", text === null ? null : { key: "E", text, enabled });
};

/**
 * One verb for the whole game: walk up to a thing, press E.
 *
 * Pure logic and geometry, no loaders, so it can never suspend the room. The
 * anchor is a group in the scene graph rather than a bare position, because
 * callers nest triggers inside room groups and a group-local offset compared
 * against the camera's world position would put the trigger elsewhere.
 */
interface TriggerDebug {
  x: number;
  z: number;
  dist: number;
  enabled: boolean;
}

export function InteractTrigger({
  position,
  label,
  onInteract,
  enabled = true,
  blockedReason,
  radius = INTERACT_RADIUS,
}: InteractTriggerProps) {
  const anchor = useRef<Group>(null);
  const world = useMemo(() => new Vector3(), []);
  const id = useMemo(() => ({}), []);

  useEffect(
    () => () => {
      // Unmounting while in range would leave this contending forever.
      contenders.delete(id);
      if (contenders.size === 0) publish(null);
    },
    [id]
  );

  useFrame((state) => {
    if (!anchor.current) return;
    anchor.current.getWorldPosition(world);
    const cam = state.camera.position;
    const dx = cam.x - world.x;
    const dz = cam.z - world.z;
    const distSq = dx * dx + dz * dz;

    if (import.meta.env.DEV) {
      // Written into one object per trigger, not a fresh one every frame:
      // this ran ~500 times a second and its toFixed calls made strings.
      const w = window as unknown as { __triggers?: Record<string, TriggerDebug> };
      const table = (w.__triggers ??= {});
      const row = (table[label] ??= { x: 0, z: 0, dist: 0, enabled: true });
      row.x = world.x;
      row.z = world.z;
      row.dist = Math.sqrt(distSq);
      row.enabled = enabled;
    }

    const offering = distSq <= radius * radius && canControl(useRun.getState());
    if (offering) {
      contenders.set(id, distSq);
    } else if (contenders.delete(id) && contenders.size === 0) {
      publish(null);
    }
    if (!offering) return;

    // forEach rather than for-of: iterating a Map's entries builds a
    // throwaway [key, value] array per entry, per trigger, every frame.
    let nearest: object | null = null;
    let nearestDist = Infinity;
    contenders.forEach((d, other) => {
      if (d < nearestDist) {
        nearestDist = d;
        nearest = other;
      }
    });
    if (nearest !== id) return;

    publish(enabled ? label : blockedReason ?? "Locked", enabled);

    // Only the nearest consumes the press, so a tap is never eaten by a
    // trigger that then declines to act on it.
    const wants = keyboard.consumePress("KeyE") || readGamepad().interactPressed;
    if (!wants || !enabled) return;

    contenders.delete(id);
    publish(null);
    onInteract();
  });

  return <group ref={anchor} position={position} />;
}
