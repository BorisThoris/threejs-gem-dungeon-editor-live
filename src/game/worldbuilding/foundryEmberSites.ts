import { insideRoom } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";
import { biomeIdFor } from "../rooms/biomes";
import { createRng } from "../rng";

export interface EmberVent { x: number; z: number; phase: number; drift: number }

/**
 * Warm motes rise only from the fired-earth aprons described by the foundry
 * terrain grammar. Their sites are deterministic and clipped by the physical
 * floor, so an odd chamber gains shorter banks instead of particles in its
 * missing corners.
 */
export function foundryEmbersFor(room: Room): EmberVent[] {
  if (biomeIdFor(room.kind, room.id, room.seed, room) !== "foundry") return [];
  const half = room.size / 2;
  const rng = createRng(`${room.seed}:${room.id}:embers`);
  const vents: EmberVent[] = [];
  for (const side of [-1, 1]) {
    const x = side * half * 0.68;
    for (let z = -half + 2.4; z <= half - 2.4 && vents.length < 16; z += 2.4) {
      if (!insideRoom(room, x, z, 0.25)) continue;
      vents.push({ x, z, phase: rng(), drift: rng() * 2 - 1 });
    }
  }
  return vents;
}
