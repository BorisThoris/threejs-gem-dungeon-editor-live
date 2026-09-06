import { shortestPath } from "../dungeon/generate";
import { DIRS, roomById, type Dir, type Dungeon } from "../dungeon/types";
import { createRng } from "../rng";
import { HARRIER_FROM_FLOOR } from "../world";

/**
 * Where the Harrier is, for the checks and for anything that should not
 * re-render for a thing that moves every frame. Module data, written by
 * the Harrier itself; `roomId` is null while none is mounted.
 */
export const harrierAt: { x: number; z: number; roomId: string | null; down: boolean; away: boolean } = {
  x: 0,
  z: 0,
  roomId: null,
  down: false,
  away: false,
};

/**
 * The room a floor's Harrier roosts in, or null when the floor has none:
 * the room farthest from the start that is not the start, the exit, a shop
 * or the hidden room, ties broken by the seed. One owner of the question,
 * so the HUD can say "a harrier roosts here" and a check can ask where.
 */
export function harrierRoostFor(d: Dungeon, floor: number): string | null {
  if (floor < HARRIER_FROM_FLOOR) return null;
  const depth = new Map<string, number>();
  for (const r of d.rooms) {
    if (r.id === d.startId || r.id === d.endId || r.id === d.secretId || r.kind === "shop") continue;
    const path = shortestPath(d.rooms, d.startId, r.id);
    if (path) depth.set(r.id, path.length);
  }
  if (depth.size === 0) return null;
  const deepest = Math.max(...depth.values());
  const far = [...depth.entries()].filter(([, n]) => n === deepest).map(([id]) => id).sort();
  const rng = createRng(d.seed * 7919 + 17);
  return far[Math.floor(rng() * far.length)];
}

/**
 * The doorway of the player's room the Harrier comes in by: the first step
 * of the shortest path from that room to its roost. Null in the roost
 * itself, where it is simply above you.
 */
export function harrierEntryFor(d: Dungeon, roostId: string, currentId: string): Dir | null {
  if (roostId === currentId) return null;
  const here = roomById(d, currentId);
  if (!here) return null;
  const path = shortestPath(d.rooms, currentId, roostId) ?? [];
  const next = path[1];
  return next ? (DIRS.find((dir) => here.links[dir] === next) ?? null) : null;
}
