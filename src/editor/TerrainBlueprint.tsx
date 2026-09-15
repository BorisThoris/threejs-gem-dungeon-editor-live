import { mergeTerrainBeds } from "../game/rooms/mergeTerrainBeds";
import { useMemo } from "react";
import type { Room } from "../game/dungeon/types";
import { terrainFor, TERRAIN_COLORS, type TerrainTile } from "../game/rooms/terrainPattern";

/** The same terrain pieces as the game, projected into the authoring plan. */
export function TerrainBlueprint({ room, scale }: { room: Room; scale: number }) {
  const terrain = useMemo(() => terrainFor(room), [room]);
  const beds = useMemo(() => mergeTerrainBeds(terrain.deposits), [terrain.deposits]);
  const path = (tiles: TerrainTile[]) => tiles.map(tile => {
    const x = (tile.position[0] - tile.size[0] / 2) * scale;
    const z = (tile.position[2] - tile.size[2] / 2) * scale;
    const w = tile.size[0] * scale, d = tile.size[2] * scale;
    return `M${x},${z}h${w}v${d}h${-w}Z`;
  }).join(" ");
  const [paving, deposits] = TERRAIN_COLORS[terrain.biome];
  return <g aria-label="Terrain pattern" opacity={0.8}>
    <path data-testid="atlas-paving" data-count={terrain.paving.length} d={path(terrain.paving)} fill={paving}>
      <title>Paving follows the chamber and gallery lanes, including ramps.</title>
    </path>
    <path data-testid="atlas-deposits" data-count={terrain.deposits.length} d={path(beds)} fill={deposits}>
      <title>Connected beds and deposits follow the biome; standing water stays off slopes.</title>
    </path>
  </g>;
}
