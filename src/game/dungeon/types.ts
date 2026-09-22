import type { SlotRule, SlottedPlacement } from "../rooms/slots";

/**
 * The dungeon, as data.
 *
 * The old Room type carried forty optional fields - temperature, humidity,
 * airQuality, maxOccupants - and 99 room kinds, of which the game used eight.
 * What is here is exactly what the generator writes, the renderer reads, and
 * the editor edits. Anything a room kind needs beyond this belongs in that
 * kind's component.
 */

export const ROOM_KINDS = [
  "start",
  "end",
  "normal",
  "treasure",
  "shop",
  "library",
  "trap",
  "arena",
  "memory",
  "challenge",
  "shrine",
  "secret",
] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

/**
 * How many sides the floor is drawn with. A square is the room's own box;
 * everything else is a regular polygon inscribed in it.
 */
export const SHAPE_SIDES: Record<Shape, number> = {
  square: 4,
  // `cross` is a rectangle union rather than a polygon. Four is only its
  // cardinal vocabulary; footprint and reach handle its concave outline.
  cross: 4,
  circle: 48,
  hexagon: 6,
  octagon: 8,
  diamond: 4,
  triangle: 3,
};

export const SHAPES = [
  "square",
  "cross",
  "circle",
  "hexagon",
  "octagon",
  "diamond",
  "triangle",
] as const;
export type Shape = (typeof SHAPES)[number];

/**
 * Compass directions on the grid. North is -z, matching a three.js camera at
 * yaw 0 looking down -z, so "walk north" and "look forward" agree.
 */
export const DIRS = ["north", "south", "east", "west"] as const;
export type Dir = (typeof DIRS)[number];

export const OPPOSITE: Record<Dir, Dir> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/** Grid step for each direction. */
export const DIR_STEP: Record<Dir, { x: number; z: number }> = {
  north: { x: 0, z: -1 },
  south: { x: 0, z: 1 },
  east: { x: 1, z: 0 },
  west: { x: -1, z: 0 },
};

/** Camera yaw that faces along a direction. */
export const DIR_YAW: Record<Dir, number> = {
  north: 0,
  south: Math.PI,
  east: -Math.PI / 2,
  west: Math.PI / 2,
};

export const PROP_KINDS = [
  "banner",
  "barrel",
  "bookshelf",
  "candle",
  "chair",
  "chest",
  "crate",
  "crystal",
  "pillar",
  "potion",
  "rubble",
  "skull",
  "statue",
  "table",
  "tile",
  "torch",
  "urn",
  "wall",
  "web",
  "spikes",
] as const;
export type PropKind = (typeof PROP_KINDS)[number];

/** A prop placed in a room, in room-local units with the room centred at 0. */
export interface PropPlacement {
  kind: PropKind;
  x: number;
  z: number;
  /** Radians about y. */
  rotation?: number;
  scale?: number;
}

/**
 * An authored room layout. This is what the Room Builder produces and what
 * the generator can choose to place instead of a seeded dressing.
 */
export interface RoomTemplate {
  id: string;
  /** A composed room can keep the name its layout earned in play and in the atlas. */
  name?: string;
  /** Why the furnishings are arranged this way, for authoring review. */
  story?: string;
  kind: RoomKind;
  size: number;
  shape: Shape;
  props: SlottedPlacement[];
  /**
   * What the placeholders among those props may turn into, resolved once
   * per room from that room's own seed.
   *
   * Optional, and absent on every template written before slots existed:
   * an authored room with no rules resolves to itself, which is the only
   * behaviour that lets the two live side by side.
   */
  slots?: SlotRule[];
  /**
   * The tableau this room tells, by id, when it is one.
   *
   * A room that tells a story in four props and no event - the Law of
   * Closure, which is the whole reason a set piece is worth authoring at
   * all. Held here rather than inferred from the props, because what a
   * room MEANS is the author's claim and not something a reader of the
   * layout could work out.
   */
  tableau?: string;
}

export interface GridPos {
  x: number;
  z: number;
}

export interface Room {
  waterway?: import("../worldbuilding/watercourse").Waterway;
  /** Connected geographical region; generated once with the room graph. */
  district?: import("../rooms/districts").DistrictId;
  /** One graph-selected navigation anchor in each district. */
  landmark?: import("../worldbuilding/landmarks").LandmarkId;
  /** Connected geological band beneath any purpose-specific room lining. */
  stratum?: import("../rooms/biomes").BiomeId;
  biome?: import("../rooms/biomes").BiomeId;
  id: string;
  kind: RoomKind;
  /**
   * The seed of the dungeon this room belongs to.
   *
   * Here because a room's identity is not its id: the generator names the
   * first room of every floor `start` and digs it at the grid origin, so
   * the start room of floor two had the same id and the same grid position
   * as the start room of floor one - and therefore, once rooms were
   * furnished in a seeded orientation, exactly the same furniture in
   * exactly the same corners. A run has three of them and two were always
   * identical, in 120 runs out of 120.
   */
  seed: number;
  grid: GridPos;
  /** Side length of the furnished chamber; corridor wings extend beyond it. */
  size: number;
  /** Chamber footprint, block-cut into shared floor, wall, collision and map geometry. */
  shape: Shape;
  /** Neighbouring room in each direction that has a doorway. */
  links: Partial<Record<Dir, string>>;
  /** Walkable corridor wings beyond the furnished chamber, in metres. */
  wings?: Partial<Record<Dir, number>>;
  /** Optional wider wings, used for the deeper floors' closed side galleries. */
  wingWidths?: Partial<Record<Dir, number>>;
  /** Lateral shifts for closed galleries; linked travel wings stay centred. */
  wingOffsets?: Partial<Record<Dir, number>>;
  /** Closed galleries may end in a block-cut half-round apse. */
  wingProfiles?: Partial<Record<Dir, "apse">>;
  /**
   * A wall with a crack in it, and the room behind it.
   *
   * Deliberately not a link. Links are what the walls cut doorways for,
   * what the minimap draws and what the Warden walks; a secret is none of
   * those until a blast opens it, at which point `revealSecret` moves it
   * into `links` and it becomes a doorway like any other.
   */
  secret?: { dir: Dir; to: string };
  /** Authored layout, when the generator picked one. */
  template?: string;
}

export interface Dungeon {
  serviceTrail?: import("../worldbuilding/serviceTrail").ServiceTrail;
  /** A district landmark's physical route to this floor's sealed history. */
  secretTrail?: import("../worldbuilding/secretTrail").SecretTrail;
  /**
   * The room whose doors are locked, and the room its key lies in.
   *
   * The generator guarantees the locked room is never on the shortest path
   * to the exit and its key is never inside it, so a floor can always be
   * finished without ever opening it - the vault is a detour worth taking,
   * not a wall across the run.
   */
  vaultId: string | null;
  /** The room the map does not show, or null on a floor with nowhere to hide one. */
  secretId: string | null;
  keyRoomId: string | null;
  seed: number;
  rooms: Room[];
  startId: string;
  endId: string;
}

export const roomById = (dungeon: Dungeon, id: string): Room | undefined =>
  dungeon.rooms.find((room) => room.id === id);

export const halfSize = (room: Room): number => room.size / 2;

/** Block-cut width of either arm in a concave cross chamber. */
export const crossArmWidth = (size: number): number =>
  Math.min(size, Math.max(8, Math.round(size * 0.46 / 2) * 2));

/**
 * How far the drawn floor reaches in the worst direction.
 *
 * A square room reaches its half-extent everywhere. Every other shape is a
 * polygon inscribed in that square, so its edges cut the corners off, and
 * anything placed by half-extent alone stands off the coloured floor. This
 * is what anchors are measured against instead.
 */
export function inscribedRadius(room: Room): number {
  const half = halfSize(room);
  if (room.shape === "square") return half;
  if (room.shape === "cross") return crossArmWidth(room.size) / Math.SQRT2;
  return half * Math.cos(Math.PI / SHAPE_SIDES[room.shape]);
}

/**
 * How far the drawn floor reaches in one particular direction.
 *
 * `inscribedRadius` answers for the worst direction, which is the right
 * answer when you do not know which way you are looking - and the wrong one
 * for the anchors, every single one of which is on a diagonal. Holding them
 * to the worst direction cost the game its hexagons: a hexagonal room at
 * sixteen units missed the test by five centimetres, so the generator
 * stopped making one, while the floor under those anchors was a quarter of
 * a unit wider than the test believed.
 *
 * The floor is `CircleGeometry(half, sides)` laid flat, which puts a vertex
 * on the +x axis and one every `2 pi / sides` after it. Between two
 * vertices the edge is a straight line, so the radius runs from the
 * circumradius at a vertex down to the apothem at the middle of an edge -
 * which is what `inscribedRadius` returns.
 */
export function floorReach(room: Room, angle: number): number {
  const half = halfSize(room);
  if (room.shape === "square") {
    // A square room's floor is its own box, not a polygon inscribed in it.
    return Math.min(
      Math.abs(half / Math.cos(angle)),
      Math.abs(half / Math.sin(angle))
    );
  }
  if (room.shape === "cross") {
    const arm = crossArmWidth(room.size) / 2;
    const x = Math.abs(Math.cos(angle)), z = Math.abs(Math.sin(angle));
    const vertical = Math.min(x < 1e-9 ? Infinity : arm / x, z < 1e-9 ? Infinity : half / z);
    const horizontal = Math.min(x < 1e-9 ? Infinity : half / x, z < 1e-9 ? Infinity : arm / z);
    return Math.max(vertical, horizontal);
  }
  const step = (2 * Math.PI) / SHAPE_SIDES[room.shape];
  const off = ((angle % step) + step) % step;
  return (half * Math.cos(Math.PI / SHAPE_SIDES[room.shape])) / Math.cos(off - step / 2);
}

/** How far the floor reaches along the diagonals, where every anchor is. */
export const diagonalReach = (room: Room): number => floorReach(room, Math.PI / 4);
