import { quadrantSpots, type Vec3 } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { claimedSpots, gemFor } from "../rooms/kinds";
import { createRng } from "../rng";
import { floorRules } from "../world";

/** Kinds plain enough to want a watcher. The set pieces have enough going on. */
const WATCHED = new Set(["normal", "treasure", "trap"]);

/**
 * Where a room's Sentry stands, or null if it has none.
 *
 * Seeded by room and floor, so a room has the same watcher every time you
 * walk back into it and a floor has a consistent character. How many rooms
 * get one is the floor's business rather than this file's: see `floorRules`.
 * Kept apart from the component so the room shell can ask without pulling in
 * a React tree.
 */
export interface SentryPlacement {
  at: Vec3;
  /** Where its beam is pointing at time zero, in radians. */
  phase: number;
}

/**
 * How far a post has to stand from something else to not be inside it.
 *
 * The post is a two-metre column with a collider a fifth of a metre
 * across, and it was placed on a far anchor picked at random - the same
 * ring the furniture and the gem are placed on, and nothing on either side
 * knew about the other. Measured over 1,346 watched rooms: 27% of posts
 * stood inside a prop, 22% inside a solid one so that both had colliders
 * in the same space, and 27% stood on the gem. Not near it - on it, the
 * same anchor to two decimal places.
 */
const POST_RADIUS = 0.22;
const CLEAR_OF_CONTENT = POST_RADIUS + 1.1;

export function sentryFor(room: Room, seed: number, floor: number): SentryPlacement | null {
  const chance = floorRules(floor).sentryChance;
  if (chance <= 0 || !WATCHED.has(room.kind)) return null;
  const rng = createRng(`${seed}:${room.id}:${floor}:sentry`);
  if (rng() > chance) return null;
  // Everything the room has already spoken for: what its kind stands in it,
  // what an author placed, and the gem. The furniture is dealt with from
  // the other side - the dressing is given this spot and keeps away from
  // it - because the arrangement is chosen after this and cannot be known
  // here without the two files importing each other.
  const gem = gemFor(room, seed);
  const taken = [...claimedSpots(room), ...(gem ? [gem] : [])];
  const free = (spot: Vec3) =>
    !taken.some((t) => Math.hypot(spot[0] - t[0], spot[2] - t[2]) < CLEAR_OF_CONTENT);
  const far = quadrantSpots(room, "far");
  // Furthest ring first, which is where a watcher belongs; the inner ring
  // rather than stand in something, and the far ring anyway rather than
  // leave a floor's watched room unwatched.
  const spots = far.filter(free).length
    ? far.filter(free)
    : quadrantSpots(room, "near").filter(free).length
      ? quadrantSpots(room, "near").filter(free)
      : far;
  const at = spots[Math.floor(rng() * spots.length)];
  // Seeded, not random: the beam's starting angle is half of what makes a
  // Sentry room what it is, and a seed that does not reproduce it is not
  // reproducing the floor.
  return { at, phase: rng() * Math.PI * 2 };
}
