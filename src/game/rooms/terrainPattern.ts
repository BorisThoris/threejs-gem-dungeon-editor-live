import { chamberTerrainCell, galleryTerrainCell, TERRAIN_GRAMMAR } from "./terrainGrammar";
import { DIRS, DIR_STEP, floorReach, type Room } from "../dungeon/types";
import { corridorOffset, wingWidthAt } from "../dungeon/footprint";
import { floorHeightAt, terracesFor } from "../worldbuilding/elevation";
import { GROUND_Y } from "../world";
import { biomeIdFor } from "./biomes";
import type { CorridorBlock } from "./corridorPattern";

export interface TerrainTile extends CorridorBlock { slope?: [number, number] }

/** A continuous field of worn paving and deposits, not independent prop rolls.
 * All relief is paint-depth: no hidden collider or extra navigation obstacle. */
export function terrainFor(room: Room) {
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  const paving: TerrainTile[] = [], deposits: TerrainTile[] = [];
  const step = 1.5;
  const half = room.size / 2;
  for (let x = -half + step; x < half - 0.5; x += step) {
    for (let z = -half + step; z < half - 0.5; z += step) {
      // Keep all four tile corners inside shaped floors.
      if ([-0.75, 0.75].some(dx => [-0.75, 0.75].some(dz =>
        Math.hypot(x + dx, z + dz) > floorReach(room, Math.atan2(z + dz, x + dx)) - 0.15))) continue;
      const cell = chamberTerrainCell(room, biome, x, z);
      if (cell === "bare") continue;
      const deposit = cell === "deposit";
      const block: CorridorBlock = { position: [x, GROUND_Y + (deposit ? 0.024 : 0.019), z],
        size: [deposit ? step : 1.32, 0.012, deposit ? step : 1.32] };
      if (deposit) deposits.push(block);
      else paving.push(block);
    }
  }
  // Passages extend the same land-use rules, with a clear central
  // paving lane. Split tiles at the ramp's knee so no face floats above it.
  for (const dir of DIRS) {
    const length = room.wings?.[dir] ?? 0;
    const axis = DIR_STEP[dir], shift = corridorOffset(room, dir);
    const terrace = terracesFor(room).find(t => t.dir === dir);
    const point = (along: number, across: number) => axis.x
      ? [axis.x * along, shift + across] : [shift + across, axis.z * along];
    for (let along = half + step; along < half + length - 0.75; along += step) {
      const available = Math.min(wingWidthAt(room, dir, along - 0.75), wingWidthAt(room, dir, along + 0.75));
      for (let across = 0; across + 0.75 < available / 2 - 0.15; across += step) for (const side of across === 0 ? [1] : [-1, 1]) {
        const [x, z] = point(along, across * side);
        const onRamp = !!terrace && along - 0.75 < terrace.rampEnd;
        const cell = galleryTerrainCell(biome, along - half, across, available, onRamp);
        if (cell === "bare") continue;
        const deposit = cell === "deposit";
        const size = deposit ? step : 1.32, low = along - size / 2, high = along + size / 2;
        const cuts = [low, ...(terrace && terrace.rampEnd > low && terrace.rampEnd < high ? [terrace.rampEnd] : []), high];
        for (let i = 1; i < cuts.length; i++) {
          const [px, pz] = point((cuts[i - 1] + cuts[i]) / 2, across * side);
          const w = axis.x ? cuts[i] - cuts[i - 1] : size, d = axis.x ? size : cuts[i] - cuts[i - 1];
          const slope: [number, number] = [
            (floorHeightAt(room, px + w / 2, pz) - floorHeightAt(room, px - w / 2, pz)) / w,
            (floorHeightAt(room, px, pz + d / 2) - floorHeightAt(room, px, pz - d / 2)) / d,
          ];
          const tile: TerrainTile = { position: [px, floorHeightAt(room, px, pz) + (deposit ? 0.024 : 0.019), pz], size: [w, 0.012, d], slope };
          (deposit ? deposits : paving).push(tile);
        }
      }
    }
  }
  return { paving, deposits, biome, grammar: TERRAIN_GRAMMAR[biome] };
}

export const TERRAIN_COLORS = {
  fungal: ["#7c8d68", "#46654f"],
  hewn: ["#978c79", "#645f55"], mossy: ["#8b9174", "#425d35"],
  flooded: ["#8a9693", "#365a61"], catacomb: ["#a69777", "#655643"],
  foundry: ["#817875", "#754831"], timber: ["#9b7d56", "#584735"],
  bone: ["#a6a18c", "#777667"], crystal: ["#8b849e", "#5e526f"],
} as const;
