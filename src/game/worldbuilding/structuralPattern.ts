import { DIR_STEP, elbowMissing, elbowShoulder, halfSize, junctionHubWidth, type Room } from "../dungeon/types";
import { corridorOffset, corridorWidth, doorReach, floorRects, junctionDirections } from "../dungeon/footprint";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { DOOR_HEIGHT, GROUND_Y, WALL_HEIGHT } from "../world";
import { identityFor, PLACE_IDENTITIES } from "./identity";
import { biomeCrownFor, type CrownSpan } from "./biomeCrown";
import { galleryTerminiFor } from "./galleryTermini";

/** Cut the same room union into structural bays. Each span is wholly inside
 * the floor below it; a polygon's clipped corner cannot acquire a square roof. */
export function structuralSpans(room: Room): CrownSpan[] {
  const rects = floorRects(room), spans: CrownSpan[] = [];
  for (let z = -room.size / 2 + 2.5; z <= room.size / 2 - 1.5; z += 4) {
    const intervals = rects.filter(r => z - 0.18 >= r.z - r.depth / 2 && z + 0.18 <= r.z + r.depth / 2)
      .map(r => [r.x - r.width / 2, r.x + r.width / 2]).sort((a, b) => a[0] - b[0]);
    const merged: number[][] = [];
    for (const interval of intervals) {
      const last = merged.at(-1);
      if (last && interval[0] <= last[1] + 0.001) last[1] = Math.max(last[1], interval[1]);
      else merged.push([...interval]);
    }
    for (const [left, right] of merged) if (right - left > 2)
      spans.push({ x: (left + right) / 2, z, width: right - left - 0.4 });
  }
  return spans;
}

/** The retained pier of an elbow chamber is readable at both eye level and
 * underfoot. Keeping this small pattern separate also lets the layout audit
 * prove that every face stays on the real L-shaped floor. */
export function elbowTurnFor(room: Room) {
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  if (room.shape !== "elbow") return { structure, detail, marks };
  const block = (into: CorridorBlock[], x: number, y: number, z: number, w: number, h: number, d: number) =>
    into.push({ position: [x, GROUND_Y + y, z], size: [w, h, d] });
  const missing = elbowMissing(room), shoulder = elbowShoulder(room.size), half = halfSize(room);
  const length = half - shoulder - 0.8, along = (half + shoulder - 0.8) / 2;
  const x = missing.x * (shoulder - 0.28), z = missing.z * (shoulder - 0.28);
  // Paired rails and floor tallies follow the two faces of the retained pier.
  // The right angle reads as former work instead of an arbitrary missing tile.
  block(structure, x, WALL_HEIGHT - 0.78, missing.z * along, 0.22, 0.22, length);
  block(structure, missing.x * along, WALL_HEIGHT - 0.78, z, length, 0.22, 0.22);
  block(detail, missing.x * (shoulder - 0.5), WALL_HEIGHT - 1.1,
    missing.z * (shoulder - 0.5), 0.55, 0.65, 0.55);
  block(marks, missing.x * (shoulder - 0.18), 0.025, missing.z * along, 0.14, 0.05, length);
  block(marks, missing.x * along, 0.025, missing.z * (shoulder - 0.18), length, 0.05, 0.14);
  return { structure, detail, marks };
}

/** A topology hall frames only the roads that actually exist. The same
 * doorway graph that cuts its floor therefore remains readable overhead and
 * in the worn tally across each neck. */
export function junctionFramesFor(room: Room) {
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  if (room.shape !== "junction") return { structure, detail, marks };
  const block = (into: CorridorBlock[], x: number, y: number, z: number, w: number, h: number, d: number) =>
    into.push({ position: [x, GROUND_Y + y, z], size: [w, h, d] });
  const hub = junctionHubWidth(room.size) / 2;
  for (const dir of junctionDirections(room)) {
    const axis = DIR_STEP[dir], across = { x: -axis.z, z: axis.x };
    const span = Math.min(junctionHubWidth(room.size), corridorWidth(room, dir));
    const along = hub - 0.18;
    const shift = corridorOffset(room, dir);
    // corridorOffset is already a world-axis coordinate, not a signed local
    // offset: north/south use x and east/west use z directly.
    const x = axis.x * along + (axis.z ? shift : 0);
    const z = axis.z * along + (axis.x ? shift : 0);
    block(structure, x, WALL_HEIGHT - 0.72, z,
      axis.x ? 0.24 : span - 0.4, 0.24, axis.z ? 0.24 : span - 0.4);
    for (const sign of [-1, 1]) block(detail,
      x + across.x * sign * (span / 2 - 0.25), DOOR_HEIGHT + 0.42,
      z + across.z * sign * (span / 2 - 0.25), 0.18, 0.7, 0.18);
    const tally = hub + 0.18;
    block(marks, axis.x * tally + (axis.z ? shift : 0), 0.025,
      axis.z * tally + (axis.x ? shift : 0),
      axis.x ? 0.16 : span - 0.5, 0.05, axis.z ? 0.16 : span - 0.5);
  }
  return { structure, detail, marks };
}

export interface SealedThresholdDefinition {
  name: string;
  description: string;
  response: string;
}

/** A hidden room belonged to the building before it was sealed. The surviving
 * threshold uses the host district's construction language at the real cracked
 * wall, and disappears with that wall after it opens. It joins the room's
 * existing three architecture batches, so a clue never costs its own draw. */
export const SEALED_THRESHOLDS = {
  gardens: {
    name: "root-bound blind gate",
    description: "A tied lintel and three trimmed root ends survive above the sealed growing run.",
    response: "Footsteps return with a dry wooden breath from behind the tied roots.",
  },
  works: {
    name: "bricked service hatch",
    description: "A counting beam, paired hangers and four worn rivet tallies frame the buried workshop way.",
    response: "The blocked hatch gives one short iron answer after the room's ordinary return.",
  },
  tombs: {
    name: "stopped processional arch",
    description: "Low corbels and a broken centre tooth preserve the measure of a passage filled with stone.",
    response: "The blind arch sends back a second low note from deeper masonry.",
  },
} as const;

export function sealedThresholdFor(room: Room) {
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  const district = room.district ?? "tombs";
  const definition = SEALED_THRESHOLDS[district];
  const dir = room.secret?.dir;
  if (!dir || room.links[dir]) return { definition, dir: null, structure, detail, marks };

  const axis = DIR_STEP[dir], across = { x: -axis.z, z: axis.x };
  const span = Math.min(5.2, corridorWidth(room, dir) - 0.7);
  const shift = corridorOffset(room, dir), reach = doorReach(room, dir);
  const point = (along: number, lateral: number, y: number): [number, number, number] => [
    axis.x * along + (axis.z ? shift : 0) + across.x * lateral,
    GROUND_Y + y,
    axis.z * along + (axis.x ? shift : 0) + across.z * lateral,
  ];
  const block = (into: CorridorBlock[], along: number, lateral: number, y: number,
    wide: number, height: number, deep: number) => into.push({
      position: point(along, lateral, y),
      size: axis.x ? [deep, height, wide] : [wide, height, deep],
    });

  // Pull every face inside the physical approach. This works for polygon
  // collars, offset wings and topology-hall arms through the same footprint.
  const lintel = reach - 0.42;
  if (district === "gardens") {
    block(structure, lintel, 0, WALL_HEIGHT - 0.38, span, 0.28, 0.34);
    for (const lateral of [-span * 0.32, 0, span * 0.32]) {
      block(detail, lintel - 0.02, lateral, DOOR_HEIGHT + 0.5, 0.18, 0.82, 0.2);
      block(marks, reach - 1.1, lateral, 0.025, 0.13, 0.04, 1.05);
    }
  } else if (district === "works") {
    block(structure, lintel, 0, WALL_HEIGHT - 0.36, span, 0.32, 0.4);
    for (const lateral of [-span * 0.36, span * 0.36])
      block(detail, lintel - 0.02, lateral, DOOR_HEIGHT + 0.54, 0.2, 0.88, 0.24);
    for (const lateral of [-span * 0.36, -span * 0.12, span * 0.12, span * 0.36])
      block(marks, lintel - 0.24, lateral, DOOR_HEIGHT + 0.35, 0.18, 0.12, 0.22);
    block(marks, reach - 1.12, 0, 0.025, span * 0.78, 0.04, 0.14);
  } else {
    block(structure, lintel, 0, WALL_HEIGHT - 0.32, span, 0.3, 0.42);
    for (const lateral of [-span * 0.4, span * 0.4]) for (let tier = 0; tier < 2; tier++)
      block(detail, lintel - tier * 0.12, lateral - Math.sign(lateral) * tier * 0.34,
        DOOR_HEIGHT + 0.38 + tier * 0.3, 0.4, 0.28, 0.32);
    block(marks, lintel - 0.03, 0, DOOR_HEIGHT + 0.48, 0.34, 0.34, 0.34);
    for (const lateral of [-span * 0.26, 0, span * 0.26])
      block(marks, reach - 1.05, lateral, 0.025, 0.28, 0.04, 0.5);
  }
  return { definition, dir, structure, detail, marks };
}

export function architectureFor(room: Room) {
  const identity = PLACE_IDENTITIES[identityFor(room)];
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  const block = (into: CorridorBlock[], x: number, y: number, z: number, w: number, h: number, d: number) =>
    into.push({ position: [x, GROUND_Y + y, z], size: [w, h, d] });
  const spans = structuralSpans(room);
  for (const span of spans) {
    const { x, z, width } = span;
    if (identity.tradition === "ironwork") {
      for (const offset of [-0.1, 0.1]) block(structure, x, WALL_HEIGHT - 0.42, z + offset, width, 0.18, 0.09);
      for (let across = -width / 2 + 0.6; across < width / 2 - 0.4; across += 2) {
        block(detail, x + across, WALL_HEIGHT - 0.66, z, 0.09, 0.65, 0.3);
        block(marks, x + across, WALL_HEIGHT - 0.97, z, 0.32, 0.08, 0.33);
      }
    } else if (identity.tradition === "trellis") {
      block(structure, x, WALL_HEIGHT - 0.42, z, width, 0.24, 0.28);
      for (let across = -width / 2 + 0.5; across < width / 2 - 0.5; across += 2.6) {
        block(detail, x + across, WALL_HEIGHT - 0.72, z, 0.22, 0.7, 0.24);
        block(detail, x + across + 0.13, WALL_HEIGHT - 1.12, z, 0.38, 0.18, 0.28);
        if (room.biome === "fungal") block(marks, x + across + 0.13, WALL_HEIGHT - 1.2, z, 0.28, 0.08, 0.2);
      }
    } else {
      // Stepped corbels rise toward the keystone, leaving the same open
      // clearance as the doors even in the smallest furnished chamber.
      block(structure, x, WALL_HEIGHT - 0.25, z, width, 0.24, 0.32);
      for (const sign of [-1, 1]) for (let tier = 0; tier < 3; tier++) {
        block(detail, x + sign * (width / 2 - 0.22 - tier * 0.45), DOOR_HEIGHT + 0.4 + tier * 0.32,
          z, 0.44, 0.3, 0.36);
      }
      block(marks, x, WALL_HEIGHT - 0.48, z, 0.38, 0.3, 0.42);
    }
  }
  const turn = elbowTurnFor(room);
  structure.push(...turn.structure);
  detail.push(...turn.detail);
  marks.push(...turn.marks);
  const junction = junctionFramesFor(room);
  structure.push(...junction.structure);
  detail.push(...junction.detail);
  marks.push(...junction.marks);
  const sealed = sealedThresholdFor(room);
  structure.push(...sealed.structure);
  detail.push(...sealed.detail);
  marks.push(...sealed.marks);
  const crown = biomeCrownFor(room, spans);
  const gallery = galleryTerminiFor(room);
  structure.push(...crown.structure);
  detail.push(...crown.detail);
  marks.push(...crown.marks);
  structure.push(...gallery.structure);
  detail.push(...gallery.detail);
  marks.push(...gallery.marks);
  return { identity, crown, gallery, turn, junction, sealed, structure, detail, marks };
}
