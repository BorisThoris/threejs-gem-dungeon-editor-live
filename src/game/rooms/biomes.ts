import type { PropKind } from "../dungeon/types";
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
  /**
   * What this biome leaves lying about, over and above the kind's own
   * furniture. Scattered on anchors the arrangement did not want, and held
   * to exactly the rules everything else in the room is - clear of the
   * door lanes, the gem, the spikes, the watcher and the kind's content -
   * so a biome can never make a room unwalkable.
   *
   * Two or three of these is the difference between a room that is tinted
   * blue and a room that reads as flooded.
   */
  litter: readonly PropKind[];
  /**
   * How far a sprint through this room carries, as a share of
   * `NOISE_HOLD_S`.
   *
   * Running is the one speed in the game that costs something: it tells
   * the Warden which room you are in and keeps telling it for a few
   * seconds after you stop. That was the same few seconds everywhere,
   * which meant the eight biomes were a paint job - a flooded cistern and
   * a bed of moss played identically and only looked different.
   *
   * They do not sound the same. Moss swallows a footfall, standing water
   * throws it down every corridor, and a floor of old bone announces you
   * whatever you do. One number per biome, and the dash becomes a
   * question the room asks rather than one answer the player memorises:
   * cross the moss at a run, and think twice at the water's edge.
   */
  carry: number;
  /**
   * What the HUD calls the floor of this room, and what that floor does
   * to a run. The player has to be able to make the decision *before* the
   * dash, so the room says what it is made of rather than leaving it to
   * be learned by being caught.
   */
  ground: string;
}

/**
 * Props a biome may never scatter, because a room kind uses them to mean
 * something.
 *
 * The crystal biome littered `crystal`, and the memory chamber is drawn in
 * the crystal biome - so the trial whose whole mechanism is "choose the
 * four crystals in the order they lit" got extra crystals strewn around it
 * that light up never and mean nothing. A chest is worse: `Chests` reads
 * the placement list and makes every `chest` in it lootable, so a biome
 * that scattered one would be handing out free items.
 */
export const NEVER_LITTER: readonly PropKind[] = ["crystal", "candle", "spikes", "chest"];

export const BIOME: Record<BiomeId, Biome> = {
  hewn: { name: "Hewn stone", floor: "#a9a9b3", wall: "#65656d", surface: "stone", glow: "#8790a8", light: 1, litter: ["rubble", "pillar"], carry: 1, ground: "bare stone" },
  mossy: { name: "Mossy", floor: "#a7b59f", wall: "#6a7167", surface: "moss", glow: "#8fae90", light: 1.05, litter: ["web", "rubble"], carry: 0.5, ground: "deep moss" },
  catacomb: { name: "Catacomb", floor: "#b8ad92", wall: "#6d6758", surface: "brick", glow: "#b09a72", light: 0.95, litter: ["skull", "urn"], carry: 1, ground: "dry brick" },
  flooded: { name: "Flooded", floor: "#8d9ea4", wall: "#535f66", surface: "dirt", glow: "#6d90a0", light: 0.8, litter: ["rubble", "barrel"], carry: 1.75, ground: "standing water" },
  foundry: { name: "Foundry", floor: "#9a8f8a", wall: "#5c5450", surface: "iron", glow: "#c08050", light: 1.1, litter: ["crate", "barrel"], carry: 1.25, ground: "iron grating" },
  timber: { name: "Timbered", floor: "#b3a48d", wall: "#6a6256", surface: "wood", glow: "#bb9a6e", light: 1, litter: ["crate", "chair"], carry: 1.25, ground: "loose boards" },
  bone: { name: "Bone", floor: "#bcb6a8", wall: "#6f6b62", surface: "stone", glow: "#b6b09c", light: 1.05, litter: ["skull", "statue"], carry: 1.5, ground: "old bone" },
  crystal: { name: "Crystal", floor: "#a59ebb", wall: "#64606f", surface: "stone", glow: "#9a86c8", light: 1.05, litter: ["urn", "rubble"], carry: 1, ground: "swept stone" },
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
  // Flooded as well as dry, because the room that most tempts a player to
  // grab and run is the one where running is loudest: a drowned strongroom
  // makes the haul a decision rather than a pickup. Without it the three
  // treasure biomes were 1, 1.25 and 1, which is one room in three coats.
  treasure: ["catacomb", "foundry", "hewn", "flooded"],
  shop: ["timber", "catacomb"],
  library: ["timber", "catacomb"],
  trap: ["hewn", "flooded", "foundry"],
  arena: ["hewn", "foundry", "bone"],
  memory: ["crystal", "catacomb"],
  challenge: ["catacomb", "hewn", "flooded"],
  shrine: ["catacomb", "bone", "crystal"],
};

/** Which biome a room is in. The room's own seed decides, once. */
export function biomeIdFor(kind: RoomKind, roomId: string, seed: number): BiomeId {
  const choices = BIOMES_FOR[kind];
  const rng = createRng(`${seed}:${roomId}:biome`);
  return choices[Math.floor(rng() * choices.length)];
}

export const biomeFor = (kind: RoomKind, roomId: string, seed: number): Biome =>
  BIOME[biomeIdFor(kind, roomId, seed)];
