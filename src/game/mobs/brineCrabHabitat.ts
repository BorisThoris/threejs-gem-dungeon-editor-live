import { corridorOffset, doorReach, insideRoom, roomRayReach, roomSegmentClear, wallEdges } from "../dungeon/footprint";
import { DIR_STEP, type Room, type RoomKind } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { placementsFor } from "../rooms/placements";
import { terrainFor } from "../rooms/terrainPattern";

export const BRINE_CRAB_HIDE_SECONDS = 6;
export const BRINE_CRAB_LIGHT_REACH = 5;
const KINDS = new Set<RoomKind>(["normal", "treasure", "trap", "shrine", "secret"]);

export interface BrineCrabHome {
  x: number;
  z: number;
  phase: number;
  refugeX: number;
  refugeZ: number;
  towardSecret: boolean;
}

const segmentDistance = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / Math.max(1e-8, dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
};

/**
 * Brine crabs feed on rendered salt crust and run to a real wall shadow when
 * lantern light reaches them. In a secret host they prefer the cracked seam,
 * turning resident life into a clue without inventing a separate marker.
 */
export function brineCrabsFor(room: Room): BrineCrabHome[] {
  const terrain = terrainFor(room);
  if (terrain.biome !== "salt" || !KINDS.has(room.kind)) return [];
  const rng = createRng(`${room.seed}:${room.id}:brine-crabs`);
  const solids = placementsFor(room, room.seed).filter(p => PROP_SPECS[p.kind].solid);
  const clearRun = (x: number, z: number, tx: number, tz: number) => roomSegmentClear(room, x, z, tx, tz, 0.3)
    && solids.every(p => segmentDistance(p.x, p.z, x, z, tx, tz)
      >= PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.48);
  const secret = room.secret?.dir;
  const secretTarget = secret ? (() => {
    const step = DIR_STEP[secret], reach = doorReach(room, secret) - 0.52;
    return secret === "north" || secret === "south"
      ? { x: corridorOffset(room, secret), z: step.z * reach }
      : { x: step.x * reach, z: corridorOffset(room, secret) };
  })() : null;
  const edges = wallEdges(room);
  const candidates = terrain.deposits.filter((_, index) => index % 3 === 0).map(tile => {
    const x = tile.position[0], z = tile.position[2];
    if (solids.some(p => Math.hypot(p.x - x, p.z - z) < PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.55)) return null;
    let refuge: { x: number; z: number; towardSecret: boolean } | null = null;
    if (secretTarget && insideRoom(room, secretTarget.x, secretTarget.z, 0.28)
      && clearRun(x, z, secretTarget.x, secretTarget.z)) refuge = { ...secretTarget, towardSecret: true };
    if (!refuge) {
      const useX = Math.abs(x) >= Math.abs(z);
      const dx = useX ? (Math.sign(x) || (rng() < 0.5 ? -1 : 1)) : 0;
      const dz = useX ? 0 : (Math.sign(z) || (rng() < 0.5 ? -1 : 1));
      const distance = Math.max(0.3, roomRayReach(x, z, dx, dz, room.size * 2, edges) - 0.52);
      const fallback = { x: x + dx * distance, z: z + dz * distance };
      if (insideRoom(room, fallback.x, fallback.z, 0.28) && clearRun(x, z, fallback.x, fallback.z))
        refuge = { ...fallback, towardSecret: false };
    }
    return refuge ? { x, z, phase: rng() * Math.PI * 2,
      refugeX: refuge.x, refugeZ: refuge.z, towardSecret: refuge.towardSecret } : null;
  }).filter((home): home is BrineCrabHome => !!home);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const homes: BrineCrabHome[] = [];
  for (const home of candidates) {
    if (homes.every(other => Math.hypot(home.x - other.x, home.z - other.z) >= 1.5)) homes.push(home);
    if (homes.length === 4) break;
  }
  return homes;
}

export function brineCrabPose(home: BrineCrabHome, now: number, retreat: number) {
  const baskX = home.x + Math.cos(now * 0.38 + home.phase) * 0.14;
  const baskZ = home.z + Math.sin(now * 0.38 + home.phase) * 0.14;
  const eased = retreat * retreat * (3 - 2 * retreat);
  return {
    x: baskX + (home.refugeX - baskX) * eased,
    z: baskZ + (home.refugeZ - baskZ) * eased,
    yaw: Math.atan2(home.refugeX - baskX, home.refugeZ - baskZ),
    towardSecret: home.towardSecret,
  };
}
