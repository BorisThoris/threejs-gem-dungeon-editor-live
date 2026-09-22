import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { doorReach, insideRoom } from "../dungeon/footprint";
import type { DistrictId } from "../rooms/districts";
import { STRATUM_VEINS, type StratumVeinMode } from "./strataSeamPattern";

export const THRESHOLD_ECHO_REACH = 2.2;

export interface ThresholdEchoSite {
  dir: Dir;
  destination: string;
  x: number;
  z: number;
  district?: DistrictId;
  mode?: StratumVeinMode;
}

/** A sound can come through only a real open link. The district's built
 * threshold takes precedence over a material change at the same doorway. */
export function thresholdEchoSitesFor(room: Room, rooms: readonly Room[]): ThresholdEchoSite[] {
  if (!room.district || !room.stratum) return [];
  const byId = new Map(rooms.map(candidate => [candidate.id, candidate]));
  const sites: ThresholdEchoSite[] = [];
  for (const dir of DIRS) {
    const destination = room.links[dir], next = destination ? byId.get(destination) : undefined;
    if (!destination || !next?.district || !next.stratum) continue;
    const district = next.district !== room.district ? next.district : undefined;
    const mode = !district && next.stratum !== room.stratum ? STRATUM_VEINS[next.stratum].mode : undefined;
    if (!district && !mode) continue;
    const axis = DIR_STEP[dir], along = doorReach(room, dir) - 1.2;
    const x = axis.x * along, z = axis.z * along;
    if (insideRoom(room, x, z, 0.1)) sites.push({ dir, destination, x, z, district, mode });
  }
  return sites;
}
