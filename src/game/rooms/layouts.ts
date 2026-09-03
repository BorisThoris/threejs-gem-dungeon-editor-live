import type { Vec3 } from "../dungeon/layout";
import type { PropKind, PropPlacement, RoomKind } from "../dungeon/types";

/**
 * How a room of each kind is furnished, when nobody has authored it.
 *
 * Every room is lit from its corners; the kind decides what fills the space
 * between. Props go on anchors the room hands them, and every anchor is
 * clear of the doorways the room actually has, so an arrangement that only
 * ever names an anchor is legal by construction.
 *
 * Four of those anchors are the diagonal quadrants, which are clear in any
 * room. Two more are `centre`, and a room only has those when its doors are
 * all on one axis - nearly half of them - which is why they are placed by
 * spreading the list rather than by index: in a four-doored room the list
 * is empty and the arrangement is what it always was.
 *
 * The kinds a player walks through over and over have several arrangements
 * and the room picks one from its own seed. One arrangement per kind meant
 * the fourth chamber on a floor was the first chamber again, and the deep
 * floors are half again as big as they were, which made noticing it a
 * matter of time. The set pieces - the shop, the library, the trials, the
 * arena - keep a single arrangement: their content is what makes them, and
 * a shop that moved its barrels around would only be harder to read.
 *
 * Pure on purpose, and apart from the component that draws it: the layout
 * check bundles this file for node and walks every arrangement of every
 * kind at every size, which it could not do through a React tree.
 */

/** The anchors an arrangement may stand things on, and the room's own rng. */
export interface Spots {
  near: Vec3[];
  far: Vec3[];
  corners: Vec3[];
  /** Either side of the middle, or empty. See `centreSpots`. */
  centre: Vec3[];
  rng: () => number;
}

export type Arrangement = (s: Spots) => PropPlacement[];

const at = (kind: PropKind, [x, , z]: Vec3, rotation = 0): PropPlacement => ({
  kind,
  x,
  z,
  rotation,
});

/**
 * What stands either side of the middle, for as many middle spots as this
 * room turns out to have - which is two or none. Written this way so one
 * arrangement serves both kinds of room: a room whose doors cross its
 * middle gets the list back empty and is furnished exactly as before.
 *
 * The pair is turned rather than left square: both spots sit on one axis,
 * so a thing with a front and a back wants turning to face the room.
 */
const middle = (centre: Vec3[], kinds: [PropKind, PropKind]): PropPlacement[] =>
  centre.map((spot, i) => at(kinds[i], spot, facing(spot)));

/**
 * The turn that points a prop's front at the middle of the room.
 *
 * Local +z is the front - it is the side the bookshelf's books are on - and
 * a prop with a front, placed without one, shows the room its back as often
 * as not. The library's three shelves faced their own corners for as long
 * as they have existed, and nobody noticed, because the books were modelled
 * inside the carcass and both sides of a shelf looked the same.
 */
const facing = ([x, , z]: Vec3): number => Math.atan2(-x, -z);

/** A quarter turn either way, so a chair is not always square to the room. */
const askew = (rng: () => number) => rng() * 0.9 - 0.45;

export const LAYOUTS: Record<RoomKind, Arrangement[]> = {
  start: [
    // Pillars either side of the way out, when the way out is one way.
    ({ near, far, centre }) => [
      at("chest", near[0]),
      at("barrel", near[1]),
      at("table", far[2]),
      at("chair", far[3], Math.PI),
      ...middle(centre, ["pillar", "pillar"]),
    ],
    ({ near, far, corners, centre, rng }) => [
      at("chest", far[1], askew(rng)),
      at("table", near[0]),
      at("chair", near[1], Math.PI / 2),
      at("barrel", far[2]),
      at("candle", near[2]),
      at("web", corners[2]),
      ...middle(centre, ["barrel", "candle"]),
    ],
  ],
  end: [
    ({ near, far, centre }) => [
      at("crystal", near[0]),
      at("crystal", near[1]),
      at("crystal", near[2]),
      at("candle", near[3]),
      at("pillar", far[0]),
      at("pillar", far[1]),
      ...middle(centre, ["crystal", "crystal"]),
    ],
    ({ near, far, centre }) => [
      at("pillar", far[0]),
      at("pillar", far[1]),
      at("pillar", far[2]),
      at("pillar", far[3]),
      at("crystal", near[1]),
      at("crystal", near[3]),
      at("tile", near[0]),
      ...middle(centre, ["pillar", "pillar"]),
    ],
  ],
  normal: [
    ({ near, far, corners, centre, rng }) => [
      at("chest", near[1], askew(rng)),
      at("barrel", near[0]),
      at("table", far[1]),
      at("chair", far[2], rng() * Math.PI * 2),
      ...(rng() > 0.5 ? [at("potion", near[3])] : []),
      at("web", corners[3]),
      ...middle(centre, ["barrel", "barrel"]),
    ],
    // A room somebody worked in: a bench against the far wall, stools, and
    // the stock stacked in the near corner.
    ({ near, far, corners, centre, rng }) => [
      at("table", far[0], askew(rng)),
      at("chair", far[1], -Math.PI / 2),
      at("chair", near[2], Math.PI / 4),
      at("barrel", near[0]),
      at("barrel", near[1]),
      at("chest", far[3], askew(rng)),
      at("web", corners[0]),
      at("web", corners[2]),
      ...middle(centre, ["bookshelf", "barrel"]),
    ],
    // A room somebody died in.
    ({ near, far, corners, centre, rng }) => [
      at("skull", near[2]),
      at("skull", far[3]),
      at("chest", far[0], askew(rng)),
      at("barrel", near[3]),
      at("pillar", far[2]),
      ...(rng() > 0.4 ? [at("potion", near[1])] : [at("candle", near[1])]),
      at("web", corners[1]),
      at("web", corners[3]),
      ...middle(centre, ["skull", "barrel"]),
    ],
  ],
  treasure: [
    ({ near, far, centre }) => [
      at("chest", near[0], 0.4),
      at("chest", far[1], -0.4),
      at("chest", far[2], 0.9),
      at("barrel", near[3]),
      at("crystal", far[3]),
      at("pillar", near[1]),
      at("pillar", near[2]),
      ...middle(centre, ["pillar", "pillar"]),
    ],
    // Walled off and counted out: the strongroom rather than the hoard.
    ({ near, far, corners, centre, rng }) => [
      at("chest", far[0], askew(rng)),
      at("chest", far[1], askew(rng)),
      at("table", near[0]),
      at("chair", near[1], Math.PI),
      at("crystal", near[2]),
      at("crystal", far[2]),
      at("candle", near[3]),
      at("web", corners[1]),
      // A strongroom with a spare wall gets one more chest to open.
      ...middle(centre, ["chest", "candle"]),
    ],
  ],
  trap: [
    ({ near, far, corners, centre }) => [
      at("chest", near[1], -0.3),
      at("skull", near[0]),
      at("skull", far[2]),
      at("web", corners[1]),
      at("web", corners[2]),
      at("barrel", near[3]),
      ...middle(centre, ["barrel", "skull"]),
    ],
    // Whoever set it left in a hurry.
    ({ near, far, corners, centre, rng }) => [
      at("chest", far[3], askew(rng)),
      at("skull", near[2]),
      at("skull", near[3]),
      at("skull", far[0]),
      at("barrel", near[0]),
      at("table", far[1], askew(rng)),
      at("web", corners[0]),
      at("web", corners[3]),
      ...middle(centre, ["pillar", "skull"]),
    ],
  ],
  // The counter holds near[2].
  shop: [
    ({ near, far, centre }) => [
      at("barrel", near[0]),
      at("barrel", near[1]),
      at("bookshelf", far[2], facing(far[2])),
      at("potion", far[3]),
      at("candle", near[3]),
      ...middle(centre, ["barrel", "potion"]),
    ],
  ],
  // The lectern holds near[3].
  library: [
    ({ near, far, centre }) => [
      at("bookshelf", far[0], facing(far[0])),
      at("bookshelf", far[1], facing(far[1])),
      at("bookshelf", far[2], facing(far[2])),
      at("table", near[0]),
      at("chair", near[1]),
      at("candle", near[2]),
      // The aisle a library is supposed to have.
      ...middle(centre, ["bookshelf", "bookshelf"]),
    ],
  ],
  // The arena, the two trials and nothing else are furnished without a
  // middle even when they have one: the arena's arms sweep the floor and
  // the player has to keep crossing it, the memory trial is read from one
  // end, and the challenge is carried across. Filling the middle of any of
  // the three would be furniture in the way of the thing the room is for.
  arena: [
    ({ near, far }) => [
      at("chest", near[3], 0.5),
      at("pillar", far[0]),
      at("pillar", far[1]),
      at("pillar", far[2]),
      at("pillar", far[3]),
      at("skull", near[0]),
      at("barrel", near[2]),
    ],
  ],
  // The pedestals hold the far anchors and the lectern near[3].
  memory: [({ near }) => [at("pillar", near[0]), at("pillar", near[1]), at("pillar", near[2])]],
  // The plate holds near[0] and the candles near[1] and near[2].
  challenge: [
    ({ near, far, corners }) => [
      at("pillar", far[0]),
      at("pillar", far[1]),
      at("skull", near[3]),
      at("web", corners[0]),
    ],
  ],
};

/**
 * The arrangement this room uses. Drawn from the room's own generator, so a
 * room is furnished the same way every time the player walks back into it.
 */
export function arrangementFor(kind: RoomKind, rng: () => number): Arrangement {
  const options = LAYOUTS[kind];
  return options[Math.floor(rng() * options.length)];
}
