/* eslint-disable react-refresh/only-export-components -- placementsFor is the
   pure half of this component and the editor previews with it directly. */
import { useMemo } from "react";

import {
  centreSpots,
  cornerSpots,
  HAZARD_RADIUS,
  inDoorLane,
  quadrantSpots,
  trapHazards,
  type Vec3,
} from "../dungeon/layout";
import { createRng } from "../rng";
import type { PropPlacement, Room, RoomKind } from "../dungeon/types";
import { InteractTrigger } from "../interact/InteractTrigger";
import { SATCHEL_SLOTS, nameOf, rollItem } from "../items/catalog";
import { Braziers } from "../props/Braziers";
import { ContactShadows } from "../props/ContactShadows";
import { CATALOG, Prop, PropColliders } from "../props/catalog";
import { useRun } from "../state/run";
import { gemFor, keyFor, reservedAnchors } from "./kinds";
import { CLOSE_REACH } from "../world";
import { arrangementFor, type Spots } from "./layouts";
import { sentryFor } from "../sentry/placement";
import { authoredProps } from "./templates";

interface DressingProps {
  room: Room;
  seed: number;
}

/** How close a prop may stand to the gem or to the kind's own content. */
const CLEAR_OF_GEM = 1.0;
const SOLID_CLEAR_OF_GEM = 1.6;
const CLEAR_OF_CONTENT = 1.2;
const CLEAR_OF_SPIKES = HAZARD_RADIUS + 0.5;
/** The Sentry's post is a fifth of a metre across and two metres tall. */
const CLEAR_OF_SENTRY = 1.3;
/** A key lying on the floor: small, but it has to be seen to be found. */
const CLEAR_OF_KEY = 1.2;

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
  // Empty in a room whose doors cross its middle, which is why every
  // arrangement has to place these by spreading rather than by index.
  const centre = centreSpots(room);

  /** Whether a prop of this kind may stand here at all. */
  const allowed = (p: PropPlacement): boolean => {
    const solid = CATALOG[p.kind].solid;
    if (solid && inDoorLane(p.x, p.z, room)) return false;
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

  const own = dress(room.kind);
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

/** Seeded per room, so it is the same every time you walk back in. */
export function Dressing({ room, seed }: DressingProps) {
  const asVault = useRun((s) => s.dungeon?.vaultId === room.id);
  const hasKey = useRun((s) => s.dungeon?.keyRoomId === room.id);
  const floor = useRun((s) => s.floor);
  // The order a room is assembled in: the gem, then the key, then the
  // watcher, then the furniture. Each is worked out from the room and the
  // seed alone, so the room shell and this arrive at the same answers
  // without talking to each other.
  const key = useMemo(() => (hasKey ? keyFor(room, seed) : null), [room, seed, hasKey]);
  const sentry = useMemo(
    () => sentryFor(room, seed, floor, key ? [key] : [])?.at ?? null,
    [room, seed, floor, key]
  );
  const placements = useMemo(
    () => placementsFor(room, seed, { asVault, sentry, key }),
    [room, seed, asVault, sentry, key]
  );
  // The gem and the room's own content stand on the same floor the props
  // do, so they are grounded the same way.
  const grounded = useMemo(() => {
    const gem = gemFor(room, seed);
    return [...reservedAnchors(room), ...(gem ? [gem] : [])];
  }, [room, seed]);
  // The braziers are drawn as one instanced set rather than one at a time:
  // four of them in every room, seven identical meshes each, and nothing
  // about them ever moves. Split by kind here rather than in the layouts,
  // so an authored template that places a brazier joins the same set.
  const [braziers, rest] = useMemo(() => {
    const lit: PropPlacement[] = [];
    const other: PropPlacement[] = [];
    for (const p of placements) (p.kind === "torch" ? lit : other).push(p);
    return [lit, other];
  }, [placements]);

  return (
    <group>
      <Braziers places={braziers} />
      {rest.map((p, i) => (
        <Prop key={i} kind={p.kind} position={[p.x, 0, p.z]} rotation={p.rotation} scale={p.scale} />
      ))}
      <ContactShadows placements={placements} extra={grounded} />
      <PropColliders placements={placements} />
      <Chests room={room} placements={placements} />
    </group>
  );
}

/**
 * The chests in a room, and what is in them.
 *
 * A chest was scenery until now. Each one holds one consumable, decided by
 * the run's seed and the floor, and stays empty once taken - so a room is
 * worth walking into for something other than its gem, and the vault, with
 * three of them, is finally worth its name.
 */
function Chests({ room, placements }: { room: Room; placements: PropPlacement[] }) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const floor = useRun((s) => s.floor);
  const looted = useRun((s) => s.looted);
  const appearances = useRun((s) => s.appearances);
  const identified = useRun((s) => s.identified);
  /**
   * A chest with nowhere to put what is in it.
   *
   * `takeItem` declines a full satchel, and a chest was one of the three
   * triggers in the game with no `enabled` on it, so it went on offering
   * "Open the chest - a green potion" with four things already carried and
   * E did nothing but drop a hint afterwards. Saying so before the press is
   * better on its own, and it stopped being optional when the prompt began
   * going to the nearest thing that can actually be *used*: a chest that
   * claims it can be outranks the door standing beside it, and the player
   * cannot leave the room the game is telling them to loot.
   */
  const full = useRun((s) => s.satchel.length >= SATCHEL_SLOTS);

  return (
    <>
      {placements.map((p, i) => {
        if (p.kind !== "chest") return null;
        const key = `${room.id}:${i}`;
        if (looted.includes(key)) return null;
        const id = rollItem(seed, key, floor);
        const known = identified.includes(id);
        const what = nameOf(id, appearances, known);
        return (
          <InteractTrigger
            key={key}
            position={[p.x, 0, p.z]}
            label={`Open the chest - ${what}`}
            enabled={!full}
            blockedReason="Your satchel is full. Use something first."
            radius={CLOSE_REACH}
            onInteract={() => useRun.getState().takeItem(id, key)}
          />
        );
      })}
    </>
  );
}
