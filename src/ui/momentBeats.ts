/**
 * The four moments the arc is built around, as a table.
 *
 * Everything in this game that matters happens, and until now most of it
 * happened at the same size as everything else. Walking down to the next
 * floor was the same 220ms cut as walking through any door on it. The
 * cracked wall coming down - the thing a whole system of tells, drafts and
 * bombs exists to lead you to - was a burst like any other burst. The
 * Keeper kneeling, which is the one instant on the last floor when the
 * exit is passable, was a HUD line changing colour.
 *
 * They are the punctuation of a run, so they get their own marks. The
 * table is here rather than beside the component that plays it so the
 * checks can read what the game promises to show without drawing it, the
 * way the readout's lines and the teacher's lessons are read.
 */
import { floorRules } from "../game/world";

/** What is drawn for one beat. */
export interface Moment {
  /** For the checks and for React. */
  id: string;
  /** How long the whole beat lasts, in milliseconds. */
  hold: number;
  /** The full-screen wash, if it has one. */
  wash?: string;
  /** A word or two held in the middle of the screen. */
  title?: string;
  /** A line under it. */
  line?: string;
}

/** A row: the event that plays it, and what it draws. */
export interface MomentRow {
  id: string;
  event: "floorDescended" | "secretRevealed" | "keeperKnelt";
  hold: number;
  wash?: string;
  title: string;
  /** A second line, worked out from the event, when there is one. */
  line?: (payload: never) => string;
}

/** How long the descent's card is held. Longer than a door, because it is not one. */
const DESCENT_MS = 2600;

/** How long the ordinary cut between two rooms lasts, for comparison. */
export const DOOR_CUT_MS = 220;

/**
 * The moments, as a table.
 *
 * The order is the order they were written in and means nothing: only one
 * plays at a time, because only one of these can be true at once.
 */
export const MOMENTS: MomentRow[] = [
  /**
   * Going down. The one beat with a second line: a floor is the unit the
   * whole run is measured in, and its blurb is the only warning a player
   * gets about what is new below. It used to be a notice in the corner,
   * arriving as the player was put down in a room they had to read; here
   * it is on the black, where there is nothing else to look at.
   *
   * The words come from `floorRules`, which is where the rest of the
   * descent's difficulty comes from too.
   */
  {
    id: "descent",
    event: "floorDescended",
    hold: DESCENT_MS,
    wash: "#05060a",
    title: "FLOOR",
    line: (({ floor }: { floor: number }) => floorRules(floor).blurb) as (p: never) => string,
  },
  /**
   * The wall giving. Dust rather than fire: the blast has its own light in
   * the room, and this is the room behind it opening, which is a different
   * fact and reads paler and slower.
   */
  { id: "wall", event: "secretRevealed", hold: 900, wash: "rgba(214,198,168,0.5)", title: "THE WALL GIVES" },
  /**
   * The Keeper kneeling: the one instant on the last floor when the exit
   * can be walked through, and it was a HUD line changing colour.
   */
  {
    id: "kneel",
    event: "keeperKnelt",
    hold: 1100,
    wash: "rgba(224,183,74,0.42)",
    title: "IT KNEELS",
    line: (() => "the stairs, now") as (p: never) => string,
  },
];

