import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import type { Room } from "../dungeon/types";
import * as din from "../din/din";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { geo } from "../props/shared";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { floorHeightAt } from "../worldbuilding/elevation";
import { newtsFor, newtPose, NEWT_HIDE_SECONDS } from "./newtHabitat";

interface NewtState { until: number; retreat: number }
const memory = new WeakMap<Room, NewtState>();

/** Block-cut foundry lizards which give a cracked wall away when startled. */
export function KilnNewts({ room }: { room: Room }) {
  const homes = useMemo(() => newtsFor(room), [room]);
  const bodies = useRef<InstancedMesh>(null);
  const backs = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => new Object3D(), []);
  const arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const saved = memory.get(room) ?? { until: 0, retreat: 0 };
    memory.set(room, saved);
    return saved;
  }, [room]);
  const announced = useRef(false);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __newts?: unknown }).__newts;
  }, []);

  useFrame((_, dt) => {
    if (!bodies.current || !backs.current || !homes.length) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run);
    const alarmed = din.answering(arrival, "newt", room.id);
    if (alarmed) state.until = now + NEWT_HIDE_SECONDS;
    const hiding = now < state.until;
    state.retreat = Math.max(0, Math.min(1, state.retreat + (hiding ? 2.7 : -0.38) * Math.min(dt, 0.1)));
    const poses = homes.map((home, i) => {
      const pose = newtPose(home, now, state.retreat);
      const y = floorHeightAt(room, pose.x, pose.z);
      const visible = 1 - Math.max(0, (state.retreat - 0.82) / 0.18);
      const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw);
      const parts = [
        [pose.x, y + 0.09, pose.z, 0.24, 0.11, 0.38],
        [pose.x + fx * 0.27, y + 0.11, pose.z + fz * 0.27, 0.19, 0.13, 0.18],
        [pose.x - fx * 0.31, y + 0.065, pose.z - fz * 0.31, 0.11, 0.065, 0.34],
      ] as const;
      parts.forEach((part, partIndex) => {
        scratch.position.set(part[0], part[1], part[2]);
        scratch.rotation.set(0, pose.yaw, 0);
        scratch.scale.set(part[3] * visible, part[4] * visible, part[5] * visible);
        scratch.updateMatrix();
        bodies.current!.setMatrixAt(i * 3 + partIndex, scratch.matrix);
      });
      scratch.position.set(pose.x, y + 0.17, pose.z);
      scratch.rotation.set(0, pose.yaw, 0);
      scratch.scale.set(0.1 * visible, 0.055 * visible, 0.24 * visible);
      scratch.updateMatrix();
      backs.current!.setMatrixAt(i, scratch.matrix);
      return pose;
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    backs.current.instanceMatrix.needsUpdate = true;
    if (hiding && !announced.current) {
      const first = homes[0];
      sfx.newtSkitter(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("newtsScurried", { roomId: room.id, towardSecret: homes.some(home => home.towardSecret) });
    }
    announced.current = hiding;
    if (import.meta.env.DEV) (window as unknown as { __newts?: unknown }).__newts = {
      roomId: room.id, count: homes.length, retreat: state.retreat, hiding,
      towardSecret: homes.some(home => home.towardSecret), poses,
      refuges: homes.map(home => ({ x: home.refugeX, z: home.refugeZ })),
    };
  });

  if (!homes.length) return null;
  return <group name="creature-newts">
    <instancedMesh ref={bodies} args={[geo("box", 1, 1, 1), undefined, homes.length * 3]} frustumCulled={false}>
      <meshStandardMaterial color="#7a3d24" roughness={0.92} />
    </instancedMesh>
    <instancedMesh ref={backs} args={[geo("box", 1, 1, 1), undefined, homes.length]} frustumCulled={false}>
      <meshStandardMaterial color="#d87932" emissive="#7a260d" emissiveIntensity={0.55} roughness={0.8} />
    </instancedMesh>
  </group>;
}
