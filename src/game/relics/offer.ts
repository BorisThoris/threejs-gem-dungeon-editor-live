/**
 * The Offer: what the meta layer is allowed to buy.
 *
 * This was the weakest section of the plan and two unrelated researches
 * attacked it from opposite directions. One said a purchase carries no drop
 * moment, and closed its own shop channel for exactly that reason - the
 * postmortem names the behaviour "Shop, not play." The other said
 * exclusivity is the most forcefully stated condition of
 * knowledge-progression: whatever pays best is what players optimise for,
 * and a purchasable meta-system competes directly with knowing.
 *
 * The resolution is structural and it is not about HOW relics are acquired.
 * In-run power is totally disposable, and the permanent layer buys
 *
 *   OPTIONS AND ODDS, NEVER THE RUN'S POWER.
 *
 * The consequence for us, stated without hedging: six PERMANENT relics
 * bought at a shop inverts that split - the meta layer ends up holding the
 * power - and once all six are bought the run's texture stops changing,
 * which is precisely the trivialisation the split exists to avoid.
 *
 * So: a relic makes better things APPEAR, or makes a kind of room likelier,
 * or improves what a container can hold, or hands the player another
 * choice. A relic never adds a number. And something must stay disposable -
 * the gems buy run-scoped things (bombs, oil, a key, passage) and the
 * relics change the odds those purchases face.
 *
 * THE DESIGN TEST, which every row below has to pass:
 *
 *   State the reward as a sentence about what the player may now DO. If the
 *   only honest sentence is a number, it is a trifecta affix.
 *
 * Our shipped six fail it four times over: "you move a quarter faster",
 * "taking a gem rouses the Warden half as much", "every exit costs one gem
 * less" are numbers wearing names, and two of the remaining three
 * SUBSTITUTE for knowing rather than enabling it - a relic that marks every
 * room holding a gem deletes the reason to look in one.
 *
 * And the warning that lands hardest on us: the trifecta RE-FORMED after
 * that game's own loot overhaul, because mainstat and set bonuses became
 * the new treadmill. Rules-change relics coexisting with stat relics will
 * lose to the stat relics unless the stat axis is deliberately compressed.
 * Ours is not compressed - it is deleted.
 */

export const OFFER_IDS = ["chit", "tally", "rod", "hood", "cant", "cut"] as const;
export type OfferId = (typeof OFFER_IDS)[number];

export interface Offer {
  id: OfferId;
  name: string;
  /**
   * A sentence about what the player may now DO. Checked: no row here may
   * be a number, a percentage or a multiplier.
   */
  does: string;
  /** What it actually biases. Odds, options, or an enabler - never power. */
  kind: "odds" | "options" | "enabler";
  price: number;
}

export const OFFERS: Record<OfferId, Offer> = {
  chit: {
    id: "chit",
    name: "Assayer's Chit",
    does: "You may open a chest and find the thing under the thing.",
    kind: "odds",
    price: 2,
  },
  tally: {
    id: "tally",
    name: "Foreman's Tally",
    does: "You may expect a room that pays where a plain one would have been.",
    kind: "odds",
    price: 2,
  },
  rod: {
    /**
     * The clearest enabler in the set, and the model for the rest: it does
     * nothing at all until the player has felt a draft themselves. It
     * cannot substitute for knowing because it only operates on what is
     * already known - it saves the bomb, not the noticing.
     */
    id: "rod",
    name: "Sounding Rod",
    does: "You may mark a wall you have already felt a draft at, without spending a bomb on it.",
    kind: "enabler",
    price: 3,
  },
  hood: {
    id: "hood",
    name: "Gutter Hood",
    does: "You may read the veins in the walls a band earlier than the dark usually allows.",
    kind: "odds",
    price: 3,
  },
  cant: {
    /**
     * Three offers is a hardcoded constant in the game this is taken from,
     * and it is now evidenced from decompiled data rather than asserted:
     * the loot-choice count returns 3, and the condition that REMOVES one
     * is priced at 2 then 3 heat against 1 heat per rank for +20% enemy
     * damage. Removing a choice is, by the designers' own pricing, a bigger
     * difficulty increase than making enemies hit harder.
     *
     * So a choice is worth buying, and any reduction below three is an
     * explicit difficulty purchase and never a silent economy tuning.
     */
    id: "cant",
    name: "Cutter's Cant",
    does: "You may take the third offer the shop was not going to show you.",
    kind: "options",
    price: 4,
  },
  cut: {
    id: "cut",
    name: "Company Seal",
    does: "You may open any vault on the floor with the one key that was cut.",
    kind: "options",
    price: 4,
  },
};

/**
 * Two relics make a pair, and a pair unlocks a third thing nobody can buy.
 *
 * The property that makes this worth stealing is not the bonus - it is that
 * a duo effect requires prerequisites from two different sources and
 * therefore CANNOT BE NUMERICALLY INFLATED. Its value is categorical: you
 * either have both or you do not, and there is no version of it that is
 * 12% better.
 *
 * What it buys us is retroactive weight: the payoff arrives only if the
 * player's earlier picks happened to line up, which makes a floor-one
 * choice feel consequential on floor three without that choice having been
 * more powerful at the time.
 */
export interface Pair {
  of: readonly [OfferId, OfferId];
  name: string;
  does: string;
}

export const PAIRS: readonly Pair[] = [
  {
    of: ["rod", "hood"],
    name: "The Long Dark",
    does: "A cracked wall shows itself at the Dark band, and not only at nothing at all.",
  },
  {
    of: ["chit", "tally"],
    name: "The Full Count",
    does: "One floor in the run is carrying a hoard it should not be carrying.",
  },
  {
    of: ["cant", "cut"],
    name: "The Books Balance",
    does: "The shop will take the toll's worth in banked gems, once, and say nothing about it.",
  },
] as const;

export const pairFor = (held: readonly OfferId[]): Pair[] =>
  PAIRS.filter((p) => p.of.every((id) => held.includes(id)));

/**
 * The reward mix, as a tuned ratio that DECLINES WITH DEPTH.
 *
 * Every room reward is explicitly typed "this run" or "next run", and the
 * mix is pulled toward a per-biome target: 0.45, then 0.40, then 0.33, with
 * ZERO meta rewards in the final biome. That transplants onto three floors
 * with nothing left over:
 *
 *   floor one may pay toward the next run; FLOOR THREE PAYS ONLY INTO THIS
 *   ONE.
 *
 * Which is also the answer to "why would I not just dive": the deepest
 * floor is the only place the run itself is the whole point.
 */
export const META_SHARE: readonly number[] = [0.45, 0.4, 0];

export const metaShareOn = (floor: number): number =>
  META_SHARE[Math.max(0, Math.min(META_SHARE.length - 1, floor - 1))];

/**
 * Escalation must be ELECTED as well as imposed.
 *
 * Our Coefficient is entirely imposed - depth, dwell and greed push it and
 * the player elects nothing. The fix is not to remove it but to let the
 * player ADD to it deliberately, at a named price for a named payout, with
 * the target rising as they clear it. That is what makes elected difficulty
 * an achievement rather than a setting, and it is the same machinery as the
 * opt-in greed that already feeds the same budget AND the same payout.
 */
export interface Pact {
  id: string;
  name: string;
  /** What the player is taking on. Named, never a slider. */
  costs: string;
  /** What it pays, in the same currency the run already uses. */
  pays: string;
  /** Heat added at the start of every floor. */
  heat: number;
}

export const PACTS: readonly Pact[] = [
  { id: "shortShift", name: "Short Shift", costs: "The floor starts already looking for you.", pays: "Every chest holds a second thing.", heat: 2 },
  { id: "noLamp", name: "No Lamp", costs: "You go down with the flame out.", pays: "The veins are lit from the first room.", heat: 1 },
  { id: "fullCount", name: "Full Count", costs: "The toll rises by one on every floor.", pays: "A vault on every floor, and the key already cut.", heat: 1 },
  { id: "backShift", name: "Back Shift", costs: "The Keeper is on every stair, not only the last.", pays: "What the Keeper stands on is worth taking.", heat: 3 },
] as const;
