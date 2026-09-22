import type { TerrainTile } from "./terrainPattern";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
const plane = (tile: TerrainTile) => tile.position[1] - (tile.slope?.[0] ?? 0) * tile.position[0] - (tile.slope?.[1] ?? 0) * tile.position[2];
const samePlane = (a: TerrainTile, b: TerrainTile) => near(plane(a), plane(b)) && near(a.size[1], b.size[1]) &&
  near(a.slope?.[0] ?? 0, b.slope?.[0] ?? 0) && near(a.slope?.[1] ?? 0, b.slope?.[1] ?? 0) &&
  !!a.bank === !!b.bank;

/** Coalesce only touching rectangles on the same floor plane. Gameplay keeps
 * the original sample cells; rendering submits the identical covered area. */
export function mergeTerrainBeds(tiles: readonly TerrainTile[]): TerrainTile[] {
  let pieces = tiles.map(tile => ({ ...tile, position: [...tile.position] as [number, number, number], size: [...tile.size] as [number, number, number] }));
  for (const axis of [0, 2] as const) {
    const other = axis === 0 ? 2 : 0;
    pieces.sort((a, b) => a.position[other] - b.position[other] || a.size[other] - b.size[other] || plane(a) - plane(b) || a.position[axis] - b.position[axis]);
    const merged: TerrainTile[] = [];
    for (const tile of pieces) {
      const last = merged.at(-1);
      if (last && near(last.position[other], tile.position[other]) && near(last.size[other], tile.size[other]) && samePlane(last, tile) &&
        near(last.position[axis] + last.size[axis] / 2, tile.position[axis] - tile.size[axis] / 2)) {
        const shift = tile.size[axis] / 2;
        last.position[axis] += shift;
        last.position[1] += (last.slope?.[axis === 0 ? 0 : 1] ?? 0) * shift;
        last.size[axis] += tile.size[axis];
      } else merged.push(tile);
    }
    pieces = merged;
  }
  return pieces;
}
