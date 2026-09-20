import type { Room } from "../dungeon/types";
import { insideRoom, roomSegmentClear } from "../dungeon/footprint";
import { placementsFor } from "../rooms/placements";
import { PROP_SPECS } from "../props/specs";
import { reservedAnchors } from "../rooms/kinds";
import { watercourseBlocks } from "./watercourse";
import { GLIM_BANDS } from "../lantern/glim";

export const BELLCAP_REACH = 3;
export const BELLCAP_WARNING = 2.8;
export const BELLCAP_COOLDOWN = 12;
export interface Bellcap { x: number; z: number }
const cache = new WeakMap<Room, Bellcap[]>();

/** Living banks, never random floor obstacles or a mandatory doorway hazard. */
export function bellcapsFor(room: Room): Bellcap[] {
  if (cache.has(room)) return cache.get(room)!;
  const result: Bellcap[] = [];
  if (room.district === "gardens" && room.waterway && ["normal", "treasure", "shrine"].includes(room.kind)) {
    const solid = placementsFor(room, room.seed).filter(p => PROP_SPECS[p.kind].solid);
    const anchors = reservedAnchors(room);
    for (const b of watercourseBlocks(room)) {
      const horizontal = b.size[0] > b.size[2];
      const sign = (horizontal ? b.position[0] : b.position[2]) < 0 ? -1 : 1;
      for (let along = 4; along < room.size / 2 - 3 && result.length < 2; along += 3) {
        const p = horizontal ? { x: sign * along, z: 1.25 } : { x: -1.25, z: sign * along };
        if (!insideRoom(room, p.x, p.z, 0.7) || result.some(a => Math.hypot(a.x - p.x, a.z - p.z) < 4)) continue;
        if (solid.some(a => Math.hypot(a.x - p.x, a.z - p.z) < PROP_SPECS[a.kind].radius * (a.scale ?? 1) + 0.8) ||
          anchors.some(a => Math.hypot(a[0] - p.x, a[2] - p.z) < 2.5)) continue;
        result.push(p);
      }
    }
  }
  cache.set(room, result);
  return result;
}

export function bellcapExposed(room: Room, cap: Bellcap, x: number, z: number, glim: number, water: number): boolean {
  return water > 0.1 && glim >= GLIM_BANDS[0].at && Math.hypot(cap.x - x, cap.z - z) < BELLCAP_REACH &&
    roomSegmentClear(room, x, z, cap.x, cap.z, 0.1);
}

/** Warning time is accumulated only while playing and continuously exposed. */
export function bellcapCharge(charge: number, exposed: boolean, dt: number): number {
  return exposed ? Math.min(BELLCAP_WARNING, charge + Math.min(0.1, Math.max(0, dt))) : 0;
}
