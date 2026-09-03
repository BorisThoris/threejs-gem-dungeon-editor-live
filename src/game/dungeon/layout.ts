import { createRng } from "../rng";
import {
  DOOR_WIDTH,
  GROUND_Y,
  INTERACT_RADIUS,
  PLAYER_SPAWN_Y,
  entranceDepth,
} from "../world";
import {
  DIRS,
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
 * The room is four door lanes in a cross and four diagonal quadrants
 * between them. Everything that is not a door lives in a quadrant, on one
 * of three anchor families that are guaranteed distinct: `near` (just off
 * the lanes), `far` (deep in the quadrant) and the corners (the braziers,
 * against the walls). The gem takes a `far` or `near` spot that nothing
 * else has claimed; a trap's spikes sit between the gem and the lanes.
 */

/** Centre of the doorway in a wall. */
export function doorPosition(room: Room, dir: Dir): Vec3 {
  const half = halfSize(room);
  const step = DIR_STEP[dir];
  return [step.x * half, GROUND_Y, step.z * half];
}

/** Yaw of a door mesh so it faces into the room. */
export const doorYaw = (dir: Dir): number => DIR_YAW[OPPOSITE[dir]];

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

/** True when a room-local point would stand in a doorway's path. */
export const inDoorLane = (x: number, z: number): boolean =>
  Math.abs(x) < LANE_HALF_WIDTH || Math.abs(z) < LANE_HALF_WIDTH;

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
  const rng = createRng(`${seed}:${room.id}:gem`);
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
  return [best[0], GROUND_Y + GEM_HEIGHT, best[2]];
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

/** Which of a room's walls have doorways. */
export const doorDirs = (room: Room): Dir[] =>
  DIRS.filter((dir) => Boolean(room.links[dir]));

/** A point is within reach of a door if it is inside the interact radius. */
export const nearDoor = (room: Room, x: number, z: number): boolean =>
  doorDirs(room).some((dir) => {
    const [dx, , dz] = doorPosition(room, dir);
    return (x - dx) ** 2 + (z - dz) ** 2 <= INTERACT_RADIUS ** 2;
  });
