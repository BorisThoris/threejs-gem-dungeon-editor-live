import type { Room } from "../dungeon/types";
import { BIOME, biomeIdFor } from "../rooms/biomes";
import { bellcapsFor } from "../worldbuilding/bellcaps";

export const BEETLE_SETTLE_SECONDS = 4;
export interface BeetleHabitat { x: number; z: number; phase: number }

/** Three low-flying feeders per bellcap colony. The entire foraging pocket
 * stays inside the colony's already validated clearance from walls and props. */
export function beetlesFor(room: Room): BeetleHabitat[] {
  if (!BIOME[biomeIdFor(room.kind, room.id, room.seed, room)].life.includes("beetle")) return [];
  return bellcapsFor(room).flatMap(cap => [0, 1, 2].map(i => ({ ...cap, phase: i * Math.PI * 2 / 3 })));
}

export function beetlePose(home: BeetleHabitat, now: number, cover: number) {
  const angle = home.phase + Math.sin(now * 0.65 + home.phase) * 0.4;
  const radius = 0.48 * (1 - cover);
  return { x: home.x + Math.cos(angle) * radius, z: home.z + Math.sin(angle) * radius,
    y: 0.12 + (1 - cover) * (0.18 + Math.sin(now * 4 + home.phase) * 0.04), yaw: -angle };
}
