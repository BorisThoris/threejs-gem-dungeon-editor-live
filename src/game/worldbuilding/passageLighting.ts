import { corridorOffset } from "../dungeon/footprint";
import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import type { DistrictId } from "../rooms/districts";
import { GROUND_Y, WALL_HEIGHT } from "../world";
import { GALLERY_TERMINI } from "./galleryTermini";

export interface PassageLamp {
  dir: Dir;
  position: [number, number, number];
  phase: number;
  terminal: boolean;
  colour: string;
}

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
        axis.z * along + (axis.x ? shift : 0)] as [number, number, number], phase: direction * 1.7 + i * 2.3,
        terminal: !room.links[dir] && room.secret?.dir !== dir && i === count - 1,
        colour: GALLERY_TERMINI[room.district ?? "tombs"].lamp };
    });
  });
}

/** A restrained oil flutter, with no flashing or full extinction. */
export function passageLampPulse(time: number, phase: number, district: DistrictId = "tombs", terminal = false): number {
  const flutter = 1 + Math.sin(time * 2.1 + phase) * 0.035 + Math.sin(time * 5.3 + phase * 2) * 0.015;
  if (!terminal) return flutter;
  // A few hard intensity steps keep the response handmade and legible. The
  // lamp is already present; this changes one number and allocates no light.
  const beat = district === "gardens"
    ? (Math.floor((time + phase) * 1.25) % 5 === 0 ? 0.08 : 0)
    : district === "works"
      ? (Math.floor((time + phase) * 4) % 9 < 2 ? 0.1 : -0.015)
      : (Math.floor((time + phase) * 1.7) % 7 === 0 ? 0.07 : 0);
  return flutter + beat;
}
