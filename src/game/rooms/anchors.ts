import { centreSpots, inDoorLane, quadrantSpots, type Vec3 } from "../dungeon/layout";
import { diagonalReach, type Room, type RoomKind } from "../dungeon/types";
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

/**
 * Where the shrine stands: the middle of the room if its doors leave one,
 * and the far quadrant otherwise. It is the only thing in the room, so it
 * gets the spot a player walks towards.
 */
export const shrineAnchor = (room: Room): Vec3 => {
  // The first spot that is actually on the floor and out of every doorway.
  // Taking the middle when there was one and the far quadrant otherwise put
  // a quarter of the fonts in a door lane or off the edge of a shaped
  // room - 272 of 360 placed legally - because neither spot is guaranteed
  // to be either. The room's own geometry decides, the same way the gem's
  // does.
  const half = diagonalReach(room);
  for (const spot of [...centreSpots(room), ...quadrantSpots(room, "far"), ...quadrantSpots(room, "near")]) {
    if (Math.hypot(spot[0], spot[2]) > half) continue;
    if (inDoorLane(spot[0], spot[2], room)) continue;
    return spot;
  }
  return quadrantSpots(room, "far")[0];
};

/** The lectern the number puzzle is read from. */
export const libraryLectern = (room: Room): Vec3 => quadrantSpots(room, "near")[3];

export const RESERVED_ANCHORS: Partial<Record<RoomKind, (room: Room) => Vec3[]>> = {
  shop: shopAnchors,
  library: (room) => [libraryLectern(room)],
  memory: memoryAnchors,
  challenge: challengeAnchors,
  shrine: (room) => [shrineAnchor(room)],
};

/** The anchors this room's kind has claimed for its own content. */
export const reservedAnchorsFor = (kind: RoomKind, room: Room): Vec3[] =>
  RESERVED_ANCHORS[kind]?.(room) ?? [];
