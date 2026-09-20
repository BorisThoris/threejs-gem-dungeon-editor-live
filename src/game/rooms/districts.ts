import type { Room } from "../dungeon/types";
import { BIOMES_FOR, type BiomeId } from "./biomes";
import { createRng } from "../rng";

/** Districts spread through actual doorways, never through grid-neighbour walls. */
export const DISTRICTS = {
  gardens: { name: "Rootwater galleries", biomes: ["mossy", "flooded", "fungal", "hewn", "timber", "catacomb", "crystal", "bone", "foundry"] },
  works: { name: "The old works", biomes: ["foundry", "hewn", "timber", "catacomb", "crystal", "bone", "flooded", "mossy"] },
  tombs: { name: "The buried choir", biomes: ["bone", "catacomb", "crystal", "hewn", "timber", "foundry", "flooded", "mossy"] },
} as const;
export type DistrictId = keyof typeof DISTRICTS;

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
  for (const room of rooms) {
    const palette = DISTRICTS[room.district ?? "tombs"].biomes;
    const primary = room.district === "gardens" ? 4 : 3;
    const offset = Math.floor(createRng(`${room.seed}:${room.district}:strata`)() * primary);
    const ordered = [...palette.slice(offset, primary), ...palette.slice(0, offset), ...palette.slice(primary)];
    room.biome = ordered.find(b => BIOMES_FOR[room.kind].includes(b)) as BiomeId;
  }
}
