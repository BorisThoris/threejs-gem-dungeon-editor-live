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
import type { PropPlacement, Room } from "../dungeon/types";
import { InteractTrigger } from "../interact/InteractTrigger";
import { nameOf, rollItem } from "../items/catalog";
import { Braziers } from "../props/Braziers";
import { ContactShadows } from "../props/ContactShadows";
import { CATALOG, Prop, PropColliders } from "../props/catalog";
import { useRun } from "../state/run";
import { gemFor, reservedAnchors } from "./kinds";
import { arrangementFor, type Spots } from "./layouts";
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
export function placementsFor(room: Room, seed: number): PropPlacement[] {
  const authored = authoredProps(room);
  const rng = createRng(`${seed}:${room.id}:dressing`);
  const spots: Spots = {
    near: quadrantSpots(room, "near"),
    far: quadrantSpots(room, "far"),
    corners: cornerSpots(room),
    // Empty in a room whose doors cross its middle, which is why every
    // arrangement has to place these by spreading rather than by index.
    centre: centreSpots(room),
    rng,
  };
  const torches = spots.corners.map<PropPlacement>((c) => ({ kind: "torch", x: c[0], z: c[2], rotation: 0 }));
  // The arrangement is drawn before it is run, so a kind with several of
  // them spends one number choosing and the rest furnishing.
  const layout = room.template ? authored : arrangementFor(room.kind, rng)(spots);
  const reserved = reservedAnchors(room);
  const gem = gemFor(room, seed);
  const spikes = room.kind === "trap" && gem ? trapHazards(room, gem) : [];
  return [...torches, ...layout].filter((p) => {
    const solid = CATALOG[p.kind].solid;
    if (solid && inDoorLane(p.x, p.z, room)) return false;
    if (reserved.some((a) => near2(p, a, CLEAR_OF_CONTENT))) return false;
    if (gem && near2(p, gem, solid ? SOLID_CLEAR_OF_GEM : CLEAR_OF_GEM)) return false;
    if (spikes.some((a) => near2(p, a, CLEAR_OF_SPIKES))) return false;
    return true;
  });
}

/** Seeded per room, so it is the same every time you walk back in. */
export function Dressing({ room, seed }: DressingProps) {
  const placements = useMemo(() => placementsFor(room, seed), [room, seed]);
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
            radius={2.2}
            onInteract={() => useRun.getState().takeItem(id, key)}
          />
        );
      })}
    </>
  );
}
