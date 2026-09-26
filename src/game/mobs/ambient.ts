import type { Dungeon, Room, RoomKind } from "../dungeon/types";
import { insideRoom, roomSegmentClear, wallEdges } from "../dungeon/footprint";
import { DOOR_WIDTH, WALL_THICKNESS } from "../world";
import { floorHeightAt } from "../worldbuilding/elevation";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { BIOME, biomeIdFor } from "../rooms/biomes";
import { placementsFor } from "../rooms/placements";
import type { MobId } from "./body";
import { batFlightRadius } from "./batFlight";

/**
 * Where the floor's ambient life is. One owner, derived from the room and
 * the seed the same way the furniture is, so the rats a check counts are
 * the rats the room draws and the roost the HUD names is the roost the
 * bats burst from.
 */
export interface Spot {
  x: number;
  z: number;
}
export interface RatHome extends Spot {
  shelter: { x: number; z: number; yaw: number };
}

/**
 * Which biome a creature can live in is the biome's business: each row
 * of `BIOME` lists its `life`, and this asks. The lists of biomes per
 * creature that used to live here were the same fact kept backwards, and
 * a new biome could be added without anything living in it.
 */
const livesHere = (who: MobId, room: Room, seed: number): boolean =>
  BIOME[biomeIdFor(room.kind, room.id, seed, room)].life.includes(who);
/** Rats and toads live where nothing is being played: never in a puzzle. */
const RAT_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>(["normal", "treasure", "trap", "arena", "shrine"]);
/** Bats want height: the big rooms of the biomes that keep them. */
const ROOST_MIN_SIZE = 20;

/** Up to three rat homes on real wall courses, with clear level approaches. */
export function ratsFor(room: Room, seed: number): RatHome[] {
  if (!RAT_KINDS.has(room.kind)) return [];
  if (!livesHere("rat", room, seed)) return [];
  const rng = createRng(`${seed}:${room.id}:rats`);
  const count = rng() < 0.25 ? 0 : 1 + Math.floor(rng() * 3);
  if (!count) return [];
  const solid = placementsFor(room, seed).filter((p) => PROP_SPECS[p.kind].solid);
  const clear: RatHome[] = [];
  for (const edge of wallEdges(room)) {
    for (let along = -edge.length / 2 + 0.8; along <= edge.length / 2 - 0.8; along += 3) {
      const wx = edge.x + (edge.along === "x" ? along : 0), wz = edge.z + (edge.along === "z" ? along : 0);
      if ((room.links[edge.dir] || room.secret?.dir === edge.dir) && Math.abs(edge.along === "x" ? wx : wz) < DOOR_WIDTH / 2 + 0.8) continue;
      for (const sign of [-1, 1]) {
        const nx = edge.along === "z" ? sign : 0, nz = edge.along === "x" ? sign : 0;
        const x = wx + nx, z = wz + nz;
        if (!insideRoom(room, x, z, 0.6) || Math.abs(x) < 2.4 && Math.abs(z) < 2.4) continue;
        const shelter = { x: wx + nx * (WALL_THICKNESS / 2 + 0.04), z: wz + nz * (WALL_THICKNESS / 2 + 0.04), yaw: Math.atan2(nx, nz) };
        if (!roomSegmentClear(room, x, z, shelter.x, shelter.z, 0) ||
          Math.abs(floorHeightAt(room, x, z) - floorHeightAt(room, shelter.x, shelter.z)) > 0.03) continue;
        // The whole approach, not just its endpoint, clears scaled furniture.
        if (solid.some(p => {
          const dx = x - shelter.x, dz = z - shelter.z, length2 = dx * dx + dz * dz;
          const t = Math.max(0, Math.min(1, ((p.x - shelter.x) * dx + (p.z - shelter.z) * dz) / length2));
          return Math.hypot(p.x - shelter.x - t * dx, p.z - shelter.z - t * dz) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.6;
        })) continue;
        clear.push({ x, z, shelter });
      }
    }
  }
  for (let i = clear.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [clear[i], clear[j]] = [clear[j], clear[i]];
  }
  const homes: RatHome[] = [];
  for (const home of clear) {
    if (homes.every(other => Math.hypot(other.x - home.x, other.z - home.z) >= 3)) homes.push(home);
    if (homes.length === count) break;
  }
  return homes;
}

/** Where the room's bats hang, or null: not every big dark room has them. */
export function roostFor(room: Room, seed: number): Spot | null {
  if (room.size < ROOST_MIN_SIZE) return null;
  if (room.kind === "start" || room.kind === "end" || room.kind === "secret") return null;
  if (!livesHere("bat", room, seed)) return null;
  const rng = createRng(`${seed}:${room.id}:roost`);
  if (rng() < 0.2) return null;
  // Ring and elbow chambers can have empty space at their geometric centre.
  // A roost chosen from the bounding square used to hang bats over a sealed
  // core, where even a zero-radius flight orbit clipped through its walls.
  // Keep the original central candidate in ordinary rooms, then search the
  // real floor union for shaped rooms.
  for (let attempt = 0; attempt < 64; attempt++) {
    const spread = room.size * (attempt === 0 ? 0.3 : 0.85);
    const x = (rng() - 0.5) * spread, z = (rng() - 0.5) * spread;
    // The ceiling structure owns real solid airspace. A legal floor point
    // alone can still put the flock inside a corbel; keep only a point that
    // has room for the wing span and a positive orbit.
    if (insideRoom(room, x, z, 1) && batFlightRadius(room, { x, z }) > 0.05) return { x, z };
  }
  return null;
}

/**
 * Where the room's toads sit: two to four spots along the walls, off the
 * door lanes and clear of the furniture, in the wet biomes and never
 * where a puzzle is played.
 */
export function croakersFor(room: Room, seed: number): Spot[] {
  if (!RAT_KINDS.has(room.kind)) return [];
  // Rootwater's moss becomes a wet feeding ground where the actual
  // watercourse cuts it. Dry moss elsewhere keeps its beetle ecology.
  const bankColony = room.waterway && room.district === "gardens" &&
    biomeIdFor(room.kind, room.id, seed, room) === "mossy";
  if (!livesHere("croaker", room, seed) && !bankColony) return [];
  const rng = createRng(`${seed}:${room.id}:croakers`);
  const count = 2 + Math.floor(rng() * 3);
  const solid = placementsFor(room, seed).filter((p) => PROP_SPECS[p.kind].solid);
  const candidates: Spot[] = [];
  // Sample actual wall courses, including shifted wings and inset corners.
  for (const edge of wallEdges(room)) {
    for (let along = -edge.length / 2 + 0.7; along <= edge.length / 2 - 0.7; along += 1.5) {
      for (const sign of [-1, 1]) {
        const x = edge.x + (edge.along === "x" ? along : sign * 1.1);
        const z = edge.z + (edge.along === "z" ? along : sign * 1.1);
        if (Math.abs(x) < 2.4 || Math.abs(z) < 2.4 || !insideRoom(room, x, z, 0.6)) continue;
        if (solid.some(p => Math.hypot(x - p.x, z - p.z) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.5)) continue;
        candidates.push({ x, z });
      }
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const spots: Spot[] = [];
  for (const at of candidates) {
    if (spots.some(s => Math.hypot(at.x - s.x, at.z - s.z) < 1.5)) continue;
    spots.push(at);
    if (spots.length === count) break;
  }
  return spots;
}

/** The one room on the floor the moth perches in, or null on a floor with nowhere. */
export function mothRoom(d: Dungeon): string | null {
  const eligible = d.rooms.filter((r) => r.id !== d.startId && r.id !== d.endId && r.kind !== "secret");
  const habitat = eligible.filter(r => r.district === "gardens");
  const rooms = habitat.length ? habitat : eligible;
  if (!rooms.length) return null;
  const rng = createRng(`${d.seed}:moth`);
  return rooms[Math.floor(rng() * rooms.length)].id;
}
