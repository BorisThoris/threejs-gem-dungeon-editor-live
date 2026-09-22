import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { doorReach, insideRoom } from "../dungeon/footprint";
import type { BiomeId } from "../rooms/biomes";
import { TERRAIN_COLORS } from "../rooms/terrainPattern";
import { floorHeightAt } from "./elevation";

export interface StrataSeamMark {
  dir: Dir;
  destination: string;
  stratum: BiomeId;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

/**
 * Block-cut chips of the next stratum at a real doorway. District boundaries
 * already own a named lintel, so these quieter floor seams only explain a
 * material change within one connected region.
 */
export function strataSeamsFor(room: Room, rooms: readonly Room[]): StrataSeamMark[] {
  if (!room.district || !room.stratum) return [];
  const byId = new Map(rooms.map(candidate => [candidate.id, candidate]));
  const marks: StrataSeamMark[] = [];
  for (const dir of DIRS) {
    const destination = room.links[dir];
    const next = destination ? byId.get(destination) : undefined;
    if (!destination || !next?.stratum || next.district !== room.district || next.stratum === room.stratum) continue;
    const axis = DIR_STEP[dir], across = { x: -axis.z, z: axis.x };
    const reach = doorReach(room, dir);
    // The brighter half of the destination palette must read in the doorway's
    // low light; the darker half already fills its terrain beds beyond it.
    const color = TERRAIN_COLORS[next.stratum][0];
    for (const [index, side] of [-2, -1, 0, 1, 2].entries()) {
      const inward = 0.42 + (index % 2) * 0.24;
      const x = axis.x * (reach - inward) + across.x * side * 0.58;
      const z = axis.z * (reach - inward) + across.z * side * 0.58;
      const width = axis.x ? 0.34 : 0.48, depth = axis.z ? 0.34 : 0.48;
      if (!insideRoom(room, x, z, Math.hypot(width, depth) / 2 + 0.02)) continue;
      marks.push({ dir, destination, stratum: next.stratum,
        position: [x, floorHeightAt(room, x, z) + 0.034, z], size: [width, 0.025, depth], color });
    }
  }
  return marks;
}
