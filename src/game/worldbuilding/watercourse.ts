import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { doorReach, insideRoom, roomSegmentClear, wallEdges } from "../dungeon/footprint";
import { placementsFor } from "../rooms/placements";
import { PROP_SPECS } from "../props/specs";
import { reservedAnchors } from "../rooms/kinds";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { GROUND_Y, DOOR_WIDTH, WALL_THICKNESS } from "../world";

export interface Waterway {
  role: "sluice" | "channel" | "outfall";
  /** Fixed on generation, so opening a secret or breaking furniture cannot
   * move an already discovered mechanism to another wall. */
  station?: WaterStation;
  /** Directed downstream; the last room has no outlet. */
  downstream?: Dir;
  upstream?: Dir;
}

export const WATERWAY_NAMES = { sluice: "Sluice house", channel: "Settling gallery", outfall: "Drowned reliquary" };
export const WATER_CACHE_GEMS = 2;
export const WATER_DRAIN_SECONDS = 6;

export interface WaterStation { x: number; z: number; yaw: number; approach: { x: number; z: number } }
const stations = new WeakMap<Room, WaterStation | null>();

/** A wall-mounted mechanism with a clear standing place and approach from the
 * central route. It never adds a free-standing obstacle to the movement model. */
export function waterStation(room: Room): WaterStation | null {
  if (room.waterway?.station) return room.waterway.station;
  if (stations.has(room)) return stations.get(room)!;
  const props = placementsFor(room, room.seed);
  const obstacles = props.filter(p => PROP_SPECS[p.kind].solid)
    .map(p => ({ x: p.x, z: p.z, r: PROP_SPECS[p.kind].radius * (p.scale ?? 1) }));
  const anchors = reservedAnchors(room);
  const candidates: WaterStation[] = [];
  for (const edge of wallEdges(room)) {
    if (edge.length < 1.6) continue;
    for (let along = -edge.length / 2 + 0.8; along <= edge.length / 2 - 0.8; along += 1) {
      const wx = edge.x + (edge.along === "x" ? along : 0);
      const wz = edge.z + (edge.along === "z" ? along : 0);
      // wallEdges describes the boundary; Walls cuts the actual portal from
      // that edge. Never mount a mechanism in that opening or a secret crack.
      if ((room.links[edge.dir] || room.secret?.dir === edge.dir) &&
        Math.abs(edge.along === "x" ? wx : wz) < DOOR_WIDTH / 2 + 0.9) continue;
      for (const sign of [-1, 1]) {
        const nx = edge.along === "z" ? sign : 0, nz = edge.along === "x" ? sign : 0;
        const approach = { x: wx + nx * 1.5, z: wz + nz * 1.5 };
        if (!insideRoom(room, approach.x, approach.z, 0.6) ||
          !roomSegmentClear(room, 0, 0, approach.x, approach.z, 0.5)) continue;
        const length2 = approach.x ** 2 + approach.z ** 2;
        if (obstacles.some(p => {
          const t = Math.max(0, Math.min(1, (p.x * approach.x + p.z * approach.z) / length2));
          return Math.hypot(p.x - t * approach.x, p.z - t * approach.z) < p.r + 0.65;
        }) || anchors.some(a => Math.hypot(a[0] - approach.x, a[2] - approach.z) < 2)) continue;
        candidates.push({ x: wx + nx * (WALL_THICKNESS / 2 + 0.09), z: wz + nz * (WALL_THICKNESS / 2 + 0.09),
          yaw: Math.atan2(nx, nz), approach });
      }
    }
  }
  candidates.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const station = candidates[0] ?? null;
  stations.set(room, station);
  return station;
}

/** Find a long optional expedition through real doors. Endpoints occupy
 * exploration rooms and never require the vault key or a secret wall. */
export function assignWatercourse(rooms: Room[], startId: string, vaultId: string | null) {
  const byId = new Map(rooms.map(r => [r.id, r]));
  const pathsFrom = (source: string) => {
    const paths = new Map<string, string[]>([[source, [source]]]);
    for (const [id, path] of paths) for (const next of Object.values(byId.get(id)!.links)) {
      if (next && next !== vaultId && byId.get(next)?.kind !== "end" && !paths.has(next)) paths.set(next, [...path, next]);
    }
    return paths;
  };
  const accessible = pathsFrom(startId);
  const candidates = rooms.filter(r => ["normal", "treasure", "library", "shrine"].includes(r.kind)
    && accessible.has(r.id) && waterStation(r));
  let best: string[] = [], score = -Infinity;
  for (const source of candidates) {
    const paths = pathsFrom(source.id);
    for (const target of candidates) {
      const path = paths.get(target.id);
      if (!path || path.length < 2) continue;
      const value = path.length + (source.district === "works" ? 2 : 0) + (target.district === "gardens" ? 2 : 0);
      if (value > score) { best = path; score = value; }
    }
  }
  for (let i = 0; i < best.length; i++) {
    const room = byId.get(best[i])!;
    room.waterway = { role: i === 0 ? "sluice" : i === best.length - 1 ? "outfall" : "channel",
      station: i === 0 || i === best.length - 1 ? waterStation(room) ?? undefined : undefined,
      upstream: i > 0 ? DIRS.find(dir => room.links[dir] === best[i - 1]) : undefined,
      downstream: i < best.length - 1 ? DIRS.find(dir => room.links[dir] === best[i + 1]) : undefined };
  }
}

/** Narrow, shallow channels follow the unshifted real door lanes. Their top
 * is paint-depth, so water changes information and discovery, not collision. */
const channelGeometry = new WeakMap<Room, CorridorBlock[]>();
export function watercourseBlocks(room: Room): CorridorBlock[] {
  if (!room.waterway) return [];
  if (channelGeometry.has(room)) return channelGeometry.get(room)!;
  const blocks = [room.waterway.upstream, room.waterway.downstream].filter((d): d is Dir => !!d).map<CorridorBlock>(dir => {
    const length = doorReach(room, dir), horizontal = dir === "east" || dir === "west";
    const sign = dir === "north" || dir === "west" ? -1 : 1;
    return { position: [horizontal ? sign * length / 2 : 0, GROUND_Y + 0.037, horizontal ? 0 : sign * length / 2],
      size: [horizontal ? length : 0.8, 0.008, horizontal ? 0.8 : length] };
  });
  channelGeometry.set(room, blocks);
  return blocks;
}

/** Footstep sound samples the same strips the renderer draws. */
export function waterUnderfoot(room: Room, x: number, z: number, openedAt: number | null, now: number) {
  return waterLevel(openedAt, now) > 0.1 && watercourseBlocks(room).some(b =>
    Math.abs(x - b.position[0]) <= b.size[0] / 2 && Math.abs(z - b.position[2]) <= b.size[2] / 2);
}

export function waterLevel(openedAt: number | null, now: number) {
  return openedAt === null ? 1 : Math.max(0, Math.min(1, 1 - (now - openedAt) / WATER_DRAIN_SECONDS));
}

/** Integrate the falling water level rather than multiplying time by speed:
 * opening the sluice never jumps the ripple phase backwards. Revisited rooms
 * derive the same phase, including after the flow has stopped. */
export function waterTravel(openedAt: number | null, now: number) {
  if (openedAt === null || now <= openedAt) return now;
  const elapsed = Math.min(WATER_DRAIN_SECONDS, now - openedAt);
  return openedAt + elapsed - elapsed * elapsed / (2 * WATER_DRAIN_SECONDS);
}

/** Metre coordinates along the current and across its bank. Incoming strips
 * run from negative distance to zero; outgoing strips run from zero outward.
 * Thus turns share their phase at the junction and ripples always follow the
 * route, independent of channel length, compass direction or plane UVs. */
export function waterFlowUV(room: Room, segment: number, x: number, z: number): [number, number] {
  const route = [room.waterway?.upstream, room.waterway?.downstream].filter((d): d is Dir => !!d);
  const dir = route[segment];
  if (!dir) return [0, 0];
  const sign = room.waterway?.upstream && segment === 0 ? -1 : 1;
  const flow = DIR_STEP[dir];
  return [(x * flow.x + z * flow.z) * sign, (z * flow.x - x * flow.z) * sign];
}
