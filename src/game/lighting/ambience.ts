import { Color } from "three";
import type { Room } from "../dungeon/types";
import { floorRects } from "../dungeon/footprint";
import { biomeFor } from "../rooms/biomes";
import { floorRules } from "../world";
import { isUnlitRoom } from "./field";

/** Room air and bounced fill. Practical lamps retain their own source colours,
 * reach and gameplay irradiance; this is the navigable background behind them. */
export function roomAmbience(room: Room | null | undefined, seed: number, floor: number) {
  const light = floorRules(floor).light;
  const biome = room ? biomeFor(room.kind, room.id, seed, room) : null;
  const unlit = room ? isUnlitRoom(room, seed) : false;
  const ambient = unlit ? 0.56 + light.ambient * 0.19 : 0.68 + light.ambient * 0.62;
  const sky = new Color(light.sky);
  const ground = new Color("#625443");
  const fog = new Color("#050608");
  if (biome) {
    sky.lerp(new Color(biome.glow), 0.35);
    ground.lerp(new Color(biome.floor), 0.12);
    fog.lerp(new Color(biome.glow), 0.008);
  }
  // A long authored gallery must retain its terminal silhouette. Room size is
  // read from the same floor union used by geometry, including offset wings.
  let span = 0;
  if (room) {
    const rects = floorRects(room);
    span = Math.max(
      Math.max(...rects.map(r => r.x + r.width / 2)) - Math.min(...rects.map(r => r.x - r.width / 2)),
      Math.max(...rects.map(r => r.z + r.depth / 2)) - Math.min(...rects.map(r => r.z - r.depth / 2)),
    );
  }
  return { ambient, hemisphere: ambient * 1.05, sky: `#${sky.getHexString()}`,
    ground: `#${ground.getHexString()}`, fog: `#${fog.getHexString()}`,
    fogNear: 8, fogFar: Math.max(light.fogFar, span * 1.25), unlit };
}
