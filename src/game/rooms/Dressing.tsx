/* eslint-disable react-refresh/only-export-components -- placementsFor is the
   pure half of this component and the editor previews with it directly. */
import { useMemo } from "react";

import { cornerSpots, HAZARD_RADIUS, inDoorLane, quadrantSpots, trapHazards, type Vec3 } from "../dungeon/layout";
import { createRng } from "../rng";
import type { PropPlacement, Room, RoomKind } from "../dungeon/types";
import { InteractTrigger } from "../interact/InteractTrigger";
import { nameOf, rollItem } from "../items/catalog";
import { CATALOG, Prop, PropColliders } from "../props/catalog";
import { useRun } from "../state/run";
import { gemFor, reservedAnchors } from "./kinds";
import { getTemplate } from "./templates";

interface DressingProps {
  room: Room;
  seed: number;
}

type Spots = {
  near: [number, number, number][];
  far: [number, number, number][];
  corners: [number, number, number][];
  rng: () => number;
};

const at = (kind: PropPlacement["kind"], [x, , z]: [number, number, number], rotation = 0): PropPlacement => ({
  kind,
  x,
  z,
  rotation,
});

/**
 * What each kind puts in its quadrants when it has no authored template.
 *
 * Every room is lit from its corners; the kind decides what fills the
 * space between. Props go in the diagonal quadrants only - the only part of
 * a four-doored room that is never on a path between doorways - and the
 * quadrant anchors already keep clear of the door lanes.
 */
const LAYOUTS: Record<RoomKind, (s: Spots) => PropPlacement[]> = {
  start: ({ near, far }) => [
    at("chest", near[0]),
    at("barrel", near[1]),
    at("table", far[2]),
    at("chair", far[3], Math.PI),
  ],
  end: ({ near, far }) => [
    at("crystal", near[0]),
    at("crystal", near[1]),
    at("crystal", near[2]),
    at("candle", near[3]),
    at("pillar", far[0]),
    at("pillar", far[1]),
  ],
  normal: ({ near, far, corners, rng }) => [
    at("chest", near[1], rng() * 0.8 - 0.4),
    at("barrel", near[0]),
    at("table", far[1]),
    at("chair", far[2], rng() * Math.PI * 2),
    ...(rng() > 0.5 ? [at("potion", near[3])] : []),
    at("web", corners[3]),
  ],
  treasure: ({ near, far }) => [
    at("chest", near[0], 0.4),
    at("chest", far[1], -0.4),
    at("chest", far[2], 0.9),
    at("barrel", near[3]),
    at("crystal", far[3]),
    at("pillar", near[1]),
    at("pillar", near[2]),
  ],
  // The counter holds near[2].
  shop: ({ near, far }) => [
    at("barrel", near[0]),
    at("barrel", near[1]),
    at("bookshelf", far[2]),
    at("potion", far[3]),
    at("candle", near[3]),
  ],
  // The lectern holds near[3].
  library: ({ near, far }) => [
    at("bookshelf", far[0], Math.PI / 4),
    at("bookshelf", far[1], -Math.PI / 4),
    at("bookshelf", far[2], -Math.PI / 4),
    at("table", near[0]),
    at("chair", near[1]),
    at("candle", near[2]),
  ],
  trap: ({ near, far, corners }) => [
    at("chest", near[1], -0.3),
    at("skull", near[0]),
    at("skull", far[2]),
    at("web", corners[1]),
    at("web", corners[2]),
    at("barrel", near[3]),
  ],
  arena: ({ near, far }) => [
    at("chest", near[3], 0.5),
    at("pillar", far[0]),
    at("pillar", far[1]),
    at("pillar", far[2]),
    at("pillar", far[3]),
    at("skull", near[0]),
    at("barrel", near[2]),
  ],
  // The pedestals hold the far anchors and the lectern near[3].
  memory: ({ near }) => [
    at("pillar", near[0]),
    at("pillar", near[1]),
    at("pillar", near[2]),
  ],
  // The plate holds near[0] and the candles near[1] and near[2].
  challenge: ({ near, far, corners }) => [
    at("pillar", far[0]),
    at("pillar", far[1]),
    at("skull", near[3]),
    at("web", corners[0]),
  ],
};

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
 */
export function placementsFor(room: Room, seed: number): PropPlacement[] {
  const template = room.template ? getTemplate(room.template) : undefined;
  const authored = template?.props ?? [];
  const rng = createRng(`${seed}:${room.id}:dressing`);
  const spots: Spots = {
    near: quadrantSpots(room, "near"),
    far: quadrantSpots(room, "far"),
    corners: cornerSpots(room),
    rng,
  };
  const torches = spots.corners.map((c) => at("torch", c));
  const layout = template ? authored : LAYOUTS[room.kind](spots);
  const reserved = reservedAnchors(room);
  const gem = gemFor(room, seed);
  const spikes = room.kind === "trap" && gem ? trapHazards(room, gem) : [];
  return [...torches, ...layout].filter((p) => {
    const solid = CATALOG[p.kind].solid;
    if (solid && inDoorLane(p.x, p.z)) return false;
    if (reserved.some((a) => near2(p, a, CLEAR_OF_CONTENT))) return false;
    if (gem && near2(p, gem, solid ? SOLID_CLEAR_OF_GEM : CLEAR_OF_GEM)) return false;
    if (spikes.some((a) => near2(p, a, CLEAR_OF_SPIKES))) return false;
    return true;
  });
}

/** Seeded per room, so it is the same every time you walk back in. */
export function Dressing({ room, seed }: DressingProps) {
  const placements = useMemo(() => placementsFor(room, seed), [room, seed]);
  return (
    <group>
      {placements.map((p, i) => (
        <Prop key={i} kind={p.kind} position={[p.x, 0, p.z]} rotation={p.rotation} scale={p.scale} />
      ))}
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
