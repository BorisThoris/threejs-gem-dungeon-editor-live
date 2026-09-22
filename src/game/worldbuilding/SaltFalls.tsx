import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import { geo } from "../props/shared";
import { runClock, useRun } from "../state/run";
import { saltFallPose, saltFallSites } from "./saltFallPattern";

/** One paused-clock instance batch for the whole room's brittle salt fall. */
export function SaltFalls({ room }: { room: Room }) {
  const sites = useMemo(() => saltFallSites(room), [room]);
  const mesh = useRef<InstancedMesh>(null);
  const pose = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!mesh.current || !sites.length) return;
    const now = runClock(useRun.getState());
    sites.forEach((site, index) => {
      const at = saltFallPose(site, now);
      pose.position.set(at.x, at.y, at.z);
      pose.rotation.set(0, at.yaw, index % 2 ? 0.18 : -0.18);
      pose.scale.set(0.08 + index % 3 * 0.025, 0.16 + index % 2 * 0.07, 0.07);
      pose.updateMatrix();
      mesh.current!.setMatrixAt(index, pose.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (import.meta.env.DEV) (window as unknown as { __saltFalls?: unknown }).__saltFalls = {
      roomId: room.id, count: sites.length, time: now,
    };
  });
  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as unknown as { __saltFalls?: unknown }).__saltFalls;
  }, []);
  if (!sites.length) return null;
  return <instancedMesh name="salt-falls" ref={mesh} args={[geo("box", 1, 1, 1), undefined, sites.length]} frustumCulled={false}>
    <meshStandardMaterial color="#d8d3bb" emissive="#78908b" emissiveIntensity={0.16} roughness={0.82} />
  </instancedMesh>;
}
