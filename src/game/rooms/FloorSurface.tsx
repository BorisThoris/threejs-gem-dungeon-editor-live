import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, type Texture } from "three";
import type { Room } from "../dungeon/types";
import { GROUND_Y } from "../world";
import { floorSurfaceRects } from "./floorSurfacePattern";

/** One floor surface and one material scale across chambers, collars and wings. */
export function FloorSurface({ room, color, map }: { room: Room; color: string; map: Texture | null }) {
  const geometry = useMemo(() => {
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    for (const r of floorSurfaceRects(room)) {
      const base = positions.length / 3;
      for (const [dx, dz] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) {
        const x = r.x + dx * r.width / 2, z = r.z + dz * r.depth / 2;
        positions.push(x, GROUND_Y, z);
        uv.push(x / 4, -z / 4);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const shape = new BufferGeometry();
    shape.setAttribute("position", new Float32BufferAttribute(positions, 3));
    shape.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    shape.setIndex(indices); shape.computeVertexNormals();
    return shape;
  }, [room]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="continuous-floor" geometry={geometry} receiveShadow>
    <meshStandardMaterial color={color} map={map} roughness={0.95} />
  </mesh>;
}
