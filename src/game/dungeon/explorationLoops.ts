import { DIR_STEP, OPPOSITE, type Dir, type Room } from "./types";

/** Connect adjacent excavated chambers when doing so closes a useful detour.
 * Nothing is added outside the occupied grid, and every opening is reciprocal.
 * This runs before stairs, vaults, secrets and room architecture are assigned. */
export function stitchExplorationLoops(rooms: Room[], target: number) {
  const byId = new Map(rooms.map(r => [r.id, r]));
  const byCell = new Map(rooms.map(r => [`${r.grid.x},${r.grid.z}`, r]));
  const distance = (from: string, to: string) => {
    const reached = new Map([[from, 0]]);
    for (const [id, depth] of reached) {
      if (id === to) return depth;
      for (const next of Object.values(byId.get(id)!.links))
        if (next && !reached.has(next)) reached.set(next, depth + 1);
    }
    return -1;
  };
  let cycles = rooms.reduce((sum, r) => sum + Object.keys(r.links).length, 0) / 2 - rooms.length + 1;
  while (cycles < target) {
    let best: { a: Room; b: Room; dir: Dir; distance: number } | undefined;
    // East and south enumerate each shared wall exactly once. Stable room
    // order breaks ties, so this pass needs no extra random draws.
    for (const a of rooms) for (const dir of ["east", "south"] as const) {
      if (a.links[dir]) continue;
      const axis = DIR_STEP[dir], b = byCell.get(`${a.grid.x + axis.x},${a.grid.z + axis.z}`);
      if (!b) continue;
      const detour = distance(a.id, b.id);
      if (detour >= 3 && (!best || detour > best.distance)) best = { a, b, dir, distance: detour };
    }
    if (!best) break;
    best.a.links[best.dir] = best.b.id;
    best.b.links[OPPOSITE[best.dir]] = best.a.id;
    cycles++;
  }
}
