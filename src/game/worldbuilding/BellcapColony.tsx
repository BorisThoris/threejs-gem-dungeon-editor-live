import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, InstancedMesh, MeshStandardMaterial, Object3D, PointLight } from "three";
import type { Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, runClock, useRun } from "../state/run";
import { playerAt } from "../player/where";
import { Blocks } from "../rooms/CorridorDetails";
import { floorHeightAt } from "./elevation";
import { waterLevel } from "./watercourse";
import { bellcapWarnings } from "./bellcapState";
import { bellcapsFor, bellcapExposed, bellcapCharge, BELLCAP_WARNING, BELLCAP_COOLDOWN, type Bellcap } from "./bellcaps";

function Colony({ room, cap, index }: { room: Room; cap: Bellcap; index: number }) {
  const body = useRef<Group>(null), light = useRef<PointLight>(null);
  const cloud = useRef<InstancedMesh>(null), cloudMaterial = useRef<MeshStandardMaterial>(null);
  const charge = useRef(0), scratch = useMemo(() => new Object3D(), []);
  const key = `${room.id}:${index}`;
  const stems = useMemo(() => [-0.32, 0, 0.32].map((x, i) => ({ position: [x, 0.18 + i * 0.035, (i % 2) * 0.2] as [number, number, number],
    size: [0.1, 0.36 + i * 0.07, 0.1] as [number, number, number] })), []);
  const caps = useMemo(() => stems.map(b => ({ position: [b.position[0], b.size[1], b.position[2]] as [number, number, number],
    size: [0.35, 0.16, 0.32] as [number, number, number] })), [stems]);
  useFrame((_, dt) => {
    const s = useRun.getState();
    if (!canControl(s)) return;
    const now = runClock(s), wet = waterLevel(s.waterOpenedAt, now), last = s.bellcapBursts[key] ?? -Infinity;
    const recovering = now - last < BELLCAP_COOLDOWN;
    const exposed = !recovering && bellcapExposed(room, cap, playerAt.x, playerAt.z, s.glim, wet);
    const before = charge.current;
    charge.current = bellcapCharge(before, exposed, dt);
    if (before === 0 && charge.current > 0) bus.emit("bellcapWarning", { roomId: room.id, ...cap });
    if (charge.current >= BELLCAP_WARNING) { s.burstBellcap(index); charge.current = 0; }
    if (charge.current > 0) bellcapWarnings.set(key, room.id);
    else bellcapWarnings.delete(key);
    const amount = charge.current / BELLCAP_WARNING;
    const dormant = wet <= 0.1;
    body.current?.scale.set(1 + amount * 0.3, dormant ? 0.42 : recovering ? 0.65 : 1 + amount * 0.7, 1 + amount * 0.3);
    if (light.current) light.current.intensity = dormant ? 0 : 0.12 + amount * 1.2;
    const age = now - last, puff = age >= 0 && age < 1.5;
    if (cloud.current) {
      cloud.current.visible = puff;
      if (puff) {
        for (let i = 0; i < 12; i++) {
          const angle = i * 2.399;
          scratch.position.set(Math.cos(angle) * age * 0.75, 0.45 + age * (0.35 + i % 3 * 0.12), Math.sin(angle) * age * 0.75);
          scratch.rotation.set(i, age + i, 0); scratch.scale.setScalar(0.06 + age * 0.05); scratch.updateMatrix();
          cloud.current.setMatrixAt(i, scratch.matrix);
        }
        cloud.current.instanceMatrix.needsUpdate = true;
        if (cloudMaterial.current) cloudMaterial.current.opacity = (1 - age / 1.5) * 0.65;
      }
    }
    if (import.meta.env.DEV) {
      const win = window as unknown as { __bellcaps?: Record<string, unknown> };
      win.__bellcaps = { roomId: room.id, index, ...cap, charge: charge.current, dormant, recovering, puff };
    }
  });
  useEffect(() => () => {
    bellcapWarnings.delete(key);
    if (import.meta.env.DEV) delete (window as unknown as { __bellcaps?: unknown }).__bellcaps;
  }, [key]);
  return <group position={[cap.x, floorHeightAt(room, cap.x, cap.z), cap.z]}>
    <group ref={body}>
      <Blocks blocks={stems} color="#aaa17b" /><Blocks blocks={caps} color="#a3ad65" />
      <Blocks blocks={caps.map(b => ({ position: [b.position[0], b.position[1] - 0.1, b.position[2]], size: [0.3, 0.035, 0.28] }))} color="#d6c987" />
    </group>
    <pointLight ref={light} position={[0, 0.65, 0]} color="#c3d083" distance={3} intensity={0.12} />
    <instancedMesh ref={cloud} args={[undefined, undefined, 12]} visible={false} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial ref={cloudMaterial} color="#c4c98b" transparent depthWrite={false} />
    </instancedMesh>
  </group>;
}

export function BellcapColony({ room }: { room: Room }) {
  const caps = useMemo(() => bellcapsFor(room), [room]);
  return <>{caps.map((cap, index) => <Colony key={`${room.id}:${index}`} room={room} cap={cap} index={index} />)}</>;
}
