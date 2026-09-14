export const SHOVE_REACH = 3;
export const SHOVE_COOLDOWN_S = 2.4;
export const SHOVE_STAGGER_S = 0.9;
export const HARRIER_ENTRY_GRACE_S = 1.8;
export const HARRIER_WINDUP_S = 0.7;

/** A forward 100-degree arc. Looking away is a miss, even at close range. */
export function inShoveArc(x: number, z: number, fx: number, fz: number): boolean {
  const distance = Math.hypot(x, z);
  const facing = Math.hypot(fx, fz);
  return facing > 0 && distance <= SHOVE_REACH &&
    (distance < 0.01 || (x * fx + z * fz) / (distance * facing) >= Math.cos(50 * Math.PI / 180));
}

/** Solid furniture and the room's concave walls stop a shove. */
export function clearShove(room: Room, from: { x: number; z: number }, to: { x: number; z: number }, props: readonly PropPlacement[]): boolean {
  const dx = to.x - from.x, dz = to.z - from.z;
  const len2 = dx * dx + dz * dz;
  for (let t = 0; t <= 1; t += 0.05) if (!insideRoom(room, from.x + dx * t, from.z + dz * t)) return false;
  return !props.some((p) => {
    if (!PROP_SPECS[p.kind].solid || len2 < 0.0001) return false;
    const t = Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.z - from.z) * dz) / len2));
    return Math.hypot(p.x - from.x - dx * t, p.z - from.z - dz * t) < PROP_SPECS[p.kind].radius * (p.scale ?? 1);
  });
}
import { insideRoom } from "../dungeon/footprint";
import type { PropPlacement, Room } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
