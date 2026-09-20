import { corridorOffset } from "../dungeon/footprint";
import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { GROUND_Y, WALL_HEIGHT } from "../world";

export interface PassageLamp { dir: Dir; position: [number, number, number]; phase: number }

/** A light belongs to a passage, never to each floor course in its mesh. */
export function passageLampsFor(room: Room): PassageLamp[] {
  return DIRS.flatMap((dir, direction) => {
    const length = room.wings?.[dir] ?? 0;
    if (length <= 0) return [];
    const count = Math.min(3, Math.ceil(length / 10));
    const axis = DIR_STEP[dir], shift = corridorOffset(room, dir);
    return Array.from({ length: count }, (_, i) => {
      const along = room.size / 2 + length * (i + 0.5) / count;
      return { dir, position: [axis.x * along + (axis.x ? 0 : shift), GROUND_Y + WALL_HEIGHT - 0.8,
        axis.z * along + (axis.x ? shift : 0)] as [number, number, number], phase: direction * 1.7 + i * 2.3 };
    });
  });
}

/** A restrained oil flutter, with no flashing or full extinction. */
export const passageLampPulse = (time: number, phase: number) =>
  1 + Math.sin(time * 2.1 + phase) * 0.035 + Math.sin(time * 5.3 + phase * 2) * 0.015;
