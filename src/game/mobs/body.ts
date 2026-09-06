import { HAZARD_RADIUS, trapHazards } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { SNARE_RADIUS } from "../items/catalog";
import { PROP_SPECS, type PropSpec } from "../props/specs";
import { BREAKABLE, breakKey } from "../props/breakable";
import { placementsFor } from "../rooms/placements";
import { gemFor } from "../rooms/kinds";
import { snaresIn, type PlacedDevice } from "../state/run";
import { trapsFor } from "../traps/placement";
import { FLIGHT_HEIGHT, PIT_RADIUS } from "../world";
import type { Patch } from "../warden/steer";

/**
 * What a thing on the floor is made of, as far as the floor is concerned.
 *
 * The Warden and the Cutpurse each built their own list of what to walk
 * round and what bites them, and neither list had a table in it: both
 * walked through the furniture the player has to walk round. And the next
 * creature would have built a third list. So a mob declares a body, and
 * the floor's rules read it here and nowhere else:
 *
 *   ground  - walks round the furniture; spikes and snares bite it.
 *   flying  - over the low furniture and round the tall - anything whose
 *             top reaches FLIGHT_HEIGHT is in its way; nothing on the
 *             floor bites it.
 *   ghost   - passes through all of it, and nothing bites it.
 *
 * Two questions, two functions. Whatever is added to the floor later - a
 * trap, a creature - reads these rather than inventing its own answer.
 */
export type Body = "ground" | "flying" | "ghost";

export type MobId = "warden" | "cutpurse" | "reaper" | "rat" | "moth" | "bat" | "wisp" | "harrier" | "keeper";

export const BODIES: Record<MobId, Body> = {
  warden: "ground",
  cutpurse: "ground",
  reaper: "ghost",
  rat: "ground",
  moth: "flying",
  bat: "flying",
  wisp: "ghost",
  harrier: "flying",
  // It never takes a step, so nothing ever bites it; it is in the table
  // because everything on the floor with a body is.
  keeper: "ground",
};

/**
 * A body's half-width, which is all the clearance furniture asks of it:
 * the obstacle carries its own berth so the steering's default - the wide
 * margin a Warden keeps from spikes - never applies to a chest.
 */
const BODY_HALF_WIDTH = 0.35;

/** How high a prop's collider reaches, which is what decides whether a flier clears it. */
const colliderTop = (spec: PropSpec): number =>
  spec.collider ? spec.collider.y + (spec.collider.shape === "cylinder" ? spec.collider.args[0] : spec.collider.args[1]) : 0;

/** Whether a flying body passes over this prop rather than round it. */
export const clearedInFlight = (spec: PropSpec): boolean => colliderTop(spec) < FLIGHT_HEIGHT;

/** What this body has to walk round: the room's solid furniture - the tall pieces of it, for a flier - or nothing. */
export function obstaclesFor(
  body: Body,
  room: Room,
  seed: number,
  placed: readonly PlacedDevice[],
  broken: readonly string[] = []
): Patch[] {
  void placed;
  if (body === "ghost") return [];
  // A barrel that has burst is not in anyone's way any more.
  return placementsFor(room, seed)
    .filter((p) => PROP_SPECS[p.kind].solid && !(BREAKABLE.has(p.kind) && broken.includes(breakKey(room, p))))
    .filter((p) => body === "ground" || !clearedInFlight(PROP_SPECS[p.kind]))
    .map((p) => ({ x: p.x, z: p.z, r: PROP_SPECS[p.kind].radius + BODY_HALF_WIDTH, berth: 0 }));
}

/** What bites this body here: the floor's spikes and any live snare, or nothing. */
export function bitesFor(
  body: Body,
  room: Room,
  seed: number,
  placed: readonly PlacedDevice[],
  sprung: Readonly<Record<string, number>> = {}
): Patch[] {
  if (body !== "ground") return [];
  const gem = gemFor(room, seed);
  const spikes = room.kind === "trap" && gem ? trapHazards(room, gem) : [];
  // A pit that has given way is a spike patch from then on, to everything
  // with feet. Which pits are open is the store's; where they are is the
  // floor's.
  const pits = trapsFor(room, seed, null).filter((t) => t.kind === "pit" && sprung[t.key] !== undefined);
  return [
    ...spikes.map(([x, , z]) => ({ x, z, r: HAZARD_RADIUS })),
    ...pits.map((t) => ({ x: t.x, z: t.z, r: PIT_RADIUS })),
    ...snaresIn(placed, room.id).map((d) => ({ x: d.x, z: d.z, r: SNARE_RADIUS, key: d.key })),
  ];
}
