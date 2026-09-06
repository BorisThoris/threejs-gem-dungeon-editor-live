import type { PropKind, Room } from "../dungeon/types";
import { createRng } from "../rng";
import { SHIELD_SLACK, SPILL_CHANCE } from "../world";
import { PROP_SPECS } from "./specs";

/**
 * What a blast does to the furniture.
 *
 * Barrels, crates and urns burst - all of them solid, so breaking one
 * changes what a body walks round - and now and then there is a gem in
 * the wreck. One standing between the bomb and the player takes the
 * blast for them. One owner of all three rules; the store asks.
 */
export const BREAKABLE: ReadonlySet<PropKind> = new Set<PropKind>(["barrel", "crate", "urn"]);

/**
 * A key for a prop that survives the list it came from being drawn with
 * different options: where it stands, not which index it had.
 */
export const breakKey = (room: Room, p: { kind: PropKind; x: number; z: number }): string =>
  `${room.id}:${p.kind}@${p.x.toFixed(1)},${p.z.toFixed(1)}`;

/** Whether this wreck has a gem in it, by the run's seed. */
export const spillFor = (seed: number, key: string): boolean => createRng(`${seed}:${key}:spill`)() < SPILL_CHANCE;

/**
 * The breakable, if any, standing on the straight line from the blast to
 * a body closely enough to take it. Not one at either end: a prop the
 * bomb was set against, or the player is standing on, shields nothing.
 */
export function shielded<P extends { kind: PropKind; x: number; z: number }>(
  from: { x: number; z: number },
  to: { x: number; z: number },
  props: readonly P[]
): P | null {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-6) return null;
  for (const p of props) {
    if (!BREAKABLE.has(p.kind)) continue;
    const t = ((p.x - from.x) * dx + (p.z - from.z) * dz) / len2;
    if (t <= 0.05 || t >= 0.95) continue;
    const cx = from.x + dx * t;
    const cz = from.z + dz * t;
    if (Math.hypot(p.x - cx, p.z - cz) <= PROP_SPECS[p.kind].radius + SHIELD_SLACK) return p;
  }
  return null;
}
