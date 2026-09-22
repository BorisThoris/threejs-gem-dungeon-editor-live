import type { Room } from "../dungeon/types";
import { createRng } from "../rng";

/** Building traditions describe what a space was made for, independently of
 * its current encounter. Materials, architecture and the atlas read this row. */
export const PLACE_IDENTITIES = {
  nursery: { title: "Root nursery", tradition: "trellis", structure: "#766b48", detail: "#566c3d", accent: "#a1b16a", story: "Roots once fed the beds beneath these trellises." },
  orchard: { title: "Mycelium orchard", tradition: "trellis", structure: "#665b46", detail: "#586b62", accent: "#94beb0", story: "The old growing frames carry a second, quieter harvest." },
  cistern: { title: "Cistern beds", tradition: "trellis", structure: "#6e7a6b", detail: "#476a62", accent: "#94b4a4", story: "Water was settled here before it reached the gardens." },
  service: { title: "Service gallery", tradition: "ironwork", structure: "#625853", detail: "#96744f", accent: "#c4a16a", story: "Every frame carried a line to another workshop." },
  kiln: { title: "Kiln hall", tradition: "ironwork", structure: "#61504a", detail: "#9b6546", accent: "#c39266", story: "Soot marks the roof above the old firing lanes." },
  flue: { title: "Flue settling hall", tradition: "ironwork", structure: "#5c5550", detail: "#746158", accent: "#b58a70", story: "Baffles once slowed the kiln breath until its ash fell here." },
  store: { title: "Provisioning hall", tradition: "ironwork", structure: "#705f4c", detail: "#8e7a59", accent: "#c3b385", story: "Goods passed below the numbered loading frames." },
  procession: { title: "Processional hall", tradition: "vaulting", structure: "#858070", detail: "#655e53", accent: "#b9af89", story: "The repeated arches once measured a slow procession." },
  ossuary: { title: "Ossuary ambulatory", tradition: "vaulting", structure: "#99907b", detail: "#716c61", accent: "#c1b99b", story: "The dead were carried around this hall before burial." },
  resonance: { title: "Resonance chapel", tradition: "vaulting", structure: "#77718a", detail: "#625c74", accent: "#b1a2c6", story: "Stone ribs gather the last note of every footfall." },
  brine: { title: "Last-water chapel", tradition: "vaulting", structure: "#777b73", detail: "#676d68", accent: "#b8c8bd", story: "Shallow pans dried the choir's last water into pale votive salt." },
} as const;
export type PlaceIdentity = keyof typeof PLACE_IDENTITIES;

export function identityFor(room: Room): PlaceIdentity {
  // The works built the settling halls; the choir later reused its ash
  // chambers as processional space, so material alone does not erase history.
  if (room.biome === "ash" && room.district === "works") return "flue";
  if (room.district === "gardens") {
    if (room.biome === "fungal") return "orchard";
    if (room.biome === "flooded" || room.waterway) return "cistern";
    return "nursery";
  }
  if (room.district === "works") {
    if (room.biome === "foundry") return "kiln";
    return createRng(`${room.seed}:${room.id}:purpose`)() < 0.5 ? "service" : "store";
  }
  if (room.biome === "crystal") return "resonance";
  if (room.biome === "salt") return "brine";
  return room.biome === "bone" || room.biome === "catacomb" ? "ossuary" : "procession";
}
