import { DIRS, type Dir, type Dungeon, type Room } from "./types";
import { pathAround } from "../warden/bars";

/** The chart and route planner share exactly the doorways the delver learned.
 * Seeing two rooms does not teach the passage between them. A reported nest
 * teaches its location, not a route through unexplored rooms. */
export function knownFloorGraph(
  dungeon: Dungeon, visited: readonly string[], mapped: boolean, nestId: string | null,
): Room[] {
  const seen = new Set(visited);
  const known = new Set(mapped ? dungeon.rooms.map(room => room.id) : visited);
  for (const room of dungeon.rooms) if (seen.has(room.id)) {
    for (const to of Object.values(room.links)) if (to) known.add(to);
  }
  if (nestId) known.add(nestId);
  return dungeon.rooms.filter(room => known.has(room.id)).map(room => ({ ...room,
    links: Object.fromEntries(Object.entries(room.links).filter(([, to]) =>
      to && known.has(to) && (mapped || seen.has(room.id) || seen.has(to)))),
  }));
}

export interface KnownRoute {
  status: "follow" | "arrived" | "blocked" | "unknown";
  rooms: string[];
  dir?: Dir;
}

/** Use the game's ordinary shortest-path owner. Vaults and descending stairs
 * can be destinations, never shortcuts on a return trip. */
export function knownRoute(
  graph: Room[], from: string, to: string, vaultId: string | null | undefined,
  bars: ReadonlySet<string>,
): KnownRoute {
  const rooms = graph.filter(room => room.id === from || room.id === to
    || (room.id !== vaultId && room.kind !== "end"));
  if (!rooms.some(room => room.id === from) || !rooms.some(room => room.id === to))
    return { status: "unknown", rooms: [] };
  const path = pathAround(rooms, from, to, bars);
  if (!path) return { status: pathAround(rooms, from, to, new Set()) ? "blocked" : "unknown", rooms: [] };
  if (path.length === 1) return { status: "arrived", rooms: path };
  const dir = DIRS.find(dir => rooms.find(room => room.id === from)?.links[dir] === path[1]);
  return { status: "follow", rooms: path, dir };
}

export function knownRouteText(route: KnownRoute, brief = false): string {
  if (route.status === "arrived") return "you are here";
  if (route.status === "blocked") return brief ? "blocked · check map" : "known route blocked · recover a barricade or wait for the grate";
  if (route.status === "unknown") return brief ? "explore to connect" : "explore to learn a connecting route";
  const doors = route.rooms.length - 1;
  if (brief) return `${route.dir} · ${doors} ${doors === 1 ? "door" : "doors"}`;
  return `${route.dir} first · ${doors} ${doors === 1 ? "doorway" : "doorways"}`;
}
