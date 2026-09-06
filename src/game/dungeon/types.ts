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
  circle: 48,
  hexagon: 6,
  octagon: 8,
  diamond: 4,
  triangle: 3,
};

export const SHAPES = [
  "square",
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
  kind: RoomKind;
  size: number;
  shape: Shape;
  props: PropPlacement[];
}

export interface GridPos {
  x: number;
  z: number;
}

export interface Room {
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
  /** Side length of the square the room is built on. */
  size: number;
  /** Outline drawn on the floor inside that square. */
  shape: Shape;
  /** Neighbouring room in each direction that has a doorway. */
  links: Partial<Record<Dir, string>>;
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
  const step = (2 * Math.PI) / SHAPE_SIDES[room.shape];
  const off = ((angle % step) + step) % step;
  return (half * Math.cos(Math.PI / SHAPE_SIDES[room.shape])) / Math.cos(off - step / 2);
}

/** How far the floor reaches along the diagonals, where every anchor is. */
export const diagonalReach = (room: Room): number => floorReach(room, Math.PI / 4);
