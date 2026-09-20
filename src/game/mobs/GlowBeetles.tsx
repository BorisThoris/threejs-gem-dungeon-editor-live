import { geo } from "../props/shared";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshStandardMaterial, Object3D, PointLight } from "three";
import type { Room } from "../dungeon/types";
import { roomSegmentClear } from "../dungeon/footprint";
import * as din from "../din/din";
import { answersTo } from "../din/susceptibility";
import { SUSCEPTIBILITY } from "../din/susceptibility";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { floorHeightAt } from "../worldbuilding/elevation";
import { waterLevel } from "../worldbuilding/watercourse";
import { beetlesFor, beetlePose, BEETLE_SETTLE_SECONDS } from "./beetleHabitat";

interface BeetleState { cover: number; until: number }
// Room objects survive revisits and are replaced on a new floor/run. The
// creatures therefore remember recent disturbances without permanent save data.
const memory = new WeakMap<Room, BeetleState[]>();

export function GlowBeetles({ room }: { room: Room }) {
  const habitats = useMemo(() => beetlesFor(room), [room]);
  const body = useRef<InstancedMesh>(null), abdomen = useRef<InstancedMesh>(null), wings = useRef<InstancedMesh>(null);
  const lamps = useRef<(PointLight | null)[]>([]), material = useRef<MeshStandardMaterial>(null);
  const scratch = useMemo(() => new Object3D(), []), arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const run = useRun.getState(), dry = waterLevel(run.waterOpenedAt, runClock(run)) <= 0.1;
    const saved = memory.get(room) ?? habitats.map(() => ({ cover: dry ? 1 : 0, until: 0 }));
    if (dry) for (const b of saved) b.cover = 1;
    memory.set(room, saved);
    return saved;
  }, [room, habitats]);
  const announced = useRef(state.some(b => b.cover > 0));
  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __beetles?: unknown }).__beetles;
  }, []);
  useFrame((_, dt) => {
    const run = useRun.getState();
    if (!canControl(run) || !habitats.length) return;
    const now = runClock(run), dry = waterLevel(run.waterOpenedAt, now) <= 0.1;
    const heard = din.answering(arrival, "beetle", room.id);
    let alarmed = false, glowing = 0;
    const poses = habitats.map((home, i) => {
      const nearLight = answersTo(SUSCEPTIBILITY.beetle, "bright", run.glim / 100) && Math.hypot(home.x - playerAt.x, home.z - playerAt.z) < 3 &&
        roomSegmentClear(room, home.x, home.z, playerAt.x, playerAt.z, 0.1);
      const b = state[i];
      if (heard || nearLight) b.until = now + BEETLE_SETTLE_SECONDS;
      const hide = dry || now < b.until;
      alarmed ||= hide;
      b.cover = Math.max(0, Math.min(1, b.cover + (hide ? 1 : -0.45) * Math.min(dt, 0.1) * 3));
      if (b.cover < 0.95) glowing++;
      const p = beetlePose(home, now, b.cover), base = floorHeightAt(room, p.x, p.z);
      const size = b.cover > 0.95 ? 0 : 1;
      scratch.position.set(p.x, base + p.y, p.z); scratch.rotation.set(0, p.yaw, 0); scratch.scale.set(0.12 * size, 0.055 * size, 0.17 * size); scratch.updateMatrix();
      body.current?.setMatrixAt(i, scratch.matrix);
      scratch.position.y += 0.025; scratch.scale.set(0.09 * size, 0.045 * size, 0.085 * size); scratch.updateMatrix();
      abdomen.current?.setMatrixAt(i, scratch.matrix);
      for (const sign of [-1, 1]) {
        scratch.position.set(p.x + Math.cos(p.yaw) * sign * 0.1, base + p.y, p.z - Math.sin(p.yaw) * sign * 0.1);
        scratch.rotation.set(0, p.yaw, Math.sin(now * 35 + i) * 0.2 * sign); scratch.scale.set(0.14 * size, 0.012 * size, 0.11 * size); scratch.updateMatrix();
        wings.current?.setMatrixAt(i * 2 + (sign === 1 ? 1 : 0), scratch.matrix);
      }
      if (i % 3 === 0 && lamps.current[i / 3]) lamps.current[i / 3]!.intensity = (1 - b.cover) * 0.3;
      return { ...p, cover: b.cover };
    });
    for (const mesh of [body.current, abdomen.current, wings.current]) if (mesh) { mesh.visible = true; mesh.instanceMatrix.needsUpdate = true; }
    if (material.current) material.current.emissiveIntensity = glowing ? 0.75 : 0;
    if (alarmed && !announced.current) {
      const first = habitats.find((_, i) => state[i].cover > 0) ?? habitats[0];
      sfx.beetleScatter(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("beetlesScattered", { roomId: room.id });
    }
    announced.current = alarmed;
    if (import.meta.env.DEV) (window as unknown as { __beetles?: unknown }).__beetles = { roomId: room.id, glowing, dry, alarmed, poses };
  });
  if (!habitats.length) return null;
  return <group name="creature-beetles">
    <instancedMesh ref={body} args={[geo("box", 1, 1, 1), undefined, habitats.length]} visible={false} frustumCulled={false}><meshStandardMaterial color="#394238" roughness={0.9} /></instancedMesh>
    <instancedMesh ref={abdomen} args={[geo("box", 1, 1, 1), undefined, habitats.length]} visible={false} frustumCulled={false}><meshStandardMaterial ref={material} color="#d8be66" emissive="#bb9538" emissiveIntensity={0.75} /></instancedMesh>
    <instancedMesh ref={wings} args={[geo("box", 1, 1, 1), undefined, habitats.length * 2]} visible={false} frustumCulled={false}><meshStandardMaterial color="#7c816a" roughness={0.9} /></instancedMesh>
    {habitats.filter((_, i) => i % 3 === 0).map((h, i) => <pointLight key={i} ref={el => { lamps.current[i] = el; }} position={[h.x, 0.35, h.z]} color="#d9bb69" intensity={(1 - state[i * 3].cover) * 0.3} distance={1.4} />)}
  </group>;
}
