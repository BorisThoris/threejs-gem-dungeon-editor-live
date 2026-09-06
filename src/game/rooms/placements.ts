/**
 * Where a room's furniture stands: the pure half of the dressing.
 *
 * Out of the component module so that the store can ask what stood in a
 * blast without importing a React tree, and so the body table and the
 * ambient life read the same list the room draws.
 */
import {
  centreSpots,
  cornerSpots,
  HAZARD_RADIUS,
  inDoorLane,
  quadrantSpots,
  trapHazards,
  type Vec3,
} from "../dungeon/layout";
import { memoryAnchors } from "../puzzles/anchors";
import { createRng, shuffle } from "../rng";
import type { PropPlacement, Room, RoomKind } from "../dungeon/types";
import { CATALOG } from "../props/catalog";
import { gemFor, keyFor, reservedAnchors } from "./kinds";
import { biomeFor } from "./biomes";
import { arrangementFor, type Spots } from "./layouts";
import { authoredProps } from "./templates";


/** How close a prop may stand to the gem or to the kind's own content. */
const CLEAR_OF_GEM = 1.0;
const SOLID_CLEAR_OF_GEM = 1.6;
const CLEAR_OF_CONTENT = 1.2;
const CLEAR_OF_SPIKES = HAZARD_RADIUS + 0.5;
/** The Sentry's post is a fifth of a metre across and two metres tall. */
const CLEAR_OF_SENTRY = 1.3;
/** A key lying on the floor: small, but it has to be seen to be found. */
const CLEAR_OF_KEY = 1.2;
/** How far the biome's own litter stands off anything already placed. */
const CLEAR_OF_LITTER = 1.2;
/** How far anything tall stands off a line from the lectern to a crystal. */
const CLEAR_OF_SIGHT = 0.9;

const near2 = (p: PropPlacement, a: Vec3, r: number) =>
  (p.x - a[0]) ** 2 + (p.z - a[2]) ** 2 < r * r;

/**
 * The placements a room gets: its template if it has one, else its kind's
 * layout. Whoever placed them, three rules apply: nothing solid stands in
 * a doorway's path, nothing stands where the kind's content stands, and
 * nothing hides the gem or the spikes guarding it.
 *
 * The first of those reads the room's own doors, so a room with doors on
 * one axis only keeps what an author or an arrangement put across its
 * middle instead of dropping it.
 */
/**
 * Furnished as the floor's vault, whatever kind of room it happens to be.
 *
 * The lock is put on whichever room the floor can be walked without, and
 * that is a treasure room only 29% of the time - the rest is a set piece
 * or a plain chamber. Measured over 899 locked rooms: a vault held 0.97
 * chests, an ordinary chamber 0.90, and the treasure rooms standing open
 * elsewhere on the same floors held 2.35. The lock cost a key and paid the
 * price of any room on the floor, which is the same as paying nothing, and
 * the comment above `Chests` had been claiming "the vault, with three of
 * them, is finally worth its name" on the assumption that a vault is a
 * treasure room.
 *
 * So being the vault is what decides the furniture now, not the kind the
 * room was drawn as. A set piece keeps its own content - a locked shop is
 * still a shop - and gets a treasure room's chests around it.
 */
export interface DressingOptions {
  /** This is the floor's locked room. */
  asVault?: boolean;
  /**
   * Where this room's Sentry stands, if it has one.
   *
   * Its post goes on the same ring the furniture does and neither side
   * knew about the other, so a quarter of them stood inside a chest. The
   * watcher is chosen first - it needs only the room, the seed and the
   * floor - and what it takes is passed in here, the same way the kind's
   * own content and the gem are kept clear of.
   */
  sentry?: Vec3 | null;
  /** Where the floor's key lies, in the one room that holds it. */
  key?: Vec3 | null;
}

export function placementsFor(room: Room, seed: number, opts: DressingOptions = {}): PropPlacement[] {
  const authored = authoredProps(room);
  const reserved = reservedAnchors(room);
  const gem = gemFor(room, seed);
  const spikes = room.kind === "trap" && gem ? trapHazards(room, gem) : [];

  /**
   * The room furnished as one kind or another.
   *
   * Its own generator each time, from the same key, so asking twice does
   * not change the answer to either question: the arrangement is drawn
   * before it is run, and a shared generator would have the second call
   * furnishing with the first one's numbers.
   */
  const near = quadrantSpots(room, "near");
  const far = quadrantSpots(room, "far");
  const corners = cornerSpots(room);
  /**
   * The memory trial's lines of sight: lectern to each crystal.
   *
   * Reachability was the question the furniture had always been held to,
   * and a pillar you can walk round is still a pillar you cannot see
   * through. Anything tall enough to hide a crystal - which is anything
   * solid wider than a candle - keeps off these lines, and litter goes
   * through the same filter as everything else, so a biome cannot put an
   * urn where the arrangement was forbidden to.
   */
  const sight = room.kind === "memory" ? memoryAnchors(room) : null;
  const hidesACrystal = (p: PropPlacement): boolean => {
    if (!sight) return false;
    const [lx, , lz] = sight[4];
    const reach = CATALOG[p.kind].radius + CLEAR_OF_SIGHT;
    for (const [px, , pz] of sight.slice(0, 4)) {
      const dx = px - lx;
      const dz = pz - lz;
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((p.x - lx) * dx + (p.z - lz) * dz) / len2));
      const cx = lx + dx * t;
      const cz = lz + dz * t;
      if ((p.x - cx) ** 2 + (p.z - cz) ** 2 < reach * reach) return true;
    }
    return false;
  };
  // Empty in a room whose doors cross its middle, which is why every
  // arrangement has to place these by spreading rather than by index.
  const centre = centreSpots(room);

  /** Whether a prop of this kind may stand here at all. */
  const allowed = (p: PropPlacement): boolean => {
    const solid = CATALOG[p.kind].solid;
    if (solid && inDoorLane(p.x, p.z, room)) return false;
    if (solid && CATALOG[p.kind].radius > 0.2 && hidesACrystal(p)) return false;
    if (reserved.some((a) => near2(p, a, CLEAR_OF_CONTENT))) return false;
    if (opts.sentry && near2(p, opts.sentry, CLEAR_OF_SENTRY)) return false;
    if (opts.key && near2(p, opts.key, CLEAR_OF_KEY)) return false;
    if (gem && near2(p, gem, solid ? SOLID_CLEAR_OF_GEM : CLEAR_OF_GEM)) return false;
    if (spikes.some((a) => near2(p, a, CLEAR_OF_SPIKES))) return false;
    return true;
  };

  const dress = (dressAs: RoomKind): PropPlacement[] => {
    const rng = createRng(`${seed}:${room.id}:dressing`);
    const spots: Spots = { near, far, corners, centre, rng };
    const torches = spots.corners.map<PropPlacement>((c) => ({ kind: "torch", x: c[0], z: c[2], rotation: 0 }));
    const layout = room.template ? authored : arrangementFor(dressAs, rng)(spots);
    return [...torches, ...layout].filter(allowed);
  };

  /**
   * What the biome leaves lying about.
   *
   * The biome tinted the room and furnished nothing, so a flooded cistern
   * and a dry catacomb were the same room in two colours. Two of the
   * biome's own props go on anchors the arrangement did not want, held to
   * exactly the same `allowed` rules as everything else - out of the door
   * lanes, clear of the gem, the spikes, the watcher, the key and the
   * kind's own content - and clear of what the arrangement already placed,
   * so a biome can never make a room unwalkable or bury its point.
   *
   * An authored template is left alone: somebody placed those by hand.
   */
  const scatter = (placed: PropPlacement[]): PropPlacement[] => {
    if (room.template) return placed;
    const biome = biomeFor(room.kind, room.id, seed);
    if (!biome.litter.length) return placed;
    const rng = createRng(`${seed}:${room.id}:litter`);
    const spots = shuffle(rng, [...corners, ...far, ...near, ...centre]);
    const out = [...placed];
    let laid = 0;
    for (const spot of spots) {
      if (laid >= biome.litter.length) break;
      const kind = biome.litter[laid];
      const p: PropPlacement = { kind, x: spot[0], z: spot[2], rotation: rng() * Math.PI * 2 };
      if (!allowed(p)) continue;
      if (out.some((q) => near2(p, [q.x, 0, q.z], CLEAR_OF_LITTER))) continue;
      out.push(p);
      laid++;
    }
    return out;
  };

  const own = scatter(dress(room.kind));
  if (!opts.asVault || room.template) return own;

  // A treasure room's chests have to fit around whatever the room already
  // holds, and in a set piece some of them do not: two locked rooms in
  // three hundred and sixty came out with less in them than they would
  // have had unlocked. Whichever way round it falls, the lock never takes
  // anything out of the room.
  const chests = (ps: PropPlacement[]) => ps.filter((p) => p.kind === "chest").length;
  const vaulted = dress("treasure");
  const picked = chests(vaulted) >= chests(own) ? vaulted : own;
  if (chests(picked) > 0) return picked;

  /**
   * A locked room with no chest in it at all: eight percent of them,
   * measured over nine hundred floors. The arrangement's chests had been
   * filtered out by whatever the room already had standing in it.
   *
   * One goes back at the first anchor that passes the same rules the
   * arrangement's own props are held to and is clear of what is already
   * there - furthest ring first, because that is where a chest looks like
   * it belongs. It fixes the ones with room for it and leaves about seven
   * percent, and those turn out to be exactly the set pieces: a locked
   * challenge room, memory trial or shop, whose own content is the reward
   * and whose anchors are all spoken for. `yarn test:layout` holds the
   * line there - a locked room is never a plain chamber with nothing
   * extra in it.
   */
  const CLEAR_OF_PROPS = 1.4;
  for (const spot of [...far, ...near, ...centre]) {
    const chest: PropPlacement = { kind: "chest", x: spot[0], z: spot[2], rotation: 0 };
    if (!allowed(chest)) continue;
    if (picked.some((p) => near2(p, spot, CLEAR_OF_PROPS))) continue;
    return [...picked, chest];
  }
  return picked;
}
