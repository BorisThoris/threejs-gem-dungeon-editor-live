import { bfsDepth } from "../dungeon/generate";
import { DIRS, OPPOSITE, inscribedRadius, type Dungeon, type Room } from "../dungeon/types";
import { PLAYER_CAPSULE_RADIUS } from "../world";
import { overhangsLane, spawnAfterTravel, trapHazards, HAZARD_RADIUS, type Vec3 } from "../dungeon/layout";
import { insideRoom } from "../dungeon/footprint";
import { placementsFor, type DressingOptions } from "../rooms/placements";
import { gemFor, reservedAnchors } from "../rooms/kinds";
import { PROP_SPECS } from "../props/specs";
import { floorHeightAt } from "../worldbuilding/elevation";
import { obstacleWaypoint } from "../warden/route";
import { SENTRY_POST_RADIUS } from "../sentry/placement";

export const NEST_RADIUS = 0.95;

/** The heap's stable position, shared by the room and placement checks. */
export function nestPosition(room: Room, seed: number, dressing: DressingOptions = {}): Vec3 {
  let h = 0;
  for (let i = 0; i < room.id.length; i++) h = (h * 31 + room.id.charCodeAt(i)) >>> 0;
  const d = inscribedRadius(room) * 0.62;
  const preferred = { x: (h & 1 ? 1 : -1) * d, z: (h & 2 ? 1 : -1) * d };
  const props = placementsFor(room, seed, dressing).filter(p => PROP_SPECS[p.kind].solid);
  const obstacles = props.map(p => ({ x: p.x, z: p.z, r: PROP_SPECS[p.kind].radius * (p.scale ?? 1) }));
  if (dressing.sentry) obstacles.push({ x: dressing.sentry[0], z: dressing.sentry[2], r: SENTRY_POST_RADIUS });
  const gem = gemFor(room, seed);
  if (room.kind === "trap" && gem) {
    for (const [x, , z] of trapHazards(room, gem)) obstacles.push({ x, z, r: HAZARD_RADIUS });
  }
  const reserved = [...reservedAnchors(room), ...(gem ? [gem] : []), ...(dressing.key ? [dressing.key] : [])];
  const candidates = [preferred];
  // Prefer the old corner, then the nearest clear patch in the same chamber.
  // Furniture remains authoritative; a recovered heap must never move it.
  for (let x = -room.size / 2 + NEST_RADIUS; x <= room.size / 2 - NEST_RADIUS; x += 0.5) {
    for (let z = -room.size / 2 + NEST_RADIUS; z <= room.size / 2 - NEST_RADIUS; z += 0.5) candidates.push({ x, z });
  }
  candidates.sort((a, b) => Math.hypot(a.x - preferred.x, a.z - preferred.z) - Math.hypot(b.x - preferred.x, b.z - preferred.z));
  const entrances = DIRS.filter(dir => room.links[dir]).map(dir => spawnAfterTravel(room, OPPOSITE[dir]).position);
  const at = candidates.find(p => insideRoom(room, p.x, p.z, NEST_RADIUS)
    && !overhangsLane(p.x, p.z, NEST_RADIUS, room)
    && obstacles.every(o => Math.hypot(p.x - o.x, p.z - o.z) >= o.r + NEST_RADIUS)
    && reserved.every(a => Math.hypot(p.x - a[0], p.z - a[2]) >= NEST_RADIUS + 0.6)
    && entrances.some(a => obstacleWaypoint(room, a[0], a[2], p.x, p.z, obstacles, PLAYER_CAPSULE_RADIUS, PLAYER_CAPSULE_RADIUS)));
  // Generated nests are held to this contract by test:nest-placement.
  // An invalid authoring layout cannot quietly bury the player's belongings.
  if (!at) throw new Error(`No reachable nest position in ${room.id}`);
  return [at.x, floorHeightAt(room, at.x, at.z), at.z];
}

/**
 * Where the Cutpurse takes what it steals.
 *
 * Derived from the floor rather than generated with it, so nothing in the
 * dungeon data has to know a thief exists. The same floor always has the
 * same nest, which matters: a nest that moved between visits would make
 * the walk back a lie.
 *
 * The deepest ordinary room from the start, which is the one furthest out
 * of a player's way - a nest you pass on the way to the exit is not a
 * detour and so is not a decision. The set pieces are excluded because
 * each of them already asks a question, and a pile of your own gems in the
 * middle of the arena is two questions in a room built for one. The vault
 * is excluded for a harder reason: its door wants an iron key, and a floor
 * could otherwise put your gems somewhere you cannot get to them at all.
 */
const NOT_A_NEST = new Set(["start", "end", "shop", "arena", "memory", "challenge"]);

export function nestRoom(dungeon: Dungeon): string | null {
  const depth = bfsDepth(dungeon.rooms, dungeon.startId);
  let best: string | null = null;
  let bestDepth = -1;
  for (const room of dungeon.rooms) {
    if (NOT_A_NEST.has(room.kind)) continue;
    if (room.id === dungeon.vaultId) continue;
    const d = depth.get(room.id) ?? -1;
    // Ties go to the first the generator wrote, which is stable for a seed.
    if (d > bestDepth) {
      bestDepth = d;
      best = room.id;
    }
  }
  return best;
}
