import { shortestPath } from "../dungeon/generate";
import { crackSpot, doorPosition } from "../dungeon/layout";
import { DIRS, roomById, type Dir, type Dungeon } from "../dungeon/types";

/**
 * Where the wisp is, for the braziers that flare as it passes and for the
 * checks. Module data, written every frame by the wisp and read by things
 * that should not re-render for it.
 */
export const wispAt: { x: number; z: number; roomId: string | null; out: boolean } = {
  x: 0,
  z: 0,
  roomId: null,
  out: false,
};

/** Where the wisp is going: a room, the point in this room it heads for, and the doorway if it is leaving. */
export interface WispTarget {
  roomId: string;
  x: number;
  z: number;
  via: Dir | null;
}

/**
 * What the wisp leads to, from where the player stands: the room behind
 * an unopened cracked wall, else the exit. In that room itself it heads
 * for the crack, or the middle; anywhere else, for the doorway that is
 * the first step of the shortest path there. One owner of the whole
 * question, so a check can ask it without following a light around.
 */
export function wispTargetFor(d: Dungeon, currentId: string): WispTarget | null {
  const here = roomById(d, currentId);
  if (!here) return null;
  const host = d.rooms.find((r) => r.secret && !r.links[r.secret.dir]);
  const goal = host?.id ?? d.endId;
  if (goal === currentId) {
    const spot = crackSpot(here);
    return spot ? { roomId: goal, x: spot[0], z: spot[2], via: null } : { roomId: goal, x: 0, z: 0, via: null };
  }
  const path = shortestPath(d.rooms, currentId, goal) ?? [];
  const at = path.indexOf(currentId);
  const next = at >= 0 ? path[at + 1] : path[0];
  const via = next ? (DIRS.find((dir) => here.links[dir] === next) ?? null) : null;
  if (!via) return null;
  const [dx, , dz] = doorPosition(here, via);
  return { roomId: goal, x: dx * 0.86, z: dz * 0.86, via };
}
