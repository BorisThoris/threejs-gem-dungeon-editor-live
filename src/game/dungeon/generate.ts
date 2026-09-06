import { shapeFits } from "./layout";
import { createRng, pick, shuffle } from "../rng";
import { templatesForKind } from "../rooms/templates";
import {
  ROOM_SIZE_DEFAULT,
  ROOM_SIZE_HUGE,
  ROOM_SIZE_LARGE,
  ROOM_SIZE_SMALL,
  ROOM_SIZES,
  floorRules,
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
  /**
   * Rooms including start and end. How big a floor is belongs to the floor,
   * so callers pass `floorRules(floor)`; the default is the first floor's,
   * for the editor and for anything asking for "a dungeon".
   */
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
const ONCE_PER_RUN: RoomKind[] = ["shop", "shrine", "memory", "challenge", "library", "arena"];
const COMMON: RoomKind[] = ["treasure", "trap", "normal", "treasure", "normal"];

/**
 * How big a room of each kind may be, low to high, in metres.
 *
 * This was one number per kind, so every room of a kind was the same room:
 * over 13,996 generated rooms there were three distinct sizes in the whole
 * game and 65.7% of them were the same sixteen-metre box. A range makes two
 * treasure rooms on one floor different places to walk into, and it is what
 * lets the pointier shapes exist at all - a diamond needs twenty metres to
 * hold its outer ring of props and a triangle twenty-eight, so both were
 * declared in `SHAPES_FOR` and neither had ever once been built.
 *
 * The bounds are what each kind's own content needs, not taste: the shop
 * and the library are small because a counter and a lectern read better
 * close to; the trap room needs floor between the gem and the door lanes;
 * the arena has to hold a sweep its arms can turn through.
 */
const SIZE_RANGE: Record<RoomKind, readonly [number, number]> = {
  start: [ROOM_SIZE_DEFAULT, 18],
  end: [22, 28],
  arena: [ROOM_SIZE_LARGE, ROOM_SIZE_HUGE],
  // Spikes need room between the gem and the lanes.
  trap: [ROOM_SIZE_DEFAULT, 20],
  shop: [ROOM_SIZE_SMALL, 18],
  library: [ROOM_SIZE_SMALL, 18],
  treasure: [ROOM_SIZE_DEFAULT, ROOM_SIZE_LARGE],
  memory: [ROOM_SIZE_DEFAULT, 22],
  challenge: [ROOM_SIZE_DEFAULT, 22],
  normal: [ROOM_SIZE_SMALL, 22],
  // Small and close: a shrine is a place you kneel at, not a hall.
  shrine: [ROOM_SIZE_SMALL, 18],
};

/** The sizes on the ladder a kind may be built at. */
const sizesFor = (kind: RoomKind): number[] => {
  const [lo, hi] = SIZE_RANGE[kind];
  return ROOM_SIZES.filter((s) => s >= lo && s <= hi);
};

/**
 * The shapes a kind may be drawn as, before `shapeFits` has its say.
 *
 * Every entry here is filtered against the size the room actually rolled,
 * so a kind may list a shape it can only have at the top of its range -
 * which is the point. The triangle needs twenty-eight metres and was in no
 * kind's list at all, so the game declared six shapes and built four.
 */
const SHAPES_FOR: Partial<Record<RoomKind, readonly Shape[]>> = {
  arena: ["circle", "octagon", "triangle"],
  memory: ["hexagon", "octagon"],
  end: ["circle", "octagon", "square", "triangle"],
  treasure: ["square", "diamond", "hexagon"],
  // Round or many-sided, so it reads as built for something.
  shrine: ["hexagon", "octagon", "circle"],
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
  const minRooms = options.minRooms ?? floorRules(1).minRooms;
  const maxRooms = options.maxRooms ?? floorRules(1).maxRooms;
  const loopChance = options.loopChance ?? 0.3;

  const target =
    minRooms + Math.floor(rng() * Math.max(1, maxRooms - minRooms + 1));

  const rooms: Room[] = [];
  const occupied = new Map<string, Room>();

  const place = (x: number, z: number, kind: RoomKind): Room => {
    // An authored layout for this kind, when one exists and the room's own
    // number picks it: the template then decides the room's size and shape,
    // and its props replace the seeded dressing. This is how the Room
    // Builder's work reaches a run.
    //
    // The seeded arrangement is one of the options rather than a fallback.
    // Preferring a template whenever one existed meant a single authored
    // treasure room made every treasure room that room - and the two
    // seeded treasure arrangements became code nothing could reach.
    const authored = templatesForKind(kind);
    const template = authored.length ? pick(rng, [undefined, ...authored]) : undefined;
    const size = template?.size ?? pick(rng, sizesFor(kind));
    // Only shapes with the floor to hold their props at this size.
    const wanted = (SHAPES_FOR[kind] ?? ["square", "square", "circle"]).filter((s) =>
      shapeFits(s, size)
    );
    const room: Room = {
      id: rooms.length === 0 ? "start" : `room_${rooms.length}`,
      kind,
      seed,
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
    farthest.size = pick(rng, sizesFor("end"));
    farthest.shape = pick(
      rng,
      (SHAPES_FOR.end ?? ["square"]).filter((s) => shapeFits(s, farthest.size)) ?? ["square"]
    );
    delete farthest.template;
    endId = farthest.id;
  }

  // One vault, locked, and a key somewhere else on the floor.
  //
  // The vault is only ever a treasure room off the shortest path to the
  // exit, so a player who never finds the key can still finish the floor,
  // and the key is only ever in a room that is not the vault - which is
  // enough, because the vault is the only locked door on the floor and
  // every other room is therefore freely reachable.
  const critical = new Set(shortestPath(rooms, "start", endId) ?? []);
  // Off the critical path is not enough: a room can be off the shortest
  // route and still be the only way through to the far side of the floor.
  // The lock only goes on a room the floor can be walked without.
  const canSpare = (room: Room) => {
    const seen = reachableWithout(rooms, "start", room.id);
    return seen.has(endId) && seen.size === rooms.length - 1;
  };
  const eligible = rooms.filter(
    (room) =>
      room.id !== "start" &&
      room.id !== endId &&
      !critical.has(room.id) &&
      canSpare(room)
  );
  // A vault reads best as a treasure room; a plain chamber will do rather
  // than have no lock on the floor at all.
  const vaults = eligible.filter((room) => room.kind === "treasure");
  const vault = vaults.length ? pick(rng, vaults) : eligible.length ? pick(rng, eligible) : null;
  const keyRoom = vault
    ? pick(
        rng,
        rooms.filter((room) => room.id !== vault.id && room.id !== endId)
      )
    : null;

  return {
    seed,
    rooms,
    startId: "start",
    endId,
    vaultId: vault?.id ?? null,
    keyRoomId: keyRoom?.id ?? null,
  };
}

/**
 * Every room reachable from `startId` with `skipId` shut.
 *
 * Not `bfsDepth` with the room filtered out: that records a room the moment
 * a neighbour points at it, so a shut door still counted as walked through.
 * This is what decides whether a room is safe to lock.
 */
export function reachableWithout(rooms: Room[], startId: string, skipId: string): Set<string> {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const seen = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of Object.values(byId.get(id)?.links ?? {})) {
      if (!next || next === skipId || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
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

