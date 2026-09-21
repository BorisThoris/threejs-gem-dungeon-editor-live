import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, InstancedMesh, Object3D } from "three";
import type { Room } from "../dungeon/types";
import { geo } from "../props/shared";
import { runClock, useRun } from "../state/run";
import { floorHeightAt } from "./elevation";
import { foundryEmbersFor } from "./foundryEmberSites";

/** One instanced draw call for the old heat still moving through kiln rooms. */
export function FoundryEmbers({ room }: { room: Room }) {
  const vents = useMemo(() => foundryEmbersFor(room), [room]);
  const mesh = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => new Object3D(), []);

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __foundryEmbers?: unknown }).__foundryEmbers;
  }, []);

  useFrame(() => {
    if (!mesh.current || !vents.length) return;
    const now = runClock(useRun.getState());
    for (let i = 0; i < vents.length; i++) {
      const vent = vents[i];
      const age = (now * 0.16 + vent.phase) % 1;
      const sway = Math.sin(now * 1.7 + vent.phase * 12) * 0.16 * age;
      scratch.position.set(
        vent.x + sway,
        floorHeightAt(room, vent.x, vent.z) + 0.08 + age * 2.15,
        vent.z + sway * vent.drift
      );
      scratch.rotation.set(age * 1.8, now * 0.7 + i, vent.drift * age);
      const pulse = Math.sin(age * Math.PI);
      const size = 0.025 + pulse * 0.035;
      scratch.scale.set(size, size * 1.8, 1);
      scratch.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (import.meta.env.DEV) (window as unknown as { __foundryEmbers?: unknown }).__foundryEmbers = {
      roomId: room.id,
      count: vents.length,
      drawCalls: 1,
    };
  });

  if (!vents.length) return null;
  return (
    <instancedMesh ref={mesh} name="foundry-embers" args={[geo("plane", 1, 1), undefined, vents.length]} frustumCulled={false}>
      <meshBasicMaterial color="#ff9d45" toneMapped={false} side={DoubleSide} />
    </instancedMesh>
  );
}
