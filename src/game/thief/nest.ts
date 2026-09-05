import { bfsDepth } from "../dungeon/generate";
import type { Dungeon } from "../dungeon/types";

/**
 * Where the Cutpurse takes what it steals.
 *
 * Derived from the floor rather than generated with it, so nothing in the
 * dungeon data has to know a thief exists. The same floor always has the
 * same nest, which matters: a nest that moved between visits would make
 * the walk back a lie.
 *
 * The deepest ordinary room from the start, which is the one furthest out
 * of a player's way - a nest you pass on the way to the exit is not a
 * detour and so is not a decision. The set pieces are excluded because
 * each of them already asks a question, and a pile of your own gems in the
 * middle of the arena is two questions in a room built for one. The vault
 * is excluded for a harder reason: its door wants an iron key, and a floor
 * could otherwise put your gems somewhere you cannot get to them at all.
 */
const NOT_A_NEST = new Set(["start", "end", "shop", "arena", "memory", "challenge"]);

export function nestRoom(dungeon: Dungeon): string | null {
  const depth = bfsDepth(dungeon.rooms, dungeon.startId);
  let best: string | null = null;
  let bestDepth = -1;
  for (const room of dungeon.rooms) {
    if (NOT_A_NEST.has(room.kind)) continue;
    if (room.id === dungeon.vaultId) continue;
    const d = depth.get(room.id) ?? -1;
    // Ties go to the first the generator wrote, which is stable for a seed.
    if (d > bestDepth) {
      bestDepth = d;
      best = room.id;
    }
  }
  return best;
}
