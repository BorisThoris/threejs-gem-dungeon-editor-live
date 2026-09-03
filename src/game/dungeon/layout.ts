import { createRng } from "../rng";
import {
  DOOR_WIDTH,
  GROUND_Y,
  PLAYER_SPAWN_Y,
  entranceDepth,
} from "../world";
import {
  DIR_STEP,
  DIR_YAW,
  OPPOSITE,
  halfSize,
  inscribedRadius,
  type Dir,
  type Room,
  type Shape,
} from "./types";

export type Vec3 = [number, number, number];

/**
 * Where things are in a room.
 *
 * Doors, spawn points, the gem, the spikes and the dressing anchors all
 * used to be computed in different files from different notions of the
 * room's size, and the recurring bug of this project was two of them
 * disagreeing. Every position now comes from here, from `room.size` alone,
 * in room-local coordinates with the room centred at the origin.
 *
 * A room is a cross of door lanes with four diagonal quadrants between
 * them. Three anchor families sit in the quadrants and are guaranteed
 * distinct: `near` (just off the lanes), `far` (deep in the quadrant) and
 * the corners (the braziers, against the walls). The gem takes a `far` or
 * `near` spot that nothing else has claimed; a trap's spikes sit between
 * the gem and the lanes.
 *
 * The cross is only as wide as the room's own doors, which is what makes a
 * fourth family possible: `centre`, a pair either side of the middle, in
 * the rooms whose doors are all on one axis. Two in five of them are.
 */

/** Centre of the doorway in a wall. */
export function doorPosition(room: Room, dir: Dir): Vec3 {
  const half = halfSize(room);
  const step = DIR_STEP[dir];
  return [step.x * half, GROUND_Y, step.z * half];
}

export interface Spawn {
  position: Vec3;
  /** Camera yaw, radians. */
  yaw: number;
}

/**
 * Where the player lands after walking `heading` out of the previous room:
 * just inside the wall they came through, facing onward.
 */
export function spawnAfterTravel(room: Room, heading: Dir): Spawn {
  const half = halfSize(room);
  const depth = entranceDepth(half);
  const from = DIR_STEP[OPPOSITE[heading]];
  return {
    position: [from.x * (half - depth), PLAYER_SPAWN_Y, from.z * (half - depth)],
    yaw: DIR_YAW[heading],
  };
}

/** Where a run begins: the middle of the start room, facing north. */
export const spawnAtStart = (): Spawn => ({
  position: [0, PLAYER_SPAWN_Y, 0],
  yaw: 0,
});

/**
 * Half-width of the lane kept clear along each axis. A doorway is DOOR_WIDTH
 * wide and the path between two doorways runs straight through the centre,
 * so nothing solid may stand within this of either axis.
 */
export const LANE_HALF_WIDTH = DOOR_WIDTH / 2 + 1.25;

/**
 * Which of the two bands across a room its doorways actually claim.
 *
 * A door in the north or south wall opens a path straight down x = 0, so it
 * claims the band `|x| < LANE_HALF_WIDTH`; a door east or west claims
 * `|z| < LANE_HALF_WIDTH`. For a long time the lane rule claimed both in
 * every room, whether or not the room had the doors - and since everything
 * a room holds has to stand clear of the lanes, that pushed all of it into
 * the four diagonal quadrants and left the middle of every room empty.
 *
 * Nearly half the rooms the generator makes have doors on one axis only:
 * over three floors and two hundred seeds, 47% of them. Each of those has a
 * whole band across its middle that no player ever walks along, next to the
 * band that every player walks along and looks down.
 */
export function laneAxes(room: Room): { x: boolean; z: boolean } {
  return {
    x: !!(room.links.north || room.links.south),
    z: !!(room.links.east || room.links.west),
  };
}

/**
 * True when a room-local point would stand in a doorway's path.
 *
 * Called without a room this answers for the worst case - every wall doored
 * - which is the question an authored template has to survive, because the
 * generator may place a template in any room it makes.
 */
export const inDoorLane = (x: number, z: number, room?: Room): boolean => {
  const lanes = room ? laneAxes(room) : { x: true, z: true };
  return (lanes.x && Math.abs(x) < LANE_HALF_WIDTH) || (lanes.z && Math.abs(z) < LANE_HALF_WIDTH);
};

/** The four quadrants, as the signs of x and z. */
const QUADRANTS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

/** Innermost diagonal a prop can stand on without its edge in a lane. */
const INNER = LANE_HALF_WIDTH + 0.9;
/** How far the braziers stand from the walls. */
const CORNER_INSET = 0.8;

export type Anchor = "near" | "far";

/**
 * The anchor of each family on a room's diagonals. `near` sits just clear of
 * the lanes; `far` sits deep in the quadrant, clear of the corner brazier;
 * the two are at least 0.9 apart in every room the generator makes, so a
 * prop on one is never inside a prop on the other.
 */
export function quadrantDistance(room: Room, which: Anchor): number {
  const half = halfSize(room);
  const far = Math.max(INNER + 0.9, Math.min(half - 2.4, reach(room, 1.2)));
  if (which === "far") return far;
  // Near follows far in a room too tight for both, so the two rings never
  // collapse onto each other however small or oddly shaped the room is.
  return Math.max(INNER, Math.min((half * 0.5) / Math.SQRT2, far - 0.9));
}

/**
 * The farthest a prop may stand along a diagonal and still be on the floor
 * the room draws, less `inset` so it is not standing on the very edge.
 *
 * A square room's floor runs into its corners, so there is nothing to clamp
 * there. Every other shape is a polygon inscribed in the room's box, and
 * without this its outer props stood on the bare slab outside the coloured
 * floor - by three units in a large one. The smallest odd shapes still
 * overhang slightly, because a lane-clear anchor matters more than a tidy
 * one and they cannot have both.
 */
function reach(room: Room, inset: number): number {
  if (room.shape === "square") return Infinity;
  return Math.max(INNER + 0.9, (inscribedRadius(room) - inset) / Math.SQRT2);
}

/** The four anchors of a family, one per quadrant, in QUADRANTS order. */
export function quadrantSpots(room: Room, which: Anchor): Vec3[] {
  const d = quadrantDistance(room, which);
  return QUADRANTS.map(([sx, sz]) => [sx * d, GROUND_Y, sz * d]);
}

/**
 * How far from the middle the pair either side of it stands.
 *
 * Deliberately not the far ring, which in a large room would put them
 * against the side walls - where things already are. Close enough that the
 * player walks between them and far enough that the widest solid prop in
 * the game, the wall segment at 1.5, still clears the lane.
 */
const MIDDLE_DISTANCE = LANE_HALF_WIDTH + 1.8;

/**
 * The two spots either side of the middle, in a room whose doors leave the
 * middle usable - or nothing, in a room whose doors do not.
 *
 * The dead centre of a room is never one of them: any door at all puts a
 * lane through the exact middle. What a one-axis room has spare is the band
 * at right angles to its doors, so a north/south room gets a pair east and
 * west of the walk and an east/west room gets a pair north and south of it.
 * They stand a fixed distance out, close enough to the walk that a player
 * going straight through passes between them.
 *
 * They cannot collide with a quadrant anchor: an anchor at (±d, ±d) is at
 * least d away from either axis, and these sit on an axis.
 */
export function centreSpots(room: Room): Vec3[] {
  const lanes = laneAxes(room);
  // Doors on both axes leave the cross covering the whole middle; doors on
  // neither is not a room the generator makes.
  if (lanes.x === lanes.z) return [];
  // A shaped room's floor is narrowest on the axes, which is exactly where
  // these stand, so a room too pointy to hold them holds none.
  if (MIDDLE_DISTANCE > inscribedRadius(room) - 1) return [];
  const d = MIDDLE_DISTANCE;
  return lanes.z
    ? [
        [0, GROUND_Y, d],
        [0, GROUND_Y, -d],
      ]
    : [
        [d, GROUND_Y, 0],
        [-d, GROUND_Y, 0],
      ];
}

/** The four corners, pulled in far enough that a brazier is not in the wall. */
export function cornerSpots(room: Room): Vec3[] {
  const box = halfSize(room) - CORNER_INSET;
  const c =
    room.shape === "square"
      ? box
      : Math.max(INNER, Math.min(box, (inscribedRadius(room) - CORNER_INSET) / Math.SQRT2));
  return QUADRANTS.map(([sx, sz]) => [sx * c, GROUND_Y, sz * c]);
}

/**
 * Whether a shape can hold a room of this size.
 *
 * A shaped room is a polygon inscribed in its box, so it has less floor
 * than its size suggests - and the smaller and pointier it is, the less. A
 * shape that cannot fit its own outer ring of props inside the floor it
 * draws is not used: a diamond at sixteen units across leaves its chests
 * standing on bare slab, so those rooms are square instead. The generator
 * asks this before it picks; the room builder offers only what passes.
 */
export function shapeFits(shape: Shape, size: number): boolean {
  if (shape === "square") return true;
  const room = { id: "fit", kind: "normal", grid: { x: 0, z: 0 }, size, shape, links: {} } as Room;
  const radius = quadrantDistance(room, "far") * Math.SQRT2;
  return radius <= inscribedRadius(room) + 0.6;
}

const GEM_HEIGHT = 0.9;

const dist2 = (a: Vec3, b: Vec3): number => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * Where the gem goes: the `far` or `near` anchor farthest from anything the
 * room's kind has already claimed (a counter, a lectern, the pedestals), so
 * it is never inside a prop, never in a lane and never on top of a door.
 * Among equally free anchors the room's seed decides, so the same room has
 * its gem in the same place every visit.
 */
export function gemPosition(room: Room, seed: number, reserved: Vec3[] = []): Vec3 {
  return freeAnchor(room, `${seed}:${room.id}:gem`, reserved, GEM_HEIGHT);
}

/** Where a floor's key lies: a free anchor, never the one the gem is on. */
export function keyPosition(room: Room, seed: number, reserved: Vec3[] = []): Vec3 {
  return freeAnchor(room, `${seed}:${room.id}:key`, reserved, 0.55);
}

/**
 * The anchor farthest from everything already claimed, at a height of your
 * choosing. Among equally free anchors the seed decides, so the same room
 * puts the same thing in the same corner every visit.
 */
function freeAnchor(room: Room, seedKey: string, reserved: Vec3[], height: number): Vec3 {
  const rng = createRng(seedKey);
  const candidates = [...quadrantSpots(room, "far"), ...quadrantSpots(room, "near")];
  const start = Math.floor(rng() * 4);
  let best: Vec3 = candidates[start];
  let bestScore = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    // Far anchors first, each family rotated by the seed.
    const family = Math.floor(i / 4) * 4;
    const c = candidates[family + ((i + start) % 4)];
    const score = reserved.length
      ? Math.min(...reserved.map((r) => dist2(c, r)))
      : Infinity;
    // Prefer a far anchor unless a near one is clearly freer.
    const weighted = family === 0 ? score + 1 : score;
    if (weighted > bestScore) {
      bestScore = weighted;
      best = c;
    }
  }
  return [best[0], GROUND_Y + height, best[2]];
}

/** Radius of one spike patch, shared with the Hazard prop. */
export const HAZARD_RADIUS = 1.2;

/**
 * Spikes for a trap room: three patches between the gem and the lanes it
 * is approached from, so the direct line to the reward is the dangerous
 * one and the way round, along the walls, is safe. A patch is never in a
 * lane - in a small room it is pulled back to the lane's edge instead -
 * so the room is always crossable, and the gem always has a safe side.
 */
export function trapHazards(room: Room, gem: Vec3): Vec3[] {
  const sx = Math.sign(gem[0]) || 1;
  const sz = Math.sign(gem[2]) || 1;
  const clearance = LANE_HALF_WIDTH + HAZARD_RADIUS;
  const gx = Math.abs(gem[0]);
  const gz = Math.abs(gem[2]);
  const d = Math.max(1.6, Math.min(2.4, Math.min(gx, gz) - clearance));
  const pull = (v: number) => Math.max(clearance, v);
  const patches: [number, number][] = [
    [pull(gx - d), gz],
    [gx, pull(gz - d)],
    [pull(gx - d * 0.75), pull(gz - d * 0.75)],
  ];
  return patches
    .filter(([x, z]) => Math.hypot(x - gx, z - gz) >= 0.9)
    .map(([x, z]) => [sx * x, GROUND_Y, sz * z]);
}

