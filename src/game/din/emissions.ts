import { BIOME, biomeIdFor, type Biome } from "../rooms/biomes";
import type { Room } from "../dungeon/types";
import type { Surface, Tag } from "./tags";

/**
 * What the things on this floor declare themselves to be.
 *
 * Read it as a list of statements about objects, not about creatures. A
 * bomb is a pressure wave that moves and breaks things, so it declares
 * [blast], and it is bright and hot and extremely loud besides. Nothing in
 * this file has ever heard of the Warden.
 *
 * The magnitudes are OURS and are the part of the Din with no provenance:
 * the room-graph architecture is transplanted from a game that shipped it,
 * but no source survived verification for per-material loudness numbers or
 * for a speed-to-loudness mapping. Treat every figure as a starting value.
 *
 * One row is a design statement rather than a measurement, and it is the
 * most important row in the table:
 *
 *   gemTaken 0.00 - theft is silent.
 *
 * Stealing and smashing must not feel alike. A player who has learned that
 * the floor does not hear a gem leave its socket has learned the game's
 * actual proposition, which is that you are here to take things quietly
 * and the loud options are all detours.
 */

export interface Emission {
  readonly tags: readonly Tag[];
  readonly magnitude: number;
  /** Whether feet and floor decide how far this carries. */
  readonly underfoot?: boolean;
}

export const EMISSIONS = {
  /** The floor's loudest event, and the only one that declares [blast]. */
  bombBurst: { tags: ["blast", "loud", "bright", "hot"], magnitude: 1.0 },
  /** A ton of iron arriving in a doorway. */
  grateDrop: { tags: ["loud", "metal"], magnitude: 0.7 },
  /** A roost going up: the answer to a noise is a bigger noise. */
  batsRoused: { tags: ["loud"], magnitude: 0.7 },
  /** Staves and hoops giving way. */
  propBroken: { tags: ["loud", "broken"], magnitude: 0.6 },
  /** Wood off stone, and the Warden's own doing half the time. */
  barBroken: { tags: ["loud", "metal"], magnitude: 0.5 },
  /**
   * The key is a heavy piece of cut metal, so dropping it is an event.
   * Briefing a tool as a physical behaviour rather than a genre function
   * is what turns "the thing that opens the vault" into three verbs.
   */
  keyDropped: { tags: ["loud", "metal"], magnitude: 0.5 },
  /** Bolts across a doorway, into whatever is on the far side. */
  dartsFired: { tags: ["loud"], magnitude: 0.4 },
  /** A floor giving way, and everything that was standing on it. */
  pitOpened: { tags: ["loud", "broken"], magnitude: 0.55 },
  /** Wire and a bent sapling. Quieter than you would like, in a good way. */
  snareSprung: { tags: ["loud", "snared"], magnitude: 0.35 },
  /** The one speed that costs something. Scaled by what you are running on. */
  sprint: { tags: ["loud"], magnitude: 0.35, underfoot: true },
  /** Something small, in a hurry, in the dark with you. */
  cutpurse: { tags: ["loud"], magnitude: 0.2 },
  /** Below every threshold in the game, and that is the point of walking. */
  walk: { tags: ["loud"], magnitude: 0.05, underfoot: true },
  /** A vault giving up: hinges, a bar, and a lot of held breath. */
  vaultOpened: { tags: ["loud", "metal"], magnitude: 0.45 },
  /** Setting a bar takes eight seconds of hammering and everyone knows it. */
  doorBarred: { tags: ["loud", "metal", "barred"], magnitude: 0.5 },
  /** Theft is silent. */
  gemTaken: { tags: [], magnitude: 0 },
} as const satisfies Record<string, Emission>;

export type EmissionId = keyof typeof EMISSIONS;

/**
 * Sustained emissions: things that are true while they are true, rather
 * than events that happen and fade.
 *
 * The distinction earns its keep immediately. A raised lantern is not a
 * flash to be forgotten in eight seconds - it is a fact about the room the
 * player is standing in for as long as they hold it, and a moth or a
 * Sentry has to be able to ask about it at any moment, not only on the
 * frame it went up. Impulses decay by half-life; these do not decay at
 * all, and are released by their owner when the condition ends.
 */
export const HELD = {
  /** The lantern, at its current band. Magnitude is set by the glim. */
  lantern: { tags: ["bright", "lit", "hot"], magnitude: 1 },
  /** A lit brazier: a fixture, and the only light you can stand in safely. */
  brazier: { tags: ["bright", "lit", "hot"], magnitude: 0.55 },
  /** The lamplighter, which is brighter than you are and does not know it. */
  wisp: { tags: ["bright", "lit"], magnitude: 0.8 },
  /** What you are holding, which the Cutpurse is interested in. */
  carried: { tags: ["carried"], magnitude: 1 },
  /** The key, specifically: carried, and unmistakably metal. */
  carriedKey: { tags: ["carried", "metal"], magnitude: 1 },
} as const satisfies Record<string, Emission>;

export type HeldId = keyof typeof HELD;

/**
 * The five acoustic classes the eight biome surfaces collapse into.
 *
 * The biome table owns what a floor looks like and how far a sprint
 * through it carries - that number is already there, already tuned, and
 * already shown to the player as "standing water" or "deep moss" before
 * they commit to the dash. The Din reads it rather than keeping a second
 * copy, because two tables that must agree eventually will not.
 */
export const SURFACE_OF: Record<Biome["surface"], Surface> = {
  stone: "stone",
  moss: "moss",
  brick: "tile",
  /**
   * The flooded biome, whose ground the game already calls "standing
   * water". It read as `dirt` until the bomb was given a limit that names
   * water, at which point the limit could never fire: the Din had a
   * surface in its vocabulary that nothing in the dungeon produced. A
   * rule nothing can ask is not a rule.
   */
  dirt: "water",
  iron: "tile",
  wood: "dirt",
};

/** What this room's floor is, in the Din's vocabulary. */
export const surfaceOf = (room: Room): Surface =>
  SURFACE_OF[BIOME[biomeIdFor(room.kind, room.id, room.seed)].surface];

/**
 * How loud this emission is in this room.
 *
 * Only things made by feet on a floor ask the floor. A bomb is as loud in
 * moss as it is on tile, and pretending otherwise would make the one
 * reliable tool in the game situational for no reason a player could read.
 */
export function loudnessIn(id: EmissionId, room: Room): number {
  const emission: Emission = EMISSIONS[id];
  if (!emission.underfoot) return emission.magnitude;
  return emission.magnitude * BIOME[biomeIdFor(room.kind, room.id, room.seed)].carry;
}
