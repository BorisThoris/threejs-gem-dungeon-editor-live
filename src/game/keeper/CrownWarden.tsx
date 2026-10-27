import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CylinderCollider } from "@react-three/rapier";
import { Group, Mesh } from "three";
import { BOSS_RADIUS, bossBeat } from "../progression";
import { runClock, useRun } from "../state/run";

/** The arena's warning geometry and damage read the same beat and radius. */
export function CrownWarden() {
  const active = useRun(s => s.bossActive);
  const inner = useRef<Mesh>(null), outer = useRef<Mesh>(null), figure = useRef<Group>(null);
  useFrame(() => {
    const s = useRun.getState();
    if (!s.bossActive) return;
    const beat = bossBeat(runClock(s) - s.bossStartedAt);
    if (inner.current) inner.current.visible = beat.warning && !beat.outer;
    if (outer.current) outer.current.visible = beat.warning && beat.outer;
    if (figure.current) figure.current.rotation.y = runClock(s) * 0.3;
    s.tickBoss();
  });
  if (!active) return null;
  return <group name="crown-warden">
    <RigidBody type="fixed" colliders={false} position={[0, 1.5, 0]}>
      <CylinderCollider args={[1.5, 0.75]} />
    </RigidBody>
    <group ref={figure}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.9, 3, 6]} />
        <meshStandardMaterial color="#4b4657" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <octahedronGeometry args={[0.65]} />
        <meshStandardMaterial color="#e8ba5e" emissive="#6e2d04" emissiveIntensity={0.7} />
      </mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.7, 3.6, Math.sin(i * Math.PI / 2) * 0.7]}>
        <coneGeometry args={[0.17, 0.8, 4]} /><meshStandardMaterial color="#d2a64d" />
      </mesh>)}
    </group>
    <mesh ref={inner} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[BOSS_RADIUS, 64]} />
      <meshBasicMaterial color="#ff6a25" transparent opacity={0.5} depthWrite={false} />
    </mesh>
    <mesh ref={outer} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[BOSS_RADIUS, 13, 64]} />
      <meshBasicMaterial color="#e62b63" transparent opacity={0.5} depthWrite={false} />
    </mesh>
    <pointLight position={[0, 4, 0]} color="#ffc16b" intensity={20} distance={20} />
  </group>;
}
