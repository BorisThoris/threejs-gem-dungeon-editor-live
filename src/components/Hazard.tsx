import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";

interface HazardProps {
  position: [number, number, number];
  radius?: number;
}

const DEFAULT_RADIUS = 1.2;

/**
 * A patch of floor that costs the player a life.
 *
 * Traps existed as scenery only - TrapBiome and SpikeTrap drew spikes that
 * could not hurt anybody, and loseLife() was called from two puzzle rooms and
 * nowhere else. Without a way to lose, exploring carried no risk and the lives
 * counter was decoration.
 *
 * Damage is reported as an event and adjudicated by RunManager, which owns the
 * invulnerability window.
 */
export function Hazard({ position, radius = DEFAULT_RADIUS }: HazardProps) {
  const inside = useRef(false);

  useFrame((state) => {
    const { isMovementEnabled, isTransitioning } =
      useConsolidatedGameStore.getState();
    if (!isMovementEnabled || isTransitioning) return;

    const player = state.camera.position;
    const dx = player.x - position[0];
    const dz = player.z - position[2];
    const within = dx * dx + dz * dz <= radius * radius;

    // Fire on entry only; standing still on spikes is handled by RunManager's
    // cooldown, but re-entering should always be able to hurt.
    if (within && !inside.current) {
      window.dispatchEvent(new CustomEvent("playerHazard"));
    }
    inside.current = within;
  });

  return (
    <group position={position}>
      {/* Spikes, drawn small enough to read as a floor hazard rather than an
          obstacle the player should try to climb. */}
      {[
        [0, 0],
        [0.35, 0.2],
        [-0.3, 0.28],
        [0.15, -0.32],
        [-0.25, -0.22],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <coneGeometry args={[0.09, 0.45, 6]} />
          <meshStandardMaterial
            color="#b9c2cc"
            metalness={0.75}
            roughness={0.35}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[radius, 20]} />
        <meshBasicMaterial color="#8a1f2d" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

export default Hazard;
