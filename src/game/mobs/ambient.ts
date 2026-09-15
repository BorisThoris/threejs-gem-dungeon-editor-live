import type { Dungeon, Room, RoomKind } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { BIOME, biomeIdFor } from "../rooms/biomes";
import { placementsFor } from "../rooms/placements";
import type { MobId } from "./body";

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

/**
 * Which biome a creature can live in is the biome's business: each row
 * of `BIOME` lists its `life`, and this asks. The lists of biomes per
 * creature that used to live here were the same fact kept backwards, and
 * a new biome could be added without anything living in it.
 */
const livesHere = (who: MobId, room: Room, seed: number): boolean =>
  BIOME[biomeIdFor(room.kind, room.id, seed)].life.includes(who);
/** Rats and toads live where nothing is being played: never in a puzzle. */
const RAT_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>(["normal", "treasure", "trap", "arena", "shrine"]);
/** Bats want height: the big rooms of the biomes that keep them. */
const ROOST_MIN_SIZE = 20;

/** The holes the room's rats live in: corners clear of the furniture, up to three. */
export function ratsFor(room: Room, seed: number): Spot[] {
  if (!RAT_KINDS.has(room.kind)) return [];
  if (!livesHere("rat", room, seed)) return [];
  const rng = createRng(`${seed}:${room.id}:rats`);
  const count = rng() < 0.25 ? 0 : 1 + Math.floor(rng() * 3);
  if (!count) return [];
  const inset = room.size / 2 - 1.4;
  const corners: Spot[] = [
    { x: inset, z: inset },
    { x: -inset, z: inset },
    { x: inset, z: -inset },
    { x: -inset, z: -inset },
  ];
  const solid = placementsFor(room, seed).filter((p) => PROP_SPECS[p.kind].solid);
  const clear = corners.filter(
    (c) => !solid.some((p) => Math.hypot(c.x - p.x, c.z - p.z) < PROP_SPECS[p.kind].radius + 0.6)
  );
  for (let i = clear.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [clear[i], clear[j]] = [clear[j], clear[i]];
  }
  return clear.slice(0, count);
}

/** Where the room's bats hang, or null: not every big dark room has them. */
export function roostFor(room: Room, seed: number): Spot | null {
  if (room.size < ROOST_MIN_SIZE) return null;
  if (room.kind === "start" || room.kind === "end" || room.kind === "secret") return null;
  if (!livesHere("bat", room, seed)) return null;
  const rng = createRng(`${seed}:${room.id}:roost`);
  if (rng() < 0.2) return null;
  const spread = room.size * 0.3;
  return { x: (rng() - 0.5) * spread, z: (rng() - 0.5) * spread };
}

/**
 * Where the room's toads sit: two to four spots along the walls, off the
 * door lanes and clear of the furniture, in the wet biomes and never
 * where a puzzle is played.
 */
export function croakersFor(room: Room, seed: number): Spot[] {
  if (!RAT_KINDS.has(room.kind)) return [];
  if (!livesHere("croaker", room, seed)) return [];
  const rng = createRng(`${seed}:${room.id}:croakers`);
  const count = 2 + Math.floor(rng() * 3);
  const inset = room.size / 2 - 1.1;
  const solid = placementsFor(room, seed).filter((p) => PROP_SPECS[p.kind].solid);
  const spots: Spot[] = [];
  for (let tries = 0; tries < 24 && spots.length < count; tries++) {
    // Along a wall, at an angle that keeps it out of the four door lanes.
    const angle = rng() * Math.PI * 2;
    const x = Math.cos(angle) * inset;
    const z = Math.sin(angle) * inset;
    if (Math.abs(x) < 2.4 || Math.abs(z) < 2.4) continue;
    const at = { x: Math.max(-inset, Math.min(inset, x)), z: Math.max(-inset, Math.min(inset, z)) };
    if (solid.some((p) => Math.hypot(at.x - p.x, at.z - p.z) < PROP_SPECS[p.kind].radius + 0.5)) continue;
    if (spots.some((s) => Math.hypot(at.x - s.x, at.z - s.z) < 1.5)) continue;
    spots.push(at);
  }
  return spots;
}

/** The one room on the floor the moth perches in, or null on a floor with nowhere. */
export function mothRoom(d: Dungeon): string | null {
  const rooms = d.rooms.filter((r) => r.id !== d.startId && r.id !== d.endId && r.kind !== "secret");
  if (!rooms.length) return null;
  const rng = createRng(`${d.seed}:moth`);
  return rooms[Math.floor(rng() * rooms.length)].id;
}
