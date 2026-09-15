import type { Room } from "../dungeon/types";
import { insideRoom, roomSegmentClear } from "../dungeon/footprint";
import { placementsFor } from "../rooms/placements";
import { PROP_SPECS } from "../props/specs";
import { watercourseBlocks } from "../worldbuilding/watercourse";
import type { Spot } from "./ambient";

export interface CroakerHabitat { wet: Spot; refuge: Spot; followsChannel: boolean }

/** Native toads congregate at a live channel, with a clear route back to their
 * existing damp wall refuge when it drains. A blocked route keeps the original
 * habitat; a creature never jumps through furniture to satisfy an art pattern. */
export function croakerHabitats(room: Room, spots: Spot[]): CroakerHabitat[] {
  const channels = watercourseBlocks(room);
  const obstacles = placementsFor(room, room.seed).filter(p => PROP_SPECS[p.kind].solid);
  const used: Spot[] = [];
  return spots.map(refuge => {
    const candidates: Spot[] = [];
    for (const channel of channels) {
      const horizontal = channel.size[0] > channel.size[2];
      for (const sign of [-1, 1]) {
        const length = horizontal ? channel.size[0] : channel.size[2];
        const center = horizontal ? channel.position[0] : channel.position[2];
        const along = Math.max(center - length / 2 + 1, Math.min(center + length / 2 - 1, horizontal ? refuge.x : refuge.z));
        const wet = horizontal ? { x: along, z: sign * 0.65 } : { x: sign * 0.65, z: along };
        if (!insideRoom(room, wet.x, wet.z, 0.3) || !roomSegmentClear(room, wet.x, wet.z, refuge.x, refuge.z, 0.25)) continue;
        const dx = refuge.x - wet.x, dz = refuge.z - wet.z, len2 = dx * dx + dz * dz;
        if (obstacles.some(p => {
          const t = len2 ? Math.max(0, Math.min(1, ((p.x - wet.x) * dx + (p.z - wet.z) * dz) / len2)) : 0;
          return Math.hypot(p.x - wet.x - t * dx, p.z - wet.z - t * dz) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.3;
        }) || used.some(p => Math.hypot(p.x - wet.x, p.z - wet.z) < 0.8)) continue;
        candidates.push(wet);
      }
    }
    candidates.sort((a, b) => Math.hypot(a.x - refuge.x, a.z - refuge.z) - Math.hypot(b.x - refuge.x, b.z - refuge.z));
    const wet = candidates[0] ?? refuge;
    used.push(wet);
    return { wet, refuge, followsChannel: candidates.length > 0 };
  });
}
