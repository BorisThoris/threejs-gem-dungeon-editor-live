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
import { wicklingPose, wicklingsFor, WICKLING_SNUFF_SECONDS } from "./wicklingHabitat";

interface WicklingState { until: number; snuff: number }
const memory = new WeakMap<Room, WicklingState>();

/** Block-cut wax grazers whose ember tips lean into the chantry's draft. */
export function Wicklings({ room }: { room: Room }) {
  const homes = useMemo(() => wicklingsFor(room), [room]);
  const bodies = useRef<InstancedMesh>(null), embers = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => new Object3D(), []), arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const saved = memory.get(room) ?? { until: 0, snuff: 0 };
    memory.set(room, saved);
    return saved;
  }, [room]);
  const announced = useRef(false);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __wicklings?: unknown }).__wicklings;
  }, []);

  useFrame((_, dt) => {
    if (!bodies.current || !embers.current || !homes.length) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run);
    if (din.answering(arrival, "wickling", room.id)) state.until = now + WICKLING_SNUFF_SECONDS;
    const hiding = now < state.until;
    state.snuff = Math.max(0, Math.min(1, state.snuff + (hiding ? 3.5 : -0.5) * Math.min(dt, 0.1)));
    const poses = homes.map((home, index) => {
      const pose = wicklingPose(home, now, state.snuff), y = floorHeightAt(room, pose.x, pose.z);
      const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw);
      const parts = [
        [pose.x, y + 0.045, pose.z, 0.22, 0.07, 0.28],
        [pose.x + fx * 0.1, y + pose.height * 0.65 + 0.04, pose.z + fz * 0.1, 0.11, pose.height, 0.11],
      ] as const;
      parts.forEach((part, partIndex) => {
        scratch.position.set(part[0], part[1], part[2]);
        scratch.rotation.set(partIndex ? pose.lean * fx : 0, pose.yaw, partIndex ? -pose.lean * fz : 0);
        scratch.scale.set(part[3], part[4], part[5]);
        scratch.updateMatrix(); bodies.current!.setMatrixAt(index * 2 + partIndex, scratch.matrix);
      });
      scratch.position.set(pose.x + fx * 0.1, y + pose.height + 0.045, pose.z + fz * 0.1);
      scratch.rotation.set(0, pose.yaw, 0);
      scratch.scale.set(0.09 * pose.ember, 0.08 * pose.ember, 0.09 * pose.ember);
      scratch.updateMatrix(); embers.current!.setMatrixAt(index, scratch.matrix);
      return pose;
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    embers.current.instanceMatrix.needsUpdate = true;
    if (hiding && !announced.current) {
      const first = homes[0];
      sfx.wickSnuff(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("wicklingsSnuffed", { roomId: room.id, towardSecret: homes.some(home => home.towardSecret) });
    }
    announced.current = hiding;
    if (import.meta.env.DEV) (window as unknown as { __wicklings?: unknown }).__wicklings = {
      roomId: room.id, count: homes.length, snuff: state.snuff, hiding,
      towardSecret: homes.some(home => home.towardSecret), poses,
    };
  });

  if (!homes.length) return null;
  return <group name="creature-wicklings">
    <instancedMesh ref={bodies} args={[geo("box", 1, 1, 1), undefined, homes.length * 2]} frustumCulled={false}>
      <meshStandardMaterial color="#3b3027" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={embers} args={[geo("box", 1, 1, 1), undefined, homes.length]} frustumCulled={false}>
      <meshStandardMaterial color="#d9a45f" emissive="#b56d32" emissiveIntensity={0.65} roughness={0.82} />
    </instancedMesh>
  </group>;
}
