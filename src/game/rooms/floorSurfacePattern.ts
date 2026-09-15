import { floorRects, type FloorRect } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";

/** Disjoint strips of the physical floor union. Door collars may overlap the
 * chamber courses; render their union once instead of coplanar slab faces. */
export function floorSurfaceRects(room: Room): FloorRect[] {
  const floors = floorRects(room);
  const cuts = [...new Set(floors.flatMap(r => [r.z - r.depth / 2, r.z + r.depth / 2]))].sort((a, b) => a - b);
  const result: FloorRect[] = [];
  for (let i = 1; i < cuts.length; i++) {
    const low = cuts[i - 1], high = cuts[i], z = (low + high) / 2;
    const intervals = floors.filter(r => z > r.z - r.depth / 2 && z < r.z + r.depth / 2)
      .map(r => [r.x - r.width / 2, r.x + r.width / 2]).sort((a, b) => a[0] - b[0]);
    const merged: number[][] = [];
    for (const [left, right] of intervals) {
      const last = merged.at(-1);
      if (last && left <= last[1]) last[1] = Math.max(last[1], right);
      else merged.push([left, right]);
    }
    for (const [left, right] of merged) result.push({ x: (left + right) / 2, z, width: right - left, depth: high - low });
  }
  return result;
}
