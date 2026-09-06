import type { Dungeon, Room, RoomKind } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { biomeIdFor, type BiomeId } from "../rooms/biomes";
import { placementsFor } from "../rooms/Dressing";

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

/** Rats live in the dry, old and wet places, and never where a puzzle is played. */
const RAT_BIOMES: readonly BiomeId[] = ["catacomb", "bone", "timber", "flooded"];
const RAT_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>(["normal", "treasure", "trap", "arena", "shrine"]);
/** Bats want height and dark: the big crystal, catacomb and bone rooms. */
const ROOST_BIOMES: readonly BiomeId[] = ["crystal", "catacomb", "bone"];
const ROOST_MIN_SIZE = 20;

/** The holes the room's rats live in: corners clear of the furniture, up to three. */
export function ratsFor(room: Room, seed: number): Spot[] {
  if (!RAT_KINDS.has(room.kind)) return [];
  if (!RAT_BIOMES.includes(biomeIdFor(room.kind, room.id, seed))) return [];
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
  if (!ROOST_BIOMES.includes(biomeIdFor(room.kind, room.id, seed))) return null;
  const rng = createRng(`${seed}:${room.id}:roost`);
  if (rng() < 0.2) return null;
  const spread = room.size * 0.3;
  return { x: (rng() - 0.5) * spread, z: (rng() - 0.5) * spread };
}

/** The one room on the floor the moth perches in, or null on a floor with nowhere. */
export function mothRoom(d: Dungeon): string | null {
  const rooms = d.rooms.filter((r) => r.id !== d.startId && r.id !== d.endId && r.kind !== "secret");
  if (!rooms.length) return null;
  const rng = createRng(`${d.seed}:moth`);
  return rooms[Math.floor(rng() * rooms.length)].id;
}
