import { DIRS, DIR_STEP, DIR_YAW, type Room } from "../dungeon/types";
import { doorReach } from "../dungeon/footprint";
import { type DistrictId } from "../rooms/districts";
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
