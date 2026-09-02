/* eslint-disable react-refresh/only-export-components -- `carry` is the
   registry the component writes to and plates read from; they belong together. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import { InteractTrigger } from "../interact/InteractTrigger";
import { GROUND_Y } from "../world";

/**
 * Where every carryable is, and which one is in the player's hands.
 *
 * Module data rather than store state: positions change every frame while
 * something is carried, and nothing needs to re-render for that. Plates and
 * puzzles read positions from here.
 */
const positions = new Map<string, Vector3>();
let carriedId: string | null = null;

export const carry = {
  carriedId: (): string | null => carriedId,
  isCarried: (id: string): boolean => carriedId === id,
  positionOf: (id: string): Vector3 | undefined => positions.get(id),
  /** Ids of carryables resting (not carried) within `radius` of a point. */
  restingWithin(x: number, z: number, radius: number): string[] {
    const out: string[] = [];
    for (const [id, p] of positions) {
      if (id === carriedId) continue;
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz <= radius * radius) out.push(id);
    }
    return out;
  },
};

export interface CarryableProps {
  id: string;
  /** Shown in the prompt: "Pick up the idol". */
  name: string;
  position: [number, number, number];
  children: ReactNode;
  /** Called the moment it leaves the ground. */
  onPickUp?: () => void;
  /** Where to put it down, given where the player is aiming. */
  snapDrop?: (aim: Vector3) => Vector3 | null;
}

const HOLD_DISTANCE = 1.15;
const HOLD_DROP = 0.45;
const DROP_DISTANCE = 1.4;

/**
 * Something the player can pick up and carry, in the game's one verb.
 *
 * This replaces a mouse-driven floating hand and a drag system: walk up,
 * press E to pick up, it rides in front of the camera, press E to put it
 * down where you are looking. One thing at a time. The trigger lives inside
 * the moving group, so while carried it is always in reach.
 */
export function Carryable({ id, name, position, children, onPickUp, snapDrop }: CarryableProps) {
  const group = useRef<Group>(null);
  const [carried, setCarried] = useState(false);
  const rest = useRef(new Vector3(...position));
  const scratch = useMemo(() => ({ forward: new Vector3(), aim: new Vector3() }), []);

  useEffect(() => {
    positions.set(id, rest.current.clone());
    return () => {
      positions.delete(id);
      if (carriedId === id) carriedId = null;
    };
  }, [id]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    if (carriedId === id) {
      const cam = state.camera;
      cam.getWorldDirection(scratch.forward);
      scratch.forward.y = 0;
      scratch.forward.normalize();
      g.position.set(
        cam.position.x + scratch.forward.x * HOLD_DISTANCE,
        cam.position.y - HOLD_DROP,
        cam.position.z + scratch.forward.z * HOLD_DISTANCE
      );
      g.rotation.y = Math.atan2(scratch.forward.x, scratch.forward.z);
    } else {
      g.position.copy(rest.current);
    }
    positions.get(id)?.copy(g.position);
  });

  const pickUp = () => {
    if (carriedId) return;
    carriedId = id;
    setCarried(true);
    onPickUp?.();
  };

  const putDown = (cam: { position: Vector3; getWorldDirection: (v: Vector3) => Vector3 }) => {
    cam.getWorldDirection(scratch.forward);
    scratch.forward.y = 0;
    scratch.forward.normalize();
    scratch.aim.set(
      cam.position.x + scratch.forward.x * DROP_DISTANCE,
      GROUND_Y,
      cam.position.z + scratch.forward.z * DROP_DISTANCE
    );
    const snapped = snapDrop?.(scratch.aim);
    rest.current.copy(snapped ?? scratch.aim);
    carriedId = null;
    setCarried(false);
  };

  return (
    <group ref={group} position={position}>
      {children}
      <CarryTrigger
        name={name}
        carried={carried}
        someoneElseCarried={!carried && carriedId !== null}
        onPickUp={pickUp}
        onPutDown={putDown}
      />
    </group>
  );
}

function CarryTrigger({
  name,
  carried,
  someoneElseCarried,
  onPickUp,
  onPutDown,
}: {
  name: string;
  carried: boolean;
  someoneElseCarried: boolean;
  onPickUp: () => void;
  onPutDown: (cam: { position: Vector3; getWorldDirection: (v: Vector3) => Vector3 }) => void;
}) {
  const camRef = useRef<{ position: Vector3; getWorldDirection: (v: Vector3) => Vector3 } | null>(null);
  useFrame((state) => {
    camRef.current = state.camera;
  });
  return (
    <InteractTrigger
      position={[0, 0, 0]}
      label={carried ? `Put down the ${name}` : `Pick up the ${name}`}
      enabled={!someoneElseCarried}
      blockedReason="Your hands are full"
      radius={carried ? 4 : undefined}
      onInteract={() => {
        if (carried) {
          if (camRef.current) onPutDown(camRef.current);
        } else {
          onPickUp();
        }
      }}
    />
  );
}
