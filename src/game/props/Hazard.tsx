import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { HAZARD_RADIUS } from "../dungeon/layout";
import { canControl, useRun } from "../state/run";
import { geo, mat } from "./shared";

interface HazardProps {
  position: [number, number, number];
  radius?: number;
}

/**
 * A patch of floor that costs a life.
 *
 * Fires on entry; the invulnerability window that stops one trap chaining
 * lives in the store, so standing still on spikes hurts once per window and
 * re-entering always can. Drawn small enough to read as a floor hazard, not
 * as something to climb.
 */
export function Hazard({ position, radius = HAZARD_RADIUS }: HazardProps) {
  const inside = useRef(false);

  useFrame((state) => {
    if (!canControl(useRun.getState())) return;
    const cam = state.camera.position;
    const dx = cam.x - position[0];
    const dz = cam.z - position[2];
    const within = dx * dx + dz * dz <= radius * radius;
    // A hit refused by the cooldown does not count as having been taken:
    // standing on the spikes keeps trying, and hurts again when it ends.
    if (!within) inside.current = false;
    else if (!inside.current && useRun.getState().damage()) inside.current = true;
  });

  return (
    <group position={position}>
      <mesh name="spike-patch" castShadow geometry={geo("spike-patch")}
        material={mat({ color: "#b9c2cc", metalness: 0.75, roughness: 0.35 })} />
      <mesh name="spike-warning" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}
        geometry={geo("circle", radius, 20)}
        material={mat({ basic: true, color: "#8a1f2d", transparent: true, opacity: 0.28 })} />
    </group>
  );
}
