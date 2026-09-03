import type { PropPlacement, RoomKind } from "../dungeon/types";

/**
 * How a room of each kind is furnished, when nobody has authored it.
 *
 * Every room is lit from its corners; the kind decides what fills the space
 * between. Props go in the diagonal quadrants only - the only part of a
 * four-doored room that is never on a path between doorways - and the
 * quadrant anchors already keep clear of the door lanes, so an arrangement
 * that only ever names an anchor is legal by construction.
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
  near: [number, number, number][];
  far: [number, number, number][];
  corners: [number, number, number][];
  rng: () => number;
}

export type Arrangement = (s: Spots) => PropPlacement[];

const at = (
  kind: PropPlacement["kind"],
  [x, , z]: [number, number, number],
  rotation = 0
): PropPlacement => ({ kind, x, z, rotation });

/** A quarter turn either way, so a chair is not always square to the room. */
const askew = (rng: () => number) => rng() * 0.9 - 0.45;

export const LAYOUTS: Record<RoomKind, Arrangement[]> = {
  start: [
    ({ near, far }) => [
      at("chest", near[0]),
      at("barrel", near[1]),
      at("table", far[2]),
      at("chair", far[3], Math.PI),
    ],
    ({ near, far, corners, rng }) => [
      at("chest", far[1], askew(rng)),
      at("table", near[0]),
      at("chair", near[1], Math.PI / 2),
      at("barrel", far[2]),
      at("candle", near[2]),
      at("web", corners[2]),
    ],
  ],
  end: [
    ({ near, far }) => [
      at("crystal", near[0]),
      at("crystal", near[1]),
      at("crystal", near[2]),
      at("candle", near[3]),
      at("pillar", far[0]),
      at("pillar", far[1]),
    ],
    ({ near, far }) => [
      at("pillar", far[0]),
      at("pillar", far[1]),
      at("pillar", far[2]),
      at("pillar", far[3]),
      at("crystal", near[1]),
      at("crystal", near[3]),
      at("tile", near[0]),
    ],
  ],
  normal: [
    ({ near, far, corners, rng }) => [
      at("chest", near[1], askew(rng)),
      at("barrel", near[0]),
      at("table", far[1]),
      at("chair", far[2], rng() * Math.PI * 2),
      ...(rng() > 0.5 ? [at("potion", near[3])] : []),
      at("web", corners[3]),
    ],
    // A room somebody worked in: a bench against the far wall, stools, and
    // the stock stacked in the near corner.
    ({ near, far, corners, rng }) => [
      at("table", far[0], askew(rng)),
      at("chair", far[1], -Math.PI / 2),
      at("chair", near[2], Math.PI / 4),
      at("barrel", near[0]),
      at("barrel", near[1]),
      at("chest", far[3], askew(rng)),
      at("web", corners[0]),
      at("web", corners[2]),
    ],
    // A room somebody died in.
    ({ near, far, corners, rng }) => [
      at("skull", near[2]),
      at("skull", far[3]),
      at("chest", far[0], askew(rng)),
      at("barrel", near[3]),
      at("pillar", far[2]),
      ...(rng() > 0.4 ? [at("potion", near[1])] : [at("candle", near[1])]),
      at("web", corners[1]),
      at("web", corners[3]),
    ],
  ],
  treasure: [
    ({ near, far }) => [
      at("chest", near[0], 0.4),
      at("chest", far[1], -0.4),
      at("chest", far[2], 0.9),
      at("barrel", near[3]),
      at("crystal", far[3]),
      at("pillar", near[1]),
      at("pillar", near[2]),
    ],
    // Walled off and counted out: the strongroom rather than the hoard.
    ({ near, far, corners, rng }) => [
      at("chest", far[0], askew(rng)),
      at("chest", far[1], askew(rng)),
      at("table", near[0]),
      at("chair", near[1], Math.PI),
      at("crystal", near[2]),
      at("crystal", far[2]),
      at("candle", near[3]),
      at("web", corners[1]),
    ],
  ],
  trap: [
    ({ near, far, corners }) => [
      at("chest", near[1], -0.3),
      at("skull", near[0]),
      at("skull", far[2]),
      at("web", corners[1]),
      at("web", corners[2]),
      at("barrel", near[3]),
    ],
    // Whoever set it left in a hurry.
    ({ near, far, corners, rng }) => [
      at("chest", far[3], askew(rng)),
      at("skull", near[2]),
      at("skull", near[3]),
      at("skull", far[0]),
      at("barrel", near[0]),
      at("table", far[1], askew(rng)),
      at("web", corners[0]),
      at("web", corners[3]),
    ],
  ],
  // The counter holds near[2].
  shop: [
    ({ near, far }) => [
      at("barrel", near[0]),
      at("barrel", near[1]),
      at("bookshelf", far[2]),
      at("potion", far[3]),
      at("candle", near[3]),
    ],
  ],
  // The lectern holds near[3].
  library: [
    ({ near, far }) => [
      at("bookshelf", far[0], Math.PI / 4),
      at("bookshelf", far[1], -Math.PI / 4),
      at("bookshelf", far[2], -Math.PI / 4),
      at("table", near[0]),
      at("chair", near[1]),
      at("candle", near[2]),
    ],
  ],
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
