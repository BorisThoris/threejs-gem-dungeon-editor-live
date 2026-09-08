import type { ItemId } from "./catalog";

/**
 * The satchel that resolves.
 *
 * Our players hoard because we told them to. The rule, stated by the studio
 * whose whole genre is unknown consumables:
 *
 *   An unknown consumable earns its slot only if the bad outcome is
 *   interestingly DUAL-SIDED. "If the worst case is pure loss, never
 *   drinking is correct play."
 *
 * We shipped four items whose worst case is pure loss - the floor wakes,
 * your legs go heavy, your map goes dark - so never drinking IS correct
 * play here, and the satchel fills up with things a rational delver will
 * carry to the exit unopened. That is not a difficulty; it is a system that
 * does nothing.
 *
 * The second half comes from somewhere else and is what makes the fix
 * complete: the penalty should be a NAMED TASK CLEARED BY PLAYING, not a
 * subtraction. A flat cost is computed once and forgotten. A task makes the
 * player price their own current fragility, so the same object gives a
 * different correct answer at different moments - which is the whole thing
 * a consumable is for.
 *
 * So every cruel item gets a second edge AND a named cure. Neither is
 * hidden: the edge is stated the moment it lands, because a dual edge the
 * player has to discover across runs is a pure loss in the run they are
 * currently in.
 */

export interface Affliction {
  id: ItemId;
  /** What the delver is told the moment it lands. */
  lands: string;
  /**
   * The other edge. Always stated, never discovered - this is the half
   * that makes drinking a decision rather than a mistake.
   */
  edge: string;
  /** The named task, and what clears it. Cleared by PLAYING, never paid. */
  cure: string;
  clears: { kind: "brazier" | "containers" | "floor" | "pickup"; count: number };
}

export const AFFLICTIONS: readonly Affliction[] = [
  {
    /**
     * Was: "your map goes dark for a while", which is a subtraction with no
     * upside at all. Now it is the darkness bargain, imposed rather than
     * chosen - and imposed darkness pays exactly what chosen darkness pays,
     * which is the point.
     */
    id: "gloom",
    lands: "The dark clings to you.",
    edge: "Your glim is nothing: the watchers lose you, and the veins show in the walls.",
    cure: "Stand in the light of a brazier.",
    clears: { kind: "brazier", count: 1 },
  },
  {
    /**
     * Was: "your legs go heavy", pure loss. Heavy legs are also quiet legs,
     * which is a thing this game already has a whole vocabulary for - the
     * edge is written in the Din's units because it IS a Din write.
     */
    id: "mire",
    lands: "Your hands shake and your legs go heavy.",
    edge: "You cannot hurry, and nothing hears you: every footfall is a fifth as loud.",
    cure: "Work your hands loose on three containers.",
    clears: { kind: "containers", count: 3 },
  },
  {
    /**
     * Was: "the floor wakes, the Warden knows where you are" - the worst of
     * the four, because it is the only one that can end a run outright. Now
     * the thing that followed you is a NOISE SOURCE THAT IS NOT WHERE YOU
     * ARE, which under the Din makes it the best lure in the game and the
     * reason to drink an unknown potion in a room you want emptied.
     */
    id: "dread",
    lands: "Something followed you out of the dark.",
    edge: "It is loud, and it is never quite where you are. Everything that hears goes to it.",
    cure: "Leave the floor. It does not use stairs.",
    clears: { kind: "floor", count: 1 },
  },
  {
    /**
     * Was a device whose own blurb said it hurt you. It is a knot of loose
     * iron: dropped, it is [loud] where it LANDS rather than where you
     * stand, which is the entire difference between a punishment and a
     * tool, and it needed no new code to become one - only the Din.
     */
    id: "rattle",
    lands: "The satchel goes over and the iron spills.",
    edge: "The fall is the loudest honest noise you can make, and it is over there.",
    cure: "Pick it up again.",
    clears: { kind: "pickup", count: 1 },
  },
] as const;

export const afflictionFor = (id: string): Affliction | undefined =>
  AFFLICTIONS.find((a) => a.id === id);

/**
 * Identification RESOLVES, and that is a feature.
 *
 * "It is a feature, not a bug, that most consumables are identified by
 * around midgame." In a twenty-minute run this is decisive: a kind
 * identified once stays known for the rest of the run, and knowing every
 * draught becomes a deed rather than a state the player never reaches.
 *
 * What the shop sells afterwards is SPEED OF RESOLUTION, not permanent
 * knowledge - a much better thing to sell, because it is bought when it is
 * useful rather than owned forever.
 */
export const IDENTIFICATION_RESOLVES = true;

/**
 * And knowledge-checking is never priced with a consumable or a penalty.
 *
 * Two studios in two genres found the same failure. The designer who
 * rejected limiting or punishing guesses put the reason plainly: "I'd
 * expect people to just not make guesses until the very end" - which is
 * exactly why our potions rot in the satchel.
 *
 * The shipped answer there was BATCHED, LOCKING VALIDATION: name any three
 * at once, and the three lock in together. Guessing costs more than
 * deducing because a wrong guess in the batch wastes the two right ones
 * beside it, and nothing costs a resource at all.
 */
export const BATCH = 3;
