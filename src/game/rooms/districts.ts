import type { Room } from "../dungeon/types";
import { BIOMES_FOR, type BiomeId } from "./biomes";
import { createRng } from "../rng";

/** Districts spread through actual doorways, never through grid-neighbour walls. */
export const DISTRICTS = {
  gardens: { name: "Rootwater galleries", biomes: ["mossy", "flooded", "fungal", "hewn", "timber", "catacomb", "crystal", "bone", "ash", "foundry"] },
  works: { name: "The old works", biomes: ["foundry", "ash", "hewn", "timber", "catacomb", "crystal", "bone", "flooded", "mossy"] },
  tombs: { name: "The buried choir", biomes: ["bone", "catacomb", "ash", "crystal", "hewn", "timber", "foundry", "flooded", "mossy"] },
} as const;
export type DistrictId = keyof typeof DISTRICTS;

const PRIMARY_STRATA: Record<DistrictId, number> = { gardens: 4, works: 3, tombs: 4 };

/**
 * Lay a district's materials down as connected geological bands.
 *
 * A room used to pick the district's first compatible material independently.
 * That kept the palette consistent, but it produced one flat coat with abrupt
 * exceptions wherever a room purpose rejected that coat. Distances from the
 * district root now form three-room bands through actual doors. Neighbouring
 * branches at the same depth share their stratum, and a purpose that cannot use
 * it takes the next compatible material in the same district sequence.
 */
function assignStrata(rooms: Room[], roots: readonly [string, DistrictId][]) {
  const byId = new Map(rooms.map(room => [room.id, room]));
  for (const [rootId, district] of roots) {
    const root = byId.get(rootId);
    if (!root) continue;
    const palette = DISTRICTS[district].biomes;
    const primary = PRIMARY_STRATA[district];
    const offset = Math.floor(createRng(`${root.seed}:${district}:strata`)() * primary);
    const distance = new Map<string, number>([[rootId, 0]]);
    const queue = [rootId];
    for (const id of queue) {
      const room = byId.get(id)!;
      for (const next of Object.values(room.links)) {
        const neighbour = next ? byId.get(next) : undefined;
        if (!neighbour || neighbour.district !== district || distance.has(neighbour.id)) continue;
        distance.set(neighbour.id, distance.get(id)! + 1);
        queue.push(neighbour.id);
      }
    }
    for (const room of rooms) {
      const steps = distance.get(room.id);
      if (steps === undefined || room.kind === "secret") continue;
      const preferred = (offset + Math.floor(steps / 3)) % primary;
      room.stratum = palette[preferred];
      const ordered = [...palette.slice(preferred, primary), ...palette.slice(0, preferred), ...palette.slice(primary)];
      room.biome = ordered.find(biome => BIOMES_FOR[room.kind].includes(biome)) as BiomeId;
    }
  }

  // A sealed chamber is not part of the open graph. Continue the host wall's
  // material sequence instead of rolling an unrelated hidden-room surface.
  for (const host of rooms) if (host.secret) {
    const secret = byId.get(host.secret.to);
    if (!secret || !host.district) continue;
    const palette: readonly BiomeId[] = DISTRICTS[host.district].biomes;
    secret.stratum = host.stratum ?? host.biome ?? palette[0];
    const at = Math.max(0, palette.indexOf(secret.stratum));
    const ordered = [...palette.slice(at), ...palette.slice(0, at)];
    secret.biome = ordered.find(biome => BIOMES_FOR.secret.some(allowed => allowed === biome)) as BiomeId;
  }
}

export function assignDistricts(rooms: Room[], startId: string, endId: string, floor: number) {
  const byId = new Map(rooms.map(room => [room.id, room]));
  const distance = (start: string) => {
    const steps = new Map([[start, 0]]);
    const queue = [start];
    for (const id of queue) for (const next of Object.values(byId.get(id)?.links ?? {})) {
      if (next && !steps.has(next)) { steps.set(next, steps.get(id)! + 1); queue.push(next); }
    }
    return steps;
  };
  const fromStart = distance(startId), fromEnd = distance(endId);
  const middle = rooms.filter(r => r.id !== startId && r.id !== endId && r.kind !== "secret")
    .sort((a, b) => Math.min(fromStart.get(b.id) ?? 0, fromEnd.get(b.id) ?? 0)
      - Math.min(fromStart.get(a.id) ?? 0, fromEnd.get(a.id) ?? 0))[0];
  const queue: string[] = [];
  const roots: [string, DistrictId][] = [[startId, floor >= 3 ? "works" : "gardens"], [endId, "tombs"]];
  if (middle) roots.push([middle.id, floor >= 3 ? "gardens" : "works"]);
  const seen = new Set<string>();
  for (const [id, district] of roots) { byId.get(id)!.district = district; seen.add(id); queue.push(id); }
  for (const id of queue) {
    const room = byId.get(id)!;
    for (const next of Object.values(room.links)) {
      if (!next || seen.has(next)) continue;
      byId.get(next)!.district = room.district;
      seen.add(next); queue.push(next);
    }
  }
  // The sealed chamber belongs to its host's history, even before it has a door.
  for (const room of rooms) if (room.secret) byId.get(room.secret.to)!.district = room.district;
  assignStrata(rooms, roots);
}
