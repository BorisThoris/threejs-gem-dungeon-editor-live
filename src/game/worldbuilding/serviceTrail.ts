import { DIRS, DIR_STEP, type Dungeon, type Room, type Dir } from "../dungeon/types";
import { doorReach, insideRoom, roomSegmentClear } from "../dungeon/footprint";
import { roomPlaceName } from "../rooms/placeName";

export interface ServiceTrail { route: string[]; hostId: string }

/** The rubbing describes an existing service route, never an invented map
 * connection. A vault or the descending stairs cannot gate this expedition. */
export function serviceTrailFor(rooms: Room[], vaultId: string | null): ServiceTrail | undefined {
  const source = rooms.find(r => r.waterway?.role === "outfall");
  if (!source) return;
  const byId = new Map(rooms.map(r => [r.id, r]));
  const paths = new Map<string, string[]>([[source.id, [source.id]]]);
  for (const [id, path] of paths) {
    const room = byId.get(id)!;
    if (room.secret && path.length >= 2) {
      const at = serviceCatch(room);
      if (at && insideRoom(room, at[0], at[2], 0.5) && roomSegmentClear(room, 0, 0, at[0], at[2], 0.4))
        return { route: path, hostId: room.id };
    }
    for (const next of Object.values(room.links)) if (next && next !== vaultId && byId.get(next)?.kind !== "end" && !paths.has(next))
      paths.set(next, [...path, next]);
  }
}

export function serviceCatch(room: Room): [number, number, number] | null {
  if (!room.secret) return null;
  const step = DIR_STEP[room.secret.dir], reach = doorReach(room, room.secret.dir) - 1.3;
  return [step.x * reach, 1.2, step.z * reach];
}

export function trailDirection(dungeon: Dungeon, room: Room): Dir | undefined {
  const trail = dungeon.serviceTrail;
  if (!trail) return;
  const index = trail.route.indexOf(room.id);
  if (index < 0) return;
  return room.id === trail.hostId ? room.secret?.dir : DIRS.find(dir => room.links[dir] === trail.route[index + 1]);
}

export interface ServiceTrailGuide {
  status: "follow" | "catch" | "return" | "complete" | "lost";
  dir?: Dir;
  destinationId?: string;
  doors?: number;
}

/** The rubbing names its own route. Recovery directions use only rooms the
 * player has visited, never shortcuts through unexplored or locked space. */
export function serviceTrailGuide(dungeon: Dungeon, roomId: string, visited: readonly string[] = []): ServiceTrailGuide {
  const trail = dungeon.serviceTrail, byId = new Map(dungeon.rooms.map(r => [r.id, r]));
  const room = byId.get(roomId), host = trail && byId.get(trail.hostId);
  if (!trail || !room || !host) return { status: "lost" };
  if (host.secret && host.links[host.secret.dir]) return { status: "complete" };
  const index = trail.route.indexOf(roomId), dir = trailDirection(dungeon, room);
  if (dir) return roomId === trail.hostId ? { status: "catch", dir, doors: 0 }
    : { status: "follow", dir, destinationId: trail.route[index + 1], doors: trail.route.length - index - 1 };
  const known = new Set([...visited, roomId]);
  const paths = new Map<string, string[]>([[roomId, [roomId]]]);
  for (const [id, path] of paths) {
    if (id !== roomId && trail.route.includes(id)) {
      const dir = DIRS.find(d => room.links[d] === path[1]);
      if (dir) return { status: "return", dir, destinationId: path[1], doors: path.length - 1 };
    }
    const at = byId.get(id);
    if (!at) continue;
    for (const dir of DIRS) {
      const next = at.links[dir];
      if (!next || !known.has(next) || paths.has(next) || next === dungeon.vaultId || byId.get(next)?.kind === "end") continue;
      paths.set(next, [...path, next]);
    }
  }
  return { status: "lost" };
}

export function serviceTrailText(dungeon: Dungeon, roomId: string, visited: readonly string[] = []): string {
  if (!dungeon.serviceTrail || !dungeon.rooms.some(r => r.id === roomId)) return "";
  const guide = serviceTrailGuide(dungeon, roomId, visited);
  const next = dungeon.rooms.find(r => r.id === guide.destinationId);
  const place = next ? roomPlaceName(next) : "the next hall";
  switch (guide.status) {
    case "complete": return "Service passage opened · the rubbing is fulfilled.";
    case "catch": return `Maintenance rubbing · press the three-notch catch on the ${guide.dir} wall.`;
    case "follow": return `Follow the three-notch copper marks · ${guide.dir} to ${place} · ${guide.doors} ${guide.doors === 1 ? "door" : "doors"} to the catch.`;
    case "return": return `Maintenance rubbing · ${guide.dir} through ${place} · rejoin the copper trail in ${guide.doors} ${guide.doors === 1 ? "door" : "doors"}.`;
    default: return "Maintenance rubbing · return to the reliquary and follow the three-notch copper trail.";
  }
}
