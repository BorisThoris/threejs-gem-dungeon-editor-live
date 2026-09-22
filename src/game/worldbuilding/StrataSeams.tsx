import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import { useRun } from "../state/run";
import { geo } from "../props/shared";
import { strataSeamsFor } from "./strataSeamPattern";

/** One colored instance batch, however many connected strata meet this room. */
export function StrataSeams({ room }: { room: Room }) {
  const rooms = useRun(state => state.dungeon?.rooms);
  const marks = useMemo(() => strataSeamsFor(room, rooms ?? []), [room, rooms]);
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const pose = new Object3D();
    marks.forEach((mark, index) => {
      pose.position.set(...mark.position); pose.scale.set(...mark.size); pose.updateMatrix();
      mesh.current!.setMatrixAt(index, pose.matrix);
      mesh.current!.setColorAt(index, new Color(mark.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [marks]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const win = window as unknown as { __strataSeams?: unknown };
    win.__strataSeams = { roomId: room.id, marks: marks.length,
      destinations: [...new Set(marks.map(mark => mark.destination))] };
    return () => { delete win.__strataSeams; };
  }, [marks, room.id]);
  if (!marks.length) return null;
  return <instancedMesh name="strata-seams" ref={mesh} args={[geo("box", 1, 1, 1), undefined, marks.length]}>
    <meshStandardMaterial vertexColors roughness={1} />
  </instancedMesh>;
}
