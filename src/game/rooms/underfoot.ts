import type { Room } from "../dungeon/types";
import { waterUnderfoot } from "../worldbuilding/watercourse";
import { BIOME, biomeIdFor } from "./biomes";
import { terrainFor, type TerrainTile } from "./terrainPattern";

export type Footing = "stone" | "water" | "soft" | "wood" | "metal" | "crust" | "wax";
/** Retain authored biome acoustics on their native ground, while paving and
 * water crossings use the material actually visible beneath the player. */
export function footingCarry(room: Room, footing: Footing): number {
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  if (footing === "water") return BIOME.flooded.carry;
  if (footing === "soft") return biome === "fungal" ? BIOME.fungal.carry : biome === "ash" ? BIOME.ash.carry : BIOME.mossy.carry;
  if (footing === "wood") return BIOME.timber.carry;
  if (footing === "metal") return biome === "verdigris" ? BIOME.verdigris.carry : BIOME.foundry.carry;
  if (footing === "crust") return BIOME.salt.carry;
  if (footing === "wax") return BIOME.tallow.carry;
  return biome === "bone" ? BIOME.bone.carry : BIOME.hewn.carry;
}
const terrainCache = new WeakMap<Room, ReturnType<typeof terrainFor>>();
const covers = (tile: TerrainTile, x: number, z: number) =>
  Math.abs(x - tile.position[0]) <= tile.size[0] / 2 && Math.abs(z - tile.position[2]) <= tile.size[2] / 2;

/** Sound follows visible surfaces. The drainable channel covers paving;
 * independent wet beds remain wet after the sluice opens. */
export function footingAt(room: Room, x: number, z: number, openedAt: number | null, now: number): Footing {
  if (waterUnderfoot(room, x, z, openedAt, now)) return "water";
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
