import { corridorOffset, doorReach, insideRoom, roomRayReach, roomSegmentClear, wallEdges } from "../dungeon/footprint";
import { DIR_STEP, type Room } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { placementsFor } from "../rooms/placements";
import { foundryEmbersFor } from "../worldbuilding/foundryEmberSites";

export const NEWT_HIDE_SECONDS = 7;

export interface NewtHome {
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
 * Kiln newts bask on real ember vents. A colony with a cracked wall chooses
 * that seam as its refuge, making its flight a quiet, physical secret clue.
 */
export function newtsFor(room: Room): NewtHome[] {
  const vents = foundryEmbersFor(room);
  if (!vents.length) return [];
  const rng = createRng(`${room.seed}:${room.id}:newts`);
  const solids = placementsFor(room, room.seed).filter(p => PROP_SPECS[p.kind].solid);
  const clearRun = (x: number, z: number, tx: number, tz: number) => roomSegmentClear(room, x, z, tx, tz, 0.28)
    && solids.every(p => segmentDistance(p.x, p.z, x, z, tx, tz)
      >= PROP_SPECS[p.kind].radius * (p.scale ?? 1) + 0.45);
  const secret = room.secret?.dir;
  const secretTarget = secret ? (() => {
    const step = DIR_STEP[secret], reach = doorReach(room, secret) - 0.48;
    return secret === "north" || secret === "south"
      ? { x: corridorOffset(room, secret), z: step.z * reach }
      : { x: step.x * reach, z: corridorOffset(room, secret) };
  })() : null;
  const edges = wallEdges(room);
  // The feeding orbit is wider than the resting body. A block-cut apse can
  // expose a chamber-edge vent that was legal as a particle source but not as
  // the centre of a whole animal's circle, so reserve the full orbit here.
  const candidates = vents.filter((vent, i) => i % 2 === 0 && insideRoom(room, vent.x, vent.z, 0.43)).map(vent => {
    let refuge: { x: number; z: number; towardSecret: boolean } | null = null;
    if (secretTarget && insideRoom(room, secretTarget.x, secretTarget.z, 0.25)
      && clearRun(vent.x, vent.z, secretTarget.x, secretTarget.z)) {
      refuge = { ...secretTarget, towardSecret: true };
    }
    if (!refuge) {
      const dx = Math.abs(vent.x) > 0.1 ? Math.sign(vent.x) : (rng() < 0.5 ? -1 : 1);
      const reach = Math.max(0.4, roomRayReach(vent.x, vent.z, dx, 0, room.size * 2, edges) - 0.48);
      const fallback = { x: vent.x + dx * reach, z: vent.z };
      if (insideRoom(room, fallback.x, fallback.z, 0.25) && clearRun(vent.x, vent.z, fallback.x, fallback.z))
        refuge = { ...fallback, towardSecret: false };
    }
    return refuge ? { x: vent.x, z: vent.z, phase: rng() * Math.PI * 2,
      refugeX: refuge.x, refugeZ: refuge.z, towardSecret: refuge.towardSecret } : null;
  }).filter((home): home is NewtHome => !!home);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, 4);
}

export function newtPose(home: NewtHome, now: number, retreat: number) {
  const angle = home.phase + now * 0.22;
  const baskX = home.x + Math.cos(angle) * 0.18;
  const baskZ = home.z + Math.sin(angle) * 0.18;
  const eased = retreat * retreat * (3 - 2 * retreat);
  const x = baskX + (home.refugeX - baskX) * eased;
  const z = baskZ + (home.refugeZ - baskZ) * eased;
  return { x, z, yaw: Math.atan2(home.refugeX - baskX, home.refugeZ - baskZ), retreat,
    towardSecret: home.towardSecret };
}
