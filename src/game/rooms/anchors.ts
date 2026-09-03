import { quadrantSpots, type Vec3 } from "../dungeon/layout";
import type { Room, RoomKind } from "../dungeon/types";
import { challengeAnchors, memoryAnchors } from "../puzzles/anchors";

/**
 * Which anchors each kind's own content stands on.
 *
 * The one owner of that fact. It used to be a third argument to
 * `registerRoomKind`, which meant the answer lived wherever the component
 * happened to be written - and three separate things need it without
 * wanting a component tree: the gem, so it does not land on the shop
 * counter; the dressing, so a barrel does not stand inside the lectern; and
 * the layout check, which runs in node and validates that an authored
 * template has not put a chest on the pressure plate.
 *
 * A kind with no entry claims nothing, which is most of them: they are
 * dressed and nothing else.
 */

/** The counter holds near[2]; the shelves the first two far anchors. */
export const shopAnchors = (room: Room): Vec3[] => [
  quadrantSpots(room, "near")[2],
  quadrantSpots(room, "far")[0],
  quadrantSpots(room, "far")[1],
];

/** The lectern the number puzzle is read from. */
export const libraryLectern = (room: Room): Vec3 => quadrantSpots(room, "near")[3];

export const RESERVED_ANCHORS: Partial<Record<RoomKind, (room: Room) => Vec3[]>> = {
  shop: shopAnchors,
  library: (room) => [libraryLectern(room)],
  memory: memoryAnchors,
  challenge: challengeAnchors,
};

/** The anchors this room's kind has claimed for its own content. */
export const reservedAnchorsFor = (kind: RoomKind, room: Room): Vec3[] =>
  RESERVED_ANCHORS[kind]?.(room) ?? [];
