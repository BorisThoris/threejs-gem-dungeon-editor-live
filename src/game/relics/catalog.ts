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
  };
}

/** What a relic costs on a given floor: later floors charge more. */
export const priceOn = (relic: Relic, floor: number): number => relic.price + (floor - 1);
