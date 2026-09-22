import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { doorReach, insideRoom } from "../dungeon/footprint";
import type { BiomeId } from "../rooms/biomes";
import { TERRAIN_COLORS } from "../rooms/terrainPattern";
import { floorHeightAt } from "./elevation";

export interface StrataSeamMark {
  dir: Dir;
  destination: string;
  stratum: BiomeId;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export type StratumVeinMode = "course" | "thread" | "tie" | "tessera";
export const STRATUM_VEINS: Record<BiomeId, { name: string; description: string; mode: StratumVeinMode }> = {
  hewn: { name: "quarry stitch", description: "Staggered cut-stone plugs carry the parent quarry through adjoining rooms.", mode: "course" },
  mossy: { name: "root braid", description: "Paired root-dark threads cross the threshold and divide around old paving.", mode: "thread" },
  flooded: { name: "silt braid", description: "Twin damp lines record the connected settling bed beneath the water.", mode: "thread" },
  fungal: { name: "mycelium braid", description: "Two pale growth threads continue through every chamber of the bed.", mode: "thread" },
  foundry: { name: "kiln tie", description: "Short transverse firebrick ties repeat along the connected firing foundation.", mode: "tie" },
  timber: { name: "sleeper tie", description: "Buried cross sleepers preserve the line of the old loading foundation.", mode: "tie" },
  ash: { name: "flue tie", description: "Dark transverse ribs follow the same buried flue bed from room to room.", mode: "tie" },
  verdigris: { name: "condenser tie", description: "Green plate joints continue the pressure bed beneath adjoining halls.", mode: "tie" },
  catacomb: { name: "burial tesserae", description: "Alternating brick tesserae carry one burial course through the doorway.", mode: "tessera" },
  bone: { name: "ossuary tesserae", description: "Pale squared insets mark the connected bone bed beneath the paving.", mode: "tessera" },
  crystal: { name: "resonance tesserae", description: "Faceted violet insets repeat along one continuous mineral seam.", mode: "tessera" },
  salt: { name: "brine tesserae", description: "Pale crust blocks preserve the old pan bed across the threshold.", mode: "tessera" },
  tallow: { name: "wick tesserae", description: "Amber wax plugs carry the rendering bed into the next chantry.", mode: "tessera" },
};

export interface StratumVeinMark {
  dir: Dir;
  destination: string;
  stratum: BiomeId;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  tone: "base" | "accent";
}

/**
 * Visible continuity inside one connected geological band. Marks are laid
 * from each matching doorway inward, so opposite room faces begin with the
 * same phase at the threshold and meet the room's other veins near its court.
 * They remain paint-depth and share the seam renderer's one instance batch.
 */
export function strataVeinsFor(room: Room, rooms: readonly Room[]): StratumVeinMark[] {
  if (!room.district || !room.stratum) return [];
  const byId = new Map(rooms.map(candidate => [candidate.id, candidate]));
  const marks: StratumVeinMark[] = [], rule = STRATUM_VEINS[room.stratum];
  const colors = TERRAIN_COLORS[room.stratum];
  for (const dir of DIRS) {
    const destination = room.links[dir], next = destination ? byId.get(destination) : undefined;
    if (!destination || next?.district !== room.district || next.stratum !== room.stratum) continue;
    const axis = DIR_STEP[dir], across = { x: -axis.z, z: axis.x };
    const reach = doorReach(room, dir) - 0.34;
    for (let inward = 0.48, index = 0; inward < reach - 0.45 && index < 18; inward += 1.18, index++) {
      const along = reach - inward, accent = index % 4 === 3;
      const add = (lateral: number, wide: number, deep: number, tone: StratumVeinMark["tone"]) => {
        const x = axis.x * along + across.x * lateral, z = axis.z * along + across.z * lateral;
        const width = axis.x ? deep : wide, depth = axis.z ? deep : wide;
        if (!insideRoom(room, x, z, Math.hypot(width, depth) / 2 + 0.015)) return;
        marks.push({ dir, destination, stratum: room.stratum!, position: [x, floorHeightAt(room, x, z) + 0.027, z],
          size: [width, 0.018, depth], color: colors[tone === "accent" ? 0 : 1], tone });
      };
      if (rule.mode === "thread") {
        const sway = (index % 2 ? 1 : -1) * 0.08;
        add(-1.16 + sway, 0.12, 0.78, "base"); add(1.16 - sway, 0.12, 0.78, accent ? "accent" : "base");
      } else if (rule.mode === "tie") {
        add(index % 2 ? 1.18 : -1.18, 0.64, 0.16, accent ? "accent" : "base");
      } else if (rule.mode === "tessera") {
        add(index % 2 ? 1.08 : -1.08, accent ? 0.54 : 0.42, 0.58, accent ? "accent" : "base");
      } else {
        add(index % 2 ? 1.0 : -1.0, accent ? 0.72 : 0.56, 0.34, accent ? "accent" : "base");
      }
    }
  }
  return marks;
}

/**
 * Block-cut chips of the next stratum at a real doorway. District boundaries
 * already own a named lintel, so these quieter floor seams only explain a
 * material change within one connected region.
 */
export function strataSeamsFor(room: Room, rooms: readonly Room[]): StrataSeamMark[] {
  if (!room.district || !room.stratum) return [];
  const byId = new Map(rooms.map(candidate => [candidate.id, candidate]));
  const marks: StrataSeamMark[] = [];
  for (const dir of DIRS) {
    const destination = room.links[dir];
    const next = destination ? byId.get(destination) : undefined;
    if (!destination || !next?.stratum || next.district !== room.district || next.stratum === room.stratum) continue;
    const axis = DIR_STEP[dir], across = { x: -axis.z, z: axis.x };
    const reach = doorReach(room, dir);
    // The brighter half of the destination palette must read in the doorway's
    // low light; the darker half already fills its terrain beds beyond it.
    const color = TERRAIN_COLORS[next.stratum][0];
    for (const [index, side] of [-2, -1, 0, 1, 2].entries()) {
      const inward = 0.42 + (index % 2) * 0.24;
      const x = axis.x * (reach - inward) + across.x * side * 0.58;
      const z = axis.z * (reach - inward) + across.z * side * 0.58;
      const width = axis.x ? 0.34 : 0.48, depth = axis.z ? 0.34 : 0.48;
      if (!insideRoom(room, x, z, Math.hypot(width, depth) / 2 + 0.02)) continue;
      marks.push({ dir, destination, stratum: next.stratum,
        position: [x, floorHeightAt(room, x, z) + 0.034, z], size: [width, 0.025, depth], color });
    }
  }
  return marks;
}
