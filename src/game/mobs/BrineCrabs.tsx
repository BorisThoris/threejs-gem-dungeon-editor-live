import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import type { Room } from "../dungeon/types";
import * as din from "../din/din";
import { answersTo, SUSCEPTIBILITY } from "../din/susceptibility";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { geo } from "../props/shared";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { roomSegmentClear } from "../dungeon/footprint";
import { floorHeightAt } from "../worldbuilding/elevation";
import { brineCrabPose, brineCrabsFor, BRINE_CRAB_HIDE_SECONDS, BRINE_CRAB_LIGHT_REACH } from "./brineCrabHabitat";

interface BrineCrabState { until: number; retreat: number }
const memory = new WeakMap<Room, BrineCrabState>();

/** Pale block-shell crabs that make light and cracked walls part of one rule. */
export function BrineCrabs({ room }: { room: Room }) {
  const homes = useMemo(() => brineCrabsFor(room), [room]);
  const limbs = useRef<InstancedMesh>(null), shells = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => new Object3D(), []), arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const saved = memory.get(room) ?? { until: 0, retreat: 0 };
    memory.set(room, saved);
    return saved;
  }, [room]);
  const announced = useRef(false);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __brineCrabs?: unknown }).__brineCrabs;
  }, []);

  useFrame((_, dt) => {
    if (!limbs.current || !shells.current || !homes.length) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run);
    const lit = answersTo(SUSCEPTIBILITY.brinecrab, "bright", run.glim / 100) && homes.some(home =>
      Math.hypot(home.x - playerAt.x, home.z - playerAt.z) <= BRINE_CRAB_LIGHT_REACH
      && roomSegmentClear(room, home.x, home.z, playerAt.x, playerAt.z, 0.1));
    const blasted = din.answering(arrival, "brinecrab", room.id) && arrival.tag === "blast";
    if (lit || blasted) state.until = now + BRINE_CRAB_HIDE_SECONDS;
    const hiding = now < state.until;
    state.retreat = Math.max(0, Math.min(1, state.retreat + (hiding ? 2.5 : -0.34) * Math.min(dt, 0.1)));
    const poses = homes.map((home, index) => {
      const at = brineCrabPose(home, now, state.retreat), y = floorHeightAt(room, at.x, at.z);
      const scale = 1 - state.retreat * 0.55;
      const sx = Math.cos(at.yaw), sz = -Math.sin(at.yaw);
      const fx = Math.sin(at.yaw), fz = Math.cos(at.yaw);
      let part = index * 8;
      for (const side of [-1, 1]) for (const fore of [-0.14, 0.14]) {
        scratch.position.set(at.x + sx * side * 0.25 + fx * fore, y + 0.065,
          at.z + sz * side * 0.25 + fz * fore);
        scratch.rotation.set(0, at.yaw + side * 0.58, 0);
        scratch.scale.set(0.25 * scale, 0.045 * scale, 0.065 * scale);
        scratch.updateMatrix(); limbs.current!.setMatrixAt(part++, scratch.matrix);
      }
      for (const side of [-1, 1]) {
        scratch.position.set(at.x + fx * 0.29 + sx * side * 0.22, y + 0.09,
          at.z + fz * 0.29 + sz * side * 0.22);
        scratch.rotation.set(0, at.yaw + side * 0.34, 0);
        scratch.scale.set(0.18 * scale, 0.065 * scale, 0.17 * scale);
        scratch.updateMatrix(); limbs.current!.setMatrixAt(part++, scratch.matrix);
      }
      for (const side of [-1, 1]) {
        scratch.position.set(at.x + fx * 0.2 + sx * side * 0.09, y + 0.2,
          at.z + fz * 0.2 + sz * side * 0.09);
        scratch.rotation.set(0, at.yaw, 0);
        scratch.scale.set(0.035 * scale, 0.11 * scale, 0.035 * scale);
        scratch.updateMatrix(); limbs.current!.setMatrixAt(part++, scratch.matrix);
      }
      scratch.position.set(at.x, y + 0.12, at.z);
      scratch.rotation.set(0, at.yaw, 0);
      scratch.scale.set(0.3 * scale, 0.13 * scale, 0.34 * scale);
      scratch.updateMatrix(); shells.current!.setMatrixAt(index, scratch.matrix);
      return at;
    });
    limbs.current.instanceMatrix.needsUpdate = true;
    shells.current.instanceMatrix.needsUpdate = true;
    if (hiding && !announced.current) {
      const first = homes[0];
      sfx.brineScuttle(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("brineCrabsScuttled", { roomId: room.id, towardSecret: homes.some(home => home.towardSecret) });
    }
    announced.current = hiding;
    if (import.meta.env.DEV) (window as unknown as { __brineCrabs?: unknown }).__brineCrabs = {
      roomId: room.id, count: homes.length, retreat: state.retreat, hiding,
      towardSecret: homes.some(home => home.towardSecret), poses,
      refuges: homes.map(home => ({ x: home.refugeX, z: home.refugeZ })),
    };
  });

  if (!homes.length) return null;
  return <group name="creature-brine-crabs">
    <instancedMesh ref={limbs} args={[geo("box", 1, 1, 1), undefined, homes.length * 8]} frustumCulled={false}>
      <meshStandardMaterial color="#555951" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={shells} args={[geo("box", 1, 1, 1), undefined, homes.length]} frustumCulled={false}>
      <meshStandardMaterial color="#c7c2aa" emissive="#536b67" emissiveIntensity={0.14} roughness={0.86} />
    </instancedMesh>
  </group>;
}
