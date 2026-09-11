import { createRng, shuffle } from "../rng";
import { OFFERS, OFFER_IDS, pairFor, type OfferId } from "./offer";
import { DASH_SPEED, WALK_SPEED } from "../world";

/**
 * What gems buy besides a way out - and what they are no longer allowed
 * to buy.
 *
 * The six that shipped here failed the plan's own design test four times
 * over. State the reward as a sentence about what the player may now DO;
 * if the only honest sentence is a number, it is a stat affix wearing a
 * name. "You move a quarter faster", "taking a gem rouses the Warden half
 * as much" and "every exit costs one gem less" are numbers. Two of the
 * remaining three were worse than numbers: a chart that marks every room
 * holding a gem deletes the reason to look in one, and a lantern that
 * always shows the Warden deletes the reason to listen. A relic must
 * ENABLE knowing, never substitute for it.
 *
 * The structural fix is not about how relics are acquired. In-run power is
 * disposable and the permanent layer buys OPTIONS AND ODDS, NEVER THE
 * RUN'S POWER - because six permanent relics bought at a shop invert that
 * split, and once all six are bought the run's texture stops changing.
 *
 * So the catalogue is the offer table now, and this file is the thin thing
 * that turns an offer into the question the game actually asks. Every
 * modifier below is a boolean: there is no number here for a relic to
 * raise, which is the compression the plan asks for stated as a type.
 */

export const RELIC_IDS = OFFER_IDS;
export type RelicId = OfferId;

export interface Relic {
  id: RelicId;
  name: string;
  /** One line, in the shop, saying what it does. */
  blurb: string;
  /** Gems, before the floor's mark-up. */
  price: number;
}

/**
 * Built from the offers rather than written twice. The blurb IS the
 * offer's sentence about what the player may now do, so the shop cannot
 * promise something the design test never saw.
 */
export const RELICS: Record<RelicId, Relic> = Object.fromEntries(
  OFFER_IDS.map((id) => [id, { id, name: OFFERS[id].name, blurb: OFFERS[id].does, price: OFFERS[id].price }])
) as Record<RelicId, Relic>;

export interface RunModifiers {
  /**
   * Kept because the pace system asks for them, and no longer touched by
   * anything bought: speed was the clearest number wearing a name, and
   * deleting it is the compression that stops stat relics out-competing
   * rules relics.
   */
  walkSpeed: number;
  dashSpeed: number;
  /** A chest holds the thing under the thing. Odds, not power. */
  chestPaysTwice: boolean;
  /** A room that pays, where a plain one would have been. */
  biasesRooms: boolean;
  /**
   * A draft you have FELT is marked without spending a bomb on it.
   *
   * The clearest enabler in the set and the model for the rest: it does
   * nothing at all until the player has noticed something themselves, so
   * it cannot substitute for knowing. It saves the bomb, not the
   * noticing.
   */
  marksFeltDrafts: boolean;
  /** The veins read a band earlier than the dark usually allows. */
  veinsEarlier: boolean;
  /** The shop shows the third offer it was not going to show. */
  thirdOffer: boolean;
  /** The one key that was cut opens any vault on the floor. */
  anyVault: boolean;
  /**
   * And the pairs: a third effect nobody can buy, which arrives only if
   * the player's earlier picks happened to line up. Its value is
   * categorical - you either have both or you do not - so unlike every
   * number this file used to hold, it cannot be inflated.
   */
  longDark: boolean;
  fullCount: boolean;
  booksBalance: boolean;
  /**
   * The colour of the light the delver carries: the one thing of theirs
   * on screen for a whole run. Ordered, so two that tint it agree on
   * which wins rather than depending on which was bought first.
   */
  lightTint: string;
}

const has = (relics: readonly RelicId[], id: RelicId) => relics.includes(id);

/**
 * Cached on the array identity, because the store hands the same frozen
 * list to every reader on every frame.
 */
const cache = new WeakMap<readonly RelicId[], RunModifiers>();

export function modifiers(relics: readonly RelicId[]): RunModifiers {
  const hit = cache.get(relics);
  if (hit) return hit;
  const computed = compute(relics);
  cache.set(relics, computed);
  return computed;
}

function compute(relics: readonly RelicId[]): RunModifiers {
  const pairs = pairFor(relics).map((p) => p.name);
  return {
    // No relic touches either. The plain figure is the only figure.
    walkSpeed: WALK_SPEED,
    dashSpeed: DASH_SPEED,
    chestPaysTwice: has(relics, "chit"),
    biasesRooms: has(relics, "tally"),
    marksFeltDrafts: has(relics, "rod"),
    veinsEarlier: has(relics, "hood"),
    thirdOffer: has(relics, "cant"),
    anyVault: has(relics, "cut"),
    longDark: pairs.includes("The Long Dark"),
    fullCount: pairs.includes("The Full Count"),
    booksBalance: pairs.includes("The Books Balance"),
    lightTint: has(relics, "hood")
      ? LIGHT_TINT_HOOD
      : has(relics, "cut")
        ? LIGHT_TINT_SEAL
        : LIGHT_TINT_PLAIN,
  };
}

/** The three colours a carried light can be, and nothing else names them. */
export const LIGHT_TINT_PLAIN = "#ffd9a0";
export const LIGHT_TINT_HOOD = "#bcd8ff";
export const LIGHT_TINT_SEAL = "#e2b98a";

/**
 * What an offer costs. The same wherever you meet the shop.
 *
 * It used to charge a gem more per floor down, and that was never measured
 * against what a floor actually holds. A purchase may not leave a player
 * short of the exit, so what the shop really asks for is the price plus
 * the toll: 5 gems on the first floor, 8 on the second, 11 on the third.
 * The floors hold, in guaranteed gems, 5.1, 7.5 and 10.5 - so on the two
 * lower floors the cheapest cost more than the whole floor contained, and
 * on the first it cost every gem on it. Measured over 400 seeds a floor,
 * only 74%, 51% and 50% of them held enough at all.
 *
 * The surcharge was also pulling the same way as the toll, which already
 * rises with depth: an offer on the third floor cost two more gems out of
 * a purse that had to keep four more back. Without it a player who banks
 * a couple on the way down can buy one without stripping a floor bare,
 * which is the decision the shop is for.
 */
export const priceOn = (relic: Relic, _floor: number): number => relic.price;

/**
 * What a shop puts on its shelves, and how many.
 *
 * Extracted from the shop component because the count is a rule and a
 * component is not somewhere a rule can be checked. The Cutter's Cant
 * promises "the third offer the shop was not going to show you" and the
 * shop sliced to two whatever the player held, which made it four gems for
 * nothing - and made the Courier, who BRINGS it and pays two satchel slots
 * for it, strictly worse than every other delver. Now there is one
 * function, the shop draws what it returns, and the layout check holds it
 * to the relic's own sentence.
 *
 * Seeded on the room and the floor, so the same shop offers the same
 * things every time it is walked back into, and the slice grows from the
 * FRONT: buying the Cant adds a third stand rather than rearranging the
 * two already standing there.
 */
export const offeredAt = (
  seed: number,
  roomId: string,
  floor: number,
  held: readonly RelicId[]
): RelicId[] => {
  /**
   * Shuffled WHOLE and filtered after, never filtered and then shuffled.
   *
   * Dropping a relic out of the list before the shuffle draws a different
   * shuffle: the layout check caught 167 of 200 shops rearranging their
   * other stand the moment the Cant was bought - bought AT a shop, so the
   * relic beside it would change identity under the player's hand as they
   * turned round. Shuffling the full six and taking them out afterwards
   * leaves the order of everything else exactly where it was.
   */
  const order = shuffle(createRng(`${seed}:${roomId}:${floor}:shop`), RELIC_IDS);
  const shows = modifiers(held).thirdOffer ? 3 : 2;
  return order.filter((id) => !held.includes(id)).slice(0, shows);
};
