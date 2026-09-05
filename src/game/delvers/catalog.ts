import type { ItemId } from "../items/catalog";
import type { RelicId } from "../relics/catalog";
import { SATCHEL_SLOTS } from "../items/catalog";
import { STARTING_LIVES } from "../world";

/**
 * Who you are when you go down.
 *
 * Every run started identically: three lives, an empty satchel, nothing
 * known, and a floor at its own baseline alarm. That is a fine tutorial and
 * a poor second hour - the first four minutes of every run were the same
 * four minutes, and the only thing a player could bring to them was what
 * they had learned, which the game then made them find out again from
 * scratch (which bottle is which is reshuffled every run, on purpose).
 *
 * A delver is a different opening, not a better one. Each of these trades
 * something the run needs for something else it needs, and the trades are
 * across different currencies so that no two of them can be ranked: lives
 * against the toll, knowledge against skin, speed against how much you can
 * carry, gems in hand against how awake the floor already is. The Vagrant
 * is the game as it was, and is deliberately first and deliberately not
 * worse than the others - a player who does not want to make this choice
 * should not be punished for not making it.
 *
 * What a delver may not do is change what the dungeon is. None of them
 * gets more floors, an easier Warden, or a toll the floor cannot pay -
 * `yarn test:layout` walks every delver against every floor's guaranteed
 * gems and holds them all to the same rule the plain run is held to.
 */

export const DELVER_IDS = ["vagrant", "robber", "ratcatcher", "courier", "pilgrim"] as const;
export type DelverId = (typeof DELVER_IDS)[number];

export interface Delver {
  id: DelverId;
  name: string;
  /** One line under the name: what this run will feel like. */
  blurb: string;
  /** The two halves of the trade, said plainly, in the player's order. */
  brings: string;
  costs: string;
  lives: number;
  /** Gems in hand at the first door. */
  gems: number;
  relics: readonly RelicId[];
  /** What is in the satchel, and known for what it is from the start. */
  satchel: readonly ItemId[];
  /** Slots in the satchel, which is not always four. */
  slots: number;
  /** Added to every floor's own starting alarm. */
  alarmBonus: number;
  /**
   * What a gem taken does to the alarm, as a multiplier.
   *
   * The inverse of the Ash Censer, and the axis the Pilgrim pays on. It
   * started paying with a gem on every exit, and `yarn test:layout` threw
   * that out within a minute: the thinnest first floor holds four gems it
   * can guarantee against a toll of three, so one more on the door left a
   * run that had to take literally every gem on the floor to leave - which
   * is the one thing the economy check exists to forbid, because it is the
   * game's whole decision (take it or leave it) switched off. The floors
   * simply do not have a gem of slack in them for a delver to spend.
   *
   * The alarm does. It is a currency with no floor and no cap in the same
   * sense, it is the thing the run is actually about, and doubling it says
   * the same thing about a Pilgrim that a toll would have: the dungeon
   * minds them being here.
   */
  alarmFactor: number;
}

export const DELVERS: Record<DelverId, Delver> = {
  vagrant: {
    id: "vagrant",
    name: "Vagrant",
    blurb: "Nothing but the clothes you came in. The dungeon as it is.",
    brings: "Three lives, four slots, no debts",
    costs: "Nothing, and nothing extra",
    lives: STARTING_LIVES,
    gems: 0,
    relics: [],
    satchel: [],
    slots: SATCHEL_SLOTS,
    alarmBonus: 0,
    alarmFactor: 1,
  },
  robber: {
    id: "robber",
    name: "Tomb Robber",
    blurb: "You have been down here before, and it remembers you.",
    brings: "The Robber's Chart, and two gems already in hand",
    costs: "Every floor is already stirring when you arrive",
    lives: STARTING_LIVES,
    gems: 2,
    relics: ["chart"],
    satchel: [],
    slots: SATCHEL_SLOTS,
    alarmBonus: 1,
    alarmFactor: 1,
  },
  ratcatcher: {
    id: "ratcatcher",
    name: "Ratcatcher",
    blurb: "You know what the wire is for. You have never been good at being hit.",
    brings: "A snare and a ward stone, and you know every device on sight",
    costs: "Two lives instead of three",
    lives: STARTING_LIVES - 1,
    gems: 0,
    relics: [],
    satchel: ["snare", "wardstone"],
    slots: SATCHEL_SLOTS,
    alarmBonus: 0,
    alarmFactor: 1,
  },
  courier: {
    id: "courier",
    name: "Courier",
    blurb: "Fast hands, small bag. You were never meant to carry much.",
    brings: "Soft Boots: a quarter faster, walking or running",
    costs: "Two satchel slots",
    lives: STARTING_LIVES,
    gems: 0,
    relics: ["boots"],
    satchel: [],
    slots: 2,
    alarmBonus: 0,
    alarmFactor: 1,
  },
  pilgrim: {
    id: "pilgrim",
    name: "Pilgrim",
    blurb: "You are owed one mistake more than most, and the doors know it.",
    brings: "Four lives and the Bone Charm: the first hit each floor is free",
    costs: "Every gem you take rouses the floor twice over",
    lives: STARTING_LIVES + 1,
    gems: 0,
    relics: ["charm"],
    satchel: [],
    slots: SATCHEL_SLOTS,
    alarmBonus: 0,
    alarmFactor: 2,
  },
};

/**
 * The items a delver starts already knowing. A Ratcatcher who could not
 * tell their own snare from a pouch of iron would be carrying two coin
 * flips rather than two tools, which is the opposite of the trade.
 */
export function knownFrom(delver: Delver): ItemId[] {
  return [...delver.satchel];
}

export const DEFAULT_DELVER: DelverId = "vagrant";

/** A delver by id, falling back to the Vagrant for anything unrecognised. */
export const delverOr = (id: string | null | undefined): Delver =>
  (id && (DELVERS as Record<string, Delver>)[id]) || DELVERS[DEFAULT_DELVER];
