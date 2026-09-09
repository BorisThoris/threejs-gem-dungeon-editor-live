/**
 * The Pledge: escalation the player ELECTS.
 *
 * The Coefficient was entirely imposed. Depth, dwell and greed push it, and
 * the research names that as the gap:
 *
 *   "Our Coefficient is currently ENTIRELY imposed: depth, dwell and greed
 *    push it and the player never elects anything. The fix is not to remove
 *    it but to let the player ADD to it deliberately, at a named price, for
 *    a named payout - with the target rising as they clear it, which is
 *    what makes elected difficulty an achievement rather than a setting."
 *
 * Hades' Pact is the model, verified 3-0: a menu of named, priced
 * conditions the player turns on themselves.
 *
 * Ours is a promise made at the shrine, about the floor you are standing
 * on. Three things make it a pledge rather than a difficulty slider:
 *
 * THE COST LANDS FIRST. Taking one adds heat immediately. The floor is
 * worse from the moment you say so, and the payout is at the stair.
 *
 * IT CANNOT BE TAKEN BACK. Break it and the heat stays and the payout does
 * not come. A promise you can withdraw from is a preference.
 *
 * AND IT IS JUDGED ON WHAT THE RUN ALREADY KNOWS. Every condition here is a
 * fact the run store holds anyway - the lantern was never raised, no
 * doorway was ever barred, nothing came out of the satchel. Nothing is
 * tracked FOR the pledge, which is what stops it becoming a second economy
 * running beside the first.
 */

/** What can be promised. */
export type PledgeId = "unlit" | "unbarred" | "unspent";

/** The facts a floor ends with, which is all a pledge is ever judged on. */
export interface FloorRecord {
  /** The lantern was raised at some point on this floor. */
  raisedLantern: boolean;
  /** A doorway was barred on this floor. */
  barredADoor: boolean;
  /** Something was taken out of the satchel on this floor. */
  spentAnItem: boolean;
}

export interface Pledge {
  id: PledgeId;
  /** What the delver says they will do without. */
  name: string;
  /** The promise, in the delver's own words, for the prompt. */
  vow: string;
  /** What it pays at the stair, in gems. */
  pays: number;
  /** Whether the floor's record kept it. */
  kept: (floor: FloorRecord) => boolean;
}

/**
 * What the shrine will hear.
 *
 * Three, and each gives up one of the three things a delver spends on a
 * floor: light, a door, and what they are carrying. Any two of them can be
 * held at once and the third cannot be reached from them, which is what
 * makes taking a second one a decision rather than an accumulation.
 */
export const PLEDGES: readonly Pledge[] = [
  {
    id: "unlit",
    name: "Unlit",
    vow: "to cross this floor without raising the lantern",
    pays: 3,
    kept: (f) => !f.raisedLantern,
  },
  {
    id: "unbarred",
    name: "Unbarred",
    vow: "to bar no doorway on this floor",
    pays: 2,
    kept: (f) => !f.barredADoor,
  },
  {
    id: "unspent",
    name: "Unspent",
    vow: "to take nothing out of the satchel on this floor",
    pays: 2,
    kept: (f) => !f.spentAnItem,
  },
];

export const pledgeById = (id: PledgeId): Pledge | undefined => PLEDGES.find((p) => p.id === id);

/**
 * What the first pledge of a run costs in heat, and what each one after it
 * costs on top.
 *
 * Rising, and that is the sentence the research turns on: the target has to
 * rise as the player clears it or elected difficulty is a setting rather
 * than an achievement. Kept ones raise the price; broken ones do not,
 * because a promise you failed is not an achievement to price against.
 */
export const FIRST_COST = 2;
export const COST_STEP = 1;

/** What a pledge costs in heat, given how many this run has already kept. */
export const pledgeCost = (kept: number): number => FIRST_COST + COST_STEP * Math.max(0, kept);

/**
 * What is on offer at a font, given what is already promised on this floor
 * and what the run has kept.
 *
 * One at a time per floor. Two promises on one floor would let a player
 * stack the payouts on the floor they were going to walk carefully anyway,
 * and the point is a decision about THIS floor rather than a shopping list.
 */
export const offered = (onThisFloor: PledgeId | null): readonly Pledge[] =>
  onThisFloor ? [] : PLEDGES;

/** Whether the floor's record kept the promise made on it. */
export const wasKept = (id: PledgeId | null, floor: FloorRecord): boolean => {
  const p = id ? pledgeById(id) : undefined;
  return p ? p.kept(floor) : false;
};
