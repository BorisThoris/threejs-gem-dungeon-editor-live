import { DELVER_IDS } from "../delvers/catalog";

/**
 * Deeds: the things worth having done.
 *
 * Steam calls these achievements and the store page counts them, so they
 * are here partly because a demo without them looks unfinished on a
 * library shelf. That is a bad reason on its own, so they are also chosen
 * to do the job achievements are actually good at: naming the plays a
 * system supports that a player might not think to try.
 *
 * Every one of these is a sentence about the game. "Rout it on the floor's
 * own spikes" tells a player who has only ever run from the Warden that
 * running is not the only thing to do; "clear a floor without raising the
 * lantern" tells them the dark is playable. Nothing here is a grind and
 * nothing is a counter for its own sake - there is no "walk ten thousand
 * metres" - because a list of chores is a list nobody reads twice.
 *
 * They unlock and they are remembered, and they change nothing about a
 * run. The delvers are all available from the first game and always will
 * be: a demo that locks its content behind its own achievements is asking
 * for a second hour before it has earned the first.
 */

export const DEED_IDS = [
  "escape",
  "haul",
  "routed",
  "wirework",
  "nottoday",
  "reclaimed",
  "shutout",
  "darkrunner",
  "unspent",
  "everydelver",
] as const;
export type DeedId = (typeof DEED_IDS)[number];

export interface Deed {
  id: DeedId;
  name: string;
  /** What it is for. Shown whether or not it is unlocked. */
  blurb: string;
  /**
   * The Steam API name this maps to.
   *
   * Steam achievements are identified by a string set in the Steamworks
   * partner site, and it is conventionally upper snake case and does not
   * have to match anything in the game. Written down here rather than
   * derived from the id, because the two live in different places and the
   * day somebody renames one of them the other must not silently follow.
   */
  steam: string;
}

export const DEEDS: Record<DeedId, Deed> = {
  escape: {
    id: "escape",
    name: "Out",
    blurb: "Climb out of the dungeon with anything at all.",
    steam: "ESCAPE",
  },
  haul: {
    id: "haul",
    name: "Worth the Walk",
    blurb: "Get out with fifteen gems or more.",
    steam: "HAUL_FIFTEEN",
  },
  routed: {
    id: "routed",
    name: "It Bleeds",
    blurb: "Rout the Warden on the floor's own spikes.",
    steam: "WARDEN_ROUTED",
  },
  wirework: {
    id: "wirework",
    name: "Wire Work",
    blurb: "Catch the Warden in a snare you set yourself.",
    steam: "SNARE_SPRUNG",
  },
  nottoday: {
    id: "nottoday",
    name: "Not Today",
    blurb: "Catch the Cutpurse with your gem still on it.",
    steam: "THIEF_CAUGHT",
  },
  reclaimed: {
    id: "reclaimed",
    name: "Reclaimed",
    blurb: "Walk to the nest and take back what was stolen.",
    steam: "NEST_EMPTIED",
  },
  shutout: {
    id: "shutout",
    name: "Shut Out",
    blurb: "Bar a doorway and have the Warden come through it anyway.",
    steam: "BAR_BROKEN",
  },
  darkrunner: {
    id: "darkrunner",
    name: "Dark Runner",
    blurb: "Take a whole floor without ever raising the lantern.",
    steam: "FLOOR_UNLIT",
  },
  unspent: {
    id: "unspent",
    name: "Unspent",
    blurb: "Escape without losing a single life.",
    steam: "NO_LIVES_LOST",
  },
  everydelver: {
    id: "everydelver",
    name: "All Five",
    blurb: "Escape the dungeon as every delver.",
    steam: "ALL_DELVERS",
  },
};

/** Whether every delver has got out at least once. */
export const allDelversEscaped = (escapedAs: readonly string[]): boolean =>
  DELVER_IDS.every((id) => escapedAs.includes(id));
