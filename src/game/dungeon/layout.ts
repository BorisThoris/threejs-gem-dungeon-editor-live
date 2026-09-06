import { createRng } from "../rng";
import {
  CLOSE_REACH,
  DOOR_WIDTH,
  GROUND_Y,
  PLAYER_CAPSULE_RADIUS,
  PLAYER_SPAWN_Y,
  entranceDepth,
} from "../world";
import { PROP_SPECS, widestFurnishing } from "../props/specs";
import {
  DIR_STEP,
  DIR_YAW,
  OPPOSITE,
  halfSize,
  diagonalReach,
  floorReach,
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

/**
 * True when a prop of this footprint would reach into a doorway's path,
 * even though the point it stands on is clear of one.
 *
 * `inDoorLane` answers about a point, because that is what an anchor is.
 * What actually blocks a doorway is the prop, and the widest furnishing in
 * the game is a metre from its centre to its edge - so for most of this
 * project a table could stand a hand's width outside a lane and still have
 * its near metre inside it.
 */
export const overhangsLane = (x: number, z: number, radius: number, room?: Room): boolean => {
  const lanes = room ? laneAxes(room) : { x: true, z: true };
  return (
    (lanes.x && Math.abs(x) - radius < LANE_HALF_WIDTH) ||
    (lanes.z && Math.abs(z) - radius < LANE_HALF_WIDTH)
  );
};

/** The four quadrants, as the signs of x and z. */
const QUADRANTS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

/**
 * Which way round a room is furnished.
 *
 * Everything a room holds stands on an anchor, and the anchors were the
 * same four points in every room - so two chambers of the same size, drawn
 * from the same arrangement, were the same room down to the centimetre. A
 * run is 34 rooms and only 23 of them looked different; the first room that
 * looked like one already seen arrived at room 11, in 120 runs out of 120;
 * and the single most common look was one room in every eleven in the game.
 *
 * A composition turned a quarter turn is still that composition, so the
 * room's quadrants are read in a seeded order instead of always the same
 * one: four turns and a mirror, eight ways round. It costs nothing, it
 * multiplies every arrangement and every authored template by eight, and
 * because the whole frame turns together - the gem, the key, the shop's
 * counter, the trial's pedestals and the dressing all come off these same
 * anchors - a turned room is still a room somebody laid out.
 *
 * Only the diagonals turn. The doors, the spawns and the middle pair are
 * fixed by which walls the room has and stay where they are.
 *
 * Safe for every shape the generator makes: each is a regular polygon with
 * a vertex on the +x axis, and for four, six, eight and forty-eight sides
 * the floor reaches equally far along all four diagonals, so a turn cannot
 * push an anchor off the floor. (A triangle is the exception, and does not
 * fit a room at any size the game uses.)
 */
export interface Orientation {
  /** Quarter turns anticlockwise. */
  turns: 0 | 1 | 2 | 3;
  /** Whether x is flipped afterwards. */
  mirror: boolean;
}

export function orientationOf(room: Room): Orientation {
  // From the room itself, not from the run's seed: `quadrantSpots` takes a
  // Room and nothing else, and every caller depends on that.
  const rng = createRng(`orient:${room.seed}:${room.id}:${room.grid.x},${room.grid.z}`);
  return { turns: Math.floor(rng() * 4) as 0 | 1 | 2 | 3, mirror: rng() < 0.5 };
}

/** A room-local point, turned and mirrored the way this room is. */
export function orient(x: number, z: number, o: Orientation): [number, number] {
  let px = x;
  let pz = z;
  for (let i = 0; i < o.turns; i++) {
    const nx = pz;
    pz = -px;
    px = nx;
  }
  return [o.mirror ? -px : px, pz];
}

/**
 * How big the things standing on these anchors are, and therefore how far
 * apart the anchors have to be.
 *
 * These were four magic numbers - a lane clearance of 0.9, a ring gap of
 * 0.9, a wall inset of 2.4, a corner inset of 0.8 - and none of them was
 * the size of anything. The widest furnishing in the game is a metre across
 * its half-width, so 0.9 was not enough for any of them: in every
 * fourteen-unit room the generator makes, `near` and `far` were 1.34 apart
 * along the diagonal where a table and a bookshelf need 1.8, and a table on
 * `near` reached 0.1 into the door lane. `PROP_SPECS` has carried the
 * footprint of every prop since the specs were split out, and nothing that
 * placed a prop had ever read it.
 *
 * A ring is a diagonal coordinate, so a gap of `g` between two rings is
 * `g * sqrt(2)` of real distance between the props on them.
 */
const WIDEST = widestFurnishing();
const BRAZIER = PROP_SPECS.torch.radius;
/** Breathing room, so nothing is decided by the last centimetre. */
const MARGIN = 0.2;

/** Innermost ring: the widest furnishing on it still clears the lane. */
const INNER = LANE_HALF_WIDTH + WIDEST + MARGIN;
/** Ring gap: two of the widest furnishings, side by side across a quadrant. */
const RING_GAP = (2 * WIDEST) / Math.SQRT2;
/** Corner gap: the widest furnishing beside a brazier. */
const CORNER_GAP = (WIDEST + BRAZIER) / Math.SQRT2;
/** How far the braziers stand from the walls. */
const CORNER_INSET = BRAZIER + MARGIN;

export type Anchor = "near" | "far";

/**
 * The anchor of each family on a room's diagonals. `near` sits far enough
 * out that the widest thing on it clears the door lanes; `far` sits a
 * whole furnishing beyond it and a furnishing-and-a-brazier inside the
 * corners, and spreads outward with the room. Nothing on one ring can stand
 * inside anything on another, at any size the generator makes.
 */
export function quadrantDistance(room: Room, which: Anchor): number {
  const half = halfSize(room);
  // As far out as the room allows, but never further than leaves the widest
  // furnishing clear of the wall and of the braziers in the corners.
  const roof = Math.min(half - WIDEST - MARGIN, half - CORNER_INSET - CORNER_GAP);
  const far = Math.max(INNER + RING_GAP, Math.min(roof, reach(room, WIDEST + MARGIN)));
  if (which === "far") return far;
  // Near follows far in a room too tight for both, so the two rings never
  // collapse onto each other however small or oddly shaped the room is.
  return Math.max(INNER, Math.min((half * 0.5) / Math.SQRT2, far - RING_GAP));
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
  return Math.max(INNER + RING_GAP, (diagonalReach(room) - inset) / Math.SQRT2);
}

/** The four anchors of a family, one per quadrant, the way this room is turned. */
export function quadrantSpots(room: Room, which: Anchor): Vec3[] {
  const d = quadrantDistance(room, which);
  const o = orientationOf(room);
  return QUADRANTS.map(([sx, sz]) => {
    const [x, z] = orient(sx * d, sz * d, o);
    return [x, GROUND_Y, z];
  });
}

/**
 * How far from the middle the pair either side of it stands.
 *
 * Deliberately not the far ring, which in a large room would put them
 * against the side walls - where things already are. A little beyond the
 * inner ring, so a player going straight through passes between them and
 * the widest furnishing on one still clears the lane it stands beside.
 */
const MIDDLE_DISTANCE = INNER + 0.6;

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
  const along = lanes.z ? Math.PI / 2 : 0;
  if (MIDDLE_DISTANCE > Math.min(floorReach(room, along), floorReach(room, along + Math.PI)) - 1) {
    return [];
  }
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

/**
 * The four corners, where the braziers stand: pulled in far enough not to be
 * in the wall, and always outside the furniture.
 *
 * A shaped room's floor is cut off at the diagonals, which is exactly where
 * these are, so pulling them onto the drawn polygon pulled them inside the
 * far ring - and the room's lights ended up standing in front of its
 * furniture rather than behind it. A table went straight through a brazier
 * in every sixteen-unit circle the generator made.
 *
 * So the polygon is a preference here, not a limit: a brazier sits on the
 * drawn floor when the furniture leaves room for it and on the slab between
 * the floor and the wall when it does not. Which is where a brazier belongs
 * anyway - the walls are the room's box, so that slab reads as the corner
 * of the room. Only the walls are a hard limit.
 */
export function cornerSpots(room: Room): Vec3[] {
  const box = halfSize(room) - CORNER_INSET;
  const onFloor =
    room.shape === "square" ? box : (diagonalReach(room) - CORNER_INSET) / Math.SQRT2;
  const clearOfFurniture = quadrantDistance(room, "far") + CORNER_GAP;
  const c = Math.min(box, Math.max(onFloor, clearOfFurniture));
  const o = orientationOf(room);
  return QUADRANTS.map(([sx, sz]) => {
    const [x, z] = orient(sx * c, sz * c, o);
    return [x, GROUND_Y, z];
  });
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
  const room = { id: "fit", kind: "normal", seed: 0, grid: { x: 0, z: 0 }, size, shape, links: {} } as Room;
  const radius = quadrantDistance(room, "far") * Math.SQRT2;
  return radius <= diagonalReach(room) + 0.6;
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
 * How much clear floor is left between a patch's reach and the wall.
 *
 * The way round is along the walls, and for most of this room's life there
 * was not one. Two of the three patches sat on the gem's own coordinate,
 * and a corner gem in a room sixteen across sits 6.41 out: the patch
 * reaches 1.2 past that, to 7.61, against a wall a player can press to
 * 7.7. Nine centimetres. Flooding the floor from the doorways found the
 * gem walled off in seventy of a hundred and thirteen trap rooms - and the
 * check that was meant to catch it asked whether some point within reach
 * of the gem was outside every patch, which is a place to stand and not a
 * way to get there. There was a clear spot, hard in the corner, with no
 * route to it.
 */
const WALL_CORRIDOR = 0.5;

/**
 * Spikes for a trap room: three patches between the gem and the lanes it
 * is approached from, so the direct line to the reward is the dangerous
 * one and the way round, along the walls, is safe. A patch is never in a
 * lane - in a small room it is pulled back to the lane's edge instead -
 * and never so near a wall that it closes the corridor beside it, so the
 * room is always crossable and the gem always has a safe side.
 */
/**
 * Where to stand to set a bomb against this room's cracked wall: at arm's
 * length from the middle of that wall, inside the room. Null for a room
 * with no crack, or one already opened.
 */
export function crackSpot(room: Room): Vec3 | null {
  if (!room.secret || room.links[room.secret.dir]) return null;
  const half = halfSize(room);
  const step = DIR_STEP[room.secret.dir];
  return [step.x * (half - CLOSE_REACH * 0.7), 0, step.z * (half - CLOSE_REACH * 0.7)];
}

export function trapHazards(room: Room, gem: Vec3): Vec3[] {
  const sx = Math.sign(gem[0]) || 1;
  const sz = Math.sign(gem[2]) || 1;
  const clearance = LANE_HALF_WIDTH + HAZARD_RADIUS;
  const gx = Math.abs(gem[0]);
  const gz = Math.abs(gem[2]);
  const d = Math.max(1.6, Math.min(2.4, Math.min(gx, gz) - clearance));
  const pull = (v: number) => Math.max(clearance, v);
  // Off the wall by a corridor's width, so a player can always come round.
  const wall = halfSize(room) - PLAYER_CAPSULE_RADIUS - HAZARD_RADIUS - WALL_CORRIDOR;
  const off = (v: number) => Math.min(v, wall);
  const patches: [number, number][] = [
    [pull(gx - d), off(gz)],
    [off(gx), pull(gz - d)],
    [pull(gx - d * 0.75), pull(gz - d * 0.75)],
  ];
  return patches
    .filter(([x, z]) => Math.hypot(x - gx, z - gz) >= 0.9)
    .map(([x, z]) => [sx * x, GROUND_Y, sz * z]);
}

