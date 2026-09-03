import { createRng, shuffle } from "../rng";

/**
 * What a dungeon holds besides gems.
 *
 * Nine consumables in two families. Which appearance means which item is
 * shuffled at the start of every run, so a cloudy potion is a different
 * thing each game and the only way to learn is to drink one. That is the
 * whole point of them: the game already asks whether one more room is worth
 * it, and this asks the same question of a bottle you found in a chest with
 * something walking towards you.
 *
 * Every item is one use. None of them is strictly a trap - the two worst
 * both rouse the floor, which is survivable and sometimes even worth it if
 * you were leaving anyway.
 */

export const ITEM_IDS = [
  "healing",
  "swiftness",
  "dread",
  "mire",
  "mapping",
  "banish",
  "avarice",
  "gloom",
  "echoes",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type ItemFamily = "potion" | "scroll";

export interface Item {
  id: ItemId;
  family: ItemFamily;
  /** What it is called once you know. */
  name: string;
  /** What it does, shown once identified. */
  blurb: string;
  /** Whether finding out the hard way is a bad time. */
  cruel: boolean;
}

export const ITEMS: Record<ItemId, Item> = {
  healing: {
    id: "healing",
    family: "potion",
    name: "Potion of Healing",
    blurb: "Restores a life.",
    cruel: false,
  },
  swiftness: {
    id: "swiftness",
    family: "potion",
    name: "Potion of Swiftness",
    blurb: "You move half again as fast for a while.",
    cruel: false,
  },
  dread: {
    id: "dread",
    family: "potion",
    name: "Potion of Dread",
    blurb: "The floor wakes. The Warden knows where you are.",
    cruel: true,
  },
  mire: {
    id: "mire",
    family: "potion",
    name: "Potion of Mire",
    blurb: "Your legs go heavy for a while.",
    cruel: true,
  },
  mapping: {
    id: "mapping",
    family: "scroll",
    name: "Scroll of Mapping",
    blurb: "The whole floor appears on your map.",
    cruel: false,
  },
  banish: {
    id: "banish",
    family: "scroll",
    name: "Scroll of Banishment",
    blurb: "The Warden is thrown to the far side of the floor and calmed.",
    cruel: false,
  },
  avarice: {
    id: "avarice",
    family: "scroll",
    name: "Scroll of Avarice",
    blurb: "Two gems, and the floor notices.",
    cruel: false,
  },
  gloom: {
    id: "gloom",
    family: "scroll",
    name: "Scroll of Gloom",
    blurb: "Your map goes dark for a while.",
    cruel: true,
  },
  echoes: {
    id: "echoes",
    family: "scroll",
    name: "Scroll of Echoes",
    blurb: "Something clatters at the far end of the floor, and the Warden goes to find it.",
    cruel: false,
  },
};

/**
 * The looks an item can have. There are exactly as many of each as there
 * are items in that family, so the shuffle is a bijection: every appearance
 * means something.
 */
const POTION_LOOKS = [
  { label: "cloudy", colour: "#b9c6d8" },
  { label: "amber", colour: "#e0a63c" },
  { label: "inky", colour: "#4b3f78" },
  { label: "green", colour: "#4faa62" },
];
const SCROLL_LOOKS = [
  { label: "KHOR VELUM", colour: "#d8cdb0" },
  { label: "ASHEN MARK", colour: "#cbb9a4" },
  { label: "TWO CROWS", colour: "#dcd4bd" },
  { label: "NINE NAILS", colour: "#c9bda6" },
  { label: "HOLLOW BELL", colour: "#d2c4ad" },
];

export interface Appearance {
  /** "a cloudy potion", "a scroll marked KHOR VELUM". */
  unknown: string;
  colour: string;
}

export type Appearances = Record<ItemId, Appearance>;

/**
 * Which look belongs to which item, for one run. Seeded, so the same seed
 * is the same dungeon down to which bottle is the good one.
 */
export function appearancesFor(seed: number): Appearances {
  const rng = createRng(`${seed}:appearances`);
  const potions = ITEM_IDS.filter((id) => ITEMS[id].family === "potion");
  const scrolls = ITEM_IDS.filter((id) => ITEMS[id].family === "scroll");
  const potionLooks = shuffle(rng, POTION_LOOKS);
  const scrollLooks = shuffle(rng, SCROLL_LOOKS);
  const out = {} as Appearances;
  potions.forEach((id, i) => {
    const look = potionLooks[i].label;
    const article = /^[aeiou]/i.test(look) ? "an" : "a";
    out[id] = { unknown: `${article} ${look} potion`, colour: potionLooks[i].colour };
  });
  scrolls.forEach((id, i) => {
    out[id] = { unknown: `a scroll marked ${scrollLooks[i].label}`, colour: scrollLooks[i].colour };
  });
  return out;
}

/** What to call an item, given what the player has worked out so far. */
export const nameOf = (id: ItemId, appearances: Appearances, known: boolean): string =>
  known ? ITEMS[id].name : appearances[id].unknown;

/** What a chest on a given floor holds. Later floors are a little kinder. */
export function rollItem(seed: number, key: string, floor: number): ItemId {
  const rng = createRng(`${seed}:${key}:loot`);
  // A quarter of what is down there is a bad idea, less so as you descend
  // and are more likely to be desperate enough to drink it anyway.
  const cruelChance = Math.max(0.12, 0.3 - floor * 0.05);
  const pool = ITEM_IDS.filter((id) => ITEMS[id].cruel === (rng() < cruelChance));
  const list = pool.length ? pool : ITEM_IDS.slice();
  return list[Math.floor(rng() * list.length)];
}

/** How long the timed items last, in seconds. */
export const SWIFTNESS_S = 18;
export const MIRE_S = 12;
export const GLOOM_S = 25;
/**
 * How much faster or slower those make you.
 *
 * Mire was 0.55, which put a mired player's sprint at 4.40 against a fully
 * roused Warden at 4.40: level, and a sprint is what tells it where you
 * are. See systems/pace.ts - a sprint always gets away, a walk does not,
 * and layout-check walks every relic set, potion and alarm level to keep
 * both halves of that true.
 */
export const SWIFTNESS_MULTIPLIER = 1.5;
export const MIRE_MULTIPLIER = 0.65;
/** How much the two rousing items wake the floor. */
export const DREAD_ALARM = 3;
export const AVARICE_ALARM = 2;
export const AVARICE_GEMS = 2;
/** How much a banishment calms it. */
export const BANISH_CALM = 3;
/**
 * How long a thrown sound holds the Warden's attention.
 *
 * Banishment moves it at once and calms the floor, and is the stronger
 * card. This one moves nothing: it walks, which takes it several steps at
 * four to nine seconds each, and the floor stays as roused as you left it.
 * What it buys is a window and the knowledge of exactly where the Warden is
 * going - including the right to run, because it is listening to the noise
 * it has already heard rather than to you.
 */
export const ECHOES_S = 14;
/** Slots in the satchel. */
export const SATCHEL_SLOTS = 4;
