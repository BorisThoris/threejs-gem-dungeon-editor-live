/* eslint-disable react-refresh/only-export-components -- placementsFor is the
   pure half of this component and the editor previews with it directly. */
import { useMemo } from "react";

import { cornerSpots, inDoorLane, quadrantSpots } from "../dungeon/layout";
import { createRng } from "../rng";
import type { PropPlacement, Room, RoomKind } from "../dungeon/types";
import { CATALOG, Prop } from "../props/catalog";
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
  shop: ({ near, far }) => [
    at("barrel", near[0]),
    at("barrel", near[1]),
    at("bookshelf", far[2]),
    at("potion", far[3]),
    at("candle", near[2]),
  ],
  library: ({ near, far }) => [
    at("bookshelf", far[0], Math.PI / 4),
    at("bookshelf", far[1], -Math.PI / 4),
    at("bookshelf", far[2], -Math.PI / 4),
    at("table", near[3]),
    at("chair", near[0]),
    at("candle", near[1]),
  ],
  trap: ({ near, far, corners }) => [
    at("skull", near[0]),
    at("skull", far[2]),
    at("web", corners[1]),
    at("web", corners[2]),
    at("barrel", near[3]),
  ],
  arena: ({ near, far }) => [
    at("pillar", far[0]),
    at("pillar", far[1]),
    at("pillar", far[2]),
    at("pillar", far[3]),
    at("skull", near[0]),
    at("barrel", near[2]),
  ],
  memory: ({ near, far }) => [
    at("pillar", near[0]),
    at("pillar", near[1]),
    at("pillar", near[2]),
    at("pillar", near[3]),
    at("candle", far[0]),
    at("candle", far[3]),
  ],
  challenge: ({ near, far, corners }) => [
    at("pillar", far[0]),
    at("pillar", far[1]),
    at("barrel", near[2]),
    at("skull", near[3]),
    at("web", corners[0]),
  ],
};

/** The placements a room gets: its template if it has one, else its kind's layout. */
export function placementsFor(room: Room, seed: number): PropPlacement[] {
  const template = room.template ? getTemplate(room.template) : undefined;
  const authored = template?.props ?? [];
  const rng = createRng(`${seed}:${room.id}:dressing`);
  const spots: Spots = {
    near: quadrantSpots(room, 0.5),
    far: quadrantSpots(room, 0.78),
    corners: cornerSpots(room),
    rng,
  };
  const torches = spots.corners.map((c) => at("torch", c));
  const layout = template ? authored : LAYOUTS[room.kind](spots);
  // Nothing solid may stand in a doorway's path, whoever placed it.
  return [...torches, ...layout].filter(
    (p) => !CATALOG[p.kind].solid || !inDoorLane(p.x, p.z)
  );
}

/** Seeded per room, so it is the same every time you walk back in. */
export function Dressing({ room, seed }: DressingProps) {
  const placements = useMemo(() => placementsFor(room, seed), [room, seed]);
  return (
    <group>
      {placements.map((p, i) => (
        <Prop key={i} kind={p.kind} position={[p.x, 0, p.z]} rotation={p.rotation} scale={p.scale} />
      ))}
    </group>
  );
}
