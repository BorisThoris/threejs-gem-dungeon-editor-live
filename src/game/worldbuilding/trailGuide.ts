import { DIRS, type Dir, type Dungeon } from "../dungeon/types";
import { barKey, pathAround } from "../warden/bars";

export interface LearnedTrail { route: string[]; hostId: string }

export interface TrailGuide {
  status: "follow" | "arrived" | "return" | "detour" | "blocked" | "complete" | "lost";
  dir?: Dir;
  destinationId?: string;
  doors?: number;
}

const NO_BARS: ReadonlySet<string> = new Set();

/** A learned trail supplies its marked route, not knowledge of the whole floor.
 * Detours and recovery use visited rooms only and the ordinary barred-edge
 * path finder. Rejoin beyond any blocked part of the trail, so following the
 * guidance cannot send the player back and forth at a barricade. */
export function learnedTrailGuide(
  dungeon: Dungeon, trail: LearnedTrail | undefined, roomId: string,
  visited: readonly string[] = [], bars: ReadonlySet<string> = NO_BARS,
): TrailGuide {
  const room = dungeon.rooms.find(r => r.id === roomId);
  const host = trail && dungeon.rooms.find(r => r.id === trail.hostId);
  if (!trail || !room || !host?.secret) return { status: "lost" };
  if (host.links[host.secret.dir]) return { status: "complete" };
  if (roomId === host.id) return { status: "arrived", dir: host.secret.dir, doors: 0 };

  const index = trail.route.indexOf(roomId);
  const next = index >= 0 ? trail.route[index + 1] : undefined;
  const dir = next ? DIRS.find(d => room.links[d] === next) : undefined;
  const follow: TrailGuide | null = dir ? { status: "follow", dir, destinationId: next,
    doors: trail.route.length - index - 1 } : null;
  const clearSuffix = (start: number) => trail.route.slice(start, -1)
    .every((id, offset) => !bars.has(barKey(id, trail.route[start + offset + 1])));
  if (follow && clearSuffix(index)) return follow;

  const known = new Set([...visited, roomId]);
  // A vault cannot be an intermediate shortcut, but a delver already inside
  // one can still be guided out through its real entrance.
  const rooms = dungeon.rooms.filter(r => known.has(r.id)
    && (r.id === roomId || (r.id !== dungeon.vaultId && r.kind !== "end")));
  const candidates = trail.route.filter((id, i) => known.has(id) && (index < 0 || i > index) && clearSuffix(i));
  let best: string[] | null = null;
  for (const target of candidates) {
    const path = pathAround(rooms, roomId, target, bars);
    if (path && path.length > 1 && (!best || path.length < best.length)) best = path;
  }
  if (best) {
    const direction = DIRS.find(d => room.links[d] === best[1]);
    if (direction) return { status: index < 0 ? "return" : "detour", dir: direction,
      destinationId: best[1], doors: best.length - 1 };
  }
  // A distant blocked leg does not stop ordinary progress up to that door.
  if (follow && next && !bars.has(barKey(roomId, next))) return follow;
  if (follow) return { status: "blocked", dir, destinationId: next };
  const couldRejoin = trail.route.some(id => known.has(id) && pathAround(rooms, roomId, id, NO_BARS));
  return { status: couldRejoin ? "blocked" : "lost" };
}
