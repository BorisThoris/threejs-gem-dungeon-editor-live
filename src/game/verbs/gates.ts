/**
 * Verbs, not keys - and the hedge that is the useful part.
 *
 * The rule is not "no locks". The studio this comes from ships literal
 * keycards. It is:
 *
 *   NO LOCK WHOSE ONLY SOLUTION IS ITS KEY.
 *
 * And the audit is per GATE, not per tool. A tool with four uses is not the
 * test; a door with one answer is the failure, however many tools exist
 * elsewhere. So this table is written the other way round from how it is
 * tempting to write it: every gate the game puts in front of the player,
 * and every way through it, with a check that holds each to more than one.
 *
 * The second rule is about how a tool is BRIEFED, and it is the one that
 * generates content rather than validating it:
 *
 *   Brief a tool as a physical behaviour, never as a genre function.
 *
 * Run against ours, three pass and one fails:
 *
 *   bomb     "a pressure wave that moves and breaks things"   yes
 *   lantern  "a portable source of light and heat"            yes
 *   snare    "a device that holds a moving thing in place"    yes
 *   key      "the thing that opens the vault"                 NO - a function
 *
 * The key was the tool most in need of redesign and rebriefing it as a
 * heavy piece of cut metal produces three verbs for free, all of which the
 * Din already carries: heavy weights a pressure plate, metal dropped is
 * [loud] 0.50, and unique makes carrying it bait for the Cutpurse. Not one
 * of those is a new system.
 *
 * And the third rule, which is a performance constraint turned into design
 * language: EVERY VERB NEEDS A LEGIBLE LIMIT. A universal verb is
 * unreadable - you cannot plan against a tool with no edges - so each gets
 * exactly one signposted exception, and the signpost is the point. The
 * studio could not stick their goo to their goo because of a console
 * memory ceiling, and shipped surfaces that visibly repel it.
 */

import type { Surface } from "../din/tags";

export interface Verb {
  id: string;
  /** What it IS. If this reads as a genre function, the brief is wrong. */
  brief: string;
  /** The one thing it will not do, and how the player is shown that. */
  limit: string;
  signpost: string;
}

export const VERBS: readonly Verb[] = [
  {
    id: "bomb",
    brief: "a pressure wave that moves and breaks things",
    limit: "wet stone does not crack",
    signpost: "the wall runs with water and the crack in it is dark and swollen",
  },
  {
    id: "lantern",
    brief: "a portable source of light and heat",
    limit: "a draft kills the flame",
    signpost: "the draft that says a wall is thin is the same draft that puts it out",
  },
  {
    id: "snare",
    brief: "a device that holds a moving thing in place",
    limit: "it will not set on tile",
    signpost: "the teeth skid and it will not sit flat; tile is the one floor that reads glazed",
  },
  {
    /**
     * Rebriefed. It was "the thing that opens the vault", which is a
     * function wearing an object's name, and it is why the key had exactly
     * one use for its entire life.
     */
    id: "key",
    brief: "a heavy piece of cut metal, and the only one of its cut",
    limit: "a vault re-locks behind you",
    signpost: "the bar drops audibly as you cross the threshold, the first time and every time",
  },
] as const;

export interface Gate {
  id: string;
  what: string;
  /**
   * Every way through. The check holds this to at least two, and the first
   * entry is deliberately NOT privileged - a gate whose intended answer is
   * listed first and whose alternatives are listed as curiosities is a
   * lock with one solution and a footnote.
   */
  ways: readonly string[];
}

export const GATES: readonly Gate[] = [
  {
    id: "vault",
    what: "a vault door",
    ways: [
      "the key",
      "bomb the weakened wall beside it",
      "snare the closing mechanism and walk through behind it",
    ],
  },
  {
    id: "crack",
    what: "a cracked wall",
    ways: [
      "a bomb",
      "it is simply visible and passable below the Dark band, with no bomb at all",
    ],
  },
  {
    id: "grate",
    what: "a dropped grate",
    ways: [
      "an unlit bomb wedged under it props it",
      "a snare set in the channel holds it",
    ],
  },
  {
    id: "stair",
    what: "the barred stair",
    ways: ["pay the toll", "stall the Keeper with a blast and slip past it"],
  },
  {
    id: "plate",
    what: "a pressure plate that wants weight on it",
    ways: [
      "stand on it yourself and lose the room",
      "set the key on it - it is heavy, which is now a property it has",
      "carry something from the room onto it",
    ],
  },
] as const;

/**
 * What the key does BESIDES open the vault, now that it is a physical thing
 * rather than a function. Every one of these is written somewhere else
 * already - the Din's emission table, the Cutpurse's susceptibility, the
 * plate - and this list exists so the rebrief can be checked rather than
 * believed.
 */
export const KEY_IS = [
  { property: "heavy", pays: "it weights a pressure plate" },
  { property: "metal", pays: "dropping it is [loud] 0.50, and the Cutpurse hears metal" },
  { property: "unique", pays: "carrying it makes you the most interesting thing on the floor" },
] as const;

/**
 * The limits, as functions rather than as prose.
 *
 * `VERBS` says what each limit IS, in the words the signpost uses. These
 * are the same four facts in the form the game can ask, and they are here
 * beside the prose so the two cannot drift: a limit whose sentence says
 * one thing and whose function says another is worse than no limit, because
 * the player learns the sentence and plans against it.
 *
 * All four are keyed on the Din's surface vocabulary rather than on a biome
 * name, for the reason the Din exists: a rule that names `catacomb` is a
 * rule about one room kind, and a rule that names `tile` is a rule about
 * every floor that reads glazed, including ones not written yet.
 */

/**
 * Wet stone does not crack.
 *
 * The wave goes into the water instead of into the wall. The signpost is
 * the room itself: a flooded chamber is unmistakable from its doorway, and
 * the crack in it runs dark and swollen rather than dry and pale.
 */
export const BOMB_DEAD: readonly Surface[] = ["water"];
export const bombCracks = (surface: Surface): boolean => !BOMB_DEAD.includes(surface);

/**
 * A snare will not set on tile.
 *
 * The teeth skid and it will not sit flat. Tile is the one surface that
 * reads glazed, and it is worth knowing which rooms have it before you
 * are backing into one with the Warden coming.
 */
export const SNARE_DEAD: readonly Surface[] = ["tile"];
export const snareSets = (surface: Surface): boolean => !SNARE_DEAD.includes(surface);

/**
 * A draft kills the flame.
 *
 * The draft that says a wall is thin is the same draft that puts the
 * lantern out, which is the whole of the joke: the tell that leads you to
 * the secret takes away the light you were reading it by. It only bites a
 * flame that is up - a lantern already down has nothing to lose.
 */
export const draftSnuffs = (inDraft: boolean, glim: number): boolean => inDraft && glim > 0;

/**
 * A vault re-locks behind you.
 *
 * The bar drops as you cross the threshold, the first time and every time,
 * so the key buys one entry rather than a door that is now open. It is
 * why setting the key on a plate is a real decision and not a free extra
 * use of a thing you had finished with.
 */
export const VAULT_RELOCKS = true;
