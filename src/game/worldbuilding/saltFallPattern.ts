import { insideRoom } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";
import { terrainFor } from "../rooms/terrainPattern";
import { WALL_HEIGHT } from "../world";
import { floorHeightAt } from "./elevation";

export interface SaltFallSite { x: number; z: number; phase: number; floor: number; ceiling: number }

/**
 * Sparse mineral shedding above real salt shelves. Sites come from the same
 * terrain beds the player sees, so flakes cannot hang over an empty crossing
 * or outside a circular, polygonal or concave floor.
 */
export function saltFallSites(room: Room): SaltFallSite[] {
  const terrain = terrainFor(room);
  if (terrain.biome !== "salt") return [];
  return terrain.deposits
    .filter((tile, index) => index % 5 === 0 && !tile.slope?.some(slope => Math.abs(slope) > 1e-6))
    .map((tile, index) => {
      const x = tile.position[0], z = tile.position[2], floor = floorHeightAt(room, x, z) + 0.08;
      return { x, z, floor, ceiling: floor + WALL_HEIGHT - 0.65, phase: ((room.seed * 17 + index * 37) % 101) / 101 };
    })
    .filter(site => insideRoom(room, site.x, site.z, 0.16))
    .slice(0, 12);
}

export function saltFallPose(site: SaltFallSite, now: number) {
  const progress = (site.phase + now * 0.12) % 1;
  return {
    x: site.x,
    y: site.ceiling + (site.floor - site.ceiling) * progress,
    z: site.z,
    yaw: Math.floor((now * 0.7 + site.phase * 5) * 4) / 4,
  };
}
