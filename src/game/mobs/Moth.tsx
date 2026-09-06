import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { halfSize, type Room } from "../dungeon/types";
import { canControl, useRun } from "../state/run";
import { steerAround, type Patch } from "../warden/steer";
import { MOTH_SPEED } from "../world";

/**
 * The floor's moth, in the one room it perches in. A raised lantern draws
 * it; it settles on the light and, when the lantern goes down, carries
 * the light in the Warden's eye a while longer - which is the price of
 * having lit the room it lives in. It flies, so nothing on the floor bites
 * it, and it goes round the furniture because that is in the way at any
 * height.
 */
export function Moth({ room, obstacles }: { room: Room; obstacles: readonly Patch[] }) {
  const group = useRef<Group>(null);
  const perch = useMemo(() => {
    const half = halfSize(room);
    return { x: half * 0.5, y: 2.6, z: -half * 0.5 };
  }, [room]);
  const pos = useRef({ x: perch.x, y: perch.y, z: perch.z });

  // Leaving the room takes it off the lantern.
  useEffect(() => () => useRun.getState().mothLeaves(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const cam = state.camera.position;
    const p = pos.current;
    const t = state.clock.elapsedTime;
    const drawn = run.lanternRaised;
    const target = drawn
      ? { x: cam.x + Math.cos(t * 2.2) * 0.7, y: cam.y + 0.2 + Math.sin(t * 3) * 0.1, z: cam.z + Math.sin(t * 2.2) * 0.7 }
      : perch;
    const h = steerAround(p.x, p.z, target.x, target.z, obstacles, 0);
    const flat = Math.hypot(target.x - p.x, target.z - p.z);
    const stepFlat = Math.min(MOTH_SPEED * delta, flat);
    p.x += h.dx * stepFlat;
    p.z += h.dz * stepFlat;
    p.y += Math.sign(target.y - p.y) * Math.min(MOTH_SPEED * delta, Math.abs(target.y - p.y));
    const near = Math.hypot(cam.x - p.x, cam.z - p.z) < 1.2;
    if (drawn && near) run.mothLands();
    else if (!drawn && run.mothOn) run.mothLeaves();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = t * 6;
    if (import.meta.env.DEV) {
      (window as unknown as { __moth?: { x: number; z: number; on: boolean } }).__moth = { x: p.x, z: p.z, on: run.mothOn };
    }
  });

  return (
    <group ref={group} position={[perch.x, perch.y, perch.z]}>
      <mesh>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshBasicMaterial color="#e8e0b0" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0, 0]} rotation={[0, 0, s * 0.5]}>
          <planeGeometry args={[0.14, 0.1]} />
          <meshBasicMaterial color="#d8d0a0" side={2} transparent opacity={0.85} />
        </mesh>
      ))}
      <pointLight color="#ffe9a0" intensity={0.4} distance={2} />
    </group>
  );
}
