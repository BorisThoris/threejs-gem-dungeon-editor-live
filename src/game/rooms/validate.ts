import { cornerSpots, inDoorLane, keyPosition, orientationOf, overhangsLane } from "../dungeon/layout";
import { inscribedRadius, type Room, type RoomTemplate } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { reservedAnchorsFor } from "./anchors";
import { claimedSpots, gemFor } from "./kinds";
import { orientProps } from "./templates";

/**
 * Whether an authored room is one the game will actually draw.
 *
 * `isRoomTemplate` in the editor answers a different and much weaker
 * question - is this well-formed JSON with kinds the game knows - and a
 * template can pass it and still lose half its props. Everything placed in
 * a room goes through the same filters the seeded dressing does, and
 * anything that fails is dropped without a word, so a template that breaks
 * a rule renders as a sparse room rather than as an error. A treasure room
 * shipped with three chests and showed two for weeks.
 *
 * One owner for those rules, because two very different things need them:
 * the layout check, which holds what ships to them, and the Room Builder,
 * which had no way to tell an author that the chest they just placed would
 * never appear. That gap is why the last set of templates was written by
 * editing JSON by hand instead.
 *
 * Pure, so the check can bundle it for node.
 */

export interface TemplateProblem {
  /** Index into the template's props, or -1 for the template itself. */
  index: number;
  reason: string;
}

/** How much clearance a prop needs from the gem, the key and the content. */
const clearOf = (solid: boolean) => (solid ? 1.6 : 1.0);
const CLEAR_OF_CONTENT = 1.2;

/**
 * The room a template describes, with every wall doored: the hard case.
 *
 * `grid` picks which way round the room is furnished. A template has to be
 * legal in all eight, because the room it lands in could be any of them,
 * and the check that holds what ships walks every one.
 */
export function roomForTemplate(t: RoomTemplate, grid = { x: 0, z: 0 }): Room {
  return {
    id: "authored",
    kind: t.kind,
    seed: 0,
    grid,
    size: t.size,
    shape: t.shape,
    links: { north: "a", south: "b", east: "c", west: "d" },
    template: t.id,
  };
}

/**
 * Everything wrong with a template, or an empty list.
 *
 * @param seeds How many seeds to try. The gem and the key take a seeded
 *   anchor, so a prop can be safe on one floor and dropped on the next -
 *   which is how the shipped treasure room's missing chest hid. One seed is
 *   enough for a live warning in the editor; the check that holds shipped
 *   content uses many.
 */
export function templateProblems(
  t: RoomTemplate,
  seeds = 1,
  grid = { x: 0, z: 0 }
): TemplateProblem[] {
  const problems: TemplateProblem[] = [];
  const room = roomForTemplate(t, grid);
  const reserved = reservedAnchorsFor(t.kind, room);
  const corners = cornerSpots(room);
  const reach = inscribedRadius(room);
  const half = t.size / 2;

  // Turned the way this room is, because everything it is measured against
  // - the gem, the key, the braziers, the kind's own content - is turned
  // too. Comparing an unturned prop to a turned gem is a measurement of a
  // room that does not exist.
  orientProps(t.props, orientationOf(room)).forEach((p, index) => {
    const spec = PROP_SPECS[p.kind];
    if (!spec) {
      problems.push({ index, reason: `${p.kind} is not a prop the game has` });
      return;
    }
    const clear = clearOf(spec.solid);
    const say = (reason: string) => problems.push({ index, reason: `${spec.title}: ${reason}` });

    // Measured from the prop's edge, not its centre. Every placement rule
    // in this game used to test the centre point, which let a template put
    // a table's near metre through a wall or into a doorway and call it
    // legal - the same blind spot that had the seeded arrangements standing
    // props inside each other.
    if (Math.abs(p.x) + spec.radius > half || Math.abs(p.z) + spec.radius > half) {
      say("reaches through a wall");
    } else if (t.shape !== "square" && Math.hypot(p.x, p.z) + spec.radius > reach) {
      say("reaches off the drawn floor of this shape");
    }
    // The worst case on purpose: `roomForTemplate` doors every wall, and a
    // template has to survive being placed in any room the generator makes.
    // A one-axis room would keep a prop across its middle; a four-doored
    // one would drop it, and the author would never know which they got.
    if (spec.solid && inDoorLane(p.x, p.z, room)) say("stands in a doorway's path and will be dropped");
    if (spec.solid && overhangsLane(p.x, p.z, spec.radius, room)) {
      say("reaches into a doorway's path");
    }
    if (reserved.some((a) => Math.hypot(a[0] - p.x, a[2] - p.z) < CLEAR_OF_CONTENT)) {
      say("stands where this room's own content stands and will be dropped");
    }
    if (corners.some((c) => Math.hypot(c[0] - p.x, c[2] - p.z) < spec.radius + 0.4)) {
      say("stands inside one of the room's braziers");
    }
    for (let seed = 1; seed <= seeds; seed++) {
      const gem = gemFor(room, seed);
      if (gem && Math.hypot(gem[0] - p.x, gem[2] - p.z) < clear) {
        say("is too close to where the gem can land and will be dropped");
        break;
      }
      const key = keyPosition(room, seed, [...claimedSpots(room), ...(gem ? [gem] : [])]);
      if (Math.hypot(key[0] - p.x, key[2] - p.z) < clear) {
        say("is too close to where the floor's key can land and will be dropped");
        break;
      }
    }
    // Two solid props whose footprints meet is one prop inside another, and
    // nothing downstream compares a prop to another prop. This used to
    // compare their centres to within a millimetre, which caught only the
    // case of clicking the same cell twice.
    const twin = orientProps(t.props, orientationOf(room)).findIndex((q, j) => {
      if (j >= index) return false;
      const other = PROP_SPECS[q.kind];
      if (!other) return false;
      const apart = Math.hypot(q.x - p.x, q.z - p.z);
      if (apart < 1e-3) return true;
      return spec.solid && other.solid && apart < spec.radius + other.radius;
    });
    if (twin >= 0) say(`stands inside the ${PROP_SPECS[t.props[twin].kind]?.title ?? "prop"}`);
  });

  return problems;
}
