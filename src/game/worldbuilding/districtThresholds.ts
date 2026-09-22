import { DIRS, DIR_STEP, DIR_YAW, type Dir, type Room } from "../dungeon/types";
import { doorReach, insideRoom } from "../dungeon/footprint";
import { type DistrictId } from "../rooms/districts";
import { floorHeightAt } from "./elevation";
import { GROUND_Y, DOOR_HEIGHT } from "../world";

export const DISTRICT_LINTELS: Record<DistrictId, { title: string; color: string }> = {
  gardens: { title: "ROOTWATER", color: "#a2bd86" },
  works: { title: "OLD WORKS", color: "#ce9e69" },
  tombs: { title: "BURIED CHOIR", color: "#b8acd2" },
};

/** Only real open links can announce a district: sealed branches reveal no
 * destination. Both faces of a boundary name the place beyond that doorway. */
export function districtThresholds(room: Room, rooms: readonly Room[]) {
  return DIRS.flatMap(dir => {
    const next = rooms.find(r => r.id === room.links[dir]);
    if (!room.district || !next?.district || room.district === next.district) return [];
    const axis = DIR_STEP[dir], reach = doorReach(room, dir) - 0.26;
    return [{ dir, district: next.district, destination: next.id,
      position: [axis.x * reach, GROUND_Y + DOOR_HEIGHT + 0.36, axis.z * reach] as [number, number, number],
      yaw: DIR_YAW[dir] }];
  });
}

export interface DistrictHandoverMark {
  dir: Dir;
  destination: string;
  district: DistrictId;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

/** The two districts' circulation cuts overlap only at a real open border.
 * Each face uses its own color farther in and the destination color nearest
 * the door, making a two-sided handover without a new material or draw call. */
export function districtHandoverFor(room: Room, rooms: readonly Room[]): DistrictHandoverMark[] {
  if (!room.district) return [];
  const byId = new Map(rooms.map(candidate => [candidate.id, candidate]));
  const marks: DistrictHandoverMark[] = [];
  for (const dir of DIRS) {
    const destination = room.links[dir], next = destination ? byId.get(destination) : undefined;
    if (!destination || !next?.district || next.district === room.district) continue;
    const axis = DIR_STEP[dir], reach = doorReach(room, dir);
    // The circulation colors are too dark under a doorway's lintel. The
    // carved sign's brighter pigment makes the handover readable at eye level.
    const palette = [DISTRICT_LINTELS[room.district].color,
      DISTRICT_LINTELS[room.district].color,
      DISTRICT_LINTELS[next.district].color,
      DISTRICT_LINTELS[next.district].color];
    for (let index = 0; index < palette.length; index++) {
      const along = reach - 1.48 + index * 0.3;
      const x = axis.x * along, z = axis.z * along;
      const width = axis.x ? 0.16 : 2.12, depth = axis.z ? 0.16 : 2.12;
      if (![-1, 1].every(sx => [-1, 1].every(sz =>
        insideRoom(room, x + sx * width / 2, z + sz * depth / 2, 0.02)))) continue;
      marks.push({ dir, destination, district: next.district,
        position: [x, floorHeightAt(room, x, z) + 0.044, z], size: [width, 0.018, depth], color: palette[index] });
    }
  }
  return marks;
}
