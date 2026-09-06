import { createRng, shuffle } from "../rng";

/**
 * What a dungeon holds besides gems.
 *
 * Twelve consumables in three families. Which appearance means which item
 * is shuffled at the start of every run, so a cloudy potion is a different
 * thing each game and the only way to learn is to drink one. That is the
 * whole point of them: the game already asks whether one more room is worth
 * it, and this asks the same question of a bottle you found in a chest with
 * something walking towards you.
 *
 * Potions and scrolls happen to the player. Devices happen to the room:
 * they are set down where you stand and are still there when you come back
 * through, which is a different question - not "is now the moment" but "is
 * this the room". They arrived with the spikes learning to bite the Warden:
 * once the floor's own furniture could stop it, the obvious next thing to
 * ask was whether the player could bring some.
 *
 * Every item is one use. None of them is strictly a trap - the worst of
 * them rouse the floor, which is survivable and sometimes even worth it if
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
  "snare",
  "rattle",
  "wardstone",
  "bomb",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

/**
 * A device is not drunk or read: it is put down where you stand, and it
 * stays in the room after you have left it. That is the whole reason the
 * family exists. Everything in the satchel until now happened to the
 * player and lasted as long as a timer; a device happens to the room, and
 * the question it asks is not "is now the moment" but "is this the room".
 */
/**
 * And a bomb is neither: it is set down like a device and it is over in
 * three seconds like a potion, and what it does is done to everything in
 * reach at once - the player included. A bomb always looks like a bomb.
 */
export type ItemFamily = "potion" | "scroll" | "device" | "bomb";

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
  snare: {
    id: "snare",
    family: "device",
    name: "Wire Snare",
    blurb: "Set where you stand. The next thing to walk into it is wounded and held.",
    cruel: false,
  },
  rattle: {
    id: "rattle",
    family: "device",
    name: "Knot of Loose Iron",
    blurb: "It goes down loudly. The floor wakes, and the Warden knows where you are.",
    cruel: true,
  },
  wardstone: {
    id: "wardstone",
    family: "device",
    name: "Ward Stone",
    blurb: "While it lies here the Warden will not come into this room.",
    cruel: false,
  },
  bomb: {
    id: "bomb",
    family: "bomb",
    name: "Black Powder Bomb",
    blurb: "Set it down and walk. Three seconds. It hurts whatever is near it, and cracked walls do not survive it.",
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
const DEVICE_LOOKS = [
  { label: "coil of black wire", colour: "#6f7683" },
  { label: "knotted leather pouch", colour: "#8a6b46" },
  { label: "chalk-marked stone", colour: "#c3bda8" },
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
  const devices = ITEM_IDS.filter((id) => ITEMS[id].family === "device");
  const potionLooks = shuffle(rng, POTION_LOOKS);
  const scrollLooks = shuffle(rng, SCROLL_LOOKS);
  const deviceLooks = shuffle(rng, DEVICE_LOOKS);
  const out = {} as Appearances;
  potions.forEach((id, i) => {
    const look = potionLooks[i].label;
    const article = /^[aeiou]/i.test(look) ? "an" : "a";
    out[id] = { unknown: `${article} ${look} potion`, colour: potionLooks[i].colour };
  });
  scrolls.forEach((id, i) => {
    out[id] = { unknown: `a scroll marked ${scrollLooks[i].label}`, colour: scrollLooks[i].colour };
  });
  devices.forEach((id, i) => {
    const look = deviceLooks[i].label;
    out[id] = { unknown: `${/^[aeiou]/i.test(look) ? "an" : "a"} ${look}`, colour: deviceLooks[i].colour };
  });
  // A bomb looks like a bomb. Nobody has to drink one to find out.
  out.bomb = { unknown: "a bomb", colour: "#2a2a2e" };
  return out;
}

/** Whether an item is put down in the room rather than used on yourself. */
export const isDevice = (id: ItemId): boolean => ITEMS[id].family === "device";
/** Whether an item is a bomb: set down like a device, and then gone. */
export const isBomb = (id: ItemId): boolean => ITEMS[id].family === "bomb";

/** What to call an item, given what the player has worked out so far. */
export const nameOf = (id: ItemId, appearances: Appearances, known: boolean): string =>
  known ? ITEMS[id].name : appearances[id].unknown;

/**
 * What a chest on a given floor holds. Later floors are a little kinder.
 *
 * One coin decides which shelf to draw from, and it used to be nine. The
 * filter read `ITEMS[id].cruel === (rng() < cruelChance)`, which calls the
 * generator once for every item in the list rather than once for the
 * choice - so each item was kept or dropped on its own flip, and what came
 * out was a mixed pool weighted by how many of each kind there are. Two of
 * the nine items were cruel; at a quarter, each of those survived a quarter
 * of the time and each of the seven kind ones three quarters, which is a
 * pool that is one part in twelve cruel rather than one in four. Measured
 * over 8,510 chests across 300 runs: 10% of what a player found was a bad
 * idea, against the quarter written here.
 *
 * The cruel items are the only downside in the loot, and they are what
 * makes drinking an unidentified bottle a decision instead of a free
 * refill. There are four of twelve now rather than two of nine, which does
 * not change the odds a player sees - the coin above decides which shelf
 * to draw from and the shelves are drawn from evenly - only how many
 * different bad ideas there are.
 */
export function rollItem(seed: number, key: string, floor: number): ItemId {
  const rng = createRng(`${seed}:${key}:loot`);
  // A quarter of what is down there is a bad idea, less so as you descend
  // and are more likely to be desperate enough to drink it anyway.
  const cruelChance = Math.max(0.12, 0.3 - floor * 0.05);
  const cruel = rng() < cruelChance;
  const pool = ITEM_IDS.filter((id) => ITEMS[id].cruel === cruel);
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

// --- Devices ---------------------------------------------------------------

/**
 * How wide a snare's bite is.
 *
 * Narrower than a patch of spikes, because a snare is set by hand on one
 * spot rather than laid across an approach, and because the Warden walks
 * straight lines at the player: a snare as wide as a spike patch would be
 * hard to miss, and the point of setting one is choosing where. Wide
 * enough that a walk at four and a half metres a second cannot step over
 * it between two frames, which at a twentieth of a second is 0.22 - so the
 * margin here is four-fold rather than a coincidence.
 */
export const SNARE_RADIUS = 1.0;
/**
 * How long a snare holds what it catches, against three and a half seconds
 * for the floor's own spikes.
 *
 * Longer, and deliberately: the spikes are already there and cost nothing
 * to walk behind, while a snare cost a satchel slot from the moment it was
 * found and a chest that could have held a life. If the thing you carried
 * across two floors bought less than the furniture, nobody would carry it.
 */
export const SNARE_HOLD_S = 5;
/** How long a ward stone keeps the Warden out of the room it lies in. */
export const WARD_S = 30;
/** How much a dropped knot of iron rouses the floor. */
export const RATTLE_ALARM = 2;
