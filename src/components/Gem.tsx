import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { Group } from "three";

import { useConsolidatedGameStore } from "../store/consolidatedGameStore";

interface GemProps {
  /** The room this gem belongs to. Collection is recorded per room. */
  roomId: string;
  position?: [number, number, number];
}

const PICKUP_RADIUS = 1.1;
const SPIN_SPEED = 1.4;
const BOB_HEIGHT = 0.18;
const BOB_SPEED = 2;

/**
 * The one collectible in the demo loop: a gem sitting in each room that the
 * player walks into to pick up.
 *
 * Deliberately built from plain geometry with no textures, fonts or loaders. It
 * is mounted alongside the room, and anything here that suspended would take
 * the room's subtree - and its physics - down with it.
 */
export function Gem({ roomId, position = [0, 0.9, 0] }: GemProps) {
  const groupRef = useRef<Group>(null);
  const alreadyTaken = useConsolidatedGameStore((state) =>
    state.collectedGemRooms.has(roomId)
  );
  const collectGem = useConsolidatedGameStore((state) => state.collectGem);
  const [taken, setTaken] = useState(false);

  const basePosition = useMemo(() => position, [position]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const time = state.clock.getElapsedTime();
    group.rotation.y = time * SPIN_SPEED;
    group.position.y = basePosition[1] + Math.sin(time * BOB_SPEED) * BOB_HEIGHT;

    if (taken || alreadyTaken) return;

    // Proximity pickup rather than a physics sensor: the player body is a
    // dynamic capsule that is repositioned every frame, and a distance check is
    // both cheaper and immune to a missed contact between steps.
    const player = state.camera.position;
    const dx = player.x - basePosition[0];
    const dz = player.z - basePosition[2];
    if (dx * dx + dz * dz <= PICKUP_RADIUS * PICKUP_RADIUS) {
      setTaken(true);
      collectGem(roomId);
    }
  });

  if (taken || alreadyTaken) return null;

  return (
    <group ref={groupRef} position={basePosition}>
      <RigidBody type="fixed" colliders={false} sensor>
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
      </RigidBody>
      {/* A highlight on the gem, not the room's lighting. It used to be
          intensity 2.2 over 4.5 units, which made it the dominant light in the
          room - so picking the gem up plunged the floor into darkness. */}
      <pointLight color="#7fe3ff" intensity={0.45} distance={2.2} />
    </group>
  );
}

export default Gem;
