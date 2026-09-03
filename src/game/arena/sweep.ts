import { HAZARD_RADIUS } from "../dungeon/layout";
import { ARENA_ARMS, ARENA_INNER_RADIUS, ARENA_RING_GAP, ARENA_SPIN, PLAYER_CAPSULE_RADIUS } from "../world";

/**
 * Which ground the arena's arms actually sweep, and which ground they miss.
 *
 * The arena's whole promise is that there is nowhere to stand: three arms
 * of spikes cross the entire floor, so the only safe ground is the turning
 * gap between two of them, and holding it means walking a circle for
 * fourteen seconds. It was not true. The innermost ring of spikes sat at
 * 2.4 and a patch reaches 1.2, so nothing ever came within 1.2 of the
 * middle - and the plinth in the middle is 0.5 across with a player 0.3
 * across, which puts a standing player 0.8 from the axis. Take the gem,
 * stay exactly where you took it from, and the arms turn around you for
 * seventeen seconds without touching you. Measured in the game: three
 * lives in, three lives out. The room even tells you to keep walking,
 * which is worse advice than standing still.
 *
 * So the sweep is described here rather than inside the room, and
 * layout-check holds it to two lines that between them are the arena:
 *
 *   There is always a line you can walk. There is no line you can stand on.
 *
 * The second is what makes the room a gauntlet instead of a waiting game.
 * The first is what keeps it fair, and it is the same promise the Warden
 * makes in systems/pace.ts - the check reads the slowest walk in the game
 * from there rather than from WALK_SPEED, because a potion can halve it.
 */

/** The plinth's collider, which is the one thing standing in the middle. */
export const PLINTH_RADIUS = 0.5;

/**
 * The closest to the middle a player can get: up against the plinth. Any
 * shelter starts here, because inside it there is no player to shelter.
 */
export const ARENA_MIN_STAND = PLINTH_RADIUS + PLAYER_CAPSULE_RADIUS;

/** How far out a player can get: the corner of the box, not of the floor. */
export const arenaMaxStand = (half: number): number =>
  (half - PLAYER_CAPSULE_RADIUS) * Math.SQRT2;

/**
 * Where the spike patches sit along each arm.
 *
 * The rings run past the drawn floor and out to the corners of the box,
 * because the box is what a player can stand in: a shaped arena still has
 * square walls, and rings that stopped at the polygon left four safe
 * corners. The last ring only has to come within a patch's reach of the
 * furthest corner, not stand on it.
 */
export function arenaRings(half: number): number[] {
  const out: number[] = [];
  const reach = arenaMaxStand(half);
  for (let r = ARENA_INNER_RADIUS; r - HAZARD_RADIUS < reach; r += ARENA_RING_GAP) out.push(r);
  return out;
}

/**
 * A radius a player can stand at that no arm ever reaches, or null.
 *
 * An arm sweeps every angle, so a point at radius r is touched if and only
 * if some ring is within a patch's reach of r - the angle takes care of
 * itself once a turn. That makes the whole question one-dimensional.
 */
export function arenaShelter(half: number): number | null {
  const rings = arenaRings(half);
  const covered = (r: number) => rings.some((ring) => Math.abs(r - ring) <= HAZARD_RADIUS);
  // A tenth of a unit is a third of the player's own width; nothing can
  // hide in a gap finer than that.
  for (let r = ARENA_MIN_STAND; r <= arenaMaxStand(half); r += 0.1) if (!covered(r)) return r;
  return null;
}

/**
 * The innermost circle a player can walk and stay in the gap between two
 * arms.
 *
 * With three arms the gap's middle is 60 degrees from either of them, so
 * two points of the same radius r are a chord 2r*sin(30) = r apart: at the
 * middle of the gap a player is exactly r from each arm beside them, and
 * the tightest circle they can hold is the one where that clears a patch.
 * It is a property of the arms, not of the room, so every arena has it.
 */
export const ARENA_INNER_ORBIT = HAZARD_RADIUS;

/** How fast a player has to move to hold a circle of this radius. */
export const orbitSpeed = (radius: number): number => ARENA_SPIN * radius;

/** For the check that the arms are spaced as the room believes. */
export const arenaArms = ARENA_ARMS;
