import type { Room } from "../dungeon/types";
import { biomeIdFor, type BiomeId } from "../rooms/biomes";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { DOOR_HEIGHT, GROUND_Y, WALL_HEIGHT } from "../world";

export interface CrownDefinition {
  name: string;
  description: string;
}

/**
 * The construction language that makes a biome visible above the floor.
 *
 * Each motif is a repeated piece of the room's former work, rather than loose
 * decoration: quarry wedges, root combs, tally tabs, sluice rails, kiln
 * dampers, pit props, ossuary ribs, resonator forks, growing shelves and flue
 * baffles. They join the architecture component's existing three instanced
 * material batches, so a distinct silhouette does not mean another draw call.
 */
export const BIOME_CROWNS: Record<BiomeId, CrownDefinition> = {
  hewn: { name: "Quarry wedges", description: "Broad roof wedges mark the bays where dressed stone was lifted clear." },
  mossy: { name: "Root combs", description: "Short hanging root teeth follow the old nursery beams." },
  catacomb: { name: "Burial tallies", description: "Paired tabs count alcoves along each mortuary bay." },
  flooded: { name: "Sluice rails", description: "Twin rails and a water mark show where settling screens once hung." },
  foundry: { name: "Kiln dampers", description: "Heavy central baffles retain four hot rivet marks." },
  timber: { name: "Pit props", description: "Paired timber shoulders and pegs brace every second roof bay." },
  bone: { name: "Ossuary ribs", description: "Four descending teeth repeat the room's processional count." },
  crystal: { name: "Resonator forks", description: "A split stone fork holds three small tuning blocks." },
  fungal: { name: "Growing shelves", description: "A stem and broad cap continue the orchard overhead." },
  ash: { name: "Flue baffles", description: "Offset plates and soot counters show how kiln breath was slowed." },
};

export interface CrownSpan { x: number; z: number; width: number }
export interface CrownPattern {
  definition: CrownDefinition;
  biome: BiomeId;
  structure: CorridorBlock[];
  detail: CorridorBlock[];
  marks: CorridorBlock[];
}

/** Block-cut motifs held entirely above doorway clearance and inside a span. */
export function biomeCrownFor(room: Room, spans: readonly CrownSpan[]): CrownPattern {
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  const definition = BIOME_CROWNS[biome];
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  const block = (into: CorridorBlock[], span: CrownSpan, dx: number, y: number, w: number, h: number, d: number) => {
    const safeWidth = Math.min(w, Math.max(0.12, span.width - Math.abs(dx) * 2));
    into.push({ position: [span.x + dx, GROUND_Y + y, span.z], size: [safeWidth, h, d] });
  };

  // Alternating bays leave the district's larger roof tradition legible.
  spans.forEach((span, index) => {
    if (index % 2) return;
    const edge = Math.max(0.55, span.width / 2 - 0.42);
    const pair = Math.min(1.8, edge * 0.56);
    switch (biome) {
      case "hewn":
        block(detail, span, 0, WALL_HEIGHT - 0.72, Math.min(2.6, span.width * 0.42), 0.42, 0.28);
        block(marks, span, -pair, WALL_HEIGHT - 0.96, 0.34, 0.12, 0.3);
        block(marks, span, pair, WALL_HEIGHT - 0.96, 0.34, 0.12, 0.3);
        break;
      case "mossy":
        for (const [n, dx] of [-pair, 0, pair].entries())
          block(detail, span, dx, WALL_HEIGHT - 0.76 - n * 0.09, 0.2, 0.64 + n * 0.18, 0.22);
        block(marks, span, 0, DOOR_HEIGHT + 0.35, 0.36, 0.12, 0.24);
        break;
      case "catacomb":
        for (const dx of [-pair, pair]) {
          block(detail, span, dx, WALL_HEIGHT - 0.72, 0.66, 0.48, 0.28);
          block(marks, span, dx, WALL_HEIGHT - 0.98, 0.42, 0.08, 0.3);
        }
        break;
      case "flooded":
        for (const dx of [-pair, pair]) block(structure, span, dx, WALL_HEIGHT - 0.58, 0.24, 0.54, 0.28);
        block(marks, span, 0, WALL_HEIGHT - 0.9, Math.min(2.2, span.width * 0.38), 0.1, 0.3);
        break;
      case "foundry":
        block(detail, span, 0, WALL_HEIGHT - 0.68, Math.min(2.8, span.width * 0.46), 0.55, 0.3);
        for (const dx of [-pair, -pair / 3, pair / 3, pair])
          block(marks, span, dx, WALL_HEIGHT - 1.0, 0.2, 0.12, 0.32);
        break;
      case "timber":
        for (const dx of [-edge, edge]) {
          block(detail, span, dx, WALL_HEIGHT - 0.76, 0.38, 0.72, 0.28);
          block(marks, span, dx * 0.82, WALL_HEIGHT - 0.98, 0.18, 0.18, 0.3);
        }
        break;
      case "bone":
        for (const [n, dx] of [-pair, -pair / 3, pair / 3, pair].entries())
          block(detail, span, dx, WALL_HEIGHT - 0.72 - Math.abs(1.5 - n) * 0.06, 0.22, 0.52 + (n % 2) * 0.18, 0.24);
        block(marks, span, 0, DOOR_HEIGHT + 0.38, 0.44, 0.1, 0.26);
        break;
      case "crystal":
        for (const dx of [-pair * 0.52, pair * 0.52]) block(detail, span, dx, WALL_HEIGHT - 0.78, 0.3, 0.76, 0.26);
        for (const dx of [-0.46, 0, 0.46]) block(marks, span, dx, WALL_HEIGHT - 1.14 + Math.abs(dx) * 0.22, 0.22, 0.3, 0.28);
        break;
      case "fungal":
        block(detail, span, 0, WALL_HEIGHT - 0.78, 0.28, 0.68, 0.24);
        block(detail, span, 0, WALL_HEIGHT - 1.08, Math.min(2.5, span.width * 0.44), 0.18, 0.28);
        block(marks, span, 0, WALL_HEIGHT - 1.2, Math.min(1.5, span.width * 0.28), 0.08, 0.3);
        break;
      case "ash":
        block(detail, span, -pair * 0.45, WALL_HEIGHT - 0.68, Math.min(1.9, span.width * 0.3), 0.42, 0.28);
        block(detail, span, pair * 0.45, WALL_HEIGHT - 0.94, Math.min(1.9, span.width * 0.3), 0.42, 0.28);
        for (const dx of [-pair, 0, pair]) block(marks, span, dx, DOOR_HEIGHT + 0.38, 0.26, 0.1, 0.3);
        break;
    }
  });
  return { definition, biome, structure, detail, marks };
}
