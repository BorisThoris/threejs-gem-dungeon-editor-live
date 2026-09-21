import { insideRoom } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";
import { PROP_SPECS } from "../props/specs";
import { placementsFor } from "../rooms/placements";
import { terrainFor } from "../rooms/terrainPattern";
import { createRng } from "../rng";

export const MITE_HIDE_SECONDS = 5;
export interface MiteHome { x: number; z: number; phase: number }

/** Small colonies comb real ash windrows, clear of authored furniture. */
export function mitesFor(room: Room): MiteHome[] {
  const terrain = terrainFor(room);
  if (terrain.biome !== "ash") return [];
  const rng = createRng(`${room.seed}:${room.id}:mites`);
  const solid = placementsFor(room, room.seed).filter(p => PROP_SPECS[p.kind].solid);
  const candidates = terrain.deposits
    .filter((_, i) => i % 3 === 0)
    .map(tile => ({ x: tile.position[0], z: tile.position[2], phase: rng() * Math.PI * 2 }))
    .filter(p => insideRoom(room, p.x, p.z, 0.35) && Math.hypot(p.x, p.z) > 2.5)
    .filter(p => solid.every(q => Math.hypot(p.x - q.x, p.z - q.z) >= PROP_SPECS[q.kind].radius * (q.scale ?? 1) + 0.5));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const homes: MiteHome[] = [];
  for (const p of candidates) {
    if (homes.every(q => Math.hypot(p.x - q.x, p.z - q.z) >= 1.2)) homes.push(p);
    if (homes.length === 6) break;
  }
  return homes;
}

export function mitePose(home: MiteHome, now: number, hidden: number) {
  const angle = home.phase + now * (0.55 + (home.phase % 0.25));
  const radius = 0.28 * (1 - hidden);
  return {
    x: home.x + Math.cos(angle) * radius,
    z: home.z + Math.sin(angle) * radius,
    yaw: -angle + Math.PI / 2,
    hidden,
  };
}
