import { shapeFits } from "./layout";
import { createRng, pick, shuffle, type Rng } from "../rng";
import { templatesForKind } from "../rooms/templates";
import {
  ROOM_SIZE_DEFAULT,
  ROOM_SIZE_LARGE,
  ROOM_SIZE_SMALL,
} from "../world";
import {
  DIRS,
  DIR_STEP,
  OPPOSITE,
  type Dir,
  type Dungeon,
  type Room,
  type RoomKind,
  type Shape,
} from "./types";

export interface GenerateOptions {
  seed?: number;
  /** Rooms including start and end. */
  minRooms?: number;
  maxRooms?: number;
  /** Chance that two adjacent rooms not already linked get a second doorway. */
  loopChance?: number;
}

/**
 * Special rooms placed at most once per dungeon, in priority order. A small
 * dungeon gets the first few; a large one gets them all and fills the rest
 * with the common kinds.
 */
const ONCE_PER_RUN: RoomKind[] = ["shop", "memory", "challenge", "library", "arena"];
const COMMON: RoomKind[] = ["treasure", "trap", "normal", "treasure", "normal"];

const SIZE_FOR: Partial<Record<RoomKind, number>> = {
  start: ROOM_SIZE_DEFAULT,
  end: ROOM_SIZE_LARGE,
  arena: ROOM_SIZE_LARGE,
  // Spikes need room between the gem and the lanes.
  trap: ROOM_SIZE_DEFAULT,
  shop: ROOM_SIZE_SMALL,
  library: ROOM_SIZE_SMALL,
};

const SHAPES_FOR: Partial<Record<RoomKind, readonly Shape[]>> = {
  arena: ["circle", "octagon"],
  memory: ["hexagon", "octagon"],
  end: ["circle", "octagon", "square"],
  treasure: ["square", "diamond", "hexagon"],
};

const key = (x: number, z: number) => `${x},${z}`;

/**
 * Lay out a dungeon.
 *
 * A random walk on a grid: every new room is dug next to an existing one and
 * linked to it, so the result is connected by construction rather than
 * repaired afterwards. The end room is whichever room is farthest from the
 * start by doorways walked, so the exit is always at the back of the dungeon
 * and never next door to where you begin. Extra doorways between rooms that
 * happen to be adjacent give the map loops, so there is more than one way
 * round.
 *
 * Everything draws from one seeded generator: the same seed is the same
 * dungeon, which is what makes a bug report reproducible.
 */
export function generateDungeon(options: GenerateOptions = {}): Dungeon {
  const seed = options.seed ?? (Math.random() * 0xffffffff) >>> 0;
  const rng = createRng(seed);
  const minRooms = options.minRooms ?? 8;
  const maxRooms = options.maxRooms ?? 12;
  const loopChance = options.loopChance ?? 0.3;

  const target =
    minRooms + Math.floor(rng() * Math.max(1, maxRooms - minRooms + 1));

  const rooms: Room[] = [];
  const occupied = new Map<string, Room>();

  const place = (x: number, z: number, kind: RoomKind): Room => {
    // An authored layout for this kind, when one exists: the template then
    // decides the room's size and shape, and its props replace the seeded
    // dressing. This is how the Room Builder's work reaches a run.
    const authored = templatesForKind(kind);
    const template = authored.length ? pick(rng, authored) : undefined;
    const size = template?.size ?? SIZE_FOR[kind] ?? ROOM_SIZE_DEFAULT;
    // Only shapes with the floor to hold their props at this size.
    const wanted = (SHAPES_FOR[kind] ?? ["square", "square", "circle"]).filter((s) =>
      shapeFits(s, size)
    );
    const room: Room = {
      id: rooms.length === 0 ? "start" : `room_${rooms.length}`,
      kind,
      grid: { x, z },
      size,
      shape: template?.shape ?? (wanted.length ? pick(rng, wanted) : "square"),
      links: {},
      ...(template ? { template: template.id } : {}),
    };
    rooms.push(room);
    occupied.set(key(x, z), room);
    return room;
  };

  const link = (a: Room, b: Room, dir: Dir) => {
    a.links[dir] = b.id;
    b.links[OPPOSITE[dir]] = a.id;
  };

  // The kinds this run will hand out, in the order the walk reaches them.
  const kinds: RoomKind[] = [];
  const specials = shuffle(rng, ONCE_PER_RUN);
  // target - 2 leaves room for start and end.
  for (let i = 0; i < target - 2; i++) {
    kinds.push(i < specials.length ? specials[i] : pick(rng, COMMON));
  }
  const queue = shuffle(rng, kinds);

  place(0, 0, "start");

  let attempts = 0;
  while (rooms.length < target - 1 && attempts < target * 20) {
    attempts++;
    const from = pick(rng, rooms);
    const dir = pick(rng, DIRS);
    const step = DIR_STEP[dir];
    const x = from.grid.x + step.x;
    const z = from.grid.z + step.z;
    if (occupied.has(key(x, z))) continue;
    const kind = queue.pop() ?? "normal";
    link(from, place(x, z, kind), dir);
  }

  // Loops: adjacent rooms the walk did not link.
  for (const room of rooms) {
    for (const dir of DIRS) {
      if (room.links[dir]) continue;
      const step = DIR_STEP[dir];
      const other = occupied.get(key(room.grid.x + step.x, room.grid.z + step.z));
      if (other && rng() < loopChance) link(room, other, dir);
    }
  }

  // The end room hangs off the room farthest from the start, in a free cell
  // next to it; if every neighbour cell is taken, the farthest room itself
  // becomes the end.
  const depth = bfsDepth(rooms, "start");
  const farthest = [...rooms]
    .filter((room) => room.id !== "start")
    .sort((a, b) => (depth.get(b.id) ?? 0) - (depth.get(a.id) ?? 0))[0];

  let endId: string;
  const freeDir = shuffle(rng, DIRS).find((dir) => {
    const step = DIR_STEP[dir];
    return !occupied.has(key(farthest.grid.x + step.x, farthest.grid.z + step.z));
  });
  if (freeDir) {
    const step = DIR_STEP[freeDir];
    const end = place(farthest.grid.x + step.x, farthest.grid.z + step.z, "end");
    link(farthest, end, freeDir);
    endId = end.id;
  } else {
    farthest.kind = "end";
    farthest.size = SIZE_FOR.end ?? ROOM_SIZE_LARGE;
    farthest.shape = pick(
      rng,
      (SHAPES_FOR.end ?? ["square"]).filter((s) => shapeFits(s, farthest.size)) ?? ["square"]
    );
    delete farthest.template;
    endId = farthest.id;
  }

  return { seed, rooms, startId: "start", endId };
}

/** Doorways walked from `startId` to every reachable room. */
export function bfsDepth(rooms: Room[], startId: string): Map<string, number> {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const depth = new Map<string, number>([[startId, 0]]);
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    const room = byId.get(id);
    if (!room) continue;
    for (const next of Object.values(room.links)) {
      if (next && !depth.has(next)) {
        depth.set(next, (depth.get(id) ?? 0) + 1);
        queue.push(next);
      }
    }
  }
  return depth;
}

/** Shortest path of room ids, for tests and the minimap. */
export function shortestPath(
  rooms: Room[],
  fromId: string,
  toId: string
): string[] | null {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const prev = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === toId) break;
    for (const next of Object.values(byId.get(id)?.links ?? {})) {
      if (next && !prev.has(next)) {
        prev.set(next, id);
        queue.push(next);
      }
    }
  }
  if (!prev.has(toId)) return null;
  const path: string[] = [];
  for (let id: string | null = toId; id; id = prev.get(id) ?? null) path.unshift(id);
  return path;
}

export const rngForRoom = (dungeon: Dungeon, room: Room): Rng =>
  createRng(`${dungeon.seed}:${room.id}`);
