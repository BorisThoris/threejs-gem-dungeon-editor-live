import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { HAZARD_RADIUS } from "../dungeon/layout";
import { canControl, useRun } from "../state/run";

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
      {SPIKES.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <coneGeometry args={[0.09, 0.45, 6]} />
          <meshStandardMaterial color="#b9c2cc" metalness={0.75} roughness={0.35} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[radius, 20]} />
        <meshBasicMaterial color="#8a1f2d" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

const SPIKES: [number, number][] = [
  [0, 0],
  [0.35, 0.2],
  [-0.3, 0.28],
  [0.15, -0.32],
  [-0.25, -0.22],
];
