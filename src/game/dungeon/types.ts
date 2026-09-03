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
  "barrel",
  "bookshelf",
  "candle",
  "chair",
  "chest",
  "crystal",
  "pillar",
  "potion",
  "skull",
  "table",
  "tile",
  "torch",
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
  grid: GridPos;
  /** Side length of the square the room is built on. */
  size: number;
  /** Outline drawn on the floor inside that square. */
  shape: Shape;
  /** Neighbouring room in each direction that has a doorway. */
  links: Partial<Record<Dir, string>>;
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
