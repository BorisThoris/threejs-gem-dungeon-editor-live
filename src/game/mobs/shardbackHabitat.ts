import { insideRoom } from "../dungeon/footprint";
import type { Room, RoomKind } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { placementsFor } from "../rooms/placements";
import { terrainFor } from "../rooms/terrainPattern";

export const SHARDBACK_WARNING_SECONDS = 1.6;
export const SHARDBACK_COOLDOWN_SECONDS = 9;
export const SHARDBACK_LIGHT_REACH = 4.5;
const SHARDBACK_KINDS = new Set<RoomKind>(["normal", "treasure", "trap", "shrine", "library"]);

export interface ShardbackHome { x: number; z: number; phase: number }

/**
 * Shardbacks graze the visible resonance ring. Memory chambers are excluded:
 * their four authored crystals are a puzzle vocabulary and ambient plates
 * would make the answer harder to read.
 */
export function shardbacksFor(room: Room): ShardbackHome[] {
  if (!SHARDBACK_KINDS.has(room.kind)) return [];
  const terrain = terrainFor(room);
  if (terrain.biome !== "crystal") return [];
  const rng = createRng(`${room.seed}:${room.id}:shardbacks`);
  const solid = placementsFor(room, room.seed).filter(placement => PROP_SPECS[placement.kind].solid);
  const candidates = terrain.deposits
    .filter((_, index) => index % 2 === 0)
    .map(tile => ({ x: tile.position[0], z: tile.position[2], phase: rng() * Math.PI * 2 }))
    .filter(home => insideRoom(room, home.x, home.z, 0.45) && Math.hypot(home.x, home.z) > 2.6)
    .filter(home => solid.every(placement => Math.hypot(home.x - placement.x, home.z - placement.z)
      >= PROP_SPECS[placement.kind].radius * (placement.scale ?? 1) + 0.65));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const homes: ShardbackHome[] = [];
  for (const home of candidates) {
    if (homes.every(other => Math.hypot(home.x - other.x, home.z - other.z) >= 1.6)) homes.push(home);
    if (homes.length === 5) break;
  }
  return homes;
}

/** A short crawl that never leaves the terrain cell which selected it. */
export function shardbackPose(home: ShardbackHome, now: number, folded: number) {
  const angle = home.phase + now * 0.24;
  const radius = 0.22 * (1 - folded * 0.75);
  return {
    x: home.x + Math.cos(angle) * radius,
    z: home.z + Math.sin(angle) * radius,
    yaw: -angle + Math.PI / 2,
  };
}
