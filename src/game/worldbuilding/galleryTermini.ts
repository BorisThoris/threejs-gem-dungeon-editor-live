import { DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { wingWidthAt } from "../dungeon/footprint";
import type { DistrictId } from "../rooms/districts";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { DOOR_HEIGHT, WALL_HEIGHT } from "../world";
import { terracePoint, terracesFor, type Terrace } from "./elevation";

export interface GalleryTerminusDefinition {
  name: string;
  description: string;
}

/** A closed gallery ends in the working language of its connected district. */
export const GALLERY_TERMINI: Record<DistrictId, GalleryTerminusDefinition> = {
  gardens: {
    name: "root tending bay",
    description: "A crossbeam and three floor roots mark where a nursery line was tied off.",
  },
  works: {
    name: "sorting gantry",
    description: "Paired floor rails finish beneath a low counting beam and its hangers.",
  },
  tombs: {
    name: "listening apse",
    description: "Processional slabs end beneath a rib whose hanging teeth gather the room's echo.",
  },
};

export interface GalleryTerminus {
  dir: Dir;
  x: number;
  z: number;
  width: number;
  raised: number;
  paired: boolean;
  secretFlank: boolean;
}

export interface GalleryTerminusPattern {
  definition: GalleryTerminusDefinition;
  sites: GalleryTerminus[];
  structure: CorridorBlock[];
  detail: CorridorBlock[];
  marks: CorridorBlock[];
}

const cache = new WeakMap<Room, GalleryTerminusPattern>();

/**
 * Give every raised annex a visible reason to exist. All pieces join the
 * room's three architecture batches: heavy work remains overhead, floor marks
 * are paint-depth, and the central ramp stays clear. Paired galleries use one
 * shared axial grammar; those flanking a crack turn its host into a memorable
 * final room without adding a floating clue icon.
 */
export function galleryTerminiFor(room: Room): GalleryTerminusPattern {
  const saved = cache.get(room);
  if (saved) return saved;
  const district = room.district ?? "tombs";
  const definition = GALLERY_TERMINI[district];
  const terraces = terracesFor(room);
  const paired = terraces.length > 1;
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  const sites: GalleryTerminus[] = [];

  for (const terrace of terraces) {
    const along = Math.min(terrace.end - 0.7, Math.max(terrace.rampEnd + 0.35, terrace.end - 2.1));
    const width = Math.min(
      wingWidthAt(room, terrace.dir, along - 0.65),
      wingWidthAt(room, terrace.dir, along + 0.65)
    );
    const span = Math.min(4.6, width - 0.8);
    if (span < 2) continue;
    const axis = DIR_STEP[terrace.dir];
    const point = (delta: number, across: number, y: number) => terracePoint(terrace, along + delta, across, y);
    const block = (into: CorridorBlock[], delta: number, across: number, y: number,
      wide: number, height: number, deep: number) => into.push({
      position: point(delta, across, y),
      size: axis.x ? [deep, height, wide] : [wide, height, deep],
    });
    const centre = point(0, 0, terrace.height);
    const secretDir = room.secret?.dir;
    const secretFlank = !!secretDir && (secretDir === "north" || secretDir === "south") !==
      (terrace.dir === "north" || terrace.dir === "south");
    sites.push({ dir: terrace.dir, x: centre[0], z: centre[2], width: span,
      raised: terrace.height, paired, secretFlank });

    if (district === "gardens") {
      block(structure, 0, 0, WALL_HEIGHT - 0.42, span, 0.24, 0.34);
      for (const across of [-span * 0.32, 0, span * 0.32]) {
        block(detail, 0, across, WALL_HEIGHT - 0.82, 0.2, 0.72, 0.22);
        block(marks, 0.12, across, terrace.height + 0.025, 0.16, 0.03, 1.15);
        block(marks, 0.02, across, DOOR_HEIGHT + 0.42, 0.24, 0.16, 0.25);
      }
    } else if (district === "works") {
      block(structure, 0, 0, WALL_HEIGHT - 0.38, span, 0.3, 0.42);
      for (const across of [-span * 0.36, span * 0.36]) {
        block(detail, 0, across, WALL_HEIGHT - 0.86, 0.2, 0.82, 0.24);
        block(marks, 0.05, across, terrace.height + 0.025, 0.14, 0.03, 1.3);
      }
      block(marks, 0.32, 0, terrace.height + 0.027, span * 0.78, 0.034, 0.14);
      for (const across of [-span * 0.3, -span * 0.1, span * 0.1, span * 0.3])
        block(marks, 0.02, across, DOOR_HEIGHT + 0.44, 0.22, 0.14, 0.27);
    } else {
      block(structure, 0, 0, WALL_HEIGHT - 0.34, span, 0.28, 0.4);
      for (const across of [-span * 0.32, 0, span * 0.32]) {
        block(detail, 0, across, DOOR_HEIGHT + 0.58, 0.22, 0.72, 0.24);
        block(marks, 0.02, across, DOOR_HEIGHT + 0.36, 0.3, 0.12, 0.26);
      }
      for (const delta of [-0.45, 0.45])
        block(marks, delta, 0, terrace.height + 0.025, span * 0.76, 0.03, 0.36);
    }
  }

  const result = { definition, sites, structure, detail, marks };
  cache.set(room, result);
  return result;
}
