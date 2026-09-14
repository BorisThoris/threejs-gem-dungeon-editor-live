import { roomSegmentClear } from "../dungeon/footprint";
import type { PropPlacement, Room } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import type { Vec3 } from "../dungeon/layout";
import { SENTRY_POST_HEIGHT, SENTRY_POST_RADIUS } from "../sentry/placement";

export const SHOVE_REACH = 3;
export const SHOVE_COOLDOWN_S = 2.4;
export const SHOVE_STAGGER_S = 0.9;
/** The hand is below eye level; knee-high furniture stays below its path. */
export const SHOVE_HEIGHT = 1.25;
export const HARRIER_ENTRY_GRACE_S = 1.8;
export const HARRIER_WINDUP_S = 0.7;
/** The warning must begin where the suggested shove can already reach. */
export const HARRIER_WINDUP_REACH = SHOVE_REACH - 0.25;

/** A forward 100-degree arc. Looking away is a miss, even at close range. */
export function inShoveArc(x: number, z: number, fx: number, fz: number): boolean {
  const distance = Math.hypot(x, z);
  const facing = Math.hypot(fx, fz);
  return facing > 0 && distance <= SHOVE_REACH &&
    (distance < 0.01 || (x * fx + z * fz) / (distance * facing) >= Math.cos(50 * Math.PI / 180));
}

/** Tall furniture, watcher posts and the room's concave walls stop a shove. */
export function clearShove(room: Room, from: { x: number; z: number }, to: { x: number; z: number }, props: readonly PropPlacement[], watcher: Vec3 | null = null): boolean {
  const dx = to.x - from.x, dz = to.z - from.z;
  const len2 = dx * dx + dz * dz;
  if (!roomSegmentClear(room, from.x, from.z, to.x, to.z)) return false;
  if (watcher && SENTRY_POST_HEIGHT >= SHOVE_HEIGHT && len2 >= 0.0001) {
    const t = Math.max(0, Math.min(1, ((watcher[0] - from.x) * dx + (watcher[2] - from.z) * dz) / len2));
    if (Math.hypot(watcher[0] - from.x - dx * t, watcher[2] - from.z - dz * t) < SENTRY_POST_RADIUS) return false;
  }
  return !props.some((p) => {
    const spec = PROP_SPECS[p.kind], collider = spec.collider;
    if (!spec.solid || len2 < 0.0001) return false;
    if (collider) {
      const top = (collider.y + collider.args[collider.shape === "cylinder" ? 0 : 1]) * (p.scale ?? 1);
      if (top < SHOVE_HEIGHT) return false;
    }
    const t = Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.z - from.z) * dz) / len2));
    return Math.hypot(p.x - from.x - dx * t, p.z - from.z - dz * t) < PROP_SPECS[p.kind].radius * (p.scale ?? 1);
  });
}
