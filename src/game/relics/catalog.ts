import { DASH_SPEED, WALK_SPEED } from "../world";

/**
 * Relics: what gems buy besides a way out.
 *
 * Before these, the shop sold lives and nothing else, so a gem was worth
 * exactly one third of a door. A relic is bought once and changes the rules
 * of the whole run, which is what makes holding a gem back a decision
 * rather than an oversight.
 *
 * Every effect a relic has is computed here, in `modifiers`. Nothing else
 * asks "do I hold the boots" - it asks the modifiers what the walk speed is.
 */

export const RELIC_IDS = ["lantern", "chart", "boots", "charm", "censer", "ledger"] as const;
export type RelicId = (typeof RELIC_IDS)[number];

export interface Relic {
  id: RelicId;
  name: string;
  /** One line, in the shop, saying what it does. */
  blurb: string;
  /** Gems, before the floor's mark-up. */
  price: number;
}

export const RELICS: Record<RelicId, Relic> = {
  lantern: {
    id: "lantern",
    name: "Warden's Lantern",
    blurb: "You always know which room the Warden is in.",
    price: 2,
  },
  chart: {
    id: "chart",
    name: "Robber's Chart",
    blurb: "Rooms that still hold a gem are marked on the map.",
    price: 2,
  },
  boots: {
    id: "boots",
    name: "Soft Boots",
    blurb: "You move a quarter faster, walking or running.",
    price: 3,
  },
  charm: {
    id: "charm",
    name: "Bone Charm",
    blurb: "The first hit you take on each floor costs nothing.",
    price: 3,
  },
  censer: {
    id: "censer",
    name: "Ash Censer",
    blurb: "Taking a gem rouses the Warden half as much.",
    price: 4,
  },
  ledger: {
    id: "ledger",
    name: "Toll Ledger",
    blurb: "Every exit costs one gem less.",
    price: 4,
  },
};

export interface RunModifiers {
  walkSpeed: number;
  dashSpeed: number;
  /** Gems off every floor's toll. */
  tollDiscount: number;
  /** Alarm raised by one gem. */
  alarmPerGem: number;
  /** The Warden's room is always known. */
  showsWarden: boolean;
  /** Rooms holding a gem are marked. */
  showsGems: boolean;
  /** The first hit on each floor is free. */
  freeHitPerFloor: boolean;
  /**
   * The colour of the light the delver carries.
   *
   * The one thing of theirs that is on screen for the whole run, and
   * until now it said nothing about them: a player who bought the
   * Warden's Lantern on floor one had no sign of it afterwards but a
   * line in the HUD, and the Ash Censer none at all. A relic that is
   * worn reads at a glance and costs nothing to draw.
   *
   * Ordered, so two relics that both tint it agree on which wins rather
   * than depending on the order they were bought in: the Warden's
   * Lantern is a cold light and takes precedence, because it is the one
   * a player is watching the room with.
   */
  lightTint: string;
}

const has = (relics: readonly RelicId[], id: RelicId) => relics.includes(id);

/**
 * Cached per relics array. The store replaces that array only when a relic
 * is taken, so this hands back the same object on every other call - which
 * is what lets a React selector return it without re-rendering forever.
 */
const cache = new WeakMap<readonly RelicId[], RunModifiers>();

/** Everything the player's relics do, in one place. */
export function modifiers(relics: readonly RelicId[]): RunModifiers {
  const hit = cache.get(relics);
  if (hit) return hit;
  const computed = compute(relics);
  cache.set(relics, computed);
  return computed;
}

function compute(relics: readonly RelicId[]): RunModifiers {
  const swift = has(relics, "boots") ? 1.25 : 1;
  return {
    walkSpeed: WALK_SPEED * swift,
    dashSpeed: DASH_SPEED * swift,
    tollDiscount: has(relics, "ledger") ? 1 : 0,
    alarmPerGem: has(relics, "censer") ? 0.5 : 1,
    showsWarden: has(relics, "lantern"),
    showsGems: has(relics, "chart"),
    freeHitPerFloor: has(relics, "charm"),
    // Cold first, then smoke, then the plain flame every delver starts
    // with. One place decides, so the lantern never has to know which
    // relics exist.
    lightTint: has(relics, "lantern")
      ? LIGHT_TINT_WARDEN
      : has(relics, "censer")
        ? LIGHT_TINT_CENSER
        : LIGHT_TINT_PLAIN,
  };
}

/** The three colours a carried light can be, and nothing else names them. */
export const LIGHT_TINT_PLAIN = "#ffd9a0";
export const LIGHT_TINT_WARDEN = "#bcd8ff";
export const LIGHT_TINT_CENSER = "#e2b98a";

/**
 * What a relic costs. The same wherever you meet the shop.
 *
 * It used to charge a gem more per floor down, and that was never measured
 * against what a floor actually holds. A purchase may not leave a player
 * short of the exit, so what the shop really asks for is the price plus the
 * toll: 5 gems on the first floor, 8 on the second, 11 on the third. The
 * floors hold, in guaranteed gems, 5.1, 7.5 and 10.5 - so on the two lower
 * floors the cheapest relic cost more than the whole floor contained, and
 * on the first it cost every gem on it. Measured over 400 seeds a floor,
 * only 74%, 51% and 50% of them held enough at all.
 *
 * The surcharge was also pulling the same way as the toll, which already
 * rises with depth: a relic on the third floor cost two more gems out of a
 * purse that had to keep four more back. Without it a player who banks a
 * couple on the way down can buy one without stripping a floor bare, which
 * is the decision the shop is for.
 */
export const priceOn = (relic: Relic, _floor: number): number => relic.price;
