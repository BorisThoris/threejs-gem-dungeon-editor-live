import { floorReach, type Room } from "../dungeon/types";
import { GROUND_Y } from "../world";
import { biomeIdFor } from "./biomes";
import type { CorridorBlock } from "./corridorPattern";

/** A continuous field of worn paving and deposits, not independent prop rolls.
 * All relief is paint-depth: no hidden collider or extra navigation obstacle. */
export function terrainFor(room: Room) {
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  const paving: CorridorBlock[] = [], deposits: CorridorBlock[] = [];
  const step = 1.5;
  const half = room.size / 2;
  for (let x = -half + step; x < half - 0.5; x += step) {
    for (let z = -half + step; z < half - 0.5; z += step) {
      // Keep all four tile corners inside shaped floors.
      if ([-0.65, 0.65].some(dx => [-0.65, 0.65].some(dz =>
        Math.hypot(x + dx, z + dz) > floorReach(room, Math.atan2(z + dz, x + dx)) - 0.15))) continue;
      const lane = Math.abs(x) < 1.7 || Math.abs(z) < 1.7;
      const field = Math.sin(x * 0.23 + room.seed % 13) + Math.cos(z * 0.31 + room.grid.z);
      // Water/moss grow in broad connected beds. Worked stone follows courses.
      const organic = biome === "mossy" || biome === "flooded" || biome === "fungal";
      const deposit = organic ? !lane && field > -0.25 : !lane && Math.abs(x) > half * 0.65;
      const block: CorridorBlock = { position: [x, GROUND_Y + (deposit ? 0.024 : 0.019), z],
        size: [deposit ? 1.46 : 1.32, 0.012, deposit ? 1.46 : 1.32] };
      if (deposit) deposits.push(block);
      else if (lane || !organic && Math.floor((z + half) / step) % 3 === 0) paving.push(block);
    }
  }
  return { paving, deposits, biome };
}

export const TERRAIN_COLORS = {
  fungal: ["#7c8d68", "#46654f"],
  hewn: ["#978c79", "#645f55"], mossy: ["#8b9174", "#425d35"],
  flooded: ["#8a9693", "#365a61"], catacomb: ["#a69777", "#655643"],
  foundry: ["#817875", "#754831"], timber: ["#9b7d56", "#584735"],
  bone: ["#a6a18c", "#777667"], crystal: ["#8b849e", "#5e526f"],
} as const;
