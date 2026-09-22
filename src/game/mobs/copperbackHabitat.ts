import { corridorOffset, doorReach, insideRoom } from "../dungeon/footprint";
import { DIR_STEP, type Room, type RoomKind } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { placementsFor } from "../rooms/placements";
import { terrainFor } from "../rooms/terrainPattern";

export const COPPERBACK_FOLD_SECONDS = 6;
const KINDS = new Set<RoomKind>(["normal", "treasure", "trap"]);

export interface CopperbackHome {
  x: number;
  z: number;
  yaw: number;
  phase: number;
  towardSecret: boolean;
}

/**
 * Copperbacks graze the rendered condenser plates, never the dry service
 * crossing. Their paired shells point along the nearest pressure gradient;
 * in a cracked-wall host that gradient is the actual sealed doorway.
 */
export function copperbacksFor(room: Room): CopperbackHome[] {
  const terrain = terrainFor(room);
  if (terrain.biome !== "verdigris" || !KINDS.has(room.kind)) return [];
  const rng = createRng(`${room.seed}:${room.id}:copperbacks`);
  const solids = placementsFor(room, room.seed).filter(p => PROP_SPECS[p.kind].solid);
  const secret = room.secret?.dir;
  const secretTarget = secret ? (() => {
    const step = DIR_STEP[secret], reach = doorReach(room, secret) - 0.35;
    return secret === "north" || secret === "south"
      ? { x: corridorOffset(room, secret), z: step.z * reach }
      : { x: step.x * reach, z: corridorOffset(room, secret) };
  })() : null;
  const candidates = terrain.deposits.filter((_, index) => index % 2 === 0).map(tile => {
    const x = tile.position[0], z = tile.position[2];
    if (!insideRoom(room, x, z, 0.42) || Math.hypot(x, z) < 2.6) return null;
    if (solids.some(p => Math.hypot(p.x - x, p.z - z) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.55)) return null;
    const towardSecret = !!secretTarget;
    const tx = secretTarget?.x ?? (Math.abs(x) > Math.abs(z) ? x : 0);
    const tz = secretTarget?.z ?? (Math.abs(x) > Math.abs(z) ? 0 : z);
    return { x, z, yaw: Math.atan2(tx - x, tz - z), phase: rng() * Math.PI * 2, towardSecret };
  }).filter((home): home is CopperbackHome => !!home);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const homes: CopperbackHome[] = [];
  for (const home of candidates) {
    if (homes.every(other => Math.hypot(home.x - other.x, home.z - other.z) >= 1.45)) homes.push(home);
    if (homes.length === 5) break;
  }
  return homes;
}

export function copperbackPose(home: CopperbackHome, now: number, folded: number) {
  const creep = (1 - folded) * Math.sin(now * 0.42 + home.phase) * 0.09;
  return {
    x: home.x + Math.sin(home.yaw) * creep,
    z: home.z + Math.cos(home.yaw) * creep,
    yaw: home.yaw,
    shellLift: (1 - folded) * (0.08 + Math.max(0, Math.sin(now * 1.4 + home.phase)) * 0.08),
    folded,
    towardSecret: home.towardSecret,
  };
}
