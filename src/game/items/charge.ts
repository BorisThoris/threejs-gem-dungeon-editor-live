import { createRng } from "../rng";
import { ITEM_IDS, type ItemId } from "./catalog";

/**
 * Whether a thing in this dungeon is blessed, plain, or cursed.
 *
 * Borrowed from the oldest roguelikes and cut down to what this game can
 * carry. There it is a hidden property of every individual object and the
 * tension is "this particular potion might be cursed"; here it is a
 * property of a *kind* of thing for the length of one run - in this
 * dungeon the cloudy potion is blessed - and it is visible on sight.
 *
 * Two deliberate departures, and they are the same departure twice.
 *
 * Per kind rather than per object, because the run's other hidden axis is
 * already per kind: which look means which item is shuffled once and holds
 * all run. A second axis rolled per object would mean two unknowns about
 * every bottle, one of which cannot be learned by any amount of playing -
 * you would drink a blessed cloudy potion and know nothing about the next
 * cloudy potion. Knowledge you cannot accumulate is not knowledge, it is
 * noise.
 *
 * Visible rather than hidden, because what it is for is the decision at
 * the chest, and a decision needs something to decide with. "A cursed
 * unknown bottle" is a real question - it is going to go wrong, but wrong
 * how, and is that worth finding out for free? - and "an unknown bottle
 * that may or may not be cursed" is the same coin flip the game already
 * had.
 *
 * So the shape of the run's knowledge is: the look tells you the charge,
 * and only drinking one (or paying the shop) tells you the name.
 */

export const CHARGES = ["blessed", "plain", "cursed"] as const;
export type Charge = (typeof CHARGES)[number];

export type Charges = Record<ItemId, Charge>;

/**
 * How much of a dungeon is charged either way.
 *
 * A fifth each. Most of what a floor holds is ordinary, which is what
 * keeps the marked ones worth reading - a dungeon where half of everything
 * glowed would be a dungeon where the glow means nothing.
 */
const BLESSED_SHARE = 0.2;
const CURSED_SHARE = 0.2;

/**
 * Which kinds are charged which way, for one run. Seeded off the run's
 * seed, so a replayed seed is the same dungeon down to which bottle is the
 * blessed one - the same promise `appearancesFor` makes.
 */
export function chargesFor(seed: number): Charges {
  const rng = createRng(`${seed}:charges`);
  const out = {} as Charges;
  for (const id of ITEM_IDS) {
    const roll = rng();
    out[id] = roll < BLESSED_SHARE ? "blessed" : roll < BLESSED_SHARE + CURSED_SHARE ? "cursed" : "plain";
  }
  return out;
}

/**
 * What a charge does to a number that is simply "more is better".
 *
 * Durations, mostly: a blessed Potion of Swiftness lasts half again as
 * long, a cursed one barely at all. Anything where more is *worse* - how
 * much a bad potion rouses the floor, how long a mire holds - has to be
 * written the other way round at its call site rather than by passing a
 * negative here, because a helper that silently inverts is a helper that
 * will be used wrongly once and never noticed.
 */
export const scaled = (base: number, charge: Charge): number =>
  charge === "blessed" ? base * 1.5 : charge === "cursed" ? base * 0.5 : base;

/** The same, for a thing that is worse the more of it there is. */
export const inverted = (base: number, charge: Charge): number =>
  charge === "blessed" ? Math.max(1, Math.round(base * 0.5)) : charge === "cursed" ? Math.round(base * 1.5) : base;

/** What to call it on a prompt: "a blessed cloudy potion". */
export const chargeWord = (charge: Charge): string => (charge === "plain" ? "" : charge);

/** The one step the shop sells: cursed to plain, plain to blessed. */
export const lifted = (charge: Charge): Charge =>
  charge === "cursed" ? "plain" : charge === "plain" ? "blessed" : "blessed";

/** What the marks are drawn in, wherever an item is shown. */
export const CHARGE_COLOUR: Record<Charge, string> = {
  blessed: "#e0b74a",
  plain: "#7f8794",
  cursed: "#8f5fd0",
};
