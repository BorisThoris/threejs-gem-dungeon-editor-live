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
 * What the trader offers, and WHERE each offer stands.
 *
 * The five of them used to be written as offsets inside the shop's own
 * component - and two of them, the oil and the blessing, were written at
 * the same offset. Nothing could ever reach the second: the prompt takes
 * the nearest thing that can be used, and two things at one point are one
 * thing. Nobody noticed because no check knew where an offer stood; the
 * geometry lived in a component and only the component could see it.
 *
 * So it lives here, with the room's other anchors, and the layout check
 * holds it: five offers, five places, none of them on top of another.
 *
 * The counter itself keeps the ordinary reach, because it is the thing a
 * player walks to. The goods laid out on it are `NEAR_REACH`, which is
 * close enough that standing at the counter offers the counter and
 * stepping up to a particular one offers that. That asymmetry is the whole
 * fix: five things at arm's length with a three-metre reach each is a
 * coin toss, and the player was losing it.
 */
export type ShopOfferId = "life" | "naming" | "blessing" | "bomb" | "oil";

export interface ShopOffer {
  id: ShopOfferId;
  x: number;
  z: number;
  /** How close the player has to be. The counter's own is the default. */
  reach?: number;
}

/**
 * How close you stand to pick one thing off the counter rather than another.
 *
 * Half the counter's own reach and no less: a metre was small enough that a
 * player had to stand on the exact spot, and the smoke suite - which walks
 * with the same clumsiness a person does - could not reach the naming at
 * all. The goods are 1.6m apart, so this still leaves the nearest one
 * unambiguous, and the counter's standing spot is over three metres from
 * every one of them.
 */
export const NEAR_REACH = 1.5;

/**
 * How far behind the counter the goods are laid out.
 *
 * On the counter's own side, which is what makes the arbitration work: a
 * player standing anywhere in the room in front of the counter is further
 * from every good than they are from the counter, so walking up to trade
 * offers the trade. Step round the counter to the goods and the goods
 * answer, which is what they are for.
 *
 * The number is the smallest that clears the goods' reach from the counter
 * itself, with margin: at the counter a good is 1.97m away against a reach
 * of 1.5. Below about 1.6 the counter starts losing to its own stock.
 */
export const GOODS_OUT = 1.8;

/**
 * Laid out so that none of them is on the line a player walks in on.
 *
 * A good sitting between the doorway and the counter is a good that
 * answers when you meant the counter, which is the bug in its other form.
 */
export const shopOffers = (room: Room): ShopOffer[] => {
  const [x, , z] = shopAnchors(room)[0];
  /**
   * Laid out on the counter's OWN side, away from the middle of the room.
   *
   * Which side that is has to be worked out rather than assumed: the
   * counter takes a near quadrant spot, and which quadrant depends on the
   * room. The first version of this put the goods between the doorway and
   * the counter, so walking up to the counter offered a bomb - the same
   * bug in its other form, and the layout check caught it the first time
   * it ran.
   */
  const len = Math.hypot(x, z) || 1;
  const away: [number, number] = [x / len, z / len];
  const along: [number, number] = [-away[1], away[0]];
  const at = (out: number, side: number): { x: number; z: number } => ({
    x: +(x + away[0] * out + along[0] * side).toFixed(3),
    z: +(z + away[1] * out + along[1] * side).toFixed(3),
  });
  return [
    { id: "life", x, z },
    { id: "naming", ...at(GOODS_OUT, -2.4), reach: NEAR_REACH },
    { id: "blessing", ...at(GOODS_OUT, -0.8), reach: NEAR_REACH },
    { id: "oil", ...at(GOODS_OUT, 0.8), reach: NEAR_REACH },
    { id: "bomb", ...at(GOODS_OUT, 2.4), reach: NEAR_REACH },
  ];
};

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
  // The counter, the two pedestals AND the five things laid out on the
  // counter: an offer a barrel is standing on is an offer nobody can take,
  // which is the same bug as two offers at one point and was next.
  shop: (room) => [...shopAnchors(room), ...shopOffers(room).map((o): Vec3 => [o.x, 0, o.z])],
  library: (room) => [libraryLectern(room)],
  memory: memoryAnchors,
  challenge: challengeAnchors,
  shrine: (room) => [shrineAnchor(room)],
  secret: () => [],
};

/** The anchors this room's kind has claimed for its own content. */
export const reservedAnchorsFor = (kind: RoomKind, room: Room): Vec3[] =>
  RESERVED_ANCHORS[kind]?.(room) ?? [];
