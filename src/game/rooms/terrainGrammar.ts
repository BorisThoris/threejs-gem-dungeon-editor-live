import { floorReach, type Room } from "../dungeon/types";
import type { BiomeId } from "./biomes";

export const TERRAIN_GRAMMAR: Record<BiomeId, { name: string; description: string }> = {
  mossy: { name: "Nursery furrows", description: "Broad planted rows alternate with tending paths; the central cross stays paved." },
  fungal: { name: "Mycelium fans", description: "Connected growth fans spread inward from the four sheltered sides of the chamber." },
  flooded: { name: "Settling basins", description: "Four rounded settling beds flank the dry crossing. Their water remains after the service channel drains." },
  foundry: { name: "Kiln aprons", description: "Continuous fired-earth aprons line the sides of the central working aisle." },
  timber: { name: "Loading bays", description: "Paired staging beds repeat along paved cross aisles." },
  hewn: { name: "Service courses", description: "Stone cross courses join the working aisle and worn outer margins." },
  catacomb: { name: "Processional margins", description: "Dark perimeter bands frame a paved crossing and the inner processional court." },
  bone: { name: "Ossuary margins", description: "Broad pale deposits gather around the chamber perimeter, leaving its crossing open." },
  crystal: { name: "Resonance ring", description: "A broken mineral ring surrounds the central crossing; four paved spokes divide it." },
  ash: { name: "Flue windrows", description: "Settled ash gathers in leeward ribs beneath the old flues, leaving the service crossing scored clear." },
  salt: { name: "Evaporation shelves", description: "Stepped salt crust follows the old pan walls while scored rake lanes preserve the central crossing." },
  verdigris: { name: "Condenser plates", description: "Oxidized drain plates run beneath paired pipe lines; transverse inspection lanes keep the central crossing open." },
};
export type TerrainCell = "paving" | "deposit" | "bare";
const organic = (biome: BiomeId) => ["mossy", "fungal", "flooded"].includes(biome);

/** Room-scale land use, sampled on the block grid and clipped by the real floor.
 * Every patch belongs to a bed, bank, ring or work bay; no per-tile random roll. */
export function chamberTerrainCell(room: Room, biome: BiomeId, x: number, z: number): TerrainCell {
  const half = room.size / 2;
  const border = floorReach(room, Math.atan2(z, x)) - Math.hypot(x, z);
  if (Math.abs(x) < 1.7 || Math.abs(z) < 1.7) return "paving";
  const ax = Math.abs(x), az = Math.abs(z);
  const row = Math.floor((z + half) / 1.5);
  let deposit = false;
  switch (biome) {
    case "mossy": deposit = row % 3 !== 0; break;
    case "fungal": {
      const u = (ax - half * 0.65) / (half * 0.43), v = (az - half * 0.55) / (half * 0.4);
      deposit = u * u + v * v <= 1;
      break;
    }
    case "flooded": {
      const u = (ax - half * 0.55) / (half * 0.31), v = (az - half * 0.55) / (half * 0.31);
      deposit = u ** 4 + v ** 4 <= 1;
      break;
    }
    case "foundry": deposit = ax > half * 0.55; break;
    case "timber": deposit = ax > half * 0.45 && row % 3 !== 0; break;
    case "catacomb": case "bone": deposit = border < (biome === "bone" ? 4 : 2.8); break;
    case "crystal": deposit = Math.abs(Math.hypot(x, z) - half * 0.67) < 1.1; break;
    case "hewn": deposit = ax >= az && border < 3; break;
    case "ash": {
      const lee = room.seed % 2 === 0 ? x : z;
      const along = room.seed % 2 === 0 ? z : x;
      deposit = lee > half * 0.28 && (border < 3.8 || Math.floor((along + half) / 3) % 2 === 0);
      break;
    }
    case "salt": {
      const shelf = Math.floor(border / 1.5);
      const rakeLane = Math.floor((ax + az) / 1.5) % 4 === 0;
      deposit = border < half * 0.42 && shelf % 2 === 0 && !rakeLane;
      break;
    }
    case "verdigris": {
      const inspection = Math.floor((z + half) / 4.5) % 3 === 1;
      deposit = ax > half * 0.42 && (!inspection || border < 1.7);
      break;
    }
  }
  if (deposit) return "deposit";
  // Tending paths are visible paving, not an unexplained absence of planting.
  if (biome === "mossy" && row % 3 === 0 || !organic(biome) && row % 3 === 0) return "paving";
  return "bare";
}

/** Gallery beds flank one continuous travel aisle. Wet beds never climb ramps. */
export function galleryTerrainCell(biome: BiomeId, along: number, across: number, width: number, ramp: boolean): TerrainCell {
  if (Math.abs(across) <= 1.7) return "paving";
  if (biome === "flooded" && ramp) return "bare";
  if (biome === "mossy" || biome === "timber") return Math.floor(along / 1.5) % 3 === 0 ? "paving" : "deposit";
  if (biome === "ash") return Math.abs(across) > width * 0.26 ? "deposit" : "paving";
  if (biome === "salt") return Math.abs(across) > width * 0.28 && Math.floor(along / 1.5) % 4 !== 0 ? "deposit" : "paving";
  if (biome === "verdigris") return Math.abs(across) > width * 0.27 && Math.floor(along / 1.5) % 3 !== 1 ? "deposit" : "paving";
  if (organic(biome)) return "deposit";
  return Math.abs(across) > width * 0.3 ? "deposit" : "paving";
}
