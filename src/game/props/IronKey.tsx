import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { InteractTrigger } from "../interact/InteractTrigger";
import { useRun } from "../state/run";

interface IronKeyProps {
  roomId: string;
  position: [number, number, number];
}

/**
 * The floor's one key, lying where the generator put it.
 *
 * Taken with E rather than by walking into it, like everything else worth
 * having: the gem is the thing you collect by moving, and the key is a
 * thing you decide to pick up.
 */
export function IronKey({ roomId, position }: IronKeyProps) {
  const group = useRef<Group>(null);
  const taken = useRun((s) => s.unlocked.includes(roomId));

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.getElapsedTime();
    g.rotation.y = t * 0.9;
    g.position.y = position[1] + Math.sin(t * 1.7) * 0.09;
  });

  if (taken) return null;

  return (
    <group ref={group} position={position}>
      {/* A bow, a shaft and two teeth: unmistakably a key at a glance. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.035, 8, 16]} />
        <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} emissive="#4a3a08" />
      </mesh>
      <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.4, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
      </mesh>
      {[0.36, 0.44].map((z) => (
        <mesh key={z} position={[0.055, 0, z]}>
          <boxGeometry args={[0.11, 0.03, 0.05]} />
          <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      <pointLight color="#ffd479" intensity={2.2} distance={3.2} />
      <InteractTrigger
        position={[0, 0, 0]}
        label="Take the iron key"
        radius={2.2}
        onInteract={() => useRun.getState().takeKey(roomId)}
      />
    </group>
  );
}
