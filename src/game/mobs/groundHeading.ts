import type { Room } from "../dungeon/types";
import { roomSegmentClear } from "../dungeon/footprint";
import { steerAround, type Patch } from "../warden/steer";

/** Local wandering and escape keep the whole body inside the room. Unlike
 * pursuing enemies, an ambient animal waits when no legal heading remains. */
export function groundHeading(room: Room, x: number, z: number, tx: number, tz: number,
  obstacles: readonly Patch[], margin = 0.5): { dx: number; dz: number } {
  const probe = Math.min(1.4, Math.hypot(tx - x, tz - z));
  if (probe < 1e-8) return { dx: 0, dz: 0 };
  const clear = (px: number, pz: number) => {
    if (!roomSegmentClear(room, x, z, px, pz, margin)) return false;
    const dx = px - x, dz = pz - z, length2 = dx * dx + dz * dz;
    return obstacles.every(p => {
      const ox = p.x - x, oz = p.z - z, radius = p.r + (p.berth ?? 0);
      // Furniture placed over an animal must still let it escape outward.
      if (ox * ox + oz * oz < radius * radius) return ox * dx + oz * dz < 0;
      const t = Math.max(0, Math.min(1, (ox * dx + oz * dz) / (length2 || 1)));
      return (ox - t * dx) ** 2 + (oz - t * dz) ** 2 > radius * radius;
    });
  };
  const heading = steerAround(x, z, tx, tz, obstacles, 0, clear);
  return clear(x + heading.dx * probe, z + heading.dz * probe) ? heading : { dx: 0, dz: 0 };
}
