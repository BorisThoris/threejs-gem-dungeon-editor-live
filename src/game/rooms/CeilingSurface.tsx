import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import { floorRects } from "../dungeon/footprint";
import { GROUND_Y, WALL_HEIGHT } from "../world";
import { geo } from "../props/shared";
import { surfaceUnion } from "./floorSurfacePattern";

/** Retain the old slab footprint and height, including its overlap with walls.
 * The player sees the underside; upper and buried slab faces add no detail. */
export function CeilingSurface({ room }: { room: Room }) {
  const mesh = useRef<InstancedMesh>(null);
  const panels = useMemo(() => surfaceUnion(floorRects(room).map(r => ({ ...r, width: r.width + 0.5, depth: r.depth + 0.5 }))), [room]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4(), size = new Vector3();
    panels.forEach((r, i) => {
      matrix.makeRotationX(Math.PI / 2).scale(size.set(r.width, r.depth, 1)).setPosition(r.x, GROUND_Y + WALL_HEIGHT, r.z);
      mesh.current!.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [panels]);
  return <instancedMesh name="continuous-ceiling" ref={mesh} args={[geo("plane", 1, 1), undefined, panels.length]}>
    <meshStandardMaterial color="#1a191d" roughness={0.9} />
  </instancedMesh>;
}
