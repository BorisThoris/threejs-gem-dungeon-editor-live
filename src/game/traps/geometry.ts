import { PIT_RADIUS } from "../world";
import { doorPosition, type Vec3 } from "../dungeon/layout";
import type { Dir, Room } from "../dungeon/types";

export const GRATE_BARS = [-0.9, -0.45, 0, 0.45, 0.9] as const;
export const GRATE_BAR_HALF = 0.04;

/** The hanging bars sit just inside the doorway, including shaped rooms. */
export function gratePosition(room: Room, dir: Dir): Vec3 {
  const [x, y, z] = doorPosition(room, dir);
  return [x * 0.97, y, z * 0.97];
}

/** A floor device must touch the actual sweep of the falling bars. */
export function reachesGrate(room: Room, dir: Dir, x: number, z: number, radius: number): boolean {
  const [gx, , gz] = gratePosition(room, dir);
  const across = dir === "east" || dir === "west" ? z - gz : x - gx;
  const normal = dir === "east" || dir === "west" ? x - gx : z - gz;
  return GRATE_BARS.some(bar => Math.hypot(Math.max(0, Math.abs(across - bar) - GRATE_BAR_HALF),
    Math.max(0, Math.abs(normal) - GRATE_BAR_HALF)) <= radius);
}

/** Plate dimensions shared by its drawing, hit test and floor reservation. */
export const DART_PLATE_HALF = 0.6;
export const DART_PLATE_ACROSS = 0.7;
export const TRAP_FOOTPRINT = {
  darts: Math.hypot(DART_PLATE_HALF, DART_PLATE_ACROSS),
  pit: PIT_RADIUS,
  grate: 0,
} as const;
