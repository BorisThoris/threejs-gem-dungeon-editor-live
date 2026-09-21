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
import { mitesFor, mitePose, MITE_HIDE_SECONDS } from "./miteHabitat";

interface MiteState { until: number; cover: number }
const memory = new WeakMap<Room, MiteState>();

/** Ash mites comb the windrows until a noise sends the whole colony under. */
export function AshMites({ room }: { room: Room }) {
  const homes = useMemo(() => mitesFor(room), [room]);
  const mesh = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => new Object3D(), []);
  const arrival = useMemo(() => din.emptyArrival(), []);
  const state = useMemo(() => {
    const saved = memory.get(room) ?? { until: 0, cover: 0 };
    memory.set(room, saved);
    return saved;
  }, [room]);
  const announced = useRef(false);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __mites?: unknown }).__mites;
  }, []);

  useFrame((_, dt) => {
    if (!mesh.current || !homes.length) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run);
    const alarmed = din.answering(arrival, "mite", room.id);
    if (alarmed) state.until = now + MITE_HIDE_SECONDS;
    const hiding = now < state.until;
    state.cover = Math.max(0, Math.min(1, state.cover + (hiding ? 1 : -0.45) * Math.min(dt, 0.1) * 4));
    const poses = homes.map((home, i) => {
      const p = mitePose(home, now, state.cover);
      scratch.position.set(p.x, floorHeightAt(room, p.x, p.z) + 0.055 - state.cover * 0.08, p.z);
      scratch.rotation.set(0, p.yaw, 0);
      const visible = 1 - state.cover;
      scratch.scale.set(0.12 * visible, 0.045 * visible, 0.18 * visible);
      scratch.updateMatrix();
      mesh.current!.setMatrixAt(i, scratch.matrix);
      return p;
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (hiding && !announced.current) {
      const first = homes[0];
      sfx.scurry(sideOf(first.x - playerAt.x, first.z - playerAt.z));
      bus.emit("mitesBurrowed", { roomId: room.id });
    }
    announced.current = hiding;
    if (import.meta.env.DEV) (window as unknown as { __mites?: unknown }).__mites = {
      roomId: room.id, count: homes.length, visible: homes.length * (1 - state.cover), poses,
    };
  });

  if (!homes.length) return null;
  return (
    <group name="creature-mites">
      <instancedMesh ref={mesh} args={[geo("box", 1, 1, 1), undefined, homes.length]} frustumCulled={false}>
        <meshStandardMaterial color="#806d5d" roughness={1} />
      </instancedMesh>
    </group>
  );
}
