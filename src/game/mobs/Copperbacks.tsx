import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import * as din from "../din/din";
import type { Room } from "../dungeon/types";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { geo } from "../props/shared";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { floorHeightAt } from "../worldbuilding/elevation";
import { copperbackPose, copperbacksFor, COPPERBACK_FOLD_SECONDS } from "./copperbackHabitat";

interface CopperbackState { until: number; fold: number }
const memory = new WeakMap<Room, CopperbackState>();

/** Block-cut plate grazers whose shells align with leaks in the old pipework. */
export function Copperbacks({ room }: { room: Room }) {
  const homes = useMemo(() => copperbacksFor(room), [room]);
  const bodies = useRef<InstancedMesh>(null), shells = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => new Object3D(), []), arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const saved = memory.get(room) ?? { until: 0, fold: 0 };
    memory.set(room, saved);
    return saved;
  }, [room]);
  const announced = useRef(false);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __copperbacks?: unknown }).__copperbacks;
  }, []);

  useFrame((_, dt) => {
    if (!bodies.current || !shells.current || !homes.length) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run);
    if (din.answering(arrival, "copperback", room.id)) state.until = now + COPPERBACK_FOLD_SECONDS;
    const hiding = now < state.until;
    state.fold = Math.max(0, Math.min(1, state.fold + (hiding ? 3 : -0.42) * Math.min(dt, 0.1)));
    const poses = homes.map((home, index) => {
      const pose = copperbackPose(home, now, state.fold), y = floorHeightAt(room, pose.x, pose.z);
      const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw);
      const sx = Math.cos(pose.yaw), sz = -Math.sin(pose.yaw);
      const bodyParts = [
        [pose.x, y + 0.085, pose.z, 0.28, 0.10, 0.34],
        [pose.x + fx * 0.23, y + 0.10, pose.z + fz * 0.23, 0.18, 0.11, 0.16],
        [pose.x - fx * 0.24, y + 0.055, pose.z - fz * 0.24, 0.08, 0.055, 0.22],
      ] as const;
      bodyParts.forEach((part, partIndex) => {
        scratch.position.set(part[0], part[1], part[2]);
        scratch.rotation.set(0, pose.yaw, 0);
        scratch.scale.set(part[3], part[4], part[5]);
        scratch.updateMatrix(); bodies.current!.setMatrixAt(index * 3 + partIndex, scratch.matrix);
      });
      for (const side of [-1, 1]) {
        scratch.position.set(pose.x + sx * side * 0.12, y + 0.14 + pose.shellLift * 0.45, pose.z + sz * side * 0.12);
        scratch.rotation.set(side * pose.shellLift, pose.yaw, side * (0.18 - state.fold * 0.18));
        scratch.scale.set(0.19, 0.055, 0.31);
        scratch.updateMatrix(); shells.current!.setMatrixAt(index * 2 + (side > 0 ? 1 : 0), scratch.matrix);
      }
      return pose;
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    shells.current.instanceMatrix.needsUpdate = true;
    if (hiding && !announced.current) {
      const first = homes[0];
      sfx.copperClick(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("copperbacksFolded", { roomId: room.id, towardSecret: homes.some(home => home.towardSecret) });
    }
    announced.current = hiding;
    if (import.meta.env.DEV) (window as unknown as { __copperbacks?: unknown }).__copperbacks = {
      roomId: room.id, count: homes.length, fold: state.fold, hiding,
      towardSecret: homes.some(home => home.towardSecret), poses,
    };
  });

  if (!homes.length) return null;
  return <group name="creature-copperbacks">
    <instancedMesh ref={bodies} args={[geo("box", 1, 1, 1), undefined, homes.length * 3]} frustumCulled={false}>
      <meshStandardMaterial color="#3d4f49" roughness={0.96} />
    </instancedMesh>
    <instancedMesh ref={shells} args={[geo("box", 1, 1, 1), undefined, homes.length * 2]} frustumCulled={false}>
      <meshStandardMaterial color="#659084" emissive="#254d43" emissiveIntensity={0.2} roughness={0.82} metalness={0.35} />
    </instancedMesh>
  </group>;
}
