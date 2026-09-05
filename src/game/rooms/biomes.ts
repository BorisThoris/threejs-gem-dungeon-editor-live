import type { RoomKind } from "../dungeon/types";
import { createRng } from "../rng";
import type { BuiltinSurface } from "../textures/registry";

/**
 * What a room is made of, as distinct from what it is for.
 *
 * A room's kind said everything about how it looked: one floor colour, one
 * wall colour and one surface per kind, so every chamber in the game was
 * the same grey stone box and the only thing that changed between two of
 * them was where the furniture fell. That is a lot of rooms to walk
 * through - a finished run enters twenty-one to twenty-four of them - and
 * most of them looked like the last one.
 *
 * A biome is the other half of a room: its stone, its damp, its light.
 * Kinds keep their content and their rules; the biome decides what the
 * player is standing in. A trap room can be a dry catacomb or a flooded
 * cistern and it is the same trap room, but it is not the same place.
 *
 * Rolled from the room's own seed, so a room looks the same every time you
 * walk back into it, and two chambers on one floor are usually not the
 * same chamber.
 */
export const BIOMES = [
  "hewn",
  "mossy",
  "catacomb",
  "flooded",
  "foundry",
  "timber",
  "bone",
  "crystal",
] as const;
export type BiomeId = (typeof BIOMES)[number];

export interface Biome {
  /** What to call it, on the tour's screenshots and in the room's own line. */
  name: string;
  floor: string;
  wall: string;
  surface: BuiltinSurface;
  /**
   * What the room's overhead fill is tinted to, and how much of the
   * floor's own fill it gets. A biome may be darker than the floor it sits
   * on but never brighter than twice it: the descent's own light curve is
   * still what decides how deep a floor feels.
   */
  glow: string;
  light: number;
}

export const BIOME: Record<BiomeId, Biome> = {
  hewn: { name: "Hewn stone", floor: "#a9a9b3", wall: "#65656d", surface: "stone", glow: "#8790a8", light: 1 },
  mossy: { name: "Mossy", floor: "#a7b59f", wall: "#6a7167", surface: "moss", glow: "#8fae90", light: 1.05 },
  catacomb: { name: "Catacomb", floor: "#b8ad92", wall: "#6d6758", surface: "brick", glow: "#b09a72", light: 0.95 },
  flooded: { name: "Flooded", floor: "#8d9ea4", wall: "#535f66", surface: "dirt", glow: "#6d90a0", light: 0.8 },
  foundry: { name: "Foundry", floor: "#9a8f8a", wall: "#5c5450", surface: "iron", glow: "#c08050", light: 1.1 },
  timber: { name: "Timbered", floor: "#b3a48d", wall: "#6a6256", surface: "wood", glow: "#bb9a6e", light: 1 },
  bone: { name: "Bone", floor: "#bcb6a8", wall: "#6f6b62", surface: "stone", glow: "#b6b09c", light: 1.05 },
  crystal: { name: "Crystal", floor: "#a59ebb", wall: "#64606f", surface: "stone", glow: "#9a86c8", light: 1.05 },
};

/**
 * Which biomes a kind may be built in.
 *
 * Every kind gets at least two, or it is back to one room per kind. The
 * sets are chosen so the kind still reads: a shop is somewhere someone
 * lives, so it is timbered or dry; the memory chamber keeps its violet
 * because the trial's own crystals are read against the walls; the arena
 * is never timbered, because the arms sweep it.
 */
export const BIOMES_FOR: Record<RoomKind, readonly BiomeId[]> = {
  start: ["mossy", "hewn"],
  end: ["bone", "catacomb", "hewn"],
  normal: ["hewn", "mossy", "catacomb", "flooded", "bone"],
  treasure: ["catacomb", "foundry", "hewn"],
  shop: ["timber", "catacomb"],
  library: ["timber", "catacomb"],
  trap: ["hewn", "flooded", "foundry"],
  arena: ["hewn", "foundry", "bone"],
  memory: ["crystal", "catacomb"],
  challenge: ["catacomb", "hewn", "flooded"],
};

/** Which biome a room is in. The room's own seed decides, once. */
export function biomeIdFor(kind: RoomKind, roomId: string, seed: number): BiomeId {
  const choices = BIOMES_FOR[kind];
  const rng = createRng(`${seed}:${roomId}:biome`);
  return choices[Math.floor(rng() * choices.length)];
}

export const biomeFor = (kind: RoomKind, roomId: string, seed: number): Biome =>
  BIOME[biomeIdFor(kind, roomId, seed)];
