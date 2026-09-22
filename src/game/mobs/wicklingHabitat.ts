import { corridorOffset, doorReach, insideRoom } from "../dungeon/footprint";
import { DIR_STEP, type Room, type RoomKind } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { placementsFor } from "../rooms/placements";
import { terrainFor } from "../rooms/terrainPattern";

export const WICKLING_SNUFF_SECONDS = 5;
const KINDS = new Set<RoomKind>(["normal", "treasure", "trap", "shrine"]);

export interface WicklingHome {
  x: number;
  z: number;
  yaw: number;
  phase: number;
  towardSecret: boolean;
}

/**
 * Wicklings graze actual wax runs. Their ember tips lean into the strongest
 * room draft; a sealed doorway therefore aligns the whole colony with the
 * real cracked wall instead of adding a separate secret marker.
 */
export function wicklingsFor(room: Room): WicklingHome[] {
  const terrain = terrainFor(room);
  if (terrain.biome !== "tallow" || !KINDS.has(room.kind)) return [];
  const rng = createRng(`${room.seed}:${room.id}:wicklings`);
  const solids = placementsFor(room, room.seed).filter(prop => PROP_SPECS[prop.kind].solid);
  const secret = room.secret?.dir;
  const target = secret ? (() => {
    const step = DIR_STEP[secret], reach = doorReach(room, secret) - 0.42;
    return secret === "north" || secret === "south"
      ? { x: corridorOffset(room, secret), z: step.z * reach }
      : { x: step.x * reach, z: corridorOffset(room, secret) };
  })() : null;
  const candidates = terrain.deposits.filter((_, index) => index % 2 === 0).map(tile => {
    const x = tile.position[0], z = tile.position[2];
    if (!insideRoom(room, x, z, 0.32) || Math.hypot(x, z) < 2.5) return null;
    if (solids.some(prop => Math.hypot(prop.x - x, prop.z - z) < PROP_SPECS[prop.kind].radius * (prop.scale ?? 1) + 0.48)) return null;
    const tx = target?.x ?? 0, tz = target?.z ?? 0;
    return { x, z, yaw: Math.atan2(tx - x, tz - z), phase: rng() * Math.PI * 2, towardSecret: !!target };
  }).filter((home): home is WicklingHome => !!home);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const homes: WicklingHome[] = [];
  for (const home of candidates) {
    if (homes.every(other => Math.hypot(home.x - other.x, home.z - other.z) >= 1.35)) homes.push(home);
    if (homes.length === 5) break;
  }
  return homes;
}

export function wicklingPose(home: WicklingHome, now: number, snuffed: number) {
  const awake = 1 - snuffed;
  const creep = awake * Math.sin(now * 0.55 + home.phase) * 0.07;
  return {
    x: home.x + Math.sin(home.yaw) * creep,
    z: home.z + Math.cos(home.yaw) * creep,
    yaw: home.yaw,
    height: 0.08 + awake * (0.13 + Math.max(0, Math.sin(now * 1.2 + home.phase)) * 0.05),
    lean: awake * (0.12 + Math.sin(now * 0.8 + home.phase) * 0.04),
    ember: awake,
    towardSecret: home.towardSecret,
  };
}
