import type { Dir, Room } from "../dungeon/types";
import { DIR_STEP } from "../dungeon/types";
import { doorReach, wallEdges } from "../dungeon/footprint";
import { DOOR_WIDTH, WALL_THICKNESS } from "../world";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { floorHeightAt } from "./elevation";

export interface WallCourse extends CorridorBlock { dir: Dir }

/** Shallow construction courses follow the physical wall union. Their exposed
 * face is only two centimetres beyond the collider; they add no standing props.
 * Whole authored rooms retain their own compositions. */
export function wallCoursesFor(room: Room) {
  const rails: WallCourse[] = [], caps: WallCourse[] = [];
  if (room.template) return { rails, caps };
  for (const edge of wallEdges(room)) {
    const axis = DIR_STEP[edge.dir], centre = edge.along === "x" ? edge.x : edge.z;
    const normal = edge.along === "x" ? edge.z : edge.x;
    const portal = centre === 0 && Math.abs(normal) === doorReach(room, edge.dir) && (room.links[edge.dir] || room.secret?.dir === edge.dir);
    const lo = centre - edge.length / 2 + 0.06, hi = centre + edge.length / 2 - 0.06;
    for (let start = lo; start < hi; start += 2) {
      const end = Math.min(start + 1.94, hi), along = (start + end) / 2;
      if (portal && start < DOOR_WIDTH / 2 + 0.25 && end > -DOOR_WIDTH / 2 - 0.25) continue;
      const inset = WALL_THICKNESS / 2 - 0.02;
      const x = (edge.along === "x" ? along : edge.x) - axis.x * inset;
      const z = (edge.along === "z" ? along : edge.z) - axis.z * inset;
      const station = room.waterway?.station;
      if (station && Math.hypot(x - station.x, z - station.z) < 2.5) continue;
      const floor = floorHeightAt(room, x - axis.x * 0.2, z - axis.z * 0.2);
      const block = (into: WallCourse[], height: number, thickness: number, depth = 0.08) => into.push({
        dir: edge.dir,
        position: [x, floor + height, z], size: edge.along === "x" ? [end - start, thickness, depth] : [depth, thickness, end - start],
      });
      if (room.district === "gardens") {
        block(rails, 0.55, 0.16); block(rails, 1.05, 0.12);
        caps.push({ dir: edge.dir, position: [x, floor + 0.8, z], size: edge.along === "x" ? [0.12, 0.75, 0.08] : [0.08, 0.75, 0.12] });
      } else if (room.district === "works") {
        block(rails, 0.95, 0.2); block(caps, 0.83, 0.055);
      } else {
        block(rails, 0.38, 0.55); block(caps, 0.7, 0.13);
      }
    }
  }
  return { rails, caps };
}
