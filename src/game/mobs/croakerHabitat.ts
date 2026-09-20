import type { Room } from "../dungeon/types";
import { insideRoom, roomSegmentClear } from "../dungeon/footprint";
import { placementsFor } from "../rooms/placements";
import { PROP_SPECS } from "../props/specs";
import { watercourseBlocks, WATER_DRAIN_SECONDS } from "../worldbuilding/watercourse";
import type { Spot } from "./ambient";
import { terrainFor } from "../rooms/terrainPattern";

export interface CroakerHabitat { wet: Spot; refuge: Spot; followsChannel: boolean; refugeBed: boolean }

/** Persistent drain time determines location even before the first active frame. */
export function croakerMigration(openedAt: number | null, now: number): number {
  return openedAt === null ? 0 : Math.min(1, Math.max(0, (now - openedAt - WATER_DRAIN_SECONDS * 0.8) / 5));
}

/** Native toads congregate at a live channel, with a clear route back to their
 * existing damp wall refuge when it drains. A blocked route keeps the original
 * habitat; a creature never jumps through furniture to satisfy an art pattern. */
export function croakerHabitats(room: Room, spots: Spot[], seed: number): CroakerHabitat[] {
  const channels = watercourseBlocks(room);
  const obstacles = placementsFor(room, seed).filter(p => PROP_SPECS[p.kind].solid);
  const used: Spot[] = [];
  const sheltered: Spot[] = [];
  const terrain = terrainFor(room);
  const beds = ["flooded", "mossy", "fungal"].includes(terrain.biome) ? terrain.deposits
    .filter(tile => !tile.slope?.some(slope => Math.abs(slope) > 1e-6))
    .map(tile => ({ x: tile.position[0], z: tile.position[2] })) : [];
  return spots.map(original => {
    const safeBeds = beds.filter(bed => insideRoom(room, bed.x, bed.z, 0.45) &&
      !sheltered.some(other => Math.hypot(bed.x - other.x, bed.z - other.z) < 1.5) &&
      !obstacles.some(p => Math.hypot(bed.x - p.x, bed.z - p.z) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.45));
    safeBeds.sort((a, b) => Math.hypot(a.x - original.x, a.z - original.z) - Math.hypot(b.x - original.x, b.z - original.z));
    const refuge = safeBeds[0] ?? original;
    sheltered.push(refuge);
    const candidates: Spot[] = [];
    for (const channel of channels) {
      const horizontal = channel.size[0] > channel.size[2];
      for (const sign of [-1, 1]) {
        const length = horizontal ? channel.size[0] : channel.size[2];
        const center = horizontal ? channel.position[0] : channel.position[2];
        const along = Math.max(center - length / 2 + 1, Math.min(center + length / 2 - 1, horizontal ? refuge.x : refuge.z));
        const wet = horizontal ? { x: along, z: sign * 0.65 } : { x: sign * 0.65, z: along };
        if (!insideRoom(room, wet.x, wet.z, 0.45) || !roomSegmentClear(room, wet.x, wet.z, refuge.x, refuge.z, 0.45)) continue;
        const dx = refuge.x - wet.x, dz = refuge.z - wet.z, len2 = dx * dx + dz * dz;
        if (obstacles.some(p => {
          const t = len2 ? Math.max(0, Math.min(1, ((p.x - wet.x) * dx + (p.z - wet.z) * dz) / len2)) : 0;
          return Math.hypot(p.x - wet.x - t * dx, p.z - wet.z - t * dz) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.45;
        }) || used.some(p => Math.hypot(p.x - wet.x, p.z - wet.z) < 0.8)) continue;
        candidates.push(wet);
      }
    }
    candidates.sort((a, b) => Math.hypot(a.x - refuge.x, a.z - refuge.z) - Math.hypot(b.x - refuge.x, b.z - refuge.z));
    const wet = candidates[0] ?? refuge;
    used.push(wet);
    return { wet, refuge, followsChannel: candidates.length > 0, refugeBed: safeBeds.length > 0 };
  });
}
