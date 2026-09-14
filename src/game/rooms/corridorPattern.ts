import { corridorOffset, corridorWidth } from "../dungeon/footprint";
import { DIRS, DIR_STEP, halfSize, type Room } from "../dungeon/types";
import { createRng } from "../rng";
import { GROUND_Y, WALL_HEIGHT, WALL_THICKNESS } from "../world";

export interface CorridorBlock { position: [number, number, number]; size: [number, number, number] }

/** Stable architecture outside the travel lane; never another pickup or trap. */
export function corridorDetails(room: Room, seed: number): { ribs: CorridorBlock[]; marks: CorridorBlock[] } {
  const ribs: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  const rng = createRng(`${seed}:${room.id}:corridor-details`);
  const style = Math.floor(rng() * 3);
  const half = halfSize(room);
  for (const dir of DIRS) {
    const width = corridorWidth(room, dir), side = width / 2 - WALL_THICKNESS / 2 + 0.07;
    const length = room.wings?.[dir] ?? 0;
    const axis = DIR_STEP[dir];
    const shift = corridorOffset(room, dir);
    const block = (into: CorridorBlock[], along: number, across: number, y: number, width: number, height: number, depth: number) => {
      into.push({ position: [axis.x * along + axis.z * across + (axis.x ? 0 : shift), GROUND_Y + y,
        axis.z * along + axis.x * across + (axis.x ? shift : 0)],
        size: axis.x ? [depth, height, width] : [width, height, depth] });
    };
    for (let bay = 1.5; bay <= length - 1.5; bay += 4) {
      const along = half + bay;
      for (const sign of [-1, 1]) {
        block(ribs, along, sign * side, WALL_HEIGHT / 2, 0.16, WALL_HEIGHT, 0.32);
        block(ribs, along, sign * side, WALL_HEIGHT - 0.65, 0.4, 0.35, 0.5);
      }
      // One, two, or stepped ceiling ribs distinguish the seeded passage.
      block(ribs, along, 0, WALL_HEIGHT - 0.22, width, 0.32, 0.32);
      if (style === 1) block(ribs, along + 0.55, 0, WALL_HEIGHT - 0.22, width, 0.32, 0.2);
      if (style === 2) {
        for (const sign of [-1, 1]) block(ribs, along, sign * (side - 0.5), WALL_HEIGHT - 0.75, 0.7, 0.25, 0.32);
      }
      for (let mark = 0; mark <= style; mark++) {
        block(marks, along + (mark - style / 2) * 0.22, side - 0.1, 2.65, 0.035, 0.45, 0.09);
      }
    }
  }
  return { ribs, marks };
}
