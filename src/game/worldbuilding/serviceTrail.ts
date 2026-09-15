import { DIRS, DIR_STEP, type Dungeon, type Room, type Dir } from "../dungeon/types";
import { doorReach, insideRoom, roomSegmentClear } from "../dungeon/footprint";

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

export function serviceTrailText(dungeon: Dungeon, roomId: string): string {
  const trail = dungeon.serviceTrail, room = dungeon.rooms.find(r => r.id === roomId);
  if (!trail || !room) return "";
  const host = dungeon.rooms.find(r => r.id === trail.hostId);
  if (host?.secret && host.links[host.secret.dir]) return "Service passage opened · the rubbing is fulfilled.";
  const dir = trailDirection(dungeon, room);
  if (!dir) return "Maintenance rubbing · return to the reliquary and follow the three-notch copper trail.";
  return room.id === trail.hostId ? `Maintenance rubbing · press the three-notch catch on the ${dir} wall.`
    : `Maintenance rubbing · follow the three-notch copper marks through the ${dir} door.`;
}
