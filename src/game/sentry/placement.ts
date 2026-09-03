import { quadrantSpots, type Vec3 } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { createRng } from "../rng";
import { SENTRY_CHANCE, SENTRY_FIRST_FLOOR } from "../world";

/** Kinds plain enough to want a watcher. The set pieces have enough going on. */
const WATCHED = new Set(["normal", "treasure", "trap"]);

/**
 * Where a room's Sentry stands, or null if it has none.
 *
 * Seeded by room and floor, so a room has the same watcher every time you
 * walk back into it and a floor has a consistent character. Kept apart from
 * the component so the room shell can ask without pulling in a React tree.
 */
export interface SentryPlacement {
  at: Vec3;
  /** Where its beam is pointing at time zero, in radians. */
  phase: number;
}

export function sentryFor(room: Room, seed: number, floor: number): SentryPlacement | null {
  if (floor < SENTRY_FIRST_FLOOR || !WATCHED.has(room.kind)) return null;
  const rng = createRng(`${seed}:${room.id}:${floor}:sentry`);
  if (rng() > SENTRY_CHANCE) return null;
  const spots = quadrantSpots(room, "far");
  const at = spots[Math.floor(rng() * spots.length)];
  // Seeded, not random: the beam's starting angle is half of what makes a
  // Sentry room what it is, and a seed that does not reproduce it is not
  // reproducing the floor.
  return { at, phase: rng() * Math.PI * 2 };
}
