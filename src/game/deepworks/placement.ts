import { createRng } from "../rng";
import { DIR_STEP, halfSize, type Dungeon, type Room, type RoomKind } from "../dungeon/types";
import { ENDING_OF, FRAGMENTS, endingFor, type Ending, type Fragment } from "./fragments";

/**
 * Where the Deepworks is written down, and which of it this run wrote.
 *
 * The corpus is forty fragments and a run is thirty-four rooms, so the
 * question this module answers is not "what does the fiction say" - the
 * table already says that - but WHICH of it a given delver is shown, and
 * on what. Two rules do all the work, and both are the ones the corpus
 * was written to survive:
 *
 *   ORDER-INDEPENDENCE. A fragment never contains "then", "after" or
 *   "next", so any three of them found in any order imply a fourth thing
 *   the player assembles. Nothing here has to sequence them, and nothing
 *   here may: a placement that put 1 before 9 would be inventing a chain
 *   the writing deliberately refuses.
 *
 *   PLACE DECIDES SHAPE. A fragment cut on the Keeper's slab has to be one
 *   a man on the last stair would have written or been given. The corpus
 *   carries that as each fragment's `on`, and this maps a room to the
 *   surfaces it actually offers - so nothing is ever read somewhere it
 *   could not have been cut.
 *
 * Everything is drawn from the room's own identity, so the same wall says
 * the same thing every time the delver walks back past it.
 */

/** A surface a fragment can be cut on. */
export type Surface = Fragment["on"][number];

/**
 * What each kind of room offers to be written on.
 *
 * Every room has walls. The rest are the things a room of that kind
 * actually contains, and the mapping is here rather than in the corpus
 * because it is a fact about the game's rooms and the corpus is a fact
 * about the fiction - two owners for two different things.
 *
 * `on` is a constraint on where a line could have been CUT, never a claim
 * that the named object is in the room. A shrine carrying "the shift ends
 * when the bell says" names a bell; it does not put one there. The rule
 * the ending draw is held to - dressing is evidence or it is decoration,
 * and never both - would be broken the moment a fragment implied a prop
 * the game does not place.
 */
export const SURFACES_OF: Partial<Record<RoomKind, readonly Surface[]>> = {
  treasure: ["chest"],
  shop: ["counter"],
  shrine: ["bell"],
  end: ["slab"],
  secret: ["alcove"],
  library: ["counter"],
};

/** How many fragments a room may carry. Two is a room; three is a museum. */
export const MOST_PER_ROOM = 2;

/**
 * How much likelier the ending's own fragments are than the rest.
 *
 * Not exclusive, deliberately. An ending that showed ONLY its own seven
 * would be three disjoint corpora rather than one place seen from three
 * angles, and the planted contradiction - 35 against 9 - would stop being
 * reachable in the runs that most want it.
 */
export const ENDING_WEIGHT = 4;

export interface CutFragment {
  fragment: Fragment;
  surface: Surface;
  /** Room-local, on the wall the room's own identity picks. */
  x: number;
  z: number;
}

/** Every surface this room offers, walls first because every room has them. */
export const surfacesOf = (kind: RoomKind): readonly Surface[] => [
  "wall",
  ...(SURFACES_OF[kind] ?? []),
];

/**
 * What is written in this room, for this run.
 *
 * `startOnly` fragments are held for the first start room and nowhere else:
 * the one that names the wall is the third carrier of "you are the latest
 * of many", and a line that turned up in an ordinary corridor on floor two
 * would be carrying nothing.
 */
export function cutIn(room: Room, dungeon: Dungeon, floor: number): CutFragment[] {
  const ending: Ending = endingFor(dungeon.seed);
  const rng = createRng(`cut:${room.seed}:${room.id}:${room.grid.x},${room.grid.z}`);
  const here = surfacesOf(room.kind);
  const first = floor === 1 && room.id === dungeon.startId;

  // The pool: everything that could be cut on a surface this room has, and
  // the run's ending weighted up within it rather than filtered down to.
  const favoured = new Set(ENDING_OF[ending].favours);
  const pool: Fragment[] = [];
  for (const fragment of FRAGMENTS) {
    if (fragment.startOnly && !first) continue;
    if (!fragment.on.some((s) => here.includes(s))) continue;
    const weight = favoured.has(fragment.id) ? ENDING_WEIGHT : 1;
    for (let i = 0; i < weight; i++) pool.push(fragment);
  }
  if (pool.length === 0) return [];

  // How many. Most rooms say nothing: a place that talks in every room is
  // a place nobody reads, and the corpus is forty lines against a run of
  // thirty-four rooms.
  const many = first ? 1 : rng() < 0.28 ? (rng() < 0.25 ? 2 : 1) : 0;
  if (many === 0) return [];

  const half = halfSize(room);
  const out: CutFragment[] = [];
  const taken = new Set<number>();
  const walls = (["north", "east", "south", "west"] as const).filter((d) => !room.links[d]);
  for (let i = 0; i < Math.min(many, MOST_PER_ROOM); i++) {
    // One fragment twice in a room reads as a misprint.
    let fragment: Fragment | undefined;
    for (let tries = 0; tries < 8 && !fragment; tries++) {
      const drawn = pool[Math.floor(rng() * pool.length)];
      if (!taken.has(drawn.id)) fragment = drawn;
    }
    if (!fragment) break;
    taken.add(fragment.id);
    const surface = fragment.on.find((s) => here.includes(s)) ?? "wall";
    // Against a wall with no doorway in it, so nothing is ever read from
    // the middle of a lane the player is trying to walk through.
    const dir = walls.length ? walls[Math.floor(rng() * walls.length)] : "north";
    const step = DIR_STEP[dir];
    const along = (rng() - 0.5) * half * 0.7;
    out.push({
      fragment,
      surface,
      x: step.x * half * 0.9 + step.z * along,
      z: step.z * half * 0.9 + step.x * along,
    });
  }
  return out;
}

/**
 * How many names are on the wall in the start room.
 *
 * The third carrier of "you are the latest of many", and the only one of
 * the four whose third leg is a rule that was already there: run records
 * persist between runs, so the wall is longer on the tenth run than on the
 * first, and nothing had to be invented to make that true.
 *
 * Capped because a wall is a wall. A player on their hundredth run should
 * read "and more, past the light" rather than a spreadsheet.
 */
export const NAMES_SHOWN = 12;

export const namesOn = (runs: number): number => Math.max(0, Math.min(NAMES_SHOWN, runs));
