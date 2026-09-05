import { roomById, type Dungeon, type Room } from "../dungeon/types";

/**
 * Doorways the player has barred, and the floor as the Warden sees it.
 *
 * A bar is an edge, not a room and not a direction: the doorway between
 * two rooms is one thing, and barring it from either side is the same act.
 * The key is the two room ids in sorted order, so `barKey(a, b)` and
 * `barKey(b, a)` are the same string and there is no way to bar one half
 * of a doorway.
 *
 * Nothing here knows about time. Whether a bar is still standing is a
 * deadline on the run's clock and lives in the run store, which hands this
 * module the set of bars that currently hold.
 */

export const barKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** The rooms reachable from `fromId` without crossing any of `bars`. */
export function reachableAround(
  rooms: Room[],
  fromId: string,
  bars: ReadonlySet<string>
): Set<string> {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const seen = new Set([fromId]);
  const queue = [fromId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of Object.values(byId.get(id)?.links ?? {})) {
      if (!next || seen.has(next) || bars.has(barKey(id, next))) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

/**
 * The shortest path that does not cross a bar, or null when every route is
 * barred.
 *
 * Null is the answer that matters: it is what tells the Warden to stop
 * walking round and start breaking. A bar that made a room permanently
 * unreachable would be a hiding place, and the one thing the Warden is
 * for is that there is nowhere to wait.
 */
export function pathAround(
  rooms: Room[],
  fromId: string,
  toId: string,
  bars: ReadonlySet<string>
): string[] | null {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const prev = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === toId) break;
    for (const next of Object.values(byId.get(id)?.links ?? {})) {
      if (!next || prev.has(next) || bars.has(barKey(id, next))) continue;
      prev.set(next, id);
      queue.push(next);
    }
  }
  if (!prev.has(toId)) return null;
  const path: string[] = [];
  for (let id: string | null = toId; id; id = prev.get(id) ?? null) path.unshift(id);
  return path;
}

/**
 * The doorway out of `fromId` that a Warden with no way round has to break
 * through to reach `toId`, or null if it can get there without breaking.
 *
 * Measured on the floor with every bar removed: the first step of the
 * shortest ordinary path. That is the bar it is standing at, which is the
 * one it should be hitting - a Warden that broke a bar three rooms away
 * would be reaching through a wall.
 */
export function barToBreak(
  dungeon: Dungeon,
  fromId: string,
  toId: string,
  bars: ReadonlySet<string>
): string | null {
  if (pathAround(dungeon.rooms, fromId, toId, bars)) return null;
  const open = pathAround(dungeon.rooms, fromId, toId, new Set());
  if (!open || open.length < 2) return null;
  return barKey(open[0], open[1]);
}

/** Whether these two rooms are actually next to each other. */
export function areNeighbours(dungeon: Dungeon, a: string, b: string): boolean {
  const room = roomById(dungeon, a);
  return room ? Object.values(room.links).includes(b) : false;
}
