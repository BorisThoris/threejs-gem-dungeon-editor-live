import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { useRun } from "../state/run";

interface GemProps {
  roomId: string;
  position: [number, number, number];
}

const PICKUP_RADIUS = 1.1;

/**
 * The one collectible: the reason to walk into a room at all.
 *
 * Proximity pickup rather than a physics sensor: the player is a capsule that
 * is repositioned every frame, and a distance check is both cheaper and
 * immune to a missed contact between steps. Plain geometry, no loaders, so
 * it can never suspend the room it sits in.
 */
export function Gem({ roomId, position }: GemProps) {
  const group = useRef<Group>(null);
  const taken = useRun((s) => s.gemRooms.includes(roomId));

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.getElapsedTime();
    g.rotation.y = t * 1.4;
    g.position.y = position[1] + Math.sin(t * 2) * 0.18;
    if (taken) return;
    const cam = state.camera.position;
    const dx = cam.x - position[0];
    const dz = cam.z - position[2];
    if (dx * dx + dz * dz <= PICKUP_RADIUS * PICKUP_RADIUS) {
      useRun.getState().collectGem(roomId);
    }
  });

  if (taken) return null;

  return (
    <group ref={group} position={position}>
      <mesh castShadow>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial
          color="#7fe3ff"
          emissive="#2aa7d4"
          emissiveIntensity={0.9}
          roughness={0.15}
          metalness={0.35}
        />
      </mesh>
      {/* A highlight on the gem, not the room's lighting: keep it small so
          picking the gem up does not visibly darken the floor. */}
      <pointLight color="#7fe3ff" intensity={0.45} distance={2.2} />
    </group>
  );
}
