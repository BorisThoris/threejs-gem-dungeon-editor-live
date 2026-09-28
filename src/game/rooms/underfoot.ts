import type { Room } from "../dungeon/types";
import { channelUnderfoot, waterUnderfoot } from "../worldbuilding/watercourse";
import { channelSediment, CHANNEL_SEDIMENT_CARRY } from "../worldbuilding/channelSediment";
import { BIOME, biomeIdFor } from "./biomes";
import { terrainFor, type TerrainTile } from "./terrainPattern";

export type Footing = "stone" | "water" | "soft" | "wood" | "metal" | "crust" | "wax" | "silt";
/** Retain authored biome acoustics on their native ground, while paving and
 * water crossings use the material actually visible beneath the player. */
export function footingMaterial(room: Room, footing: Footing) {
  if (footing === "silt") return { ground: channelSediment(room).name.toLowerCase(), carry: CHANNEL_SEDIMENT_CARRY };
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  if (footing === "water") return BIOME.flooded;
  if (footing === "soft") return biome === "fungal" ? BIOME.fungal : biome === "ash" ? BIOME.ash : BIOME.mossy;
  if (footing === "wood") return BIOME.timber;
  if (footing === "metal") return biome === "verdigris" ? BIOME.verdigris : BIOME.foundry;
  if (footing === "crust") return BIOME.salt;
  if (footing === "wax") return BIOME.tallow;
  return biome === "bone" ? BIOME.bone : BIOME.hewn;
}

export const footingCarry = (room: Room, footing: Footing): number => footingMaterial(room, footing).carry;
const terrainCache = new WeakMap<Room, ReturnType<typeof terrainFor>>();
const covers = (tile: TerrainTile, x: number, z: number) =>
  Math.abs(x - tile.position[0]) <= tile.size[0] / 2 && Math.abs(z - tile.position[2]) <= tile.size[2] / 2;

/** Sound follows visible surfaces. The drainable channel covers paving;
 * its exposed sediment still covers paving after drainage. Independent wet
 * beds outside the channel remain wet after the sluice opens. */
export function footingAt(room: Room, x: number, z: number, openedAt: number | null, now: number): Footing {
  if (waterUnderfoot(room, x, z, openedAt, now)) return "water";
  if (channelUnderfoot(room, x, z)) return "silt";
  let terrain = terrainCache.get(room);
  if (!terrain) { terrain = terrainFor(room); terrainCache.set(room, terrain); }
  if (terrain.paving.some(tile => covers(tile, x, z))) return "stone";
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  if (terrain.deposits.some(tile => covers(tile, x, z))) {
    if (biome === "flooded") return "water";
    if (biome === "mossy" || biome === "fungal" || biome === "ash") return "soft";
    if (biome === "salt") return "crust";
    if (biome === "verdigris") return "metal";
    if (biome === "tallow") return "wax";
    return "stone";
  }
  if (biome === "timber") return "wood";
  if (biome === "foundry" || biome === "verdigris") return "metal";
  if (biome === "mossy" || biome === "fungal" || biome === "ash") return "soft";
  if (biome === "salt") return "crust";
  if (biome === "tallow") return "wax";
  return "stone";
}
