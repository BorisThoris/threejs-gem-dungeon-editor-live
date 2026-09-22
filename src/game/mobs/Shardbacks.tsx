import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import type { Room } from "../dungeon/types";
import * as din from "../din/din";
import { answersTo, SUSCEPTIBILITY } from "../din/susceptibility";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { geo } from "../props/shared";
import { roomSegmentClear } from "../dungeon/footprint";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { floorHeightAt } from "../worldbuilding/elevation";
import { shardbackPose, shardbacksFor, SHARDBACK_COOLDOWN_SECONDS,
  SHARDBACK_LIGHT_REACH, SHARDBACK_WARNING_SECONDS } from "./shardbackHabitat";

interface ShardbackState { charge: number; coolingUntil: number }
const memory = new WeakMap<Room, ShardbackState>();

/**
 * Mineral grazers whose raised plates turn light into noise. The whole colony
 * shares one warning and one cooldown so its response reads as a room state,
 * not five unrelated timers.
 */
export function Shardbacks({ room }: { room: Room }) {
  const homes = useMemo(() => shardbacksFor(room), [room]);
  const bodies = useRef<InstancedMesh>(null), plates = useRef<InstancedMesh>(null);
  const plateMaterial = useRef<MeshStandardMaterial>(null);
  const pose = useMemo(() => new Object3D(), []), arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const saved = memory.get(room) ?? { charge: 0, coolingUntil: 0 };
    memory.set(room, saved);
    return saved;
  }, [room]);
  const wasWarning = useRef(false);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __shardbacks?: unknown }).__shardbacks;
  }, []);

  useFrame((_, dt) => {
    if (!bodies.current || !plates.current || !homes.length) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run), cooling = now < state.coolingUntil;
    const nearLight = !cooling && answersTo(SUSCEPTIBILITY.shardback, "bright", run.glim / 100)
      && homes.some(home => Math.hypot(home.x - playerAt.x, home.z - playerAt.z) <= SHARDBACK_LIGHT_REACH
        && roomSegmentClear(room, home.x, home.z, playerAt.x, playerAt.z, 0.1));
    const struck = din.answering(arrival, "shardback", room.id) && arrival.tag === "blast";
    const delta = Math.min(dt, 0.1);
    state.charge = cooling ? 0 : struck ? 1 : Math.max(0, Math.min(1,
      state.charge + (nearLight ? delta / SHARDBACK_WARNING_SECONDS : -delta * 1.8)));
    const warning = state.charge > 0 && !cooling;
    if (warning && !wasWarning.current) bus.emit("shardbacksWarning", { roomId: room.id });
    if (state.charge >= 1) {
      state.charge = 0;
      state.coolingUntil = now + SHARDBACK_COOLDOWN_SECONDS;
      const first = homes[0];
      sfx.shardChime(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("shardbacksChimed", { roomId: room.id, x: first.x, z: first.z });
    }
    wasWarning.current = warning;
    const folded = cooling ? 1 : 0;
    const poses = homes.map((home, index) => {
      const at = shardbackPose(home, now, folded), floor = floorHeightAt(room, at.x, at.z);
      pose.position.set(at.x, floor + 0.075, at.z);
      pose.rotation.set(0, at.yaw, 0);
      pose.scale.set(0.25, 0.11, 0.38);
      pose.updateMatrix(); bodies.current!.setMatrixAt(index, pose.matrix);
      for (const side of [-1, 1]) {
        pose.position.set(at.x + Math.cos(at.yaw) * side * 0.09, floor + 0.15 + state.charge * 0.08, at.z - Math.sin(at.yaw) * side * 0.09);
        pose.rotation.set(side * (0.16 + state.charge * 0.32), at.yaw, side * 0.08);
        pose.scale.set(0.11, 0.12 + state.charge * 0.14, 0.3);
        pose.updateMatrix(); plates.current!.setMatrixAt(index * 2 + (side === 1 ? 1 : 0), pose.matrix);
      }
      return at;
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    plates.current.instanceMatrix.needsUpdate = true;
    if (plateMaterial.current) plateMaterial.current.emissiveIntensity = 0.08 + state.charge * 1.15;
    if (import.meta.env.DEV) (window as unknown as { __shardbacks?: unknown }).__shardbacks = {
      roomId: room.id, count: homes.length, charge: state.charge, warning,
      cooling, coolingUntil: state.coolingUntil, poses,
    };
  });

  if (!homes.length) return null;
  return <group name="creature-shardbacks">
    <instancedMesh ref={bodies} args={[geo("box", 1, 1, 1), undefined, homes.length]} frustumCulled={false}>
      <meshStandardMaterial color="#4d4859" roughness={0.9} />
    </instancedMesh>
    <instancedMesh ref={plates} args={[geo("box", 1, 1, 1), undefined, homes.length * 2]} frustumCulled={false}>
      <meshStandardMaterial ref={plateMaterial} color="#9185ad" emissive="#8870b4" emissiveIntensity={0.08} roughness={0.72} />
    </instancedMesh>
  </group>;
}
