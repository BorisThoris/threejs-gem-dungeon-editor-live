import { PIT_RADIUS } from "../world";

/** Plate dimensions shared by its drawing, hit test and floor reservation. */
export const DART_PLATE_HALF = 0.6;
export const DART_PLATE_ACROSS = 0.7;
export const TRAP_FOOTPRINT = {
  darts: Math.hypot(DART_PLATE_HALF, DART_PLATE_ACROSS),
  pit: PIT_RADIUS,
  grate: 0,
} as const;
