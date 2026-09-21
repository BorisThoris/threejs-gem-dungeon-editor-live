import { DIRS, DIR_STEP, type Room } from "../dungeon/types";
import { doorReach, insideRoom } from "../dungeon/footprint";
import { floorHeightAt } from "./elevation";

export interface DistrictWayMark {
  position: [number, number, number];
  size: [number, number];
  tone: "base" | "accent";
}

/**
 * A room's old circulation line, drawn from its centre toward every real door.
 * The vocabulary belongs to the district: roots braid through Rootwater,
 * sleepers cross the Old Works, and broad processional stones lead through the
 * Buried Choir. These are paint-depth marks with no collision or game rule.
 */
export function districtWaysFor(room: Room): DistrictWayMark[] {
  if (!room.district) return [];
  const marks: DistrictWayMark[] = [];
  const add = (x: number, z: number, width: number, depth: number, tone: DistrictWayMark["tone"]) => {
    if (!insideRoom(room, x, z, Math.hypot(width, depth) / 2 + 0.04)) return;
    marks.push({ position: [x, floorHeightAt(room, x, z) + 0.031, z], size: [width, depth], tone });
  };
  for (const dir of DIRS) {
    if (!room.links[dir]) continue;
    const axis = DIR_STEP[dir], across = { x: -axis.z, z: axis.x };
    const reach = doorReach(room, dir) - 0.55;
    if (room.district === "gardens") {
      for (let distance = 1.1, count = 0; distance < reach && count < 12; distance += 1.25, count++) for (const side of [-1, 1]) {
        const stagger = side > 0 ? 0.18 : -0.18;
        const along = Math.min(reach, distance + stagger);
        add(axis.x * along + across.x * side * 0.32, axis.z * along + across.z * side * 0.32,
          axis.x ? 0.82 : 0.13, axis.z ? 0.82 : 0.13, side > 0 ? "base" : "accent");
      }
    } else if (room.district === "works") {
      let index = 0;
      for (let distance = 1.15; distance < reach && index < 12; distance += 1.35, index++)
        add(axis.x * distance, axis.z * distance, axis.x ? 0.16 : 1.18, axis.z ? 0.16 : 1.18,
          index % 4 === 3 ? "accent" : "base");
    } else {
      let index = 0;
      for (let distance = 1.15; distance < reach && index < 12; distance += 1.45, index++)
        add(axis.x * distance, axis.z * distance, axis.x ? 0.82 : 1.12, axis.z ? 0.82 : 1.12,
          index % 3 === 2 ? "accent" : "base");
    }
  }
  return marks;
}

export const DISTRICT_WAY_COLORS = {
  gardens: { base: "#685f3e", accent: "#829157" },
  works: { base: "#514942", accent: "#a47343" },
  tombs: { base: "#807966", accent: "#a89d7d" },
} as const;
