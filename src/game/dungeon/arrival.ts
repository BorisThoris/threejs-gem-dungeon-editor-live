import { insideRoom, doorReach, corridorWidth } from "./footprint";
import { spawnAfterTravel } from "./layout";
import { DIRS, DIR_STEP, OPPOSITE, halfSize, type Dir, type Room } from "./types";

/** Pursuers visibly enter the actual doorway; attack grace protects its landing. */
export function pursuitArrival(room: Room, from: Dir, inset = 0.9): { x: number; z: number } {
  const axis = DIR_STEP[from];
  const along = doorReach(room, from) - inset;
  return { x: axis.x * along, z: axis.z * along };
}

interface Point { x: number; z: number }
interface Obstacle extends Point { r: number }
export const ENCOUNTER_CLEARANCE = 5;

/** Enter from a readable direction, off the landing lane, with room to react. */
export function encounterArrival(room: Room, from: Dir | null, player: Point,
  obstacles: readonly Obstacle[] = [], margin = 0.6): Point {
  const half = halfSize(room);
  const landings = DIRS.filter((d) => room.links[d]).map((d) => {
    const p = spawnAfterTravel(room, OPPOSITE[d]).position;
    return { x: p[0], z: p[2] };
  });
  const candidates: Point[] = [];
  if (from) {
    const axis = DIR_STEP[from];
    const across = room.wings?.[from] ? corridorWidth(room, from) / 2 - margin - 0.2 : half * 0.5;
    for (let along = doorReach(room, from) - margin - 0.2; along >= 0; along -= 2) {
      for (const side of [-1, 1]) candidates.push({ x: axis.x * along + axis.z * across * side,
        z: axis.z * along + axis.x * across * side });
    }
  }
  for (const x of [-half * 0.7, 0, half * 0.7]) {
    for (const z of [-half * 0.7, 0, half * 0.7]) candidates.push({ x, z });
  }
  for (let x = -half + margin + 0.2; x <= half - margin; x += 2) {
    for (let z = -half + margin + 0.2; z <= half - margin; z += 2) candidates.push({ x, z });
  }
  const safeFloor = candidates.filter((p) => insideRoom(room, p.x, p.z, margin)
    && obstacles.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.r + margin));
  const clearance = (p: Point) => Math.min(Math.hypot(p.x - player.x, p.z - player.z),
    ...landings.map((l) => Math.hypot(p.x - l.x, p.z - l.z)));
  const safe = safeFloor.find((p) => clearance(p) >= ENCOUNTER_CLEARANCE);
  if (safe) return safe;
  // Authored rooms can be too crowded to promise five metres. Keep the
  // greatest available breathing room; arrival grace still blocks attacks.
  const fallback = safeFloor.length ? safeFloor : candidates.filter((p) => insideRoom(room, p.x, p.z, margin));
  return fallback.reduce((best, p) => clearance(p) > clearance(best) ? p : best, fallback[0] ?? { x: 0, z: 0 });
}
